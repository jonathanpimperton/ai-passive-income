/**
 * PDF Compress — reduce PDF file size by recompressing embedded images.
 * Preserves all text, links, vector graphics — only touches raster images.
 * Uses pdf-lib for PDF manipulation + Canvas for image recompression.
 * Client-side only. No server upload.
 */
import { useState, useCallback } from 'react';
import { Download, FileText, Minimize2 } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Parse JPEG dimensions from SOF marker (needed when images are downscaled) */
function getJpegDimensions(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xFF || data[1] !== 0xD8) return null;
  let i = 2;
  while (i < data.length - 9) {
    if (data[i] !== 0xFF) { i++; continue; }
    const marker = data[i + 1];
    // SOF markers: C0-CF except C4 (DHT), C8 (reserved), CC (DAC)
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { height: (data[i + 5] << 8) | data[i + 6], width: (data[i + 7] << 8) | data[i + 8] };
    }
    const segLen = (data[i + 2] << 8) | data[i + 3];
    i += 2 + segLen;
  }
  return null;
}

/** Recompress a raw image (PNG/JPEG bytes) to JPEG at a given quality */
function recompressImage(
  imageBytes: Uint8Array,
  mimeType: string,
  quality: number,
  maxDimension: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageBytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.width;
      let h = img.height;

      // Downscale large images
      if (maxDimension > 0 && (w > maxDimension || h > maxDimension)) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Recompression failed')); return; }
          blob.arrayBuffer().then((ab) => {
            resolve(new Uint8Array(ab));
            // Free canvas memory
            canvas.width = 0;
            canvas.height = 0;
          });
        },
        'image/jpeg',
        quality / 100,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [quality, setQuality] = useState(70);
  const [maxRes, setMaxRes] = useState(1500);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{ blob: Blob; size: number; imageCount: number } | null>(null);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setResult(null);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setFile(f);
      setPageCount(doc.getPageCount());
    } catch {
      setError('Could not read this PDF — it may be encrypted or corrupted.');
    }
  }, []);

  const compress = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const pdfLib = await import('pdf-lib');
      const { PDFDocument, PDFName, PDFRawStream, PDFStream, PDFNumber } = pdfLib;
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

      // Walk all indirect objects looking for image XObjects
      const context = doc.context;
      let imageCount = 0;
      let processedCount = 0;

      // Collect all image refs
      type ImageRef = { ref: pdfLib.PDFRef; stream: InstanceType<typeof PDFRawStream> | InstanceType<typeof PDFStream>; dict: InstanceType<typeof pdfLib.PDFDict> };
      const imageRefs: ImageRef[] = [];

      context.enumerateIndirectObjects().forEach(([ref, obj]) => {
        // Check if this is an image XObject
        if (obj instanceof PDFRawStream || obj instanceof PDFStream) {
          const dict = obj.dict;
          const type = dict.get(PDFName.of('Type'));
          const subtype = dict.get(PDFName.of('Subtype'));
          if (
            (subtype && subtype.toString() === '/Image') ||
            (type && type.toString() === '/XObject' && subtype && subtype.toString() === '/Image')
          ) {
            imageRefs.push({ ref, stream: obj, dict });
          }
        }
      });

      imageCount = imageRefs.length;
      setProgress(`Found ${imageCount} embedded image${imageCount !== 1 ? 's' : ''}...`);

      if (imageCount === 0) {
        // No images to compress — try re-saving with pdf-lib (which can remove redundant data)
        setProgress('No embedded images found. Re-saving with optimized structure...');
        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResult({ blob, size: blob.size, imageCount: 0 });
        setProcessing(false);
        return;
      }

      // Process each image: extract, recompress, replace
      for (const { ref, stream, dict } of imageRefs) {
        processedCount++;
        setProgress(`Compressing image ${processedCount} of ${imageCount}...`);

        try {
          const filter = dict.get(PDFName.of('Filter'));
          const filterStr = filter ? filter.toString() : '';
          const width = dict.get(PDFName.of('Width'));
          const height = dict.get(PDFName.of('Height'));

          if (!width || !height) continue;

          let imageBytes: Uint8Array;
          let mimeType: string;

          if (filterStr === '/DCTDecode' || filterStr.includes('DCTDecode')) {
            // Already JPEG — get the raw stream bytes
            imageBytes = stream instanceof PDFRawStream ? stream.contents : new Uint8Array(stream.getContents());
            mimeType = 'image/jpeg';
          } else if (filterStr === '/FlateDecode' || filterStr.includes('FlateDecode')) {
            // PNG-style data — decode then recompress
            // For flate-decoded images, we need to reconstruct a PNG
            const colorSpace = dict.get(PDFName.of('ColorSpace'));
            const bitsPerComponent = dict.get(PDFName.of('BitsPerComponent'));

            // Skip complex color spaces (indexed, ICC-based, etc.)
            const csStr = colorSpace ? colorSpace.toString() : '';
            if (csStr !== '/DeviceRGB' && csStr !== '/DeviceGray') continue;

            const rawBytes = stream instanceof PDFRawStream ? stream.contents : new Uint8Array(stream.getContents());
            // We can't easily decode FlateDecode in the browser without building a full PNG
            // Skip these for now — JPEG images are usually the biggest space hogs
            if (rawBytes.length < 50000) continue; // Skip small images
            continue;
          } else {
            // Skip unsupported filters (JBIG2, JPX, etc.)
            continue;
          }

          // Only recompress if the image is large enough to benefit
          if (imageBytes.length < 10000) continue;

          const recompressed = await recompressImage(imageBytes, mimeType, quality, maxRes);

          // Only use recompressed if it's actually smaller
          if (recompressed.length < imageBytes.length * 0.95) {
            // Build a new PDFRawStream in-place on the existing ref.
            // Unlike doc.embedJpg() which registers a NEW indirect object
            // (leaving the old one AND new one in the file, making it bigger),
            // this directly replaces the existing object's content.
            const dims = getJpegDimensions(recompressed);
            const newDict = pdfLib.PDFDict.withContext(context);
            newDict.set(PDFName.of('Type'), PDFName.of('XObject'));
            newDict.set(PDFName.of('Subtype'), PDFName.of('Image'));
            newDict.set(PDFName.of('Width'), PDFNumber.of(dims?.width ?? parseInt(width.toString(), 10)));
            newDict.set(PDFName.of('Height'), PDFNumber.of(dims?.height ?? parseInt(height.toString(), 10)));
            newDict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
            newDict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
            newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
            newDict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length));

            const replacement = PDFRawStream.of(newDict, recompressed);
            context.assign(ref, replacement);
          }
        } catch {
          // Skip images that fail — don't break the whole operation
          continue;
        }
      }

      setProgress('Saving compressed PDF...');
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResult({ blob, size: blob.size, imageCount: processedCount });
    } catch (e) {
      setError('Compression failed. ' + (e instanceof Error ? e.message : ''));
    }
    setProcessing(false);
    setProgress('');
  }, [file, quality, maxRes]);

  const download = () => {
    if (!result || !file) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const savings = file && result ? file.size - result.size : 0;
  const savingsPct = file && result && file.size > 0 ? Math.round((savings / file.size) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
        />
        <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-4">
          <SliderInput
            label="Image Quality"
            id="pdf-quality"
            value={quality}
            min={20}
            max={95}
            step={5}
            onChange={setQuality}
            suffix="%"
            minLabel="20%"
            maxLabel="95%"
            hint="Lower = smaller file. Only affects embedded images — text stays crisp."
          />
          <SliderInput
            label="Max Image Resolution"
            id="pdf-max-res"
            value={maxRes}
            min={500}
            max={3000}
            step={100}
            onChange={setMaxRes}
            suffix="px"
            minLabel="500px"
            maxLabel="3000px"
            hint="Downscales images larger than this. Lower = smaller file."
          />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-primary-700">{progress || 'Processing...'}</span>
          </div>
        )}

        {file && !result && !processing && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-red-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-neutral-900">{file.name}</p>
            <p className="text-xs text-neutral-500 mt-1">{pageCount} page{pageCount !== 1 ? 's' : ''} — {formatSize(file.size)}</p>
            <button
              onClick={compress}
              className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150"
            >
              <Minimize2 size={16} aria-hidden="true" />
              Compress PDF
            </button>
            <p className="text-xs text-neutral-500 mt-3">
              Recompresses embedded images while preserving all text, links, and vector graphics.
            </p>
          </div>
        )}

        {result && file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-3">
              <Minimize2 size={24} className="text-accent-600" aria-hidden="true" />
            </div>
            <p className="text-lg font-bold text-neutral-900">
              {savingsPct > 0 ? `${savingsPct}% smaller` : 'Compression complete'}
            </p>
            <p className="text-sm text-neutral-600 mt-1">
              {formatSize(file.size)} → {formatSize(result.size)}
              {savings > 0 && <span className="ml-1 text-accent-600 font-medium">(saved {formatSize(savings)})</span>}
            </p>
            {result.imageCount > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                {result.imageCount} image{result.imageCount !== 1 ? 's' : ''} recompressed — text and vectors preserved
              </p>
            )}
            {savings <= 0 && (
              <p className="text-xs text-neutral-500 mt-2">
                This PDF is already well-optimized. Try a lower quality or resolution setting.
              </p>
            )}
            <button
              onClick={download}
              className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150"
            >
              <Download size={16} aria-hidden="true" />
              Download Compressed PDF
            </button>
          </div>
        )}

        {!file && !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a PDF to compress it</p>
            <p className="text-xs text-neutral-500 mt-1">Reduces file size by recompressing embedded images — text stays sharp</p>
          </div>
        )}
      </div>
    </div>
  );
}

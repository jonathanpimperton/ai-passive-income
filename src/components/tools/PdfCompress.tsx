/**
 * PDF Compress — reduce PDF file size by recompressing embedded images.
 * Text, links and vector graphics are kept exactly as they are; only raster
 * images are re-encoded (JPEG and PNG-style Flate images). Uses pdf-lib plus
 * the browser's canvas JPEG encoder. Client-side only. No server upload.
 *
 * Review fixes: encrypted PDFs are refused (FILES-02); Flate images are
 * compressed and counts are true (FILES-08); masks, decode arrays and colour
 * spaces are kept and CMYK is left alone (FILES-14); a result that is not
 * smaller is never offered; settings can be changed and re-run (FILES-10).
 */
import { useState, useCallback, useRef } from 'react';
import { Download, FileText, Minimize2, RefreshCw } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import SliderInput from '../ui/SliderInput';
import { ToolMessages, ProcessingBanner } from '../ui/FileToolKit';
import { formatBytes, baseName, plural } from '../../lib/file-tools/names';
import { loadPdfForEditing } from '../../lib/file-tools/pdf-load';
import {
  compressPdfImages, describeSkipped, CompressCancelled, type ImageEncoder, type CompressReport,
} from '../../lib/file-tools/pdf-compress';
import {
  decodeImage, createCanvas, encodeCanvas, releaseCanvas, downloadBlob, readBytes, errorMessage, nextFrame,
  revealOnSmallScreens, bytesToBlob,
} from '../../lib/file-tools/browser';

/** Re-encode one image with the browser's canvas JPEG encoder. */
const canvasEncoder: ImageEncoder = async (src, { quality, maxDimension }) => {
  let width: number;
  let height: number;
  let source: CanvasImageSource;
  let release = () => {};
  if (src.kind === 'jpeg') {
    const decoded = await decodeImage(bytesToBlob(src.bytes, 'image/jpeg'));
    ({ width, height, source } = decoded);
    release = decoded.release;
  } else {
    width = src.width;
    height = src.height;
    const staging = createCanvas(width, height);
    staging.ctx.putImageData(new ImageData(src.rgba as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
    source = staging.canvas;
    release = () => releaseCanvas(staging.canvas);
  }
  try {
    let w = width;
    let h = height;
    if (maxDimension > 0 && Math.max(w, h) > maxDimension) {
      const ratio = maxDimension / Math.max(w, h);
      w = Math.max(1, Math.round(w * ratio));
      h = Math.max(1, Math.round(h * ratio));
    }
    const { canvas, ctx } = createCanvas(w, h);
    try {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, w, h);
      const encoded = await encodeCanvas(canvas, 'image/jpeg', quality);
      return { bytes: await readBytes(encoded.blob), width: w, height: h };
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    release();
  }
};

interface Result {
  blob: Blob;
  size: number;
  report: CompressReport;
  quality: number;
  maxRes: number;
}

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [quality, setQuality] = useState(70);
  const [maxRes, setMaxRes] = useState(1500);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const bytesRef = useRef<Uint8Array | null>(null);
  const runRef = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);

  const processing = progress !== '';

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    runRef.current += 1;
    setErrors([]);
    setNotices([]);
    setResult(null);
    setProgress('Reading PDF...');
    try {
      const bytes = await readBytes(f);
      const res = await loadPdfForEditing(bytes, f.name);
      if (!res.ok) {
        bytesRef.current = null;
        setFile(null);
        setErrors([res.message]);
        return;
      }
      bytesRef.current = bytes;
      setFile(f);
      setPageCount(res.pageCount);
    } catch (e) {
      setErrors([errorMessage(e, `Could not read "${f.name}".`)]);
    } finally {
      setProgress('');
    }
  }, []);

  const compress = useCallback(async () => {
    const bytes = bytesRef.current;
    if (!file || !bytes) return;
    const runId = ++runRef.current;
    setErrors([]);
    setNotices([]);
    setResult(null);
    setProgress('Reading PDF...');
    try {
      // Load a fresh copy: compression rewrites the document in place.
      const res = await loadPdfForEditing(bytes, file.name);
      if (!res.ok) { setErrors([res.message]); return; }
      const report = await compressPdfImages(res.doc, canvasEncoder, {
        quality: quality / 100,
        maxDimension: maxRes,
        isCancelled: () => runRef.current !== runId,
        onProgress: (done, total) => {
          if (total > 0 && done < total) setProgress(`Compressing image ${done + 1} of ${total}...`);
        },
      });
      setProgress('Saving compressed PDF...');
      await nextFrame();
      const pdfBytes = await res.doc.save({ useObjectStreams: true });
      if (runRef.current !== runId) return;
      setResult({ blob: bytesToBlob(pdfBytes, 'application/pdf'), size: pdfBytes.length, report, quality, maxRes });
      requestAnimationFrame(() => revealOnSmallScreens(outputRef.current));
    } catch (e) {
      if (e instanceof CompressCancelled) return;
      setErrors([`Compression failed: ${errorMessage(e, 'the PDF could not be processed.')}`]);
    } finally {
      if (runRef.current === runId) setProgress('');
    }
  }, [file, quality, maxRes]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['Compression cancelled.']);
  };

  const download = () => {
    if (!result || !file) return;
    downloadBlob(result.blob, `${baseName(file.name)}_compressed.pdf`);
  };

  const savings = file && result ? file.size - result.size : 0;
  const savingsPct = file && result && file.size > 0 ? Math.round((savings / file.size) * 100) : 0;
  const smaller = savings > 0;
  const stale = result !== null && (result.quality !== quality || result.maxRes !== maxRes);
  const skippedText = result ? describeSkipped(result.report) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
          disabled={processing}
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

      <div ref={outputRef} className="lg:col-span-3 space-y-4 scroll-mt-24">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={file && progress.startsWith('Compressing') ? cancel : undefined} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-red-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-neutral-900 break-words">{file.name}</p>
            <p className="text-xs text-neutral-500 mt-1">{plural(pageCount, 'page')} — {formatBytes(file.size)}</p>
            <button
              type="button"
              onClick={compress}
              disabled={processing}
              className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 mt-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {stale ? <RefreshCw size={16} aria-hidden="true" /> : <Minimize2 size={16} aria-hidden="true" />}
              {result ? (stale ? 'Compress again with new settings' : 'Compress again') : 'Compress PDF'}
            </button>
            <p className="text-xs text-neutral-500 mt-3">
              Recompresses embedded photos and images. Text, links and vector graphics are not changed.
            </p>
          </div>
        )}

        {result && file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-6 text-center">
            <p className="text-lg font-bold text-neutral-900">
              {smaller ? `${savingsPct > 0 ? savingsPct : '<1'}% smaller` : 'No smaller version possible'}
            </p>
            <p className="text-sm text-neutral-600 mt-1">
              {formatBytes(file.size)} → {formatBytes(result.size)}
              {smaller && <span className="ml-1 text-success-600 font-medium">(saved {formatBytes(savings)})</span>}
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              {result.report.imagesFound === 0
                ? 'This PDF has no embedded images to compress (it is text and vector graphics).'
                : `${result.report.imagesReplaced} of ${plural(result.report.imagesFound, 'image')} recompressed — text and vectors preserved.`}
            </p>
            {skippedText && <p className="text-xs text-neutral-500 mt-1">{skippedText}</p>}
            {smaller ? (
              <button
                type="button"
                onClick={download}
                className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 mt-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Download Compressed PDF
              </button>
            ) : (
              <p className="text-xs text-neutral-600 mt-3">
                The rewritten file would not be smaller than your original, so there is nothing to download.
                {result.report.imagesFound > 0 && ' Try a lower quality or resolution.'}
              </p>
            )}
          </div>
        )}

        {!file && !processing && errors.length === 0 && (
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

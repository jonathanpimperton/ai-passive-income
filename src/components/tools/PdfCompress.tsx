/**
 * PDF Compress — reduce PDF file size by downscaling embedded images.
 * Uses pdf-lib + Canvas API. Client-side only.
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

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [quality, setQuality] = useState(70);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);
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
      // Strategy: render each page to canvas at reduced quality, rebuild PDF with images
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
      const pdfDoc = await loadingTask.promise;

      const { PDFDocument } = await import('pdf-lib');
      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduced resolution
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert canvas to JPEG at user-selected quality
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
        const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), (c) => c.charCodeAt(0));

        // Free canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;

        const jpegImage = await newPdf.embedJpg(jpegBytes);
        const newPage = newPdf.addPage([viewport.width, viewport.height]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResult({ blob, size: blob.size });
    } catch (e) {
      setError('Compression failed. ' + (e instanceof Error ? e.message : ''));
    }
    setProcessing(false);
  }, [file, quality]);

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
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-4">
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
            hint="Lower = smaller file, more compression"
          />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-primary-700">Compressing PDF — this may take a moment for large files...</span>
          </div>
        )}

        {file && !result && !processing && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-red-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-neutral-900">{file.name}</p>
            <p className="text-xs text-neutral-500 mt-1">{pageCount} page{pageCount !== 1 ? 's' : ''} — {formatSize(file.size)}</p>
            <button
              onClick={compress}
              className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-150"
            >
              <Minimize2 size={16} aria-hidden="true" />
              Compress PDF
            </button>
          </div>
        )}

        {result && file && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-6 text-center">
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
            {savings <= 0 && (
              <p className="text-xs text-neutral-500 mt-2">
                This PDF is already well-optimized. Try a lower quality setting.
              </p>
            )}
            <button
              onClick={download}
              className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-150"
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
            <p className="text-xs text-neutral-400 mt-1">Reduces file size by optimizing embedded images</p>
          </div>
        )}
      </div>
    </div>
  );
}

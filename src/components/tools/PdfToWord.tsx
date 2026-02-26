/**
 * PDF to Word — layout-aware conversion with flowing paragraphs.
 *
 * Pipeline:
 *  1. pdfjs-dist renders a visual preview (canvas) and extracts text + geometry.
 *  2. Layout engine detects tables, headings, lists, and paragraphs.
 *  3. docx npm package generates an editable Word document with proper structure.
 *
 * Unlike the "positioned frames" approach (every line = absolute position),
 * this produces flowing text that reflows when edited in Word.
 *
 * Client-side only. No server upload.
 */
import { useState, useCallback, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

// ── Types ────────────────────────────────────────────────────────

interface PreviewPage {
  pageNum: number;
  previewUrl: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Component ────────────────────────────────────────────────────

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [previews, setPreviews] = useState<PreviewPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Clean up preview object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [previews]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setError('');
      previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPreviews([]);
      setPdfBytes(null);
      setProcessing(true);
      setProgressMsg('Loading PDF...');

      try {
        const data = await f.arrayBuffer();
        // Clone before giving to pdfjs — getDocument() transfers the
        // ArrayBuffer to a web worker, which detaches the original.
        const safeCopy = data.slice(0);

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        const PREVIEW_SCALE = 2;
        const pages: PreviewPage[] = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          setProgressMsg(`Rendering preview ${i} of ${pdfDoc.numPages}...`);
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: PREVIEW_SCALE });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          pages.push({
            pageNum: i,
            previewUrl: blob ? URL.createObjectURL(blob) : '',
          });
        }

        setFile(f);
        setPdfBytes(safeCopy);
        setPreviews(pages);
      } catch {
        setError('Could not read this PDF — it may be encrypted or corrupted.');
      }
      setProcessing(false);
      setProgressMsg('');
    },
    [previews]
  );

  const generateDocx = useCallback(async () => {
    if (!pdfBytes || !file) return;
    setGenerating(true);
    setError('');

    try {
      const { convertPdfToDocx } = await import('../../lib/pdf-to-docx-engine');
      const blob = await convertPdfToDocx(pdfBytes, setProgressMsg);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '') + '.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        'Conversion failed. ' + (e instanceof Error ? e.message : 'Please try a different PDF.')
      );
    }
    setGenerating(false);
    setProgressMsg('');
  }, [pdfBytes, file]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
        />

        {file && previews.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">
                  {formatSize(pdfBytes?.byteLength || 0)} &middot; {previews.length} page
                  {previews.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={generateDocx}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {generating ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  {progressMsg || 'Generating DOCX...'}
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as Word (.docx)
                </>
              )}
            </button>

            <p className="text-xs text-neutral-400">
              Text is extracted with layout analysis — headings, paragraphs, tables, and lists are
              reconstructed as proper Word elements for easy editing.
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div
              className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm text-primary-700">{progressMsg || 'Processing...'}</span>
          </div>
        )}

        {previews.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">
              Original PDF — will be converted to an editable Word document
            </p>
            <div className="bg-neutral-100 rounded-2xl border border-neutral-200/80 shadow-card p-4 max-h-[600px] overflow-auto space-y-4">
              {previews.map((page) => (
                <div key={page.pageNum} className="relative">
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    Page {page.pageNum}
                  </div>
                  <img
                    src={page.previewUrl}
                    alt={`Page ${page.pageNum}`}
                    className="w-full rounded-lg shadow-md bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-500">
                Upload a PDF to convert it to an editable Word document
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Headings, paragraphs, tables, and lists are preserved as editable Word elements
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

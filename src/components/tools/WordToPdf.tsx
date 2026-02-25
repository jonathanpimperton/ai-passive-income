/**
 * Word to PDF — convert DOCX to PDF using mammoth.js + jsPDF + html2canvas.
 * mammoth extracts structured HTML from the DOCX, we render it into a hidden
 * DOM element, html2canvas screenshots it, and jsPDF paginates it into A4 pages.
 * Client-side only. No server upload.
 */
import { useState, useCallback, useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setWarnings([]);
    setHtmlContent('');
    setProcessing(true);

    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const DOMPurify = (await import('dompurify')).default;
      setFile(f);
      setHtmlContent(DOMPurify.sanitize(result.value));
      if (result.messages.length > 0) {
        setWarnings(result.messages.map((m) => m.message).slice(0, 5));
      }
    } catch {
      setError('Could not read this file — make sure it is a .docx file (not .doc).');
    }
    setProcessing(false);
  }, []);

  const convertToPdf = useCallback(async () => {
    if (!htmlContent || !file) return;
    setConverting(true);
    setError('');

    // Strategy: render HTML into a visible DOM element, use html2canvas to
    // capture it as a canvas, then slice that canvas into A4 pages with jsPDF.
    // We use jsPDF + html2canvas directly (NOT html2pdf.js which produces blank output).

    const container = document.createElement('div');
    const style = document.createElement('style');

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      container.className = 'word-to-pdf-render';
      container.innerHTML = htmlContent;

      // The element must be in-viewport for html2canvas to capture it.
      // We position it at 0,0 behind everything with z-index -1.
      style.textContent = `
        .word-to-pdf-render {
          position: fixed;
          top: 0;
          left: 0;
          z-index: -1;
          pointer-events: none;
          width: 754px;
          padding: 20px;
          font-family: 'Times New Roman', 'Georgia', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          background: #fff;
        }
        .word-to-pdf-render h1 { font-size: 22pt; margin: 18pt 0 10pt; font-weight: bold; }
        .word-to-pdf-render h2 { font-size: 18pt; margin: 16pt 0 8pt; font-weight: bold; }
        .word-to-pdf-render h3 { font-size: 14pt; margin: 14pt 0 6pt; font-weight: bold; }
        .word-to-pdf-render h4 { font-size: 12pt; margin: 12pt 0 4pt; font-weight: bold; }
        .word-to-pdf-render p  { margin: 0 0 8pt; }
        .word-to-pdf-render ul, .word-to-pdf-render ol { margin: 6pt 0; padding-left: 24pt; }
        .word-to-pdf-render li { margin: 3pt 0; }
        .word-to-pdf-render table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
        .word-to-pdf-render th,
        .word-to-pdf-render td { border: 1px solid #999; padding: 5pt 8pt; text-align: left; font-size: 10pt; vertical-align: top; }
        .word-to-pdf-render th { background: #f0f4f8; font-weight: bold; }
        .word-to-pdf-render img { max-width: 100%; height: auto; }
        .word-to-pdf-render a { color: #1a56db; text-decoration: underline; }
        .word-to-pdf-render blockquote { margin: 8pt 0; padding-left: 12pt; border-left: 3pt solid #ccc; color: #444; }
        .word-to-pdf-render pre, .word-to-pdf-render code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f5f5f5; padding: 2pt 4pt; }
        .word-to-pdf-render pre { padding: 8pt; margin: 8pt 0; overflow-x: auto; }
      `;
      document.head.appendChild(style);
      document.body.appendChild(container);

      // Wait for layout + paint
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
      await new Promise((r) => setTimeout(r, 300));

      // Capture the rendered HTML as a canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // A4 dimensions in mm
      const pageW = 210;
      const pageH = 297;
      const margin = 15; // mm on each side
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2;

      // Calculate how much of the canvas fits per page
      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const pxPerMm = imgWidthPx / contentW; // pixels per mm at this scale
      const pageHeightPx = contentH * pxPerMm; // canvas pixels per page

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const totalPages = Math.ceil(imgHeightPx / pageHeightPx);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        // Slice a page-height strip from the full canvas
        const sliceY = i * pageHeightPx;
        const sliceH = Math.min(pageHeightPx, imgHeightPx - sliceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) continue;

        // Fill white background first (prevents transparent edges)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, sliceY, imgWidthPx, sliceH, 0, 0, imgWidthPx, sliceH);

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHMm = sliceH / pxPerMm;
        pdf.addImage(pageImgData, 'JPEG', margin, margin, contentW, sliceHMm);
      }

      const pdfFilename = file.name.replace(/\.docx?$/i, '') + '.pdf';
      pdf.save(pdfFilename);

      document.body.removeChild(container);
      document.head.removeChild(style);
    } catch (e) {
      try { document.body.removeChild(container); } catch {}
      try { document.head.removeChild(style); } catch {}
      setError(
        'PDF conversion failed. ' +
          (e instanceof Error ? e.message : 'Please try a simpler document.')
      );
    }
    setConverting(false);
  }, [htmlContent, file]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          acceptLabel="Supports: DOCX files (Word 2007+)"
          onFiles={handleFiles}
        />

        {file && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText size={20} className="text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
              </div>
            </div>

            <button
              onClick={convertToPdf}
              disabled={converting || !htmlContent}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {converting ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Converting to PDF...
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as PDF
                </>
              )}
            </button>

            {warnings.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                <p className="font-medium mb-1">Notes:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-neutral-400">
              Renders your document as a high-fidelity PDF. Tables, lists, and formatting are
              preserved. Very complex layouts may differ slightly from the original.
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
            <span className="text-sm text-primary-700">Reading Word document...</span>
          </div>
        )}

        {htmlContent ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">Document Preview</p>
            <div
              ref={previewRef}
              className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-8 prose prose-sm max-w-none min-h-[400px] overflow-auto font-sans leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-500">
                Upload a Word document (.docx) to convert it to PDF
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Preview appears here, then download as PDF
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

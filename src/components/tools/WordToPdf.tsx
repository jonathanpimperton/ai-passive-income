/**
 * Word to PDF — convert DOCX to PDF using mammoth.js + html2canvas + jsPDF.
 *
 * Pipeline:
 *  1. mammoth extracts structured HTML from the DOCX
 *  2. Render into a hidden DOM element at exact A4 content-area width
 *  3. html2canvas captures it as a high-res canvas
 *  4. jsPDF paginates it into A4 pages with smart page-break detection
 *
 * The rendering CSS closely matches Word's default styles (Calibri 11pt,
 * 1.15 line-height, 1-inch margins) for high visual fidelity.
 *
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

      // Use mammoth's convertToHtml with style map for better fidelity
      const result = await mammoth.convertToHtml({
        arrayBuffer,
        options: {
          includeDefaultStyleMap: true,
        },
      } as Parameters<typeof mammoth.convertToHtml>[0]);

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

    const container = document.createElement('div');
    const style = document.createElement('style');

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      container.className = 'word-to-pdf-render';
      container.innerHTML = htmlContent;

      // Render at exact A4 content width for accurate page dimensions.
      // A4 = 210mm × 297mm. With 1-inch (25.4mm) margins on each side:
      //   Content width = 210 - 50.8 = 159.2mm
      //   At 96 DPI: 159.2mm / 25.4mm × 96px = 601px
      // We render at this width so the canvas maps exactly to A4 content area.
      const CONTENT_WIDTH_PX = 601;
      const MARGIN_MM = 25.4; // 1 inch

      style.textContent = `
        .word-to-pdf-render {
          position: fixed;
          top: 0;
          left: 0;
          z-index: -1;
          pointer-events: none;
          width: ${CONTENT_WIDTH_PX}px;
          padding: 0;
          margin: 0;
          font-family: 'Calibri', 'Carlito', 'Segoe UI', 'Liberation Sans', 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.15;
          color: #000;
          background: #fff;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        .word-to-pdf-render h1 {
          font-size: 20pt; margin: 12pt 0 6pt; font-weight: bold;
          font-family: 'Calibri Light', 'Calibri', 'Carlito', 'Segoe UI', sans-serif;
          color: #2F5496;
        }
        .word-to-pdf-render h2 {
          font-size: 16pt; margin: 10pt 0 4pt; font-weight: bold;
          font-family: 'Calibri Light', 'Calibri', 'Carlito', 'Segoe UI', sans-serif;
          color: #2F5496;
        }
        .word-to-pdf-render h3 {
          font-size: 13pt; margin: 8pt 0 4pt; font-weight: bold;
          font-family: 'Calibri Light', 'Calibri', 'Carlito', 'Segoe UI', sans-serif;
          color: #1F3864;
        }
        .word-to-pdf-render h4 {
          font-size: 11pt; margin: 6pt 0 2pt; font-weight: bold;
          font-style: italic;
          color: #2F5496;
        }
        .word-to-pdf-render p {
          margin: 0 0 8pt;
          orphans: 2;
          widows: 2;
        }
        .word-to-pdf-render ul, .word-to-pdf-render ol {
          margin: 4pt 0;
          padding-left: 36pt;
        }
        .word-to-pdf-render li {
          margin: 2pt 0;
        }
        .word-to-pdf-render table {
          border-collapse: collapse;
          width: 100%;
          margin: 8pt 0;
        }
        .word-to-pdf-render th,
        .word-to-pdf-render td {
          border: 1px solid #a6a6a6;
          padding: 4pt 6pt;
          text-align: left;
          font-size: 10pt;
          vertical-align: top;
        }
        .word-to-pdf-render th {
          background: #d9e2f3;
          font-weight: bold;
          color: #1F3864;
        }
        .word-to-pdf-render img {
          max-width: 100%;
          height: auto;
        }
        .word-to-pdf-render a {
          color: #0563C1;
          text-decoration: underline;
        }
        .word-to-pdf-render blockquote {
          margin: 6pt 0;
          padding-left: 12pt;
          border-left: 3pt solid #d9e2f3;
          color: #404040;
          font-style: italic;
        }
        .word-to-pdf-render pre, .word-to-pdf-render code {
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 10pt;
          background: #f2f2f2;
          padding: 2pt 4pt;
        }
        .word-to-pdf-render pre {
          padding: 8pt;
          margin: 6pt 0;
          overflow-x: auto;
          border: 1px solid #d9d9d9;
        }
        .word-to-pdf-render strong, .word-to-pdf-render b {
          font-weight: bold;
        }
        .word-to-pdf-render em, .word-to-pdf-render i {
          font-style: italic;
        }
        .word-to-pdf-render u {
          text-decoration: underline;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(container);

      // Wait for layout + font loading + paint
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
      await new Promise((r) => setTimeout(r, 400));

      // Capture the rendered HTML as a high-res canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // A4 dimensions in mm
      const pageW = 210;
      const pageH = 297;
      const contentW = pageW - MARGIN_MM * 2; // 159.2mm
      const contentH = pageH - MARGIN_MM * 2; // 246.2mm

      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const pxPerMm = imgWidthPx / contentW;
      const pageHeightPx = contentH * pxPerMm;

      // Get pixel data to find natural page-break points
      const fullCtx = canvas.getContext('2d');
      const fullPixels = fullCtx?.getImageData(0, 0, imgWidthPx, imgHeightPx).data;

      /**
       * Scan upward from `targetY` to find the nearest all-white row.
       * This prevents page breaks from cutting through text mid-line.
       */
      function findBreakPoint(targetY: number, searchRange: number): number {
        if (!fullPixels) return targetY;
        const end = Math.min(targetY, imgHeightPx);
        const start = Math.max(0, end - searchRange);

        for (let row = end; row >= start; row--) {
          let isWhite = true;
          const rowOffset = row * imgWidthPx * 4;
          for (let x = 0; x < imgWidthPx; x += 4) {
            const idx = rowOffset + x * 4;
            if (
              fullPixels[idx] < 250 ||
              fullPixels[idx + 1] < 250 ||
              fullPixels[idx + 2] < 250
            ) {
              isWhite = false;
              break;
            }
          }
          if (isWhite) return row;
        }
        return targetY;
      }

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      let currentY = 0;
      let pageIndex = 0;

      while (currentY < imgHeightPx) {
        if (pageIndex > 0) pdf.addPage();

        let sliceEnd: number;
        const remaining = imgHeightPx - currentY;

        if (remaining <= pageHeightPx) {
          sliceEnd = imgHeightPx;
        } else {
          const idealEnd = currentY + pageHeightPx;
          // Search within ~12mm (about 3 text lines) for a natural break
          sliceEnd = findBreakPoint(Math.round(idealEnd), Math.round(pxPerMm * 12));
          if (sliceEnd <= currentY) sliceEnd = Math.round(idealEnd);
        }

        const sliceH = sliceEnd - currentY;
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) {
          currentY = sliceEnd;
          pageIndex++;
          continue;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, currentY, imgWidthPx, sliceH, 0, 0, imgWidthPx, sliceH);

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHMm = sliceH / pxPerMm;
        pdf.addImage(pageImgData, 'JPEG', MARGIN_MM, MARGIN_MM, contentW, sliceHMm);

        currentY = sliceEnd;
        pageIndex++;
      }

      const pdfFilename = file.name.replace(/\.docx?$/i, '') + '.pdf';
      pdf.save(pdfFilename);

      document.body.removeChild(container);
      document.head.removeChild(style);
    } catch (e) {
      try {
        document.body.removeChild(container);
      } catch {}
      try {
        document.head.removeChild(style);
      } catch {}
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
              Renders your document as a high-fidelity PDF with proper A4 layout and margins.
              Tables, lists, and formatting are preserved.
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

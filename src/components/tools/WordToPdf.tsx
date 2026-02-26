/**
 * Word to PDF — render DOCX using docx-preview, then print to PDF.
 *
 * Pipeline:
 *  1. docx-preview (battle-tested library, 174K weekly downloads) renders the
 *     DOCX into HTML+CSS — handling styles, lists, tables, images,
 *     headers/footers, footnotes, page breaks, and more.
 *  2. Rendered into an iframe (isolated from Tailwind CSS preflight).
 *  3. Browser's native print engine renders to PDF (pixel-perfect output).
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
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setRendered(false);
    setRendering(true);

    try {
      const { renderAsync } = await import('docx-preview');
      const arrayBuffer = await f.arrayBuffer();

      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) throw new Error('Preview container not available');
      const iDoc = iframe.contentDocument;

      // Reset iframe to a clean document
      iDoc.open();
      iDoc.write('<!DOCTYPE html><html><head></head><body></body></html>');
      iDoc.close();

      // Render DOCX into the iframe's document (completely isolated from Tailwind)
      await renderAsync(arrayBuffer, iDoc.body, iDoc.head, {
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        experimental: false, // Tab stops use document.createRange — incompatible with cross-document rendering
        useBase64URL: true, // Critical: blob URLs don't work in the print window
        ignoreLastRenderedPageBreak: false,
        inWrapper: true,
        className: 'docx',
      });

      // Preview-only styles (screen only — NOT included in print output)
      const previewStyle = iDoc.createElement('style');
      previewStyle.textContent = `
        @media screen {
          body { margin: 0; padding: 12px; background: #f5f5f5; }
          .docx-wrapper { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        }
      `;
      iDoc.head.appendChild(previewStyle);

      setFile(f);
      setRendered(true);
    } catch (e) {
      setError(
        'Could not read this file — ' +
          (e instanceof Error ? e.message : 'make sure it is a .docx file (not .doc).')
      );
    }
    setRendering(false);
  }, []);

  const convertToPdf = useCallback(() => {
    if (!rendered || !file || !iframeRef.current?.contentDocument) return;
    setError('');

    const iDoc = iframeRef.current.contentDocument;
    const docName = file.name.replace(/\.docx?$/i, '').replace(/[<>&"']/g, '');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Pop-up blocked — please allow pop-ups for this site to save as PDF.');
      return;
    }

    // Extract the rendered HTML and styles from the iframe
    const headContent = iDoc.head.innerHTML;
    const bodyContent = iDoc.body.innerHTML;

    // Detect page dimensions from docx-preview's rendered sections
    // (each <section class="docx"> has inline styles with the page size)
    let pageSizeRule = '@page { margin: 0; }';
    const firstSection = iDoc.querySelector('section.docx') as HTMLElement | null;
    if (firstSection) {
      const style = firstSection.getAttribute('style') || '';
      const wMatch = style.match(/width:\s*([\d.]+)\s*pt/);
      const hMatch = style.match(/min-height:\s*([\d.]+)\s*pt/);
      if (wMatch && hMatch) {
        pageSizeRule = `@page { size: ${wMatch[1]}pt ${hMatch[1]}pt; margin: 0; }`;
      }
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${docName}</title>
${headContent}
<style>
  ${pageSizeRule}
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    .docx-wrapper {
      background: #fff !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    /* Each docx-preview page section — force proper page breaks */
    section.docx {
      box-shadow: none !important;
      margin: 0 !important;
      page-break-after: always;
      break-after: page;
      overflow: visible !important;
    }
    section.docx:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* Prevent elements from breaking across pages */
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
    table { page-break-inside: avoid; break-inside: avoid; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    img { page-break-inside: avoid; break-inside: avoid; }
  }
  body {
    margin: 0; padding: 0; background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img { max-width: 100%; }
</style>
</head><body>${bodyContent}</body></html>`);
    printWindow.document.close();

    const triggerPrint = () => {
      try { printWindow.print(); } catch {}
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 300);
    } else {
      printWindow.addEventListener('load', () => setTimeout(triggerPrint, 300));
      setTimeout(triggerPrint, 3000);
    }
  }, [rendered, file]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          acceptLabel="Supports: DOCX files (Word 2007+)"
          onFiles={handleFiles}
        />

        {file && rendered && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <FileText size={20} className="text-primary-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
              </div>
            </div>

            <button
              onClick={convertToPdf}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-150"
            >
              <Download size={16} aria-hidden="true" />
              Save as PDF
            </button>

            <p className="text-xs text-neutral-400">
              Opens your browser's print dialog — select "Save as PDF" for
              pixel-perfect output with fonts, images, tables, and lists preserved.
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

        {rendering && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div
              className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm text-primary-700">Rendering Word document...</span>
          </div>
        )}

        {rendered && (
          <p className="text-sm font-medium text-neutral-700">Document Preview</p>
        )}

        {/*
          Iframe for docx-preview rendering — completely isolated from
          Tailwind CSS preflight so headings, lists, tables, paragraph
          spacing, etc. render correctly with browser default styles.
        */}
        <iframe
          ref={iframeRef}
          title="Document preview"
          className={rendered
            ? 'w-full bg-white rounded-2xl border border-neutral-200/80 shadow-card'
            : ''}
          style={rendered
            ? { height: '600px', border: 'none' }
            : { position: 'fixed', left: '-10000px', top: '0', width: '794px', height: '1123px', border: 'none' }}
        />

        {!rendered && !rendering && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">
              Upload a Word document (.docx) to convert it to PDF
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Preview appears here, then download as PDF
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

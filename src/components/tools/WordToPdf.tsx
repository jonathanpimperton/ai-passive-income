/**
 * Word to PDF — client-side DOCX to PDF converter.
 *
 * Pipeline:
 *  1. docx-preview renders the DOCX into a same-document container
 *     for a high-fidelity preview (preserves fonts, spacing, colors).
 *  2. For PDF conversion the DOCX is re-rendered into a hidden
 *     container. All decorative styles (wrapper padding/bg, section
 *     shadows/margins/overflow) are stripped so we get a single
 *     continuous block of clean page content.
 *  3. html2canvas captures the entire rendered content as one tall
 *     canvas — no assumptions about page or section breaks.
 *  4. The canvas is sliced into page-height chunks using the page
 *     dimensions from the DOCX (read from the section inline style).
 *  5. jsPDF assembles the slices into a multi-page PDF.
 *
 * Both preview and conversion containers use the
 * `docx-preview-container` class, triggering `all: revert` in
 * global.css to neutralise Tailwind preflight. Without this,
 * margins, line-heights, and fonts render incorrectly.
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
  const [converting, setConverting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewStylesRef = useRef<HTMLStyleElement[]>([]);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setRendered(false);
    setRendering(true);

    // Clean up previous preview styles
    previewStylesRef.current.forEach((s) => s.remove());
    previewStylesRef.current = [];

    try {
      const { renderAsync } = await import('docx-preview');
      const arrayBuffer = await f.arrayBuffer();
      arrayBufferRef.current = arrayBuffer;

      const container = previewRef.current;
      if (!container) throw new Error('Preview container not available');

      // Clear previous content
      container.innerHTML = '';

      // Create style target inside the container
      const styleHost = document.createElement('div');
      styleHost.style.display = 'none';
      container.appendChild(styleHost);

      // Render DOCX into the preview container (main document, not iframe)
      await renderAsync(arrayBuffer, container, styleHost, {
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        experimental: false,
        useBase64URL: true,
        ignoreLastRenderedPageBreak: false,
        inWrapper: true,
        className: 'docx',
      });

      // Move docx-preview <style> elements to document head so they apply
      const styles: HTMLStyleElement[] = [];
      styleHost.querySelectorAll('style').forEach((s) => {
        const clone = s.cloneNode(true) as HTMLStyleElement;
        document.head.appendChild(clone);
        styles.push(clone);
      });
      previewStylesRef.current = styles;

      setFile(f);
      setRendered(true);
    } catch (e) {
      setError(
        'Could not read this file — ' +
          (e instanceof Error ? e.message : 'make sure it is a .docx file (not .doc).'),
      );
    }
    setRendering(false);
  }, []);

  const convertToPdf = useCallback(async () => {
    if (!rendered || !file || !arrayBufferRef.current) return;
    setError('');
    setConverting(true);
    setProgressMsg('Preparing document...');

    // Create a hidden container for conversion rendering.
    // We re-render here so the visible preview stays untouched.
    const convContainer = document.createElement('div');
    convContainer.style.cssText =
      'position:fixed;left:0;top:0;width:794px;z-index:-9999;opacity:0;pointer-events:none;overflow:visible;';
    document.body.appendChild(convContainer);

    const styleContainer = document.createElement('div');
    convContainer.appendChild(styleContainer);
    const contentContainer = document.createElement('div');
    // Must match the preview container's class so the same `all: revert`
    // rule (in global.css) neutralises Tailwind preflight. Without this,
    // headings, margins, line-heights, and fonts render differently from
    // the preview, producing a visually broken PDF.
    contentContainer.className = 'docx-preview-container';
    convContainer.appendChild(contentContainer);

    try {
      const [{ renderAsync }, html2canvasModule, jsPDFModule] = await Promise.all([
        import('docx-preview'),
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      setProgressMsg('Rendering document for conversion...');

      // Re-render the DOCX via docx-preview for page-accurate layout
      await renderAsync(arrayBufferRef.current, contentContainer, styleContainer, {
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        experimental: false,
        useBase64URL: true,
        ignoreLastRenderedPageBreak: false,
        inWrapper: true,
        className: 'docx',
      });

      // Move docx-preview styles into document head temporarily
      const tempStyles: HTMLStyleElement[] = [];
      styleContainer.querySelectorAll('style').forEach((s) => {
        const clone = s.cloneNode(true) as HTMLStyleElement;
        document.head.appendChild(clone);
        tempStyles.push(clone);
      });

      // Read page dimensions from the first section's inline style.
      // docx-preview always creates at least one <section> even for a
      // document with zero explicit page/section breaks.
      const firstSection = contentContainer.querySelector('section.docx') as HTMLElement | null;
      let pageWidthPt = 595.28; // A4 defaults
      let pageHeightPt = 841.89;
      if (firstSection) {
        const s = firstSection.getAttribute('style') || '';
        const w = s.match(/width:\s*([\d.]+)\s*pt/);
        const h = s.match(/min-height:\s*([\d.]+)\s*pt/);
        if (w) pageWidthPt = parseFloat(w[1]);
        if (h) pageHeightPt = parseFloat(h[1]);
      }

      // Strip all decorative wrapper/section styles so we get a single
      // continuous block of clean content for capture. docx-preview adds
      // wrapper padding, gray background, section shadows, 30px gaps
      // between sections, and overflow:hidden on sections — all of which
      // would corrupt the canvas or clip content.
      const wrapper = contentContainer.querySelector('.docx-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.cssText = 'padding:0;margin:0;background:#fff;display:block;';
      }
      contentContainer.querySelectorAll('section.docx').forEach((el) => {
        const se = el as HTMLElement;
        se.style.marginBottom = '0';
        se.style.boxShadow = 'none';
        se.style.overflow = 'visible';
      });

      // Make container visible for html2canvas and let content dictate width
      convContainer.style.opacity = '1';
      convContainer.style.width = 'auto';

      // Capture the entire rendered content as one tall canvas.
      // We capture the wrapper (or container) — NOT individual sections —
      // so the result is correct regardless of how docx-preview splits
      // (or doesn't split) the DOM.
      const captureTarget = wrapper || contentContainer;
      setProgressMsg('Capturing document...');

      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Slice the tall canvas into page-height chunks.
      // pxPerPt converts between the canvas pixel space and the PDF
      // point space using the known page width as the reference.
      const pxPerPt = canvas.width / pageWidthPt;
      const pageHeightPx = pageHeightPt * pxPerPt;
      const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

      const pdf = new jsPDF({
        orientation: pageWidthPt > pageHeightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageWidthPt, pageHeightPt],
      });

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage([pageWidthPt, pageHeightPt]);
        setProgressMsg(`Rendering page ${p + 1} of ${totalPages}...`);

        const srcY = p * pageHeightPx;
        const srcH = Math.min(pageHeightPx, canvas.height - srcY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.round(pageHeightPx);
        const pCtx = pageCanvas.getContext('2d')!;
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pCtx.drawImage(
          canvas,
          0, Math.round(srcY), canvas.width, Math.round(srcH),
          0, 0, canvas.width, Math.round(srcH),
        );

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthPt, pageHeightPt);
      }

      const docName = file.name.replace(/\.docx?$/i, '').replace(/[<>&"']/g, '');
      pdf.save(`${docName}.pdf`);

      // Clean up temporary styles
      tempStyles.forEach((s) => s.remove());
    } catch (e) {
      setError(
        'Conversion failed — ' +
          (e instanceof Error ? e.message : 'please try again.'),
      );
    } finally {
      convContainer.remove();
    }
    setConverting(false);
    setProgressMsg('');
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
              disabled={converting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {converting ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  {progressMsg || 'Converting...'}
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as PDF
                </>
              )}
            </button>

            <p className="text-xs text-neutral-400">
              Renders each page to an image and assembles into a PDF — page
              breaks are guaranteed.
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
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

        <div
          ref={previewRef}
          className={
            rendered
              ? 'docx-preview-container bg-white rounded-2xl border border-neutral-200/80 shadow-card overflow-y-auto'
              : 'docx-preview-container'
          }
          style={rendered ? { maxHeight: '600px' } : { display: 'none' }}
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

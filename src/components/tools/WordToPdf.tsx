/**
 * Word to PDF — render DOCX using docx-preview, then capture to PDF.
 *
 * Pipeline:
 *  1. docx-preview renders the DOCX into an iframe for preview
 *     (isolated from Tailwind CSS preflight).
 *  2. For PDF conversion, re-renders into a hidden main-document container
 *     so html2canvas can access all styles in the same document context.
 *  3. html2canvas renders each page section to a canvas image.
 *  4. jsPDF assembles the canvases into a multi-page PDF.
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setRendered(false);
    setRendering(true);

    try {
      const { renderAsync } = await import('docx-preview');
      const arrayBuffer = await f.arrayBuffer();
      arrayBufferRef.current = arrayBuffer;

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
        experimental: false,
        useBase64URL: true,
        ignoreLastRenderedPageBreak: false,
        inWrapper: true,
        className: 'docx',
        hideWrapperOnPrint: true,
      });

      // Preview-only styles
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

  const convertToPdf = useCallback(async () => {
    if (!rendered || !file || !arrayBufferRef.current) return;
    setError('');
    setConverting(true);
    setProgressMsg('Preparing document...');

    // Create a temporary container in the MAIN document for conversion.
    // html2canvas needs elements in the same document context to access styles.
    const convContainer = document.createElement('div');
    convContainer.style.cssText =
      'position:fixed;left:0;top:0;width:794px;z-index:-9999;opacity:0;pointer-events:none;overflow:hidden;';
    document.body.appendChild(convContainer);

    // We need a head container for docx-preview styles
    const styleContainer = document.createElement('div');
    convContainer.appendChild(styleContainer);
    const contentContainer = document.createElement('div');
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

      // Re-render the DOCX into the main-document container
      // This creates style elements as children of styleContainer
      // and section elements as children of contentContainer
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

      // Move any <style> elements from styleContainer into the document head temporarily
      const tempStyles: HTMLStyleElement[] = [];
      styleContainer.querySelectorAll('style').forEach((s) => {
        const clone = s.cloneNode(true) as HTMLStyleElement;
        document.head.appendChild(clone);
        tempStyles.push(clone);
      });

      // Make container visible (but behind everything) for html2canvas measurement
      convContainer.style.opacity = '1';

      const sections = contentContainer.querySelectorAll('section.docx');

      if (sections.length === 0) {
        throw new Error('No page sections found in the rendered document');
      }

      // Read page dimensions from the first section's inline style (in pt)
      const firstStyle = sections[0].getAttribute('style') || '';
      const wMatch = firstStyle.match(/width:\s*([\d.]+)\s*pt/);
      const hMatch = firstStyle.match(/min-height:\s*([\d.]+)\s*pt/);
      const pageWidthPt = wMatch ? parseFloat(wMatch[1]) : 595.28;
      const pageHeightPt = hMatch ? parseFloat(hMatch[1]) : 841.89;

      // Create PDF with page size matching the DOCX page dimensions
      const pdf = new jsPDF({
        orientation: pageWidthPt > pageHeightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageWidthPt, pageHeightPt],
      });

      let pdfPageCount = 0;

      for (let i = 0; i < sections.length; i++) {
        setProgressMsg(`Rendering section ${i + 1} of ${sections.length}...`);

        const section = sections[i] as HTMLElement;

        // Render this section to a canvas at 2x scale for print quality
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: section.scrollWidth || 794,
          windowHeight: section.scrollHeight || 1123,
        });

        // Calculate how many PDF pages this section spans.
        const pxPerPt = canvas.width / pageWidthPt;
        const pageHeightPx = pageHeightPt * pxPerPt;
        const sectionPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

        for (let p = 0; p < sectionPages; p++) {
          if (pdfPageCount > 0) pdf.addPage([pageWidthPt, pageHeightPt]);
          pdfPageCount++;

          setProgressMsg(`Rendering page ${pdfPageCount}...`);

          // Slice the corresponding vertical portion of the canvas
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
            0, srcY, canvas.width, Math.round(srcH),
            0, 0, canvas.width, Math.round(srcH),
          );

          const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthPt, pageHeightPt);
        }
      }

      // Save with the document name
      const docName = file.name.replace(/\.docx?$/i, '').replace(/[<>&"']/g, '');
      pdf.save(`${docName}.pdf`);

      // Clean up temporary styles
      tempStyles.forEach((s) => s.remove());
    } catch (e) {
      setError(
        'Conversion failed — ' +
          (e instanceof Error ? e.message : 'please try again.')
      );
    } finally {
      // Clean up temporary container
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

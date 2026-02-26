/**
 * Word to PDF — client-side DOCX to PDF converter.
 *
 * Pipeline:
 *  1. docx-preview renders the DOCX into a hidden container. The library
 *     splits content at page/section breaks (if any), creating one
 *     <section class="docx"> per page. A document with NO explicit
 *     breaks produces a single tall section.
 *  2. Each section is captured individually with html2canvas at its full
 *     rendered height. Capturing per-section (not the wrapper) ensures
 *     canvas.width == section width, giving an exact pxPerPt ratio.
 *  3. For multi-page sections (no-break documents), we slice the content
 *     area into pages. Instead of blindly cutting at fixed intervals, we
 *     scan the canvas pixels to find natural break points (whitespace
 *     between paragraphs) near each page boundary. This prevents lines
 *     from the next page bleeding onto the current one.
 *  4. jsPDF assembles the pages into a multi-page PDF.
 *
 * Both preview and conversion containers use the `docx-preview-container`
 * class, triggering `all: revert` in global.css to neutralise Tailwind
 * preflight. No styles are modified on the conversion container.
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

/**
 * Scan canvas pixels upward from `targetY` to find a row that is mostly
 * whitespace — indicating a gap between paragraphs. This gives us a natural
 * page break position rather than cutting blindly at a fixed interval.
 *
 * Searches within `[targetY - searchRange, targetY]` for a band of at least
 * `minGap` consecutive mostly-white rows. Returns the TOP of that gap
 * (content ends there, blank space follows). Falls back to `targetY` if no
 * gap is found.
 */
function findNaturalBreak(
  ctx: CanvasRenderingContext2D,
  targetY: number,
  searchRange: number,
  contentLeftPx: number,
  contentWidthPx: number,
  minGap: number,
): number {
  const scanWidth = Math.max(1, Math.round(contentWidthPx));
  const scanLeft = Math.max(0, Math.round(contentLeftPx));
  let consecutive = 0;

  for (let y = Math.round(targetY); y > Math.round(targetY - searchRange); y--) {
    if (y < 0) break;
    const row = ctx.getImageData(scanLeft, y, scanWidth, 1).data;
    let white = 0;
    for (let i = 0; i < row.length; i += 4) {
      if (row[i] > 240 && row[i + 1] > 240 && row[i + 2] > 240) white++;
    }
    if (white / (scanWidth) >= 0.97) {
      consecutive++;
      if (consecutive >= minGap) {
        // Return the top of the gap — this is where content ends
        return y;
      }
    } else {
      consecutive = 0;
    }
  }
  return Math.round(targetY);
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

      // Make container visible for html2canvas
      convContainer.style.opacity = '1';

      // Find all rendered sections. docx-preview creates one per page
      // when the DOCX has page/section breaks (e.g., Word-saved files
      // with lastRenderedPageBreak). A document with NO breaks produces
      // a single tall section — handled by the multi-page branch below.
      const sections = contentContainer.querySelectorAll('section.docx');
      if (sections.length === 0) {
        throw new Error('No content found in the rendered document');
      }

      // Read page dimensions from the first section's inline style
      const firstSection = sections[0] as HTMLElement;
      const inlineStyle = firstSection.getAttribute('style') || '';
      const pageWidthPt = parseFloat(inlineStyle.match(/width:\s*([\d.]+)\s*pt/)?.[1] || '') || 595.28;
      const pageHeightPt = parseFloat(inlineStyle.match(/min-height:\s*([\d.]+)\s*pt/)?.[1] || '') || 841.89;

      // Read page margins (section padding) for the multi-page slice case
      const cs = window.getComputedStyle(firstSection);
      const marginTopCss = parseFloat(cs.paddingTop) || 0;
      const marginBottomCss = parseFloat(cs.paddingBottom) || 0;
      const marginLeftCss = parseFloat(cs.paddingLeft) || 0;
      const marginRightCss = parseFloat(cs.paddingRight) || 0;

      const SCALE = 2;

      const pdf = new jsPDF({
        orientation: pageWidthPt > pageHeightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageWidthPt, pageHeightPt],
      });

      let pdfPageCount = 0;

      // Process each section individually. Capturing per-section (not
      // the wrapper) guarantees canvas.width == section rendered width,
      // so pxPerPt is exact and page-height slicing aligns correctly.
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        setProgressMsg(`Capturing section ${i + 1} of ${sections.length}...`);

        const canvas = await html2canvas(section, {
          scale: SCALE,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const pxPerPt = canvas.width / pageWidthPt;
        const pageHeightPx = pageHeightPt * pxPerPt;

        const marginTopPx = marginTopCss * SCALE;
        const marginBottomPx = marginBottomCss * SCALE;
        const contentLeftPx = marginLeftCss * SCALE;
        const contentWidthPx = canvas.width - (marginLeftCss + marginRightCss) * SCALE;
        const contentStartPx = marginTopPx;
        const contentEndPx = canvas.height - marginBottomPx;
        const pageContentPx = pageHeightPx - marginTopPx - marginBottomPx;

        // Use the section canvas context to scan for natural break points
        const sectionCtx = canvas.getContext('2d')!;
        // Search range: bottom 15% of page content area — enough to find
        // a paragraph gap without losing too much content per page.
        const searchRange = pageContentPx * 0.15;
        // Require 4+ consecutive white rows to count as a paragraph gap
        // (avoids cutting at thin inter-line spacing).
        const minGap = Math.max(4, Math.round(SCALE * 3));

        // Dynamic page loop: find natural break points instead of fixed slices.
        // Each iteration moves `sliceStart` forward by the actual amount used.
        let sliceStart = contentStartPx;
        while (sliceStart < contentEndPx) {
          if (pdfPageCount > 0) pdf.addPage([pageWidthPt, pageHeightPt]);
          pdfPageCount++;
          setProgressMsg(`Rendering page ${pdfPageCount}...`);

          const remaining = contentEndPx - sliceStart;
          let srcH: number;

          if (remaining <= pageContentPx * 1.1) {
            // Remaining content fits on one page (with up to 10% slack)
            srcH = remaining;
          } else {
            // Find a natural break point (paragraph gap) near the ideal boundary
            const idealEnd = sliceStart + pageContentPx;
            const breakY = findNaturalBreak(
              sectionCtx, idealEnd, searchRange,
              contentLeftPx, contentWidthPx, minGap,
            );
            srcH = breakY - sliceStart;
            // Safety: if findNaturalBreak returned something too small, use the
            // ideal boundary to avoid degenerate tiny pages.
            if (srcH < pageContentPx * 0.5) srcH = Math.min(pageContentPx, remaining);
          }

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.round(pageHeightPx);
          const pCtx = pageCanvas.getContext('2d')!;
          pCtx.fillStyle = '#ffffff';
          pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          // Place content below the top margin; left/right margins
          // are already embedded in the full-width canvas slice.
          pCtx.drawImage(
            canvas,
            0, Math.round(sliceStart), canvas.width, Math.round(srcH),
            0, Math.round(marginTopPx), canvas.width, Math.round(srcH),
          );

          const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthPt, pageHeightPt);

          sliceStart += srcH;
        }
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

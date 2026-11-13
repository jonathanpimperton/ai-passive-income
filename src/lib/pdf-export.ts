/**
 * Client-side PDF export for financial calculator results.
 * Uses html-to-image to capture the rendered results panel (charts, tables,
 * breakdowns) and jsPDF to compose a branded PDF with inputs + visual results.
 *
 * html-to-image uses the browser's own rendering engine (foreignObject SVG),
 * so it supports all CSS the browser supports -- including oklab/oklch colors
 * from Tailwind CSS v4, which html2canvas cannot parse.
 *
 * Page-break algorithm: elements with [data-pdf-section] mark safe break
 * boundaries. The chunking loop prefers breaking between sections so that
 * table headers, chart titles, and summary blocks are never orphaned.
 *
 * Capture conditions (review CALC-UX-B, PDF S3s):
 * - Waits for lazily loaded charts: every [data-chart-pending] inside the
 *   results must clear (5 s max), then the DOM must be quiet (chart
 *   animations finished).
 * - Always captured in the light theme, so dark-mode exports aren't
 *   low-contrast. The theme is restored afterwards.
 * - Captured at a fixed desktop width (760 px) when the panel is narrower
 *   (phones), so mobile exports don't double the page count.
 * - Pages are JPEG, not PNG: typical files are well under 3 MB.
 * - Precision Instrument header/footer (ink + teal), no "Free", dates in
 *   the display currency's locale, page numbers.
 * Every temporary change is undone in a finally block.
 */

export interface PdfInput {
  label: string;
  value: string;
}

export interface PdfExportOptions {
  toolName: string;
  inputs: PdfInput[];
  resultsElement: HTMLElement;
  /** Display currency (USD/GBP/EUR): sets the date format. Default USD. */
  currency?: string;
}

/* -- Tunables ------------------------------------------------------------ */

const CAPTURE_WIDTH = 760;
const MIN_NATURAL_WIDTH = 700;
const CHART_WAIT_MS = 5000;
const QUIET_MS = 250;
const QUIET_MAX_MS = 2500;
const PIXEL_RATIO = 2;
const JPEG_QUALITY = 0.82;

/* -- Pure helpers (unit-tested) ------------------------------------------ */

/** Date locale per display currency (English month names everywhere). */
const DATE_LOCALES: Record<string, string> = { USD: 'en-US', GBP: 'en-GB', EUR: 'en-IE' };

export function formatPdfDate(date: Date, currency?: string): string {
  return date.toLocaleDateString(DATE_LOCALES[currency ?? ''] ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function pdfFilename(toolName: string): string {
  const base = toolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'calcrun'}-results.pdf`;
}

/**
 * Choose a page-break position: the last safe boundary that fits, else a
 * raw slice. All values in canvas pixels.
 */
export function chooseChunk(srcY: number, remainingPx: number, maxChunkPx: number, minChunkPx: number, breakPoints: number[]): number {
  if (remainingPx <= maxChunkPx) return remainingPx;
  const candidates = breakPoints.filter((bp) => bp > srcY + minChunkPx && bp <= srcY + maxChunkPx);
  if (candidates.length > 0) return candidates[candidates.length - 1] - srcY;
  return maxChunkPx;
}

/* -- Waiting for the page to settle -------------------------------------- */

function nextFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });
}

/** Resolve true when no [data-chart-pending] remains inside `root`, false after `timeoutMs`. */
export function waitForChartsReady(root: HTMLElement, timeoutMs = CHART_WAIT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (!root.querySelector('[data-chart-pending]')) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(check, 50);
    };
    check();
  });
}

/** Resolve once `root` has had no DOM mutations for `quietMs` (or after `maxMs`). */
function waitForQuiet(root: HTMLElement, quietMs: number, maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer = setTimeout(done, quietMs);
    const maxTimer = setTimeout(done, maxMs);
    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(done, quietMs);
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    function done() {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    }
  });
}

/* -- Temporary capture conditions (each returns its undo) ---------------- */

function forceLightTheme(): { restore: () => void; switched: boolean } {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  if (previous !== 'dark') return { restore: () => {}, switched: false };
  root.setAttribute('data-theme', 'light');
  return { restore: () => root.setAttribute('data-theme', previous), switched: true };
}

function fixCaptureWidth(el: HTMLElement): () => void {
  if (el.getBoundingClientRect().width >= MIN_NATURAL_WIDTH) return () => {};
  const prev = { width: el.style.width, maxWidth: el.style.maxWidth, minWidth: el.style.minWidth };
  el.style.width = `${CAPTURE_WIDTH}px`;
  el.style.maxWidth = 'none';
  el.style.minWidth = `${CAPTURE_WIDTH}px`;
  return () => {
    el.style.width = prev.width;
    el.style.maxWidth = prev.maxWidth;
    el.style.minWidth = prev.minWidth;
  };
}

/** A full-screen "Creating your PDF" veil, so the theme/width switch never flashes. */
function showVeil(): () => void {
  const veil = document.createElement('div');
  veil.setAttribute('aria-hidden', 'true');
  veil.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/85 text-sm font-medium text-white';
  veil.textContent = 'Creating your PDF\u2026';
  document.body.appendChild(veil);
  return () => veil.remove();
}

// -- Pre-capture style overrides ----------------------------------------
// Temporarily neutralise overflow, sticky, and max-height so
// html-to-image captures the full, un-scrolled content without
// scrollbar artefacts.

interface SavedStyles {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
  maxHeight: string;
  position: string;
}

function neutraliseScrollStyles(root: HTMLElement): SavedStyles[] {
  const saved: SavedStyles[] = [];

  // Any element with overflow-related classes or inline styles
  const candidates = root.querySelectorAll<HTMLElement>(
    '[class*="overflow"], [style*="overflow"], [class*="max-h-"]',
  );

  candidates.forEach((el) => {
    const cs = getComputedStyle(el);
    const needsFix =
      cs.overflow !== 'visible' ||
      cs.overflowX !== 'visible' ||
      cs.overflowY !== 'visible';

    if (needsFix) {
      saved.push({
        el,
        overflow: el.style.overflow,
        overflowX: el.style.overflowX,
        overflowY: el.style.overflowY,
        maxHeight: el.style.maxHeight,
        position: el.style.position,
      });
      el.style.overflow = 'visible';
      el.style.overflowX = 'visible';
      el.style.overflowY = 'visible';
      el.style.maxHeight = 'none';
    }
  });

  // Also kill sticky positioning (headers inside scroll containers)
  root.querySelectorAll<HTMLElement>('[class*="sticky"]').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'sticky') {
      const existing = saved.find((s) => s.el === el);
      if (existing) {
        // Already tracked -- just patch position
        el.style.position = 'relative';
      } else {
        saved.push({
          el,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
          maxHeight: el.style.maxHeight,
          position: el.style.position,
        });
        el.style.position = 'relative';
      }
    }
  });

  return saved;
}

function restoreScrollStyles(saved: SavedStyles[]) {
  saved.forEach(({ el, overflow, overflowX, overflowY, maxHeight, position }) => {
    el.style.overflow = overflow;
    el.style.overflowX = overflowX;
    el.style.overflowY = overflowY;
    el.style.maxHeight = maxHeight;
    el.style.position = position;
  });
}

// -- Section boundary detection -----------------------------------------
// Elements with [data-pdf-section] mark logical visual blocks.
// Their top edges (relative to the results container) become
// candidate page-break positions.

function collectBreakPoints(root: HTMLElement, pixelRatio: number): number[] {
  const containerRect = root.getBoundingClientRect();
  const points: number[] = [];

  function addTop(el: Element) {
    const rect = el.getBoundingClientRect();
    const topPx = Math.round((rect.top - containerRect.top) * pixelRatio);
    if (topPx > 0) points.push(topPx);
  }

  // Section-level breaks (charts, cards, table wrappers)
  root.querySelectorAll<HTMLElement>('[data-pdf-section]').forEach(addTop);

  // Row-level breaks inside tables -- prevents slicing through rows
  // when a table section is taller than a full page.
  root.querySelectorAll<HTMLElement>('tbody tr').forEach(addTop);

  // Dedupe and sort ascending
  return [...new Set(points)].sort((a, b) => a - b);
}

// -- Brand palette (Precision Instrument) --------------------------------

type RGB = [number, number, number];
const INK: RGB = [20, 22, 26]; // #14161A
const TEAL: RGB = [11, 110, 110]; // #0B6E6E
const MUTED: RGB = [107, 114, 128]; // #6B7280
const HAIRLINE: RGB = [228, 228, 224]; // #E4E4E0
const STRIPE: RGB = [246, 246, 243];

// -- Main export ---------------------------------------------------------

/**
 * The PDF libraries could not be fetched (offline, deploy in progress).
 * Browsers remember a failed module fetch for the life of the page, so
 * asking again does not help: the caller tells the visitor to reload.
 */
export const PDF_LOAD_ERROR_NAME = 'PdfLibraryLoadError';

export class PdfLibraryLoadError extends Error {
  constructor(cause?: unknown) {
    super('Could not load the PDF libraries');
    this.name = PDF_LOAD_ERROR_NAME;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}


export async function exportToPdf(options: PdfExportOptions): Promise<void> {
  // Load the libraries first: if that fails, nothing on the page has changed.
  let jsPDF: typeof import('jspdf').jsPDF;
  let toCanvas: typeof import('html-to-image').toCanvas;
  try {
    [{ jsPDF }, { toCanvas }] = await Promise.all([import('jspdf'), import('html-to-image')]);
  } catch (err) {
    throw new PdfLibraryLoadError(err);
  }

  const { toolName, inputs, resultsElement, currency } = options;

  const undo: Array<() => void> = [];
  let canvas: HTMLCanvasElement;
  let breakPoints: number[];
  try {
    undo.push(showVeil());
    const theme = forceLightTheme();
    undo.push(theme.restore);
    undo.push(fixCaptureWidth(resultsElement));

    // Hide elements marked with data-pdf-hide during capture
    const hiddenEls = resultsElement.querySelectorAll<HTMLElement>('[data-pdf-hide]');
    const prevDisplays: string[] = [];
    hiddenEls.forEach((el, i) => {
      prevDisplays[i] = el.style.display;
      el.style.display = 'none';
    });
    undo.push(() => hiddenEls.forEach((el, i) => {
      el.style.display = prevDisplays[i];
    }));

    // Force-show collapsed sections (e.g. amortization schedule behind toggle)
    const forceShowEls = resultsElement.querySelectorAll<HTMLElement>('[data-pdf-force-show]');
    const prevForceShowDisplays: string[] = [];
    forceShowEls.forEach((el, i) => {
      prevForceShowDisplays[i] = el.style.display;
      el.style.display = '';
    });
    undo.push(() => forceShowEls.forEach((el, i) => {
      el.style.display = prevForceShowDisplays[i];
    }));

    // Neutralise scroll/overflow styles to prevent scrollbar artifacts
    const savedScrollStyles = neutraliseScrollStyles(resultsElement);
    undo.push(() => restoreScrollStyles(savedScrollStyles));

    // Let charts re-theme / re-measure, lazy charts arrive, and animations end.
    await nextFrames(2);
    await waitForChartsReady(resultsElement);
    await waitForQuiet(resultsElement, QUIET_MS, QUIET_MAX_MS);

    // Collect section break points AFTER every override so measurements
    // match the layout that html-to-image will actually capture.
    breakPoints = collectBreakPoints(resultsElement, PIXEL_RATIO);

    canvas = await toCanvas(resultsElement, {
      pixelRatio: PIXEL_RATIO,
      backgroundColor: '#FFFFFF',
    });
  } finally {
    // Always restore all overrides, newest first, even if capture throws
    for (let i = undo.length - 1; i >= 0; i--) undo[i]();
  }

  // -- Build PDF ----------------------------------------------------------
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  const cw = pw - m * 2;
  const footerReserve = 16;

  // -- Header -----------------------------------------------------------
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pw, 2, 'F');

  // Mark: rounded teal square with the rising spark line (24-unit icon scaled to 7 mm)
  const markX = m;
  const markY = 8;
  const s = 7 / 24;
  doc.setFillColor(...TEAL);
  doc.roundedRect(markX + s, markY + s, 22 * s, 22 * s, 6 * s, 6 * s, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.55);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  const pt = (x: number, y: number): [number, number] => [markX + x * s, markY + y * s];
  const spark: Array<[number, number]> = [pt(6, 15.5), pt(10.5, 11), pt(13.5, 13.5), pt(18, 8.5)];
  for (let i = 1; i < spark.length; i++) doc.line(spark[i - 1][0], spark[i - 1][1], spark[i][0], spark[i][1]);
  doc.line(...pt(18, 8.5), ...pt(14.8, 8.5));
  doc.line(...pt(18, 8.5), ...pt(18, 11.7));

  // Wordmark
  let y = 13.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('Calc', markX + 9, y);
  const calcW = doc.getTextWidth('Calc');
  doc.setTextColor(...TEAL);
  doc.text('Run', markX + 9 + calcW, y);

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(formatPdfDate(new Date(), currency), pw - m, y, { align: 'right' });

  // Tool name
  y = 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(toolName, m, y);

  // Divider
  y += 4;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(m, y, pw - m, y);
  y += 7;

  // -- Your Inputs ------------------------------------------------------
  if (inputs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text('Your inputs', m, y);
    y += 5;

    for (let i = 0; i < inputs.length; i++) {
      if (i % 2 === 0) {
        doc.setFillColor(...STRIPE);
        doc.rect(m, y - 3.5, cw, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(inputs[i].label, m + 2, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...INK);
      doc.text(inputs[i].value, pw - m - 2, y, { align: 'right' });

      y += 6;
    }

    y += 4;
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.3);
    doc.line(m, y, pw - m, y);
    y += 7;
  }

  // -- Results Screenshot ---------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text('Results', m, y);
  y += 4;

  const imgWidth = cw;
  const pxPerMm = canvas.width / imgWidth;
  const maxContent = ph - footerReserve;
  const minChunkPx = Math.round(20 * pxPerMm); // ~20 mm: prevents tiny slivers

  let srcY = 0;
  let firstChunk = true;
  const chunk = document.createElement('canvas');
  chunk.width = canvas.width;

  while (srcY < canvas.height) {
    const spaceOnPage = firstChunk ? maxContent - y : maxContent - m;
    const maxChunkPx = Math.round(spaceOnPage * pxPerMm);
    const chunkPx = chooseChunk(srcY, canvas.height - srcY, maxChunkPx, minChunkPx, breakPoints);

    if (!firstChunk) {
      doc.addPage();
      y = m;
    }

    // Slice the canvas and add it as a JPEG (white background, so no alpha is lost)
    chunk.height = chunkPx;
    const ctx = chunk.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, chunk.width, chunkPx);
      ctx.drawImage(canvas, 0, srcY, canvas.width, chunkPx, 0, 0, canvas.width, chunkPx);
      doc.addImage(chunk.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG', m, y, imgWidth, chunkPx / pxPerMm, undefined, 'FAST');
    }

    srcY += chunkPx;
    firstChunk = false;
  }
  // Release the large bitmaps promptly (matters on phones).
  chunk.width = 0;
  chunk.height = 0;
  canvas.width = 0;
  canvas.height = 0;

  // -- Footer on every page (second pass, so "Page X of Y" is known) -----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const fy = ph - 10;
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.3);
    doc.line(m, fy - 3, pw - m, fy - 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Generated by CalcRun.com', m, fy);
    doc.text('An estimate for information only. Not financial advice.', m, fy + 3);
    doc.text(`Page ${p} of ${pages}`, pw - m, fy, { align: 'right' });
  }

  // -- Download -----------------------------------------------------------
  doc.save(pdfFilename(toolName));
}

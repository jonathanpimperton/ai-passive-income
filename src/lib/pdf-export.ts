/**
 * Client-side PDF export for financial calculator results.
 * Uses html-to-image to capture the rendered results panel (charts, tables,
 * breakdowns) and jsPDF to compose a branded PDF with inputs + visual results.
 *
 * html-to-image uses the browser's own rendering engine (foreignObject SVG),
 * so it supports all CSS the browser supports — including oklab/oklch colors
 * from Tailwind CSS v4, which html2canvas cannot parse.
 *
 * Page-break algorithm: elements with [data-pdf-section] mark safe break
 * boundaries. The chunking loop prefers breaking between sections so that
 * table headers, chart titles, and summary blocks are never orphaned.
 */

export interface PdfInput {
  label: string;
  value: string;
}

export interface PdfExportOptions {
  toolName: string;
  inputs: PdfInput[];
  resultsElement: HTMLElement;
}

// ── Pre-capture style overrides ────────────────────────────
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
        // Already tracked — just patch position
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

// ── Section boundary detection ─────────────────────────────
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

  // Row-level breaks inside tables — prevents slicing through rows
  // when a table section is taller than a full page.
  root.querySelectorAll<HTMLElement>('tbody tr').forEach(addTop);

  // Dedupe and sort ascending
  return [...new Set(points)].sort((a, b) => a - b);
}

// ── Main export ────────────────────────────────────────────

export async function exportToPdf(options: PdfExportOptions): Promise<void> {
  const [{ jsPDF }, { toCanvas }] = await Promise.all([
    import('jspdf'),
    import('html-to-image'),
  ]);

  const { toolName, inputs, resultsElement } = options;
  const pixelRatio = 2;

  // Hide elements marked with data-pdf-hide during capture
  const hiddenEls = resultsElement.querySelectorAll<HTMLElement>('[data-pdf-hide]');
  const prevDisplays: string[] = [];
  hiddenEls.forEach((el, i) => {
    prevDisplays[i] = el.style.display;
    el.style.display = 'none';
  });

  // Neutralise scroll/overflow styles to prevent scrollbar artifacts
  const savedScrollStyles = neutraliseScrollStyles(resultsElement);

  // Collect section break points AFTER style overrides so measurements
  // match the layout that html-to-image will actually capture.
  // (Removing overflow/sticky changes element heights and positions.)
  const breakPoints = collectBreakPoints(resultsElement, pixelRatio);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await toCanvas(resultsElement, {
      pixelRatio,
      backgroundColor: '#FAFAFA',
    });
  } finally {
    // Always restore all overrides, even if capture throws
    restoreScrollStyles(savedScrollStyles);
    hiddenEls.forEach((el, i) => {
      el.style.display = prevDisplays[i];
    });
  }

  // ── Build PDF ──────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  const cw = pw - m * 2;
  const footerReserve = 16;

  function addFooter() {
    const fy = ph - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(m, fy - 3, pw - m, fy - 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by CalcRun.com — Free financial calculators.', m, fy);
    doc.text(
      'This is an estimate for informational purposes only. Not financial advice.',
      m,
      fy + 3,
    );
  }

  // ── Header ─────────────────────────────────────────────
  // Accent bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pw, 3, 'F');

  // Logo
  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10, 37, 64);
  doc.text('Calc', m, y);
  const calcW = doc.getTextWidth('Calc');
  doc.setTextColor(37, 99, 235);
  doc.text('Run', m + calcW, y);

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(dateStr, pw - m, y, { align: 'right' });

  // Tool name
  y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 37, 64);
  doc.text(toolName, m, y);

  // Divider
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(m, y, pw - m, y);
  y += 7;

  // ── Your Inputs ────────────────────────────────────────
  if (inputs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(10, 37, 64);
    doc.text('Your Inputs', m, y);
    y += 5;

    for (let i = 0; i < inputs.length; i++) {
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(m, y - 3.5, cw, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(inputs[i].label, m + 2, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(10, 37, 64);
      doc.text(inputs[i].value, pw - m - 2, y, { align: 'right' });

      y += 6;
    }

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(m, y, pw - m, y);
    y += 7;
  }

  // ── Results Screenshot ─────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(10, 37, 64);
  doc.text('Results', m, y);
  y += 4;

  const imgWidth = cw;
  const pxPerMm = canvas.width / imgWidth;
  const maxContent = ph - footerReserve;

  // Minimum chunk height (px) — prevents tiny slivers
  const minChunkPx = Math.round(20 * pxPerMm); // ~20 mm

  let srcY = 0;
  let firstChunk = true;

  while (srcY < canvas.height) {
    const spaceOnPage = firstChunk ? maxContent - y : maxContent - m;
    const maxChunkPx = Math.round(spaceOnPage * pxPerMm);
    const remainingPx = canvas.height - srcY;

    let chunkPx: number;

    if (remainingPx <= maxChunkPx) {
      // Everything left fits on this page
      chunkPx = remainingPx;
    } else if (breakPoints.length > 0) {
      // Find the last section boundary that fits on this page
      const candidates = breakPoints.filter(
        (bp) => bp > srcY + minChunkPx && bp <= srcY + maxChunkPx,
      );

      if (candidates.length > 0) {
        // Break at the last safe boundary
        chunkPx = candidates[candidates.length - 1] - srcY;
      } else {
        // No safe break in range — single section taller than a page
        chunkPx = maxChunkPx;
      }
    } else {
      // No section markers — fall back to raw slicing
      chunkPx = maxChunkPx;
    }

    if (!firstChunk) {
      doc.addPage();
      y = m;
    }

    // Slice and render canvas chunk
    const chunkMm = chunkPx / pxPerMm;
    const chunk = document.createElement('canvas');
    chunk.width = canvas.width;
    chunk.height = chunkPx;
    const ctx = chunk.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, srcY, canvas.width, chunkPx, 0, 0, canvas.width, chunkPx);
      doc.addImage(chunk.toDataURL('image/png'), 'PNG', m, y, imgWidth, chunkMm);
    }

    srcY += chunkPx;
    firstChunk = false;

    addFooter();
  }

  // Edge case: if the results element was empty / zero height
  if (srcY === 0) {
    addFooter();
  }

  // ── Download ───────────────────────────────────────────
  const filename = toolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '');
  doc.save(`${filename}-results.pdf`);
}

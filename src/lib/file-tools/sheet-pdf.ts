/**
 * Render one spreadsheet as a PDF table with jsPDF (review FILES-05, FILES-06).
 *
 * - Uses the planned column layout (table-layout.ts): numbers are never cut,
 *   long text wraps (by characters if needed), wide sheets go landscape, then
 *   smaller fonts, then column bands. Rows taller than a page continue on the
 *   next page.
 * - jsPDF's built-in Helvetica only covers Western European text (it printed
 *   "Łódź" as "Aódz"). When a sheet needs more, Liberation Sans (Latin,
 *   Greek, Cyrillic; shipped under public/pdfjs/standard_fonts/) is embedded.
 *   Cells with characters no embedded font covers (for example Chinese or
 *   Japanese) are drawn as images with the system font, so they still print.
 * - Numeric cells are right-aligned; the header row repeats on every page.
 *
 * Browser-only (jsPDF, fetch, canvas). The layout maths is unit-tested in
 * table-layout.test.ts; the rendering is covered by the Playwright suite.
 */
import type { jsPDF as JsPdf } from 'jspdf';
import type { SheetData, SheetCell } from './spreadsheet';
import { planColumns, wrapCell, naturalWidth, longestWordWidth, type ColumnNeeds } from './table-layout';
import { readCmapCoverage, coversText, type GlyphCoverage } from './ttf-cmap';
import { isWinAnsiText } from './text-decode';

const FONT_DIR = '/pdfjs/standard_fonts/';
const FAMILY = 'LiberationSans';
const MARGIN = 10; // mm
const PAD = 1.2; // mm inside each cell
const MEASURE_SAMPLE_ROWS = 3000;
const MAX_WORD_MIN = 40; // mm: text columns may wrap words longer than this
const PT_TO_MM = 25.4 / 72;
const PX_TO_MM = 25.4 / 96;

interface FontData { regular: string; bold: string; coverage: GlyphCoverage }
let fontPromise: Promise<FontData> | null = null;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

async function loadFonts(): Promise<FontData> {
  if (!fontPromise) {
    fontPromise = (async () => {
      const get = async (name: string) => {
        const res = await fetch(FONT_DIR + name);
        if (!res.ok) throw new Error(`font ${name}: HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      };
      const [regular, bold] = await Promise.all([get('LiberationSans-Regular.ttf'), get('LiberationSans-Bold.ttf')]);
      return { regular: toBase64(regular), bold: toBase64(bold), coverage: readCmapCoverage(regular) };
    })().catch((e: unknown) => {
      fontPromise = null;
      throw e;
    });
  }
  return fontPromise;
}

export interface SheetPdfResult {
  bytes: Uint8Array;
  pages: number;
  bands: number;
  orientation: 'portrait' | 'landscape';
  /** Cells drawn as images because no embedded font covers their characters. */
  imageCells: number;
  /** True when the Unicode font could not be loaded (Helvetica + images were used). */
  fontFallback: boolean;
}

export async function renderSheetPdf(sheet: SheetData): Promise<SheetPdfResult> {
  const { jsPDF } = await import('jspdf');
  const allCells: SheetCell[] = [...sheet.header, ...sheet.rows.flat()];
  const needsUnicode = !isWinAnsiText(sheet.titles.join(' ') + sheet.name) || allCells.some((c) => !isWinAnsiText(c.text));

  let fonts: FontData | null = null;
  let fontFallback = false;
  if (needsUnicode) {
    try {
      fonts = await loadFonts();
    } catch {
      fontFallback = true; // Helvetica for Western text; everything else drawn as images.
    }
  }
  const family = fonts ? FAMILY : 'helvetica';
  const covers = (text: string) => (fonts ? coversText(fonts.coverage, text) : isWinAnsiText(text));
  const setupFonts = (doc: JsPdf) => {
    if (!fonts) return;
    doc.addFileToVFS('LiberationSans-Regular.ttf', fonts.regular);
    doc.addFileToVFS('LiberationSans-Bold.ttf', fonts.bold);
    doc.addFont('LiberationSans-Regular.ttf', FAMILY, 'normal');
    doc.addFont('LiberationSans-Bold.ttf', FAMILY, 'bold');
  };

  const measureCanvas = document.createElement('canvas').getContext('2d');
  const canvasMeasure = (text: string, size: number, bold: boolean) => {
    if (!measureCanvas) return text.length * size * PT_TO_MM * 0.6;
    measureCanvas.font = `${bold ? 'bold ' : ''}${size}pt sans-serif`;
    return measureCanvas.measureText(text).width * PX_TO_MM;
  };

  // ---- measuring (on a scratch document) ----
  const scratch = new jsPDF({ unit: 'mm', format: 'a4' });
  setupFonts(scratch);
  const pdfMeasure = (doc: JsPdf, text: string, size: number, bold: boolean) => {
    doc.setFont(family, bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  };
  const measurerFor = (doc: JsPdf, cellText: string, size: number, bold: boolean) =>
    covers(cellText)
      ? (t: string) => pdfMeasure(doc, t, size, bold)
      : (t: string) => canvasMeasure(t, size, bold);

  const cols = sheet.columnCount;
  const sample = sheet.rows.slice(0, MEASURE_SAMPLE_ROWS);
  const needsCache = new Map<number, ColumnNeeds[]>();
  const needsAt = (size: number): ColumnNeeds[] => {
    const cached = needsCache.get(size);
    if (cached) return cached;
    const needs: ColumnNeeds[] = [];
    const threeDigits = pdfMeasure(scratch, '000', size, false);
    for (let c = 0; c < cols; c++) {
      let natural = 0;
      let min = threeDigits;
      const consider = (cell: SheetCell | undefined, bold: boolean) => {
        if (!cell || cell.text === '') return;
        const m = measurerFor(scratch, cell.text, size, bold);
        const w = naturalWidth(cell.text, m);
        natural = Math.max(natural, w);
        min = Math.max(min, cell.numeric ? w : Math.min(MAX_WORD_MIN, longestWordWidth(cell.text, m)));
      };
      consider(sheet.header[c], true);
      for (const row of sample) consider(row[c], false);
      needs.push({ natural: Math.max(natural, min) + PAD * 2, min: min + PAD * 2 });
    }
    needsCache.set(size, needs);
    return needs;
  };

  const plan = planColumns(needsAt, {
    portraitWidth: 210 - MARGIN * 2,
    landscapeWidth: 297 - MARGIN * 2,
    fontSizes: [9, 8, 7, 6, 5.5],
  });

  // ---- drawing ----
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: plan.orientation, compress: true });
  setupFonts(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const fontSize = plan.fontSize;
  const lineH = fontSize * PT_TO_MM * 1.25;
  let imageCells = 0;

  /** Draw lines of an image-mode cell (system font) at (x, y). */
  const drawImageText = (lines: string[], x: number, y: number, width: number, bold: boolean, alignRight: boolean) => {
    const pxPerMm = (96 / 25.4) * 3;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * pxPerMm));
    canvas.height = Math.max(1, Math.ceil(lines.length * lineH * pxPerMm));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#14161A';
    ctx.font = `${bold ? 'bold ' : ''}${fontSize * PT_TO_MM * pxPerMm}px sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = alignRight ? 'right' : 'left';
    lines.forEach((line, i) => {
      ctx.fillText(line, alignRight ? canvas.width : 0, (i + 0.8) * lineH * pxPerMm);
    });
    doc.addImage(canvas, 'PNG', x, y, width, lines.length * lineH, undefined, 'FAST');
    canvas.width = 0;
    canvas.height = 0;
    imageCells += 1;
  };

  const drawTitle = (text: string, y: number, size: number): number => {
    const bold = true;
    if (covers(text)) {
      doc.setFont(family, 'bold');
      doc.setFontSize(size);
      const lines = wrapCell(text, pageW - MARGIN * 2, (t) => pdfMeasure(doc, t, size, bold));
      lines.forEach((line, i) => doc.text(line, MARGIN, y + size * PT_TO_MM * (i + 1)));
      return lines.length * size * PT_TO_MM * 1.3;
    }
    // A title the embedded font cannot draw: render it as one image block.
    const lines = wrapCell(text, pageW - MARGIN * 2, (t) => canvasMeasure(t, size, bold));
    const pxPerMm = (96 / 25.4) * 3;
    const h = lines.length * size * PT_TO_MM * 1.3;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((pageW - MARGIN * 2) * pxPerMm);
    canvas.height = Math.ceil(h * pxPerMm);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#14161A';
      ctx.font = `bold ${size * PT_TO_MM * pxPerMm}px sans-serif`;
      lines.forEach((line, i) => ctx.fillText(line, 0, (i + 0.85) * size * PT_TO_MM * 1.3 * pxPerMm));
      doc.addImage(canvas, 'PNG', MARGIN, y, pageW - MARGIN * 2, h, undefined, 'FAST');
      imageCells += 1;
      canvas.width = 0;
      canvas.height = 0;
    }
    return h;
  };

  plan.bands.forEach((band, bandIndex) => {
    if (bandIndex > 0) doc.addPage();
    const tableW = band.widths.reduce((s, w) => s + w, 0);
    const xs: number[] = [];
    band.widths.reduce((x, w) => { xs.push(x); return x + w; }, MARGIN);
    let y = MARGIN;

    if (bandIndex === 0) {
      for (const t of sheet.titles) y += drawTitle(t, y, 12) + 1;
      y += drawTitle(sheet.name, y, sheet.titles.length > 0 ? 9 : 12) + 2;
    }
    if (plan.bands.length > 1) {
      const first = band.columns.filter((c) => c !== 0 || bandIndex === 0)[0] ?? band.columns[0];
      const last = band.columns[band.columns.length - 1];
      y += drawTitle(`Part ${bandIndex + 1} of ${plan.bands.length}: columns ${first + 1}-${last + 1} of ${cols}${bandIndex > 0 && band.columns[0] === 0 ? ' (column 1 repeated)' : ''}`, y, 8) + 1;
    }

    type Laid = { lines: string[]; image: boolean; right: boolean };
    const layRow = (cells: (SheetCell | undefined)[], bold: boolean): Laid[] =>
      band.columns.map((c, i) => {
        const cell = cells[c];
        const text = cell?.text ?? '';
        const image = text !== '' && !covers(text);
        const m = measurerFor(doc, text, fontSize, bold);
        return { lines: text === '' ? [''] : wrapCell(text, band.widths[i] - PAD * 2, m), image, right: !!cell?.numeric };
      });

    const drawRowSlice = (laid: Laid[], from: number, count: number, yPos: number, kind: 'header' | 'even' | 'odd') => {
      const rowH = count * lineH + PAD * 2;
      if (kind === 'header') { doc.setFillColor(230, 235, 242); doc.rect(MARGIN, yPos, tableW, rowH, 'F'); }
      else if (kind === 'even') { doc.setFillColor(248, 249, 250); doc.rect(MARGIN, yPos, tableW, rowH, 'F'); }
      doc.setTextColor(20, 22, 26);
      laid.forEach((cell, i) => {
        const slice = cell.lines.slice(from, from + count);
        if (slice.length === 0 || (slice.length === 1 && slice[0] === '')) return;
        const innerW = band.widths[i] - PAD * 2;
        if (cell.image) {
          drawImageText(slice, xs[i] + PAD, yPos + PAD, innerW, kind === 'header', cell.right);
          return;
        }
        doc.setFont(family, kind === 'header' ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        slice.forEach((line, li) => {
          const ty = yPos + PAD + lineH * (li + 0.8);
          if (cell.right) doc.text(line, xs[i] + band.widths[i] - PAD, ty, { align: 'right' });
          else doc.text(line, xs[i] + PAD, ty);
        });
      });
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      xs.forEach((x) => doc.line(x, yPos, x, yPos + rowH));
      doc.line(MARGIN + tableW, yPos, MARGIN + tableW, yPos + rowH);
      doc.line(MARGIN, yPos, MARGIN + tableW, yPos);
      doc.line(MARGIN, yPos + rowH, MARGIN + tableW, yPos + rowH);
      return rowH;
    };

    const headerLaid = layRow(sheet.header, true);
    const headerLines = Math.max(1, ...headerLaid.map((l) => l.lines.length));
    const headerH = headerLines * lineH + PAD * 2;
    const newPage = () => {
      doc.addPage();
      y = MARGIN;
      y += drawRowSlice(headerLaid, 0, headerLines, y, 'header');
    };
    y += drawRowSlice(headerLaid, 0, headerLines, y, 'header');

    sheet.rows.forEach((row, ri) => {
      const laid = layRow(row, false);
      const total = Math.max(1, ...laid.map((l) => l.lines.length));
      let from = 0;
      let fresh = false;
      while (from < total) {
        const room = Math.floor((pageH - MARGIN - y - PAD * 2) / lineH);
        const remaining = total - from;
        const fitsOnFreshPage = remaining * lineH + PAD * 2 <= pageH - MARGIN * 2 - headerH;
        if (!fresh && (room < 1 || (from === 0 && room < remaining && fitsOnFreshPage))) {
          // Move the row to a new page (whole if it fits there); never loop on a fresh page.
          newPage();
          fresh = true;
          continue;
        }
        // Rows taller than a page continue on the next page instead of being cut.
        const count = Math.max(1, Math.min(remaining, room));
        y += drawRowSlice(laid, from, count, y, ri % 2 === 0 ? 'even' : 'odd');
        from += count;
        fresh = false;
        if (from < total) {
          newPage();
          fresh = true;
        }
      }
    });
  });

  const bytes = new Uint8Array(doc.output('arraybuffer'));
  return {
    bytes,
    pages: doc.getNumberOfPages(),
    bands: plan.bands.length,
    orientation: plan.orientation,
    imageCells,
    fontFallback,
  };
}

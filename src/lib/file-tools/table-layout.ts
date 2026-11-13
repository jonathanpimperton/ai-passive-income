/**
 * Table layout for the Excel/CSV to PDF tool (review FILES-05).
 *
 * The old renderer cut every value that did not fit its column to "10123…",
 * silent data loss in a financial document, and treated a merged title row
 * as the header. This module:
 * - wraps text by words and, for words longer than the column, by characters;
 *   it never truncates;
 * - plans column widths so numeric columns are never narrower than their
 *   widest value, trying portrait, then landscape, then smaller fonts, and
 *   finally splitting columns into bands printed one after another;
 * - detects leading title rows (one filled cell in a multi-column sheet).
 *
 * Pure functions with an injected text-measuring function, unit-tested in
 * table-layout.test.ts.
 */

export type Measure = (text: string) => number;

/**
 * Widths come from the same measurements they are compared with, so allow for
 * floating-point noise; otherwise a word exactly as wide as its column breaks
 * mid-word ("Categor|y").
 */
const FIT_TOLERANCE = 1e-3;
const fits = (width: number, maxWidth: number) => width <= maxWidth + FIT_TOLERANCE;

/** Wrap one paragraph (no newlines) to `maxWidth`. Long words are broken by characters. */
export function wrapParagraph(text: string, maxWidth: number, measure: Measure): string[] {
  if (text === '') return [''];
  const words = text.split(/ +/);
  const lines: string[] = [];
  let current = '';
  const pushBroken = (word: string) => {
    let chunk = '';
    for (const ch of Array.from(word)) {
      if (chunk !== '' && !fits(measure(chunk + ch), maxWidth)) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    return chunk;
  };
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (fits(measure(candidate), maxWidth)) {
      current = candidate;
      continue;
    }
    if (current !== '') lines.push(current);
    current = fits(measure(word), maxWidth) ? word : pushBroken(word);
  }
  lines.push(current);
  return lines;
}

/** Wrap cell text, honouring in-cell line breaks (including CRLF inside quoted CSV fields). */
export function wrapCell(text: string, maxWidth: number, measure: Measure): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap((para) => wrapParagraph(para.replace(/\t/g, ' '), maxWidth, measure));
}

/** Width of the widest single line of a cell. */
export function naturalWidth(text: string, measure: Measure): number {
  return text.replace(/\r\n?/g, '\n').split('\n').reduce((w, line) => Math.max(w, measure(line)), 0);
}

/** Width of the longest word (the narrowest a wrapped text column can be without breaking words). */
export function longestWordWidth(text: string, measure: Measure): number {
  return text.split(/\s+/).reduce((w, word) => Math.max(w, measure(word)), 0);
}

export interface ColumnNeeds {
  /** Width that shows every value on one line. */
  natural: number;
  /** Narrowest acceptable width: widest number, or longest word (capped) for text. */
  min: number;
}

export interface LayoutBand {
  /** Column indices printed together. */
  columns: number[];
  /** Width of each of those columns (same units as the measures). */
  widths: number[];
}

export interface LayoutPlan {
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  /** One band normally; more than one means the sheet is split across page sections. */
  bands: LayoutBand[];
}

/**
 * Choose orientation, font size and column widths.
 * `needsAt(fontSize)` returns per-column needs at that size (including padding).
 */
export function planColumns(
  needsAt: (fontSize: number) => ColumnNeeds[],
  opts: { portraitWidth: number; landscapeWidth: number; fontSizes: number[]; repeatFirstColumn?: boolean },
): LayoutPlan {
  const sizes = opts.fontSizes;
  const distribute = (needs: ColumnNeeds[], cols: number[], usable: number): number[] => {
    const widths = new Map<number, number>();
    const minSum = cols.reduce((s, c) => s + needs[c].min, 0);
    const naturalSum = cols.reduce((s, c) => s + needs[c].natural, 0);
    if (naturalSum <= usable) {
      // Everything fits on one line: share the spare space proportionally.
      const factor = usable / naturalSum;
      cols.forEach((c) => widths.set(c, needs[c].natural * factor));
    } else {
      const spare = usable - minSum;
      const growable = cols.reduce((s, c) => s + (needs[c].natural - needs[c].min), 0);
      cols.forEach((c) => {
        const grow = growable > 0 ? ((needs[c].natural - needs[c].min) / growable) * spare : 0;
        widths.set(c, needs[c].min + grow);
      });
    }
    return cols.map((c) => widths.get(c) ?? needs[c].min);
  };
  const all = needsAt(sizes[0]).map((_, i) => i);
  if (all.length === 0) return { orientation: 'portrait', fontSize: sizes[0], bands: [] };

  // 1. One band: portrait, then landscape, at decreasing font sizes.
  for (const fontSize of sizes) {
    const needs = needsAt(fontSize);
    const minSum = needs.reduce((s, n) => s + n.min, 0);
    const naturalSum = needs.reduce((s, n) => s + n.natural, 0);
    for (const [orientation, usable] of [['portrait', opts.portraitWidth], ['landscape', opts.landscapeWidth]] as const) {
      // Prefer portrait only when it shows everything on one line or the sheet is narrow.
      if (orientation === 'portrait' && naturalSum > usable && all.length > 6) continue;
      if (minSum <= usable) {
        return { orientation, fontSize, bands: [{ columns: all, widths: distribute(needs, all, usable) }] };
      }
    }
  }

  // 2. Too wide even at the smallest font in landscape: split into bands.
  const fontSize = sizes[sizes.length - 1];
  const needs = needsAt(fontSize).map((n) => ({ natural: n.natural, min: Math.min(n.min, opts.landscapeWidth) }));
  const usable = opts.landscapeWidth;
  const repeat = opts.repeatFirstColumn !== false && needs[0].min < usable * 0.3;
  const bands: number[][] = [];
  let band: number[] = [];
  let used = 0;
  const start = () => {
    band = repeat && bands.length > 0 ? [0] : [];
    used = repeat && bands.length > 0 ? needs[0].min : 0;
  };
  start();
  for (const c of all) {
    if (repeat && c === 0 && bands.length > 0) continue;
    if (band.length > (repeat && bands.length > 0 ? 1 : 0) && used + needs[c].min > usable) {
      bands.push(band);
      start();
    }
    band.push(c);
    used += needs[c].min;
  }
  if (band.length > 0) bands.push(band);
  return {
    orientation: 'landscape',
    fontSize,
    bands: bands.map((columns) => ({ columns, widths: distribute(needs, columns, usable) })),
  };
}

/**
 * Leading rows that are titles rather than data (for example a merged
 * "Q3 Expense Report" banner). A title row has exactly one filled cell, in the
 * first column, holding text rather than a number; at most 3 such rows; and
 * the row after them must look like a header (at least two filled cells and
 * at least half the columns). Otherwise nothing is treated as a title, so
 * sparse data rows are never swallowed. Never consumes every row.
 */
export function countTitleRows(rows: string[][]): number {
  const columns = rows.reduce((m, r) => Math.max(m, r.length), 0);
  if (columns < 2) return 0;
  const filledCount = (row: string[]) => row.filter((v) => v.trim() !== '').length;
  let n = 0;
  while (n < rows.length - 1 && n < 3) {
    const row = rows[n];
    const first = (row[0] ?? '').trim();
    const isTitle = filledCount(row) === 1 && first !== '' && !/^[-+(]?[\d.,%$£€¥\s)]+$/.test(first);
    if (!isTitle) break;
    n += 1;
  }
  if (n === 0) return 0;
  const header = rows[n] ?? [];
  const headerFilled = filledCount(header);
  return headerFilled >= 2 && headerFilled >= Math.ceil(columns / 2) ? n : 0;
}

/** Spreadsheet column letters: 0 -> "A", 25 -> "Z", 26 -> "AA". */
export function columnLetter(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

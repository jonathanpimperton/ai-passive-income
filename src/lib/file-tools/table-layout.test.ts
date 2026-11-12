import { describe, it, expect } from 'vitest';
import {
  wrapParagraph, wrapCell, naturalWidth, longestWordWidth, planColumns, countTitleRows, columnLetter, type ColumnNeeds,
} from './table-layout';

// 1 unit per character keeps the arithmetic obvious.
const m = (s: string) => Array.from(s).length;

describe('wrapping never truncates (FILES-05)', () => {
  it('wraps by words', () => {
    expect(wrapParagraph('the quick brown fox', 9, m)).toEqual(['the quick', 'brown fox']);
  });
  it('breaks words longer than the column by characters, keeping every digit', () => {
    const lines = wrapParagraph('1012345.67', 4, m);
    expect(lines).toEqual(['1012', '345.', '67']);
    expect(lines.join('')).toBe('1012345.67');
    expect(lines.join('')).not.toContain('…');
  });
  it('honours in-cell newlines including CRLF from quoted CSV fields', () => {
    expect(wrapCell('line one\r\nline two', 20, m)).toEqual(['line one', 'line two']);
    expect(wrapCell('a\rb\nc', 20, m)).toEqual(['a', 'b', 'c']);
    expect(wrapCell('', 5, m)).toEqual(['']);
  });
  it('measures natural and longest-word widths', () => {
    expect(naturalWidth('ab\nabcdef', m)).toBe(6);
    expect(longestWordWidth('a very longword', m)).toBe(8);
  });
});

describe('planColumns', () => {
  const needs = (list: Array<[number, number]>) => (_size: number): ColumnNeeds[] =>
    list.map(([natural, min]) => ({ natural, min }));

  it('uses portrait when everything fits on one line', () => {
    const plan = planColumns(needs([[20, 10], [30, 30]]), { portraitWidth: 190, landscapeWidth: 277, fontSizes: [8, 7, 6] });
    expect(plan.orientation).toBe('portrait');
    expect(plan.bands.map((b) => b.columns)).toEqual([[0, 1]]);
    expect(plan.bands[0].widths[0] + plan.bands[0].widths[1]).toBeCloseTo(190);
  });

  it('switches to landscape for wide sheets, never squeezing a column below its minimum', () => {
    const cols: Array<[number, number]> = Array.from({ length: 10 }, () => [25, 22]);
    const plan = planColumns(needs(cols), { portraitWidth: 190, landscapeWidth: 277, fontSizes: [8] });
    expect(plan.orientation).toBe('landscape');
    plan.bands[0].widths.forEach((w) => expect(w).toBeGreaterThanOrEqual(22));
  });

  it('shrinks the font before splitting', () => {
    const at = (size: number): ColumnNeeds[] => Array.from({ length: 30 }, () => ({ natural: size * 1.6, min: size * 1.6 }));
    const plan = planColumns(at, { portraitWidth: 190, landscapeWidth: 277, fontSizes: [8, 7, 6, 5] });
    expect(plan.fontSize).toBe(5);
    expect(plan.bands).toHaveLength(1);
  });

  it('splits 30 wide numeric columns into bands, repeating the first column', () => {
    const at = (): ColumnNeeds[] => Array.from({ length: 30 }, () => ({ natural: 20, min: 20 }));
    const plan = planColumns(at, { portraitWidth: 190, landscapeWidth: 277, fontSizes: [8, 6] });
    expect(plan.bands.length).toBeGreaterThan(1);
    const covered = new Set(plan.bands.flatMap((b) => b.columns));
    expect(covered.size).toBe(30);
    plan.bands.slice(1).forEach((b) => expect(b.columns[0]).toBe(0));
    plan.bands.forEach((b) => {
      const total = b.widths.reduce((s, w) => s + w, 0);
      expect(total).toBeLessThanOrEqual(277.0001);
      b.widths.forEach((w) => expect(w).toBeGreaterThanOrEqual(20 - 1e-9));
    });
  });

  it('handles an empty sheet', () => {
    expect(planColumns(() => [], { portraitWidth: 190, landscapeWidth: 277, fontSizes: [8] }).bands).toEqual([]);
  });
});

describe('countTitleRows', () => {
  it('treats a single-cell banner row as a title, not the header', () => {
    const rows = [['Q3 Expense Report', '', ''], ['Date', 'Vendor', 'Amount'], ['01/07/2026', 'Cafe', '£1.00']];
    expect(countTitleRows(rows)).toBe(1);
  });
  it('returns 0 for normal sheets and single-column lists', () => {
    expect(countTitleRows([['a', 'b'], ['1', '2']])).toBe(0);
    expect(countTitleRows([['only'], ['col']])).toBe(0);
  });
  it('never consumes every row', () => {
    expect(countTitleRows([['x', ''], ['y', '']])).toBe(1);
  });
});

describe('columnLetter', () => {
  it('matches spreadsheet letters', () => {
    expect([0, 25, 26, 29, 701, 702].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AD', 'ZZ', 'AAA']);
  });
});

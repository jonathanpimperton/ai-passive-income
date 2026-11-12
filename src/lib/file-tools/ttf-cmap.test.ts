import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readCmapCoverage, coversText } from './ttf-cmap';

// The Excel to PDF tool embeds this font (shipped in public/pdfjs/standard_fonts/).
const FONT = path.resolve(__dirname, '../../../public/pdfjs/standard_fonts/LiberationSans-Regular.ttf');

describe('readCmapCoverage', () => {
  const coverage = readCmapCoverage(new Uint8Array(fs.readFileSync(FONT)));

  it('covers Latin, Latin Extended, Greek and Cyrillic', () => {
    expect(coversText(coverage, 'Hello £1,234.50 20%')).toBe(true);
    expect(coversText(coverage, 'Łódź Zürich café')).toBe(true);
    expect(coversText(coverage, 'Ελληνικά')).toBe(true);
    expect(coversText(coverage, 'Москва')).toBe(true);
    expect(coversText(coverage, '€ “ ” – —')).toBe(true);
  });

  it('reports CJK as not covered (rendered as images instead)', () => {
    expect(coversText(coverage, '東京')).toBe(false);
    expect(coverage.has(0x6771)).toBe(false);
  });

  it('ignores control characters such as in-cell newlines', () => {
    expect(coversText(coverage, 'line one\r\nline two\t')).toBe(true);
  });

  it('throws on something that is not a font', () => {
    expect(() => readCmapCoverage(new Uint8Array(64))).toThrow();
  });
});

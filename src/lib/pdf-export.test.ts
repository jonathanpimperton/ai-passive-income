import { describe, it, expect } from 'vitest';
import { formatPdfDate, pdfFilename, chooseChunk, PdfLibraryLoadError, PDF_LOAD_ERROR_NAME } from './pdf-export';

describe('PDF date follows the display currency locale', () => {
  const d = new Date(Date.UTC(2026, 10, 12, 12));
  it('USD: month first', () => expect(formatPdfDate(d, 'USD')).toBe('November 12, 2026'));
  it('GBP: day first', () => expect(formatPdfDate(d, 'GBP')).toBe('12 November 2026'));
  it('EUR: day first, English month', () => expect(formatPdfDate(d, 'EUR')).toBe('12 November 2026'));
  it('unknown: US format', () => expect(formatPdfDate(d, 'XYZ')).toBe('November 12, 2026'));
});

describe('filename', () => {
  it('slugifies the tool name', () => {
    expect(pdfFilename('Compound Interest Calculator')).toBe('compound-interest-calculator-results.pdf');
    expect(pdfFilename('UK Salary (2026/27)')).toBe('uk-salary-2026-27-results.pdf');
    expect(pdfFilename('!!!')).toBe('calcrun-results.pdf');
  });
});

describe('page breaks', () => {
  it('takes everything when it fits', () => {
    expect(chooseChunk(0, 500, 1000, 100, [200, 400])).toBe(500);
  });
  it('breaks at the last section boundary that fits', () => {
    expect(chooseChunk(0, 3000, 1000, 100, [300, 900, 1500])).toBe(900);
    expect(chooseChunk(900, 2100, 1000, 100, [300, 900, 1500, 1950])).toBe(600);
  });
  it('ignores slivers and falls back to a raw slice', () => {
    expect(chooseChunk(0, 3000, 1000, 100, [50, 2000])).toBe(1000);
  });
});

describe('library load failure', () => {
  it('is recognisable by name (the button tells the visitor to reload)', () => {
    const err = new PdfLibraryLoadError(new TypeError('Failed to fetch dynamically imported module'));
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe(PDF_LOAD_ERROR_NAME);
    expect((err as { cause?: unknown }).cause).toBeInstanceOf(TypeError);
  });
});

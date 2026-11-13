import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readSpreadsheet } from './spreadsheet';

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const read = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));

describe('readSpreadsheet with SheetJS 0.20.3 (FILES-05/06/21/23)', () => {
  it('formats dates, currency and percentages and keeps the title row out of the header', async () => {
    const { sheets } = await readSpreadsheet(read('report.xlsx'), 'report.xlsx');
    expect(sheets.map((s) => s.name)).toEqual(['Expenses', 'Second sheet']);
    const s = sheets[0];
    expect(s.titles).toEqual(['Q3 Expense Report']);
    expect(s.header.map((c) => c.text)).toEqual(['Date', 'Vendor', 'Category', 'Amount', 'VAT rate', 'Notes']);
    const first = s.rows[0].map((c) => c.text);
    expect(first[0]).toBe('01/07/2026');
    expect(first[1]).toBe('Łódź Logistics sp. z o.o.');
    expect(first[3]).toBe('£1,234.50');
    expect(first[4]).toBe('20%');
    expect(s.rows[0][3].numeric).toBe(true);
    expect(s.rows[0][1].numeric).toBe(false);
    expect(s.rows.some((r) => r.some((c) => /^\d{5}(\.\d+)?$/.test(c.text)))).toBe(false); // no raw date serials
  });

  it('reads legacy .xls the same way', async () => {
    const { sheets } = await readSpreadsheet(read('report.xls'), 'report.xls');
    expect(sheets[0].rows[1].map((c) => c.text).slice(0, 4)).toEqual(['02/07/2026', '東京 Trading', 'Travel', '£1,335.75']);
  });

  it('keeps every digit of wide numeric sheets', async () => {
    const { sheets } = await readSpreadsheet(read('wide-30cols.xlsx'), 'wide-30cols.xlsx');
    expect(sheets[0].columnCount).toBe(30);
    expect(sheets[0].rows[1][0].text).toBe('1012345.67');
  });

  it('decodes UTF-8 CSV without a BOM and leaves values as written', async () => {
    const { sheets, notices } = await readSpreadsheet(read('utf8-nobom.csv'), 'utf8-nobom.csv');
    expect(notices).toEqual([]);
    expect(sheets[0].header.map((c) => c.text)).toEqual(['City', 'Amount', 'Note']);
    expect(sheets[0].rows.map((r) => r.map((c) => c.text))).toEqual([
      ['Zürich', '£100', 'café'],
      ['東京', '¥200', '日本語'],
      ['Łódź', 'zł300', 'ąęś'],
    ]);
  });

  it('decodes UTF-8 CSV with a BOM', async () => {
    const { sheets } = await readSpreadsheet(read('utf8-bom.csv'), 'utf8-bom.csv');
    expect(sheets[0].header[0].text.charCodeAt(0)).not.toBe(0xfeff);
    expect(sheets[0].rows[0][0].text).toBe('Zürich');
  });

  it('reads Windows-1252 CSV and says so', async () => {
    const bytes = new Uint8Array([...new TextEncoder().encode('Name,Price\nCaf'), 0xe9, ...new TextEncoder().encode(','), 0xa3, ...new TextEncoder().encode('5\n')]);
    const { sheets, notices } = await readSpreadsheet(bytes, 'legacy.csv');
    expect(sheets[0].rows[0].map((c) => c.text)).toEqual(['Café', '£5']);
    expect(notices[0]).toMatch(/Windows-1252/);
  });

  it('keeps CSV text exactly (leading zeros, dates, formulas, quoted line breaks)', async () => {
    const csv = 'Code,Date,Formula,Note\n007,01/02/2026,=1+2,"two\r\nlines"\n';
    const { sheets } = await readSpreadsheet(new TextEncoder().encode(csv), 'x.csv');
    expect(sheets[0].rows[0].map((c) => c.text)).toEqual(['007', '01/02/2026', '=1+2', 'two\r\nlines']);
  });

  it('refuses PDFs, images, empty and damaged files with plain messages', async () => {
    await expect(readSpreadsheet(read('text-3p.pdf'), 'text-3p.pdf')).rejects.toThrow(/is a PDF/);
    await expect(readSpreadsheet(read('logo-1024.png'), 'logo.png')).rejects.toThrow(/not a spreadsheet/);
    await expect(readSpreadsheet(new Uint8Array(0), 'e.csv')).rejects.toThrow(/empty/);
    await expect(readSpreadsheet(read('corrupt.xlsx'), 'corrupt.xlsx')).rejects.toThrow();
  });

  it('returns no sheets for an empty workbook', async () => {
    const { sheets } = await readSpreadsheet(read('empty.xlsx'), 'empty.xlsx');
    expect(sheets).toEqual([]);
  });
});

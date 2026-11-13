import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sniffSpreadsheet, decodeTextFile, isWinAnsiText } from './text-decode';

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const read = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));

describe('sniffSpreadsheet (FILES-23)', () => {
  it('classifies spreadsheets, text, PDFs and binaries', () => {
    expect(sniffSpreadsheet(read('report.xlsx'))).toBe('zip');
    expect(sniffSpreadsheet(read('report.xls'))).toBe('ole');
    expect(sniffSpreadsheet(read('utf8-nobom.csv'))).toBe('text');
    expect(sniffSpreadsheet(read('utf8-bom.csv'))).toBe('text');
    expect(sniffSpreadsheet(read('text-3p.pdf'))).toBe('pdf');
    expect(sniffSpreadsheet(read('logo-1024.png'))).toBe('binary');
    expect(sniffSpreadsheet(new Uint8Array(0))).toBe('empty');
    expect(sniffSpreadsheet(new Uint8Array([0xff, 0xfe, 0x41, 0x00]))).toBe('text');
  });
});

describe('decodeTextFile (FILES-06)', () => {
  it('decodes UTF-8 without a BOM correctly (no more "Â£")', () => {
    const d = decodeTextFile(read('utf8-nobom.csv'));
    expect(d.encoding).toBe('utf-8');
    expect(d.hadBom).toBe(false);
    expect(d.text).toContain('Zürich,£100,café');
    expect(d.text).toContain('東京');
    expect(d.text).toContain('Łódź');
    expect(d.text).not.toContain('Ã');
  });
  it('strips a UTF-8 BOM', () => {
    const d = decodeTextFile(read('utf8-bom.csv'));
    expect(d.hadBom).toBe(true);
    expect(d.text.charCodeAt(0)).not.toBe(0xfeff);
  });
  it('falls back to Windows-1252 for legacy exports', () => {
    const bytes = new Uint8Array([0x4e, 0x61, 0x6d, 0x65, 0x2c, 0xa3, 0x31, 0x30, 0x30, 0x2c, 0x63, 0x61, 0x66, 0xe9, 0x2c, 0x80]);
    const d = decodeTextFile(bytes);
    expect(d.encoding).toBe('windows-1252');
    expect(d.text).toBe('Name,£100,café,€');
  });
  it('decodes UTF-16 LE with BOM', () => {
    const d = decodeTextFile(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0xa3, 0x00]));
    expect(d.text).toBe('A£');
  });
});

describe('isWinAnsiText', () => {
  it('accepts Latin-1 and the WinAnsi extras, rejects the rest', () => {
    expect(isWinAnsiText('Café £100 – “quoted” €')).toBe(true);
    expect(isWinAnsiText('Łódź')).toBe(false);
    expect(isWinAnsiText('東京')).toBe(false);
    expect(isWinAnsiText('Москва')).toBe(false);
  });
});

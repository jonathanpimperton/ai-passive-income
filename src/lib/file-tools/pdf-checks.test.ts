import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { looksLikePdf, hasEncryptDictionary, parsePageRanges, encryptedPdfMessage } from './pdf-checks';
import { loadPdfForEditing, rebuildAcroForm } from './pdf-load';

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const read = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));

const ENCRYPTED = [
  'enc-owner-only-aes128.pdf',
  'enc-owner-only-aes256.pdf',
  'enc-owner-only-rc4.pdf',
  'enc-user-pw-aes128.pdf',
  'enc-owner-only-photo.pdf',
];

describe('looksLikePdf', () => {
  it('accepts PDFs, including leading junk, and rejects other files', () => {
    expect(looksLikePdf(read('text-3p.pdf'))).toBe(true);
    const junkFirst = new Uint8Array([0x0a, 0x0a, ...read('text-3p.pdf')]);
    expect(looksLikePdf(junkFirst)).toBe(true);
    expect(looksLikePdf(read('logo-1024.png'))).toBe(false);
    expect(looksLikePdf(new Uint8Array(0))).toBe(false);
  });
});

describe('encryption detection (FILES-02, S1-13)', () => {
  it.each(ENCRYPTED)('byte scan flags %s', (name) => {
    expect(hasEncryptDictionary(read(name))).toBe(true);
  });

  it('does not flag plain PDFs', () => {
    expect(hasEncryptDictionary(read('text-3p.pdf'))).toBe(false);
    expect(hasEncryptDictionary(read('form-1p.pdf'))).toBe(false);
    expect(hasEncryptDictionary(read('photo-jpeg.pdf'))).toBe(false);
  });

  it.each(ENCRYPTED)('loadPdfForEditing refuses %s with a workaround', async (name) => {
    const res = await loadPdfForEditing(read(name), name);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('encrypted');
      expect(res.message).toContain(name);
      expect(res.message).toMatch(/Print/);
    }
  });

  it('loads plain PDFs and counts pages', async () => {
    const res = await loadPdfForEditing(read('text-3p.pdf'), 'text-3p.pdf');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.pageCount).toBe(3);
  });

  it('turns junk input into a plain message, not a JS error (FILES-12)', async () => {
    const res = await loadPdfForEditing(read('random.pdf'), 'random.pdf');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('unreadable');
      expect(res.message).not.toMatch(/undefined|properties/);
    }
    const fake = new TextEncoder().encode('%PDF-1.7\nthis is not really a pdf');
    const res2 = await loadPdfForEditing(fake, 'fake.pdf');
    expect(res2.ok).toBe(false);
  });

  it('message names the file and explains the workaround', () => {
    expect(encryptedPdfMessage('statement.pdf')).toMatch(/"statement.pdf" is encrypted/);
  });
});

describe('parsePageRanges (FILES-23)', () => {
  it('parses singles, ranges and mixes', () => {
    expect(parsePageRanges('1-3, 5, 8-10', 12).pages).toEqual([0, 1, 2, 4, 7, 8, 9]);
  });
  it('accepts en dash, em dash and minus sign', () => {
    expect(parsePageRanges('1–3', 5).pages).toEqual([0, 1, 2]);
    expect(parsePageRanges('2—4', 5).pages).toEqual([1, 2, 3]);
    expect(parsePageRanges('1−2', 5).pages).toEqual([0, 1]);
  });
  it('supports open-ended and reversed ranges', () => {
    expect(parsePageRanges('3-', 5).pages).toEqual([2, 3, 4]);
    expect(parsePageRanges('-2', 5).pages).toEqual([0, 1]);
    expect(parsePageRanges('4-2', 5).pages).toEqual([1, 2, 3]);
  });
  it('clamps partly out-of-range ranges and reports nonsense', () => {
    const r = parsePageRanges('4-9, abc, 0, 7, 2', 5);
    expect(r.pages).toEqual([1, 3, 4]);
    expect(r.invalid).toEqual(['abc', '0', '7']);
  });
  it('dedupes and sorts; empty input gives nothing', () => {
    expect(parsePageRanges('3, 1, 3, 1-2', 5).pages).toEqual([0, 1, 2]);
    expect(parsePageRanges('', 5)).toEqual({ pages: [], invalid: [] });
    expect(parsePageRanges(' - ', 5).invalid).toEqual(['-']);
  });
});

describe('rebuildAcroForm (FILES-19)', () => {
  it('keeps form fields when pages are copied into a new document', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const src = await PDFDocument.load(read('form-2p.pdf'));
    // Without the fix: copied pages carry widgets but the new doc has no fields.
    const plain = await PDFDocument.create();
    (await plain.copyPages(src, [0, 1])).forEach((p) => plain.addPage(p));
    expect(plain.getForm().getFields()).toHaveLength(0);

    const merged = await PDFDocument.create();
    (await merged.copyPages(src, [0, 1])).forEach((p) => merged.addPage(p));
    const second = await PDFDocument.load(read('form-2p.pdf'));
    (await merged.copyPages(second, [0, 1])).forEach((p) => merged.addPage(p));
    const n = await rebuildAcroForm(merged, [src, second]);
    expect(n).toBe(4);
    const reloaded = await PDFDocument.load(await merged.save());
    const names = reloaded.getForm().getFields().map((f) => f.getName()).sort();
    // "applicant.name" is a child of root field "applicant"; the duplicate root is renamed.
    expect(names).toEqual(['agree', 'agree_2', 'applicant.name', 'applicant_2.name'].sort());
    // and the fields can be filled
    reloaded.getForm().getTextField('applicant.name').setText('Ada');
    expect(reloaded.getForm().getTextField('applicant.name').getText()).toBe('Ada');
  });

  it('split: only fields on the extracted page are attached', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const src = await PDFDocument.load(read('form-2p.pdf'));
    const out = await PDFDocument.create();
    (await out.copyPages(src, [1])).forEach((p) => out.addPage(p));
    expect(await rebuildAcroForm(out, [src])).toBe(1);
    const reloaded = await PDFDocument.load(await out.save());
    expect(reloaded.getForm().getFields().map((f) => f.getName())).toEqual(['agree']);
  });

  it('returns 0 and leaves documents without forms alone', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const src = await PDFDocument.load(read('text-3p.pdf'));
    const out = await PDFDocument.create();
    (await out.copyPages(src, [0])).forEach((p) => out.addPage(p));
    expect(await rebuildAcroForm(out, [src])).toBe(0);
  });
});

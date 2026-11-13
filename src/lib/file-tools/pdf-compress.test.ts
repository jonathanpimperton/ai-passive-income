import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { compressPdfImages, describeSkipped, CompressCancelled, type ImageEncoder } from './pdf-compress';
import { loadPdfForEditing } from './pdf-load';

vi.setConfig({ testTimeout: 30_000 });

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const read = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));

/** Node stand-in for the browser's canvas encoder. */
const sharpEncoder: ImageEncoder = async (src, { quality, maxDimension }) => {
  let img = src.kind === 'jpeg'
    ? sharp(Buffer.from(src.bytes))
    : sharp(Buffer.from(src.rgba.buffer, src.rgba.byteOffset, src.rgba.byteLength), { raw: { width: src.width, height: src.height, channels: 4 } });
  if (maxDimension > 0) img = img.resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true });
  const { data, info } = await img.flatten({ background: '#ffffff' }).jpeg({ quality: Math.round(quality * 100) }).toBuffer({ resolveWithObject: true });
  return { bytes: new Uint8Array(data), width: info.width, height: info.height };
};

async function load(name: string) {
  const res = await loadPdfForEditing(read(name), name);
  if (!res.ok) throw new Error(res.message);
  return res.doc;
}

async function imageDicts(bytes: Uint8Array) {
  const { PDFDocument, PDFRawStream, PDFName } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes);
  return doc.context.enumerateIndirectObjects()
    .filter(([, o]) => o instanceof PDFRawStream && o.dict.get(PDFName.of('Subtype'))?.toString() === '/Image')
    .map(([, o]) => (o as unknown as { dict: import('pdf-lib').PDFDict }).dict);
}

describe('compressPdfImages (FILES-08)', () => {
  it('recompresses Flate (PNG-style) images and counts only real replacements', async () => {
    const doc = await load('flate-photo-2p.pdf');
    const report = await compressPdfImages(doc, sharpEncoder, { quality: 0.7, maxDimension: 1500 });
    expect(report.imagesFound).toBe(2);
    expect(report.imagesReplaced).toBe(2);
    const out = await doc.save();
    expect(out.length).toBeLessThan(read('flate-photo-2p.pdf').length * 0.6);
    const dicts = await imageDicts(out);
    const { PDFName } = await import('pdf-lib');
    expect(dicts.map((d) => d.get(PDFName.of('Filter'))?.toString())).toEqual(['/DCTDecode', '/DCTDecode']);
  });

  it('recompresses JPEG images and downscales to the max resolution', async () => {
    const doc = await load('photo-jpeg.pdf');
    const report = await compressPdfImages(doc, sharpEncoder, { quality: 0.5, maxDimension: 400 });
    expect(report.imagesReplaced).toBe(1);
    const { PDFName } = await import('pdf-lib');
    const [dict] = await imageDicts(await doc.save());
    expect(dict.get(PDFName.of('Width'))?.toString()).toBe('400');
  });

  it('leaves CMYK images untouched (FILES-14)', async () => {
    const before = read('cmyk-jpeg.pdf');
    const doc = await load('cmyk-jpeg.pdf');
    const report = await compressPdfImages(doc, sharpEncoder, { quality: 0.2, maxDimension: 500 });
    expect(report.imagesReplaced).toBe(0);
    expect(report.skipped['colour-space']).toBe(1);
    expect(describeSkipped(report)).toMatch(/CMYK/);
    const [dict] = await imageDicts(await doc.save());
    const { PDFName } = await import('pdf-lib');
    expect(dict.get(PDFName.of('ColorSpace'))?.toString()).toBe('/DeviceCMYK');
    expect(before.length).toBeGreaterThan(0);
  });

  it('keeps /SMask on recompressed images and never recompresses the mask itself (FILES-14)', async () => {
    const doc = await load('jpeg-smask.pdf');
    const report = await compressPdfImages(doc, sharpEncoder, { quality: 0.2, maxDimension: 3000, minBytes: 0 });
    const { PDFName } = await import('pdf-lib');
    const dicts = await imageDicts(await doc.save());
    const withMask = dicts.filter((d) => d.has(PDFName.of('SMask')));
    expect(withMask.length).toBeGreaterThan(0);
    expect(report.skipped.mask ?? 0).toBeGreaterThan(0);
  });

  it('reports no images for text-only PDFs', async () => {
    const doc = await load('text-3p.pdf');
    const report = await compressPdfImages(doc, sharpEncoder, { quality: 0.7, maxDimension: 1500 });
    expect(report).toEqual({ imagesFound: 0, imagesReplaced: 0, skipped: {} });
    expect(describeSkipped(report)).toBeNull();
  });

  it('does not replace when the result would not be smaller', async () => {
    const doc = await load('photo-jpeg.pdf');
    const report = await compressPdfImages(doc, sharpEncoder, { quality: 1, maxDimension: 0 });
    expect(report.imagesReplaced).toBe(0);
    expect(report.skipped['no-gain']).toBe(1);
  });

  it('can be cancelled', async () => {
    const doc = await load('flate-photo-2p.pdf');
    await expect(compressPdfImages(doc, sharpEncoder, { quality: 0.7, maxDimension: 0, isCancelled: () => true }))
      .rejects.toBeInstanceOf(CompressCancelled);
  });
});

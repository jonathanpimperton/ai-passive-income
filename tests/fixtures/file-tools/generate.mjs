/**
 * Regenerates the synthetic PDF fixtures used by the file-tool tests.
 * Run from the repo root:  node tests/fixtures/file-tools/generate.mjs
 * then:                    python tests/fixtures/file-tools/gen_encrypted.py
 * (the encrypted copies need pypdf). Everything here is generated, so the
 * fixtures carry no third-party content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import sharp from 'sharp';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const P = (n) => path.join(OUT, n);

/** Smooth, photo-like RGB pixels (gradients + soft noise) so JPEG wins clearly over Flate. */
async function photoPixels(w, h, hue) {
  return sharp({ create: { width: w, height: h, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 40 } } })
    .blur(6).modulate({ hue }).raw().toBuffer();
}

// 1. Two pages of Flate (PNG-style) images: the case PDF Compress used to skip (FILES-08).
{
  const doc = await PDFDocument.create();
  for (let i = 0; i < 2; i++) {
    const raw = await photoPixels(480, 320, i * 90);
    const png = await sharp(raw, { raw: { width: 480, height: 320, channels: 3 } }).png({ compressionLevel: 9 }).toBuffer();
    const img = await doc.embedPng(png);
    const page = doc.addPage([595, 842]);
    page.drawImage(img, { x: 20, y: 300, width: 555, height: 370 });
    page.drawText(`Flate image page ${i + 1}`, { x: 40, y: 100, size: 20 });
  }
  fs.writeFileSync(P('flate-photo-2p.pdf'), await doc.save());
}

// 2. One page with a high-quality JPEG (the source for the encrypted photo fixture too).
{
  const doc = await PDFDocument.create();
  const raw = await photoPixels(800, 530, 30);
  const jpg = await sharp(raw, { raw: { width: 800, height: 530, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const img = await doc.embedJpg(jpg);
  const page = doc.addPage([595, 842]);
  page.drawImage(img, { x: 20, y: 300, width: 555, height: 370 });
  page.drawText('JPEG photo page', { x: 40, y: 100, size: 20, font: await doc.embedFont(StandardFonts.Helvetica) });
  fs.writeFileSync(P('photo-jpeg.pdf'), await doc.save());
}

// 3. A CMYK JPEG image, which PDF Compress must leave untouched (FILES-14).
{
  const doc = await PDFDocument.create();
  const raw = await photoPixels(400, 260, 200);
  const jpg = await sharp(raw, { raw: { width: 400, height: 260, channels: 3 } }).toColourspace('cmyk').jpeg({ quality: 95 }).toBuffer();
  const dict = doc.context.obj({
    Type: 'XObject', Subtype: 'Image', Width: 400, Height: 260,
    ColorSpace: 'DeviceCMYK', BitsPerComponent: 8, Filter: 'DCTDecode', Decode: [1, 0, 1, 0, 1, 0, 1, 0],
  });
  dict.set(PDFName.of('Length'), PDFNumber.of(jpg.length));
  const ref = doc.context.register(PDFRawStream.of(dict, jpg));
  const page = doc.addPage([595, 842]);
  page.node.setXObject(PDFName.of('Im1'), ref);
  const ops = `q 555 0 0 370 20 300 cm /Im1 Do Q`;
  page.node.addContentStream(doc.context.register(doc.context.flateStream(ops)));
  fs.writeFileSync(P('cmyk-jpeg.pdf'), await doc.save());
}

// 4. A two-field AcroForm spread over two pages, for merge/split form preservation (FILES-19).
{
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const p1 = doc.addPage([595, 842]);
  const p2 = doc.addPage([595, 842]);
  p1.drawText('Page 1: name', { x: 50, y: 780, size: 14 });
  p2.drawText('Page 2: agree', { x: 50, y: 780, size: 14 });
  form.createTextField('applicant.name').addToPage(p1, { x: 50, y: 700, width: 300, height: 24 });
  form.createCheckBox('agree').addToPage(p2, { x: 50, y: 700, width: 20, height: 20 });
  fs.writeFileSync(P('form-2p.pdf'), await doc.save());
}

console.log('done');

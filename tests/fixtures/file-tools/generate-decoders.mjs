/**
 * Fixtures for the pdf.js decoders that run without WebAssembly (PDF to Image):
 *  - icc-rgb.pdf   an ICC-based RGB image (left half red, right half blue)
 *  - jbig2.pdf     a 1-bit JBIG2 (MMR generic region) image: an 8x8 black square on white,
 *                  hand-assembled (no third-party content). The JBIG2 stream is a page-info
 *                  segment plus one immediate generic region coded as CCITT G4 (MMR).
 * Run from the repo root: node tests/fixtures/file-tools/generate-decoders.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } from 'pdf-lib';
import sharp from 'sharp';

const OUT = path.dirname(fileURLToPath(import.meta.url));

/** Page of `size` x `size` points that shows image XObject `ref` full-bleed. */
async function pdfWithImage(size, makeImage) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([size, size]);
  const ref = doc.context.register(makeImage(doc));
  page.node.setXObject(PDFName.of('Im1'), ref);
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(size, 0, 0, size, 0, 0), drawObject('Im1'), popGraphicsState());
  return doc.save();
}

// ---- ICC-based RGB ---------------------------------------------------------------------------
{
  // Take the sRGB profile from sharp's JPEG output (APP2 "ICC_PROFILE" segment).
  const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } }).jpeg().withIccProfile('srgb').toBuffer();
  let icc = null;
  for (let i = 2; i + 4 < jpeg.length && jpeg[i] === 0xff; ) {
    const len = jpeg.readUInt16BE(i + 2);
    if (jpeg[i + 1] === 0xe2 && jpeg.toString('latin1', i + 4, i + 15) === 'ICC_PROFILE') icc = jpeg.subarray(i + 18, i + 2 + len);
    i += 2 + len;
  }
  if (!icc) throw new Error('no ICC profile found');
  const W = 64;
  const rgb = Buffer.alloc(W * W * 3);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) rgb.set(x < W / 2 ? [200, 40, 40] : [40, 40, 200], (y * W + x) * 3);
  const bytes = await pdfWithImage(240, (doc) => {
    const profile = doc.context.register(doc.context.flateStream(new Uint8Array(icc), { N: 3, Alternate: 'DeviceRGB' }));
    return doc.context.flateStream(new Uint8Array(rgb), {
      Type: 'XObject', Subtype: 'Image', Width: W, Height: W, BitsPerComponent: 8, ColorSpace: ['ICCBased', profile],
    });
  });
  fs.writeFileSync(path.join(OUT, 'icc-rgb.pdf'), bytes);
  console.log('icc-rgb.pdf', bytes.length, 'bytes (profile', icc.length, 'bytes)');
}

// ---- JBIG2 (MMR) -----------------------------------------------------------------------------
{
  const W = 24;
  const H = 24;
  // CCITT G4 / MMR rows for an 8x8 black square at x 8..15, y 8..15 (1 = black in JBIG2).
  const bits = [];
  const push = (s) => bits.push(s);
  for (let y = 0; y < 8; y++) push('1'); // white rows: V0
  push('001' + '10011' + '000101' + '1'); // horizontal mode: white run 8, black run 8, then V0 to the end
  for (let y = 9; y < 16; y++) push('111'); // identical rows: V0 per transition and for the end
  push('0001' + '1'); // first white row after the square: pass mode over the black run, then V0
  for (let y = 17; y < H; y++) push('1'); // white rows: V0
  let str = bits.join('');
  while (str.length % 8) str += '0';
  const mmr = Buffer.from(str.match(/.{8}/g).map((b) => parseInt(b, 2)));

  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
  const segment = (num, type, data) => Buffer.concat([u32(num), Buffer.from([type, 0x00, 0x01]), u32(data.length), data]);
  const pageInfo = Buffer.concat([u32(W), u32(H), u32(0), u32(0), Buffer.from([0x00, 0x00, 0x00])]);
  const regionInfo = Buffer.concat([u32(W), u32(H), u32(0), u32(0), Buffer.from([0x00])]);
  const stream = Buffer.concat([
    segment(0, 48, pageInfo),
    segment(1, 38, Buffer.concat([regionInfo, Buffer.from([0x01]), mmr])), // flags: MMR
  ]);
  const bytes = await pdfWithImage(240, (doc) => doc.context.stream(new Uint8Array(stream), {
    Type: 'XObject', Subtype: 'Image', Width: W, Height: H, BitsPerComponent: 1, ColorSpace: 'DeviceGray', Filter: 'JBIG2Decode',
  }));
  fs.writeFileSync(path.join(OUT, 'jbig2.pdf'), bytes);
  console.log('jbig2.pdf', bytes.length, 'bytes (JBIG2 stream', stream.length, 'bytes)');
}

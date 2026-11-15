import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { stripJpegMetadata, stripPngMetadata, stripWebpMetadata, stripImageMetadata, keepOriginalWithoutMetadata } from './strip-metadata';
import { readCaptureDate, readOrientation } from './exif-date';

vi.setConfig({ testTimeout: 30_000 });

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const read = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));
const hasAscii = (bytes: Uint8Array, text: string) => Buffer.from(bytes).includes(Buffer.from(text, 'latin1'));

const EXIF = {
  IFD0: { Make: 'TestCam', Model: 'Phone 9', Copyright: 'secret-owner' },
  IFD2: { DateTimeOriginal: '2025:06:01 12:34:56' },
  IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '0/1 7/1 0/1' },
};

async function rawPixels(bytes: Uint8Array) {
  return sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer();
}

describe('stripJpegMetadata (review must-fix: kept originals leaked GPS)', () => {
  it('removes Exif (incl. GPS), XMP, IPTC and comments, keeps ICC and the exact pixels', async () => {
    const base = sharp({ create: { width: 64, height: 48, channels: 3, background: '#3a86ff' } });
    const jpeg = new Uint8Array(await base.jpeg({ quality: 30 }).withExif(EXIF).withIccProfile('srgb').toBuffer());
    expect(hasAscii(jpeg, 'Exif\u0000\u0000')).toBe(true);
    expect(hasAscii(jpeg, 'secret-owner')).toBe(true);
    expect(readCaptureDate(jpeg)?.dateTimeOriginal).toBe('2025:06:01 12:34:56');

    const out = stripJpegMetadata(jpeg)!;
    expect(out).not.toBeNull();
    expect(out.length).toBeLessThan(jpeg.length);
    expect(hasAscii(out, 'Exif\u0000\u0000')).toBe(false);
    expect(hasAscii(out, 'secret-owner')).toBe(false);
    expect(hasAscii(out, 'TestCam')).toBe(false);
    expect(hasAscii(out, 'ICC_PROFILE')).toBe(true);
    const meta = await sharp(Buffer.from(out)).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeDefined();
    expect((await rawPixels(out)).equals(await rawPixels(jpeg))).toBe(true);
  });

  it('drops data appended after EOI and COM segments', async () => {
    const plain = new Uint8Array(await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).jpeg().toBuffer());
    const note = Buffer.from('gps:51N0W', 'latin1');
    const com = new Uint8Array([0xff, 0xfe, 0x00, note.length + 2, ...note]);
    const withCom = new Uint8Array([...plain.subarray(0, 2), ...com, ...plain.subarray(2), ...Buffer.from('TRAILER-DATA', 'latin1')]);
    const out = stripJpegMetadata(withCom)!;
    expect(hasAscii(out, 'gps:51N0W')).toBe(false);
    expect(hasAscii(out, 'TRAILER-DATA')).toBe(false);
    expect((await rawPixels(out)).equals(await rawPixels(plain))).toBe(true);
  });

  it('keeps progressive scans intact', async () => {
    const prog = new Uint8Array(await sharp(path.join(FIX, 'exif-rot6-600x300.jpg')).jpeg({ progressive: true, quality: 70 }).withExif(EXIF).toBuffer());
    const out = stripJpegMetadata(prog)!;
    expect(hasAscii(out, 'secret-owner')).toBe(false);
    expect((await rawPixels(out)).equals(await rawPixels(prog))).toBe(true);
  });

  it('returns null for truncated or non-JPEG input', () => {
    const jpg = read('exif-rot6-600x300.jpg');
    expect(stripJpegMetadata(jpg.subarray(0, 200))).toBeNull();
    expect(stripJpegMetadata(read('logo-1024.png'))).toBeNull();
  });
});

describe('stripPngMetadata', () => {
  it('removes eXIf, tEXt, iTXt and zTXt chunks and keeps the pixels', async () => {
    const png = new Uint8Array(await sharp(path.join(FIX, 'palette-512.png')).png().withExif(EXIF)
      .withMetadata().toBuffer());
    // Add a tEXt chunk by hand (sharp does not write one).
    const text = Buffer.from('Comment\u0000taken at 51N 0W', 'latin1');
    const chunk = Buffer.alloc(12 + text.length);
    chunk.writeUInt32BE(text.length, 0);
    chunk.write('tEXt', 4, 'latin1');
    text.copy(chunk, 8);
    chunk.writeUInt32BE(0, 8 + text.length); // CRC is not checked by the stripper
    const withText = new Uint8Array([...png.subarray(0, 33), ...chunk, ...png.subarray(33), ...Buffer.from('JUNK', 'latin1')]);
    expect(hasAscii(withText, 'eXIf') || hasAscii(withText, 'secret-owner')).toBe(true);

    const out = stripPngMetadata(withText)!;
    expect(hasAscii(out, 'eXIf')).toBe(false);
    expect(hasAscii(out, 'tEXt')).toBe(false);
    expect(hasAscii(out, 'secret-owner')).toBe(false);
    expect(hasAscii(out, 'JUNK')).toBe(false);
    expect((await rawPixels(out)).equals(await rawPixels(png))).toBe(true);
  });

  it('returns null for broken chunk structure', () => {
    const png = read('logo-1024.png');
    expect(stripPngMetadata(png.subarray(0, 60))).toBeNull();
  });
});

describe('stripWebpMetadata', () => {
  it('removes EXIF and XMP chunks, clears the VP8X flags and fixes the RIFF size', async () => {
    const webp = new Uint8Array(await sharp(path.join(FIX, 'transparent-400.webp')).webp({ quality: 90 }).withExif(EXIF).toBuffer());
    expect(hasAscii(webp, 'EXIF')).toBe(true);
    const out = stripWebpMetadata(webp)!;
    expect(hasAscii(out, 'EXIF')).toBe(false);
    expect(hasAscii(out, 'secret-owner')).toBe(false);
    expect(new DataView(out.buffer, out.byteOffset).getUint32(4, true)).toBe(out.length - 8);
    const vp8x = Buffer.from(out).indexOf('VP8X');
    if (vp8x > 0) expect(out[vp8x + 8] & 0x0c).toBe(0);
    const meta = await sharp(Buffer.from(out)).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.hasAlpha).toBe(true);
    expect((await rawPixels(out)).equals(await rawPixels(webp))).toBe(true);
  });
});

describe('stripImageMetadata', () => {
  it('dispatches by format and rejects others', () => {
    expect(stripImageMetadata(read('exif-rot6-600x300.jpg'))).not.toBeNull();
    expect(stripImageMetadata(read('logo-1024.png'))).not.toBeNull();
    expect(stripImageMetadata(read('transparent-400.webp'))).not.toBeNull();
    expect(stripImageMetadata(read('animated-3f.gif'))).toBeNull();
  });
});

describe('keepOriginalWithoutMetadata (regression: kept originals came out sideways)', () => {
  it('JPEG: removes GPS and camera data but keeps the rotation flag, with or without the date', async () => {
    const jpeg = read('gps-rot6-q30.jpg');
    expect(readOrientation(jpeg)).toBe(6);
    expect(hasAscii(jpeg, 'secret-owner')).toBe(true);
    for (const keepDate of [true, false]) {
      const { bytes, needsUpright } = keepOriginalWithoutMetadata(jpeg, keepDate);
      expect(needsUpright).toBe(false);
      expect(bytes).not.toBeNull();
      const out = bytes!;
      expect(readOrientation(out)).toBe(6);
      expect(readCaptureDate(out)?.dateTimeOriginal).toBe(keepDate ? '2025:06:01 12:34:56' : undefined);
      expect(hasAscii(out, 'secret-owner')).toBe(false);
      expect(hasAscii(out, 'TestCam')).toBe(false);
      const meta = await sharp(Buffer.from(out)).metadata();
      expect(meta.orientation).toBe(6);
      expect(meta.exif!.length).toBeLessThan(120);
      expect(meta.exif!.includes(Buffer.from([0x88, 0x25]))).toBe(false); // no GPS IFD pointer
      expect((await rawPixels(out)).equals(await rawPixels(jpeg))).toBe(true);
    }
  });

  it('JPEG: an upright photo keeps no Exif at all when the date is not wanted', async () => {
    const jpeg = read('gps-q30.jpg');
    const dateOnly = keepOriginalWithoutMetadata(jpeg, true).bytes!;
    expect(readOrientation(dateOnly)).toBe(1);
    expect(readCaptureDate(dateOnly)?.dateTimeOriginal).toBe('2025:06:01 12:34:56');
    const none = keepOriginalWithoutMetadata(jpeg, false).bytes!;
    expect((await sharp(Buffer.from(none)).metadata()).exif).toBeUndefined();
  });

  it('a PNG with a rotation tag is not kept (the upright re-encode is used instead)', () => {
    expect(keepOriginalWithoutMetadata(read('rot6.png'), true)).toEqual({ bytes: null, needsUpright: true });
  });

  it('a WebP with a rotation tag is kept with the tag removed: no browser applies it, so re-encoding rotates nothing', async () => {
    // Generated here: noisy pixels at low quality, stored 160x80, Exif orientation 6 plus camera and GPS data.
    const noise = sharp({ create: { width: 160, height: 80, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } }).blur(1.5);
    const webp = new Uint8Array(await noise.webp({ quality: 40 }).withMetadata({ orientation: 6 }).withExif(EXIF).toBuffer());
    expect(hasAscii(webp, 'EXIF')).toBe(true);
    expect(readOrientation(webp)).toBe(6);
    for (const keepDate of [true, false]) {
      const { bytes, needsUpright } = keepOriginalWithoutMetadata(webp, keepDate);
      expect(needsUpright).toBe(false);
      expect(bytes).not.toBeNull();
      expect(bytes!.length).toBeLessThan(webp.length);
      expect(hasAscii(bytes!, 'EXIF')).toBe(false);
      expect(hasAscii(bytes!, 'secret-owner')).toBe(false);
      const meta = await sharp(Buffer.from(bytes!)).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      // Same stored pixels, same size as stored (160x80): nothing was rotated or re-encoded.
      expect([meta.width, meta.height]).toEqual([160, 80]);
      expect((await rawPixels(bytes!)).equals(await rawPixels(webp))).toBe(true);
    }
    // The committed fixture behaves the same way.
    expect(keepOriginalWithoutMetadata(read('rot6.webp'), false).needsUpright).toBe(false);
    expect(keepOriginalWithoutMetadata(read('rot6.webp'), false).bytes).not.toBeNull();
  });

  it('PNG and WebP without a rotation tag are kept with their metadata stripped', async () => {
    for (const name of ['meta.png', 'meta.webp']) {
      const { bytes, needsUpright } = keepOriginalWithoutMetadata(read(name), true);
      expect(needsUpright).toBe(false);
      expect(bytes).not.toBeNull();
      expect(hasAscii(bytes!, 'secret-owner')).toBe(false);
      expect((await sharp(Buffer.from(bytes!)).metadata()).exif).toBeUndefined();
    }
  });

  it('damaged or unsupported input is not kept and does not claim an orientation problem', () => {
    expect(keepOriginalWithoutMetadata(read('gps-rot6-q30.jpg').subarray(0, 300), true)).toEqual({ bytes: null, needsUpright: false });
    expect(keepOriginalWithoutMetadata(read('animated-3f.gif'), true)).toEqual({ bytes: null, needsUpright: false });
  });
});

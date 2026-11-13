import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  readCaptureDate, writeJpegCaptureDate, buildCaptureDateTiff, readCaptureDateFromTiff,
  readOrientation, readOrientationFromTiff, buildExifTiff, writeJpegExif,
} from './exif-date';
import { readJpegInfo } from './image-sniff';

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const read = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));

/** Little-endian TIFF with IFD0 -> Exif IFD -> DateTimeOriginal, plus a GPS pointer that must never be copied. */
function littleEndianTiff(date: string): Uint8Array {
  const buf = new Uint8Array(200);
  const v = new DataView(buf.buffer);
  buf.set([0x49, 0x49, 0x2a, 0x00]);
  v.setUint32(4, 8, true);
  // IFD0 at 8: 2 entries (ExifIFD pointer, GPS pointer)
  v.setUint16(8, 2, true);
  v.setUint16(10, 0x8769, true); v.setUint16(12, 4, true); v.setUint32(14, 1, true); v.setUint32(18, 40, true);
  v.setUint16(22, 0x8825, true); v.setUint16(24, 4, true); v.setUint32(26, 1, true); v.setUint32(30, 120, true);
  v.setUint32(34, 0, true);
  // Exif IFD at 40: 1 entry DateTimeOriginal -> offset 60
  v.setUint16(40, 1, true);
  v.setUint16(42, 0x9003, true); v.setUint16(44, 2, true); v.setUint32(46, 20, true); v.setUint32(50, 60, true);
  v.setUint32(54, 0, true);
  for (let i = 0; i < date.length; i++) buf[60 + i] = date.charCodeAt(i);
  return buf;
}

/** Wrap a TIFF block as a JPEG APP1 segment after SOI. */
function jpegWithExif(tiff: Uint8Array, body: Uint8Array): Uint8Array {
  const segLen = 2 + 6 + tiff.length;
  const out = new Uint8Array(2 + 2 + segLen + body.length - 2);
  out.set([0xff, 0xd8, 0xff, 0xe1, segLen >> 8, segLen & 255, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  out.set(tiff, 12);
  out.set(body.subarray(2), 12 + tiff.length);
  return out;
}

describe('capture date (FILES-18)', () => {
  it('round-trips through the minimal writer', () => {
    const tiff = buildCaptureDateTiff({ dateTimeOriginal: '2026:07:14 09:30:05', offsetTimeOriginal: '+01:00' });
    expect(readCaptureDateFromTiff(tiff)).toEqual({ dateTimeOriginal: '2026:07:14 09:30:05', offsetTimeOriginal: '+01:00' });
  });

  it('reads little-endian Exif from a JPEG and writes only the date', () => {
    const plain = read('exif-rot6-600x300.jpg');
    const src = jpegWithExif(littleEndianTiff('2025:12:24 18:00:00'), plain);
    const date = readCaptureDate(src);
    expect(date).toEqual({ dateTimeOriginal: '2025:12:24 18:00:00' });

    const out = writeJpegCaptureDate(plain, date!);
    expect(readCaptureDate(out)).toEqual(date);
    expect(readJpegInfo(out)).toEqual(readJpegInfo(plain));
    // The written block has no GPS IFD pointer (0x8825) and no orientation tag (0x0112).
    const asHex = Buffer.from(out.subarray(0, 120)).toString('hex');
    expect(asHex).not.toContain('8825');
    expect(asHex).not.toContain('0112');
  });

  it('inserts after a JFIF APP0 segment when present', () => {
    const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
    const out = writeJpegCaptureDate(jfif, { dateTimeOriginal: '2026:01:02 03:04:05' });
    expect(out[2]).toBe(0xff);
    expect(out[3]).toBe(0xe0);
    expect(out[20]).toBe(0xff);
    expect(out[21]).toBe(0xe1);
    expect(readCaptureDate(out)?.dateTimeOriginal).toBe('2026:01:02 03:04:05');
  });

  it('reads the Exif item from a HEIF container', () => {
    // Minimal HEIF: ftyp + meta(iinf with one Exif infe, iloc pointing into mdat) + mdat.
    const tiff = buildCaptureDateTiff({ dateTimeOriginal: '2024:05:06 07:08:09' });
    const payload = new Uint8Array(4 + 6 + tiff.length);
    new DataView(payload.buffer).setUint32(0, 6); // offset to TIFF header
    payload.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
    payload.set(tiff, 10);
    const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const u16 = (n: number) => [(n >>> 8) & 255, n & 255];
    const str = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));
    const box = (type: string, body: number[]) => [...u32(body.length + 8), ...str(type), ...body];
    const full = (type: string, v: number, body: number[]) => box(type, [v, 0, 0, 0, ...body]);
    const ftyp = box('ftyp', [...str('heic'), ...u32(0), ...str('mif1'), ...str('heic')]);
    const infe = full('infe', 2, [...u16(7), ...u16(0), ...str('Exif'), 0]);
    const iinf = full('iinf', 0, [...u16(1), ...infe]);
    const ilocFor = (off: number) => full('iloc', 0, [0x44, 0x00, ...u16(1), ...u16(7), ...u16(0), ...u16(1), ...u32(off), ...u32(payload.length)]);
    const metaFor = (off: number) => full('meta', 0, [...iinf, ...ilocFor(off)]);
    const offset = ftyp.length + metaFor(0).length + 8;
    const file = new Uint8Array([...ftyp, ...metaFor(offset), ...box('mdat', Array.from(payload))]);
    expect(readCaptureDate(file)).toEqual({ dateTimeOriginal: '2024:05:06 07:08:09' });
  });

  it('returns null for files without a date and leaves bad input alone', () => {
    expect(readCaptureDate(read('quadrants-256x128.heic'))).toBeNull();
    expect(readCaptureDate(read('logo-1024.png'))).toBeNull();
    expect(readCaptureDate(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    const png = read('logo-1024.png');
    expect(writeJpegCaptureDate(png, { dateTimeOriginal: '2026:01:01 00:00:00' })).toBe(png);
    const jpg = read('exif-rot6-600x300.jpg');
    expect(writeJpegCaptureDate(jpg, { dateTimeOriginal: 'yesterday' })).toBe(jpg);
  });
});

describe('orientation (rotation flag kept on images that are not re-encoded)', () => {
  it('reads the tag from JPEG, PNG and WebP, and defaults to 1', () => {
    expect(readOrientation(read('exif-rot6-600x300.jpg'))).toBe(6);
    expect(readOrientation(read('gps-rot6-q30.jpg'))).toBe(6);
    expect(readOrientation(read('rot6.png'))).toBe(6);
    expect(readOrientation(read('rot6.webp'))).toBe(6);
    for (const upright of ['gps-q30.jpg', 'meta.png', 'meta.webp', 'logo-1024.png', 'transparent-400.webp', 'quadrants-256x128.heic', 'animated-3f.gif']) {
      expect(readOrientation(read(upright)), upright).toBe(1);
    }
    expect(readOrientation(read('rot6.png').subarray(0, 40))).toBe(1);
    expect(readOrientation(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(1);
    expect(readOrientation(new Uint8Array())).toBe(1);
  });

  it('round-trips 2-8 through the minimal writer, alone and with a date', () => {
    for (let o = 2; o <= 8; o++) {
      expect(readOrientationFromTiff(buildExifTiff({ orientation: o }))).toBe(o);
      const both = buildExifTiff({ orientation: o, date: { dateTimeOriginal: '2026:07:14 09:30:05', offsetTimeOriginal: '+01:00' } });
      expect(readOrientationFromTiff(both)).toBe(o);
      expect(readCaptureDateFromTiff(both)).toEqual({ dateTimeOriginal: '2026:07:14 09:30:05', offsetTimeOriginal: '+01:00' });
    }
  });

  it('never writes 1 (upright) or an out-of-range value, and writes nothing for an empty request', () => {
    for (const o of [undefined, 0, 1, 9, -3]) expect(buildExifTiff({ orientation: o }).length).toBe(14);
    const jpg = read('exif-rot6-600x300.jpg');
    expect(writeJpegExif(jpg, {})).toBe(jpg);
    expect(writeJpegExif(jpg, { orientation: 1 })).toBe(jpg);
    expect(writeJpegExif(read('logo-1024.png'), { orientation: 6 }).length).toBe(read('logo-1024.png').length);
  });

  it('keeps writeJpegCaptureDate free of orientation', () => {
    const out = writeJpegCaptureDate(read('exif-rot6-600x300.jpg'), { dateTimeOriginal: '2026:01:02 03:04:05' });
    expect(readCaptureDate(out)?.dateTimeOriginal).toBe('2026:01:02 03:04:05');
    expect(readOrientation(out)).toBe(1);
  });
});

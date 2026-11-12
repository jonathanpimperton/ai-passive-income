/**
 * Byte-level image inspection for the file tools. Pure functions (no DOM),
 * unit-tested in image-sniff.test.ts.
 */

export type ImageKind = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'avif' | 'bmp' | 'svg' | 'unknown';

function ascii(bytes: Uint8Array, start: number, len: number): string {
  let s = '';
  for (let i = start; i < start + len && i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** Identify an image by its magic bytes (the browser-supplied MIME type and the extension can both lie). */
export function detectImageKind(bytes: Uint8Array): ImageKind {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return 'png';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a')) return 'gif';
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp';
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brands = ascii(bytes, 8, Math.min(32, bytes.length - 8));
    if (/avif|avis/.test(brands)) return 'avif';
    if (/heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(brands)) return 'heic';
  }
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).replace(/^﻿/, '').trimStart();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg')) || /^<!DOCTYPE svg/i.test(head)) return 'svg';
  return 'unknown';
}

/**
 * True for animated images, where the canvas-based tools only ever see the
 * first frame (FILES-23): animated WebP (VP8X animation flag or an ANIM
 * chunk), APNG (an acTL chunk before IDAT) and GIFs with more than one frame.
 */
export function isAnimatedImage(bytes: Uint8Array): boolean {
  const kind = detectImageKind(bytes);
  if (kind === 'webp') {
    // RIFF chunks start at byte 12.
    let p = 12;
    while (p + 8 <= bytes.length) {
      const id = ascii(bytes, p, 4);
      const size = bytes[p + 4] | (bytes[p + 5] << 8) | (bytes[p + 6] << 16) | (bytes[p + 7] << 24);
      if (id === 'VP8X' && p + 8 < bytes.length && (bytes[p + 8] & 0x02) !== 0) return true;
      if (id === 'ANIM' || id === 'ANMF') return true;
      if (size < 0) return false;
      p += 8 + size + (size & 1);
    }
    return false;
  }
  if (kind === 'png') {
    let p = 8;
    while (p + 8 <= bytes.length) {
      const len = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
      const type = ascii(bytes, p + 4, 4);
      if (type === 'acTL') return true;
      if (type === 'IDAT' || type === 'IEND') return false;
      p += 12 + len;
    }
    return false;
  }
  if (kind === 'gif') return countGifFrames(bytes) > 1;
  return false;
}

/** Count image descriptors in a GIF by walking its block structure. */
export function countGifFrames(bytes: Uint8Array): number {
  if (bytes.length < 13) return 0;
  let p = 13;
  const flags = bytes[10];
  if (flags & 0x80) p += 3 * (1 << ((flags & 0x07) + 1)); // global colour table
  let frames = 0;
  const skipSubBlocks = () => {
    while (p < bytes.length) {
      const size = bytes[p];
      p += 1;
      if (size === 0) return;
      p += size;
    }
  };
  while (p < bytes.length) {
    const b = bytes[p];
    if (b === 0x3b) break; // trailer
    if (b === 0x21) {
      p += 2; // extension introducer + label
      skipSubBlocks();
    } else if (b === 0x2c) {
      frames += 1;
      if (frames > 1) return frames;
      const localFlags = bytes[p + 9];
      p += 10;
      if (localFlags & 0x80) p += 3 * (1 << ((localFlags & 0x07) + 1));
      p += 1; // LZW minimum code size
      skipSubBlocks();
    } else {
      break; // corrupt; stop counting
    }
  }
  return frames;
}

export interface JpegInfo {
  width: number;
  height: number;
  /** Colour components in the frame: 1 = grey, 3 = YCbCr/RGB, 4 = CMYK/YCCK. */
  components: number;
}

/** Read width, height and component count from a JPEG's SOF marker. */
export function readJpegInfo(data: Uint8Array): JpegInfo | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < data.length) {
    if (data[i] !== 0xff) { i++; continue; }
    const marker = data[i + 1];
    if (marker === 0xff) { i++; continue; } // fill byte
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    // SOF0-SOF15 except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: (data[i + 5] << 8) | data[i + 6],
        width: (data[i + 7] << 8) | data[i + 8],
        components: data[i + 9],
      };
    }
    if (marker === 0xda || marker === 0xd9) return null; // SOS/EOI before SOF
    const segLen = (data[i + 2] << 8) | data[i + 3];
    if (segLen < 2) return null;
    i += 2 + segLen;
  }
  return null;
}

/**
 * Remove APP1 (Exif/XMP) segments from a JPEG. Used before handing a PDF's
 * embedded JPEG to the browser decoder, which would otherwise apply an Exif
 * Orientation tag that the PDF itself ignores.
 */
export function stripJpegApp1(data: Uint8Array): Uint8Array {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return data;
  const keep: Uint8Array[] = [data.subarray(0, 2)];
  let i = 2;
  let stripped = false;
  while (i + 4 <= data.length) {
    if (data[i] !== 0xff) return data; // unexpected layout: leave untouched
    const marker = data[i + 1];
    if (marker === 0xda) break; // start of scan: copy the rest verbatim
    const segLen = (data[i + 2] << 8) | data[i + 3];
    if (segLen < 2 || i + 2 + segLen > data.length) return data;
    if (marker === 0xe1) stripped = true;
    else keep.push(data.subarray(i, i + 2 + segLen));
    i += 2 + segLen;
  }
  if (!stripped) return data;
  keep.push(data.subarray(i));
  const total = keep.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const part of keep) { out.set(part, off); off += part.length; }
  return out;
}

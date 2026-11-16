/**
 * Remove metadata from an image WITHOUT re-encoding it.
 *
 * The Image Compressor keeps the original file when re-encoding would not
 * make it smaller. Handing back the untouched file would also hand back its
 * Exif (including GPS location), XMP and text chunks, while the tool promises
 * that location and other metadata are always removed. These functions drop
 * the metadata containers and keep the pixel data byte-for-byte:
 *
 * - JPEG: APP1 (Exif, XMP), APP13 (Photoshop/IPTC), other APPn maker blocks,
 *   non-ICC APP2 (MPF) and COM segments, plus anything after EOI (appended
 *   secondary images). Kept: APP0 (JFIF), APP2 ICC profile, APP14 (Adobe
 *   colour transform), tables, frame and scan data.
 * - PNG: eXIf, tEXt, zTXt, iTXt and tIME chunks, plus anything after IEND.
 * - WebP: EXIF and XMP chunks (the VP8X flags and RIFF size are updated).
 *
 * Malformed input is returned unchanged (the caller then re-encodes instead).
 *
 * The Orientation tag lives in the same Exif container and is dropped with it,
 * which would turn a photo taken sideways onto its side (its stored pixels are
 * unrotated). keepOriginalWithoutMetadata() decides what to do about that.
 *
 * Pure functions (no DOM), unit-tested in strip-metadata.test.ts.
 */
import { detectImageKind } from './image-sniff';
import { readCaptureDate, readOrientation, writeJpegExif } from './exif-date';

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function startsWithAscii(data: Uint8Array, offset: number, text: string): boolean {
  for (let i = 0; i < text.length; i++) if (data[offset + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** Strip JPEG metadata segments; returns null when the stream cannot be parsed safely. */
export function stripJpegMetadata(data: Uint8Array): Uint8Array | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [data.subarray(0, 2)];
  let i = 2;
  while (i + 1 < data.length) {
    if (data[i] !== 0xff) return null;
    const marker = data[i + 1];
    if (marker === 0xff) { i += 1; continue; } // fill byte
    if (marker === 0xd9) { parts.push(data.subarray(i, i + 2)); return concat(parts); } // EOI: drop trailing data
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { parts.push(data.subarray(i, i + 2)); i += 2; continue; }
    if (i + 4 > data.length) return null;
    const len = (data[i + 2] << 8) | data[i + 3];
    if (len < 2 || i + 2 + len > data.length) return null;
    const segment = data.subarray(i, i + 2 + len);
    if (marker === 0xda) {
      // Start of scan: copy the header, then the entropy-coded data up to the next real marker.
      parts.push(segment);
      let j = i + 2 + len;
      while (j + 1 < data.length) {
        if (data[j] !== 0xff) { j += 1; continue; }
        let k = j + 1;
        while (k < data.length && data[k] === 0xff) k += 1;
        const next = data[k];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { j = k + 1; continue; }
        break;
      }
      parts.push(data.subarray(i + 2 + len, j));
      i = j;
      continue;
    }
    const isApp = marker >= 0xe0 && marker <= 0xef;
    let keep = true;
    if (marker === 0xfe) keep = false; // COM
    else if (isApp) {
      keep = marker === 0xe0 // JFIF
        || marker === 0xee // Adobe
        || (marker === 0xe2 && startsWithAscii(data, i + 4, 'ICC_PROFILE\u0000'));
    }
    if (keep) parts.push(segment);
    i += 2 + len;
  }
  return null; // no EOI found: treat as damaged
}

const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

/** Strip PNG metadata chunks; returns null when the chunk structure is broken. */
export function stripPngMetadata(data: Uint8Array): Uint8Array | null {
  if (detectImageKind(data) !== 'png') return null;
  const parts: Uint8Array[] = [data.subarray(0, 8)];
  let p = 8;
  while (p + 12 <= data.length) {
    const len = ((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | data[p + 3]) >>> 0;
    const end = p + 12 + len;
    if (end > data.length) return null;
    const type = String.fromCharCode(data[p + 4], data[p + 5], data[p + 6], data[p + 7]);
    if (!PNG_DROP.has(type)) parts.push(data.subarray(p, end));
    p = end;
    if (type === 'IEND') return concat(parts); // drop anything after IEND
  }
  return null;
}

/** Strip WebP EXIF and XMP chunks; returns null when the RIFF structure is broken. */
export function stripWebpMetadata(data: Uint8Array): Uint8Array | null {
  if (detectImageKind(data) !== 'webp') return null;
  const chunks: Uint8Array[] = [];
  let p = 12;
  while (p + 8 <= data.length) {
    const size = (data[p + 4] | (data[p + 5] << 8) | (data[p + 6] << 16) | (data[p + 7] << 24)) >>> 0;
    const end = p + 8 + size + (size & 1);
    if (p + 8 + size > data.length) return null;
    const id = String.fromCharCode(data[p], data[p + 1], data[p + 2], data[p + 3]);
    if (id !== 'EXIF' && id !== 'XMP ') {
      const chunk = data.slice(p, Math.min(end, data.length));
      if (id === 'VP8X' && chunk.length > 8) chunk[8] &= ~(0x08 | 0x04); // clear EXIF and XMP flags
      chunks.push(chunk);
    }
    p = end;
  }
  const body = concat(chunks);
  const out = new Uint8Array(12 + body.length);
  out.set(data.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, 4 + body.length, true);
  out.set(body, 12);
  return out;
}

/** Strip metadata from a JPEG, PNG or WebP; null for other formats or damaged files. */
export function stripImageMetadata(data: Uint8Array): Uint8Array | null {
  switch (detectImageKind(data)) {
    case 'jpeg': return stripJpegMetadata(data);
    case 'png': return stripPngMetadata(data);
    case 'webp': return stripWebpMetadata(data);
    default: return null;
  }
}

export interface KeptOriginal {
  /** The original pixels with metadata removed, or null when the file must be re-encoded instead. */
  bytes: Uint8Array | null;
  /** True when re-encoding is needed only to keep the picture the right way up (a PNG with a rotation tag). */
  needsUpright: boolean;
}

/**
 * The original image with its metadata removed and WITHOUT re-encoding, for
 * when re-encoding would not make the file smaller.
 *
 * The result must display the same way round as the input:
 * - JPEG: Orientation 2-8 is put back as a minimal Exif block (a rotation
 *   flag, not private data), together with the date taken when `keepDate`.
 * - PNG: its orientation tag is not honoured everywhere (Safari ignores a
 *   PNG's eXIf), so a tagged file is not kept: `bytes` is null and
 *   `needsUpright` is true, and the caller returns its upright re-encode.
 * - WebP: no browser applies a WebP's Exif orientation (Chromium, Firefox and
 *   WebKit all draw the stored pixels as they are), so the tag changes nothing
 *   on screen and is dropped with the rest of the Exif. The file is kept like
 *   an untagged one: re-encoding it "upright" would not rotate anything, and
 *   only made the file larger (about 10x for a low-quality original).
 * GPS, camera, XMP and text metadata are never put back.
 */
export function keepOriginalWithoutMetadata(data: Uint8Array, keepDate: boolean): KeptOriginal {
  const stripped = stripImageMetadata(data);
  if (!stripped) return { bytes: null, needsUpright: false };
  const orientation = readOrientation(data);
  if (detectImageKind(data) === 'jpeg') {
    const date = keepDate ? readCaptureDate(data) : null;
    const bytes = orientation !== 1 || date ? writeJpegExif(stripped, { orientation, date }) : stripped;
    return { bytes, needsUpright: false };
  }
  if (orientation !== 1 && detectImageKind(data) !== 'webp') return { bytes: null, needsUpright: true };
  return { bytes: stripped, needsUpright: false };
}

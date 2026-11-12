/**
 * Keep a photo's "date taken" when re-encoding, without keeping anything
 * else from its metadata (review FILES-18).
 *
 * Canvas re-encoding drops all Exif. That is good for privacy (GPS location
 * is removed) but it also loses DateTimeOriginal, so converted photo archives
 * sort by conversion date. These helpers read only the capture date from a
 * JPEG or HEIC source and write it into a fresh, minimal Exif block in the
 * output JPEG. No GPS, camera or orientation tags are ever copied.
 *
 * Pure functions (no DOM), unit-tested in exif-date.test.ts.
 */

export interface CaptureDate {
  /** "YYYY:MM:DD HH:MM:SS" exactly as Exif stores it. */
  dateTimeOriginal: string;
  /** "+01:00" style offset, when the camera recorded one. */
  offsetTimeOriginal?: string;
}

const DATE_RE = /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/;
const OFFSET_RE = /^[+-]\d{2}:\d{2}$/;

const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;

// ---- reading --------------------------------------------------------------

function readAscii(view: DataView, offset: number, count: number): string {
  let s = '';
  for (let i = 0; i < count && offset + i < view.byteLength; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/** Parse a TIFF/Exif block and pull out DateTimeOriginal (+ offset). */
export function readCaptureDateFromTiff(tiff: Uint8Array): CaptureDate | null {
  if (tiff.length < 8) return null;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const order = readAscii(view, 0, 2);
  if (order !== 'II' && order !== 'MM') return null;
  const le = order === 'II';
  if (view.getUint16(2, le) !== 42) return null;

  const readIfd = (offset: number): Map<number, { type: number; count: number; valueOffset: number }> | null => {
    if (offset < 8 || offset + 2 > tiff.length) return null;
    const n = view.getUint16(offset, le);
    if (offset + 2 + n * 12 > tiff.length) return null;
    const entries = new Map<number, { type: number; count: number; valueOffset: number }>();
    for (let i = 0; i < n; i++) {
      const e = offset + 2 + i * 12;
      const tag = view.getUint16(e, le);
      const type = view.getUint16(e + 2, le);
      const count = view.getUint32(e + 4, le);
      // ASCII values of 4 bytes or fewer are stored inline in the offset field.
      const valueOffset = type === 2 && count <= 4 ? e + 8 : view.getUint32(e + 8, le);
      entries.set(tag, { type, count, valueOffset });
    }
    return entries;
  };

  const ifd0 = readIfd(view.getUint32(4, le));
  const exifPtr = ifd0?.get(TAG_EXIF_IFD);
  if (!exifPtr) return null;
  // A single LONG is stored inline, so valueOffset already holds the Exif IFD offset.
  const exif = readIfd(exifPtr.valueOffset);
  if (!exif) return null;
  const dto = exif.get(TAG_DATETIME_ORIGINAL);
  if (!dto || dto.type !== 2) return null;
  const date = readAscii(view, dto.valueOffset, dto.count).trim();
  if (!DATE_RE.test(date) || date.startsWith('0000')) return null;
  const result: CaptureDate = { dateTimeOriginal: date };
  const off = exif.get(TAG_OFFSET_TIME_ORIGINAL);
  if (off && off.type === 2) {
    const o = readAscii(view, off.valueOffset, off.count).trim();
    if (OFFSET_RE.test(o)) result.offsetTimeOriginal = o;
  }
  return result;
}

/** Find the Exif TIFF block in a JPEG's APP1 segment. */
function findJpegExif(data: Uint8Array): Uint8Array | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= data.length) {
    if (data[i] !== 0xff) return null;
    const marker = data[i + 1];
    if (marker === 0xda || marker === 0xd9) return null;
    const len = (data[i + 2] << 8) | data[i + 3];
    if (len < 2) return null;
    if (marker === 0xe1 && i + 10 <= data.length &&
        data[i + 4] === 0x45 && data[i + 5] === 0x78 && data[i + 6] === 0x69 && data[i + 7] === 0x66 &&
        data[i + 8] === 0 && data[i + 9] === 0) {
      return data.subarray(i + 10, Math.min(data.length, i + 2 + len));
    }
    i += 2 + len;
  }
  return null;
}

interface Box { type: string; start: number; headerSize: number; end: number }

function readBoxes(data: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let p = start;
  while (p + 8 <= end) {
    let size = view.getUint32(p);
    const type = String.fromCharCode(data[p + 4], data[p + 5], data[p + 6], data[p + 7]);
    let headerSize = 8;
    if (size === 1) {
      if (p + 16 > end) break;
      const hi = view.getUint32(p + 8);
      const lo = view.getUint32(p + 12);
      size = hi * 2 ** 32 + lo;
      headerSize = 16;
    } else if (size === 0) {
      size = end - p;
    }
    if (size < headerSize || p + size > end) break;
    boxes.push({ type, start: p, headerSize, end: p + size });
    p += size;
  }
  return boxes;
}

function readUint(view: DataView, offset: number, size: number): number {
  if (size === 0) return 0;
  if (size === 1) return view.getUint8(offset);
  if (size === 2) return view.getUint16(offset);
  if (size === 4) return view.getUint32(offset);
  if (size === 8) return view.getUint32(offset) * 2 ** 32 + view.getUint32(offset + 4);
  throw new Error('bad size');
}

/** Find the Exif item in a HEIC/HEIF file (meta > iinf 'Exif' item, located via iloc). */
function findHeifExif(data: Uint8Array): Uint8Array | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const meta = readBoxes(data, 0, data.length).find((b) => b.type === 'meta');
  if (!meta) return null;
  const children = readBoxes(data, meta.start + meta.headerSize + 4, meta.end); // FullBox: skip version+flags
  const iinf = children.find((b) => b.type === 'iinf');
  const iloc = children.find((b) => b.type === 'iloc');
  const idat = children.find((b) => b.type === 'idat');
  if (!iinf || !iloc) return null;

  // iinf: find the item_ID of type 'Exif'
  let p = iinf.start + iinf.headerSize;
  const iinfVersion = data[p];
  p += 4;
  p += iinfVersion === 0 ? 2 : 4; // entry_count
  let exifId = -1;
  for (const infe of readBoxes(data, p, iinf.end)) {
    if (infe.type !== 'infe') continue;
    const q = infe.start + infe.headerSize;
    const v = data[q];
    if (v < 2) continue;
    const idSize = v === 2 ? 2 : 4;
    const id = readUint(view, q + 4, idSize);
    const typeOff = q + 4 + idSize + 2;
    const itemType = String.fromCharCode(data[typeOff], data[typeOff + 1], data[typeOff + 2], data[typeOff + 3]);
    if (itemType === 'Exif') { exifId = id; break; }
  }
  if (exifId < 0) return null;

  // iloc: locate the item's first extent
  let q = iloc.start + iloc.headerSize;
  const v = data[q];
  q += 4;
  const offsetSize = data[q] >> 4;
  const lengthSize = data[q] & 0x0f;
  const baseOffsetSize = data[q + 1] >> 4;
  const indexSize = v === 1 || v === 2 ? data[q + 1] & 0x0f : 0;
  q += 2;
  const itemCount = v < 2 ? view.getUint16(q) : view.getUint32(q);
  q += v < 2 ? 2 : 4;
  for (let i = 0; i < itemCount && q < iloc.end; i++) {
    const id = v < 2 ? view.getUint16(q) : view.getUint32(q);
    q += v < 2 ? 2 : 4;
    let construction = 0;
    if (v === 1 || v === 2) { construction = view.getUint16(q) & 0x0f; q += 2; }
    q += 2; // data_reference_index
    const base = readUint(view, q, baseOffsetSize);
    q += baseOffsetSize;
    const extentCount = view.getUint16(q);
    q += 2;
    let firstOffset = -1;
    let firstLength = 0;
    for (let e = 0; e < extentCount; e++) {
      q += indexSize;
      const off = readUint(view, q, offsetSize);
      q += offsetSize;
      const len = readUint(view, q, lengthSize);
      q += lengthSize;
      if (e === 0) { firstOffset = off; firstLength = len; }
    }
    if (id !== exifId) continue;
    let start: number;
    if (construction === 0) start = base + firstOffset;
    else if (construction === 1 && idat) start = idat.start + idat.headerSize + base + firstOffset;
    else return null;
    const length = firstLength === 0 ? data.length - start : firstLength;
    if (start < 0 || start + 4 > data.length) return null;
    const item = data.subarray(start, Math.min(data.length, start + length));
    // Exif item payload: 4-byte offset to the TIFF header, then the data.
    const tiffOffset = 4 + new DataView(item.buffer, item.byteOffset, item.byteLength).getUint32(0);
    if (tiffOffset >= item.length) return null;
    return item.subarray(tiffOffset);
  }
  return null;
}

/** Read the capture date from a JPEG or HEIC/HEIF file, or null when it has none. */
export function readCaptureDate(data: Uint8Array): CaptureDate | null {
  try {
    const tiff = data[0] === 0xff && data[1] === 0xd8 ? findJpegExif(data) : findHeifExif(data);
    return tiff ? readCaptureDateFromTiff(tiff) : null;
  } catch {
    // Malformed metadata: the conversion still succeeds, just without the date.
    return null;
  }
}

// ---- writing --------------------------------------------------------------

function asciiBytes(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7f);
  out.push(0);
  return out;
}

/** Build a minimal big-endian TIFF block holding only the capture date. */
export function buildCaptureDateTiff(date: CaptureDate): Uint8Array {
  const exifEntries: { tag: number; value: number[] }[] = [
    { tag: TAG_DATETIME_ORIGINAL, value: asciiBytes(date.dateTimeOriginal) },
  ];
  if (date.offsetTimeOriginal && OFFSET_RE.test(date.offsetTimeOriginal)) {
    exifEntries.push({ tag: TAG_OFFSET_TIME_ORIGINAL, value: asciiBytes(date.offsetTimeOriginal) });
  }
  const ifd0Offset = 8;
  const ifd0Size = 2 + 12 + 4; // one entry: the Exif IFD pointer
  const exifIfdOffset = ifd0Offset + ifd0Size;
  const exifIfdSize = 2 + 12 * exifEntries.length + 4;
  let dataOffset = exifIfdOffset + exifIfdSize;
  const total = dataOffset + exifEntries.reduce((n, e) => n + (e.value.length > 4 ? e.value.length : 0), 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  out.set([0x4d, 0x4d, 0x00, 0x2a]); // "MM", 42
  view.setUint32(4, ifd0Offset);
  // IFD0
  view.setUint16(ifd0Offset, 1);
  view.setUint16(ifd0Offset + 2, TAG_EXIF_IFD);
  view.setUint16(ifd0Offset + 4, 4); // LONG
  view.setUint32(ifd0Offset + 6, 1);
  view.setUint32(ifd0Offset + 10, exifIfdOffset);
  view.setUint32(ifd0Offset + 14, 0); // no next IFD
  // Exif IFD
  view.setUint16(exifIfdOffset, exifEntries.length);
  exifEntries.forEach((entry, i) => {
    const e = exifIfdOffset + 2 + i * 12;
    view.setUint16(e, entry.tag);
    view.setUint16(e + 2, 2); // ASCII
    view.setUint32(e + 4, entry.value.length);
    if (entry.value.length <= 4) {
      out.set(entry.value, e + 8);
    } else {
      view.setUint32(e + 8, dataOffset);
      out.set(entry.value, dataOffset);
      dataOffset += entry.value.length;
    }
  });
  view.setUint32(exifIfdOffset + 2 + 12 * exifEntries.length, 0);
  return out;
}

/**
 * Insert a minimal Exif APP1 segment (capture date only) into a JPEG, after
 * SOI and any JFIF APP0. Returns the input unchanged when it is not a JPEG
 * or the date is malformed.
 */
export function writeJpegCaptureDate(jpeg: Uint8Array, date: CaptureDate): Uint8Array {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  if (!DATE_RE.test(date.dateTimeOriginal)) return jpeg;
  const tiff = buildCaptureDateTiff(date);
  const segLen = 2 + 6 + tiff.length;
  const app1 = new Uint8Array(2 + segLen);
  app1.set([0xff, 0xe1, segLen >> 8, segLen & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  app1.set(tiff, 10);
  let insertAt = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0 && jpeg.length > 6) {
    insertAt = 4 + ((jpeg[4] << 8) | jpeg[5]);
  }
  const out = new Uint8Array(jpeg.length + app1.length);
  out.set(jpeg.subarray(0, insertAt), 0);
  out.set(app1, insertAt);
  out.set(jpeg.subarray(insertAt), insertAt + app1.length);
  return out;
}

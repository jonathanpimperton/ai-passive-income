/**
 * PNG encoding for the Image Compressor (review FILES-03).
 *
 * The browser's canvas PNG encoder always writes 32-bit RGBA with fixed
 * settings, which made "compressed" PNGs up to 3.4x LARGER than the input.
 * This module provides:
 *   - encodePngLossless: picks the smallest exact representation (palette
 *     with tRNS when there are <= 256 colours, grey, grey+alpha, RGB or RGBA),
 *     adaptive row filters and maximum zlib compression;
 *   - quantizeRgba: median-cut colour reduction to a <= 256 colour palette
 *     (keeps transparency), the "lossy PNG" approach of tools such as pngquant;
 *   - psnr: an error measure used as a quality gate, so colour reduction is
 *     only used when it does not visibly damage the image.
 *
 * Pure functions on RGBA byte arrays (no DOM), unit-tested in png-encode.test.ts.
 */
import { zlibSync } from 'fflate';

type Pixels = Uint8Array | Uint8ClampedArray;

// ---- low-level PNG chunk writing -----------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

function assemble(width: number, height: number, bitDepth: number, colorType: number, idat: Uint8Array,
  plte?: Uint8Array, trns?: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  // compression 0, filter 0, interlace 0
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
  ];
  if (plte) parts.push(chunk('PLTE', plte));
  if (trns && trns.length > 0) parts.push(chunk('tRNS', trns));
  parts.push(chunk('IDAT', idat), chunk('IEND', new Uint8Array(0)));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ---- row filtering --------------------------------------------------------

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Filter scanlines. `adaptive` tries all five PNG filters per row and keeps
 * the one with the smallest sum of absolute signed bytes (the libpng
 * heuristic). Palette images use filter 0, which compresses best for them.
 */
function filterRows(raw: Uint8Array, height: number, stride: number, bpp: number, adaptive: boolean): Uint8Array {
  const out = new Uint8Array(height * (stride + 1));
  const cand = adaptive ? [0, 1, 2, 3, 4].map(() => new Uint8Array(stride)) : [];
  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? raw.subarray((y - 1) * stride, y * stride) : null;
    const dst = y * (stride + 1);
    if (!adaptive) {
      out[dst] = 0;
      out.set(row, dst + 1);
      continue;
    }
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const c = cand[f];
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const x = row[i];
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev ? prev[i] : 0;
        const cc = prev && i >= bpp ? prev[i - bpp] : 0;
        let val: number;
        switch (f) {
          case 0: val = x; break;
          case 1: val = x - a; break;
          case 2: val = x - b; break;
          case 3: val = x - ((a + b) >> 1); break;
          default: val = x - paeth(a, b, cc); break;
        }
        val &= 0xff;
        c[i] = val;
        sum += val < 128 ? val : 256 - val;
        if (sum >= bestSum) break; // cannot win; stop early
      }
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    // Re-run the winning filter fully (the early exit may have left it partial).
    const c = cand[best];
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const cc = prev && i >= bpp ? prev[i - bpp] : 0;
      let val: number;
      switch (best) {
        case 0: val = x; break;
        case 1: val = x - a; break;
        case 2: val = x - b; break;
        case 3: val = x - ((a + b) >> 1); break;
        default: val = x - paeth(a, b, cc); break;
      }
      c[i] = val & 0xff;
    }
    out[dst] = best;
    out.set(c, dst + 1);
  }
  return out;
}

// ---- palette images --------------------------------------------------------

/**
 * Encode an indexed image. `palette` is RGBA (4 bytes per entry, at most 256
 * entries); `indices` has one byte per pixel. Bit depth shrinks to 1/2/4 when
 * the palette is small enough.
 */
export function encodePngIndexed(palette: Uint8Array, indices: Uint8Array, width: number, height: number, level = 9): Uint8Array {
  const n = palette.length / 4;
  if (n < 1 || n > 256) throw new Error('palette must have 1-256 entries');
  // Put translucent entries first so tRNS can be truncated after the last one.
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const ta = palette[a * 4 + 3] < 255 ? 0 : 1;
    const tb = palette[b * 4 + 3] < 255 ? 0 : 1;
    return ta - tb || a - b;
  });
  const remap = new Uint8Array(n);
  order.forEach((oldIdx, newIdx) => { remap[oldIdx] = newIdx; });
  const plte = new Uint8Array(n * 3);
  let lastTranslucent = -1;
  const trnsFull = new Uint8Array(n);
  order.forEach((oldIdx, newIdx) => {
    plte[newIdx * 3] = palette[oldIdx * 4];
    plte[newIdx * 3 + 1] = palette[oldIdx * 4 + 1];
    plte[newIdx * 3 + 2] = palette[oldIdx * 4 + 2];
    const a = palette[oldIdx * 4 + 3];
    trnsFull[newIdx] = a;
    if (a < 255) lastTranslucent = newIdx;
  });
  const trns = lastTranslucent >= 0 ? trnsFull.subarray(0, lastTranslucent + 1) : undefined;

  const bitDepth = n <= 2 ? 1 : n <= 4 ? 2 : n <= 16 ? 4 : 8;
  const perByte = 8 / bitDepth;
  const stride = Math.ceil(width / perByte);
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * stride;
    const src = y * width;
    if (bitDepth === 8) {
      for (let x = 0; x < width; x++) raw[rowOff + x] = remap[indices[src + x]];
    } else {
      for (let x = 0; x < width; x++) {
        const v = remap[indices[src + x]];
        const byte = rowOff + Math.floor(x / perByte);
        const shift = 8 - bitDepth * ((x % perByte) + 1);
        raw[byte] |= v << shift;
      }
    }
  }
  const filtered = filterRows(raw, height, stride, 1, false);
  return assemble(width, height, bitDepth, 3, zlibSync(filtered, { level: level as 9 }), plte, trns);
}

// ---- lossless encoding ----------------------------------------------------

export interface PngAnalysis {
  opaque: boolean;
  grey: boolean;
  /** Number of distinct RGBA colours, capped at 257 (257 means "more than 256"). */
  colourCount: number;
}

/** One pass over the pixels: opacity, greyness and distinct colours (up to 257). */
export function analysePixels(rgba: Pixels): PngAnalysis {
  let opaque = true;
  let grey = true;
  const colours = new Map<number, number>();
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
    if (a !== 255) opaque = false;
    if (r !== g || g !== b) grey = false;
    if (colours.size <= 256) {
      // Fully transparent pixels all count as one colour.
      const key = a === 0 ? 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
      if (!colours.has(key)) colours.set(key, colours.size);
    }
  }
  return { opaque, grey, colourCount: colours.size };
}

/** Smallest exact PNG for the pixels (no information is lost). */
export function encodePngLossless(rgba: Pixels, width: number, height: number, level = 9): Uint8Array {
  const info = analysePixels(rgba);
  if (info.colourCount <= 256) {
    const map = new Map<number, number>();
    const palette: number[] = [];
    const indices = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
      const a = rgba[i + 3];
      const key = a === 0 ? 0 : ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | a) >>> 0;
      let idx = map.get(key);
      if (idx === undefined) {
        idx = map.size;
        map.set(key, idx);
        if (a === 0) palette.push(0, 0, 0, 0);
        else palette.push(rgba[i], rgba[i + 1], rgba[i + 2], a);
      }
      indices[p] = idx;
    }
    return encodePngIndexed(Uint8Array.from(palette), indices, width, height, level);
  }
  let colorType: number;
  let bpp: number;
  if (info.grey) { colorType = info.opaque ? 0 : 4; bpp = info.opaque ? 1 : 2; }
  else { colorType = info.opaque ? 2 : 6; bpp = info.opaque ? 3 : 4; }
  const stride = width * bpp;
  const raw = new Uint8Array(stride * height);
  for (let i = 0, o = 0; i < rgba.length; i += 4) {
    if (colorType === 0) raw[o++] = rgba[i];
    else if (colorType === 4) { raw[o++] = rgba[i]; raw[o++] = rgba[i + 3]; }
    else if (colorType === 2) { raw[o++] = rgba[i]; raw[o++] = rgba[i + 1]; raw[o++] = rgba[i + 2]; }
    else { raw[o++] = rgba[i]; raw[o++] = rgba[i + 1]; raw[o++] = rgba[i + 2]; raw[o++] = rgba[i + 3]; }
  }
  const filtered = filterRows(raw, height, stride, bpp, true);
  return assemble(width, height, 8, colorType, zlibSync(filtered, { level: level as 9 }));
}

// ---- colour reduction (median cut) -----------------------------------------

export interface Quantized {
  /** RGBA palette, 4 bytes per entry. */
  palette: Uint8Array;
  /** One palette index per pixel. */
  indices: Uint8Array;
}

// Histogram buckets: 5 bits each for R, G, B and 4 bits for alpha (19 bits).
const RB = 5, AB = 4;
const BUCKETS = 1 << (RB * 3 + AB);
function bucketKey(r: number, g: number, b: number, a: number): number {
  return ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4);
}

interface Box { keys: number[]; count: number; ch: number; score: number }

/**
 * Reduce an RGBA image to at most `maxColours` colours with median cut.
 * Fully transparent pixels share one transparent palette entry. `dither`
 * (0..1) applies Floyd-Steinberg error diffusion at that strength.
 */
export function quantizeRgba(rgba: Pixels, width: number, height: number, maxColours = 256, dither = 0): Quantized {
  const counts = new Uint32Array(BUCKETS);
  const sums = new Float64Array(BUCKETS * 4);
  let hasTransparent = false;
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a === 0) { hasTransparent = true; continue; }
    const k = bucketKey(rgba[i], rgba[i + 1], rgba[i + 2], a);
    counts[k] += 1;
    sums[k * 4] += rgba[i];
    sums[k * 4 + 1] += rgba[i + 1];
    sums[k * 4 + 2] += rgba[i + 2];
    sums[k * 4 + 3] += a;
  }
  const used: number[] = [];
  for (let k = 0; k < BUCKETS; k++) if (counts[k] > 0) used.push(k);
  const target = Math.max(1, Math.min(256, maxColours) - (hasTransparent ? 1 : 0));

  const channel = (k: number, c: number): number => {
    if (c === 0) return (k >> 14) & 31;
    if (c === 1) return (k >> 9) & 31;
    if (c === 2) return (k >> 4) & 31;
    return (k & 15) * 2; // alpha on the same 0-31 scale
  };
  // Each box caches its split score (pixel count x widest channel range) so
  // only the two halves of a split need re-measuring.
  const makeBox = (keys: number[]): Box => {
    let count = 0;
    const lo = [99, 99, 99, 99], hi = [-1, -1, -1, -1];
    for (const k of keys) {
      count += counts[k];
      for (let c = 0; c < 4; c++) {
        const v = channel(k, c);
        if (v < lo[c]) lo[c] = v;
        if (v > hi[c]) hi[c] = v;
      }
    }
    let ch = 0, range = -1;
    for (let c = 0; c < 4; c++) if (hi[c] - lo[c] > range) { range = hi[c] - lo[c]; ch = c; }
    return { keys, count, ch, score: keys.length < 2 ? 0 : range * Math.sqrt(count) };
  };
  const boxes: Box[] = [makeBox(used)];
  while (boxes.length < target) {
    let bi = -1;
    let bestScore = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].score > bestScore) { bestScore = boxes[i].score; bi = i; }
    }
    if (bi < 0) break; // every box is a single bucket
    const box = boxes[bi];
    const ch = box.ch;
    box.keys.sort((x, y) => channel(x, ch) - channel(y, ch));
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.keys.length - 1; i++) {
      acc += counts[box.keys[i]];
      cut = i + 1;
      if (acc >= box.count / 2) break;
    }
    boxes.splice(bi, 1, makeBox(box.keys.slice(0, cut)), makeBox(box.keys.slice(cut)));
  }

  const paletteArr: number[] = [];
  if (hasTransparent) paletteArr.push(0, 0, 0, 0);
  for (const box of boxes) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (const k of box.keys) {
      n += counts[k];
      r += sums[k * 4]; g += sums[k * 4 + 1]; b += sums[k * 4 + 2]; a += sums[k * 4 + 3];
    }
    if (n === 0) continue;
    paletteArr.push(Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n));
  }
  if (paletteArr.length === 0) paletteArr.push(0, 0, 0, 0);
  const palette = Uint8Array.from(paletteArr);
  const nPal = palette.length / 4;

  // Nearest-colour lookup, cached per histogram bucket of the (dithered) colour.
  const cache = new Int16Array(BUCKETS).fill(-1);
  const nearest = (r: number, g: number, b: number, a: number): number => {
    const k = bucketKey(r, g, b, a);
    const hit = cache[k];
    if (hit >= 0) return hit;
    let best = 0;
    let bestD = Infinity;
    for (let p = 0; p < nPal; p++) {
      const pa = palette[p * 4 + 3];
      if (pa === 0 && hasTransparent && p === 0) continue; // transparent entry is only for a === 0
      const dr = palette[p * 4] - r, dg = palette[p * 4 + 1] - g, db = palette[p * 4 + 2] - b, da = pa - a;
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3 + da * da * 4;
      if (d < bestD) { bestD = d; best = p; }
    }
    cache[k] = best;
    return best;
  };

  const indices = new Uint8Array(width * height);
  const strength = Math.max(0, Math.min(1, dither));
  let errCur = strength > 0 ? new Float32Array((width + 2) * 4) : null;
  let errNext = strength > 0 ? new Float32Array((width + 2) * 4) : null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a0 = rgba[i + 3];
      if (a0 === 0 && hasTransparent) { indices[y * width + x] = 0; continue; }
      let r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = a0;
      if (errCur) {
        const e = (x + 1) * 4;
        r = Math.min(255, Math.max(0, r + errCur[e]));
        g = Math.min(255, Math.max(0, g + errCur[e + 1]));
        b = Math.min(255, Math.max(0, b + errCur[e + 2]));
        a = Math.min(255, Math.max(1, a + errCur[e + 3]));
      }
      const p = nearest(r | 0, g | 0, b | 0, a | 0);
      indices[y * width + x] = p;
      if (errCur && errNext) {
        const er = (r - palette[p * 4]) * strength;
        const eg = (g - palette[p * 4 + 1]) * strength;
        const eb = (b - palette[p * 4 + 2]) * strength;
        const ea = (a - palette[p * 4 + 3]) * strength;
        const spread = (buf: Float32Array, xx: number, f: number) => {
          const o = (xx + 1) * 4;
          buf[o] += er * f; buf[o + 1] += eg * f; buf[o + 2] += eb * f; buf[o + 3] += ea * f;
        };
        spread(errCur, x + 1, 7 / 16);
        spread(errNext, x - 1, 3 / 16);
        spread(errNext, x, 5 / 16);
        spread(errNext, x + 1, 1 / 16);
      }
    }
    if (errCur && errNext) {
      const t = errCur; errCur = errNext; errNext = t; errNext.fill(0);
    }
  }
  return { palette, indices };
}

/** Expand a palette image back to RGBA (used to measure the quantisation error). */
export function expandIndexed(q: Quantized, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount * 4);
  for (let p = 0; p < pixelCount; p++) {
    const s = q.indices[p] * 4;
    out[p * 4] = q.palette[s];
    out[p * 4 + 1] = q.palette[s + 1];
    out[p * 4 + 2] = q.palette[s + 2];
    out[p * 4 + 3] = q.palette[s + 3];
  }
  return out;
}

/**
 * Peak signal-to-noise ratio in dB between two RGBA images, measured on
 * colour premultiplied by alpha (so differences hidden by transparency do
 * not count) plus the alpha channel itself. Identical images give Infinity.
 */
export function psnr(a: Pixels, b: Pixels): number {
  if (a.length !== b.length) throw new Error('size mismatch');
  let se = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3] / 255, ba = b[i + 3] / 255;
    const dr = a[i] * aa - b[i] * ba;
    const dg = a[i + 1] * aa - b[i + 1] * ba;
    const db = a[i + 2] * aa - b[i + 2] * ba;
    const da = a[i + 3] - b[i + 3];
    se += dr * dr + dg * dg + db * db + da * da;
  }
  if (se === 0) return Infinity;
  const mse = se / (a.length);
  return 10 * Math.log10((255 * 255) / mse);
}

/**
 * Minimum PSNR (dB) accepted for colour reduction at a quality setting.
 * 100 means lossless only (returns Infinity). 80 -> ~37 dB, 50 -> ~31.5 dB.
 */
export function psnrGateForQuality(quality: number): number {
  if (quality >= 100) return Infinity;
  const q = Math.max(10, Math.min(99, quality));
  return 24 + ((q - 10) * 16) / 85;
}

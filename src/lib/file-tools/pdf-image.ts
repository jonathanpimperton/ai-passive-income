/**
 * Decoding of Flate-compressed PDF image samples (review FILES-08).
 *
 * PDF Compress used to skip every /FlateDecode image (PNG-style data), so
 * PDFs built from screenshots or PNGs got 0% and a misleading "N images
 * recompressed" message. These helpers decode such images to RGBA so they can
 * be re-encoded as JPEG, and decide which images are safe to touch at all.
 *
 * Pure functions (no DOM), unit-tested in pdf-image.test.ts.
 */
import { unzlibSync } from 'fflate';

export interface FlateParams {
  predictor: number;
  colors: number;
  bitsPerComponent: number;
  columns: number;
}

/** Inflate a zlib stream and undo any PNG (10-15) or TIFF (2) predictor. Throws on corrupt data. */
export function decodeFlateImage(data: Uint8Array, params: FlateParams): Uint8Array {
  const inflated = unzlibSync(data);
  if (params.predictor >= 10) return undoPngPredictor(inflated, params.colors, params.bitsPerComponent, params.columns);
  if (params.predictor === 2) return undoTiffPredictor(inflated, params.colors, params.bitsPerComponent, params.columns);
  return inflated;
}

/** Reverse PNG row filters (each row starts with a filter-type byte). */
export function undoPngPredictor(data: Uint8Array, colors: number, bpc: number, columns: number): Uint8Array {
  const rowBytes = Math.ceil((colors * bpc * columns) / 8);
  const bpp = Math.max(1, Math.floor((colors * bpc) / 8));
  const rows = Math.floor(data.length / (rowBytes + 1));
  const out = new Uint8Array(rows * rowBytes);
  for (let y = 0; y < rows; y++) {
    const filter = data[y * (rowBytes + 1)];
    const src = y * (rowBytes + 1) + 1;
    const dst = y * rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const x = data[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = y > 0 ? out[dst - rowBytes + i] : 0;
      const c = y > 0 && i >= bpp ? out[dst - rowBytes + i - bpp] : 0;
      let v: number;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad PNG filter ${filter}`);
      }
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

/** Reverse the TIFF horizontal-differencing predictor (8-bit samples only). */
export function undoTiffPredictor(data: Uint8Array, colors: number, bpc: number, columns: number): Uint8Array {
  if (bpc !== 8) throw new Error('TIFF predictor only supported for 8-bit samples');
  const rowBytes = colors * columns;
  const out = new Uint8Array(data);
  for (let y = 0; y + rowBytes <= out.length; y += rowBytes) {
    for (let i = colors; i < rowBytes; i++) out[y + i] = (out[y + i] + out[y + i - colors]) & 0xff;
  }
  return out;
}

/** Expand 8-bit grey (1 component) or RGB (3 components) samples to opaque RGBA. */
export function samplesToRgba(samples: Uint8Array, width: number, height: number, components: 1 | 3): Uint8ClampedArray {
  const n = width * height;
  if (samples.length < n * components) throw new Error('image data is shorter than its declared size');
  const out = new Uint8ClampedArray(n * 4);
  for (let p = 0; p < n; p++) {
    if (components === 1) {
      const g = samples[p];
      out[p * 4] = g; out[p * 4 + 1] = g; out[p * 4 + 2] = g;
    } else {
      out[p * 4] = samples[p * 3]; out[p * 4 + 1] = samples[p * 3 + 1]; out[p * 4 + 2] = samples[p * 3 + 2];
    }
    out[p * 4 + 3] = 255;
  }
  return out;
}

export type ColourModel = 'rgb' | 'grey' | 'other';

/**
 * Describe a PDF colour space for recompression purposes. Accepts the
 * colour-space name ("/DeviceRGB") or, for array spaces, the family name plus
 * the ICC component count (N) when known.
 */
export function colourModel(family: string, iccComponents?: number): ColourModel {
  switch (family) {
    case '/DeviceRGB':
    case '/CalRGB':
      return 'rgb';
    case '/DeviceGray':
    case '/CalGray':
      return 'grey';
    case '/ICCBased':
      return iccComponents === 3 ? 'rgb' : iccComponents === 1 ? 'grey' : 'other';
    default:
      // DeviceCMYK, Indexed, Lab, Separation, DeviceN, Pattern: browsers
      // cannot round-trip these faithfully (CMYK shifted colours, FILES-14).
      return 'other';
  }
}

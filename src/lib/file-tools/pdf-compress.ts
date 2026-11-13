/**
 * PDF Compress pipeline (review FILES-08, FILES-14).
 *
 * Recompresses embedded raster images in place and leaves text and vector
 * content untouched. Compared with the original tool:
 * - Flate (PNG-style) RGB and grey images are decoded and re-encoded as JPEG
 *   instead of being skipped (FILES-08).
 * - Only images that were actually replaced are counted; skipped images are
 *   reported with a reason.
 * - The image dictionary is no longer rebuilt from scratch: /SMask, /Mask,
 *   /Decode, /Intent, /Interpolate and the original colour space are kept
 *   (FILES-14). CMYK, Indexed, Lab, Separation/DeviceN images, colour-key
 *   masks and images that are themselves masks are left alone, because the
 *   browser cannot round-trip them faithfully.
 *
 * The actual pixel work is done by an injected `encoder` (canvas in the
 * browser, sharp in unit tests), so this module has no DOM dependency.
 */
import type { PDFDocument, PDFDict as PDFDictT, PDFRef as PDFRefT, PDFRawStream as PDFRawStreamT } from 'pdf-lib';
import { decodeFlateImage, samplesToRgba, colourModel, type ColourModel } from './pdf-image';
import { readJpegInfo, stripJpegApp1 } from './image-sniff';

export type ImageSource =
  | { kind: 'jpeg'; bytes: Uint8Array }
  | { kind: 'rgba'; rgba: Uint8ClampedArray; width: number; height: number };

export interface EncodeOptions {
  /** JPEG quality, 0-1. */
  quality: number;
  /** Longest side in pixels after downscaling; 0 = keep size. */
  maxDimension: number;
}

export type ImageEncoder = (src: ImageSource, opts: EncodeOptions) => Promise<{ bytes: Uint8Array; width: number; height: number }>;

export type SkipReason =
  | 'small'
  | 'mask'
  | 'colour-space'
  | 'filter'
  | 'bit-depth'
  | 'decode-array'
  | 'no-gain'
  | 'error';

export const SKIP_LABELS: Record<SkipReason, string> = {
  small: 'too small to benefit',
  mask: 'transparency masks (kept sharp)',
  'colour-space': 'CMYK or special colour spaces (left untouched to avoid colour shifts)',
  filter: 'formats the browser cannot re-encode (JPEG 2000, JBIG2, fax, LZW)',
  'bit-depth': 'non-8-bit images',
  'decode-array': 'images with inverted decoding',
  'no-gain': 'already as small as this setting allows',
  error: 'could not be decoded',
};

export interface CompressReport {
  imagesFound: number;
  imagesReplaced: number;
  skipped: Partial<Record<SkipReason, number>>;
}

export interface CompressOptions extends EncodeOptions {
  /** Called before each image with (index, total). */
  onProgress?: (done: number, total: number) => void;
  /** Return true to stop early (the document is left partly processed; callers discard it). */
  isCancelled?: () => boolean;
  /** Skip image streams smaller than this many bytes. Default 10 KB. */
  minBytes?: number;
}

export class CompressCancelled extends Error {
  constructor() { super('cancelled'); }
}

type PdfLib = typeof import('pdf-lib');

interface Plan {
  ref: PDFRefT;
  dict: PDFDictT;
  stream: { contents: Uint8Array };
  filter: 'DCT' | 'Flate';
  model: ColourModel;
  width: number;
  height: number;
  flate?: { predictor: number; colors: number; bpc: number; columns: number };
}

function num(v: unknown): number | null {
  if (v && typeof (v as { asNumber?: () => number }).asNumber === 'function') return (v as { asNumber: () => number }).asNumber();
  return null;
}

/** Recompress the images of `doc` in place. */
export async function compressPdfImages(doc: PDFDocument, encoder: ImageEncoder, opts: CompressOptions): Promise<CompressReport> {
  const lib: PdfLib = await import('pdf-lib');
  const { PDFName, PDFRawStream, PDFDict, PDFArray, PDFRef, PDFNumber } = lib;
  const ctx = doc.context;
  const N = (s: string) => PDFName.of(s);
  const minBytes = opts.minBytes ?? 10_000;

  // 1. Find image XObjects and every image used as a mask by another image.
  const images: Array<[PDFRefT, PDFRawStreamT]> = [];
  const maskRefs = new Set<string>();
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (obj.dict.get(N('Subtype'))?.toString() !== '/Image') continue;
    images.push([ref, obj]);
    for (const key of ['SMask', 'Mask']) {
      const m = obj.dict.get(N(key));
      if (m instanceof PDFRef) maskRefs.add(m.toString());
    }
  }

  const report: CompressReport = { imagesFound: images.length, imagesReplaced: 0, skipped: {} };
  const skip = (r: SkipReason) => { report.skipped[r] = (report.skipped[r] ?? 0) + 1; };

  const resolveColour = (cs: unknown): ColourModel => {
    const v = cs instanceof PDFRef ? ctx.lookup(cs) : cs;
    if (v instanceof PDFName) return colourModel(v.toString());
    if (v instanceof PDFArray && v.size() > 0) {
      const family = v.get(0)?.toString() ?? '';
      if (family === '/ICCBased') {
        const icc = ctx.lookup(v.get(1));
        const n = icc instanceof PDFRawStream ? num(icc.dict.get(N('N'))) : null;
        return colourModel(family, n ?? undefined);
      }
      return colourModel(family);
    }
    return 'other';
  };

  // 2. Decide what can be touched.
  const plans: Plan[] = [];
  for (const [ref, stream] of images) {
    const dict = stream.dict;
    if (maskRefs.has(ref.toString()) || dict.get(N('ImageMask'))?.toString() === 'true') { skip('mask'); continue; }
    if (dict.get(N('Mask')) instanceof PDFArray) { skip('mask'); continue; } // colour-key masking breaks under lossy coding
    let filterObj = dict.get(N('Filter'));
    let parms = dict.get(N('DecodeParms'));
    if (filterObj instanceof PDFArray) {
      if (filterObj.size() !== 1) { skip('filter'); continue; }
      filterObj = filterObj.get(0);
      if (parms instanceof PDFArray) parms = parms.get(0);
    }
    const filterName = filterObj?.toString();
    const filter = filterName === '/DCTDecode' ? 'DCT' : filterName === '/FlateDecode' ? 'Flate' : null;
    if (!filter) { skip('filter'); continue; }
    const width = num(dict.get(N('Width')));
    const height = num(dict.get(N('Height')));
    if (!width || !height) { skip('error'); continue; }
    const bpc = num(dict.get(N('BitsPerComponent'))) ?? 8;
    if (bpc !== 8) { skip('bit-depth'); continue; }
    const model = resolveColour(dict.get(N('ColorSpace')));
    if (model === 'other') { skip('colour-space'); continue; }
    if (model === 'grey' && dict.has(N('Decode'))) { skip('decode-array'); continue; }
    if (stream.contents.length < minBytes) { skip('small'); continue; }
    let flate: Plan['flate'];
    if (filter === 'DCT') {
      if (parms) { skip('filter'); continue; } // ColorTransform overrides: browser decoding may differ
      const info = readJpegInfo(stream.contents);
      const expected = model === 'rgb' ? 3 : 1;
      if (!info || info.components !== expected) { skip(info && info.components === 4 ? 'colour-space' : 'error'); continue; }
    } else {
      const p = parms instanceof PDFRef ? ctx.lookup(parms) : parms;
      const pd = p instanceof PDFDict ? p : null;
      flate = {
        predictor: (pd && num(pd.get(N('Predictor')))) || 1,
        colors: (pd && num(pd.get(N('Colors')))) || (model === 'rgb' ? 3 : 1),
        bpc: (pd && num(pd.get(N('BitsPerComponent')))) || 8,
        columns: (pd && num(pd.get(N('Columns')))) || width,
      };
    }
    plans.push({ ref, dict, stream, filter, model, width, height, flate });
  }

  // 3. Re-encode and replace in place (same object number, so nothing is duplicated).
  for (let i = 0; i < plans.length; i++) {
    if (opts.isCancelled?.()) throw new CompressCancelled();
    opts.onProgress?.(i, plans.length);
    const plan = plans[i];
    const original = plan.stream.contents;
    let source: ImageSource;
    try {
      if (plan.filter === 'DCT') {
        // Drop Exif so the decoder cannot apply an Orientation tag the PDF ignores.
        source = { kind: 'jpeg', bytes: stripJpegApp1(original) };
      } else {
        const f = plan.flate!;
        const samples = decodeFlateImage(original, { predictor: f.predictor, colors: f.colors, bitsPerComponent: f.bpc, columns: f.columns });
        source = { kind: 'rgba', rgba: samplesToRgba(samples, plan.width, plan.height, plan.model === 'rgb' ? 3 : 1), width: plan.width, height: plan.height };
      }
    } catch {
      skip('error');
      continue;
    }
    let encoded: { bytes: Uint8Array; width: number; height: number };
    try {
      encoded = await encoder(source, { quality: opts.quality, maxDimension: opts.maxDimension });
    } catch {
      skip('error');
      continue;
    }
    if (encoded.bytes.length >= original.length * 0.95) { skip('no-gain'); continue; }

    const newDict = PDFDict.withContext(ctx);
    for (const [key, value] of plan.dict.entries()) {
      const k = key.toString();
      if (['/Filter', '/DecodeParms', '/Length', '/Width', '/Height', '/BitsPerComponent'].includes(k)) continue;
      if (k === '/ColorSpace' && plan.model === 'grey') continue; // the browser writes 3-component JPEGs
      newDict.set(key, value);
    }
    newDict.set(N('Type'), N('XObject'));
    newDict.set(N('Subtype'), N('Image'));
    newDict.set(N('Width'), PDFNumber.of(encoded.width));
    newDict.set(N('Height'), PDFNumber.of(encoded.height));
    newDict.set(N('BitsPerComponent'), PDFNumber.of(8));
    if (plan.model === 'grey') newDict.set(N('ColorSpace'), N('DeviceRGB'));
    newDict.set(N('Filter'), N('DCTDecode'));
    newDict.set(N('Length'), PDFNumber.of(encoded.bytes.length));
    ctx.assign(plan.ref, PDFRawStream.of(newDict, encoded.bytes));
    report.imagesReplaced += 1;
  }
  opts.onProgress?.(plans.length, plans.length);
  return report;
}

/** One-line summary of skipped images, e.g. "2 left unchanged: 1 CMYK..., 1 too small". */
export function describeSkipped(report: CompressReport): string | null {
  const parts = (Object.keys(report.skipped) as SkipReason[])
    .filter((k) => (report.skipped[k] ?? 0) > 0)
    .map((k) => `${report.skipped[k]} ${SKIP_LABELS[k]}`);
  const total = Object.values(report.skipped).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) return null;
  return `${total} image${total === 1 ? '' : 's'} left unchanged: ${parts.join('; ')}.`;
}

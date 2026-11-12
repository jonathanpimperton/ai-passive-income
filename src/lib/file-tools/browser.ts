/**
 * Browser-only helpers shared by the file converter tools: decoding images,
 * encoding canvases (with honest format detection), downloads and small UX
 * utilities. Every function either resolves or rejects with an Error whose
 * message can be shown to the user (CLAUDE.md QA section 7: no silent
 * failures, onerror handlers everywhere, object URLs always revoked).
 */
import { canvasSizeProblem, isIosLike } from './canvas-limits';

export interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Release decoder memory (ImageBitmap.close / object URL revoke). Safe to call twice. */
  release: () => void;
}

/** Decode an image Blob/File, applying its Exif orientation (as every browser now does by default). */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  const isSvg = blob.type === 'image/svg+xml';
  if (!isSvg && typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob);
      let released = false;
      return {
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        release: () => { if (!released) { released = true; bmp.close(); } },
      };
    } catch {
      // Some formats (and some older engines) only decode through <img>; fall through.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This file could not be decoded as an image. It may be damaged or in an unsupported format.'));
      el.src = url;
    });
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) throw new Error('This image has no size information and could not be read.');
    let released = false;
    return {
      source: img,
      width,
      height,
      release: () => { if (!released) { released = true; URL.revokeObjectURL(url); } },
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Create a 2D canvas of the given size, or throw a user-facing size error. */
export function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const problem = canvasSizeProblem(width, height, isIosLike());
  if (problem) throw new Error(problem);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Your browser could not create a drawing surface of this size. Try a smaller size.');
  return { canvas, ctx };
}

/** Free a canvas's backing store immediately (helps Safari/iOS memory limits). */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export interface EncodedImage {
  blob: Blob;
  /** The MIME type the browser actually produced (Safari returns PNG when asked for WebP). */
  type: string;
  /** True when the browser could not produce the requested type. */
  fellBack: boolean;
}

/** canvas.toBlob as a promise that rejects (never hangs) when the browser returns null. */
export function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<EncodedImage> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            reject(new Error('Your browser could not encode this image (it may be too large for this device).'));
            return;
          }
          const actual = blob.type || type;
          resolve({ blob, type: actual, fellBack: actual !== type });
        },
        type,
        quality,
      );
    } catch (e) {
      reject(new Error(e instanceof Error && e.message ? `Your browser could not encode this image: ${e.message}` : 'Your browser could not encode this image.'));
    }
  });
}

/** File extension (with dot) for an image MIME type. */
export function extensionForType(type: string): string {
  if (type === 'image/jpeg') return '.jpg';
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'application/pdf') return '.pdf';
  if (type === 'application/zip') return '.zip';
  return '';
}

/** Short label for an image MIME type. */
export function labelForType(type: string): string {
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPG';
  if (type.includes('png')) return 'PNG';
  if (type.includes('webp')) return 'WebP';
  if (type.includes('gif')) return 'GIF';
  if (type.includes('svg')) return 'SVG';
  if (type.includes('heic') || type.includes('heif')) return 'HEIC';
  if (type.includes('avif')) return 'AVIF';
  return type.split('/')[1]?.toUpperCase() || 'Unknown';
}

/** Start a download of `blob` named `name`. The object URL is revoked after the browser has picked it up. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in Firefox; give it time.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Read a Blob/File's bytes. */
export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Yield to the event loop so the UI can repaint between heavy steps. */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

/**
 * On narrow screens results render below the settings and the drop zone, out
 * of view (FILES-16). Bring them into view once, respecting reduced motion.
 */
export function revealOnSmallScreens(el: HTMLElement | null): void {
  if (!el || typeof window === 'undefined') return;
  if (window.matchMedia('(min-width: 1024px)').matches) return;
  const rect = el.getBoundingClientRect();
  if (rect.top >= 0 && rect.top < window.innerHeight * 0.6) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** Error message from an unknown thrown value. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e) return e;
  return fallback;
}

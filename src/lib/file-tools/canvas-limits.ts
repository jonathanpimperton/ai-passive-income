/**
 * Canvas size limits (review FILES-12).
 *
 * Browsers silently fail (blank output, null blob) or throw when a canvas is
 * too big: Chrome/Firefox allow 32,767 px per side and about 268 MP in total,
 * Safari about 16.7 MP on iOS. The tools used to hang on "Converting..." or
 * mislabel a failed 32000x24000 resize. They now check up front with these
 * conservative limits and explain the problem instead.
 */

/** Largest side we will attempt (Chrome, Firefox and Safari all allow at least this). */
export const MAX_CANVAS_SIDE = 16384;
/** Largest area we will attempt on desktop browsers (pixels). */
export const MAX_CANVAS_AREA = 100_000_000;
/** Largest area on iOS/iPadOS, whose canvas limit is about 16.7 MP. */
export const MAX_CANVAS_AREA_IOS = 16_777_216;

/** Returns null when a canvas of this size is safe, or a user-facing reason when it is not. */
export function canvasSizeProblem(width: number, height: number, isIos = false): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return 'The output size must be at least 1 x 1 pixel.';
  }
  const w = Math.round(width);
  const h = Math.round(height);
  if (w > MAX_CANVAS_SIDE || h > MAX_CANVAS_SIDE) {
    return `The output would be ${w.toLocaleString('en-US')} x ${h.toLocaleString('en-US')} px; browsers cannot draw images wider or taller than ${MAX_CANVAS_SIDE.toLocaleString('en-US')} px. Choose a smaller size.`;
  }
  const limit = isIos ? MAX_CANVAS_AREA_IOS : MAX_CANVAS_AREA;
  if (w * h > limit) {
    const mp = (w * h / 1e6).toFixed(1);
    return `The output would be ${mp} megapixels, more than this browser can draw (${Math.floor(limit / 1e6)} MP). Choose a smaller size.`;
  }
  return null;
}

/** Best-effort iOS/iPadOS detection (iPadOS reports itself as a Mac with touch). */
export function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
}

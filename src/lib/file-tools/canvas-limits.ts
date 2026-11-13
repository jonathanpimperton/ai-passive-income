/**
 * Canvas size limits (review FILES-12).
 *
 * Browsers silently fail (blank output, null blob) or throw when a canvas is
 * too big: Chrome and desktop Safari allow about 268 MP in total (Chrome
 * 32,767 px per side), iOS/iPadOS Safari about 16.7 MP. The tools used to hang on "Converting..." or
 * mislabel a failed 32000x24000 resize. They now check up front with these
 * conservative limits and explain the problem instead.
 */

/**
 * Largest side we will attempt (Chrome, Firefox and Safari all allow at least this).
 * On desktop this is the only limit that can bite: 16,384 x 16,384 is 268,435,456 pixels, which
 * is exactly Chrome's and desktop Safari's total-area limit, so a separate desktop area check
 * could never fire once the side check has passed.
 */
export const MAX_CANVAS_SIDE = 16384;
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
    return `The output would be ${w.toLocaleString('en-US')} x ${h.toLocaleString('en-US')} px; this tool can only draw images up to ${MAX_CANVAS_SIDE.toLocaleString('en-US')} px wide or tall. Choose a smaller size, scale or maximum width.`;
  }
  if (isIos && w * h > MAX_CANVAS_AREA_IOS) {
    const mp = (w * h / 1e6).toFixed(1);
    return `The output would be ${mp} megapixels, more than iPhone and iPad browsers can draw (about 16.7 MP). Choose a smaller size, scale or maximum width.`;
  }
  return null;
}

/** Best-effort iOS/iPadOS detection (iPadOS reports itself as a Mac with touch). */
export function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
}

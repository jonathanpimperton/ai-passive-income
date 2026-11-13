/**
 * SVG helpers for the SVG to PNG tool (review FILES-07).
 *
 * The SVG is rendered through an <img> element. Browsers run no script and
 * fetch no external resources for SVG-as-image, so the sanitiser only has to
 * keep the markup tidy and defence-in-depth safe. The old sanitiser deleted
 * every <style> element, which turned CSS-styled SVGs (Illustrator's default
 * "Internal CSS" export) solid black. <style> is now kept; only @import and
 * external url() references are removed from it.
 *
 * The size helpers convert width/height in any CSS unit (px, pt, pc, mm,
 * cm, in, em, ex) to pixels and fall back to the viewBox for percentages or
 * missing values, instead of treating "10cm" as 10 px and "100%" as 100.
 */

const UNIT_PX: Record<string, number> = {
  '': 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  q: 96 / 25.4 / 4,
  em: 16,
  rem: 16,
  ex: 8,
};

/**
 * Parse an SVG length attribute. Returns pixels, 'percent' for percentage
 * values (which need the viewBox) or null when absent or unparseable.
 */
export function parseSvgLength(value: string | null | undefined): number | 'percent' | null {
  if (value == null) return null;
  const m = /^\s*([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(%|[a-z]*)\s*$/i.exec(value);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  if (unit === '%') return 'percent';
  const factor = UNIT_PX[unit];
  return factor === undefined ? null : n * factor;
}

export interface SvgSizeInput {
  width: string | null;
  height: string | null;
  viewBox: string | null;
}

export interface SvgSize {
  width: number;
  height: number;
  /** True when no usable size information existed and the browser default 300x150 was used. */
  defaulted: boolean;
  /** viewBox to write back so the image scales instead of cropping; null to leave as is. */
  viewBox: string | null;
}

/** Parse "minX minY width height" (commas or spaces). */
export function parseViewBox(value: string | null): [number, number, number, number] | null {
  if (!value) return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) || parts[2] <= 0 || parts[3] <= 0) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

/**
 * Work out the intrinsic pixel size of an SVG from its root attributes.
 * - Both lengths absolute: use them.
 * - One absolute, other missing/percent, viewBox present: keep the aspect ratio.
 * - Percent/missing: use the viewBox size.
 * - Nothing usable: 300x150 (the browser default), flagged as defaulted.
 */
export function resolveSvgSize({ width, height, viewBox }: SvgSizeInput): SvgSize {
  const w = parseSvgLength(width);
  const h = parseSvgLength(height);
  const vb = parseViewBox(viewBox);
  const wAbs = typeof w === 'number' ? w : null;
  const hAbs = typeof h === 'number' ? h : null;
  if (wAbs && hAbs) {
    return { width: wAbs, height: hAbs, defaulted: false, viewBox: vb ? null : `0 0 ${trim(wAbs)} ${trim(hAbs)}` };
  }
  if (vb) {
    const ratio = vb[2] / vb[3];
    if (wAbs) return { width: wAbs, height: wAbs / ratio, defaulted: false, viewBox: null };
    if (hAbs) return { width: hAbs * ratio, height: hAbs, defaulted: false, viewBox: null };
    return { width: vb[2], height: vb[3], defaulted: false, viewBox: null };
  }
  if (wAbs) return { width: wAbs, height: 150, defaulted: true, viewBox: null };
  if (hAbs) return { width: 300, height: hAbs, defaulted: true, viewBox: null };
  return { width: 300, height: 150, defaulted: true, viewBox: null };
}

function trim(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/** Remove @import rules and url() references to anything other than in-document fragments. */
export function sanitizeSvgCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, '')
    .replace(/url\(([^)]*)\)/gi, (whole, inner: string) => {
      const target = inner.trim().replace(/^['"]|['"]$/g, '').trim();
      return target.startsWith('#') || /^data:image\//i.test(target) ? whole : 'none';
    })
    .replace(/expression\s*\(/gi, '(');
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Removed by local name in ANY namespace, so prefixed forms such as <s:script> cannot slip through. */
const REMOVE_LOCAL_NAMES = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'canvas', 'handler', 'listener']);

/**
 * Sanitise a parsed SVG document in place (browser DOM). Keeps <style> and
 * presentation attributes; removes scripting elements, event handlers,
 * javascript: links and external references. Returns false when the
 * document is not an SVG (for example an XML parse error).
 */
export function sanitizeSvgDocument(doc: Document): boolean {
  const root = doc.documentElement;
  // Accept <svg> with any prefix (<svg:svg>), but only in the SVG namespace.
  if (!root || root.localName !== 'svg' || root.namespaceURI !== SVG_NS) return false;
  if (doc.getElementsByTagNameNS('*', 'parsererror').length > 0) return false;
  for (const el of Array.from(doc.getElementsByTagNameNS('*', '*'))) {
    if (el !== root && REMOVE_LOCAL_NAMES.has(el.localName.toLowerCase())) el.parentNode?.removeChild(el);
  }
  Array.from(doc.getElementsByTagNameNS('*', 'style')).forEach((el) => {
    el.textContent = sanitizeSvgCss(el.textContent ?? '');
  });
  const all = [root, ...Array.from(root.getElementsByTagNameNS('*', '*'))];
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      const local = (attr.localName || attr.name).toLowerCase();
      const value = attr.value.trim().toLowerCase().replace(/[\s\u0000-\u001f]+/g, '');
      if (local.startsWith('on')) { el.removeAttributeNode(attr); continue; }
      if (value.includes('javascript:') || value.includes('vbscript:')) { el.removeAttributeNode(attr); continue; }
      if (local === 'href' && !value.startsWith('#') && !value.startsWith('data:image/')) {
        el.removeAttributeNode(attr);
        continue;
      }
      if (local === 'style') attr.value = sanitizeSvgCss(attr.value);
    }
  }
  return true;
}

/**
 * Minimal TrueType cmap reader: which Unicode code points a font can draw.
 *
 * The Excel to PDF tool embeds a Unicode TTF in jsPDF (review FILES-06).
 * Characters the font lacks (for example CJK) would print as blanks, so the
 * tool checks coverage with this reader and renders such cells as images
 * instead. Supports cmap subtable formats 4 (BMP) and 12 (full Unicode).
 *
 * Pure function (no DOM), unit-tested in ttf-cmap.test.ts.
 */

export interface GlyphCoverage {
  has(codePoint: number): boolean;
}

export function readCmapCoverage(font: Uint8Array): GlyphCoverage {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const numTables = view.getUint16(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(font[rec], font[rec + 1], font[rec + 2], font[rec + 3]);
    if (tag === 'cmap') { cmapOffset = view.getUint32(rec + 8); break; }
  }
  if (cmapOffset < 0) throw new Error('font has no cmap table');

  const numSub = view.getUint16(cmapOffset + 2);
  let fmt4 = -1;
  let fmt12 = -1;
  for (let i = 0; i < numSub; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const platform = view.getUint16(rec);
    const encoding = view.getUint16(rec + 2);
    const offset = cmapOffset + view.getUint32(rec + 4);
    const format = view.getUint16(offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    if (format === 12) fmt12 = offset;
    else if (format === 4 && fmt4 < 0) fmt4 = offset;
  }

  const ranges: Array<[number, number]> = [];
  if (fmt12 >= 0) {
    const nGroups = view.getUint32(fmt12 + 12);
    for (let g = 0; g < nGroups; g++) {
      const p = fmt12 + 16 + g * 12;
      ranges.push([view.getUint32(p), view.getUint32(p + 4)]);
    }
  } else if (fmt4 >= 0) {
    const segX2 = view.getUint16(fmt4 + 6);
    const endBase = fmt4 + 14;
    const startBase = endBase + segX2 + 2;
    const deltaBase = startBase + segX2;
    const rangeBase = deltaBase + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = view.getUint16(endBase + s * 2);
      const start = view.getUint16(startBase + s * 2);
      const delta = view.getUint16(deltaBase + s * 2);
      const rangeOffset = view.getUint16(rangeBase + s * 2);
      if (start === 0xffff) continue;
      if (rangeOffset === 0) {
        // Every code point in the segment maps to (cp + delta) mod 65536; glyph 0 means missing.
        let runStart = -1;
        for (let cp = start; cp <= end; cp++) {
          const glyph = (cp + delta) & 0xffff;
          if (glyph !== 0 && runStart < 0) runStart = cp;
          if ((glyph === 0 || cp === end) && runStart >= 0) {
            ranges.push([runStart, glyph === 0 ? cp - 1 : cp]);
            runStart = -1;
          }
        }
      } else {
        for (let cp = start; cp <= end; cp++) {
          const addr = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
          if (addr + 2 > font.length) break;
          const glyph = view.getUint16(addr);
          if (glyph !== 0) ranges.push([cp, cp]);
        }
      }
    }
  } else {
    throw new Error('font has no Unicode cmap subtable');
  }
  ranges.sort((a, b) => a[0] - b[0]);

  return {
    has(cp: number): boolean {
      let lo = 0, hi = ranges.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const [s, e] = ranges[mid];
        if (cp < s) hi = mid - 1;
        else if (cp > e) lo = mid + 1;
        else return true;
      }
      return false;
    },
  };
}

/** True when every non-control character in `text` is covered. */
export function coversText(coverage: GlyphCoverage, text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x20 || cp === 0x7f) continue;
    if (!coverage.has(cp)) return false;
  }
  return true;
}

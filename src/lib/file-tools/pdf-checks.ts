/**
 * PDF input checks shared by the PDF tools (compress, merge, split, to-image).
 * Pure functions (no DOM), unit-tested in pdf-checks.test.ts.
 *
 * Why: pdf-lib cannot decrypt. Loading an encrypted PDF with
 * `ignoreEncryption: true` and saving it produced unopenable or blank output
 * while the UI reported success (review FILES-02, S1-13). Every PDF tool that
 * rewrites a file must refuse encrypted input before doing any work.
 */

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** True when "%PDF-" appears in the first 1024 bytes (the spec allows leading junk). */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length - PDF_MAGIC.length, 1024);
  for (let i = 0; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < PDF_MAGIC.length; j++) {
      if (bytes[i + j] !== PDF_MAGIC[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

/**
 * Byte-level check for a trailer /Encrypt entry ("/Encrypt 12 0 R" or an
 * inline "/Encrypt <<"). Used alongside pdf-lib's `isEncrypted` as a second
 * line of defence (for example a damaged xref that pdf-lib recovers from
 * without seeing the trailer). Scans as latin1 so binary streams cannot
 * throw. A false positive only causes a clear refusal, never bad output.
 */
export function hasEncryptDictionary(bytes: Uint8Array): boolean {
  // Decode in chunks: String.fromCharCode on a huge array overflows the stack.
  const CHUNK = 1 << 16;
  const OVERLAP = 32;
  const re = /\/Encrypt\s*(?:\d+\s+\d+\s+R|<<)/;
  for (let start = 0; start < bytes.length; start += CHUNK) {
    const end = Math.min(bytes.length, start + CHUNK + OVERLAP);
    let s = '';
    for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
    if (re.test(s)) return true;
  }
  return false;
}

/** The single user-facing refusal message for encrypted PDFs. */
export function encryptedPdfMessage(fileName: string): string {
  return (
    `"${fileName}" is encrypted (password-protected or restricted), so it was not processed. ` +
    'Browser tools cannot safely rewrite encrypted PDFs, and doing so would produce a broken file. ' +
    'Workaround: open it in your PDF viewer, choose Print, pick "Save as PDF" (or "Microsoft Print to PDF"), then upload the new copy.'
  );
}

/** User-facing message for files that are not PDFs or are damaged beyond reading. */
export function unreadablePdfMessage(fileName: string): string {
  return `Could not read "${fileName}". It may be damaged or not a PDF file.`;
}

export interface PageRangeResult {
  /** Sorted, de-duplicated 0-based page indices. */
  pages: number[];
  /** Tokens that could not be understood or fall entirely outside 1..maxPage. */
  invalid: string[];
}

/**
 * Parse a page-range string such as "1-3, 5, 8-10" into 0-based indices.
 * Accepts en/em dashes and the minus sign as range separators ("1–3"),
 * open-ended ranges ("3-" = page 3 to the end, "-3" = pages 1 to 3), spaces
 * or semicolons between parts, and reversed ranges ("5-3"). Anything else is
 * reported in `invalid` so the UI can say what was ignored (FILES-23).
 */
export function parsePageRanges(input: string, maxPage: number): PageRangeResult {
  const pages = new Set<number>();
  const invalid: string[] = [];
  const normalised = input.replace(/[‒–—―−]/g, '-');
  const parts = normalised
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    const compact = part.replace(/\s+/g, '');
    const single = /^(\d+)$/.exec(compact);
    const range = /^(\d*)-(\d*)$/.exec(compact);
    if (single) {
      const p = parseInt(single[1], 10);
      if (p >= 1 && p <= maxPage) pages.add(p - 1);
      else invalid.push(part);
    } else if (range && (range[1] !== '' || range[2] !== '')) {
      let start = range[1] === '' ? 1 : parseInt(range[1], 10);
      let end = range[2] === '' ? maxPage : parseInt(range[2], 10);
      if (start > end) [start, end] = [end, start];
      const lo = Math.max(1, start);
      const hi = Math.min(maxPage, end);
      if (lo > hi) {
        invalid.push(part);
        continue;
      }
      for (let i = lo; i <= hi; i++) pages.add(i - 1);
    } else {
      invalid.push(part);
    }
  }
  return { pages: Array.from(pages).sort((a, b) => a - b), invalid };
}

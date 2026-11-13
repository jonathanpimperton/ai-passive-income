/**
 * Binary-safe Base64 for the Base64 tool (DEVTOOLS-09).
 *
 * Decoding produces bytes, not text: a PNG pasted as Base64 used to be pushed
 * through a UTF-8 text decoder and downloaded as decoded.txt full of U+FFFD.
 * Now the bytes are kept, binary data is detected (and its file type sniffed
 * where possible) so it can be downloaded intact, and text is shown only
 * when the bytes really are valid UTF-8.
 *
 * Accepted input: standard and URL-safe alphabets, missing padding, line
 * breaks and spaces, and a data: URL prefix. Errors explain what is wrong and
 * where, instead of the browser's raw atob() message.
 */

const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < STD.length; i++) table[STD.charCodeAt(i)] = i;
  // URL-safe alphabet (RFC 4648 section 5).
  table['-'.charCodeAt(0)] = 62;
  table['_'.charCodeAt(0)] = 63;
  return table;
})();

export type DecodeResult =
  | { ok: true; bytes: Uint8Array; mime: string | null; urlSafe: boolean }
  | { ok: false; error: string };

/** Decode Base64 (standard or URL-safe, with or without padding or a data: prefix) to bytes. */
export function decodeBase64(input: string): DecodeResult {
  let text = input.trim();
  let mime: string | null = null;
  const dataUrl = /^data:([^,]*?),/i.exec(text);
  if (dataUrl) {
    const meta = dataUrl[1];
    if (!/;base64$/i.test(meta)) {
      return { ok: false, error: 'This data: URL is not Base64-encoded (it has no ";base64" marker), so there is nothing to decode.' };
    }
    mime = meta.replace(/;base64$/i, '').split(';')[0] || null;
    text = text.slice(dataUrl[0].length);
  }

  // Remove whitespace; positions in messages refer to the original input.
  const chars: number[] = [];
  const offset = input.length - input.trimStart().length + (dataUrl ? dataUrl[0].length : 0);
  let urlSafe = false;
  let padding = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) continue;
    if (c === 61) {
      padding++;
      continue;
    }
    if (padding > 0) {
      return { ok: false, error: `Unexpected '${text[i]}' after the '=' padding at position ${offset + i + 1}. Padding can only appear at the end.` };
    }
    if (c >= 128 || LOOKUP[c] === -1) {
      return {
        ok: false,
        error: `'${text[i]}' at position ${offset + i + 1} is not a Base64 character. Base64 uses A-Z, a-z, 0-9, + and / (or - and _ in URL-safe Base64).`,
      };
    }
    if (c === 45 || c === 95) urlSafe = true;
    chars.push(c);
  }
  if (padding > 2) return { ok: false, error: 'Too much "=" padding: Base64 ends with at most two "=" characters.' };
  if (chars.length % 4 === 1) {
    return { ok: false, error: `The Base64 text has an invalid length (${chars.length} characters). It is probably truncated or has a character missing.` };
  }
  if (padding && (chars.length + padding) % 4 !== 0) {
    return { ok: false, error: 'The "=" padding does not match the length of the Base64 text. It is probably truncated.' };
  }

  const outLen = Math.floor((chars.length * 3) / 4);
  const bytes = new Uint8Array(outLen);
  let o = 0;
  for (let i = 0; i < chars.length; i += 4) {
    const a = LOOKUP[chars[i]];
    const b = LOOKUP[chars[i + 1]];
    const c = i + 2 < chars.length ? LOOKUP[chars[i + 2]] : 0;
    const d = i + 3 < chars.length ? LOOKUP[chars[i + 3]] : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < outLen) bytes[o++] = (n >> 16) & 0xff;
    if (o < outLen) bytes[o++] = (n >> 8) & 0xff;
    if (o < outLen) bytes[o++] = n & 0xff;
  }
  return { ok: true, bytes, mime, urlSafe };
}

/** Encode bytes as Base64; optionally URL-safe (no padding) and wrapped. */
export function encodeBase64(bytes: Uint8Array, opts: { urlSafe?: boolean; wrapAt?: number } = {}): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += STD[(n >> 18) & 63] + STD[(n >> 12) & 63];
    out += i + 1 < bytes.length ? STD[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? STD[n & 63] : '=';
  }
  if (opts.urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (opts.wrapAt && opts.wrapAt > 0) {
    const lines: string[] = [];
    for (let i = 0; i < out.length; i += opts.wrapAt) lines.push(out.slice(i, i + opts.wrapAt));
    out = lines.join('\n');
  }
  return out;
}

export function encodeText(text: string, opts: { urlSafe?: boolean; wrapAt?: number } = {}): string {
  return encodeBase64(new TextEncoder().encode(text), opts);
}

export interface FileType {
  mime: string;
  ext: string;
  label: string;
}

const SIGNATURES: Array<{ bytes: number[]; at?: number; type: FileType }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], type: { mime: 'image/png', ext: 'png', label: 'PNG image' } },
  { bytes: [0xff, 0xd8, 0xff], type: { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG image' } },
  { bytes: [0x47, 0x49, 0x46, 0x38], type: { mime: 'image/gif', ext: 'gif', label: 'GIF image' } },
  { bytes: [0x25, 0x50, 0x44, 0x46], type: { mime: 'application/pdf', ext: 'pdf', label: 'PDF document' } },
  { bytes: [0x50, 0x4b, 0x03, 0x04], type: { mime: 'application/zip', ext: 'zip', label: 'ZIP archive (or DOCX/XLSX)' } },
  { bytes: [0x1f, 0x8b], type: { mime: 'application/gzip', ext: 'gz', label: 'gzip archive' } },
  { bytes: [0x42, 0x4d], type: { mime: 'image/bmp', ext: 'bmp', label: 'BMP image' } },
  { bytes: [0x00, 0x00, 0x01, 0x00], type: { mime: 'image/x-icon', ext: 'ico', label: 'ICO icon' } },
  { bytes: [0x49, 0x44, 0x33], type: { mime: 'audio/mpeg', ext: 'mp3', label: 'MP3 audio' } },
  { bytes: [0x4f, 0x67, 0x67, 0x53], type: { mime: 'audio/ogg', ext: 'ogg', label: 'Ogg media' } },
  { bytes: [0x77, 0x4f, 0x46, 0x32], type: { mime: 'font/woff2', ext: 'woff2', label: 'WOFF2 font' } },
  { bytes: [0x66, 0x74, 0x79, 0x70], at: 4, type: { mime: 'video/mp4', ext: 'mp4', label: 'MP4/MOV video' } },
];

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  'application/pdf': 'pdf', 'application/json': 'json', 'text/plain': 'txt', 'text/html': 'html', 'text/csv': 'csv',
};

/** Identify common file types from their first bytes. */
export function sniffFileType(bytes: Uint8Array): FileType | null {
  // RIFF....WEBP
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: 'image/webp', ext: 'webp', label: 'WebP image' };
  }
  for (const sig of SIGNATURES) {
    const at = sig.at ?? 0;
    if (bytes.length < at + sig.bytes.length) continue;
    if (sig.bytes.every((b, k) => bytes[at + k] === b)) return sig.type;
  }
  return null;
}

export type Classified =
  | { kind: 'text'; text: string }
  | { kind: 'binary'; type: FileType | null; reason: 'invalid-utf8' | 'control-chars' | 'known-type' };

/** Decide whether decoded bytes are readable UTF-8 text or binary data. */
export function classifyBytes(bytes: Uint8Array): Classified {
  const type = sniffFileType(bytes);
  if (type) return { kind: 'binary', type, reason: 'known-type' };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Not valid UTF-8: treat as binary rather than show replacement characters.
    return { kind: 'binary', type: null, reason: 'invalid-utf8' };
  }
  // NUL and most C0 controls never appear in real text.
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if ((c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12) || c === 127) {
      return { kind: 'binary', type: null, reason: 'control-chars' };
    }
  }
  // Strip a UTF-8 byte-order mark from the displayed text.
  return { kind: 'text', text: text.charCodeAt(0) === 0xfeff ? text.slice(1) : text };
}

/** File extension for a download: sniffed type, then the data: URL type, then "bin". */
export function extensionFor(type: FileType | null, mime: string | null): string {
  if (type) return type.ext;
  if (mime && EXT_BY_MIME[mime.toLowerCase()]) return EXT_BY_MIME[mime.toLowerCase()];
  return 'bin';
}

/** First bytes as a hex dump line, e.g. "89 50 4E 47 0D 0A 1A 0A". */
export function hexPreview(bytes: Uint8Array, max = 32): string {
  const parts: string[] = [];
  for (let i = 0; i < Math.min(bytes.length, max); i++) parts.push(bytes[i].toString(16).toUpperCase().padStart(2, '0'));
  return parts.join(' ') + (bytes.length > max ? ' ...' : '');
}

/**
 * Pure conversion utility functions for developer tools.
 * Extracted from React components for unit testing.
 * All functions are deterministic — same input always produces same output.
 */

// ─── Base64 ──────────────────────────────────────────────────────────────────

/** Encode a Unicode string to Base64 (RFC 4648) */
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode Base64 to a Unicode string */
export function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** Add line wrapping at specified width */
export function wrapLines(str: string, width: number): string {
  if (width <= 0) return str;
  const lines: string[] = [];
  for (let i = 0; i < str.length; i += width) {
    lines.push(str.slice(i, i + width));
  }
  return lines.join('\n');
}

/** Strip whitespace/newlines from Base64 input */
export function cleanBase64(str: string): string {
  return str.replace(/\s/g, '');
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  error: string | null;
}

/** Decode a Base64URL string to a UTF-8 string */
export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** Decode a JWT token into header, payload, and signature */
export function decodeJwt(token: string): DecodedJwt {
  const empty: DecodedJwt = { header: {}, payload: {}, signature: '', error: null };

  if (!token.trim()) return { ...empty, error: 'Enter a JWT token above' };

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { ...empty, error: `Invalid JWT: expected 3 parts separated by dots, got ${parts.length}` };
  }

  try {
    const headerJson = base64UrlDecode(parts[0]);
    const header = JSON.parse(headerJson);

    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);

    return { header, payload, signature: parts[2], error: null };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : 'Failed to decode JWT' };
  }
}

// ─── ICO Assembly ────────────────────────────────────────────────────────────

/**
 * Assemble PNG buffers into an ICO file.
 * ICO format: 6-byte header + 16-byte directory entries + PNG data blocks.
 */
export function assembleIco(pngBuffers: { size: number; data: ArrayBuffer }[]): ArrayBuffer {
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * pngBuffers.length;
  let dataOffset = headerSize + dirSize;

  const totalSize = dataOffset + pngBuffers.reduce((sum, b) => sum + b.data.byteLength, 0);
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // ICO header
  view.setUint16(0, 0, true);                    // Reserved (must be 0)
  view.setUint16(2, 1, true);                    // Type: 1 = ICO
  view.setUint16(4, pngBuffers.length, true);    // Number of images

  // Directory entries
  for (let i = 0; i < pngBuffers.length; i++) {
    const entry = pngBuffers[i];
    const offset = headerSize + i * dirEntrySize;
    view.setUint8(offset, entry.size >= 256 ? 0 : entry.size);
    view.setUint8(offset + 1, entry.size >= 256 ? 0 : entry.size);
    view.setUint8(offset + 2, 0);
    view.setUint8(offset + 3, 0);
    view.setUint16(offset + 4, 1, true);
    view.setUint16(offset + 6, 32, true);
    view.setUint32(offset + 8, entry.data.byteLength, true);
    view.setUint32(offset + 12, dataOffset, true);
    dataOffset += entry.data.byteLength;
  }

  // Copy PNG data
  let currentOffset = headerSize + dirSize;
  const uint8View = new Uint8Array(buffer);
  for (const entry of pngBuffers) {
    uint8View.set(new Uint8Array(entry.data), currentOffset);
    currentOffset += entry.data.byteLength;
  }

  return buffer;
}

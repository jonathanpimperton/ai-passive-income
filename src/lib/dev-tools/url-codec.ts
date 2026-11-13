/**
 * URL encoding and decoding for the URL tool (DEVTOOLS-28).
 *
 * Adds the "+ means space" convention used by HTML forms and query strings,
 * and replaces the browser's bare "URI malformed" error with the position and
 * the exact sequence that is wrong.
 */

export type EncodeMode = 'component' | 'full';

export type CodecResult = { ok: true; value: string } | { ok: false; error: string };

function surrogateError(text: string): string {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        i++;
        continue;
      }
      return `Position ${i + 1} holds half of a character (an unpaired surrogate, often a broken emoji), which cannot be URL-encoded.`;
    }
    if (c >= 0xdc00 && c <= 0xdfff) {
      return `Position ${i + 1} holds half of a character (an unpaired surrogate, often a broken emoji), which cannot be URL-encoded.`;
    }
  }
  return 'The text contains a character that cannot be URL-encoded.';
}

export function encodeUrl(text: string, mode: EncodeMode, spaceAsPlus = false): CodecResult {
  try {
    let value = mode === 'component' ? encodeURIComponent(text) : encodeURI(text);
    if (spaceAsPlus && mode === 'component') value = value.replace(/%20/g, '+');
    return { ok: true, value };
  } catch {
    // encodeURI* throws URIError only for unpaired surrogates; explain where.
    return { ok: false, error: surrogateError(text) };
  }
}

/** Find the first malformed percent-escape and describe it. */
export function describeDecodeError(text: string): string {
  const bad = /%(?![0-9A-Fa-f]{2})/.exec(text);
  if (bad) {
    const snippet = text.slice(bad.index, bad.index + 3);
    return `Position ${bad.index + 1}: "${snippet}" is not a valid escape. A % must be followed by two hex digits; write a literal % as %25.`;
  }
  // Every % has two hex digits, so some run of escapes is not valid UTF-8.
  const runs = /(?:%[0-9A-Fa-f]{2})+/g;
  let m: RegExpExecArray | null;
  while ((m = runs.exec(text))) {
    try {
      decodeURIComponent(m[0]);
    } catch {
      // This run is the culprit; report it.
      const shown = m[0].length > 36 ? `${m[0].slice(0, 36)}...` : m[0];
      return `Position ${m.index + 1}: "${shown}" is not valid UTF-8 (a multi-byte character is incomplete or corrupted).`;
    }
  }
  return 'The text contains malformed percent-encoding.';
}

export function decodeUrl(text: string, mode: EncodeMode, plusAsSpace = false): CodecResult {
  const source = plusAsSpace ? text.replace(/\+/g, ' ') : text;
  try {
    return { ok: true, value: mode === 'component' ? decodeURIComponent(source) : decodeURI(source) };
  } catch {
    // URIError: locate the bad sequence for the user.
    return { ok: false, error: describeDecodeError(source) };
  }
}

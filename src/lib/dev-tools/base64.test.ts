import { describe, it, expect } from 'vitest';
import { decodeBase64, encodeBase64, encodeText, classifyBytes, sniffFileType, extensionFor, hexPreview } from './base64';

function bytesOf(b64: string): Uint8Array {
  const r = decodeBase64(b64);
  if (!r.ok) throw new Error(r.error);
  return r.bytes;
}

describe('decodeBase64 (DEVTOOLS-09 repro)', () => {
  it('keeps binary bytes intact', () => {
    const bytes = bytesOf('iVBORw0KGgoA//6A');
    expect(Array.from(bytes)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x80]);
    expect(bytes.length).toBe(12);
    const c = classifyBytes(bytes);
    expect(c.kind).toBe('binary');
    if (c.kind === 'binary') expect(c.type?.ext).toBe('png');
  });

  it('accepts the URL-safe alphabet and missing padding', () => {
    const r = decodeBase64('iVBORw0KGgoA__6A');
    expect(r.ok && r.urlSafe).toBe(true);
    expect(Array.from(bytesOf('iVBORw0KGgoA__6A'))).toEqual(Array.from(bytesOf('iVBORw0KGgoA//6A')));
    expect(new TextDecoder().decode(bytesOf('aGk'))).toBe('hi');
    expect(new TextDecoder().decode(bytesOf('aGk='))).toBe('hi');
  });

  it('accepts data: URLs and remembers their type', () => {
    const r = decodeBase64('data:image/png;base64,iVBORw0KGgo=');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe('image/png');
      expect(r.bytes[1]).toBe(0x50);
    }
  });

  it('ignores whitespace and line breaks', () => {
    expect(new TextDecoder().decode(bytesOf('SGVs\nbG8g\r\nV29y bGQh'))).toBe('Hello World!');
  });

  it('explains invalid input instead of the raw atob error', () => {
    const bad = (s: string) => {
      const r = decodeBase64(s);
      if (r.ok) throw new Error('expected an error');
      return r.error;
    };
    expect(bad('abc!def')).toMatch(/'!' at position 4 is not a Base64 character/);
    expect(bad('abcde')).toMatch(/invalid length/);
    expect(bad('ab=c')).toMatch(/after the '=' padding/);
    expect(bad('a===')).toMatch(/Too much/);
    expect(bad('data:text/plain,hello')).toMatch(/not Base64-encoded/);
  });

  it('decodes an empty string to no bytes', () => {
    expect(bytesOf('').length).toBe(0);
  });
});

describe('encodeBase64', () => {
  it('matches the platform encoder for every byte value', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(encodeBase64(all)).toBe(Buffer.from(all).toString('base64'));
    for (let n = 0; n < 6; n++) {
      const slice = all.slice(0, n);
      expect(encodeBase64(slice)).toBe(Buffer.from(slice).toString('base64'));
    }
  });

  it('round-trips random bytes', () => {
    const data = Uint8Array.from({ length: 1000 }, (_, i) => (i * 7919) % 256);
    expect(Array.from(bytesOf(encodeBase64(data)))).toEqual(Array.from(data));
    expect(Array.from(bytesOf(encodeBase64(data, { urlSafe: true })))).toEqual(Array.from(data));
  });

  it('encodes Unicode text as UTF-8 and supports URL-safe and wrapped output', () => {
    expect(encodeText('caf' + String.fromCharCode(0xe9))).toBe('Y2Fmw6k=');
    expect(encodeBase64(new Uint8Array([0xfb, 0xff]), { urlSafe: true })).toBe('-_8');
    expect(encodeText('x'.repeat(100), { wrapAt: 76 }).split('\n').map((l) => l.length)).toEqual([76, 60]);
  });
});

describe('classifyBytes', () => {
  it('shows valid UTF-8 as text', () => {
    expect(classifyBytes(new TextEncoder().encode('Hello\nWorld'))).toEqual({ kind: 'text', text: 'Hello\nWorld' });
  });

  it('treats invalid UTF-8 and control characters as binary', () => {
    expect(classifyBytes(new Uint8Array([0xc3, 0x28]))).toMatchObject({ kind: 'binary', reason: 'invalid-utf8' });
    expect(classifyBytes(new Uint8Array([0x41, 0x00, 0x42]))).toMatchObject({ kind: 'binary', reason: 'control-chars' });
  });

  it('sniffs common file types', () => {
    expect(sniffFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))?.ext).toBe('pdf');
    expect(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(sniffFileType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext).toBe('webp');
    expect(sniffFileType(new TextEncoder().encode('plain'))).toBeNull();
  });

  it('picks a download extension', () => {
    expect(extensionFor(null, 'image/svg+xml')).toBe('svg');
    expect(extensionFor(null, null)).toBe('bin');
    expect(hexPreview(new Uint8Array([0x89, 0x50]))).toBe('89 50');
  });
});

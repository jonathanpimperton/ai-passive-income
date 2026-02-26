import { describe, it, expect } from 'vitest';
import {
  utf8ToBase64,
  base64ToUtf8,
  wrapLines,
  cleanBase64,
  base64UrlDecode,
  decodeJwt,
  assembleIco,
} from './converter-utils';

// ─── Base64 Encode/Decode ────────────────────────────────────────────────────

describe('utf8ToBase64', () => {
  // RFC 4648 Section 10 test vectors — the canonical reference
  it('encodes RFC 4648 test vectors correctly', () => {
    expect(utf8ToBase64('')).toBe('');
    expect(utf8ToBase64('f')).toBe('Zg==');
    expect(utf8ToBase64('fo')).toBe('Zm8=');
    expect(utf8ToBase64('foo')).toBe('Zm9v');
    expect(utf8ToBase64('foob')).toBe('Zm9vYg==');
    expect(utf8ToBase64('fooba')).toBe('Zm9vYmE=');
    expect(utf8ToBase64('foobar')).toBe('Zm9vYmFy');
  });

  it('encodes ASCII text', () => {
    expect(utf8ToBase64('Hello World')).toBe('SGVsbG8gV29ybGQ=');
    expect(utf8ToBase64('Hello World!')).toBe('SGVsbG8gV29ybGQh');
  });

  it('encodes Unicode text (non-Latin scripts)', () => {
    // Japanese
    const japanese = '日本語テスト';
    const encoded = utf8ToBase64(japanese);
    expect(encoded).toBeTruthy();
    expect(base64ToUtf8(encoded)).toBe(japanese);
  });

  it('encodes emoji', () => {
    const emoji = '🎉🚀💻';
    const encoded = utf8ToBase64(emoji);
    expect(encoded).toBeTruthy();
    expect(base64ToUtf8(encoded)).toBe(emoji);
  });

  it('encodes large strings', () => {
    const large = 'a'.repeat(10000);
    expect(base64ToUtf8(utf8ToBase64(large))).toBe(large);
  });
});

describe('base64ToUtf8', () => {
  it('decodes RFC 4648 test vectors correctly', () => {
    expect(base64ToUtf8('')).toBe('');
    expect(base64ToUtf8('Zg==')).toBe('f');
    expect(base64ToUtf8('Zm8=')).toBe('fo');
    expect(base64ToUtf8('Zm9v')).toBe('foo');
    expect(base64ToUtf8('Zm9vYg==')).toBe('foob');
    expect(base64ToUtf8('Zm9vYmE=')).toBe('fooba');
    expect(base64ToUtf8('Zm9vYmFy')).toBe('foobar');
  });

  it('round-trips arbitrary Unicode text', () => {
    const cases = [
      'Hello World!',
      '日本語テスト',
      '🎉🚀💻',
      'Ü ö ä ß',
      'مرحبا',
      '中文测试',
      '',
      ' ',
      'a'.repeat(5000),
      'Mixed: Hello 世界 🌍',
    ];
    for (const text of cases) {
      expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
    }
  });

  it('throws on invalid Base64', () => {
    expect(() => base64ToUtf8('not valid base64!!!')).toThrow();
  });
});

describe('wrapLines', () => {
  it('wraps at specified width', () => {
    const input = 'ABCDEFGHIJ';
    expect(wrapLines(input, 4)).toBe('ABCD\nEFGH\nIJ');
  });

  it('returns original if width is 0', () => {
    expect(wrapLines('test', 0)).toBe('test');
  });

  it('handles MIME standard 76-char width', () => {
    const long = 'A'.repeat(200);
    const wrapped = wrapLines(long, 76);
    const lines = wrapped.split('\n');
    expect(lines[0]).toHaveLength(76);
    expect(lines[1]).toHaveLength(76);
    expect(lines[2]).toHaveLength(48);
  });
});

describe('cleanBase64', () => {
  it('removes whitespace and newlines', () => {
    expect(cleanBase64('SGVs\nbG8g\nV29y\nbGQ=')).toBe('SGVsbG8gV29ybGQ=');
    expect(cleanBase64('  SGVsbG8=  ')).toBe('SGVsbG8=');
    expect(cleanBase64('SGVs\tbG8=')).toBe('SGVsbG8=');
  });
});

// ─── JWT Decoder ─────────────────────────────────────────────────────────────

describe('base64UrlDecode', () => {
  it('decodes Base64URL with - and _ characters', () => {
    // Standard Base64: "ab+c/d==" → Base64URL: "ab-c_d"
    const result = base64UrlDecode('eyJhbGciOiJIUzI1NiJ9');
    expect(result).toBe('{"alg":"HS256"}');
  });
});

describe('decodeJwt', () => {
  // The canonical jwt.io example JWT
  const JWT_IO_EXAMPLE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('decodes the jwt.io canonical example correctly', () => {
    const result = decodeJwt(JWT_IO_EXAMPLE);
    expect(result.error).toBeNull();
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(result.payload).toEqual({
      sub: '1234567890',
      name: 'John Doe',
      iat: 1516239022,
    });
    expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  });

  it('returns error for empty input', () => {
    expect(decodeJwt('').error).toBeTruthy();
    expect(decodeJwt('  ').error).toBeTruthy();
  });

  it('returns error for wrong number of parts', () => {
    const result1 = decodeJwt('abc');
    expect(result1.error).toContain('expected 3 parts');

    const result2 = decodeJwt('a.b');
    expect(result2.error).toContain('expected 3 parts');

    const result4 = decodeJwt('a.b.c.d');
    expect(result4.error).toContain('expected 3 parts');
  });

  it('returns error for invalid Base64 in parts', () => {
    const result = decodeJwt('!!!.!!!.!!!');
    expect(result.error).toBeTruthy();
  });

  it('decodes JWTs with different algorithms', () => {
    // RS256 header: {"alg":"RS256","typ":"JWT"}
    const rs256Header = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9';
    const payload = 'eyJzdWIiOiIxMjM0NTY3ODkwIn0'; // {"sub":"1234567890"}
    const result = decodeJwt(`${rs256Header}.${payload}.fakesig`);
    expect(result.error).toBeNull();
    expect(result.header.alg).toBe('RS256');
    expect(result.payload.sub).toBe('1234567890');
  });
});

// ─── ICO Assembly ────────────────────────────────────────────────────────────

describe('assembleIco', () => {
  it('creates valid ICO header for single image', () => {
    // Create a fake 4-byte PNG buffer
    const fakePng = new ArrayBuffer(4);
    new Uint8Array(fakePng).set([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

    const ico = assembleIco([{ size: 16, data: fakePng }]);
    const view = new DataView(ico);

    // ICO header: reserved=0, type=1, count=1
    expect(view.getUint16(0, true)).toBe(0);  // Reserved
    expect(view.getUint16(2, true)).toBe(1);  // Type: ICO
    expect(view.getUint16(4, true)).toBe(1);  // Image count

    // Directory entry: width=16, height=16
    expect(view.getUint8(6)).toBe(16);   // Width
    expect(view.getUint8(7)).toBe(16);   // Height
    expect(view.getUint8(8)).toBe(0);    // Color palette
    expect(view.getUint8(9)).toBe(0);    // Reserved

    // Check PNG data was copied at the correct offset
    const dataOffset = view.getUint32(18, true); // Offset from directory entry
    expect(view.getUint8(dataOffset)).toBe(0x89);     // PNG magic byte 1
    expect(view.getUint8(dataOffset + 1)).toBe(0x50); // PNG magic byte 2
  });

  it('creates valid ICO header for multiple images', () => {
    const fakePng1 = new ArrayBuffer(4);
    const fakePng2 = new ArrayBuffer(8);
    const fakePng3 = new ArrayBuffer(12);

    const ico = assembleIco([
      { size: 16, data: fakePng1 },
      { size: 32, data: fakePng2 },
      { size: 48, data: fakePng3 },
    ]);
    const view = new DataView(ico);

    // Header
    expect(view.getUint16(4, true)).toBe(3); // 3 images

    // Directory entries at offsets 6, 22, 38
    expect(view.getUint8(6)).toBe(16);   // First: 16×16
    expect(view.getUint8(22)).toBe(32);  // Second: 32×32
    expect(view.getUint8(38)).toBe(48);  // Third: 48×48

    // Total size: header(6) + 3*directory(48) + data(4+8+12) = 78
    expect(ico.byteLength).toBe(6 + 48 + 24);
  });

  it('handles 256×256 size (stored as 0)', () => {
    const fakePng = new ArrayBuffer(4);
    const ico = assembleIco([{ size: 256, data: fakePng }]);
    const view = new DataView(ico);

    // 256 is stored as 0 in ICO format
    expect(view.getUint8(6)).toBe(0);  // Width: 0 means 256
    expect(view.getUint8(7)).toBe(0);  // Height: 0 means 256
  });

  it('preserves PNG data verbatim', () => {
    const testData = new ArrayBuffer(8);
    const testView = new Uint8Array(testData);
    testView.set([1, 2, 3, 4, 5, 6, 7, 8]);

    const ico = assembleIco([{ size: 32, data: testData }]);
    const icoView = new Uint8Array(ico);

    // Data starts after header(6) + directory(16) = 22
    const dataStart = 22;
    expect(icoView[dataStart]).toBe(1);
    expect(icoView[dataStart + 1]).toBe(2);
    expect(icoView[dataStart + 7]).toBe(8);
  });
});

// ─── URL Encode/Decode (native functions, verify behavior) ────────────────

describe('URL encoding (native functions)', () => {
  it('encodeURIComponent encodes reserved characters per RFC 3986', () => {
    expect(encodeURIComponent(' ')).toBe('%20');
    expect(encodeURIComponent('@')).toBe('%40');
    expect(encodeURIComponent('/')).toBe('%2F');
    expect(encodeURIComponent('?')).toBe('%3F');
    expect(encodeURIComponent('#')).toBe('%23');
    expect(encodeURIComponent('=')).toBe('%3D');
    expect(encodeURIComponent('&')).toBe('%26');
  });

  it('round-trips text through encodeURIComponent/decodeURIComponent', () => {
    const cases = [
      'Hello World!',
      'a=1&b=2&c=hello world',
      '日本語',
      'café',
      '🎉',
      '',
    ];
    for (const text of cases) {
      expect(decodeURIComponent(encodeURIComponent(text))).toBe(text);
    }
  });

  it('encodeURI preserves URL structure', () => {
    expect(encodeURI('https://example.com/path?q=hello world'))
      .toBe('https://example.com/path?q=hello%20world');
  });
});

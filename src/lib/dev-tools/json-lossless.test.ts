import { describe, it, expect } from 'vitest';
import { parseJsonLossless, printJson, jsRendering, toJsValue, describeTopLevel, type JsonNode } from './json-lossless';

function ok(text: string): { value: JsonNode; warnings: { kind: string; message: string }[] } {
  const r = parseJsonLossless(text);
  if (!r.ok) throw new Error(`expected valid JSON, got: ${r.error.message}`);
  return r;
}
function err(text: string) {
  const r = parseJsonLossless(text);
  if (r.ok) throw new Error('expected a parse error');
  return r.error;
}

describe('lossless numbers (DEVTOOLS-04 repro)', () => {
  const repro = '{"id":12345678901234567890,"id2":9007199254740993,"price":1.10,"big":1e400}';

  it('keeps every number literal exactly as written', () => {
    const { value } = ok(repro);
    expect(printJson(value, { indent: 0 })).toBe(repro);
    const pretty = printJson(value, { indent: 2 });
    expect(pretty).toContain('"id": 12345678901234567890');
    expect(pretty).toContain('"id2": 9007199254740993');
    expect(pretty).toContain('"price": 1.10');
    expect(pretty).toContain('"big": 1e400');
  });

  it('warns about the numbers JavaScript would change, and only those', () => {
    const { warnings } = ok(repro);
    const precision = warnings.filter((w) => w.kind === 'precision');
    expect(precision).toHaveLength(3);
    expect(precision.map((w) => w.message.split(' ')[0])).toEqual(['12345678901234567890', '9007199254740993', '1e400']);
  });

  it('knows when JavaScript keeps a number', () => {
    expect(jsRendering('1.10')).toBeNull();
    expect(jsRendering('42')).toBeNull();
    expect(jsRendering('-0')).toBeNull();
    expect(jsRendering('9007199254740991')).toBeNull();
    expect(jsRendering('1152921504606846976')).toBeNull(); // 2^60, exactly representable
    expect(jsRendering('1.5e300')).toBeNull();
    expect(jsRendering('0.1')).toBeNull();
    expect(jsRendering('9007199254740993')).toBe('9007199254740992');
    expect(jsRendering('12345678901234567890')).toBe('12345678901234567000');
    expect(jsRendering('0.1000000000000000000001')).toBe('0.1');
    expect(jsRendering('1e400')).toBe('Infinity');
    expect(jsRendering('-1e400')).toBe('-Infinity');
  });
});

describe('formatting', () => {
  it('matches JSON.stringify layout for ordinary documents', () => {
    const doc = '{"name":"John","age":30,"tags":["a","b"],"nested":{"x":null,"y":true,"z":[]},"empty":{}}';
    const { value } = ok(doc);
    expect(printJson(value, { indent: 2 })).toBe(JSON.stringify(JSON.parse(doc), null, 2));
    expect(printJson(value, { indent: 4 })).toBe(JSON.stringify(JSON.parse(doc), null, 4));
    expect(printJson(value, { indent: 0 })).toBe(doc);
  });

  it('keeps string escapes as written', () => {
    const doc = '{"a":"caf\\u00e9 \\/ \\"q\\""}';
    expect(printJson(ok(doc).value, { indent: 0 })).toBe(doc);
  });

  it('keeps duplicate keys and warns about them', () => {
    const { value, warnings } = ok('{"a":1,"a":2}');
    expect(printJson(value, { indent: 0 })).toBe('{"a":1,"a":2}');
    expect(warnings.some((w) => w.kind === 'duplicate-key')).toBe(true);
  });

  it('sorts keys stably and keeps a __proto__ key (DEVTOOLS-25)', () => {
    const { value } = ok('{"b":1,"__proto__":{"x":1},"a":2,"b":3}');
    expect(printJson(value, { indent: 0, sortKeys: true })).toBe('{"__proto__":{"x":1},"a":2,"b":1,"b":3}');
  });

  it('sorts nested objects too', () => {
    const { value } = ok('{"z":{"d":1,"c":2},"y":[{"b":1,"a":2}]}');
    expect(printJson(value, { indent: 0, sortKeys: true })).toBe('{"y":[{"a":2,"b":1}],"z":{"c":2,"d":1}}');
  });

  it('handles very deep nesting without overflowing the stack (DEVTOOLS-14)', () => {
    const depth = 20000;
    const doc = '['.repeat(depth) + '1' + ']'.repeat(depth);
    const { value } = ok(doc);
    expect(printJson(value, { indent: 0 })).toBe(doc);
    expect(printJson(value, { indent: 1 }).length).toBeGreaterThan(doc.length);
  });

  it('parses a large document in reasonable time', () => {
    const rows = Array.from({ length: 20000 }, (_, k) => ({ id: k, name: `row ${k}`, price: k / 7, ok: k % 2 === 0, tags: ['a', 'b'] }));
    const doc = JSON.stringify(rows);
    const t0 = Date.now();
    const { value } = ok(doc);
    const out = printJson(value, { indent: 0 });
    expect(out).toBe(doc);
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it('accepts top-level scalars', () => {
    expect(printJson(ok(' "x" ').value, { indent: 2 })).toBe('"x"');
    expect(printJson(ok('null').value, { indent: 2 })).toBe('null');
    expect(describeTopLevel(ok('[1,2]').value)).toEqual({ type: 'Array', keys: 2 });
    expect(describeTopLevel(ok('{"a":1}').value)).toEqual({ type: 'Object', keys: 1 });
  });

  it('ignores a leading byte-order mark with a warning', () => {
    const { value, warnings } = ok(String.fromCharCode(0xfeff) + '{"a":1}');
    expect(printJson(value, { indent: 0 })).toBe('{"a":1}');
    expect(warnings[0].kind).toBe('bom');
  });
});

describe('errors with positions and hints (DEVTOOLS-18)', () => {
  it('points at a trailing comma', () => {
    const e = err('{\n  "a": 1,\n}');
    expect(e.line).toBe(3);
    expect(e.column).toBe(1);
    expect(e.hint).toMatch(/Trailing comma/);
  });

  it('explains single quotes', () => {
    expect(err("{'a': 1}").hint).toMatch(/double quotes/);
    expect(err('{"a": \'x\'}').hint).toMatch(/double quotes/);
  });

  it('explains unquoted keys, comments, NaN and Python literals', () => {
    expect(err('{a: 1}').hint).toMatch(/double quotes/);
    expect(err('{"a": 1 // note\n}').hint).toMatch(/comments/);
    expect(err('{"a": NaN}').hint).toMatch(/NaN is not valid JSON/);
    expect(err('[Infinity]').hint).toMatch(/Infinity/);
    expect(err('[-Infinity]').hint).toMatch(/Infinity/);
    expect(err('{"a": True}').hint).toMatch(/lowercase/);
    expect(err('{"a": undefined}').hint).toMatch(/undefined/);
  });

  it('explains number mistakes', () => {
    expect(err('[07]').message).toMatch(/leading zeros/);
    expect(err('[07]').hint).toMatch(/zip code/);
    expect(err('[+1]').hint).toMatch(/\+/);
    expect(err('[.5]').hint).toMatch(/digit before/);
    expect(err('[1.]').message).toMatch(/decimal point/);
    expect(err('[0x1F]').message).toMatch(/Hexadecimal/);
  });

  it('reports missing commas, unclosed containers and unterminated strings', () => {
    expect(err('{"a":1 "b":2}').hint).toMatch(/comma is missing/);
    expect(err('[1 2]').hint).toMatch(/comma is missing/);
    const unclosed = err('{\n  "a": [1, 2\n');
    expect(unclosed.message).toMatch(/missing '\]'/);
    expect(unclosed.hint).toMatch(/line 2/);
    expect(err('{"a": "x}').message).toMatch(/Unterminated string/);
    expect(err('{"a": "line\nbreak"}').hint).toMatch(/\\n/);
    expect(err('{"a": "bad \\x escape"}').message).toMatch(/Invalid escape/);
  });

  it('rejects trailing content and empty input', () => {
    expect(err('{"a":1} {"b":2}').hint).toMatch(/single value/);
    expect(err('   ').message).toMatch(/empty/);
  });

  it('names invisible characters', () => {
    expect(err('{"a":' + String.fromCharCode(0xa0) + '1}').message).toMatch(/U\+00A0/);
  });

  it('agrees with JSON.parse on what is valid', () => {
    const samples = ['{}', '[]', '0', '-0', '1e5', '1E+5', '"\\u0041"', '[true,false,null]', '{"a":{"b":{"c":[1,{"d":"e"}]}}}', '[1,]', '{,}', '[01]', '{"a" 1}', '"a', '[1]]', 'tru', 'nul', '[-]', '[1e]', '[1.5e+]'];
    for (const s of samples) {
      let native = true;
      try { JSON.parse(s); } catch { native = false; }
      expect(parseJsonLossless(s).ok, s).toBe(native);
    }
  });
});

describe('toJsValue', () => {
  it('builds plain values with null-prototype objects', () => {
    const v = toJsValue(ok('{"__proto__":{"x":1},"a":[1,"two",null,true]}').value) as Record<string, unknown>;
    expect(Object.keys(v)).toEqual(['__proto__', 'a']);
    expect(v.a).toEqual([1, 'two', null, true]);
    expect(Object.getPrototypeOf(v)).toBeNull();
  });

  it('reports numbers that change', () => {
    const lossy: string[] = [];
    toJsValue(ok('[9007199254740993, 1.5]').value, (raw) => lossy.push(raw));
    expect(lossy).toEqual(['9007199254740993']);
  });
});

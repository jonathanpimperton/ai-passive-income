import { describe, it, expect } from 'vitest';
import * as fxp from 'fast-xml-parser';
import { xmlToJson, jsonToXml, isWellFormed, isNcName, toNcName, type FxpModule } from './xml';
import { parseJsonLossless, type JsonNode } from './json-lossless';

const FXP = fxp as unknown as FxpModule;

function tree(json: string): JsonNode {
  const r = parseJsonLossless(json);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}
function toXml(json: string, rootName = 'root', indent = 2) {
  const r = jsonToXml(tree(json), { rootName, indent });
  if (!r.ok) throw new Error(r.error);
  return r;
}
function toJson(xml: string, indent = 2) {
  const r = xmlToJson(FXP, xml, indent);
  if (!r.ok) throw new Error(r.error);
  return { value: JSON.parse(r.json), warnings: r.warnings, json: r.json };
}

describe('XML to JSON keeps values as written (DEVTOOLS-05 repro)', () => {
  const repro = '<order id="00123"><zip>02134</zip><phone>+441234567890</phone><ver>1.10</ver><code>0x1F</code><p>Hello <b>world</b> and <i>you</i>!</p></order>';

  it('does not coerce numbers, signs, hex or trailing zeros', () => {
    const { value } = toJson(repro);
    expect(value.order['@_id']).toBe('00123');
    expect(value.order.zip).toBe('02134');
    expect(value.order.phone).toBe('+441234567890');
    expect(value.order.ver).toBe('1.10');
    expect(value.order.code).toBe('0x1F');
  });

  it('keeps word breaks in mixed text and warns that order is lost', () => {
    const { value, warnings } = toJson(repro);
    expect(value.order.p['#text']).toBe('Hello and !');
    expect(value.order.p.b).toBe('world');
    expect(warnings[0]).toMatch(/<p> mixes text with child elements/);
  });

  it('decodes character references and predefined entities', () => {
    const { value } = toJson('<a><c>&#169; &#x41; &amp; &lt;</c></a>');
    expect(value.a.c).toBe(String.fromCharCode(169) + ' A & <');
  });

  it('trims element text and drops indentation whitespace', () => {
    const { value } = toJson('<?xml version="1.0"?>\n<users>\n  <user id="1">\n    <name> Alice </name>\n  </user>\n</users>');
    expect(value).toEqual({ users: { user: { name: 'Alice', '@_id': '1' } } });
  });

  it('turns repeated elements into arrays and keeps empty elements as empty strings', () => {
    const { value } = toJson('<a><i>1</i><i>2</i><e/><f></f></a>');
    expect(value).toEqual({ a: { i: ['1', '2'], e: '', f: '' } });
  });
});

describe('XML to JSON rejects broken XML', () => {
  const bad = (xml: string) => {
    const r = xmlToJson(FXP, xml, 2);
    if (r.ok) throw new Error('expected an error');
    return r.error;
  };

  it('reports text that is not XML', () => {
    expect(bad('this is not xml at all')).toMatch(/does not look like XML/);
  });

  it('reports mismatched tags with a position', () => {
    expect(bad('<a><b></a>')).toMatch(/Line 1, column \d+: Expected closing tag 'b'/);
  });

  it('reports several root elements', () => {
    expect(bad('<a>x</a><b>y</b>')).toMatch(/exactly one root element/);
    expect(bad('<a>x</a><a>y</a>')).toMatch(/exactly one root element/);
  });

  it('reports attributes without values and bare ampersands', () => {
    expect(bad('<input disabled/>')).toMatch(/has no value/);
    expect(bad('<a>x & y</a>')).toMatch(/Line 1/);
  });
});

describe('JSON to XML is well-formed (DEVTOOLS-06 repro)', () => {
  it('wraps several top-level keys in one root and renames invalid names', () => {
    const { xml, warnings } = toXml('{"name":"Alice","age":30,"first name":"A","tags":["x","y"]}');
    expect(isWellFormed(FXP, xml)).toBe(true);
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <name>Alice</name>\n  <age>30</age>\n  <first_name>A</first_name>\n  <tags>x</tags>\n  <tags>y</tags>\n</root>',
    );
    expect(warnings[0]).toMatch(/"first name" -> <first_name>/);
  });

  it('uses a single named object as the root, with @_ keys as attributes', () => {
    const { xml } = toXml('{"users":{"user":[{"@_id":"1","name":"Alice"},{"@_id":"2","name":"Bob"}]}}');
    expect(xml).toContain('<users>\n  <user id="1">\n    <name>Alice</name>\n  </user>\n  <user id="2">');
    expect(isWellFormed(FXP, xml)).toBe(true);
  });

  it('round-trips the sample through XML and back', () => {
    const sample = '{"users":{"user":[{"@_id":"1","name":"Alice","email":"alice@example.com"},{"@_id":"2","name":"Bob","email":"bob@example.com"}]}}';
    const { xml } = toXml(sample);
    expect(toJson(xml).value).toEqual(JSON.parse(sample));
  });

  it('uses <item> for top-level and nested arrays', () => {
    const { xml } = toXml('[1,[2,3],{"a":true}]', 'list');
    expect(xml).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<list>\n  <item>1</item>\n  <item>\n    <item>2</item>\n    <item>3</item>\n  </item>\n  <item>\n    <a>true</a>\n  </item>\n</list>');
    expect(isWellFormed(FXP, xml)).toBe(true);
  });

  it('escapes text and attribute values', () => {
    const { xml } = toXml('{"a":{"@_t":"say \\"hi\\" & <go>","#text":"1 < 2 && 3 > 2"}}');
    expect(xml).toContain('<a t="say &quot;hi&quot; &amp; &lt;go>">1 &lt; 2 &amp;&amp; 3 &gt; 2</a>');
    expect(isWellFormed(FXP, xml)).toBe(true);
  });

  it('writes big numbers exactly and null as an empty element', () => {
    const { xml } = toXml('{"id":12345678901234567890,"n":null,"s":""}');
    expect(xml).toContain('<id>12345678901234567890</id>');
    expect(xml).toContain('<n/>');
    expect(xml).toContain('<s/>');
  });

  it('replaces control characters XML cannot hold, and warns', () => {
    const { xml, warnings } = toXml('{"a":"x\\u0001y"}');
    expect(xml).toContain('<a>x' + String.fromCharCode(0xfffd) + 'y</a>');
    expect(warnings.some((w) => /control character/.test(w))).toBe(true);
    expect(isWellFormed(FXP, xml)).toBe(true);
  });

  it('keeps declared namespace prefixes and renames undeclared ones', () => {
    const declared = toXml('{"root":{"@_xmlns:ns":"http://e","ns:a":"1"}}').xml;
    expect(declared).toContain('<ns:a>1</ns:a>');
    const undeclared = toXml('{"root":{"ns:a":"1"}}');
    expect(undeclared.xml).toContain('<ns_a>1</ns_a>');
  });

  it('notes empty arrays it cannot represent', () => {
    const { warnings } = toXml('{"a":1,"tags":[]}');
    expect(warnings.some((w) => /Empty arrays/.test(w))).toBe(true);
  });

  it('handles scalars and empty containers', () => {
    expect(toXml('"hi"').xml).toContain('<root>hi</root>');
    expect(toXml('{}').xml).toContain('<root/>');
    expect(toXml('[]').xml).toContain('<root/>');
  });

  it('rejects an invalid root element name', () => {
    const r = jsonToXml(tree('[1]'), { rootName: '1 bad', indent: 2 });
    expect(r.ok).toBe(false);
  });

  it('produces well-formed XML for awkward keys', () => {
    const keys = ['', '1abc', '-x', 'a b', 'a/b', 'xml-ok', 'x.y', 'emoji-' + String.fromCodePoint(0x1f600), 'caf' + String.fromCharCode(0xe9), '@_', '#text'];
    const json = '{' + keys.map((k, idx) => `${JSON.stringify(k)}:${idx}`).join(',') + '}';
    const { xml } = toXml(json);
    expect(isWellFormed(FXP, xml)).toBe(true);
  });

  it('handles deep nesting without overflowing the stack', () => {
    const depth = 5000;
    const json = '{"a":'.repeat(depth) + '1' + '}'.repeat(depth);
    const r = jsonToXml(tree(json), { rootName: 'root', indent: 0 });
    expect(r.ok).toBe(true);
  });
});

describe('XML names', () => {
  it('accepts valid names and rejects invalid ones', () => {
    for (const n of ['a', '_x', 'a-b.c1', 'caf' + String.fromCharCode(0xe9)]) expect(isNcName(n), n).toBe(true);
    for (const n of ['', '1a', '-a', 'a b', 'a:b', 'a/b']) expect(isNcName(n), n).toBe(false);
  });

  it('repairs invalid names', () => {
    expect(toNcName('first name')).toBe('first_name');
    expect(toNcName('1abc')).toBe('_1abc');
    expect(toNcName('')).toBe('_');
    expect(isNcName(toNcName('a:b/c d'))).toBe(true);
  });
});

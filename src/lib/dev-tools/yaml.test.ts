import { describe, it, expect } from 'vitest';
import * as jsyamlNs from 'js-yaml';
import { yamlToJson, jsonToYaml, stringifyYamlValue, looksLikeYaml, type JsYamlModule } from './yaml';
import { parseJsonLossless } from './json-lossless';

const jsyaml = ((jsyamlNs as unknown as { default?: JsYamlModule }).default ?? jsyamlNs) as unknown as JsYamlModule;

function y2j(text: string, schema: 'core' | 'json' | 'extended' = 'core', maxValues?: number) {
  return yamlToJson(jsyaml, text, { schema, indent: 2, maxValues });
}
function okJson(text: string, schema: 'core' | 'json' | 'extended' = 'core') {
  const r = y2j(text, schema);
  if (!r.ok) throw new Error(r.error);
  return { value: JSON.parse(r.json), warnings: r.warnings, json: r.json };
}

describe('YAML to JSON (DEVTOOLS-12)', () => {
  it('converts multi-document files to an array of documents', () => {
    const { value, warnings } = okJson('apiVersion: v1\nkind: Service\n---\napiVersion: apps/v1\nkind: Deployment\n');
    expect(value).toEqual([{ apiVersion: 'v1', kind: 'Service' }, { apiVersion: 'apps/v1', kind: 'Deployment' }]);
    expect(warnings[0]).toMatch(/2 YAML documents/);
  });

  it('keeps dates as written with the default (YAML 1.2 Core) schema', () => {
    expect(okJson('d: 2024-01-01\nt: 2024-01-01T10:00:00Z').value).toEqual({ d: '2024-01-01', t: '2024-01-01T10:00:00Z' });
  });

  it('converts timestamps only when the extended schema is chosen', () => {
    expect(okJson('d: 2024-01-01', 'extended').value).toEqual({ d: '2024-01-01T00:00:00.000Z' });
  });

  it('writes .inf and .nan as strings with a warning instead of null', () => {
    const { value, warnings } = okJson('a: .inf\nb: -.inf\nc: .nan\nd: 1.5');
    expect(value).toEqual({ a: '.inf', b: '-.inf', c: '.nan', d: 1.5 });
    expect(warnings.some((w) => /3 values are .inf or .nan/.test(w))).toBe(true);
  });

  it('follows YAML 1.2 for yes/no and underscores (js-yaml 4.3)', () => {
    // "yes" is a string in YAML 1.2 (no Norway problem); "1_000" is a string since js-yaml 4.3.
    expect(okJson('a: yes\nb: no\nc: 1_000\nd: true\ne: 0x1F\nf: null').value).toEqual({ a: 'yes', b: 'no', c: '1_000', d: true, e: 31, f: null });
  });

  it('stops an alias bomb instead of hanging the page', () => {
    const bomb = [
      'a: &a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]',
      'b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]',
      'c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]',
      'd: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]',
      'e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]',
      'f: &f [*e,*e,*e,*e,*e,*e,*e,*e,*e]',
      'g: &g [*f,*f,*f,*f,*f,*f,*f,*f,*f]',
      'h: &h [*g,*g,*g,*g,*g,*g,*g,*g,*g]',
      'i: &i [*h,*h,*h,*h,*h,*h,*h,*h,*h]',
    ].join('\n');
    const t0 = Date.now();
    const r = y2j(bomb);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/alias bomb/);
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it('still expands ordinary aliases', () => {
    expect(okJson('base: &b {x: 1}\nother: *b').value).toEqual({ base: { x: 1 }, other: { x: 1 } });
  });

  it('refuses recursive aliases', () => {
    const r = y2j('a: &a\n  child: *a\n');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/recursive alias/);
  });

  it('reports syntax errors with a line and column', () => {
    const r = y2j('a: 1\n b: 2\n');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Line \d+, column \d+: /);
  });

  it('treats an empty or comment-only file as null', () => {
    expect(okJson('# only a comment\n').value).toBeNull();
  });

  it('matches JSON.stringify formatting', () => {
    const v = { a: [1, { b: 'x' }], c: {}, d: [] };
    expect(stringifyYamlValue(v, 2).text).toBe(JSON.stringify(v, null, 2));
    expect(stringifyYamlValue(v, 0).text).toBe(JSON.stringify(v));
  });
});

describe('JSON to YAML', () => {
  function j2y(json: string) {
    const parsed = parseJsonLossless(json);
    if (!parsed.ok) throw new Error(parsed.error.message);
    const r = jsonToYaml(jsyaml, parsed.value, { indent: 2 });
    if (!r.ok) throw new Error(r.error);
    return r;
  }

  it('quotes strings that YAML would otherwise read as other types', () => {
    const { yaml } = j2y('{"s":"yes","n":"123","d":"2024-01-01","e":"","nul":null}');
    const back = jsyaml.loadAll(yaml, undefined, { schema: jsyaml.CORE_SCHEMA })[0];
    expect(back).toEqual({ s: 'yes', n: '123', d: '2024-01-01', e: '', nul: null });
  });

  it('keeps a __proto__ key as data', () => {
    expect(j2y('{"__proto__":{"x":1},"a":1}').yaml).toContain('__proto__:');
  });

  it('warns when a number cannot be converted exactly', () => {
    const { warnings } = j2y('{"id":12345678901234567890}');
    expect(warnings[0]).toMatch(/12345678901234567890 -> 12345678901234567000/);
  });
});

describe('looksLikeYaml', () => {
  it('spots YAML pasted into the JSON box', () => {
    expect(looksLikeYaml('name: CalcRun\nversion: 1')).toBe(true);
    expect(looksLikeYaml('---\na: 1')).toBe(true);
    expect(looksLikeYaml('- a\n- b')).toBe(true);
    expect(looksLikeYaml('{"a": 1,}')).toBe(false);
    expect(looksLikeYaml('hello world')).toBe(false);
  });
});

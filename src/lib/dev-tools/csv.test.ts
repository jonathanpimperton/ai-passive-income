import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { csvToJson, jsonToCsv, isFormulaLike, uniqueColumnNames, type PapaModule, type CsvToJsonOptions } from './csv';
import { parseJsonLossless } from './json-lossless';

const papa = Papa as unknown as PapaModule;
const defaults: CsvToJsonOptions = { delimiter: 'auto', header: true, skipEmptyLines: true };

function c2j(text: string, opts: Partial<CsvToJsonOptions> = {}) {
  const r = csvToJson(papa, text, { ...defaults, ...opts });
  if (!r.ok) throw new Error(r.error);
  return { ...r, value: JSON.parse(r.json) };
}
function j2c(json: string, protectFormulas = true) {
  const parsed = parseJsonLossless(json);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return jsonToCsv(parsed.value, { protectFormulas });
}
function okCsv(json: string, protectFormulas = true) {
  const r = j2c(json, protectFormulas);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe('CSV to JSON (DEVTOOLS-07 repro and DEVTOOLS-24)', () => {
  it('keeps quoted newlines inside one field', () => {
    expect(c2j('name,note\n"Alice","line1\nline2"\nBob,x').value).toEqual([
      { name: 'Alice', note: 'line1\nline2' },
      { name: 'Bob', note: 'x' },
    ]);
  });

  it('detects semicolon and tab delimiters', () => {
    const semi = c2j('a;b\n1;2');
    expect(semi.value).toEqual([{ a: '1', b: '2' }]);
    expect(semi.delimiter).toBe(';');
    expect(c2j('a\tb\n1\t2').value).toEqual([{ a: '1', b: '2' }]);
  });

  it('uses an explicitly chosen delimiter', () => {
    expect(c2j('a|b,c\n1|2,3', { delimiter: '|' }).value).toEqual([{ a: '1', 'b,c': '2,3' }]);
  });

  it('keeps ragged rows and reports them with 1-based row numbers', () => {
    const r = c2j('a,b,c\n1,2\n1,2,3,4\n5,6,7');
    expect(r.value).toEqual([
      { a: '1', b: '2', c: '' },
      { a: '1', b: '2', c: '3', column_4: '4' },
      { a: '5', b: '6', c: '7' },
    ]);
    expect(r.warnings.join(' ')).toMatch(/fewer values than the header \(row 2,/);
    expect(r.warnings.join(' ')).toMatch(/more values than the header \(row 3\)/);
  });

  it('says so when there is only a header row', () => {
    const r = c2j('a,b,c\n');
    expect(r.value).toEqual([]);
    expect(r.warnings.join(' ')).toMatch(/Only a header row/);
  });

  it('can treat the first row as data', () => {
    expect(c2j('1,2\n3,4', { header: false }).value).toEqual([['1', '2'], ['3', '4']]);
  });

  it('keeps blank lines when asked', () => {
    expect(c2j('a\n1\n\n2\n', { skipEmptyLines: false }).value).toEqual([{ a: '1' }, { a: '' }, { a: '2' }]);
  });

  it('keeps values as text, including leading zeros', () => {
    expect(c2j('zip,n\n02134,1.10').value).toEqual([{ zip: '02134', n: '1.10' }]);
  });

  it('keeps a __proto__ column (DEVTOOLS-25)', () => {
    const r = c2j('__proto__,a\nx,1');
    expect(r.json).toContain('"__proto__": "x"');
  });

  it('makes blank and repeated column names unique', () => {
    expect(uniqueColumnNames(['a', '', 'a', 'a'])).toEqual(['a', 'column_2', 'a_2', 'a_3']);
    expect(c2j('a,,a\n1,2,3').value).toEqual([{ a: '1', column_2: '2', a_2: '3' }]);
  });

  it('rejects an unclosed quoted field', () => {
    const r = csvToJson(papa, 'a,b\n"open,1\n2,3', defaults);
    expect(r.ok).toBe(false);
  });
});

describe('JSON to CSV (DEVTOOLS-08 repro)', () => {
  it('takes columns from every row', () => {
    expect(okCsv('[{"a":1},{"a":2,"b":3}]').csv).toBe('a,b\n1,\n2,3');
  });

  it('writes nested values as JSON, not [object Object]', () => {
    const r = okCsv('[{"name":"A","address":{"city":"X"},"tags":["a","b"]}]');
    expect(r.csv).toBe('name,address,tags\nA,"{""city"":""X""}","[""a"",""b""]"');
    expect(r.csv).not.toContain('[object Object]');
  });

  it('refuses arrays of plain values with a clear error', () => {
    const r = j2c('[1,2,3]');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Item 1 is a number, not an object/);
  });

  it('converts a single object as one row', () => {
    const r = okCsv('{"a":1,"b":"x"}');
    expect(r.csv).toBe('a,b\n1,x');
    expect(r.warnings[0]).toMatch(/single object/);
  });

  it('writes numbers exactly and null as empty', () => {
    expect(okCsv('[{"id":12345678901234567890,"p":1.10,"n":null,"t":true}]').csv).toBe('id,p,n,t\n12345678901234567890,1.10,,true');
  });

  it('quotes delimiters, quotes, line breaks and edge spaces', () => {
    expect(okCsv('[{"a":"x,y","b":"say \\"hi\\"","c":"l1\\nl2","d":" pad"}]').csv).toBe('a,b,c,d\n"x,y","say ""hi""","l1\nl2"," pad"');
  });

  it('neutralises formula cells by default (DEVTOOLS-21)', () => {
    const r = okCsv('[{"a":"=HYPERLINK(\\"http://x\\")","b":"+cmd","c":"-2+3","d":"@SUM(1)","e":"-5","f":"+44 20","g":"ok"}]');
    expect(r.csv.split('\n')[1]).toBe(`"'=HYPERLINK(""http://x"")",'+cmd,'-2+3,'@SUM(1),-5,'+44 20,ok`);
    expect(r.warnings.join(' ')).toMatch(/5 cells started with/);
  });

  it('can keep formula-like cells exactly when asked', () => {
    expect(okCsv('[{"a":"=1+1"}]', false).csv).toBe('a\n=1+1');
  });

  it('knows plain numbers are not formulas', () => {
    expect(isFormulaLike('-5')).toBe(false);
    expect(isFormulaLike('+1.5e3')).toBe(false);
    expect(isFormulaLike('=A1')).toBe(true);
    expect(isFormulaLike('@x')).toBe(true);
  });

  it('round-trips through CSV and back', () => {
    const csv = okCsv('[{"name":"Alice","note":"a, b"},{"name":"Bob","note":"line\\nbreak"}]').csv;
    expect(c2j(csv).value).toEqual([{ name: 'Alice', note: 'a, b' }, { name: 'Bob', note: 'line\nbreak' }]);
  });
});

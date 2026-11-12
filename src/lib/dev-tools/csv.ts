/**
 * CSV <-> JSON conversion for the CSV/JSON tool (DEVTOOLS-07/08/21/24/25).
 *
 * CSV -> JSON always uses PapaParse (never a naive split on newlines and
 * commas), detects or accepts a delimiter, can treat the first row as data,
 * keeps ragged rows instead of aborting, and reports problems with 1-based
 * row numbers. Values stay as text, because CSV has no types.
 *
 * JSON -> CSV takes its columns from every row (not just the first), writes
 * nested values as JSON instead of "[object Object]", refuses rows that are
 * not objects, and by default neutralises cells that a spreadsheet would run
 * as a formula (=, +, -, @).
 *
 * PapaParse is passed in by the caller so the component can load it lazily.
 */
import { printJson, type JsonNode } from './json-lossless';

export type Delimiter = 'auto' | ',' | ';' | '\t' | '|';

interface PapaError {
  type: string;
  code: string;
  message: string;
  row?: number;
}

export interface PapaModule {
  parse(input: string, config: Record<string, unknown>): { data: unknown[]; errors: PapaError[]; meta: { delimiter: string } };
}

export interface CsvToJsonOptions {
  delimiter: Delimiter;
  /** Treat the first row as column names. */
  header: boolean;
  /** Skip blank lines. */
  skipEmptyLines: boolean;
  indent?: number;
}

export type CsvToJsonResult =
  | { ok: true; json: string; rows: number; columns: number; delimiter: string; warnings: string[] }
  | { ok: false; error: string };

const DELIMITER_NAMES: Record<string, string> = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' };

export function delimiterName(d: string): string {
  return DELIMITER_NAMES[d] ?? JSON.stringify(d);
}

/** "rows 3, 7 and 12" style list, shortened after `max` items. */
function rowList(rows: number[], max = 5): string {
  const shown = rows.slice(0, max).join(', ');
  return rows.length > max ? `${shown} and ${rows.length - max} more` : shown;
}

/** Unique, non-empty column names: blank -> column_N, repeats -> name_2. */
export function uniqueColumnNames(raw: string[]): string[] {
  const seen = new Set<string>();
  return raw.map((name, i) => {
    let base = name.trim() === '' ? `column_${i + 1}` : name;
    let candidate = base;
    let n = 2;
    while (seen.has(candidate)) candidate = `${base}_${n++}`;
    seen.add(candidate);
    return candidate;
  });
}

export function csvToJson(papa: PapaModule, text: string, opts: CsvToJsonOptions): CsvToJsonResult {
  const result = papa.parse(text, {
    header: false,
    delimiter: opts.delimiter === 'auto' ? '' : opts.delimiter,
    delimitersToGuess: [',', ';', '\t', '|'],
    skipEmptyLines: opts.skipEmptyLines ? 'greedy' : false,
  });
  const warnings: string[] = [];
  const delimiter = result.meta.delimiter || ',';

  for (const e of result.errors) {
    const rowNo = typeof e.row === 'number' ? e.row + 1 : null;
    if (e.code === 'UndetectableDelimiter') {
      warnings.push('The delimiter could not be detected, so a comma was assumed. Pick the delimiter if the columns look wrong.');
    } else if (e.code === 'MissingQuotes') {
      return { ok: false, error: `A quoted field is never closed${rowNo ? ` (starting in row ${rowNo})` : ''}. Check for a missing closing double quote.` };
    } else if (e.type === 'Quotes') {
      warnings.push(`${rowNo ? `Row ${rowNo}: ` : ''}a quoted field is malformed (${e.message}). Check that quotes inside a field are doubled ("").`);
    }
  }

  let rows = result.data as string[][];
  // A final newline produces one empty record when blank lines are kept.
  if (!opts.skipEmptyLines && rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows = rows.slice(0, -1);
  }
  if (rows.length === 0) return { ok: true, json: '[]', rows: 0, columns: 0, delimiter, warnings: [...warnings, 'No rows were found.'] };

  const indent = opts.indent ?? 2;
  if (!opts.header) {
    const width = Math.max(...rows.map((r) => r.length));
    return { ok: true, json: JSON.stringify(rows, null, indent), rows: rows.length, columns: width, delimiter, warnings };
  }

  const columns = uniqueColumnNames(rows[0]);
  const data = rows.slice(1);
  if (data.length === 0) {
    warnings.push('Only a header row was found, so there are no data rows to convert.');
  }
  const short: number[] = [];
  const long: number[] = [];
  const extraNames = new Set<string>();
  const objects = data.map((row, k) => {
    // Null prototype: a "__proto__" column is kept as data (DEVTOOLS-25).
    const obj = Object.create(null) as Record<string, string>;
    columns.forEach((col, i) => {
      obj[col] = row[i] ?? '';
    });
    if (row.length < columns.length) short.push(k + 2);
    if (row.length > columns.length) {
      long.push(k + 2);
      for (let i = columns.length; i < row.length; i++) {
        let name = `column_${i + 1}`;
        while (columns.includes(name)) name = `_${name}`;
        obj[name] = row[i];
        extraNames.add(name);
      }
    }
    return obj;
  });
  if (short.length) {
    warnings.push(`${short.length} row${short.length === 1 ? ' has' : 's have'} fewer values than the header (row ${rowList(short)}, counting the header as row 1). Missing values were left empty.`);
  }
  if (long.length) {
    warnings.push(`${long.length} row${long.length === 1 ? ' has' : 's have'} more values than the header (row ${rowList(long)}). Extra values were kept as ${[...extraNames].slice(0, 3).join(', ')}.`);
  }
  const renamed = columns.filter((c, i) => c !== rows[0][i]);
  if (renamed.length) {
    warnings.push(`Blank or repeated column names were made unique: ${renamed.slice(0, 4).join(', ')}${renamed.length > 4 ? ', ...' : ''}.`);
  }
  return { ok: true, json: JSON.stringify(objects, null, indent), rows: objects.length, columns: columns.length, delimiter, warnings };
}

export interface JsonToCsvOptions {
  delimiter?: string;
  /** Prefix cells starting with = + - @ with ' so spreadsheets show them as text. */
  protectFormulas: boolean;
}

export type JsonToCsvResult = { ok: true; csv: string; rows: number; columns: number; warnings: string[] } | { ok: false; error: string };

const PLAIN_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const FORMULA_START = /^[=+\-@\t\r]/;

/** True when a spreadsheet would treat the text as a formula. */
export function isFormulaLike(text: string): boolean {
  return FORMULA_START.test(text) && !PLAIN_NUMBER.test(text);
}

function describeNode(node: JsonNode): string {
  switch (node.kind) {
    case 'array':
      return 'an array';
    case 'string':
      return 'a string';
    case 'number':
      return 'a number';
    case 'object':
      return 'an object';
    default:
      return node.raw === 'null' ? 'null' : 'a boolean';
  }
}

function cellText(node: JsonNode | undefined): string {
  if (!node) return '';
  switch (node.kind) {
    case 'string':
      return node.value;
    case 'number':
      return node.raw;
    case 'literal':
      return node.raw === 'null' ? '' : node.raw;
    default:
      // Nested objects and arrays are written as compact JSON, losslessly.
      return printJson(node, { indent: 0 });
  }
}

export function jsonToCsv(root: JsonNode, opts: JsonToCsvOptions): JsonToCsvResult {
  const delimiter = opts.delimiter && opts.delimiter !== 'auto' ? opts.delimiter : ',';
  const warnings: string[] = [];
  let items: JsonNode[];
  if (root.kind === 'array') {
    items = root.items;
    if (items.length === 0) return { ok: false, error: 'The array is empty, so there are no rows to convert.' };
  } else if (root.kind === 'object') {
    items = [root];
    warnings.push('The JSON is a single object, so it was converted as one row. Use an array of objects for several rows.');
  } else {
    return { ok: false, error: `JSON to CSV needs an array of objects, such as [{"name": "Alice"}], but this is ${describeNode(root)}.` };
  }

  const bad = items.findIndex((it) => it.kind !== 'object');
  if (bad >= 0) {
    return {
      ok: false,
      error: `Item ${bad + 1} is ${describeNode(items[bad])}, not an object. Each item becomes one CSV row, so every item must be an object such as {"name": "Alice"}.`,
    };
  }

  // Union of keys in order of first appearance (DEVTOOLS-08).
  const columns: string[] = [];
  const seen = new Set<string>();
  const rows = items.map((it) => {
    const map = new Map<string, JsonNode>();
    if (it.kind === 'object') {
      for (const m of it.members) {
        map.set(m.key, m.value); // duplicate keys: the last one wins, as in JSON.parse
        if (!seen.has(m.key)) {
          seen.add(m.key);
          columns.push(m.key);
        }
      }
    }
    return map;
  });

  let protectedCells = 0;
  let nested = false;
  const encode = (raw: string): string => {
    let text = raw;
    if (opts.protectFormulas && isFormulaLike(text)) {
      text = `'${text}`;
      protectedCells++;
    }
    const needsQuotes = text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r') || /^\s|\s$/.test(text);
    return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [columns.map(encode).join(delimiter)];
  for (const row of rows) {
    lines.push(
      columns
        .map((col) => {
          const node = row.get(col);
          if (node && (node.kind === 'object' || node.kind === 'array')) nested = true;
          return encode(cellText(node));
        })
        .join(delimiter),
    );
  }

  const missing = rows.filter((r) => r.size < columns.length).length;
  if (missing) {
    warnings.push(`${missing} row${missing === 1 ? ' does' : 's do'} not have every column; those cells are empty.`);
  }
  if (nested) warnings.push('Nested objects and arrays were written as JSON text inside their cells.');
  if (protectedCells) {
    warnings.push(
      `${protectedCells} cell${protectedCells === 1 ? '' : 's'} started with =, +, - or @ and ${protectedCells === 1 ? 'was' : 'were'} prefixed with ' so spreadsheet apps show ${protectedCells === 1 ? 'it' : 'them'} as text instead of running a formula.`,
    );
  }
  return { ok: true, csv: lines.join('\n'), rows: rows.length, columns: columns.length, warnings };
}

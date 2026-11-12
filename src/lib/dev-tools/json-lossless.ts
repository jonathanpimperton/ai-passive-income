/**
 * Lossless JSON parser and printer for the developer tools (DEVTOOLS-04/14/18/25).
 *
 * JSON.parse + JSON.stringify silently changes data: 64-bit integers lose
 * precision, 1e400 becomes null, 1.10 becomes 1.1, duplicate keys collapse and
 * a "__proto__" key can vanish. This parser keeps every number and string
 * literal exactly as written and every object member in order (duplicates
 * included), so formatting and minifying never change a value.
 *
 * It is iterative (an explicit stack, no recursion), so deeply nested input
 * does not overflow the call stack, and it reports errors with a line,
 * column and a plain-English repair hint that is the same in every browser.
 */

export type JsonNode =
  | { kind: 'object'; members: JsonMember[] }
  | { kind: 'array'; items: JsonNode[] }
  | { kind: 'string'; raw: string; value: string }
  | { kind: 'number'; raw: string }
  | { kind: 'literal'; raw: 'true' | 'false' | 'null' };

export interface JsonMember {
  /** The key literal exactly as written, including its quotes. */
  keyRaw: string;
  /** The decoded key. */
  key: string;
  value: JsonNode;
  /** 1-based line where the key starts. */
  line: number;
}

export interface JsonParseError {
  message: string;
  /** A suggestion for fixing the most common mistakes. */
  hint?: string;
  line: number;
  column: number;
  offset: number;
}

export interface JsonWarning {
  kind: 'precision' | 'duplicate-key' | 'bom';
  message: string;
  line?: number;
}

export type JsonParseResult =
  | { ok: true; value: JsonNode; warnings: JsonWarning[] }
  | { ok: false; error: JsonParseError };

// Character codes used by the scanner.
const C_TAB = 9;
const C_LF = 10;
const C_CR = 13;
const C_SPACE = 32;
const C_QUOTE = 34;
const C_COMMA = 44;
const C_MINUS = 45;
const C_SLASH = 47;
const C_COLON = 58;
const C_LBRACKET = 91;
const C_BACKSLASH = 92;
const C_RBRACKET = 93;
const C_LBRACE = 123;
const C_RBRACE = 125;
const C_BOM = 0xfeff;

const NUMBER_RE = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
const WORD_RE = /[A-Za-z_$][A-Za-z0-9_$]*/y;
const VALID_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);

/** Maximum warnings of one kind kept, so a huge file cannot flood the UI. */
const MAX_WARNINGS_PER_KIND = 20;

class ParseFailure extends Error {
  constructor(
    message: string,
    readonly offset: number,
    readonly hint?: string,
  ) {
    super(message);
  }
}

type Frame =
  | {
      t: 'obj';
      node: { kind: 'object'; members: JsonMember[] };
      state: 'keyOrEnd' | 'key' | 'colon' | 'value' | 'commaOrEnd';
      start: number;
      pendingKey?: { raw: string; value: string; line: number };
      seen: Set<string>;
    }
  | {
      t: 'arr';
      node: { kind: 'array'; items: JsonNode[] };
      state: 'valueOrEnd' | 'value' | 'commaOrEnd';
      start: number;
    };

function describeChar(text: string, i: number): string {
  if (i >= text.length) return 'end of input';
  const code = text.codePointAt(i) ?? 0;
  if (code === C_LF || code === C_CR) return 'a line break';
  if (code === C_TAB) return 'a tab';
  if (code < 32 || code === 0xa0 || code === C_BOM || (code >= 0x2000 && code <= 0x200b) || code === 0x3000) {
    return `the invisible character U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
  }
  return `'${String.fromCodePoint(code)}'`;
}

function lineAndColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text.charCodeAt(i) === C_LF) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: end - lineStart + 1 };
}

/** Hint for something that is not a valid value at `i`. */
function valueHint(text: string, i: number): { message: string; hint?: string } {
  const c = text.charCodeAt(i);
  if (Number.isNaN(c)) return { message: 'Unexpected end of input: a value is missing' };
  const ch = text[i];
  if (ch === "'") return { message: `Unexpected ${describeChar(text, i)}`, hint: 'JSON strings must use double quotes ("like this"), not single quotes.' };
  if (c === C_SLASH) return { message: `Unexpected ${describeChar(text, i)}`, hint: 'JSON does not allow comments. Remove // and /* */ comments.' };
  if (c === C_COMMA) return { message: `Unexpected ${describeChar(text, i)}`, hint: 'A value is missing before this comma, or there is an extra comma.' };
  if (ch === '+') return { message: `Unexpected ${describeChar(text, i)}`, hint: "JSON numbers cannot start with '+'. Remove it." };
  if (ch === '.') return { message: `Unexpected ${describeChar(text, i)}`, hint: 'JSON numbers need a digit before the decimal point, e.g. 0.5.' };
  WORD_RE.lastIndex = i;
  const word = WORD_RE.exec(text)?.[0];
  if (word) {
    if (word === 'NaN' || word === 'Infinity') return { message: `Unexpected '${word}'`, hint: `${word} is not valid JSON. Use null or a quoted string such as "${word}".` };
    if (word === 'undefined') return { message: "Unexpected 'undefined'", hint: 'undefined is not valid JSON. Use null or remove the property.' };
    if (word === 'True' || word === 'False' || word === 'None' || word === 'TRUE' || word === 'FALSE' || word === 'NULL' || word === 'Null') {
      return { message: `Unexpected '${word}'`, hint: 'JSON uses lowercase true, false and null.' };
    }
    return { message: `Unexpected '${word}'`, hint: 'Text values must be wrapped in double quotes.' };
  }
  return { message: `Unexpected ${describeChar(text, i)}` };
}

/** Parse JSON without losing any information. Never throws. */
export function parseJsonLossless(text: string): JsonParseResult {
  try {
    return parseOrThrow(text);
  } catch (e) {
    if (e instanceof ParseFailure) {
      const { line, column } = lineAndColumn(text, e.offset);
      return { ok: false, error: { message: e.message, hint: e.hint, line, column, offset: e.offset } };
    }
    throw e;
  }
}

function parseOrThrow(text: string): JsonParseResult {
  const n = text.length;
  const warnings: JsonWarning[] = [];
  const counts: Record<string, number> = {};
  const warn = (w: JsonWarning) => {
    counts[w.kind] = (counts[w.kind] ?? 0) + 1;
    if (counts[w.kind] <= MAX_WARNINGS_PER_KIND) warnings.push(w);
  };

  let i = 0;
  let line = 1;
  if (text.charCodeAt(0) === C_BOM) {
    i = 1;
    warn({ kind: 'bom', message: 'The text starts with an invisible byte-order mark (BOM). It was ignored; some JSON parsers reject it.' });
  }

  const skipWs = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === C_SPACE || c === C_TAB || c === C_CR) i++;
      else if (c === C_LF) {
        i++;
        line++;
      } else break;
    }
  };

  const readString = (): { raw: string; value: string } => {
    const start = i;
    i++; // opening quote
    let hasEscape = false;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === C_QUOTE) {
        i++;
        const raw = text.slice(start, i);
        return { raw, value: hasEscape ? (JSON.parse(raw) as string) : raw.slice(1, -1) };
      }
      if (c === C_BACKSLASH) {
        hasEscape = true;
        const next = text[i + 1];
        if (next === undefined) break;
        if (!VALID_ESCAPES.has(next)) {
          throw new ParseFailure(`Invalid escape '\\${next}' inside a string`, i, 'Valid escapes are \\" \\\\ \\/ \\b \\f \\n \\r \\t and \\u followed by 4 hex digits. Write a literal backslash as \\\\.');
        }
        if (next === 'u') {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            throw new ParseFailure('Invalid \\u escape inside a string', i, '\\u must be followed by exactly 4 hex digits.');
          }
          i += 6;
        } else {
          i += 2;
        }
        continue;
      }
      if (c < 32) {
        throw new ParseFailure(
          `Unescaped ${describeChar(text, i)} inside a string`,
          i,
          c === C_LF || c === C_CR
            ? 'A string cannot span lines. Close the quote on the same line, or write the line break as \\n.'
            : 'Control characters must be escaped, e.g. a tab as \\t.',
        );
      }
      i++;
    }
    throw new ParseFailure('Unterminated string: the closing double quote is missing', start, 'Add the missing " at the end of the text value.');
  };

  const readScalar = (): JsonNode => {
    const c = text.charCodeAt(i);
    if (c === C_QUOTE) {
      const s = readString();
      return { kind: 'string', raw: s.raw, value: s.value };
    }
    if (c === C_MINUS || (c >= 48 && c <= 57)) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(text);
      if (!m) {
        const hint = c === C_MINUS && text.startsWith('Infinity', i + 1)
          ? '-Infinity is not valid JSON. Use null or a quoted string.'
          : 'A minus sign must be followed by a number.';
        throw new ParseFailure(`Invalid number`, i, hint);
      }
      const raw = m[0];
      const after = text[i + raw.length];
      if (after !== undefined && /[0-9]/.test(after) && /^-?0$/.test(raw)) {
        throw new ParseFailure('Numbers cannot have leading zeros', i, 'Write 7 instead of 07, or quote the value ("07") if the zeros matter, as in a zip code.');
      }
      if (after === '.') throw new ParseFailure('A decimal point must be followed by digits', i + raw.length, 'Write 1.0 or 1 instead of 1.');
      if (after === 'x' || after === 'X') throw new ParseFailure('Hexadecimal numbers are not valid JSON', i, 'Convert the number to decimal or quote it as a string.');
      if (after !== undefined && /[A-Za-z0-9_$]/.test(after)) {
        throw new ParseFailure(`Unexpected ${describeChar(text, i + raw.length)} after a number`, i + raw.length, 'Text values must be wrapped in double quotes.');
      }
      i += raw.length;
      const lossy = jsRendering(raw);
      if (lossy !== null) {
        warn({
          kind: 'precision',
          message: `${raw} cannot be stored exactly by JavaScript (it would become ${lossy}). It is kept exactly as written here, but many tools will change it.`,
          line,
        });
      }
      return { kind: 'number', raw };
    }
    for (const lit of ['true', 'false', 'null'] as const) {
      if (text.startsWith(lit, i)) {
        const after = text[i + lit.length];
        if (after === undefined || !/[A-Za-z0-9_$]/.test(after)) {
          i += lit.length;
          return { kind: 'literal', raw: lit };
        }
      }
    }
    const { message, hint } = valueHint(text, i);
    throw new ParseFailure(message, i, hint);
  };

  const stack: Frame[] = [];
  let root: JsonNode | undefined;

  /** Attach a finished value to its parent, or make it the root. */
  const attach = (v: JsonNode) => {
    const top = stack[stack.length - 1];
    if (!top) {
      root = v;
      return;
    }
    if (top.t === 'obj') {
      const key = top.pendingKey!;
      if (top.seen.has(key.value)) {
        warn({
          kind: 'duplicate-key',
          message: `Duplicate key ${key.raw} on line ${key.line}. Both copies are kept here, but most JSON parsers keep only the last one.`,
          line: key.line,
        });
      } else {
        top.seen.add(key.value);
      }
      top.node.members.push({ keyRaw: key.raw, key: key.value, value: v, line: key.line });
      top.pendingKey = undefined;
    } else {
      top.node.items.push(v);
    }
    top.state = 'commaOrEnd';
  };

  /** Start a value: push a container frame, or read and attach a scalar. */
  const startValue = () => {
    const c = text.charCodeAt(i);
    if (c === C_LBRACE) {
      stack.push({ t: 'obj', node: { kind: 'object', members: [] }, state: 'keyOrEnd', start: i, seen: new Set() });
      i++;
    } else if (c === C_LBRACKET) {
      stack.push({ t: 'arr', node: { kind: 'array', items: [] }, state: 'valueOrEnd', start: i });
      i++;
    } else {
      attach(readScalar());
    }
  };

  const closeTop = () => {
    const f = stack.pop()!;
    i++;
    attach(f.node);
  };

  while (true) {
    skipWs();
    const f = stack[stack.length - 1];
    if (!f) {
      if (root !== undefined) break;
      if (i >= n) throw new ParseFailure('The input is empty or contains only whitespace', i);
      startValue();
      continue;
    }
    if (i >= n) {
      const opener = f.t === 'obj' ? '{' : '[';
      const closer = f.t === 'obj' ? '}' : ']';
      const at = lineAndColumn(text, f.start);
      throw new ParseFailure(
        `Unexpected end of input: missing '${closer}'`,
        i,
        `The ${f.t === 'obj' ? 'object' : 'array'} opened with '${opener}' on line ${at.line}, column ${at.column} is never closed.`,
      );
    }
    const c = text.charCodeAt(i);
    if (f.t === 'obj') {
      switch (f.state) {
        case 'keyOrEnd':
        case 'key': {
          if (c === C_RBRACE) {
            if (f.state === 'key') throw new ParseFailure("Unexpected '}' after a comma", i, 'Trailing comma: JSON does not allow a comma before }. Remove the last comma.');
            closeTop();
            break;
          }
          if (c !== C_QUOTE) {
            const ch = text[i];
            let hint = 'Property names must be wrapped in double quotes, e.g. {"name": "value"}.';
            if (ch === "'") hint = 'Property names must use double quotes, not single quotes.';
            else if (c === C_SLASH) hint = 'JSON does not allow comments. Remove // and /* */ comments.';
            else if (c === C_COMMA) hint = 'There is an extra comma here.';
            throw new ParseFailure(`Expected a property name in double quotes but found ${describeChar(text, i)}`, i, hint);
          }
          const keyLine = line;
          const s = readString();
          f.pendingKey = { raw: s.raw, value: s.value, line: keyLine };
          f.state = 'colon';
          break;
        }
        case 'colon':
          if (c !== C_COLON) throw new ParseFailure(`Expected ':' after the property name but found ${describeChar(text, i)}`, i, 'Separate each property name from its value with a colon.');
          i++;
          f.state = 'value';
          break;
        case 'value':
          if (c === C_RBRACE || c === C_COMMA) throw new ParseFailure(`Expected a value but found ${describeChar(text, i)}`, i, 'A value is missing after the colon.');
          startValue();
          break;
        case 'commaOrEnd':
          if (c === C_COMMA) {
            i++;
            f.state = 'key';
          } else if (c === C_RBRACE) {
            closeTop();
          } else {
            const hint = c === C_QUOTE ? 'A comma is missing between two properties.' : c === C_SLASH ? 'JSON does not allow comments.' : undefined;
            throw new ParseFailure(`Expected ',' or '}' but found ${describeChar(text, i)}`, i, hint);
          }
          break;
      }
    } else {
      switch (f.state) {
        case 'valueOrEnd':
        case 'value':
          if (c === C_RBRACKET) {
            if (f.state === 'value') throw new ParseFailure("Unexpected ']' after a comma", i, 'Trailing comma: JSON does not allow a comma before ]. Remove the last comma.');
            closeTop();
            break;
          }
          startValue();
          break;
        case 'commaOrEnd':
          if (c === C_COMMA) {
            i++;
            f.state = 'value';
          } else if (c === C_RBRACKET) {
            closeTop();
          } else {
            const hint = c === C_QUOTE || c === C_LBRACE || c === C_LBRACKET || (c >= 48 && c <= 57) ? 'A comma is missing between two items.' : undefined;
            throw new ParseFailure(`Expected ',' or ']' but found ${describeChar(text, i)}`, i, hint);
          }
          break;
      }
    }
  }

  if (i < n) {
    throw new ParseFailure(
      `Unexpected ${describeChar(text, i)} after the end of the JSON value`,
      i,
      'JSON holds a single value. Wrap several values in an array [ ... ], or remove the extra text.',
    );
  }
  return { ok: true, value: root as JsonNode, warnings };
}

// ---------------------------------------------------------------------------
// Number precision
// ---------------------------------------------------------------------------

/** Decimal value as normalised significant digits and a power of ten. */
function normalizeDecimal(s: string): { neg: boolean; digits: string; exp: number } {
  let t = s.trim();
  let neg = false;
  if (t.startsWith('-')) {
    neg = true;
    t = t.slice(1);
  } else if (t.startsWith('+')) {
    t = t.slice(1);
  }
  let exp = 0;
  const e = t.search(/[eE]/);
  if (e >= 0) {
    exp = parseInt(t.slice(e + 1), 10);
    t = t.slice(0, e);
  }
  const dot = t.indexOf('.');
  const intPart = dot >= 0 ? t.slice(0, dot) : t;
  const fracPart = dot >= 0 ? t.slice(dot + 1) : '';
  let digits = intPart + fracPart;
  exp += intPart.length;
  const lead = digits.match(/^0*/)![0].length;
  digits = digits.slice(lead);
  exp -= lead;
  digits = digits.replace(/0+$/, '');
  if (digits === '') return { neg: false, digits: '', exp: 0 };
  return { neg, digits, exp };
}

/**
 * How JavaScript would print the number literal `raw`, or null when that is
 * the same decimal value (so nothing is lost by reading it as a JS number).
 * "1.10" -> null (same value), "9007199254740993" -> "9007199254740992",
 * "1e400" -> "Infinity".
 */
export function jsRendering(raw: string): string | null {
  const v = Number(raw);
  if (!Number.isFinite(v)) return v > 0 ? 'Infinity' : v < 0 ? '-Infinity' : 'NaN';
  if (/^-?[0-9]+$/.test(raw)) {
    // Integers: exact when the double holds precisely this integer (e.g. 2^60).
    return BigInt(raw) === BigInt(v) ? null : String(v);
  }
  const a = normalizeDecimal(raw);
  const b = normalizeDecimal(String(v));
  return a.neg === b.neg && a.digits === b.digits && a.exp === b.exp ? null : String(v);
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

export interface PrintOptions {
  /** Spaces per level; 0 prints minified JSON. */
  indent: number;
  /** Sort object members by key (stable; duplicates keep their order). */
  sortKeys?: boolean;
}

function sortedMembers(members: JsonMember[]): JsonMember[] {
  return [...members].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** Print a parsed document. Literals are emitted exactly as they were written. */
export function printJson(root: JsonNode, opts: PrintOptions): string {
  const indent = Math.max(0, Math.floor(opts.indent));
  const nl = indent ? '\n' : '';
  const colon = indent ? ': ' : ':';
  const pads: string[] = [''];
  const pad = (depth: number) => {
    if (!indent) return '';
    while (pads.length <= depth) pads.push(' '.repeat(indent * pads.length));
    return pads[depth];
  };

  const out: string[] = [];
  const stack: Array<string | [JsonNode, number]> = [[root, 0]];
  while (stack.length) {
    const item = stack.pop()!;
    if (typeof item === 'string') {
      out.push(item);
      continue;
    }
    const [node, depth] = item;
    switch (node.kind) {
      case 'object': {
        if (node.members.length === 0) {
          out.push('{}');
          break;
        }
        const members = opts.sortKeys ? sortedMembers(node.members) : node.members;
        stack.push(nl + pad(depth) + '}');
        for (let k = members.length - 1; k >= 0; k--) {
          stack.push([members[k].value, depth + 1]);
          stack.push((k ? ',' : '') + nl + pad(depth + 1) + members[k].keyRaw + colon);
        }
        out.push('{');
        break;
      }
      case 'array': {
        if (node.items.length === 0) {
          out.push('[]');
          break;
        }
        stack.push(nl + pad(depth) + ']');
        for (let k = node.items.length - 1; k >= 0; k--) {
          stack.push([node.items[k], depth + 1]);
          stack.push((k ? ',' : '') + nl + pad(depth + 1));
        }
        out.push('[');
        break;
      }
      default:
        out.push(node.raw);
    }
  }
  return out.join('');
}

// ---------------------------------------------------------------------------
// Conversion helpers for the other tools
// ---------------------------------------------------------------------------

/** Shape summary for the stats cards. */
export function describeTopLevel(node: JsonNode): { type: string; keys: number } {
  switch (node.kind) {
    case 'object':
      return { type: 'Object', keys: node.members.length };
    case 'array':
      return { type: 'Array', keys: node.items.length };
    case 'string':
      return { type: 'string', keys: 0 };
    case 'number':
      return { type: 'number', keys: 0 };
    default:
      return { type: node.raw === 'null' ? 'null' : 'boolean', keys: 0 };
  }
}

/**
 * Convert to plain JavaScript values for libraries that need them (js-yaml).
 * Objects have a null prototype so a "__proto__" key survives as data.
 * Duplicate keys keep the last value, as JSON.parse does. Numbers that
 * JavaScript cannot hold exactly are reported through `onLossy`.
 */
export function toJsValue(root: JsonNode, onLossy?: (raw: string, becomes: string) => void): unknown {
  const convert = (node: JsonNode): unknown => {
    switch (node.kind) {
      case 'string':
        return node.value;
      case 'number': {
        const lossy = jsRendering(node.raw);
        if (lossy !== null) onLossy?.(node.raw, lossy);
        return Number(node.raw);
      }
      case 'literal':
        return node.raw === 'null' ? null : node.raw === 'true';
      default:
        return undefined; // containers are handled below
    }
  };

  // Iterative to match the parser: deep documents must not overflow the stack.
  const make = (node: JsonNode): unknown =>
    node.kind === 'object' ? Object.create(null) : node.kind === 'array' ? new Array(node.items.length) : convert(node);
  const result = make(root);
  const work: Array<[JsonNode, unknown]> = [[root, result]];
  while (work.length) {
    const [node, target] = work.pop()!;
    if (node.kind === 'object') {
      const obj = target as Record<string, unknown>;
      for (const m of node.members) {
        const v = make(m.value);
        obj[m.key] = v;
        if (m.value.kind === 'object' || m.value.kind === 'array') work.push([m.value, v]);
      }
    } else if (node.kind === 'array') {
      const arr = target as unknown[];
      node.items.forEach((item, idx) => {
        const v = make(item);
        arr[idx] = v;
        if (item.kind === 'object' || item.kind === 'array') work.push([item, v]);
      });
    }
  }
  return result;
}

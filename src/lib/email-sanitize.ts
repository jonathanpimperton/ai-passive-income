/**
 * Server-side sanitisation for "Email my results" rows (used by worker.ts).
 *
 * The results email goes out from hello@calcrun.com, so nothing a client sends may be
 * rendered as free text:
 *  - LABELS are rendered only when they match the tool's `labels` templates in
 *    tool-registry.ts.
 *  - VALUES are rendered only when they match one of the tool's `values` phrase templates
 *    (or a shared phrase such as "N/A"), or when they are a short, well-formed figure:
 *    an amount, percentage, duration or unit value with at most two numbers.
 *    Digit runs that are not ONE well-formed number, two numbers joined by phone-style
 *    separators without a currency or percent sign on each, and long figures with no
 *    currency, percent or unit marker (phone-number shapes such as "0800 123 4567",
 *    "+44 1,234,567", dotted quads) never pass, and neither do words outside a small
 *    unit vocabulary.
 * Rows that fail are dropped (not rendered), and the count is reported to the caller.
 *
 * Template syntax (labels and value phrases):
 *  - `{n}`        one well-formed number: optional sign and currency symbol, then either
 *                 1-3 digits with ","/"." thousands groups and an optional decimal part,
 *                 or up to 5 digits with an optional decimal part; optional trailing
 *                 "%", currency or cent sign
 *  - `{money}`    like `{n}` but a currency sign is required (before or after the digits)
 *  - `{pct}`      like `{n}` but a percent sign is required
 *  - `{dur}`      a duration such as "29 years 10 months", "6 yrs 2 mo", "10 months"
 *  - `{month}`    an English month name
 *  - `{taxcode}`  a UK PAYE tax code shape such as 1257L, S1257L, K475, BR, D0, 0T (W1/M1/X)
 *  - `{a|b|c}`    one of the listed literal phrases
 *  - `{item}`     labels only: a user-named row; the user's text is NEVER rendered, it is
 *                 replaced by "<itemNoun> <n>"
 *
 * Pure module: no DOM, no Workers APIs, so it runs in vitest and in the Worker.
 */
import { TOOL_REGISTRY, isKnownTool } from './tool-registry';

export interface EmailRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export const MAX_LABEL_CHARS = 120;
/** Longest value accepted at all (phrase templates can be sentence-length). */
export const MAX_VALUE_CHARS = 160;
/** Longest value accepted by the free numeric grammar (no phrase template). */
export const MAX_NUMERIC_VALUE_CHARS = 40;

// Format, bidi, zero-width, variation-selector and other invisible code points.
// eslint-disable-next-line no-control-regex
const INVISIBLE_RE = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFFB]|[\u{E0000}-\u{E007F}]|[\u{E0100}-\u{E01EF}]/gu;

/**
 * Normalise client text: NFKC (folds full-width and other look-alike forms, and turns
 * no-break spaces into spaces), drop invisible/bidi/control characters, collapse
 * whitespace (including CR/LF), trim.
 */
export function cleanText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\t\n\v\f\r\u0085\u2028\u2029]/g, ' ')
    .replace(INVISIBLE_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* -- Template tokens ------------------------------------------------------- */

/** Digits of one well-formed number (no sign, no symbols). */
const DIGITS_SRC = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,4})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?|\d{1,5}(?:[.,]\d{1,4})?)`;
const WELL_FORMED_RE = new RegExp(`^${DIGITS_SRC}$`);

/** `{n}`: one well-formed number with optional sign, currency prefix and %/currency/cent suffix. */
const NUM_SRC = String.raw`[-+\u2212]?(?:[\u00A3$\u20AC] ?)?${DIGITS_SRC}(?: ?[\u00A3\u20AC\u00A2%])?`;
/** `{money}`: a currency sign is required. `{pct}`: a percent sign is required. */
const MONEY_SRC = String.raw`[-+\u2212]?(?:[\u00A3$\u20AC] ?${DIGITS_SRC}|${DIGITS_SRC} ?[\u00A3\u20AC])`;
const PCT_SRC = String.raw`[-+\u2212]?${DIGITS_SRC} ?%`;
const DUR_SRC = String.raw`\d{1,3} (?:years?|yrs?|months?|mo)(?:,? \d{1,2} (?:months?|mo))?`;
const MONTH_SRC = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const TAXCODE_SRC = String.raw`[SC]?(?:\d{1,4}[LMNT]|K\d{1,4}|BR|D[0-2]|NT|0T)(?: ?(?:W1|M1|X))?`;

interface Compiled {
  template: string;
  re: RegExp;
  /** No tokens: rendered exactly as written in the registry. */
  exact: boolean;
  /** Has `{item}`: rendered as "<noun> <index>" in place of the user's text. */
  hasItem: boolean;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Compile a label or value template. `{item}` is only allowed when `allowItem`. */
export function compileTemplate(template: string, allowItem = true): Compiled {
  let src = '';
  let tokens = 0;
  let hasItem = false;
  for (const part of template.split(/(\{[^}]+\})/)) {
    if (!part) continue;
    if (part.startsWith('{') && part.endsWith('}')) {
      tokens++;
      const inner = part.slice(1, -1);
      if (inner === 'n') src += `(?:${NUM_SRC})`;
      else if (inner === 'money') src += `(?:${MONEY_SRC})`;
      else if (inner === 'pct') src += `(?:${PCT_SRC})`;
      else if (inner === 'dur') src += `(?:${DUR_SRC})`;
      else if (inner === 'month') src += MONTH_SRC;
      else if (inner === 'taxcode') src += `(?:${TAXCODE_SRC})`;
      else if (inner === 'item') {
        if (!allowItem) throw new Error(`{item} is not allowed in value templates: ${template}`);
        src += '(.{1,80}?)';
        hasItem = true;
      } else src += '(?:' + inner.split('|').map(escapeRe).join('|') + ')';
    } else {
      src += escapeRe(part);
    }
  }
  return { template, re: new RegExp('^' + src + '$', 'i'), exact: tokens === 0, hasItem };
}

/** Backwards-compatible name used by the tests. */
export const compileLabel = (template: string) => compileTemplate(template, true);

/* -- Values ---------------------------------------------------------------- */

/** Phrases any tool may send (shared option and empty-state words). */
export const GLOBAL_VALUE_PHRASES = ['N/A', 'n/a', 'None', 'Yes', 'No', 'Never', '{n}+ years', '--'];

/** Characters the free numeric grammar allows (phrases can contain more). */
const NUMERIC_CHARS_RE = /^[A-Za-z0-9 \u00A3$\u20AC\u00A2%.,()+\-\u2013\u2212/~]+$/;

/** Unit words a free numeric value may contain (lower-case). Nothing else. */
const UNIT_WORDS = new Set([
  'year', 'years', 'yr', 'yrs', 'y', 'month', 'months', 'mo', 'mos', 'week', 'weeks', 'day', 'days',
  'hr', 'hrs', 'hour', 'hours', 'kwh', 'kwp', 'kw', 'p', 'c', 'x', 'k', 'm', 'bn', 'min',
]);
/** A number glued to a unit, such as "28p", "4x", "3y", "2mo", "50k". */
const NUMBER_UNIT_RE = /^\d+(?:y|yr|yrs|mo|mos|p|c|x|k|m|bn|kwh|kwp|kw|hr|hrs)$/i;
const TAXCODE_TOKEN_RE = /^(?:[SC]?(?:\d{1,4}[LMNT]|K\d{1,4}|BR|D[0-2]|NT|0T)|W1|M1)$/i;
/** Text between two numbers with no letters or digits in it: spaces, hyphens, dots, signs, brackets. */
const PHONE_GAP_RE = /^[^A-Za-z0-9]*$/;
/** Most digits a figure may have when it carries no currency, percent or unit marker. */
const MAX_PLAIN_DIGITS = 7;

type FigureKind = 'money' | 'unit' | 'plain';

/**
 * How a digit run is anchored in the value: a currency sign directly before it, a
 * percent/currency/cent sign directly after it (not the prefix of the next number), a unit
 * word directly after it, or nothing ("plain"). Thousands grouping is NOT an anchor.
 */
function figureKind(value: string, start: number, end: number): FigureKind {
  if (/[\u00a3$\u20ac] ?$/.test(value.slice(0, start))) return 'money';
  const suffix = /^ ?([%\u00a3\u20ac\u00a2])( ?\d)?/.exec(value.slice(end));
  if (suffix && (suffix[1] === '%' || suffix[2] === undefined)) return 'money';
  return /^ ?[A-Za-z]/.test(value.slice(end)) ? 'unit' : 'plain';
}

/**
 * Free numeric grammar: a short amount / percentage / duration / unit value.
 * Exported for tests; the worker uses isSafeValue().
 *
 * Phone-number shapes never pass: each digit run must be ONE well-formed number; at most
 * two numbers; two numbers with no letters between them must both
 * be money or percent figures, or the second one glued to a unit word; and a figure with no currency,
 * percent or unit marker has at most 7 digits (so "192.168.100.200" and "+44 7911123456"
 * fail). Comma or dot grouping is not a marker. A dot-grouped figure with a currency sign,
 * such as the German "192.168.100.200 EUR" form, is a legitimate amount and passes.
 */
export function isNumericValue(value: string): boolean {
  if (!value || value.length > MAX_NUMERIC_VALUE_CHARS) return false;
  if (!NUMERIC_CHARS_RE.test(value)) return false;
  if (/[A-Za-z]\s*\.\s*[A-Za-z]/.test(value)) return false;

  const tokens = value.match(/[A-Za-z0-9]+/g) ?? [];
  if (tokens.length === 0) return false; // punctuation only, for example "(+-.)"
  let taxCodeOnly = true;
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      taxCodeOnly = false;
      continue;
    }
    if (TAXCODE_TOKEN_RE.test(token)) continue;
    taxCodeOnly = false;
    if (/^[A-Za-z]+$/.test(token) ? UNIT_WORDS.has(token.toLowerCase()) : NUMBER_UNIT_RE.test(token)) continue;
    return false;
  }

  const runs = [...value.matchAll(/\d(?:[\d.,]*\d)?/g)];
  if (runs.length === 0) return taxCodeOnly;
  if (runs.length > 2) return false;
  for (const r of runs) if (!WELL_FORMED_RE.test(r[0])) return false;
  const digitCount = (r: RegExpMatchArray) => r[0].replace(/\D/g, '').length;
  const kinds = runs.map((r) => figureKind(value, r.index ?? 0, (r.index ?? 0) + r[0].length));
  for (const [i, r] of runs.entries()) {
    if (kinds[i] === 'plain' && digitCount(r) > MAX_PLAIN_DIGITS) return false;
  }
  if (runs.length === 2) {
    const [a, b] = runs;
    const gap = value.slice((a.index ?? 0) + a[0].length, b.index ?? 0);
    // Two numbers joined only by phone-style separators: each must be anchored.
    if (PHONE_GAP_RE.test(gap) && kinds.includes('plain')) return false;
    // Two counts with no money in them ("3 yrs 2 mo") are short; longer pairs look like phone numbers.
    if (!kinds.includes('money') && digitCount(a) + digitCount(b) > 6) return false;
  }
  return true;
}

const valueCache = new Map<string, Compiled[]>();
function valuePhrasesFor(slug: string): Compiled[] {
  let list = valueCache.get(slug);
  if (!list) {
    const own = isKnownTool(slug) ? TOOL_REGISTRY[slug].values ?? [] : [];
    list = [...GLOBAL_VALUE_PHRASES, ...own].map((t) => compileTemplate(t, false));
    valueCache.set(slug, list);
  }
  return list;
}

/** True when an already-cleaned value may be rendered in `slug`'s results email. */
export function isSafeValue(slug: string, value: string): boolean {
  if (!value || value.length > MAX_VALUE_CHARS) return false;
  if (valuePhrasesFor(slug).some((c) => c.re.test(value))) return true;
  return isNumericValue(value);
}

/* -- Labels ---------------------------------------------------------------- */

const labelCache = new Map<string, Compiled[]>();
function labelsFor(slug: string): Compiled[] {
  let list = labelCache.get(slug);
  if (!list) {
    const all = TOOL_REGISTRY[slug].labels.map((t) => compileTemplate(t, true));
    // Exact labels win over templates (so "Total Debt" never becomes "{item} ...").
    list = [...all.filter((c) => c.exact), ...all.filter((c) => !c.exact)];
    labelCache.set(slug, list);
  }
  return list;
}

/** Per-request state for `{item}` renaming. */
export interface LabelContext {
  items: Map<string, number>;
}

export function newLabelContext(): LabelContext {
  return { items: new Map() };
}

/**
 * Map a cleaned client label to the label to render, or null when it is not allowed.
 * Exact entries return the registry text (a case-sensitive match is preferred, so two
 * entries that differ only in case render as sent); token templates return the
 * validated client text; `{item}` templates return "<noun> <n> <suffix>".
 */
export function matchLabel(slug: string, label: string, ctx: LabelContext): string | null {
  if (!isKnownTool(slug) || !label || label.length > MAX_LABEL_CHARS) return null;
  const list = labelsFor(slug);
  const sameCase = list.find((c) => c.exact && c.template === label);
  if (sameCase) return sameCase.template;
  for (const c of list) {
    const m = c.re.exec(label);
    if (!m) continue;
    if (c.exact) return c.template;
    if (c.hasItem) {
      const key = m[1].toLowerCase();
      let idx = ctx.items.get(key);
      if (idx === undefined) {
        idx = ctx.items.size + 1;
        ctx.items.set(key, idx);
      }
      const noun = TOOL_REGISTRY[slug].itemNoun ?? 'Item';
      return c.template.replace('{item}', `${noun} ${idx}`);
    }
    return label;
  }
  return null;
}

/* -- Rows ------------------------------------------------------------------ */

export interface SanitizedRows {
  inputs: EmailRow[];
  results: EmailRow[];
  /** Number of client rows that were dropped (bad shape, label not allowed, unsafe value). */
  dropped: number;
}

function readRow(raw: unknown): { label: string; value: string; highlight: boolean } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.label !== 'string' || typeof r.value !== 'string') return null;
  // Over-long raw text is dropped, never truncated (truncation can leave partial text).
  if (r.label.length > MAX_LABEL_CHARS * 2 || r.value.length > MAX_VALUE_CHARS * 2) return null;
  return { label: cleanText(r.label), value: cleanText(r.value), highlight: r.highlight === true };
}

/**
 * Sanitise client rows for `slug` (which must already be a known tool). Only the first
 * highlighted RESULT keeps its highlight; inputs are never highlighted.
 */
export function sanitizeRows(slug: string, rawInputs: unknown[], rawResults: unknown[]): SanitizedRows {
  const ctx = newLabelContext();
  let dropped = 0;
  const convert = (rows: unknown[], allowHighlight: boolean): EmailRow[] => {
    const out: EmailRow[] = [];
    for (const raw of rows) {
      const row = readRow(raw);
      const label = row ? matchLabel(slug, row.label, ctx) : null;
      if (!row || !label || !isSafeValue(slug, row.value)) {
        dropped++;
        continue;
      }
      const item: EmailRow = { label, value: row.value };
      if (allowHighlight && row.highlight && !out.some((o) => o.highlight)) item.highlight = true;
      out.push(item);
    }
    return out;
  };
  const inputs = convert(rawInputs, false);
  const results = convert(rawResults, true);
  return { inputs, results, dropped };
}

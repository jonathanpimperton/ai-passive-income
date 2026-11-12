/**
 * Server-side sanitisation for "Email my results" rows (used by worker.ts).
 *
 * The results email goes out from hello@calcrun.com, so nothing a client sends may be
 * rendered as free text:
 *  - LABELS are rendered only when they match the tool's allowlist in tool-registry.ts.
 *  - VALUES must be numeric / currency / percent / duration text, or short option text
 *    built only from the fixed VALUE_WORDS vocabulary below. URLs, e-mail addresses,
 *    domain-like text, bidi controls and zero-width characters never pass.
 * Rows that fail are dropped (not rendered), and the count is reported to the caller.
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
export const MAX_VALUE_CHARS = 80;

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

/* \u2500\u2500 Values \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/** Characters a value may contain after cleanText(). No ':', '@', '#', '?', '=', '_' or quotes. */
const VALUE_CHARS_RE = /^[A-Za-z0-9 \u00A3$\u20AC\u00A2%.,()+\-\u2013\u2014\u2212/&!<>\u2264\u2265'~]+$/;

/**
 * Every alphabetic word in a value must be one of these (lower-case). They cover units,
 * durations and the option labels the calculators send (strategy, filing status, tax band,
 * student-loan plan, buyer type, compounding, region...). Deliberately excludes anything a
 * general-purpose message needs (verify, click, login, account, call, visit, link...).
 */
export const VALUE_WORDS = new Set<string>([
  // units and durations
  'year', 'years', 'yr', 'yrs', 'month', 'months', 'mo', 'mos', 'week', 'weeks', 'day', 'days',
  'hr', 'hrs', 'hour', 'hours', 'age', 'kwh', 'kwp', 'kw', 'p', 'x', 'k', 'm', 'bn', 'min', 'max',
  'base', 'per', 'n', 'a', 'na',
  // compounding and timing
  'annually', 'semi', 'quarterly', 'monthly', 'weekly', 'daily', 'end', 'beginning', 'of', 'period',
  // modes and strategies
  'avalanche', 'snowball', 'highest', 'lowest', 'rate', 'first', 'balance', 'historical', 'future',
  'projection', 'amount', 'contribution', 'return', 'starting', 'time', 'target', 'required',
  'savings', 'needed', 'goal', 'solve',
  // filing status, country, tax band, region
  'single', 'married', 'filing', 'jointly', 'separately', 'joint', 'head', 'household', 'qualifying',
  'surviving', 'spouse', 'united', 'states', 'kingdom', 'long', 'short', 'term', 'basic', 'higher',
  'additional', 'intermediate', 'starter', 'advanced', 'top', 'scotland', 'scottish', 'wales',
  'england', 'northern', 'ireland', 'rest', 'uk', 'us', 'eu',
  // UK student loans, pensions, tax codes
  'plan', 'pre', 'post', 'postgraduate', 'loan', 'student', 'salary', 'sacrifice', 'relief', 'net',
  'pay', 'source', 'br', 'nt', 'sbr', 'cbr', 'cnt', 'snt', 'emergency', 'code',
  // car finance and property
  'pcp', 'hp', 'hire', 'purchase', 'personal', 'cash', 'buyer', 'moving', 'home', 'property',
  'standard', 'non', 'resident', 'battery', 'included', 'tariff',
  // states and connectives used in result text
  'no', 'none', 'yes', 'from', 'not', 'reachable', 'never', 'already', 'funded', 'adjust', 'inputs',
  'to', 'see', 'results', 'paid', 'off', 'or', 'more', 'over', 'under', 'than', 'and', 'the', 'in',
  'on', 'with', 'without', 'payment', 'payments', 'below', 'interest', 'covered', 'cover', 'does',
  'only', 'minimum', 'fixed', 'percent', 'total', 'free', 'debt', 'income', 'gain', 'loss', 'exempt',
  'allowance', 'taxable', 'tax', 'deposit', 'down',
  // US salary tax-year and age options (W1-TAX)
  'paycheck', 'paychecks', 'one', 'both',
  // UK salary and stamp duty options (W1-UK)
  'arrangement', 'recognised', 'used', 'less',
]);

/** Short alphanumeric codes such as UK tax codes (1257L, S1257L, K475, D0) or "28p". */
const SHORT_CODE_RE = /^[A-Za-z]{0,2}\d{1,5}[A-Za-z]{0,3}$/;

/** True when an already-cleaned value is safe to render in the email. */
export function isSafeValue(value: string): boolean {
  if (!value || value.length > MAX_VALUE_CHARS) return false;
  if (!VALUE_CHARS_RE.test(value)) return false;
  // Belt and braces: anything URL-, address- or domain-shaped.
  if (/www|https?|ftp|mailto/i.test(value)) return false;
  if (/[A-Za-z]\s*\.\s*[A-Za-z]/.test(value)) return false;
  for (const token of value.match(/[A-Za-z0-9]+/g) ?? []) {
    if (/^\d+$/.test(token)) continue;
    if (/^[A-Za-z]+$/.test(token)) {
      if (!VALUE_WORDS.has(token.toLowerCase())) return false;
      continue;
    }
    if (!SHORT_CODE_RE.test(token)) return false;
  }
  return true;
}

/* \u2500\u2500 Labels \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/** One numeric token: pound, dollar, euro or cent amounts such as "1,500,001", "1.234 EUR", "12%", "-50", "2000". */
const NUM_SRC = String.raw`[-+\u2212]?(?:[\u00A3$\u20AC\u00A2] ?)?\d+(?:[.,]\d+)*(?: ?[\u00A3$\u20AC\u00A2%])?`;

interface CompiledLabel {
  template: string;
  re: RegExp;
  /** Exact templates render as written in the registry. */
  exact: boolean;
  /** Templates with `{item}` render "<noun> <index>" in place of the user's text. */
  hasItem: boolean;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compileLabel(template: string): CompiledLabel {
  let src = '';
  let tokens = 0;
  let hasItem = false;
  for (const part of template.split(/(\{[^}]+\})/)) {
    if (!part) continue;
    if (part.startsWith('{') && part.endsWith('}')) {
      tokens++;
      const inner = part.slice(1, -1);
      if (inner === 'n') src += `(?:${NUM_SRC})`;
      else if (inner === 'item') {
        src += '(.{1,80}?)';
        hasItem = true;
      } else src += '(?:' + inner.split('|').map(escapeRe).join('|') + ')';
    } else {
      src += escapeRe(part);
    }
  }
  return { template, re: new RegExp('^' + src + '$', 'i'), exact: tokens === 0, hasItem };
}

const compiledCache = new Map<string, CompiledLabel[]>();
function compiledFor(slug: string): CompiledLabel[] {
  let list = compiledCache.get(slug);
  if (!list) {
    const all = TOOL_REGISTRY[slug].labels.map(compileLabel);
    // Exact labels win over templates (so "Total Debt" never becomes "{item} ...").
    list = [...all.filter((c) => c.exact), ...all.filter((c) => !c.exact)];
    compiledCache.set(slug, list);
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
 * Exact entries return the registry text; numeric templates return the (validated)
 * client text; `{item}` templates return "<noun> <n> <suffix>".
 */
export function matchLabel(slug: string, label: string, ctx: LabelContext): string | null {
  if (!isKnownTool(slug) || !label || label.length > MAX_LABEL_CHARS) return null;
  for (const c of compiledFor(slug)) {
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

/* \u2500\u2500 Rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
      if (!row || !label || !isSafeValue(row.value)) {
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

/**
 * Drift guard for the results-email allowlist (tool-registry.ts + email-sanitize.ts).
 *
 * Scans every calculator that renders <EmailResultsButton>: each label AND value its
 * getInputs()/getResults() can send is expanded into concrete samples (string literals,
 * ternaries, template literals with sample numbers, known helpers) and checked against
 * what the worker will render. A failure means the worker would silently DROP that row
 * (and if it is the only result, refuse the whole email). Fix it by adding the label or
 * value phrase to TOOL_REGISTRY[slug] in src/lib/tool-registry.ts; if the message says
 * "new dynamic expression", also list the expression's possible outputs in DYNAMIC below
 * (or, when the outputs live in the calculator's own source, in FROM_SOURCE).
 *
 * Rows built by shared helpers (pushed rather than written as object literals) must be
 * listed in ROW_HELPERS; the test calls the real helper with representative settings.
 *
 * Money and percentage samples come from the real formatters (result-format.ts,
 * calculator-utils.ts) in USD, GBP and EUR, and every sample goes through cleanText()
 * first, exactly as the worker does. Calculators that use the guarded formatters also get
 * their extreme outputs ("Over $1 trillion", "Over 1,000,000%") as top-level values.
 * Known blind spot: an identifier that is neither declared in the calculator file nor listed in
 * DYNAMIC, used inside a template literal and not text-like by name, is sampled as the number
 * 12 (so a text constant imported from another module would not be checked there; the render
 * test in email-render.test.ts covers the default state of those). Declared names are read
 * from source first, so this only affects imports.
 *
 * Hand-written DYNAMIC lists rot (an option label was renamed in W1-DEBT and the stale list
 * hid it), so labels that come from a calculator's own option arrays or result object are
 * read from its source via FROM_SOURCE, and a test fails on keys that no longer occur.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TOOL_REGISTRY, isKnownTool } from './tool-registry';
import { matchLabel, newLabelContext, compileTemplate, isSafeValue, cleanText } from './email-sanitize';
import { formatDuration } from './retirement';
import { formatMonthsShort } from './savings-goal';
import {
  formatMonthsLong, formatMoneyGuarded, formatMoneyCents, formatPercentGuarded,
  formatMonthsShort as formatMonthsShortResult,
} from './result-format';
import { formatCurrency } from './calculator-utils';
import { CARD_HORIZON_MONTHS } from './credit-card';
import { DEBT_HORIZON_MONTHS } from './debt-payoff';
import { TAX_YEAR_LABELS } from './us-rates';
import { CPI_SOURCE, CPI_U_LATEST, cpiYearLabel } from './inflation';
import { excludedCostsNote } from './rent-vs-buy';
import { ukStressTestInput, ukResultItems, type UkStressSettings } from './affordability-report';

const TOOLS_DIR = join(__dirname, '..', 'components', 'tools');
const BS = String.fromCharCode(92);

const durations = [0, 1, 11, 12, 13, 24, 30, 358, 1199].flatMap((m) => [formatDuration(m), formatMonthsShort(m)]);
const LATEST_CPI_YEAR = cpiYearLabel(CPI_U_LATEST.year);
const TODAYS = ["Today's dollars", "Today's pounds", "Today's euros"];

// W1-DEBT result-format.ts helpers (real outputs, not hand-typed text).
const MONTH_COUNTS = [0, 1, 11, 12, 13, 27, 99, 600];
const monthsLong = MONTH_COUNTS.map(formatMonthsLong);
const monthsShortResult = MONTH_COUNTS.map(formatMonthsShortResult);
const CARD_HORIZON_YEARS = String(CARD_HORIZON_MONTHS / 12);
const DEBT_HORIZON_YEARS = String(DEBT_HORIZON_MONTHS / 12);

/**
 * Possible outputs of identifiers and helper calls used in labels or values, keyed by the
 * expression source (whitespace collapsed). Checked by hand against the calculators.
 */
const DYNAMIC: Record<string, Record<string, string[]>> = {
  // compound-interest and investment-return: option labels and the solved result are read
  // from the calculators' own source (FROM_SOURCE below).
  'investment-return': { 'formatMonthsShort(s.months)': monthsShortResult },
  // Every output of a local helper (timeText, statusTime, yearsText, ratioText, annualText) and
  // every const of literals or ternaries (labels, units, wording) is read from the calculator
  // source by deriveLocal(); only values that come from elsewhere are listed here.
  'credit-card-payoff': { HORIZON_YEARS: [CARD_HORIZON_YEARS] },
  'debt-payoff': {
    HORIZON_YEARS: [DEBT_HORIZON_YEARS],
    'd.name': ['Credit Card', 'Car Loan'], // raw debt names become "Debt N"
  },
  inflation: {
    startLabel: ['2000', LATEST_CPI_YEAR],
    endLabel: ['2010', LATEST_CPI_YEAR],
    'CPI_SOURCE.name': [CPI_SOURCE.name],
    'CPI_U_LATEST.label': [CPI_U_LATEST.label],
  },
  'mortgage-affordability': {
    subline: [
      'Insurance and HOA fees alone use up your housing budget.',
      'Your monthly commitments already use 55.0% of take-home pay (limit 50%).',
      'Your existing debts already use up the 36% debt-to-income limit.',
      'Your existing debts already use up the 35% of income limit.',
      'With a $40,000 deposit and a $250,000 loan', 'With a $40,000 down payment and a $250,000 loan',
      'Cash only: your budget does not stretch to a loan at these costs',
    ],
  },
  'rent-vs-buy': {
    'costsNote.label': ['Buying and selling costs', 'Buying costs', 'Selling costs'],
  },
  'retirement-age': {
    realLabel: TODAYS,
    'formatDuration(solved.months)': durations.filter((d) => /year|month/.test(d)),
  },
  'retirement-contribution': {
    'realLabel.toLowerCase()': TODAYS.map((t) => t.toLowerCase()),
  },
  'retirement-savings': { realLabel: TODAYS },
  'savings-goal': { 'formatMonthsShort(time.months)': durations },
  salary: {
    yearLabel: Object.values(TAX_YEAR_LABELS),
  },
  'salary-uk': {
    'taxCode.trim().toUpperCase()': ['1257L', 'S1257L', 'C1257L', 'K475', 'BR', 'D0', 'NT', '0T', '1257L W1', '1257L X'],
    'PENSION_METHOD_LABEL[pensionMethod]': ['Net pay arrangement', 'Relief at source', 'Salary sacrifice'], // (W1-UK) pending
  },
  'capital-gains-tax': {
    'UK_BAND_LABEL[ukResult.incomeBand]': ['Basic rate', 'Higher rate', 'Additional rate'], // (W1-UK) pending
  },
};

/**
 * DYNAMIC keys pre-registered for a branch that has not merged yet ("<slug>: <expression>").
 * The stale-key test skips them; once the branch lands the expression is in the source and
 * the normal per-calculator test verifies the outputs, so delete the entry then.
 */
const PENDING_MERGE = new Set([
  'salary-uk: PENSION_METHOD_LABEL[pensionMethod]', // W1-UK
  'capital-gains-tax: UK_BAND_LABEL[ukResult.incomeBand]', // W1-UK
]);

/** Representative UK affordability settings: with and without a stress test. */
const UK_SETTINGS: UkStressSettings[] = [
  { stressMarginPct: 0, ratePct: 5.19, revertRatePct: 7.5, maxShareOfTakeHomePct: 50 },
  { stressMarginPct: 1, ratePct: 4.25, revertRatePct: 7.25, maxShareOfTakeHomePct: 45 },
];
const UK_RESULT = {
  monthlyPI: 1234, stressRatePct: 8.25, stressedPayment: 1500, stressedShareOfTakeHome: 41.2, shareOfTakeHome: 33.3,
  incomeMultiple: 4.12,
} as unknown as Parameters<typeof ukResultItems>[0];
const fmtSample = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

/** Rows pushed by shared helpers (expression source -> representative rows). */
const ROW_HELPERS: Record<string, Record<string, () => Array<{ label: string; value: string }>>> = {
  'mortgage-affordability': {
    'ukStressTestInput(stressSettings, uk.stressRatePct)': () => UK_SETTINGS.map((s) => ukStressTestInput(s, 8.25)),
    '...ukResultItems(uk, stressSettings, fmt)': () => UK_SETTINGS.flatMap((s) => ukResultItems(UK_RESULT, s, fmtSample)),
  },
};

/* -- source scanning -------------------------------------------------------- */

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Index just past the expression starting at `i` (stops at a top-level , ; or closing
 * bracket). With `separators` false only the closing bracket of the enclosing group stops it.
 */
function scanExpression(src: string, i: number, separators = true): number {
  let depth = 0;
  let quote: string | null = null;
  let tpl = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === BS) { i++; continue; }
      if (quote === '`' && c === '$' && src[i + 1] === '{') { tpl++; i++; continue; }
      if (quote === '`' && tpl > 0 && c === '}') { tpl--; continue; }
      if (c === quote && tpl === 0) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return i;
      depth--;
    } else if (separators && (c === ',' || c === ';') && depth === 0) return i;
  }
  return i;
}

/** Return the source text of the useCallback/useMemo(...) call that defines `name`, or ''. */
function callbackBody(src: string, name: string, hook: 'useCallback' | 'useMemo' = 'useCallback'): string {
  const start = src.indexOf(`const ${name} = ${hook}(`);
  if (start < 0) return '';
  const open = src.indexOf('(', start);
  return src.slice(start, scanExpression(src, open + 1) + 1);
}

/** Source text of the array literal assigned to `const NAME`, or ''. */
function constArrayBody(src: string, name: string): string {
  const start = src.indexOf(`const ${name}`);
  if (start < 0) return '';
  const open = src.indexOf('[', src.indexOf('=', start));
  return open < 0 ? '' : src.slice(open, scanExpression(src, open + 1, false) + 1);
}

/**
 * Expressions that follow `key:` inside a body. With `tail`, only objects whose remaining
 * properties (after this one) match it are kept.
 */
function keyExpressions(body: string, key: 'label' | 'value' | 'formatted' | 'context', tail?: RegExp): string[] {
  const out: string[] = [];
  const re = new RegExp(`${BS}b${key}:${BS}s*`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const start = m.index + m[0].length;
    const end = scanExpression(body, start);
    const expr = norm(body.slice(start, end));
    if (tail && !tail.test(body.slice(end, scanExpression(body, end, false)))) continue;
    // Skip TypeScript annotations such as `{ label: string; value: string }[]`.
    if (!/^(string|number|boolean)$/.test(expr)) out.push(expr);
  }
  return out;
}

/**
 * Row sources that are not object literals: arguments of `.push(...)` calls, and spreads of a
 * helper call inside an array literal (`[...helperRows(x), { label, value }]`).
 */
function pushedHelpers(body: string): string[] {
  const out: string[] = [];
  const spread = /\.\.\.(?=\s*[A-Za-z_$][\w$.]*\()/g;
  let sm: RegExpExecArray | null;
  while ((sm = spread.exec(body))) {
    const arg = norm(body.slice(sm.index, scanExpression(body, sm.index)));
    // A spread that writes its own `label:` literals (options.map(...)) is already scanned.
    if (!/\blabel:/.test(arg) && !out.includes(arg)) out.push(arg);
  }
  const re = /\.push\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    let i = m.index + m[0].length;
    for (;;) {
      while (/\s/.test(body[i])) i++;
      const end = scanExpression(body, i);
      const arg = norm(body.slice(i, end));
      if (arg && !arg.startsWith('{') && !/\blabel:/.test(arg) && !out.includes(arg)) out.push(arg);
      if (body[end] !== ',') break;
      i = end + 1;
    }
  }
  return out;
}

/* -- expression evaluation ----------------------------------------------------- */

/** Split `expr` at the first top-level occurrence of `token`, or null. */
function splitTop(expr: string, token: string): [string, string] | null {
  let depth = 0;
  let quote: string | null = null;
  let tpl = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (quote) {
      if (c === BS) { i++; continue; }
      if (quote === '`' && c === '$' && expr[i + 1] === '{') { tpl++; i++; continue; }
      if (quote === '`' && tpl > 0 && c === '}') { tpl--; continue; }
      if (c === quote && tpl === 0) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && expr.startsWith(token, i)) {
      // `?.` and `??` are not the ternary `?`.
      if (token === '?' && (expr[i + 1] === '.' || expr[i + 1] === '?' || expr[i - 1] === '?')) continue;
      return [expr.slice(0, i).trim(), expr.slice(i + token.length).trim()];
    }
  }
  return null;
}

const MONEY_FORMATTERS = /^(fmt|formatCurrency|formatGBP|usd|gbp|money|cents)\(/;
const PERCENT_FORMATTERS = /^(fmtPct|formatPercentGuarded)\(/;

/**
 * Sampling context for one test run, set by the test loop before evaluating:
 *  - currency: the real formatters are called in USD, GBP and EUR (one currency per pass,
 *    so a template with several amounts never mixes currencies);
 *  - guardedMoney / guardedPercent: the calculator uses formatMoneyGuarded /
 *    formatPercentGuarded, so top-level values may also be the guarded extremes;
 *  - derived: outputs read from the calculator's own source (FROM_SOURCE).
 */
const env = {
  currency: 'USD',
  guardedMoney: false,
  guardedPercent: false,
  derived: {} as Record<string, () => string[]>,
  src: '',
  deriving: new Set<string>(),
};

/** Real money output for `expr` (a fmt(...) or cents(...) call) in the sample currency. */
function moneySamples(expr: string, inTemplate: boolean): string[] {
  if (/^cents\(/.test(expr)) return [formatMoneyCents(1234.5, env.currency)];
  const amounts = inTemplate ? [1234.5] : [1234.5, 123456789];
  const plain = amounts.map((v) => (env.guardedMoney ? formatMoneyGuarded(v, env.currency) : formatCurrency(v, env.currency)));
  // Extremes only as whole values: inside a sentence they would need an unbounded input.
  const extreme = env.guardedMoney && !inTemplate ? [2e12, -2e12].map((v) => formatMoneyGuarded(v, env.currency)) : [];
  return [...plain, ...extreme];
}

function percentSamples(expr: string, inTemplate: boolean): string[] {
  if (!/^formatPercentGuarded\(/.test(expr)) return ['12.5%'];
  const extreme = env.guardedPercent && !inTemplate ? [1e5, -1e5].map((v) => formatPercentGuarded(v)) : [];
  return [formatPercentGuarded(0.125), ...extreme];
}
const NUMBER_FORMATTERS = /^(formatNumber|fmtRate|formatPercent|String|Number|Math\.\w+)\(/;
/** Identifiers whose value is probably text: these must be resolved, never sampled as numbers. */
const TEXTY = /label|name|text|display|source|note|unit|type|status|mode|why|subline|reason|word|code|plan|verdict|headline/i;

function unquote(lit: string): string {
  return lit.slice(1, -1).replace(new RegExp(`${BS}${BS}(.)`, 'g'), '$1');
}

/* -- outputs read from local declarations -------------------------------------------- */

/** Expressions after each `return` in a `{ ... }` block. */
function returnExpressions(block: string): string[] {
  const out: string[] = [];
  const re = /\breturn\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const start = m.index + m[0].length;
    out.push(norm(block.slice(start, scanExpression(block, start))));
  }
  return out;
}

/** `(params) => body`, `x => body`, with an optional return type; returns the body source or null. */
function arrowBody(init: string): string | null {
  const head = /^(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[^=]+?)?=>\s*/.exec(init);
  if (!head) return null;
  const rest = init.slice(head[0].length);
  return rest.startsWith('{') ? rest.slice(0, scanExpression(rest, 1, false) + 1) : rest;
}

/**
 * Source expressions a local name can take: `const NAME = <expr>` for a bare identifier, or the
 * returned expressions of `function NAME(..) {..}` / `const NAME = (..) => ..` for a call.
 */
function localExpressions(src: string, name: string, isCall: boolean): string[] {
  const out: string[] = [];
  const decl = new RegExp(`${BS}bconst ${name}${BS}b${BS}s*(?::[^=]+?)?=(?![=>])${BS}s*`, 'g');
  let m: RegExpExecArray | null;
  while ((m = decl.exec(src))) {
    const start = m.index + m[0].length;
    const init = src.slice(start, scanExpression(src, start));
    const body = arrowBody(init);
    if (body === null) {
      if (!isCall) out.push(norm(init));
    } else if (isCall) {
      out.push(...(body.startsWith('{') ? returnExpressions(body) : [norm(body)]));
    }
  }
  if (isCall) {
    const fn = new RegExp(`${BS}bfunction ${name}${BS}s*${BS}(`, 'g');
    while ((m = fn.exec(src))) {
      const open = m.index + m[0].length - 1;
      const close = scanExpression(src, open + 1, false);
      const brace = src.indexOf('{', close);
      if (brace >= 0) out.push(...returnExpressions(src.slice(brace, scanExpression(src, brace + 1, false) + 1)));
    }
  }
  return out;
}

/** Source of the array or object literal assigned to `const NAME` (after any type annotation), or ''. */
function constLiteralBody(src: string, name: string): string {
  const decl = new RegExp(`\\bconst ${name}\\b[^=]*=\\s*(?=[\\[{])`).exec(src);
  if (!decl) return '';
  const open = decl.index + decl[0].length;
  return src.slice(open, scanExpression(src, open + 1, false) + 1);
}

/**
 * `OPTIONS.find(..)?.label` and `OPTIONS[key].find(..)?.label` (the label of an option in a
 * const array or map of arrays), and `LABELS[key]` (a value of a const map of strings), read
 * from the literal in the source. Null when the const is not declared in this file.
 */
function deriveLookup(expr: string, slug: string): string[] | null {
  const find = /^([A-Za-z_$][\w$]*)(?:\[[^\]]+\])?\.find\(.*\)\?\.label$/s.exec(expr);
  const map = /^([A-Za-z_$][\w$]*)\[[^\]]+\]$/.exec(expr);
  const name = find?.[1] ?? map?.[1];
  if (!name || !env.src) return null;
  const body = constLiteralBody(env.src, name);
  if (!body) return null;
  const scratch: string[] = [];
  const out = find
    ? keyExpressions(body, 'label').flatMap((e) => evaluate(e, slug, scratch))
    : [...body.matchAll(/:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)].map((m) => unquote(m[1]));
  return scratch.length === 0 && out.length > 0 ? [...new Set(out)] : null;
}

/**
 * Outputs of a bare local identifier (`const label = a ? 'x' : 'y'`) or of a call to a local
 * helper (`function timeText(r) {..}`), read from the calculator source. Null when the name is
 * not declared in the source or any of its expressions is beyond the evaluator, so the caller
 * falls back to DYNAMIC / FROM_SOURCE or reports the expression.
 */
function deriveLocal(expr: string, slug: string, inTemplate: boolean): string[] | null {
  const m = /^([A-Za-z_$][\w$]*)(\(.*\))?$/s.exec(expr);
  if (!m || (m[2] !== undefined && scanExpression(expr, m[1].length + 1, false) !== expr.length - 1)) return null;
  if (MONEY_FORMATTERS.test(expr) || PERCENT_FORMATTERS.test(expr) || NUMBER_FORMATTERS.test(expr)) return null;
  const name = m[1];
  if (!env.src || env.deriving.has(name)) return null;
  const exprs = localExpressions(env.src, name, m[2] !== undefined);
  if (exprs.length === 0) return null;
  env.deriving.add(name);
  try {
    const scratch: string[] = [];
    const out = exprs.flatMap((e) => evaluate(e, slug, scratch, inTemplate));
    return scratch.length === 0 && out.length > 0 ? [...new Set(out)] : null;
  } finally {
    env.deriving.delete(name);
  }
}

/** Concrete sample strings for an expression; unknown shapes are reported in `problems`. */
function evaluate(expr: string, slug: string, problems: string[], inTemplate = false): string[] {
  expr = norm(expr);
  while (/^\(.*\)$/.test(expr) && splitTop(expr.slice(1, -1), ')') === null && scanExpression(expr, 1) === expr.length - 1) {
    expr = expr.slice(1, -1).trim();
  }
  const known = DYNAMIC[slug]?.[expr];
  if (known) return known;
  const derived = env.derived[expr];
  if (derived) return derived();
  const local = deriveLocal(expr, slug, inTemplate) ?? deriveLookup(expr, slug);
  if (local) return local;
  const nullish = splitTop(expr, '??');
  if (nullish) return evaluate(nullish[0], slug, problems, inTemplate); // fallback is a defensive default
  const tern = splitTop(expr, '?');
  if (tern) {
    const branches = splitTop(tern[1], ':');
    if (branches) return [...evaluate(branches[0], slug, problems, inTemplate), ...evaluate(branches[1], slug, problems, inTemplate)];
  }
  if (/^'(?:[^'\\]|\\.)*'$/.test(expr) || /^"(?:[^"\\]|\\.)*"$/.test(expr)) return [unquote(expr)];
  if (expr.startsWith('`') && expr.endsWith('`')) return expandTemplate(expr.slice(1, -1), slug, problems);
  if (MONEY_FORMATTERS.test(expr)) return moneySamples(expr, inTemplate);
  if (PERCENT_FORMATTERS.test(expr)) return percentSamples(expr, inTemplate);
  if (/^formatMonthsLong\(/.test(expr)) return monthsLong;
  if (NUMBER_FORMATTERS.test(expr) || /\.toFixed\(\d\)$/.test(expr) || /\.length$/.test(expr)) return ['12.5'];
  if (inTemplate && !/\(/.test(expr.replace(/\.toLowerCase\(\)|\.trim\(\)/g, '')) && !TEXTY.test(expr)) return ['12'];
  problems.push(`new dynamic expression \`${expr}\` -- list its outputs in DYNAMIC (tool-registry.test.ts)`);
  return [];
}

function expandTemplate(body: string, slug: string, problems: string[]): string[] {
  let results = [''];
  let i = 0;
  let text = '';
  const flush = () => { results = results.map((r) => r + text); text = ''; };
  while (i < body.length) {
    if (body[i] === BS) { text += body[i + 1]; i += 2; continue; }
    if (body[i] === '$' && body[i + 1] === '{') {
      flush();
      const end = scanExpression(body, i + 2);
      const parts = evaluate(body.slice(i + 2, end), slug, problems, true);
      const next: string[] = [];
      for (const r of results) for (const p of parts) if (next.length < 64) next.push(r + p);
      results = next;
      i = end + 1;
      continue;
    }
    text += body[i];
    i++;
  }
  flush();
  return results;
}

/* -- outputs read from a calculator's own source ------------------------------------- */

/** Computes the possible outputs of one expression from the calculator source. */
type SourceRule = (src: string, slug: string, problems: string[]) => string[];

/** Labels of the objects in `const NAME = [ { label: '...', ... }, ... ]`. */
const optionLabels = (name: string): SourceRule => (src, slug, problems) =>
  keyExpressions(constArrayBody(src, name), 'label').flatMap((e) => evaluate(e, slug, problems));

/** Every `key:` expression inside `const NAME = useMemo(...)` (for example a solved result). */
const memoField = (name: string, key: 'label' | 'formatted' | 'context', tail?: RegExp): SourceRule => (src, slug, problems) =>
  keyExpressions(callbackBody(src, name, 'useMemo'), key, tail).flatMap((e) => evaluate(e, slug, problems));

/** Expression source -> where its outputs are defined in the calculator. */
const FROM_SOURCE: Record<string, Record<string, SourceRule>> = {
  'compound-interest': {
    freqLabel: optionLabels('COMPOUND_OPTIONS'),
    timingLabel: optionLabels('TIMING_OPTIONS'),
  },
  'investment-return': {
    freqLabel: optionLabels('COMPOUND_OPTIONS'),
    timingLabel: optionLabels('TIMING_OPTIONS'),
    modeLabel: optionLabels('TABS'),
    'result.label': memoField('result', 'label'),
    'result.formatted': memoField('result', 'formatted'),
    // getResults sends the context as a "Note" row only when there is no chart summary,
    // which is exactly when the solved result has `effective: null`.
    'result.context.slice(0, 200)': memoField('result', 'context', /\beffective:\s*null\b/),
  },
};

/** Point `env` at one calculator: its derived outputs and which guarded formatters it uses. */
function setEnv(src: string, slug: string, problems: string[]): void {
  env.src = src;
  env.deriving.clear();
  env.guardedMoney = /formatMoneyGuarded\(/.test(src);
  env.guardedPercent = /formatPercentGuarded\(/.test(src);
  env.derived = {};
  for (const [expr, rule] of Object.entries(FROM_SOURCE[slug] ?? {})) {
    env.derived[expr] = () => rule(src, slug, problems);
  }
}

/** Every cleaned sample of `expr` across the sample currencies (the worker cleans text first). */
function samples(expr: string, src: string, slug: string, problems: string[]): string[] {
  const out = new Set<string>();
  for (const currency of ['USD', 'GBP', 'EUR']) {
    env.currency = currency;
    setEnv(src, slug, problems);
    for (const sample of evaluate(expr, slug, problems)) out.add(cleanText(sample));
  }
  return [...out];
}

/* -- the tests ------------------------------------------------------------------ */

const calculatorFiles = readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.tsx'));
const emailing = calculatorFiles
  .map((f) => ({ file: f, src: readFileSync(join(TOOLS_DIR, f), 'utf8') }))
  .map(({ file, src }) => ({ file, src, slug: /<EmailResultsButton[^>]*toolSlug="([^"]+)"/.exec(src)?.[1] }))
  .filter((x): x is { file: string; src: string; slug: string } => Boolean(x.slug));

describe('tool registry', () => {
  it('has an entry for every calculator that renders EmailResultsButton, and vice versa', () => {
    const fromSource = emailing.map((e) => e.slug).sort();
    expect(Object.keys(TOOL_REGISTRY).sort()).toEqual(fromSource);
    for (const e of emailing) expect(TOOL_REGISTRY[e.slug].component).toBe(e.file);
  });

  it('isKnownTool rejects prototype keys', () => {
    expect(isKnownTool('toString')).toBe(false);
    expect(isKnownTool('__proto__')).toBe(false);
    expect(isKnownTool('compound-interest')).toBe(true);
  });

  it('no template puts two bare {n} slots next to each other (phone-number shape): use {money} / {pct}', () => {
    for (const [slug, entry] of Object.entries(TOOL_REGISTRY)) {
      for (const t of [...entry.labels, ...(entry.values ?? [])]) {
        expect(/\{n\}[^A-Za-z0-9{}]*\{n\}/.test(t), `${slug}: ${t}`).toBe(false);
      }
    }
  });

  it('every template compiles; {item} labels carry no other token; values never use {item}', () => {
    for (const [slug, entry] of Object.entries(TOOL_REGISTRY)) {
      for (const t of entry.labels) {
        const c = compileTemplate(t, true);
        if (c.hasItem) {
          expect(t.match(/\{[^}]+\}/g)?.length, `${slug}: ${t}`).toBe(1);
          expect(entry.itemNoun, `${slug} needs itemNoun`).toBeTruthy();
        }
      }
      for (const v of entry.values ?? []) expect(() => compileTemplate(v, false), `${slug}: ${v}`).not.toThrow();
    }
  });

  it('the evaluator understands ternaries, templates and fallbacks', () => {
    const p: string[] = [];
    expect(evaluate("x === 1 ? 'A' : 'B'", 'salary', p)).toEqual(['A', 'B']);
    expect(evaluate("`${years} year${years !== 1 ? 's' : ''}`", 'salary', p)).toEqual(['12 years', '12 year']);
    expect(p).toEqual([]);
    setEnv('', 'salary', p);
    expect(evaluate('someHelper(x)', 'salary', p)).toEqual([]);
    expect(p.length).toBe(1);
  });

  it('finds rows spread from a helper call and ignores spreads that write their own labels', () => {
    expect(pushedHelpers('return [...helperRows(a, b), { label: "x", value: "1" }];')).toEqual(['...helperRows(a, b)']);
    expect(pushedHelpers('rows.push(...extra(a)); rows.push({ label: "x", value: "1" });')).toEqual(['...extra(a)']);
    expect(pushedHelpers('return [...xs.map((o) => ({ label: o.n, value: o.v }))];')).toEqual([]);
  });

  it('reads local consts, helpers and option tables from the calculator source', () => {
    const p: string[] = [];
    const src = [
      "const unit = region === 'uk' ? 'p' : region === 'eur' ? 'c' : '\u00A2';",
      "const LABELS: Record<string, string> = { a: 'One', b: 'Two' };",
      "const OPTIONS = [{ key: 'x', label: 'Ex' }, { key: 'y', label: 'Why' }] as const;",
      'function status(r) {',
      "  if (r.done) return 'Done';",
      "  if (r.never) return 'Never';",
      '  return `Over ${HORIZON} years`;',
      '}',
      "const shout = (v: number | null) => (v === null ? '--' : `${(v * 100).toFixed(1)}%`);",
    ].join('\n');
    setEnv(src, 'salary', p);
    expect(evaluate('unit', 'salary', p)).toEqual(['p', 'c', '\u00A2']);
    expect(evaluate('LABELS[k]', 'salary', p)).toEqual(['One', 'Two']);
    expect(evaluate('OPTIONS.find((o) => o.key === k)?.label', 'salary', p)).toEqual(['Ex', 'Why']);
    expect(evaluate('status(r)', 'salary', p)).toEqual(['Done', 'Never', 'Over 12 years']);
    expect(evaluate('shout(x)', 'salary', p)).toEqual(['--', '12.5%']);
    expect(p).toEqual([]);
    // Unknown names are still reported rather than guessed.
    expect(evaluate('mystery', 'salary', p)).toEqual([]);
    expect(p.length).toBe(1);
  });

  it('DYNAMIC, FROM_SOURCE and ROW_HELPERS only name expressions that still occur in their calculator', () => {
    const slugs = new Set(emailing.map((e) => e.slug));
    const stale: string[] = [];
    for (const [table, entries] of [['DYNAMIC', DYNAMIC], ['FROM_SOURCE', FROM_SOURCE], ['ROW_HELPERS', ROW_HELPERS]] as const) {
      for (const [slug, keys] of Object.entries(entries)) {
        const text = norm(emailing.find((e) => e.slug === slug)?.src ?? '');
        if (!slugs.has(slug)) stale.push(`${table}: unknown tool ${slug}`);
        for (const key of Object.keys(keys)) {
          if (!text.includes(key) && !PENDING_MERGE.has(`${slug}: ${key}`)) stale.push(`${table}[${slug}]: ${key}`);
        }
        // A hand-written list for something the source declares locally (a const of literals or
        // ternaries, a helper function) would drift from it: the source is read instead.
        if (table === 'DYNAMIC') {
          const src = emailing.find((e) => e.slug === slug)?.src ?? '';
          setEnv(src, slug, []);
          for (const key of Object.keys(keys)) {
            if ((deriveLocal(key, slug, false) ?? deriveLookup(key, slug)) !== null) stale.push(`DYNAMIC[${slug}]: ${key} is declared in the source; delete this entry`);
          }
        }
      }
    }
    expect(stale).toEqual([]);
  });

  it('FROM_SOURCE rules find their outputs in the calculator source', () => {
    const problems: string[] = [];
    for (const [slug, rules] of Object.entries(FROM_SOURCE)) {
      const src = emailing.find((e) => e.slug === slug)!.src;
      for (const expr of Object.keys(rules)) {
        const out = samples(expr, src, slug, problems);
        expect(out.length, `${slug}: ${expr} found nothing`).toBeGreaterThan(0);
      }
    }
    expect(problems).toEqual([]);
    // The W1-DEBT rename that a hand-written list once hid: the timing options are sent as written.
    for (const slug of ['compound-interest', 'investment-return']) {
      const src = emailing.find((e) => e.slug === slug)!.src;
      expect(samples('timingLabel', src, slug, problems)).toEqual(['End of each month', 'Start of each month']);
      expect(samples('freqLabel', src, slug, problems)).toContain('Semi-annually');
    }
  });

  for (const { file, src, slug } of emailing) {
    it(`${file}: every label and value getInputs/getResults can send is rendered (${slug})`, () => {
      const bodies = [callbackBody(src, 'getInputs'), callbackBody(src, 'getResults')];
      expect(bodies[0].length, `${file}: getInputs not found`).toBeGreaterThan(0);
      expect(bodies[1].length, `${file}: getResults not found`).toBeGreaterThan(0);
      const problems: string[] = [];
      const ctx = newLabelContext();
      // One line per rejected sample, listing every expression that can produce it.
      const rejected = new Map<string, Set<string>>();
      const reject = (kind: string, sample: string, expr: string) => {
        const key = `${kind}: "${sample}"`;
        rejected.set(key, (rejected.get(key) ?? new Set()).add(expr));
      };
      for (const expr of bodies.flatMap((b) => keyExpressions(b, 'label'))) {
        for (const sample of samples(expr, src, slug, problems)) {
          if (!matchLabel(slug, sample, ctx)) reject('label not allowed', sample, expr);
        }
      }
      for (const expr of bodies.flatMap((b) => keyExpressions(b, 'value'))) {
        for (const sample of samples(expr, src, slug, problems)) {
          if (!isSafeValue(slug, sample)) reject('value would be dropped', sample, expr);
        }
      }
      for (const [key, exprs] of rejected) {
        const list = [...exprs];
        problems.push(`${key} (from ${list.slice(0, 3).join(', ')}${list.length > 3 ? `, +${list.length - 3} more` : ''})`);
      }
      for (const helper of bodies.flatMap(pushedHelpers)) {
        const gen = ROW_HELPERS[slug]?.[helper];
        if (!gen) {
          problems.push(`rows pushed by \`${helper}\` -- add it to ROW_HELPERS (tool-registry.test.ts)`);
          continue;
        }
        for (const row of gen()) {
          const label = cleanText(row.label);
          const value = cleanText(row.value);
          if (!matchLabel(slug, label, ctx)) problems.push(`helper label not allowed: "${label}" (from ${helper})`);
          if (!isSafeValue(slug, value)) problems.push(`helper value would be dropped: "${value}" (from ${helper})`);
        }
      }
      expect([...new Set(problems)]).toEqual([]);
    });
  }

  it('shared helpers: rent-vs-buy excluded-costs note labels are allowed', () => {
    const ctx = newLabelContext();
    for (const region of ['us', 'uk', 'eur'] as const) {
      for (const [b, s] of [[0, 0], [0, 6], [3, 0]]) {
        const note = excludedCostsNote(region, b, s);
        expect(note).not.toBeNull();
        expect(matchLabel('rent-vs-buy', note!.label, ctx), note!.label).not.toBeNull();
      }
    }
  });
});

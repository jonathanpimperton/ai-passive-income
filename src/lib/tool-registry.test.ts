/**
 * Drift guard for the results-email allowlist (tool-registry.ts + email-sanitize.ts).
 *
 * Scans every calculator that renders <EmailResultsButton>: each label AND value its
 * getInputs()/getResults() can send is expanded into concrete samples (string literals,
 * ternaries, template literals with sample numbers, known helpers) and checked against
 * what the worker will render. A failure means the worker would silently DROP that row
 * (and if it is the only result, refuse the whole email). Fix it by adding the label or
 * value phrase to TOOL_REGISTRY[slug] in src/lib/tool-registry.ts; if the message says
 * "new dynamic expression", also list the expression's possible outputs in DYNAMIC below.
 *
 * Rows built by shared helpers (pushed rather than written as object literals) must be
 * listed in ROW_HELPERS; the test calls the real helper with representative settings.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TOOL_REGISTRY, isKnownTool } from './tool-registry';
import { matchLabel, newLabelContext, compileTemplate, isSafeValue } from './email-sanitize';
import { formatDuration } from './retirement';
import { formatMonthsShort } from './savings-goal';
import { TAX_YEAR_LABELS } from './us-rates';
import { CPI_SOURCE, CPI_U_LATEST, cpiYearLabel } from './inflation';
import { excludedCostsNote } from './rent-vs-buy';
import { ukStressTestInput, ukResultItems, type UkStressSettings } from './affordability-report';

const TOOLS_DIR = join(__dirname, '..', 'components', 'tools');
const BS = String.fromCharCode(92);

const durations = [0, 1, 11, 12, 13, 24, 30, 358, 1199].flatMap((m) => [formatDuration(m), formatMonthsShort(m)]);
const LATEST_CPI_YEAR = cpiYearLabel(CPI_U_LATEST.year);
const TODAYS = ["Today's dollars", "Today's pounds", "Today's euros"];

/**
 * Possible outputs of identifiers and helper calls used in labels or values, keyed by the
 * expression source (whitespace collapsed). Checked by hand against the calculators.
 */
const DYNAMIC: Record<string, Record<string, string[]>> = {
  'compound-interest': {
    freqLabel: ['Annually', 'Semi-annually', 'Quarterly', 'Monthly', 'Daily', '12x/yr'],
    timingLabel: ['End of period', 'Beginning of period'],
  },
  'investment-return': {
    freqLabel: ['Annually', 'Semi-annually', 'Quarterly', 'Monthly', 'Daily', '12x/yr'],
    timingLabel: ['End of period', 'Beginning of period'],
    modeLabel: ['End Amount', 'Contribution', 'Return Rate', 'Starting Amount', 'Time'],
    'result.label': ['End Amount', 'Monthly Contribution', 'Required Return Rate', 'Starting Amount', 'Time Required', 'Result'],
    'result.formatted': ['$1,234', '12.50%', 'Not achievable', 'Not reachable', '12 yrs 3 mo', '1 yr 1 mo', '12 years', '1 year', '--'],
  },
  'credit-card-payoff': {
    'formatMonths(activeResult.months)': ['100+ years', '0 months', '1 year', '2 years, 3 months', '11 months'],
  },
  'debt-payoff': {
    'formatMonths(activeResult.months)': ['0 months', '1 year', '2 years, 3 months', '11 months'],
    '`${d.name} Balance`': ['Credit Card Balance'],
    '`${d.name} APR`': ['Credit Card APR'],
    '`${d.name} Min Payment`': ['Credit Card Min Payment'],
    'd.name': ['Credit Card', 'Car Loan'], // (W1-DEBT) raw debt names become "Debt N"
  },
  'emergency-fund': {
    savingsRateLabel: ['Savings interest rate (AER)', 'Savings interest rate', 'Savings interest rate (APY)'],
    'timeLabel(sixMonth.time)': [
      'Fully funded', 'Add a monthly amount to reach this', 'More than 50 years at this rate',
      '8 mo', '3y 2mo', '8 mo (interest only)', '3y 2mo (interest only)',
    ],
  },
  inflation: {
    startLabel: ['2000', LATEST_CPI_YEAR],
    endLabel: ['2010', LATEST_CPI_YEAR],
    'CPI_SOURCE.name': [CPI_SOURCE.name],
    'CPI_U_LATEST.label': [CPI_U_LATEST.label],
  },
  'mortgage-affordability': {
    depositLabel: ['Deposit', 'Down Payment'],
    headlineLabel: ['You could afford up to', 'No home fits these limits'],
    subline: [
      'Insurance and HOA fees alone use up your housing budget.',
      'Your monthly commitments already use 55.0% of take-home pay (limit 50%).',
      'Your existing debts already use up the 36% debt-to-income limit.',
      'Your existing debts already use up the 35% of income limit.',
      'With a $40,000 deposit and a $250,000 loan', 'With a $40,000 down payment and a $250,000 loan',
      'Cash only: your budget does not stretch to a loan at these costs',
    ],
  },
  'mortgage-payment': {
    priceLabel: ['Property Price', 'Home Price'],
    piLabel: ['Monthly Payment (P&I)', 'Monthly Payment'],
    downLabel: ['Deposit', 'Down Payment'],
  },
  'rent-vs-buy': {
    propertyChargesLabel: ['Property Tax Rate', 'Annual property charges (% of home value)'],
    verdictLabel: [
      'Over 10 years, buying and renting come out even', 'Over 10 years, buying leaves you better off by',
      'Over 30 years, renting leaves you better off by',
    ],
    'costsNote.label': ['Buying and selling costs', 'Buying costs', 'Selling costs'],
    'FILING_OPTIONS.find((o) => o.value === filingStatus)?.label': ['Single', 'Married (joint)', 'Head of household'],
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
  'solar-payback': {
    paybackDisplay: ['Pays back immediately', '7 yr 3 mo', 'Never', '25+ years'],
    roiText: ['12%', 'n/a'],
    tariffUnit: ['p', String.fromCharCode(0xa2)],
  },
  salary: {
    yearLabel: Object.values(TAX_YEAR_LABELS),
    'FILING_LABELS[filingStatus]': ['Single', 'Married Filing Jointly', 'Head of Household'],
    'SENIOR_OPTIONS[filingStatus].find((o) => o.value === seniorsShown)?.label': ['No', 'Yes', 'Neither of us', 'One of us', 'Both of us'],
  },
  'salary-uk': {
    'taxCode.trim().toUpperCase()': ['1257L', 'S1257L', 'C1257L', 'K475', 'BR', 'D0', 'NT', '0T', '1257L W1', '1257L X'],
    'STUDENT_LOAN_LABELS[studentLoan]': [
      'No Student Loan', 'Plan 1 (pre-2012 England/Wales)', 'Plan 2 (post-2012 England/Wales)', 'Plan 4 (Scotland)',
      'Plan 5 (from 2023)', 'Postgraduate Loan',
    ],
    'PENSION_METHOD_LABEL[pensionMethod]': ['Net pay arrangement', 'Relief at source', 'Salary sacrifice'], // (W1-UK)
  },
  'car-finance': {
    'LABELS[o.type]': ['PCP', 'Hire Purchase', 'Personal Loan', 'Cash'],
    'LABELS[cheapest.type]': ['PCP', 'Hire Purchase', 'Personal Loan', 'Cash'],
  },
  'stamp-duty': {
    'BUYER_TYPES.find((b) => b.key === buyerType)?.label': ['First-time buyer', 'Moving home', 'Additional property'],
  },
  'capital-gains-tax': {
    'FILING_OPTIONS.find((f) => f.key === filing)?.label': ['Single', 'Married (joint)', 'Head of household'],
    'UK_BAND_LABEL[ukResult.incomeBand]': ['Basic rate', 'Higher rate', 'Additional rate'], // (W1-UK)
  },
};

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

/** Index just past the expression starting at `i` (stops at a top-level , ; or closing bracket). */
function scanExpression(src: string, i: number): number {
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
    } else if ((c === ',' || c === ';') && depth === 0) return i;
  }
  return i;
}

/** Return the source text of the useCallback(...) call that defines `name`, or ''. */
function callbackBody(src: string, name: string): string {
  const start = src.indexOf(`const ${name} = useCallback(`);
  if (start < 0) return '';
  const open = src.indexOf('(', start);
  return src.slice(start, scanExpression(src, open + 1) + 1);
}

/** Expressions that follow `key:` inside a body. */
function keyExpressions(body: string, key: 'label' | 'value'): string[] {
  const out: string[] = [];
  const re = new RegExp(`${BS}b${key}:${BS}s*`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const start = m.index + m[0].length;
    const expr = norm(body.slice(start, scanExpression(body, start)));
    // Skip TypeScript annotations such as `{ label: string; value: string }[]`.
    if (!/^(string|number|boolean)$/.test(expr)) out.push(expr);
  }
  return out;
}

/** Arguments of `.push(...)` calls that are not object literals (helper-built rows). */
function pushedHelpers(body: string): string[] {
  const out: string[] = [];
  const re = /\.push\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    let i = m.index + m[0].length;
    for (;;) {
      while (/\s/.test(body[i])) i++;
      const end = scanExpression(body, i);
      const arg = norm(body.slice(i, end));
      if (arg && !arg.startsWith('{')) out.push(arg);
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
const NUMBER_FORMATTERS = /^(formatNumber|fmtRate|formatPercent|String|Number|Math\.\w+)\(/;
/** Identifiers whose value is probably text: these must be resolved, never sampled as numbers. */
const TEXTY = /label|name|text|display|source|note|unit|type|status|mode|why|subline|reason|word|code|plan|verdict|headline/i;

function unquote(lit: string): string {
  return lit.slice(1, -1).replace(new RegExp(`${BS}${BS}(.)`, 'g'), '$1');
}

/** Concrete sample strings for an expression; unknown shapes are reported in `problems`. */
function evaluate(expr: string, slug: string, problems: string[], inTemplate = false): string[] {
  expr = norm(expr);
  while (/^\(.*\)$/.test(expr) && splitTop(expr.slice(1, -1), ')') === null && scanExpression(expr, 1) === expr.length - 1) {
    expr = expr.slice(1, -1).trim();
  }
  const known = DYNAMIC[slug]?.[expr];
  if (known) return known;
  const nullish = splitTop(expr, '??');
  if (nullish) return evaluate(nullish[0], slug, problems, inTemplate); // fallback is a defensive default
  const tern = splitTop(expr, '?');
  if (tern) {
    const branches = splitTop(tern[1], ':');
    if (branches) return [...evaluate(branches[0], slug, problems, inTemplate), ...evaluate(branches[1], slug, problems, inTemplate)];
  }
  if (/^'(?:[^'\\]|\\.)*'$/.test(expr) || /^"(?:[^"\\]|\\.)*"$/.test(expr)) return [unquote(expr)];
  if (expr.startsWith('`') && expr.endsWith('`')) return expandTemplate(expr.slice(1, -1), slug, problems);
  if (MONEY_FORMATTERS.test(expr)) return ['$1,234'];
  if (PERCENT_FORMATTERS.test(expr)) return ['12.5%'];
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
    expect(evaluate("FILING_LABELS[filingStatus]", 'salary', p)).toContain('Married Filing Jointly');
    expect(p).toEqual([]);
    expect(evaluate('someHelper(x)', 'salary', p)).toEqual([]);
    expect(p.length).toBe(1);
  });

  for (const { file, src, slug } of emailing) {
    it(`${file}: every label and value getInputs/getResults can send is rendered (${slug})`, () => {
      const bodies = [callbackBody(src, 'getInputs'), callbackBody(src, 'getResults')];
      expect(bodies[0].length, `${file}: getInputs not found`).toBeGreaterThan(0);
      expect(bodies[1].length, `${file}: getResults not found`).toBeGreaterThan(0);
      const problems: string[] = [];
      const ctx = newLabelContext();
      for (const expr of bodies.flatMap((b) => keyExpressions(b, 'label'))) {
        for (const sample of evaluate(expr, slug, problems)) {
          if (!matchLabel(slug, sample, ctx)) problems.push(`label not allowed: "${sample}" (from ${expr})`);
        }
      }
      for (const expr of bodies.flatMap((b) => keyExpressions(b, 'value'))) {
        for (const sample of evaluate(expr, slug, problems)) {
          if (!isSafeValue(slug, sample)) problems.push(`value would be dropped: "${sample}" (from ${expr})`);
        }
      }
      for (const helper of bodies.flatMap(pushedHelpers)) {
        const gen = ROW_HELPERS[slug]?.[helper];
        if (!gen) {
          problems.push(`rows pushed by \`${helper}\` -- add it to ROW_HELPERS (tool-registry.test.ts)`);
          continue;
        }
        for (const row of gen()) {
          if (!matchLabel(slug, row.label, ctx)) problems.push(`helper label not allowed: "${row.label}" (from ${helper})`);
          if (!isSafeValue(slug, row.value)) problems.push(`helper value would be dropped: "${row.value}" (from ${helper})`);
        }
      }
      expect(problems).toEqual([]);
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

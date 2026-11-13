/**
 * Build-time figure engine (plan-2026-11 RC1 / W1-FIG).
 *
 * Content (markdown bodies AND frontmatter strings) writes figures as tokens:
 *
 *   {{ ukTakeHome(30000, plan=plan2) | gbp }}          -> £25,064
 *   {{ mortgagePayment(300000, 7, 30) | usd(2) }}      -> $1,995.91
 *   {{ cardPayoff(5000, 22.99, 100).months | months }} -> 13 years 11 months
 *
 * Tokens are resolved at build time by `remark-figures.mjs` (bodies) and by
 * the zod transform in `src/content.config.ts` (frontmatter), so a published
 * number can never drift from the calculation engines in `src/lib`.
 *
 * Rules that keep this safe:
 * - Only functions registered in FIGURE_FUNCTIONS can be called; arguments are
 *   numbers, strings and booleans (see figure-parser.ts). No eval.
 * - Every argument is validated (type, range, allowed values). Unknown
 *   functions, unknown options, NaN and division by zero throw a FigureError,
 *   which fails the build. A token never renders blank or "NaN".
 * - A number must go through a formatter (gbp, usd, pct, months, ...) before it
 *   can be printed, so the currency and rounding are always explicit.
 *
 * Conventions: money in whole currency units; every RATE argument and every
 * rate result is a PERCENTAGE NUMBER (6.5 means 6.5%); terms in years unless a
 * name says months. Defaults are zero/none, NOT the calculators' UI defaults.
 *
 * Content-agent documentation with the full catalogue: docs/figures.md.
 *
 * ENGINE STATUS (Nov 2026): several calculators still keep logic inside their
 * .tsx components while W1-UK/TAX/PROP/DEBT/SAVE move it into src/lib. Where
 * no lib function exists yet, the figure function below composes the lib
 * primitives and is marked "INTERIM" with the module that should replace it.
 * Re-point those once the libs are merged; figures.test.ts pins the values.
 */

import {
  compoundInterest,
  loanMonthlyPayment,
  monthlySavingsRequired,
  solveForTime,
} from './calculator-utils';
import { calculateUKCgt, calculateUSCgt } from './capital-gains';
import { calculateSdlt, type BuyerType } from './stamp-duty';
import {
  calcIncomeTax,
  calcNI,
  calcPersonalAllowance,
  calcStudentLoan,
  UK_BANDS,
  type StudentLoanPlan,
} from './uk-tax-calc';
import {
  UK_CGT,
  UK_EMPLOYER_NI,
  UK_INCOME_TAX,
  UK_MORTGAGE,
  UK_NI,
  UK_PENSION_AGES,
  UK_SCOTTISH_TAX,
  UK_SDLT,
  UK_STATE_PENSION,
  UK_STUDENT_LOANS,
  UK_TAX_YEAR,
} from './uk-rates';
import { calcFederalTax, calcFICA } from './us-tax-calc';
import {
  US_401K,
  US_BRACKETS,
  US_CAPITAL_GAINS,
  US_MEDICARE,
  US_SOCIAL_SECURITY,
  US_STANDARD_DEDUCTION,
  US_TAX_YEAR,
  type FilingStatus,
} from './us-rates';
import {
  FigureSyntaxError,
  parsePipeline,
  scanTokens,
  type ExprNode,
  type Literal,
  type Pipeline,
} from './figure-parser';

/* ════════════════════════════════════════════════════════════
 * Types and errors
 * ════════════════════════════════════════════════════════════ */

export type FigurePrimitive = number | string | boolean;
export type FigureRecord = Readonly<Record<string, FigurePrimitive>>;
export type FigureValue = FigurePrimitive | FigureRecord;

/** Thrown for any problem with a single token. `message` is human-readable. */
export class FigureError extends Error {
  readonly token: string;
  readonly detail: string;
  constructor(token: string, detail: string) {
    super(`{{ ${token.trim()} }}: ${detail}`);
    this.name = 'FigureError';
    this.token = token.trim();
    this.detail = detail;
  }
}

/** Internal: a problem message without the token prefix (wrapped later). */
class Fail extends Error {}
function fail(message: string): never {
  throw new Fail(message);
}

type ParamType = 'number' | 'string' | 'boolean';

export interface ParamSpec {
  name: string;
  type: ParamType;
  doc: string;
  /** Positional params only: must be given. */
  required?: boolean;
  default?: FigurePrimitive;
  min?: number;
  /** Strictly greater than this. */
  above?: number;
  max?: number;
  integer?: boolean;
  /** Allowed string values (after `aliases`). */
  oneOf?: readonly string[];
  /** Alternative spellings mapped onto `oneOf` values. */
  aliases?: Readonly<Record<string, string>>;
  /** Custom coercion (e.g. year labels, compounding words). Runs before checks. */
  coerce?: (v: FigurePrimitive) => FigurePrimitive;
}

export interface FigureFunction {
  name: string;
  group: string;
  summary: string;
  params: ParamSpec[];
  options?: ParamSpec[];
  /** What the function returns, for the docs. */
  returns: string;
  /** For object results: field name -> description. */
  fields?: Readonly<Record<string, string>>;
  /** A complete token body (no braces) that the tests evaluate. */
  example: string;
  /**
   * Set while the function composes lib primitives instead of calling the
   * engine the calculator will use (names the module that should replace it).
   * Wave 2 content must not use INTERIM functions until they are re-pointed.
   */
  interim?: string;
  run: (a: Args) => FigureValue;
}

/** Validated, defaulted arguments for one call. */
export class Args {
  constructor(private readonly values: Record<string, FigurePrimitive | undefined>) {}
  num(name: string): number {
    return this.values[name] as number;
  }
  str(name: string): string {
    return this.values[name] as string;
  }
  bool(name: string): boolean {
    return this.values[name] as boolean;
  }
  /** True when the argument was given (or has a non-undefined default). */
  has(name: string): boolean {
    return this.values[name] !== undefined;
  }
}

/* ════════════════════════════════════════════════════════════
 * Shared parameter specs
 * ════════════════════════════════════════════════════════════ */

const money = (name: string, doc: string, extra: Partial<ParamSpec> = {}): ParamSpec => ({
  name,
  type: 'number',
  doc,
  required: true,
  min: 0,
  ...extra,
});
const ratePct = (name: string, doc: string, extra: Partial<ParamSpec> = {}): ParamSpec => ({
  name,
  type: 'number',
  doc,
  required: true,
  min: 0,
  max: 100,
  ...extra,
});
const termYears: ParamSpec = {
  name: 'years',
  type: 'number',
  doc: 'term in years (whole months, e.g. 4 or 5.5)',
  required: true,
  above: 0,
  max: 100,
};

/* ── Tax years ───────────────────────────────────────────── */

/*
 * MULTI-YEAR HOOK. The tax engines are single-year today; W1-TAX (TX-1) makes
 * the rates modules year-keyed and keeps the current exports as aliases to the
 * default year. Until figures are re-wired to pass a year into the engines, a
 * `year=` option is only accepted when it equals the dataset the aliases point
 * at, so asking for a year that is not wired fails loudly instead of silently
 * returning the default year's numbers.
 */
function ukYearLabel(v: FigurePrimitive): string {
  const s = String(v).trim();
  let m = /^(\d{4})$/.exec(s);
  if (m) return `${m[1]}/${String((Number(m[1]) + 1) % 100).padStart(2, '0')}`;
  m = /^(\d{4})[/-](\d{2})$/.exec(s);
  if (m) return `${m[1]}/${m[2]}`;
  fail(`UK tax year must look like 2026/27 or 2026 (got "${s}")`);
}
function usYearLabel(v: FigurePrimitive): string {
  const s = String(v).trim();
  if (/^\d{4}$/.test(s)) return s;
  fail(`US tax year must look like 2026 (got "${s}")`);
}
const ukYear: ParamSpec = {
  name: 'year',
  type: 'string',
  doc: `UK tax year, e.g. '${UK_TAX_YEAR}' (default: the current dataset)`,
  coerce: (v) => ukYearLabel(v),
};
const usYear: ParamSpec = {
  name: 'year',
  type: 'string',
  doc: `US tax year, e.g. ${US_TAX_YEAR} (default: the current dataset)`,
  coerce: (v) => usYearLabel(v),
};
function checkUkYear(a: Args): void {
  if (!a.has('year')) return;
  const y = a.str('year');
  if (y !== UK_TAX_YEAR) fail(`no UK tax data wired for ${y} (available: ${UK_TAX_YEAR})`);
}
function checkUsYear(a: Args): void {
  if (!a.has('year')) return;
  const y = a.str('year');
  if (y !== US_TAX_YEAR) fail(`no US tax data wired for ${y} (available: ${US_TAX_YEAR})`);
}

/* ════════════════════════════════════════════════════════════
 * UK income: tax, NI, student loans, pensions, tax codes
 * ════════════════════════════════════════════════════════════ */

type UkMethod = '' | 'sacrifice' | 'net' | 'ras';

type UkCode =
  | { kind: 'allowance'; allowance: number; standard: boolean; taper: boolean; scottish: boolean | null; code: string }
  | { kind: 'flat'; band: string; scottish: boolean | null; code: string }
  | { kind: 'nt'; scottish: boolean | null; code: string };

const SCOTTISH_BANDS: [number, number][] = UK_SCOTTISH_TAX.bands.map((b) => [b.from, b.rate]);

function bandRate(scottish: boolean, name: string): number {
  const list: readonly { name: string; rate: number }[] = scottish ? UK_SCOTTISH_TAX.bands : UK_INCOME_TAX.bands;
  const band = list.find((b) => b.name === name);
  if (!band) fail(`no ${scottish ? 'Scottish' : 'rUK'} ${name} band in uk-rates.ts`);
  return band.rate;
}

/** Flat-rate codes: which band's rate taxes all pay. */
const FLAT_CODES: Record<string, { ruk?: string; scot?: string }> = {
  BR: { ruk: 'Basic', scot: 'Basic' },
  D0: { ruk: 'Higher', scot: 'Intermediate' },
  D1: { ruk: 'Additional', scot: 'Higher' },
  D2: { scot: 'Advanced' },
  D3: { scot: 'Top' },
};

/*
 * INTERIM: replace with src/lib/uk-tax-codes.ts once W1-UK (UK-2/UK-3) merges.
 * Supports the codes content needs; anything else fails loudly.
 */
function parseUkCode(raw: string): UkCode {
  const code = raw.replace(/\s+/g, '').toUpperCase();
  let rest = code;
  let scottish: boolean | null = null;
  if (/^[SC]/.test(rest)) {
    scottish = rest[0] === 'S';
    rest = rest.slice(1);
  }
  if (rest === 'NT') return { kind: 'nt', scottish, code };
  const flat = Object.hasOwn(FLAT_CODES, rest) ? FLAT_CODES[rest] : undefined;
  if (flat) {
    const band = scottish ? flat.scot : flat.ruk;
    if (!band) fail(`tax code ${code} only exists with the S (Scottish) prefix`);
    return { kind: 'flat', band, scottish, code };
  }
  if (rest === '0T') return { kind: 'allowance', allowance: 0, standard: false, taper: false, scottish, code };
  const m = /^(\d{1,5})L$/.exec(rest);
  if (m) {
    const allowance = Number(m[1]) * 10;
    return {
      kind: 'allowance',
      allowance,
      standard: allowance === UK_INCOME_TAX.personalAllowance,
      taper: true,
      scottish,
      code,
    };
  }
  fail(
    `tax code "${raw}" is not supported by figure tokens (supported: nnnnL, 0T, BR, D0, D1, NT, ` +
      `SD2, SD3, each with an optional S or C prefix; K, T, M, N and emergency codes are not)`,
  );
}

/** Personal allowance tapered by £1 for every £2 of adjusted net income over the threshold. */
function taperedAllowance(allowance: number, ani: number): number {
  if (ani <= UK_INCOME_TAX.paTaperThreshold) return allowance;
  const reduction = Math.floor((ani - UK_INCOME_TAX.paTaperThreshold) / 2);
  return Math.max(0, allowance - reduction);
}

const STUDENT_PLANS = ['none', 'plan1', 'plan2', 'plan4', 'plan5', 'postgrad'] as const;

export interface UkPayResult {
  [field: string]: number;
  takeHome: number;
  monthly: number;
  weekly: number;
  incomeTax: number;
  ni: number;
  studentLoan: number;
  pension: number;
  pensionPot: number;
  ani: number;
  personalAllowance: number;
  taxRate: number;
}

/*
 * INTERIM composition of the uk-tax-calc primitives (the full calculator's
 * logic still lives in SalaryUkCalc.tsx). It already follows the HMRC rules
 * the Wave 1 fixes adopt: student loan on NIC pay after salary sacrifice
 * (UK-1), S prefix = Scottish bands (UK-2), taper for every L code (UK-3),
 * relief at source extends the bands and adds basic-rate relief (UK-4).
 * Re-point to the W1-UK lib function when it exists.
 */
function ukPay(salary: number, a: Args): UkPayResult {
  checkUkYear(a);
  const pct = a.num('pension');
  const amount = a.num('pensionAmount');
  if (pct > 0 && amount > 0) fail('use pension (% of salary) or pensionAmount (£ a year), not both');
  const contribution = pct > 0 ? (salary * pct) / 100 : amount;
  const method = a.str('method') as UkMethod;
  if (contribution > 0 && method === '') {
    fail('a pension contribution needs method=sacrifice, method=net (net pay) or method=ras (relief at source)');
  }
  if (contribution > salary) fail(`pension contribution (${contribution}) is more than the salary (${salary})`);

  const code = parseUkCode(a.str('code'));
  if (a.has('scottish') && code.scottish !== null && code.scottish !== a.bool('scottish')) {
    fail(`tax code ${code.code} contradicts scottish=${a.bool('scottish')}`);
  }
  // An S prefix means Scottish bands, a C prefix rUK bands; otherwise the option decides.
  const scottish = code.scottish ?? (a.has('scottish') ? a.bool('scottish') : false);
  if (method === 'ras' && scottish && contribution > 0) {
    fail('relief at source is not modelled for Scottish taxpayers yet');
  }

  // Which pay each deduction is worked out on.
  let taxPay = salary;
  let nicPay = salary;
  let ani = salary;
  let bandExtension = 0;
  let employeeCost = contribution;
  if (contribution > 0) {
    if (method === 'sacrifice') {
      taxPay = salary - contribution;
      nicPay = salary - contribution;
      ani = salary - contribution;
    } else if (method === 'net') {
      taxPay = salary - contribution;
      ani = salary - contribution;
    } else {
      // Relief at source: paid from net pay; the provider adds basic-rate relief;
      // basic and higher rate limits extend by the gross contribution.
      ani = salary - contribution;
      bandExtension = contribution;
      employeeCost = contribution * (1 - bandRate(false, 'Basic'));
    }
  }

  let incomeTax = 0;
  let personalAllowance = 0;
  if (code.kind === 'flat') {
    incomeTax = taxPay * bandRate(scottish, code.band);
  } else if (code.kind === 'allowance') {
    personalAllowance = code.standard
      ? calcPersonalAllowance(ani)
      : code.taper
        ? taperedAllowance(code.allowance, ani)
        : code.allowance;
    const base = scottish ? SCOTTISH_BANDS : UK_BANDS;
    const bands: [number, number][] = base.map(([from, rate]) => [from > 0 ? from + bandExtension : 0, rate]);
    incomeTax = calcIncomeTax(taxPay, bands, personalAllowance);
  }

  const ni = calcNI(nicPay);
  const plan = a.str('plan') as StudentLoanPlan;
  let studentLoan = calcStudentLoan(nicPay, plan);
  if (a.bool('postgrad')) {
    if (plan === 'postgrad') fail('plan=postgrad and postgrad=true are the same loan; use one');
    studentLoan += calcStudentLoan(nicPay, 'postgrad');
  }

  const takeHome = salary - incomeTax - ni - studentLoan - employeeCost;
  return {
    takeHome,
    monthly: takeHome / 12,
    weekly: takeHome / 52,
    incomeTax,
    ni,
    studentLoan,
    pension: employeeCost,
    pensionPot: contribution,
    ani,
    personalAllowance,
    taxRate: salary > 0 ? ((incomeTax + ni) / salary) * 100 : 0,
  };
}

const UK_PAY_OPTIONS: ParamSpec[] = [
  { name: 'pension', type: 'number', doc: 'pension contribution as % of salary (gross, into the pot)', default: 0, min: 0, max: 100 },
  { name: 'pensionAmount', type: 'number', doc: 'pension contribution in £ a year (gross), instead of pension=%', default: 0, min: 0 },
  {
    name: 'method',
    type: 'string',
    doc: 'how the pension is paid: sacrifice (salary sacrifice), net (net pay arrangement) or ras (relief at source); required when a pension is given',
    default: '',
    oneOf: ['', 'sacrifice', 'net', 'ras'],
    aliases: { salarySacrifice: 'sacrifice', netPay: 'net', reliefAtSource: 'ras' },
  },
  { name: 'plan', type: 'string', doc: 'student loan plan: none, plan1, plan2, plan4, plan5 or postgrad', default: 'none', oneOf: STUDENT_PLANS },
  { name: 'postgrad', type: 'boolean', doc: 'also repaying a Postgraduate Loan (on top of plan=)', default: false },
  { name: 'code', type: 'string', doc: "tax code, quoted, e.g. code='S1257L' or code=BR", default: '1257L' },
  { name: 'scottish', type: 'boolean', doc: 'Scottish taxpayer (Scottish bands); an S tax code implies it' },
  ukYear,
];

const UK_PAY_FIELDS = {
  takeHome: 'annual take-home pay (£)',
  monthly: 'take-home / 12',
  weekly: 'take-home / 52',
  incomeTax: 'income tax (£ a year)',
  ni: 'employee National Insurance (£ a year)',
  studentLoan: 'student loan repayments (£ a year)',
  pension: 'what the pension costs from pay (£ a year; under ras, the net 80%)',
  pensionPot: 'gross contribution into the pot (£ a year)',
  ani: 'adjusted net income (£), which drives the £100k allowance taper',
  personalAllowance: 'personal allowance after any taper (£)',
  taxRate: '(income tax + NI) as % of salary',
} as const;

/** UK income tax + NI + student loan, i.e. everything a pay rise is taxed by. */
function ukDeductions(salary: number, a: Args): number {
  const r = ukPay(salary, a);
  return r.incomeTax + r.ni + r.studentLoan;
}

/* ════════════════════════════════════════════════════════════
 * US income: federal tax, FICA, flat state rate, 401(k)
 * ════════════════════════════════════════════════════════════ */

const STATUS: ParamSpec = {
  name: 'status',
  type: 'string',
  doc: 'filing status: single, married (filing jointly) or head (of household)',
  default: 'single',
  oneOf: ['single', 'married', 'head'],
  aliases: { mfj: 'married', joint: 'married', hoh: 'head' },
};

export interface UsPayResult {
  [field: string]: number;
  takeHome: number;
  monthly: number;
  biweekly: number;
  weekly: number;
  federal: number;
  fica: number;
  socialSecurity: number;
  medicare: number;
  state: number;
  k401: number;
  taxRate: number;
  effectiveRate: number;
}

/*
 * Mirrors SalaryCalc.tsx (annual mode, no overtime): 401(k) capped at the IRS
 * elective deferral limit, reduces federal and state taxable pay but not FICA;
 * state tax is the flat effective-rate input. INTERIM until W1-TAX moves the
 * salary logic into src/lib.
 */
function usPay(salary: number, a: Args): UsPayResult {
  checkUsYear(a);
  const status = a.str('status') as FilingStatus;
  const pct = a.num('k401');
  const amount = a.num('k401Amount');
  if (pct > 0 && amount > 0) fail('use k401 (% of salary) or k401Amount ($ a year), not both');
  const requested = pct > 0 ? (salary * pct) / 100 : amount;
  if (requested > salary) fail(`401(k) contribution (${requested}) is more than the salary (${salary})`);
  const k401 = Math.min(requested, US_401K.limit);
  const federal = calcFederalTax(salary - k401, status);
  const fica = calcFICA(salary, status);
  const state = ((salary - k401) * a.num('state')) / 100;
  const takeHome = salary - federal - fica.total - state - k401;
  return {
    takeHome,
    monthly: takeHome / 12,
    biweekly: takeHome / 26,
    weekly: takeHome / 52,
    federal,
    fica: fica.total,
    socialSecurity: fica.ss,
    medicare: fica.medicare,
    state,
    k401,
    taxRate: salary > 0 ? ((federal + fica.total + state) / salary) * 100 : 0,
    effectiveRate: salary > 0 ? ((federal + fica.total + state + k401) / salary) * 100 : 0,
  };
}

const US_PAY_OPTIONS: ParamSpec[] = [
  STATUS,
  { name: 'state', type: 'number', doc: 'flat state (and local) income tax rate in %, as in the calculator', default: 0, min: 0, max: 20 },
  { name: 'k401', type: 'number', doc: '401(k) contribution as % of salary (capped at the IRS limit, like the calculator)', default: 0, min: 0, max: 100 },
  { name: 'k401Amount', type: 'number', doc: '401(k) contribution in $ a year, instead of k401=%', default: 0, min: 0 },
  usYear,
];

const US_PAY_FIELDS = {
  takeHome: 'annual take-home pay ($)',
  monthly: 'take-home / 12',
  biweekly: 'take-home / 26',
  weekly: 'take-home / 52',
  federal: 'federal income tax ($)',
  fica: 'Social Security + Medicare ($)',
  socialSecurity: 'Social Security ($)',
  medicare: 'Medicare incl. Additional Medicare ($)',
  state: 'state tax at the flat rate given ($)',
  k401: '401(k) contribution after the cap ($)',
  taxRate: '(federal + FICA + state) as % of salary',
  effectiveRate: 'all deductions incl. 401(k) as % of salary (the calculator\'s "effective rate")',
} as const;

function usBracket(salary: number, a: Args): number {
  const r = usPay(salary, a);
  const status = a.str('status') as FilingStatus;
  const taxable = salary - r.k401 - US_STANDARD_DEDUCTION[status];
  if (taxable <= 0) return 0;
  let rate = 0;
  for (const [from, bracketRate] of US_BRACKETS[status]) {
    if (taxable > from) rate = bracketRate;
  }
  return rate * 100;
}

/* ════════════════════════════════════════════════════════════
 * Facts from the rates modules
 * ════════════════════════════════════════════════════════════ */

const pctOf = (fraction: number) => fraction * 100;

/** UK facts: key -> [value, description]. Rates are percentages. */
const UK_FACTS: Record<string, [() => number, string]> = {
  personalAllowance: [() => UK_INCOME_TAX.personalAllowance, 'personal allowance (£)'],
  basicBand: [() => UK_INCOME_TAX.bands[1].from, 'width of the basic-rate band above the allowance (£)'],
  higherRateThreshold: [() => UK_INCOME_TAX.personalAllowance + UK_INCOME_TAX.bands[1].from, 'salary where 40% starts with the standard allowance (£)'],
  additionalRateThreshold: [() => UK_INCOME_TAX.bands[2].from, 'income where 45% starts (£)'],
  paTaperThreshold: [() => UK_INCOME_TAX.paTaperThreshold, 'adjusted net income where the allowance starts to taper (£)'],
  paTaperLimit: [() => UK_INCOME_TAX.paTaperLimit, 'adjusted net income where the allowance is gone (£)'],
  basicRate: [() => pctOf(UK_INCOME_TAX.bands[0].rate), 'basic rate (%)'],
  higherRate: [() => pctOf(UK_INCOME_TAX.bands[1].rate), 'higher rate (%)'],
  additionalRate: [() => pctOf(UK_INCOME_TAX.bands[2].rate), 'additional rate (%)'],
  niPrimaryThreshold: [() => UK_NI.primaryThreshold, 'employee NI primary threshold (£ a year)'],
  niUpperEarningsLimit: [() => UK_NI.upperEarningsLimit, 'employee NI upper earnings limit (£ a year)'],
  niMainRate: [() => pctOf(UK_NI.mainRate), 'employee NI main rate (%)'],
  niUpperRate: [() => pctOf(UK_NI.upperRate), 'employee NI rate above the upper earnings limit (%)'],
  employerNiRate: [() => pctOf(UK_EMPLOYER_NI.rate), 'employer NI rate (%)'],
  employerNiThreshold: [() => UK_EMPLOYER_NI.secondaryThreshold, 'employer NI secondary threshold (£ a year)'],
  statePensionWeekly: [() => UK_STATE_PENSION.weeklyRate, 'full new State Pension (£ a week)'],
  statePensionAnnual: [() => UK_STATE_PENSION.weeklyRate * 52, 'full new State Pension x 52 (£ a year)'],
  plan1Threshold: [() => UK_STUDENT_LOANS.plan1.threshold, 'Plan 1 repayment threshold (£ a year)'],
  plan2Threshold: [() => UK_STUDENT_LOANS.plan2.threshold, 'Plan 2 repayment threshold (£ a year)'],
  plan4Threshold: [() => UK_STUDENT_LOANS.plan4.threshold, 'Plan 4 repayment threshold (£ a year)'],
  plan5Threshold: [() => UK_STUDENT_LOANS.plan5.threshold, 'Plan 5 repayment threshold (£ a year)'],
  postgradThreshold: [() => UK_STUDENT_LOANS.postgrad.threshold, 'Postgraduate Loan threshold (£ a year)'],
  studentLoanRate: [() => pctOf(UK_STUDENT_LOANS.plan2.rate), 'undergraduate plan repayment rate (%)'],
  postgradRate: [() => pctOf(UK_STUDENT_LOANS.postgrad.rate), 'Postgraduate Loan repayment rate (%)'],
  cgtAnnualExempt: [() => UK_CGT.annualExempt, 'CGT annual exempt amount (£)'],
  cgtBasicRate: [() => pctOf(UK_CGT.basicRate), 'CGT rate in the basic band (%)'],
  cgtHigherRate: [() => pctOf(UK_CGT.higherRate), 'CGT higher rate (%)'],
  sdltFtbCap: [() => UK_SDLT.firstTimeBuyerCap, 'price cap for first-time buyer relief (£)'],
  sdltFtbNilBand: [() => UK_SDLT.firstTimeBuyer[0].to, 'first-time buyer 0% band top (£)'],
  sdltNilBand: [() => UK_SDLT.standard[0].to, 'standard 0% band top (£)'],
  sdltSurcharge: [() => pctOf(UK_SDLT.additionalSurcharge), 'additional-property surcharge (%)'],
  pensionAccessAge: [() => UK_PENSION_AGES.normalMinimumPensionAge, 'normal minimum pension age'],
  pensionAccessAgeFrom2028: [() => UK_PENSION_AGES.normalMinimumPensionAgeFrom2028, 'normal minimum pension age from 6 Apr 2028'],
  statePensionAge: [() => UK_PENSION_AGES.statePensionAge, 'State Pension age'],
  statePensionAgeFrom2028: [() => UK_PENSION_AGES.statePensionAgeFrom2028, 'State Pension age by 2028'],
  mortgageIncomeMultiple: [() => UK_MORTGAGE.incomeMultipleCap, 'typical lender loan-to-income cap (x income)'],
};

/** US facts: key -> [value(status), description]. Rates are percentages. */
const US_FACTS: Record<string, [(s: FilingStatus) => number, string]> = {
  standardDeduction: [(s) => US_STANDARD_DEDUCTION[s], 'standard deduction ($, by status)'],
  ssWageBase: [() => US_SOCIAL_SECURITY.wageCap, 'Social Security wage base ($)'],
  ssRate: [() => pctOf(US_SOCIAL_SECURITY.rate), 'employee Social Security rate (%)'],
  medicareRate: [() => pctOf(US_MEDICARE.rate), 'employee Medicare rate (%)'],
  additionalMedicareRate: [() => pctOf(US_MEDICARE.additionalRate), 'Additional Medicare Tax rate (%)'],
  additionalMedicareThreshold: [(s) => US_MEDICARE.additionalThreshold[s], 'Additional Medicare threshold ($, by status)'],
  k401Limit: [() => US_401K.limit, '401(k) employee elective deferral limit ($)'],
  k401CatchUp: [() => US_401K.catchUp, '401(k) catch-up, age 50+ ($)'],
  niitRate: [() => pctOf(US_CAPITAL_GAINS.niit.rate), 'Net Investment Income Tax rate (%)'],
  niitThreshold: [(s) => US_CAPITAL_GAINS.niit.threshold[s], 'NIIT threshold ($, by status)'],
  ltcgZeroTop: [(s) => US_CAPITAL_GAINS.longTerm[s][1].from, 'taxable income where the 0% long-term gains band ends ($, by status)'],
  ltcg15Top: [(s) => US_CAPITAL_GAINS.longTerm[s][2].from, 'taxable income where the 15% band ends ($, by status)'],
};

function usBracketStart(ratePct: number, status: FilingStatus): number {
  const hit = US_BRACKETS[status].find(([, r]) => Math.abs(r * 100 - ratePct) < 1e-9);
  if (!hit) {
    const rates = US_BRACKETS[status].map(([, r]) => r * 100).join(', ');
    fail(`there is no ${ratePct}% federal bracket (brackets: ${rates})`);
  }
  return hit[0];
}

/* ════════════════════════════════════════════════════════════
 * Loans, mortgages and debt
 * ════════════════════════════════════════════════════════════ */

function termMonths(years: number): number {
  const n = Math.round(years * 12);
  if (Math.abs(years * 12 - n) > 1e-9) fail(`term ${years} years is not a whole number of months`);
  return n;
}

/** Remaining balance after k scheduled payments (closed form). */
function balanceAfter(principal: number, ratePct: number, n: number, k: number): number {
  const r = ratePct / 1200;
  const payment = loanMonthlyPayment(principal, ratePct / 100, n);
  if (r === 0) return Math.max(0, principal - payment * k);
  const g = Math.pow(1 + r, k);
  return Math.max(0, principal * g - (payment * (g - 1)) / r);
}

/**
 * Amortization with optional overpayments. Mirrors MortgagePaymentCalc.tsx's
 * buildAmortization (a payment never exceeds balance + interest); `yearly` is
 * an extra lump paid with every 12th payment.
 */
function amortize(principal: number, ratePct: number, n: number, extraMonthly: number, extraYearly: number) {
  const r = ratePct / 1200;
  const base = loanMonthlyPayment(principal, ratePct / 100, n);
  let balance = principal;
  let interestTotal = 0;
  let months = 0;
  for (let m = 1; m <= n && balance > 0.01; m++) {
    const interest = balance * r;
    const due = base + extraMonthly + (m % 12 === 0 ? extraYearly : 0);
    const payment = Math.min(due, balance + interest);
    balance = Math.max(0, balance - (payment - interest));
    interestTotal += interest;
    months = m;
  }
  return { months, interest: interestTotal };
}

const CARD_MAX_MONTHS = 1200;

export interface PayoffResult {
  [field: string]: number | boolean;
  months: number;
  interest: number;
  totalPaid: number;
  never: boolean;
  firstInterest: number;
  firstPayment: number;
}

/*
 * INTERIM: mirrors CreditCardPayoffCalc.tsx's simulatePayoff with the W1-DEBT
 * (DB-1) rule applied: a payment that does not exceed the month's interest
 * means the debt is never repaid, and then months/interest/totalPaid are
 * Infinity (the `months` formatter prints "never"; money formatters refuse).
 * Re-point to src/lib/credit-card.ts when it merges (check its month cap).
 */
function payoff(
  balance: number,
  aprPct: number,
  mode: { fixed: number } | { pct: number; floor: number },
  extra: number,
): PayoffResult {
  const r = aprPct / 1200;
  const firstInterest = balance * r;
  const due0 = 'fixed' in mode ? mode.fixed : Math.max((balance * mode.pct) / 100, mode.floor);
  const firstPayment = Math.min(due0 + extra, balance + firstInterest);
  let remaining = balance;
  let interestTotal = 0;
  let paid = 0;
  let months = 0;
  const never = (): PayoffResult => ({
    months: Infinity,
    interest: Infinity,
    totalPaid: Infinity,
    never: true,
    firstInterest,
    firstPayment,
  });
  while (remaining > 0.01) {
    if (months >= CARD_MAX_MONTHS) return never();
    months++;
    const interest = remaining * r;
    const due = 'fixed' in mode ? mode.fixed : Math.max((remaining * mode.pct) / 100, mode.floor);
    const payment = Math.min(due + extra, remaining + interest);
    if (payment <= interest + 1e-9) return never();
    interestTotal += interest;
    paid += payment;
    remaining = Math.max(0, remaining - (payment - interest));
  }
  return { months, interest: interestTotal, totalPaid: paid, never: false, firstInterest, firstPayment };
}

function payoffBalance(balance: number, aprPct: number, payment: number, months: number): number {
  const r = aprPct / 1200;
  let remaining = balance;
  for (let m = 0; m < months && remaining > 0.01; m++) {
    const interest = remaining * r;
    remaining = Math.max(0, remaining + interest - Math.min(payment, remaining + interest));
  }
  return remaining <= 0.01 ? 0 : remaining;
}

const PAYOFF_FIELDS = {
  months: 'months to clear the balance (Infinity if never)',
  interest: 'total interest paid (Infinity if never)',
  totalPaid: 'balance + interest (Infinity if never)',
  never: 'true when the payment never clears the debt',
  firstInterest: "first month's interest",
  firstPayment: 'first payment actually made',
} as const;

/* ════════════════════════════════════════════════════════════
 * Saving and investing
 * ════════════════════════════════════════════════════════════ */

const COMPOUNDING_WORDS: Record<string, number> = {
  annually: 1,
  yearly: 1,
  semiannually: 2,
  quarterly: 4,
  monthly: 12,
  weekly: 52,
  daily: 365,
};
const COMPOUNDING: ParamSpec = {
  name: 'compounding',
  type: 'number',
  doc: 'compounding periods a year: 1, 2, 4, 12, 52, 365 or annually/quarterly/monthly/weekly/daily (default monthly, like the calculator)',
  default: 12,
  coerce: (v) => {
    if (typeof v === 'string') {
      const n = Object.hasOwn(COMPOUNDING_WORDS, v) ? COMPOUNDING_WORDS[v] : undefined;
      if (n === undefined) fail(`compounding must be a number or one of ${Object.keys(COMPOUNDING_WORDS).join(', ')} (got "${v}")`);
      return n;
    }
    return v;
  },
};
const TIMING: ParamSpec = {
  name: 'timing',
  type: 'string',
  doc: "when contributions are made: end (default) or beginning of each period",
  default: 'end',
  oneOf: ['end', 'beginning'],
  aliases: { start: 'beginning' },
};

function checkCompounding(n: number): void {
  if (![1, 2, 4, 12, 52, 365].includes(n)) fail(`compounding must be 1, 2, 4, 12, 52 or 365 (got ${n})`);
}

/* ════════════════════════════════════════════════════════════
 * The catalogue
 * ════════════════════════════════════════════════════════════ */

const fns: FigureFunction[] = [
  /* ── UK pay ── */
  {
    name: 'ukPay',
    group: 'UK pay',
    interim: 'W1-UK salary lib + uk-tax-codes.ts (UK-1..UK-4)',
    summary: 'Full UK pay breakdown for one salary (England/Wales/NI bands unless Scottish).',
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'object',
    fields: UK_PAY_FIELDS,
    example: "ukPay(60000, pension=5, method=sacrifice, plan=plan2).studentLoan | gbp",
    run: (a) => ukPay(a.num('salary'), a),
  },
  {
    name: 'ukTakeHome',
    group: 'UK pay',
    interim: 'W1-UK salary lib + uk-tax-codes.ts (UK-1..UK-4)',
    summary: 'Annual take-home pay (same options as ukPay).',
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'number (£ a year)',
    example: 'ukTakeHome(30000, plan=plan2) | gbp',
    run: (a) => ukPay(a.num('salary'), a).takeHome,
  },
  {
    name: 'ukIncomeTax',
    group: 'UK pay',
    interim: 'W1-UK salary lib + uk-tax-codes.ts (UK-1..UK-4)',
    summary: 'Income tax for the year (same options as ukPay).',
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'number (£ a year)',
    example: 'ukIncomeTax(50000) | gbp',
    run: (a) => ukPay(a.num('salary'), a).incomeTax,
  },
  {
    name: 'ukNi',
    group: 'UK pay',
    interim: 'W1-UK salary lib + uk-tax-codes.ts (UK-1..UK-4)',
    summary: 'Employee National Insurance for the year (same options as ukPay).',
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'number (£ a year)',
    example: 'ukNi(50000) | gbp',
    run: (a) => ukPay(a.num('salary'), a).ni,
  },
  {
    name: 'ukStudentLoan',
    group: 'UK pay',
    interim: 'W1-UK salary lib + uk-tax-codes.ts (UK-1..UK-4)',
    summary: 'Student loan repayments for the year; needs plan= (same options as ukPay).',
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'number (£ a year)',
    example: 'ukStudentLoan(35000, plan=plan2) | gbp',
    run: (a) => {
      if (a.str('plan') === 'none' && !a.bool('postgrad')) fail('ukStudentLoan needs plan= (e.g. plan=plan2)');
      return ukPay(a.num('salary'), a).studentLoan;
    },
  },
  {
    name: 'ukMarginalRate',
    group: 'UK pay',
    interim: 'W1-UK salary lib + uk-tax-codes.ts (UK-1..UK-4)',
    summary: 'Share of the next £2 of salary lost to income tax + NI + student loan, in % (shows the 60% trap).',
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'number (%)',
    example: 'ukMarginalRate(110000) | pct',
    run: (a) => {
      const s = a.num('salary');
      return ((ukDeductions(s + 2, a) - ukDeductions(s, a)) / 2) * 100;
    },
  },
  {
    name: 'ukFact',
    group: 'Facts',
    summary: 'A UK rate or threshold from uk-rates.ts (rates in %).',
    params: [{ name: 'key', type: 'string', doc: 'fact name (see the list in docs/figures.md)', required: true, oneOf: Object.keys(UK_FACTS) }],
    options: [ukYear],
    returns: 'number',
    example: "ukFact('plan2Threshold') | gbp",
    run: (a) => {
      checkUkYear(a);
      return UK_FACTS[a.str('key')][0]();
    },
  },
  {
    name: 'ukCgt',
    group: 'UK tax',
    summary: 'UK Capital Gains Tax on a gain, with the rate band worked out from income (2026/27 rates).',
    params: [money('gain', 'the gain (£)'), money('income', 'taxable income before the gain (£, gross salary etc.)')],
    options: [ukYear],
    returns: 'number (£)',
    example: 'ukCgt(50000, 40000) | gbp',
    run: (a) => {
      checkUkYear(a);
      // 'basic' makes the engine derive the band from income: unused basic band
      // is taxed at the basic CGT rate, the rest at the higher rate.
      return calculateUKCgt(0, a.num('gain'), a.num('income')).totalTax;
    },
  },
  {
    name: 'sdlt',
    group: 'UK tax',
    summary: 'Stamp Duty Land Tax (England and Northern Ireland) on a purchase price.',
    params: [money('price', 'purchase price (£)')],
    options: [
      {
        name: 'buyer',
        type: 'string',
        doc: 'standard, ftb (first-time buyer) or additional (second home / buy-to-let)',
        default: 'standard',
        oneOf: ['standard', 'first-time', 'additional'],
        aliases: { ftb: 'first-time', firstTime: 'first-time', second: 'additional' },
      },
      ukYear,
    ],
    returns: 'number (£)',
    example: 'sdlt(425000, buyer=ftb) | gbp',
    run: (a) => {
      checkUkYear(a);
      return calculateSdlt(a.num('price'), a.str('buyer') as BuyerType).totalTax;
    },
  },

  /* ── US pay ── */
  {
    name: 'usPay',
    group: 'US pay',
    interim: 'W1-TAX salary lib (TX-1..TX-4)',
    summary: 'Full US pay breakdown: federal tax, FICA, flat state rate, 401(k).',
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'object',
    fields: US_PAY_FIELDS,
    example: 'usPay(75000, state=5).federal | usd',
    run: (a) => usPay(a.num('salary'), a),
  },
  {
    name: 'usTakeHome',
    group: 'US pay',
    interim: 'W1-TAX salary lib (TX-1..TX-4)',
    summary: 'Annual take-home pay (same options as usPay).',
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'number ($ a year)',
    example: 'usTakeHome(75000) | usd',
    run: (a) => usPay(a.num('salary'), a).takeHome,
  },
  {
    name: 'usFederalTax',
    group: 'US pay',
    interim: 'W1-TAX salary lib (TX-1..TX-4)',
    summary: 'Federal income tax after the standard deduction (same options as usPay).',
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'number ($ a year)',
    example: 'usFederalTax(100000, status=married) | usd',
    run: (a) => usPay(a.num('salary'), a).federal,
  },
  {
    name: 'usFica',
    group: 'US pay',
    interim: 'W1-TAX salary lib (TX-1..TX-4)',
    summary: 'Social Security + Medicare (same options as usPay).',
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'number ($ a year)',
    example: 'usFica(75000) | usd',
    run: (a) => usPay(a.num('salary'), a).fica,
  },
  {
    name: 'usBracket',
    group: 'US pay',
    interim: 'W1-TAX salary lib (TX-1..TX-4)',
    summary: 'Federal bracket (%) that the next dollar of taxable pay falls in (0 below the standard deduction).',
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'number (%)',
    example: 'usBracket(60000) | pct',
    run: (a) => usBracket(a.num('salary'), a),
  },
  {
    name: 'usMarginalRate',
    group: 'US pay',
    interim: 'W1-TAX salary lib (TX-1..TX-4)',
    summary: 'Share of the next $1 lost to federal tax + FICA + state, in %.',
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'number (%)',
    example: 'usMarginalRate(75000, state=5) | pct1',
    run: (a) => {
      const s = a.num('salary');
      const lost = (x: number) => {
        const r = usPay(x, a);
        return r.federal + r.fica + r.state;
      };
      return (lost(s + 1) - lost(s)) * 100;
    },
  },
  {
    name: 'usFact',
    group: 'Facts',
    summary: 'A US federal rate or threshold from us-rates.ts (rates in %).',
    params: [{ name: 'key', type: 'string', doc: 'fact name (see the list in docs/figures.md)', required: true, oneOf: Object.keys(US_FACTS) }],
    options: [STATUS, usYear],
    returns: 'number',
    example: "usFact('standardDeduction', status=married) | usd",
    run: (a) => {
      checkUsYear(a);
      return US_FACTS[a.str('key')][0](a.str('status') as FilingStatus);
    },
  },
  {
    name: 'usBracketStart',
    group: 'Facts',
    summary: 'Taxable income where a federal bracket starts.',
    params: [{ name: 'rate', type: 'number', doc: 'bracket rate in % (10, 12, 22, 24, 32, 35, 37)', required: true }],
    options: [STATUS, usYear],
    returns: 'number ($ of taxable income)',
    example: 'usBracketStart(22) | usd',
    run: (a) => {
      checkUsYear(a);
      return usBracketStart(a.num('rate'), a.str('status') as FilingStatus);
    },
  },
  {
    name: 'usCgt',
    group: 'US tax',
    summary: 'US federal capital gains tax incl. NIIT on a gain stacked on taxable income.',
    params: [money('gain', 'the gain ($)'), money('income', 'ordinary TAXABLE income before the gain ($, after deductions)')],
    options: [
      STATUS,
      { name: 'holding', type: 'string', doc: 'long (over a year, default) or short', default: 'long', oneOf: ['long', 'short'] },
      usYear,
    ],
    returns: 'number ($)',
    example: 'usCgt(50000, 80000) | usd',
    run: (a) => {
      checkUsYear(a);
      return calculateUSCgt(
        0,
        a.num('gain'),
        a.str('holding') as 'long' | 'short',
        a.str('status') as FilingStatus,
        a.num('income'),
      ).totalTax;
    },
  },

  /* ── Loans and mortgages ── */
  {
    name: 'loanPayment',
    group: 'Loans',
    summary: 'Monthly repayment on an amortizing loan (principal and interest only).',
    params: [money('principal', 'amount borrowed', { above: 0, min: undefined }), ratePct('rate', 'annual interest rate in %'), termYears],
    returns: 'number (per month)',
    example: 'loanPayment(50000, 7, 4) | usd',
    run: (a) => loanMonthlyPayment(a.num('principal'), a.num('rate') / 100, termMonths(a.num('years'))),
  },
  {
    name: 'mortgagePayment',
    group: 'Loans',
    summary: 'Monthly principal-and-interest payment (no tax, insurance or PMI). Same as loanPayment.',
    params: [money('principal', 'loan amount', { above: 0, min: undefined }), ratePct('rate', 'annual interest rate in %'), termYears],
    returns: 'number (per month)',
    example: 'mortgagePayment(300000, 7, 30) | usd(2)',
    run: (a) => loanMonthlyPayment(a.num('principal'), a.num('rate') / 100, termMonths(a.num('years'))),
  },
  {
    name: 'loanTotalInterest',
    group: 'Loans',
    summary: 'Total interest over the full term with no overpayments.',
    params: [money('principal', 'amount borrowed', { above: 0, min: undefined }), ratePct('rate', 'annual interest rate in %'), termYears],
    returns: 'number',
    example: 'loanTotalInterest(50000, 7, 4) | usd',
    run: (a) => {
      const n = termMonths(a.num('years'));
      return loanMonthlyPayment(a.num('principal'), a.num('rate') / 100, n) * n - a.num('principal');
    },
  },
  {
    name: 'mortgageTotalInterest',
    group: 'Loans',
    summary: 'Total mortgage interest over the full term. Same as loanTotalInterest.',
    params: [money('principal', 'loan amount', { above: 0, min: undefined }), ratePct('rate', 'annual interest rate in %'), termYears],
    returns: 'number',
    example: 'mortgageTotalInterest(300000, 7, 30) | usd',
    run: (a) => {
      const n = termMonths(a.num('years'));
      return loanMonthlyPayment(a.num('principal'), a.num('rate') / 100, n) * n - a.num('principal');
    },
  },
  {
    name: 'loanBalance',
    group: 'Loans',
    summary: 'Balance still owed after a number of scheduled monthly payments.',
    params: [
      money('principal', 'amount borrowed', { above: 0, min: undefined }),
      ratePct('rate', 'annual interest rate in %'),
      termYears,
      { name: 'afterMonths', type: 'number', doc: 'payments made so far', required: true, min: 0, integer: true },
    ],
    returns: 'number',
    example: 'loanBalance(300000, 6.5, 30, 120) | usd',
    run: (a) => {
      const n = termMonths(a.num('years'));
      const k = a.num('afterMonths');
      if (k > n) fail(`afterMonths (${k}) is beyond the ${n}-month term`);
      return balanceAfter(a.num('principal'), a.num('rate'), n, k);
    },
  },
  {
    name: 'loanMonth',
    group: 'Loans',
    summary: 'One row of the amortization schedule.',
    params: [
      money('principal', 'amount borrowed', { above: 0, min: undefined }),
      ratePct('rate', 'annual interest rate in %'),
      termYears,
      { name: 'month', type: 'number', doc: 'payment number, 1 = first', required: true, min: 1, integer: true },
    ],
    returns: 'object',
    fields: {
      payment: 'scheduled payment',
      interest: 'interest part of this payment',
      principal: 'principal part of this payment',
      balance: 'balance after this payment',
      principalShare: 'principal as % of the payment',
    },
    example: 'loanMonth(50000, 7, 4, 1).interest | usd',
    run: (a) => {
      const P = a.num('principal');
      const n = termMonths(a.num('years'));
      const k = a.num('month');
      if (k > n) fail(`month ${k} is beyond the ${n}-month term`);
      const payment = loanMonthlyPayment(P, a.num('rate') / 100, n);
      const before = balanceAfter(P, a.num('rate'), n, k - 1);
      const interest = (before * a.num('rate')) / 1200;
      const principal = Math.min(payment - interest, before);
      return {
        payment,
        interest,
        principal,
        balance: balanceAfter(P, a.num('rate'), n, k),
        principalShare: (principal / payment) * 100,
      };
    },
  },
  {
    name: 'loanYear',
    group: 'Loans',
    summary: 'Totals for one year (12 payments) of the schedule.',
    params: [
      money('principal', 'amount borrowed', { above: 0, min: undefined }),
      ratePct('rate', 'annual interest rate in %'),
      termYears,
      { name: 'year', type: 'number', doc: 'loan year, 1 = first 12 payments', required: true, min: 1, integer: true },
    ],
    returns: 'object',
    fields: {
      interest: 'interest paid in that year',
      principal: 'principal repaid in that year',
      endBalance: 'balance at the end of that year',
    },
    example: 'loanYear(300000, 7, 30, 1).interest | usd',
    run: (a) => {
      const P = a.num('principal');
      const rate = a.num('rate');
      const n = termMonths(a.num('years'));
      const y = a.num('year');
      const first = (y - 1) * 12;
      if (first >= n) fail(`year ${y} is beyond the ${n}-month term`);
      const last = Math.min(y * 12, n);
      const payment = loanMonthlyPayment(P, rate / 100, n);
      const start = balanceAfter(P, rate, n, first);
      const end = balanceAfter(P, rate, n, last);
      const principal = start - end;
      return { interest: payment * (last - first) - principal, principal, endBalance: end };
    },
  },
  {
    name: 'overpaymentSaving',
    group: 'Loans',
    summary: 'What regular overpayments save on a loan or mortgage (same rules as the mortgage calculator).',
    params: [money('principal', 'amount borrowed', { above: 0, min: undefined }), ratePct('rate', 'annual interest rate in %'), termYears],
    options: [
      { name: 'monthly', type: 'number', doc: 'extra paid every month', default: 0, min: 0 },
      { name: 'yearly', type: 'number', doc: 'extra lump paid with every 12th payment (e.g. a 13th payment)', default: 0, min: 0 },
    ],
    returns: 'object',
    fields: {
      interestSaved: 'interest saved vs no overpayments',
      monthsSaved: 'months knocked off the term',
      months: 'months to pay off with overpayments',
      interest: 'total interest with overpayments',
      baseInterest: 'total interest without overpayments',
    },
    example: 'overpaymentSaving(300000, 7, 30, monthly=200).interestSaved | usd',
    run: (a) => {
      if (a.num('monthly') === 0 && a.num('yearly') === 0) fail('give monthly= and/or yearly= overpayments');
      const P = a.num('principal');
      const n = termMonths(a.num('years'));
      const base = amortize(P, a.num('rate'), n, 0, 0);
      const extra = amortize(P, a.num('rate'), n, a.num('monthly'), a.num('yearly'));
      return {
        interestSaved: base.interest - extra.interest,
        monthsSaved: base.months - extra.months,
        months: extra.months,
        interest: extra.interest,
        baseInterest: base.interest,
      };
    },
  },
  {
    name: 'cardPayoff',
    group: 'Debt',
    interim: 'W1-DEBT credit-card.ts (DB-1)',
    summary: 'Paying down a card or loan balance: a fixed payment, or a percentage minimum with a floor.',
    params: [
      money('balance', 'starting balance', { above: 0, min: undefined }),
      ratePct('apr', 'APR in %'),
      { name: 'payment', type: 'number', doc: 'fixed monthly payment (omit when using minPct)', above: 0 },
    ],
    options: [
      { name: 'minPct', type: 'number', doc: 'minimum payment as % of the current balance (declining minimum)', above: 0, max: 100 },
      { name: 'minFloor', type: 'number', doc: 'lowest minimum payment, required with minPct (e.g. 25 for US cards, 5 for UK)', min: 0 },
      { name: 'extra', type: 'number', doc: 'extra paid on top every month', default: 0, min: 0 },
    ],
    returns: 'object',
    fields: PAYOFF_FIELDS,
    example: 'cardPayoff(5000, 22.99, 100).months | months',
    run: (a) => {
      const hasFixed = a.has('payment');
      const hasPct = a.has('minPct');
      if (hasFixed && hasPct) fail('give either a fixed payment or minPct, not both');
      if (!hasFixed && !hasPct) fail('give a fixed monthly payment (third argument) or minPct= with minFloor=');
      if (hasPct && !a.has('minFloor')) fail('minPct needs minFloor= (the lowest minimum payment)');
      if (!hasPct && a.has('minFloor')) fail('minFloor only applies with minPct');
      const mode = hasFixed ? { fixed: a.num('payment') } : { pct: a.num('minPct'), floor: a.num('minFloor') };
      return payoff(a.num('balance'), a.num('apr'), mode, a.num('extra'));
    },
  },
  {
    name: 'loanPayoff',
    group: 'Debt',
    interim: 'W1-DEBT credit-card.ts (DB-1)',
    summary: 'Time and interest to clear a balance with a fixed monthly payment (cardPayoff with a fixed payment).',
    params: [
      money('balance', 'starting balance', { above: 0, min: undefined }),
      ratePct('apr', 'annual rate in %'),
      { name: 'payment', type: 'number', doc: 'fixed monthly payment', required: true, above: 0 },
    ],
    options: [{ name: 'extra', type: 'number', doc: 'extra paid on top every month', default: 0, min: 0 }],
    returns: 'object',
    fields: PAYOFF_FIELDS,
    example: 'loanPayoff(50000, 6.5, 600).interest | usd',
    run: (a) => payoff(a.num('balance'), a.num('apr'), { fixed: a.num('payment') }, a.num('extra')),
  },
  {
    name: 'payoffBalance',
    group: 'Debt',
    interim: 'W1-DEBT credit-card.ts (DB-1)',
    summary: 'Balance left after some months of a fixed payment (0 once paid off).',
    params: [
      money('balance', 'starting balance', { above: 0, min: undefined }),
      ratePct('apr', 'annual rate in %'),
      { name: 'payment', type: 'number', doc: 'fixed monthly payment', required: true, above: 0 },
      { name: 'months', type: 'number', doc: 'months of payments', required: true, min: 0, integer: true, max: 1200 },
    ],
    returns: 'number',
    example: 'payoffBalance(50000, 22, 1200, 12) | usd',
    run: (a) => payoffBalance(a.num('balance'), a.num('apr'), a.num('payment'), a.num('months')),
  },

  /* ── Saving and investing ── */
  {
    name: 'compoundFV',
    group: 'Saving and investing',
    summary: 'Future value of a starting sum plus monthly contributions (the compound interest calculator).',
    params: [
      money('start', 'starting amount'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'annual return in %', { max: 50 }),
      termYears,
    ],
    options: [COMPOUNDING, TIMING],
    returns: 'number',
    example: 'compoundFV(10000, 0, 7, 30) | usd',
    run: (a) => {
      checkCompounding(a.num('compounding'));
      return compoundInterest(
        a.num('start'),
        a.num('monthly'),
        a.num('rate') / 100,
        a.num('years'),
        a.num('compounding'),
        a.str('timing') as 'end' | 'beginning',
      );
    },
  },
  {
    name: 'compoundEarned',
    group: 'Saving and investing',
    summary: 'Growth only: compoundFV minus everything paid in.',
    params: [
      money('start', 'starting amount'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'annual return in %', { max: 50 }),
      termYears,
    ],
    options: [COMPOUNDING, TIMING],
    returns: 'number',
    example: 'compoundEarned(10000, 200, 7, 30) | usd',
    run: (a) => {
      checkCompounding(a.num('compounding'));
      const fv = compoundInterest(
        a.num('start'),
        a.num('monthly'),
        a.num('rate') / 100,
        a.num('years'),
        a.num('compounding'),
        a.str('timing') as 'end' | 'beginning',
      );
      return fv - a.num('start') - a.num('monthly') * 12 * a.num('years');
    },
  },
  {
    name: 'retirementFV',
    group: 'Saving and investing',
    summary: 'Retirement pot at retirement, nominal and in today\'s money (the retirement savings calculator).',
    params: [
      money('savings', 'current savings'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'annual return in %', { max: 50 }),
      { name: 'years', type: 'number', doc: 'years until retirement', required: true, min: 0, max: 100 },
    ],
    options: [{ name: 'inflation', type: 'number', doc: 'inflation in % a year for the real value', default: 0, min: 0, max: 50 }],
    returns: 'object',
    fields: {
      nominal: 'pot in future money',
      real: "pot in today's money (deflated by inflation)",
      contributions: 'savings + all monthly contributions',
      growth: 'nominal minus contributions',
    },
    example: 'retirementFV(50000, 500, 7, 35, inflation=3).real | usd',
    run: (a) => {
      const years = a.num('years');
      const nominal = compoundInterest(a.num('savings'), a.num('monthly'), a.num('rate') / 100, years, 12);
      const contributions = a.num('savings') + a.num('monthly') * 12 * years;
      return {
        nominal,
        real: nominal / Math.pow(1 + a.num('inflation') / 100, years),
        contributions,
        growth: nominal - contributions,
      };
    },
  },
  {
    name: 'savingsMonthly',
    group: 'Saving and investing',
    summary: 'Monthly saving needed to reach a goal in a number of months (the savings goal calculator).',
    params: [
      money('goal', 'target amount', { above: 0, min: undefined }),
      money('current', 'already saved'),
      ratePct('rate', 'annual interest in %', { max: 50 }),
      { name: 'months', type: 'number', doc: 'months to the goal', required: true, min: 1, integer: true, max: 1200 },
    ],
    returns: 'number (per month)',
    example: 'savingsMonthly(100000, 0, 4, 60) | usd',
    run: (a) =>
      Math.max(0, monthlySavingsRequired(a.num('goal'), a.num('current'), a.num('rate') / 100, a.num('months'))),
  },
  {
    name: 'savingsMonths',
    group: 'Saving and investing',
    summary: 'Months to reach a goal at a monthly saving rate, rounded up (Infinity if never).',
    params: [
      money('goal', 'target amount', { above: 0, min: undefined }),
      money('current', 'already saved'),
      money('monthly', 'saved each month'),
      ratePct('rate', 'annual interest in %', { max: 50 }),
    ],
    returns: 'number (months)',
    example: 'savingsMonths(50000, 0, 1000, 5) | months',
    run: (a) => {
      const goal = a.num('goal');
      const current = a.num('current');
      const monthly = a.num('monthly');
      const rate = a.num('rate') / 100;
      if (goal <= current) return 0;
      if (monthly <= 0 && rate <= 0) return Infinity;
      const years = solveForTime(current, monthly, rate, goal, 12);
      return Number.isFinite(years) ? Math.ceil(Math.max(0, years) * 12 - 1e-9) : Infinity;
    },
  },
  {
    name: 'yearsToTarget',
    group: 'Saving and investing',
    summary: 'Years for a starting sum plus monthly contributions to reach a target (Infinity if not within 100 years).',
    params: [
      money('start', 'starting amount'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'annual return in %', { max: 50 }),
      money('target', 'target balance', { above: 0, min: undefined }),
    ],
    options: [COMPOUNDING],
    returns: 'number (years, fractional)',
    example: 'yearsToTarget(10000, 500, 7, 1000000) | num(1)',
    run: (a) => {
      checkCompounding(a.num('compounding'));
      if (a.num('start') >= a.num('target')) return 0;
      return solveForTime(a.num('start'), a.num('monthly'), a.num('rate') / 100, a.num('target'), a.num('compounding'));
    },
  },
  {
    name: 'feeDrag',
    group: 'Saving and investing',
    interim: 'W1-DEBT investment fee formula (DB-7)',
    summary: 'What a fund fee costs over time (the investment fee calculator: fee subtracted from the return).',
    params: [
      money('start', 'starting amount'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'gross annual return in %', { max: 50 }),
      termYears,
      ratePct('fee', 'annual fee in % (expense ratio / OCF)', { max: 10 }),
    ],
    options: [{ name: 'compareFee', type: 'number', doc: 'fee to compare against in % (default 0 = no fee)', default: 0, min: 0, max: 10 }],
    returns: 'object',
    fields: {
      cost: 'difference in final balance between the two fees',
      balance: 'final balance at fee',
      compareBalance: 'final balance at compareFee',
      contributions: 'everything paid in',
      shareOfGrowth: 'cost as % of the lower-fee growth',
    },
    example: 'feeDrag(100000, 0, 7, 30, 1).cost | usd',
    run: (a) => {
      // INTERIM: mirrors InvestmentFeeCalc.tsx (effective return = rate - fee,
      // monthly compounding). W1-DEBT DB-7 may change the formula; re-point then.
      const fv = (feePct: number) =>
        compoundInterest(a.num('start'), a.num('monthly'), (a.num('rate') - feePct) / 100, a.num('years'));
      const balance = fv(a.num('fee'));
      const compareBalance = fv(a.num('compareFee'));
      const contributions = a.num('start') + a.num('monthly') * 12 * a.num('years');
      const cost = Math.abs(balance - compareBalance);
      const lowerGrowth = Math.max(balance, compareBalance) - contributions;
      return { cost, balance, compareBalance, contributions, shareOfGrowth: lowerGrowth > 0 ? (cost / lowerGrowth) * 100 : 0 };
    },
  },
  {
    name: 'inflationAdjust',
    group: 'Saving and investing',
    summary: 'Inflation at a steady rate: future cost of something, or what money will be worth.',
    params: [money('amount', 'amount today'), ratePct('rate', 'inflation in % a year', { max: 50 }), {
      name: 'years', type: 'number', doc: 'years ahead', required: true, min: 0, max: 100,
    }],
    options: [{
      name: 'mode',
      type: 'string',
      doc: "cost (default): what it will cost; value: today's money's future purchasing power",
      default: 'cost',
      oneOf: ['cost', 'value'],
      aliases: { power: 'value', purchasingPower: 'value' },
    }],
    returns: 'number',
    example: 'inflationAdjust(100000, 3, 20, mode=value) | usd',
    run: (a) => {
      const g = Math.pow(1 + a.num('rate') / 100, a.num('years'));
      return a.str('mode') === 'value' ? a.num('amount') / g : a.num('amount') * g;
    },
  },

  /* ── Labels, market rates, helpers ── */
  {
    name: 'taxYear',
    group: 'Labels',
    summary: "The tax year the engines currently use: '2026/27' (uk) or '2026' (us).",
    params: [{ name: 'country', type: 'string', doc: 'uk or us', required: true, oneOf: ['uk', 'us'], aliases: { UK: 'uk', US: 'us' } }],
    returns: 'string',
    example: "taxYear('uk')",
    run: (a) => (a.str('country') === 'uk' ? UK_TAX_YEAR : US_TAX_YEAR),
  },
  {
    name: 'rate',
    group: 'Labels',
    summary: 'A dated market rate (US 30-year mortgage, Bank Rate, ...). NOT AVAILABLE YET: fails until market-rates.ts lands.',
    params: [{ name: 'key', type: 'string', doc: "e.g. 'us30', 'us15', 'boe'", required: true }],
    returns: 'number (%)',
    example: "rate('us30') | pct(2)",
    run: (a) =>
      fail(
        `market rate "${a.str('key')}" is not available: src/lib/market-rates.ts (W1-PROP PR-3) is not merged yet. ` +
          'Until then write the rate as a literal with its source and as-of date.',
      ),
  },
  {
    name: 'min',
    group: 'Helpers',
    summary: 'The smaller of two numbers.',
    params: [
      { name: 'a', type: 'number', doc: 'first number', required: true },
      { name: 'b', type: 'number', doc: 'second number', required: true },
    ],
    returns: 'number',
    example: 'min(ukTakeHome(30000), 25000) | gbp',
    run: (a) => Math.min(a.num('a'), a.num('b')),
  },
  {
    name: 'max',
    group: 'Helpers',
    summary: 'The larger of two numbers.',
    params: [
      { name: 'a', type: 'number', doc: 'first number', required: true },
      { name: 'b', type: 'number', doc: 'second number', required: true },
    ],
    returns: 'number',
    example: 'max(0, 50000 - 60000) | usd',
    run: (a) => Math.max(a.num('a'), a.num('b')),
  },
];

export const FIGURE_FUNCTIONS: ReadonlyMap<string, FigureFunction> = new Map(fns.map((f) => [f.name, f]));

/* ════════════════════════════════════════════════════════════
 * Formatters
 * ════════════════════════════════════════════════════════════ */

export interface FigureFormatter {
  name: string;
  summary: string;
  /** Argument description for the docs, e.g. "(decimals = 0)". */
  usage: string;
  example: string;
  run: (value: FigureValue, args: Literal[]) => FigureValue;
}

const nfCache = new Map<string, Intl.NumberFormat>();
function groupDigits(abs: number, minDp: number, maxDp: number): string {
  const key = `${minDp}:${maxDp}`;
  let nf = nfCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat('en-GB', { minimumFractionDigits: minDp, maximumFractionDigits: maxDp });
    nfCache.set(key, nf);
  }
  return nf.format(abs);
}

/**
 * Drop binary floating-point noise before rounding for display, so a value that
 * is really 34.65 (computed as 34.6499999...) prints as 34.7, not 34.6.
 */
function denoise(v: number): number {
  return Number(v.toPrecision(12));
}

function needNumber(value: FigureValue, fmt: string): number {
  if (typeof value !== 'number') {
    fail(`formatter "${fmt}" needs a number, got ${describeValue(value)}`);
  }
  if (Number.isNaN(value)) fail(`formatter "${fmt}" got NaN`);
  if (!Number.isFinite(value)) {
    fail(`formatter "${fmt}" got ${value > 0 ? 'Infinity' : '-Infinity'} (a "never" result); check .never or use the months formatter`);
  }
  return denoise(value);
}

function decimalsArg(fmt: string, args: Literal[], dflt: number, allowAuto: boolean): number | 'auto' {
  if (args.length === 0) return dflt;
  if (args.length > 1) fail(`formatter "${fmt}" takes at most one argument`);
  const d = args[0];
  if (allowAuto && d === 'auto') return 'auto';
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 4) {
    fail(`formatter "${fmt}" takes a number of decimals 0-4${allowAuto ? ' or auto' : ''} (got ${JSON.stringify(d)})`);
  }
  return d;
}

/** Signed, grouped number; "auto" shows up to 2 decimals and drops trailing zeros. */
function formatNumber(value: number, dp: number | 'auto'): string {
  const [minDp, maxDp] = dp === 'auto' ? [0, 2] : [dp, dp];
  const body = groupDigits(Math.abs(value), minDp, maxDp);
  const isZero = /^[0.,]*$/.test(body);
  return (value < 0 && !isZero ? '-' : '') + body;
}

function currency(symbol: string, name: string): FigureFormatter {
  return {
    name,
    summary: `Money with ${symbol}, grouped, rounded to whole units by default.`,
    usage: `${name} | ${name}(2)`,
    example: `1234.5 | ${name}`,
    run: (value, args) => {
      const n = needNumber(value, name);
      const dp = decimalsArg(name, args, 0, false) as number;
      const body = groupDigits(Math.abs(n), dp, dp);
      const isZero = /^[0.,]*$/.test(body);
      return (n < 0 && !isZero ? '-' : '') + symbol + body;
    },
  };
}

function roundStep(value: number, step: number): number {
  const r = Math.round(value / step) * step;
  return Object.is(r, -0) ? 0 : r;
}

const formatters: FigureFormatter[] = [
  currency('£', 'gbp'),
  currency('$', 'usd'),
  currency('€', 'eur'),
  {
    name: 'pct',
    summary: 'A percentage number (5 means 5%) with a % sign; whole percent by default.',
    usage: 'pct | pct(1) | pct(auto)',
    example: '22.94 | pct',
    run: (value, args) => `${formatNumber(needNumber(value, 'pct'), decimalsArg('pct', args, 0, true))}%`,
  },
  {
    name: 'pct1',
    summary: 'Shorthand for pct(1).',
    usage: 'pct1',
    example: '22.94 | pct1',
    run: (value, args) => {
      if (args.length) fail('pct1 takes no arguments; use pct(n)');
      return `${formatNumber(needNumber(value, 'pct1'), 1)}%`;
    },
  },
  {
    name: 'int',
    summary: 'Whole number with thousands separators.',
    usage: 'int',
    example: '1234.6 | int',
    run: (value, args) => {
      if (args.length) fail('int takes no arguments; use num(n)');
      return formatNumber(needNumber(value, 'int'), 0);
    },
  },
  {
    name: 'num',
    summary: 'Number with thousands separators and a fixed number of decimals (or auto).',
    usage: 'num | num(1) | num(auto)',
    example: '20.3615 | num(2)',
    run: (value, args) => formatNumber(needNumber(value, 'num'), decimalsArg('num', args, 0, true)),
  },
  {
    name: 'months',
    summary: 'A number of months as "13 years 11 months" (rounded to whole months); Infinity prints "never".',
    usage: 'months',
    example: '167 | months',
    run: (value, args) => {
      if (args.length) fail('months takes no arguments');
      if (typeof value !== 'number' || Number.isNaN(value)) fail(`formatter "months" needs a number, got ${describeValue(value)}`);
      if (value === Infinity) return 'never';
      if (value < 0) fail(`formatter "months" got a negative number (${value})`);
      const total = Math.round(denoise(value));
      const y = Math.floor(total / 12);
      const m = total % 12;
      const parts: string[] = [];
      if (y > 0) parts.push(`${y} year${y === 1 ? '' : 's'}`);
      if (m > 0 || y === 0) parts.push(`${m} month${m === 1 ? '' : 's'}`);
      return parts.join(' ');
    },
  },
  {
    name: 'round100',
    summary: 'Round to the nearest 100 (keeps a number; follow with a money formatter).',
    usage: 'round100',
    example: '37540 | round100 | usd',
    run: (value, args) => {
      if (args.length) fail('round100 takes no arguments; use roundTo(n)');
      return roundStep(needNumber(value, 'round100'), 100);
    },
  },
  {
    name: 'roundTo',
    summary: 'Round to the nearest multiple of a step, e.g. roundTo(1000) or roundTo(0.5).',
    usage: 'roundTo(step)',
    example: '37540 | roundTo(1000) | usd',
    run: (value, args) => {
      const n = needNumber(value, 'roundTo');
      const step = args[0];
      if (args.length !== 1 || typeof step !== 'number' || !(step > 0)) fail('roundTo needs one positive step, e.g. roundTo(1000)');
      return roundStep(n, step);
    },
  },
  {
    name: 'ceil',
    summary: 'Round up to a whole number (e.g. months you need).',
    usage: 'ceil',
    example: '45.2 | ceil | months',
    run: (value, args) => {
      if (args.length) fail('ceil takes no arguments');
      return Math.ceil(needNumber(value, 'ceil') - 1e-9);
    },
  },
  {
    name: 'floor',
    summary: 'Round down to a whole number.',
    usage: 'floor',
    example: '45.8 | floor | int',
    run: (value, args) => {
      if (args.length) fail('floor takes no arguments');
      return Math.floor(needNumber(value, 'floor') + 1e-9);
    },
  },
  {
    name: 'abs',
    summary: 'Drop the sign (write "saves", "costs" in the words instead of a minus).',
    usage: 'abs',
    example: '-1885 | abs | usd',
    run: (value, args) => {
      if (args.length) fail('abs takes no arguments');
      return Math.abs(needNumber(value, 'abs'));
    },
  },
];

export const FIGURE_FORMATTERS: ReadonlyMap<string, FigureFormatter> = new Map(formatters.map((f) => [f.name, f]));

/* ════════════════════════════════════════════════════════════
 * Evaluator
 * ════════════════════════════════════════════════════════════ */

function describeValue(v: FigureValue): string {
  if (typeof v === 'number') return `number ${v}`;
  if (typeof v === 'string') return `text "${v}"`;
  if (typeof v === 'boolean') return `boolean ${v}`;
  return `an object with fields ${Object.keys(v).join(', ')}`;
}

function suggest(name: string, candidates: Iterable<string>): string {
  const lower = name.toLowerCase();
  let best = '';
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = c.toLowerCase() === lower ? 0 : levenshtein(lower, c.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore <= Math.max(2, Math.floor(name.length / 3)) ? ` (did you mean "${best}"?)` : '';
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function signature(fn: FigureFunction): string {
  const pos = fn.params.map((p) => (p.required ? p.name : `${p.name}?`));
  const opts = (fn.options ?? []).map((p) => `${p.name}=`);
  return `${fn.name}(${[...pos, ...opts].join(', ')})`;
}

function checkParam(fn: FigureFunction, spec: ParamSpec, raw: FigurePrimitive): FigurePrimitive {
  let v = spec.coerce ? spec.coerce(raw) : raw;
  const label = `${fn.name}: "${spec.name}"`;
  if (spec.type === 'string' && typeof v === 'string' && spec.aliases && Object.hasOwn(spec.aliases, v)) {
    v = spec.aliases[v];
  }
  if (typeof v !== spec.type) {
    fail(`${label} must be a ${spec.type}, got ${describeValue(v)}`);
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) fail(`${label} must be a finite number`);
    if (spec.integer && !Number.isInteger(v)) fail(`${label} must be a whole number (got ${v})`);
    if (spec.min !== undefined && v < spec.min) fail(`${label} must be at least ${spec.min} (got ${v})`);
    if (spec.above !== undefined && !(v > spec.above)) fail(`${label} must be more than ${spec.above} (got ${v})`);
    if (spec.max !== undefined && v > spec.max) fail(`${label} must be at most ${spec.max} (got ${v})`);
  }
  if (typeof v === 'string' && spec.oneOf && !spec.oneOf.includes(v)) {
    const shown = spec.oneOf.filter((o) => o !== '');
    fail(`${label} must be one of ${shown.join(', ')} (got "${v}")${suggest(v, shown)}`);
  }
  return v;
}

function callFunction(name: string, args: { name?: string; value: FigureValue }[]): FigureValue {
  const fn = FIGURE_FUNCTIONS.get(name);
  if (!fn) fail(`unknown function "${name}"${suggest(name, FIGURE_FUNCTIONS.keys())}; see docs/figures.md`);
  const all = [...fn.params, ...(fn.options ?? [])];
  const given: Record<string, FigurePrimitive> = {};
  let positional = 0;
  let sawNamed = false;
  for (const arg of args) {
    if (typeof arg.value === 'object') {
      fail(`${name}: arguments must be numbers, text or booleans, not ${describeValue(arg.value)} (pick a field with .name)`);
    }
    let spec: ParamSpec | undefined;
    if (arg.name !== undefined) {
      sawNamed = true;
      spec = all.find((p) => p.name === arg.name);
      if (!spec) {
        fail(`${name}: unknown option "${arg.name}"${suggest(arg.name, all.map((p) => p.name))}; signature: ${signature(fn)}`);
      }
    } else {
      if (sawNamed) fail(`${name}: positional arguments must come before named ones`);
      spec = fn.params[positional++];
      if (!spec) fail(`${name}: too many positional arguments; signature: ${signature(fn)}`);
    }
    if (spec.name in given) fail(`${name}: "${spec.name}" is given twice`);
    given[spec.name] = checkParam(fn, spec, arg.value);
  }
  const values: Record<string, FigurePrimitive | undefined> = {};
  for (const spec of all) {
    if (spec.name in given) values[spec.name] = given[spec.name];
    else if (spec.required) fail(`${name}: missing "${spec.name}" (${spec.doc}); signature: ${signature(fn)}`);
    else values[spec.name] = spec.default;
  }
  const result = fn.run(new Args(values));
  checkResult(name, result);
  return result;
}

function checkResult(name: string, result: FigureValue): void {
  if (typeof result === 'number' && Number.isNaN(result)) fail(`${name} produced NaN (check the inputs)`);
  if (typeof result === 'object') {
    for (const [k, v] of Object.entries(result)) {
      if (typeof v === 'number' && Number.isNaN(v)) fail(`${name}.${k} produced NaN (check the inputs)`);
    }
  }
}

function evalExpr(node: ExprNode): FigureValue {
  switch (node.kind) {
    case 'num':
    case 'str':
    case 'bool':
    case 'word':
      return node.value;
    case 'call':
      return callFunction(
        node.name,
        node.args.map((a) => ({ name: a.name, value: evalExpr(a.value) })),
      );
    case 'field': {
      const target = evalExpr(node.target);
      if (typeof target !== 'object') fail(`".${node.field}" needs an object result, got ${describeValue(target)}`);
      if (!Object.hasOwn(target, node.field)) {
        fail(`no field ".${node.field}" (fields: ${Object.keys(target).join(', ')})${suggest(node.field, Object.keys(target))}`);
      }
      return target[node.field];
    }
    case 'neg': {
      const v = evalExpr(node.operand);
      if (typeof v !== 'number') fail(`cannot negate ${describeValue(v)}`);
      return -v;
    }
    case 'bin': {
      const l = evalExpr(node.left);
      const r = evalExpr(node.right);
      if (typeof l !== 'number' || typeof r !== 'number') {
        fail(`"${node.op}" works on numbers only, got ${describeValue(typeof l !== 'number' ? l : r)}`);
      }
      if (node.op === '/' && r === 0) fail('division by zero');
      const out = node.op === '+' ? l + r : node.op === '-' ? l - r : node.op === '*' ? l * r : l / r;
      if (Number.isNaN(out)) fail(`"${node.op}" produced NaN (Infinity ${node.op} Infinity?)`);
      return out;
    }
  }
}

function runPipeline(p: Pipeline): string {
  // A token must compute something. A bare word or quoted text on its own would
  // print as typed: a forgotten "()" (`{{ taxYear }}`) or a hand-typed figure
  // dressed up as a generated one (`{{ '£25,064' }}`).
  if (p.expr.kind === 'word') {
    const name = p.expr.value;
    const known = FIGURE_FUNCTIONS.has(name);
    fail(
      `"${name}" on its own is just a word, not a figure; missing "()"? ` +
        (known ? `call it, e.g. ${signature(FIGURE_FUNCTIONS.get(name)!)}` : `functions are called like name(...)${suggest(name, FIGURE_FUNCTIONS.keys())}`),
    );
  }
  if (p.expr.kind === 'str') {
    fail('quoted text on its own prints as typed, so it is not a generated figure; write literal text outside the token, or call a function');
  }
  let value = evalExpr(p.expr);
  for (const f of p.filters) {
    const fmt = FIGURE_FORMATTERS.get(f.name);
    if (!fmt) fail(`unknown formatter "${f.name}"${suggest(f.name, FIGURE_FORMATTERS.keys())}; see docs/figures.md`);
    value = fmt.run(value, f.args);
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    fail(`the result is a number (${value}); add a formatter such as | gbp, | usd, | pct or | months`);
  }
  if (typeof value === 'boolean') fail('the result is a boolean; tokens must print text or a formatted number');
  fail(`the result is an object; pick a field, e.g. .${Object.keys(value)[0]} (fields: ${Object.keys(value).join(', ')})`);
}

/* ════════════════════════════════════════════════════════════
 * Public API
 * ════════════════════════════════════════════════════════════ */

/** Token source -> printed result or error detail (all functions are pure). */
const memo = new Map<string, { ok: string } | { err: string }>();

/**
 * Evaluate the inside of one token, e.g. `ukTakeHome(30000) | gbp`.
 * Throws FigureError. Results are memoised (every function is pure).
 * Also usable from .astro templates: `figure("mortgagePayment(300000, 7, 30) | usd")`.
 */
export function evaluateFigure(source: string): string {
  const key = source.trim();
  const hit = memo.get(key);
  if (hit) {
    if ('ok' in hit) return hit.ok;
    throw new FigureError(key, hit.err);
  }
  try {
    const out = runPipeline(parsePipeline(key));
    memo.set(key, { ok: out });
    return out;
  } catch (e) {
    let detail: string;
    if (e instanceof Fail) detail = e.message;
    else if (e instanceof FigureSyntaxError) detail = `syntax error at character ${e.at + 1}: ${e.message}`;
    else detail = `internal error in the figure engine: ${e instanceof Error ? e.message : String(e)}`;
    memo.set(key, { err: detail });
    throw new FigureError(key, detail);
  }
}

export const figure = evaluateFigure;

export interface FigureProblem {
  /** Offset of the token's `{{` in the text. */
  start: number;
  /** The token text including braces (or the unterminated fragment). */
  token: string;
  message: string;
}

/**
 * Replace every `{{ ... }}` token in a text. Never throws for token problems:
 * returns them all so callers can report every bad token at once (with
 * positions). Unchanged text comes back unchanged.
 */
export function resolveFiguresDetailed(text: string): { text: string; problems: FigureProblem[] } {
  if (!text.includes('{{')) return { text, problems: [] };
  const { tokens, problems: scan } = scanTokens(text);
  const problems: FigureProblem[] = scan.map((p) => ({
    start: p.start,
    token: text.slice(p.start, Math.min(text.length, p.start + 40)),
    message: p.message,
  }));
  let out = '';
  let last = 0;
  for (const t of tokens) {
    out += text.slice(last, t.start);
    try {
      out += evaluateFigure(t.inner);
    } catch (e) {
      if (!(e instanceof FigureError)) throw e;
      problems.push({ start: t.start, token: text.slice(t.start, t.end), message: e.message });
      out += text.slice(t.start, t.end);
    }
    last = t.end;
  }
  out += text.slice(last);
  problems.sort((a, b) => a.start - b.start);
  return { text: out, problems };
}

/** Replace every token in a text; throws one Error listing all bad tokens. */
export function resolveFigures(text: string): string {
  const { text: out, problems } = resolveFiguresDetailed(text);
  if (problems.length) {
    throw new Error(problems.map((p) => p.message).join('\n'));
  }
  return out;
}

/**
 * Plain-text variant for frontmatter: also turns the `\{{` escape into a
 * literal `{{` (Markdown does that for bodies when it renders).
 */
export function resolveFiguresPlain(text: string): { text: string; problems: FigureProblem[] } {
  const r = resolveFiguresDetailed(text);
  return { text: r.text.replace(/\\\{\{/g, '{{'), problems: r.problems };
}

/** Signature string for docs and error messages. */
export function figureSignature(name: string): string {
  const fn = FIGURE_FUNCTIONS.get(name);
  if (!fn) throw new Error(`unknown figure function ${name}`);
  return signature(fn);
}

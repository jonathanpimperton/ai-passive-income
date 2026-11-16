/**
 * Build-time figure engine (plan-2026-11 RC1 / W1-FIG, re-pointed in W2-FIG).
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
 * ENGINE STATUS (W2-FIG, 15 Nov 2026): NO function is INTERIM any more. Every
 * function that has a calculator calls the SAME engine function the calculator
 * calls, so a token and the tool cannot disagree:
 *
 *   uk*        calculateUkTakeHome (uk-tax-calc.ts) + parseUkTaxCode (uk-tax-codes.ts)
 *   us*        computeUsSalary (us-tax-calc.ts), per tax year (us-rates.ts)
 *   cardPayoff, loanPayoff, payoffBalance
 *              simulateCardPayoff (credit-card.ts), 600-month horizon
 *   feeDrag    compareFees (investment-fee.ts)
 *   rate, rateSource
 *              MARKET_RATES (market-rates.ts)
 *   cpiAdjust  adjustForInflation (inflation.ts); inflationAdjust: projectInflation
 *   compoundFV, compoundEarned
 *              futureValue (investment-solvers.ts via calculator-utils.ts)
 *   yearsToTarget
 *              solveMonthsToTarget (investment-solvers.ts), whole months
 *   savingsMonthly, savingsMonths
 *              monthlyForGoal, timeToGoal (savings-goal.ts)
 *   retirementFV
 *              projectRetirement (retirement.ts)
 *   sdlt, ukCgt, usCgt
 *              calculateSdlt (stamp-duty.ts), calculateUKCgt / calculateUSCgt (capital-gains.ts)
 *   usAffordability, ukAffordability, eurAffordability
 *              solveUs/Uk/EurAffordability (mortgage-affordability.ts)
 *   rentVsBuy  simulateRentVsBuy, laterBreakEvenYear (rent-vs-buy.ts)
 *   carFinance compareCarFinance (car-finance.ts)
 *   emergencyMonths
 *              monthsToTarget (emergency-fund.ts)
 *   solarPayback
 *              calculateSolarPayback (solar-payback.ts), regional defaults from the same module
 *   roi, annualizedReturn
 *              calcRoi, annualize (roi.ts)
 *   requiredRate
 *              solveRequiredRate (investment-solvers.ts)
 *   debtPayoff, debtClearMonth
 *              simulateDebtPayoff, prepareDebts (debt-payoff.ts)
 *   cardBeyondHorizon
 *              simulateCardPayoff, the "beyond 50 years" totals
 *   cpiValue   cpiFor (inflation.ts)
 *
 * The loan family (loanPayment ... overpaymentSaving) keeps its own
 * closed-form / loop arithmetic; figures-grid.test.ts proves it agrees
 * with mortgage-payment.ts (the engine behind the mortgage and loan tools)
 * (1e-6 on payments, 1e-3 or better on cumulative sums), and `yearly=` (a 13th
 * payment) is an extension the tools do not offer. Where a function takes an option the tool UI cannot express (UK
 * `postgrad=true` on top of a plan; US `k401Amount`; loan `yearly=`), the
 * function header in the catalogue says so.
 *
 * Deliberate build failures (an honest number does not exist; write the case in
 * words): a card payoff not cleared within the engine's 600 months ("beyond 50
 * years"); payoffBalance when the payment never covers the interest; a 401(k)
 * limit or fact for a year the IRS has not published; a tax code the calculator
 * does not recognise; contradictory options (S code with scottish=false); a
 * pension larger than the salary; feeDrag when the lower-fee fund earns nothing;
 * savingsMonths / yearsToTarget when the calculator says "Not within 100 years"
 * ("never" is only for no deposits and no growth).
 * State Pension age is not a fact (it depends on date of birth). Also failing: a
 * multi-debt payoff that is never cleared or not cleared in 600 months; an
 * affordability case with no budget ("No home fits these limits"); a solar system
 * that does not pay back in the period; a car deposit or balloon the calculator
 * would clamp; an emergency fund beyond 50 years; a required rate that does not exist.
 *
 * figures-grid.test.ts compares every one of these functions with its
 * engine over a grid of inputs (exact equality where the same engine function
 * is called) and fails if a re-point is reverted.
 */

import {
  compoundInterest,
  loanMonthlyPayment,
} from './calculator-utils';
import { calculateUKCgt, calculateUSCgt } from './capital-gains';
import { calculateSdlt, type BuyerType } from './stamp-duty';
import {
  calcStudentLoan,
  calculateUkTakeHome,
  type PensionMethod,
  type StudentLoanPlan,
  type UkTakeHomeInput,
  type UkTakeHomeResult,
} from './uk-tax-calc';
import { parseUkTaxCode, type ParsedTaxCode } from './uk-tax-codes';
import {
  UK_CGT,
  UK_EMPLOYER_NI,
  UK_INCOME_TAX,
  UK_ISA,
  UK_MORTGAGE,
  UK_NI,
  UK_PENSION_ANNUAL_ALLOWANCE,
  UK_PERSONAL_SAVINGS_ALLOWANCE,
  UK_QUALIFYING_EARNINGS,
  UK_SCOTTISH_TAX,
  UK_SDLT,
  UK_STATE_PENSION,
  UK_STUDENT_LOANS,
  UK_TAX_YEAR,
} from './uk-rates';
import { NMPA_CURRENT, NMPA_FROM_2028 } from './uk-pension-ages';
import { computeUsSalary } from './us-tax-calc';
import {
  US_DEFAULT_TAX_YEAR,
  US_TAX_YEAR,
  US_TAX_YEARS,
  getUsRates,
  isUsTaxYear,
  type FilingStatus,
  type UsTaxYear,
  type UsYearRates,
} from './us-rates';
import { CARD_HORIZON_MONTHS, simulateCardPayoff, type CardPayoffInputs } from './credit-card';
import {
  AFFORDABILITY_DEFAULTS,
  estimateUkTakeHome,
  solveEurAffordability,
  solveUkAffordability,
  solveUsAffordability,
  type AffordabilityStatus,
} from './mortgage-affordability';
import { LONG_STAY_YEARS, TRANSACTION_COST_DEFAULTS, laterBreakEvenYear, simulateRentVsBuy, type RentVsBuyInputs } from './rent-vs-buy';
import {
  MAX_DEPOSIT,
  MIN_FINANCE_AMOUNT,
  compareCarFinance,
  maxDepositFor,
  type AprConvention,
} from './car-finance';
import { MAX_FUND_MONTHS, monthsToTarget } from './emergency-fund';
import {
  SOLAR_REGIONAL_DEFAULTS,
  calculateSolarPayback,
  effectiveSelfConsumption,
  type SolarPaybackInputs,
  type SolarRegion,
} from './solar-payback';
import { annualize, calcRoi } from './roi';
import {
  DEBT_HORIZON_MONTHS,
  prepareDebts,
  simulateDebtPayoff,
  type Debt,
  type DebtRowInput,
  type DebtSimulation,
  type Strategy,
} from './debt-payoff';
import { buildAmortization } from './mortgage-payment';
import { compareFees } from './investment-fee';
import { MARKET_RATES, rateAttribution, type MarketRate } from './market-rates';
import {
  CPI_FIRST_YEAR,
  CPI_LAST_YEAR,
  CPI_U_LATEST,
  adjustForInflation,
  cpiFor,
  projectInflation,
} from './inflation';
import { MAX_SOLVE_MONTHS, solveMonthsToTarget, solveRequiredRate } from './investment-solvers';
import { MAX_GOAL_MONTHS, monthlyForGoal, timeToGoal } from './savings-goal';
import { projectRetirement } from './retirement';
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
  /** Numbers only: the value must be min (or 0) plus a whole number of steps, like a calculator slider's step. */
  step?: number;
  /** Allowed string values (after `aliases`). */
  oneOf?: readonly string[];
  /** Alternative spellings mapped onto `oneOf` values. */
  aliases?: Readonly<Record<string, string>>;
  /** Custom coercion (e.g. year labels, compounding words). Runs before checks. */
  coerce?: (v: FigurePrimitive) => FigurePrimitive;
}

/** What a result field means, for the evaluator's guards (FigureFunction.fieldMeta). */
export interface FieldMeta {
  /** The field is a year (or a count of years): printing it with | months would show years as months. */
  years?: boolean;
  /** Message when the field is Infinity ("there is no such year"): using the field fails the build with it. */
  ifInfinite?: string;
}

/** Per-result field guards, looked up when a field is read (results are fresh objects each call). */
const RESULT_META = new WeakMap<object, Readonly<Record<string, FieldMeta>>>();

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
  /**
   * Guards for particular result fields (see FieldMeta): a year-valued field
   * refuses the months formatter, and a field that is Infinity when there is
   * no such year fails with its own message at the point of use.
   */
  fieldMeta?: Readonly<Record<string, FieldMeta>>;
  /** The function returns a number of years: it refuses the months formatter. */
  returnsYears?: boolean;
  /** A complete token body (no braces) that the tests evaluate. */
  example: string;
  /**
   * Set while the function composes lib primitives instead of calling the
   * engine the calculator uses (names the module that should replace it).
   * Wave 2 content must not use a function with this flag. None is set today
   * (W2-FIG re-pointed them all); figures.test.ts checks the flag and the
   * "Do not use yet" section of docs/figures.md stay in step.
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
 * UK: one dataset (2026/27). The UK engines behind the tokens
 * (calculateUkTakeHome, calculateSdlt, calculateUKCgt) take no year argument,
 * so `year=` is accepted only for that dataset: any other year fails the
 * build instead of silently returning 2026/27 numbers. When a 2027/28 dataset
 * lands, the UK engines need a year argument first (then wire it here).
 *
 * US: us-rates.ts is year-keyed (TY2026, TY2027). `year=` picks the dataset and
 * is passed to the engines. With no `year=` the default is US_DEFAULT_TAX_YEAR,
 * the same default the calculators start on at that moment: the calendar year
 * once its data exists, evaluated when the build starts. It therefore moves from
 * 2026 to 2027 on a rebuild after 1 January 2027. Content that is about one
 * specific year should pass `year=` explicitly.
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
  doc: `US tax year, one of ${US_TAX_YEARS.join(', ')} (default: ${US_TAX_YEAR}, the calculator's default)`,
  coerce: (v) => usYearLabel(v),
};
function checkUkYear(a: Args): void {
  if (!a.has('year')) return;
  const y = a.str('year');
  if (y !== UK_TAX_YEAR) fail(`no UK tax data wired for ${y} (available: ${UK_TAX_YEAR})`);
}
/** The US tax year a call refers to: `year=` when given and present in us-rates.ts, else the default year. */
function usYearOf(a: Args): UsTaxYear {
  if (!a.has('year')) return US_DEFAULT_TAX_YEAR;
  const y = Number(a.str('year'));
  if (!isUsTaxYear(y)) fail(`no US tax data wired for ${a.str('year')} (available: ${US_TAX_YEARS.join(', ')})`);
  return y;
}

/* ════════════════════════════════════════════════════════════
 * UK income: tax, NI, student loans, pensions, tax codes
 * ════════════════════════════════════════════════════════════ */

type UkMethod = '' | 'sacrifice' | 'net' | 'ras';

/** Token method names -> the engine's PensionMethod. */
const UK_PENSION_METHODS: Record<Exclude<UkMethod, ''>, PensionMethod> = {
  sacrifice: 'sacrifice',
  net: 'netPay',
  ras: 'reliefAtSource',
};

const STUDENT_PLANS = ['none', 'plan1', 'plan2', 'plan4', 'plan5', 'postgrad'] as const;

/**
 * The tax-code rules are the calculator's own: parseUkTaxCode (uk-tax-codes.ts).
 * A code the calculator would not recognise (it then quietly falls back to
 * 1257L) fails the build instead.
 *
 * Region rule (mirrors regionForCode and the flat-rate table in uk-tax-codes.ts):
 * - an S prefix means Scottish bands and a C prefix rest-of-UK (Welsh) bands,
 *   whatever scottish= says (an explicit contradiction, S1257L with
 *   scottish=false, is refused as an authoring mistake);
 * - with no prefix, scottish=true selects the Scottish bands for the codes that
 *   run through the bands (nnnnL/M/N/T, 0T, K);
 * - the flat-rate codes BR, D0 and D1 take their rate from the code itself and
 *   ignore the toggle: without an S prefix they are the rest-of-UK rates (D0 =
 *   40% Higher, D1 = 45% Additional), also when scottish=true. That is the
 *   HMRC rule (a Scottish taxpayer's flat-rate codes are SBR, SD0..SD3) and it
 *   is what the calculator does. Use SD0/SD1 for the Scottish flat rates.
 */
function checkedUkCode(raw: string): ParsedTaxCode {
  const code = parseUkTaxCode(raw);
  if (code.kind !== 'invalid') return code;
  const norm = raw.replace(/[\s/]+/g, '').toUpperCase();
  if (/^C?D[23](W1|M1|X|NONCUM)?$/.test(norm)) {
    fail(`tax code ${norm} only exists with the S (Scottish) prefix (SD2 and SD3 are Scottish bands)`);
  }
  fail(
    `tax code "${raw}" is not a recognised PAYE tax code (supported: nnnnL, nnnnM, nnnnN, nnnnT, 0T, Knnn, BR, D0, D1, NT, ` +
      `SBR, SD0, SD1, SD2, SD3, with an optional S or C prefix and an optional W1, M1, X or NONCUM emergency marker)`,
  );
}

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

/** The step the calculator's own marginal-rate figure uses (calculateUkTakeHome: STEP). */
const UK_MARGINAL_STEP = 100;

interface UkCalc {
  r: UkTakeHomeResult;
  /** Postgraduate Loan repaid on top of the plan (postgrad=true), else 0. */
  postgradLoan: number;
}

/**
 * One call to the calculator's engine, calculateUkTakeHome, with the token's
 * options mapped onto its inputs. Tokens validate more strictly than the
 * calculator (no silent capping of an over-large pension, no contradictory
 * flags) but never compute anything the calculator would not.
 *
 * `postgrad=true` (a Postgraduate Loan alongside a plan) is the one extension:
 * the calculator holds a single loan plan, so the second loan is added from the
 * engine's own calcStudentLoan on the engine's own NIC pay.
 */
function ukCalc(salary: number, a: Args): UkCalc {
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

  const code = checkedUkCode(a.str('code'));
  if (a.has('scottish') && code.prefix !== null && (code.prefix === 'S') !== a.bool('scottish')) {
    fail(
      `tax code ${code.input} contradicts scottish=${a.bool('scottish')} ` +
        '(an S prefix is Scottish, a C prefix is Welsh and uses the rest-of-UK bands)',
    );
  }
  const plan = a.str('plan') as StudentLoanPlan;
  if (a.bool('postgrad') && plan === 'postgrad') fail('plan=postgrad and postgrad=true are the same loan; use one');

  const input: UkTakeHomeInput = {
    salary,
    scottish: a.has('scottish') ? a.bool('scottish') : false,
    taxCode: a.str('code'),
    studentLoan: plan,
    pensionMode: pct > 0 ? 'percent' : 'amount',
    pensionPercent: pct,
    pensionAmount: amount,
    pensionMethod: method === '' ? 'netPay' : UK_PENSION_METHODS[method],
  };
  const r = calculateUkTakeHome(input);
  return { r, postgradLoan: a.bool('postgrad') ? calcStudentLoan(r.payForNI, 'postgrad') : 0 };
}

function ukPay(salary: number, a: Args): UkPayResult {
  const { r, postgradLoan } = ukCalc(salary, a);
  const takeHome = r.netAnnual - postgradLoan;
  return {
    takeHome,
    monthly: takeHome / 12,
    weekly: takeHome / 52,
    incomeTax: r.incomeTax,
    ni: r.ni,
    studentLoan: r.studentLoan + postgradLoan,
    pension: r.pension.fromPay,
    pensionPot: r.pension.gross,
    ani: r.adjustedNetIncome,
    personalAllowance: r.personalAllowance,
    taxRate: salary > 0 ? ((r.incomeTax + r.ni) / salary) * 100 : 0,
  };
}

/** The calculator's "next £100" marginal rate (income tax + NI + student loan), in %. */
function ukMarginalPct(salary: number, a: Args): number {
  const { r } = ukCalc(salary, a);
  let marginal = r.marginal.withNiAndLoan;
  if (a.bool('postgrad')) {
    marginal +=
      (calcStudentLoan(r.payForNI + UK_MARGINAL_STEP, 'postgrad') - calcStudentLoan(r.payForNI, 'postgrad')) /
      UK_MARGINAL_STEP;
  }
  return marginal * 100;
}

const UK_PAY_OPTIONS: ParamSpec[] = [
  { name: 'pension', type: 'number', doc: 'pension contribution as % of the full salary (gross, into the pot)', default: 0, min: 0, max: 100 },
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
  { name: 'postgrad', type: 'boolean', doc: 'also repaying a Postgraduate Loan (on top of plan=). The calculator holds one loan, so this is added from the same engine; the calculator cannot show the combination', default: false },
  { name: 'code', type: 'string', doc: "tax code as in the calculator, quoted if it starts with a digit, e.g. code='S1257L' or code=BR", default: '1257L' },
  { name: 'scottish', type: 'boolean', doc: 'Scottish taxpayer: Scottish bands for L/M/N/T/0T/K codes. An S prefix implies it; BR/D0/D1 take their rate from the code prefix and ignore this' },
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
  taxableIncome: number;
  bracket: number;
}

/**
 * One call to the US Salary calculator's engine, computeUsSalary, in annual
 * mode with no overtime and nobody over 65: the 401(k) is capped at the year's
 * IRS limit and reduces federal and state taxable pay but not FICA, and state
 * tax is the flat effective-rate input, exactly as in SalaryCalc.tsx.
 *
 * `k401Amount` ($ a year) is converted to a percentage of salary for the
 * engine, which only takes a percentage (the calculator does too).
 */
function usPay(salary: number, a: Args): UsPayResult {
  const year = usYearOf(a);
  const status = a.str('status') as FilingStatus;
  const pct = a.num('k401');
  const amount = a.num('k401Amount');
  if (pct > 0 && amount > 0) fail('use k401 (% of salary) or k401Amount ($ a year), not both');
  const requested = pct > 0 ? (salary * pct) / 100 : amount;
  if (requested > salary) fail(`401(k) contribution (${requested}) is more than the salary (${salary})`);
  const k = getUsRates(year).retirement401k;
  if (!k.published && requested > k.limit) {
    fail(
      `the IRS has not published the ${year} 401(k) limit yet (the engine carries ${k.limit} from the prior year), ` +
        'so a contribution above it cannot be capped honestly',
    );
  }
  const r = computeUsSalary({
    year,
    mode: 'annual',
    salary,
    hourlyRate: 0,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    overtimeHours: 0,
    overtimeQualifies: true,
    stateTaxRate: a.num('state'),
    filingStatus: status,
    retirement401kPct: pct > 0 ? pct : salary > 0 ? (amount / salary) * 100 : 0,
    seniors: 0,
  });
  const fica = r.socialSecurity + r.medicare;
  return {
    takeHome: r.netAnnual,
    monthly: r.netAnnual / 12,
    biweekly: r.netAnnual / 26,
    weekly: r.netAnnual / 52,
    federal: r.federalTax,
    fica,
    socialSecurity: r.socialSecurity,
    medicare: r.medicare,
    state: r.stateTax,
    k401: r.retirement401k,
    taxRate: salary > 0 ? ((r.federalTax + fica + r.stateTax) / salary) * 100 : 0,
    effectiveRate: r.effectiveDeductionRate * 100,
    taxableIncome: r.taxableIncome,
    bracket: r.marginalFederalRate * 100,
  };
}

const US_PAY_OPTIONS: ParamSpec[] = [
  STATUS,
  { name: 'state', type: 'number', doc: 'flat state (and local) income tax rate in %, as in the calculator', default: 0, min: 0, max: 20 },
  { name: 'k401', type: 'number', doc: '401(k) contribution as % of salary (capped at the IRS limit for the year, like the calculator)', default: 0, min: 0, max: 100 },
  { name: 'k401Amount', type: 'number', doc: '401(k) contribution in $ a year, instead of k401=% (converted to a % of salary)', default: 0, min: 0 },
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
  taxableIncome: 'federal taxable income after the 401(k) and the standard deduction ($)',
  bracket: 'federal bracket (%) the calculator shows (the lowest, 10%, when taxable income is 0)',
} as const;

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
  // State Pension age is deliberately NOT a fact: it depends on date of birth (66 to 68, uk-pension-ages.ts),
  // so one number would mislead. Write it in words with the GOV.UK timetable as the source.
  pensionAccessAge: [() => NMPA_CURRENT, 'normal minimum pension age (uk-pension-ages.ts)'],
  pensionAccessAgeFrom2028: [() => NMPA_FROM_2028, 'normal minimum pension age from 6 Apr 2028 (uk-pension-ages.ts)'],
  mortgageIncomeMultiple: [() => UK_MORTGAGE.incomeMultipleCap, 'typical lender loan-to-income cap (x income)'],

  // Scottish income tax (gov.scot, 2026 to 2027 page). Rates in %. "Top" is the highest income in the band,
  // counting the standard personal allowance: the figure gov.scot publishes (Starter £12,571 to £16,537, ...).
  scotStarterRate: [() => pctOf(scottishBand('Starter').rate), 'Scottish starter rate (%)'],
  scotBasicRate: [() => pctOf(scottishBand('Basic').rate), 'Scottish basic rate (%)'],
  scotIntermediateRate: [() => pctOf(scottishBand('Intermediate').rate), 'Scottish intermediate rate (%)'],
  scotHigherRate: [() => pctOf(scottishBand('Higher').rate), 'Scottish higher rate (%)'],
  scotAdvancedRate: [() => pctOf(scottishBand('Advanced').rate), 'Scottish advanced rate (%)'],
  scotTopRate: [() => pctOf(scottishBand('Top').rate), 'Scottish top rate (%)'],
  scotStarterTop: [() => scottishBandTop('Starter'), 'top of the Scottish starter band, as income with the standard personal allowance (£)'],
  scotBasicTop: [() => scottishBandTop('Basic'), 'top of the Scottish basic band, as income with the standard personal allowance (£)'],
  scotIntermediateTop: [() => scottishBandTop('Intermediate'), 'top of the Scottish intermediate band, as income with the standard personal allowance (£)'],
  scotHigherTop: [() => scottishBandTop('Higher'), 'top of the Scottish higher band, as income with the standard personal allowance (£)'],
  scotAdvancedTop: [() => scottishBandTop('Advanced'), 'top of the Scottish advanced band, where the 48% top rate starts (£; the allowance is gone by then)'],

  // Pensions and savings
  qualifyingEarningsLower: [() => UK_QUALIFYING_EARNINGS.lower, 'auto-enrolment qualifying earnings band, lower limit (£ a year)'],
  qualifyingEarningsUpper: [() => UK_QUALIFYING_EARNINGS.upper, 'auto-enrolment qualifying earnings band, upper limit (£ a year)'],
  pensionAnnualAllowance: [() => UK_PENSION_ANNUAL_ALLOWANCE, 'pension annual allowance before any taper (£)'],
  psaBasic: [() => UK_PERSONAL_SAVINGS_ALLOWANCE.basic, 'Personal Savings Allowance, basic-rate taxpayer (£)'],
  psaHigher: [() => UK_PERSONAL_SAVINGS_ALLOWANCE.higher, 'Personal Savings Allowance, higher-rate taxpayer (£)'],
  psaAdditional: [() => UK_PERSONAL_SAVINGS_ALLOWANCE.additional, 'Personal Savings Allowance, additional-rate taxpayer (£)'],
  isaAllowance: [() => UK_ISA.annualAllowance, 'total ISA allowance for the tax year (£)'],
  lisaAnnualLimit: [() => UK_ISA.lisaAnnualLimit, 'most you can pay into a Lifetime ISA in the tax year (£)'],
  lisaPropertyCap: [() => UK_ISA.lisaPropertyCap, 'highest first-home price a Lifetime ISA withdrawal can fund without the over-cap charge (£)'],

  // Stamp duty (England and NI), standard residential bands numbered from the 0% band: band 1 is 0% up to sdltNilBand.
  sdltBand2Top: [() => UK_SDLT.standard[1].to, 'top of standard SDLT band 2, the 2% band (£)'],
  sdltBand3Top: [() => UK_SDLT.standard[2].to, 'top of standard SDLT band 3, the 5% band (£)'],
  sdltBand4Top: [() => UK_SDLT.standard[3].to, 'top of standard SDLT band 4, the 10% band (£)'],
  sdltBand2Rate: [() => pctOf(UK_SDLT.standard[1].rate), 'standard SDLT rate in band 2 (%)'],
  sdltBand3Rate: [() => pctOf(UK_SDLT.standard[2].rate), 'standard SDLT rate in band 3 (%)'],
  sdltBand4Rate: [() => pctOf(UK_SDLT.standard[3].rate), 'standard SDLT rate in band 4 (%)'],
  sdltTopRate: [() => pctOf(UK_SDLT.standard[4].rate), 'standard SDLT rate above sdltBand4Top (%)'],
  sdltFtbRate: [() => pctOf(UK_SDLT.firstTimeBuyer[1].rate), 'first-time buyer rate between sdltFtbNilBand and sdltFtbCap (%)'],
  sdltNonResidentSurcharge: [() => pctOf(UK_SDLT.nonResidentSurcharge), 'non-UK resident surcharge on every band (%)'],
  sdltNonResidentMinPrice: [() => UK_SDLT.nonResidentMinPrice, 'price from which the non-resident surcharge applies (£)'],
};

const scottishBand = (name: (typeof UK_SCOTTISH_TAX.bands)[number]['name']) => UK_SCOTTISH_TAX.bands.find((b) => b.name === name)!;

/**
 * The top of a Scottish band as income with the standard personal allowance, the way gov.scot
 * publishes it. The band edges in uk-rates.ts are TAXABLE income above the allowance, so the
 * next band's start plus the allowance is this band's top. The Top band starts at 125,140 where the
 * allowance is already tapered away, so that edge is the same number as total income.
 */
function scottishBandTop(name: (typeof UK_SCOTTISH_TAX.bands)[number]['name']): number {
  const bands = UK_SCOTTISH_TAX.bands;
  const next = bands[bands.findIndex((b) => b.name === name) + 1];
  if (!next) fail(`the Scottish ${name} band has no top`);
  return next.name === 'Top' ? next.from : UK_INCOME_TAX.personalAllowance + next.from;
}

/**
 * US facts: key -> [value(rates, status), description]. Rates are percentages.
 * Keys starting `k401` are refused for a year whose IRS limits are not
 * published yet (the rates module carries the prior year's values then).
 */
const US_FACTS: Record<string, [(r: UsYearRates, s: FilingStatus) => number, string]> = {
  standardDeduction: [(r, s) => r.standardDeduction[s], 'standard deduction ($, by status)'],
  ssWageBase: [(r) => r.socialSecurity.wageCap, 'Social Security wage base ($)'],
  ssRate: [(r) => pctOf(r.socialSecurity.rate), 'employee Social Security rate (%)'],
  medicareRate: [(r) => pctOf(r.medicare.rate), 'employee Medicare rate (%)'],
  additionalMedicareRate: [(r) => pctOf(r.medicare.additionalRate), 'Additional Medicare Tax rate (%)'],
  additionalMedicareThreshold: [(r, s) => r.medicare.additionalThreshold[s], 'Additional Medicare threshold ($, by status)'],
  k401Limit: [(r) => r.retirement401k.limit, '401(k) employee elective deferral limit ($)'],
  k401CatchUp: [(r) => r.retirement401k.catchUp, '401(k) catch-up, age 50+ ($)'],
  k401CatchUp60to63: [(r) => r.retirement401k.catchUp60to63, '401(k) higher catch-up, ages 60-63 ($)'],
  iraLimit: [(r) => r.retirementIra.limit, 'IRA contribution limit, traditional and Roth combined, under age 50 ($)'],
  iraCatchUp: [(r) => r.retirementIra.catchUp, 'IRA catch-up contribution, age 50+ ($)'],
  // One Big Beautiful Bill Act deductions (tax years 2025 to 2028). Both are deductions from taxable income.
  overtimeCap: [(r, s) => obbba(r).overtime.cap[s], 'qualified overtime deduction cap ($, by status)'],
  overtimePhaseOutStart: [(r, s) => obbba(r).overtime.phaseOutStart[s], 'MAGI where the overtime deduction starts to phase out ($, by status)'],
  overtimeReductionPer1000: [(r) => obbba(r).overtime.reductionPerThousand, 'overtime deduction lost for each full $1,000 of MAGI above the start ($)'],
  seniorDeduction: [(r) => obbba(r).senior.perPerson, 'enhanced deduction for each person aged 65 or over ($)'],
  seniorPhaseOutStart: [(r, s) => obbba(r).senior.phaseOutStart[s], 'MAGI where the senior deduction starts to phase out ($, by status)'],
  seniorPhaseOutRate: [(r) => pctOf(obbba(r).senior.phaseOutRate), 'share of MAGI above the start that reduces each senior deduction (%)'],
  niitRate: [(r) => pctOf(r.capitalGains.niit.rate), 'Net Investment Income Tax rate (%)'],
  niitThreshold: [(r, s) => r.capitalGains.niit.threshold[s], 'NIIT threshold ($, by status)'],
  ltcgZeroTop: [(r, s) => r.capitalGains.longTerm[s][1].from, 'taxable income where the 0% long-term gains band ends ($, by status)'],
  ltcg15Top: [(r, s) => r.capitalGains.longTerm[s][2].from, 'taxable income where the 15% band ends ($, by status)'],
};

/** The OBBBA deductions of a year, or a build failure when none are in force. */
function obbba(r: UsYearRates): NonNullable<UsYearRates['obbba']> {
  if (!r.obbba) fail(`no One Big Beautiful Bill Act deductions are in force for ${r.year} (they run 2025 to 2028)`);
  return r.obbba;
}

function usBracketStart(ratePct: number, status: FilingStatus, rates: UsYearRates): number {
  const brackets = rates.brackets[status];
  const hit = brackets.find(([, r]) => Math.abs(r * 100 - ratePct) < 1e-9);
  if (!hit) {
    fail(`there is no ${ratePct}% federal bracket (brackets: ${brackets.map(([, r]) => r * 100).join(', ')})`);
  }
  return hit[0];
}

/**
 * True when nothing can ever get a savings balance to a larger goal: no monthly
 * deposits, and no growth either (a 0% rate, or nothing saved to grow). That is
 * "never". Any other unmet goal is only "not within 100 years" (the calculators'
 * wording), which a token must not turn into a number or "never".
 */
function neverReached(start: number, monthly: number, ratePct: number): boolean {
  return monthly <= 0 && (ratePct <= 0 || start <= 0);
}

/** Keys for rate() and rateSource(): the dated benchmarks in market-rates.ts. */
const MARKET_RATE_KEYS: Record<string, MarketRate> = {
  us30: MARKET_RATES.us.mortgage30,
  us15: MARKET_RATES.us.mortgage15,
  boe: MARKET_RATES.uk.bankRate,
  uk2yr: MARKET_RATES.uk.fixed2yr75,
  uk5yr: MARKET_RATES.uk.fixed5yr75,
  ukRevert: MARKET_RATES.uk.revertRate,
  eur: MARKET_RATES.eur.housePurchase,
};

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

export interface PayoffResult {
  [field: string]: number | boolean;
  months: number;
  interest: number;
  totalPaid: number;
  never: boolean;
  firstInterest: number;
  firstPayment: number;
}

type PayoffMode = { fixed: number } | { pct: number; floor: number; plusInterest: boolean };

/** Token payoff inputs -> the credit card calculator's engine inputs (credit-card.ts). */
function cardInputs(
  balance: number,
  aprPct: number,
  mode: PayoffMode,
  extra: number,
  horizonMonths?: number,
): CardPayoffInputs {
  const base = { balance, aprPercent: aprPct, extra, horizonMonths };
  if ('fixed' in mode) {
    return { ...base, mode: 'fixed', fixedPayment: mode.fixed, percentOfBalance: 0, floor: 0 };
  }
  return {
    ...base,
    mode: mode.plusInterest ? 'interestPlus' : 'percentage',
    fixedPayment: 0,
    percentOfBalance: mode.pct,
    floor: mode.floor,
  };
}

/**
 * simulateCardPayoff (credit-card.ts), the engine behind the Credit Card
 * Payoff calculator, with its 600-month (50-year) horizon:
 * - 'paid': months, interest and total are the engine's exact figures.
 * - 'never' (the first payment does not exceed the first month's interest):
 *   months, interest and totalPaid are Infinity (the `months` formatter prints
 *   "never"; money formatters refuse), exactly the calculator's "never repaid".
 * - 'beyondHorizon' (falling, but not cleared in 600 months): the calculator
 *   shows horizon totals labelled "beyond 50 years". A bare figure for that
 *   would mislead, so the token fails the build; say it in words.
 */
function payoff(balance: number, aprPct: number, mode: PayoffMode, extra: number): PayoffResult {
  const r = simulateCardPayoff(cardInputs(balance, aprPct, mode, extra));
  const firstInterest = r.firstMonthInterest;
  const firstPayment = r.firstPayment;
  switch (r.status) {
    case 'never':
      return { months: Infinity, interest: Infinity, totalPaid: Infinity, never: true, firstInterest, firstPayment };
    case 'beyondHorizon':
      return fail(
        `the balance is not cleared within ${CARD_HORIZON_MONTHS} months (${CARD_HORIZON_MONTHS / 12} years), the horizon the ` +
          'calculator uses; it reports "beyond 50 years", so write that in words instead of a figure',
      );
    case 'noBalance':
      return { months: 0, interest: 0, totalPaid: 0, never: false, firstInterest, firstPayment };
    case 'paid':
      return {
        months: r.months,
        interest: r.totalInterest,
        totalPaid: r.totalPaid,
        never: false,
        firstInterest,
        firstPayment,
      };
  }
}

/** Balance after `months` months of a fixed payment: the engine's own schedule, run for that many months. */
function payoffBalance(balance: number, aprPct: number, payment: number, months: number): number {
  if (months === 0) return balance;
  const r = simulateCardPayoff(cardInputs(balance, aprPct, { fixed: payment }, 0, months));
  switch (r.status) {
    case 'paid':
    case 'noBalance':
      return 0;
    case 'beyondHorizon':
      return r.remainingBalance;
    case 'never':
      return fail(
        `the payment (${payment}) does not exceed the first month's interest, so the balance never falls ` +
          '(the calculator reports "never repaid"); no balance is given',
      );
  }
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
  doc: "when each monthly deposit is made: end (default) or beginning of each month",
  default: 'end',
  oneOf: ['end', 'beginning'],
  aliases: { start: 'beginning' },
};

function checkCompounding(n: number): void {
  if (![1, 2, 4, 12, 52, 365].includes(n)) fail(`compounding must be 1, 2, 4, 12, 52 or 365 (got ${n})`);
}

/* ════════════════════════════════════════════════════════════
 * Engines added in W2-FIG2: affordability, rent vs buy, car finance,
 * emergency fund, solar, ROI, required rate, multi-debt payoff, CPI facts
 * ════════════════════════════════════════════════════════════ */

/** Card payoff arguments, shared by cardPayoff and cardBeyondHorizon. */
const CARD_PAYOFF_PARAMS: ParamSpec[] = [
  money('balance', 'starting balance', { above: 0, min: undefined }),
  ratePct('apr', 'APR in %'),
  { name: 'payment', type: 'number', doc: 'fixed monthly payment (omit when using minPct)', above: 0 },
];
const CARD_PAYOFF_OPTIONS: ParamSpec[] = [
  { name: 'minPct', type: 'number', doc: 'minimum payment as % of the current balance (declining minimum). The calculator offers 1 to 10 (percentage) or 1 to 5 (interest plus), in steps of 0.5; other values are extensions it cannot show', above: 0, max: 100 },
  { name: 'minFloor', type: 'number', doc: 'lowest minimum payment, required with minPct. The calculator does not let visitors edit it: 25 for USD and EUR, 5 for GBP (chosen by the currency), so 25 matches the calculator only for USD and EUR visitors and 5 only for GBP', min: 0 },
  {
    name: 'plusInterest',
    type: 'boolean',
    doc: "with minPct: the minimum is the month's interest PLUS minPct% of the balance (the UK/FCA and common US issuer formula), still at least minFloor",
    default: false,
  },
  { name: 'extra', type: 'number', doc: 'extra paid on top every month', default: 0, min: 0 },
];

function cardModeOf(a: Args): PayoffMode {
  const hasFixed = a.has('payment');
  const hasPct = a.has('minPct');
  if (hasFixed && hasPct) fail('give either a fixed payment or minPct, not both');
  if (!hasFixed && !hasPct) fail('give a fixed monthly payment (third argument) or minPct= with minFloor=');
  if (hasPct && !a.has('minFloor')) fail('minPct needs minFloor= (the lowest minimum payment)');
  if (!hasPct && a.has('minFloor')) fail('minFloor only applies with minPct');
  if (!hasPct && a.bool('plusInterest')) fail('plusInterest only applies with minPct');
  return hasFixed
    ? { fixed: a.num('payment') }
    : { pct: a.num('minPct'), floor: a.num('minFloor'), plusInterest: a.bool('plusInterest') };
}

/* ── Mortgage affordability (solveUs/Uk/EurAffordability) ── */

const AFFORD_DEFAULTS = AFFORDABILITY_DEFAULTS;

/** Loan terms the affordability calculator's buttons offer (TERM_OPTIONS in MortgageAffordabilityCalc.tsx). */
const AFFORD_TERM_OPTIONS = { us: [15, 30], uk: [20, 25, 30, 35], eur: [20, 25, 30] } as const;
const AFFORD_REGION_NAME = { us: 'USD', uk: 'GBP', eur: 'EUR' } as const;
function affordTerm(region: 'us' | 'uk' | 'eur', years: number): void {
  const allowed: readonly number[] = AFFORD_TERM_OPTIONS[region];
  if (!allowed.includes(years)) {
    fail(`the calculator offers terms of ${allowed.join(', ')} years in ${AFFORD_REGION_NAME[region]} mode, not ${years}`);
  }
}

const AFFORD_PARAMS: ParamSpec[] = [
  money('income', 'annual gross household income'),
  money('debts', 'other monthly debt payments (car and student loans, card minimums); the calculator defaults to 500 for USD and EUR, 0 for GBP'),
  money('deposit', 'down payment / deposit'),
  ratePct('rate', 'annual mortgage rate in %', { max: 30 }),
  { ...termYears, doc: "mortgage term in years: the calculator's buttons offer 15 or 30 (USD), 20, 25, 30 or 35 (GBP), 20, 25 or 30 (EUR), and so does this function" },
];

/** The calculator's "No home fits these limits" states: no honest price exists, so no figure. */
function affordable(status: AffordabilityStatus): void {
  if (status === 'debts-exceed') {
    fail('existing debts alone use up the lending limit, so no home is affordable at these inputs (the calculator says "No home fits these limits"); write it in words');
  }
  if (status === 'costs-exceed') {
    fail('property tax, insurance and HOA alone exceed the housing budget, so no home is affordable at these inputs (the calculator says "No home fits these limits"); write it in words');
  }
}

/* ── Rent vs buy (simulateRentVsBuy) ── */

type RentRegion = 'us' | 'uk' | 'eur';

function rentVsBuyInputs(a: Args): RentVsBuyInputs {
  const region = a.str('region') as RentRegion;
  const costs = TRANSACTION_COST_DEFAULTS[region];
  return {
    homePrice: a.num('price'),
    downPaymentPct: a.num('down'),
    mortgageRate: a.num('rate'),
    loanTermYears: a.num('years'),
    closingCostPct: a.has('closing') ? a.num('closing') : costs.closingCostPct,
    sellingCostPct: a.has('selling') ? a.num('selling') : costs.sellingCostPct,
    propertyTaxRate: a.num('propertyTax'),
    homeInsurance: a.num('insurance'),
    hoaMonthly: a.num('hoa'),
    maintenanceRate: a.num('maintenance'),
    homeAppreciation: a.num('appreciation'),
    monthlyRent: a.num('rent'),
    rentIncrease: a.num('rentIncrease'),
    rentersInsurance: a.num('rentersInsurance'),
    investmentReturn: a.num('invest'),
    timeHorizon: a.num('horizon'),
    region,
    marginalTaxRate: a.num('marginalTax'),
    filingStatus: a.str('status') as FilingStatus,
    otherItemizedDeductions: a.num('otherItemized'),
    stateLocalIncomeTax: a.num('stateTax'),
  };
}

/* ── Solar payback (calculateSolarPayback) ── */

/** solarDefault keys (the names solarPayback options use) -> the field of SOLAR_REGIONAL_DEFAULTS. */
const SOLAR_DEFAULT_KEYS: Record<string, keyof (typeof SOLAR_REGIONAL_DEFAULTS)['uk']> = {
  systemCost: 'systemCost',
  systemSize: 'systemSize',
  batteryCost: 'batteryCost',
  batteryCapacity: 'batteryCapacity',
  tariff: 'electricityTariff',
  exportTariff: 'exportTariff',
  maintenance: 'maintenanceCost',
  kWhPerKwp: 'kWhPerKwp',
};

function solarInputs(a: Args): SolarPaybackInputs {
  const region = a.str('region') as SolarRegion;
  const d = SOLAR_REGIONAL_DEFAULTS[region];
  const pick = (name: string, dflt: number) => (a.has(name) ? a.num(name) : dflt);
  const includeBattery = a.bool('battery');
  return {
    systemCost: pick('systemCost', d.systemCost),
    systemSize: pick('systemSize', d.systemSize),
    includeBattery,
    batteryCost: pick('batteryCost', d.batteryCost),
    batteryCapacityKwh: includeBattery ? pick('batteryCapacity', d.batteryCapacity) : undefined,
    electricityTariff: pick('tariff', d.electricityTariff),
    selfConsumptionPct: a.num('selfConsumption'),
    exportTariff: pick('exportTariff', d.exportTariff),
    energyInflation: a.num('inflation'),
    degradation: a.num('degradation'),
    maintenanceCost: pick('maintenance', d.maintenanceCost),
    taxCredit: a.num('credit'),
    analysisPeriod: a.num('years'),
    kWhPerKwp: pick('kWhPerKwp', d.kWhPerKwp),
  };
}

/* ── Multi-debt payoff (simulateDebtPayoff) ── */

/**
 * "balance@apr/minimum; balance@apr/minimum" -> the debts the Debt Payoff
 * calculator would simulate. Rows are validated by the calculator's own
 * prepareDebts, so a row it would leave out fails here.
 */
function parseDebtSpec(spec: string): Debt[] {
  const parts = spec.split(';').map((s) => s.replace(/\s+/g, '')).filter((s) => s !== '');
  if (parts.length === 0) fail("give at least one debt as balance@apr/minimum, e.g. '6500@22.99/195; 3500@11.5/120'");
  const rows: DebtRowInput[] = parts.map((p) => {
    const m = /^(\d+(?:\.\d+)?)@(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(p);
    if (!m) fail(`debt "${p}" must look like balance@apr/minimum, e.g. 6500@22.99/195 (APR in %, no currency symbols or commas)`);
    return { name: '', balance: Number(m[1]), ratePercent: Number(m[2]), minPayment: Number(m[3]) };
  });
  const prepared = prepareDebts(rows);
  if (prepared.issues.length > 0) {
    fail(prepared.issues.map((i) => `debt ${i.row + 1}: ${i.message}`).join(' '));
  }
  return prepared.debts;
}

/** One strategy run, as the calculator shows it; "never" and "beyond 50 years" have no honest total, so they fail. */
function debtRun(a: Args): DebtSimulation {
  const r = simulateDebtPayoff(parseDebtSpec(a.str('debts')), a.num('extra'), a.str('strategy') as Strategy);
  switch (r.status) {
    case 'never':
      return fail(
        "these debts are never cleared (every open debt's monthly interest is at least the most the plan can pay towards it); the calculator says so and shows no total, so write it in words",
      );
    case 'beyondHorizon':
      return fail(
        `these debts are not cleared within ${DEBT_HORIZON_MONTHS} months (${DEBT_HORIZON_MONTHS / 12} years); the calculator labels its totals as covering the first ${DEBT_HORIZON_MONTHS / 12} years only, so write it in words`,
      );
    case 'empty':
      return fail('no debts to pay off');
    case 'paid':
      return r;
  }
}

const DEBT_ARGS: ParamSpec[] = [
  { name: 'debts', type: 'string', doc: "debts as 'balance@apr/minimum' separated by ';', e.g. '6500@22.99/195; 3500@11.5/120; 12000@6.5/350' (APR in %)", required: true },
  money('extra', 'extra paid every month on top of all the minimums'),
  { name: 'strategy', type: 'string', doc: 'avalanche (highest rate first) or snowball (smallest balance first)', required: true, oneOf: ['avalanche', 'snowball'] },
];

/* ════════════════════════════════════════════════════════════
 * The catalogue
 * ════════════════════════════════════════════════════════════ */

const fns: FigureFunction[] = [
  /* ── UK pay ── */
  {
    name: 'ukPay',
    group: 'UK pay',
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
    summary: "Share of the next £100 of salary lost to income tax + NI + student loan, in % (the calculator's marginal rate; shows the 60% trap).",
    params: [money('salary', 'annual salary (£)')],
    options: UK_PAY_OPTIONS,
    returns: 'number (%)',
    example: 'ukMarginalRate(110000) | pct',
    run: (a) => ukMarginalPct(a.num('salary'), a),
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
      // The engine derives the rate band from income (there is no band argument):
      // the unused basic-rate band is taxed at the basic CGT rate, the rest at the higher rate.
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
      {
        name: 'nonResident',
        type: 'boolean',
        doc: "buyer is not UK resident for SDLT (the tool's checkbox): adds the non-resident surcharge to every band for a price of £40,000 or more",
        default: false,
      },
      ukYear,
    ],
    returns: 'number (£)',
    example: 'sdlt(425000, buyer=ftb) | gbp',
    run: (a) => {
      checkUkYear(a);
      return calculateSdlt(a.num('price'), a.str('buyer') as BuyerType, { nonResident: a.bool('nonResident') }).totalTax;
    },
  },

  /* ── US pay ── */
  {
    name: 'usPay',
    group: 'US pay',
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
    summary: "Federal bracket (%) the US salary calculator shows for this pay (10%, the lowest, when taxable income is 0).",
    params: [money('salary', 'annual salary ($)')],
    options: US_PAY_OPTIONS,
    returns: 'number (%)',
    example: 'usBracket(60000) | pct',
    run: (a) => usPay(a.num('salary'), a).bracket,
  },
  {
    name: 'usMarginalRate',
    group: 'US pay',
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
      const year = usYearOf(a);
      const rates = getUsRates(year);
      if (a.str('key').startsWith('k401') && !rates.retirement401k.published) {
        fail(`the IRS has not published the ${year} 401(k) limits yet (the rates module carries the prior year's values), so they cannot be printed as facts`);
      }
      if (a.str('key').startsWith('ira') && !rates.retirementIra.published) {
        fail(`the IRS has not published the ${year} IRA limits yet (the rates module carries the prior year's values), so they cannot be printed as facts`);
      }
      return US_FACTS[a.str('key')][0](rates, a.str('status') as FilingStatus);
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
    run: (a) => usBracketStart(a.num('rate'), a.str('status') as FilingStatus, getUsRates(usYearOf(a))),
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
    run: (a) =>
      calculateUSCgt(
        0,
        a.num('gain'),
        a.str('holding') as 'long' | 'short',
        a.str('status') as FilingStatus,
        a.num('income'),
        getUsRates(usYearOf(a)),
      ).totalTax,
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
    summary:
      'Paying down a card or loan balance (the credit card payoff calculator): a fixed payment, or a minimum that is a % of the balance with a floor, optionally plus the month\'s interest.',
    params: CARD_PAYOFF_PARAMS,
    options: CARD_PAYOFF_OPTIONS,
    returns: 'object',
    fields: PAYOFF_FIELDS,
    example: 'cardPayoff(5000, 22.99, 100).months | months',
    run: (a) => payoff(a.num('balance'), a.num('apr'), cardModeOf(a), a.num('extra')),
  },
  {
    name: 'loanPayoff',
    group: 'Debt',
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
    summary: 'Balance left after some months of a fixed payment (0 once paid off). Fails if the payment never covers the interest.',
    params: [
      money('balance', 'starting balance', { above: 0, min: undefined }),
      ratePct('apr', 'annual rate in %'),
      { name: 'payment', type: 'number', doc: 'fixed monthly payment', required: true, above: 0 },
      { name: 'months', type: 'number', doc: `months of payments (at most ${CARD_HORIZON_MONTHS}, the length of the calculator's schedule)`, required: true, min: 0, integer: true, max: CARD_HORIZON_MONTHS },
    ],
    returns: 'number',
    example: 'payoffBalance(50000, 22, 1200, 12) | usd',
    run: (a) => payoffBalance(a.num('balance'), a.num('apr'), a.num('payment'), a.num('months')),
  },
  {
    name: 'cardHorizonYears',
    group: 'Debt',
    summary:
      'The longest payoff the card calculator runs, in years (50). A balance not cleared within it is "beyond 50 years" (a payoff token fails; use this number in the words).',
    params: [],
    returns: 'number (years)',
    returnsYears: true,
    example: 'cardHorizonYears() | int',
    run: () => CARD_HORIZON_MONTHS / 12,
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
    summary: "Retirement pot at retirement, nominal and in today's money (the retirement savings calculator).",
    params: [
      money('savings', 'current savings'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'annual return in %', { max: 50 }),
      { name: 'years', type: 'number', doc: 'years until retirement (rounded to whole months, like the calculator)', required: true, min: 0, max: 100 },
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
      const p = projectRetirement({
        currentAge: 0,
        retirementAge: a.num('years'),
        currentSavings: a.num('savings'),
        monthlyContribution: a.num('monthly'),
        annualReturn: a.num('rate') / 100,
        inflation: a.num('inflation') / 100,
      });
      return { nominal: p.nominal, real: p.real, contributions: p.totalContributions, growth: p.totalGrowth };
    },
  },
  {
    name: 'savingsMonthly',
    group: 'Saving and investing',
    summary: 'Monthly saving needed to reach a goal in a number of months (the savings goal calculator; 0 if the goal is already met or interest alone gets there).',
    params: [
      money('goal', 'target amount', { above: 0, min: undefined }),
      money('current', 'already saved'),
      ratePct('rate', 'annual interest in %', { max: 50 }),
      { name: 'months', type: 'number', doc: 'months to the goal', required: true, min: 1, integer: true, max: 1200 },
    ],
    returns: 'number (per month)',
    example: 'savingsMonthly(100000, 0, 4, 60) | usd',
    run: (a) =>
      monthlyForGoal({
        goal: a.num('goal'),
        current: a.num('current'),
        annualRate: a.num('rate') / 100,
        months: a.num('months'),
      }).monthly,
  },
  {
    name: 'savingsMonths',
    group: 'Saving and investing',
    summary:
      'Whole months until the savings goal is first met at a monthly saving rate (the savings goal calculator; 0 if already met; Infinity only when it can never be met: no deposits and no growth; a goal not met within 100 years fails the build, as the calculator says "Not within 100 years").',
    params: [
      money('goal', 'target amount', { above: 0, min: undefined }),
      money('current', 'already saved'),
      money('monthly', 'saved each month'),
      ratePct('rate', 'annual interest in %', { max: 50 }),
    ],
    returns: 'number (months)',
    example: 'savingsMonths(50000, 0, 1000, 5) | months',
    run: (a) => {
      const r = timeToGoal({
        goal: a.num('goal'),
        current: a.num('current'),
        monthly: a.num('monthly'),
        annualRate: a.num('rate') / 100,
      });
      if (r.status === 'ok') return r.months;
      if (r.status === 'reached') return 0;
      if (neverReached(a.num('current'), a.num('monthly'), a.num('rate'))) return Infinity;
      return fail(
        `the goal is not reached within ${MAX_GOAL_MONTHS / 12} years (the savings goal calculator says "Not within 100 years"), which is not "never"; write that in words`,
      );
    },
  },
  {
    name: 'yearsToTarget',
    group: 'Saving and investing',
    summary:
      'Years (whole months / 12) for a starting sum plus monthly contributions to first reach a target (the investment return calculator, Time tab; 0 if already there; Infinity only when it can never be reached: no deposits and no growth; a target not reached within 100 years fails the build, as the calculator says "Not within 100 years").',
    params: [
      money('start', 'starting amount'),
      money('monthly', 'monthly contribution'),
      ratePct('rate', 'annual return in %', { max: 50 }),
      money('target', 'target balance', { above: 0, min: undefined }),
    ],
    options: [COMPOUNDING, TIMING],
    returns: 'number (years: whole months / 12)',
    returnsYears: true,
    example: 'yearsToTarget(10000, 500, 7, 1000000) | num(1)',
    run: (a) => {
      checkCompounding(a.num('compounding'));
      const r = solveMonthsToTarget(
        {
          principal: a.num('start'),
          monthlyContribution: a.num('monthly'),
          annualRate: a.num('rate') / 100,
          compoundingPerYear: a.num('compounding'),
          timing: a.str('timing') as 'end' | 'beginning',
        },
        a.num('target'),
      );
      if (r.status !== 'notWithin') return r.months / 12;
      if (neverReached(a.num('start'), a.num('monthly'), a.num('rate'))) return Infinity;
      return fail(
        `the target is not reached within ${MAX_SOLVE_MONTHS / 12} years (the investment return calculator says "Not within 100 years"), which is not "never"; write that in words`,
      );
    },
  },
  {
    name: 'goalHorizonYears',
    group: 'Saving and investing',
    summary:
      'How far the savings goal and investment return calculators look, in years (100). A goal or target not reached within it is "Not within 100 years" (the token fails; use this number in the words).',
    params: [],
    returns: 'number (years)',
    returnsYears: true,
    example: 'goalHorizonYears() | int',
    run: () => MAX_GOAL_MONTHS / 12,
  },
  {
    name: 'feeDrag',
    group: 'Saving and investing',
    summary:
      'What a fund fee costs over time (the investment fee calculator: fee subtracted from the return, monthly compounding, deposits at the end of each month).',
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
      zeroFeeBalance: 'final balance with no fee at all',
      feesPaid: 'growth lost to fee versus no fee (zeroFeeBalance - balance)',
      contributions: 'everything paid in',
      shareOfGrowth: "cost as % of the lower-fee fund's earnings, capped at 100 (the calculator's share of returns lost)",
      contributionsLost: 'when the higher-fee fund ends below what was paid in: how much of the contributions the gap takes, else 0',
    },
    example: 'feeDrag(100000, 0, 7, 30, 1).cost | usd',
    run: (a) => {
      const c = compareFees({
        principal: a.num('start'),
        monthlyContribution: a.num('monthly'),
        grossReturnPercent: a.num('rate'),
        years: a.num('years'),
        yourFeePercent: a.num('fee'),
        comparisonFeePercent: a.num('compareFee'),
      });
      if (c.shareOfReturnsLost === null) {
        fail('the lower-fee fund earns nothing at these inputs (net return of 0 or less), so the share of returns lost is undefined; pick inputs where it earns something');
      }
      return {
        cost: c.feeCost,
        balance: c.yourBalance,
        compareBalance: c.compBalance,
        zeroFeeBalance: c.zeroFeeBalance,
        feesPaid: c.yourFeesPaid,
        contributions: c.totalContributions,
        shareOfGrowth: c.shareOfReturnsLost * 100,
        contributionsLost: c.contributionsLost,
      };
    },
  },
  {
    name: 'inflationAdjust',
    group: 'Saving and investing',
    summary: 'Inflation at a steady rate (the inflation calculator, future mode): future cost of something, or what money will be worth.',
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
      const p = projectInflation(a.num('amount'), a.num('rate') / 100, a.num('years'));
      return a.str('mode') === 'value' ? p.purchasingPower : p.futureCost;
    },
  },
  {
    name: 'cpiAdjust',
    group: 'Saving and investing',
    summary: `Past inflation (the inflation calculator, historical mode): an amount from one year in another year's prices, from US CPI-U (BLS annual averages 1913-${CPI_U_LATEST.year - 1}; ${CPI_U_LATEST.year} is the latest month, ${CPI_U_LATEST.label}).`,
    params: [
      money('amount', 'amount in fromYear prices'),
      { name: 'fromYear', type: 'number', doc: `year the amount is from (${CPI_FIRST_YEAR}-${CPI_LAST_YEAR})`, required: true, integer: true, min: CPI_FIRST_YEAR, max: CPI_LAST_YEAR },
      { name: 'toYear', type: 'number', doc: `year to express it in (${CPI_FIRST_YEAR}-${CPI_LAST_YEAR}; must differ from fromYear)`, required: true, integer: true, min: CPI_FIRST_YEAR, max: CPI_LAST_YEAR },
    ],
    returns: 'object',
    fields: {
      adjusted: 'the amount in toYear prices',
      cumulativeChange: 'total price change between the two years, % (negative if prices fell)',
      averageAnnual: 'compound average annual change, %',
      years: 'elapsed years the average uses (the latest month counts as part of its year)',
    },
    fieldMeta: { years: { years: true } },
    example: 'cpiAdjust(45000, 2010, 2025).adjusted | usd',
    run: (a) => {
      if (a.num('fromYear') === a.num('toYear')) fail('fromYear and toYear are the same year, so there is nothing to adjust');
      const r = adjustForInflation(a.num('amount'), a.num('fromYear'), a.num('toYear'));
      if (r === null) fail(`no CPI data for ${a.num('fromYear')} or ${a.num('toYear')} (available ${CPI_FIRST_YEAR}-${CPI_LAST_YEAR})`);
      return {
        adjusted: r.adjusted,
        cumulativeChange: r.cumulativeChange * 100,
        averageAnnual: r.averageAnnual * 100,
        years: r.years,
      };
    },
  },

  /* ── Debt: beyond the horizon, daily compounding, multi-debt payoff ── */
  {
    name: 'cardBeyondHorizon',
    group: 'Debt',
    summary:
      'What the card calculator shows when a balance is falling but not cleared in 600 months ("beyond 50 years"): the balance left and the interest paid within the horizon. Same arguments as cardPayoff; fails for a balance that does clear (use cardPayoff) or never falls.',
    params: CARD_PAYOFF_PARAMS,
    options: CARD_PAYOFF_OPTIONS,
    returns: 'object',
    fields: {
      months: 'the horizon, in months (600)',
      years: 'the horizon, in years (50; a year number: print with int, never months)',
      remaining: 'balance still owed at the end of the horizon',
      interest: 'interest paid within the horizon',
      totalPaid: 'paid within the horizon',
    },
    fieldMeta: { years: { years: true } },
    example: 'cardBeyondHorizon(5000, 22.99, minPct=2, minFloor=25).remaining | usd',
    run: (a) => {
      const r = simulateCardPayoff(cardInputs(a.num('balance'), a.num('apr'), cardModeOf(a), a.num('extra')));
      if (r.status === 'paid') {
        fail(`this balance is cleared in ${r.months} months, within the ${CARD_HORIZON_MONTHS}-month horizon; use cardPayoff`);
      }
      if (r.status !== 'beyondHorizon') {
        fail('the payment does not exceed the first month\'s interest ("never repaid"), so there is no balance at the horizon; write it in words');
      }
      return {
        months: r.months,
        years: r.months / 12,
        remaining: r.remainingBalance,
        interest: r.totalInterest,
        totalPaid: r.totalPaid,
      };
    },
  },
  {
    name: 'dailyCompoundingApr',
    group: 'Debt',
    summary:
      "The APR to give the card calculator (which charges APR / 12 a month) so that it matches an issuer that compounds daily at the quoted APR: 12 x ((1 + APR / 365) ^ (365 / 12) - 1), in %.",
    params: [ratePct('apr', 'quoted APR in %')],
    returns: 'number (%)',
    example: 'dailyCompoundingApr(22.99) | pct(2)',
    run: (a) => (12 * (Math.pow(1 + a.num('apr') / 100 / 365, 365 / 12) - 1)) * 100,
  },
  {
    name: 'debtPayoff',
    group: 'Debt',
    summary:
      'Paying off several debts with the snowball or avalanche method (the debt payoff calculator): months, interest and total paid. Fails when the debts are never cleared or not cleared within 600 months (the calculator shows no honest total then).',
    params: DEBT_ARGS,
    returns: 'object',
    fields: {
      months: 'months until every debt is cleared',
      interest: 'total interest paid',
      totalPaid: 'balances + interest',
      monthlyOutlay: 'total paid every month (all the minimums plus the extra payment)',
      firstMonthInterest: "the first month's interest across all debts",
    },
    example: "debtPayoff('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche').interest | usd(2)",
    run: (a) => {
      const r = debtRun(a);
      return {
        months: r.months,
        interest: r.totalInterest,
        totalPaid: r.totalPaid,
        monthlyOutlay: r.monthlyOutlay,
        firstMonthInterest: r.firstMonthInterest,
      };
    },
  },
  {
    name: 'debtClearMonth',
    group: 'Debt',
    summary: 'The month the n-th debt (1 = the first one listed) is cleared under a strategy (the calculator\'s "order cleared" list).',
    params: [...DEBT_ARGS, { name: 'debt', type: 'number', doc: 'which debt, 1 = the first one listed', required: true, integer: true, min: 1 }],
    returns: 'number (month)',
    example: "debtClearMonth('6500@22.99/195; 3500@11.5/120; 12000@6.5/350', 200, 'avalanche', 1) | int",
    run: (a) => {
      const r = debtRun(a);
      const c = r.clearances.find((x) => x.index === a.num('debt') - 1);
      if (!c) fail(`there is no debt ${a.num('debt')} in the list`);
      // Unreachable today (debtRun only returns 'paid' results, where every debt has a clearance month);
      // kept so an engine change that leaves a debt uncleared fails loudly instead of printing null.
      if (c.month === null) fail(`debt ${a.num('debt')} is not cleared within the horizon`);
      return c.month;
    },
  },

  /* ── Mortgage affordability ── */
  {
    name: 'usAffordability',
    group: 'Mortgage affordability',
    summary:
      "How much home the 28/36 rule allows (the mortgage affordability calculator in USD mode). Options default to the calculator's own defaults. Fails when debts or property costs leave no budget (the calculator says \"No home fits these limits\").",
    params: AFFORD_PARAMS,
    options: [
      { name: 'propertyTax', type: 'number', doc: 'annual property tax, % of the price', default: AFFORD_DEFAULTS.propertyTaxRate, min: 0, max: 10 },
      { name: 'insurance', type: 'number', doc: 'homeowners insurance a year', default: AFFORD_DEFAULTS.insuranceAnnual, min: 0 },
      { name: 'hoa', type: 'number', doc: 'HOA fees a month', default: AFFORD_DEFAULTS.hoaMonthly, min: 0 },
      { name: 'pmi', type: 'number', doc: 'PMI, % of the loan a year, while the down payment is under 20%', default: AFFORD_DEFAULTS.pmiRate, min: 0, max: 5 },
      { name: 'frontEnd', type: 'number', doc: 'housing limit, % of gross income (front-end ratio)', default: AFFORD_DEFAULTS.frontEndPct, min: 0, max: 100 },
      { name: 'backEnd', type: 'number', doc: 'all-debt limit, % of gross income (back-end ratio)', default: AFFORD_DEFAULTS.backEndPct, min: 0, max: 100 },
    ],
    returns: 'object',
    fields: {
      maxPrice: 'the highest price that fits (maximum loan + down payment)',
      maxLoan: 'the maximum loan',
      monthlyPI: 'principal and interest at that loan',
      monthlyTax: 'property tax a month',
      monthlyInsurance: 'insurance a month',
      monthlyHOA: 'HOA a month',
      monthlyPMI: 'PMI a month (0 at 20% down or more)',
      totalMonthly: 'the whole monthly housing payment',
      grossMonthly: 'gross monthly income',
      frontEndBudget: 'front-end limit in money a month',
      backEndBudget: 'back-end limit minus other debts, in money a month',
      housingBudget: 'the lower of the two budgets',
      frontEndRatio: 'housing payment as % of gross income',
      backEndRatio: 'housing payment plus other debts as % of gross income',
      needsPMI: 'true when PMI applies',
      binding: "which limit binds: 'front-end' or 'back-end'",
    },
    example: 'usAffordability(80000, 500, 40000, 7, 30).maxPrice | usd',
    run: (a) => {
      affordTerm('us', a.num('years'));
      const r = solveUsAffordability({
        region: 'us',
        annualIncome: a.num('income'),
        monthlyDebts: a.num('debts'),
        deposit: a.num('deposit'),
        ratePct: a.num('rate'),
        termYears: a.num('years'),
        propertyTaxRate: a.num('propertyTax'),
        insuranceAnnual: a.num('insurance'),
        hoaMonthly: a.num('hoa'),
        pmiRate: a.num('pmi'),
        frontEndPct: a.num('frontEnd'),
        backEndPct: a.num('backEnd'),
      });
      affordable(r.status);
      return {
        maxPrice: r.maxPrice,
        maxLoan: r.maxLoan,
        monthlyPI: r.monthlyPI,
        monthlyTax: r.monthlyTax,
        monthlyInsurance: r.monthlyInsurance,
        monthlyHOA: r.monthlyHOA,
        monthlyPMI: r.monthlyPMI,
        totalMonthly: r.totalMonthly,
        grossMonthly: r.grossMonthlyIncome,
        frontEndBudget: r.frontEndBudget,
        backEndBudget: r.backEndBudget,
        housingBudget: r.housingBudget,
        frontEndRatio: r.frontEndRatio,
        backEndRatio: r.backEndRatio,
        needsPMI: r.needsPMI,
        binding: r.binding,
      };
    },
  },
  {
    name: 'ukAffordability',
    group: 'Mortgage affordability',
    summary:
      "How much home the income multiple and the stress test allow (the mortgage affordability calculator in GBP mode). Take-home pay defaults to the calculator's estimate (one earner, whole pounds); other options to its defaults. Fails when debts leave no budget.",
    params: AFFORD_PARAMS,
    options: [
      { name: 'takeHome', type: 'number', doc: 'monthly take-home pay of all applicants; default is the calculator\'s one-earner estimate, rounded to whole pounds', min: 0 },
      { name: 'ltiCap', type: 'number', doc: 'loan-to-income cap (x income); the calculator offers 4 to 5.5', default: AFFORD_DEFAULTS.ltiCap, min: 0, max: 10 },
      { name: 'revertRate', type: 'number', doc: "lenders' revert-to rate in % that the stress test starts from (default: the Bank of England average in market-rates.ts, which is all the calculator offers: another value is an extension its screen cannot show)", min: 0, max: 30 },
      { name: 'stressMargin', type: 'number', doc: 'points added to the higher of the product and revert-to rates; 0 means no stress test', default: AFFORD_DEFAULTS.stressMarginPct, min: 0, max: 10 },
      { name: 'maxShare', type: 'number', doc: 'ceiling for the stressed payment plus debts, % of take-home pay', default: AFFORD_DEFAULTS.maxShareOfTakeHomePct, min: 0, max: 100 },
    ],
    returns: 'object',
    fields: {
      maxPrice: 'the highest price that fits (maximum loan + deposit)',
      maxLoan: 'the maximum loan: the smaller of the two limits',
      monthlyPI: 'principal and interest at your own rate on that loan',
      totalMonthly: 'the monthly housing payment counted (principal and interest)',
      grossMonthly: 'gross monthly income',
      monthlyTakeHome: 'take-home pay used, a month',
      ltiCap: 'the income multiple used',
      ltiLimitLoan: 'loan allowed by the income multiple',
      stressRatePct: 'the stressed rate in %',
      stressLimitLoan: 'loan whose stressed payment fits within the take-home limit',
      stressedPayment: 'payment at the stressed rate on the maximum loan',
      shareOfTakeHome: '(monthlyPI + debts) as % of take-home pay',
      stressedShareOfTakeHome: '(stressedPayment + debts) as % of take-home pay',
      incomeMultiple: 'maximum loan / annual income',
      depositPct: 'deposit as % of the maximum price',
      lowDeposit: 'true when the deposit is under 5% of the price',
      binding: "which limit is lower: 'lti' or 'stress'",
    },
    example: 'ukAffordability(60000, 0, 40000, 5, 25, takeHome=3600, revertRate=6.5).maxPrice | gbp',
    run: (a) => {
      affordTerm('uk', a.num('years'));
      const takeHome = a.has('takeHome') ? a.num('takeHome') : Math.round(estimateUkTakeHome(a.num('income')));
      const r = solveUkAffordability({
        region: 'uk',
        annualIncome: a.num('income'),
        monthlyDebts: a.num('debts'),
        deposit: a.num('deposit'),
        ratePct: a.num('rate'),
        termYears: a.num('years'),
        monthlyTakeHome: takeHome,
        ltiCap: a.num('ltiCap'),
        revertRatePct: a.has('revertRate') ? a.num('revertRate') : undefined,
        stressMarginPct: a.num('stressMargin'),
        maxShareOfTakeHomePct: a.num('maxShare'),
      });
      affordable(r.status);
      return {
        maxPrice: r.maxPrice,
        maxLoan: r.maxLoan,
        monthlyPI: r.monthlyPI,
        totalMonthly: r.totalMonthly,
        grossMonthly: r.grossMonthlyIncome,
        monthlyTakeHome: r.monthlyTakeHome,
        ltiCap: r.ltiCap,
        ltiLimitLoan: r.ltiLimitLoan,
        stressRatePct: r.stressRatePct,
        stressLimitLoan: r.stressLimitLoan,
        stressedPayment: r.stressedPayment,
        shareOfTakeHome: r.shareOfTakeHome,
        stressedShareOfTakeHome: r.stressedShareOfTakeHome,
        incomeMultiple: r.incomeMultiple,
        depositPct: r.depositPct,
        lowDeposit: r.lowDeposit,
        binding: r.binding,
      };
    },
  },
  {
    name: 'eurAffordability',
    group: 'Mortgage affordability',
    summary:
      'How much home one combined payment limit allows (the mortgage affordability calculator in EUR mode). Fails when debts leave no budget.',
    params: AFFORD_PARAMS,
    options: [
      { name: 'maxDebtService', type: 'number', doc: 'loan payment plus other debts as % of gross income', default: AFFORD_DEFAULTS.eurMaxDebtServicePct, min: 0, max: 100 },
    ],
    returns: 'object',
    fields: {
      maxPrice: 'the highest price that fits (maximum loan + deposit)',
      maxLoan: 'the maximum loan',
      monthlyPI: 'principal and interest on that loan',
      totalMonthly: 'the monthly housing payment counted',
      grossMonthly: 'gross monthly income',
      paymentBudget: 'the payment budget a month (limit x gross income, before other debts)',
      debtServiceRatio: '(payment + other debts) as % of gross income',
    },
    example: 'eurAffordability(60000, 0, 40000, 3.5, 25).maxLoan | eur',
    run: (a) => {
      affordTerm('eur', a.num('years'));
      const r = solveEurAffordability({
        region: 'eur',
        annualIncome: a.num('income'),
        monthlyDebts: a.num('debts'),
        deposit: a.num('deposit'),
        ratePct: a.num('rate'),
        termYears: a.num('years'),
        maxDebtServicePct: a.num('maxDebtService'),
      });
      affordable(r.status);
      return {
        maxPrice: r.maxPrice,
        maxLoan: r.maxLoan,
        monthlyPI: r.monthlyPI,
        totalMonthly: r.totalMonthly,
        grossMonthly: r.grossMonthlyIncome,
        paymentBudget: r.paymentBudget,
        debtServiceRatio: r.debtServiceRatio,
      };
    },
  },

  /* ── Rent vs buy ── */
  {
    name: 'rentVsBuy',
    group: 'Rent vs buy',
    summary:
      "The rent vs buy calculator's month-by-month comparison of end-of-horizon net worth on equal cash. Options default to the calculator's defaults for the region (buying and selling costs: 3% and 6% in the US, 0 elsewhere). The mortgage rate is not defaulted: pass it (for example rate('us30')).",
    params: [
      money('price', 'purchase price', { above: 0, min: undefined }),
      { name: 'down', type: 'number', doc: 'down payment as % of the price', required: true, min: 0, max: 100 },
      ratePct('rate', 'annual mortgage rate in %', { max: 30 }),
      { ...termYears, integer: true, min: 10, max: 35, doc: "mortgage term in whole years: the calculator's slider runs 10 to 35" },
      money('rent', 'monthly rent in the first year'),
      { name: 'horizon', type: 'number', doc: "years to compare (whole years): the calculator's slider runs 1 to 30", required: true, integer: true, min: 1, max: 30 },
    ],
    options: [
      { name: 'region', type: 'string', doc: 'us (default), uk or eur: sets the transaction-cost defaults and switches the US deduction test off elsewhere', default: 'us', oneOf: ['us', 'uk', 'eur'] },
      { name: 'closing', type: 'number', doc: "buyer's purchase costs, % of the price (default by region: 3 US, 0 UK and EUR)", min: 0, max: 30 },
      { name: 'selling', type: 'number', doc: 'costs of selling at the end, % of the sale price (default by region: 6 US, 0 UK and EUR)', min: 0, max: 30 },
      { name: 'propertyTax', type: 'number', doc: 'annual property tax or charges, % of the purchase price', default: 1, min: 0, max: 10 },
      { name: 'insurance', type: 'number', doc: 'home insurance a year', default: 1800, min: 0 },
      { name: 'hoa', type: 'number', doc: 'HOA, service charge or ground rent a month', default: 0, min: 0 },
      { name: 'maintenance', type: 'number', doc: 'annual maintenance, % of the purchase price', default: 1, min: 0, max: 10 },
      { name: 'appreciation', type: 'number', doc: 'annual home price growth, %', default: 3, min: -20, max: 30 },
      { name: 'rentIncrease', type: 'number', doc: 'annual rent increase, %', default: 3, min: 0, max: 30 },
      { name: 'rentersInsurance', type: 'number', doc: "renters' (contents) insurance a month", default: 15, min: 0 },
      { name: 'invest', type: 'number', doc: 'annual return on invested cash, %', default: 7, min: -20, max: 30 },
      { name: 'marginalTax', type: 'number', doc: 'US only: combined marginal tax rate on deductions, %', default: 22, min: 0, max: 60 },
      STATUS,
      { name: 'otherItemized', type: 'number', doc: 'US only: other itemised deductions a year', default: 0, min: 0 },
      { name: 'stateTax', type: 'number', doc: 'US only: state and local income tax paid a year (shares the SALT cap)', default: 0, min: 0 },
    ],
    returns: 'object',
    fields: {
      verdict: "'buy', 'rent' or 'tie' at the horizon",
      advantage: 'buyer net worth minus renter net worth at the horizon (negative = renting ahead)',
      difference: 'the absolute value of advantage',
      breakEvenYear: 'first year from which buying stays ahead to the horizon (a year number: print with int, never months; using it when buying is not ahead at the horizon fails the build)',
      laterBreakEvenYear: 'when renting is ahead at the horizon, the year buying would pull ahead if you stayed up to 50 years (a year number; using it when renting is not ahead, or buying never catches up, fails the build)',
      downPayment: 'the down payment',
      closingCosts: "the buyer's purchase costs",
      initialCash: 'cash both households start with (down payment + purchase costs)',
      loanAmount: 'the mortgage',
      monthlyMortgage: 'scheduled principal and interest a month',
      monthlyOwnershipCost: 'first month: mortgage + property tax + insurance + HOA + maintenance (before any tax saving)',
      firstMonthRentCost: 'first month: rent + renters insurance',
      totalTaxSaving: 'US tax saved by itemising over the horizon',
      totalInterest: 'mortgage interest paid over the horizon',
      totalRentPaid: 'rent and renters insurance paid over the horizon',
      finalHomeValue: 'home value at the horizon',
      saleCosts: 'selling costs at the horizon',
      loanBalance: 'loan still owed at the horizon',
      finalEquity: 'home value minus loan balance',
      buyerPortfolio: "the buyer's investment portfolio at the horizon",
      finalBuyerNetWorth: 'home value - selling costs - loan + buyer portfolio',
      finalRenterNetWorth: "the renter's portfolio",
    },
    fieldMeta: {
      breakEvenYear: {
        years: true,
        ifInfinite:
          'there is no break-even year: buying is not ahead at the end of the horizon (the calculator says renting stays ahead, or the two tie); write it in words',
      },
      laterBreakEvenYear: {
        years: true,
        ifInfinite: `there is no later break-even year: renting is not ahead at the horizon, or buying does not catch up within ${LONG_STAY_YEARS} years (the calculator says so); write it in words`,
      },
    },
    example: "rentVsBuy(350000, 20, 5.5, 25, 1400, 10, region=uk, closing=3, selling=2, propertyTax=0, insurance=400, rentersInsurance=10).advantage | gbp",
    run: (a) => {
      const input = rentVsBuyInputs(a);
      const r = simulateRentVsBuy(input);
      const last = r.years[r.years.length - 1];
      const later = r.verdict === 'rent' ? laterBreakEvenYear(input) : null;
      return {
        verdict: r.verdict,
        advantage: r.advantage,
        difference: r.difference,
        breakEvenYear: r.breakEvenYear ?? Infinity,
        laterBreakEvenYear: later ?? Infinity,
        downPayment: r.downPayment,
        closingCosts: r.closingCosts,
        initialCash: r.initialCash,
        loanAmount: r.loanAmount,
        monthlyMortgage: r.monthlyMortgage,
        monthlyOwnershipCost: r.monthlyOwnershipCost,
        firstMonthRentCost: r.firstMonthRentCost,
        totalTaxSaving: r.totalTaxSaving,
        totalInterest: r.totalInterest,
        totalRentPaid: r.totalRentPaid,
        finalHomeValue: r.finalHomeValue,
        saleCosts: last.saleCosts,
        loanBalance: last.loanBalance,
        finalEquity: r.finalEquity,
        buyerPortfolio: last.buyerPortfolio,
        finalBuyerNetWorth: r.finalBuyerNetWorth,
        finalRenterNetWorth: r.finalRenterNetWorth,
      };
    },
  },

  /* ── Car finance ── */
  {
    name: 'carFinance',
    group: 'Car finance',
    summary:
      "The car finance calculator's PCP, HP, personal loan and cash comparison. APRs, balloon and return default to the calculator's defaults. The APR convention is 'effective' (the GBP and EUR rule, default) or 'nominal' (USD, APR / 12). A deposit above what the calculator allows fails (it would clamp it and show a notice).",
    params: [
      money('price', 'car price', { above: 0, min: undefined }),
      money('deposit', 'deposit'),
      { name: 'months', type: 'number', doc: "term in months: the calculator's slider runs 12 to 84 in steps of 6", required: true, integer: true, min: 12, max: 84, step: 6 },
    ],
    options: [
      { name: 'convention', type: 'string', doc: "APR convention: effective (annual effective rate, GBP and EUR; default) or nominal (APR / 12, USD)", default: 'effective', oneOf: ['effective', 'nominal'] },
      { name: 'pcpApr', type: 'number', doc: 'PCP APR in %', default: 7.9, min: 0, max: 100 },
      { name: 'balloon', type: 'number', doc: 'PCP balloon (GMFV) as % of the price (at most 60, and deposit + balloon within the price)', default: 40, min: 0, max: 60 },
      { name: 'hpApr', type: 'number', doc: 'HP APR in %', default: 8.9, min: 0, max: 100 },
      { name: 'loanApr', type: 'number', doc: 'personal loan APR in %', default: 5.6, min: 0, max: 100 },
      { name: 'invest', type: 'number', doc: 'what uninvested cash could earn, % a year', default: 4.5, min: 0, max: 50 },
    ],
    returns: 'object',
    fields: {
      financeAmount: 'price minus deposit',
      balloon: 'the PCP balloon in money',
      pcpMonthly: 'PCP monthly payment',
      hpMonthly: 'HP monthly payment',
      loanMonthly: 'personal loan monthly payment',
      pcpTotalPaid: 'PCP: deposit + payments + balloon',
      hpTotalPaid: 'HP: deposit + payments',
      loanTotalPaid: 'personal loan: deposit + payments',
      cashTotalPaid: 'cash: the price',
      pcpTotalInterest: 'PCP total paid minus the price',
      hpTotalInterest: 'HP total paid minus the price',
      loanTotalInterest: 'personal loan total paid minus the price',
      pcpOpportunityCost: 'PCP: investment growth given up',
      hpOpportunityCost: 'HP: investment growth given up',
      loanOpportunityCost: 'personal loan: investment growth given up',
      cashOpportunityCost: 'cash: investment growth given up',
      pcpTrueCost: 'PCP total paid + opportunity cost',
      hpTrueCost: 'HP total paid + opportunity cost',
      loanTrueCost: 'personal loan total paid + opportunity cost',
      cashTrueCost: 'cash total paid + opportunity cost',
      cheapest: "the option with the lowest true cost: 'pcp', 'hp', 'loan' or 'cash'",
    },
    example: 'carFinance(25000, 2500, 48).pcpMonthly | gbp(2)',
    run: (a) => {
      const price = a.num('price');
      const deposit = a.num('deposit');
      if (deposit > maxDepositFor(price)) {
        fail(
          `deposit ${deposit} is more than the calculator allows for a ${price} car (at most ${maxDepositFor(price)}: the price less ${MIN_FINANCE_AMOUNT}, capped at ${MAX_DEPOSIT}); the calculator clamps it and shows a notice`,
        );
      }
      const c = compareCarFinance({
        carPrice: price,
        deposit,
        termMonths: a.num('months'),
        pcpApr: a.num('pcpApr'),
        pcpBalloonPct: a.num('balloon'),
        hpApr: a.num('hpApr'),
        loanApr: a.num('loanApr'),
        investReturnRate: a.num('invest'),
        aprConvention: a.str('convention') as AprConvention,
      });
      if (a.num('balloon') > c.maxBalloonPct) {
        fail(`balloon ${a.num('balloon')}% is more than the calculator allows here (at most ${c.maxBalloonPct}% for this price and deposit); it would cap it silently`);
      }
      const [pcp, hp, loan, cash] = c.options;
      return {
        financeAmount: c.financeAmount,
        balloon: c.balloon,
        pcpMonthly: pcp.monthly,
        hpMonthly: hp.monthly,
        loanMonthly: loan.monthly,
        pcpTotalPaid: pcp.totalPaid,
        hpTotalPaid: hp.totalPaid,
        loanTotalPaid: loan.totalPaid,
        cashTotalPaid: cash.totalPaid,
        pcpTotalInterest: pcp.totalInterest,
        hpTotalInterest: hp.totalInterest,
        loanTotalInterest: loan.totalInterest,
        pcpOpportunityCost: pcp.opportunityCost,
        hpOpportunityCost: hp.opportunityCost,
        loanOpportunityCost: loan.opportunityCost,
        cashOpportunityCost: cash.opportunityCost,
        pcpTrueCost: pcp.trueCost,
        hpTrueCost: hp.trueCost,
        loanTrueCost: loan.trueCost,
        cashTrueCost: cash.trueCost,
        cheapest: c.cheapest.type,
      };
    },
  },

  /* ── Emergency fund ── */
  {
    name: 'emergencyMonths',
    group: 'Saving and investing',
    summary:
      'Whole months until an emergency fund reaches its target (the emergency fund calculator: savings rate is an AER/APY, interest earned on the savings already held, deposits at the end of each month; 0 if already funded; Infinity only when nothing is saved and nothing earns interest). Fails when it takes more than 50 years.',
    params: [
      money('target', 'fund target (monthly essential expenses x months of cover)', { above: 0, min: undefined }),
      money('current', 'already saved'),
      money('monthly', 'saved each month'),
      ratePct('aer', 'savings rate as an AER/APY in %', { max: 50 }),
    ],
    returns: 'number (months)',
    example: 'emergencyMonths(21000, 2000, 500, 4) | int',
    run: (a) => {
      const r = monthsToTarget({
        target: a.num('target'),
        current: a.num('current'),
        monthly: a.num('monthly'),
        aer: a.num('aer') / 100,
      });
      if (r.status === 'funded') return 0;
      if (r.status === 'ok') return r.months;
      if (r.reason === 'no-saving') return Infinity;
      return fail(
        `the fund is not reached within ${MAX_FUND_MONTHS / 12} years (${MAX_FUND_MONTHS} months), the longest the emergency fund calculator searches, which is not "never"; write that in words`,
      );
    },
  },

  /* ── Solar payback ── */
  {
    name: 'solarDefault',
    group: 'Solar payback',
    summary:
      "A regional starting value of the solar payback calculator (what solarPayback uses when an option is not given), so prose can quote the default tariff. Tariffs are in pence (uk) or cents (us, eur) per kWh; costs in money; size in kWp, battery in kWh. Print tariffs with num(auto) or num(2).",
    params: [
      { name: 'region', type: 'string', doc: 'uk, us or eur', required: true, oneOf: ['uk', 'us', 'eur'] },
      { name: 'key', type: 'string', doc: `one of ${Object.keys(SOLAR_DEFAULT_KEYS).join(', ')}`, required: true, oneOf: Object.keys(SOLAR_DEFAULT_KEYS) },
    ],
    returns: 'number (unit by key)',
    example: "solarDefault('uk', 'tariff') | num(2)",
    run: (a) => SOLAR_REGIONAL_DEFAULTS[a.str('region') as SolarRegion][SOLAR_DEFAULT_KEYS[a.str('key')]],
  },
  {
    name: 'solarPayback',
    group: 'Solar payback',
    summary:
      "The solar panel payback calculator for a region (uk, us or eur), starting from the calculator's regional defaults and its own defaults (30% self-consumption, 3% energy inflation, 0.5% degradation, 25 years, no grant, no battery). Every option overrides one input. Fails when the system does not pay back within the period, or when a grant covers the whole cost (the calculator says \"Pays back immediately\").",
    params: [{ name: 'region', type: 'string', doc: 'uk, us or eur: picks the calculator\'s regional defaults', required: true, oneOf: ['uk', 'us', 'eur'] }],
    options: [
      { name: 'systemCost', type: 'number', doc: 'installed cost before incentives (default by region)', min: 0 },
      { name: 'systemSize', type: 'number', doc: 'system size in kWp (default by region)', above: 0 },
      { name: 'battery', type: 'boolean', doc: 'include the battery (adds its cost and models its capture year by year)', default: false },
      { name: 'batteryCost', type: 'number', doc: 'installed battery cost (default by region)', min: 0 },
      { name: 'batteryCapacity', type: 'number', doc: 'usable battery capacity in kWh (default by region)', min: 0 },
      { name: 'tariff', type: 'number', doc: 'import tariff in pence or cents per kWh (default by region)', min: 0 },
      { name: 'exportTariff', type: 'number', doc: 'export tariff in pence or cents per kWh (default by region)', min: 0 },
      { name: 'selfConsumption', type: 'number', doc: 'base self-consumption without a battery, %', default: 30, min: 0, max: 100 },
      { name: 'inflation', type: 'number', doc: 'energy price inflation, % a year', default: 3, min: 0, max: 30 },
      { name: 'degradation', type: 'number', doc: 'panel degradation, % a year', default: 0.5, min: 0, max: 10 },
      { name: 'maintenance', type: 'number', doc: 'maintenance a year (default by region)', min: 0 },
      { name: 'credit', type: 'number', doc: 'grant or tax credit that reduces the net cost', default: 0, min: 0 },
      { name: 'years', type: 'number', doc: "analysis period in years: the calculator's slider runs 10 to 40 in steps of 5", default: 25, integer: true, min: 10, max: 40, step: 5 },
      { name: 'kWhPerKwp', type: 'number', doc: 'annual kWh per kWp installed (default by region)', above: 0 },
    ],
    returns: 'object',
    fields: {
      netCost: 'cost after incentives (including the battery when included)',
      paybackYears: 'whole years of the payback time (the "19" in 19 years 8 months)',
      paybackMonths: 'months on top of paybackYears (0 to 11)',
      paybackTotalMonths: 'paybackYears x 12 + paybackMonths (for the months formatter)',
      year1Savings: 'savings in year 1, after maintenance',
      totalSavings: 'total savings over the analysis period',
      roi: 'return over the period, % ((total savings - net cost) / net cost)',
      generationYear1: 'kWh generated in year 1',
      generationFinal: 'kWh generated in the last year (after degradation)',
      savingsFinalYear: 'savings in the last year',
      selfConsumption: 'effective year-1 self-consumption, % (with the battery when included)',
    },
    fieldMeta: { paybackYears: { years: true } },
    example: "solarPayback('uk').paybackTotalMonths | months",
    run: (a) => {
      const input = solarInputs(a);
      const r = calculateSolarPayback(input);
      if (r.paysBackImmediately) {
        fail(
          `the grant or credit covers the whole cost (net cost ${r.netCost}), so the calculator says "Pays back immediately" and there is nothing to pay back; write it in words`,
        );
      }
      if (!r.reachesPayback) {
        fail(
          `the system does not pay for itself within ${input.analysisPeriod} years at these settings (the calculator says so); write it in words`,
        );
      }
      const capacity = input.batteryCapacityKwh ?? 0;
      return {
        netCost: r.netCost,
        paybackYears: r.paybackYears,
        paybackMonths: r.paybackMonths,
        paybackTotalMonths: r.paybackYears * 12 + r.paybackMonths,
        year1Savings: r.year1Savings,
        totalSavings: r.totalSavings,
        roi: r.roi as number, // not null here: the net cost is above 0 (immediate payback failed above)
        generationYear1: r.yearly[0].generation,
        generationFinal: r.yearly[r.yearly.length - 1].generation,
        savingsFinalYear: r.yearly[r.yearly.length - 1].annualSavings,
        selfConsumption: effectiveSelfConsumption(
          input.includeBattery,
          input.selfConsumptionPct,
          input.systemSize,
          input.kWhPerKwp,
          capacity,
        ),
      };
    },
  },

  /* ── ROI, required rate, CPI, loan crossover ── */
  {
    name: 'roi',
    group: 'Saving and investing',
    summary: "The ROI calculator: total gain, total return and annualized return for an investment held a number of years (income received counts towards the return).",
    params: [
      money('initial', 'amount invested', { above: 0, min: undefined }),
      money('final', 'value now (0 for a total loss)'),
      money('income', 'dividends or other income received'),
      { name: 'years', type: 'number', doc: 'years held', required: true, above: 0, max: 200 },
    ],
    returns: 'object',
    fields: {
      totalGain: 'final value + income - initial investment',
      totalReturn: 'total gain as % of the initial investment',
      annualized: 'compound annual return, % (a total loss is -100)',
    },
    example: 'roi(10000, 15000, 500, 3).annualized | pct1',
    run: (a) => {
      const r = calcRoi(a.num('initial'), a.num('final'), a.num('income'), a.num('years'));
      if (!r.valid || r.annualizedReturn === null) fail('the ROI calculator shows no annualized figure for these inputs');
      return { totalGain: r.totalGain, totalReturn: r.totalReturn * 100, annualized: r.annualizedReturn * 100 };
    },
  },
  {
    name: 'annualizedReturn',
    group: 'Saving and investing',
    summary: "A total return over some years as a compound annual return (the ROI calculator's annualize): (1 + total)^(1 / years) - 1, in %; a total loss (-100) stays -100.",
    params: [
      { name: 'totalReturn', type: 'number', doc: 'total return in % (80 means +80%)', required: true, min: -100, max: 1_000_000 },
      { name: 'years', type: 'number', doc: 'years held', required: true, above: 0, max: 200 },
    ],
    returns: 'number (%)',
    example: 'annualizedReturn(100, 10) | pct1',
    run: (a) => {
      const r = annualize(a.num('totalReturn') / 100, a.num('years'));
      if (r === null) fail('the annualized return is not defined for these inputs');
      return r * 100;
    },
  },
  {
    name: 'requiredRate',
    group: 'Saving and investing',
    summary:
      'The annual return needed for a starting sum plus monthly contributions to reach a target in a number of years (the investment return calculator, Return Rate tab), in %; negative when the money paid in already exceeds the target. Fails when even 100% a year is not enough, or when no return is needed at all (the calculator reports those states).',
    params: [
      money('start', 'starting amount'),
      money('monthly', 'monthly contribution'),
      money('target', 'target balance', { above: 0, min: undefined }),
      termYears,
    ],
    options: [COMPOUNDING, TIMING],
    returns: 'number (%)',
    example: 'requiredRate(10000, 200, 100000, 20) | pct(2)',
    run: (a) => {
      checkCompounding(a.num('compounding'));
      const s = solveRequiredRate(
        a.num('start'),
        a.num('monthly'),
        a.num('target'),
        termMonths(a.num('years')),
        a.num('compounding'),
        a.str('timing') as 'end' | 'beginning',
      );
      switch (s.status) {
        case 'ok':
          return s.rate * 100;
        case 'tooHigh':
          return fail('even a 100% annual return does not reach the target in this time (the calculator says so); write it in words');
        case 'metAtAnyRate':
          return fail('the target is met at any return (the money already paid in or the start covers it); there is no rate to solve for');
        case 'invalid':
          return fail('the required rate needs a starting amount or a monthly contribution above 0');
      }
    },
  },
  {
    name: 'cpiValue',
    group: 'Saving and investing',
    summary: `The US CPI-U index value (BLS, 1982-84 = 100) the inflation calculator uses for a year: the annual average, or for ${CPI_U_LATEST.year} the latest month (${CPI_U_LATEST.label}). Print it with the index formatter (321.943, 130.7).`,
    params: [{ name: 'year', type: 'number', doc: `year (${CPI_FIRST_YEAR}-${CPI_LAST_YEAR})`, required: true, integer: true, min: CPI_FIRST_YEAR, max: CPI_LAST_YEAR }],
    returns: 'number (index)',
    example: 'cpiValue(2025) | index',
    run: (a) => {
      const v = cpiFor(a.num('year'));
      if (v === null) fail(`no CPI data for ${a.num('year')}`);
      return v;
    },
  },
  {
    name: 'loanCrossoverMonth',
    group: 'Loans',
    summary: 'The first payment of the schedule in which more principal than interest is repaid (the mortgage and loan amortization schedule).',
    params: [money('principal', 'amount borrowed', { above: 0, min: undefined }), ratePct('rate', 'annual interest rate in %'), termYears],
    returns: 'number (month)',
    example: 'loanCrossoverMonth(280000, 7, 30) | int',
    run: (a) => {
      const rows = buildAmortization(a.num('principal'), a.num('rate'), termMonths(a.num('years'))).months;
      const hit = rows.find((m) => m.principal > m.interest);
      if (!hit) fail('principal never exceeds interest in this schedule');
      return hit.month;
    },
  },

  /* ── Labels, market rates, helpers ── */
  {
    name: 'taxYear',
    group: 'Labels',
    summary: "The tax year the engines currently use: '2026/27' (uk) or '2026' (us, the calculator's default year).",
    params: [{ name: 'country', type: 'string', doc: 'uk or us', required: true, oneOf: ['uk', 'us'], aliases: { UK: 'uk', US: 'us' } }],
    returns: 'string',
    example: "taxYear('uk')",
    run: (a) => (a.str('country') === 'uk' ? UK_TAX_YEAR : US_TAX_YEAR),
  },
  {
    name: 'rate',
    group: 'Labels',
    summary:
      "A dated market rate from market-rates.ts, in % (the calculators' default rates): us30 / us15 (Freddie Mac PMMS mortgage), boe (Bank Rate), uk2yr / uk5yr (2- and 5-year fixed, 75% LTV), ukRevert (revert-to rate), eur (euro-area house purchase). Pair it with rateSource.",
    params: [{ name: 'key', type: 'string', doc: 'us30, us15, boe, uk2yr, uk5yr, ukRevert or eur', required: true, oneOf: Object.keys(MARKET_RATE_KEYS) }],
    returns: 'number (%)',
    example: "rate('us30') | pct(2)",
    run: (a) => MARKET_RATE_KEYS[a.str('key')].value,
  },
  {
    name: 'rateSource',
    group: 'Labels',
    summary: 'Who published a market rate and the date it describes, e.g. "Freddie Mac, 12 Nov 2026" (use next to rate() so the page shows the source and date).',
    params: [{ name: 'key', type: 'string', doc: 'us30, us15, boe, uk2yr, uk5yr, ukRevert or eur', required: true, oneOf: Object.keys(MARKET_RATE_KEYS) }],
    returns: 'string',
    example: "rateSource('us30')",
    run: (a) => rateAttribution(MARKET_RATE_KEYS[a.str('key')]),
  },
  {
    name: 'claim',
    group: 'Helpers',
    summary:
      'Guards a derived statement in the prose (a verdict, a ranking, "X is cheaper than Y"): prints NOTHING when the condition is true and FAILS THE BUILD with your message when it is false, so a sentence can never outlive the numbers it rests on. Put it at the end of the sentence it guards.',
    params: [
      { name: 'condition', type: 'boolean', doc: 'a comparison of figures, e.g. a > b, joined with && || !', required: true },
      { name: 'message', type: 'string', doc: 'what the sentence claims, shown in the build error when it stops being true', required: true },
    ],
    returns: 'nothing (empty text)',
    example: "claim(ukTakeHome(50000) > ukTakeHome(45000), 'a higher salary leaves more take-home pay')",
    run: (a) => {
      const message = a.str('message').trim();
      if (message === '') fail('claim needs a message saying what the text claims');
      if (!a.bool('condition')) {
        fail(`a claim in the text no longer holds: ${message}. Rewrite the sentence that depends on it, then update or remove the claim`);
      }
      return '';
    },
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
    name: 'index',
    summary: 'An index value with up to 3 decimals and no trailing zeros (CPI-U 130.7, 321.943).',
    usage: 'index',
    example: '130.7 | index',
    run: (value, args) => {
      if (args.length) fail('index takes no arguments');
      const n = needNumber(value, 'index');
      return (n < 0 ? '-' : '') + groupDigits(Math.abs(n), 0, 3);
    },
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
    if (spec.step !== undefined) {
      const steps = (v - (spec.min ?? 0)) / spec.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-9) {
        fail(`${label} must be ${spec.min ?? 0} plus a multiple of ${spec.step}, like the calculator's slider (got ${v})`);
      }
    }
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
  if (typeof result === 'object' && fn.fieldMeta) RESULT_META.set(result, fn.fieldMeta);
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
      const out = target[node.field];
      const meta = RESULT_META.get(target)?.[node.field];
      if (typeof out === 'number' && !Number.isFinite(out) && meta?.ifInfinite) fail(meta.ifInfinite);
      return out;
    }
    case 'neg': {
      const v = evalExpr(node.operand);
      if (typeof v !== 'number') fail(`cannot negate ${describeValue(v)}`);
      return -v;
    }
    case 'not': {
      const v = evalExpr(node.operand);
      if (typeof v !== 'boolean') fail(`"!" needs a true/false condition such as a comparison, got ${describeValue(v)}`);
      return !v;
    }
    case 'bin': {
      const l = evalExpr(node.left);
      const r = evalExpr(node.right);
      // Both sides are always evaluated (no short-circuit): a broken expression fails the build even when the
      // other side would have decided the answer.
      if (node.op === '&&' || node.op === '||') {
        if (typeof l !== 'boolean' || typeof r !== 'boolean') {
          fail(`"${node.op}" joins true/false conditions such as comparisons, got ${describeValue(typeof l !== 'boolean' ? l : r)}`);
        }
        return node.op === '&&' ? l && r : l || r;
      }
      if (node.op === '==' || node.op === '!=') {
        if (typeof l === 'object' || typeof r === 'object' || typeof l !== typeof r) {
          fail(`"${node.op}" compares two values of the same kind (numbers, text or true/false), got ${describeValue(l)} and ${describeValue(r)}`);
        }
        return node.op === '==' ? l === r : l !== r;
      }
      if (node.op === '<' || node.op === '>' || node.op === '<=' || node.op === '>=') {
        if (typeof l !== 'number' || typeof r !== 'number') {
          fail(`"${node.op}" compares numbers, got ${describeValue(typeof l !== 'number' ? l : r)}`);
        }
        return node.op === '<' ? l < r : node.op === '>' ? l > r : node.op === '<=' ? l <= r : l >= r;
      }
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

/** Names the year-valued thing an expression directly is (a year function or year field), else null. */
function yearValued(expr: ExprNode): string | null {
  if (expr.kind === 'call') return FIGURE_FUNCTIONS.get(expr.name)?.returnsYears ? `${expr.name}(...)` : null;
  if (expr.kind === 'field') {
    const target = evalExpr(expr.target);
    if (typeof target === 'object' && RESULT_META.get(target)?.[expr.field]?.years) return `.${expr.field}`;
  }
  return null;
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
  if (p.filters.some((x) => x.name === 'months')) {
    const what = yearValued(p.expr);
    if (what) fail(`${what} is a number of years, not months, so the months formatter would print it wrongly; use | int or | num(1) (or multiply by 12 first)`);
  }
  for (const f of p.filters) {
    const fmt = FIGURE_FORMATTERS.get(f.name);
    if (!fmt) fail(`unknown formatter "${f.name}"${suggest(f.name, FIGURE_FORMATTERS.keys())}; see docs/figures.md`);
    value = fmt.run(value, f.args);
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    fail(`the result is a number (${value}); add a formatter such as | gbp, | usd, | pct or | months`);
  }
  if (typeof value === 'boolean') {
    fail('the result is a boolean (true/false), which cannot be printed; to assert it at build time wrap it: claim(condition, \'what the text claims\')');
  }
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

/**
 * Evaluate only the expression part of a token (no formatters) and return the
 * raw, unrounded value: a number, text, boolean or object of fields. For tests
 * and tooling that compare figures with the engines exactly; content tokens
 * must still go through a formatter. Throws FigureError; not memoised.
 */
export function evaluateFigureValue(source: string): FigureValue {
  const key = source.trim();
  try {
    const pipeline = parsePipeline(key);
    if (pipeline.filters.length) fail('evaluateFigureValue takes an expression without formatters');
    return evalExpr(pipeline.expr);
  } catch (e) {
    let detail: string;
    if (e instanceof Fail) detail = e.message;
    else if (e instanceof FigureSyntaxError) detail = `syntax error at character ${e.at + 1}: ${e.message}`;
    else detail = `internal error in the figure engine: ${e instanceof Error ? e.message : String(e)}`;
    throw new FigureError(key, detail);
  }
}

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

/**
 * Investment growth engine and "solve for X" solvers.
 *
 * Used by the Compound Interest, Investment Return and Investment Fee
 * calculators, and (through the legacy wrappers in calculator-utils.ts) by
 * every other caller of compoundInterest().
 *
 * Model (documented for the methodology pages):
 * - Deposits are made MONTHLY, whatever the compounding frequency. The
 *   compounding frequency only sets the growth rate: a nominal annual rate r
 *   compounded n times a year is applied as the equivalent monthly rate
 *       i = (1 + r/n)^(n/12) - 1
 *   so money held for a whole year grows by exactly (1 + r/n)^n. With n = 12
 *   this is the familiar i = r/12.
 * - Future value after k months (k may be fractional for the legacy
 *   solve-for-time search):
 *       FV(k) = P(1+i)^k + D * ((1+i)^k - 1) / i            (end of month)
 *       FV(k) = P(1+i)^k + D * ((1+i)^k - 1) / i * (1+i)    (start of month)
 *   and FV(k) = P + D*k when i = 0. Negative rates (e.g. a fund fee larger
 *   than its gross return) shrink both the starting balance and every
 *   deposit; the rate must stay above -n (otherwise 1 + r/n <= 0).
 * - (1+i)^k - 1 is evaluated as expm1(k * log1p(...)) so tiny rates do not
 *   lose precision to cancellation.
 *
 * Previously (until Nov 2026) deposits were made once per compounding period
 * (PMT * 12 / n), which mis-stated annual-compounding results by about 2%
 * (review finding MATH-US-09). Monthly compounding results are unchanged.
 *
 * Every solver terminates on every input: closed forms, a fixed-iteration
 * bisection, or a bounded month-by-month scan.
 */

export type ContributionTiming = 'end' | 'beginning';

export interface GrowthInputs {
  /** Starting balance (P). */
  principal: number;
  /** Deposit made every month (D). */
  monthlyContribution: number;
  /** Nominal annual rate as a decimal (0.07 = 7%). May be negative, must be > -compoundingPerYear. */
  annualRate: number;
  /** Times interest compounds per year (n). Default 12. */
  compoundingPerYear?: number;
  /** When each monthly deposit is made. Default 'end'. */
  timing?: ContributionTiming;
}

/** The longest horizon any solver searches: 100 years. */
export const MAX_SOLVE_MONTHS = 1200;

/** Rate search bounds for solveRequiredRate (decimal, per year). */
export const MIN_SOLVE_RATE = -0.99;
export const MAX_SOLVE_RATE = 1.0;

/** ln of one month's growth factor: (n/12) * ln(1 + r/n). */
function monthlyLogGrowth(annualRate: number, compoundingPerYear: number): number {
  const n = compoundingPerYear > 0 ? compoundingPerYear : 12;
  return (n / 12) * Math.log1p(annualRate / n);
}

/** Equivalent monthly rate i for a nominal annual rate compounded n times a year. */
export function monthlyRateFor(annualRate: number, compoundingPerYear: number = 12): number {
  return Math.expm1(monthlyLogGrowth(annualRate, compoundingPerYear));
}

/** Annuity factor ((1+i)^k - 1) / i, equal to k when i = 0. */
function annuityFactor(logGrowth: number, months: number): number {
  if (logGrowth === 0) return months;
  return Math.expm1(months * logGrowth) / Math.expm1(logGrowth);
}

/** Balance after `months` months. */
export function futureValue(inputs: GrowthInputs, months: number): number {
  const { principal, monthlyContribution, annualRate } = inputs;
  const n = inputs.compoundingPerYear ?? 12;
  const L = monthlyLogGrowth(annualRate, n);
  const growth = Math.exp(months * L);
  let deposits = monthlyContribution * annuityFactor(L, months);
  if (inputs.timing === 'beginning') deposits *= Math.exp(L); // one extra month of growth
  return principal * growth + deposits;
}

/** Money paid in after `months` months (starting balance + deposits). */
export function contributionsAfter(inputs: GrowthInputs, months: number): number {
  return inputs.principal + inputs.monthlyContribution * months;
}

export interface GrowthRow {
  year: number;
  balance: number;
  totalContributions: number;
  totalInterest: number;
}

/**
 * Year-by-year schedule, rows for years 0..years (values rounded to cents).
 * If `finalMonths` is given and is not a whole number of years, a last row is
 * added at that exact point (year = months / 12, rounded to 2 decimals).
 */
export function growthSchedule(inputs: GrowthInputs, years: number, finalMonths?: number): GrowthRow[] {
  const rows: GrowthRow[] = [];
  const wholeYears = Math.max(0, Math.floor(years));
  const pushRow = (year: number, months: number) => {
    const balance = futureValue(inputs, months);
    const totalContributions = contributionsAfter(inputs, months);
    rows.push({
      year,
      balance: Math.round(balance * 100) / 100,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalInterest: Math.round((balance - totalContributions) * 100) / 100,
    });
  };
  for (let y = 0; y <= wholeYears; y++) pushRow(y, y * 12);
  if (finalMonths !== undefined && finalMonths > wholeYears * 12) {
    pushRow(Math.round((finalMonths / 12) * 100) / 100, finalMonths);
  }
  return rows;
}

/* -- Solvers ----------------------------------------------- */

/** Growth factor and (timing-adjusted) annuity factor for a horizon. */
function factors(annualRate: number, compoundingPerYear: number, timing: ContributionTiming, months: number) {
  const L = monthlyLogGrowth(annualRate, compoundingPerYear);
  const growth = Math.exp(months * L);
  let annuity = annuityFactor(L, months);
  if (timing === 'beginning') annuity *= Math.exp(L);
  return { growth, annuity };
}

/**
 * Raw closed form for the monthly deposit that reaches `target` in `months`
 * months. Negative when the starting balance alone overshoots. Infinity/NaN
 * when months = 0 (no deposits can be made).
 */
export function requiredContributionRaw(
  principal: number,
  target: number,
  annualRate: number,
  months: number,
  compoundingPerYear: number = 12,
  timing: ContributionTiming = 'end',
): number {
  const { growth, annuity } = factors(annualRate, compoundingPerYear, timing, months);
  return (target - principal * growth) / annuity;
}

/** Raw closed form for the starting balance that reaches `target`. Negative when deposits alone overshoot. */
export function requiredPrincipalRaw(
  monthlyContribution: number,
  target: number,
  annualRate: number,
  months: number,
  compoundingPerYear: number = 12,
  timing: ContributionTiming = 'end',
): number {
  const { growth, annuity } = factors(annualRate, compoundingPerYear, timing, months);
  return (target - monthlyContribution * annuity) / growth;
}

export type ContributionSolution =
  | { status: 'needed'; monthly: number }
  /** The starting balance alone reaches the target; no deposits needed. */
  | { status: 'alreadyMet'; monthly: 0; balanceWithoutDeposits: number }
  /** Horizon of zero months: deposits cannot help. */
  | { status: 'invalid' };

export function solveRequiredContribution(
  principal: number,
  target: number,
  annualRate: number,
  months: number,
  compoundingPerYear: number = 12,
  timing: ContributionTiming = 'end',
): ContributionSolution {
  if (!(months > 0) || !Number.isFinite(target)) return { status: 'invalid' };
  const balanceWithoutDeposits = futureValue(
    { principal, monthlyContribution: 0, annualRate, compoundingPerYear, timing },
    months,
  );
  if (balanceWithoutDeposits >= target) return { status: 'alreadyMet', monthly: 0, balanceWithoutDeposits };
  const monthly = requiredContributionRaw(principal, target, annualRate, months, compoundingPerYear, timing);
  if (!Number.isFinite(monthly)) return { status: 'invalid' };
  return { status: 'needed', monthly };
}

export type PrincipalSolution =
  | { status: 'needed'; principal: number }
  /** Monthly deposits alone reach the target; no starting balance needed. */
  | { status: 'alreadyMet'; principal: 0; balanceWithoutPrincipal: number }
  | { status: 'invalid' };

export function solveRequiredPrincipal(
  monthlyContribution: number,
  target: number,
  annualRate: number,
  months: number,
  compoundingPerYear: number = 12,
  timing: ContributionTiming = 'end',
): PrincipalSolution {
  if (!(months >= 0) || !Number.isFinite(target)) return { status: 'invalid' };
  const balanceWithoutPrincipal = futureValue(
    { principal: 0, monthlyContribution, annualRate, compoundingPerYear, timing },
    months,
  );
  if (balanceWithoutPrincipal >= target) return { status: 'alreadyMet', principal: 0, balanceWithoutPrincipal };
  const principal = requiredPrincipalRaw(monthlyContribution, target, annualRate, months, compoundingPerYear, timing);
  if (!Number.isFinite(principal)) return { status: 'invalid' };
  return { status: 'needed', principal };
}

export type RateSolution =
  /** `rate` reaches the target exactly (to well under a cent). May be negative. */
  | { status: 'ok'; rate: number }
  /** Even MAX_SOLVE_RATE (100% a year) falls short. */
  | { status: 'tooHigh'; balanceAtMaxRate: number }
  /** Even MIN_SOLVE_RATE (losing 99% a year) still ends at or above the target: no rate needs solving. */
  | { status: 'metAtAnyRate'; balanceAtMinRate: number }
  /** Nothing is invested, or the horizon is zero. */
  | { status: 'invalid' };

/**
 * Annual rate that grows `principal` + `monthlyContribution` to `target` in
 * `months` months. FV is strictly increasing in the rate for non-negative
 * money and months > 0, so a fixed 200-step bisection over
 * [MIN_SOLVE_RATE, MAX_SOLVE_RATE] always terminates and is exact to far
 * below a cent. A target below the money paid in needs a negative rate,
 * which is reported as such (never clamped to 0%).
 */
export function solveRequiredRate(
  principal: number,
  monthlyContribution: number,
  target: number,
  months: number,
  compoundingPerYear: number = 12,
  timing: ContributionTiming = 'end',
): RateSolution {
  if (!(months > 0) || principal < 0 || monthlyContribution < 0 || principal + monthlyContribution <= 0) {
    return { status: 'invalid' };
  }
  if (!Number.isFinite(target)) return { status: 'invalid' };
  const fv = (rate: number) =>
    futureValue({ principal, monthlyContribution, annualRate: rate, compoundingPerYear, timing }, months);
  const atMax = fv(MAX_SOLVE_RATE);
  if (atMax < target) return { status: 'tooHigh', balanceAtMaxRate: atMax };
  let lo = MIN_SOLVE_RATE;
  let hi = MAX_SOLVE_RATE;
  const atMin = fv(lo);
  if (atMin >= target) return { status: 'metAtAnyRate', balanceAtMinRate: atMin };
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break; // interval exhausted at double precision
    if (fv(mid) < target) lo = mid;
    else hi = mid;
  }
  return { status: 'ok', rate: hi };
}

export type TimeSolution =
  /** First month-end at which the balance reaches the target. */
  | { status: 'reached'; months: number }
  /** The starting balance already meets the target. */
  | { status: 'alreadyMet'; months: 0 }
  /** Not reached within `maxMonths` (100 years by default). */
  | { status: 'notWithin'; maxMonths: number; balanceAtLimit: number };

/**
 * Whole months until the balance first reaches `target`, scanning month by
 * month up to `maxMonths`. Bounded by construction, so it can never hang
 * (review finding CALC-UX-B-02: the old solver's Infinity fed a schedule loop
 * that froze the tab). Works for negative rates too.
 */
export function solveMonthsToTarget(
  inputs: GrowthInputs,
  target: number,
  maxMonths: number = MAX_SOLVE_MONTHS,
): TimeSolution {
  const limit = Math.max(0, Math.floor(maxMonths));
  if (inputs.principal >= target) return { status: 'alreadyMet', months: 0 };
  // Tolerance: treat a balance within a millionth of a cent of the target as reached.
  const goal = target - 1e-8;
  for (let k = 1; k <= limit; k++) {
    if (futureValue(inputs, k) >= goal) return { status: 'reached', months: k };
  }
  return { status: 'notWithin', maxMonths: limit, balanceAtLimit: futureValue(inputs, limit) };
}

/** Split whole months into years and remaining months (0-11). */
export function splitMonths(months: number): { years: number; months: number } {
  const whole = Math.max(0, Math.round(months));
  return { years: Math.floor(whole / 12), months: whole % 12 };
}

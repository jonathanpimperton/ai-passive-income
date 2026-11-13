/**
 * Savings goal engine: the monthly saving needed to reach a goal by a date,
 * and the time needed at a given monthly saving.
 *
 * Model: interest compounds monthly at annualRate / 12; deposits are made at
 * the end of each month. Balance after n months:
 *   B(n) = PV(1 + i)^n + PMT * ((1 + i)^n - 1) / i,   i = annualRate / 12
 * so the payment that reaches FV is
 *   PMT = (FV - PV(1 + i)^n) * i / ((1 + i)^n - 1)
 * Worked example (standard sinking-fund result): $10,000 in 36 months at 6%
 * needs $254.22 a month (10,000 * 0.005 / (1.005^36 - 1)).
 *
 * Every function returns an explicit status, so "already there" and "never
 * gets there" are reported as such and never as $0 or a capped number.
 */

const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
const nonNeg = (v: number) => Math.max(0, finiteOr(v, 0));

/** Longest horizon the time-to-goal search covers (100 years). */
export const MAX_GOAL_MONTHS = 1200;

export function savingsBalance(current: number, monthly: number, annualRate: number, months: number): number {
  const p = nonNeg(current);
  const c = nonNeg(monthly);
  const n = nonNeg(months);
  const i = finiteOr(annualRate, 0) / 12;
  if (i === 0) return p + c * n;
  const g = Math.pow(1 + i, n);
  return p * g + (c * (g - 1)) / i;
}

export type MonthlyForGoalResult =
  | {
      /** Current savings already meet the goal. */
      status: 'reached';
      monthly: 0;
    }
  | {
      /** Interest on current savings alone reaches the goal in time. */
      status: 'on-track';
      monthly: 0;
      /** Balance at the deadline with no further deposits. */
      projected: number;
    }
  | {
      status: 'ok';
      monthly: number;
      /** Current savings plus every deposit. */
      totalContributions: number;
      /** goal - totalContributions. */
      interestEarned: number;
    };

export function monthlyForGoal(opts: {
  goal: number;
  current: number;
  annualRate: number;
  months: number;
}): MonthlyForGoalResult {
  const goal = nonNeg(opts.goal);
  const pv = nonNeg(opts.current);
  const n = Math.max(1, Math.round(nonNeg(opts.months)));
  const i = finiteOr(opts.annualRate, 0) / 12;
  if (pv >= goal) return { status: 'reached', monthly: 0 };
  const g = i === 0 ? 1 : Math.pow(1 + i, n);
  const fromSavings = pv * g;
  if (fromSavings >= goal) return { status: 'on-track', monthly: 0, projected: fromSavings };
  const annuity = i === 0 ? n : (g - 1) / i;
  const monthly = (goal - fromSavings) / annuity;
  const totalContributions = pv + monthly * n;
  return { status: 'ok', monthly, totalContributions, interestEarned: goal - totalContributions };
}

export type TimeToGoalResult =
  | { status: 'reached'; months: 0 }
  | {
      status: 'ok';
      /** Whole months until the balance first meets the goal. */
      months: number;
      /** Balance in that month (>= goal). */
      balance: number;
      totalContributions: number;
      /** balance - totalContributions. */
      interestEarned: number;
    }
  | {
      /** Not reached within MAX_GOAL_MONTHS (or nothing is being added and nothing earns interest). */
      status: 'unreachable';
      maxMonths: number;
      balanceAtMax: number;
    };

export function timeToGoal(opts: {
  goal: number;
  current: number;
  monthly: number;
  annualRate: number;
  maxMonths?: number;
}): TimeToGoalResult {
  const goal = nonNeg(opts.goal);
  const pv = nonNeg(opts.current);
  const c = nonNeg(opts.monthly);
  const i = finiteOr(opts.annualRate, 0) / 12;
  const maxMonths = Math.max(1, Math.round(opts.maxMonths ?? MAX_GOAL_MONTHS));
  if (pv >= goal) return { status: 'reached', months: 0 };
  let balance = pv;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + i) + c;
    if (balance >= goal) {
      const totalContributions = pv + c * m;
      return { status: 'ok', months: m, balance, totalContributions, interestEarned: balance - totalContributions };
    }
  }
  return { status: 'unreachable', maxMonths, balanceAtMax: balance };
}

export interface SavingsPathRow {
  month: number;
  balance: number;
  contributions: number;
}

/**
 * Balance rows for a chart: monthly rows for horizons up to 3 years,
 * otherwise one row per year plus the final month.
 */
export function savingsPath(current: number, monthly: number, annualRate: number, months: number): SavingsPathRow[] {
  const n = Math.max(0, Math.round(nonNeg(months)));
  const step = n <= 36 ? 1 : 12;
  const points: number[] = [];
  for (let m = 0; m <= n; m += step) points.push(m);
  if (points[points.length - 1] !== n) points.push(n);
  return points.map((m) => ({
    month: m,
    balance: savingsBalance(current, monthly, annualRate, m),
    contributions: nonNeg(current) + nonNeg(monthly) * m,
  }));
}

/** "6 yrs 2 mo" style label. */
export function formatMonthsShort(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths));
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y === 0) return `${r} month${r === 1 ? '' : 's'}`;
  if (r === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y} yr${y === 1 ? '' : 's'} ${r} mo`;
}

/**
 * Emergency fund engine: 3/6/12-month targets and the time to reach each one.
 *
 * Model (MTH-22 fix): the savings rate is an AER/APY -- the annual rate a
 * bank quotes with monthly compounding already included -- so the monthly
 * rate is (1 + AER)^(1/12) - 1. Interest is earned on the CURRENT savings as
 * well as on each new deposit (deposits at the end of the month):
 *   B(n) = PV(1 + i)^n + PMT * ((1 + i)^n - 1) / i
 * and the time to a target is the first whole month with B(n) >= target.
 * (The previous closed form grew only the deposits and earned nothing on the
 * savings already held.)
 *
 * Worked example: 4.00% AER is 0.32737% a month ((1.04)^(1/12) - 1), and
 * $1,000 left for 12 months grows to exactly $1,040.
 */

const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
const nonNeg = (v: number) => Math.max(0, finiteOr(v, 0));

/** Longest horizon searched: 50 years. */
export const MAX_FUND_MONTHS = 600;

export const EMERGENCY_TARGET_MONTHS = [3, 6, 12] as const;

/** Monthly rate equivalent to an annual equivalent rate (AER/APY), both as decimals. */
export function monthlyRateFromAer(aer: number): number {
  const a = finiteOr(aer, 0);
  if (a <= -1) return -1;
  return Math.pow(1 + a, 1 / 12) - 1;
}

export function fundBalance(current: number, monthly: number, aer: number, months: number): number {
  const p = nonNeg(current);
  const c = nonNeg(monthly);
  const n = nonNeg(months);
  const i = monthlyRateFromAer(aer);
  if (i === 0) return p + c * n;
  const g = Math.pow(1 + i, n);
  return p * g + (c * (g - 1)) / i;
}

export type TimeToTargetResult =
  | { status: 'funded'; months: 0 }
  | {
      status: 'ok';
      months: number;
      /** True when no deposits are made and interest alone gets there. */
      interestOnly: boolean;
    }
  | {
      /** Nothing is being added and nothing earns interest, or it takes longer than MAX_FUND_MONTHS. */
      status: 'never';
      /** 'no-saving': nothing grows the balance; 'too-long': beyond the search horizon. */
      reason: 'no-saving' | 'too-long';
    };

export function monthsToTarget(opts: {
  target: number;
  current: number;
  monthly: number;
  aer: number;
  maxMonths?: number;
}): TimeToTargetResult {
  const target = nonNeg(opts.target);
  const p = nonNeg(opts.current);
  const c = nonNeg(opts.monthly);
  const i = monthlyRateFromAer(opts.aer);
  const maxMonths = Math.max(1, Math.round(opts.maxMonths ?? MAX_FUND_MONTHS));
  if (p >= target) return { status: 'funded', months: 0 };
  if (c <= 0 && (i <= 0 || p <= 0)) return { status: 'never', reason: 'no-saving' };
  let balance = p;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + i) + c;
    if (balance >= target) return { status: 'ok', months: m, interestOnly: c <= 0 };
  }
  return { status: 'never', reason: 'too-long' };
}

export interface EmergencyTarget {
  /** Months of expenses this target covers. */
  coverMonths: number;
  target: number;
  remaining: number;
  /** Share of the target already saved, 0-1. */
  funded: number;
  time: TimeToTargetResult;
}

export function emergencyTargets(opts: {
  monthlyExpenses: number;
  current: number;
  monthly: number;
  aer: number;
}): EmergencyTarget[] {
  const expenses = nonNeg(opts.monthlyExpenses);
  const current = nonNeg(opts.current);
  return EMERGENCY_TARGET_MONTHS.map((coverMonths) => {
    const target = expenses * coverMonths;
    return {
      coverMonths,
      target,
      remaining: Math.max(0, target - current),
      funded: target > 0 ? Math.min(1, current / target) : 1,
      time: monthsToTarget({ target, current, monthly: opts.monthly, aer: opts.aer }),
    };
  });
}

/** Monthly balances 0..months for the timeline chart. */
export function fundPath(current: number, monthly: number, aer: number, months: number): Array<{ month: number; balance: number }> {
  const n = Math.max(0, Math.round(nonNeg(months)));
  const rows: Array<{ month: number; balance: number }> = [];
  for (let m = 0; m <= n; m++) rows.push({ month: m, balance: fundBalance(current, monthly, aer, m) });
  return rows;
}

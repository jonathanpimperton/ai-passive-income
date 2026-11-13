/**
 * Fund fee drag (Investment Fee Calculator).
 *
 * Documented formula (review MTH-08: the methodology page described annual
 * compounding and an annual-deposit formula while the code compounded
 * monthly; this is what the code does and what the page should say):
 *
 *   net annual return  r = gross return - annual fee           (e.g. 7% - 0.5% = 6.5%)
 *   monthly rate       i = r / 12                               (monthly compounding)
 *   balance after t years, deposits C at the end of each month:
 *       FV = P(1+i)^(12t) + C * ((1+i)^(12t) - 1) / i          (FV = P + 12tC when r = 0)
 *
 * The fee is modelled as a reduction in the annual return, which is how an
 * expense ratio / OCF works in practice (it is taken from the fund's assets
 * continuously, so the investor sees the gross return minus the fee). A fee
 * larger than the gross return gives a negative net return: the starting
 * balance AND every deposit then lose value (review MATH-US-17; the old code
 * let deposits keep their full value in that case).
 *
 *   cost of the fee gap      = |balance at fee A - balance at fee B|
 *   growth lost to a fee     = balance at 0% fee - balance at that fee
 *   share of returns lost    = cost of the gap / earnings at the lower fee,
 *                              capped at 100% (not defined when those
 *                              earnings are <= 0). Above 100% the higher-fee
 *                              fund ends below what was paid in; that part is
 *                              reported separately as contributions lost.
 */
import { futureValue, growthSchedule, type GrowthInputs } from './investment-solvers';

export interface FeeComparisonInputs {
  principal: number;
  monthlyContribution: number;
  /** Gross annual return in percent (7 = 7%). */
  grossReturnPercent: number;
  years: number;
  yourFeePercent: number;
  comparisonFeePercent: number;
}

export interface FeeComparison {
  yourNetReturnPercent: number;
  compNetReturnPercent: number;
  yourBalance: number;
  compBalance: number;
  zeroFeeBalance: number;
  totalContributions: number;
  yourEarnings: number;
  compEarnings: number;
  /** Growth lost to your fee versus a 0% fee. */
  yourFeesPaid: number;
  compFeesPaid: number;
  /** Absolute difference between the two final balances. */
  feeCost: number;
  /**
   * Fraction of the lower-fee fund's earnings lost to the gap, capped at 1
   * (all of them), or null when those earnings are <= 0.
   */
  shareOfReturnsLost: number | null;
  /**
   * When the higher-fee fund ends below the money paid in, the gap takes all
   * of the returns AND this much of the contributions; otherwise 0.
   */
  contributionsLost: number;
}

function inputsAt(feePercent: number, i: FeeComparisonInputs): GrowthInputs {
  return {
    principal: i.principal,
    monthlyContribution: i.monthlyContribution,
    annualRate: (i.grossReturnPercent - feePercent) / 100,
    compoundingPerYear: 12,
    timing: 'end',
  };
}

export function compareFees(i: FeeComparisonInputs): FeeComparison {
  const months = Math.max(0, i.years) * 12;
  const yourBalance = futureValue(inputsAt(i.yourFeePercent, i), months);
  const compBalance = futureValue(inputsAt(i.comparisonFeePercent, i), months);
  const zeroFeeBalance = futureValue(inputsAt(0, i), months);
  const totalContributions = i.principal + i.monthlyContribution * months;
  const lowerFeeBalance = i.yourFeePercent <= i.comparisonFeePercent ? yourBalance : compBalance;
  const lowerFeeEarnings = lowerFeeBalance - totalContributions;
  const higherFeeBalance = i.yourFeePercent <= i.comparisonFeePercent ? compBalance : yourBalance;
  const feeCost = Math.abs(yourBalance - compBalance);
  return {
    yourNetReturnPercent: i.grossReturnPercent - i.yourFeePercent,
    compNetReturnPercent: i.grossReturnPercent - i.comparisonFeePercent,
    yourBalance,
    compBalance,
    zeroFeeBalance,
    totalContributions,
    yourEarnings: yourBalance - totalContributions,
    compEarnings: compBalance - totalContributions,
    yourFeesPaid: zeroFeeBalance - yourBalance,
    compFeesPaid: zeroFeeBalance - compBalance,
    feeCost,
    shareOfReturnsLost: lowerFeeEarnings > 0 ? Math.min(1, feeCost / lowerFeeEarnings) : null,
    contributionsLost: lowerFeeEarnings > 0 ? Math.max(0, totalContributions - higherFeeBalance) : 0,
  };
}

/** Year-by-year balances for both funds (years 0..years). */
export function feeSchedule(i: FeeComparisonInputs): Array<{ year: number; yourBalance: number; compBalance: number }> {
  const years = Math.max(0, Math.floor(i.years));
  const yours = growthSchedule(inputsAt(i.yourFeePercent, i), years);
  const comp = growthSchedule(inputsAt(i.comparisonFeePercent, i), years);
  return yours.map((row, idx) => ({ year: row.year, yourBalance: row.balance, compBalance: comp[idx]?.balance ?? 0 }));
}

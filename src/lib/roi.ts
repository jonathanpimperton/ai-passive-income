/**
 * Return on investment (ROI Calculator).
 *
 *   total gain        = final value + income received - initial investment
 *   total return      = total gain / initial investment
 *   annualized return = (1 + total return)^(1 / years) - 1
 *
 * A total loss (final value + income = 0, total return = -100%) annualizes to
 * -100%, not 0% (review MATH-US-16). The annualized figure is not defined for
 * a holding period of zero, or without a positive initial investment.
 */

export interface RoiResult {
  /** False when the initial investment is not positive: nothing can be computed. */
  valid: boolean;
  totalGain: number;
  /** Fraction: 0.55 = 55%. */
  totalReturn: number;
  /** Fraction per year, or null when it is not defined (years <= 0 or invalid input). */
  annualizedReturn: number | null;
}

export function calcRoi(initial: number, finalValue: number, income: number, years: number): RoiResult {
  if (!(initial > 0) || !Number.isFinite(initial)) {
    return { valid: false, totalGain: 0, totalReturn: 0, annualizedReturn: null };
  }
  const fin = Number.isFinite(finalValue) ? Math.max(0, finalValue) : 0;
  const inc = Number.isFinite(income) ? Math.max(0, income) : 0;
  const totalGain = fin + inc - initial;
  const totalReturn = totalGain / initial;
  return { valid: true, totalGain, totalReturn, annualizedReturn: annualize(totalReturn, years) };
}

/** Compound annual rate for a total return over `years`. Total loss gives -1 (-100%). */
export function annualize(totalReturn: number, years: number): number | null {
  if (!(years > 0) || !Number.isFinite(years) || !Number.isFinite(totalReturn)) return null;
  if (totalReturn <= -1) return -1;
  return Math.expm1(Math.log1p(totalReturn) / years);
}

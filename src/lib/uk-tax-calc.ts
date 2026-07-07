/**
 * Shared UK tax calculation functions.
 * Used by both the full SalaryUkCalc component and the homepage DecisionEngine.
 *
 * The full calculator adds Scottish rates, tax codes, student loans on top.
 * These functions handle the standard (non-Scottish, default tax code) case.
 */

import {
  UK_INCOME_TAX,
  UK_NI,
  UK_STUDENT_LOANS,
} from './uk-rates';

const PERSONAL_ALLOWANCE = UK_INCOME_TAX.personalAllowance;
const PA_TAPER_THRESHOLD = UK_INCOME_TAX.paTaperThreshold;
const PA_TAPER_LIMIT = UK_INCOME_TAX.paTaperLimit;
const UK_BANDS: [number, number][] = UK_INCOME_TAX.bands.map(b => [b.from, b.rate]);

const NI_PRIMARY_THRESHOLD = UK_NI.primaryThreshold;
const NI_UPPER_EARNINGS_LIMIT = UK_NI.upperEarningsLimit;
const NI_MAIN_RATE = UK_NI.mainRate;
const NI_UPPER_RATE = UK_NI.upperRate;

/**
 * Calculate Personal Allowance with taper for high earners.
 * Between £100K-£125,140 the PA reduces by £1 for every £2 over £100K.
 */
export function calcPersonalAllowance(grossIncome: number, taxCodeOverride?: number | null): number {
  if (taxCodeOverride !== undefined && taxCodeOverride !== null) return taxCodeOverride;
  if (grossIncome <= PA_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  if (grossIncome >= PA_TAPER_LIMIT) return 0;
  const reduction = Math.floor((grossIncome - PA_TAPER_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

/**
 * Calculate UK income tax using the standard (non-Scottish) bands.
 * For Scottish rates or tax code overrides, the full calculator wraps this.
 *
 * @param taxableIncome - Gross income minus pension (the amount to tax)
 * @param bands - Tax bands to use (defaults to UK standard)
 * @param personalAllowance - Override PA (for tax code scenarios)
 */
export function calcIncomeTax(
  taxableIncome: number,
  bands: [number, number][] = UK_BANDS,
  personalAllowance?: number
): number {
  const pa = personalAllowance ?? calcPersonalAllowance(taxableIncome);
  const taxable = Math.max(0, taxableIncome - pa);

  let tax = 0;
  for (let i = 0; i < bands.length; i++) {
    const [threshold, rate] = bands[i];
    const nextThreshold = i + 1 < bands.length ? bands[i + 1][0] : Infinity;
    if (taxable <= threshold) break;
    const taxableInBand = Math.min(taxable, nextThreshold) - threshold;
    tax += taxableInBand * rate;
  }
  return tax;
}

/**
 * Calculate simple UK income tax for a given gross salary.
 * Uses standard PA with taper and standard (non-Scottish) bands.
 * This is the function the homepage uses.
 */
export function calcSimpleIncomeTax(grossIncome: number): number {
  return calcIncomeTax(grossIncome);
}

/**
 * Calculate employee National Insurance contributions.
 * 8% on earnings between primary threshold and UEL, 2% above.
 */
export function calcNI(grossIncome: number): number {
  if (grossIncome <= NI_PRIMARY_THRESHOLD) return 0;
  const mainBand = Math.min(grossIncome, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD;
  const upperBand = Math.max(0, grossIncome - NI_UPPER_EARNINGS_LIMIT);
  return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
}

export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad';

/**
 * Calculate annual student loan repayment: a flat rate on income above the
 * plan's threshold. Shared by the full UK salary calculator and the
 * build-time take-home hub table.
 */
export function calcStudentLoan(grossIncome: number, plan: StudentLoanPlan): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = UK_STUDENT_LOANS[plan];
  return grossIncome > threshold ? (grossIncome - threshold) * rate : 0;
}

// Re-export band data so the full calculator can use the same constants
export { UK_BANDS, PERSONAL_ALLOWANCE, PA_TAPER_THRESHOLD, PA_TAPER_LIMIT };

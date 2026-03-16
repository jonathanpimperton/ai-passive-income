/**
 * Shared US tax calculation functions.
 * Used by both the full SalaryCalc component and the homepage DecisionEngine.
 *
 * The full calculator adds state tax, 401(k), overtime, hourly mode on top.
 * These functions handle federal income tax and FICA.
 */

import {
  US_BRACKETS,
  US_STANDARD_DEDUCTION,
  US_SOCIAL_SECURITY,
  US_MEDICARE,
  type FilingStatus,
} from './us-rates';

/**
 * Calculate federal income tax after standard deduction.
 */
export function calcFederalTax(grossIncome: number, filingStatus: FilingStatus): number {
  const taxable = Math.max(0, grossIncome - US_STANDARD_DEDUCTION[filingStatus]);
  const brackets = US_BRACKETS[filingStatus];
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [threshold, rate] = brackets[i];
    const nextThreshold = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    if (taxable <= threshold) break;
    const taxableInBracket = Math.min(taxable, nextThreshold) - threshold;
    tax += taxableInBracket * rate;
  }
  return Math.max(0, tax);
}

/**
 * Calculate FICA taxes (Social Security + Medicare).
 */
export function calcFICA(grossIncome: number, filingStatus: FilingStatus) {
  const ss = Math.min(grossIncome, US_SOCIAL_SECURITY.wageCap) * US_SOCIAL_SECURITY.rate;
  const medicareBase = grossIncome * US_MEDICARE.rate;
  const additionalThreshold = US_MEDICARE.additionalThreshold[filingStatus];
  const medicareAdditional = grossIncome > additionalThreshold
    ? (grossIncome - additionalThreshold) * US_MEDICARE.additionalRate
    : 0;
  return { ss, medicare: medicareBase + medicareAdditional, total: ss + medicareBase + medicareAdditional };
}

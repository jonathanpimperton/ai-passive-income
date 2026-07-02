/**
 * Car finance math — monthly payments for straight loans (HP / personal loan),
 * PCP with a balloon (GMFV), and the opportunity cost of spending cash early.
 *
 * Used by the Car Finance Comparison calculator.
 */

import { loanMonthlyPayment } from './calculator-utils';

/** Standard loan monthly payment: M = P × r(1+r)^n / ((1+r)^n - 1) */
export function calcMonthly(principal: number, aprPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (aprPercent <= 0) return principal / months;
  return loanMonthlyPayment(principal, aprPercent / 100, months);
}

/**
 * PCP monthly payment with balloon (GMFV).
 * Monthly = r × (PV - FV / (1+r)^n) / (1 - (1+r)^-n)
 */
export function calcPcpMonthly(financeAmount: number, balloon: number, aprPercent: number, months: number): number {
  if (financeAmount <= 0 || months <= 0) return 0;
  if (aprPercent <= 0) return (financeAmount - balloon) / months;
  const r = aprPercent / 100 / 12;
  const n = months;
  const pvMinusFv = financeAmount - balloon / Math.pow(1 + r, n);
  return (pvMinusFv * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Opportunity cost: what your money could have earned if invested instead.
 * For an upfront payment at month 0: upfront × ((1+r)^n − 1)
 * For monthly payments: monthly × (((1+r)^n − 1)/r − n)  (closed-form sum)
 * Final payments at month n have zero opportunity cost (no time to grow).
 */
export function calcOpportunityCost(
  upfront: number,
  monthly: number,
  months: number,
  annualReturnPct: number,
): number {
  if (annualReturnPct <= 0 || months <= 0) return 0;
  const r = annualReturnPct / 100 / 12;
  const compoundN = Math.pow(1 + r, months);
  const upfrontCost = upfront * (compoundN - 1);
  const monthlyCost = monthly > 0 ? monthly * ((compoundN - 1) / r - months) : 0;
  return upfrontCost + monthlyCost;
}

/**
 * Mortgage payment and amortization engine.
 *
 * Used by the Mortgage Payment calculator and the Loan Amortization
 * calculator (same schedule maths, so the two tools can never drift apart).
 *
 * Conventions:
 * - Rates are annual percentages (7.11 = 7.11%), compounded monthly
 *   (rate / 12), as quoted for US, UK and euro-area mortgages.
 * - Extra payments go straight to principal every month, so the loan ends
 *   early; the final payment is capped at the remaining balance + interest.
 * - Property tax, homeowners insurance and PMI are US concepts: outside the
 *   US region they are zero, whatever the (hidden) inputs hold.
 */

import type { RateRegion } from './market-rates';

/**
 * Default annual PMI rate, % of the original loan.
 * Freddie Mac: "you can expect to pay approximately between $30 and $70 per
 * month for every $100,000 borrowed" = 0.36%-0.84% a year; 0.6% is the
 * midpoint. https://myhome.freddiemac.com/buying/breaking-down-pmi
 * (accessed 2026-11-12). Shared by the payment and affordability tools.
 */
export const DEFAULT_PMI_RATE = 0.6;

/** PMI applies (in the US) while the down payment is below this share of the price. */
export const PMI_DOWN_PAYMENT_THRESHOLD = 0.2;

/** Level monthly payment: M = P * r(1+r)^n / ((1+r)^n - 1), r = annual% / 1200. */
export function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  if (!(principal > 0) || !(termMonths > 0)) return 0;
  if (!(annualRatePct > 0)) return principal / termMonths;
  const r = annualRatePct / 100 / 12;
  const growth = Math.pow(1 + r, termMonths);
  return (principal * r * growth) / (growth - 1);
}

/**
 * Largest loan a level monthly payment supports (the inverse of
 * monthlyPayment): L = M * ((1+r)^n - 1) / (r(1+r)^n).
 */
export function loanFromPayment(payment: number, annualRatePct: number, termMonths: number): number {
  if (!(payment > 0) || !(termMonths > 0)) return 0;
  if (!(annualRatePct > 0)) return payment * termMonths;
  const r = annualRatePct / 100 / 12;
  const growth = Math.pow(1 + r, termMonths);
  return (payment * (growth - 1)) / (r * growth);
}

export interface AmortizationMonth {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationYear {
  year: number;
  startBalance: number;
  endBalance: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  months: AmortizationMonth[];
}

export interface AmortizationResult {
  /** The scheduled (contractual) monthly payment, before any extra */
  scheduledPayment: number;
  months: AmortizationMonth[];
  yearGroups: AmortizationYear[];
  totalInterest: number;
  totalPaid: number;
  /** Months until the balance reaches zero */
  payoffMonths: number;
}

/** Below this balance the loan is treated as repaid (avoids float dust rows). */
const PAID_OFF = 0.005;

/**
 * Month-by-month schedule with an optional fixed extra principal payment.
 * Values are unrounded; format at display time.
 */
export function buildAmortization(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  extraMonthly = 0,
): AmortizationResult {
  const scheduledPayment = monthlyPayment(principal, annualRatePct, termMonths);
  const r = annualRatePct > 0 ? annualRatePct / 100 / 12 : 0;
  const extra = Math.max(0, extraMonthly);
  const months: AmortizationMonth[] = [];
  const yearGroups: AmortizationYear[] = [];
  let balance = Math.max(0, principal);
  let totalInterest = 0;
  let totalPaid = 0;

  for (let m = 1; m <= termMonths && balance > PAID_OFF; m++) {
    const interest = balance * r;
    const payment = Math.min(scheduledPayment + extra, balance + interest);
    const principalPart = payment - interest;
    balance = Math.max(0, balance - principalPart);
    if (balance <= PAID_OFF) balance = 0;
    totalInterest += interest;
    totalPaid += payment;

    const row = { month: m, payment, principal: principalPart, interest, balance };
    months.push(row);

    const yearNum = Math.ceil(m / 12);
    let group = yearGroups[yearGroups.length - 1];
    if (!group || group.year !== yearNum) {
      group = {
        year: yearNum,
        startBalance: balance + principalPart,
        endBalance: balance,
        totalPrincipal: 0,
        totalInterest: 0,
        totalPayment: 0,
        months: [],
      };
      yearGroups.push(group);
    }
    group.totalPrincipal += principalPart;
    group.totalInterest += interest;
    group.totalPayment += payment;
    group.endBalance = balance;
    group.months.push(row);
  }

  return { scheduledPayment, months, yearGroups, totalInterest, totalPaid, payoffMonths: months.length };
}

export interface MortgagePaymentInputs {
  homePrice: number;
  /** Down payment / deposit as % of the price (0-100). 0 makes price = loan. */
  downPaymentPercent: number;
  /** Annual interest rate, % */
  interestRate: number;
  /** Term in years */
  loanTerm: number;
  /** Extra principal paid every month */
  extraMonthly: number;
  /** US only: annual property tax, % of the price */
  propertyTaxRate: number;
  /** US only: annual homeowners insurance */
  insuranceAnnual: number;
  /** US only: annual PMI, % of the original loan, while down payment < 20% */
  pmiRate: number;
}

export interface MortgagePaymentResult {
  downPayment: number;
  principal: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  needsPMI: boolean;
  /** P&I + tax + insurance + PMI (no extra payment) */
  totalMonthly: number;
  totalInterest: number;
  totalPaid: number;
  interestSaved: number;
  monthsSaved: number;
  payoffMonths: number;
  yearGroups: AmortizationYear[];
}

export function computeMortgagePayment(input: MortgagePaymentInputs, region: RateRegion): MortgagePaymentResult {
  const price = Math.max(0, input.homePrice);
  const downPct = Math.min(100, Math.max(0, input.downPaymentPercent));
  const downPayment = price * (downPct / 100);
  const principal = Math.max(0, price - downPayment);
  const termMonths = Math.round(Math.max(0, input.loanTerm) * 12);
  const isUS = region === 'us';

  const base = buildAmortization(principal, input.interestRate, termMonths, 0);
  const withExtra = input.extraMonthly > 0
    ? buildAmortization(principal, input.interestRate, termMonths, input.extraMonthly)
    : base;

  const monthlyTax = isUS ? (price * (Math.max(0, input.propertyTaxRate) / 100)) / 12 : 0;
  const monthlyInsurance = isUS ? Math.max(0, input.insuranceAnnual) / 12 : 0;
  const needsPMI = isUS && principal > 0 && downPct / 100 < PMI_DOWN_PAYMENT_THRESHOLD;
  const monthlyPMI = needsPMI ? (principal * (Math.max(0, input.pmiRate) / 100)) / 12 : 0;

  return {
    downPayment,
    principal,
    monthlyPI: base.scheduledPayment,
    monthlyTax,
    monthlyInsurance,
    monthlyPMI,
    needsPMI,
    totalMonthly: base.scheduledPayment + monthlyTax + monthlyInsurance + monthlyPMI,
    totalInterest: withExtra.totalInterest,
    totalPaid: withExtra.totalPaid,
    interestSaved: base.totalInterest - withExtra.totalInterest,
    monthsSaved: base.payoffMonths - withExtra.payoffMonths,
    payoffMonths: withExtra.payoffMonths,
    yearGroups: withExtra.yearGroups,
  };
}

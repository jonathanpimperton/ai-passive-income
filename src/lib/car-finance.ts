/**
 * Car finance math — monthly payments for straight loans (HP / personal loan),
 * PCP with a balloon (GMFV), and the opportunity cost of spending cash early.
 *
 * Used by the Car Finance Comparison calculator.
 *
 * APR conventions differ by jurisdiction, so the monthly rate does too:
 * - UK and EU (GBP/EUR): the APR is an ANNUAL EFFECTIVE rate. The UK APR
 *   equation discounts each payment by (1 + APR)^-t with t in years and a
 *   month as 1/12 year (Consumer Credit (Total Charge for Credit) Regulations
 *   2010, SI 2010/1011, Schedule, designated as rules in FCA CONC App 1.2;
 *   https://www.legislation.gov.uk/uksi/2010/1011/schedule/made, accessed
 *   2026-11-12 -- the same equation as Annex I of EU Directive 2008/48/EC,
 *   which it transposed). Monthly rate = (1 + APR)^(1/12) - 1 (MTH-27).
 * - US (USD): Regulation Z defines the APR as the unit-period rate multiplied
 *   by the number of unit periods in a year (12 CFR 1026 Appendix J (b)(1);
 *   https://www.consumerfinance.gov/rules-policy/regulations/1026/j/,
 *   accessed 2026-11-12). Monthly rate = APR / 12.
 */

import { loanMonthlyPayment } from './calculator-utils';

export type AprConvention = 'nominal' | 'effective';

/** The APR convention for a display currency (USD nominal; GBP/EUR effective). */
export function aprConventionForCurrency(currency: string): AprConvention {
  return currency === 'GBP' || currency === 'EUR' ? 'effective' : 'nominal';
}

/** Monthly periodic rate (as a decimal) implied by an APR in percent. */
export function monthlyRateFromApr(aprPercent: number, convention: AprConvention = 'nominal'): number {
  if (!(aprPercent > 0)) return 0;
  return convention === 'effective'
    ? Math.pow(1 + aprPercent / 100, 1 / 12) - 1
    : aprPercent / 100 / 12;
}

/** Standard loan monthly payment: M = P × r(1+r)^n / ((1+r)^n - 1) */
export function calcMonthly(
  principal: number,
  aprPercent: number,
  months: number,
  convention: AprConvention = 'nominal',
): number {
  if (principal <= 0 || months <= 0) return 0;
  if (aprPercent <= 0) return principal / months;
  // loanMonthlyPayment takes an annual nominal rate (it divides by 12).
  return loanMonthlyPayment(principal, monthlyRateFromApr(aprPercent, convention) * 12, months);
}

/**
 * PCP monthly payment with balloon (GMFV).
 * Monthly = r × (PV - FV / (1+r)^n) / (1 - (1+r)^-n)
 */
export function calcPcpMonthly(
  financeAmount: number,
  balloon: number,
  aprPercent: number,
  months: number,
  convention: AprConvention = 'nominal',
): number {
  if (financeAmount <= 0 || months <= 0) return 0;
  if (aprPercent <= 0) return (financeAmount - balloon) / months;
  const r = monthlyRateFromApr(aprPercent, convention);
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

/** Smallest amount the calculator will finance; the deposit leaves at least this. */
export const MIN_FINANCE_AMOUNT = 1_000;
/** Slider ceiling for the deposit. */
export const MAX_DEPOSIT = 75_000;

/** Largest deposit allowed for a car price (price - minimum finance, capped). */
export function maxDepositFor(carPrice: number): number {
  return Math.max(0, Math.min(carPrice - MIN_FINANCE_AMOUNT, MAX_DEPOSIT));
}

/**
 * Keep a deposit inside [0, maxDepositFor(price)]. Used when the price drops
 * below a deposit typed earlier, which used to leave a deposit larger than the
 * car ("$15,000 interest" on a $5,000 car, CALC-UX-A-07).
 */
export function clampDeposit(carPrice: number, deposit: number): number {
  if (!Number.isFinite(deposit) || deposit < 0) return 0;
  return Math.min(deposit, maxDepositFor(carPrice));
}

export interface CarFinanceInputs {
  carPrice: number;
  deposit: number;
  termMonths: number;
  pcpApr: number;
  /** PCP balloon (GMFV) as % of the price; capped so deposit + balloon <= price */
  pcpBalloonPct: number;
  hpApr: number;
  loanApr: number;
  /** What uninvested cash could earn, annual % */
  investReturnRate: number;
  aprConvention: AprConvention;
}

export type CarFinanceOptionType = 'pcp' | 'hp' | 'loan' | 'cash';

export interface CarFinanceOption {
  type: CarFinanceOptionType;
  monthly: number;
  totalPaid: number;
  totalInterest: number;
  opportunityCost: number;
  /** totalPaid + opportunityCost */
  trueCost: number;
}

export interface CarFinanceComparison {
  /** Deposit actually used (clamped to the price) */
  deposit: number;
  financeAmount: number;
  /** Highest balloon % allowed for this price and deposit */
  maxBalloonPct: number;
  balloonPct: number;
  balloon: number;
  options: CarFinanceOption[];
  cheapest: CarFinanceOption;
}

/** Compare PCP, HP, personal loan and cash for one car. */
export function compareCarFinance(input: CarFinanceInputs): CarFinanceComparison {
  const carPrice = Math.max(0, input.carPrice);
  const deposit = clampDeposit(carPrice, input.deposit);
  const financeAmount = Math.max(0, carPrice - deposit);
  const n = Math.max(0, Math.round(input.termMonths));
  const conv = input.aprConvention;
  const maxBalloonPct = carPrice > 0 ? Math.max(0, Math.min(60, Math.floor((financeAmount / carPrice) * 100))) : 0;
  const balloonPct = Math.min(Math.max(0, input.pcpBalloonPct), maxBalloonPct);
  const balloon = Math.round((carPrice * balloonPct) / 100);
  const ret = input.investReturnRate;

  const financed = (type: CarFinanceOptionType, monthly: number, finalPayment: number): CarFinanceOption => {
    const totalPaid = deposit + monthly * n + finalPayment;
    // Deposit at month 0 and the monthly payments lose investment growth; a
    // final payment at month n has no time to grow, so it costs nothing extra.
    const opportunityCost = calcOpportunityCost(deposit, monthly, n, ret);
    return { type, monthly, totalPaid, totalInterest: totalPaid - carPrice, opportunityCost, trueCost: totalPaid + opportunityCost };
  };

  const pcp = financed('pcp', calcPcpMonthly(financeAmount, balloon, input.pcpApr, n, conv), balloon);
  const hp = financed('hp', calcMonthly(financeAmount, input.hpApr, n, conv), 0);
  const loan = financed('loan', calcMonthly(financeAmount, input.loanApr, n, conv), 0);
  const cashOpp = calcOpportunityCost(carPrice, 0, n, ret);
  const cash: CarFinanceOption = {
    type: 'cash',
    monthly: 0,
    totalPaid: carPrice,
    totalInterest: 0,
    opportunityCost: cashOpp,
    trueCost: carPrice + cashOpp,
  };

  const options = [pcp, hp, loan, cash];
  const cheapest = options.reduce((best, o) => (o.trueCost < best.trueCost ? o : best), options[0]);
  return { deposit, financeAmount, maxBalloonPct, balloonPct, balloon, options, cheapest };
}

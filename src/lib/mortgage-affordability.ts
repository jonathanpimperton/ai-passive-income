/**
 * Mortgage affordability engine -- "how much home can I afford?"
 *
 * Three regional models, chosen by the display currency (D11):
 *
 * US (USD) -- the 28/36 debt-to-income guideline.
 *   Housing payment (P&I + property tax + insurance + HOA + PMI) may not exceed
 *   the LOWER of 28% of gross monthly income (front end) and 36% of gross
 *   income minus other monthly debts (back end). Solved in closed form on each
 *   side of the 20%-down PMI boundary -- no iteration, so no oscillation
 *   (MATH-US-05/06). Source for the 28/36 guideline: CFPB, "What is a
 *   debt-to-income ratio?"
 *   https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/
 *
 * UK (GBP) -- income multiple plus a rate-rise check.
 *   1. Loan-to-income cap: most lenders cap borrowing around 4.5x income
 *      because the Bank of England FPC limits lending at or above 4.5x to 15%
 *      of each lender's new mortgages (UK_MORTGAGE.incomeMultipleCap).
 *   2. Rate-rise (stress) check: the payment at the product rate + 3 points,
 *      plus other committed debts, must stay within 50% of take-home pay.
 *      This mirrors the government-backed MoneyHelper affordability tool,
 *      which applies a +3% rate rise and flags spending more than half of
 *      take-home pay as high risk (40-50% typical):
 *      https://www.gov.uk/algorithmic-transparency-records/money-and-pensions-service-mortgage-affordability-calculator
 *      (accessed 2026-11-12).
 *   The answer is the smaller of the two limits; both are reported.
 *
 * Euro area (EUR) -- one combined limit on loan payments plus other debts as
 *   a share of gross income (default 36%). Rules differ by country (several
 *   cap debt service as a share of net income); the UI says so.
 *
 * Pure functions, no DOM. `solveAffordability()` is the entry point used by
 * the calculator and (W2-ENGINE) the homepage engine.
 */

import { loanFromPayment, monthlyPayment, DEFAULT_PMI_RATE, PMI_DOWN_PAYMENT_THRESHOLD } from './mortgage-payment';
import { calcNI, calcSimpleIncomeTax } from './uk-tax-calc';
import { UK_MORTGAGE } from './uk-rates';

/* ── Defaults (shared with the calculator and the homepage engine) ── */

export const AFFORDABILITY_DEFAULTS = {
  annualIncome: 80_000,
  monthlyDebts: 500,
  deposit: 40_000,
  /** US illustrative housing-cost defaults (same as the payment calculator) */
  propertyTaxRate: 1.0,
  insuranceAnnual: 1_800,
  hoaMonthly: 0,
  pmiRate: DEFAULT_PMI_RATE,
  /** CFPB 28/36 guideline */
  frontEndPct: 28,
  backEndPct: 36,
  /** UK: FPC 4.5x loan-to-income flow limit */
  ltiCap: UK_MORTGAGE.incomeMultipleCap,
  /** UK: MoneyHelper-style rate-rise check */
  stressMarginPct: 3,
  maxShareOfTakeHomePct: 50,
  comfortableShareOfTakeHomePct: 40,
  /** UK: most buyers need at least a 5% deposit (FCA DP25/2, para 2.11) */
  minDepositPct: 5,
  /** EUR: combined payment limit as % of gross income */
  eurMaxDebtServicePct: 36,
} as const;

/** Adjustable ranges the UI exposes (D11: LTI 4-5.5x). */
export const LTI_RANGE = { min: 4, max: 5.5 } as const;

/* ── Inputs ───────────────────────────────────────────────── */

interface CommonInput {
  annualIncome: number;
  monthlyDebts: number;
  deposit: number;
  /** Annual mortgage rate, % */
  ratePct: number;
  termYears: number;
}

export interface UsAffordabilityInput extends CommonInput {
  region: 'us';
  propertyTaxRate: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  pmiRate: number;
  frontEndPct?: number;
  backEndPct?: number;
}

export interface UkAffordabilityInput extends CommonInput {
  region: 'uk';
  /** Monthly take-home pay of all applicants; defaults to estimateUkTakeHome(annualIncome) */
  monthlyTakeHome?: number;
  ltiCap?: number;
  stressMarginPct?: number;
  maxShareOfTakeHomePct?: number;
}

export interface EurAffordabilityInput extends CommonInput {
  region: 'eur';
  maxDebtServicePct?: number;
}

export type AffordabilityInput = UsAffordabilityInput | UkAffordabilityInput | EurAffordabilityInput;

/* ── Results ──────────────────────────────────────────────── */

/**
 * - ok: a positive loan (or a cash-only purchase) fits the rules.
 * - debts-exceed: existing debts alone use up the limit; nothing is affordable.
 * - costs-exceed (US): property tax, insurance and HOA alone exceed the budget.
 */
export type AffordabilityStatus = 'ok' | 'debts-exceed' | 'costs-exceed';

interface CommonResult {
  status: AffordabilityStatus;
  maxPrice: number;
  maxLoan: number;
  /** Principal and interest at the product rate */
  monthlyPI: number;
  /** Everything the tool counts as the monthly housing payment */
  totalMonthly: number;
  grossMonthlyIncome: number;
}

export interface UsAffordabilityResult extends CommonResult {
  region: 'us';
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHOA: number;
  monthlyPMI: number;
  needsPMI: boolean;
  frontEndBudget: number;
  backEndBudget: number;
  /** min(front, back) -- the housing payment ceiling */
  housingBudget: number;
  binding: 'front-end' | 'back-end';
  /** totalMonthly / gross monthly income, % */
  frontEndRatio: number;
  /** (totalMonthly + debts) / gross monthly income, % */
  backEndRatio: number;
}

export interface UkAffordabilityResult extends CommonResult {
  region: 'uk';
  monthlyTakeHome: number;
  ltiCap: number;
  ltiLimitLoan: number;
  stressRatePct: number;
  stressLimitLoan: number;
  binding: 'lti' | 'stress';
  /** Payment at the stress rate on maxLoan */
  stressedPayment: number;
  /** (monthlyPI + debts) / take-home, % */
  shareOfTakeHome: number;
  /** (stressedPayment + debts) / take-home, % */
  stressedShareOfTakeHome: number;
  /** maxLoan / annual income */
  incomeMultiple: number;
  /** deposit / maxPrice, % */
  depositPct: number;
  lowDeposit: boolean;
}

export interface EurAffordabilityResult extends CommonResult {
  region: 'eur';
  paymentBudget: number;
  /** (monthlyPI + debts) / gross monthly income, % */
  debtServiceRatio: number;
}

export type AffordabilityResult = UsAffordabilityResult | UkAffordabilityResult | EurAffordabilityResult;

/* ── Helpers ──────────────────────────────────────────────── */

const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/** P&I payment per unit of loan for a rate and term. */
function paymentFactor(ratePct: number, termMonths: number): number {
  return monthlyPayment(1, ratePct, termMonths);
}

/**
 * Estimated UK monthly take-home pay for ONE earner on standard rest-of-UK
 * income tax and employee NI, no pension or student loan. Joint applicants or
 * Scottish taxpayers should enter their actual take-home pay instead.
 */
export function estimateUkTakeHome(annualGross: number): number {
  const gross = pos(annualGross);
  return (gross - calcSimpleIncomeTax(gross) - calcNI(gross)) / 12;
}

/* ── US: 28/36 ────────────────────────────────────────────── */

export function solveUsAffordability(input: UsAffordabilityInput): UsAffordabilityResult {
  const income = pos(input.annualIncome);
  const G = income / 12;
  const debts = pos(input.monthlyDebts);
  const D = pos(input.deposit);
  const termMonths = Math.round(pos(input.termYears) * 12);
  const frontPct = input.frontEndPct ?? AFFORDABILITY_DEFAULTS.frontEndPct;
  const backPct = input.backEndPct ?? AFFORDABILITY_DEFAULTS.backEndPct;

  const frontEndBudget = (G * frontPct) / 100;
  const backEndBudget = (G * backPct) / 100 - debts;
  const housingBudget = Math.min(frontEndBudget, backEndBudget);
  const binding: 'front-end' | 'back-end' = frontEndBudget <= backEndBudget ? 'front-end' : 'back-end';

  const t = pos(input.propertyTaxRate) / 1200; // monthly tax per unit of price
  const p = pos(input.pmiRate) / 1200; // monthly PMI per unit of loan
  const monthlyInsurance = pos(input.insuranceAnnual) / 12;
  const monthlyHOA = pos(input.hoaMonthly);
  const fixed = monthlyInsurance + monthlyHOA;
  const a = paymentFactor(input.ratePct, termMonths);

  const empty = (status: AffordabilityStatus): UsAffordabilityResult => ({
    region: 'us',
    status,
    maxPrice: 0,
    maxLoan: 0,
    monthlyPI: 0,
    totalMonthly: 0,
    grossMonthlyIncome: G,
    monthlyTax: 0,
    monthlyInsurance: 0,
    monthlyHOA: 0,
    monthlyPMI: 0,
    needsPMI: false,
    frontEndBudget,
    backEndBudget,
    housingBudget,
    binding,
    frontEndRatio: 0,
    backEndRatio: G > 0 ? (debts / G) * 100 : 0,
  });

  if (!(housingBudget > 0) || termMonths <= 0) return empty('debts-exceed');
  if (housingBudget - fixed <= 0) return empty('costs-exceed');

  // Price P = L + D. Housing cost(L) = a*L + t*(L + D) + fixed (+ p*L when PMI applies).
  // PMI applies when D < 20% of P, i.e. when L > 4D (for the default 20% threshold).
  const pmiKnee = (D * (1 - PMI_DOWN_PAYMENT_THRESHOLD)) / PMI_DOWN_PAYMENT_THRESHOLD; // 4D
  const available = housingBudget - fixed - D * t;

  let maxLoan = 0;
  let needsPMI = false;
  let maxPrice: number;

  if (available < 0) {
    // Even with no loan, tax on a home worth the whole deposit is over budget:
    // the most you could pay (cash) is where tax + fixed costs = budget.
    maxPrice = t > 0 ? (housingBudget - fixed) / t : D;
  } else {
    const loanNoPmi = available / (a + t);
    const loanWithPmi = available / (a + t + p);
    if (loanWithPmi > pmiKnee) {
      maxLoan = loanWithPmi;
      needsPMI = true;
    } else {
      maxLoan = Math.min(loanNoPmi, pmiKnee);
    }
    maxPrice = maxLoan + D;
  }

  const monthlyPI = maxLoan * a;
  const monthlyTax = maxPrice * t;
  const monthlyPMI = needsPMI ? maxLoan * p : 0;
  const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA + monthlyPMI;

  return {
    region: 'us',
    status: 'ok',
    maxPrice,
    maxLoan,
    monthlyPI,
    totalMonthly,
    grossMonthlyIncome: G,
    monthlyTax,
    monthlyInsurance,
    monthlyHOA,
    monthlyPMI,
    needsPMI,
    frontEndBudget,
    backEndBudget,
    housingBudget,
    binding,
    frontEndRatio: G > 0 ? (totalMonthly / G) * 100 : 0,
    backEndRatio: G > 0 ? ((totalMonthly + debts) / G) * 100 : 0,
  };
}

/* ── UK: income multiple + rate-rise check ────────────────── */

export function solveUkAffordability(input: UkAffordabilityInput): UkAffordabilityResult {
  const income = pos(input.annualIncome);
  const G = income / 12;
  const debts = pos(input.monthlyDebts);
  const D = pos(input.deposit);
  const termMonths = Math.round(pos(input.termYears) * 12);
  const ltiCap = pos(input.ltiCap ?? AFFORDABILITY_DEFAULTS.ltiCap);
  const stressRatePct = pos(input.ratePct) + pos(input.stressMarginPct ?? AFFORDABILITY_DEFAULTS.stressMarginPct);
  const maxShare = pos(input.maxShareOfTakeHomePct ?? AFFORDABILITY_DEFAULTS.maxShareOfTakeHomePct);
  const takeHome = input.monthlyTakeHome !== undefined ? pos(input.monthlyTakeHome) : estimateUkTakeHome(income);

  const ltiLimitLoan = income * ltiCap;
  const stressBudget = (takeHome * maxShare) / 100 - debts;
  const stressLimitLoan = stressBudget > 0 && termMonths > 0 ? loanFromPayment(stressBudget, stressRatePct, termMonths) : 0;
  const maxLoan = Math.max(0, Math.min(ltiLimitLoan, stressLimitLoan));
  const binding: 'lti' | 'stress' = ltiLimitLoan <= stressLimitLoan ? 'lti' : 'stress';
  const status: AffordabilityStatus = stressBudget > 0 ? 'ok' : 'debts-exceed';

  const monthlyPI = monthlyPayment(maxLoan, input.ratePct, termMonths);
  const stressedPayment = monthlyPayment(maxLoan, stressRatePct, termMonths);
  const maxPrice = status === 'ok' ? maxLoan + D : 0;
  const share = (pay: number) => (takeHome > 0 ? ((pay + debts) / takeHome) * 100 : 0);
  const depositPct = maxPrice > 0 ? (D / maxPrice) * 100 : 0;

  return {
    region: 'uk',
    status,
    maxPrice,
    maxLoan: status === 'ok' ? maxLoan : 0,
    monthlyPI: status === 'ok' ? monthlyPI : 0,
    totalMonthly: status === 'ok' ? monthlyPI : 0,
    grossMonthlyIncome: G,
    monthlyTakeHome: takeHome,
    ltiCap,
    ltiLimitLoan,
    stressRatePct,
    stressLimitLoan,
    binding,
    stressedPayment: status === 'ok' ? stressedPayment : 0,
    shareOfTakeHome: status === 'ok' ? share(monthlyPI) : share(0),
    stressedShareOfTakeHome: status === 'ok' ? share(stressedPayment) : share(0),
    incomeMultiple: income > 0 && status === 'ok' ? maxLoan / income : 0,
    depositPct,
    lowDeposit: maxPrice > 0 && depositPct < AFFORDABILITY_DEFAULTS.minDepositPct,
  };
}

/* ── Euro area: one combined limit ────────────────────────── */

export function solveEurAffordability(input: EurAffordabilityInput): EurAffordabilityResult {
  const income = pos(input.annualIncome);
  const G = income / 12;
  const debts = pos(input.monthlyDebts);
  const D = pos(input.deposit);
  const termMonths = Math.round(pos(input.termYears) * 12);
  const pct = pos(input.maxDebtServicePct ?? AFFORDABILITY_DEFAULTS.eurMaxDebtServicePct);
  const paymentBudget = (G * pct) / 100 - debts;

  if (!(paymentBudget > 0) || termMonths <= 0) {
    return {
      region: 'eur',
      status: 'debts-exceed',
      maxPrice: 0,
      maxLoan: 0,
      monthlyPI: 0,
      totalMonthly: 0,
      grossMonthlyIncome: G,
      paymentBudget,
      debtServiceRatio: G > 0 ? (debts / G) * 100 : 0,
    };
  }

  const maxLoan = loanFromPayment(paymentBudget, input.ratePct, termMonths);
  const monthlyPI = monthlyPayment(maxLoan, input.ratePct, termMonths);
  return {
    region: 'eur',
    status: 'ok',
    maxPrice: maxLoan + D,
    maxLoan,
    monthlyPI,
    totalMonthly: monthlyPI,
    grossMonthlyIncome: G,
    paymentBudget,
    debtServiceRatio: G > 0 ? ((monthlyPI + debts) / G) * 100 : 0,
  };
}

/** Entry point: dispatches on `input.region`. */
export function solveAffordability(input: UsAffordabilityInput): UsAffordabilityResult;
export function solveAffordability(input: UkAffordabilityInput): UkAffordabilityResult;
export function solveAffordability(input: EurAffordabilityInput): EurAffordabilityResult;
export function solveAffordability(input: AffordabilityInput): AffordabilityResult;
export function solveAffordability(input: AffordabilityInput): AffordabilityResult {
  if (input.region === 'uk') return solveUkAffordability(input);
  if (input.region === 'eur') return solveEurAffordability(input);
  return solveUsAffordability(input);
}

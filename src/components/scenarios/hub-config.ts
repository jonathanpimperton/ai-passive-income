/**
 * Shared data and helpers for the four scenario hub pages
 * (/scenarios/uk-take-home-pay/, us-take-home-pay/, mortgage-payments-by-amount/,
 * investment-growth/) and the scenarios index that links to them.
 *
 * Every figure comes from the figure engine (`@lib/figures`), the same functions
 * the calculators call and the Markdown figure tokens use, so a table cell, a
 * sentence on the page, the embedded calculator and a scenario page cannot
 * disagree (plan-2026-11 W2-SCEN, RC1).
 */
import { evaluateFigure, evaluateFigureValue } from '@lib/figures';

/** Evaluate a figure expression (no formatter) that must be a number. */
export function num(expr: string): number {
  const v = evaluateFigureValue(expr);
  if (typeof v !== 'number') throw new Error(`hub figure ${expr} is not a number`);
  return v;
}

/** Evaluate a figure expression (no formatter) that must be an object of numbers. */
export function rec(expr: string): Record<string, number> {
  const v = evaluateFigureValue(expr);
  if (typeof v !== 'object') throw new Error(`hub figure ${expr} is not an object`);
  return v as Record<string, number>;
}

/** Print a figure token body, e.g. fig("ukPay(50000).monthly | gbp"). */
export const fig = evaluateFigure;

/* -- Salary ladders ------------------------------------------------------ */

/** UK hub rows. The anchor of a row is `${salary / 1000}k` (legacy 301 targets). */
export const UK_SALARIES = [
  20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000,
  70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 130000, 150000,
];

/** US hub rows. 75,000 is new (the 75k scenario page links to #75k). */
export const US_SALARIES = [
  40000, 50000, 60000, 70000, 75000, 80000, 90000, 100000, 110000, 120000, 130000,
  140000, 150000, 160000, 170000, 180000, 190000, 200000, 250000,
];

/** The row each take-home hub answers first, and the calculator's starting salary. */
export const UK_HEADLINE_SALARY = 50000;
export const US_HEADLINE_SALARY = 100000;

/** Standalone pages whose question a hub row also answers (SE-8: both stay, and they link to each other). */
export const UK_ROW_PAGES: Record<number, { href: string; label: string }> = {
  30000: { href: '/scenarios/30k-salary-uk-student-loan/', label: 'With a Plan 2 student loan' },
  50000: { href: '/scenarios/50k-salary-uk-take-home/', label: 'Full breakdown' },
  100000: { href: '/scenarios/100k-salary-uk-tax/', label: 'The 60% band, in detail' },
};

export const US_ROW_PAGES: Record<number, { href: string; label: string }> = {
  50000: { href: '/scenarios/50k-salary-hourly-rate/', label: 'As an hourly rate' },
  60000: { href: '/scenarios/60k-salary-with-401k/', label: 'With a 401(k)' },
  75000: { href: '/scenarios/75k-salary-after-taxes/', label: 'In New York' },
  100000: { href: '/scenarios/100k-salary-take-home/', label: 'In California' },
};

/* -- Mortgage ladder ----------------------------------------------------- */

export const MORTGAGE_AMOUNTS = [
  150000, 175000, 200000, 250000, 300000, 350000, 400000, 450000, 500000,
  550000, 600000, 650000, 700000, 750000,
];

/** Fixed rate columns (percent). The market-rate column is added next to the loan amount. */
export const MORTGAGE_RATES = [5.5, 6, 6.5, 7, 7.5];

export const MORTGAGE_TERM_YEARS = 30;
export const MORTGAGE_HEADLINE_AMOUNT = 300000;

export const MORTGAGE_ROW_PAGES: Record<number, { href: string; label: string }> = {
  300000: { href: '/scenarios/300k-mortgage-7-percent/', label: 'Worked example at 7%' },
};

/* -- Investment ladder --------------------------------------------------- */

/** The planning return behind both investment tables (percent a year). */
export const INVEST_RATE = 7;
export const INVEST_YEARS = [10, 20, 30];
export const INVEST_MONTHLY_AMOUNTS = [100, 200, 250, 500, 1000, 2000];
export const INVEST_LUMP_SUMS = [5000, 10000, 25000, 50000, 100000, 500000];
export const INVEST_HEADLINE_MONTHLY = 500;
export const INVEST_HEADLINE_YEARS = 30;

export const INVEST_ROW_PAGES: Record<string, { href: string; label: string }> = {
  '500-per-month': { href: '/scenarios/500-per-month-investment-25-years/', label: 'Worked through for 25 years' },
  '100000': { href: '/scenarios/100000-invested-30-years/', label: 'Worked through for 30 years' },
};

/** "$300K" style short label used in the scenarios index. */
export function shortMoney(n: number, symbol = '$'): string {
  return n >= 1000 ? `${symbol}${n / 1000}K` : `${symbol}${n}`;
}

/** Row anchor for a salary or loan amount: 50000 -> "50k". */
export const kAnchor = (n: number): string => `${n / 1000}k`;

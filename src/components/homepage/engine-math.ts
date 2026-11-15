/**
 * Pure logic behind the homepage DecisionEngine (W2-ENGINE).
 *
 * The engine is a preview of four full calculators, so every answer here comes
 * from the SAME library functions the full tools call, with the SAME defaults
 * where the engine has no input of its own. Nothing in this file is typed by
 * hand that a library can supply: a homepage answer must equal the tool's
 * answer for the same inputs (review MATH-US-07, MATH-US-08, CONTENT-05).
 *
 * No DOM, no React: unit-tested in engine-math.test.ts.
 */

import { computeUsSalary } from '../../lib/us-tax-calc';
import { defaultUsTaxYearFor, isUsTaxYear, type UsTaxYear } from '../../lib/us-rates';
import { calculateUkTakeHome } from '../../lib/uk-tax-calc';
import { UK_INCOME_TAX } from '../../lib/uk-rates';
import {
  AFFORDABILITY_DEFAULTS,
  estimateUkTakeHome,
  solveAffordability,
  type UkAffordabilityResult,
  type UsAffordabilityResult,
} from '../../lib/mortgage-affordability';
import { defaultMortgageRate } from '../../lib/market-rates';
import { solveRetirementAge, type RetirementAgeResult } from '../../lib/retirement';

export type EngineRegion = 'US' | 'UK';

/** Region of the engine for a display currency: GBP is the UK, everything else shows the US model. */
export function regionForCurrency(currency: string): EngineRegion {
  return currency === 'GBP' ? 'UK' : 'US';
}

/* -- Take-home pay ------------------------------------------ */

export interface EngineTakeHome {
  region: EngineRegion;
  gross: number;
  /** After tax and National Insurance / FICA. The monthly figure is netAnnual / 12. */
  netAnnual: number;
  netMonthly: number;
  incomeTax: number;
  /** National Insurance (UK) or Social Security + Medicare (US) */
  other: number;
  otherLabel: string;
  totalDeductions: number;
}

/**
 * US take-home for a single filer, standard deduction, no state tax, no 401(k):
 * the US Salary calculator with those inputs, in the given tax year.
 */
export function takeHomeUs(salary: number, year: UsTaxYear): EngineTakeHome {
  const r = computeUsSalary({
    year,
    mode: 'annual',
    salary,
    hourlyRate: 0,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    overtimeHours: 0,
    overtimeQualifies: true,
    stateTaxRate: 0,
    filingStatus: 'single',
    retirement401kPct: 0,
    seniors: 0,
  });
  const other = r.socialSecurity + r.medicare;
  return {
    region: 'US',
    gross: r.grossAnnual,
    netAnnual: r.netAnnual,
    netMonthly: r.netAnnual / 12,
    incomeTax: r.federalTax,
    other,
    otherLabel: 'FICA',
    totalDeductions: r.federalTax + other,
  };
}

/**
 * UK take-home for England/Wales/NI, standard tax code, no pension and no
 * student loan: the UK Salary calculator with those inputs.
 */
export function takeHomeUk(salary: number): EngineTakeHome {
  const r = calculateUkTakeHome({
    salary,
    scottish: false,
    taxCode: '',
    studentLoan: 'none',
    pensionMode: 'percent',
    pensionPercent: 0,
    pensionAmount: 0,
    pensionMethod: 'netPay',
  });
  return {
    region: 'UK',
    gross: r.gross,
    netAnnual: r.netAnnual,
    netMonthly: r.netMonthly,
    incomeTax: r.incomeTax,
    other: r.ni,
    otherLabel: 'National Insurance',
    totalDeductions: r.incomeTax + r.ni,
  };
}

/* -- US tax year (same rule as the US Salary calculator) ----- */

/**
 * Session key the US Salary calculator stores the visitor's year choice under
 * (SalaryCalc.tsx YEAR_KEY; engine-math.test.ts checks the two stay equal).
 */
export const US_YEAR_SESSION_KEY = 'calcrun.usTaxYear';

/**
 * The year the engine should use after hydration: the visitor's choice this
 * session (set on the salary calculator), else the default for `now`. This is
 * SalaryCalc's own rule, so the engine and the tool never disagree.
 */
export function preferredUsYear(stored: string | null, now: Date): UsTaxYear {
  const n = Number(stored);
  return isUsTaxYear(n) ? n : defaultUsTaxYearFor(now);
}

/* -- Mortgage affordability ---------------------------------- */

const D = AFFORDABILITY_DEFAULTS;

/** Default term and rate the full tool starts from, per region. */
export const MORTGAGE_TERM_YEARS = { US: 30, UK: 25 } as const;

export function engineMortgageRate(region: EngineRegion): number {
  return defaultMortgageRate(region === 'UK' ? 'uk' : 'us', MORTGAGE_TERM_YEARS[region]);
}

/** Debts the full tool starts from: US $500, UK 0. */
export function engineMonthlyDebts(region: EngineRegion): number {
  return region === 'UK' ? D.ukMonthlyDebts : D.monthlyDebts;
}

/** Affordability with the full tool's defaults for everything the engine does not ask. */
export function engineAffordability(
  region: 'US',
  income: number,
  deposit: number,
): UsAffordabilityResult;
export function engineAffordability(
  region: 'UK',
  income: number,
  deposit: number,
): UkAffordabilityResult;
export function engineAffordability(
  region: EngineRegion,
  income: number,
  deposit: number,
): UsAffordabilityResult | UkAffordabilityResult;
export function engineAffordability(
  region: EngineRegion,
  income: number,
  deposit: number,
): UsAffordabilityResult | UkAffordabilityResult {
  if (region === 'UK') {
    return solveAffordability({
      region: 'uk',
      annualIncome: income,
      monthlyDebts: engineMonthlyDebts('UK'),
      deposit,
      ratePct: engineMortgageRate('UK'),
      termYears: MORTGAGE_TERM_YEARS.UK,
      // The tool rounds its take-home estimate to a whole pound before solving.
      monthlyTakeHome: Math.round(estimateUkTakeHome(income)),
      ltiCap: D.ltiCap,
      stressMarginPct: D.stressMarginPct,
      maxShareOfTakeHomePct: D.maxShareOfTakeHomePct,
    });
  }
  return solveAffordability({
    region: 'us',
    annualIncome: income,
    monthlyDebts: engineMonthlyDebts('US'),
    deposit,
    ratePct: engineMortgageRate('US'),
    termYears: MORTGAGE_TERM_YEARS.US,
    propertyTaxRate: D.propertyTaxRate,
    insuranceAnnual: D.insuranceAnnual,
    hoaMonthly: D.hoaMonthly,
    pmiRate: D.pmiRate,
    frontEndPct: D.frontEndPct,
    backEndPct: D.backEndPct,
  });
}

/* -- Retirement age ------------------------------------------ */

/**
 * The full Retirement Age calculator's defaults (RetirementAgeCalc.tsx
 * DEFAULTS), so the engine's first answer equals the tool's first answer.
 * The engine asks for age, savings and monthly saving; the rest stay as here.
 */
export const RETIREMENT_DEFAULTS = {
  currentAge: 30,
  currentSavings: 50_000,
  monthlyContribution: 500,
  /** Target balance */
  target: 1_000_000,
  /** Annual return, percent */
  annualReturnPct: 7,
  /** The search stops here; beyond it the target is reported as not reached. */
  maxAge: 90,
} as const;

export function engineRetirement(
  currentAge: number,
  currentSavings: number,
  monthlyContribution: number,
): RetirementAgeResult {
  return solveRetirementAge({
    currentAge,
    currentSavings,
    monthlyContribution,
    annualReturn: RETIREMENT_DEFAULTS.annualReturnPct / 100,
    target: RETIREMENT_DEFAULTS.target,
    maxAge: RETIREMENT_DEFAULTS.maxAge,
  });
}

/** Whole age shown for a reached target (same rule as the tool). */
export function wholeRetirementAge(age: number): number {
  return Math.floor(age + 1e-9);
}

/* -- UK pension with tax relief (homepage chip) -------------- */

/** Basic rate of income tax: the relief a pension provider adds at source. */
const BASIC_RATE = UK_INCOME_TAX.bands.find((b) => b.name === 'Basic')!.rate;

/**
 * What goes into a pension when you pay `net` out of taxed pay and the
 * provider claims basic-rate relief: net / (1 - basic rate), so 100 becomes
 * 125 (MATH-UK-18).
 */
export function pensionWithBasicRelief(net: number): number {
  return net / (1 - BASIC_RATE);
}

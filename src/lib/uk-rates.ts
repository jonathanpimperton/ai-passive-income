/**
 * Central UK tax rates -- THE single source for all UK tax/benefit values,
 * keyed by tax year (decision D8, docs/plan-2026-11.md).
 *
 * Only 2026/27 is present. 2027/28 is a data drop once complete primary
 * sources publish (GOV.UK rates and thresholds, the Scottish Budget bands,
 * student loan thresholds; expected Feb/Mar 2027). Do NOT add a partial or
 * estimated year: the freshness guard warns from 60 days before 6 April and
 * fails builds from 6 April 2027 until UK_RATES_BY_YEAR['2027/28'] exists
 * (see tax-years.mjs and docs/freshness-calendar.md).
 *
 * Adding a year: copy the latest block, replace every figure from its primary
 * source (cite URL + access date), then add the year to UK_DATASETS in
 * tax-years.mjs.
 *
 * Sources (2026/27, first verified 2026-07-02; every figure below re-read on 2026-11-16, after the
 * 28 Oct 2026 Budget, with no mid-year change):
 * - income tax bands, personal allowance and its taper (income-tax-rates);
 * - NI thresholds and rates, employee and employer, annual column
 *   (https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027);
 * - student loan plan thresholds and rates, Postgraduate Loan (the same employers page);
 * - new State Pension 241.30 a week, CGT exempt amount and 18%/24% rates;
 * - the six Scottish bands (gov.scot, 2026 to 2027 page; the Scottish Rate Resolution was agreed in
 *   February 2026 and its starter limit, 3,967 above the allowance, matches);
 * - pension annual allowance 60,000 (taper only above 200,000 threshold income and 260,000
 *   adjusted income), Tax-Free Childcare income limit 100,000;
 * - SDLT bands, first-time buyer relief, 5% additional-property surcharge, 2% non-resident surcharge.
 *
 * Source pages:
 * - Income Tax: https://www.gov.uk/income-tax-rates
 * - National Insurance: https://www.gov.uk/national-insurance-rates-letters
 * - State Pension: https://www.gov.uk/new-state-pension/what-youll-get
 * - Student Loans: https://www.gov.uk/repaying-your-student-loan/what-you-pay
 * - Scottish Tax: https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/
 * - CGT: https://www.gov.uk/capital-gains-tax/rates
 */

import {
  UK_DATASETS,
  defaultUkTaxYear,
  taxClockNow,
  ukDatasetYears,
} from './tax-years.mjs';

/** Tax years with a dataset. Keep in step with UK_DATASETS (tax-years.mjs). */
export type UkTaxYear = '2026/27';

export interface UkIncomeTax {
  personalAllowance: number;
  /** PA starts tapering here -- reduced by £1 for every £2 above */
  paTaperThreshold: number;
  /** PA fully eliminated at this income level */
  paTaperLimit: number;
  /** rUK bands on taxable income (above the personal allowance) */
  bands: { from: number; rate: number; name: 'Basic' | 'Higher' | 'Additional' }[];
}

export interface UkNi {
  primaryThreshold: number;
  upperEarningsLimit: number;
  /** Employee main rate */
  mainRate: number;
  /** Employee rate above UEL */
  upperRate: number;
}

export interface UkEmployerNi {
  /** Secondary threshold -- employer NI starts above this */
  secondaryThreshold: number;
  rate: number;
}

export interface UkStudentLoans {
  plan1: { threshold: number; rate: number };
  plan2: { threshold: number; rate: number };
  plan4: { threshold: number; rate: number };
  plan5: { threshold: number; rate: number };
  postgrad: { threshold: number; rate: number };
}

export interface UkCgt {
  /** Annual exempt amount */
  annualExempt: number;
  basicRate: number;
  higherRate: number;
  /** Basic rate band (above personal allowance) for determining the CGT rate */
  basicRateBand: number;
  source: string;
}

export interface UkScottishTax {
  /** Thresholds are TAXABLE income above the personal allowance */
  bands: {
    from: number;
    rate: number;
    name: 'Starter' | 'Basic' | 'Intermediate' | 'Higher' | 'Advanced' | 'Top';
  }[];
}

export interface UkYearRates {
  year: UkTaxYear;
  /** ISO date every figure in this year was last verified (from UK_DATASETS) */
  lastChecked: string;
  incomeTax: UkIncomeTax;
  ni: UkNi;
  employerNi: UkEmployerNi;
  statePension: { weeklyRate: number; source: string };
  studentLoans: UkStudentLoans;
  cgt: UkCgt;
  scottishTax: UkScottishTax;
  /** Pension annual allowance (before any taper), per tax year */
  pensionAnnualAllowance: number;
  /**
   * Adjusted net income limit for Tax-Free Childcare and working-parent free
   * childcare hours: you cannot claim if either parent's expected ANI is over it.
   */
  childcareAniLimit: number;
  /** Automatic-enrolment "qualifying earnings" band, a year before tax: what scheme percentages are worked out on */
  qualifyingEarnings: { lower: number; upper: number };
  /** Personal Savings Allowance (tax-free savings interest) by income tax band, £ a year */
  personalSavingsAllowance: { basic: number; higher: number; additional: number };
  /** ISA allowance and Lifetime ISA limits */
  isa: {
    /** Total you can pay into ISAs in the tax year */
    annualAllowance: number;
    /** Most you can pay into a Lifetime ISA in the tax year (counts towards annualAllowance) */
    lisaAnnualLimit: number;
    /** Highest purchase price of a first home that a Lifetime ISA withdrawal can fund without the full charge */
    lisaPropertyCap: number;
  };
}

/* ── Per-year datasets ─────────────────────────────────────── */

export const UK_RATES_BY_YEAR: Record<UkTaxYear, UkYearRates> = {
  '2026/27': {
    year: '2026/27',
    lastChecked: UK_DATASETS['2026/27'].lastChecked,
    incomeTax: {
      personalAllowance: 12_570,
      paTaperThreshold: 100_000,
      paTaperLimit: 125_140,
      bands: [
        { from: 0, rate: 0.20, name: 'Basic' },
        { from: 37_700, rate: 0.40, name: 'Higher' },
        { from: 125_140, rate: 0.45, name: 'Additional' },
      ],
    },
    // Class 1 employee: 8% main rate from April 2024
    ni: { primaryThreshold: 12_570, upperEarningsLimit: 50_270, mainRate: 0.08, upperRate: 0.02 },
    // Class 1 employer: 15% above £5,000 from April 2025
    employerNi: { secondaryThreshold: 5_000, rate: 0.15 },
    // Full new State Pension 2026/27 (4.8% triple-lock uprating, April 2026)
    statePension: { weeklyRate: 241.30, source: 'https://www.gov.uk/new-state-pension/what-youll-get' },
    // Thresholds from 6 April 2026. Plan 5 threshold £25,000. Plan 5 repayments start the April
    // after you finish or leave the course. The first borrowers became liable in April 2026
    // (shorter courses and early leavers); April 2027 for a three-year degree started in autumn
    // 2023. Source: GOV.UK, Student Loans in England: financial year 2025-26 ("The first borrowers
    // with Repayment Plan 5 loans became liable to repay in April 2026"), accessed 2026-11-16:
    // https://www.gov.uk/government/statistics/student-loans-in-england-2025-to-2026/income-contingent-student-loan-repayment-plans-interest-rates-and-calculations-england
    // (CONTENT-24; when-you-start-repaying: https://www.gov.uk/repaying-your-student-loan/when-you-start-repaying).
    studentLoans: {
      plan1: { threshold: 26_900, rate: 0.09 },
      plan2: { threshold: 29_385, rate: 0.09 },
      plan4: { threshold: 33_795, rate: 0.09 },
      plan5: { threshold: 25_000, rate: 0.09 },
      postgrad: { threshold: 21_000, rate: 0.06 },
    },
    // Rates from 30 October 2024, unified across asset types
    cgt: {
      annualExempt: 3_000,
      basicRate: 0.18,
      higherRate: 0.24,
      basicRateBand: 37_700,
      source: 'https://www.gov.uk/capital-gains-tax/rates',
    },
    // Scottish Budget 13 Jan 2026: Starter and Basic band tops rose 7.4%;
    // Higher/Advanced/Top thresholds and all rates unchanged.
    scottishTax: {
      bands: [
        { from: 0, rate: 0.19, name: 'Starter' },
        { from: 3_967, rate: 0.20, name: 'Basic' },
        { from: 16_956, rate: 0.21, name: 'Intermediate' },
        { from: 31_092, rate: 0.42, name: 'Higher' },
        { from: 62_430, rate: 0.45, name: 'Advanced' },
        { from: 125_140, rate: 0.48, name: 'Top' },
      ],
    },
    // "This is £60,000 this tax year." https://www.gov.uk/tax-on-your-private-pension/annual-allowance
    // (accessed 2026-11-13)
    pensionAnnualAllowance: 60_000,
    // "you or your partner's expected adjusted net income ... is over £100,000 for the current tax year"
    // https://www.gov.uk/tax-free-childcare/check-if-youre-eligible (accessed 2026-11-13); the same limit
    // applies to free childcare for working parents: https://www.gov.uk/check-eligible-free-childcare-if-youre-working
    childcareAniLimit: 100_000,
    // "between £6,240 and £50,270 a year before tax" (the band the 8% minimum total contribution is
    // worked out on) https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay
    // (accessed 2026-11-16; the page names no tax year, and these are the same figures as 2025/26)
    qualifyingEarnings: { lower: 6_240, upper: 50_270 },
    // Basic rate £1,000, higher rate £500, additional rate £0 (frozen since 2016)
    // https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free (accessed 2026-11-16)
    personalSavingsAllowance: { basic: 1_000, higher: 500, additional: 0 },
    isa: {
      // "In the 2026 to 2027 tax year, the maximum you can save in ISAs is £20,000"
      // https://www.gov.uk/individual-savings-accounts (accessed 2026-11-16)
      annualAllowance: 20_000,
      // "You can put in up to £4,000 each year, until you're 50." https://www.gov.uk/lifetime-isa
      // (accessed 2026-11-16)
      lisaAnnualLimit: 4_000,
      // "the purchase price of the residential property is £450,000 or less"
      // https://www.gov.uk/guidance/lifetime-isa-withdrawals-for-a-first-time-residential-purchase
      // (accessed 2026-11-16). HMRC's tax information note (28 Oct 2026,
      // https://www.gov.uk/government/publications/lifetime-isa-withdrawal-charge) says that from
      // 29 Oct 2026 a withdrawal for a purchase above the cap carries a 20% charge (the ordinary
      // charge is 25%). That is not modelled here.
      lisaPropertyCap: 450_000,
    },
  },
};

/* ── Year helpers ──────────────────────────────────────────── */

/** Years with data, ascending (from the manifest; rates-freshness.test.ts keeps both in step). */
export const UK_TAX_YEARS = ukDatasetYears() as UkTaxYear[];

export function isUkTaxYear(value: unknown): value is UkTaxYear {
  return typeof value === 'string' && (UK_TAX_YEARS as string[]).includes(value);
}

/** Default UK year on a date: the tax year containing it, when it has data. */
export function defaultUkTaxYearFor(date: Date): UkTaxYear {
  return defaultUkTaxYear(date, UK_TAX_YEARS) as UkTaxYear;
}

/** Default year when this module was evaluated (build time for static pages). */
export const UK_DEFAULT_TAX_YEAR: UkTaxYear = defaultUkTaxYearFor(taxClockNow());

/** All rates for a year (the default year when omitted). */
export function getUkRates(year: UkTaxYear = UK_DEFAULT_TAX_YEAR): UkYearRates {
  return UK_RATES_BY_YEAR[year];
}

/* ── Stable aliases (default year) ─────────────────────────── */
/*
 * Every export that existed before the multi-year change stays, pointing at
 * the default year. New code should call getUkRates(year).
 */

const DEFAULT_RATES = UK_RATES_BY_YEAR[UK_DEFAULT_TAX_YEAR];

export const UK_TAX_YEAR: string = UK_DEFAULT_TAX_YEAR;
export const UK_RATES_LAST_CHECKED = DEFAULT_RATES.lastChecked;
export const UK_INCOME_TAX = DEFAULT_RATES.incomeTax;
export const UK_NI = DEFAULT_RATES.ni;
export const UK_EMPLOYER_NI = DEFAULT_RATES.employerNi;
export const UK_STATE_PENSION = DEFAULT_RATES.statePension;
export const UK_STUDENT_LOANS = DEFAULT_RATES.studentLoans;
export const UK_CGT = DEFAULT_RATES.cgt;
export const UK_SCOTTISH_TAX = DEFAULT_RATES.scottishTax;
/** Pension annual allowance (£60,000 in 2026/27), default year */
export const UK_PENSION_ANNUAL_ALLOWANCE = DEFAULT_RATES.pensionAnnualAllowance;
/** £100,000 adjusted-net-income limit for Tax-Free Childcare / free childcare hours, default year */
export const UK_CHILDCARE_ANI_LIMIT = DEFAULT_RATES.childcareAniLimit;
/** Auto-enrolment qualifying earnings band (£6,240 to £50,270 in 2026/27), default year */
export const UK_QUALIFYING_EARNINGS = DEFAULT_RATES.qualifyingEarnings;
/** Personal Savings Allowance by band (£1,000 / £500 / £0), default year */
export const UK_PERSONAL_SAVINGS_ALLOWANCE = DEFAULT_RATES.personalSavingsAllowance;
/** ISA allowance (£20,000) and Lifetime ISA limits, default year */
export const UK_ISA = DEFAULT_RATES.isa;

/* ── Not tied to a tax year ────────────────────────────────── */

/**
 * @deprecated Use src/lib/uk-pension-ages.ts (W1-SAVE, Nov 2026), which holds
 * the pension-age rules with dates. Kept so existing importers and
 * tax-rates.test.ts keep working; remove once nothing imports it.
 *
 * Legislated pension age milestones -- stable facts, not annual rates.
 * - Normal minimum pension age (private/workplace pension access):
 *   https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age
 * - State Pension age: https://www.gov.uk/state-pension-age
 */
export const UK_PENSION_AGES = {
  /** Earliest age most private/workplace pensions can be accessed */
  normalMinimumPensionAge: 55,
  /** Rises to 57 on 6 April 2028 (Finance Act 2022) */
  normalMinimumPensionAgeFrom2028: 57,
  /** Current State Pension age */
  statePensionAge: 66,
  /** Rises to 67 by April 2028 (Pensions Act 2014 phased increase) */
  statePensionAgeFrom2028: 67,
};

/**
 * Stamp Duty Land Tax (SDLT), residential, from 1 April 2025. SDLT changes on
 * announced dates, not on 6 April, so it is not year-keyed.
 */
export const UK_SDLT = {
  /** Standard residential rates */
  standard: [
    { from: 0, to: 125_000, rate: 0 },
    { from: 125_000, to: 250_000, rate: 0.02 },
    { from: 250_000, to: 925_000, rate: 0.05 },
    { from: 925_000, to: 1_500_000, rate: 0.10 },
    { from: 1_500_000, to: Infinity, rate: 0.12 },
  ],
  /** First-time buyer rates (property must be ≤ £500,000) */
  firstTimeBuyer: [
    { from: 0, to: 300_000, rate: 0 },
    { from: 300_000, to: 500_000, rate: 0.05 },
  ],
  /** Price cap for first-time buyer relief */
  firstTimeBuyerCap: 500_000,
  /** Additional property surcharge (from 31 Oct 2024) */
  additionalSurcharge: 0.05,
  /** Non-UK resident surcharge (England and Northern Ireland) */
  nonResidentSurcharge: 0.02,
  /** The non-resident surcharge applies only from this price (freehold; leasehold: premium) */
  nonResidentMinPrice: 40_000,
  source: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates',
};

/**
 * SDLT 2% surcharge for non-UK residents buying residential property in
 * England or Northern Ireland. It applies to a freehold bought for £40,000 or
 * more (leasehold: premium of £40,000 or more, or relevant rent of £1,000 or
 * more). https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents
 * and https://www.gov.uk/stamp-duty-land-tax/residential-property-rates (accessed 2026-11-13)
 */
export const SDLT_NON_RESIDENT_SURCHARGE = UK_SDLT.nonResidentSurcharge;
/** Price from which the non-resident surcharge applies (see SDLT_NON_RESIDENT_SURCHARGE) */
export const SDLT_NON_RESIDENT_MIN_PRICE = UK_SDLT.nonResidentMinPrice;

/** Mortgage lending (loan-to-income convention) -- a market convention, not a tax rate. */
export const UK_MORTGAGE = {
  /**
   * Typical lender cap on borrowing as a multiple of gross income.
   * The Bank of England FPC's loan-to-income flow limit keeps new mortgages at
   * or above 4.5x income to 15% of lending. Since 28 Oct 2026 that 15% is an
   * aggregate, market-wide limit: the firm-level cap was removed, so an
   * individual lender may exceed 15% while the market stays within it
   * (PRA PS19/26 and the matching FCA guidance, published 14 Oct 2026:
   * https://www.bankofengland.co.uk/prudential-regulation/publication/2026/october/high-loan-to-income-lending-policy-statement,
   * accessed 2026-11-13). Most lenders still cap around 4.5x and stress-test
   * affordability on top.
   */
  incomeMultipleCap: 4.5,
};

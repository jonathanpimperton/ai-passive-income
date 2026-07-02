/**
 * Central UK tax rates module — THE single source for all UK tax/benefit values.
 *
 * When HMRC publishes new rates (typically in the Budget/Autumn Statement),
 * update this one file. All calculators import from here.
 *
 * Sources:
 * - Income Tax: https://www.gov.uk/income-tax-rates
 * - National Insurance: https://www.gov.uk/national-insurance-rates-letters
 * - State Pension: https://www.gov.uk/new-state-pension/what-youll-get
 * - Student Loans: https://www.gov.uk/repaying-your-student-loan/what-you-pay
 * - Scottish Tax: https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/
 */

export const UK_TAX_YEAR = '2026/27';
export const UK_RATES_LAST_CHECKED = '2026-07-02';

/* ── Income Tax ──────────────────────────────────────────── */
export const UK_INCOME_TAX = {
  personalAllowance: 12_570,
  /** PA starts tapering at £100K — reduced by £1 for every £2 above this */
  paTaperThreshold: 100_000,
  /** PA fully eliminated at this income level */
  paTaperLimit: 125_140,
  bands: [
    { from: 0, rate: 0.20, name: 'Basic' as const },
    { from: 37_700, rate: 0.40, name: 'Higher' as const },
    { from: 125_140, rate: 0.45, name: 'Additional' as const },
  ],
};

/* ── National Insurance (Class 1, employed) ──────────────── */
export const UK_NI = {
  primaryThreshold: 12_570,
  upperEarningsLimit: 50_270,
  /** Employee main rate (8% from April 2024) */
  mainRate: 0.08,
  /** Employee rate above UEL */
  upperRate: 0.02,
};

/* ── Employer National Insurance (Class 1) ────────────────── */
export const UK_EMPLOYER_NI = {
  /** Secondary threshold — employer NI starts above this (lowered from £9,100 in April 2025) */
  secondaryThreshold: 5_000,
  /** Employer rate (raised from 13.8% in April 2025) */
  rate: 0.15,
};

/* ── State Pension ───────────────────────────────────────── */
export const UK_STATE_PENSION = {
  /** Full new State Pension weekly rate 2026/27 (4.8% triple-lock uprating, April 2026) */
  weeklyRate: 241.30,
  source: 'https://www.gov.uk/new-state-pension/what-youll-get',
};

/* ── Student Loans (thresholds from 6 April 2026) ────────── */
export const UK_STUDENT_LOANS = {
  plan1: { threshold: 26_900, rate: 0.09 },
  plan2: { threshold: 29_385, rate: 0.09 },
  plan4: { threshold: 33_795, rate: 0.09 },
  /** Plan 5 frozen at £25,000 — first-ever repayments began 6 April 2026 */
  plan5: { threshold: 25_000, rate: 0.09 },
  postgrad: { threshold: 21_000, rate: 0.06 },
};

/* ── Stamp Duty Land Tax (SDLT) — Residential (from 1 April 2025) ── */
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
  source: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates',
};

/* ── Capital Gains Tax (UK, 2026/27) ──────────────────────── */
export const UK_CGT = {
  /** Annual exempt amount */
  annualExempt: 3_000,
  /** Rates from 30 October 2024 — unified across all asset types */
  basicRate: 0.18,
  higherRate: 0.24,
  /** Basic rate band (above personal allowance) for determining CGT rate */
  basicRateBand: 37_700,
  source: 'https://www.gov.uk/capital-gains-tax/rates',
};

/* ── Scottish Income Tax (for residents of Scotland) ─────── */
/**
 * 2026/27 bands (Scottish Budget, 13 Jan 2026). Thresholds are TAXABLE income
 * above the personal allowance. Starter and Basic band tops rose 7.4%;
 * Higher/Advanced/Top thresholds and all rates unchanged.
 */
export const UK_SCOTTISH_TAX = {
  bands: [
    { from: 0, rate: 0.19, name: 'Starter' as const },
    { from: 3_967, rate: 0.20, name: 'Basic' as const },
    { from: 16_956, rate: 0.21, name: 'Intermediate' as const },
    { from: 31_092, rate: 0.42, name: 'Higher' as const },
    { from: 62_430, rate: 0.45, name: 'Advanced' as const },
    { from: 125_140, rate: 0.48, name: 'Top' as const },
  ],
};

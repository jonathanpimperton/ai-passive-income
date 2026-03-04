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
 * - Scottish Tax: https://www.gov.scot/publications/scottish-income-tax-2025-2026/
 */

export const UK_TAX_YEAR = '2025/26';
export const UK_RATES_LAST_CHECKED = '2026-03-04';

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

/* ── State Pension ───────────────────────────────────────── */
export const UK_STATE_PENSION = {
  /** Full new State Pension weekly rate 2025/26 */
  weeklyRate: 230.25,
  source: 'https://www.gov.uk/new-state-pension/what-youll-get',
};

/* ── Student Loans ───────────────────────────────────────── */
export const UK_STUDENT_LOANS = {
  plan1: { threshold: 26_065, rate: 0.09 },
  plan2: { threshold: 28_470, rate: 0.09 },
  plan4: { threshold: 32_745, rate: 0.09 },
  plan5: { threshold: 25_000, rate: 0.09 },
  postgrad: { threshold: 21_000, rate: 0.06 },
};

/* ── Scottish Income Tax (for residents of Scotland) ─────── */
export const UK_SCOTTISH_TAX = {
  bands: [
    { from: 0, rate: 0.19, name: 'Starter' as const },
    { from: 2_306, rate: 0.20, name: 'Basic' as const },
    { from: 13_991, rate: 0.21, name: 'Intermediate' as const },
    { from: 31_092, rate: 0.42, name: 'Higher' as const },
    { from: 62_430, rate: 0.45, name: 'Advanced' as const },
    { from: 125_140, rate: 0.48, name: 'Top' as const },
  ],
};

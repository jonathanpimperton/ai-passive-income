/**
 * Central US tax rates module — THE single source for all US federal tax values.
 *
 * When the IRS publishes new inflation adjustments (typically October for the
 * following tax year), update this one file. The calculator imports from here.
 *
 * Sources:
 * - Federal brackets & deductions: https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2025
 * - Social Security wage base: https://www.ssa.gov/oact/cola/cbb.html
 * - 401(k) limits: https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits
 * - Medicare thresholds: https://www.irs.gov/taxtopics/tc751
 */

export const US_TAX_YEAR = '2025';
export const US_RATES_LAST_CHECKED = '2026-03-06';

export type FilingStatus = 'single' | 'married' | 'head';

/* ── Federal Income Tax Brackets (2025) ───────────────────── */
/** Each bracket: [income threshold, marginal rate] */
export const US_BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [
    [0, 0.10], [11_925, 0.12], [48_475, 0.22], [103_350, 0.24],
    [197_300, 0.32], [250_525, 0.35], [626_350, 0.37],
  ],
  married: [
    [0, 0.10], [23_850, 0.12], [96_950, 0.22], [206_700, 0.24],
    [394_600, 0.32], [501_050, 0.35], [751_600, 0.37],
  ],
  head: [
    [0, 0.10], [17_000, 0.12], [64_850, 0.22], [103_350, 0.24],
    [197_300, 0.32], [250_500, 0.35], [626_350, 0.37],
  ],
};

/* ── Standard Deduction (2025) ────────────────────────────── */
export const US_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15_000,
  married: 30_000,
  head: 22_500,
};

/* ── FICA — Social Security ───────────────────────────────── */
export const US_SOCIAL_SECURITY = {
  rate: 0.062,
  wageCap: 176_100,
};

/* ── FICA — Medicare ──────────────────────────────────────── */
export const US_MEDICARE = {
  rate: 0.0145,
  additionalRate: 0.009,
  additionalThreshold: {
    single: 200_000,
    married: 250_000,
    head: 200_000,
  } as Record<FilingStatus, number>,
};

/* ── Capital Gains Tax (2025) ──────────────────────────────── */
export const US_CAPITAL_GAINS = {
  /** Long-term capital gains brackets (held > 1 year) */
  longTerm: {
    single: [
      { from: 0, rate: 0 },
      { from: 48_350, rate: 0.15 },
      { from: 533_400, rate: 0.20 },
    ],
    married: [
      { from: 0, rate: 0 },
      { from: 96_700, rate: 0.15 },
      { from: 600_050, rate: 0.20 },
    ],
    head: [
      { from: 0, rate: 0 },
      { from: 64_750, rate: 0.15 },
      { from: 566_700, rate: 0.20 },
    ],
  } as Record<FilingStatus, { from: number; rate: number }[]>,
  /** Net Investment Income Tax (NIIT) — 3.8% surtax */
  niit: {
    rate: 0.038,
    threshold: {
      single: 200_000,
      married: 250_000,
      head: 200_000,
    } as Record<FilingStatus, number>,
  },
  /** Short-term gains taxed at ordinary income rates (use US_BRACKETS) */
};

/* ── 401(k) ───────────────────────────────────────────────── */
export const US_401K = {
  /** Employee elective deferral limit (under age 50) */
  limit: 23_500,
  /** Catch-up contribution (age 50+) */
  catchUp: 7_500,
};

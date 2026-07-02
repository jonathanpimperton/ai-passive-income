/**
 * Central US tax rates module — THE single source for all US federal tax values.
 *
 * When the IRS publishes new inflation adjustments (typically October for the
 * following tax year), update this one file. The calculator imports from here.
 *
 * Sources:
 * - Federal brackets & deductions (2026, post-OBBBA): https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
 * - Social Security wage base: https://www.irs.gov/taxtopics/tc751 (SSA.gov blocks automated checks)
 * - 401(k) limits: https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
 * - Medicare thresholds: https://www.irs.gov/taxtopics/tc751
 */

export const US_TAX_YEAR = '2026';
export const US_RATES_LAST_CHECKED = '2026-07-02';

export type FilingStatus = 'single' | 'married' | 'head';

/* ── Federal Income Tax Brackets (2026, Rev. Proc. 2025-32) ── */
/** Each bracket: [income threshold, marginal rate] */
export const US_BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [
    [0, 0.10], [12_400, 0.12], [50_400, 0.22], [105_700, 0.24],
    [201_775, 0.32], [256_225, 0.35], [640_600, 0.37],
  ],
  married: [
    [0, 0.10], [24_800, 0.12], [100_800, 0.22], [211_400, 0.24],
    [403_550, 0.32], [512_450, 0.35], [768_700, 0.37],
  ],
  head: [
    [0, 0.10], [17_700, 0.12], [67_450, 0.22], [105_700, 0.24],
    [201_775, 0.32], [256_200, 0.35], [640_600, 0.37],
  ],
};

/* ── Standard Deduction (2026) ────────────────────────────── */
export const US_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16_100,
  married: 32_200,
  head: 24_150,
};

/* ── FICA — Social Security ───────────────────────────────── */
export const US_SOCIAL_SECURITY = {
  rate: 0.062,
  wageCap: 184_500,
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

/* ── Capital Gains Tax (2026, Rev. Proc. 2025-32 §1(h)) ────── */
export const US_CAPITAL_GAINS = {
  /** Long-term capital gains brackets (held > 1 year) */
  longTerm: {
    single: [
      { from: 0, rate: 0 },
      { from: 49_450, rate: 0.15 },
      { from: 545_500, rate: 0.20 },
    ],
    married: [
      { from: 0, rate: 0 },
      { from: 98_900, rate: 0.15 },
      { from: 613_700, rate: 0.20 },
    ],
    head: [
      { from: 0, rate: 0 },
      { from: 66_200, rate: 0.15 },
      { from: 579_600, rate: 0.20 },
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

/* ── 401(k) (2026, IRS Notice 2025-67) ────────────────────── */
export const US_401K = {
  /** Employee elective deferral limit (under age 50) */
  limit: 24_500,
  /** Catch-up contribution (age 50+) */
  catchUp: 8_000,
};

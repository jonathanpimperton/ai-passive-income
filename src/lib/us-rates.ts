/**
 * Central US federal tax rates -- THE single source for every US tax value,
 * keyed by tax year (decision D8, docs/plan-2026-11.md).
 *
 * Two years are live at once from late in a year until mid-April: the old
 * year for filing season and the new year for paychecks. The default year is
 * the calendar year when its data exists (see tax-years.mjs); the US Salary
 * calculator lets the visitor pick either year.
 *
 * Adding a year: copy the latest block, replace EVERY figure from the primary
 * source (IRS Rev. Proc. for brackets/deductions/capital gains, IRS notice for
 * 401(k), SSA for the wage base), cite URL + access date beside it, then add
 * the year to US_DATASETS in tax-years.mjs. Never guess a figure: if a source
 * has not published yet, carry the prior value and set `published: false`
 * (the UI then says "not yet published").
 *
 * Source key used in comments below:
 * [RP25-32] IRS Rev. Proc. 2025-32 (TY2026, post-OBBBA),
 *           https://www.irs.gov/pub/irs-drop/rp-25-32.pdf (accessed 2026-11-12)
 * [RP26-35] IRS Rev. Proc. 2026-35 / IR-2026-133, 5 Nov 2026 (TY2027),
 *           https://www.irs.gov/pub/irs-drop/rp-26-35.pdf and
 *           https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts
 *           (both accessed 2026-11-12)
 * [SSA27]   SSA 2027 COLA fact sheet, https://www.ssa.gov/news/en/cola/factsheets/2027.html
 *           (announced 14 Oct 2026). ssa.gov returns HTTP 403 to automated
 *           fetches, so the figures were confirmed from the fact sheet's search
 *           excerpt and from https://www.journalofaccountancy.com/news/2026/oct/social-security-wage-base-and-cola-announced-for-2027/
 *           (accessed 2026-11-12), which gives $192,300 for 2027 and $184,500 for 2026.
 * [TC751]   IRS Topic 751, https://www.irs.gov/taxtopics/tc751 (FICA rates and
 *           Additional Medicare thresholds; statutory, not indexed)
 * [COLA]    IRS COLA table, https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions
 *           (accessed 2026-11-12: latest year listed is 2026, so no 2027 401(k) limit yet)
 * [N25-67]  IRS Notice 2025-67 (2026 401(k)/IRA limits),
 *           https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
 * [OBBBA]   26 U.S.C. 225 (qualified overtime, https://www.law.cornell.edu/uscode/text/26/225)
 *           and 151(d)(5)(C) (senior deduction, https://www.law.cornell.edu/uscode/text/26/151);
 *           Schedule 1-A (Form 1040) 2025, https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf;
 *           https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors
 *           (all accessed 2026-11-12). Fixed dollar amounts for tax years 2025-2028.
 */

import {
  US_DATASETS,
  defaultUsTaxYear,
  taxClockNow,
  usDatasetYears,
} from './tax-years.mjs';

export type FilingStatus = 'single' | 'married' | 'head';

/** Tax years with a dataset. Keep in step with US_DATASETS (tax-years.mjs). */
export type UsTaxYear = 2026 | 2027;

/** [taxable-income threshold, marginal rate] */
export type UsBracket = [number, number];

export interface UsCapitalGains {
  /** Long-term capital gains brackets (held > 1 year), on taxable income */
  longTerm: Record<FilingStatus, { from: number; rate: number }[]>;
  /** Net Investment Income Tax (NIIT) -- 3.8% surtax; thresholds are statutory (not indexed) */
  niit: { rate: number; threshold: Record<FilingStatus, number> };
}

export interface Us401k {
  /** Employee elective deferral limit (under age 50) */
  limit: number;
  /** Catch-up contribution (age 50+) */
  catchUp: number;
  /** Higher catch-up for ages 60-63 */
  catchUp60to63: number;
  /** false = the IRS has not published this year's limits; the values are carried from the prior year */
  published: boolean;
}

export interface UsObbbaDeductions {
  /** Qualified overtime premium deduction, 26 U.S.C. 225 */
  overtime: {
    cap: Record<FilingStatus, number>;
    phaseOutStart: Record<FilingStatus, number>;
    /** Reduced by this many dollars for each FULL $1,000 of MAGI above the start (Schedule 1-A lines 16-21) */
    reductionPerThousand: number;
  };
  /** Enhanced deduction for seniors (65+), 26 U.S.C. 151(d)(5)(C) */
  senior: {
    /** Per qualifying individual */
    perPerson: number;
    phaseOutStart: Record<FilingStatus, number>;
    /** Each person's amount is reduced by this share of MAGI above the start */
    phaseOutRate: number;
  };
}

export interface UsYearRates {
  year: UsTaxYear;
  /** ISO date every figure in this year was last verified (from US_DATASETS) */
  lastChecked: string;
  brackets: Record<FilingStatus, UsBracket[]>;
  standardDeduction: Record<FilingStatus, number>;
  /** Additional standard deduction per person aged 65+ (or blind), 26 U.S.C. 63(f) */
  additionalStandardDeduction65: { married: number; unmarried: number };
  socialSecurity: { rate: number; wageCap: number };
  medicare: { rate: number; additionalRate: number; additionalThreshold: Record<FilingStatus, number> };
  capitalGains: UsCapitalGains;
  retirement401k: Us401k;
  /** OBBBA deductions in force this year, or null outside 2025-2028 */
  obbba: UsObbbaDeductions | null;
}

/* ── Shared statutory values (not inflation-indexed) ───────── */

/** Additional Medicare 0.9% thresholds [TC751] */
const ADDITIONAL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000,
  married: 250_000,
  head: 200_000,
};

/** NIIT thresholds (26 U.S.C. 1411, not indexed) */
const NIIT_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000,
  married: 250_000,
  head: 200_000,
};

/** OBBBA deductions: identical dollar amounts for 2025-2028 [OBBBA] */
const OBBBA_2025_2028: UsObbbaDeductions = {
  overtime: {
    cap: { single: 12_500, married: 25_000, head: 12_500 },
    phaseOutStart: { single: 150_000, married: 300_000, head: 150_000 },
    reductionPerThousand: 100,
  },
  senior: {
    perPerson: 6_000,
    phaseOutStart: { single: 75_000, married: 150_000, head: 75_000 },
    phaseOutRate: 0.06,
  },
};

/* ── Per-year datasets ─────────────────────────────────────── */

export const US_RATES_BY_YEAR: Record<UsTaxYear, UsYearRates> = {
  2026: {
    year: 2026,
    lastChecked: US_DATASETS[2026].lastChecked,
    // [RP25-32] Sec. 4.01, Tables 1-3. HoH 32% starts at $201,750 (the
    // single-filer $201,775 was wrongly used here before Nov 2026).
    brackets: {
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
        [201_750, 0.32], [256_200, 0.35], [640_600, 0.37],
      ],
    },
    // [RP25-32] Sec. 4.14(1)
    standardDeduction: { single: 16_100, married: 32_200, head: 24_150 },
    // [RP25-32] Sec. 4.14(3): $1,650; $2,050 if unmarried
    additionalStandardDeduction65: { married: 1_650, unmarried: 2_050 },
    // Wage base $184,500 [TC751; SSA27 sources quote it as the 2026 figure]
    socialSecurity: { rate: 0.062, wageCap: 184_500 },
    medicare: { rate: 0.0145, additionalRate: 0.009, additionalThreshold: ADDITIONAL_MEDICARE_THRESHOLD },
    capitalGains: {
      // [RP25-32] Sec. 4.03: maximum zero-rate / maximum 15% amounts
      longTerm: {
        single: [{ from: 0, rate: 0 }, { from: 49_450, rate: 0.15 }, { from: 545_500, rate: 0.20 }],
        married: [{ from: 0, rate: 0 }, { from: 98_900, rate: 0.15 }, { from: 613_700, rate: 0.20 }],
        head: [{ from: 0, rate: 0 }, { from: 66_200, rate: 0.15 }, { from: 579_600, rate: 0.20 }],
      },
      niit: { rate: 0.038, threshold: NIIT_THRESHOLD },
    },
    // [N25-67] and [COLA]: $24,500; catch-up (50+) $8,000; higher catch-up for
    // ages 60-63 $11,250 (https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500,
    // accessed 2026-11-12)
    retirement401k: { limit: 24_500, catchUp: 8_000, catchUp60to63: 11_250, published: true },
    obbba: OBBBA_2025_2028,
  },

  2027: {
    year: 2027,
    lastChecked: US_DATASETS[2027].lastChecked,
    // [RP26-35] Sec. 3.01, Tables 1-3
    brackets: {
      single: [
        [0, 0.10], [12_800, 0.12], [52_025, 0.22], [109_125, 0.24],
        [208_325, 0.32], [264_550, 0.35], [661_375, 0.37],
      ],
      married: [
        [0, 0.10], [25_600, 0.12], [104_050, 0.22], [218_250, 0.24],
        [416_650, 0.32], [529_100, 0.35], [793_650, 0.37],
      ],
      head: [
        [0, 0.10], [18_250, 0.12], [69_650, 0.22], [109_100, 0.24],
        [208_300, 0.32], [264_550, 0.35], [661_350, 0.37],
      ],
    },
    // [RP26-35] Sec. 3.15(1)
    standardDeduction: { single: 16_600, married: 33_200, head: 24_925 },
    // [RP26-35] Sec. 3.15(3): $1,700; $2,100 if unmarried
    additionalStandardDeduction65: { married: 1_700, unmarried: 2_100 },
    // [SSA27]: 2027 wage base $192,300; OASDI rate 6.2% unchanged
    socialSecurity: { rate: 0.062, wageCap: 192_300 },
    medicare: { rate: 0.0145, additionalRate: 0.009, additionalThreshold: ADDITIONAL_MEDICARE_THRESHOLD },
    capitalGains: {
      // [RP26-35] Sec. 3.03
      longTerm: {
        single: [{ from: 0, rate: 0 }, { from: 51_050, rate: 0.15 }, { from: 563_200, rate: 0.20 }],
        married: [{ from: 0, rate: 0 }, { from: 102_100, rate: 0.15 }, { from: 633_600, rate: 0.20 }],
        head: [{ from: 0, rate: 0 }, { from: 68_350, rate: 0.15 }, { from: 598_400, rate: 0.20 }],
      },
      niit: { rate: 0.038, threshold: NIIT_THRESHOLD },
    },
    // NOT YET PUBLISHED: the IRS 2027 401(k) notice was not out on 2026-11-12
    // [COLA]. These are the 2026 values, carried; replace them when the notice
    // publishes (docs/freshness-calendar.md, item us-irs-401k-2027).
    retirement401k: { limit: 24_500, catchUp: 8_000, catchUp60to63: 11_250, published: false },
    obbba: OBBBA_2025_2028,
  },
};

/* ── Year helpers ──────────────────────────────────────────── */

/** Years with data, ascending (from the manifest; rates-freshness.test.ts keeps both in step). */
export const US_TAX_YEARS = usDatasetYears() as UsTaxYear[];

export function isUsTaxYear(value: unknown): value is UsTaxYear {
  return typeof value === 'number' && (US_TAX_YEARS as number[]).includes(value);
}

/** Default year on a date: the calendar year when it has data (see tax-years.mjs). */
export function defaultUsTaxYearFor(date: Date): UsTaxYear {
  return defaultUsTaxYear(date, US_TAX_YEARS) as UsTaxYear;
}

/**
 * Default year when this module was evaluated: build time for static pages,
 * page-load time in the browser. Islands that server-render year-dependent
 * figures must reconcile after hydration (SalaryCalc does).
 */
export const US_DEFAULT_TAX_YEAR: UsTaxYear = defaultUsTaxYearFor(taxClockNow());

/** All rates for a year (the default year when omitted). */
export function getUsRates(year: UsTaxYear = US_DEFAULT_TAX_YEAR): UsYearRates {
  return US_RATES_BY_YEAR[year];
}

/**
 * Visitor-facing name for a year. The newest year with data is the one
 * paychecks use; earlier years are the ones people file returns for.
 */
export function usTaxYearLabel(year: UsTaxYear): string {
  const newest = US_TAX_YEARS[US_TAX_YEARS.length - 1];
  return year === newest ? `${year} paychecks` : `${year} tax year (filing in ${year + 1})`;
}

/** Labels for every year with data, for selectors and page templates. */
export const TAX_YEAR_LABELS = Object.fromEntries(
  US_TAX_YEARS.map((y) => [y, usTaxYearLabel(y)]),
) as Record<UsTaxYear, string>;

/* ── Stable aliases (default year) ─────────────────────────── */
/*
 * Every export that existed before the multi-year change stays, pointing at
 * the default year, so existing importers keep compiling and follow the
 * 1 January switch automatically. New code should call getUsRates(year).
 */

const DEFAULT_RATES = US_RATES_BY_YEAR[US_DEFAULT_TAX_YEAR];

export const US_TAX_YEAR = String(US_DEFAULT_TAX_YEAR);
export const US_RATES_LAST_CHECKED = DEFAULT_RATES.lastChecked;
export const US_BRACKETS = DEFAULT_RATES.brackets;
export const US_STANDARD_DEDUCTION = DEFAULT_RATES.standardDeduction;
export const US_SOCIAL_SECURITY = DEFAULT_RATES.socialSecurity;
export const US_MEDICARE = DEFAULT_RATES.medicare;
export const US_CAPITAL_GAINS = DEFAULT_RATES.capitalGains;
export const US_401K = DEFAULT_RATES.retirement401k;

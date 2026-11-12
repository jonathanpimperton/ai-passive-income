/**
 * Market interest rates used as calculator DEFAULTS -- the single source.
 *
 * Every value is a published benchmark with the date it describes, the date
 * we checked it, and the URL it came from. Calculators (mortgage payment,
 * mortgage affordability, rent vs buy, loan amortization) take their default
 * rate from here, so the four tools can never disagree again (CALC-UX-A-09,
 * MATH-US-F04/14).
 *
 * These are starting points, not quotes: every tool lets the user type their
 * own rate. They are dated facts, so they age. Re-check them at least monthly
 * (Freddie Mac publishes PMMS every Thursday; the Bank of England publishes
 * quoted mortgage rates monthly; the ECB publishes MFI interest rate
 * statistics monthly) and update `MARKET_RATES_CHECKED` when you do.
 *
 * Region follows the calculators' display currency: USD -> 'us', GBP -> 'uk',
 * EUR -> 'eur' (there is no exchange-rate conversion anywhere).
 */

export type RateRegion = 'us' | 'uk' | 'eur';

export interface MarketRate {
  /** Annual rate in percent, e.g. 7.11 means 7.11% */
  value: number;
  /** What the figure measures, in plain English */
  label: string;
  /** ISO date (or month end) the figure describes */
  asOf: string;
  /** Publisher and series */
  source: string;
  /** Short publisher name for UI hints, e.g. "Freddie Mac" */
  shortSource: string;
  url: string;
  /** ISO date we last read the figure at the source */
  checked: string;
}

/**
 * Date the whole table was last re-verified against its sources.
 * Keep this exact name and the 'YYYY-MM-DD' format: W1-TAX's freshness
 * calendar reads it (and adds 90 days) and its test fails if it changes.
 * Only move the date when you have re-read the primary sources that day.
 */
export const MARKET_RATES_CHECKED = '2026-11-12';

/**
 * US: Freddie Mac Primary Mortgage Market Survey (PMMS), week of 12 Nov 2026.
 * 30-year 7.11%, 15-year 6.45% (previous week 7.18% / 6.57%).
 */
const US_30YR: MarketRate = {
  value: 7.11,
  label: '30-year fixed mortgage, US weekly average',
  asOf: '2026-11-12',
  source: 'Freddie Mac Primary Mortgage Market Survey (PMMS)',
  shortSource: 'Freddie Mac',
  url: 'https://www.freddiemac.com/pmms',
  checked: '2026-11-12',
};

const US_15YR: MarketRate = {
  value: 6.45,
  label: '15-year fixed mortgage, US weekly average',
  asOf: '2026-11-12',
  source: 'Freddie Mac Primary Mortgage Market Survey (PMMS)',
  shortSource: 'Freddie Mac',
  url: 'https://www.freddiemac.com/pmms',
  checked: '2026-11-12',
};

/**
 * UK: Bank of England. Bank Rate rose from 3.75% to 4.00% at the MPC meeting
 * ending 4 Nov 2026 (effective 5 Nov 2026). Quoted mortgage rates are the
 * Bank's monthly averages of advertised rates (Bankstats series IUMBV34,
 * IUMBV42, IUMTLMV), October 2026 -- i.e. before the November rise.
 */
const UK_BANK_RATE: MarketRate = {
  value: 4.0,
  label: 'Bank of England Bank Rate',
  asOf: '2026-11-05',
  source: 'Bank of England, Monetary Policy Report November 2026',
  shortSource: 'Bank of England',
  url: 'https://www.bankofengland.co.uk/monetary-policy-report/2026/November-2026',
  checked: '2026-11-12',
};

const UK_FIXED_2YR_75: MarketRate = {
  value: 5.39,
  label: '2-year fixed mortgage at 75% loan-to-value, UK average quoted rate',
  asOf: '2026-10-31',
  source: 'Bank of England Bankstats, series IUMBV34 (quoted household interest rates)',
  shortSource: 'Bank of England',
  url: 'https://www.bankofengland.co.uk/boeapps/database/FromShowColumns.asp?SeriesCodes=IUMBV34&UsingCodes=Y',
  checked: '2026-11-12',
};

const UK_FIXED_5YR_75: MarketRate = {
  value: 5.19,
  label: '5-year fixed mortgage at 75% loan-to-value, UK average quoted rate',
  asOf: '2026-10-31',
  source: 'Bank of England Bankstats, series IUMBV42 (quoted household interest rates)',
  shortSource: 'Bank of England',
  url: 'https://www.bankofengland.co.uk/boeapps/database/FromShowColumns.asp?SeriesCodes=IUMBV42&UsingCodes=Y',
  checked: '2026-11-12',
};

const UK_REVERT_RATE: MarketRate = {
  value: 6.58,
  label: 'Revert-to (standard variable) mortgage rate, UK average quoted rate',
  asOf: '2026-10-31',
  source: 'Bank of England Bankstats, series IUMTLMV (quoted household interest rates)',
  shortSource: 'Bank of England',
  url: 'https://www.bankofengland.co.uk/boeapps/database/FromShowColumns.asp?SeriesCodes=IUMTLMV&UsingCodes=Y',
  checked: '2026-11-12',
};

/**
 * Euro area: ECB composite cost-of-borrowing indicator for new loans to
 * households for house purchase, September 2026 (press release 2 Nov 2026).
 */
const EUR_HOUSE_PURCHASE: MarketRate = {
  value: 3.62,
  label: 'Composite cost of borrowing for house purchase, euro area',
  asOf: '2026-09-30',
  source: 'European Central Bank, euro area bank interest rate statistics (September 2026)',
  shortSource: 'ECB',
  url: 'https://www.ecb.europa.eu/press/stats/mfi/html/ecb.mir2611~2502265512.en.html',
  checked: '2026-11-12',
};

export const MARKET_RATES = {
  us: { mortgage30: US_30YR, mortgage15: US_15YR },
  uk: {
    bankRate: UK_BANK_RATE,
    fixed2yr75: UK_FIXED_2YR_75,
    fixed5yr75: UK_FIXED_5YR_75,
    revertRate: UK_REVERT_RATE,
  },
  eur: { housePurchase: EUR_HOUSE_PURCHASE },
} as const;

/** Map the calculators' display currency to a rate region. */
export function regionForCurrency(currency: string): RateRegion {
  if (currency === 'GBP') return 'uk';
  if (currency === 'EUR') return 'eur';
  return 'us';
}

/**
 * The benchmark a mortgage tool should start from.
 * - US: the PMMS 15-year average for terms of 15 years or less, else the
 *   30-year average.
 * - UK: the Bank of England's 2-year fixed (75% LTV) quoted rate -- the
 *   benchmark the Bank itself uses when it reports "typical" mortgage rates.
 * - EUR: the ECB composite cost of borrowing for house purchase.
 */
export function defaultMortgageRateInfo(region: RateRegion, termYears?: number): MarketRate {
  if (region === 'uk') return UK_FIXED_2YR_75;
  if (region === 'eur') return EUR_HOUSE_PURCHASE;
  return termYears !== undefined && termYears <= 15 ? US_15YR : US_30YR;
}

/** Default mortgage rate in percent for a region (and optional term). */
export function defaultMortgageRate(region: RateRegion, termYears?: number): number {
  return defaultMortgageRateInfo(region, termYears).value;
}

/** Every rate in the table, flattened (for tests and source listings). */
export function allMarketRates(): MarketRate[] {
  return [US_30YR, US_15YR, UK_BANK_RATE, UK_FIXED_2YR_75, UK_FIXED_5YR_75, UK_REVERT_RATE, EUR_HOUSE_PURCHASE];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Freddie Mac, 12 Nov 2026" / "Bank of England, Oct 2026" attribution for UI
 * hints. Month-end figures describe a whole month, so they print as a month.
 * Locale-independent so server and client render identical text.
 */
export function rateAttribution(rate: MarketRate): string {
  const [y, m, d] = rate.asOf.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const when = d === daysInMonth ? `${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]} ${y}`;
  return `${rate.shortSource}, ${when}`;
}

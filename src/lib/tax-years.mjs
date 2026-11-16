/**
 * Tax-year calendar and dataset manifest -- the ONE place that knows which tax
 * years have rate data and which year is the default on a given date.
 *
 * Plain dependency-free ESM on purpose. Three very different callers share it:
 * - src/lib/us-rates.ts and uk-rates.ts (bundled into pages and islands);
 * - scripts/check-rates-freshness.mjs (plain Node prebuild guard, no TS);
 * - src/lib/rates-freshness.test.ts (vitest, with injected dates).
 *
 * Adding a tax year (the yearly "data drop"):
 * 1. Add the year's values to US_RATES_BY_YEAR (us-rates.ts) or
 *    UK_RATES_BY_YEAR (uk-rates.ts), with a primary-source URL and access date
 *    beside every figure.
 * 2. Add the year to US_DATASETS / UK_DATASETS below with today's date as
 *    lastChecked. rates-freshness.test.ts fails if the manifest and the rate
 *    tables disagree.
 * 3. Update docs/freshness-calendar.md (next due dates).
 *
 * Rules enforced by evaluateRatesFreshness() (D8 in docs/plan-2026-11.md):
 * - The default year for a date is the calendar year (US) or the UK tax year
 *   that contains the date (6 April to 5 April), when its dataset exists.
 * - WARN (loud, exit 0) from WARN_DAYS before a rollover whose new year has no
 *   dataset yet, and when the default dataset is close to MAX_UNCHECKED_DAYS.
 * - FAIL only when the default year for today has no dataset, or the default
 *   dataset was last checked MAX_UNCHECKED_DAYS or more ago.
 */

/** Days of advance warning before a rollover or the unchecked limit. */
export const WARN_DAYS = 60;
/** A default-year dataset unchecked for this many days fails the build. */
export const MAX_UNCHECKED_DAYS = 400;

/**
 * US federal datasets present in src/lib/us-rates.ts (calendar tax years).
 * lastChecked = the date every figure in that year was last verified against
 * its primary source (IRS Rev. Proc. / notices, SSA).
 */
export const US_DATASETS = Object.freeze({
  2026: Object.freeze({ lastChecked: '2026-11-12' }),
  2027: Object.freeze({ lastChecked: '2026-11-12' }),
});

/**
 * UK datasets present in src/lib/uk-rates.ts (tax years run 6 April to 5 April).
 * 2027/28 is deliberately absent until complete primary sources publish
 * (GOV.UK rates pages, Scottish Budget, student loan thresholds).
 */
export const UK_DATASETS = Object.freeze({
  // 2026-11-16: every figure uk-rates.ts holds was re-read from GOV.UK / gov.scot after the
  // 28 Oct 2026 Budget (list in the uk-rates.ts header); nothing had changed mid-year.
  '2026/27': Object.freeze({ lastChecked: '2026-11-16' }),
});

/* ── Dates ──────────────────────────────────────────────────── */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse 'YYYY-MM-DD' as a local calendar date (midnight). Returns null for
 * anything that is not a real calendar date.
 * @param {string} iso
 * @returns {Date | null}
 */
export function parseIsoDate(iso) {
  const m = ISO_DATE.exec(String(iso).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null;
  return date;
}

/**
 * Local calendar date as 'YYYY-MM-DD'.
 * @param {Date} date
 * @returns {string}
 */
export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Whole calendar days from `from` to `to` (negative when `to` is earlier).
 * Uses calendar components, so DST changes never shift the count.
 * @param {Date} from
 * @param {Date} to
 * @returns {number}
 */
export function daysBetween(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * True when an environment flag such as CI=true or WORKERS_CI=1 is set.
 * @param {string | undefined} value
 */
function flagSet(value) {
  if (value === undefined) return false;
  const v = String(value).trim().toLowerCase();
  return v !== '' && v !== '0' && v !== 'false';
}

/**
 * How CALCRUN_TODAY applies in an environment. It is a local rehearsal tool
 * only: in CI (CI) or Cloudflare Workers Builds (WORKERS_CI) it is IGNORED,
 * so a forgotten variable can never bypass the freshness guard or freeze the
 * server-rendered tax year. Throws for a malformed value that would apply.
 * @param {Record<string, string | undefined> | undefined} [env]
 * @returns {{ raw: string | null, date: Date | null, ignored: boolean, reason: string | null }}
 */
export function pinnedToday(env = typeof process !== 'undefined' && process && process.env ? process.env : undefined) {
  const raw = env && env.CALCRUN_TODAY ? String(env.CALCRUN_TODAY) : null;
  if (!raw) return { raw: null, date: null, ignored: false, reason: null };
  if (flagSet(env.CI) || flagSet(env.WORKERS_CI)) {
    const which = flagSet(env.WORKERS_CI) ? 'WORKERS_CI' : 'CI';
    return { raw, date: null, ignored: true, reason: `${which} is set (CI or Cloudflare build)` };
  }
  const date = parseIsoDate(raw);
  if (!date) throw new Error(`CALCRUN_TODAY must be a real date in YYYY-MM-DD form, got "${raw}"`);
  return { raw, date, ignored: false, reason: null };
}

let warnedIgnoredPin = false;

/**
 * Today's date for tax-year purposes. A LOCAL build or script can pin it with
 * CALCRUN_TODAY=YYYY-MM-DD to rehearse a rollover
 * (e.g. `CALCRUN_TODAY=2027-01-02 npm run build`); it is ignored, with a
 * warning, in CI and Cloudflare builds. Browsers have no `process`, so they
 * always use the real date.
 * @returns {Date}
 */
export function taxClockNow() {
  const pin = pinnedToday();
  if (pin.ignored && !warnedIgnoredPin) {
    warnedIgnoredPin = true;
    console.warn(`CALCRUN_TODAY=${pin.raw} IGNORED: ${pin.reason}. Using the real date.`);
  }
  return pin.date ?? new Date();
}

/* ── Tax years ──────────────────────────────────────────────── */

/**
 * US federal tax year in force on a date (the calendar year).
 * @param {Date} date
 * @returns {number}
 */
export function usTaxYearForDate(date) {
  return date.getFullYear();
}

/**
 * UK tax year containing a date, e.g. '2026/27' for 6 Apr 2026 to 5 Apr 2027.
 * @param {Date} date
 * @returns {string}
 */
export function ukTaxYearForDate(date) {
  const y = date.getFullYear();
  const onOrAfterApril6 = date.getMonth() > 3 || (date.getMonth() === 3 && date.getDate() >= 6);
  return ukTaxYearLabel(onOrAfterApril6 ? y : y - 1);
}

/**
 * '2026/27' for 2026.
 * @param {number} startYear
 * @returns {string}
 */
export function ukTaxYearLabel(startYear) {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * First calendar year of a UK tax-year label ('2026/27' -> 2026).
 * @param {string} label
 * @returns {number}
 */
export function ukTaxYearStart(label) {
  return Number(String(label).slice(0, 4));
}

/**
 * Default US year for a date: the calendar year when its data exists,
 * otherwise the latest available year not after it (a stale deploy keeps
 * working with its newest data), otherwise the earliest available year.
 * @param {Date} date
 * @param {readonly number[]} available
 * @returns {number}
 */
export function defaultUsTaxYear(date, available) {
  const want = usTaxYearForDate(date);
  if (available.includes(want)) return want;
  const earlier = available.filter((y) => y <= want);
  return earlier.length ? Math.max(...earlier) : Math.min(...available);
}

/**
 * Default UK year for a date, with the same fallback rules as the US.
 * @param {Date} date
 * @param {readonly string[]} available
 * @returns {string}
 */
export function defaultUkTaxYear(date, available) {
  const want = ukTaxYearForDate(date);
  if (available.includes(want)) return want;
  const start = ukTaxYearStart(want);
  const sorted = [...available].sort((a, b) => ukTaxYearStart(a) - ukTaxYearStart(b));
  const earlier = sorted.filter((y) => ukTaxYearStart(y) <= start);
  return earlier.length ? earlier[earlier.length - 1] : sorted[0];
}

/** @returns {number[]} US years with data, ascending */
export function usDatasetYears(datasets = US_DATASETS) {
  return Object.keys(datasets).map(Number).sort((a, b) => a - b);
}

/** @returns {string[]} UK years with data, ascending */
export function ukDatasetYears(datasets = UK_DATASETS) {
  return Object.keys(datasets).sort((a, b) => ukTaxYearStart(a) - ukTaxYearStart(b));
}

/* ── Freshness evaluation (used by the prebuild guard and its test) ── */

/**
 * @typedef {{ lastChecked: string }} DatasetMeta
 * @typedef {{
 *   errors: string[],
 *   warnings: string[],
 *   usDefault: number | null,
 *   ukDefault: string | null,
 *   today: string,
 * }} FreshnessReport
 */

/**
 * Check the dataset manifests against a date. Pure: no I/O, no clock.
 * @param {Date} today
 * @param {{ us?: Record<string, DatasetMeta>, uk?: Record<string, DatasetMeta> }} [datasets]
 * @param {{ warnDays?: number, maxUncheckedDays?: number }} [options]
 * @returns {FreshnessReport}
 */
export function evaluateRatesFreshness(today, datasets = {}, options = {}) {
  const us = datasets.us ?? US_DATASETS;
  const uk = datasets.uk ?? UK_DATASETS;
  const warnDays = options.warnDays ?? WARN_DAYS;
  const maxDays = options.maxUncheckedDays ?? MAX_UNCHECKED_DAYS;
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];

  /**
   * @param {string} label  e.g. 'US 2027'
   * @param {DatasetMeta} meta
   */
  const checkAge = (label, meta) => {
    const checked = parseIsoDate(meta.lastChecked);
    if (!checked) {
      errors.push(`${label}: lastChecked "${meta.lastChecked}" is not a YYYY-MM-DD date`);
      return;
    }
    const age = daysBetween(checked, today);
    if (age >= maxDays) {
      errors.push(
        `${label} rates were last checked ${age} days ago (${meta.lastChecked}); the limit is ${maxDays}. ` +
          'Re-verify every figure against its primary source and bump lastChecked.',
      );
    } else if (age >= maxDays - warnDays) {
      warnings.push(
        `${label} rates were last checked ${age} days ago (${meta.lastChecked}). ` +
          `Builds FAIL at ${maxDays} days (in ${maxDays - age} days). Re-verify and bump lastChecked.`,
      );
    }
  };

  // US: calendar years, rollover on 1 January.
  const usYear = usTaxYearForDate(today);
  const usMeta = us[String(usYear)];
  if (!usMeta) {
    errors.push(
      `No US federal dataset for tax year ${usYear}, the default year on ${toIsoDate(today)}. ` +
        `Add US_RATES_BY_YEAR[${usYear}] (src/lib/us-rates.ts) from the IRS Rev. Proc. and the SSA wage base, ` +
        'then list it in US_DATASETS (src/lib/tax-years.mjs).',
    );
  } else {
    checkAge(`US ${usYear}`, usMeta);
  }
  const usNext = usYear + 1;
  const usRollover = new Date(usNext, 0, 1);
  const daysToUs = daysBetween(today, usRollover);
  if (daysToUs <= warnDays && !us[String(usNext)]) {
    warnings.push(
      `US tax year ${usNext} starts in ${daysToUs} days (${toIsoDate(usRollover)}) and has no dataset yet. ` +
        `Builds will FAIL from that date. Add US_RATES_BY_YEAR[${usNext}] once the IRS (Rev. Proc., usually Oct/Nov) ` +
        'and SSA (wage base, usually October) publish.',
    );
  }

  // UK: tax years run 6 April to 5 April.
  const ukYear = ukTaxYearForDate(today);
  const ukMeta = uk[ukYear];
  if (!ukMeta) {
    errors.push(
      `No UK dataset for tax year ${ukYear}, the default year on ${toIsoDate(today)}. ` +
        `Add UK_RATES_BY_YEAR['${ukYear}'] (src/lib/uk-rates.ts) from GOV.UK and gov.scot, ` +
        'then list it in UK_DATASETS (src/lib/tax-years.mjs).',
    );
  } else {
    checkAge(`UK ${ukYear}`, ukMeta);
  }
  const ukNextStart = ukTaxYearStart(ukYear) + 1;
  const ukNext = ukTaxYearLabel(ukNextStart);
  const ukRollover = new Date(ukNextStart, 3, 6);
  const daysToUk = daysBetween(today, ukRollover);
  if (daysToUk <= warnDays && !uk[ukNext]) {
    warnings.push(
      `UK tax year ${ukNext} starts in ${daysToUk} days (${toIsoDate(ukRollover)}) and has no dataset yet. ` +
        `Builds will FAIL from that date. Add UK_RATES_BY_YEAR['${ukNext}'] from complete primary sources ` +
        '(GOV.UK rates and thresholds, Scottish Budget bands, student loan thresholds).',
    );
  }

  const usYears = Object.keys(us).map(Number);
  const ukYears = Object.keys(uk);
  return {
    errors,
    warnings,
    usDefault: usYears.length ? defaultUsTaxYear(today, usYears) : null,
    ukDefault: ukYears.length ? defaultUkTaxYear(today, ukYears) : null,
    today: toIsoDate(today),
  };
}

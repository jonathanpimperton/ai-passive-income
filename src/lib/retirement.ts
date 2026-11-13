/**
 * Retirement projection engine for the retirement savings, retirement age and
 * retirement contribution calculators (and, from Wave 2, the homepage engine).
 *
 * Model (stated in the UI and the methodology pages):
 * - Interest compounds monthly at annualReturn / 12.
 * - Contributions are made at the end of each month.
 *   Balance after m months: P(1 + i)^m + C * ((1 + i)^m - 1) / i, with i = r/12
 *   (P + C*m when r = 0). This is the standard future value of a lump sum
 *   plus an ordinary annuity; e.g. $10,000 at 6% for 10 years grows to
 *   $18,193.97 (10,000 * 1.005^120), the textbook monthly-compounding figure.
 * - "Today's money" divides by (1 + inflation)^years.
 *
 * Every solver returns an explicit status, so an unreachable or already-met
 * target is reported as such and never as a number that looks like an answer
 * (MATH-US-08: "Age 90 -- 25 years of saving to reach $1,000,000" when the
 * balance at 90 was $81k).
 */

import { US_401K, US_TAX_YEAR } from './us-rates';
import {
  NMPA_FROM_2028,
  formatYearsMonths,
  todayLocal,
  ukPensionAgesFromCurrentAge,
  birthDateRange,
  type CalendarDate,
} from './uk-pension-ages';

/* ── Core growth maths ────────────────────────────────────── */

const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
const nonNeg = (v: number) => Math.max(0, finiteOr(v, 0));

/** Balance after `months` of monthly compounding with end-of-month contributions. */
export function balanceAfterMonths(
  currentSavings: number,
  monthlyContribution: number,
  annualReturn: number,
  months: number,
): number {
  const p = nonNeg(currentSavings);
  const c = nonNeg(monthlyContribution);
  const n = nonNeg(months);
  const i = finiteOr(annualReturn, 0) / 12;
  if (i === 0) return p + c * n;
  const g = Math.pow(1 + i, n);
  return p * g + (c * (g - 1)) / i;
}

/** Nominal amount expressed in today's money. */
export function toTodaysMoney(nominal: number, inflation: number, years: number): number {
  return nominal / Math.pow(1 + finiteOr(inflation, 0), nonNeg(years));
}

export interface ProjectionRow {
  /** Age at this point (decimal when the final point falls mid-year). */
  age: number;
  /** Months elapsed since today. */
  month: number;
  nominal: number;
  real: number;
  contributions: number;
}

/**
 * Year-by-year projection rows from today to `months` from now: one row per
 * whole year plus a final row at exactly `months` when that is mid-year.
 */
export function projectionRows(opts: {
  currentAge: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number;
  inflation: number;
  months: number;
}): ProjectionRow[] {
  const months = Math.max(0, Math.round(nonNeg(opts.months)));
  const points: number[] = [];
  for (let m = 0; m <= months; m += 12) points.push(m);
  if (points[points.length - 1] !== months) points.push(months);
  return points.map((m) => {
    const nominal = balanceAfterMonths(opts.currentSavings, opts.monthlyContribution, opts.annualReturn, m);
    return {
      age: opts.currentAge + m / 12,
      month: m,
      nominal,
      real: toTodaysMoney(nominal, opts.inflation, m / 12),
      contributions: nonNeg(opts.currentSavings) + nonNeg(opts.monthlyContribution) * m,
    };
  });
}

/* ── Retirement savings: balance at a chosen age ──────────── */

export interface RetirementProjection {
  years: number;
  nominal: number;
  real: number;
  /** Current savings plus every contribution. */
  totalContributions: number;
  /** nominal - totalContributions. Never negative for returns >= 0. */
  totalGrowth: number;
}

export function projectRetirement(opts: {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number;
  inflation: number;
}): RetirementProjection {
  const years = Math.max(0, finiteOr(opts.retirementAge, 0) - finiteOr(opts.currentAge, 0));
  const months = Math.round(years * 12);
  const nominal = balanceAfterMonths(opts.currentSavings, opts.monthlyContribution, opts.annualReturn, months);
  const totalContributions = nonNeg(opts.currentSavings) + nonNeg(opts.monthlyContribution) * months;
  return {
    years,
    nominal,
    real: toTodaysMoney(nominal, opts.inflation, years),
    totalContributions,
    totalGrowth: nominal - totalContributions,
  };
}

/* ── Retirement age: when is the target reached? ──────────── */

export type RetirementAgeResult =
  | {
      status: 'already';
      /** Current savings already meet the target. */
      months: 0;
      age: number;
      balance: number;
    }
  | {
      status: 'reached';
      /** Whole months from today until the balance first meets the target. */
      months: number;
      /** Age at that point, decimal years. */
      age: number;
      /** Balance in that month (>= target). */
      balance: number;
      totalContributions: number;
    }
  | {
      status: 'unreachable';
      /** The age the search stopped at. */
      maxAge: number;
      balanceAtMaxAge: number;
      shortfall: number;
      /**
       * Monthly contribution that would reach the target exactly at maxAge
       * (null when there is no time left before maxAge).
       */
      requiredMonthly: number | null;
    };

/**
 * First whole month in which the balance reaches `target`, searched up to
 * `maxAge`. Contributions stop once the target is met.
 */
export function solveRetirementAge(opts: {
  currentAge: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number;
  target: number;
  maxAge?: number;
}): RetirementAgeResult {
  const currentAge = finiteOr(opts.currentAge, 0);
  const maxAge = finiteOr(opts.maxAge ?? 90, 90);
  const p = nonNeg(opts.currentSavings);
  const c = nonNeg(opts.monthlyContribution);
  const target = nonNeg(opts.target);
  const i = finiteOr(opts.annualReturn, 0) / 12;

  if (p >= target) return { status: 'already', months: 0, age: currentAge, balance: p };

  const maxMonths = Math.max(0, Math.floor((maxAge - currentAge) * 12));
  let balance = p;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + i) + c;
    if (balance >= target) {
      return {
        status: 'reached',
        months: m,
        age: currentAge + m / 12,
        balance,
        totalContributions: p + c * m,
      };
    }
  }
  const required = maxMonths > 0
    ? solveRequiredMonthly({ currentSavings: p, target, annualReturn: opts.annualReturn, months: maxMonths })
    : null;
  return {
    status: 'unreachable',
    maxAge,
    balanceAtMaxAge: balance,
    shortfall: target - balance,
    requiredMonthly: required && required.status === 'ok' ? required.monthly : null,
  };
}

/* ── Retirement contribution: monthly amount for a target ── */

export type RequiredMonthlyResult =
  | {
      status: 'already';
      /** Growth on current savings alone reaches the target; no contribution needed. */
      monthly: 0;
      /** Projected balance with no further contributions. */
      projected: number;
      totalContributions: number;
      totalGrowth: number;
    }
  | {
      status: 'ok';
      monthly: number;
      /** Current savings plus every contribution. */
      totalContributions: number;
      /** target - totalContributions. */
      totalGrowth: number;
    }
  | {
      status: 'no-time';
    };

export function solveRequiredMonthly(opts: {
  currentSavings: number;
  target: number;
  annualReturn: number;
  months: number;
}): RequiredMonthlyResult {
  const p = nonNeg(opts.currentSavings);
  const target = nonNeg(opts.target);
  const n = Math.round(nonNeg(opts.months));
  const i = finiteOr(opts.annualReturn, 0) / 12;
  if (n <= 0) {
    return p >= target
      ? { status: 'already', monthly: 0, projected: p, totalContributions: p, totalGrowth: 0 }
      : { status: 'no-time' };
  }
  const g = i === 0 ? 1 : Math.pow(1 + i, n);
  const fromSavings = p * g;
  if (fromSavings >= target) {
    return { status: 'already', monthly: 0, projected: fromSavings, totalContributions: p, totalGrowth: fromSavings - p };
  }
  const annuity = i === 0 ? n : (g - 1) / i;
  const monthly = (target - fromSavings) / annuity;
  const totalContributions = p + monthly * n;
  return { status: 'ok', monthly, totalContributions, totalGrowth: target - totalContributions };
}

/* ── Chart milestones by region ───────────────────────────── */

export type RetirementRegion = 'us' | 'uk' | 'eur';

export interface Milestone {
  /** Age on the chart (decimal). */
  age: number;
  /** One-line explanation for the legend under the chart. */
  text: string;
  /** Short marker label drawn on the chart. */
  marker: string;
  /**
   * False when the milestone falls after the end of the chart (e.g. a UK
   * State Pension age of 68 for someone retiring at 65): it is still listed
   * in the legend, because the gap matters, but no marker is drawn.
   */
  onChart: boolean;
}

/**
 * US full retirement age by birth date (20 CFR 404.409; a 1 January birthday
 * counts as the previous year). Returns decimal years.
 * https://www.law.cornell.edu/cfr/text/20/404.409 (accessed 2026-11-12;
 * ssa.gov blocks automated checks).
 */
export function usFullRetirementAge(dob: CalendarDate): number {
  const y = dob.m === 1 && dob.d === 1 ? dob.y - 1 : dob.y;
  if (y >= 1960) return 67;
  if (y >= 1955) return 66 + ((y - 1954) * 2) / 12;
  if (y >= 1943) return 66;
  if (y >= 1938) return 65 + ((y - 1937) * 2) / 12;
  return 65;
}

const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

/**
 * Fields W1-TAX's multi-year us-rates.ts adds to US_401K. Read structurally so
 * this file works before and after that merge; afterwards they are plain reads.
 * - catchUp60to63: SECURE 2.0 higher catch-up for ages 60-63 ($11,250 for 2026,
 *   IRS Notice 2025-67). While absent, ages 60-63 get the 'higher-catch-up'
 *   status instead of being compared with the age-50 limit.
 * - published: false when the IRS has not yet published the default year's
 *   limits and the values are carried from the prior year (absent = published).
 */
const US_401K_EXT = US_401K as typeof US_401K & { catchUp60to63?: number; published?: boolean };
const CATCH_UP_60_TO_63: number | undefined = US_401K_EXT.catchUp60to63;
const LIMITS_PUBLISHED: boolean = US_401K_EXT.published ?? true;

/** "2027 limits not yet published; using 2026 limits" when the default year's figures are carried over. */
export function limitsYearNote(year: string = US_TAX_YEAR, published: boolean = LIMITS_PUBLISHED): string | null {
  return published ? null : `${year} limits not yet published; using ${Number(year) - 1} limits`;
}

/**
 * Milestone ages after currentAge for a retirement chart; those after endAge
 * come back with onChart = false (listed in the legend, not drawn).
 * UK ages come from uk-pension-ages.ts (worked out from the current age, since
 * the calculators do not ask for a birth date); US contribution figures come
 * from us-rates.ts for the current default tax year.
 */
export function retirementMilestones(
  region: RetirementRegion,
  currentAge: number,
  endAge: number,
  today: CalendarDate = todayLocal(),
): Milestone[] {
  const out: Omit<Milestone, 'onChart'>[] = [];

  if (region === 'uk') {
    const ages = ukPensionAgesFromCurrentAge(currentAge, today);
    if (ages) {
      const acc = ages.pensionAccess;
      const accAge = acc.exact ? `${acc.min}` : `${acc.min} or ${acc.max}`;
      const accNote = acc.max === NMPA_FROM_2028 && acc.min === NMPA_FROM_2028
        ? 'the normal minimum pension age from 6 April 2028'
        : acc.pausedFor2028
          ? 'the minimum is 55 until 5 April 2028, then 57 for anyone not yet 57'
          : 'the normal minimum pension age, rising to 57 on 6 April 2028';
      if (acc.pausedFor2028 && acc.max <= currentAge) {
        // Already past 55 but possibly still under 57 on 6 April 2028: the rise can
        // still affect them, so mark their 57th birthday instead of dropping the item.
        out.push({
          age: NMPA_FROM_2028,
          marker: 'Pension access',
          text: 'Private and workplace pensions: you can usually take benefits from 55 now, but the normal minimum pension age rises to 57 on 6 April 2028. If you are under 57 on that date, you may have to wait until 57 to take benefits unless your scheme gives you a protected pension age; check with your scheme.',
        });
      } else {
        out.push({
          age: acc.max,
          marker: 'Pension access',
          text: `Private and workplace pensions: usually from age ${accAge} (${accNote}). Some schemes have a protected pension age.`,
        });
      }
      const sp = ages.statePension;
      const spAge = sp.exact ? formatYearsMonths(sp.max) : `${formatYearsMonths(sp.min)} to ${formatYearsMonths(sp.max)}`;
      out.push({
        age: sp.max,
        marker: 'State Pension',
        text: sp.exact
          ? `State Pension age: ${spAge}, under the timetable in law today.`
          : `State Pension age: ${spAge}, depending on your birth date, under the timetable in law today.`,
      });
    }
  } else if (region === 'us') {
    const year = US_TAX_YEAR;
    out.push({
      age: 50,
      marker: 'Catch-up',
      text: `401(k) catch-up contributions allowed from 50: an extra ${fmtUsd(US_401K.catchUp)} a year on top of the ${fmtUsd(US_401K.limit)} limit (${limitsYearNote() ?? year}).`,
    });
    out.push({
      age: 59.5,
      marker: '59½',
      text: '401(k) and IRA withdrawals without the 10% early-withdrawal penalty from age 59½.',
    });
    out.push({
      age: 60,
      marker: '60-63',
      text: CATCH_UP_60_TO_63 === undefined
        ? 'Ages 60 to 63: a higher 401(k) catch-up limit applies.'
        : `Ages 60 to 63: a higher 401(k) catch-up of ${fmtUsd(CATCH_UP_60_TO_63)} a year replaces the age-50 one (${limitsYearNote() ?? year}).`,
    });
    out.push({
      age: 62,
      marker: 'SS 62',
      text: 'Earliest age to claim Social Security retirement benefits (permanently reduced).',
    });
    const { earliest, latest } = birthDateRange(currentAge, today);
    const fraLo = usFullRetirementAge(earliest);
    const fraHi = usFullRetirementAge(latest);
    const fraText = fraLo === fraHi ? formatYearsMonths(fraHi) : `${formatYearsMonths(fraLo)} to ${formatYearsMonths(fraHi)}`;
    out.push({
      age: fraHi,
      marker: `FRA ${formatYearsMonths(fraHi)}`,
      text: `Social Security full retirement age: ${fraText}.`,
    });
  }

  return out
    .filter((m) => m.age > currentAge)
    .map((m) => ({ ...m, onChart: m.age <= endAge + 1e-9 }));
}

/* ── US contribution limit check (SV-6 / MTH-21) ──────────── */

export type CatchUpBand = 'none' | '50+' | '60-63';

export interface Us401kCheck {
  year: string;
  baseLimit: number;
  /** Age-50+ catch-up from us-rates.ts. */
  catchUp: number;
  catchUpBand: CatchUpBand;
  /** Employee deferral limit that applies at this age; null when it is not known (ages 60-63 without the data). */
  annualLimit: number | null;
  annualContribution: number;
  /**
   * 'within': at or under the limit for this age.
   * 'exceeds': over the limit for this age.
   * 'higher-catch-up': ages 60-63, above the age-50 limit, but a higher
   *   catch-up applies whose figure is not in us-rates.ts yet, so no verdict.
   */
  status: 'within' | 'exceeds' | 'higher-catch-up';
  /** False when the default year's limits are carried over from the prior year (not yet published). */
  limitsPublished: boolean;
}

/**
 * Compares a planned monthly saving with the employee 401(k) deferral limit
 * for the current default tax year in us-rates.ts (catch-up from age 50; a
 * higher catch-up at 60-63). Employer contributions do not count toward this
 * limit.
 */
export function check401kLimit(monthlyContribution: number, age: number): Us401kCheck {
  const catchUpBand: CatchUpBand = age >= 60 && age <= 63 ? '60-63' : age >= 50 ? '50+' : 'none';
  const annualContribution = nonNeg(monthlyContribution) * 12;
  const catchUp = catchUpBand === 'none'
    ? 0
    : catchUpBand === '60-63'
      ? CATCH_UP_60_TO_63
      : US_401K.catchUp;
  const annualLimit = catchUp === undefined ? null : US_401K.limit + catchUp;
  const regular50Limit = US_401K.limit + US_401K.catchUp;
  let status: Us401kCheck['status'];
  if (annualLimit !== null) {
    status = annualContribution > annualLimit + 0.005 ? 'exceeds' : 'within';
  } else {
    // 60-63 without the figure: the higher catch-up is at least the age-50 one.
    status = annualContribution > regular50Limit + 0.005 ? 'higher-catch-up' : 'within';
  }
  return {
    year: US_TAX_YEAR,
    baseLimit: US_401K.limit,
    catchUp: US_401K.catchUp,
    catchUpBand,
    annualLimit,
    annualContribution,
    status,
    limitsPublished: LIMITS_PUBLISHED,
  };
}

/** "29 years 10 months" style duration for whole months. */
export function formatDuration(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths));
  const y = Math.floor(m / 12);
  const r = m % 12;
  const ys = `${y} year${y === 1 ? '' : 's'}`;
  const rs = `${r} month${r === 1 ? '' : 's'}`;
  if (y === 0) return rs;
  if (r === 0) return ys;
  return `${ys} ${rs}`;
}

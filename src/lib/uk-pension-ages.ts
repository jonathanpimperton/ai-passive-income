/**
 * UK pension ages by date of birth -- the single source for the retirement
 * calculators' UK milestones.
 *
 * Two legislated ages:
 *
 * 1. Normal minimum pension age (NMPA) -- the earliest age most private and
 *    workplace pensions can be taken. 55 today; 57 "on and after 6 April 2028".
 *    Source: HMRC policy paper "Increasing normal minimum pension age"
 *    https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age/increasing-normal-minimum-pension-age
 *    (accessed 2026-11-12). Some members keep a "protected pension age" (a
 *    scheme right to take benefits earlier that existed before 4 November
 *    2021); the calculators disclose that rather than model it.
 *
 * 2. State Pension age (SPA) by date of birth, from the DWP timetable
 *    https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable
 *    (accessed 2026-11-12):
 *    - born 6 Oct 1954 - 5 Apr 1960: 66th birthday;
 *    - born 6 Apr 1960 - 5 Mar 1961: 66 years plus 1..11 months (Pensions Act
 *      2014, Table 4);
 *    - born 6 Mar 1961 - 5 Apr 1977: 67th birthday;
 *    - born 6 Apr 1977 - 5 Apr 1978: fixed dates 6 May 2044 .. 6 Mar 2046
 *      (Pensions Act 2007, Table 5);
 *    - born on or after 6 Apr 1978: 68th birthday.
 *    The 67-to-68 timetable is the one in law today; DWP notes it "could change
 *    as a result of a future review" (any change needs Parliament).
 *
 * Dates are calendar dates ({ y, m, d }, month 1-12) with no time zone, so a
 * birthday never shifts by a day. Adding months clamps to the end of the
 * month, matching the DWP note that someone born 31 July 1960 reaches
 * 66 years and 4 months on 30 November 2026.
 */

export interface CalendarDate {
  y: number;
  /** 1-12 */
  m: number;
  d: number;
}

export const UK_PENSION_AGE_SOURCES = {
  nmpa: 'https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age/increasing-normal-minimum-pension-age',
  statePensionAge: 'https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable',
  checkedOn: '2026-11-12',
} as const;

/** NMPA before the rise. */
export const NMPA_CURRENT = 55;
/** NMPA on and after 6 April 2028. */
export const NMPA_FROM_2028 = 57;
/** First day the higher NMPA applies. */
export const NMPA_RISE_DATE: CalendarDate = { y: 2028, m: 4, d: 6 };

/* ── Calendar helpers ─────────────────────────────────────── */

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

/** Add whole months; a day past the end of the target month clamps to its last day. */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const total = date.y * 12 + (date.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

export function addYears(date: CalendarDate, years: number): CalendarDate {
  return addMonths(date, years * 12);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const t = Date.UTC(date.y, date.m - 1, date.d) + days * 86_400_000;
  const r = new Date(t);
  return { y: r.getUTCFullYear(), m: r.getUTCMonth() + 1, d: r.getUTCDate() };
}

/** Negative if a is before b, 0 if equal, positive if after. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return (a.y - b.y) * 10_000 + (a.m - b.m) * 100 + (a.d - b.d);
}

/** Today's calendar date in the visitor's own time zone. */
export function todayLocal(now: Date = new Date()): CalendarDate {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/**
 * Exact age on `on` for someone born on `dob`, as whole years, whole months
 * and the decimal equivalent (days count as a fraction of the month).
 */
export function ageOn(dob: CalendarDate, on: CalendarDate): { years: number; months: number; decimal: number } {
  let totalMonths = (on.y - dob.y) * 12 + (on.m - dob.m);
  let anniversary = addMonths(dob, totalMonths);
  if (compareDates(anniversary, on) > 0) {
    totalMonths -= 1;
    anniversary = addMonths(dob, totalMonths);
  }
  const next = addMonths(dob, totalMonths + 1);
  const span = (Date.UTC(next.y, next.m - 1, next.d) - Date.UTC(anniversary.y, anniversary.m - 1, anniversary.d)) / 86_400_000;
  const into = (Date.UTC(on.y, on.m - 1, on.d) - Date.UTC(anniversary.y, anniversary.m - 1, anniversary.d)) / 86_400_000;
  const fraction = span > 0 ? into / span : 0;
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    decimal: (totalMonths + fraction) / 12,
  };
}

/* ── State Pension age ────────────────────────────────────── */

export type StatePensionRule = '66' | '66-to-67' | '67' | '67-to-68' | '68';

export interface StatePensionAge {
  /** Date State Pension age is reached. */
  date: CalendarDate;
  /** Age on that date. */
  years: number;
  months: number;
  /** Age on that date in decimal years (for charts). */
  decimal: number;
  rule: StatePensionRule;
}

const SPA_66_FROM: CalendarDate = { y: 1954, m: 10, d: 6 };
const SPA_PHASE_67_FROM: CalendarDate = { y: 1960, m: 4, d: 6 };
const SPA_67_FROM: CalendarDate = { y: 1961, m: 3, d: 6 };
const SPA_PHASE_68_FROM: CalendarDate = { y: 1977, m: 4, d: 6 };
const SPA_68_FROM: CalendarDate = { y: 1978, m: 4, d: 6 };

/** Index of the "6th of month k to 5th of month k+1" band that contains dob, counting from `start` (a 6th). */
function monthBandIndex(dob: CalendarDate, start: CalendarDate): number {
  const monthsSince = (dob.y - start.y) * 12 + (dob.m - start.m);
  return dob.d >= 6 ? monthsSince : monthsSince - 1;
}

function spa(dob: CalendarDate, date: CalendarDate, rule: StatePensionRule): StatePensionAge {
  const a = ageOn(dob, date);
  return { date, years: a.years, months: a.months, decimal: a.decimal, rule };
}

/**
 * State Pension age for a date of birth, per the DWP timetable.
 * Returns null for anyone born before 6 October 1954: they all reached State
 * Pension age (under earlier, phased rules) by 2020, so no calculator needs it.
 */
export function statePensionAgeFor(dob: CalendarDate): StatePensionAge | null {
  if (compareDates(dob, SPA_66_FROM) < 0) return null;
  if (compareDates(dob, SPA_PHASE_67_FROM) < 0) return spa(dob, addYears(dob, 66), '66');
  if (compareDates(dob, SPA_67_FROM) < 0) {
    // Table 4: band 0 (6 Apr - 5 May 1960) -> 66y 1m ... band 10 (6 Feb - 5 Mar 1961) -> 66y 11m.
    const band = monthBandIndex(dob, SPA_PHASE_67_FROM);
    return spa(dob, addMonths(dob, 66 * 12 + band + 1), '66-to-67');
  }
  if (compareDates(dob, SPA_PHASE_68_FROM) < 0) return spa(dob, addYears(dob, 67), '67');
  if (compareDates(dob, SPA_68_FROM) < 0) {
    // Table 5: band 0 (6 Apr - 5 May 1977) -> 6 May 2044, then every 2 months to 6 Mar 2046.
    const band = monthBandIndex(dob, SPA_PHASE_68_FROM);
    return spa(dob, addMonths({ y: 2044, m: 5, d: 6 }, band * 2), '67-to-68');
  }
  return spa(dob, addYears(dob, 68), '68');
}

/* ── Normal minimum pension age ───────────────────────────── */

export interface PensionAccessAge {
  /** Earliest age benefits can normally be taken: 55 or 57. */
  age: number;
  /** Date of that birthday. */
  from: CalendarDate;
  /**
   * Set when the person turns 55 before 6 April 2028 but is still under 57 on
   * that date: from 6 April 2028 the NMPA is 57 for everyone without a
   * protected pension age, so access pauses until their 57th birthday.
   */
  pausedFrom?: CalendarDate;
  resumesOn?: CalendarDate;
}

export function pensionAccessAgeFor(dob: CalendarDate): PensionAccessAge {
  const at55 = addYears(dob, NMPA_CURRENT);
  const at57 = addYears(dob, NMPA_FROM_2028);
  if (compareDates(at55, NMPA_RISE_DATE) >= 0) {
    return { age: NMPA_FROM_2028, from: at57 };
  }
  if (compareDates(at57, NMPA_RISE_DATE) > 0) {
    return { age: NMPA_CURRENT, from: at55, pausedFrom: NMPA_RISE_DATE, resumesOn: at57 };
  }
  return { age: NMPA_CURRENT, from: at55 };
}

/* ── From current age (no date of birth) ──────────────────── */

/** Earliest and latest possible birth dates for someone aged `currentAge` on `today`. */
export function birthDateRange(currentAge: number, today: CalendarDate): { earliest: CalendarDate; latest: CalendarDate } {
  const age = Math.max(0, Math.floor(currentAge));
  return {
    // Turned `age` today.
    latest: addYears(today, -age),
    // Turns `age + 1` tomorrow.
    earliest: addDays(addYears(today, -(age + 1)), 1),
  };
}

export interface AgeRange {
  /** Smallest possible value (decimal years). */
  min: number;
  /** Largest possible value (decimal years). */
  max: number;
  /** True when every possible birth date gives the same age (to the month). */
  exact: boolean;
}

export interface UkPensionAges {
  statePension: AgeRange & { rules: StatePensionRule[] };
  pensionAccess: AgeRange & {
    /** Some possible birth dates turn 55 before 6 Apr 2028 but are under 57 then. */
    pausedFor2028: boolean;
  };
}

const sameToTheMonth = (a: number, b: number) => Math.round(a * 12) === Math.round(b * 12);

/**
 * UK pension ages when only the current age is known: computed for the
 * earliest and the latest birth date that age allows. Both ages rise with the
 * birth date, so the two ends bound every case in between.
 * Returns null where the State Pension age cannot be determined (born before
 * 6 October 1954: already past State Pension age).
 */
export function ukPensionAgesFromCurrentAge(currentAge: number, today: CalendarDate): UkPensionAges | null {
  const { earliest, latest } = birthDateRange(currentAge, today);
  const spaLo = statePensionAgeFor(earliest);
  const spaHi = statePensionAgeFor(latest);
  if (!spaLo || !spaHi) return null;
  const accLo = pensionAccessAgeFor(earliest);
  const accHi = pensionAccessAgeFor(latest);
  return {
    statePension: {
      min: Math.min(spaLo.decimal, spaHi.decimal),
      max: Math.max(spaLo.decimal, spaHi.decimal),
      exact: sameToTheMonth(spaLo.decimal, spaHi.decimal),
      rules: spaLo.rule === spaHi.rule ? [spaLo.rule] : [spaLo.rule, spaHi.rule],
    },
    pensionAccess: {
      min: Math.min(accLo.age, accHi.age),
      max: Math.max(accLo.age, accHi.age),
      exact: accLo.age === accHi.age,
      pausedFor2028: Boolean(accLo.pausedFrom || accHi.pausedFrom),
    },
  };
}

/** "66y 10m" / "68" style label for a decimal age (rounded to the month). */
export function formatYearsMonths(decimal: number): string {
  const total = Math.round(decimal * 12);
  const y = Math.floor(total / 12);
  const m = total % 12;
  return m === 0 ? `${y}` : `${y}y ${m}m`;
}

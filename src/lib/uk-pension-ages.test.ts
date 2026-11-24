import { describe, it, expect, vi } from 'vitest';
import {
  statePensionAgeFor,
  pensionAccessAgeFor,
  ukPensionAgesFromCurrentAge,
  birthDateRange,
  addMonths,
  addDays,
  ageOn,
  compareDates,
  formatYearsMonths,
  type CalendarDate,
} from './uk-pension-ages';

/* Heavy under load (another build or test run on the same machine): an explicit generous timeout
 * for the whole file instead of vitest's 5 s default. The tests are not shrunk. */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const d = (y: number, m: number, day: number): CalendarDate => ({ y, m, d: day });

describe('statePensionAgeFor -- DWP State Pension age timetable', () => {
  it('returns null before 6 October 1954 (already past State Pension age)', () => {
    expect(statePensionAgeFor(d(1954, 10, 5))).toBeNull();
    expect(statePensionAgeFor(d(1954, 10, 6))?.rule).toBe('66');
  });

  it('66th birthday up to 5 April 1960', () => {
    const r = statePensionAgeFor(d(1960, 4, 5))!;
    expect(r.date).toEqual(d(2026, 4, 5));
    expect([r.years, r.months, r.rule]).toEqual([66, 0, '66']);
  });

  it('Table 4 bands: 66 years plus 1..11 months', () => {
    expect(statePensionAgeFor(d(1960, 4, 6))).toMatchObject({ years: 66, months: 1, date: d(2026, 5, 6), rule: '66-to-67' });
    expect(statePensionAgeFor(d(1960, 5, 5))).toMatchObject({ years: 66, months: 1 });
    expect(statePensionAgeFor(d(1960, 5, 6))).toMatchObject({ years: 66, months: 2 });
    expect(statePensionAgeFor(d(1961, 2, 6))).toMatchObject({ years: 66, months: 11 });
    expect(statePensionAgeFor(d(1961, 3, 5))).toMatchObject({ years: 66, months: 11 });
  });

  it('reproduces the three worked notes printed under DWP Table 4', () => {
    // (1) Born 31 July 1960: 66 years and 4 months on 30 November 2026.
    expect(statePensionAgeFor(d(1960, 7, 31))!.date).toEqual(d(2026, 11, 30));
    // (2) Born 31 December 1960: 66 years and 9 months on 30 September 2027.
    expect(statePensionAgeFor(d(1960, 12, 31))!.date).toEqual(d(2027, 9, 30));
    // (3) Born 31 January 1961: 66 years and 10 months on 30 November 2027.
    expect(statePensionAgeFor(d(1961, 1, 31))!.date).toEqual(d(2027, 11, 30));
  });

  it('67th birthday from 6 March 1961 to 5 April 1977', () => {
    expect(statePensionAgeFor(d(1961, 3, 6))).toMatchObject({ years: 67, months: 0, date: d(2028, 3, 6), rule: '67' });
    expect(statePensionAgeFor(d(1977, 4, 5))).toMatchObject({ years: 67, months: 0, date: d(2044, 4, 5), rule: '67' });
  });

  it('Table 5: fixed dates from 6 May 2044 to 6 March 2046', () => {
    expect(statePensionAgeFor(d(1977, 4, 6))!.date).toEqual(d(2044, 5, 6));
    expect(statePensionAgeFor(d(1977, 5, 5))!.date).toEqual(d(2044, 5, 6));
    expect(statePensionAgeFor(d(1977, 5, 6))!.date).toEqual(d(2044, 7, 6));
    expect(statePensionAgeFor(d(1977, 11, 13))!.date).toEqual(d(2045, 7, 6));
    expect(statePensionAgeFor(d(1978, 2, 6))!.date).toEqual(d(2046, 1, 6));
    expect(statePensionAgeFor(d(1978, 3, 6))!.date).toEqual(d(2046, 3, 6));
    expect(statePensionAgeFor(d(1978, 4, 5))!.date).toEqual(d(2046, 3, 6));
    expect(statePensionAgeFor(d(1978, 4, 5))!.rule).toBe('67-to-68');
  });

  it('68th birthday from 6 April 1978', () => {
    expect(statePensionAgeFor(d(1978, 4, 6))).toMatchObject({ years: 68, months: 0, date: d(2046, 4, 6), rule: '68' });
    expect(statePensionAgeFor(d(1996, 6, 15))).toMatchObject({ years: 68, months: 0, date: d(2064, 6, 15) });
  });

  it('invariant: for every birth date 1954-2010 the age is 66-68 and the date never moves earlier', () => {
    let prev: CalendarDate | null = null;
    let day = d(1954, 10, 6);
    let checked = 0;
    while (compareDates(day, d(2010, 12, 31)) <= 0) {
      const r = statePensionAgeFor(day)!;
      expect(r.decimal).toBeGreaterThanOrEqual(66);
      expect(r.decimal).toBeLessThanOrEqual(68.0001);
      expect(compareDates(r.date, day)).toBeGreaterThan(0);
      if (prev) expect(compareDates(r.date, prev)).toBeGreaterThanOrEqual(0);
      prev = r.date;
      day = addDays(day, 1);
      checked++;
    }
    expect(checked).toBeGreaterThan(20_000);
  });
});

describe('pensionAccessAgeFor -- normal minimum pension age 55, then 57 from 6 April 2028', () => {
  it('57 for anyone whose 55th birthday is on or after 6 April 2028', () => {
    expect(pensionAccessAgeFor(d(1973, 4, 6))).toEqual({ age: 57, from: d(2030, 4, 6) });
    expect(pensionAccessAgeFor(d(1996, 1, 1)).age).toBe(57);
  });

  it('55, then paused until 57, for those 55 or 56 on 6 April 2028', () => {
    const r = pensionAccessAgeFor(d(1973, 4, 5));
    expect(r.age).toBe(55);
    expect(r.from).toEqual(d(2028, 4, 5));
    expect(r.pausedFrom).toEqual(d(2028, 4, 6));
    expect(r.resumesOn).toEqual(d(2030, 4, 5));
    expect(pensionAccessAgeFor(d(1971, 4, 7)).pausedFrom).toEqual(d(2028, 4, 6));
  });

  it('plain 55 for anyone already 57 by 6 April 2028', () => {
    expect(pensionAccessAgeFor(d(1971, 4, 6))).toEqual({ age: 55, from: d(2026, 4, 6) });
    expect(pensionAccessAgeFor(d(1965, 1, 1)).age).toBe(55);
  });
});

describe('ukPensionAgesFromCurrentAge (no birth date given)', () => {
  const today = d(2026, 11, 12);

  it('MATH-UK-08 repro: the default 30-year-old gets 57 and 68, not 55 and 66', () => {
    const r = ukPensionAgesFromCurrentAge(30, today)!;
    expect(r.pensionAccess).toMatchObject({ min: 57, max: 57, exact: true });
    expect(r.statePension.exact).toBe(true);
    expect(r.statePension.max).toBe(68);
  });

  it('a 48-year-old straddles the 67-to-68 phase: a range, never a single wrong figure', () => {
    const r = ukPensionAgesFromCurrentAge(48, today)!;
    expect(r.statePension.exact).toBe(false);
    expect(r.statePension.max).toBe(68);
    expect(r.statePension.min).toBeGreaterThan(67.5);
    expect(r.statePension.min).toBeLessThan(68);
  });

  it('a 53-year-old may be 55 (paused in 2028) or 57', () => {
    const r = ukPensionAgesFromCurrentAge(53, today)!;
    expect(r.pensionAccess).toMatchObject({ min: 55, max: 57, exact: false, pausedFor2028: true });
  });

  it('a 66-year-old in the 66-to-67 phase gets 66y+months bounds', () => {
    const r = ukPensionAgesFromCurrentAge(65, today)!;
    // Born 13 Nov 1960 - 12 Nov 1961: from 66y 8m up to 67.
    expect(formatYearsMonths(r.statePension.min)).toBe('66y 8m');
    expect(r.statePension.max).toBe(67);
  });

  it('returns null when the State Pension age is already long past', () => {
    expect(ukPensionAgesFromCurrentAge(80, today)).toBeNull();
  });
});

describe('calendar helpers', () => {
  it('addMonths clamps to the end of the month', () => {
    expect(addMonths(d(2024, 1, 31), 1)).toEqual(d(2024, 2, 29));
    expect(addMonths(d(2023, 1, 31), 1)).toEqual(d(2023, 2, 28));
    expect(addMonths(d(2023, 12, 15), 1)).toEqual(d(2024, 1, 15));
  });

  it('birthDateRange spans exactly one year', () => {
    const r = birthDateRange(30, d(2026, 11, 12));
    expect(r.latest).toEqual(d(1996, 11, 12));
    expect(r.earliest).toEqual(d(1995, 11, 13));
    expect(ageOn(r.latest, d(2026, 11, 12)).years).toBe(30);
    expect(ageOn(r.earliest, d(2026, 11, 12)).years).toBe(30);
  });

  it('ageOn counts whole years and months', () => {
    expect(ageOn(d(1977, 4, 6), d(2044, 5, 6))).toMatchObject({ years: 67, months: 1 });
    expect(ageOn(d(1977, 5, 5), d(2044, 5, 6)).years).toBe(67);
    expect(ageOn(d(1977, 5, 5), d(2044, 5, 6)).months).toBe(0);
  });
});

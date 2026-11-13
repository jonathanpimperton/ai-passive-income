import { describe, it, expect } from 'vitest';
import {
  CPI_U_ANNUAL,
  CPI_U_LATEST,
  CPI_FIRST_YEAR,
  CPI_LAST_FULL_YEAR,
  CPI_DATA_CHECKED,
  cpiFor,
  cpiYearLabel,
  adjustForInflation,
  projectInflation,
  historicalSeries,
} from './inflation';

describe('CPI-U table (BLS CUUR0000SA0 annual averages)', () => {
  it('covers every year from 1913 to 2025 with no gaps', () => {
    for (let y = CPI_FIRST_YEAR; y <= CPI_LAST_FULL_YEAR; y++) {
      expect(typeof CPI_U_ANNUAL[y]).toBe('number');
      expect(CPI_U_ANNUAL[y]).toBeGreaterThan(0);
    }
  });

  it('spot-checks published BLS annual averages (MATH-US-F05 / MTH-16)', () => {
    expect(CPI_U_ANNUAL[1913]).toBe(9.9);
    expect(CPI_U_ANNUAL[2000]).toBe(172.2);
    expect(CPI_U_ANNUAL[2010]).toBe(218.056);
    expect(CPI_U_ANNUAL[2024]).toBe(313.689); // the old table had 313.0
    expect(CPI_U_ANNUAL[2025]).toBe(321.943); // the old table had a 319.0 "estimate"
  });

  it('2025 annual average equals the mean of the 11 published months (October 2025 was not collected)', () => {
    const months2025 = [317.671, 319.082, 319.799, 320.795, 321.465, 322.561, 323.048, 323.976, 324.8, 324.122, 324.054];
    const mean = months2025.reduce((s, v) => s + v, 0) / months2025.length;
    expect(Math.round(mean * 1000) / 1000).toBe(CPI_U_ANNUAL[2025]);
  });

  it('the latest month is labelled and newer than the last full year', () => {
    expect(CPI_U_LATEST.year).toBe(CPI_LAST_FULL_YEAR + 1);
    expect(CPI_U_LATEST.value).toBeGreaterThan(CPI_U_ANNUAL[CPI_LAST_FULL_YEAR]);
    expect(cpiYearLabel(CPI_U_LATEST.year)).toBe('2026 (October)');
    expect(cpiYearLabel(2019)).toBe('2019');
  });

  it('data was checked within the last 400 days of the latest month it carries', () => {
    const checked = Date.parse(CPI_DATA_CHECKED);
    const latest = Date.UTC(CPI_U_LATEST.year, CPI_U_LATEST.month - 1, 1);
    expect(checked).toBeGreaterThan(latest);
    expect(checked - latest).toBeLessThan(400 * 86_400_000);
  });
});

describe('adjustForInflation', () => {
  it('$1,000 in 2000 is $1,869.59 in 2025 prices (published CPI)', () => {
    const r = adjustForInflation(1_000, 2000, 2025)!;
    expect(r.adjusted).toBeCloseTo((1_000 * 321.943) / 172.2, 6);
    expect(Math.round(r.adjusted * 100) / 100).toBe(1_869.59);
    expect(r.years).toBe(25);
    expect(r.averageAnnual).toBeCloseTo((321.943 / 172.2) ** (1 / 25) - 1, 12);
  });

  it('MTH-16 example: $45,000 in 2010 is $66,439 in 2025 prices', () => {
    const r = adjustForInflation(45_000, 2010, 2025)!;
    expect(Math.round(r.adjusted)).toBe(66_439);
  });

  it('uses the latest month for the current year', () => {
    const r = adjustForInflation(1_000, 2000, CPI_U_LATEST.year)!;
    expect(r.adjusted).toBeCloseTo((1_000 * CPI_U_LATEST.value) / 172.2, 6);
    expect(r.years).toBeCloseTo(26 + (CPI_U_LATEST.month - 0.5) / 12 - 0.5, 10);
  });

  it('works backwards in time (2024 dollars expressed in 2001 prices)', () => {
    const r = adjustForInflation(1_000, 2024, 2001)!;
    expect(r.adjusted).toBeCloseTo((1_000 * 177.1) / 313.689, 6);
    expect(r.cumulativeChange).toBeGreaterThan(0);
    expect(r.averageAnnual).toBeGreaterThan(0);
  });

  it('round-trips: there and back again is the identity', () => {
    for (let y = 1913; y < 2025; y += 7) {
      const there = adjustForInflation(1_000, y, 2025)!;
      const back = adjustForInflation(there.adjusted, 2025, y)!;
      expect(back.adjusted).toBeCloseTo(1_000, 8);
    }
  });

  it('returns null for unknown or equal years', () => {
    expect(adjustForInflation(1_000, 1900, 2000)).toBeNull();
    expect(adjustForInflation(1_000, 2000, 2000)).toBeNull();
    expect(adjustForInflation(1_000, 2000, 2030)).toBeNull();
    expect(cpiFor(2030)).toBeNull();
  });
});

describe('projectInflation', () => {
  it('$1,000 at 3% for 10 years costs $1,343.92 and buys $744.09 of today\'s goods', () => {
    const r = projectInflation(1_000, 0.03, 10);
    expect(r.futureCost).toBeCloseTo(1_343.92, 2);
    expect(r.purchasingPower).toBeCloseTo(744.09, 2);
    expect(r.totalInflation).toBeCloseTo(0.343916, 6);
  });
});

describe('historicalSeries', () => {
  it('spans both ends inclusive in ascending year order, either direction', () => {
    const up = historicalSeries(100, 2020, 2025);
    expect(up.map((r) => r.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(up[0].value).toBe(100);
    const down = historicalSeries(100, 2025, 2020);
    expect(down.map((r) => r.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(down[5].value).toBe(100);
  });
});

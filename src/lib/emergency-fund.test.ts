import { describe, it, expect } from 'vitest';
import {
  monthlyRateFromAer,
  fundBalance,
  monthsToTarget,
  emergencyTargets,
  fundPath,
} from './emergency-fund';

describe('monthlyRateFromAer', () => {
  it('4.00% AER is 0.32737% a month and compounds back to exactly 4.00% a year', () => {
    expect(monthlyRateFromAer(0.04)).toBeCloseTo(0.0032737, 7);
    expect(fundBalance(1_000, 0, 0.04, 12)).toBeCloseTo(1_040, 8);
  });

  it('0% is 0%', () => {
    expect(monthlyRateFromAer(0)).toBe(0);
  });
});

describe('monthsToTarget (MTH-22: interest is earned on existing savings too)', () => {
  it('existing savings grow while you save: faster than the old deposits-only formula', () => {
    // $21,000 target, $2,000 saved, $500/month, 4% AER (calculator defaults).
    const r = monthsToTarget({ target: 21_000, current: 2_000, monthly: 500, aer: 0.04 });
    if (r.status !== 'ok') throw new Error('expected ok');
    // The removed closed form ignored growth on the $2,000:
    const i = 0.04 / 12;
    const oldMonths = Math.ceil(Math.log(((21_000 - 2_000) * i) / 500 + 1) / Math.log(1 + i));
    expect(r.months).toBeLessThanOrEqual(oldMonths);
    expect(fundBalance(2_000, 500, 0.04, r.months)).toBeGreaterThanOrEqual(21_000);
    expect(fundBalance(2_000, 500, 0.04, r.months - 1)).toBeLessThan(21_000);
  });

  it('interest alone can get there (no deposits) and says so', () => {
    const r = monthsToTarget({ target: 10_400, current: 10_000, monthly: 0, aer: 0.04 });
    expect(r).toEqual({ status: 'ok', months: 12, interestOnly: true });
  });

  it('nothing saved, nothing added: never (no-saving), not "start saving" with a fake time', () => {
    expect(monthsToTarget({ target: 10_000, current: 0, monthly: 0, aer: 0.04 })).toEqual({ status: 'never', reason: 'no-saving' });
    expect(monthsToTarget({ target: 10_000, current: 500, monthly: 0, aer: 0 })).toEqual({ status: 'never', reason: 'no-saving' });
  });

  it('beyond 50 years: never (too-long)', () => {
    expect(monthsToTarget({ target: 1_000_000, current: 0, monthly: 10, aer: 0.001 })).toEqual({ status: 'never', reason: 'too-long' });
  });

  it('already funded', () => {
    expect(monthsToTarget({ target: 100, current: 100, monthly: 0, aer: 0 }).status).toBe('funded');
  });

  it('zero rate is simple division, rounded up to a whole month', () => {
    expect(monthsToTarget({ target: 1_000, current: 0, monthly: 300, aer: 0 })).toMatchObject({ status: 'ok', months: 4 });
  });

  it('invariant: more saved or more added never takes longer (500 cases)', () => {
    for (let k = 0; k < 500; k++) {
      const target = 3_000 + k * 97;
      const base = monthsToTarget({ target, current: 1_000, monthly: 200, aer: 0.03 });
      const more = monthsToTarget({ target, current: 1_500, monthly: 250, aer: 0.03 });
      if (base.status === 'ok' && more.status === 'ok') expect(more.months).toBeLessThanOrEqual(base.months);
    }
  });
});

describe('emergencyTargets', () => {
  it('builds 3/6/12-month targets from monthly expenses', () => {
    const t = emergencyTargets({ monthlyExpenses: 3_500, current: 2_000, monthly: 500, aer: 0.04 });
    expect(t.map((x) => x.target)).toEqual([10_500, 21_000, 42_000]);
    expect(t[1].remaining).toBe(19_000);
    expect(t[1].funded).toBeCloseTo(2_000 / 21_000, 10);
    expect(t.every((x) => x.time.status === 'ok')).toBe(true);
  });

  it('zero expenses: every target is trivially funded', () => {
    const t = emergencyTargets({ monthlyExpenses: 0, current: 0, monthly: 0, aer: 0 });
    expect(t.every((x) => x.funded === 1 && x.time.status === 'funded')).toBe(true);
  });
});

describe('fundPath', () => {
  it('has one row per month and matches fundBalance', () => {
    const rows = fundPath(1_000, 100, 0.04, 24);
    expect(rows).toHaveLength(25);
    expect(rows[24].balance).toBeCloseTo(fundBalance(1_000, 100, 0.04, 24), 10);
  });
});

import { describe, it, expect } from 'vitest';
import {
  savingsBalance,
  monthlyForGoal,
  timeToGoal,
  savingsPath,
  formatMonthsShort,
  MAX_GOAL_MONTHS,
} from './savings-goal';
import { monthlySavingsRequired } from './calculator-utils';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('monthlyForGoal', () => {
  it('external worked example: $10,000 in 36 months at 6% needs $254.22 a month', () => {
    const r = monthlyForGoal({ goal: 10_000, current: 0, annualRate: 0.06, months: 36 });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.monthly).toBeCloseTo(254.22, 2);
  });

  it('calculator defaults ($50k goal, $5k saved, 5%, 60 months) reconcile and round-trip', () => {
    const r = monthlyForGoal({ goal: 50_000, current: 5_000, annualRate: 0.05, months: 60 });
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(savingsBalance(5_000, r.monthly, 0.05, 60)).toBeCloseTo(50_000, 6);
    expect(r.totalContributions + r.interestEarned).toBeCloseTo(50_000, 6);
    expect(r.interestEarned).toBeGreaterThan(0);
  });

  it('matches the existing monthlySavingsRequired() wherever a payment is needed (1,000 random cases)', () => {
    const r = rng(3);
    for (let k = 0; k < 1_000; k++) {
      const goal = 1_000 + Math.round(r() * 500_000);
      const current = Math.round(r() * goal * 0.5);
      const rate = Math.round(r() * 150) / 1_000;
      const months = 1 + Math.floor(r() * 360);
      const a = monthlyForGoal({ goal, current, annualRate: rate, months });
      const b = monthlySavingsRequired(goal, current, rate, months);
      if (a.status === 'ok') expect(a.monthly).toBeCloseTo(b, 6);
      else expect(b).toBeLessThanOrEqual(1e-9);
    }
  });

  it('CALC-UX-B repro: current savings above the goal is "reached", not "save $0/month for 60 months"', () => {
    expect(monthlyForGoal({ goal: 50_000, current: 100_000, annualRate: 0.05, months: 60 }).status).toBe('reached');
  });

  it('interest alone reaching the goal is "on-track" with the projected balance', () => {
    const r = monthlyForGoal({ goal: 10_500, current: 10_000, annualRate: 0.05, months: 12 });
    expect(r.status).toBe('on-track');
    if (r.status === 'on-track') expect(r.projected).toBeCloseTo(savingsBalance(10_000, 0, 0.05, 12), 8);
  });

  it('zero rate divides the gap evenly', () => {
    const r = monthlyForGoal({ goal: 12_000, current: 0, annualRate: 0, months: 12 });
    if (r.status === 'ok') expect(r.monthly).toBe(1_000);
    else throw new Error('expected ok');
  });
});

describe('timeToGoal', () => {
  it('calculator defaults ($50k goal, $5k, $500/mo, 5%): 6 years 2 months, first month at or above the goal', () => {
    const r = timeToGoal({ goal: 50_000, current: 5_000, monthly: 500, annualRate: 0.05 });
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(formatMonthsShort(r.months)).toBe('6 yrs 2 mo');
    expect(r.balance).toBeGreaterThanOrEqual(50_000);
    expect(savingsBalance(5_000, 500, 0.05, r.months - 1)).toBeLessThan(50_000);
    expect(r.totalContributions + r.interestEarned).toBeCloseTo(r.balance, 6);
  });

  it('round-trips with monthlyForGoal: paying the solved amount reaches the goal on the deadline', () => {
    const r = rng(11);
    for (let k = 0; k < 500; k++) {
      const goal = 5_000 + Math.round(r() * 200_000);
      const current = Math.round(r() * goal * 0.3);
      const rate = Math.round(r() * 100) / 1_000;
      const months = 2 + Math.floor(r() * 240);
      const m = monthlyForGoal({ goal, current, annualRate: rate, months });
      if (m.status !== 'ok') continue;
      // A hair above the exact payment must arrive by the deadline, a hair below must not.
      const fast = timeToGoal({ goal, current, monthly: m.monthly * (1 + 1e-9), annualRate: rate });
      const slow = timeToGoal({ goal, current, monthly: m.monthly * (1 - 1e-6), annualRate: rate });
      expect(fast.status).toBe('ok');
      if (fast.status === 'ok') expect(fast.months).toBeLessThanOrEqual(months);
      if (slow.status === 'ok') expect(slow.months).toBeGreaterThanOrEqual(months);
    }
  });

  it('no deposits and no interest is unreachable', () => {
    expect(timeToGoal({ goal: 1_000, current: 0, monthly: 0, annualRate: 0 }).status).toBe('unreachable');
  });

  it('beyond 100 years is unreachable, with the capped balance', () => {
    const r = timeToGoal({ goal: 10_000_000, current: 0, monthly: 10, annualRate: 0.01 });
    expect(r.status).toBe('unreachable');
    if (r.status === 'unreachable') {
      expect(r.maxMonths).toBe(MAX_GOAL_MONTHS);
      expect(r.balanceAtMax).toBeCloseTo(savingsBalance(0, 10, 0.01, MAX_GOAL_MONTHS), 4);
    }
  });

  it('already at the goal', () => {
    expect(timeToGoal({ goal: 1_000, current: 1_000, monthly: 0, annualRate: 0 }).status).toBe('reached');
  });
});

describe('savingsPath', () => {
  it('monthly rows up to 36 months, yearly beyond with a final row', () => {
    expect(savingsPath(0, 100, 0.05, 6).map((r) => r.month)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(savingsPath(0, 100, 0.05, 61).map((r) => r.month)).toEqual([0, 12, 24, 36, 48, 60, 61]);
  });
});

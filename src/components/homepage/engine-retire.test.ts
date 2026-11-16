import { describe, it, expect } from 'vitest';
import { solveRetirementAge } from '../../lib/retirement';
import { RETIREMENT_DEFAULTS } from './engine-math';
import { defaultRetireAnswer, engineRetirement, wholeRetirementAge } from './engine-retire';

describe('engineRetirement: the Retirement Age solver (MATH-US-08)', () => {
  const R = RETIREMENT_DEFAULTS;

  it('reaches the target at the tool defaults and shows the tool age', () => {
    const a = engineRetirement(R.currentAge, R.currentSavings, R.monthlyContribution);
    const tool = solveRetirementAge({
      currentAge: 30, currentSavings: 50_000, monthlyContribution: 500, annualReturn: 0.07, target: 1_000_000, maxAge: 90,
    });
    expect(a.result).toEqual(tool);
    expect(a.result.status).toBe('reached');
    if (a.result.status === 'reached') {
      expect(a.wholeAge).toBe(wholeRetirementAge(a.result.age));
      expect(a.duration).toMatch(/^\d+ years?( \d+ months?)?$/);
    }
  });

  it('the build-time default is the answer for the default inputs', () => {
    expect(defaultRetireAnswer()).toEqual(engineRetirement(R.currentAge, R.currentSavings, R.monthlyContribution));
    // It crosses to the island as a JSON prop, so it must survive serialisation unchanged.
    const d = defaultRetireAnswer();
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });

  it('reports "unreachable" instead of "Age 90" (age 65, $100 a month, nothing saved)', () => {
    const a = engineRetirement(65, 0, 100);
    expect(a.result.status).toBe('unreachable');
    expect(a.wholeAge).toBeNull();
    expect(a.duration).toBeNull();
    if (a.result.status === 'unreachable') {
      expect(a.result.maxAge).toBe(90);
      // The review's figure: the balance at 90 is about $81,007, far short of $1,000,000.
      expect(Math.round(a.result.balanceAtMaxAge)).toBeGreaterThan(80_000);
      expect(Math.round(a.result.balanceAtMaxAge)).toBeLessThan(82_000);
      expect(a.result.shortfall).toBeGreaterThan(900_000);
    }
  });

  it('says "already" when savings meet the target', () => {
    expect(engineRetirement(40, 1_000_000, 100).result.status).toBe('already');
  });
});

import { describe, it, expect } from 'vitest';
import {
  balanceAfterMonths,
  toTodaysMoney,
  projectionRows,
  projectRetirement,
  solveRetirementAge,
  solveRequiredMonthly,
  retirementMilestones,
  usFullRetirementAge,
  check401kLimit,
  formatDuration,
} from './retirement';
import { compoundInterest } from './calculator-utils';
import { US_401K } from './us-rates';

const TODAY = { y: 2026, m: 11, d: 12 };

/** Deterministic PRNG so the property tests are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('balanceAfterMonths -- external worked examples', () => {
  it('lump sum: $10,000 at 6% compounded monthly for 10 years = $18,193.97', () => {
    expect(balanceAfterMonths(10_000, 0, 0.06, 120)).toBeCloseTo(18_193.97, 2);
  });

  it('ordinary annuity: $100 a month at 6% for 12 months = $1,233.56', () => {
    expect(balanceAfterMonths(0, 100, 0.06, 12)).toBeCloseTo(1_233.56, 2);
  });

  it('zero return is simple addition', () => {
    expect(balanceAfterMonths(1_000, 50, 0, 24)).toBe(2_200);
  });

  it('agrees with the shared compoundInterest() at monthly compounding (1,000 random cases)', () => {
    const r = rng(7);
    for (let k = 0; k < 1_000; k++) {
      const p = Math.round(r() * 500_000);
      const c = Math.round(r() * 5_000);
      const rate = Math.round(r() * 250) / 1_000;
      const years = 1 + Math.floor(r() * 60);
      const a = balanceAfterMonths(p, c, rate, years * 12);
      const b = compoundInterest(p, c, rate, years, 12, 'end');
      expect(Math.abs(a - b) / Math.max(1, b)).toBeLessThan(1e-9);
    }
  });

  it('treats non-finite or negative inputs as zero instead of returning NaN', () => {
    expect(balanceAfterMonths(Number.NaN, 100, 0.05, 12)).toBeCloseTo(balanceAfterMonths(0, 100, 0.05, 12), 8);
    expect(balanceAfterMonths(-5_000, 0, 0.05, 12)).toBe(0);
  });
});

describe('toTodaysMoney and projections', () => {
  it('deflates by (1 + inflation)^years', () => {
    expect(toTodaysMoney(1_000, 0.03, 10)).toBeCloseTo(744.09, 2);
  });

  it('projectRetirement: growth is never negative and totals reconcile', () => {
    const p = projectRetirement({ currentAge: 30, retirementAge: 65, currentSavings: 50_000, monthlyContribution: 500, annualReturn: 0.07, inflation: 0.03 });
    expect(p.years).toBe(35);
    expect(p.totalContributions).toBe(50_000 + 500 * 420);
    expect(p.nominal).toBeCloseTo(p.totalContributions + p.totalGrowth, 6);
    expect(p.totalGrowth).toBeGreaterThan(0);
    expect(p.real).toBeCloseTo(p.nominal / 1.03 ** 35, 6);
  });

  it('projectionRows has a row per whole year and a final mid-year row', () => {
    const rows = projectionRows({ currentAge: 30, currentSavings: 0, monthlyContribution: 100, annualReturn: 0.05, inflation: 0.02, months: 30 });
    expect(rows.map((r) => r.month)).toEqual([0, 12, 24, 30]);
    expect(rows[3].age).toBeCloseTo(32.5, 10);
    expect(rows[3].nominal).toBeCloseTo(balanceAfterMonths(0, 100, 0.05, 30), 8);
  });
});

describe('solveRetirementAge (SV-2)', () => {
  it('MATH-US-08 repro: age 65, $100/mo, 7%, $1M target is NOT reachable by 90', () => {
    const r = solveRetirementAge({ currentAge: 65, currentSavings: 0, monthlyContribution: 100, annualReturn: 0.07, target: 1_000_000 });
    expect(r.status).toBe('unreachable');
    if (r.status !== 'unreachable') return;
    expect(r.maxAge).toBe(90);
    expect(Math.round(r.balanceAtMaxAge)).toBe(81_007);
    expect(r.shortfall).toBeCloseTo(1_000_000 - r.balanceAtMaxAge, 6);
    // Contribution that would get there by 90.
    expect(r.requiredMonthly).not.toBeNull();
    expect(balanceAfterMonths(0, r.requiredMonthly!, 0.07, 300)).toBeCloseTo(1_000_000, 2);
  });

  it('calculator defaults (30, $50k, $500/mo, 7%, $1M): 29.8 years, matching the review recomputation', () => {
    const r = solveRetirementAge({ currentAge: 30, currentSavings: 50_000, monthlyContribution: 500, annualReturn: 0.07, target: 1_000_000 });
    expect(r.status).toBe('reached');
    if (r.status !== 'reached') return;
    expect(r.months / 12).toBeCloseTo(29.8, 1);
    expect(r.balance).toBeGreaterThanOrEqual(1_000_000);
    // One month earlier the target was not yet met.
    expect(balanceAfterMonths(50_000, 500, 0.07, r.months - 1)).toBeLessThan(1_000_000);
    expect(r.totalContributions).toBe(50_000 + 500 * r.months);
  });

  it('reports "already" when savings meet the target', () => {
    expect(solveRetirementAge({ currentAge: 40, currentSavings: 2_000_000, monthlyContribution: 0, annualReturn: 0.05, target: 1_000_000 }).status).toBe('already');
  });

  it('nothing saved and nothing invested is unreachable, not "age 90"', () => {
    const r = solveRetirementAge({ currentAge: 30, currentSavings: 0, monthlyContribution: 0, annualReturn: 0.07, target: 100_000 });
    expect(r.status).toBe('unreachable');
  });

  it('invariant over 2,000 random cases: reached <=> balance at max age >= target, and the month is the first one', () => {
    const r = rng(42);
    for (let k = 0; k < 2_000; k++) {
      const currentAge = 18 + Math.floor(r() * 62);
      const p = Math.round(r() * 300_000);
      const c = Math.round(r() * 3_000);
      const rate = Math.round(r() * 150) / 1_000;
      const target = 50_000 + Math.round(r() * 3_000_000);
      const res = solveRetirementAge({ currentAge, currentSavings: p, monthlyContribution: c, annualReturn: rate, target });
      const maxMonths = (90 - currentAge) * 12;
      const atMax = balanceAfterMonths(p, c, rate, maxMonths);
      if (p >= target) {
        expect(res.status).toBe('already');
      } else if (atMax >= target * (1 + 1e-12)) {
        expect(res.status).toBe('reached');
        if (res.status === 'reached') {
          expect(balanceAfterMonths(p, c, rate, res.months)).toBeGreaterThanOrEqual(target * (1 - 1e-12));
          expect(balanceAfterMonths(p, c, rate, res.months - 1)).toBeLessThan(target * (1 + 1e-12));
          expect(res.age).toBeLessThanOrEqual(90);
        }
      } else if (atMax < target * (1 - 1e-12)) {
        expect(res.status).toBe('unreachable');
      }
    }
  });

  it('monotonic: a bigger monthly contribution never retires you later', () => {
    let prev = Infinity;
    for (let c = 100; c <= 5_000; c += 100) {
      const res = solveRetirementAge({ currentAge: 30, currentSavings: 10_000, monthlyContribution: c, annualReturn: 0.06, target: 1_000_000 });
      const months = res.status === 'reached' ? res.months : Infinity;
      expect(months).toBeLessThanOrEqual(prev);
      prev = months;
    }
  });
});

describe('solveRequiredMonthly', () => {
  it('$1M in 35 years from nothing at 7% needs $555/month (methodology example)', () => {
    const r = solveRequiredMonthly({ currentSavings: 0, target: 1_000_000, annualReturn: 0.07, months: 420 });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(Math.round(r.monthly)).toBe(555);
  });

  it('...and $880/month at 5%', () => {
    const r = solveRequiredMonthly({ currentSavings: 0, target: 1_000_000, annualReturn: 0.05, months: 420 });
    if (r.status === 'ok') expect(Math.round(r.monthly)).toBe(880);
    else throw new Error('expected ok');
  });

  it('round-trips: saving the answer reaches the target exactly', () => {
    const r = solveRequiredMonthly({ currentSavings: 50_000, target: 1_000_000, annualReturn: 0.07, months: 420 });
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(balanceAfterMonths(50_000, r.monthly, 0.07, 420)).toBeCloseTo(1_000_000, 4);
    expect(r.totalGrowth).toBeCloseTo(1_000_000 - r.totalContributions, 6);
    expect(r.totalGrowth).toBeGreaterThan(0);
  });

  it('CALC-UX-B repro: $2M saved for a $1M target is "already", never "-$1,000,000 interest"', () => {
    const r = solveRequiredMonthly({ currentSavings: 2_000_000, target: 1_000_000, annualReturn: 0.07, months: 420 });
    expect(r.status).toBe('already');
    if (r.status === 'already') {
      expect(r.monthly).toBe(0);
      expect(r.totalGrowth).toBeGreaterThanOrEqual(0);
      expect(r.projected).toBeGreaterThan(1_000_000);
    }
  });

  it('growth on current savings alone counts as "already" (no negative contribution)', () => {
    const r = solveRequiredMonthly({ currentSavings: 200_000, target: 1_000_000, annualReturn: 0.07, months: 420 });
    expect(r.status).toBe('already');
  });

  it('zero months left is "no-time" unless the target is already met', () => {
    expect(solveRequiredMonthly({ currentSavings: 0, target: 10, annualReturn: 0.05, months: 0 }).status).toBe('no-time');
  });
});

describe('retirementMilestones', () => {
  it('UK, 30-year-old: pension access at 57 and State Pension at 68 (MATH-UK-08)', () => {
    const ms = retirementMilestones('uk', 30, 90, TODAY);
    expect(ms.map((m) => [m.marker, m.age])).toEqual([['Pension access', 57], ['State Pension', 68]]);
    expect(ms[0].text).toContain('57');
    expect(ms[1].text).toContain('68');
    expect(ms.some((m) => m.age === 55 || m.age === 66)).toBe(false);
  });

  it('UK milestones after the end age stay listed but are not drawn (State Pension 68 when retiring at 65)', () => {
    const ms = retirementMilestones('uk', 30, 65, TODAY);
    expect(ms.map((m) => [m.age, m.onChart])).toEqual([[57, true], [68, false]]);
  });

  it('a 55-year-old who may be under 57 on 6 April 2028 still sees the rise to 57', () => {
    // Born 13 Nov 1970 - 12 Nov 1971: some turn 57 after 6 April 2028.
    const ms = retirementMilestones('uk', 55, 90, TODAY);
    const access = ms.find((m) => m.marker === 'Pension access');
    expect(access).toBeDefined();
    expect(access!.age).toBe(57);
    expect(access!.text).toContain('6 April 2028');
  });

  it('a 56-year-old (57 before April 2028) gets no pension-access item', () => {
    expect(retirementMilestones('uk', 56, 90, TODAY).some((m) => m.marker === 'Pension access')).toBe(false);
  });

  it('milestones at or before the current age are dropped', () => {
    expect(retirementMilestones('uk', 60, 90, TODAY).every((m) => m.age > 60)).toBe(true);
    expect(retirementMilestones('us', 55, 90, TODAY).map((m) => m.age)).toEqual([59.5, 60, 62, 67]);
  });

  it('US: catch-up text uses the us-rates.ts limits, and FRA is 67 for a 30-year-old', () => {
    const ms = retirementMilestones('us', 30, 90, TODAY);
    expect(ms.map((m) => m.age)).toEqual([50, 59.5, 60, 62, 67]);
    expect(ms[0].text).toContain(US_401K.catchUp.toLocaleString('en-US'));
    expect(ms[0].text).toContain(US_401K.limit.toLocaleString('en-US'));
  });

  it('EUR has no milestones', () => {
    expect(retirementMilestones('eur', 30, 90, TODAY)).toEqual([]);
  });

  it('usFullRetirementAge follows 20 CFR 404.409', () => {
    expect(usFullRetirementAge({ y: 1960, m: 1, d: 2 })).toBe(67);
    expect(usFullRetirementAge({ y: 1960, m: 1, d: 1 })).toBeCloseTo(66 + 10 / 12, 10);
    expect(usFullRetirementAge({ y: 1957, m: 6, d: 1 })).toBeCloseTo(66.5, 10);
    expect(usFullRetirementAge({ y: 1950, m: 6, d: 1 })).toBe(66);
  });
});

describe('check401kLimit (SV-6)', () => {
  it('reads the limit and catch-up from us-rates.ts', () => {
    const under50 = check401kLimit(1_000, 40);
    expect(under50.annualLimit).toBe(US_401K.limit);
    expect(under50.catchUpBand).toBe('none');
    const over50 = check401kLimit(1_000, 55);
    expect(over50.annualLimit).toBe(US_401K.limit + US_401K.catchUp);
    expect(over50.catchUpBand).toBe('50+');
  });

  it('flags a monthly saving above the annual limit', () => {
    expect(check401kLimit(US_401K.limit / 12, 40).status).toBe('within');
    expect(check401kLimit(US_401K.limit / 12 + 1, 40).status).toBe('exceeds');
    expect(check401kLimit(US_401K.limit / 12 + 1, 50).status).toBe('within');
    expect(check401kLimit((US_401K.limit + US_401K.catchUp) / 12 + 1, 64).status).toBe('exceeds');
  });

  it('ages 60-63: never judged against the age-50 limit (higher catch-up applies)', () => {
    // Reviewer repro: $33,523 a year at 61 is above $24,500 + $8,000 but within the 60-63 limit.
    const r = check401kLimit(33_523 / 12, 61);
    expect(r.catchUpBand).toBe('60-63');
    expect(r.status).toBe('higher-catch-up');
    expect(r.annualLimit).toBeNull();
    for (const age of [60, 61, 62, 63]) {
      expect(check401kLimit(5_000, age).status).not.toBe('exceeds');
      expect(check401kLimit(2_000, age).status).toBe('within');
    }
    expect(check401kLimit(33_523 / 12, 59).status).toBe('exceeds');
  });
});

describe('formatDuration', () => {
  it('formats whole months', () => {
    expect(formatDuration(358)).toBe('29 years 10 months');
    expect(formatDuration(12)).toBe('1 year');
    expect(formatDuration(1)).toBe('1 month');
  });
});

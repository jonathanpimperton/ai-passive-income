/**
 * Tests for the investment growth engine and solvers.
 *
 * External worked examples (accessed 2026-11-12) are from the open textbook
 * "Business Math: A Step-by-Step Handbook" (J. Olivier, Lyryx; eCampusOntario
 * edition), https://ecampusontario.pressbooks.pub/businessmathtextbook/
 *   - Example 11.2.2 (chapter 11-2-future-value-of-annuities)
 *   - Example 11.2.3, year-1 segment (same chapter)
 *   - Example 11.6.3 (chapter 11-6-annuity-interest-rate)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  futureValue,
  growthSchedule,
  monthlyRateFor,
  solveMonthsToTarget,
  solveRequiredContribution,
  solveRequiredPrincipal,
  solveRequiredRate,
  requiredContributionRaw,
  requiredPrincipalRaw,
  MAX_SOLVE_MONTHS,
  type ContributionTiming,
  type GrowthInputs,
} from './investment-solvers';
import { formatMonthsShort, formatMoneyGuarded } from './result-format';
import { evaluateFigure } from './figures';

/* Heavy under load (another build or test run on the same machine): an explicit generous timeout
 * for the whole file instead of vitest's 5 s default. The tests are not shrunk. */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

/** Deterministic PRNG (mulberry32) so property tests are reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The pre-Nov-2026 compoundInterest formula, frozen here for comparison. */
function oldCompoundInterest(p: number, pmt: number, r: number, t: number, n = 12, timing: ContributionTiming = 'end') {
  const periodic = pmt * (12 / n);
  const principalGrowth = p * Math.pow(1 + r / n, n * t);
  let contrib = r > 0 ? periodic * ((Math.pow(1 + r / n, n * t) - 1) / (r / n)) : periodic * n * t;
  if (timing === 'beginning' && r > 0) contrib *= 1 + r / n;
  return principalGrowth + contrib;
}

const FREQS = [1, 2, 4, 12, 365];

describe('futureValue: external worked examples', () => {
  it('Example 11.2.2: $10,000 + $250 month-end at 9% compounded semi-annually for 20 years = $221,693.59', () => {
    const fv = futureValue(
      { principal: 10000, monthlyContribution: 250, annualRate: 0.09, compoundingPerYear: 2, timing: 'end' },
      240,
    );
    expect(fv).toBeCloseTo(221693.59, 1);
  });

  it('Example 11.2.3 (year 1): $1,000 + $300 month-end at 5% compounded semi-annually for 1 year = $4,733.41', () => {
    const fv = futureValue(
      { principal: 1000, monthlyContribution: 300, annualRate: 0.05, compoundingPerYear: 2, timing: 'end' },
      12,
    );
    expect(fv).toBeCloseTo(4733.41, 1);
  });

  it('equivalent monthly rate for 8% compounded quarterly is 0.00662271 (textbook Example 13.2.1)', () => {
    expect(monthlyRateFor(0.08, 4)).toBeCloseTo(0.00662271, 8);
  });
});

describe('futureValue: deposits stay monthly whatever the compounding (MATH-US-09)', () => {
  const base = { principal: 10000, monthlyContribution: 200, annualRate: 0.07 };

  it('annual compounding, end of month: $140,204 (review recomputation), not the old $137,086', () => {
    const fv = futureValue({ ...base, compoundingPerYear: 1, timing: 'end' }, 240);
    expect(fv).toBeCloseTo(140204, -1);
    expect(Math.abs(fv - 137086)).toBeGreaterThan(3000);
  });

  it('annual compounding, start of month: $140,778, not the old $143,973', () => {
    const fv = futureValue({ ...base, compoundingPerYear: 1, timing: 'beginning' }, 240);
    expect(fv).toBeCloseTo(140778, -1);
  });

  it('daily vs monthly gain is about $409, not the old $705', () => {
    const daily = futureValue({ ...base, compoundingPerYear: 365 }, 240);
    const monthly = futureValue({ ...base, compoundingPerYear: 12 }, 240);
    expect(daily - monthly).toBeGreaterThan(395);
    expect(daily - monthly).toBeLessThan(425);
  });

  it('a lump sum grows by exactly (1 + r/n)^(n t) for every n', () => {
    for (const n of FREQS) {
      const fv = futureValue({ principal: 1000, monthlyContribution: 0, annualRate: 0.06, compoundingPerYear: n }, 120);
      expect(fv / 1000).toBeCloseTo(Math.pow(1 + 0.06 / n, n * 10), 10);
    }
  });

  it('monthly compounding matches the old formula to 1e-10 relative (hubs and other callers unchanged)', () => {
    const rand = rng(12);
    for (let k = 0; k < 5000; k++) {
      const p = Math.round(rand() * 1e6);
      const pmt = Math.round(rand() * 5e4);
      const r = rand() * 0.25;
      const t = rand() < 0.5 ? Math.floor(rand() * 101) : rand() * 100;
      const timing: ContributionTiming = rand() < 0.5 ? 'end' : 'beginning';
      const fv = futureValue({ principal: p, monthlyContribution: pmt, annualRate: r, compoundingPerYear: 12, timing }, t * 12);
      const old = oldCompoundInterest(p, pmt, r, t, 12, timing);
      expect(Math.abs(fv - old)).toBeLessThanOrEqual(Math.max(1e-6, Math.abs(old) * 1e-10));
    }
  });

  it('more frequent compounding never lowers the balance (positive rate)', () => {
    const rand = rng(3);
    for (let k = 0; k < 500; k++) {
      const inputs = { principal: rand() * 1e5, monthlyContribution: rand() * 2000, annualRate: 0.001 + rand() * 0.2 };
      const months = 1 + Math.floor(rand() * 600);
      let prev = -Infinity;
      for (const n of FREQS) {
        const fv = futureValue({ ...inputs, compoundingPerYear: n }, months);
        expect(fv).toBeGreaterThanOrEqual(prev - 1e-6);
        prev = fv;
      }
    }
  });
});

describe('futureValue: negative and zero rates', () => {
  it('zero rate: balance = principal + deposits', () => {
    expect(futureValue({ principal: 5000, monthlyContribution: 100, annualRate: 0 }, 120)).toBeCloseTo(17000, 8);
  });

  it('negative net rate shrinks deposits too (MATH-US-17 fee > return)', () => {
    const fv = futureValue({ principal: 0, monthlyContribution: 500, annualRate: -0.01 }, 360);
    expect(fv).toBeLessThan(500 * 360);
    // Exact annuity with i = -0.01/12
    const i = -0.01 / 12;
    expect(fv).toBeCloseTo((500 * (Math.pow(1 + i, 360) - 1)) / i, 4);
  });

  it('balance = contributions + growth identity in the schedule', () => {
    const rows = growthSchedule({ principal: 1000, monthlyContribution: 50, annualRate: 0.05, compoundingPerYear: 4 }, 10);
    expect(rows).toHaveLength(11);
    for (const r of rows) expect(r.balance).toBeCloseTo(r.totalContributions + r.totalInterest, 1);
  });

  it('rows are exact, not rounded to cents: the display rounds once, so it cannot differ from the engine by $1', () => {
    // $500 a month for 30 years at 7% is $609,985.4979: rounding to cents first gives $609,985.50, which
    // a whole-dollar display then rounds UP to $609,986, while the engine and the figure token say $609,985
    // (Nov 2026 follow-up, CompoundInterestCalc double rounding).
    const inputs = { principal: 0, monthlyContribution: 500, annualRate: 0.07 };
    const last = growthSchedule(inputs, 30).at(-1)!;
    expect(last.balance).toBe(futureValue(inputs, 360));
    expect(formatMoneyGuarded(last.balance, 'USD')).toBe('$609,985');
    expect(formatMoneyGuarded(last.balance, 'USD')).toBe(evaluateFigure('compoundFV(0, 500, 7, 30) | usd'));
    // The headline split follows: interest = balance - paid in, both exact.
    expect(last.totalInterest).toBe(last.balance - last.totalContributions);
    expect(formatMoneyGuarded(last.totalInterest, 'USD')).toBe(evaluateFigure('compoundEarned(0, 500, 7, 30) | usd'));
  });

  it('every schedule row equals the engine exactly over a grid (and so prints what the tokens print)', () => {
    let checked = 0;
    for (const principal of [0, 10000, 100000]) {
      for (const monthly of [0, 250, 1000]) {
        for (const ratePct of [1, 7, 10]) {
          for (const compounding of [1, 12, 365]) {
            for (const timing of ['end', 'beginning'] as const) {
              const inputs = { principal, monthlyContribution: monthly, annualRate: ratePct / 100, compoundingPerYear: compounding, timing };
              const rows = growthSchedule(inputs, 40);
              for (const row of rows) {
                const months = row.year * 12;
                expect(row.balance).toBe(futureValue(inputs, months));
                expect(row.totalContributions).toBe(principal + monthly * months);
                expect(row.totalInterest).toBe(row.balance - row.totalContributions);
                checked++;
              }
            }
          }
        }
      }
    }
    expect(checked).toBe(3 * 3 * 3 * 3 * 2 * 41);
  });

  it('growthSchedule adds an exact final row for a partial year', () => {
    const rows = growthSchedule({ principal: 1000, monthlyContribution: 50, annualRate: 0.05 }, 15, 191);
    expect(rows).toHaveLength(17);
    expect(rows[16].year).toBeCloseTo(15.92, 2);
    expect(rows[16].totalContributions).toBeCloseTo(1000 + 50 * 191, 6);
  });
});

describe('solveRequiredRate', () => {
  it('Example 11.6.3: $5,000 + $250 at the start of each month for 14 years to $100,000 needs 8.8088% compounded monthly', () => {
    const s = solveRequiredRate(5000, 250, 100000, 168, 12, 'beginning');
    expect(s.status).toBe('ok');
    if (s.status === 'ok') expect(s.rate * 100).toBeCloseTo(8.8088, 3);
  });

  it('reports a negative rate when the target is below the money paid in (MATH-US-17 nit, was 0.00%)', () => {
    const s = solveRequiredRate(10000, 200, 50000, 240);
    expect(s.status).toBe('ok');
    if (s.status === 'ok') {
      expect(s.rate).toBeLessThan(0);
      expect(futureValue({ principal: 10000, monthlyContribution: 200, annualRate: s.rate }, 240)).toBeCloseTo(50000, 2);
    }
  });

  it('reports metAtAnyRate (no fake -99% "solution") when even losing 99% a year overshoots', () => {
    const s = solveRequiredRate(10000, 200, 1000, 240);
    expect(s.status).toBe('metAtAnyRate');
    if (s.status === 'metAtAnyRate') {
      expect(s.balanceAtMinRate).toBeGreaterThanOrEqual(1000);
      expect(s.balanceAtMinRate).toBeCloseTo(futureValue({ principal: 10000, monthlyContribution: 200, annualRate: -0.99 }, 240), 6);
    }
  });

  it('says tooHigh when even 100% a year falls short', () => {
    const s = solveRequiredRate(100, 0, 1e12, 12);
    expect(s.status).toBe('tooHigh');
  });

  it('invalid when nothing is invested', () => {
    expect(solveRequiredRate(0, 0, 1000, 120).status).toBe('invalid');
  });

  it('property: every ok solution reproduces the target (3,000 random cases, all frequencies and timings)', () => {
    const rand = rng(99);
    for (let k = 0; k < 3000; k++) {
      const p = rand() < 0.2 ? 0 : rand() * 5e5;
      const pmt = rand() < 0.2 && p > 0 ? 0 : rand() * 5000;
      const months = 12 * (1 + Math.floor(rand() * 60));
      const n = FREQS[Math.floor(rand() * FREQS.length)];
      const timing: ContributionTiming = rand() < 0.5 ? 'end' : 'beginning';
      const target = 1000 + rand() * 3e6;
      const s = solveRequiredRate(p, pmt, target, months, n, timing);
      if (s.status === 'ok') {
        const fv = futureValue({ principal: p, monthlyContribution: pmt, annualRate: s.rate, compoundingPerYear: n, timing }, months);
        expect(Math.abs(fv - target)).toBeLessThan(Math.max(0.01, target * 1e-9));
        expect(s.rate).toBeGreaterThan(-0.99);
      } else if (s.status === 'tooHigh') {
        expect(s.balanceAtMaxRate).toBeLessThan(target);
      } else if (s.status === 'metAtAnyRate') {
        expect(s.balanceAtMinRate).toBeGreaterThanOrEqual(target);
      }
    }
  });
});

describe('solveRequiredContribution / solveRequiredPrincipal', () => {
  it('round-trips: solved deposit reaches the target (all frequencies)', () => {
    const rand = rng(7);
    for (let k = 0; k < 2000; k++) {
      const p = rand() * 2e5;
      const r = rand() * 0.15;
      const months = 12 * (1 + Math.floor(rand() * 50));
      const n = FREQS[Math.floor(rand() * FREQS.length)];
      const timing: ContributionTiming = rand() < 0.5 ? 'end' : 'beginning';
      const target = rand() * 3e6;
      const s = solveRequiredContribution(p, target, r, months, n, timing);
      if (s.status === 'needed') {
        expect(s.monthly).toBeGreaterThan(0);
        const fv = futureValue({ principal: p, monthlyContribution: s.monthly, annualRate: r, compoundingPerYear: n, timing }, months);
        expect(fv).toBeCloseTo(target, 4);
      } else if (s.status === 'alreadyMet') {
        expect(s.balanceWithoutDeposits).toBeGreaterThanOrEqual(target);
      }
    }
  });

  it('starting amount alone overshooting is reported, not shown as a negative deposit', () => {
    const s = solveRequiredContribution(500000, 100000, 0.07, 240);
    expect(s.status).toBe('alreadyMet');
  });

  it('principal round-trips and deposits-alone is reported', () => {
    const s = solveRequiredPrincipal(300, 500000, 0.07, 240);
    expect(s.status).toBe('needed');
    if (s.status === 'needed') {
      expect(futureValue({ principal: s.principal, monthlyContribution: 300, annualRate: 0.07 }, 240)).toBeCloseTo(500000, 4);
    }
    expect(solveRequiredPrincipal(200, 100000, 0.07, 240).status).toBe('alreadyMet');
  });

  it('raw closed forms invert futureValue (non-monthly compounding)', () => {
    const d = requiredContributionRaw(10000, 100000, 0.08, 180, 1);
    expect(futureValue({ principal: 10000, monthlyContribution: d, annualRate: 0.08, compoundingPerYear: 1 }, 180)).toBeCloseTo(100000, 6);
    const p = requiredPrincipalRaw(200, 100000, 0.07, 240, 365, 'beginning');
    expect(
      futureValue({ principal: p, monthlyContribution: 200, annualRate: 0.07, compoundingPerYear: 365, timing: 'beginning' }, 240),
    ).toBeCloseTo(100000, 6);
  });
});

describe('solveMonthsToTarget (Investment Return "Time" tab)', () => {
  it('CALC-UX-B-02 freeze repro: $10k, $0/mo, 3%, target $1M returns "not within 100 years" quickly', () => {
    const t0 = Date.now();
    const s = solveMonthsToTarget({ principal: 10000, monthlyContribution: 0, annualRate: 0.03 }, 1_000_000);
    expect(Date.now() - t0).toBeLessThan(250);
    expect(s.status).toBe('notWithin');
    if (s.status === 'notWithin') {
      expect(s.maxMonths).toBe(MAX_SOLVE_MONTHS);
      expect(s.balanceAtLimit).toBeCloseTo(10000 * Math.pow(1 + 0.03 / 12, 1200), 4);
      expect(s.balanceAtLimit).toBeLessThan(1_000_000);
    }
  });

  it('MATH-US-10 repro: 7,000 + 1,450/mo at 8.5% to 765,000 is a whole number of months, never "12 mo"', () => {
    const s = solveMonthsToTarget({ principal: 7000, monthlyContribution: 1450, annualRate: 0.085 }, 765000);
    expect(s.status).toBe('reached');
    if (s.status === 'reached') {
      expect(Number.isInteger(s.months)).toBe(true);
      expect(formatMonthsShort(s.months)).not.toMatch(/12 mo/);
      expect(s.months).toBe(216);
      expect(formatMonthsShort(s.months)).toBe('18 years');
    }
  });

  it('target at or below the starting balance is already met', () => {
    expect(solveMonthsToTarget({ principal: 5000, monthlyContribution: 0, annualRate: 0.05 }, 5000)).toEqual({
      status: 'alreadyMet',
      months: 0,
    });
  });

  it('nothing invested is "not within", never Infinity', () => {
    const s = solveMonthsToTarget({ principal: 0, monthlyContribution: 0, annualRate: 0.07 }, 1000);
    expect(s.status).toBe('notWithin');
  });

  it('property: reached k is the FIRST month at or above the target; always terminates (10,000 random cases)', () => {
    const rand = rng(2026);
    const t0 = Date.now();
    for (let c = 0; c < 10000; c++) {
      const inputs: GrowthInputs = {
        principal: rand() < 0.3 ? 0 : rand() * 1e6,
        monthlyContribution: rand() < 0.3 ? 0 : rand() * 5e4,
        annualRate: rand() < 0.1 ? 0 : rand() < 0.05 ? -rand() * 0.05 : rand() * 0.25,
        compoundingPerYear: FREQS[Math.floor(rand() * FREQS.length)],
        timing: rand() < 0.5 ? 'end' : 'beginning',
      };
      const target = 1000 + rand() * 1e7;
      const s = solveMonthsToTarget(inputs, target);
      if (s.status === 'reached') {
        expect(futureValue(inputs, s.months)).toBeGreaterThanOrEqual(target - 1e-6);
        expect(futureValue(inputs, s.months - 1)).toBeLessThan(target);
        expect(s.months).toBeLessThanOrEqual(MAX_SOLVE_MONTHS);
      } else if (s.status === 'notWithin') {
        expect(s.balanceAtLimit).toBeLessThan(target);
      } else {
        expect(inputs.principal).toBeGreaterThanOrEqual(target);
      }
    }
    // 10,000 worst-case scans of 1,200 months each must stay fast.
    expect(Date.now() - t0).toBeLessThan(20000);
  });
});

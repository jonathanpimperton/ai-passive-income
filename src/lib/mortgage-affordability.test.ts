import { describe, it, expect } from 'vitest';
import {
  AFFORDABILITY_DEFAULTS,
  estimateUkTakeHome,
  solveAffordability,
  solveEurAffordability,
  solveUkAffordability,
  solveUsAffordability,
  type UsAffordabilityInput,
} from './mortgage-affordability';

/**
 * The review's reference solver (docs/review-2026-11, MATH-US afford.mjs)
 * used the tool's previous defaults: 6.75%, 30 years, 1.2% property tax,
 * $1,500 insurance, no HOA, 0.5% PMI. Its figures are used below as
 * external worked examples.
 */
const REVIEW: UsAffordabilityInput = {
  region: 'us',
  annualIncome: 80_000,
  monthlyDebts: 500,
  deposit: 40_000,
  ratePct: 6.75,
  termYears: 30,
  propertyTaxRate: 1.2,
  insuranceAnnual: 1_500,
  hoaMonthly: 0,
  pmiRate: 0.5,
};

/**
 * Independent second implementation (test-only): bisection on price, on each
 * side of the PMI knee (price = 5 x deposit), with a housing budget of
 * min(front% x G, back% x G - debts). Written without the library's algebra.
 */
function bisectMaxPrice(p: UsAffordabilityInput): number {
  const G = p.annualIncome / 12;
  const budget = Math.min((G * (p.frontEndPct ?? 28)) / 100, (G * (p.backEndPct ?? 36)) / 100 - p.monthlyDebts);
  if (budget <= 0) return 0;
  const r = p.ratePct / 1200;
  const n = p.termYears * 12;
  const f = r > 0 ? (r * (1 + r) ** n) / ((1 + r) ** n - 1) : 1 / n;
  const D = p.deposit;
  const cost = (P: number, pmiOn: boolean) => {
    const L = Math.max(0, P - D);
    return L * f + (P * p.propertyTaxRate) / 1200 + p.insuranceAnnual / 12 + p.hoaMonthly + (pmiOn ? (L * p.pmiRate) / 1200 : 0);
  };
  const solve = (lo: number, hi: number, pmiOn: boolean): number | null => {
    if (cost(lo, pmiOn) > budget) return null;
    if (cost(hi, pmiOn) <= budget) return hi;
    for (let i = 0; i < 200; i++) {
      const m = (lo + hi) / 2;
      if (cost(m, pmiOn) <= budget) lo = m;
      else hi = m;
    }
    return lo;
  };
  const knee = D / 0.2;
  const noPmi = solve(D, Math.max(D, knee), false);
  const withPmi = solve(Math.max(D, knee) + 1e-9, 1e10, true);
  if (withPmi !== null && withPmi > (noPmi ?? -1)) return withPmi;
  if (noPmi !== null) return noPmi;
  // Cannot even carry tax + insurance on a home worth the deposit: cash-only price.
  const t = p.propertyTaxRate / 1200;
  const fixed = p.insuranceAnnual / 12 + p.hoaMonthly;
  if (budget - fixed <= 0) return 0;
  return t > 0 ? Math.min(D, (budget - fixed) / t) : D;
}

/** Deterministic PRNG so failures reproduce. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('US 28/36 rule -- external worked examples (review afford4.mjs)', () => {
  it.each([
    ['defaults: $80k income, $500 debts, $40k down', {}, 255_329],
    ['$80k income, $0 debts, $40k down (S1-7 acceptance)', { monthlyDebts: 0 }, 255_329],
    ['$75k income, $0 debts, $50k down', { annualIncome: 75_000, monthlyDebts: 0, deposit: 50_000 }, 250_000],
    ['$120k income, $300 debts, $60k down', { annualIncome: 120_000, monthlyDebts: 300, deposit: 60_000 }, 390_902],
    ['$60k income, $800 debts, $20k down', { annualIncome: 60_000, monthlyDebts: 800, deposit: 20_000 }, 128_192],
  ])('%s -> $%d', (_label, over, expected) => {
    const r = solveUsAffordability({ ...REVIEW, ...over });
    expect(Math.round(r.maxPrice)).toBe(expected);
  });

  it('an $80k income never spends more than 28% of gross on housing (front-end cap)', () => {
    const r = solveUsAffordability({ ...REVIEW, monthlyDebts: 0 });
    expect(r.binding).toBe('front-end');
    expect(r.totalMonthly).toBeLessThanOrEqual((80_000 / 12) * 0.28 + 1e-6);
    expect(r.frontEndRatio).toBeCloseTo(28, 6);
  });

  it('back-end binds when debts are large', () => {
    // $5k down: well inside the PMI region, so the budget is used in full.
    const r = solveUsAffordability({ ...REVIEW, monthlyDebts: 1_000, deposit: 5_000 });
    expect(r.binding).toBe('back-end');
    expect(r.backEndRatio).toBeCloseTo(36, 6);
    // $40k down: the cheapest feasible point is exactly 20% down (the PMI
    // knee), so the ratio stays under the limit rather than paying PMI.
    const knee = solveUsAffordability({ ...REVIEW, monthlyDebts: 1_000 });
    expect(knee.maxLoan).toBeCloseTo(4 * 40_000, 6);
    expect(knee.needsPMI).toBe(false);
    expect(knee.backEndRatio).toBeLessThan(36);
  });
});

describe('PMI boundary -- no oscillation (MATH-US-06)', () => {
  // The review's 36%-only reproduction: income 100k, debts 300.
  const BACK_ONLY = { ...REVIEW, annualIncome: 100_000, monthlyDebts: 300, frontEndPct: 100 };

  it.each([
    [50_000, 369_513],
    [75_000, 391_350],
    [80_000, 400_000], // exactly 20% down: no PMI (old solver gave $391,133)
    [90_000, 421_954],
  ])('$%d down -> $%d', (deposit, expected) => {
    const r = solveUsAffordability({ ...BACK_ONLY, deposit });
    expect(Math.round(r.maxPrice)).toBe(expected);
  });

  it('more deposit never lowers the maximum price', () => {
    let prev = -1;
    for (let d = 0; d <= 200_000; d += 500) {
      const r = solveUsAffordability({ ...BACK_ONLY, deposit: d });
      expect(r.maxPrice).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = r.maxPrice;
    }
  });
});

describe('10,000 random cases agree with an independent bisection solver', () => {
  it('max price within $1, never over budget', () => {
    const rand = rng(20261112);
    const between = (a: number, b: number) => a + rand() * (b - a);
    let worst = 0;
    for (let k = 0; k < 10_000; k++) {
      const p: UsAffordabilityInput = {
        region: 'us',
        annualIncome: Math.round(between(20_000, 500_000)),
        monthlyDebts: Math.round(between(0, 3_000)),
        deposit: Math.round(between(0, 250_000)),
        ratePct: +between(0.5, 12).toFixed(3),
        termYears: [10, 15, 20, 30][k % 4],
        propertyTaxRate: +between(0, 4).toFixed(2),
        insuranceAnnual: Math.round(between(0, 6_000)),
        hoaMonthly: Math.round(between(0, 800)),
        pmiRate: +between(0, 2).toFixed(2),
        frontEndPct: k % 5 === 0 ? 31 : 28,
        backEndPct: k % 7 === 0 ? 43 : 36,
      };
      const lib = solveUsAffordability(p);
      const ref = bisectMaxPrice(p);
      worst = Math.max(worst, Math.abs(lib.maxPrice - ref));
      expect(Number.isFinite(lib.maxPrice)).toBe(true);
      if (lib.status === 'ok') expect(lib.totalMonthly).toBeLessThanOrEqual(lib.housingBudget + 1e-6);
    }
    expect(worst).toBeLessThan(1);
  });
});

describe('US invariants and edge states', () => {
  it('monotone: more income -> more, more debt or a higher rate -> less', () => {
    const base = { ...REVIEW };
    let prev = -1;
    for (let inc = 30_000; inc <= 300_000; inc += 5_000) {
      const v = solveUsAffordability({ ...base, annualIncome: inc }).maxPrice;
      expect(v).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = v;
    }
    prev = Infinity;
    for (let debt = 0; debt <= 2_400; debt += 100) {
      const v = solveUsAffordability({ ...base, monthlyDebts: debt }).maxPrice;
      expect(v).toBeLessThanOrEqual(prev + 1e-6);
      prev = v;
    }
    prev = Infinity;
    for (let rate = 2; rate <= 12; rate += 0.25) {
      const v = solveUsAffordability({ ...base, ratePct: rate }).maxPrice;
      expect(v).toBeLessThanOrEqual(prev + 1e-6);
      prev = v;
    }
  });

  it('debts above the back-end limit -> debts-exceed, zero figures, no NaN', () => {
    const r = solveUsAffordability({ ...REVIEW, monthlyDebts: 2_500 });
    expect(r.status).toBe('debts-exceed');
    expect(r.maxPrice).toBe(0);
    expect(r.maxLoan).toBe(0);
    expect(r.totalMonthly).toBe(0);
  });

  it('insurance + HOA alone over budget -> costs-exceed (not "max price = deposit")', () => {
    const r = solveUsAffordability({ ...REVIEW, monthlyDebts: 0, hoaMonthly: 2_000 });
    expect(r.status).toBe('costs-exceed');
    expect(r.maxPrice).toBe(0);
  });

  it('property tax on the deposit alone over budget -> cash price below the deposit', () => {
    const r = solveUsAffordability({ ...REVIEW, annualIncome: 30_000, monthlyDebts: 0, deposit: 400_000, propertyTaxRate: 4 });
    expect(r.status).toBe('ok');
    expect(r.maxLoan).toBe(0);
    expect(r.maxPrice).toBeLessThan(400_000);
    expect(r.totalMonthly).toBeCloseTo(r.housingBudget, 6);
  });

  it('zero deposit: any loan carries PMI', () => {
    const r = solveUsAffordability({ ...REVIEW, deposit: 0 });
    expect(r.needsPMI).toBe(true);
    expect(r.monthlyPMI).toBeGreaterThan(0);
  });

  it('dispatches on region', () => {
    expect(solveAffordability({ ...REVIEW }).region).toBe('us');
  });
});

describe('UK mode: income multiple + rate-rise check (D11)', () => {
  const UK = {
    region: 'uk' as const,
    annualIncome: 80_000,
    monthlyDebts: 0,
    deposit: 40_000,
    ratePct: 5.39,
    termYears: 25,
  };

  it('estimates rest-of-UK take-home pay from HMRC 2026/27 rates', () => {
    // £80,000: income tax 37,700 x 20% + 29,730 x 40% = £19,432;
    // NI 37,700 x 8% + 29,730 x 2% = £3,610.60; take-home £56,957.40 a year.
    expect(estimateUkTakeHome(80_000)).toBeCloseTo(56_957.4 / 12, 6);
    expect(estimateUkTakeHome(12_570)).toBeCloseTo(12_570 / 12, 6);
    expect(estimateUkTakeHome(0)).toBe(0);
  });

  it('LTI cap binds when take-home pay is high relative to income', () => {
    const r = solveUkAffordability({ ...UK, monthlyTakeHome: 10_000 });
    expect(r.binding).toBe('lti');
    expect(r.maxLoan).toBeCloseTo(80_000 * AFFORDABILITY_DEFAULTS.ltiCap, 6);
    expect(r.incomeMultiple).toBeCloseTo(4.5, 9);
    expect(r.maxPrice).toBeCloseTo(360_000 + 40_000, 6);
  });

  it('stress rate = max(product rate, revert-to rate) + margin', () => {
    // Default: BoE average revert-to rate 6.58% + 1 point
    expect(solveUkAffordability(UK).stressRatePct).toBeCloseTo(7.58, 9);
    // A product rate above the revert-to rate is stressed from the product rate
    expect(solveUkAffordability({ ...UK, ratePct: 7.2 }).stressRatePct).toBeCloseTo(8.2, 9);
    expect(solveUkAffordability({ ...UK, revertRatePct: 6, stressMarginPct: 3 }).stressRatePct).toBeCloseTo(9, 9);
  });

  it('stress check binds with commitments: stressed payment + debts = 50% of take-home', () => {
    const r = solveUkAffordability({ ...UK, monthlyDebts: 500 });
    expect(r.binding).toBe('stress');
    expect(r.stressRatePct).toBeCloseTo(7.58, 9);
    expect(r.stressedPayment + 500).toBeCloseTo(r.monthlyTakeHome * 0.5, 6);
    expect(r.stressedShareOfTakeHome).toBeCloseTo(50, 6);
    expect(r.shareOfTakeHome).toBeLessThan(50);
    expect(r.maxLoan).toBeLessThan(80_000 * 4.5);
  });

  it('LTI adjustable 4-5.5x and term up to 35 years raise the LTI/stress limits as expected', () => {
    const lti55 = solveUkAffordability({ ...UK, monthlyTakeHome: 20_000, ltiCap: 5.5 });
    expect(lti55.maxLoan).toBeCloseTo(440_000, 6);
    const t25 = solveUkAffordability({ ...UK, termYears: 25 });
    const t35 = solveUkAffordability({ ...UK, termYears: 35 });
    expect(t35.stressLimitLoan).toBeGreaterThan(t25.stressLimitLoan);
  });

  it('debts that use up half of take-home pay -> debts-exceed with zero figures', () => {
    const r = solveUkAffordability({ ...UK, monthlyDebts: 5_000 });
    expect(r.status).toBe('debts-exceed');
    expect(r.maxPrice).toBe(0);
    expect(r.maxLoan).toBe(0);
    expect(r.stressedPayment).toBe(0);
  });

  it('flags deposits under 5% of the price', () => {
    expect(solveUkAffordability({ ...UK, deposit: 5_000, monthlyTakeHome: 10_000 }).lowDeposit).toBe(true);
    expect(solveUkAffordability({ ...UK, deposit: 40_000, monthlyTakeHome: 10_000 }).lowDeposit).toBe(false);
  });

  it('monotone in income and deposit; never NaN', () => {
    let prev = -1;
    for (let inc = 20_000; inc <= 250_000; inc += 5_000) {
      const r = solveUkAffordability({ ...UK, annualIncome: inc });
      expect(Number.isFinite(r.maxPrice)).toBe(true);
      expect(r.maxPrice).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = r.maxPrice;
    }
  });
});

describe('EUR mode', () => {
  it('one combined payment limit as a share of gross income', () => {
    const r = solveEurAffordability({ region: 'eur', annualIncome: 60_000, monthlyDebts: 200, deposit: 50_000, ratePct: 3.62, termYears: 25 });
    expect(r.paymentBudget).toBeCloseTo(60_000 / 12 * 0.36 - 200, 9);
    expect(r.monthlyPI).toBeCloseTo(r.paymentBudget, 6);
    expect(r.debtServiceRatio).toBeCloseTo(36, 6);
    expect(r.maxPrice).toBeCloseTo(r.maxLoan + 50_000, 6);
  });

  it('debts over the limit -> debts-exceed', () => {
    const r = solveEurAffordability({ region: 'eur', annualIncome: 30_000, monthlyDebts: 2_000, deposit: 10_000, ratePct: 3.62, termYears: 25 });
    expect(r.status).toBe('debts-exceed');
    expect(r.maxPrice).toBe(0);
  });
});

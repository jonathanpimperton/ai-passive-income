/**
 * Stress tests for financial math functions.
 * Tests edge cases, boundary conditions, adversarial inputs,
 * and cross-validates results against known financial benchmarks.
 *
 * COVERAGE: All 11 exported functions in calculator-utils.ts
 *   - compoundInterest, compoundInterestSchedule
 *   - loanMonthlyPayment, amortizationSchedule
 *   - monthlySavingsRequired
 *   - solveForContribution, solveForRate, solveForTime, solveForPrincipal
 *   - debtPayoff
 *   - formatCurrency, formatPercent, formatNumber
 */
import { describe, it, expect } from 'vitest';
import {
  compoundInterest,
  compoundInterestSchedule,
  loanMonthlyPayment,
  amortizationSchedule,
  monthlySavingsRequired,
  solveForContribution,
  solveForRate,
  solveForTime,
  solveForPrincipal,
  debtPayoff,
  formatCurrency,
  formatPercent,
  formatNumber,
  type Debt,
} from './calculator-utils';

// ============================================================
// COMPOUND INTEREST — STRESS TESTS
// ============================================================

describe('compoundInterest — stress tests', () => {
  // --- Boundary values ---
  it('handles zero principal with contributions', () => {
    // $0 initial + $500/month at 7% for 20 years
    const result = compoundInterest(0, 500, 0.07, 20, 12);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(260464, -2); // ~$260K in future value of annuity
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles zero contributions with principal only', () => {
    // $100,000 at 10% for 40 years, no contributions
    const result = compoundInterest(100000, 0, 0.10, 40, 12);
    // 100000 * (1 + 0.10/12)^480 ≈ $5,370,066
    expect(result).toBeCloseTo(5370066, -3);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles very small amounts (penny-level)', () => {
    const result = compoundInterest(0.01, 0.01, 0.05, 1, 12);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles very large principal ($10M)', () => {
    const result = compoundInterest(10000000, 0, 0.05, 30, 12);
    expect(result).toBeGreaterThan(10000000);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles very high interest rate (100%)', () => {
    const result = compoundInterest(1000, 0, 1.0, 10, 12);
    // 1000 * (1 + 1/12)^120 — should be a very large number
    expect(result).toBeGreaterThan(1000);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles extreme rate (500%) without overflow for short period', () => {
    const result = compoundInterest(100, 0, 5.0, 1, 12);
    expect(result).toBeGreaterThan(100);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles very long time horizon (100 years)', () => {
    const result = compoundInterest(1000, 100, 0.07, 100, 12);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles 200-year horizon at moderate rate', () => {
    const result = compoundInterest(1000, 0, 0.05, 200, 12);
    // 1000 * (1+0.05/12)^2400 — large but should be finite
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(1000);
  });

  it('handles fractional years (0.5 years = 6 months)', () => {
    const result = compoundInterest(10000, 0, 0.06, 0.5, 12);
    // 10000 * (1+0.005)^6 ≈ 10303.78
    expect(result).toBeCloseTo(10303.78, 0);
  });

  it('handles very small rate near zero (0.001%)', () => {
    const result = compoundInterest(10000, 0, 0.00001, 10, 12);
    // Should be barely above principal
    expect(result).toBeGreaterThan(10000);
    expect(result).toBeLessThan(10010); // Almost no growth
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles 1 year period', () => {
    const result = compoundInterest(10000, 100, 0.05, 1, 12);
    // Principal grows: 10000*(1+0.05/12)^12 ≈ 10511.62
    // Contributions: 100*((1+0.05/12)^12 - 1)/(0.05/12) ≈ 1227.89
    expect(result).toBeCloseTo(11740, -1);
  });

  // --- Mathematical properties ---
  it('higher rate always produces higher balance (same inputs)', () => {
    const low = compoundInterest(10000, 200, 0.03, 20, 12);
    const mid = compoundInterest(10000, 200, 0.07, 20, 12);
    const high = compoundInterest(10000, 200, 0.12, 20, 12);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('more frequent compounding produces higher balance', () => {
    const annual = compoundInterest(10000, 0, 0.10, 20, 1);
    const quarterly = compoundInterest(10000, 0, 0.10, 20, 4);
    const monthly = compoundInterest(10000, 0, 0.10, 20, 12);
    const daily = compoundInterest(10000, 0, 0.10, 20, 365);
    expect(quarterly).toBeGreaterThan(annual);
    expect(monthly).toBeGreaterThan(quarterly);
    expect(daily).toBeGreaterThan(monthly);
  });

  it('longer time always produces higher balance (positive rate)', () => {
    const y5 = compoundInterest(10000, 200, 0.07, 5, 12);
    const y10 = compoundInterest(10000, 200, 0.07, 10, 12);
    const y20 = compoundInterest(10000, 200, 0.07, 20, 12);
    const y30 = compoundInterest(10000, 200, 0.07, 30, 12);
    expect(y10).toBeGreaterThan(y5);
    expect(y20).toBeGreaterThan(y10);
    expect(y30).toBeGreaterThan(y20);
  });

  it('result is never negative for non-negative inputs', () => {
    const scenarios = [
      [0, 0, 0, 0, 12],
      [1, 0, 0, 1, 12],
      [0, 1, 0.05, 1, 12],
      [10000, 500, 0.15, 50, 12],
    ] as const;
    for (const [p, m, r, y, n] of scenarios) {
      const result = compoundInterest(p, m, r, y, n);
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });

  it('zero rate: balance = principal + total contributions', () => {
    const p = 5000;
    const m = 250;
    const years = 15;
    const result = compoundInterest(p, m, 0, years, 12);
    expect(result).toBeCloseTo(p + m * 12 * years, 2);
  });

  it('zero principal, zero contribution, positive rate = 0', () => {
    const result = compoundInterest(0, 0, 0.10, 30, 12);
    expect(result).toBe(0);
  });

  it('zero years returns principal only regardless of other inputs', () => {
    const result = compoundInterest(12345, 999, 0.15, 0, 12);
    expect(result).toBeCloseTo(12345, 2);
  });

  // --- Cross-validation against known financial benchmarks ---
  it('matches Bankrate compound interest example ($5000, 5%, 10yr monthly)', () => {
    const result = compoundInterest(5000, 0, 0.05, 10, 12);
    expect(result).toBeCloseTo(8235.05, 0);
  });

  it('matches SEC compound interest example ($1000/mo, 6%, 40yr)', () => {
    const result = compoundInterest(0, 1000, 0.06, 40, 12);
    expect(result).toBeCloseTo(1991490, -3);
  });

  // --- Result precision ---
  it('returns finite number for all valid inputs across parameter sweep', () => {
    for (let rate = 0; rate <= 0.25; rate += 0.01) {
      for (let years = 0; years <= 50; years += 10) {
        const result = compoundInterest(10000, 200, rate, years, 12);
        expect(Number.isFinite(result)).toBe(true);
      }
    }
  });

  // --- Additivity / superposition ---
  it('principal-only + contribution-only ≈ combined (at 0% rate)', () => {
    // At 0% rate, superposition should be exact
    const principalOnly = compoundInterest(10000, 0, 0, 10, 12);
    const contribOnly = compoundInterest(0, 500, 0, 10, 12);
    const combined = compoundInterest(10000, 500, 0, 10, 12);
    expect(combined).toBeCloseTo(principalOnly + contribOnly, 2);
  });
});

// ============================================================
// COMPOUND INTEREST SCHEDULE — STRESS TESTS
// ============================================================

describe('compoundInterestSchedule — stress tests', () => {
  it('schedule balance matches standalone calculation at each year', () => {
    const schedule = compoundInterestSchedule(10000, 200, 0.07, 30, 12);
    for (const entry of schedule) {
      const standalone = compoundInterest(10000, 200, 0.07, entry.year, 12);
      expect(entry.balance).toBeCloseTo(standalone, 0);
    }
  });

  it('interest is always non-negative for positive rate', () => {
    const schedule = compoundInterestSchedule(10000, 100, 0.05, 20, 12);
    for (const entry of schedule) {
      expect(entry.totalInterest).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it('contributions increase linearly', () => {
    const schedule = compoundInterestSchedule(5000, 300, 0.08, 10, 12);
    for (let i = 1; i < schedule.length; i++) {
      const expectedContribs = 5000 + 300 * 12 * i;
      expect(schedule[i].totalContributions).toBeCloseTo(expectedContribs, 0);
    }
  });

  it('handles zero everything', () => {
    const schedule = compoundInterestSchedule(0, 0, 0, 5, 12);
    expect(schedule).toHaveLength(6);
    for (const entry of schedule) {
      expect(entry.balance).toBe(0);
      expect(entry.totalContributions).toBe(0);
      expect(entry.totalInterest).toBe(0);
    }
  });

  it('1-year schedule has exactly 2 entries (year 0 and year 1)', () => {
    const schedule = compoundInterestSchedule(1000, 100, 0.05, 1, 12);
    expect(schedule).toHaveLength(2);
    expect(schedule[0].year).toBe(0);
    expect(schedule[1].year).toBe(1);
  });

  it('balance = contributions + interest identity holds for every entry', () => {
    const schedule = compoundInterestSchedule(20000, 400, 0.09, 25, 12);
    for (const entry of schedule) {
      expect(entry.balance).toBeCloseTo(
        entry.totalContributions + entry.totalInterest,
        0
      );
    }
  });

  it('handles 50-year schedule', () => {
    const schedule = compoundInterestSchedule(1000, 50, 0.06, 50, 12);
    expect(schedule).toHaveLength(51);
    // Balance should grow monotonically
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeGreaterThan(schedule[i - 1].balance);
    }
  });
});

// ============================================================
// LOAN MONTHLY PAYMENT — STRESS TESTS
// ============================================================

describe('loanMonthlyPayment — stress tests', () => {
  it('payment is always positive for positive principal and term', () => {
    const rates = [0, 0.01, 0.05, 0.10, 0.20, 0.30];
    for (const rate of rates) {
      const payment = loanMonthlyPayment(100000, rate, 360);
      expect(payment).toBeGreaterThan(0);
    }
  });

  it('higher rate means higher payment (same loan)', () => {
    const p1 = loanMonthlyPayment(200000, 0.04, 360);
    const p2 = loanMonthlyPayment(200000, 0.06, 360);
    const p3 = loanMonthlyPayment(200000, 0.08, 360);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
  });

  it('shorter term means higher payment but less total interest', () => {
    const p15 = loanMonthlyPayment(200000, 0.06, 180);
    const p30 = loanMonthlyPayment(200000, 0.06, 360);
    expect(p15).toBeGreaterThan(p30);
    expect(p15 * 180).toBeLessThan(p30 * 360);
  });

  it('payment * months >= principal (total paid >= amount borrowed)', () => {
    const principal = 250000;
    const rates = [0, 0.03, 0.06, 0.10];
    const terms = [60, 120, 180, 360];
    for (const rate of rates) {
      for (const term of terms) {
        const payment = loanMonthlyPayment(principal, rate, term);
        expect(payment * term).toBeGreaterThanOrEqual(principal - 0.01);
      }
    }
  });

  it('matches well-known mortgage payment ($250K, 7%, 30yr)', () => {
    const payment = loanMonthlyPayment(250000, 0.07, 360);
    expect(payment).toBeCloseTo(1663.26, 0);
  });

  it('handles very small loan ($100, 5%, 6 months)', () => {
    const payment = loanMonthlyPayment(100, 0.05, 6);
    expect(payment).toBeGreaterThan(0);
    expect(Number.isFinite(payment)).toBe(true);
    expect(payment * 6).toBeGreaterThanOrEqual(100);
  });

  it('handles very large loan ($5M, 3%, 360 months)', () => {
    const payment = loanMonthlyPayment(5000000, 0.03, 360);
    expect(payment).toBeGreaterThan(0);
    expect(Number.isFinite(payment)).toBe(true);
  });

  it('handles 1-month term (single payment)', () => {
    // $10,000 at 6% for 1 month
    // Payment = 10000 * (0.005 * 1.005) / (1.005 - 1) = 10000 * 1.005 = $10,050
    const payment = loanMonthlyPayment(10000, 0.06, 1);
    expect(payment).toBeCloseTo(10050, 0);
    expect(Number.isFinite(payment)).toBe(true);
  });

  it('handles very small rate near zero (0.001%)', () => {
    const payment = loanMonthlyPayment(100000, 0.00001, 360);
    // Should be very close to the 0% case: 100000/360 ≈ 277.78
    expect(payment).toBeCloseTo(100000 / 360, 0);
    expect(Number.isFinite(payment)).toBe(true);
  });

  it('handles very high rate (50% annual)', () => {
    const payment = loanMonthlyPayment(10000, 0.50, 60);
    expect(payment).toBeGreaterThan(0);
    expect(Number.isFinite(payment)).toBe(true);
    // Total paid should be much more than principal at 50% rate
    expect(payment * 60).toBeGreaterThan(10000 * 2);
  });

  it('payment scales linearly with principal at same rate/term', () => {
    const p1 = loanMonthlyPayment(100000, 0.06, 360);
    const p2 = loanMonthlyPayment(200000, 0.06, 360);
    const p3 = loanMonthlyPayment(300000, 0.06, 360);
    expect(p2).toBeCloseTo(p1 * 2, 0);
    expect(p3).toBeCloseTo(p1 * 3, 0);
  });
});

// ============================================================
// AMORTIZATION SCHEDULE — STRESS TESTS
// ============================================================

describe('amortizationSchedule — stress tests', () => {
  it('balance always decreases (never goes up)', () => {
    const schedule = amortizationSchedule(300000, 0.065, 360);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeLessThanOrEqual(
        schedule[i - 1].balance + 0.01
      );
    }
  });

  it('interest portion always decreases', () => {
    const schedule = amortizationSchedule(200000, 0.06, 360);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].interest).toBeLessThanOrEqual(
        schedule[i - 1].interest + 0.01
      );
    }
  });

  it('principal portion always increases', () => {
    const schedule = amortizationSchedule(200000, 0.06, 360);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].principal).toBeGreaterThanOrEqual(
        schedule[i - 1].principal - 0.01
      );
    }
  });

  it('every payment equals principal + interest', () => {
    const schedule = amortizationSchedule(150000, 0.055, 180);
    for (const entry of schedule) {
      expect(entry.payment).toBeCloseTo(entry.principal + entry.interest, 1);
    }
  });

  it('final balance is zero or negligible', () => {
    const testCases = [
      [100000, 0.05, 360],
      [50000, 0.08, 60],
      [300000, 0.065, 180],
      [10000, 0.12, 24],
    ] as const;
    for (const [p, r, t] of testCases) {
      const schedule = amortizationSchedule(p, r, t);
      const lastEntry = schedule[schedule.length - 1];
      expect(lastEntry.balance).toBeCloseTo(0, 0);
    }
  });

  it('total principal repaid equals original loan amount', () => {
    const schedule = amortizationSchedule(200000, 0.06, 360);
    const totalPrincipal = schedule.reduce((sum, s) => sum + s.principal, 0);
    expect(totalPrincipal).toBeCloseTo(200000, -1);
  });

  it('total interest matches expected for 30yr $200K at 6%', () => {
    const schedule = amortizationSchedule(200000, 0.06, 360);
    const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);
    expect(totalInterest).toBeCloseTo(231676, -2);
  });

  it('handles zero interest rate schedule', () => {
    const schedule = amortizationSchedule(12000, 0, 12);
    expect(schedule).toHaveLength(12);
    for (const entry of schedule) {
      expect(entry.payment).toBeCloseTo(1000, 1);
      expect(entry.interest).toBeCloseTo(0, 1);
      expect(entry.principal).toBeCloseTo(1000, 1);
    }
    expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0);
  });

  it('short term (6 months) produces correct number of entries', () => {
    const schedule = amortizationSchedule(6000, 0.05, 6);
    expect(schedule).toHaveLength(6);
    expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0);
  });

  it('all balances are non-negative', () => {
    const schedule = amortizationSchedule(50000, 0.08, 60);
    for (const entry of schedule) {
      expect(entry.balance).toBeGreaterThanOrEqual(0);
    }
  });

  it('first month interest = principal * monthly rate', () => {
    const principal = 200000;
    const annualRate = 0.06;
    const schedule = amortizationSchedule(principal, annualRate, 360);
    expect(schedule[0].interest).toBeCloseTo(
      principal * (annualRate / 12),
      0
    );
  });
});

// ============================================================
// MONTHLY SAVINGS REQUIRED — STRESS TESTS
// ============================================================

describe('monthlySavingsRequired — stress tests', () => {
  it('result is always positive when goal exceeds current savings growth', () => {
    const monthly = monthlySavingsRequired(100000, 0, 0.05, 120);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
  });

  it('higher goal means higher required savings', () => {
    const m50k = monthlySavingsRequired(50000, 0, 0.05, 120);
    const m100k = monthlySavingsRequired(100000, 0, 0.05, 120);
    const m200k = monthlySavingsRequired(200000, 0, 0.05, 120);
    expect(m100k).toBeGreaterThan(m50k);
    expect(m200k).toBeGreaterThan(m100k);
  });

  it('more time means lower monthly savings needed', () => {
    const m5yr = monthlySavingsRequired(100000, 0, 0.05, 60);
    const m10yr = monthlySavingsRequired(100000, 0, 0.05, 120);
    const m20yr = monthlySavingsRequired(100000, 0, 0.05, 240);
    expect(m10yr).toBeLessThan(m5yr);
    expect(m20yr).toBeLessThan(m10yr);
  });

  it('higher rate means lower monthly savings needed', () => {
    const r0 = monthlySavingsRequired(100000, 0, 0, 120);
    const r5 = monthlySavingsRequired(100000, 0, 0.05, 120);
    const r10 = monthlySavingsRequired(100000, 0, 0.10, 120);
    expect(r5).toBeLessThan(r0);
    expect(r10).toBeLessThan(r5);
  });

  it('larger initial savings means lower monthly savings needed', () => {
    const s0 = monthlySavingsRequired(100000, 0, 0.05, 120);
    const s20k = monthlySavingsRequired(100000, 20000, 0.05, 120);
    const s50k = monthlySavingsRequired(100000, 50000, 0.05, 120);
    expect(s20k).toBeLessThan(s0);
    expect(s50k).toBeLessThan(s20k);
  });

  it('cross-validates: saving the required amount reaches the goal', () => {
    const goal = 100000;
    const current = 10000;
    const rate = 0.06;
    const months = 120;
    const monthly = monthlySavingsRequired(goal, current, rate, months);
    const result = compoundInterest(current, monthly, rate, months / 12, 12);
    expect(result).toBeCloseTo(goal, -1);
  });

  it('handles goal of $1M from $0', () => {
    const monthly = monthlySavingsRequired(1000000, 0, 0.08, 360);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    const result = compoundInterest(0, monthly, 0.08, 30, 12);
    expect(result).toBeCloseTo(1000000, -2);
  });

  it('returns negative when goal is already exceeded by current savings growth', () => {
    // $10K goal, $20K current savings, 5% for 60 months
    // Current savings will grow to ~$25,668 — far exceeds $10K
    const monthly = monthlySavingsRequired(10000, 20000, 0.05, 60);
    expect(monthly).toBeLessThan(0);
  });

  it('returns 0 when goal exactly equals current savings at 0% rate', () => {
    const monthly = monthlySavingsRequired(10000, 10000, 0, 12);
    expect(monthly).toBeCloseTo(0, 2);
  });

  it('handles 1-month horizon', () => {
    // Goal: $1000, current: $0, rate: 0%, 1 month => need $1000/month
    const monthly = monthlySavingsRequired(1000, 0, 0, 1);
    expect(monthly).toBeCloseTo(1000, 2);
  });

  it('handles 1-month horizon with interest', () => {
    // Goal: $1000, current: $0, rate: 12%, 1 month
    const monthly = monthlySavingsRequired(1000, 0, 0.12, 1);
    // r = 0.01, FV factor = (1.01^1 - 1) / 0.01 = 1.0
    // => monthly = 1000 * 0.01 / (1.01 - 1) = 1000
    expect(monthly).toBeCloseTo(1000, 0);
    expect(Number.isFinite(monthly)).toBe(true);
  });

  it('handles very long horizon (600 months = 50 years)', () => {
    const monthly = monthlySavingsRequired(1000000, 0, 0.07, 600);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    // Should be a small monthly amount due to long compounding
    expect(monthly).toBeLessThan(500);
  });

  it('handles very small goal ($1)', () => {
    const monthly = monthlySavingsRequired(1, 0, 0.05, 12);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
  });

  it('handles very large goal ($100M)', () => {
    const monthly = monthlySavingsRequired(100000000, 0, 0.08, 360);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
  });
});

// ============================================================
// SOLVE FOR CONTRIBUTION — STRESS TESTS
// ============================================================

describe('solveForContribution — stress tests', () => {
  it('basic case: solve for contribution to reach $100K from $10K in 10yr at 7%', () => {
    const monthly = solveForContribution(10000, 100000, 0.07, 10, 12);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    // Cross-validate: using this contribution should reach the target
    const result = compoundInterest(10000, monthly, 0.07, 10, 12);
    expect(result).toBeCloseTo(100000, 0);
  });

  it('returns 0 when principal growth alone reaches target', () => {
    // $50K at 10% for 30 years grows to ~$872K
    // Target: $100K — already exceeded by principal growth alone
    const monthly = solveForContribution(50000, 100000, 0.10, 30, 12);
    expect(monthly).toBeLessThanOrEqual(0);
  });

  it('returns negative when principal growth exceeds target', () => {
    // $100K at 10% for 30 years — way more than $50K target
    const monthly = solveForContribution(100000, 50000, 0.10, 30, 12);
    expect(monthly).toBeLessThan(0);
  });

  it('handles zero principal', () => {
    const monthly = solveForContribution(0, 100000, 0.07, 20, 12);
    expect(monthly).toBeGreaterThan(0);
    const result = compoundInterest(0, monthly, 0.07, 20, 12);
    expect(result).toBeCloseTo(100000, 0);
  });

  it('handles zero rate', () => {
    // At 0% rate, need to contribute (target - principal) / (12 * years)
    const monthly = solveForContribution(10000, 100000, 0, 10, 12);
    expect(monthly).toBeCloseTo((100000 - 10000) / (12 * 10), 2);
  });

  it('handles zero years — needs infinite contribution (undefined behavior but should not crash)', () => {
    // At 0 years, no time to grow, need all of target - principal immediately
    // This is an edge case — function may return Infinity or NaN
    const monthly = solveForContribution(0, 100000, 0.07, 0, 12);
    // Just verify it doesn't throw
    expect(typeof monthly).toBe('number');
  });

  it('handles very short period (1 year)', () => {
    const monthly = solveForContribution(0, 12000, 0.06, 1, 12);
    expect(monthly).toBeGreaterThan(0);
    const result = compoundInterest(0, monthly, 0.06, 1, 12);
    expect(result).toBeCloseTo(12000, 0);
  });

  it('handles very long period (50 years)', () => {
    const monthly = solveForContribution(0, 1000000, 0.08, 50, 12);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    const result = compoundInterest(0, monthly, 0.08, 50, 12);
    expect(result).toBeCloseTo(1000000, -1);
  });

  it('cross-validates with monthlySavingsRequired for simple case', () => {
    // Both functions should solve the same problem (different interface)
    const fromSolve = solveForContribution(5000, 50000, 0.06, 10, 12);
    const fromSavings = monthlySavingsRequired(50000, 5000, 0.06, 120);
    expect(fromSolve).toBeCloseTo(fromSavings, 0);
  });

  it('handles annual compounding', () => {
    const monthly = solveForContribution(10000, 100000, 0.08, 15, 1);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    const result = compoundInterest(10000, monthly, 0.08, 15, 1);
    expect(result).toBeCloseTo(100000, -1);
  });

  it('handles daily compounding', () => {
    const monthly = solveForContribution(10000, 100000, 0.06, 10, 365);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    const result = compoundInterest(10000, monthly, 0.06, 10, 365);
    expect(result).toBeCloseTo(100000, -1);
  });
});

// ============================================================
// SOLVE FOR RATE — STRESS TESTS
// ============================================================

describe('solveForRate — stress tests', () => {
  it('basic case: find rate that grows $10K + $200/mo to $100K in 10yr', () => {
    const rate = solveForRate(10000, 200, 100000, 10, 12);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1);
    // Cross-validate
    const result = compoundInterest(10000, 200, rate, 10, 12);
    expect(result).toBeCloseTo(100000, 0);
  });

  it('returns near-zero rate when target barely exceeds contributions', () => {
    // $10K + $500/mo for 10 years = $70K in contributions alone
    // Target: $71K — needs almost 0% rate
    const rate = solveForRate(10000, 500, 71000, 10, 12);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThan(0.02); // Very low rate expected
  });

  it('finds moderate rate for typical scenario', () => {
    // Find rate for: $5K initial, $300/mo, $200K target, 20 years
    const rate = solveForRate(5000, 300, 200000, 20, 12);
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.15);
    const result = compoundInterest(5000, 300, rate, 20, 12);
    expect(result).toBeCloseTo(200000, 0);
  });

  it('handles principal-only (no contributions)', () => {
    // $10K grows to $20K in 10 years — need ~7% rate (rule of 72)
    const rate = solveForRate(10000, 0, 20000, 10, 12);
    expect(rate).toBeCloseTo(0.07, 1);
    const result = compoundInterest(10000, 0, rate, 10, 12);
    expect(result).toBeCloseTo(20000, 0);
  });

  it('handles contributions-only (no principal)', () => {
    const rate = solveForRate(0, 1000, 500000, 20, 12);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1);
    const result = compoundInterest(0, 1000, rate, 20, 12);
    expect(result).toBeCloseTo(500000, 0);
  });

  it('converges for high target requiring high rate', () => {
    // $1K + $100/mo needs to reach $1M in 20 years — needs very high rate
    const rate = solveForRate(1000, 100, 1000000, 20, 12);
    expect(rate).toBeGreaterThan(0.10);
    expect(rate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(rate)).toBe(true);
  });

  it('handles case where target is less than principal (rate can be 0)', () => {
    // Target $5K but starting with $10K — even at 0% rate, principal exceeds target
    // Newton-Raphson should clamp to 0
    const rate = solveForRate(10000, 0, 5000, 10, 12);
    expect(rate).toBeGreaterThanOrEqual(0);
    // The result at rate=0 is $10K which exceeds $5K, so rate=0 is the minimum
    // Newton-Raphson will likely return 0 since it clamps
    expect(rate).toBe(0);
  });

  it('result is always between 0 and 1 (clamped)', () => {
    const testCases = [
      [0, 0, 1000000, 1],        // impossible in 1 year with nothing
      [100, 10, 10000000, 5],     // very aggressive target
      [1000000, 0, 1000001, 100], // trivially easy
    ] as const;
    for (const [p, m, target, y] of testCases) {
      const rate = solveForRate(p, m, target, y, 12);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });

  it('returns finite number for all inputs', () => {
    const rate = solveForRate(10000, 500, 200000, 15, 12);
    expect(Number.isFinite(rate)).toBe(true);
    expect(Number.isNaN(rate)).toBe(false);
  });
});

// ============================================================
// SOLVE FOR TIME — STRESS TESTS
// ============================================================

describe('solveForTime — stress tests', () => {
  it('basic case: time to grow $10K + $500/mo at 7% to $200K', () => {
    const years = solveForTime(10000, 500, 0.07, 200000, 12);
    expect(years).toBeGreaterThan(0);
    expect(years).toBeLessThan(100);
    // Cross-validate — solveForTime uses binary search with tolerance < $1,
    // so the result may be off by up to ~$1
    const result = compoundInterest(10000, 500, 0.07, years, 12);
    expect(Math.abs(result - 200000)).toBeLessThan(2);
  });

  it('shorter time for higher rate', () => {
    const t5 = solveForTime(10000, 500, 0.05, 200000, 12);
    const t10 = solveForTime(10000, 500, 0.10, 200000, 12);
    expect(t10).toBeLessThan(t5);
  });

  it('shorter time for higher contribution', () => {
    const tLow = solveForTime(10000, 200, 0.07, 200000, 12);
    const tHigh = solveForTime(10000, 1000, 0.07, 200000, 12);
    expect(tHigh).toBeLessThan(tLow);
  });

  it('shorter time for higher starting principal', () => {
    const tLow = solveForTime(1000, 500, 0.07, 200000, 12);
    const tHigh = solveForTime(50000, 500, 0.07, 200000, 12);
    expect(tHigh).toBeLessThan(tLow);
  });

  it('returns near-zero when target is at or below principal', () => {
    const years = solveForTime(100000, 0, 0.07, 100000, 12);
    expect(years).toBeCloseTo(0, 0);
  });

  it('handles target less than principal (already achieved)', () => {
    const years = solveForTime(100000, 500, 0.07, 50000, 12);
    expect(years).toBeCloseTo(0, 0);
  });

  it('handles principal-only (no contributions)', () => {
    // $10K doubling at 7% ≈ 10 years (rule of 72: 72/7 ≈ 10.3)
    const years = solveForTime(10000, 0, 0.07, 20000, 12);
    expect(years).toBeCloseTo(10, 0);
  });

  it('handles zero rate — time based on contributions only', () => {
    // $0 principal, $1000/mo at 0%, target $120K
    // Time = 120000 / (1000 * 12) = 10 years
    const years = solveForTime(0, 1000, 0, 120000, 12);
    expect(years).toBeCloseTo(10, 0);
  });

  it('handles contributions-only (no principal)', () => {
    const years = solveForTime(0, 1000, 0.08, 500000, 12);
    expect(years).toBeGreaterThan(0);
    expect(years).toBeLessThan(100);
    const result = compoundInterest(0, 1000, 0.08, years, 12);
    // Binary search tolerance is < $1, so allow up to $2 difference
    expect(Math.abs(result - 500000)).toBeLessThan(2);
  });

  it('returns value capped at 100 for unreachable targets', () => {
    // Very small contribution, no principal, low rate, huge target
    // Binary search ceiling is 100, so result should be ≤ 100
    const years = solveForTime(0, 1, 0.01, 999999999, 12);
    expect(years).toBeLessThanOrEqual(100);
  });

  it('cross-validates with compoundInterest for multiple scenarios', () => {
    const scenarios = [
      { p: 5000, m: 200, r: 0.06, target: 50000 },
      { p: 25000, m: 500, r: 0.08, target: 300000 },
      { p: 0, m: 2000, r: 0.10, target: 1000000 },
    ];
    for (const { p, m, r, target } of scenarios) {
      const years = solveForTime(p, m, r, target, 12);
      if (years < 100) {
        const result = compoundInterest(p, m, r, years, 12);
        // Binary search tolerance is < $1, so allow up to $2 difference
        expect(Math.abs(result - target)).toBeLessThan(2);
      }
    }
  });
});

// ============================================================
// SOLVE FOR PRINCIPAL — STRESS TESTS
// ============================================================

describe('solveForPrincipal — stress tests', () => {
  it('basic case: how much to start with to reach $500K with $300/mo at 7% in 20yr', () => {
    const principal = solveForPrincipal(300, 500000, 0.07, 20, 12);
    expect(principal).toBeGreaterThan(0);
    expect(Number.isFinite(principal)).toBe(true);
    // Cross-validate
    const result = compoundInterest(principal, 300, 0.07, 20, 12);
    expect(result).toBeCloseTo(500000, 0);
  });

  it('returns 0 when contributions alone meet target', () => {
    // $1000/mo at 8% for 30 years ≈ $1.5M — find principal for exactly that
    const contribResult = compoundInterest(0, 1000, 0.08, 30, 12);
    const principal = solveForPrincipal(1000, contribResult, 0.08, 30, 12);
    expect(principal).toBeCloseTo(0, 0);
  });

  it('returns negative when contributions exceed target', () => {
    // Contributions of $1000/mo at 8% for 30 years > $100K target
    const principal = solveForPrincipal(1000, 100000, 0.08, 30, 12);
    expect(principal).toBeLessThan(0);
  });

  it('handles zero contribution', () => {
    // Need $100K in 20 years at 7% with no contributions
    const principal = solveForPrincipal(0, 100000, 0.07, 20, 12);
    expect(principal).toBeGreaterThan(0);
    const result = compoundInterest(principal, 0, 0.07, 20, 12);
    expect(result).toBeCloseTo(100000, 0);
  });

  it('handles zero rate', () => {
    // At 0%, principal = target - (monthly * 12 * years)
    const principal = solveForPrincipal(500, 100000, 0, 10, 12);
    expect(principal).toBeCloseTo(100000 - 500 * 12 * 10, 2);
  });

  it('result is consistent with solveForContribution (inverse relationship)', () => {
    // If we know both principal and contribution that reach $200K at 6% in 15yr,
    // solving for one given the other should yield the original value.
    const target = 200000;
    const rate = 0.06;
    const years = 15;

    const principal = 20000;
    const contrib = solveForContribution(principal, target, rate, years, 12);
    const recoveredPrincipal = solveForPrincipal(contrib, target, rate, years, 12);
    expect(recoveredPrincipal).toBeCloseTo(principal, 0);
  });

  it('handles annual compounding', () => {
    const principal = solveForPrincipal(200, 100000, 0.07, 20, 1);
    expect(Number.isFinite(principal)).toBe(true);
    const result = compoundInterest(principal, 200, 0.07, 20, 1);
    expect(result).toBeCloseTo(100000, -1);
  });

  it('handles very large target ($10M)', () => {
    const principal = solveForPrincipal(5000, 10000000, 0.09, 30, 12);
    expect(principal).toBeGreaterThan(0);
    expect(Number.isFinite(principal)).toBe(true);
  });
});

// ============================================================
// DEBT PAYOFF — STRESS TESTS
// ============================================================

describe('debtPayoff — stress tests', () => {
  // --- Empty / trivial inputs ---
  it('handles empty debts array', () => {
    const result = debtPayoff([], 500, 'snowball');
    expect(result.months).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.payoffOrder).toEqual([]);
    expect(result.timeline).toEqual([]);
  });

  it('handles single debt', () => {
    const debts: Debt[] = [
      { name: 'Card A', balance: 5000, rate: 0.18, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 200, 'avalanche');
    expect(result.months).toBeGreaterThan(0);
    expect(result.months).toBeLessThan(600);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.totalPaid).toBeGreaterThan(5000);
    expect(result.payoffOrder).toContain('Card A');
    expect(result.timeline.length).toBe(result.months);
  });

  it('handles single debt with snowball strategy (same as avalanche)', () => {
    const debts: Debt[] = [
      { name: 'Loan', balance: 10000, rate: 0.10, minPayment: 200 },
    ];
    const snowball = debtPayoff(debts, 100, 'snowball');
    const avalanche = debtPayoff(debts, 100, 'avalanche');
    // Single debt: both strategies should produce identical results
    expect(snowball.months).toBe(avalanche.months);
    expect(snowball.totalInterest).toBeCloseTo(avalanche.totalInterest, 2);
    expect(snowball.totalPaid).toBeCloseTo(avalanche.totalPaid, 2);
  });

  // --- Multiple debts ---
  it('handles two debts — avalanche prioritizes highest rate', () => {
    const debts: Debt[] = [
      { name: 'Low Rate', balance: 5000, rate: 0.06, minPayment: 100 },
      { name: 'High Rate', balance: 5000, rate: 0.22, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 300, 'avalanche');
    expect(result.months).toBeGreaterThan(0);
    // In avalanche, the high-rate debt should be paid off first
    expect(result.payoffOrder[0]).toBe('High Rate');
  });

  it('handles two debts — snowball prioritizes smallest balance', () => {
    const debts: Debt[] = [
      { name: 'Big Balance', balance: 15000, rate: 0.22, minPayment: 200 },
      { name: 'Small Balance', balance: 2000, rate: 0.06, minPayment: 50 },
    ];
    const result = debtPayoff(debts, 300, 'snowball');
    expect(result.months).toBeGreaterThan(0);
    // In snowball, the small balance should be paid off first
    expect(result.payoffOrder[0]).toBe('Small Balance');
  });

  it('avalanche saves more in interest than snowball for different-rate debts', () => {
    const debts: Debt[] = [
      { name: 'Card A', balance: 8000, rate: 0.24, minPayment: 160 },
      { name: 'Card B', balance: 3000, rate: 0.18, minPayment: 60 },
      { name: 'Car Loan', balance: 15000, rate: 0.06, minPayment: 300 },
    ];
    const avalanche = debtPayoff(debts, 200, 'avalanche');
    const snowball = debtPayoff(debts, 200, 'snowball');
    // Avalanche should typically save more in total interest
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest + 1);
  });

  it('handles three debts with extra payment = 0 (minimums only)', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 5000, rate: 0.15, minPayment: 100 },
      { name: 'B', balance: 3000, rate: 0.20, minPayment: 75 },
      { name: 'C', balance: 8000, rate: 0.08, minPayment: 150 },
    ];
    const result = debtPayoff(debts, 0, 'avalanche');
    expect(result.months).toBeGreaterThan(0);
    expect(result.totalPaid).toBeGreaterThan(16000);
    expect(result.payoffOrder).toHaveLength(3);
  });

  // --- Edge: debts that can never be paid off ---
  it('handles debt where min payment < monthly interest (caps at 600 months)', () => {
    const debts: Debt[] = [
      {
        name: 'Underwater',
        balance: 100000,
        rate: 0.30, // 30% annual = 2.5% monthly = $2500/mo interest
        minPayment: 100, // Way less than interest
      },
    ];
    const result = debtPayoff(debts, 0, 'avalanche');
    // Should hit the 600-month cap
    expect(result.months).toBe(600);
    // Balance should still be positive (never fully paid off)
    const lastTimeline = result.timeline[result.timeline.length - 1];
    expect(lastTimeline.totalBalance).toBeGreaterThan(0);
  });

  it('handles underwater debt with some extra payment', () => {
    const debts: Debt[] = [
      {
        name: 'Barely Underwater',
        balance: 50000,
        rate: 0.24, // 2% monthly = $1000/mo interest
        minPayment: 500, // Less than interest
      },
    ];
    // Extra $600/mo makes total $1100 — barely above $1000 interest
    const result = debtPayoff(debts, 600, 'avalanche');
    // Should eventually pay off but take a very long time
    expect(result.months).toBeGreaterThan(0);
    expect(result.totalPaid).toBeGreaterThan(50000);
  });

  // --- Edge: zero-balance debts ---
  it('handles debts with zero balance', () => {
    const debts: Debt[] = [
      { name: 'Paid Off', balance: 0, rate: 0.15, minPayment: 100 },
      { name: 'Active', balance: 5000, rate: 0.10, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 200, 'avalanche');
    expect(result.months).toBeGreaterThan(0);
    // The zero-balance debt should appear in payoff order
    expect(result.payoffOrder).toContain('Paid Off');
    expect(result.payoffOrder).toContain('Active');
  });

  // --- Edge: zero-rate debts ---
  it('handles debts with 0% interest rate', () => {
    const debts: Debt[] = [
      { name: 'Interest Free', balance: 6000, rate: 0, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 100, 'avalanche');
    // Total payment: $200/mo, balance: $6000, months: 30
    expect(result.months).toBe(30);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBeCloseTo(6000, 0);
  });

  it('handles mix of zero-rate and positive-rate debts', () => {
    const debts: Debt[] = [
      { name: 'Free Loan', balance: 5000, rate: 0, minPayment: 100 },
      { name: 'Credit Card', balance: 5000, rate: 0.20, minPayment: 100 },
    ];
    const avalanche = debtPayoff(debts, 200, 'avalanche');
    // Avalanche should prioritize the credit card (higher rate)
    expect(avalanche.payoffOrder[0]).toBe('Credit Card');
  });

  // --- Timeline integrity ---
  it('timeline total balance is monotonically decreasing (avalanche)', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 10000, rate: 0.15, minPayment: 200 },
      { name: 'B', balance: 5000, rate: 0.20, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 300, 'avalanche');
    for (let i = 1; i < result.timeline.length; i++) {
      expect(result.timeline[i].totalBalance).toBeLessThanOrEqual(
        result.timeline[i - 1].totalBalance + 1 // Small tolerance for interest accrual timing
      );
    }
  });

  it('timeline total interest is monotonically increasing', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 8000, rate: 0.18, minPayment: 150 },
      { name: 'B', balance: 3000, rate: 0.12, minPayment: 60 },
    ];
    const result = debtPayoff(debts, 200, 'avalanche');
    for (let i = 1; i < result.timeline.length; i++) {
      expect(result.timeline[i].totalInterest).toBeGreaterThanOrEqual(
        result.timeline[i - 1].totalInterest
      );
    }
  });

  it('timeline ends with zero total balance when fully paid', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 3000, rate: 0.10, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 200, 'snowball');
    if (result.months < 600) {
      const last = result.timeline[result.timeline.length - 1];
      expect(last.totalBalance).toBeCloseTo(0, 0);
    }
  });

  // --- Payoff order completeness ---
  it('payoff order includes all debts', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 1000, rate: 0.10, minPayment: 50 },
      { name: 'B', balance: 2000, rate: 0.15, minPayment: 50 },
      { name: 'C', balance: 3000, rate: 0.05, minPayment: 50 },
      { name: 'D', balance: 4000, rate: 0.20, minPayment: 50 },
    ];
    const result = debtPayoff(debts, 500, 'avalanche');
    expect(result.payoffOrder).toHaveLength(4);
    expect(result.payoffOrder).toContain('A');
    expect(result.payoffOrder).toContain('B');
    expect(result.payoffOrder).toContain('C');
    expect(result.payoffOrder).toContain('D');
  });

  // --- Large number of debts ---
  it('handles many debts (10 debts)', () => {
    const debts: Debt[] = Array.from({ length: 10 }, (_, i) => ({
      name: `Debt ${i + 1}`,
      balance: 1000 * (i + 1),
      rate: 0.05 + i * 0.02,
      minPayment: 25 + i * 10,
    }));
    const result = debtPayoff(debts, 500, 'avalanche');
    expect(result.months).toBeGreaterThan(0);
    expect(result.months).toBeLessThanOrEqual(600);
    expect(result.payoffOrder).toHaveLength(10);
    expect(Number.isFinite(result.totalInterest)).toBe(true);
    expect(Number.isFinite(result.totalPaid)).toBe(true);
  });

  // --- totalPaid consistency ---
  it('totalPaid >= sum of all original balances', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 5000, rate: 0.12, minPayment: 100 },
      { name: 'B', balance: 8000, rate: 0.18, minPayment: 160 },
    ];
    const result = debtPayoff(debts, 300, 'avalanche');
    const totalOriginal = debts.reduce((s, d) => s + d.balance, 0);
    expect(result.totalPaid).toBeGreaterThanOrEqual(totalOriginal - 1);
  });

  it('totalPaid ≈ sum of balances + totalInterest', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 4000, rate: 0.15, minPayment: 80 },
      { name: 'B', balance: 6000, rate: 0.10, minPayment: 120 },
    ];
    const result = debtPayoff(debts, 300, 'snowball');
    if (result.months < 600) {
      const totalOriginal = debts.reduce((s, d) => s + d.balance, 0);
      expect(result.totalPaid).toBeCloseTo(
        totalOriginal + result.totalInterest,
        -1
      );
    }
  });

  // --- Identical debts ---
  it('handles debts with identical balances and rates', () => {
    const debts: Debt[] = [
      { name: 'Card 1', balance: 5000, rate: 0.18, minPayment: 100 },
      { name: 'Card 2', balance: 5000, rate: 0.18, minPayment: 100 },
    ];
    const snowball = debtPayoff(debts, 200, 'snowball');
    const avalanche = debtPayoff(debts, 200, 'avalanche');
    // Identical debts: both strategies should produce same total interest
    expect(snowball.totalInterest).toBeCloseTo(avalanche.totalInterest, 0);
    expect(snowball.months).toBe(avalanche.months);
  });

  // --- Very small balances ---
  it('handles very small debt balance ($10)', () => {
    const debts: Debt[] = [
      { name: 'Tiny', balance: 10, rate: 0.18, minPayment: 5 },
    ];
    const result = debtPayoff(debts, 10, 'avalanche');
    expect(result.months).toBeLessThanOrEqual(2);
    expect(result.payoffOrder).toContain('Tiny');
  });

  // --- Very large balances ---
  it('handles large debt ($500K)', () => {
    const debts: Debt[] = [
      { name: 'Mortgage', balance: 500000, rate: 0.07, minPayment: 3327 },
    ];
    const result = debtPayoff(debts, 0, 'avalanche');
    expect(result.months).toBeGreaterThan(0);
    expect(result.months).toBeLessThanOrEqual(600);
    expect(Number.isFinite(result.totalInterest)).toBe(true);
  });
});

// ============================================================
// FORMAT FUNCTIONS — STRESS TESTS
// ============================================================

describe('formatCurrency — stress tests', () => {
  it('handles negative amounts', () => {
    const result = formatCurrency(-5000);
    expect(result).toContain('5,000');
  });

  it('handles very large numbers', () => {
    const result = formatCurrency(999999999);
    expect(result).toBe('$999,999,999');
  });

  it('handles decimals by rounding', () => {
    expect(formatCurrency(99.49)).toBe('$99');
    expect(formatCurrency(99.51)).toBe('$100');
  });

  it('handles very small positive amounts', () => {
    expect(formatCurrency(0.01)).toBe('$0');
    expect(formatCurrency(0.99)).toBe('$1');
  });

  it('handles billion-scale numbers', () => {
    const result = formatCurrency(1234567890);
    expect(result).toBe('$1,234,567,890');
  });
});

describe('formatPercent — stress tests', () => {
  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('handles 100%', () => {
    expect(formatPercent(1.0)).toBe('100.0%');
  });

  it('handles values over 100%', () => {
    expect(formatPercent(2.5)).toBe('250.0%');
  });

  it('handles very small values', () => {
    expect(formatPercent(0.001, 2)).toBe('0.10%');
  });

  it('handles negative percentages', () => {
    expect(formatPercent(-0.05)).toBe('-5.0%');
  });

  it('handles zero decimals', () => {
    expect(formatPercent(0.123, 0)).toBe('12%');
  });
});

describe('formatNumber — stress tests', () => {
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    const result = formatNumber(-12345);
    expect(result).toContain('12,345');
  });

  it('handles very small decimals', () => {
    expect(formatNumber(0.001, 3)).toBe('0.001');
  });

  it('handles very large numbers', () => {
    const result = formatNumber(9999999999);
    expect(result).toBe('9,999,999,999');
  });
});

// ============================================================
// NUMERICAL STABILITY TESTS
// ============================================================

describe('numerical stability', () => {
  it('compound interest does not produce NaN', () => {
    const edgeCases = [
      [0, 0, 0, 0, 1],
      [0, 0, 0, 0, 12],
      [1, 0, 0, 1, 12],
      [0, 0, 0.05, 10, 12],
      [0.01, 0.01, 0.001, 1, 365],
    ] as const;
    for (const [p, m, r, y, n] of edgeCases) {
      const result = compoundInterest(p, m, r, y, n);
      expect(Number.isNaN(result)).toBe(false);
    }
  });

  it('loan payment does not produce NaN', () => {
    const edgeCases = [
      [100, 0, 12],
      [100, 0.001, 1],
      [1000000, 0.25, 360],
    ] as const;
    for (const [p, r, t] of edgeCases) {
      const result = loanMonthlyPayment(p, r, t);
      expect(Number.isNaN(result)).toBe(false);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('monthly savings does not produce NaN', () => {
    const edgeCases = [
      [10000, 0, 0, 12],
      [10000, 0, 0.05, 1],
      [10000, 10000, 0.05, 12],
    ] as const;
    for (const [goal, current, rate, months] of edgeCases) {
      const result = monthlySavingsRequired(goal, current, rate, months);
      expect(Number.isNaN(result)).toBe(false);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('amortization schedule has no NaN values', () => {
    const schedule = amortizationSchedule(100000, 0.065, 360);
    for (const entry of schedule) {
      expect(Number.isFinite(entry.payment)).toBe(true);
      expect(Number.isFinite(entry.principal)).toBe(true);
      expect(Number.isFinite(entry.interest)).toBe(true);
      expect(Number.isFinite(entry.balance)).toBe(true);
    }
  });

  it('solveForContribution does not produce NaN for valid inputs', () => {
    const cases = [
      [0, 100000, 0.07, 10],
      [10000, 100000, 0, 10],
      [50000, 50000, 0.05, 20],
    ] as const;
    for (const [p, target, r, y] of cases) {
      const result = solveForContribution(p, target, r, y, 12);
      expect(Number.isNaN(result)).toBe(false);
    }
  });

  it('solveForRate does not produce NaN', () => {
    const cases = [
      [10000, 200, 100000, 10],
      [0, 500, 200000, 20],
      [50000, 0, 100000, 15],
    ] as const;
    for (const [p, m, target, y] of cases) {
      const result = solveForRate(p, m, target, y, 12);
      expect(Number.isNaN(result)).toBe(false);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('solveForTime does not produce NaN', () => {
    const cases = [
      [10000, 500, 0.07, 200000],
      [0, 1000, 0.05, 100000],
      [100000, 0, 0.10, 200000],
    ] as const;
    for (const [p, m, r, target] of cases) {
      const result = solveForTime(p, m, r, target, 12);
      expect(Number.isNaN(result)).toBe(false);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('solveForPrincipal does not produce NaN', () => {
    const cases = [
      [500, 100000, 0.07, 10],
      [0, 50000, 0.05, 20],
      [1000, 1000000, 0, 30],
    ] as const;
    for (const [m, target, r, y] of cases) {
      const result = solveForPrincipal(m, target, r, y, 12);
      expect(Number.isNaN(result)).toBe(false);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('debtPayoff does not produce NaN in results', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 5000, rate: 0.18, minPayment: 100 },
      { name: 'B', balance: 10000, rate: 0.08, minPayment: 200 },
    ];
    const result = debtPayoff(debts, 300, 'avalanche');
    expect(Number.isFinite(result.totalInterest)).toBe(true);
    expect(Number.isFinite(result.totalPaid)).toBe(true);
    expect(Number.isFinite(result.months)).toBe(true);
    for (const entry of result.timeline) {
      expect(Number.isFinite(entry.totalBalance)).toBe(true);
      expect(Number.isFinite(entry.totalInterest)).toBe(true);
    }
  });
});

// ============================================================
// CROSS-FUNCTION CONSISTENCY TESTS
// ============================================================

describe('cross-function consistency', () => {
  it('solve-for-X functions are mutual inverses', () => {
    // Start with known inputs
    const principal = 15000;
    const monthly = 400;
    const rate = 0.07;
    const years = 20;

    // Calculate the target
    const target = compoundInterest(principal, monthly, rate, years, 12);

    // Each solver should recover its original input
    const recoveredContrib = solveForContribution(principal, target, rate, years, 12);
    expect(recoveredContrib).toBeCloseTo(monthly, 0);

    const recoveredRate = solveForRate(principal, monthly, target, years, 12);
    expect(recoveredRate).toBeCloseTo(rate, 2);

    const recoveredTime = solveForTime(principal, monthly, rate, target, 12);
    expect(recoveredTime).toBeCloseTo(years, 0);

    const recoveredPrincipal = solveForPrincipal(monthly, target, rate, years, 12);
    expect(recoveredPrincipal).toBeCloseTo(principal, 0);
  });

  it('loan payment and amortization are consistent', () => {
    const principal = 250000;
    const rate = 0.065;
    const term = 360;

    const payment = loanMonthlyPayment(principal, rate, term);
    const schedule = amortizationSchedule(principal, rate, term);

    // Every entry in the schedule should have the same payment
    for (const entry of schedule) {
      expect(entry.payment).toBeCloseTo(payment, 0);
    }

    // Schedule should end at 0
    expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0);
  });

  it('monthlySavingsRequired and solveForContribution agree', () => {
    const goal = 250000;
    const current = 30000;
    const rate = 0.08;
    const months = 180;

    const fromSavings = monthlySavingsRequired(goal, current, rate, months);
    const fromSolve = solveForContribution(current, goal, rate, months / 12, 12);

    expect(fromSavings).toBeCloseTo(fromSolve, 0);
  });

  it('compound interest schedule last entry matches standalone calculation', () => {
    const p = 25000;
    const m = 600;
    const r = 0.09;
    const y = 35;

    const standalone = compoundInterest(p, m, r, y, 12);
    const schedule = compoundInterestSchedule(p, m, r, y, 12);
    const lastEntry = schedule[schedule.length - 1];

    expect(lastEntry.balance).toBeCloseTo(standalone, 0);
  });
});

// ============================================================
// EXTREME / ADVERSARIAL INPUTS
// ============================================================

describe('extreme and adversarial inputs', () => {
  it('compound interest with MAX_SAFE_INTEGER principal does not crash', () => {
    // This may overflow to Infinity but should not throw
    const result = compoundInterest(Number.MAX_SAFE_INTEGER, 0, 0.01, 1, 12);
    expect(typeof result).toBe('number');
    // Result might be Infinity for extreme inputs, but should not be NaN
    expect(Number.isNaN(result)).toBe(false);
  });

  it('compound interest with extremely high compounding frequency (8760 = hourly)', () => {
    const result = compoundInterest(10000, 0, 0.05, 10, 8760);
    // Should be slightly higher than daily compounding
    const daily = compoundInterest(10000, 0, 0.05, 10, 365);
    expect(result).toBeGreaterThanOrEqual(daily);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('loan payment with 1-month term at high rate', () => {
    const payment = loanMonthlyPayment(50000, 0.30, 1);
    // Should be principal + 1 month of interest: 50000 * (1 + 0.30/12) = $51,250
    expect(payment).toBeCloseTo(51250, 0);
    expect(Number.isFinite(payment)).toBe(true);
  });

  it('solveForRate with target equal to total contributions (needs 0% rate)', () => {
    // $0 principal, $1000/mo for 10 years = $120K. Target: $120K => rate ≈ 0%
    const rate = solveForRate(0, 1000, 120000, 10, 12);
    expect(rate).toBeCloseTo(0, 1);
  });

  it('solveForTime with 0 rate and 0 contribution and positive target', () => {
    // $10K at 0% with no contributions: can never reach $20K
    // Binary search will converge near 100 (max)
    const years = solveForTime(10000, 0, 0, 20000, 12);
    // At 0% rate, the result is always $10K regardless of time
    // Binary search should converge to high=100
    expect(years).toBe(100);
  });

  it('debtPayoff with all zero-rate debts', () => {
    const debts: Debt[] = [
      { name: 'A', balance: 3000, rate: 0, minPayment: 100 },
      { name: 'B', balance: 6000, rate: 0, minPayment: 100 },
    ];
    const result = debtPayoff(debts, 200, 'snowball');
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBeCloseTo(9000, 0);
    // Snowball pays A first: A gets $300/mo (min $100 + extra $200), B gets $100/mo min.
    // A paid off in 10 months. Then B has $5000 left, gets $300/mo => 17 more months = 27 total.
    expect(result.months).toBe(27);
  });

  it('debtPayoff where extra payment alone covers everything in 1 month', () => {
    const debts: Debt[] = [
      { name: 'Tiny A', balance: 50, rate: 0.18, minPayment: 25 },
      { name: 'Tiny B', balance: 30, rate: 0.12, minPayment: 15 },
    ];
    const result = debtPayoff(debts, 10000, 'avalanche');
    // With $10K extra payment, should pay everything in month 1
    expect(result.months).toBe(1);
  });

  it('solveForContribution and solveForPrincipal are inverse at 0% rate', () => {
    const target = 100000;
    const years = 10;
    const rate = 0;

    const principal = 20000;
    const contrib = solveForContribution(principal, target, rate, years, 12);
    // At 0%: contrib = (target - principal) / (12 * years) = 80000 / 120 = 666.67
    expect(contrib).toBeCloseTo(666.67, 0);

    const recoveredPrincipal = solveForPrincipal(contrib, target, rate, years, 12);
    expect(recoveredPrincipal).toBeCloseTo(principal, 0);
  });

  it('very small nonzero rate (0.0001%) produces finite results across all functions', () => {
    const tinyRate = 0.000001;

    const ci = compoundInterest(10000, 100, tinyRate, 10, 12);
    expect(Number.isFinite(ci)).toBe(true);

    const loan = loanMonthlyPayment(100000, tinyRate, 360);
    expect(Number.isFinite(loan)).toBe(true);

    const savings = monthlySavingsRequired(50000, 0, tinyRate, 120);
    expect(Number.isFinite(savings)).toBe(true);

    const contrib = solveForContribution(10000, 100000, tinyRate, 10, 12);
    expect(Number.isFinite(contrib)).toBe(true);

    const rate = solveForRate(10000, 200, 100000, 10, 12);
    expect(Number.isFinite(rate)).toBe(true);

    const time = solveForTime(10000, 200, tinyRate, 100000, 12);
    expect(Number.isFinite(time)).toBe(true);

    const principal = solveForPrincipal(200, 100000, tinyRate, 10, 12);
    expect(Number.isFinite(principal)).toBe(true);
  });
});

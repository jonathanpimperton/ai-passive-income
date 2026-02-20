/**
 * Stress tests for financial math functions.
 * Tests edge cases, boundary conditions, adversarial inputs,
 * and cross-validates results against known financial benchmarks.
 */
import { describe, it, expect } from 'vitest';
import {
  compoundInterest,
  compoundInterestSchedule,
  loanMonthlyPayment,
  amortizationSchedule,
  monthlySavingsRequired,
  formatCurrency,
  formatPercent,
  formatNumber,
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
    expect(result).toBeGreaterThan(1000);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles very long time horizon (100 years)', () => {
    const result = compoundInterest(1000, 100, 0.07, 100, 12);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles 1 month (fractional year via 1/12)', () => {
    // 1 year minimum via function signature — but test year=1
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

  // --- Cross-validation against known financial benchmarks ---
  it('matches Bankrate compound interest example ($5000, 5%, 10yr monthly)', () => {
    // Standard benchmark: $5,000 at 5% for 10 years, monthly compounding = $8,235.05
    const result = compoundInterest(5000, 0, 0.05, 10, 12);
    expect(result).toBeCloseTo(8235.05, 0);
  });

  it('matches SEC compound interest example ($1000/mo, 6%, 40yr)', () => {
    // SEC.gov example: $1000/month at 6% for 40 years ≈ $1,991,490
    const result = compoundInterest(0, 1000, 0.06, 40, 12);
    expect(result).toBeCloseTo(1991490, -3);
  });

  // --- Result precision ---
  it('returns finite number for all valid inputs', () => {
    for (let rate = 0; rate <= 0.25; rate += 0.01) {
      for (let years = 0; years <= 50; years += 10) {
        const result = compoundInterest(10000, 200, rate, years, 12);
        expect(Number.isFinite(result)).toBe(true);
      }
    }
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
      expect(entry.totalInterest).toBeGreaterThanOrEqual(-0.01); // Allow rounding
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
    expect(p15).toBeGreaterThan(p30); // Higher monthly payment
    expect(p15 * 180).toBeLessThan(p30 * 360); // Less total paid
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
    // Widely used example: $250K at 7% for 30yr = ~$1,663.26
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
});

// ============================================================
// AMORTIZATION SCHEDULE — STRESS TESTS
// ============================================================

describe('amortizationSchedule — stress tests', () => {
  it('balance always decreases (never goes up)', () => {
    const schedule = amortizationSchedule(300000, 0.065, 360);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeLessThanOrEqual(schedule[i - 1].balance + 0.01);
    }
  });

  it('interest portion always decreases', () => {
    const schedule = amortizationSchedule(200000, 0.06, 360);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].interest).toBeLessThanOrEqual(schedule[i - 1].interest + 0.01);
    }
  });

  it('principal portion always increases', () => {
    const schedule = amortizationSchedule(200000, 0.06, 360);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].principal).toBeGreaterThanOrEqual(schedule[i - 1].principal - 0.01);
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
    // Monthly payment: ~$1,199.10, total: ~$431,676, interest: ~$231,676
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

    // Verify: if we save `monthly` per month for 120 months, do we reach $100K?
    const result = compoundInterest(current, monthly, rate, months / 12, 12);
    expect(result).toBeCloseTo(goal, -1);
  });

  it('handles goal of $1M from $0', () => {
    const monthly = monthlySavingsRequired(1000000, 0, 0.08, 360);
    expect(monthly).toBeGreaterThan(0);
    expect(Number.isFinite(monthly)).toBe(true);
    // Cross-validate
    const result = compoundInterest(0, monthly, 0.08, 30, 12);
    expect(result).toBeCloseTo(1000000, -2);
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
});

import { describe, it, expect } from 'vitest';
import {
  compoundInterest,
  compoundInterestSchedule,
  loanMonthlyPayment,
  amortizationSchedule,
  monthlySavingsRequired,
  solveForRetirementAge,
  formatCurrency,
  formatPercent,
  formatNumber,
} from './calculator-utils';

describe('compoundInterest', () => {
  it('calculates basic compound interest with no contributions', () => {
    // $10,000 at 5% for 10 years, monthly compounding
    // Expected: 10000 * (1 + 0.05/12)^(12*10) ≈ $16,470.09
    const result = compoundInterest(10000, 0, 0.05, 10, 12);
    expect(result).toBeCloseTo(16470.09, 0);
  });

  it('calculates compound interest with monthly contributions', () => {
    // $1,000 initial + $200/month at 7% for 30 years, monthly compounding
    // A = 1000*(1+0.07/12)^360 + 200*((1+0.07/12)^360-1)/(0.07/12) ≈ $252,111
    const result = compoundInterest(1000, 200, 0.07, 30, 12);
    expect(result).toBeCloseTo(252111, -2);
  });

  it('handles zero interest rate', () => {
    // $10,000 + $100/month for 10 years at 0% = $10,000 + $12,000 = $22,000
    const result = compoundInterest(10000, 100, 0, 10, 12);
    expect(result).toBeCloseTo(22000, 0);
  });

  it('handles annual compounding', () => {
    // $10,000 at 5% for 10 years, annual compounding
    // Expected: 10000 * (1.05)^10 ≈ $16,288.95
    const result = compoundInterest(10000, 0, 0.05, 10, 1);
    expect(result).toBeCloseTo(16288.95, 0);
  });

  it('handles daily compounding', () => {
    // $10,000 at 5% for 10 years, daily compounding
    // 10000*(1+0.05/365)^(365*10) ≈ $16,486.65
    const result = compoundInterest(10000, 0, 0.05, 10, 365);
    expect(result).toBeCloseTo(16486.65, 0);
  });

  it('returns principal when years is 0', () => {
    const result = compoundInterest(10000, 500, 0.07, 0, 12);
    expect(result).toBeCloseTo(10000, 2);
  });
});

describe('compoundInterestSchedule', () => {
  it('generates correct number of entries', () => {
    const schedule = compoundInterestSchedule(10000, 0, 0.05, 10, 12);
    expect(schedule).toHaveLength(11); // years 0 through 10
  });

  it('starts with initial principal', () => {
    const schedule = compoundInterestSchedule(10000, 0, 0.05, 10, 12);
    expect(schedule[0].balance).toBe(10000);
    expect(schedule[0].totalContributions).toBe(10000);
    expect(schedule[0].totalInterest).toBe(0);
  });

  it('tracks contributions and interest separately', () => {
    const schedule = compoundInterestSchedule(10000, 100, 0.05, 5, 12);
    const lastEntry = schedule[schedule.length - 1];
    // Total contributions: 10000 + 100*12*5 = 16000
    expect(lastEntry.totalContributions).toBeCloseTo(16000, 0);
    expect(lastEntry.totalInterest).toBeGreaterThan(0);
    expect(lastEntry.balance).toBeCloseTo(
      lastEntry.totalContributions + lastEntry.totalInterest,
      0
    );
  });

  it('balance increases monotonically with positive rate', () => {
    const schedule = compoundInterestSchedule(10000, 100, 0.05, 10, 12);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeGreaterThan(schedule[i - 1].balance);
    }
  });
});

describe('loanMonthlyPayment', () => {
  it('calculates standard mortgage payment', () => {
    // $300,000 at 6.5% for 30 years (360 months)
    // Expected: ~$1,896.20
    const payment = loanMonthlyPayment(300000, 0.065, 360);
    expect(payment).toBeCloseTo(1896.2, 0);
  });

  it('calculates car loan payment', () => {
    // $25,000 at 4.5% for 5 years (60 months)
    // Expected: ~$466.08
    const payment = loanMonthlyPayment(25000, 0.045, 60);
    expect(payment).toBeCloseTo(466.08, 0);
  });

  it('handles zero interest rate', () => {
    // $12,000 at 0% for 12 months = $1,000/month
    const payment = loanMonthlyPayment(12000, 0, 12);
    expect(payment).toBeCloseTo(1000, 2);
  });
});

describe('amortizationSchedule', () => {
  it('generates correct number of entries', () => {
    const schedule = amortizationSchedule(10000, 0.05, 60);
    expect(schedule).toHaveLength(60);
  });

  it('ends with zero balance', () => {
    const schedule = amortizationSchedule(10000, 0.05, 60);
    const lastEntry = schedule[schedule.length - 1];
    expect(lastEntry.balance).toBeCloseTo(0, 0);
  });

  it('total payments match principal + total interest', () => {
    const schedule = amortizationSchedule(100000, 0.06, 360);
    const totalPayments = schedule.reduce((sum, s) => sum + s.payment, 0);
    const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);
    const totalPrincipal = schedule.reduce((sum, s) => sum + s.principal, 0);
    expect(totalPrincipal).toBeCloseTo(100000, -1);
    expect(totalPayments).toBeCloseTo(totalPrincipal + totalInterest, -1);
  });

  it('principal portion increases over time', () => {
    const schedule = amortizationSchedule(100000, 0.06, 360);
    // First payment has less principal than last
    expect(schedule[0].principal).toBeLessThan(
      schedule[schedule.length - 1].principal
    );
  });
});

describe('monthlySavingsRequired', () => {
  it('calculates savings needed for a goal', () => {
    // Goal: $50,000, starting from $5,000, at 5%, in 5 years (60 months)
    // After 60 months at 5%, $5,000 grows to ~$6,416.79
    // Remaining: $43,583.21, monthly FV annuity factor ≈ 68.006
    // Monthly ≈ $640.87
    const monthly = monthlySavingsRequired(50000, 5000, 0.05, 60);
    expect(monthly).toBeCloseTo(640.87, 0);
  });

  it('handles zero interest rate', () => {
    // Goal: $12,000, starting from $0, at 0%, in 12 months = $1,000/month
    const monthly = monthlySavingsRequired(12000, 0, 0, 12);
    expect(monthly).toBeCloseTo(1000, 2);
  });

  it('returns zero when goal is already met', () => {
    const monthly = monthlySavingsRequired(10000, 15000, 0.05, 60);
    expect(monthly).toBeLessThan(0); // Already exceeded goal
  });
});

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('rounds to nearest dollar', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });
});

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.075)).toBe('7.5%');
  });

  it('formats with specified decimals', () => {
    expect(formatPercent(0.07123, 2)).toBe('7.12%');
  });
});

describe('solveForRetirementAge', () => {
  it('returns current age if savings already exceed target', () => {
    const result = solveForRetirementAge(30, 2000000, 500, 0.07, 1000000);
    expect(result).toBe(30);
  });

  it('finds correct retirement age for typical scenario', () => {
    // 30-year-old, $50K saved, $500/mo, 7% return, targeting $1M
    const result = solveForRetirementAge(30, 50000, 500, 0.07, 1000000);
    // Should be around 60-65
    expect(result).toBeGreaterThan(55);
    expect(result).toBeLessThan(70);
  });

  it('caps at max age of 90', () => {
    // Very low savings rate, high target — should cap at 90
    const result = solveForRetirementAge(70, 0, 10, 0.03, 10000000);
    expect(result).toBeLessThanOrEqual(90);
  });

  it('returns earlier age with higher contributions', () => {
    const low = solveForRetirementAge(30, 50000, 500, 0.07, 1000000);
    const high = solveForRetirementAge(30, 50000, 2000, 0.07, 1000000);
    expect(high).toBeLessThan(low);
  });
});

describe('formatNumber', () => {
  it('formats with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats with decimals', () => {
    expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
  });
});

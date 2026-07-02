import { describe, it, expect } from 'vitest';
import { calcMonthly, calcPcpMonthly, calcOpportunityCost } from './car-finance';
import { loanMonthlyPayment } from './calculator-utils';

describe('calcMonthly — standard loan payment', () => {
  it('£20,000 at 6% over 60 months → £386.66/mo', () => {
    // M = 20,000 × 0.005 × 1.005^60 / (1.005^60 − 1) = 386.6560...
    expect(calcMonthly(20_000, 6, 60)).toBeCloseTo(386.66, 2);
  });

  it('matches loanMonthlyPayment from calculator-utils exactly', () => {
    expect(calcMonthly(20_000, 6, 60)).toBeCloseTo(loanMonthlyPayment(20_000, 0.06, 60), 10);
    expect(calcMonthly(35_000, 8.9, 48)).toBeCloseTo(loanMonthlyPayment(35_000, 0.089, 48), 10);
  });

  it('splits the principal evenly at 0% APR', () => {
    expect(calcMonthly(12_000, 0, 48)).toBe(250);
  });

  it('returns 0 for non-positive principal or term', () => {
    expect(calcMonthly(0, 5, 60)).toBe(0);
    expect(calcMonthly(-1_000, 5, 60)).toBe(0);
    expect(calcMonthly(10_000, 5, 0)).toBe(0);
  });
});

describe('calcPcpMonthly — PCP with balloon (GMFV)', () => {
  it('equals a straight loan payment when the balloon is zero', () => {
    expect(calcPcpMonthly(20_000, 0, 6, 48)).toBeCloseTo(calcMonthly(20_000, 6, 48), 6);
  });

  it('monthly payment is lower than a straight loan for the same amount', () => {
    // £20,000 financed, £8,000 balloon, 6% over 48 months:
    // straight loan ≈ £469.70/mo, PCP ≈ £321.82/mo
    const pcp = calcPcpMonthly(20_000, 8_000, 6, 48);
    const loan = calcMonthly(20_000, 6, 48);
    expect(loan).toBeCloseTo(469.70, 1);
    expect(pcp).toBeCloseTo(321.82, 1);
    expect(pcp).toBeLessThan(loan);
  });

  it('total cost (payments + balloon) exceeds the straight loan total when APR > 0', () => {
    // The balloon accrues interest for the whole term, so deferring it costs more
    const months = 48;
    const pcpTotal = calcPcpMonthly(20_000, 8_000, 6, months) * months + 8_000;
    const loanTotal = calcMonthly(20_000, 6, months) * months;
    expect(pcpTotal).toBeGreaterThan(loanTotal);
  });

  it('splits (amount − balloon) evenly at 0% APR', () => {
    expect(calcPcpMonthly(20_000, 8_000, 0, 48)).toBe(250);
  });

  it('returns 0 for non-positive finance amount or term', () => {
    expect(calcPcpMonthly(0, 5_000, 6, 48)).toBe(0);
    expect(calcPcpMonthly(20_000, 8_000, 6, 0)).toBe(0);
  });
});

describe('calcOpportunityCost', () => {
  it('is zero when the return rate or term is zero', () => {
    expect(calcOpportunityCost(10_000, 200, 48, 0)).toBe(0);
    expect(calcOpportunityCost(10_000, 200, 0, 5)).toBe(0);
  });

  it('upfront payment: upfront × ((1+r)^n − 1)', () => {
    // £10,000 upfront, 12% annual (1%/mo), 12 months: 10,000 × (1.01^12 − 1) = £1,268.25
    expect(calcOpportunityCost(10_000, 0, 12, 12)).toBeCloseTo(1_268.25, 1);
  });

  it('monthly payments: monthly × (((1+r)^n − 1)/r − n)', () => {
    // £100/mo, 12% annual, 12 months: 100 × (12.682503 − 12) = £68.25
    expect(calcOpportunityCost(0, 100, 12, 12)).toBeCloseTo(68.25, 1);
  });

  it('combines upfront and monthly components additively', () => {
    const combined = calcOpportunityCost(10_000, 100, 12, 12);
    const upfrontOnly = calcOpportunityCost(10_000, 0, 12, 12);
    const monthlyOnly = calcOpportunityCost(0, 100, 12, 12);
    expect(combined).toBeCloseTo(upfrontOnly + monthlyOnly, 6);
  });

  it('grows with a longer term', () => {
    const short = calcOpportunityCost(10_000, 200, 24, 5);
    const long = calcOpportunityCost(10_000, 200, 60, 5);
    expect(long).toBeGreaterThan(short);
  });
});

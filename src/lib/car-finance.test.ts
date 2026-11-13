import { describe, it, expect } from 'vitest';
import {
  calcMonthly,
  calcPcpMonthly,
  calcOpportunityCost,
  monthlyRateFromApr,
  aprConventionForCurrency,
  clampDeposit,
  maxDepositFor,
  compareCarFinance,
  MIN_FINANCE_AMOUNT,
} from './car-finance';
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

describe('APR conventions (MTH-27)', () => {
  it('UK/EU effective APR: monthly rate = (1 + APR)^(1/12) - 1', () => {
    // 7.9% APR: 0.6356% a month effective vs 0.6583% nominal (APR/12)
    expect(monthlyRateFromApr(7.9, 'effective')).toBeCloseTo(0.0063562, 6);
    expect(monthlyRateFromApr(7.9, 'nominal')).toBeCloseTo(0.0065833, 6);
    // Twelve effective months compound back to the APR exactly.
    expect((1 + monthlyRateFromApr(7.9, 'effective')) ** 12 - 1).toBeCloseTo(0.079, 12);
  });

  it('effective APR gives a slightly lower payment than APR/12 for the same headline APR', () => {
    const eff = calcMonthly(20_000, 7.9, 48, 'effective');
    const nom = calcMonthly(20_000, 7.9, 48, 'nominal');
    expect(eff).toBeLessThan(nom);
    expect(nom - eff).toBeLessThan(5); // "a few pounds a month"
    // Present value of the payments at the effective monthly rate = the loan.
    const r = monthlyRateFromApr(7.9, 'effective');
    let pv = 0;
    for (let m = 1; m <= 48; m++) pv += eff / (1 + r) ** m;
    expect(pv).toBeCloseTo(20_000, 6);
  });

  it('the PCP balloon is discounted at the same monthly rate', () => {
    const r = monthlyRateFromApr(9.9, 'effective');
    const pay = calcPcpMonthly(20_000, 8_000, 9.9, 36, 'effective');
    let pv = 8_000 / (1 + r) ** 36;
    for (let m = 1; m <= 36; m++) pv += pay / (1 + r) ** m;
    expect(pv).toBeCloseTo(20_000, 6);
  });

  it('maps currencies: USD nominal (Reg Z), GBP and EUR effective', () => {
    expect(aprConventionForCurrency('USD')).toBe('nominal');
    expect(aprConventionForCurrency('GBP')).toBe('effective');
    expect(aprConventionForCurrency('EUR')).toBe('effective');
  });
});

describe('deposit clamp (CALC-UX-A-07)', () => {
  it('keeps the deposit at least the minimum finance amount below the price', () => {
    expect(clampDeposit(25_000, 2_500)).toBe(2_500);
    expect(clampDeposit(5_000, 20_000)).toBe(5_000 - MIN_FINANCE_AMOUNT);
    expect(clampDeposit(200_000, 100_000)).toBe(75_000);
    expect(clampDeposit(800, 500)).toBe(0);
    expect(clampDeposit(25_000, -10)).toBe(0);
    expect(clampDeposit(25_000, Number.NaN)).toBe(0);
    expect(maxDepositFor(3_000)).toBe(2_000);
  });

  it('a stale $20,000 deposit on a $5,000 car no longer shows "$15,000 interest"', () => {
    const c = compareCarFinance({
      carPrice: 5_000,
      deposit: 20_000,
      termMonths: 48,
      pcpApr: 7.9,
      pcpBalloonPct: 40,
      hpApr: 8.9,
      loanApr: 5.6,
      investReturnRate: 4.5,
      aprConvention: 'effective',
    });
    expect(c.deposit).toBe(4_000);
    expect(c.financeAmount).toBe(1_000);
    for (const o of c.options) {
      expect(o.totalInterest).toBeGreaterThanOrEqual(0);
      expect(o.totalInterest).toBeLessThan(500);
      expect(o.totalPaid).toBeGreaterThanOrEqual(5_000);
    }
  });
});

describe('compareCarFinance', () => {
  const BASE = {
    carPrice: 25_000,
    deposit: 2_500,
    termMonths: 48,
    pcpApr: 7.9,
    pcpBalloonPct: 40,
    hpApr: 8.9,
    loanApr: 5.6,
    investReturnRate: 4.5,
    aprConvention: 'effective' as const,
  };

  it('true cost = total paid + opportunity cost; interest = total paid - price', () => {
    const c = compareCarFinance(BASE);
    for (const o of c.options) {
      expect(o.trueCost).toBeCloseTo(o.totalPaid + o.opportunityCost, 9);
      expect(o.totalInterest).toBeCloseTo(o.totalPaid - 25_000, 9);
    }
    expect(c.options.map((o) => o.type)).toEqual(['pcp', 'hp', 'loan', 'cash']);
    expect(c.cheapest.trueCost).toBe(Math.min(...c.options.map((o) => o.trueCost)));
  });

  it('caps the balloon so deposit + balloon never exceeds the price', () => {
    const c = compareCarFinance({ ...BASE, deposit: 20_000, pcpBalloonPct: 60 });
    expect(c.balloonPct).toBeLessThanOrEqual(c.maxBalloonPct);
    expect(c.deposit + c.balloon).toBeLessThanOrEqual(25_000);
  });

  it('true cost of each financed option equals the future value of its outflows', () => {
    // FV at the investment rate of: deposit at 0, payments months 1..n, final payment at n.
    const c = compareCarFinance(BASE);
    const i = 4.5 / 1200;
    const fv = (dep: number, pay: number, last: number) => {
      let s = dep * (1 + i) ** 48 + last;
      for (let m = 1; m <= 48; m++) s += pay * (1 + i) ** (48 - m);
      return s;
    };
    const pcp = c.options[0];
    // Opportunity cost + total paid equals FV of outflows (no growth on the final payment).
    expect(pcp.trueCost).toBeCloseTo(fv(2_500, pcp.monthly, c.balloon), 6);
  });
});

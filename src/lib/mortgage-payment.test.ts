import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PMI_RATE,
  buildAmortization,
  computeMortgagePayment,
  loanFromPayment,
  monthlyPayment,
  type MortgagePaymentInputs,
} from './mortgage-payment';
import { amortizationSchedule, loanMonthlyPayment } from './calculator-utils';

const BASE: MortgagePaymentInputs = {
  homePrice: 350_000,
  downPaymentPercent: 20,
  interestRate: 7,
  loanTerm: 30,
  extraMonthly: 0,
  propertyTaxRate: 1,
  insuranceAnnual: 1_800,
  pmiRate: DEFAULT_PMI_RATE,
};

describe('monthlyPayment / loanFromPayment', () => {
  it('matches standard published payments', () => {
    // $200,000 at 6% for 30 years = $1,199.10 (standard amortization table value)
    expect(monthlyPayment(200_000, 6, 360)).toBeCloseTo(1_199.1, 2);
    // $300,000 at 6.5% for 30 years = $1,896.20
    expect(monthlyPayment(300_000, 6.5, 360)).toBeCloseTo(1_896.2, 2);
    // Mortgage hub row: $350,000 loan at 7% = $2,328.56
    expect(monthlyPayment(350_000, 7, 360)).toBeCloseTo(2_328.56, 2);
  });

  it('agrees with the shared calculator-utils formula', () => {
    for (const [p, r, n] of [[123_456, 5.25, 300], [80_000, 3.1, 180], [1_000_000, 9.9, 360]]) {
      expect(monthlyPayment(p, r, n)).toBeCloseTo(loanMonthlyPayment(p, r / 100, n), 8);
    }
  });

  it('handles zero rate and degenerate inputs', () => {
    expect(monthlyPayment(120_000, 0, 120)).toBe(1_000);
    expect(monthlyPayment(0, 7, 360)).toBe(0);
    expect(monthlyPayment(100_000, 7, 0)).toBe(0);
    expect(loanFromPayment(1_000, 0, 120)).toBe(120_000);
    expect(loanFromPayment(0, 7, 360)).toBe(0);
  });

  it('loanFromPayment inverts monthlyPayment', () => {
    for (const [p, r, n] of [[250_000, 7.11, 360], [90_000, 4.4, 240], [500_000, 5.39, 420]]) {
      expect(loanFromPayment(monthlyPayment(p, r, n), r, n)).toBeCloseTo(p, 6);
    }
  });
});

describe('buildAmortization', () => {
  it('pays the loan off exactly at term with no extra payment', () => {
    const s = buildAmortization(300_000, 6.5, 360);
    expect(s.payoffMonths).toBe(360);
    expect(s.months[359].balance).toBe(0);
    expect(s.yearGroups).toHaveLength(30);
    // Principal repaid sums to the loan; payments = principal + interest.
    const principal = s.months.reduce((t, m) => t + m.principal, 0);
    expect(principal).toBeCloseTo(300_000, 4);
    expect(s.totalPaid).toBeCloseTo(300_000 + s.totalInterest, 4);
  });

  it('matches the legacy amortizationSchedule month by month (to the cent)', () => {
    const legacy = amortizationSchedule(180_000, 0.055, 180);
    const s = buildAmortization(180_000, 5.5, 180);
    legacy.forEach((row, i) => {
      expect(s.months[i].interest).toBeCloseTo(row.interest, 1);
      expect(s.months[i].balance).toBeCloseTo(row.balance, 1);
    });
  });

  it('extra payments: external figures from the Nov 2026 review (MATH-US-C07, MTH-29)', () => {
    // +$200/month on $300,000 over 30 years:
    //  at 7%   saves $116,640 of interest (review C07);
    //  at 6.5% saves $103,449 and about 6.9 years (review MTH-29).
    const at7 = buildAmortization(300_000, 7, 360).totalInterest - buildAmortization(300_000, 7, 360, 200).totalInterest;
    expect(Math.round(at7)).toBe(116_640);
    const base65 = buildAmortization(300_000, 6.5, 360);
    const extra65 = buildAmortization(300_000, 6.5, 360, 200);
    expect(Math.round(base65.totalInterest - extra65.totalInterest)).toBe(103_449);
    expect((base65.payoffMonths - extra65.payoffMonths) / 12).toBeCloseTo(6.9, 1);
  });

  it('caps the final payment at the remaining balance plus interest', () => {
    const s = buildAmortization(10_000, 6, 60, 5_000);
    const last = s.months[s.months.length - 1];
    expect(last.balance).toBe(0);
    expect(last.payment).toBeLessThanOrEqual(s.scheduledPayment + 5_000);
    for (const m of s.months) expect(m.principal).toBeGreaterThan(0);
  });

  it('more extra never costs more interest (monotone)', () => {
    let prev = Infinity;
    for (const extra of [0, 50, 100, 250, 500, 1_000, 5_000]) {
      const t = buildAmortization(400_000, 7.11, 360, extra).totalInterest;
      expect(t).toBeLessThanOrEqual(prev);
      prev = t;
    }
  });

  it('year groups reconcile with months', () => {
    const s = buildAmortization(275_000, 5.39, 300, 150);
    for (const g of s.yearGroups) {
      const sum = g.months.reduce((t, m) => t + m.interest, 0);
      expect(g.totalInterest).toBeCloseTo(sum, 8);
      expect(g.startBalance - g.totalPrincipal).toBeCloseTo(g.endBalance, 6);
    }
  });
});

describe('computeMortgagePayment', () => {
  it('US 20% down: PITI without PMI', () => {
    const r = computeMortgagePayment(BASE, 'us');
    expect(r.principal).toBe(280_000);
    expect(r.monthlyPI).toBeCloseTo(monthlyPayment(280_000, 7, 360), 8);
    expect(r.needsPMI).toBe(false);
    expect(r.monthlyTax).toBeCloseTo(350_000 * 0.01 / 12, 8);
    expect(r.monthlyInsurance).toBe(150);
    expect(r.totalMonthly).toBeCloseTo(r.monthlyPI + r.monthlyTax + 150, 8);
  });

  it('US under 20% down adds PMI at the given rate of the loan', () => {
    const r = computeMortgagePayment({ ...BASE, downPaymentPercent: 10 }, 'us');
    expect(r.needsPMI).toBe(true);
    expect(r.monthlyPMI).toBeCloseTo((315_000 * DEFAULT_PMI_RATE) / 100 / 12, 8);
  });

  it('UK/EUR: no property tax, insurance or PMI whatever the hidden inputs say', () => {
    for (const region of ['uk', 'eur'] as const) {
      const r = computeMortgagePayment({ ...BASE, downPaymentPercent: 5, propertyTaxRate: 3, insuranceAnnual: 9_000 }, region);
      expect(r.monthlyTax).toBe(0);
      expect(r.monthlyInsurance).toBe(0);
      expect(r.monthlyPMI).toBe(0);
      expect(r.needsPMI).toBe(false);
      expect(r.totalMonthly).toBeCloseTo(r.monthlyPI, 8);
    }
  });

  it('0% deposit makes the price the loan (mortgage hub tables, CONTENT-06)', () => {
    const r = computeMortgagePayment({ ...BASE, downPaymentPercent: 0 }, 'uk');
    expect(r.principal).toBe(350_000);
    expect(r.monthlyPI).toBeCloseTo(2_328.56, 2);
  });

  it('extra payment savings are reported against the no-extra schedule', () => {
    const r = computeMortgagePayment({ ...BASE, homePrice: 375_000, extraMonthly: 200 }, 'us');
    expect(r.principal).toBe(300_000);
    expect(Math.round(r.interestSaved)).toBe(116_640);
    expect(r.monthsSaved).toBeGreaterThan(0);
    expect(r.payoffMonths).toBe(360 - r.monthsSaved);
  });
});

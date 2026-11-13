/**
 * Credit card payoff engine tests.
 *
 * External worked example (accessed 2026-11-12): "Business Math: A
 * Step-by-Step Handbook" (J. Olivier, Lyryx; eCampusOntario edition),
 * Example 13.2.1 / 13.2.3,
 * https://ecampusontario.pressbooks.pub/businessmathtextbook/chapter/13-2-calculating-the-final-payment/
 * $10,000 at 8% compounded quarterly, month-end payments of $452.03 for two
 * years: final payment $452.09; payments 13-24 total $5,424.42, of which
 * $226.47 is interest. A card charges APR/12 a month, so the textbook's
 * equivalent monthly rate (0.00662271) is entered as APR = 12 x that rate.
 */
import { describe, it, expect } from 'vitest';
import {
  simulateCardPayoff,
  minimumPaymentFor,
  paymentToClearIn,
  paymentToStopGrowth,
  CARD_HORIZON_MONTHS,
  type CardPayoffInputs,
  type MinPaymentMode,
} from './credit-card';
import { monthlyRateFor } from './investment-solvers';

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

const base: CardPayoffInputs = {
  balance: 5000,
  aprPercent: 22.99,
  mode: 'fixed',
  fixedPayment: 100,
  percentOfBalance: 2,
  floor: 25,
  extra: 0,
};

describe('external worked example (textbook Example 13.2.1 / 13.2.3)', () => {
  const apr = monthlyRateFor(0.08, 4) * 12 * 100;
  const r = simulateCardPayoff({ ...base, balance: 10000, aprPercent: apr, fixedPayment: 452.03 });

  // The textbook folds the $0.06 left after 24 payments into payment 24
  // ($452.03 + $0.06 = $452.09); a card bills that residue the next month.
  it('24 payments of $452.03 leave $0.06, the textbook final-payment top-up', () => {
    expect(r.status).toBe('paid');
    expect(r.schedule[23].balance).toBeCloseTo(0.06, 2);
    expect(r.months).toBe(25);
    expect(r.schedule[23].payment + r.schedule[24].payment).toBeCloseTo(452.09, 2);
  });

  it('payments 13-24 (with the top-up) total $5,424.42 with $226.47 interest', () => {
    const rows = r.schedule.slice(12, 24);
    const paid = rows.reduce((s, m) => s + m.payment, 0) + r.schedule[24].payment;
    const interest = rows.reduce((s, m) => s + m.interest, 0);
    expect(paid).toBeCloseTo(5424.42, 1);
    expect(interest).toBeCloseTo(226.47, 1);
  });
});

describe('never pays off (S1-8: MATH-US-02, CALC-UX-B-05)', () => {
  it('$8,000 at 24% with a $100 fixed minimum: never, $160/mo interest, no totals', () => {
    const r = simulateCardPayoff({ ...base, balance: 8000, aprPercent: 24, fixedPayment: 100 });
    expect(r.status).toBe('never');
    expect(r.firstMonthInterest).toBeCloseTo(160, 8);
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(0);
    expect(r.schedule).toHaveLength(0);
    expect(paymentToStopGrowth(8000, 24)).toBe(161);
  });

  it('$8,000 at 24% with a 2% minimum: the 2% payment only equals the interest, so never', () => {
    const r = simulateCardPayoff({ ...base, balance: 8000, aprPercent: 24, mode: 'percentage', percentOfBalance: 2 });
    expect(r.status).toBe('never');
    expect(r.firstPayment).toBeCloseTo(160, 8);
  });

  it('$8,000 at 24% with interest + 1%: always repaid, totals consistent', () => {
    const r = simulateCardPayoff({ ...base, balance: 8000, aprPercent: 24, mode: 'interestPlus', percentOfBalance: 1 });
    expect(r.status).toBe('paid');
    expect(r.firstPayment).toBeCloseTo(240, 8);
    expect(r.totalPaid).toBeCloseTo(8000 + r.totalInterest, 1);
  });

  it('$8,000 at 22.99% with $100 (review repro): never, interest $153.27/mo', () => {
    const r = simulateCardPayoff({ ...base, balance: 8000 });
    expect(r.status).toBe('never');
    expect(r.firstMonthInterest).toBeCloseTo(153.27, 2);
  });

  it('adding $50 to that never-case still never pays off; adding $60 does', () => {
    expect(simulateCardPayoff({ ...base, balance: 8000, extra: 50 }).status).toBe('never');
    expect(simulateCardPayoff({ ...base, balance: 8000, extra: 60 }).status).toBe('paid');
  });

  it('a payment exactly equal to the interest is never (balance stays flat forever)', () => {
    expect(simulateCardPayoff({ ...base, balance: 6000, aprPercent: 24, fixedPayment: 120 }).status).toBe('never');
  });
});

describe('known results (methodology regression, MTH-04)', () => {
  it('$5,000 at 22.99% paying $100: 167 months, $11,694 interest', () => {
    const r = simulateCardPayoff(base);
    expect(r.status).toBe('paid');
    expect(r.months).toBe(167);
    expect(Math.round(r.totalInterest)).toBe(11694);
  });

  it('+$50 a month: 54 months and $3,045 interest (saves $8,649)', () => {
    const r = simulateCardPayoff({ ...base, extra: 50 });
    expect(r.months).toBe(54);
    expect(Math.round(r.totalInterest)).toBe(3045);
    expect(Math.round(simulateCardPayoff(base).totalInterest - r.totalInterest)).toBe(8649);
  });

  it('2% / $25 minimum on $5,000 at 22.99% is not repaid within 50 years: honest beyondHorizon', () => {
    const r = simulateCardPayoff({ ...base, mode: 'percentage', percentOfBalance: 2 });
    expect(r.status).toBe('beyondHorizon');
    expect(r.months).toBe(CARD_HORIZON_MONTHS);
    expect(r.remainingBalance).toBeGreaterThan(0);
    expect(r.remainingBalance).toBeLessThan(5000);
  });
});

describe('helpers', () => {
  it('minimumPaymentFor in each mode', () => {
    expect(minimumPaymentFor(5000, 95, 'fixed', 100, 2, 25)).toBe(100);
    expect(minimumPaymentFor(5000, 95, 'percentage', 100, 2, 25)).toBe(100);
    expect(minimumPaymentFor(500, 9.5, 'percentage', 100, 2, 25)).toBe(25);
    expect(minimumPaymentFor(5000, 95, 'interestPlus', 100, 1, 25)).toBe(145);
  });

  it('paymentToClearIn matches the amortizing payment and clears the balance', () => {
    const p = paymentToClearIn(8000, 24, 60);
    expect(p).toBeCloseTo(230.14, 2);
    const r = simulateCardPayoff({ ...base, balance: 8000, aprPercent: 24, fixedPayment: p + 1e-9 });
    expect(r.status).toBe('paid');
    expect(r.months).toBe(60);
    expect(paymentToClearIn(1200, 0, 12)).toBe(100);
  });

  it('no balance', () => {
    expect(simulateCardPayoff({ ...base, balance: 0 }).status).toBe('noBalance');
  });
});

describe('properties over 5,000 random cards', { timeout: 30000 }, () => {
  const modes: MinPaymentMode[] = ['fixed', 'percentage', 'interestPlus'];
  const rand = rng(8);
  const cases: CardPayoffInputs[] = [];
  for (let k = 0; k < 5000; k++) {
    cases.push({
      balance: 100 + rand() * 60000,
      aprPercent: rand() < 0.05 ? 0 : rand() * 36,
      mode: modes[Math.floor(rand() * 3)],
      fixedPayment: 25 + rand() * 1500,
      percentOfBalance: 1 + Math.floor(rand() * 19) / 2,
      floor: rand() < 0.5 ? 25 : 5,
      extra: rand() < 0.5 ? 0 : rand() * 500,
    });
  }

  it('never <=> the first payment does not exceed the first month interest', () => {
    for (const c of cases) {
      const r = simulateCardPayoff(c);
      const isNever = r.status === 'never';
      expect(isNever).toBe(r.firstPayment <= r.firstMonthInterest + 1e-9 && r.firstPayment < c.balance + r.firstMonthInterest);
      if (isNever) {
        expect(r.totalInterest).toBe(0);
        expect(r.totalPaid).toBe(0);
        expect(r.schedule).toHaveLength(0);
      }
    }
  });

  it('paid: balance falls every month, ends at 0, and total paid = balance + interest', () => {
    for (const c of cases) {
      const r = simulateCardPayoff(c);
      if (r.status !== 'paid') continue;
      expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
      const rising = r.schedule.findIndex((m, i) => i > 0 && m.balance > r.schedule[i - 1].balance);
      expect(rising).toBe(-1);
      expect(Math.abs(r.totalPaid - (c.balance + r.totalInterest))).toBeLessThan(0.02);
      expect(r.months).toBeLessThanOrEqual(CARD_HORIZON_MONTHS);
    }
  }, 30000);

  it('beyondHorizon: still falling, money left, totals cover exactly the horizon', () => {
    for (const c of cases) {
      const r = simulateCardPayoff(c);
      if (r.status !== 'beyondHorizon') continue;
      expect(r.schedule).toHaveLength(CARD_HORIZON_MONTHS);
      expect(r.remainingBalance).toBeGreaterThan(0);
      expect(r.remainingBalance).toBeLessThan(c.balance);
      expect(Math.abs(r.totalPaid - (c.balance - r.remainingBalance + r.totalInterest))).toBeLessThan(0.05);
    }
  });

  it('paying extra never costs more interest or time when both are repaid', () => {
    for (const c of cases.slice(0, 2000)) {
      const without = simulateCardPayoff({ ...c, extra: 0 });
      const withExtra = simulateCardPayoff({ ...c, extra: c.extra + 50 });
      if (without.status === 'paid' && withExtra.status === 'paid') {
        expect(withExtra.totalInterest).toBeLessThanOrEqual(without.totalInterest + 1e-6);
        expect(withExtra.months).toBeLessThanOrEqual(without.months);
      }
      if (without.status === 'paid') expect(withExtra.status).toBe('paid');
    }
  });

  it('interest + percentage mode always reduces the balance', () => {
    for (const c of cases) {
      if (c.mode !== 'interestPlus') continue;
      expect(simulateCardPayoff(c).status).not.toBe('never');
    }
  });
});

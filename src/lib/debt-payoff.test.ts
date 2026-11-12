/**
 * Debt payoff (snowball / avalanche) tests.
 *
 * External worked example (accessed 2026-11-12): "Business Math: A
 * Step-by-Step Handbook" (J. Olivier, Lyryx; eCampusOntario edition),
 * Example 13.2.1,
 * https://ecampusontario.pressbooks.pub/businessmathtextbook/chapter/13-2-calculating-the-final-payment/
 * $10,000 at 8% compounded quarterly with $452.03 month-end payments: 24
 * payments, the last one $452.09. Entered as one debt at the equivalent
 * monthly rate (APR = 12 x 0.00662271) with a $452.03 minimum.
 */
import { describe, it, expect } from 'vitest';
import {
  simulateDebtPayoff,
  debtPayoff,
  prepareDebts,
  debtLabel,
  DEBT_HORIZON_MONTHS,
  type Debt,
  type DebtRowInput,
} from './debt-payoff';
import { debtPayoff as legacyReExport } from './calculator-utils';
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

/** The pre-Nov-2026 calculator-utils debtPayoff loop, frozen for an equivalence check. */
function oldDebtPayoff(debts: Debt[], extra: number, strategy: 'snowball' | 'avalanche') {
  const balances = debts.map((d) => d.balance);
  const rates = debts.map((d) => d.rate);
  const mins = debts.map((d) => d.minPayment);
  const paidOff = debts.map(() => false);
  const timeline: Array<{ month: number; totalBalance: number; totalInterest: number }> = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let rolled = 0;
  let month = 0;
  while (balances.some((b) => b > 0.01) && month < 600) {
    month++;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const interest = balances[i] * (rates[i] / 12);
      balances[i] += interest;
      totalInterest += interest;
    }
    let available = extra + rolled;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const payment = Math.min(mins[i], balances[i]);
      balances[i] -= payment;
      totalPaid += payment;
      if (balances[i] <= 0.01) {
        balances[i] = 0;
        available += mins[i] - payment;
        if (!paidOff[i]) {
          paidOff[i] = true;
          rolled += mins[i];
        }
      }
    }
    const sorted = balances.map((b, i) => ({ idx: i, balance: b, rate: rates[i] })).filter((d) => d.balance > 0);
    if (strategy === 'snowball') sorted.sort((a, b) => a.balance - b.balance);
    else sorted.sort((a, b) => b.rate - a.rate);
    for (const d of sorted) {
      if (available <= 0) break;
      const payment = Math.min(available, balances[d.idx]);
      balances[d.idx] -= payment;
      totalPaid += payment;
      available -= payment;
      if (balances[d.idx] <= 0.01) {
        balances[d.idx] = 0;
        if (!paidOff[d.idx]) {
          paidOff[d.idx] = true;
          rolled += mins[d.idx];
        }
      }
    }
    timeline.push({ month, totalBalance: balances.reduce((s, b) => s + Math.max(0, b), 0), totalInterest });
  }
  return { months: month, totalInterest: Math.round(totalInterest * 100) / 100, totalPaid: Math.round(totalPaid * 100) / 100, timeline };
}

const OLD_DEFAULTS: Debt[] = [
  { name: 'Credit Card', balance: 5000, rate: 0.1899, minPayment: 150 },
  { name: 'Car Loan', balance: 12000, rate: 0.055, minPayment: 350 },
  { name: 'Student Loan', balance: 25000, rate: 0.045, minPayment: 280 },
];

function randomPortfolio(rand: () => number): { debts: Debt[]; extra: number } {
  const n = 1 + Math.floor(rand() * 6);
  const debts: Debt[] = [];
  for (let i = 0; i < n; i++) {
    const balance = 200 + rand() * 40000;
    const rate = rand() < 0.1 ? 0 : rand() * 0.3;
    // Mostly amortizing minimums, some underwater ones.
    const interest = (balance * rate) / 12;
    const minPayment = rand() < 0.15 ? interest * rand() : interest + 10 + rand() * balance * 0.03;
    debts.push({ name: `D${i}`, balance, rate, minPayment });
  }
  return { debts, extra: rand() < 0.3 ? 0 : rand() * 800 };
}

describe('external worked example (textbook Example 13.2.1)', () => {
  it('one debt at the equivalent monthly rate: 24 payments leave the textbook $0.06 top-up; total paid = 23 x 452.03 + 452.09', () => {
    const apr = monthlyRateFor(0.08, 4) * 12;
    const r = simulateDebtPayoff([{ name: 'Loan', balance: 10000, rate: apr, minPayment: 452.03 }], 0, 'avalanche');
    expect(r.status).toBe('paid');
    expect(r.timeline[23].totalBalance).toBeCloseTo(0.0616, 3);
    expect(r.months).toBe(25);
    expect(r.totalPaid).toBeCloseTo(23 * 452.03 + 452.0916, 1);
    expect(r.totalInterest).toBeCloseTo(r.totalPaid - 10000, 1);
  });
});

describe('rollover logic unchanged (equivalence with the review-verified implementation)', { timeout: 60000 }, () => {
  it('2,000 random portfolios give identical months, totals and timelines', () => {
    const rand = rng(10000);
    for (let k = 0; k < 2000; k++) {
      const { debts, extra } = randomPortfolio(rand);
      for (const strategy of ['snowball', 'avalanche'] as const) {
        const a = simulateDebtPayoff(debts, extra, strategy);
        const b = oldDebtPayoff(debts, extra, strategy);
        expect(a.months).toBe(b.months);
        expect(a.totalInterest).toBe(b.totalInterest);
        expect(a.totalPaid).toBe(b.totalPaid);
        expect(a.timeline.length).toBe(b.timeline.length);
        expect(a.timeline[a.timeline.length - 1]?.totalBalance).toBe(b.timeline[b.timeline.length - 1]?.totalBalance);
      }
    }
  });

  it('calculator-utils still exports the legacy function with the same results plus status', () => {
    const r = legacyReExport(OLD_DEFAULTS, 200, 'avalanche');
    expect(r.status).toBe('paid');
    expect(r.payoffOrder).toEqual(['Credit Card', 'Car Loan', 'Student Loan']);
    expect(r.months).toBe(oldDebtPayoff(OLD_DEFAULTS, 200, 'avalanche').months);
  });
});

describe('never / beyond horizon (S1-11: MATH-US-03)', { timeout: 60000 }, () => {
  const underwater: Debt = { name: 'New card', balance: 20000, rate: 0.2499, minPayment: 200 };

  it('review repro: old defaults + $20,000 at 24.99% ($200 min), $0 extra: snowball never pays off', () => {
    const r = simulateDebtPayoff([...OLD_DEFAULTS, underwater], 0, 'snowball');
    expect(r.status).toBe('never');
    expect(r.remainingBalance).toBeGreaterThan(20000);
  });

  it('that debt alone never pays off; months are not presented as a payoff', () => {
    const r = simulateDebtPayoff([underwater], 0, 'avalanche');
    expect(r.status).toBe('never');
    expect(r.months).toBe(DEBT_HORIZON_MONTHS);
    const legacy = debtPayoff([underwater], 0, 'avalanche');
    expect(legacy.status).toBe('never');
    expect(legacy.months).toBe(600); // legacy behaviour kept, but now flagged
  });

  it('a slow but shrinking debt is beyondHorizon, not never', () => {
    // $50,000 at 6% paying $251: interest $250 a month, shrinks by about $1 a month at first (about 92 years).
    const r = simulateDebtPayoff([{ name: 'Slow', balance: 50000, rate: 0.06, minPayment: 251 }], 0, 'avalanche');
    expect(r.status).toBe('beyondHorizon');
  });

  it('clearances list cleared debts first, then the uncleared one with month null', () => {
    const r = simulateDebtPayoff([...OLD_DEFAULTS, underwater], 0, 'snowball');
    const uncleared = r.clearances.filter((c) => c.month === null);
    expect(uncleared.map((c) => c.name)).toEqual(['New card']);
    expect(r.clearances).toHaveLength(4);
  });

  it('property: paid => nothing left and total paid = balances + interest; never => balance not falling at the end', () => {
    const rand = rng(77);
    for (let k = 0; k < 2000; k++) {
      const { debts, extra } = randomPortfolio(rand);
      for (const strategy of ['snowball', 'avalanche'] as const) {
        const r = simulateDebtPayoff(debts, extra, strategy);
        const start = debts.reduce((s, d) => s + d.balance, 0);
        if (r.status === 'paid') {
          expect(r.remainingBalance).toBe(0);
          expect(Math.abs(r.totalPaid - (start + r.totalInterest))).toBeLessThan(0.05 * debts.length + 0.05);
          expect(r.clearances.every((c) => c.month !== null)).toBe(true);
        } else {
          expect(r.months).toBe(DEBT_HORIZON_MONTHS);
          const tl = r.timeline;
          const falling = tl[tl.length - 1].totalBalance < tl[tl.length - 2].totalBalance - 1e-9;
          expect(r.status).toBe(falling ? 'beyondHorizon' : 'never');
        }
        expect(Number.isFinite(r.totalInterest)).toBe(true);
        expect(Number.isFinite(r.totalPaid)).toBe(true);
      }
    }
  });
});

describe('duplicate names are kept apart (MATH-US-04)', () => {
  it('two debts called "Card" both appear in the clearance list', () => {
    const r = simulateDebtPayoff(
      [
        { name: 'Card', balance: 1000, rate: 0.2, minPayment: 50 },
        { name: 'Card', balance: 3000, rate: 0.1, minPayment: 90 },
      ],
      100,
      'avalanche',
    );
    expect(r.clearances.map((c) => c.index).sort()).toEqual([0, 1]);
  });
});

describe('prepareDebts (form rows)', () => {
  const row = (over: Partial<DebtRowInput>): DebtRowInput => ({
    name: 'Card',
    balance: 1000,
    ratePercent: 20,
    minPayment: 50,
    ...over,
  });

  it('CALC-UX-B-06: an unnamed row becomes "Debt n" and is included in the totals', () => {
    const p = prepareDebts([row({}), row({ name: '' }), row({ name: '  ' })]);
    expect(p.debts.map((d) => d.name)).toEqual(['Card', 'Debt 2', 'Debt 3']);
    expect(p.debts.reduce((s, d) => s + d.balance, 0)).toBe(3000);
    expect(debtLabel('', 3)).toBe('Debt 4');
  });

  it('CALC-UX-B-08: a blank APR is an inline issue, never NaN', () => {
    const p = prepareDebts([row({}), row({ ratePercent: null })]);
    expect(p.debts).toHaveLength(1);
    expect(p.issues).toEqual([{ row: 1, field: 'ratePercent', message: 'Enter the APR (0 if interest-free).' }]);
    const r = simulateDebtPayoff(p.debts, 0, 'avalanche');
    expect(Number.isNaN(r.totalInterest)).toBe(false);
  });

  it('blank balance / minimum and out-of-range values are reported', () => {
    const p = prepareDebts([
      row({ balance: null }),
      row({ minPayment: null }),
      row({ balance: 0 }),
      row({ ratePercent: 5000 }),
      row({ minPayment: -1 }),
    ]);
    expect(p.debts).toHaveLength(0);
    expect(p.issues.map((i) => `${i.row}:${i.field}`)).toEqual([
      '0:balance',
      '1:minPayment',
      '2:balance',
      '3:ratePercent',
      '4:minPayment',
    ]);
  });

  it('completely blank rows are ignored without an error', () => {
    const p = prepareDebts([row({}), { name: '', balance: null, ratePercent: null, minPayment: null }]);
    expect(p.blankRows).toEqual([1]);
    expect(p.issues).toEqual([]);
  });

  it('duplicate names get a position suffix; 0% APR and $0 minimum are valid', () => {
    const p = prepareDebts([row({}), row({ ratePercent: 0, minPayment: 0 })]);
    expect(p.debts.map((d) => d.name)).toEqual(['Card (debt 1)', 'Card (debt 2)']);
    expect(p.debts[1].rate).toBe(0);
    expect(p.rowOf).toEqual([0, 1]);
  });
});

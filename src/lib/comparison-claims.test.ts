/**
 * Directional claims in src/data/comparisons/*.md that depend on live inputs
 * (market-rates.ts) or on engine behaviour.
 *
 * The comparison articles state figures as tokens, so the numbers cannot go
 * stale. A SENTENCE can: "the 15-year finishes ahead", "renting wins at 7
 * years", "the revert-to rate is higher than the fix". Each test below states
 * one such claim as an assertion over the same figure expressions the page
 * uses. When a market-rates update falsifies a claim, the failure names the
 * page and the sentence to re-read; fix the prose, then update the assertion.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFigureValue as v } from './figures';

const num = (source: string): number => {
  const value = v(source);
  if (typeof value !== 'number') throw new Error(`${source} is not a number`);
  return value;
};
const text = (source: string): string => String(v(source));

// 15-year-vs-30-year-mortgage.md
const P15 = "loanPayment(300000, rate('us15'), 15)";
const P30 = "loanPayment(300000, rate('us30'), 30)";
const DIFF = `(${P15} - ${P30})`;
/** What the 30-year path (invest the difference for 30 years) holds minus the 15-year path, at return r. */
const lead30 = (r: number) => num(`compoundFV(0, ${DIFF}, ${r}, 30) - compoundFV(0, ${P15}, ${r}, 15)`);

describe('15-year-vs-30-year-mortgage.md', () => {
  it('the 15-year rate is below the 30-year rate ("the 15-year loan carries a lower rate"; "the rate premium never goes away")', () => {
    expect(num("rate('us15')")).toBeLessThan(num("rate('us30')"));
  });
  it('the 15-year payment is higher and it saves interest', () => {
    expect(num(P15)).toBeGreaterThan(num(P30));
    expect(num("loanTotalInterest(300000, rate('us30'), 30) - loanTotalInterest(300000, rate('us15'), 15)")).toBeGreaterThan(0);
  });
  it('FAQ "invest the difference only if returns beat the mortgage rate by a wide margin": 15-year ahead at 5% and 8%, 30-year ahead at 10%', () => {
    expect(lead30(5)).toBeLessThan(0);
    expect(lead30(8)).toBeLessThan(0);
    expect(lead30(10)).toBeGreaterThan(0);
  });
  it('at the same 6% rate on both loans, investing the difference at 8% leaves the 30-year ahead (fixed inputs)', () => {
    expect(num('compoundFV(0, loanPayment(300000, 6, 15) - loanPayment(300000, 6, 30), 8, 30) - compoundFV(0, loanPayment(300000, 6, 15), 8, 15)')).toBeGreaterThan(0);
  });
  it('prepaying the 30-year at the 15-year payment costs more interest than the true 15-year', () => {
    expect(num(`overpaymentSaving(300000, rate('us30'), 30, monthly=${DIFF}).interest - loanTotalInterest(300000, rate('us15'), 15)`)).toBeGreaterThan(0);
  });
});

// renting-vs-buying-2026.md
const RVB = (rent: number, horizon: number, rateExpr = "rate('us30')", extra = '') =>
  `rentVsBuy(400000, 20, ${rateExpr}, 30, ${rent}, ${horizon}${extra})`;

describe('renting-vs-buying-2026.md', () => {
  it('owning costs more than renting in month one (FAQ and "owning costs about $X a month more")', () => {
    expect(num(`${RVB(2200, 7)}.monthlyOwnershipCost`)).toBeGreaterThan(num(`${RVB(2200, 7)}.firstMonthRentCost`));
  });
  it('"You might move within about five years": renting is ahead at 3, 5 and 7 years with $2,200 rent', () => {
    for (const h of [3, 5, 7]) expect(text(`${RVB(2200, h)}.verdict`), `${h} years`).toBe('rent');
  });
  it('FAQ "mortgage rates change the answer": at 5% the 7-year verdict is buy, at the survey rate it is rent', () => {
    expect(text(`${RVB(2200, 7, '5')}.verdict`)).toBe('buy');
    expect(text(`${RVB(2200, 7)}.verdict`)).toBe('rent');
  });
  it('a higher rent breaks even sooner, and $2,800 breaks even within 5 years ("stay that long or longer")', () => {
    const be = (rent: number) => num(`${RVB(rent, 30)}.breakEvenYear`);
    expect(be(2200)).toBeGreaterThanOrEqual(be(2600));
    expect(be(2600)).toBeGreaterThanOrEqual(be(2800));
    expect(be(2800)).toBeLessThanOrEqual(5);
  });
});

// fixed-vs-variable-rate-mortgage.md
describe('fixed-vs-variable-rate-mortgage.md', () => {
  it('the revert-to rate is above the 5-year fix (table row, FAQ and "falling onto the lender\'s standard rate")', () => {
    expect(num("rate('ukRevert')")).toBeGreaterThan(num("rate('uk5yr')"));
  });
  it('a tracker at Bank Rate plus 1 point has a lower first payment than the fix only while the break-even is above Bank Rate', () => {
    // The page prints the signed gap and says "a positive figure means the tracker starts cheaper";
    // this documents the current sign so a change is noticed.
    const gap = num("rate('uk5yr') - 1 - rate('boe')");
    const fixMinusTracker = num("loanPayment(250000, rate('uk5yr'), 25) - loanPayment(250000, rate('boe') + 1, 25)");
    expect(Math.sign(fixMinusTracker)).toBe(Math.sign(gap));
  });
});

// pay-off-debt-vs-invest.md (fixed inputs: these fail only if an engine changes)
describe('pay-off-debt-vs-invest.md', () => {
  const investFirst = (apr: number) => `compoundFV(0, 500 - 20000 * ${apr} / 1200, 7, 5) - 20000`;
  it('22% card: $500 a month does not clear the debt in five years, and paying first wins', () => {
    expect(num('loanPayoff(20000, 22, 500).months')).toBeGreaterThan(60);
    expect(num(`${investFirst(22)} + payoffBalance(20000, 22, 500, 60)`)).toBeLessThan(0);
  });
  it('3.5% loan: investing first wins', () => {
    expect(num(`${investFirst(3.5)} - compoundFV(0, 500, 7, (60 - loanPayoff(20000, 3.5, 500).months) / 12)`)).toBeGreaterThan(0);
  });
  it('7% loan: a near tie (within a few hundred dollars)', () => {
    expect(Math.abs(num(`${investFirst(7)} - compoundFV(0, 500, 7, (60 - loanPayoff(20000, 7, 500).months) / 12)`))).toBeLessThan(500);
  });
  it('4% loan over 30 years: investing first (interest only) beats paying first', () => {
    expect(num(`compoundFV(0, 500 - 20000 * 4 / 1200, 7, 30) - 20000 - compoundFV(0, 500, 7, (360 - loanPayoff(20000, 4, 500).months) / 12)`)).toBeGreaterThan(0);
  });
});

// snowball-vs-avalanche-debt.md
const DEBTS = "'5000@22/100; 8000@6/155; 3000@5/50'";
describe('snowball-vs-avalanche-debt.md', () => {
  it('avalanche costs less interest and is never slower', () => {
    expect(num(`debtPayoff(${DEBTS}, 495, 'snowball').interest`)).toBeGreaterThan(num(`debtPayoff(${DEBTS}, 495, 'avalanche').interest`));
    expect(num(`debtPayoff(${DEBTS}, 495, 'snowball').months`)).toBeGreaterThanOrEqual(num(`debtPayoff(${DEBTS}, 495, 'avalanche').months`));
  });
  it('minimums-only costs several times the avalanche figure; consolidating the card saves interest', () => {
    expect(num(`debtPayoff(${DEBTS}, 0, 'avalanche').interest / debtPayoff(${DEBTS}, 495, 'avalanche').interest`)).toBeGreaterThan(2);
    expect(num("debtPayoff('5000@10/100; 8000@6/155; 3000@5/50', 495, 'avalanche').interest")).toBeLessThan(num(`debtPayoff(${DEBTS}, 495, 'avalanche').interest`));
  });
  it('snowball clears the first debt sooner than avalanche does', () => {
    expect(num(`debtClearMonth(${DEBTS}, 495, 'snowball', 3)`)).toBeLessThan(num(`debtClearMonth(${DEBTS}, 495, 'avalanche', 1)`));
  });
});

// pcp-vs-hp-vs-personal-loan.md
const CAR = 'carFinance(25000, 2500, 48, pcpApr=7.9, hpApr=8.9, loanApr=5.6)';
describe('pcp-vs-hp-vs-personal-loan.md', () => {
  it('PCP has the lowest payment and HP the highest', () => {
    expect(num(`${CAR}.pcpMonthly`)).toBeLessThan(num(`${CAR}.loanMonthly`));
    expect(num(`${CAR}.loanMonthly`)).toBeLessThan(num(`${CAR}.hpMonthly`));
  });
  it('the loan is cheapest to own and PCP-and-keep the dearest', () => {
    expect(num(`${CAR}.loanTotalPaid`)).toBeLessThan(num(`${CAR}.hpTotalPaid`));
    expect(num(`${CAR}.hpTotalPaid`)).toBeLessThan(num(`${CAR}.pcpTotalPaid`));
  });
  it('PCP pays more interest than HP at a lower APR', () => {
    expect(num(`${CAR}.pcpTotalInterest`)).toBeGreaterThan(num(`${CAR}.hpTotalInterest`));
  });
});

// roth-vs-traditional-401k.md (2026 limits are pinned, so these are fixed inputs)
describe('roth-vs-traditional-401k.md', () => {
  const L = "usFact('k401Limit', year=2026)";
  const G = `compoundFV(${L}, 0, 7, 25, compounding=annually)`;
  const REF = `${L} * 24 / 100`;
  const GR = `compoundFV(${REF}, 0, 7, 25, compounding=annually)`;
  const TAXABLE = `(${GR} - (${GR} - ${REF}) * 15 / 100)`;
  it('24% now and 22% later: Traditional is ahead only if the tax saving grows untaxed', () => {
    expect(num(`${G} * (1 - 22 / 100) + ${GR}`)).toBeGreaterThan(num(G));
    expect(num(`${G} * (1 - 22 / 100) + ${TAXABLE}`)).toBeLessThan(num(G));
  });
  it('equal rates: a tie with an untaxed side fund, Roth ahead with a taxable one', () => {
    expect(num(`${G} * (1 - 24 / 100) + ${GR}`)).toBeCloseTo(num(G), 6);
    expect(num(`${G} * (1 - 24 / 100) + ${TAXABLE}`)).toBeLessThan(num(G));
  });
});

// lump-sum-vs-dollar-cost-averaging.md, pension-vs-isa-uk.md, index-funds-vs-active-funds.md, lisa-vs-regular-isa.md
describe('other directional claims on fixed inputs', () => {
  it('lump sum beats a 6-month and a 12-month split on the $60,000 example', () => {
    const lump = num('compoundFV(60000, 0, 7, 10)');
    expect(lump).toBeGreaterThan(num('compoundFV(compoundFV(0, 10000, 7, 0.5, timing=beginning), 0, 7, 9.5)'));
    expect(lump).toBeGreaterThan(num('compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9)'));
  });
  it('the 6-month split costs less than the 12-month split', () => {
    expect(num('compoundFV(compoundFV(0, 10000, 7, 0.5, timing=beginning), 0, 7, 9.5)')).toBeGreaterThan(
      num('compoundFV(compoundFV(0, 5000, 7, 1, timing=beginning), 0, 7, 9)')
    );
  });
  it('pension after basic-rate tax beats the ISA on £300 a month', () => {
    expect(num('compoundFV(0, 300 / 0.8 + 150, 7, 25) * (0.25 + 0.75 * 0.8)')).toBeGreaterThan(num('compoundFV(0, 300, 7, 25)'));
  });
  it('the 1.00% fee leaves less than the 0.10% fee', () => {
    expect(num('feeDrag(0, 500, 7, 30, 0.1).balance')).toBeGreaterThan(num('feeDrag(0, 500, 7, 30, 1).balance'));
  });
  it('a LISA with the 25% bonus beats a regular ISA on £4,000 a year', () => {
    expect(num('compoundFV(0, 5000 / 12, 6, 5)')).toBeGreaterThan(num('compoundFV(0, 4000 / 12, 6, 5)'));
  });
});

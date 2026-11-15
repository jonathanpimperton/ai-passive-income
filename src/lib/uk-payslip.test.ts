import { describe, it, expect } from 'vitest';
import {
  calculateUkTakeHome,
  qualifyingEarnings,
  UK_QUALIFYING_EARNINGS_LOWER,
  UK_QUALIFYING_EARNINGS_UPPER,
  type UkTakeHomeInput,
} from './uk-tax-calc';

/**
 * W2-SALARY: payslip basis, "amount taken from your pay" entry and qualifying
 * earnings. Expected values are worked by hand from the 2026/27 GOV.UK rates
 * (https://www.gov.uk/income-tax-rates, https://www.gov.uk/national-insurance-rates-letters,
 * accessed 12-15 Nov 2026) and never come from the engine under test:
 * - rUK income tax: £12,570 allowance, 20% on the first £37,700 of taxable income,
 *   40% to £125,140, 45% above. Allowance lost £1 for every £2 of adjusted net
 *   income over £100,000 (all gone at £125,140).
 * - Employee NI: 8% on £12,570 to £50,270, 2% above.
 * - Relief at source (Finance Act 2004 s192): the provider adds 20%, so a payslip
 *   deduction of £X puts £X / 0.8 into the pension; the basic rate limit and the
 *   higher rate limit then rise by that gross amount. Payroll does not give the
 *   higher-rate relief; it is claimed through Self Assessment.
 * - Qualifying earnings: £6,240 to £50,270 (GOV.UK workplace pensions page).
 */

const BASE: UkTakeHomeInput = {
  salary: 35_000,
  scottish: false,
  taxCode: '',
  studentLoan: 'none',
  pensionMode: 'percent',
  pensionPercent: 0,
  pensionAmount: 0,
  pensionMethod: 'netPay',
};

function run(over: Partial<UkTakeHomeInput>) {
  return calculateUkTakeHome({ ...BASE, ...over });
}

describe('payslip basis (relief at source)', () => {
  it('additional-rate payer: £150,000, £8,000 taken from pay (gross £10,000)', () => {
    // Pension: payslip deduction 8,000 -> gross 8,000 / 0.8 = 10,000 -> provider relief 2,000.
    // Adjusted net income = 150,000 - 10,000 = 140,000 (over 125,140): allowance 0, taxable 150,000.
    //
    // Headline tax (bands extended by 10,000):
    //   basic  0 - 47,700            47,700 x 20% =  9,540
    //   higher 47,700 - 135,140      87,440 x 40% = 34,976
    //   addl.  over 135,140          14,860 x 45% =  6,687      total 51,203
    // Payslip tax (PAYE, no extension):
    //   basic  0 - 37,700            37,700 x 20% =  7,540
    //   higher 37,700 - 125,140      87,440 x 40% = 34,976
    //   addl.  over 125,140          24,860 x 45% = 11,187      total 53,703
    // Extra relief to claim = 53,703 - 51,203 = 2,500 (= 10,000 x (45% - 20%)).
    // NI: 37,700 x 8% = 3,016 + (150,000 - 50,270) x 2% = 1,994.60 = 5,010.60.
    // Headline net  = 150,000 - 51,203 - 5,010.60 - 8,000 = 85,786.40 (7,148.87 a month)
    // Payslip net   = 150,000 - 53,703 - 5,010.60 - 8,000 = 83,286.40 (6,940.53 a month)
    const r = run({
      salary: 150_000,
      pensionMode: 'amount',
      pensionAmount: 8_000,
      pensionAmountBasis: 'fromPay',
      pensionMethod: 'reliefAtSource',
    });
    expect(r.pension.gross).toBeCloseTo(10_000, 6);
    expect(r.pension.fromPay).toBe(8_000);
    expect(r.pension.providerRelief).toBeCloseTo(2_000, 6);
    expect(r.adjustedNetIncome).toBeCloseTo(140_000, 6);
    expect(r.personalAllowance).toBe(0);
    expect(r.ni).toBeCloseTo(5_010.6, 6);

    expect(r.incomeTax).toBeCloseTo(51_203, 6);
    expect(r.netAnnual).toBeCloseTo(85_786.4, 6);
    expect(r.netMonthly).toBeCloseTo(85_786.4 / 12, 8);

    expect(r.payslip.applies).toBe(true);
    expect(r.payslip.incomeTax).toBeCloseTo(53_703, 6);
    expect(r.payslip.extraRelief).toBeCloseTo(2_500, 6);
    expect(r.payslip.netAnnual).toBeCloseTo(83_286.4, 6);
    expect(r.payslip.netMonthly).toBeCloseTo(83_286.4 / 12, 8);
    // The two nets differ by exactly the relief claimed later.
    expect(r.netAnnual - r.payslip.netAnnual).toBeCloseTo(r.payslip.extraRelief, 8);
  });

  it('higher-rate payer: £60,000, £4,000 gross relief at source saves £800 via Self Assessment', () => {
    // Allowance 12,570 (ANI 56,000), taxable 47,430.
    // PAYE: 37,700 x 20% = 7,540 + 9,730 x 40% = 3,892 = 11,432.
    // Extended basic band 41,700: 41,700 x 20% = 8,340 + 5,730 x 40% = 2,292 = 10,632.
    // Extra relief = 11,432 - 10,632 = 800 (= 4,000 x (40% - 20%)).
    const r = run({ salary: 60_000, pensionMode: 'amount', pensionAmount: 4_000, pensionMethod: 'reliefAtSource' });
    expect(r.incomeTax).toBeCloseTo(10_632, 6);
    expect(r.payslip.applies).toBe(true);
    expect(r.payslip.incomeTax).toBeCloseTo(11_432, 6);
    expect(r.payslip.extraRelief).toBeCloseTo(800, 6);
  });

  it('basic-rate payer: relief at source changes no tax, so the payslip equals the headline', () => {
    // £35,000, 5% (gross 1,750): taxable 22,430 stays inside the basic band, extended or not.
    const r = run({ pensionPercent: 5, pensionMethod: 'reliefAtSource' });
    expect(r.payslip.applies).toBe(false);
    expect(r.payslip.extraRelief).toBe(0);
    expect(r.payslip.incomeTax).toBe(r.incomeTax);
    expect(r.payslip.netAnnual).toBe(r.netAnnual);
    expect(r.payslip.netMonthly).toBe(r.netMonthly);
  });

  it('net pay and salary sacrifice never have a payslip gap', () => {
    for (const pensionMethod of ['netPay', 'sacrifice'] as const) {
      const r = run({ salary: 150_000, pensionPercent: 10, pensionMethod });
      expect(r.payslip.applies).toBe(false);
      expect(r.payslip.netAnnual).toBe(r.netAnnual);
    }
  });

  it('invariants over a deterministic sample: payslip net never exceeds the headline', () => {
    let seed = 987;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const codes = ['', '1257L', 'S1257L', 'K475', 'BR', '0T', '1100T'];
    for (let i = 0; i < 1_500; i++) {
      const r = run({
        salary: Math.round(rnd() * 300_000),
        scottish: rnd() < 0.3,
        taxCode: codes[Math.floor(rnd() * codes.length)],
        pensionMode: rnd() < 0.5 ? 'percent' : 'amount',
        pensionPercent: Math.round(rnd() * 25),
        pensionAmount: Math.round(rnd() * 20_000),
        pensionAmountBasis: rnd() < 0.5 ? 'fromPay' : 'gross',
        pensionMethod: (['netPay', 'reliefAtSource', 'sacrifice'] as const)[Math.floor(rnd() * 3)],
      });
      expect(r.payslip.extraRelief).toBeGreaterThanOrEqual(0);
      expect(r.payslip.netAnnual).toBeLessThanOrEqual(r.netAnnual + 1e-9);
      expect(r.netAnnual - r.payslip.netAnnual).toBeCloseTo(r.payslip.extraRelief, 6);
      expect(r.payslip.netMonthly).toBeCloseTo(r.payslip.netAnnual / 12, 9);
      expect(r.netAnnual + r.totalDeductions).toBeCloseTo(r.gross, 6);
    }
  });
});

describe('"amount taken from your pay" (relief at source input trap)', () => {
  it('a payslip pension deduction x 12 reproduces the pension line exactly', () => {
    // Payslip shows £412.50 a month out of pay for the pension: 412.50 x 12 = 4,950 a year.
    // Gross into the pot = 4,950 / 0.8 = 6,187.50; provider relief = 1,237.50.
    const r = run({
      salary: 60_000,
      pensionMode: 'amount',
      pensionAmount: 412.5 * 12,
      pensionAmountBasis: 'fromPay',
      pensionMethod: 'reliefAtSource',
    });
    expect(r.pension.fromPay).toBe(4_950);
    expect(r.pension.gross).toBeCloseTo(6_187.5, 8);
    expect(r.pension.providerRelief).toBeCloseTo(1_237.5, 8);
    // Take-home = salary - tax - NI - what leaves the pay (4,950).
    expect(r.netAnnual).toBeCloseTo(60_000 - r.incomeTax - r.ni - 4_950, 8);
  });

  it('the old entry (gross, no basis) is unchanged, and equals the new entry for the same contribution', () => {
    const legacy = run({ salary: 60_000, pensionMode: 'amount', pensionAmount: 6_187.5, pensionMethod: 'reliefAtSource' });
    const fromPay = run({
      salary: 60_000,
      pensionMode: 'amount',
      pensionAmount: 4_950,
      pensionAmountBasis: 'fromPay',
      pensionMethod: 'reliefAtSource',
    });
    expect(legacy.pension.gross).toBe(6_187.5);
    expect(legacy.pension.fromPay).toBeCloseTo(4_950, 8);
    expect(fromPay.netAnnual).toBeCloseTo(legacy.netAnnual, 6);
    expect(fromPay.incomeTax).toBeCloseTo(legacy.incomeTax, 6);
  });

  it('entering the same figure as gross understates what comes out of pay by 20% (the trap)', () => {
    // Typing the payslip figure (4,950) where the gross was expected pays only 3,960 from pay.
    const wrong = run({ salary: 60_000, pensionMode: 'amount', pensionAmount: 4_950, pensionMethod: 'reliefAtSource' });
    expect(wrong.pension.fromPay).toBeCloseTo(3_960, 8);
  });

  it('for net pay and salary sacrifice "from pay" and "gross" are the same thing', () => {
    for (const pensionMethod of ['netPay', 'sacrifice'] as const) {
      const a = run({ salary: 45_000, pensionMode: 'amount', pensionAmount: 3_000, pensionAmountBasis: 'fromPay', pensionMethod });
      const b = run({ salary: 45_000, pensionMode: 'amount', pensionAmount: 3_000, pensionMethod });
      expect(a.netAnnual).toBe(b.netAnnual);
      expect(a.pension.fromPay).toBe(3_000);
    }
  });

  it('a payslip amount whose gross-up exceeds the salary is limited to the salary', () => {
    // 20,000 / 0.8 = 25,000 > 20,000 salary: capped at the salary, 80% of it leaves pay.
    const r = run({
      salary: 20_000,
      pensionMode: 'amount',
      pensionAmount: 20_000,
      pensionAmountBasis: 'fromPay',
      pensionMethod: 'reliefAtSource',
    });
    expect(r.pension.capped).toBe(true);
    expect(r.pension.gross).toBe(20_000);
    expect(r.pension.fromPay).toBeCloseTo(16_000, 8);
  });
});

describe('pension as a percentage of qualifying earnings', () => {
  it('the band is £6,240 to £50,270', () => {
    expect(UK_QUALIFYING_EARNINGS_LOWER).toBe(6_240);
    expect(UK_QUALIFYING_EARNINGS_UPPER).toBe(50_270);
    expect(qualifyingEarnings(5_000)).toBe(0);
    expect(qualifyingEarnings(6_240)).toBe(0);
    expect(qualifyingEarnings(30_000)).toBe(23_760);
    expect(qualifyingEarnings(50_270)).toBe(44_030);
    expect(qualifyingEarnings(120_000)).toBe(44_030);
    expect(qualifyingEarnings(Number.NaN)).toBe(0);
  });

  it('£30,000 at 5% of qualifying earnings is £1,188, not 5% of the full salary (£1,500)', () => {
    // Qualifying earnings 30,000 - 6,240 = 23,760; 5% = 1,188.
    const q = run({ salary: 30_000, pensionPercent: 5, pensionPercentOf: 'qualifying' });
    const full = run({ salary: 30_000, pensionPercent: 5 });
    expect(q.qualifyingEarnings).toBe(23_760);
    expect(q.pension.gross).toBeCloseTo(1_188, 8);
    expect(full.pension.gross).toBeCloseTo(1_500, 8);
    expect(q.netAnnual).toBeGreaterThan(full.netAnnual);
  });

  it('£80,000 at 8% of qualifying earnings is capped at the band: 44,030 x 8% = £3,522.40', () => {
    const r = run({ salary: 80_000, pensionPercent: 8, pensionPercentOf: 'qualifying' });
    expect(r.pension.gross).toBeCloseTo(3_522.4, 8);
  });

  it('pay at or below £6,240 has no qualifying earnings and no contribution', () => {
    const r = run({ salary: 6_000, pensionPercent: 5, pensionPercentOf: 'qualifying' });
    expect(r.qualifyingEarnings).toBe(0);
    expect(r.pension.gross).toBe(0);
  });

  it('omitting pensionPercentOf is the old behaviour (percent of full salary)', () => {
    const a = run({ salary: 40_000, pensionPercent: 6 });
    const b = run({ salary: 40_000, pensionPercent: 6, pensionPercentOf: 'salary' });
    expect(a.pension.gross).toBe(2_400);
    expect(b.netAnnual).toBe(a.netAnnual);
  });
});

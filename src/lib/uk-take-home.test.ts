import { describe, it, expect } from 'vitest';
import {
  calculateUkTakeHome,
  calcUkIncomeTax,
  calcSimpleIncomeTax,
  calcNI,
  calcStudentLoan,
  extendBands,
  type UkTakeHomeInput,
} from './uk-tax-calc';
import { parseUkTaxCode } from './uk-tax-codes';

/**
 * UK Salary engine (2026/27). Independent figures are worked by hand in the
 * comments from GOV.UK rates (accessed 12 Nov 2026):
 * - rUK: £12,570 allowance, 20% to £37,700 taxable, 40% to £125,140, 45% above.
 * - Scotland (https://www.gov.uk/scottish-income-tax): taxable bands 19% to
 *   £3,967, 20% to £16,956, 21% to £31,092, 42% to £62,430, 45% to £125,140,
 *   48% above.
 * - NI: 8% £12,570-£50,270, 2% above. Student loans 9% (postgraduate 6%)
 *   over Plan 1 £26,900 / Plan 2 £29,385 / Plan 4 £33,795 / Plan 5 £25,000 /
 *   PGL £21,000, on pay after salary sacrifice (HMRC CSLM17055 "golden rule";
 *   https://www.gov.uk/guidance/special-rules-for-student-loans).
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

describe('calculateUkTakeHome: defaults and hub agreement', () => {
  it('calculator default (£35k, 5% net pay) = £27,319.60, as shown since July', () => {
    // Pension 1,750; tax on 33,250 = 20,680 x 20% = 4,136; NI on 35,000 = 22,430 x 8% = 1,794.40
    const r = run({ pensionPercent: 5 });
    expect(r.incomeTax).toBeCloseTo(4_136, 2);
    expect(r.ni).toBeCloseTo(1_794.4, 2);
    expect(r.netAnnual).toBeCloseTo(27_319.6, 2);
  });

  it('with no pension and no code it matches the hub table functions at every hub salary', () => {
    for (const salary of [20_000, 35_000, 50_000, 100_000, 110_000, 130_000, 150_000]) {
      const r = run({ salary });
      expect(r.netAnnual).toBeCloseTo(salary - calcSimpleIncomeTax(salary) - calcNI(salary), 6);
    }
  });

  it('netAnnual + totalDeductions = gross; periods divide the annual figure', () => {
    const r = run({ salary: 52_000, studentLoan: 'plan2', pensionPercent: 6, pensionMethod: 'sacrifice' });
    expect(r.netAnnual + r.totalDeductions).toBeCloseTo(52_000, 6);
    expect(r.netMonthly).toBeCloseTo(r.netAnnual / 12, 6);
    expect(r.netWeekly).toBeCloseTo(r.netAnnual / 52, 6);
  });
});

describe('UK-1 student loan on pay after salary sacrifice (S1-4, MATH-UK-01, CALC-UX-A-03)', () => {
  it('£35k / 5% sacrifice / Plan 2: loan £347.85, take-home £27,111.75', () => {
    // NIC pay 33,250: loan (33,250 - 29,385) x 9% = 347.85 (site showed 505.35)
    // tax 4,136; NI (33,250 - 12,570) x 8% = 1,654.40
    const r = run({ pensionPercent: 5, pensionMethod: 'sacrifice', studentLoan: 'plan2' });
    expect(r.payForNI).toBe(33_250);
    expect(r.studentLoan).toBeCloseTo(347.85, 2);
    expect(r.ni).toBeCloseTo(1_654.4, 2);
    expect(r.netAnnual).toBeCloseTo(27_111.75, 2);
  });

  it('the sacrifice note includes the loan saving (£140 NI + £157.50 loan)', () => {
    const r = run({ pensionPercent: 5, pensionMethod: 'sacrifice', studentLoan: 'plan2' });
    expect(r.sacrificeSaving?.ni).toBeCloseTo(140, 2);
    expect(r.sacrificeSaving?.studentLoan).toBeCloseTo(157.5, 2);
  });

  it('£60k / 10% sacrifice / Plan 2: loan £2,215.35 (was £2,755.35), take-home £39,662.05', () => {
    // NIC pay 54,000: (54,000 - 29,385) x 9% = 2,215.35
    // tax: taxable 41,430 = 37,700 x 20% + 3,730 x 40% = 9,032
    // NI: 37,700 x 8% + 3,730 x 2% = 3,090.60
    const r = run({ salary: 60_000, pensionPercent: 10, pensionMethod: 'sacrifice', studentLoan: 'plan2' });
    expect(r.studentLoan).toBeCloseTo(2_215.35, 2);
    expect(r.incomeTax).toBeCloseTo(9_032, 2);
    expect(r.ni).toBeCloseTo(3_090.6, 2);
    expect(r.netAnnual).toBeCloseTo(39_662.05, 2);
  });

  it('reproduces every MATH-UK-01 delta (loan saving = sacrifice x plan rate above the threshold)', () => {
    const rows: [number, number, UkTakeHomeInput['studentLoan'], number][] = [
      [35_000, 5, 'plan2', 157.5],
      [45_000, 8, 'plan2', 324],
      [60_000, 10, 'plan2', 540],
      [60_000, 10, 'postgrad', 360],
      [105_000, 5, 'plan2', 472.5],
      [40_000, 5, 'plan5', 180],
    ];
    for (const [salary, pct, plan, delta] of rows) {
      const r = run({ salary, pensionPercent: pct, pensionMethod: 'sacrifice', studentLoan: plan });
      expect(calcStudentLoan(salary, plan) - r.studentLoan).toBeCloseTo(delta, 2);
    }
  });

  it('net pay pension does not reduce the loan (NIC pay is the full salary)', () => {
    const r = run({ salary: 52_000, pensionPercent: 5, pensionMethod: 'netPay', studentLoan: 'plan2' });
    expect(r.studentLoan).toBeCloseTo((52_000 - 29_385) * 0.09, 2);
  });

  it('GOV.UK worked examples: Plan 1 at £33,000 repays £45 a month; Plan 4 at £36,000 repays £16', () => {
    // https://www.gov.uk/repaying-your-student-loan/what-you-pay (payroll rounds down)
    expect(Math.floor(run({ salary: 33_000, studentLoan: 'plan1' }).studentLoan / 12)).toBe(45);
    expect(Math.floor(run({ salary: 36_000, studentLoan: 'plan4' }).studentLoan / 12)).toBe(16);
  });
});

describe('UK-2 Scottish codes (S1-5, MATH-UK-02/03, CALC-UX-A-04)', () => {
  it('S1257L at £50k with the toggle off uses Scottish bands: tax £8,982.05 (rUK would be £7,486)', () => {
    // taxable 37,430: 3,967 x 19% (753.73) + 12,989 x 20% (2,597.80)
    //   + 14,136 x 21% (2,968.56) + 6,338 x 42% (2,661.96) = 8,982.05
    const r = run({ salary: 50_000, taxCode: 'S1257L' });
    expect(r.region).toBe('scotland');
    expect(r.regionSource).toBe('code');
    expect(r.incomeTax).toBeCloseTo(8_982.05, 2);
    expect(run({ salary: 50_000 }).incomeTax).toBeCloseTo(7_486, 2);
  });

  it('S1257L at £100k: Scottish tax £30,732.05 vs rUK £27,432 (MATH-UK-02 delta £3,300)', () => {
    const scot = run({ salary: 100_000, taxCode: 'S1257L' }).incomeTax;
    const ruk = run({ salary: 100_000 }).incomeTax;
    expect(scot).toBeCloseTo(30_732.05, 2);
    expect(ruk).toBeCloseTo(27_432, 2);
    expect(scot - ruk).toBeCloseTo(3_300.05, 2);
  });

  it('the S code agrees with the Scottish toggle', () => {
    for (const salary of [20_000, 35_000, 60_000, 110_000, 200_000]) {
      expect(run({ salary, taxCode: 'S1257L' }).netAnnual).toBeCloseTo(run({ salary, scottish: true }).netAnnual, 6);
    }
  });

  it('C1257L uses rest-of-UK bands even with the Scottish toggle on', () => {
    const r = run({ salary: 50_000, taxCode: 'C1257L', scottish: true });
    expect(r.region).toBe('rUK');
    expect(r.incomeTax).toBeCloseTo(7_486, 2);
  });

  it('SD0 = 21%, SD1 = 42%, SD2 = 45%, SD3 = 48% of all pay (£35k: £7,350 / £14,700 / £15,750 / £16,800)', () => {
    expect(run({ taxCode: 'SD0' }).incomeTax).toBeCloseTo(7_350, 2);
    expect(run({ taxCode: 'SD1' }).incomeTax).toBeCloseTo(14_700, 2);
    expect(run({ taxCode: 'SD2' }).incomeTax).toBeCloseTo(15_750, 2);
    expect(run({ taxCode: 'SD3' }).incomeTax).toBeCloseTo(16_800, 2);
    expect(run({ taxCode: 'SBR' }).incomeTax).toBeCloseTo(7_000, 2);
  });

  it('rUK flat codes: BR 20%, D0 40%, D1 45%, NT nil', () => {
    expect(run({ taxCode: 'BR' }).incomeTax).toBeCloseTo(7_000, 2);
    expect(run({ taxCode: 'D0' }).incomeTax).toBeCloseTo(14_000, 2);
    expect(run({ taxCode: 'D1' }).incomeTax).toBeCloseTo(15_750, 2);
    expect(run({ taxCode: 'NT' }).incomeTax).toBe(0);
  });

  it('unrecognised codes fall back to the standard calculation and are reported', () => {
    for (const code of ['abc', 'L1257', '-1257L', '12', '12570', '9999999999']) {
      const r = run({ salary: 60_000, taxCode: code });
      expect(r.code.kind).toBe('invalid');
      expect(r.netAnnual).toBeCloseTo(run({ salary: 60_000 }).netAnnual, 6);
    }
  });

  it('K codes: K475 adds £4,750; tax is capped at half of pay (MATH-UK-05: K9999 at £20k)', () => {
    // K475 at £35k: taxable 39,750 = 37,700 x 20% + 2,050 x 40% = 8,360
    expect(run({ taxCode: 'K475' }).incomeTax).toBeCloseTo(8_360, 2);
    const k = run({ salary: 20_000, taxCode: 'K9999' });
    expect(k.kCapApplied).toBe(true);
    expect(k.incomeTax).toBeCloseTo(10_000, 2);
    expect(k.netAnnual).toBeGreaterThan(0);
  });
});

describe('UK-3 taper for every L-type code (MATH-UK-04)', () => {
  it('at £110k, 1257L / C1257L / W1 / M1 / X / NONCUM all give tax £33,432', () => {
    // ANI 110,000: allowance 12,570 - 5,000 = 7,570; taxable 102,430 = 7,540 + 64,730 x 40%
    for (const code of ['', '1257L', 'C1257L', '1257L W1', '1257L M1', '1257LX', '1257L NONCUM', 'C1257L X']) {
      const r = run({ salary: 110_000, taxCode: code });
      expect(r.personalAllowance).toBe(7_570);
      expect(r.incomeTax).toBeCloseTo(33_432, 2);
    }
  });

  it('S1257L at £110k is tapered too (Scottish tax £37,482.05)', () => {
    const r = run({ salary: 110_000, taxCode: 'S1257L' });
    expect(r.personalAllowance).toBe(7_570);
    expect(r.incomeTax).toBeCloseTo(37_482.05, 2);
  });

  it('at £125,140 and above the allowance is nil for L codes (the old gap was £5,028)', () => {
    expect(run({ salary: 130_000, taxCode: 'C1257L' }).personalAllowance).toBe(0);
    expect(run({ salary: 130_000, taxCode: 'C1257L' }).incomeTax).toBeCloseTo(run({ salary: 130_000 }).incomeTax, 6);
  });

  it('a code already reduced by HMRC (757L at £110k) is not tapered twice', () => {
    expect(run({ salary: 110_000, taxCode: '757L' }).personalAllowance).toBe(7_570);
  });

  it('extra allowances above 1257L survive the taper (1500L: £15,000 at £30k, £10,000 at £110k)', () => {
    expect(run({ salary: 30_000, taxCode: '1500L' }).personalAllowance).toBe(15_000);
    expect(run({ salary: 110_000, taxCode: '1500L' }).personalAllowance).toBe(10_000);
  });

  it('T and M codes are used as issued', () => {
    expect(run({ salary: 110_000, taxCode: '1100T' }).personalAllowance).toBe(11_000);
    expect(run({ salary: 30_000, taxCode: '1383M' }).personalAllowance).toBe(13_830);
  });
});

describe('UK-4 the £100k job: adjusted net income (CALC-UX-A-05, MATH-UK-06/07, CONTENT-20)', () => {
  it('£105k with a 10% net-pay pension: ANI £94,500, full allowance, no trap (MATH-UK-06)', () => {
    const r = run({ salary: 105_000, pensionPercent: 10 });
    expect(r.adjustedNetIncome).toBe(94_500);
    expect(r.personalAllowance).toBe(12_570);
    expect(r.inTaperZone).toBe(false);
    expect(r.overChildcareLimit).toBe(false);
  });

  it('£110k, no pension: in the taper zone, 60% marginal income tax (62% with NI), £10,000 to reach £100k', () => {
    const r = run({ salary: 110_000 });
    expect(r.inTaperZone).toBe(true);
    expect(r.marginal.incomeTax).toBeCloseTo(0.6, 6);
    expect(r.marginal.withNiAndLoan).toBeCloseTo(0.62, 6);
    expect(r.overChildcareLimit).toBe(true);
    expect(r.pensionToReach100k).toBe(10_000);
  });

  it('Scottish £110k: 67.5% marginal income tax', () => {
    expect(run({ salary: 110_000, scottish: true }).marginal.incomeTax).toBeCloseTo(0.675, 6);
  });

  it('sacrificing £9,999 on £110k leaves ANI £100,001: over the childcare limit by £1', () => {
    const r = run({ salary: 110_000, pensionMode: 'amount', pensionAmount: 9_999, pensionMethod: 'sacrifice' });
    expect(r.adjustedNetIncome).toBe(100_001);
    expect(r.overChildcareLimit).toBe(true);
    expect(r.pensionToReach100k).toBe(1);
  });

  it('sacrificing £10,000 on £110k brings ANI to £100,000: trap and childcare flags clear', () => {
    const r = run({ salary: 110_000, pensionMode: 'amount', pensionAmount: 10_000, pensionMethod: 'sacrifice' });
    expect(r.adjustedNetIncome).toBe(100_000);
    expect(r.inTaperZone).toBe(false);
    expect(r.overChildcareLimit).toBe(false);
    expect(r.personalAllowance).toBe(12_570);
  });

  it('a percentage pension holds the marginal rate at the true 60% (pension held fixed for the next £100)', () => {
    const r = run({ salary: 115_000, pensionPercent: 5, pensionMethod: 'netPay' });
    expect(r.adjustedNetIncome).toBe(109_250);
    expect(r.marginal.incomeTax).toBeCloseTo(0.6, 6);
  });

  it('pension can be entered as a £ amount', () => {
    const pct = run({ salary: 40_000, pensionPercent: 5 });
    const amt = run({ salary: 40_000, pensionMode: 'amount', pensionAmount: 2_000 });
    expect(amt.netAnnual).toBeCloseTo(pct.netAnnual, 6);
  });

  it('a pension amount above the salary is limited to the salary and flagged', () => {
    const r = run({ salary: 40_000, pensionMode: 'amount', pensionAmount: 50_000, pensionMethod: 'sacrifice' });
    expect(r.pension.capped).toBe(true);
    expect(r.pension.gross).toBe(40_000);
    expect(r.incomeTax).toBe(0);
  });

  it('flags contributions above the £60,000 annual allowance', () => {
    expect(run({ salary: 200_000, pensionMode: 'amount', pensionAmount: 70_000 }).overAnnualAllowance).toBe(true);
    expect(run({ salary: 200_000, pensionMode: 'amount', pensionAmount: 60_000 }).overAnnualAllowance).toBe(false);
  });
});

describe('UK-4 relief at source (MATH-UK-07b, MTH-06; FA 2004 s192, HMRC PTM044220)', () => {
  it('PTM044220 example: a higher-rate taxpayer puts £100 in, pays £80, gets £20 more back', () => {
    const none = run({ salary: 60_000 });
    const ras = run({ salary: 60_000, pensionMode: 'amount', pensionAmount: 100, pensionMethod: 'reliefAtSource' });
    expect(ras.pension.fromPay).toBeCloseTo(80, 6);
    expect(ras.pension.providerRelief).toBeCloseTo(20, 6);
    expect(none.incomeTax - ras.incomeTax).toBeCloseTo(20, 6);
    expect(none.netAnnual - ras.netAnnual).toBeCloseTo(60, 6);
  });

  it('£60k, 5%: relief at source costs the same as net pay for a higher-rate taxpayer (£43,557.40)', () => {
    // RAS: basic band 37,700 + 3,000 = 40,700: tax 8,140 + 6,730 x 40% = 10,832; pays 2,400
    const ras = run({ salary: 60_000, pensionPercent: 5, pensionMethod: 'reliefAtSource' });
    const netPay = run({ salary: 60_000, pensionPercent: 5, pensionMethod: 'netPay' });
    expect(ras.incomeTax).toBeCloseTo(10_832, 2);
    expect(ras.pension.fromPay).toBeCloseTo(2_400, 2);
    expect(ras.pension.gross).toBeCloseTo(3_000, 2);
    expect(ras.netAnnual).toBeCloseTo(43_557.4, 2);
    expect(netPay.netAnnual).toBeCloseTo(43_557.4, 2);
  });

  it('below the Personal Allowance relief at source still gives 20%; net pay gives none', () => {
    const ras = run({ salary: 12_000, pensionPercent: 5, pensionMethod: 'reliefAtSource' });
    const netPay = run({ salary: 12_000, pensionPercent: 5, pensionMethod: 'netPay' });
    expect(netPay.netAnnual).toBeCloseTo(11_400, 6);
    expect(ras.netAnnual).toBeCloseTo(11_520, 6);
  });

  it('relief at source reduces adjusted net income by the gross contribution', () => {
    const r = run({ salary: 110_000, pensionMode: 'amount', pensionAmount: 10_000, pensionMethod: 'reliefAtSource' });
    expect(r.adjustedNetIncome).toBe(100_000);
    expect(r.personalAllowance).toBe(12_570);
    expect(r.inTaperZone).toBe(false);
  });

  it('Scottish starter rate: relief at source keeps the 1% difference HMRC does not recover', () => {
    const ras = run({ salary: 15_000, scottish: true, pensionMode: 'amount', pensionAmount: 1_000, pensionMethod: 'reliefAtSource' });
    const netPay = run({ salary: 15_000, scottish: true, pensionMode: 'amount', pensionAmount: 1_000, pensionMethod: 'netPay' });
    expect(ras.netAnnual - netPay.netAnnual).toBeCloseTo(10, 6);
  });

  it('Scottish higher rate: £1,000 gross costs £580 (42% relief)', () => {
    const none = run({ salary: 60_000, scottish: true });
    const ras = run({ salary: 60_000, scottish: true, pensionMode: 'amount', pensionAmount: 1_000, pensionMethod: 'reliefAtSource' });
    expect(none.netAnnual - ras.netAnnual).toBeCloseTo(580, 6);
  });

  it('extendBands moves the basic rate limit and every limit above it', () => {
    expect(extendBands('rUK', 1_000)).toEqual([[0, 0.2], [38_700, 0.4], [126_140, 0.45]]);
    const scot = extendBands('scotland', 1_000);
    expect(scot[0][0]).toBe(0);
    expect(scot[1][0]).toBe(3_967); // starter band unchanged
    expect(scot[2][0]).toBe(17_956); // Scottish basic rate limit +1,000
    expect(scot[5][0]).toBe(126_140);
  });
});

describe('UK-7 input range and robustness', () => {
  it('£0 salary gives zeros, never NaN', () => {
    const r = run({ salary: 0, pensionPercent: 5, studentLoan: 'plan2' });
    expect(r.netAnnual).toBe(0);
    expect(r.effectiveDeductionRate).toBe(0);
    for (const v of [r.incomeTax, r.ni, r.studentLoan, r.marginal.incomeTax]) expect(Number.isFinite(v)).toBe(true);
  });

  it('£10M salary computes (no clamp to £1M)', () => {
    const r = run({ salary: 10_000_000 });
    expect(r.gross).toBe(10_000_000);
    expect(r.netAnnual).toBeGreaterThan(5_000_000);
  });

  it('invariants over a deterministic random sample', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const methods = ['netPay', 'reliefAtSource', 'sacrifice'] as const;
    const plans = ['none', 'plan1', 'plan2', 'plan4', 'plan5', 'postgrad'] as const;
    const codes = ['', '1257L', 'S1257L', 'C1257L', 'K475', 'BR', 'SD1', '0T', '1100T', 'nonsense'];
    for (let i = 0; i < 2_000; i++) {
      const input: Partial<UkTakeHomeInput> = {
        salary: Math.round(rnd() * 300_000),
        scottish: rnd() < 0.3,
        taxCode: codes[Math.floor(rnd() * codes.length)],
        studentLoan: plans[Math.floor(rnd() * plans.length)],
        pensionPercent: Math.round(rnd() * 20),
        pensionMethod: methods[Math.floor(rnd() * methods.length)],
      };
      const r = run(input);
      expect(Number.isFinite(r.netAnnual)).toBe(true);
      expect(r.netAnnual + r.totalDeductions).toBeCloseTo(r.gross, 6);
      expect(r.incomeTax).toBeGreaterThanOrEqual(0);
      expect(r.studentLoan).toBeCloseTo(calcStudentLoan(r.payForNI, input.studentLoan!), 6);
      // More salary never means less take-home (same settings).
      const more = run({ ...input, salary: input.salary! + 1_000 });
      expect(more.netAnnual).toBeGreaterThanOrEqual(r.netAnnual - 1e-6);
    }
  });
});

describe('calcUkIncomeTax direct', () => {
  it('a flat-rate code ignores the allowance', () => {
    const r = calcUkIncomeTax({ pay: 10_000, adjustedNetIncome: 10_000, region: 'rUK', code: parseUkTaxCode('BR') });
    expect(r.tax).toBeCloseTo(2_000, 6);
    expect(r.personalAllowance).toBe(0);
  });
});

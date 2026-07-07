import { describe, it, expect } from 'vitest';
import { UK_TAX_YEAR, UK_INCOME_TAX, UK_NI, UK_EMPLOYER_NI, UK_STUDENT_LOANS, UK_STATE_PENSION, UK_PENSION_AGES, UK_SCOTTISH_TAX } from './uk-rates';
import { US_TAX_YEAR, US_BRACKETS, US_STANDARD_DEDUCTION, US_SOCIAL_SECURITY, US_MEDICARE, US_401K } from './us-rates';

describe('UK tax rates (2026/27)', () => {
  it('has correct tax year', () => {
    expect(UK_TAX_YEAR).toBe('2026/27');
  });

  it('has correct Personal Allowance (frozen until April 2031)', () => {
    expect(UK_INCOME_TAX.personalAllowance).toBe(12_570);
  });

  it('has correct employee NI rates', () => {
    expect(UK_NI.mainRate).toBe(0.08);
    expect(UK_NI.upperRate).toBe(0.02);
    expect(UK_NI.primaryThreshold).toBe(12_570);
    expect(UK_NI.upperEarningsLimit).toBe(50_270);
  });

  it('has correct employer NI rates', () => {
    expect(UK_EMPLOYER_NI.rate).toBe(0.15);
    expect(UK_EMPLOYER_NI.secondaryThreshold).toBe(5_000);
  });

  it('has correct student loan thresholds (from 6 April 2026)', () => {
    expect(UK_STUDENT_LOANS.plan1.threshold).toBe(26_900);
    expect(UK_STUDENT_LOANS.plan2.threshold).toBe(29_385);
    expect(UK_STUDENT_LOANS.plan4.threshold).toBe(33_795);
    expect(UK_STUDENT_LOANS.plan5.threshold).toBe(25_000);
    expect(UK_STUDENT_LOANS.postgrad.threshold).toBe(21_000);
  });

  it('has correct State Pension weekly rate (April 2026 uprating)', () => {
    expect(UK_STATE_PENSION.weeklyRate).toBe(241.30);
  });

  it('has correct legislated pension ages', () => {
    expect(UK_PENSION_AGES.normalMinimumPensionAge).toBe(55);
    expect(UK_PENSION_AGES.normalMinimumPensionAgeFrom2028).toBe(57);
    expect(UK_PENSION_AGES.statePensionAge).toBe(66);
    expect(UK_PENSION_AGES.statePensionAgeFrom2028).toBe(67);
  });

  it('has correct Scottish bands (2026/27 — Starter/Basic widened 7.4%)', () => {
    const byName = Object.fromEntries(UK_SCOTTISH_TAX.bands.map((b) => [b.name, b]));
    // Taxable-income thresholds; gross equivalents (standard PA): Starter to
    // £16,537, Basic to £29,526 per gov.scot 2026/27 tables.
    expect(byName.Starter.from).toBe(0);
    expect(byName.Basic.from).toBe(3_967);
    expect(byName.Intermediate.from).toBe(16_956);
    expect(byName.Higher.from).toBe(31_092);
    expect(byName.Advanced.from).toBe(62_430);
    expect(byName.Top.from).toBe(125_140);
    expect(byName.Top.rate).toBe(0.48);
  });
});

describe('US tax rates (2026)', () => {
  it('has correct tax year', () => {
    expect(US_TAX_YEAR).toBe('2026');
  });

  it('has correct single filer brackets (Rev. Proc. 2025-32)', () => {
    const single = US_BRACKETS.single;
    expect(single[0]).toEqual([0, 0.10]);
    expect(single[1][0]).toBe(12_400);  // 12% starts at $12,400
    expect(single[2][0]).toBe(50_400);  // 22% starts at $50,400
    expect(single[3][0]).toBe(105_700); // 24% starts at $105,700
    expect(single[6][0]).toBe(640_600); // 37% starts at $640,600
  });

  it('has correct head-of-household brackets', () => {
    const head = US_BRACKETS.head;
    expect(head[1][0]).toBe(17_700);
    expect(head[2][0]).toBe(67_450);
  });

  it('has correct standard deductions (post-OBBBA 2026)', () => {
    expect(US_STANDARD_DEDUCTION.single).toBe(16_100);
    expect(US_STANDARD_DEDUCTION.married).toBe(32_200);
    expect(US_STANDARD_DEDUCTION.head).toBe(24_150);
  });

  it('has correct Social Security wage cap', () => {
    expect(US_SOCIAL_SECURITY.wageCap).toBe(184_500);
    expect(US_SOCIAL_SECURITY.rate).toBe(0.062);
  });

  it('has correct Medicare rates', () => {
    expect(US_MEDICARE.rate).toBe(0.0145);
    expect(US_MEDICARE.additionalRate).toBe(0.009);
    expect(US_MEDICARE.additionalThreshold.single).toBe(200_000);
  });

  it('has correct 401(k) limit (IRS Notice 2025-67)', () => {
    expect(US_401K.limit).toBe(24_500);
    expect(US_401K.catchUp).toBe(8_000);
  });

  it('calculates correct federal tax for $75K single filer', () => {
    // Verify end-to-end: $75,000 gross, single, standard deduction
    const gross = 75_000;
    const taxable = gross - US_STANDARD_DEDUCTION.single; // $58,900
    expect(taxable).toBe(58_900);

    const brackets = US_BRACKETS.single;
    let tax = 0;
    for (let i = 0; i < brackets.length; i++) {
      const [threshold, rate] = brackets[i];
      const next = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
      if (taxable <= threshold) break;
      tax += (Math.min(taxable, next) - threshold) * rate;
    }

    // 10% on $12,400  = $1,240.00
    // 12% on $38,000  = $4,560.00
    // 22% on $8,500   = $1,870.00
    // Total           = $7,670.00
    expect(Math.round(tax)).toBe(7_670);
  });
});

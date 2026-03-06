import { describe, it, expect } from 'vitest';
import { UK_TAX_YEAR, UK_INCOME_TAX, UK_NI, UK_EMPLOYER_NI, UK_STUDENT_LOANS, UK_STATE_PENSION } from './uk-rates';
import { US_TAX_YEAR, US_BRACKETS, US_STANDARD_DEDUCTION, US_SOCIAL_SECURITY, US_MEDICARE, US_401K } from './us-rates';

describe('UK tax rates (2025/26)', () => {
  it('has correct tax year', () => {
    expect(UK_TAX_YEAR).toBe('2025/26');
  });

  it('has correct Personal Allowance', () => {
    expect(UK_INCOME_TAX.personalAllowance).toBe(12_570);
  });

  it('has correct employee NI rates', () => {
    expect(UK_NI.mainRate).toBe(0.08);
    expect(UK_NI.upperRate).toBe(0.02);
    expect(UK_NI.primaryThreshold).toBe(12_570);
    expect(UK_NI.upperEarningsLimit).toBe(50_270);
  });

  it('has correct employer NI rates (April 2025)', () => {
    expect(UK_EMPLOYER_NI.rate).toBe(0.15);
    expect(UK_EMPLOYER_NI.secondaryThreshold).toBe(5_000);
  });

  it('has correct student loan thresholds', () => {
    expect(UK_STUDENT_LOANS.plan1.threshold).toBe(26_065);
    expect(UK_STUDENT_LOANS.plan2.threshold).toBe(28_470);
    expect(UK_STUDENT_LOANS.plan4.threshold).toBe(32_745);
  });

  it('has correct State Pension weekly rate', () => {
    expect(UK_STATE_PENSION.weeklyRate).toBe(230.25);
  });
});

describe('US tax rates (2025)', () => {
  it('has correct tax year', () => {
    expect(US_TAX_YEAR).toBe('2025');
  });

  it('has correct single filer brackets', () => {
    const single = US_BRACKETS.single;
    expect(single[0]).toEqual([0, 0.10]);
    expect(single[1][0]).toBe(11_925);  // 12% starts at $11,925
    expect(single[2][0]).toBe(48_475);  // 22% starts at $48,475
    expect(single[3][0]).toBe(103_350); // 24% starts at $103,350
  });

  it('has correct standard deductions', () => {
    expect(US_STANDARD_DEDUCTION.single).toBe(15_000);
    expect(US_STANDARD_DEDUCTION.married).toBe(30_000);
    expect(US_STANDARD_DEDUCTION.head).toBe(22_500);
  });

  it('has correct Social Security wage cap', () => {
    expect(US_SOCIAL_SECURITY.wageCap).toBe(176_100);
    expect(US_SOCIAL_SECURITY.rate).toBe(0.062);
  });

  it('has correct Medicare rates', () => {
    expect(US_MEDICARE.rate).toBe(0.0145);
    expect(US_MEDICARE.additionalRate).toBe(0.009);
    expect(US_MEDICARE.additionalThreshold.single).toBe(200_000);
  });

  it('has correct 401(k) limit', () => {
    expect(US_401K.limit).toBe(23_500);
  });

  it('calculates correct federal tax for $75K single filer', () => {
    // Verify end-to-end: $75,000 gross, single, standard deduction
    const gross = 75_000;
    const taxable = gross - US_STANDARD_DEDUCTION.single; // $60,000
    expect(taxable).toBe(60_000);

    const brackets = US_BRACKETS.single;
    let tax = 0;
    let prev = 0;
    for (let i = 0; i < brackets.length; i++) {
      const [threshold, rate] = brackets[i];
      const next = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
      if (taxable <= threshold) break;
      tax += (Math.min(taxable, next) - threshold) * rate;
      prev = next;
    }

    // 10% on $11,925 = $1,192.50
    // 12% on $36,550 = $4,386.00
    // 22% on $11,525 = $2,535.50
    // Total = $8,114.00
    expect(Math.round(tax)).toBe(8_114);
  });
});

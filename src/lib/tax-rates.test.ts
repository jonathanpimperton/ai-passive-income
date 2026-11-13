/**
 * Rate values pinned to their primary sources, per tax year. Years are named
 * explicitly (getUsRates(2027), getUkRates('2026/27')) so these tests do not
 * change meaning when the default year switches on 1 January / 6 April.
 */
import { describe, it, expect } from 'vitest';
import {
  getUkRates,
  UK_TAX_YEAR,
  UK_DEFAULT_TAX_YEAR,
  UK_INCOME_TAX,
  UK_NI,
  UK_EMPLOYER_NI,
  UK_STUDENT_LOANS,
  UK_STATE_PENSION,
  UK_PENSION_AGES,
  UK_SCOTTISH_TAX,
  UK_CGT,
  UK_RATES_LAST_CHECKED,
  UK_PENSION_ANNUAL_ALLOWANCE,
  UK_CHILDCARE_ANI_LIMIT,
  UK_SDLT,
  SDLT_NON_RESIDENT_SURCHARGE,
  SDLT_NON_RESIDENT_MIN_PRICE,
} from './uk-rates';
import {
  getUsRates,
  US_TAX_YEAR,
  US_DEFAULT_TAX_YEAR,
  US_BRACKETS,
  US_STANDARD_DEDUCTION,
  US_SOCIAL_SECURITY,
  US_MEDICARE,
  US_401K,
  US_CAPITAL_GAINS,
  US_RATES_LAST_CHECKED,
  type FilingStatus,
  type UsTaxYear,
} from './us-rates';
import { taxOnTaxableIncome } from './us-tax-calc';

describe('UK tax rates 2026/27', () => {
  const uk = getUkRates('2026/27');

  it('has correct Personal Allowance (frozen until April 2031)', () => {
    expect(uk.incomeTax.personalAllowance).toBe(12_570);
    expect(uk.incomeTax.paTaperThreshold).toBe(100_000);
    expect(uk.incomeTax.paTaperLimit).toBe(125_140);
  });

  it('has correct employee NI rates', () => {
    expect(uk.ni.mainRate).toBe(0.08);
    expect(uk.ni.upperRate).toBe(0.02);
    expect(uk.ni.primaryThreshold).toBe(12_570);
    expect(uk.ni.upperEarningsLimit).toBe(50_270);
  });

  it('has correct employer NI rates', () => {
    expect(uk.employerNi.rate).toBe(0.15);
    expect(uk.employerNi.secondaryThreshold).toBe(5_000);
  });

  it('has correct student loan thresholds (from 6 April 2026)', () => {
    expect(uk.studentLoans.plan1.threshold).toBe(26_900);
    expect(uk.studentLoans.plan2.threshold).toBe(29_385);
    expect(uk.studentLoans.plan4.threshold).toBe(33_795);
    expect(uk.studentLoans.plan5.threshold).toBe(25_000);
    expect(uk.studentLoans.postgrad.threshold).toBe(21_000);
  });

  it('has correct State Pension weekly rate (April 2026 uprating)', () => {
    expect(uk.statePension.weeklyRate).toBe(241.30);
  });

  it('has correct Scottish bands (2026/27 -- Starter/Basic widened 7.4%)', () => {
    const byName = Object.fromEntries(uk.scottishTax.bands.map((b) => [b.name, b]));
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

  it('has the pension annual allowance and the £100,000 childcare limit', () => {
    expect(uk.pensionAnnualAllowance).toBe(60_000);
    expect(uk.childcareAniLimit).toBe(100_000);
  });

  it('has the SDLT non-resident surcharge and its £40,000 floor (not year-keyed)', () => {
    expect(SDLT_NON_RESIDENT_SURCHARGE).toBe(0.02);
    expect(SDLT_NON_RESIDENT_MIN_PRICE).toBe(40_000);
    expect(UK_SDLT.nonResidentSurcharge).toBe(0.02);
  });

  it('has correct CGT values', () => {
    expect(uk.cgt.annualExempt).toBe(3_000);
    expect(uk.cgt.basicRate).toBe(0.18);
    expect(uk.cgt.higherRate).toBe(0.24);
  });

  it('has correct legislated pension ages (not year-keyed)', () => {
    expect(UK_PENSION_AGES.normalMinimumPensionAge).toBe(55);
    expect(UK_PENSION_AGES.normalMinimumPensionAgeFrom2028).toBe(57);
    expect(UK_PENSION_AGES.statePensionAge).toBe(66);
    expect(UK_PENSION_AGES.statePensionAgeFrom2028).toBe(67);
  });
});

describe('UK stable aliases point at the default year', () => {
  it('every legacy export equals getUkRates(default)', () => {
    const d = getUkRates(UK_DEFAULT_TAX_YEAR);
    expect(UK_TAX_YEAR).toBe(UK_DEFAULT_TAX_YEAR);
    expect(UK_RATES_LAST_CHECKED).toBe(d.lastChecked);
    expect(UK_INCOME_TAX).toBe(d.incomeTax);
    expect(UK_NI).toBe(d.ni);
    expect(UK_EMPLOYER_NI).toBe(d.employerNi);
    expect(UK_STUDENT_LOANS).toBe(d.studentLoans);
    expect(UK_STATE_PENSION).toBe(d.statePension);
    expect(UK_SCOTTISH_TAX).toBe(d.scottishTax);
    expect(UK_CGT).toBe(d.cgt);
    expect(UK_PENSION_ANNUAL_ALLOWANCE).toBe(d.pensionAnnualAllowance);
    expect(UK_CHILDCARE_ANI_LIMIT).toBe(d.childcareAniLimit);
  });
});

describe('US federal rates 2026 (Rev. Proc. 2025-32)', () => {
  const r = getUsRates(2026);

  it('has correct single brackets', () => {
    expect(r.brackets.single.map(([t]) => t)).toEqual([0, 12_400, 50_400, 105_700, 201_775, 256_225, 640_600]);
  });

  it('has correct head-of-household brackets (32% from $201,750: MATH-US-F09)', () => {
    expect(r.brackets.head.map(([t]) => t)).toEqual([0, 17_700, 67_450, 105_700, 201_750, 256_200, 640_600]);
  });

  it('has correct married-filing-jointly brackets', () => {
    expect(r.brackets.married.map(([t]) => t)).toEqual([0, 24_800, 100_800, 211_400, 403_550, 512_450, 768_700]);
  });

  it('has correct standard and age-65 additional deductions', () => {
    expect(r.standardDeduction).toEqual({ single: 16_100, married: 32_200, head: 24_150 });
    expect(r.additionalStandardDeduction65).toEqual({ married: 1_650, unmarried: 2_050 });
  });

  it('has correct FICA values', () => {
    expect(r.socialSecurity).toEqual({ rate: 0.062, wageCap: 184_500 });
    expect(r.medicare.rate).toBe(0.0145);
    expect(r.medicare.additionalRate).toBe(0.009);
    expect(r.medicare.additionalThreshold).toEqual({ single: 200_000, married: 250_000, head: 200_000 });
  });

  it('has correct long-term capital gains thresholds', () => {
    expect(r.capitalGains.longTerm.single.map((b) => b.from)).toEqual([0, 49_450, 545_500]);
    expect(r.capitalGains.longTerm.married.map((b) => b.from)).toEqual([0, 98_900, 613_700]);
    expect(r.capitalGains.longTerm.head.map((b) => b.from)).toEqual([0, 66_200, 579_600]);
  });

  it('has correct 401(k) limits (IRS Notice 2025-67)', () => {
    expect(r.retirement401k).toEqual({ limit: 24_500, catchUp: 8_000, catchUp60to63: 11_250, published: true });
  });
});

describe('US federal rates 2027 (Rev. Proc. 2026-35 / IR-2026-133, SSA)', () => {
  const r = getUsRates(2027);

  it('has correct single brackets', () => {
    expect(r.brackets.single.map(([t]) => t)).toEqual([0, 12_800, 52_025, 109_125, 208_325, 264_550, 661_375]);
  });

  it('has correct married-filing-jointly brackets', () => {
    expect(r.brackets.married.map(([t]) => t)).toEqual([0, 25_600, 104_050, 218_250, 416_650, 529_100, 793_650]);
  });

  it('has correct head-of-household brackets', () => {
    expect(r.brackets.head.map(([t]) => t)).toEqual([0, 18_250, 69_650, 109_100, 208_300, 264_550, 661_350]);
  });

  it('keeps the seven statutory rates', () => {
    for (const s of ['single', 'married', 'head'] as FilingStatus[]) {
      expect(r.brackets[s].map(([, rate]) => rate)).toEqual([0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]);
    }
  });

  it('has correct standard and age-65 additional deductions', () => {
    expect(r.standardDeduction).toEqual({ single: 16_600, married: 33_200, head: 24_925 });
    expect(r.additionalStandardDeduction65).toEqual({ married: 1_700, unmarried: 2_100 });
  });

  it('has the SSA 2027 wage base', () => {
    expect(r.socialSecurity).toEqual({ rate: 0.062, wageCap: 192_300 });
  });

  it('has correct long-term capital gains thresholds', () => {
    expect(r.capitalGains.longTerm.single.map((b) => b.from)).toEqual([0, 51_050, 563_200]);
    expect(r.capitalGains.longTerm.married.map((b) => b.from)).toEqual([0, 102_100, 633_600]);
    expect(r.capitalGains.longTerm.head.map((b) => b.from)).toEqual([0, 68_350, 598_400]);
  });

  it('flags the 2027 401(k) limit as not yet published (carried from 2026)', () => {
    expect(r.retirement401k.published).toBe(false);
    expect(r.retirement401k.limit).toBe(getUsRates(2026).retirement401k.limit);
  });

  it('carries the OBBBA deductions (fixed amounts for 2025-2028)', () => {
    expect(r.obbba?.overtime.cap).toEqual({ single: 12_500, married: 25_000, head: 12_500 });
    expect(r.obbba?.overtime.phaseOutStart).toEqual({ single: 150_000, married: 300_000, head: 150_000 });
    expect(r.obbba?.senior.perPerson).toBe(6_000);
    expect(r.obbba?.senior.phaseOutStart).toEqual({ single: 75_000, married: 150_000, head: 75_000 });
  });
});

/**
 * IRS worked numbers: each Rev. Proc. rate table states the tax at the start
 * of every bracket ("$X plus Y% of the excess over $Z"). Computing the tax at
 * each threshold must reproduce $X exactly.
 */
const IRS_BRACKET_BASES: Record<UsTaxYear, Record<FilingStatus, [number, number][]>> = {
  2026: {
    single: [[12_400, 1_240], [50_400, 5_800], [105_700, 17_966], [201_775, 41_024], [256_225, 58_448], [640_600, 192_979.25]],
    married: [[24_800, 2_480], [100_800, 11_600], [211_400, 35_932], [403_550, 82_048], [512_450, 116_896], [768_700, 206_583.50]],
    head: [[17_700, 1_770], [67_450, 7_740], [105_700, 16_155], [201_750, 39_207], [256_200, 56_631], [640_600, 191_171]],
  },
  2027: {
    single: [[12_800, 1_280], [52_025, 5_987], [109_125, 18_549], [208_325, 42_357], [264_550, 60_349], [661_375, 199_237.75]],
    married: [[25_600, 2_560], [104_050, 11_974], [218_250, 37_098], [416_650, 84_714], [529_100, 120_698], [793_650, 213_290.50]],
    head: [[18_250, 1_825], [69_650, 7_993], [109_100, 16_672], [208_300, 40_480], [264_550, 58_480], [661_350, 197_360]],
  },
};

describe('federal tax reproduces the Rev. Proc. rate-table amounts', () => {
  for (const year of [2026, 2027] as UsTaxYear[]) {
    for (const status of ['single', 'married', 'head'] as FilingStatus[]) {
      it(`${year} ${status}`, () => {
        for (const [threshold, base] of IRS_BRACKET_BASES[year][status]) {
          expect(taxOnTaxableIncome(threshold, status, year)).toBeCloseTo(base, 2);
        }
      });
    }
  }

  it('$75K single, 2026: $7,670 federal (10% of $12,400 + 12% of $38,000 + 22% of $8,500)', () => {
    expect(taxOnTaxableIncome(75_000 - 16_100, 'single', 2026)).toBeCloseTo(7_670, 2);
  });
});

describe('US stable aliases point at the default year', () => {
  it('every legacy export equals getUsRates(default)', () => {
    const d = getUsRates(US_DEFAULT_TAX_YEAR);
    expect(US_TAX_YEAR).toBe(String(US_DEFAULT_TAX_YEAR));
    expect(US_RATES_LAST_CHECKED).toBe(d.lastChecked);
    expect(US_BRACKETS).toBe(d.brackets);
    expect(US_STANDARD_DEDUCTION).toBe(d.standardDeduction);
    expect(US_SOCIAL_SECURITY).toBe(d.socialSecurity);
    expect(US_MEDICARE).toBe(d.medicare);
    expect(US_CAPITAL_GAINS).toBe(d.capitalGains);
    expect(US_401K).toBe(d.retirement401k);
    // Legacy shape kept for existing importers, plus the ages 60-63 catch-up.
    expect(typeof US_401K.limit).toBe('number');
    expect(typeof US_401K.catchUp).toBe('number');
    expect(US_401K.catchUp60to63).toBe(d.retirement401k.catchUp60to63);
  });

  it('401(k) ages 60-63 catch-up: $11,250 for 2026, carried (unpublished) for 2027', () => {
    expect(getUsRates(2026).retirement401k.catchUp60to63).toBe(11_250);
    expect(getUsRates(2027).retirement401k.catchUp60to63).toBe(11_250);
    expect(getUsRates(2027).retirement401k.published).toBe(false);
  });
});

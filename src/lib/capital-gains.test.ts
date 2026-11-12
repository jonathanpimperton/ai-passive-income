import { describe, it, expect } from 'vitest';
import { calculateUSCgt, calculateUKCgt, ukBandPosition, defaultCgtCountry, estimateMagi } from './capital-gains';
import { US_CAPITAL_GAINS, US_STANDARD_DEDUCTION } from './us-rates';
import { UK_CGT } from './uk-rates';

/**
 * US 2026 (single, Rev. Proc. 2025-32): LTCG 0% to $49,450 taxable,
 * 15% to $545,500, 20% above. NIIT 3.8% over $200K ($250K married), tested
 * against MAGI, estimated as taxable income + the standard deduction + the
 * gain (MATH-UK-15). The model stacks the gain on top of ordinary taxable
 * income.
 *
 * UK 2026/27: annual exempt £3,000, rates 18% (unused basic band) / 24%.
 * The band is derived from the income entered (MATH-UK-14).
 */

describe('calculateUSCgt -- long-term', () => {
  it('returns zero tax for a loss or break-even sale', () => {
    const r = calculateUSCgt(80_000, 60_000, 'long', 'single', 100_000);
    expect(r.gain).toBe(-20_000);
    expect(r.totalTax).toBe(0);
    expect(calculateUSCgt(50_000, 50_000, 'long', 'single', 100_000).totalTax).toBe(0);
  });

  it('low-income filer fully inside the 0% band pays $0', () => {
    // $30,000 income + $10,000 gain = $40,000, all below the $49,450 0% top
    const r = calculateUSCgt(50_000, 60_000, 'long', 'single', 30_000);
    expect(r.federalTax).toBe(0);
    expect(r.niit).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.marginalRate).toBe(0);
  });

  it('mid-income filer: entire gain at 15%', () => {
    // $75,000 income already exceeds the 0% top ($49,450), total $105,000
    // stays below $545,500 -> all $30,000 of gain at 15% = $4,500
    const r = calculateUSCgt(50_000, 80_000, 'long', 'single', 75_000);
    expect(r.federalTax).toBeCloseTo(4_500, 2);
    expect(r.niit).toBe(0);
    expect(r.totalTax).toBeCloseTo(4_500, 2);
    expect(r.effectiveRate).toBeCloseTo(15, 6);
    expect(r.marginalRate).toBe(0.15);
  });

  it('gain straddling the 0%/15% boundary', () => {
    // $40,000 income, $20,000 gain: $9,450 fills the 0% band up to $49,450,
    // remaining $10,550 at 15% = $1,582.50
    const r = calculateUSCgt(0, 20_000, 'long', 'single', 40_000);
    expect(r.federalTax).toBeCloseTo(1_582.50, 2);
    expect(r.marginalRate).toBe(0.15);
  });

  it('adds NIIT above the $200K threshold (single), using MAGI not taxable income', () => {
    // MAGI = $140,000 taxable + $16,100 standard deduction + $50,000 gain = $206,100
    // -> $6,100 over threshold. Federal: all gain at 15% = $7,500. NIIT: $6,100 x 3.8% = $231.80
    // (taxable income + gain is only $190,000: the old model charged no NIIT at all)
    const r = calculateUSCgt(0, 50_000, 'long', 'single', 140_000);
    expect(r.magi).toBe(206_100);
    expect(r.federalTax).toBeCloseTo(7_500, 2);
    expect(r.niit).toBeCloseTo(231.8, 2);
    expect(r.totalTax).toBeCloseTo(7_731.8, 2);
  });

  it('MATH-UK-15 repro: $150k taxable + $60k gain, single -> NIIT $991.80 (site showed $380)', () => {
    // MAGI 150,000 + 16,100 + 60,000 = 226,100 -> 26,100 x 3.8% = 991.80
    expect(calculateUSCgt(0, 60_000, 'long', 'single', 150_000).niit).toBeCloseTo(991.8, 2);
  });

  it('IRS NIIT Q&A example 20: wages $180,000 + $90,000 investment income -> $2,660', () => {
    // https://www.irs.gov/newsroom/questions-and-answers-on-the-net-investment-income-tax
    // (accessed 12 Nov 2026). MAGI $270,000; taxable income = 180,000 - 16,100.
    const r = calculateUSCgt(0, 90_000, 'long', 'single', 180_000 - US_STANDARD_DEDUCTION.single);
    expect(r.magi).toBe(270_000);
    expect(r.niit).toBeCloseTo(2_660, 2);
  });

  it('IRS NIIT Q&A example 19: wages $180,000 + $15,000 -> MAGI $195,000, no NIIT', () => {
    const r = calculateUSCgt(0, 15_000, 'long', 'single', 180_000 - US_STANDARD_DEDUCTION.single);
    expect(r.magi).toBe(195_000);
    expect(r.niit).toBe(0);
  });

  it('IRS NIIT Q&A example 2: married couple, MAGI $300,000 -> $1,900', () => {
    // $50,000 over the $250,000 threshold; the $100,000 gain does not bind
    const taxable = 300_000 - 100_000 - US_STANDARD_DEDUCTION.married;
    const r = calculateUSCgt(0, 100_000, 'long', 'married', taxable);
    expect(r.magi).toBe(300_000);
    expect(r.niit).toBeCloseTo(1_900, 2);
  });

  it('estimateMagi adds the filing-status standard deduction', () => {
    expect(estimateMagi(100_000, 10_000, 'head')).toBe(100_000 + US_STANDARD_DEDUCTION.head + 10_000);
  });

  it('high earner: gain at 20% plus NIIT on the whole gain', () => {
    // $600,000 income already exceeds the $545,500 20% threshold
    // Federal: $50,000 x 20% = $10,000. NIIT: $50,000 x 3.8% = $1,900
    const r = calculateUSCgt(0, 50_000, 'long', 'single', 600_000);
    expect(r.federalTax).toBeCloseTo(10_000, 2);
    expect(r.niit).toBeCloseTo(1_900, 2);
    expect(r.totalTax).toBeCloseTo(11_900, 2);
    expect(r.marginalRate).toBe(0.20);
  });

  it('gain spanning all three brackets is taxed per-slice (regression for band overflow bug)', () => {
    // $0 income, $700,000 gain: 0% on 49,450; 15% on 496,050 = $74,407.50;
    // 20% on 154,500 = $30,900 -> federal $105,307.50.
    // NIIT: MAGI 716,100; min(700,000, 516,100) x 3.8% = $19,611.80
    const r = calculateUSCgt(0, 700_000, 'long', 'single', 0);
    expect(r.federalTax).toBeCloseTo(105_307.50, 2);
    expect(r.niit).toBeCloseTo(19_611.8, 2);
    expect(r.totalTax).toBeCloseTo(124_919.30, 2);
  });

  it('married couple with total income below the 0% top pays $0', () => {
    // $90,000 income + $8,000 gain = $98,000, at or below the $98,900 married 0% top
    expect(US_CAPITAL_GAINS.longTerm.married[1].from).toBe(98_900);
    const r = calculateUSCgt(0, 8_000, 'long', 'married', 90_000);
    expect(r.federalTax).toBe(0);
  });
});

describe('calculateUSCgt -- short-term', () => {
  it('taxes the gain at ordinary income rates stacked on top of income', () => {
    // 2026 single: 22% bracket starts at $50,400 taxable.
    // $50,400 income + $10,000 gain -> all of the gain in the 22% band = $2,200
    const r = calculateUSCgt(0, 10_000, 'short', 'single', 50_400);
    expect(r.federalTax).toBeCloseTo(2_200, 2);
    expect(r.marginalRate).toBe(0.22);
  });

  it('uses the 10% bracket for a filer with no other income', () => {
    // $10,000 gain < $12,400 (12% threshold) -> 10% x 10,000 = $1,000
    const r = calculateUSCgt(0, 10_000, 'short', 'single', 0);
    expect(r.federalTax).toBeCloseTo(1_000, 2);
    expect(r.marginalRate).toBe(0.10);
  });

  it('short-term tax is at least as high as long-term for the same gain', () => {
    const short = calculateUSCgt(50_000, 80_000, 'short', 'single', 75_000);
    const long = calculateUSCgt(50_000, 80_000, 'long', 'single', 75_000);
    expect(short.totalTax).toBeGreaterThanOrEqual(long.totalTax);
  });
});

describe('calculateUKCgt (band derived from income; MATH-UK-14, CALC-UX-A-19)', () => {
  it('returns zero tax for a loss', () => {
    const r = calculateUKCgt(20_000, 15_000, 30_000);
    expect(r.gain).toBe(-5_000);
    expect(r.totalTax).toBe(0);
    expect(r.taxableGain).toBe(0);
  });

  it('gains within the annual exempt amount are tax-free', () => {
    const r = calculateUKCgt(10_000, 12_500, 30_000);
    expect(r.taxableGain).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.annualExempt).toBe(UK_CGT.annualExempt);
  });

  it('GOV.UK worked example: £20,000 taxable income, £52,600 gains -> £10,842', () => {
    // https://www.gov.uk/capital-gains-tax/rates (accessed 12 Nov 2026): gains
    // less £3,000 = £49,600; £17,700 of basic band left at 18%, £31,900 at 24%.
    // Taxable income £20,000 = income £32,570 less the £12,570 allowance.
    const r = calculateUKCgt(0, 52_600, 32_570);
    expect(r.unusedBasicBand).toBe(17_700);
    expect(r.basicRateTax).toBeCloseTo(3_186, 2);
    expect(r.higherRateTax).toBeCloseTo(7_656, 2);
    expect(r.totalTax).toBeCloseTo(10_842, 2);
    expect(r.incomeBand).toBe('basic');
  });

  it('MATH-UK-14 repro: £40k income, £50k gain -> £10,663.80 (site showed £11,280 with "Higher")', () => {
    // unused basic band 37,700 - 27,430 = 10,270 at 18% (1,848.60) + 36,730 at 24% (8,815.20)
    expect(calculateUKCgt(0, 50_000, 40_000).totalTax).toBeCloseTo(10_663.8, 2);
  });

  it('CALC-UX-A-19 repro: £30k income, £30k gain -> £5,263.80 (a toggle can no longer make it £6,480)', () => {
    // unused band 37,700 - 17,430 = 20,270; taxable gain 27,000:
    // 20,270 x 18% (3,648.60) + 6,730 x 24% (1,615.20) = 5,263.80
    expect(calculateUKCgt(0, 30_000, 30_000).totalTax).toBeCloseTo(5_263.8, 2);
  });

  it('basic-rate taxpayer, £10,000 gain -> £1,260', () => {
    // Taxable gain 7,000; income £35,000 leaves £15,270 of basic band -> all at 18%
    const r = calculateUKCgt(0, 10_000, 35_000);
    expect(r.taxableGain).toBe(7_000);
    expect(r.basicRateTax).toBeCloseTo(1_260, 2);
    expect(r.higherRateTax).toBe(0);
    expect(r.totalTax).toBeCloseTo(1_260, 2);
    expect(r.effectiveRate).toBeCloseTo(12.6, 6);
  });

  it('gain straddling the basic-rate band boundary', () => {
    // Income £45,000: unused basic band = 37,700 - 32,430 = £5,270.
    // Taxable gain 17,000 -> 5,270 x 18% (£948.60) + 11,730 x 24% (£2,815.20)
    const r = calculateUKCgt(0, 20_000, 45_000);
    expect(r.basicRateTax).toBeCloseTo(948.60, 2);
    expect(r.higherRateTax).toBeCloseTo(2_815.20, 2);
    expect(r.totalTax).toBeCloseTo(3_763.80, 2);
  });

  it('higher-rate income pays 24% on the whole taxable gain', () => {
    // (10,000 - 3,000) x 24% = £1,680
    const r = calculateUKCgt(0, 10_000, 80_000);
    expect(r.incomeBand).toBe('higher');
    expect(r.basicRateTax).toBe(0);
    expect(r.totalTax).toBeCloseTo(1_680, 2);
  });

  it('income below the personal allowance leaves the full basic band', () => {
    // Taxable gain 47,000 -> 37,700 x 18% (£6,786) + 9,300 x 24% (£2,232) = £9,018
    const r = calculateUKCgt(0, 50_000, 10_000);
    expect(r.basicRateTax).toBeCloseTo(6_786, 2);
    expect(r.higherRateTax).toBeCloseTo(2_232, 2);
    expect(r.totalTax).toBeCloseTo(9_018, 2);
  });

  it('gainAtBasicRate + gainAtHigherRate = taxable gain', () => {
    for (const income of [0, 20_000, 45_000, 60_000, 150_000]) {
      const r = calculateUKCgt(0, 75_000, income);
      expect(r.gainAtBasicRate + r.gainAtHigherRate).toBeCloseTo(r.taxableGain, 6);
    }
  });

  it('ukBandPosition derives the band, applying the allowance taper', () => {
    expect(ukBandPosition(50_270).band).toBe('basic');
    expect(ukBandPosition(50_271).band).toBe('higher');
    expect(ukBandPosition(110_000).taxableIncome).toBe(110_000 - 7_570);
    expect(ukBandPosition(200_000).band).toBe('additional');
    expect(ukBandPosition(-5).unusedBasicBand).toBe(37_700);
  });
});

describe('defaultCgtCountry (MATH-UK addendum: tab follows currency/region)', () => {
  it('a stored GBP choice opens the UK tab; USD/EUR open the US tab', () => {
    expect(defaultCgtCountry('GBP', 'US')).toBe('uk');
    expect(defaultCgtCountry('USD', 'UK')).toBe('us');
    expect(defaultCgtCountry('EUR', 'UK')).toBe('us');
  });

  it('with no valid stored choice the region decides', () => {
    expect(defaultCgtCountry(null, 'UK')).toBe('uk');
    expect(defaultCgtCountry('garbage', 'UK')).toBe('uk');
    expect(defaultCgtCountry(null, 'US')).toBe('us');
    expect(defaultCgtCountry(null, 'EEA')).toBe('us');
    expect(defaultCgtCountry(null, 'OTHER')).toBe('us');
  });
});

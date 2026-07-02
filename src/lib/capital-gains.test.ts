import { describe, it, expect } from 'vitest';
import { calculateUSCgt, calculateUKCgt } from './capital-gains';
import { US_CAPITAL_GAINS } from './us-rates';
import { UK_CGT } from './uk-rates';

/**
 * US 2026 (single, Rev. Proc. 2025-32): LTCG 0% to $49,450 taxable,
 * 15% to $545,500, 20% above. NIIT 3.8% over $200K ($250K married).
 * The model stacks the gain on top of ordinary taxable income.
 *
 * UK 2026/27: annual exempt £3,000, rates 18% (unused basic band) / 24%.
 */

describe('calculateUSCgt — long-term', () => {
  it('returns zero tax for a loss or break-even sale', () => {
    const r = calculateUSCgt(80_000, 60_000, 'long', 'single', 100_000);
    expect(r.gain).toBe(-20_000);
    expect(r.totalTax).toBe(0);
    expect(calculateUSCgt(50_000, 50_000, 'long', 'single', 100_000).totalTax).toBe(0);
  });

  it('low-income filer fully inside the 0% band pays $0', () => {
    // $30,000 income + $10,000 gain = $40,000 — all below the $49,450 0% top
    const r = calculateUSCgt(50_000, 60_000, 'long', 'single', 30_000);
    expect(r.federalTax).toBe(0);
    expect(r.niit).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.marginalRate).toBe(0);
  });

  it('mid-income filer: entire gain at 15%', () => {
    // $75,000 income already exceeds the 0% top ($49,450), total $105,000
    // stays below $545,500 → all $30,000 of gain at 15% = $4,500
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

  it('adds NIIT above the $200K threshold (single)', () => {
    // $190,000 income + $50,000 gain = $240,000 MAGI → $40,000 over threshold
    // Federal: all gain at 15% = $7,500. NIIT: $40,000 × 3.8% = $1,520
    const r = calculateUSCgt(0, 50_000, 'long', 'single', 190_000);
    expect(r.federalTax).toBeCloseTo(7_500, 2);
    expect(r.niit).toBeCloseTo(1_520, 2);
    expect(r.totalTax).toBeCloseTo(9_020, 2);
  });

  it('high earner: gain at 20% plus NIIT on the whole gain', () => {
    // $600,000 income already exceeds the $545,500 20% threshold
    // Federal: $50,000 × 20% = $10,000. NIIT: $50,000 × 3.8% = $1,900
    const r = calculateUSCgt(0, 50_000, 'long', 'single', 600_000);
    expect(r.federalTax).toBeCloseTo(10_000, 2);
    expect(r.niit).toBeCloseTo(1_900, 2);
    expect(r.totalTax).toBeCloseTo(11_900, 2);
    expect(r.marginalRate).toBe(0.20);
  });

  it('gain spanning all three brackets is taxed per-slice (regression for band overflow bug)', () => {
    // $0 income, $700,000 gain: 0% on 49,450; 15% on 496,050 = $74,407.50;
    // 20% on 154,500 = $30,900 → federal $105,307.50.
    // NIIT: min(700,000, 700,000 − 200,000) × 3.8% = $19,000
    const r = calculateUSCgt(0, 700_000, 'long', 'single', 0);
    expect(r.federalTax).toBeCloseTo(105_307.50, 2);
    expect(r.niit).toBeCloseTo(19_000, 2);
    expect(r.totalTax).toBeCloseTo(124_307.50, 2);
  });

  it('married couple with total income below the 0% top pays $0', () => {
    // $90,000 income + $8,000 gain = $98,000 ≤ $98,900 married 0% top
    expect(US_CAPITAL_GAINS.longTerm.married[1].from).toBe(98_900);
    const r = calculateUSCgt(0, 8_000, 'long', 'married', 90_000);
    expect(r.federalTax).toBe(0);
  });
});

describe('calculateUSCgt — short-term', () => {
  it('taxes the gain at ordinary income rates stacked on top of income', () => {
    // 2026 single: 22% bracket starts at $50,400 taxable.
    // $50,400 income + $10,000 gain → all of the gain in the 22% band = $2,200
    const r = calculateUSCgt(0, 10_000, 'short', 'single', 50_400);
    expect(r.federalTax).toBeCloseTo(2_200, 2);
    expect(r.marginalRate).toBe(0.22);
  });

  it('uses the 10% bracket for a filer with no other income', () => {
    // $10,000 gain < $12,400 (12% threshold) → 10% × 10,000 = $1,000
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

describe('calculateUKCgt', () => {
  it('returns zero tax for a loss', () => {
    const r = calculateUKCgt(20_000, 15_000, 'basic', 30_000);
    expect(r.gain).toBe(-5_000);
    expect(r.totalTax).toBe(0);
    expect(r.taxableGain).toBe(0);
  });

  it('gains within the annual exempt amount are tax-free', () => {
    const r = calculateUKCgt(10_000, 12_500, 'basic', 30_000);
    expect(r.taxableGain).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.annualExempt).toBe(UK_CGT.annualExempt);
  });

  it('basic-rate taxpayer, £10,000 gain → £1,260', () => {
    // Taxable gain: 10,000 − 3,000 = 7,000. Income £35,000 leaves
    // 37,700 − (35,000 − 12,570) = £15,270 of basic band → all at 18% = £1,260
    const r = calculateUKCgt(0, 10_000, 'basic', 35_000);
    expect(r.taxableGain).toBe(7_000);
    expect(r.basicRateTax).toBeCloseTo(1_260, 2);
    expect(r.higherRateTax).toBe(0);
    expect(r.totalTax).toBeCloseTo(1_260, 2);
    expect(r.effectiveRate).toBeCloseTo(12.6, 6);
  });

  it('gain straddling the basic-rate band boundary', () => {
    // Income £45,000: unused basic band = 37,700 − 32,430 = £5,270.
    // Taxable gain 17,000 → 5,270 × 18% (£948.60) + 11,730 × 24% (£2,815.20)
    const r = calculateUKCgt(0, 20_000, 'basic', 45_000);
    expect(r.basicRateTax).toBeCloseTo(948.60, 2);
    expect(r.higherRateTax).toBeCloseTo(2_815.20, 2);
    expect(r.totalTax).toBeCloseTo(3_763.80, 2);
  });

  it('higher-rate taxpayer pays 24% on the whole taxable gain', () => {
    // (10,000 − 3,000) × 24% = £1,680, regardless of income
    const r = calculateUKCgt(0, 10_000, 'higher', 80_000);
    expect(r.basicRateTax).toBe(0);
    expect(r.totalTax).toBeCloseTo(1_680, 2);
  });

  it('income below the personal allowance leaves the full basic band', () => {
    // Income £10,000 < PA → unused basic band = full £37,700.
    // Taxable gain 47,000 → 37,700 × 18% (£6,786) + 9,300 × 24% (£2,232) = £9,018
    const r = calculateUKCgt(0, 50_000, 'basic', 10_000);
    expect(r.basicRateTax).toBeCloseTo(6_786, 2);
    expect(r.higherRateTax).toBeCloseTo(2_232, 2);
    expect(r.totalTax).toBeCloseTo(9_018, 2);
  });
});

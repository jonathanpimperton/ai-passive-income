import { describe, it, expect } from 'vitest';
import { calculateSdlt } from './stamp-duty';
import { UK_SDLT } from './uk-rates';

/**
 * Hand-verified against GOV.UK residential SDLT rates (from 1 April 2025):
 * Standard: 0% to £125K, 2% to £250K, 5% to £925K, 10% to £1.5M, 12% above.
 * First-time buyer: 0% to £300K, 5% to £500K — relief lost entirely above £500K.
 * Additional property: +5% surcharge on every band.
 */

describe('calculateSdlt — standard rates', () => {
  it('charges nothing at or below the nil-rate band (£125,000)', () => {
    expect(calculateSdlt(125_000, 'standard').totalTax).toBe(0);
    expect(calculateSdlt(100_000, 'standard').totalTax).toBe(0);
  });

  it('£250,000 → £2,500 (2% on the £125K–£250K slice)', () => {
    expect(calculateSdlt(250_000, 'standard').totalTax).toBeCloseTo(2_500, 6);
  });

  it('£600,000 → £20,000 (£0 + £2,500 at 2% + £17,500 at 5% on £350K)', () => {
    // 0% on 125,000 = 0; 2% on 125,000 = 2,500; 5% on 350,000 = 17,500
    expect(calculateSdlt(600_000, 'standard').totalTax).toBeCloseTo(20_000, 6);
  });

  it('£2,000,000 → £153,750 (all five bands)', () => {
    // 0 + 2,500 + 5% × 675,000 (33,750) + 10% × 575,000 (57,500) + 12% × 500,000 (60,000)
    expect(calculateSdlt(2_000_000, 'standard').totalTax).toBeCloseTo(153_750, 6);
  });

  it('reports the effective rate as a percentage of the price', () => {
    const r = calculateSdlt(600_000, 'standard');
    expect(r.effectiveRate).toBeCloseTo((20_000 / 600_000) * 100, 6);
  });

  it('band breakdown sums to the total tax', () => {
    const r = calculateSdlt(1_200_000, 'standard');
    const sum = r.bands.reduce((s, b) => s + b.tax, 0);
    expect(sum).toBeCloseTo(r.totalTax, 6);
  });
});

describe('calculateSdlt — first-time buyer relief', () => {
  it('£300,000 → £0 (within the FTB nil-rate band)', () => {
    expect(calculateSdlt(300_000, 'first-time').totalTax).toBe(0);
  });

  it('£450,000 → £7,500 (5% on £150,000 above £300K)', () => {
    expect(calculateSdlt(450_000, 'first-time').totalTax).toBeCloseTo(7_500, 6);
  });

  it('£500,000 (exactly at the cap) → £10,000 (relief still applies)', () => {
    expect(calculateSdlt(500_000, 'first-time').totalTax).toBeCloseTo(10_000, 6);
  });

  it('£550,000 → relief lost, standard rates apply → £17,500', () => {
    // Above the £500K cap the WHOLE purchase reverts to standard rates:
    // 0 + 2,500 + 5% × 300,000 (15,000) = 17,500
    const r = calculateSdlt(550_000, 'first-time');
    expect(r.totalTax).toBeCloseTo(17_500, 6);
    expect(r.totalTax).toBeCloseTo(calculateSdlt(550_000, 'standard').totalTax, 6);
  });

  it('uses the cap from the central rates module', () => {
    expect(UK_SDLT.firstTimeBuyerCap).toBe(500_000);
  });
});

describe('calculateSdlt — additional property surcharge', () => {
  it('£300,000 → £20,000 (standard £5,000 + 5% surcharge on full price £15,000)', () => {
    // Band-by-band with +5%: 125,000 × 5% (6,250) + 125,000 × 7% (8,750) + 50,000 × 10% (5,000)
    expect(calculateSdlt(300_000, 'additional').totalTax).toBeCloseTo(20_000, 6);
  });

  it('applies the surcharge even within the 0% base band', () => {
    // £100,000 sits entirely in the 0% standard band → 5% surcharge on all of it
    expect(calculateSdlt(100_000, 'additional').totalTax).toBeCloseTo(5_000, 6);
  });

  it('equals standard tax plus 5% of the full price', () => {
    const price = 750_000;
    const standard = calculateSdlt(price, 'standard').totalTax;
    const additional = calculateSdlt(price, 'additional').totalTax;
    expect(additional).toBeCloseTo(standard + price * UK_SDLT.additionalSurcharge, 6);
  });
});

describe('calculateSdlt — edge cases', () => {
  it('returns zeros for zero, negative or non-finite price', () => {
    for (const price of [0, -50_000, Number.NaN]) {
      const r = calculateSdlt(price, 'first-time');
      expect(r.totalTax).toBe(0);
      expect(r.effectiveRate).toBe(0);
      expect(r.bands).toEqual([]);
    }
  });

  it('caps the top of each reported band at the purchase price', () => {
    const r = calculateSdlt(180_000, 'standard');
    expect(r.bands[r.bands.length - 1].to).toBe(180_000);
  });
});

describe('calculateSdlt -- £40,000 floor for the higher rates (MATH-UK-16b, MTH-23)', () => {
  // HMRC SDLTM09740: higher rates exclude consideration "less than £40,000".
  it('£39,999 additional property pays nothing (was £2,000)', () => {
    const r = calculateSdlt(39_999, 'additional');
    expect(r.totalTax).toBe(0);
    expect(r.higherRatesApplied).toBe(false);
    expect(r.belowSurchargeFloor).toBe(true);
  });

  it('exactly £40,000 additional property pays 5% = £2,000', () => {
    const r = calculateSdlt(40_000, 'additional');
    expect(r.totalTax).toBeCloseTo(2_000, 6);
    expect(r.higherRatesApplied).toBe(true);
  });
});

describe('calculateSdlt -- non-UK resident 2% surcharge (MATH-UK-16a)', () => {
  it('GOV.UK example (Fifi): £700,000 first-time buyer over the cap, non-resident = £39,000', () => {
    // https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents
    // 2% x 125,000 + 4% x 125,000 + 7% x 450,000 = 2,500 + 5,000 + 31,500
    const r = calculateSdlt(700_000, 'first-time', { nonResident: true });
    expect(r.totalTax).toBeCloseTo(39_000, 6);
    expect(r.firstTimeBuyerRelief).toBe(false);
    expect(r.nonResidentApplied).toBe(true);
  });

  it('HMRC SDLTM09870 example (Gia): £200,000 first-time buyer, non-resident = £4,000', () => {
    const r = calculateSdlt(200_000, 'first-time', { nonResident: true });
    expect(r.totalTax).toBeCloseTo(4_000, 6);
    expect(r.firstTimeBuyerRelief).toBe(true);
  });

  it('£500,000 non-resident moving home = standard £15,000 + £10,000 (MATH-UK-16a)', () => {
    expect(calculateSdlt(500_000, 'standard').totalTax).toBeCloseTo(15_000, 6);
    expect(calculateSdlt(500_000, 'standard', { nonResident: true }).totalTax).toBeCloseTo(25_000, 6);
  });

  it('stacks on the higher rates: additional + non-resident = standard + 7% of the price', () => {
    const price = 450_000;
    const r = calculateSdlt(price, 'additional', { nonResident: true });
    expect(r.totalTax).toBeCloseTo(calculateSdlt(price, 'standard').totalTax + price * 0.07, 6);
    expect(r.bands.every((b) => b.rate >= 0.07)).toBe(true);
  });

  it('does not apply below £40,000', () => {
    const r = calculateSdlt(39_000, 'standard', { nonResident: true });
    expect(r.totalTax).toBe(0);
    expect(r.nonResidentApplied).toBe(false);
  });

  it('defaults to resident when no option is passed (homepage call sites)', () => {
    expect(calculateSdlt(450_000, 'first-time').totalTax).toBeCloseTo(7_500, 6);
  });
});

describe('calculateSdlt -- invariants', () => {
  it('band taxes sum to the total and tax never falls as the price rises (except the FTB cliff)', () => {
    for (const type of ['standard', 'additional'] as const) {
      for (const nonResident of [false, true]) {
        let prev = -1;
        for (let price = 0; price <= 3_000_000; price += 7_500) {
          const r = calculateSdlt(price, type, { nonResident });
          expect(r.bands.reduce((s, b) => s + b.tax, 0)).toBeCloseTo(r.totalTax, 6);
          expect(r.totalTax).toBeGreaterThanOrEqual(prev);
          prev = r.totalTax;
        }
      }
    }
  });
});

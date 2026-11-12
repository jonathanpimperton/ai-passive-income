/**
 * Stamp Duty Land Tax (SDLT) calculation — England & Northern Ireland.
 *
 * All band/rate DATA comes from the central UK rates module (uk-rates.ts).
 * This module contains only the band-by-band computation used by the
 * Stamp Duty calculator and the homepage.
 *
 * Rules (accessed 12 Nov 2026):
 * - Residential rates, first-time buyer relief (none above £500,000) and the
 *   5% higher rates: https://www.gov.uk/stamp-duty-land-tax/residential-property-rates
 * - Higher rates do not apply where the consideration is "less than £40,000"
 *   (HMRC SDLTM09740): https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09740
 * - Non-UK resident surcharge: rates are "2 percentage points higher", on top
 *   of every residential rate "including zero rates", first-time buyer rates
 *   and the higher rates; it applies to purchases of £40,000 or more. Worked
 *   example (Fifi, £700,000, England, from 1 April 2025): £39,000.
 *   https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents ;
 *   HMRC SDLTM09870 example (Gia, first-time buyer, £200,000): £4,000.
 *   https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09870
 */

import { UK_SDLT } from './uk-rates';

export type BuyerType = 'standard' | 'first-time' | 'additional';

export interface SdltOptions {
  /** Buyer is not UK resident for SDLT (fewer than 183 days in the UK in the 12 months before buying). */
  nonResident?: boolean;
}

export interface SdltBand {
  from: number;
  to: number;
  rate: number;
  tax: number;
}

export interface SdltResult {
  totalTax: number;
  /** Total tax as a percentage of the price. */
  effectiveRate: number;
  bands: SdltBand[];
  /** First-time buyer relief rates were used. */
  firstTimeBuyerRelief: boolean;
  /** The 5% higher rates were applied (additional property at £40,000 or more). */
  higherRatesApplied: boolean;
  /** The 2% non-resident surcharge was applied (£40,000 or more). */
  nonResidentApplied: boolean;
  /** Surcharges skipped because the price is below £40,000. */
  belowSurchargeFloor: boolean;
}

/** Price below which neither the higher rates nor the non-resident surcharge apply. */
export const SDLT_SURCHARGE_FLOOR = 40_000;
/** Non-UK resident surcharge (percentage points on every band). Not in uk-rates.ts yet; see REQUEST for W1-TAX. */
export const SDLT_NON_RESIDENT_SURCHARGE = 0.02;

/**
 * Calculate SDLT for a residential property purchase.
 *
 * - First-time buyers use the relief bands, but only when the price is at or
 *   below the relief cap — above it, standard rates apply to the whole price.
 * - Additional properties add the 5% surcharge to every band's rate (even the
 *   0% band) when the price is £40,000 or more.
 * - Non-UK residents add a further 2% to every band (including 0% bands and on
 *   top of first-time buyer or higher rates) when the price is £40,000 or more.
 */
export function calculateSdlt(price: number, buyerType: BuyerType, options: SdltOptions = {}): SdltResult {
  const empty: SdltResult = {
    totalTax: 0,
    effectiveRate: 0,
    bands: [],
    firstTimeBuyerRelief: false,
    higherRatesApplied: false,
    nonResidentApplied: false,
    belowSurchargeFloor: false,
  };
  if (!Number.isFinite(price) || price <= 0) return empty;

  const firstTimeBuyerRelief = buyerType === 'first-time' && price <= UK_SDLT.firstTimeBuyerCap;
  const baseBands = firstTimeBuyerRelief ? UK_SDLT.firstTimeBuyer : UK_SDLT.standard;

  const atOrAboveFloor = price >= SDLT_SURCHARGE_FLOOR;
  const wantsSurcharge = buyerType === 'additional' || options.nonResident === true;
  const higherRatesApplied = buyerType === 'additional' && atOrAboveFloor;
  const nonResidentApplied = options.nonResident === true && atOrAboveFloor;
  const surcharge =
    (higherRatesApplied ? UK_SDLT.additionalSurcharge : 0) +
    (nonResidentApplied ? SDLT_NON_RESIDENT_SURCHARGE : 0);

  const bands: SdltBand[] = [];
  let totalTax = 0;

  for (const band of baseBands) {
    if (price <= band.from) break;
    const taxableInBand = Math.min(price, band.to) - band.from;
    if (taxableInBand <= 0) continue;
    const rate = band.rate + surcharge;
    const tax = taxableInBand * rate;
    totalTax += tax;
    bands.push({ from: band.from, to: Math.min(price, band.to), rate, tax });
  }

  return {
    totalTax,
    effectiveRate: (totalTax / price) * 100,
    bands,
    firstTimeBuyerRelief,
    higherRatesApplied,
    nonResidentApplied,
    belowSurchargeFloor: wantsSurcharge && !atOrAboveFloor,
  };
}

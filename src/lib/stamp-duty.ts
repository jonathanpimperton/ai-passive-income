/**
 * Stamp Duty Land Tax (SDLT) calculation — England & Northern Ireland.
 *
 * All band/rate DATA comes from the central UK rates module (uk-rates.ts).
 * This module contains only the band-by-band computation used by the
 * Stamp Duty calculator.
 */

import { UK_SDLT } from './uk-rates';

export type BuyerType = 'standard' | 'first-time' | 'additional';

export interface SdltBand {
  from: number;
  to: number;
  rate: number;
  tax: number;
}

export interface SdltResult {
  totalTax: number;
  effectiveRate: number;
  bands: SdltBand[];
}

/**
 * Calculate SDLT for a residential property purchase.
 *
 * - First-time buyers use the relief bands, but only when the price is at or
 *   below the relief cap — above it, standard rates apply to the whole price.
 * - Additional properties add the surcharge to every band's rate (the
 *   surcharge applies even within the 0% base-rate band).
 */
export function calculateSdlt(price: number, buyerType: BuyerType): SdltResult {
  if (price <= 0) return { totalTax: 0, effectiveRate: 0, bands: [] };

  let baseBands: typeof UK_SDLT.standard;

  if (buyerType === 'first-time' && price <= UK_SDLT.firstTimeBuyerCap) {
    baseBands = UK_SDLT.firstTimeBuyer;
  } else {
    baseBands = UK_SDLT.standard;
  }

  const surcharge = buyerType === 'additional' ? UK_SDLT.additionalSurcharge : 0;
  const bands: SdltBand[] = [];
  let totalTax = 0;

  for (const band of baseBands) {
    if (price <= band.from) break;
    const taxableInBand = Math.min(price, band.to) - band.from;
    if (taxableInBand <= 0) continue;
    const effectiveRate = band.rate + surcharge;
    const tax = taxableInBand * effectiveRate;
    totalTax += tax;
    bands.push({
      from: band.from,
      to: Math.min(price, band.to),
      rate: effectiveRate,
      tax,
    });
  }

  // For additional property, if price is within a band that has 0% base,
  // the surcharge still applies to the full amount in that band
  const effectiveRate = price > 0 ? (totalTax / price) * 100 : 0;

  return { totalTax, effectiveRate, bands };
}

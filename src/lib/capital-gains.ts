/**
 * Capital Gains Tax computation -- US (federal + NIIT) and UK.
 *
 * All rate/threshold DATA comes from the central rates modules
 * (us-rates.ts / uk-rates.ts). This module contains only the math.
 *
 * Model notes:
 * - US long-term: the gain stacks on top of ordinary taxable income and fills
 *   the LTCG brackets from there upward. Each slice is taxed at its bracket's
 *   rate.
 * - US short-term: the gain is taxed as ordinary income -- tax is the
 *   difference between bracket tax on (income + gain) and on income alone.
 * - NIIT: 3.8% of the lesser of the gain (net investment income) and the
 *   excess of modified AGI over the filing-status threshold. MAGI is
 *   estimated as taxable income + the standard deduction + the gain, i.e. it
 *   assumes the standard deduction and no other above-the-line adjustments.
 *   IRS: https://www.irs.gov/taxtopics/tc559 ; worked examples (Q&A
 *   examples 19 and 20): https://www.irs.gov/newsroom/questions-and-answers-on-the-net-investment-income-tax
 *   (accessed 12 Nov 2026).
 * - UK: GOV.UK method (https://www.gov.uk/capital-gains-tax/rates, accessed
 *   12 Nov 2026): taxable income = income minus the Personal Allowance; deduct
 *   the annual exempt amount from the gains; gains that fit in the unused
 *   basic rate band pay 18%, the rest 24%. The band is derived from the income
 *   entered; there is no separate "taxpayer type" input that could contradict it.
 *   CGT is UK-wide: the band test uses the UK basic rate band for Scottish
 *   taxpayers too (secondary sources; see the copy REQUEST before stating it).
 */

import { US_BRACKETS, US_CAPITAL_GAINS, US_STANDARD_DEDUCTION, type FilingStatus } from './us-rates';
import { UK_CGT, UK_INCOME_TAX } from './uk-rates';
import { calcPersonalAllowance } from './uk-tax-calc';
import type { Region } from './region';
import type { CurrencyRegion } from './currency';

export type HoldingPeriod = 'short' | 'long';
export type CgtCountry = 'us' | 'uk';

/* -- US CGT Calculation ------------------------------------ */
/**
 * The US figures the CGT engine needs. Structurally a subset of W1-TAX's
 * per-year rates object, so `getUsRates(year)` can be passed straight in once
 * the multi-year module lands. Omitted, the engine uses the us-rates.ts
 * exports (the default tax year). Tests pass an explicit year's figures so
 * they do not change when the default year rolls over on 1 January.
 */
export interface UsCgtRates {
  brackets: Record<FilingStatus, [number, number][]>;
  standardDeduction: Record<FilingStatus, number>;
  capitalGains: {
    longTerm: Record<FilingStatus, { from: number; rate: number }[]>;
    niit: { rate: number; threshold: Record<FilingStatus, number> };
  };
}

/** The default-year figures from us-rates.ts. */
export const DEFAULT_US_CGT_RATES: UsCgtRates = {
  brackets: US_BRACKETS,
  standardDeduction: US_STANDARD_DEDUCTION,
  capitalGains: US_CAPITAL_GAINS,
};

export interface USCgtResult {
  gain: number;
  taxableGain: number;
  federalTax: number;
  niit: number;
  /** Estimated modified AGI used for the NIIT test (0 when there is no gain). */
  magi: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

function calcBracketTax(income: number, brackets: [number, number][]): number {
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const bracketStart = brackets[i][0];
    const bracketEnd = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    const rate = brackets[i][1];
    if (income <= bracketStart) break;
    const taxableInBracket = Math.min(income, bracketEnd) - bracketStart;
    tax += taxableInBracket * rate;
  }
  return tax;
}

/** Estimated MAGI for the NIIT test: taxable income + standard deduction + gain. */
export function estimateMagi(
  taxableIncome: number,
  gain: number,
  filing: FilingStatus,
  rates: UsCgtRates = DEFAULT_US_CGT_RATES,
): number {
  return Math.max(0, taxableIncome) + rates.standardDeduction[filing] + Math.max(0, gain);
}

export function calculateUSCgt(
  purchasePrice: number,
  salePrice: number,
  holdingPeriod: HoldingPeriod,
  filing: FilingStatus,
  taxableIncome: number,
  rates: UsCgtRates = DEFAULT_US_CGT_RATES,
): USCgtResult {
  const gain = salePrice - purchasePrice;
  if (gain <= 0) return { gain, taxableGain: gain, federalTax: 0, niit: 0, magi: 0, totalTax: 0, effectiveRate: 0, marginalRate: 0 };

  const taxableGain = gain;
  let federalTax = 0;
  let marginalRate = 0;

  if (holdingPeriod === 'short') {
    // Short-term: taxed at ordinary income rates
    // Gain stacks on top of existing taxable income
    const brackets = rates.brackets[filing];
    const baseIncome = taxableIncome;
    const totalIncome = baseIncome + gain;

    const taxAtTotal = calcBracketTax(totalIncome, brackets);
    const taxAtBase = calcBracketTax(baseIncome, brackets);
    federalTax = taxAtTotal - taxAtBase;

    // Find marginal rate
    for (let i = brackets.length - 1; i >= 0; i--) {
      if (totalIncome > brackets[i][0]) {
        marginalRate = brackets[i][1];
        break;
      }
    }
  } else {
    // Long-term: the gain occupies [taxableIncome, taxableIncome + gain] --
    // ordinary income fills the LTCG brackets first, then each slice of the
    // gain is taxed at the rate of the bracket it lands in.
    const ltBrackets = rates.capitalGains.longTerm[filing];
    const totalTaxableIncome = taxableIncome + gain;

    for (let i = 0; i < ltBrackets.length; i++) {
      const bracketStart = ltBrackets[i].from;
      const bracketEnd = i + 1 < ltBrackets.length ? ltBrackets[i + 1].from : Infinity;
      const gainInBracket =
        Math.min(totalTaxableIncome, bracketEnd) - Math.max(bracketStart, taxableIncome);
      if (gainInBracket > 0) {
        federalTax += gainInBracket * ltBrackets[i].rate;
        marginalRate = ltBrackets[i].rate;
      }
    }
  }

  // Net Investment Income Tax (NIIT), tested against estimated MAGI
  const magi = estimateMagi(taxableIncome, gain, filing, rates);
  const niitThreshold = rates.capitalGains.niit.threshold[filing];
  let niit = 0;
  if (magi > niitThreshold) {
    const niitableAmount = Math.min(gain, magi - niitThreshold);
    niit = niitableAmount * rates.capitalGains.niit.rate;
  }

  const totalTax = federalTax + niit;
  const effectiveRate = gain > 0 ? (totalTax / gain) * 100 : 0;

  return { gain, taxableGain, federalTax, niit, magi, totalTax, effectiveRate, marginalRate };
}

/* -- UK CGT Calculation ------------------------------------ */
export type UkIncomeBand = 'basic' | 'higher' | 'additional';

export interface UkBandPosition {
  /** Income after the (tapered) Personal Allowance. */
  taxableIncome: number;
  /** Basic rate band left for gains. */
  unusedBasicBand: number;
  /** Highest income tax band the income reaches (rest-of-UK bands). */
  band: UkIncomeBand;
}

/** Where income sits in the UK bands, for the CGT rate test. */
export function ukBandPosition(annualIncome: number): UkBandPosition {
  const income = Math.max(0, annualIncome);
  const taxableIncome = Math.max(0, income - calcPersonalAllowance(income));
  const unusedBasicBand = Math.max(0, UK_CGT.basicRateBand - taxableIncome);
  const additionalFrom = UK_INCOME_TAX.bands.find(b => b.name === 'Additional')!.from;
  const band: UkIncomeBand =
    taxableIncome > additionalFrom ? 'additional' : taxableIncome > UK_CGT.basicRateBand ? 'higher' : 'basic';
  return { taxableIncome, unusedBasicBand, band };
}

export interface UKCgtResult {
  gain: number;
  annualExempt: number;
  taxableGain: number;
  basicRateTax: number;
  higherRateTax: number;
  totalTax: number;
  effectiveRate: number;
  /** Income band derived from the income entered. */
  incomeBand: UkIncomeBand;
  /** Basic rate band left after income, before the gain. */
  unusedBasicBand: number;
  /** Taxable gain charged at 18% / 24%. */
  gainAtBasicRate: number;
  gainAtHigherRate: number;
}

export function calculateUKCgt(
  purchasePrice: number,
  salePrice: number,
  annualIncome: number,
): UKCgtResult {
  const gain = salePrice - purchasePrice;
  const position = ukBandPosition(annualIncome);
  const base = {
    gain,
    annualExempt: UK_CGT.annualExempt,
    incomeBand: position.band,
    unusedBasicBand: position.unusedBasicBand,
  };
  if (gain <= 0) {
    return { ...base, taxableGain: 0, basicRateTax: 0, higherRateTax: 0, totalTax: 0, effectiveRate: 0, gainAtBasicRate: 0, gainAtHigherRate: 0 };
  }

  const taxableGain = Math.max(0, gain - UK_CGT.annualExempt);
  const gainAtBasicRate = Math.min(taxableGain, position.unusedBasicBand);
  const gainAtHigherRate = taxableGain - gainAtBasicRate;
  const basicRateTax = gainAtBasicRate * UK_CGT.basicRate;
  const higherRateTax = gainAtHigherRate * UK_CGT.higherRate;
  const totalTax = basicRateTax + higherRateTax;

  return {
    ...base,
    taxableGain,
    basicRateTax,
    higherRateTax,
    totalTax,
    effectiveRate: (totalTax / gain) * 100,
    gainAtBasicRate,
    gainAtHigherRate,
  };
}

/* -- Country tab default ----------------------------------- */
/**
 * Which tab the CGT tool opens on. A valid stored currency choice wins
 * (GBP -> UK, USD or EUR -> US); otherwise the detected region decides
 * (UK -> UK, everywhere else -> US).
 */
export function defaultCgtCountry(storedCurrency: string | null, region: Region): CgtCountry {
  if (storedCurrency === 'GBP') return 'uk';
  if (storedCurrency === 'USD' || storedCurrency === 'EUR') return 'us';
  return region === 'UK' ? 'uk' : 'us';
}

/**
 * Region whose affiliate partners suit the tab on screen: US tax content gets
 * US partners and UK tax content gets UK partners, whatever currency the
 * visitor has chosen (a GBP visitor looking at the US tab must not be offered
 * a UK-only ISA, and the reverse).
 */
export function cgtPartnerRegion(country: CgtCountry): CurrencyRegion {
  return country === 'uk' ? 'UK' : 'US';
}

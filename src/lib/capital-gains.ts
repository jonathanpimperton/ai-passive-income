/**
 * Capital Gains Tax computation — US (federal + NIIT) and UK.
 *
 * All rate/threshold DATA comes from the central rates modules
 * (us-rates.ts / uk-rates.ts). This module contains only the math.
 *
 * Model notes:
 * - US long-term: the gain stacks on top of ordinary taxable income and fills
 *   the LTCG brackets from there upward. Each slice is taxed at its bracket's
 *   rate.
 * - US short-term: the gain is taxed as ordinary income — tax is the
 *   difference between bracket tax on (income + gain) and on income alone.
 * - NIIT: 3.8% on the lesser of the gain and the excess of (income + gain)
 *   over the filing-status threshold. Taxable income is used as a MAGI proxy.
 * - UK: the annual exempt amount is deducted first; a basic-rate taxpayer's
 *   gain fills whatever basic-rate band their income hasn't used (18%), with
 *   the remainder at 24%. Higher/additional-rate taxpayers pay 24% on it all.
 */

import { US_BRACKETS, US_CAPITAL_GAINS, type FilingStatus } from './us-rates';
import { UK_CGT, UK_INCOME_TAX } from './uk-rates';

export type HoldingPeriod = 'short' | 'long';
export type UKTaxpayer = 'basic' | 'higher';

/* ── US CGT Calculation ──────────────────────────────────── */
export interface USCgtResult {
  gain: number;
  taxableGain: number;
  federalTax: number;
  niit: number;
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

export function calculateUSCgt(
  purchasePrice: number,
  salePrice: number,
  holdingPeriod: HoldingPeriod,
  filing: FilingStatus,
  taxableIncome: number,
): USCgtResult {
  const gain = salePrice - purchasePrice;
  if (gain <= 0) return { gain, taxableGain: gain, federalTax: 0, niit: 0, totalTax: 0, effectiveRate: 0, marginalRate: 0 };

  const taxableGain = gain;
  let federalTax = 0;
  let marginalRate = 0;

  if (holdingPeriod === 'short') {
    // Short-term: taxed at ordinary income rates
    // Gain stacks on top of existing taxable income
    const brackets = US_BRACKETS[filing];
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
    // Long-term: the gain occupies [taxableIncome, taxableIncome + gain] —
    // ordinary income fills the LTCG brackets first, then each slice of the
    // gain is taxed at the rate of the bracket it lands in.
    const ltBrackets = US_CAPITAL_GAINS.longTerm[filing];
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

  // Net Investment Income Tax (NIIT)
  const totalAgi = taxableIncome + gain;
  const niitThreshold = US_CAPITAL_GAINS.niit.threshold[filing];
  let niit = 0;
  if (totalAgi > niitThreshold) {
    const niitableAmount = Math.min(gain, totalAgi - niitThreshold);
    niit = niitableAmount * US_CAPITAL_GAINS.niit.rate;
  }

  const totalTax = federalTax + niit;
  const effectiveRate = gain > 0 ? (totalTax / gain) * 100 : 0;

  return { gain, taxableGain, federalTax, niit, totalTax, effectiveRate, marginalRate };
}

/* ── UK CGT Calculation ──────────────────────────────────── */
export interface UKCgtResult {
  gain: number;
  annualExempt: number;
  taxableGain: number;
  basicRateTax: number;
  higherRateTax: number;
  totalTax: number;
  effectiveRate: number;
}

export function calculateUKCgt(
  purchasePrice: number,
  salePrice: number,
  taxpayerType: UKTaxpayer,
  annualIncome: number,
): UKCgtResult {
  const gain = salePrice - purchasePrice;
  if (gain <= 0) return { gain, annualExempt: UK_CGT.annualExempt, taxableGain: 0, basicRateTax: 0, higherRateTax: 0, totalTax: 0, effectiveRate: 0 };

  const taxableGain = Math.max(0, gain - UK_CGT.annualExempt);
  let basicRateTax = 0;
  let higherRateTax = 0;

  if (taxpayerType === 'basic') {
    // Work out how much of the basic rate band is unused
    const incomeAbovePA = Math.max(0, annualIncome - UK_INCOME_TAX.personalAllowance);
    const unusedBasicBand = Math.max(0, UK_CGT.basicRateBand - incomeAbovePA);
    const gainAtBasicRate = Math.min(taxableGain, unusedBasicBand);
    const gainAtHigherRate = taxableGain - gainAtBasicRate;

    basicRateTax = gainAtBasicRate * UK_CGT.basicRate;
    higherRateTax = gainAtHigherRate * UK_CGT.higherRate;
  } else {
    // Higher/additional rate taxpayer — all gains at higher rate
    higherRateTax = taxableGain * UK_CGT.higherRate;
  }

  const totalTax = basicRateTax + higherRateTax;
  const effectiveRate = gain > 0 ? (totalTax / gain) * 100 : 0;

  return { gain, annualExempt: UK_CGT.annualExempt, taxableGain, basicRateTax, higherRateTax, totalTax, effectiveRate };
}

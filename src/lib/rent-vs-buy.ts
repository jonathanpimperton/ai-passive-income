/**
 * Rent vs buy engine -- compares END-OF-HORIZON NET WORTH on equal cash.
 *
 * The model (PR-1; fixes MATH-US-01/13, MTH-01/14):
 * - Both households start with the same cash: the down payment plus the
 *   buyer's closing costs. The buyer spends it on the purchase; the renter
 *   invests all of it.
 * - Every month each household pays for housing. Whichever path is cheaper
 *   that month invests the difference, so both spend the same total each
 *   month. (The old model only let the renter invest and counted the
 *   down payment twice, biasing the verdict toward renting.)
 * - Buyer net worth at year N = home value x (1 - selling costs) - loan
 *   balance + the buyer's portfolio. Renter net worth = the renter's portfolio.
 *   The verdict is the difference. Identical cash flows give exactly 0.
 * - US only: mortgage interest (plus property tax, up to the SALT cap) saves
 *   tax only to the extent itemising beats the standard deduction for the
 *   chosen filing status. The UK abolished mortgage interest relief in 2000
 *   and euro-area rules vary, so no relief is modelled outside the US.
 *
 * Simplifications (stated in the UI and methodology): fixed-rate loan;
 * property tax and maintenance are a % of the purchase price; insurance,
 * HOA and renters insurance are flat; returns compound monthly at
 * annual% / 12; no capital gains tax on either side (US home sale exclusion
 * / UK principal residence relief; investments assumed tax-sheltered); the
 * standard deduction is held at today's amount; no PMI.
 */

import { monthlyPayment } from './mortgage-payment';
import type { RateRegion } from './market-rates';
import { US_STANDARD_DEDUCTION, type FilingStatus } from './us-rates';

export type { FilingStatus };

/**
 * State and local tax (SALT) deduction cap for 2026: $40,400
 * (26 U.S.C. 164(b)(7)(A), as amended by Public Law 119-21;
 * https://www.law.cornell.edu/uscode/text/26/164, accessed 2026-11-12).
 * The income-based phase-down above $505,000 MAGI is not modelled.
 */
export const US_SALT_CAP_2026 = 40_400;

export interface RentVsBuyInputs {
  homePrice: number;
  /** Down payment as % of price (0-100) */
  downPaymentPct: number;
  /** Annual mortgage rate, % */
  mortgageRate: number;
  loanTermYears: number;
  /** Buyer's purchase costs (closing costs / stamp duty and fees), % of price */
  closingCostPct: number;
  /** Costs of selling at the end of the horizon (agent, legal), % of the sale price */
  sellingCostPct: number;
  /** Annual property tax / charges, % of the purchase price */
  propertyTaxRate: number;
  /** Annual home insurance */
  homeInsurance: number;
  hoaMonthly: number;
  /** Annual maintenance, % of the purchase price */
  maintenanceRate: number;
  /** Annual home price growth, % */
  homeAppreciation: number;
  monthlyRent: number;
  /** Annual rent increase, %, applied at the end of each year */
  rentIncrease: number;
  /** Monthly renters insurance */
  rentersInsurance: number;
  /** Annual return on invested cash, %, compounded monthly */
  investmentReturn: number;
  /** Years to compare (whole years) */
  timeHorizon: number;
  region: RateRegion;
  /** US only: combined federal + state marginal rate on deductions, % */
  marginalTaxRate: number;
  /** US only: filing status (sets the standard deduction) */
  filingStatus: FilingStatus;
  /** US only: itemisable deductions the household has anyway (e.g. charity), per year */
  otherItemizedDeductions: number;
}

export interface RentVsBuyYear {
  year: number;
  homeValue: number;
  loanBalance: number;
  /** Selling costs if the home were sold at the end of this year */
  saleCosts: number;
  buyerPortfolio: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  /** buyerNetWorth - renterNetWorth (positive = buying ahead) */
  advantage: number;
  /** Tax saved from itemising this year (US only) */
  taxSaving: number;
}

export interface RentVsBuyResult {
  years: RentVsBuyYear[];
  verdict: 'buy' | 'rent' | 'tie';
  /** |final advantage| */
  difference: number;
  /** Final buyer minus renter net worth */
  advantage: number;
  /**
   * First year from which buying stays ahead to the end of the horizon;
   * null when renting is ahead at the end. 1 means ahead from the start.
   */
  breakEvenYear: number | null;
  downPayment: number;
  closingCosts: number;
  /** Cash both households start with */
  initialCash: number;
  loanAmount: number;
  /** Scheduled principal and interest */
  monthlyMortgage: number;
  /** First month: P&I + property tax + insurance + HOA + maintenance (before any tax saving) */
  monthlyOwnershipCost: number;
  firstMonthRentCost: number;
  totalTaxSaving: number;
  totalInterest: number;
  totalRentPaid: number;
  finalHomeValue: number;
  finalEquity: number;
  finalBuyerNetWorth: number;
  finalRenterNetWorth: number;
}

const num = (v: number) => (Number.isFinite(v) ? v : 0);
const nonNeg = (v: number) => Math.max(0, num(v));

/**
 * Tax saved in one year by itemising, versus the better of the standard
 * deduction and the household's other itemised deductions:
 *   rate x ( max(std, other + interest + min(propertyTax, SALT cap)) - max(std, other) )
 */
export function itemizedTaxSaving(params: {
  interest: number;
  propertyTax: number;
  otherItemized: number;
  standardDeduction: number;
  marginalRatePct: number;
  saltCap?: number;
}): number {
  const salt = Math.min(nonNeg(params.propertyTax), params.saltCap ?? US_SALT_CAP_2026);
  const other = nonNeg(params.otherItemized);
  const std = nonNeg(params.standardDeduction);
  const withHome = Math.max(std, other + nonNeg(params.interest) + salt);
  const without = Math.max(std, other);
  return (nonNeg(params.marginalRatePct) / 100) * (withHome - without);
}

/** Interest paid in each loan year (index 0 = year 1), for the deduction test. */
function interestByYear(loan: number, ratePct: number, termMonths: number, pmt: number, years: number): number[] {
  const r = ratePct > 0 ? ratePct / 1200 : 0;
  const out: number[] = [];
  let bal = loan;
  for (let y = 0; y < years; y++) {
    let interest = 0;
    for (let m = 0; m < 12; m++) {
      if (bal <= 0) break;
      const i = bal * r;
      const pay = Math.min(pmt, bal + i);
      bal = Math.max(0, bal - (pay - i));
      interest += i;
    }
    out.push(interest);
  }
  return out;
}

export function simulateRentVsBuy(input: RentVsBuyInputs): RentVsBuyResult {
  const price = nonNeg(input.homePrice);
  const downPct = Math.min(100, nonNeg(input.downPaymentPct));
  const downPayment = price * (downPct / 100);
  const closingCosts = price * (nonNeg(input.closingCostPct) / 100);
  const initialCash = downPayment + closingCosts;
  const loanAmount = price - downPayment;
  const termMonths = Math.round(nonNeg(input.loanTermYears) * 12);
  const horizon = Math.max(1, Math.round(nonNeg(input.timeHorizon)));
  const rateM = input.mortgageRate > 0 ? input.mortgageRate / 1200 : 0;
  const pmt = monthlyPayment(loanAmount, input.mortgageRate, termMonths);
  const investM = num(input.investmentReturn) / 1200;
  const growth = num(input.homeAppreciation) / 100;
  const sellPct = nonNeg(input.sellingCostPct) / 100;

  const monthlyPropertyTax = (price * (nonNeg(input.propertyTaxRate) / 100)) / 12;
  const monthlyInsurance = nonNeg(input.homeInsurance) / 12;
  const monthlyMaintenance = (price * (nonNeg(input.maintenanceRate) / 100)) / 12;
  const hoa = nonNeg(input.hoaMonthly);
  const rentersIns = nonNeg(input.rentersInsurance);
  const fixedOwnership = monthlyPropertyTax + monthlyInsurance + monthlyMaintenance + hoa;

  // US: annual tax saving from itemising, per year of the horizon.
  const isUS = input.region === 'us';
  const yearlyInterest = interestByYear(loanAmount, input.mortgageRate, termMonths, pmt, horizon);
  const standardDeduction = US_STANDARD_DEDUCTION[input.filingStatus] ?? US_STANDARD_DEDUCTION.single;
  const yearlyTaxSaving = yearlyInterest.map((interest) =>
    isUS
      ? itemizedTaxSaving({
          interest,
          propertyTax: monthlyPropertyTax * 12,
          otherItemized: input.otherItemizedDeductions,
          standardDeduction,
          marginalRatePct: input.marginalTaxRate,
        })
      : 0,
  );

  let balance = loanAmount;
  let rent = nonNeg(input.monthlyRent);
  let buyerPortfolio = 0;
  let renterPortfolio = initialCash;
  let totalInterest = 0;
  let totalRentPaid = 0;
  const years: RentVsBuyYear[] = [];

  for (let y = 1; y <= horizon; y++) {
    const monthlyTaxSaving = yearlyTaxSaving[y - 1] / 12;
    for (let m = 1; m <= 12; m++) {
      let payment = 0;
      if (balance > 0) {
        const interest = balance * rateM;
        payment = Math.min(pmt, balance + interest);
        balance = Math.max(0, balance - (payment - interest));
        if (balance < 0.005) balance = 0;
        totalInterest += interest;
      }
      const buyCost = payment + fixedOwnership - monthlyTaxSaving;
      const rentCost = rent + rentersIns;
      totalRentPaid += rentCost;
      const diff = buyCost - rentCost;
      if (diff > 0) renterPortfolio += diff;
      else buyerPortfolio -= diff;
      renterPortfolio *= 1 + investM;
      buyerPortfolio *= 1 + investM;
    }
    rent *= 1 + num(input.rentIncrease) / 100;

    const homeValue = price * Math.pow(1 + growth, y);
    const saleCosts = homeValue * sellPct;
    const buyerNetWorth = homeValue - saleCosts - balance + buyerPortfolio;
    years.push({
      year: y,
      homeValue,
      loanBalance: balance,
      saleCosts,
      buyerPortfolio,
      buyerNetWorth,
      renterNetWorth: renterPortfolio,
      advantage: buyerNetWorth - renterPortfolio,
      taxSaving: yearlyTaxSaving[y - 1],
    });
  }

  const last = years[years.length - 1];
  // Ties within half a currency unit read as a tie, not a win.
  const verdict: RentVsBuyResult['verdict'] = Math.abs(last.advantage) < 0.5 ? 'tie' : last.advantage > 0 ? 'buy' : 'rent';

  let breakEvenYear: number | null = null;
  if (verdict === 'buy') {
    breakEvenYear = 1;
    for (let i = years.length - 1; i >= 0; i--) {
      if (years[i].advantage < 0) {
        breakEvenYear = years[i].year + 1;
        break;
      }
    }
  }

  return {
    years,
    verdict,
    difference: Math.abs(last.advantage),
    advantage: last.advantage,
    breakEvenYear,
    downPayment,
    closingCosts,
    initialCash,
    loanAmount,
    monthlyMortgage: pmt,
    monthlyOwnershipCost: (loanAmount > 0 ? pmt : 0) + fixedOwnership,
    firstMonthRentCost: nonNeg(input.monthlyRent) + rentersIns,
    totalTaxSaving: yearlyTaxSaving.reduce((s, v) => s + v, 0),
    totalInterest,
    totalRentPaid,
    finalHomeValue: last.homeValue,
    finalEquity: last.homeValue - last.loanBalance,
    finalBuyerNetWorth: last.buyerNetWorth,
    finalRenterNetWorth: last.renterNetWorth,
  };
}

/**
 * Region-appropriate transaction-cost defaults, % of price.
 * US: Freddie Mac -- buyers "should be prepared to pay between 2% and 5% of
 * the home purchase price in closing fees"
 * (https://myhome.freddiemac.com/blog/homebuying/what-are-closing-costs-and-how-much-will-i-pay);
 * sellers' agent commission "typically ranges from 3% to 8% of the home's sale
 * price" (https://myhome.freddiemac.com/selling/costs-of-selling), both
 * accessed 2026-11-12. We use 3% and 6%.
 * UK and euro area: buying and selling costs vary too much by price and
 * country (stamp duty, notary, transfer tax) for one honest default, so they
 * start at 0 and the UI asks the user to add theirs.
 */
export const TRANSACTION_COST_DEFAULTS: Record<RateRegion, { closingCostPct: number; sellingCostPct: number }> = {
  us: { closingCostPct: 3, sellingCostPct: 6 },
  uk: { closingCostPct: 0, sellingCostPct: 0 },
  eur: { closingCostPct: 0, sellingCostPct: 0 },
};

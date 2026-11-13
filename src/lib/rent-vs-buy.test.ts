import { describe, it, expect } from 'vitest';
import {
  TRANSACTION_COST_DEFAULTS,
  US_SALT_CAP_2026,
  excludedCostsNote,
  itemizedTaxSaving,
  laterBreakEvenYear,
  simulateRentVsBuy,
  type RentVsBuyInputs,
} from './rent-vs-buy';
import { US_STANDARD_DEDUCTION } from './us-rates';

/** The calculator's previous defaults -- also the review's reference inputs. */
const REVIEW: RentVsBuyInputs = {
  homePrice: 350_000,
  downPaymentPct: 20,
  mortgageRate: 6.5,
  loanTermYears: 30,
  closingCostPct: 0,
  sellingCostPct: 0,
  propertyTaxRate: 1.2,
  homeInsurance: 1_500,
  hoaMonthly: 0,
  maintenanceRate: 1,
  homeAppreciation: 3,
  monthlyRent: 1_800,
  rentIncrease: 3,
  rentersInsurance: 15,
  investmentReturn: 7,
  timeHorizon: 10,
  region: 'us',
  marginalTaxRate: 22,
  filingStatus: 'single',
  otherItemizedDeductions: 0,
};

/**
 * Independent "spreadsheet" implementation (test-only). Built a different
 * way from the library: one row per month of cash flows, then the net-worth
 * gap from the ledger identity
 *   buyerNW - renterNW = saleProceeds - balance
 *                        - initialCash x (1+i)^N - sum(diff_m x (1+i)^(N-m+1))
 * where diff_m = buyer's cost - renter's cost in month m. No branching on
 * which household invests -- symmetric investing falls out of the algebra.
 */
function spreadsheetAdvantage(p: RentVsBuyInputs): number {
  const dp = (p.homePrice * p.downPaymentPct) / 100;
  const cash0 = dp + (p.homePrice * p.closingCostPct) / 100;
  const L = p.homePrice - dp;
  const n = p.loanTermYears * 12;
  const r = p.mortgageRate / 1200;
  const pmt = L <= 0 ? 0 : r === 0 ? L / n : (L * r) / (1 - (1 + r) ** -n);
  const i = p.investmentReturn / 1200;
  const N = p.timeHorizon * 12;

  // Pass 1: the loan ledger, month by month.
  const rows: { pay: number; interest: number; bal: number }[] = [];
  let bal = L;
  for (let m = 1; m <= N; m++) {
    const interest = bal > 0 ? bal * r : 0;
    const pay = bal > 0 ? Math.min(pmt, bal + interest) : 0;
    bal = Math.max(0, bal - (pay - interest));
    if (bal < 0.005) bal = 0;
    rows.push({ pay, interest, bal });
  }
  // Pass 2: yearly deduction test (US) from the ledger's interest column.
  const std = US_STANDARD_DEDUCTION[p.filingStatus];
  const yearSaving: number[] = [];
  for (let y = 0; y < p.timeHorizon; y++) {
    const interest = rows.slice(y * 12, y * 12 + 12).reduce((s, x) => s + x.interest, 0);
    const ptax = (p.homePrice * p.propertyTaxRate) / 100;
    const sit = p.stateLocalIncomeTax ?? 0;
    const itemized = p.otherItemizedDeductions + interest + Math.min(ptax + sit, 40_400);
    const baseline = p.otherItemizedDeductions + Math.min(sit, 40_400);
    const saving = p.region === 'us'
      ? (p.marginalTaxRate / 100) * (Math.max(std, itemized) - Math.max(std, baseline))
      : 0;
    yearSaving.push(saving);
  }
  // Pass 3: future value of each month's cost difference.
  let fvDiffs = 0;
  for (let m = 1; m <= N; m++) {
    const y = Math.floor((m - 1) / 12);
    const rent = p.monthlyRent * (1 + p.rentIncrease / 100) ** y + p.rentersInsurance;
    const own =
      rows[m - 1].pay +
      (p.homePrice * (p.propertyTaxRate + p.maintenanceRate)) / 1200 +
      p.homeInsurance / 12 +
      p.hoaMonthly -
      yearSaving[y] / 12;
    fvDiffs += (own - rent) * (1 + i) ** (N - m + 1);
  }
  const value = p.homePrice * (1 + p.homeAppreciation / 100) ** p.timeHorizon;
  return value * (1 - p.sellingCostPct / 100) - rows[N - 1].bal - cash0 * (1 + i) ** N - fvDiffs;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('external worked examples (Nov 2026 review, MATH-US rvb.mjs)', () => {
  it('UK defaults (25-year term, no relief, no transaction costs): buy ahead by $5,870', () => {
    const r = simulateRentVsBuy({ ...REVIEW, region: 'uk', loanTermYears: 25 });
    expect(Math.round(r.finalBuyerNetWorth)).toBe(253_339);
    expect(Math.round(r.finalRenterNetWorth)).toBe(247_469);
    expect(r.verdict).toBe('buy');
    expect(Math.round(r.difference)).toBe(5_870);
  });

  it('0% down, 0% rate, rent equal to the payment: buyer ahead by the principal repaid', () => {
    const r = simulateRentVsBuy({
      ...REVIEW,
      region: 'uk',
      downPaymentPct: 0,
      mortgageRate: 0,
      propertyTaxRate: 0,
      homeInsurance: 0,
      maintenanceRate: 0,
      homeAppreciation: 0,
      monthlyRent: 350_000 / 360,
      rentersInsurance: 0,
      rentIncrease: 0,
      investmentReturn: 0,
    });
    expect(Math.round(r.finalBuyerNetWorth)).toBe(116_667);
    expect(Math.round(r.finalRenterNetWorth)).toBe(0);
  });

  it('itemising test: 10-year tax saving $11,165 single, $0 married (MATH-US-13)', () => {
    const single = simulateRentVsBuy(REVIEW);
    expect(Math.round(single.totalTaxSaving)).toBe(11_165);
    const married = simulateRentVsBuy({ ...REVIEW, filingStatus: 'married' });
    expect(married.totalTaxSaving).toBe(0);
  });
});

describe('invariants', () => {
  it('identical paths give exactly 0 (100% cash, rent = running costs, no growth)', () => {
    const r = simulateRentVsBuy({
      ...REVIEW,
      region: 'uk',
      downPaymentPct: 100,
      homeAppreciation: 0,
      investmentReturn: 0,
      rentIncrease: 0,
      // rent + renters insurance equals tax + insurance + maintenance
      monthlyRent: (350_000 * 0.012) / 12 + 1_500 / 12 + (350_000 * 0.01) / 12 - 15,
    });
    expect(Math.abs(r.advantage)).toBeLessThan(1e-6);
    expect(r.verdict).toBe('tie');
  });

  it('all-zero costs with 100% cash: both households hold the home value (old tool said "rent saves $350,000")', () => {
    const r = simulateRentVsBuy({
      ...REVIEW,
      downPaymentPct: 100,
      propertyTaxRate: 0,
      homeInsurance: 0,
      maintenanceRate: 0,
      homeAppreciation: 0,
      monthlyRent: 0,
      rentersInsurance: 0,
      investmentReturn: 0,
    });
    expect(r.advantage).toBe(0);
    expect(r.verdict).toBe('tie');
  });

  it('the down payment is counted once: raising it with equal returns changes nothing at 0% rates', () => {
    const p = { ...REVIEW, region: 'uk' as const, mortgageRate: 0, investmentReturn: 0, homeAppreciation: 0 };
    const a = simulateRentVsBuy({ ...p, downPaymentPct: 10 }).advantage;
    const b = simulateRentVsBuy({ ...p, downPaymentPct: 40 }).advantage;
    expect(a).toBeCloseTo(b, 6);
  });

  it('monotone: higher rent helps buying; higher rate or price hurts it', () => {
    let prev = -Infinity;
    for (let rent = 500; rent <= 5_000; rent += 100) {
      const v = simulateRentVsBuy({ ...REVIEW, monthlyRent: rent }).advantage;
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    prev = Infinity;
    for (let rate = 2; rate <= 12; rate += 0.25) {
      const v = simulateRentVsBuy({ ...REVIEW, mortgageRate: rate }).advantage;
      expect(v).toBeLessThan(prev);
      prev = v;
    }
    prev = Infinity;
    for (let price = 100_000; price <= 1_500_000; price += 25_000) {
      const v = simulateRentVsBuy({ ...REVIEW, homePrice: price }).advantage;
      expect(v).toBeLessThan(prev);
      prev = v;
    }
  });

  it('transaction costs only ever hurt buying', () => {
    const none = simulateRentVsBuy(REVIEW).advantage;
    const closing = simulateRentVsBuy({ ...REVIEW, closingCostPct: 3 }).advantage;
    const selling = simulateRentVsBuy({ ...REVIEW, sellingCostPct: 6 }).advantage;
    expect(closing).toBeLessThan(none);
    expect(selling).toBeLessThan(none);
  });

  it('no mortgage-interest relief outside the US', () => {
    for (const region of ['uk', 'eur'] as const) {
      const r = simulateRentVsBuy({ ...REVIEW, region, marginalTaxRate: 50 });
      expect(r.totalTaxSaving).toBe(0);
    }
  });

  it('break-even year: the first year buying stays ahead', () => {
    const r = simulateRentVsBuy({ ...REVIEW, ...TRANSACTION_COST_DEFAULTS.us, timeHorizon: 30 });
    expect(r.verdict).toBe('buy');
    expect(r.breakEvenYear).not.toBeNull();
    const be = r.breakEvenYear!;
    for (const y of r.years) {
      if (y.year >= be) expect(y.advantage).toBeGreaterThanOrEqual(0);
    }
    if (be > 1) expect(r.years[be - 2].advantage).toBeLessThan(0);
    // Renting ahead at the end -> no break-even.
    const rent = simulateRentVsBuy({ ...REVIEW, monthlyRent: 800 });
    expect(rent.verdict).toBe('rent');
    expect(rent.breakEvenYear).toBeNull();
  });

  it('yearly rows are complete and finite', () => {
    const r = simulateRentVsBuy({ ...REVIEW, timeHorizon: 30, homeAppreciation: -5, downPaymentPct: 0 });
    expect(r.years).toHaveLength(30);
    for (const y of r.years) {
      for (const v of Object.values(y)) expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('itemizedTaxSaving', () => {
  it('is zero below the standard deduction and linear above it', () => {
    const std = 16_100;
    expect(itemizedTaxSaving({ interest: 5_000, propertyTax: 4_000, otherItemized: 0, standardDeduction: std, marginalRatePct: 22 })).toBe(0);
    expect(itemizedTaxSaving({ interest: 20_000, propertyTax: 4_000, otherItemized: 0, standardDeduction: std, marginalRatePct: 22 })).toBeCloseTo(0.22 * 7_900, 9);
  });

  it('counts only the increase over deductions the household itemises anyway', () => {
    const v = itemizedTaxSaving({ interest: 10_000, propertyTax: 0, otherItemized: 20_000, standardDeduction: 16_100, marginalRatePct: 24 });
    expect(v).toBeCloseTo(0.24 * 10_000, 9);
  });

  it('caps property tax at the SALT cap', () => {
    const v = itemizedTaxSaving({ interest: 0, propertyTax: 100_000, otherItemized: 0, standardDeduction: 0, marginalRatePct: 10 });
    expect(v).toBeCloseTo(0.1 * US_SALT_CAP_2026, 9);
  });

  it('property tax shares the SALT cap with state income tax', () => {
    // $38,000 state income tax already uses most of the $40,400 cap: only
    // $2,400 of a $6,000 property tax bill adds to the deduction.
    const v = itemizedTaxSaving({ interest: 0, propertyTax: 6_000, otherItemized: 0, stateIncomeTax: 38_000, standardDeduction: 16_100, marginalRatePct: 24 });
    expect(v).toBeCloseTo(0.24 * 2_400, 9);
  });

  it('a household that itemises anyway (state tax over the standard deduction) deducts all mortgage interest', () => {
    const v = itemizedTaxSaving({ interest: 18_000, propertyTax: 3_500, otherItemized: 0, stateIncomeTax: 20_000, standardDeduction: 16_100, marginalRatePct: 22 });
    expect(v).toBeCloseTo(0.22 * (18_000 + 3_500), 9);
  });
});

describe('laterBreakEvenYear (renting ahead now, buying later)', () => {
  it('reports the year buying would pull ahead when renting wins at the horizon', () => {
    const p = { ...REVIEW, ...TRANSACTION_COST_DEFAULTS.us, mortgageRate: 7.11, propertyTaxRate: 1, homeInsurance: 1_800 };
    expect(simulateRentVsBuy(p).verdict).toBe('rent');
    const later = laterBreakEvenYear(p);
    expect(later).not.toBeNull();
    expect(later!).toBeGreaterThan(p.timeHorizon);
    // It is the break-even of a stay of that length: buying ahead from that year on.
    const long = simulateRentVsBuy({ ...p, timeHorizon: 50 });
    expect(long.years[later! - 1].advantage).toBeGreaterThanOrEqual(0);
    expect(long.years[later! - 2].advantage).toBeLessThan(0);
  });

  it('null when buying already wins, or never catches up within 50 years', () => {
    expect(laterBreakEvenYear({ ...REVIEW, monthlyRent: 3_000 })).toBeNull();
    expect(laterBreakEvenYear({ ...REVIEW, monthlyRent: 600, rentIncrease: 0, homeAppreciation: -2 })).toBeNull();
  });
});

describe('excludedCostsNote', () => {
  it('null when both costs are set', () => {
    expect(excludedCostsNote('us', 3, 6)).toBeNull();
  });
  it('names both when both are 0, in regional words', () => {
    const n = excludedCostsNote('uk', 0, 0)!;
    expect(n.label).toBe('Buying and selling costs');
    expect(n.text).toMatch(/stamp duty/);
    expect(n.text).toMatch(/estate agent/);
  });
  it('names only the missing one', () => {
    expect(excludedCostsNote('uk', 2, 0)!.label).toBe('Selling costs');
    expect(excludedCostsNote('uk', 2, 0)!.text).not.toMatch(/stamp duty/);
    expect(excludedCostsNote('eur', 0, 1.5)!.label).toBe('Buying costs');
    expect(excludedCostsNote('eur', 0, 1.5)!.text).toMatch(/transfer tax/);
  });
});

describe('agreement with the independent spreadsheet implementation', () => {
  it('defaults (US, with and without transaction costs)', () => {
    for (const p of [REVIEW, { ...REVIEW, ...TRANSACTION_COST_DEFAULTS.us }]) {
      expect(simulateRentVsBuy(p).advantage).toBeCloseTo(spreadsheetAdvantage(p), 4);
    }
  });

  it('20,000 random cases agree (all regions, filing statuses, costs)', () => {
    const rand = rng(7_2026);
    const between = (a: number, b: number) => a + rand() * (b - a);
    const statuses = ['single', 'married', 'head'] as const;
    const regions = ['us', 'uk', 'eur'] as const;
    let worstRel = 0;
    for (let k = 0; k < 20_000; k++) {
      const p: RentVsBuyInputs = {
        homePrice: Math.round(between(50_000, 2_000_000)),
        downPaymentPct: Math.round(between(0, 100)),
        mortgageRate: +between(0, 12).toFixed(3),
        loanTermYears: Math.round(between(10, 35)),
        closingCostPct: +between(0, 8).toFixed(1),
        sellingCostPct: +between(0, 8).toFixed(1),
        propertyTaxRate: +between(0, 5).toFixed(1),
        homeInsurance: Math.round(between(0, 10_000)),
        hoaMonthly: Math.round(between(0, 2_000)),
        maintenanceRate: +between(0, 3).toFixed(1),
        homeAppreciation: +between(-5, 10).toFixed(1),
        monthlyRent: Math.round(between(300, 15_000)),
        rentIncrease: +between(0, 10).toFixed(1),
        rentersInsurance: Math.round(between(0, 100)),
        investmentReturn: +between(0, 15).toFixed(1),
        timeHorizon: Math.round(between(1, 30)),
        region: regions[k % 3],
        marginalTaxRate: Math.round(between(0, 55)),
        filingStatus: statuses[k % 3],
        otherItemizedDeductions: k % 4 === 0 ? Math.round(between(0, 60_000)) : 0,
        stateLocalIncomeTax: k % 5 === 0 ? Math.round(between(0, 60_000)) : 0,
      };
      const lib = simulateRentVsBuy(p).advantage;
      const ref = spreadsheetAdvantage(p);
      const rel = Math.abs(lib - ref) / Math.max(1, Math.abs(ref));
      worstRel = Math.max(worstRel, rel);
      expect(Number.isFinite(lib)).toBe(true);
    }
    expect(worstRel).toBeLessThan(1e-9);
  });
});

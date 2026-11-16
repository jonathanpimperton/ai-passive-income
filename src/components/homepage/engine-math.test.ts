import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calcFederalTax, calcFICA, computeUsSalary } from '../../lib/us-tax-calc';
import { calcIncomeTax, calcNI, calculateUkTakeHome } from '../../lib/uk-tax-calc';
import { US_TAX_YEARS } from '../../lib/us-rates';
import { AFFORDABILITY_DEFAULTS, solveAffordability, estimateUkTakeHome } from '../../lib/mortgage-affordability';
import { defaultMortgageRate } from '../../lib/market-rates';
import {
  US_YEAR_SESSION_KEY,
  engineAffordability,
  engineMortgageRate,
  mortgageCurrency,
  mortgageRegionForCurrency,
  pensionWithBasicRelief,
  preferredUsYear,
  regionForCurrency,
  takeHomeUk,
  takeHomeUs,
} from './engine-math';

const SALARIES = [20_000, 45_000, 75_000, 85_000, 100_000, 176_100, 250_000, 500_000];

describe('takeHomeUs: the US Salary calculator with no state tax, 401(k) or overtime', () => {
  for (const year of US_TAX_YEARS) {
    it(`matches the hub-table model (calcFederalTax + calcFICA) in ${year}`, () => {
      for (const salary of SALARIES) {
        const r = takeHomeUs(salary, year);
        const expected = salary - calcFederalTax(salary, 'single', year) - calcFICA(salary, 'single', year).total;
        expect(r.netAnnual).toBeCloseTo(expected, 6);
        expect(r.totalDeductions).toBeCloseTo(salary - expected, 6);
      }
    });
  }

  it('equals the tool at its own defaults except state tax (0)', () => {
    // SalaryCalc BASE_DEFAULTS: annual mode, 40 h x 52 w, no overtime, single, 0% 401(k), no seniors.
    for (const year of US_TAX_YEARS) {
      for (const salary of SALARIES) {
        const tool = computeUsSalary({
          year, mode: 'annual', salary, hourlyRate: 36, hoursPerWeek: 40, weeksPerYear: 52,
          overtimeHours: 0, overtimeQualifies: true, stateTaxRate: 0, filingStatus: 'single',
          retirement401kPct: 0, seniors: 0,
        });
        expect(takeHomeUs(salary, year).netAnnual).toBe(tool.netAnnual);
      }
    }
  });

  it('monthly is annual / 12 from the same result', () => {
    const r = takeHomeUs(100_000, US_TAX_YEARS[0]);
    expect(r.netMonthly).toBe(r.netAnnual / 12);
  });
});

describe('takeHomeUk: the UK Salary calculator with no pension or student loan', () => {
  it('equals the old homepage model (tax + NI) at every salary the slider offers', () => {
    for (let salary = 15_000; salary <= 250_000; salary += 500) {
      const r = takeHomeUk(salary);
      expect(r.netAnnual).toBeCloseTo(salary - calcIncomeTax(salary) - calcNI(salary), 6);
    }
  });

  it('equals the tool at its defaults except pension (0%)', () => {
    // SalaryUkCalc DEFAULTS: not Scottish, blank code, no loan, % mode.
    const tool = calculateUkTakeHome({
      salary: 45_000, scottish: false, taxCode: '', studentLoan: 'none',
      pensionMode: 'percent', pensionPercent: 0, pensionAmount: 0, pensionMethod: 'netPay',
    });
    const r = takeHomeUk(45_000);
    expect(r.netAnnual).toBe(tool.netAnnual);
    expect(r.netMonthly).toBe(tool.netMonthly);
    expect(r.netMonthly).toBe(r.netAnnual / 12);
  });
});

describe('engineAffordability: the tool solver with the tool defaults (MATH-US-07)', () => {
  const D = AFFORDABILITY_DEFAULTS;

  it('US: equals solveAffordability at the tool defaults and the market rate, not 6.75%', () => {
    const home = engineAffordability('US', D.annualIncome, D.deposit);
    const tool = solveAffordability({
      region: 'us', annualIncome: D.annualIncome, monthlyDebts: D.monthlyDebts, deposit: D.deposit,
      ratePct: defaultMortgageRate('us', 30), termYears: 30,
      propertyTaxRate: D.propertyTaxRate, insuranceAnnual: D.insuranceAnnual, hoaMonthly: D.hoaMonthly,
      pmiRate: D.pmiRate, frontEndPct: D.frontEndPct, backEndPct: D.backEndPct,
    });
    expect(home.maxPrice).toBe(tool.maxPrice);
    expect(home.maxLoan).toBe(tool.maxLoan);
    expect(engineMortgageRate('US')).toBe(defaultMortgageRate('us', 30));
    expect(engineMortgageRate('US')).not.toBe(6.75);
  });

  it('US: no longer spends 36% of gross on loan payments alone (old homepage showed $396,902)', () => {
    const home = engineAffordability('US', 75_000, 50_000);
    expect(home.status).toBe('ok');
    expect(home.maxPrice).toBeLessThan(396_902);
    // Whole housing payment (P&I + tax + insurance + PMI) stays inside the 28% front-end limit.
    expect(home.totalMonthly).toBeLessThanOrEqual((75_000 / 12) * 0.28 + 1e-6);
  });

  it('UK: equals the tool, including its whole-pound take-home estimate', () => {
    const home = engineAffordability('UK', D.annualIncome, D.deposit);
    const tool = solveAffordability({
      region: 'uk', annualIncome: D.annualIncome, monthlyDebts: D.ukMonthlyDebts, deposit: D.deposit,
      ratePct: defaultMortgageRate('uk', 25), termYears: 25,
      monthlyTakeHome: Math.round(estimateUkTakeHome(D.annualIncome)),
      ltiCap: D.ltiCap, stressMarginPct: D.stressMarginPct, maxShareOfTakeHomePct: D.maxShareOfTakeHomePct,
    });
    expect(home.maxPrice).toBe(tool.maxPrice);
    expect(home.region).toBe('uk');
    expect(engineMortgageRate('UK')).toBe(defaultMortgageRate('uk', 25));
  });

  it('EUR: equals the tool in euro mode (25 years, ECB rate, 36% limit, 500 debts), not the US model', () => {
    const home = engineAffordability('EUR', D.annualIncome, D.deposit);
    const tool = solveAffordability({
      region: 'eur', annualIncome: D.annualIncome, monthlyDebts: D.monthlyDebts, deposit: D.deposit,
      ratePct: defaultMortgageRate('eur', 25), termYears: 25, maxDebtServicePct: D.eurMaxDebtServicePct,
    });
    expect(home.region).toBe('eur');
    expect(home.maxPrice).toBe(tool.maxPrice);
    expect(engineMortgageRate('EUR')).toBe(defaultMortgageRate('eur', 25));
    // The review's repro: the US model gave $248,840 for these inputs; the euro tool gives a different answer.
    expect(home.maxPrice).not.toBe(engineAffordability('US', D.annualIncome, D.deposit).maxPrice);
  });
});

describe('mortgage region for a display currency', () => {
  it('maps like the full tool: GBP uk, EUR eur, everything else us', () => {
    expect(mortgageRegionForCurrency('GBP')).toBe('UK');
    expect(mortgageRegionForCurrency('EUR')).toBe('EUR');
    expect(mortgageRegionForCurrency('USD')).toBe('US');
    expect(mortgageCurrency('UK')).toBe('GBP');
    expect(mortgageCurrency('EUR')).toBe('EUR');
    expect(mortgageCurrency('US')).toBe('USD');
  });
});

describe('preferredUsYear: the rule SalaryCalc uses after hydration', () => {
  it('a stored year (the visitor picked it on the salary calculator) wins', () => {
    expect(preferredUsYear('2027', new Date(2026, 10, 15))).toBe(2027);
    expect(preferredUsYear('2026', new Date(2027, 0, 2))).toBe(2026);
  });

  it('otherwise the default year for the date: a December build served in January shows the new year', () => {
    expect(preferredUsYear(null, new Date(2026, 11, 31, 12))).toBe(2026);
    expect(preferredUsYear(null, new Date(2027, 0, 2, 12))).toBe(2027);
  });

  it('ignores anything that is not a year with data', () => {
    expect(preferredUsYear('1999', new Date(2026, 10, 15))).toBe(2026);
    expect(preferredUsYear('abc', new Date(2026, 10, 15))).toBe(2026);
    expect(preferredUsYear('', new Date(2026, 10, 15))).toBe(2026);
  });

  it('uses the same session key as the US Salary calculator', () => {
    const src = readFileSync(new URL('../tools/SalaryCalc.tsx', import.meta.url), 'utf8');
    const m = /const YEAR_KEY = '([^']+)'/.exec(src);
    expect(m?.[1]).toBe(US_YEAR_SESSION_KEY);
  });
});

describe('pensionWithBasicRelief (MATH-UK-18)', () => {
  it('turns a 100 payment into 125 with 20% basic-rate relief', () => {
    expect(pensionWithBasicRelief(100)).toBeCloseTo(125, 10);
  });
});

describe('regionForCurrency', () => {
  it('shows the UK model for GBP and the US model for everything else', () => {
    expect(regionForCurrency('GBP')).toBe('UK');
    expect(regionForCurrency('USD')).toBe('US');
    expect(regionForCurrency('EUR')).toBe('US');
  });
});

/**
 * Cross-checks the pure tax libs against the authoritative, independently
 * computed take-home tables:
 * - docs/tax-values-2026.json: UK 2026/27 (rUK standard bands) and US TY2026
 *   single filer (hand-verified, July 2026);
 * - docs/tax-values-2027.json: US TY2027 single, married filing jointly and
 *   head of household, computed from the Rev. Proc. 2026-35 rate-table form
 *   with no code shared with src/lib.
 * The hub pages compute their tables from these libs at build time, so this
 * test is what keeps every hub figure honest. US years are passed explicitly,
 * so the test means the same thing before and after 1 January.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calcSimpleIncomeTax, calcNI, calcStudentLoan } from './uk-tax-calc';
import { calcFederalTax, calcFICA } from './us-tax-calc';
import type { FilingStatus, UsTaxYear } from './us-rates';

interface UkRow {
  salary: number;
  personalAllowance: number;
  incomeTax: number;
  ni: number;
  takeHomeAnnual: number;
  takeHomeMonthly: number;
  studentLoanPlan2Annual: number;
  studentLoanPlan5Annual: number;
}

interface UsRow {
  salary: number;
  federalTax: number;
  socialSecurity: number;
  medicare: number;
  takeHomeAnnual: number;
}

const values2026 = JSON.parse(readFileSync('docs/tax-values-2026.json', 'utf8')) as {
  ukTaxYear: string;
  usTaxYear: string;
  uk: UkRow[];
  us: UsRow[];
};

const values2027 = JSON.parse(readFileSync('docs/tax-values-2027.json', 'utf8')) as {
  usTaxYear: string;
  us: UsRow[];
  usMarriedFilingJointly: UsRow[];
  usHeadOfHousehold: UsRow[];
};

// JSON figures are rounded to whole pounds/dollars (2026) or cents (2027).
const TOLERANCE = 1;

describe('UK lib output matches authoritative 2026/27 table', () => {
  it('table is for 2026/27', () => {
    expect(values2026.ukTaxYear).toBe('2026/27');
  });
  for (const row of values2026.uk) {
    it(`GBP ${row.salary.toLocaleString()}`, () => {
      const incomeTax = calcSimpleIncomeTax(row.salary);
      const ni = calcNI(row.salary);
      expect(Math.abs(incomeTax - row.incomeTax)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(ni - row.ni)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(row.salary - incomeTax - ni - row.takeHomeAnnual)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(calcStudentLoan(row.salary, 'plan2') - row.studentLoanPlan2Annual)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(calcStudentLoan(row.salary, 'plan5') - row.studentLoanPlan5Annual)).toBeLessThanOrEqual(TOLERANCE);
    });
  }
});

function checkUsRows(year: UsTaxYear, status: FilingStatus, rows: UsRow[]) {
  for (const row of rows) {
    it(`${year} ${status} $${row.salary.toLocaleString()}`, () => {
      const federal = calcFederalTax(row.salary, status, year);
      const fica = calcFICA(row.salary, status, year);
      expect(Math.abs(federal - row.federalTax)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(fica.ss - row.socialSecurity)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(fica.medicare - row.medicare)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(row.salary - federal - fica.total - row.takeHomeAnnual)).toBeLessThanOrEqual(TOLERANCE);
    });
  }
}

describe('US lib output matches authoritative TY2026 table (single)', () => {
  it('table is for 2026', () => {
    expect(values2026.usTaxYear).toBe('2026');
  });
  checkUsRows(2026, 'single', values2026.us);
});

describe('US lib output matches authoritative TY2027 tables', () => {
  it('table is for 2027 and covers every filing status', () => {
    expect(values2027.usTaxYear).toBe('2027');
    expect(values2027.us.length).toBeGreaterThanOrEqual(22);
    expect(values2027.usMarriedFilingJointly.length).toBeGreaterThanOrEqual(22);
    expect(values2027.usHeadOfHousehold.length).toBeGreaterThanOrEqual(22);
  });
  checkUsRows(2027, 'single', values2027.us);
  checkUsRows(2027, 'married', values2027.usMarriedFilingJointly);
  checkUsRows(2027, 'head', values2027.usHeadOfHousehold);
});

describe('2027 vs 2026 sanity', () => {
  const take = (salary: number, y: UsTaxYear) =>
    salary - calcFederalTax(salary, 'single', y) - calcFICA(salary, 'single', y).total;

  it('below the 2026 wage cap, every single filer keeps more in 2027 (wider brackets, bigger deduction)', () => {
    for (const row of values2027.us.filter((r) => r.salary <= 184_500)) {
      const diff = take(row.salary, 2027) - take(row.salary, 2026);
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThan(600);
    }
  });

  it('above it, the higher 2027 wage cap can outweigh the bracket gain (at most $483.60 more Social Security)', () => {
    for (const row of values2027.us.filter((r) => r.salary > 184_500)) {
      const diff = take(row.salary, 2027) - take(row.salary, 2026);
      expect(Math.abs(diff)).toBeLessThan(600);
    }
    const ssDiff = calcFICA(250_000, 'single', 2027).ss - calcFICA(250_000, 'single', 2026).ss;
    expect(ssDiff).toBeCloseTo((192_300 - 184_500) * 0.062, 2);
  });
});

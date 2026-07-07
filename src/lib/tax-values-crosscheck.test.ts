/**
 * Cross-checks the pure tax libs against docs/tax-values-2026.json — the
 * authoritative, hand-verified take-home tables (rUK standard bands / US
 * single filer). The Phase 3 hub pages compute their tables from these libs
 * at build time, so this test is what keeps every hub figure honest.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calcSimpleIncomeTax, calcNI, calcStudentLoan } from './uk-tax-calc';
import { calcFederalTax, calcFICA } from './us-tax-calc';

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

const values = JSON.parse(readFileSync('docs/tax-values-2026.json', 'utf8')) as {
  uk: UkRow[];
  us: UsRow[];
};

// JSON figures are rounded to whole pounds/dollars.
const TOLERANCE = 1;

describe('UK lib output matches authoritative 2026/27 table', () => {
  for (const row of values.uk) {
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

describe('US lib output matches authoritative 2026 table', () => {
  for (const row of values.us) {
    it(`$${row.salary.toLocaleString()}`, () => {
      const federal = calcFederalTax(row.salary, 'single');
      const fica = calcFICA(row.salary, 'single');
      expect(Math.abs(federal - row.federalTax)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(fica.ss - row.socialSecurity)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(fica.medicare - row.medicare)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(row.salary - federal - fica.total - row.takeHomeAnnual)).toBeLessThanOrEqual(TOLERANCE);
    });
  }
});

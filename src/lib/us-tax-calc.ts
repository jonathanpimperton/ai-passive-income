/**
 * US federal tax calculations -- pure functions, every one tax-year aware.
 *
 * - calcFederalTax / calcFICA: the simple model used by the homepage engine
 *   and the hub pages (standard deduction, no other adjustments). The `year`
 *   argument defaults to the default tax year (us-rates.ts), so existing
 *   callers follow the 1 January switch.
 * - computeUsSalary: the full US Salary calculator model (hourly/annual pay,
 *   overtime, 401(k), state effective rate, age 65+ and the 2025-2028 OBBBA
 *   overtime and senior deductions). SalaryCalc.tsx only wires state to it.
 */

import {
  getUsRates,
  US_DEFAULT_TAX_YEAR,
  type FilingStatus,
  type UsTaxYear,
  type UsYearRates,
} from './us-rates';

/** Federal income tax on TAXABLE income (after all deductions). */
export function taxOnTaxableIncome(
  taxable: number,
  filingStatus: FilingStatus,
  year: UsTaxYear = US_DEFAULT_TAX_YEAR,
): number {
  const brackets = getUsRates(year).brackets[filingStatus];
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [threshold, rate] = brackets[i];
    const nextThreshold = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    if (taxable <= threshold) break;
    tax += (Math.min(taxable, nextThreshold) - threshold) * rate;
  }
  return Math.max(0, tax);
}

/** Marginal federal rate that applies to the last dollar of taxable income. */
export function marginalFederalRate(
  taxable: number,
  filingStatus: FilingStatus,
  year: UsTaxYear = US_DEFAULT_TAX_YEAR,
): number {
  const brackets = getUsRates(year).brackets[filingStatus];
  let rate = brackets[0][1];
  for (const [threshold, r] of brackets) {
    if (taxable > threshold) rate = r;
  }
  return rate;
}

/**
 * Federal income tax after the standard deduction only (no other
 * adjustments). Used by the homepage engine and the take-home hub.
 */
export function calcFederalTax(
  grossIncome: number,
  filingStatus: FilingStatus,
  year: UsTaxYear = US_DEFAULT_TAX_YEAR,
): number {
  const taxable = Math.max(0, grossIncome - getUsRates(year).standardDeduction[filingStatus]);
  return taxOnTaxableIncome(taxable, filingStatus, year);
}

/**
 * Employee FICA (Social Security + Medicare) on wages, for ONE worker's wages
 * (the Social Security wage cap applies per person).
 */
export function calcFICA(
  grossIncome: number,
  filingStatus: FilingStatus,
  year: UsTaxYear = US_DEFAULT_TAX_YEAR,
) {
  const { socialSecurity, medicare } = getUsRates(year);
  const ss = Math.min(Math.max(0, grossIncome), socialSecurity.wageCap) * socialSecurity.rate;
  const medicareBase = Math.max(0, grossIncome) * medicare.rate;
  const additionalThreshold = medicare.additionalThreshold[filingStatus];
  const medicareAdditional = grossIncome > additionalThreshold
    ? (grossIncome - additionalThreshold) * medicare.additionalRate
    : 0;
  return { ss, medicare: medicareBase + medicareAdditional, total: ss + medicareBase + medicareAdditional };
}

/* ── OBBBA deductions (tax years 2025-2028) ────────────────── */

/**
 * Qualified overtime deduction (26 U.S.C. 225): the FLSA "half" of
 * time-and-a-half, capped, then reduced by $100 for each FULL $1,000 of MAGI
 * above the threshold (Schedule 1-A Part III, lines 15-21).
 */
export function overtimeDeduction(
  qualifiedOvertime: number,
  magi: number,
  filingStatus: FilingStatus,
  rates: UsYearRates,
): number {
  if (!rates.obbba || qualifiedOvertime <= 0) return 0;
  const { cap, phaseOutStart, reductionPerThousand } = rates.obbba.overtime;
  const capped = Math.min(qualifiedOvertime, cap[filingStatus]);
  const excess = Math.max(0, magi - phaseOutStart[filingStatus]);
  const reduction = Math.floor(excess / 1000) * reductionPerThousand;
  return Math.max(0, capped - reduction);
}

/**
 * Enhanced deduction for seniors (26 U.S.C. 151(d)(5)(C)): $6,000 per
 * qualifying person, each reduced by 6% of MAGI above the threshold
 * (Schedule 1-A Part V, lines 31-37).
 */
export function seniorDeduction(
  qualifyingPeople: number,
  magi: number,
  filingStatus: FilingStatus,
  rates: UsYearRates,
): number {
  if (!rates.obbba || qualifyingPeople <= 0) return 0;
  const { perPerson, phaseOutStart, phaseOutRate } = rates.obbba.senior;
  const excess = Math.max(0, magi - phaseOutStart[filingStatus]);
  return qualifyingPeople * Math.max(0, perPerson - excess * phaseOutRate);
}

/** Number of people aged 65+ allowed for a filing status (2 only on a joint return). */
export function clampSeniors(seniors: number, filingStatus: FilingStatus): 0 | 1 | 2 {
  const max = filingStatus === 'married' ? 2 : 1;
  const n = Math.max(0, Math.min(max, Math.floor(Number.isFinite(seniors) ? seniors : 0)));
  return n as 0 | 1 | 2;
}

/* ── Full salary model ─────────────────────────────────────── */

export type SalaryInputMode = 'annual' | 'hourly';

export interface UsSalaryInputs {
  year: UsTaxYear;
  mode: SalaryInputMode;
  /** Annual salary (annual mode) */
  salary: number;
  /** Base hourly rate (hourly mode) */
  hourlyRate: number;
  /** Regular hours per week. In hourly mode, hours above 40 are paid as overtime. */
  hoursPerWeek: number;
  weeksPerYear: number;
  /** Extra overtime hours per week, paid at 1.5x */
  overtimeHours: number;
  /**
   * The worker is FLSA non-exempt, so the premium on hours over 40 in a week
   * qualifies for the deduction. Overtime paid for hours at or under 40 a week
   * never qualifies (it is not FLSA section 7 overtime).
   */
  overtimeQualifies: boolean;
  /** Effective state income tax rate, in percent, applied to pay after 401(k) */
  stateTaxRate: number;
  filingStatus: FilingStatus;
  /** Pre-tax 401(k) contribution, percent of gross pay */
  retirement401kPct: number;
  /** People aged 65+ on the return: 0-1, or 0-2 when married filing jointly */
  seniors: number;
}

export interface UsSalaryResult {
  year: UsTaxYear;
  grossAnnual: number;
  /** Hours actually worked per year (regular + overtime) */
  hoursWorkedPerYear: number;
  /** Overtime pay at 1.5x included in gross */
  overtimePay: number;
  /** The premium half of all overtime pay entered (hours paid at 1.5x) */
  overtimePremium: number;
  /** Overtime hours per week that are over 40 hours worked (FLSA section 7) */
  qualifyingOvertimeHoursPerWeek: number;
  /** Premium half of pay for those hours: the amount the deduction can use, before cap and phase-out */
  qualifiedOvertimePremium: number;
  retirement401k: number;
  /** 401(k) limit used (true when the IRS has not published this year's limit) */
  retirement401kLimit: number;
  retirement401kLimitPublished: boolean;
  /** Gross minus pre-tax 401(k); also used as MAGI for the phase-outs */
  agi: number;
  standardDeduction: number;
  /** Part of the standard deduction that comes from the age 65+ addition */
  additionalStandardDeduction: number;
  overtimeDeduction: number;
  seniorDeduction: number;
  taxableIncome: number;
  federalTax: number;
  marginalFederalRate: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  totalTax: number;
  /** Taxes plus 401(k) */
  totalDeductions: number;
  netAnnual: number;
  /** netAnnual / 12: the monthly headline (same value, no separate rounding path). */
  netMonthly: number;
  /** Share of gross that leaves the paycheck (taxes + 401(k)) */
  effectiveDeductionRate: number;
  /**
   * Married filing jointly only: how much MORE Social Security two earners
   * would pay than one (the wage cap applies per worker), at most. 0 otherwise.
   */
  twoEarnerSocialSecurityGap: number;
}

const finiteOr0 = (v: number) => (Number.isFinite(v) ? v : 0);

/** The full US Salary calculator model. Pure; no NaN for any finite input. */
export function computeUsSalary(raw: UsSalaryInputs): UsSalaryResult {
  const rates = getUsRates(raw.year);
  const status = raw.filingStatus;
  const weeks = Math.max(0, finiteOr0(raw.weeksPerYear));
  const hours = Math.max(0, finiteOr0(raw.hoursPerWeek));
  const extraOt = Math.max(0, finiteOr0(raw.overtimeHours));

  // Gross pay is as entered: every overtime hour is paid at 1.5x.
  let grossAnnual: number;
  let baseRate: number;
  let paidOtHours: number; // per week, paid at 1.5x
  if (raw.mode === 'annual') {
    const salary = Math.max(0, finiteOr0(raw.salary));
    const baseHours = hours * weeks;
    baseRate = baseHours > 0 ? salary / baseHours : 0;
    paidOtHours = extraOt;
    grossAnnual = salary + baseRate * 1.5 * paidOtHours * weeks;
  } else {
    baseRate = Math.max(0, finiteOr0(raw.hourlyRate));
    const regularHours = Math.min(hours, 40);
    paidOtHours = Math.max(0, hours - 40) + extraOt;
    grossAnnual = (regularHours * baseRate + paidOtHours * baseRate * 1.5) * weeks;
  }
  const overtimePay = paidOtHours * baseRate * 1.5 * weeks;
  const overtimePremium = paidOtHours * baseRate * 0.5 * weeks;
  // Qualified overtime (Notice 2025-69, Schedule 1-A Part III) is only the
  // FLSA section 7 premium: hours over 40 in a workweek. Overtime paid for
  // hours at or under 40 (e.g. 30 regular + 5 extra) does not qualify, and a
  // salary covering more than 40 hours earns no premium unless overtime is paid.
  const qualifyingOvertimeHoursPerWeek = Math.min(paidOtHours, Math.max(0, hours + extraOt - 40));
  const qualifiedOvertimePremium = qualifyingOvertimeHoursPerWeek * baseRate * 0.5 * weeks;
  const hoursWorkedPerYear = (hours + extraOt) * weeks;

  // 401(k): reduces federal and state taxable pay, not FICA.
  const k = rates.retirement401k;
  const retirement401k = Math.min(
    grossAnnual * (Math.max(0, finiteOr0(raw.retirement401kPct)) / 100),
    k.limit,
  );
  const agi = grossAnnual - retirement401k;

  // Deductions.
  const seniors = clampSeniors(raw.seniors, status);
  const perSenior = status === 'married'
    ? rates.additionalStandardDeduction65.married
    : rates.additionalStandardDeduction65.unmarried;
  const additionalStandardDeduction = seniors * perSenior;
  const standardDeduction = rates.standardDeduction[status] + additionalStandardDeduction;
  const otDeduction = raw.overtimeQualifies
    ? overtimeDeduction(qualifiedOvertimePremium, agi, status, rates)
    : 0;
  const senior = seniorDeduction(seniors, agi, status, rates);
  const taxableIncome = Math.max(0, agi - standardDeduction - otDeduction - senior);

  const federalTax = taxOnTaxableIncome(taxableIncome, status, raw.year);
  const fica = calcFICA(grossAnnual, status, raw.year);
  const stateTax = Math.max(0, agi) * (Math.max(0, finiteOr0(raw.stateTaxRate)) / 100);
  const totalTax = federalTax + fica.total + stateTax;
  const totalDeductions = totalTax + retirement401k;
  const netAnnual = grossAnnual - totalDeductions;

  const { wageCap, rate: ssRate } = rates.socialSecurity;
  const twoEarnerSocialSecurityGap = status === 'married'
    ? Math.max(0, (Math.min(grossAnnual, 2 * wageCap) - Math.min(grossAnnual, wageCap)) * ssRate)
    : 0;

  return {
    year: raw.year,
    grossAnnual,
    hoursWorkedPerYear,
    overtimePay,
    overtimePremium,
    qualifyingOvertimeHoursPerWeek,
    qualifiedOvertimePremium,
    retirement401k,
    retirement401kLimit: k.limit,
    retirement401kLimitPublished: k.published,
    agi,
    standardDeduction,
    additionalStandardDeduction,
    overtimeDeduction: otDeduction,
    seniorDeduction: senior,
    taxableIncome,
    federalTax,
    marginalFederalRate: marginalFederalRate(taxableIncome, status, raw.year),
    socialSecurity: fica.ss,
    medicare: fica.medicare,
    stateTax,
    totalTax,
    totalDeductions,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveDeductionRate: grossAnnual > 0 ? totalDeductions / grossAnnual : 0,
    twoEarnerSocialSecurityGap,
  };
}

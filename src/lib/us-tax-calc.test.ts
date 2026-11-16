/**
 * US Salary model (computeUsSalary) -- review repros, external worked
 * examples and invariants. Years are explicit throughout.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  computeUsSalary,
  overtimeDeduction,
  seniorDeduction,
  clampSeniors,
  calcFederalTax,
  type UsSalaryInputs,
} from './us-tax-calc';
import { getUsRates, type UsTaxYear } from './us-rates';

/* Heavy under load (another build or test run on the same machine): an explicit generous timeout
 * for the whole file instead of vitest's 5 s default. The tests are not shrunk. */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const base = (over: Partial<UsSalaryInputs> = {}): UsSalaryInputs => ({
  year: 2026,
  mode: 'annual',
  salary: 75_000,
  hourlyRate: 36,
  hoursPerWeek: 40,
  weeksPerYear: 52,
  overtimeHours: 0,
  overtimeQualifies: true,
  stateTaxRate: 0,
  filingStatus: 'single',
  retirement401kPct: 0,
  seniors: 0,
  ...over,
});

/** Federal tax saved by the overtime deduction for the same inputs. */
const otSaving = (over: Partial<UsSalaryInputs>) =>
  computeUsSalary(base({ ...over, overtimeQualifies: false })).federalTax -
  computeUsSalary(base({ ...over, overtimeQualifies: true })).federalTax;

describe('MATH-US-F01: qualified overtime deduction (TY2026 repro figures)', () => {
  it('$36/hr, 10 OT hours, single: saves $2,059', () => {
    expect(otSaving({ mode: 'hourly', hourlyRate: 36, overtimeHours: 10 })).toBeCloseTo(2_059.2, 1);
  });
  it('$25/hr, 5 OT hours, married filing jointly: saves $390', () => {
    expect(otSaving({ mode: 'hourly', hourlyRate: 25, overtimeHours: 5, filingStatus: 'married' })).toBeCloseTo(390, 1);
  });
  it('$30/hr, 50 hours a week, head of household: saves $936 (hours above 40 are overtime)', () => {
    expect(otSaving({ mode: 'hourly', hourlyRate: 30, hoursPerWeek: 50, filingStatus: 'head' })).toBeCloseTo(936, 1);
  });
  it('$45/hr, 15 OT hours, single: capped at $12,500 of premium -> saves $3,000', () => {
    const r = computeUsSalary(base({ mode: 'hourly', hourlyRate: 45, overtimeHours: 15 }));
    expect(r.overtimePremium).toBeCloseTo(17_550, 2);
    expect(r.overtimeDeduction).toBe(12_500);
    expect(otSaving({ mode: 'hourly', hourlyRate: 45, overtimeHours: 15 })).toBeCloseTo(3_000, 1);
  });
  it('non-qualifying (FLSA-exempt) overtime gets no deduction', () => {
    const r = computeUsSalary(base({ mode: 'hourly', overtimeHours: 10, overtimeQualifies: false }));
    expect(r.overtimeDeduction).toBe(0);
  });
});

describe('only FLSA overtime (hours over 40 in a week) qualifies', () => {
  it('hourly $20, 30 h + 5 OT: paid at 1.5x but no hour is over 40, so no deduction', () => {
    const r = computeUsSalary(base({ mode: 'hourly', hourlyRate: 20, hoursPerWeek: 30, overtimeHours: 5 }));
    expect(r.overtimePay).toBeCloseTo(5 * 30 * 52, 6); // gross pay stays as entered
    expect(r.grossAnnual).toBeCloseTo((30 * 20 + 5 * 30) * 52, 6);
    expect(r.qualifyingOvertimeHoursPerWeek).toBe(0);
    expect(r.qualifiedOvertimePremium).toBe(0);
    expect(r.overtimeDeduction).toBe(0);
  });

  it('salaried 37.5 h + 5 OT: only the 2.5 hours over 40 qualify', () => {
    // $78,000 / (37.5 h x 52) = $40/hr base; premium 2.5 h x $20 x 52 = $2,600
    const r = computeUsSalary(base({ salary: 78_000, hoursPerWeek: 37.5, overtimeHours: 5 }));
    expect(r.qualifyingOvertimeHoursPerWeek).toBe(2.5);
    expect(r.qualifiedOvertimePremium).toBeCloseTo(2_600, 6);
    expect(r.overtimePremium).toBeCloseTo(5_200, 6);
    expect(r.overtimeDeduction).toBeCloseTo(2_600, 6);
  });

  it('boundaries at exactly 40 hours', () => {
    const q = (over: Partial<UsSalaryInputs>) => computeUsSalary(base(over)).qualifyingOvertimeHoursPerWeek;
    expect(q({ mode: 'hourly', hoursPerWeek: 40, overtimeHours: 0 })).toBe(0);
    expect(q({ mode: 'hourly', hoursPerWeek: 35, overtimeHours: 5 })).toBe(0);
    expect(q({ mode: 'hourly', hoursPerWeek: 35, overtimeHours: 6 })).toBe(1);
    expect(q({ mode: 'hourly', hoursPerWeek: 41, overtimeHours: 0 })).toBe(1);
    expect(q({ mode: 'annual', hoursPerWeek: 40, overtimeHours: 0 })).toBe(0);
    expect(q({ mode: 'annual', hoursPerWeek: 40, overtimeHours: 1 })).toBe(1);
  });

  it('a salary covering 45 hours with no overtime pay earns no premium to deduct', () => {
    const r = computeUsSalary(base({ hoursPerWeek: 45, overtimeHours: 0 }));
    expect(r.qualifiedOvertimePremium).toBe(0);
    expect(r.overtimeDeduction).toBe(0);
  });
});

describe('overtime phase-out follows Schedule 1-A (whole $1,000 steps)', () => {
  const r2026 = getUsRates(2026);
  it('IRM example: $165,000 MAGI cuts a $12,500 maximum to $11,000', () => {
    expect(overtimeDeduction(20_000, 165_000, 'single', r2026)).toBe(11_000);
  });
  it('a partial $1,000 does not reduce it', () => {
    expect(overtimeDeduction(5_000, 150_999, 'single', r2026)).toBe(5_000);
    expect(overtimeDeduction(5_000, 151_000, 'single', r2026)).toBe(4_900);
  });
  it('joint threshold is $300,000 and fully phases out', () => {
    expect(overtimeDeduction(25_000, 300_000, 'married', r2026)).toBe(25_000);
    expect(overtimeDeduction(25_000, 600_000, 'married', r2026)).toBe(0);
  });
});

describe('MATH-US-F07: age 65+ (additional standard deduction + senior deduction)', () => {
  const saving = (over: Partial<UsSalaryInputs>) =>
    computeUsSalary(base({ ...over, seniors: 0 })).federalTax - computeUsSalary(base(over)).federalTax;

  it('single, 65+, $60k (2026): $966 less federal tax', () => {
    expect(saving({ salary: 60_000, seniors: 1 })).toBeCloseTo(966, 1);
  });
  it('married filing jointly, both 65+, $90k (2026): $1,836 less', () => {
    expect(saving({ salary: 90_000, filingStatus: 'married', seniors: 2 })).toBeCloseTo(1_836, 1);
  });
  it('senior deduction phases out at 6% per person above $75k / $150k', () => {
    const r = getUsRates(2027);
    expect(seniorDeduction(1, 100_000, 'single', r)).toBeCloseTo(4_500, 6);
    expect(seniorDeduction(2, 160_000, 'married', r)).toBeCloseTo(2 * (6_000 - 600), 6);
    expect(seniorDeduction(1, 200_000, 'single', r)).toBe(0);
  });
  it('2027 uses the Rev. Proc. 2026-35 additional amounts ($2,100 unmarried, $1,700 married)', () => {
    expect(computeUsSalary(base({ year: 2027, seniors: 1 })).additionalStandardDeduction).toBe(2_100);
    expect(computeUsSalary(base({ year: 2027, seniors: 2, filingStatus: 'married' })).additionalStandardDeduction).toBe(3_400);
  });
  it('only a joint return can have two people aged 65+', () => {
    expect(clampSeniors(2, 'single')).toBe(1);
    expect(clampSeniors(2, 'head')).toBe(1);
    expect(clampSeniors(2, 'married')).toBe(2);
    expect(clampSeniors(-1, 'married')).toBe(0);
    expect(clampSeniors(Number.NaN, 'married')).toBe(0);
  });
});

describe('MATH-US-12: per-hour figures include overtime hours', () => {
  it('$75k salary, 10 OT hours/week, no state tax: take-home per hour is below gross per hour', () => {
    const r = computeUsSalary(base({ overtimeHours: 10 }));
    const grossPerHour = r.grossAnnual / r.hoursWorkedPerYear;
    const netPerHour = r.netAnnual / r.hoursWorkedPerYear;
    expect(r.hoursWorkedPerYear).toBe(50 * 52);
    expect(netPerHour).toBeLessThan(grossPerHour);
  });
  it('without the overtime deduction it reproduces the review figure ($31.30/hr)', () => {
    const r = computeUsSalary(base({ overtimeHours: 10, overtimeQualifies: false }));
    expect(r.netAnnual / r.hoursWorkedPerYear).toBeCloseTo(31.30, 2);
  });
});

describe('MATH-US-15: married filing jointly, two earners', () => {
  it('2 x $120k entered as $240k: up to $3,441 more Social Security than one earner', () => {
    const r = computeUsSalary(base({ salary: 240_000, filingStatus: 'married' }));
    expect(r.socialSecurity).toBeCloseTo(184_500 * 0.062, 2);
    expect(r.twoEarnerSocialSecurityGap).toBeCloseTo(3_441, 0);
  });
  it('no gap below the wage cap or for other statuses', () => {
    expect(computeUsSalary(base({ salary: 150_000, filingStatus: 'married' })).twoEarnerSocialSecurityGap).toBe(0);
    expect(computeUsSalary(base({ salary: 240_000 })).twoEarnerSocialSecurityGap).toBe(0);
  });
});

describe('hand-worked TY2027 example (Rev. Proc. 2026-35)', () => {
  it('$75,000 single, no state tax', () => {
    // Taxable 75,000 - 16,600 = 58,400 -> $5,987 + 22% x (58,400 - 52,025) = $7,389.50
    // Social Security 4,650.00; Medicare 1,087.50 -> take-home 61,873.00
    const r = computeUsSalary(base({ year: 2027 }));
    expect(r.taxableIncome).toBe(58_400);
    expect(r.federalTax).toBeCloseTo(7_389.5, 2);
    expect(r.socialSecurity).toBeCloseTo(4_650, 2);
    expect(r.medicare).toBeCloseTo(1_087.5, 2);
    expect(r.netAnnual).toBeCloseTo(61_873, 2);
    expect(r.marginalFederalRate).toBe(0.22);
  });
  it('matches the simple hub model when no adjustments apply', () => {
    for (const year of [2026, 2027] as UsTaxYear[]) {
      const r = computeUsSalary(base({ year, salary: 130_000 }));
      expect(r.federalTax).toBeCloseTo(calcFederalTax(130_000, 'single', year), 6);
    }
  });
});

describe('401(k)', () => {
  it('is capped at the year limit and reduces federal + state but not FICA', () => {
    const r = computeUsSalary(base({ salary: 400_000, retirement401kPct: 30, stateTaxRate: 5 }));
    expect(r.retirement401k).toBe(24_500);
    expect(r.agi).toBe(400_000 - 24_500);
    expect(r.stateTax).toBeCloseTo((400_000 - 24_500) * 0.05, 6);
    expect(r.medicare).toBeCloseTo(400_000 * 0.0145 + 200_000 * 0.009, 6);
  });
  it('2027 uses the published 2027 limit', () => {
    const r = computeUsSalary(base({ year: 2027, retirement401kPct: 10 }));
    expect(r.retirement401kLimitPublished).toBe(true);
    expect(r.retirement401kLimit).toBe(25_500);
  });
});

describe('invariants', () => {
  it('never returns NaN and keeps the books balanced for hostile inputs', () => {
    const cases: Partial<UsSalaryInputs>[] = [
      { hoursPerWeek: 0 },
      { weeksPerYear: 0 },
      { salary: Number.NaN },
      { salary: -5_000 },
      { mode: 'hourly', hourlyRate: Number.POSITIVE_INFINITY },
      { overtimeHours: -10 },
      { retirement401kPct: Number.NaN, stateTaxRate: Number.NaN },
      { seniors: 7, filingStatus: 'head' },
    ];
    for (const c of cases) {
      const r = computeUsSalary(base(c));
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === 'number') expect(Number.isFinite(v), `${k} for ${JSON.stringify(c)}`).toBe(true);
      }
      expect(r.netAnnual + r.totalDeductions).toBeCloseTo(r.grossAnnual, 6);
    }
  });

  it('random inputs: deductions never raise tax; net + deductions = gross; take-home <= gross', () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    const statuses = ['single', 'married', 'head'] as const;
    for (let i = 0; i < 2_000; i++) {
      const inp = base({
        year: rand() < 0.5 ? 2026 : 2027,
        mode: rand() < 0.5 ? 'annual' : 'hourly',
        salary: Math.round(rand() * 900_000),
        hourlyRate: 7.25 + rand() * 190,
        hoursPerWeek: 1 + Math.floor(rand() * 80),
        weeksPerYear: 1 + Math.floor(rand() * 52),
        overtimeHours: Math.floor(rand() * 40),
        stateTaxRate: rand() * 13,
        filingStatus: statuses[Math.floor(rand() * 3)],
        retirement401kPct: rand() * 30,
        seniors: Math.floor(rand() * 3),
      });
      const r = computeUsSalary(inp);
      expect(r.netAnnual + r.totalDeductions).toBeCloseTo(r.grossAnnual, 4);
      expect(r.netAnnual).toBeLessThanOrEqual(r.grossAnnual + 1e-6);
      expect(r.taxableIncome).toBeGreaterThanOrEqual(0);
      expect(r.qualifiedOvertimePremium).toBeLessThanOrEqual(r.overtimePremium + 1e-9);
      expect(r.qualifyingOvertimeHoursPerWeek).toBeLessThanOrEqual(Math.max(0, inp.hoursPerWeek + inp.overtimeHours - 40));
      const noOt = computeUsSalary({ ...inp, overtimeQualifies: false });
      expect(r.federalTax).toBeLessThanOrEqual(noOt.federalTax + 1e-6);
      const noSeniors = computeUsSalary({ ...inp, seniors: 0 });
      expect(r.federalTax).toBeLessThanOrEqual(noSeniors.federalTax + 1e-6);
    }
  });
});

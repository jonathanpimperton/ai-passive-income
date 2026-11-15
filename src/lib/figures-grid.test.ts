/**
 * Figures-vs-engine GRID test (plan-2026-11 section 12.2, "FIG re-pointing").
 *
 * For every figure function that has a calculator, a grid of inputs compares
 * the raw (unrounded) figure value with the calculation the calculator makes,
 * built here from the engine inputs independently of figures.ts's own mapping.
 * Where figures.ts calls the same engine function the comparison is EXACT
 * (===): zero diffs allowed. Where it keeps its own arithmetic (the loan
 * family) the tolerance is stated and tiny.
 *
 * A function that the figure engine refuses on purpose (contradictory flags,
 * a "beyond 50 years" payoff, an unpublished 401(k) limit) must throw, and the
 * grid asserts exactly which cases those are, so a refusal can never hide a diff.
 *
 * If a re-point is reverted (a figure goes back to its own arithmetic), the
 * matching grid here fails.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFigureValue as v, FigureError, type FigureRecord } from './figures';
import { calcStudentLoan, calculateUkTakeHome, type PensionMethod, type StudentLoanPlan } from './uk-tax-calc';
import { parseUkTaxCode } from './uk-tax-codes';
import { computeUsSalary, calcFederalTax, calcFICA } from './us-tax-calc';
import { US_TAX_YEARS, US_DEFAULT_TAX_YEAR, US_TAX_YEAR, getUsRates, type FilingStatus, type UsTaxYear } from './us-rates';
import { UK_TAX_YEAR } from './uk-rates';
import { NMPA_CURRENT, NMPA_FROM_2028 } from './uk-pension-ages';
import { CARD_HORIZON_MONTHS, simulateCardPayoff, type CardPayoffInputs } from './credit-card';
import { compareFees } from './investment-fee';
import { MARKET_RATES, rateAttribution } from './market-rates';
import { CPI_FIRST_YEAR, CPI_LAST_YEAR, adjustForInflation, projectInflation } from './inflation';
import { futureValue, solveMonthsToTarget } from './investment-solvers';
import { monthlyForGoal, timeToGoal } from './savings-goal';
import { projectRetirement } from './retirement';
import { buildAmortization, monthlyPayment } from './mortgage-payment';
import { calculateSdlt } from './stamp-duty';
import { calculateUKCgt, calculateUSCgt } from './capital-gains';

const num = (expr: string): number => v(expr) as number;
const rec = (expr: string): FigureRecord => v(expr) as FigureRecord;

/** FIG_GRID_VERBOSE=1 prints the size of each grid (for handoff reports). */
function report(label: string, compared: number, refused = 0): void {
  if (process.env.FIG_GRID_VERBOSE) process.stdout.write(`[grid] ${label}: ${compared} compared, ${refused} refused
`);
}

function throwsFigureError(expr: string, re?: RegExp): void {
  let caught: unknown;
  try {
    v(expr);
  } catch (e) {
    caught = e;
  }
  expect(caught, expr).toBeInstanceOf(FigureError);
  if (re) expect((caught as FigureError).message, expr).toMatch(re);
}

/** Compare two numbers exactly, naming the case on failure. */
function same(actual: number, expected: number, label: string): void {
  expect(actual, label).toBe(expected);
}
function near(actual: number, expected: number, tol: number, label: string): void {
  expect(Math.abs(actual - expected), `${label}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tol);
}

/* ════════════════════════════════════════════════════════════
 * UK pay: salaries x codes x Scottish flag x pension methods x student loans
 * ════════════════════════════════════════════════════════════ */

describe('UK pay: figures == calculateUkTakeHome', () => {
  const salaries = [0, 5_000, 12_570, 20_000, 29_385, 30_000, 50_270, 60_000, 99_999, 110_000, 125_140, 250_000];
  // One code of each kind gets the full pension x plan product; the rest get a lighter grid.
  const fullCodes = ['1257L', 'S1257L', 'C1257L', '1100L', 'K475', 'D0', 'SD1'];
  const lightCodes = ['1383M', '500T', '0T', 'SK300', 'BR', 'D1', 'SBR', 'SD0', 'SD2', 'SD3', 'NT', '1257L W1', 'S1257L M1', 'C663L X'];
  const codes = [...fullCodes, ...lightCodes];
  const scottishFlags: Array<boolean | undefined> = [undefined, true, false];
  const pensions: Array<{ label: string; opts: string; mode: 'percent' | 'amount'; percent: number; amount: number; method: PensionMethod | null }> = [
    { label: 'none', opts: '', mode: 'percent', percent: 0, amount: 0, method: null },
    { label: '5% sacrifice', opts: 'pension=5, method=sacrifice', mode: 'percent', percent: 5, amount: 0, method: 'sacrifice' },
    { label: '5% net', opts: 'pension=5, method=net', mode: 'percent', percent: 5, amount: 0, method: 'netPay' },
    { label: '5% ras', opts: 'pension=5, method=ras', mode: 'percent', percent: 5, amount: 0, method: 'reliefAtSource' },
    { label: '8000 sacrifice', opts: 'pensionAmount=8000, method=sacrifice', mode: 'amount', percent: 0, amount: 8000, method: 'sacrifice' },
    { label: '8000 net', opts: 'pensionAmount=8000, method=net', mode: 'amount', percent: 0, amount: 8000, method: 'netPay' },
    { label: '8000 ras', opts: 'pensionAmount=8000, method=ras', mode: 'amount', percent: 0, amount: 8000, method: 'reliefAtSource' },
  ];
  const plans: StudentLoanPlan[] = ['none', 'plan1', 'plan2', 'plan4', 'plan5', 'postgrad'];

  const FIELDS = ['takeHome', 'monthly', 'weekly', 'incomeTax', 'ni', 'studentLoan', 'pension', 'pensionPot', 'ani', 'personalAllowance', 'taxRate'] as const;

  it('every combination equals the engine (0 diffs); refusals are exactly the contradictions and over-large pensions', { timeout: 120_000 }, () => {
    let compared = 0;
    let refused = 0;
    let total = 0;
    for (const salary of salaries) {
      for (const code of codes) {
        const parsed = parseUkTaxCode(code);
        const prefix = parsed.kind === 'invalid' ? null : parsed.prefix;
        const full = fullCodes.includes(code);
        for (const scottish of scottishFlags) {
          for (const p of full ? pensions : [pensions[0], pensions[3]]) {
            for (const plan of full ? plans : (['none', 'plan2'] as StudentLoanPlan[])) {
              total++;
              const opts = [
                `code='${code}'`,
                scottish === undefined ? '' : `scottish=${scottish}`,
                p.opts,
                plan === 'none' ? '' : `plan=${plan}`,
              ].filter(Boolean).join(', ');
              const expr = `ukPay(${salary}${opts ? ', ' + opts : ''})`;
              const contradiction = prefix !== null && scottish !== undefined && (prefix === 'S') !== scottish;
              const contribution = p.mode === 'percent' ? (salary * p.percent) / 100 : p.amount;
              const tooBig = contribution > salary;
              // figures checks the pension first, then the code/flag contradiction
              if (tooBig) {
                throwsFigureError(expr, /more than the salary/);
                refused++;
                continue;
              }
              if (contradiction) {
                throwsFigureError(expr, /contradicts scottish=/);
                refused++;
                continue;
              }
              const e = calculateUkTakeHome({
                salary,
                scottish: scottish ?? false,
                taxCode: code,
                studentLoan: plan,
                pensionMode: p.mode,
                pensionPercent: p.percent,
                pensionAmount: p.amount,
                pensionMethod: p.method ?? 'netPay',
              });
              const got = rec(expr);
              const label = expr;
              same(got.takeHome as number, e.netAnnual, `${label} takeHome`);
              same(got.monthly as number, e.netMonthly, `${label} monthly`);
              same(got.weekly as number, e.netWeekly, `${label} weekly`);
              same(got.incomeTax as number, e.incomeTax, `${label} incomeTax`);
              same(got.ni as number, e.ni, `${label} ni`);
              same(got.studentLoan as number, e.studentLoan, `${label} studentLoan`);
              same(got.pension as number, e.pension.fromPay, `${label} pension`);
              same(got.pensionPot as number, e.pension.gross, `${label} pensionPot`);
              same(got.ani as number, e.adjustedNetIncome, `${label} ani`);
              same(got.personalAllowance as number, e.personalAllowance, `${label} personalAllowance`);
              same(got.taxRate as number, salary > 0 ? ((e.incomeTax + e.ni) / salary) * 100 : 0, `${label} taxRate`);
              expect(Object.keys(got).sort()).toEqual([...FIELDS].sort());
              compared++;
            }
          }
        }
      }
    }
    // The reviewer's grid had 2,464 cases; this one is larger. Both counts are fixed by the loops above.
    report('UK pay (ukPay vs calculateUkTakeHome)', compared, refused);
    expect(compared).toBeGreaterThanOrEqual(2464);
    expect(compared + refused).toBe(total);
  });

  it('the single-value functions return the matching ukPay field', () => {
    for (const salary of [20_000, 50_270, 110_000]) {
      for (const opts of ['', ", code='S1257L'", ', plan=plan2', ', pension=5, method=ras', ", code='K475', plan=plan1"]) {
        const full = rec(`ukPay(${salary}${opts})`);
        same(num(`ukTakeHome(${salary}${opts})`), full.takeHome as number, `ukTakeHome ${salary}${opts}`);
        same(num(`ukIncomeTax(${salary}${opts})`), full.incomeTax as number, `ukIncomeTax ${salary}${opts}`);
        same(num(`ukNi(${salary}${opts})`), full.ni as number, `ukNi ${salary}${opts}`);
        if (opts.includes('plan=')) same(num(`ukStudentLoan(${salary}${opts})`), full.studentLoan as number, `ukStudentLoan ${salary}${opts}`);
      }
    }
  });

  it('marginal rate = the calculator\'s next-GBP-100 rate (income tax + NI + loan), for the whole grid', () => {
    for (const salary of salaries) {
      for (const code of ['1257L', 'S1257L', '1100L', 'K475', 'BR', 'SD1']) {
        for (const plan of plans) {
          for (const p of [pensions[0], pensions[1], pensions[3], pensions[4]]) {
            if (p.mode === 'amount' && p.amount > salary) continue;
            const opts = [`code='${code}'`, p.opts, plan === 'none' ? '' : `plan=${plan}`].filter(Boolean).join(', ');
            const e = calculateUkTakeHome({
              salary,
              scottish: false,
              taxCode: code,
              studentLoan: plan,
              pensionMode: p.mode,
              pensionPercent: p.percent,
              pensionAmount: p.amount,
              pensionMethod: p.method ?? 'netPay',
            });
            same(num(`ukMarginalRate(${salary}, ${opts})`), e.marginal.withNiAndLoan * 100, `ukMarginalRate ${salary} ${opts}`);
          }
        }
      }
    }
  });

  it('resolved divergence (i): flat-rate codes take their rate from the code prefix, not the Scottish flag', () => {
    // D0 with no S prefix is the rest-of-UK 40% code. The calculator ignores the toggle for it, and so does the figure.
    const e = calculateUkTakeHome({
      salary: 30_000, scottish: true, taxCode: 'D0', studentLoan: 'none',
      pensionMode: 'percent', pensionPercent: 0, pensionAmount: 0, pensionMethod: 'netPay',
    });
    expect(e.incomeTax).toBe(12_000);
    same(num('ukIncomeTax(30000, code=D0, scottish=true)'), 12_000, 'D0 + scottish');
    same(num('ukIncomeTax(30000, code=D0, scottish=false)'), 12_000, 'D0 + scottish=false');
    same(num('ukIncomeTax(30000, code=D0)'), 12_000, 'D0');
    // The Scottish flat rates are the S-prefixed codes (SD0 = intermediate 21%, SD1 = higher 42%).
    same(num('ukIncomeTax(30000, code=SD0)'), 30_000 * 0.21, 'SD0');
    same(num('ukIncomeTax(30000, code=SD1)'), 30_000 * 0.42, 'SD1');
    // Bands for a coded allowance DO follow the flag.
    expect(num("ukIncomeTax(50000, code='1257L', scottish=true)")).toBe(num("ukIncomeTax(50000, code='S1257L')"));
  });

  it('resolved divergence (ii): an L code below 1257L is not tapered twice (the calculator uses the lower of code and tapered allowance)', () => {
    const e = calculateUkTakeHome({
      salary: 110_000, scottish: false, taxCode: '1100L', studentLoan: 'none',
      pensionMode: 'percent', pensionPercent: 0, pensionAmount: 0, pensionMethod: 'netPay',
    });
    // Tapered allowance at 110,000 is 12,570 - 5,000 = 7,570, which is below the code's 11,000.
    expect(e.personalAllowance).toBe(7_570);
    same(num("ukPay(110000, code='1100L').personalAllowance"), 7_570, '1100L personal allowance');
    same(num("ukIncomeTax(110000, code='1100L')"), e.incomeTax, '1100L income tax');
    // A code ABOVE the standard allowance keeps its extra allowance on top of the tapered one.
    same(num("ukPay(110000, code='1500L').personalAllowance"), 7_570 + 2_430, '1500L personal allowance');
  });

  it('resolved divergence (iii): relief at source for Scottish taxpayers and K, M, T and emergency codes are supported', () => {
    for (const expr of [
      "ukTakeHome(60000, pension=5, method=ras, scottish=true)",
      "ukTakeHome(60000, pension=5, method=ras, code='S1257L')",
      "ukTakeHome(60000, code='K475')",
      "ukTakeHome(60000, code='1383M')",
      "ukTakeHome(60000, code='1131N')",
      "ukTakeHome(60000, code='500T')",
      "ukTakeHome(60000, code='1257L W1')",
      "ukTakeHome(60000, code='C663L X')",
    ]) {
      expect(Number.isFinite(num(expr)), expr).toBe(true);
    }
    // A K code's tax is capped at half of pay (engine rule), so a tiny salary shows the cap.
    const k = calculateUkTakeHome({
      salary: 5_000, scottish: false, taxCode: 'K9000', studentLoan: 'none',
      pensionMode: 'percent', pensionPercent: 0, pensionAmount: 0, pensionMethod: 'netPay',
    });
    expect(k.kCapApplied).toBe(true);
    same(num("ukIncomeTax(5000, code='K9000')"), k.incomeTax, 'K cap');
  });

  it('codes the calculator does not recognise fail the build instead of falling back to 1257L', () => {
    for (const code of ['', ' ', 'XYZ', '12570', 'D2', 'CD2', 'K', '__proto__', 'CONSTRUCTOR']) {
      if (code.trim() === '') continue; // blank = the calculator's standard 1257L
      throwsFigureError(`ukTakeHome(30000, code='${code}')`, /(not a recognised PAYE tax code|only exists with the S)/);
    }
    // Blank is the calculator's own default (1257L with the taper).
    same(num("ukTakeHome(30000, code='')"), num("ukTakeHome(30000, code='1257L')"), 'blank code');
  });

  it('postgrad=true adds a Postgraduate Loan on the engine\'s own NIC pay (the calculator holds one loan)', () => {
    for (const salary of [25_000, 40_000, 60_000, 110_000]) {
      for (const p of [pensions[0], pensions[1], pensions[2]]) {
        const base = `ukPay(${salary}${p.opts ? ', ' + p.opts : ''}, plan=plan2`;
        const both = rec(`${base}, postgrad=true)`);
        const a = rec(`${base})`);
        const b = rec(`ukPay(${salary}${p.opts ? ', ' + p.opts : ''}, plan=postgrad)`);
        same(both.studentLoan as number, (a.studentLoan as number) + (b.studentLoan as number), `${salary} ${p.label} loans`);
        near(both.takeHome as number, (a.takeHome as number) - (b.studentLoan as number), 1e-9, `${salary} ${p.label} takeHome`);
      }
    }
    expect(calcStudentLoan(40_000, 'postgrad')).toBeGreaterThan(0);
  });

  it('year= is accepted only for the dataset the UK engines use', () => {
    same(num(`ukTakeHome(30000, year='${UK_TAX_YEAR}')`), num('ukTakeHome(30000)'), 'default UK year');
    throwsFigureError('ukTakeHome(30000, year=2027)', /no UK tax data wired for 2027\/28/);
  });
});

/* ════════════════════════════════════════════════════════════
 * UK tax: SDLT and CGT
 * ════════════════════════════════════════════════════════════ */

describe('UK facts: pension access ages come from uk-pension-ages.ts; no State Pension age fact', () => {
  it('pensionAccessAge keys equal the pension-age module, and State Pension age is refused as a fact', () => {
    same(num("ukFact('pensionAccessAge')"), NMPA_CURRENT, 'pensionAccessAge');
    same(num("ukFact('pensionAccessAgeFrom2028')"), NMPA_FROM_2028, 'pensionAccessAgeFrom2028');
    // State Pension age depends on date of birth (66 to 68); one number would mislead.
    throwsFigureError("ukFact('statePensionAge')", /"key" must be one of/);
    throwsFigureError("ukFact('statePensionAgeFrom2028')", /"key" must be one of/);
  });
});

describe('SDLT and UK CGT: figures == engines', () => {
  it('sdlt', () => {
    for (const price of [0, 40_000, 125_000, 250_000, 300_000, 425_000, 500_000, 625_000, 925_000, 1_500_000, 3_000_000]) {
      same(num(`sdlt(${price})`), calculateSdlt(price, 'standard').totalTax, `sdlt ${price}`);
      same(num(`sdlt(${price}, buyer=ftb)`), calculateSdlt(price, 'first-time').totalTax, `sdlt ftb ${price}`);
      same(num(`sdlt(${price}, buyer=additional)`), calculateSdlt(price, 'additional').totalTax, `sdlt additional ${price}`);
    }
  });
  it('ukCgt', () => {
    for (const gain of [0, 2_000, 3_000, 10_000, 50_000, 200_000]) {
      for (const income of [0, 12_570, 20_000, 40_000, 50_270, 80_000, 125_140, 200_000]) {
        same(num(`ukCgt(${gain}, ${income})`), calculateUKCgt(0, gain, income).totalTax, `ukCgt ${gain} ${income}`);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════
 * US pay: years x statuses x salaries x state tax x 401(k)
 * ════════════════════════════════════════════════════════════ */

describe('US pay: figures == computeUsSalary', () => {
  const statuses: FilingStatus[] = ['single', 'married', 'head'];
  const salaries = [0, 10_000, 16_100, 24_150, 50_000, 75_000, 100_000, 150_000, 184_500, 192_300, 200_001, 260_000, 700_000];
  const states = [0, 5, 9.3];
  const k401s: Array<{ opts: string; pct: number; amount: number }> = [
    { opts: '', pct: 0, amount: 0 },
    { opts: 'k401=6', pct: 6, amount: 0 },
    { opts: 'k401=100', pct: 100, amount: 0 },
    { opts: 'k401Amount=10000', pct: 0, amount: 10_000 },
    { opts: 'k401Amount=30000', pct: 0, amount: 30_000 },
  ];
  const FIELDS = ['takeHome', 'monthly', 'biweekly', 'weekly', 'federal', 'fica', 'socialSecurity', 'medicare', 'state', 'k401', 'taxRate', 'effectiveRate', 'taxableIncome', 'bracket'];

  function engine(year: UsTaxYear, salary: number, status: FilingStatus, state: number, pct: number, amount: number) {
    return computeUsSalary({
      year, mode: 'annual', salary, hourlyRate: 0, hoursPerWeek: 40, weeksPerYear: 52, overtimeHours: 0,
      overtimeQualifies: true, stateTaxRate: state, filingStatus: status,
      retirement401kPct: pct > 0 ? pct : salary > 0 ? (amount / salary) * 100 : 0, seniors: 0,
    });
  }

  it('every combination equals the engine (0 diffs); refusals are over-large 401(k) and unpublished limits', () => {
    let compared = 0;
    let refused = 0;
    for (const year of US_TAX_YEARS) {
      const k = getUsRates(year).retirement401k;
      for (const status of statuses) {
        for (const salary of salaries) {
          for (const state of states) {
            for (const c of k401s) {
              const opts = [`status=${status}`, `state=${state}`, c.opts, `year=${year}`].filter(Boolean).join(', ');
              const expr = `usPay(${salary}, ${opts})`;
              const requested = c.pct > 0 ? (salary * c.pct) / 100 : c.amount;
              if (requested > salary) {
                throwsFigureError(expr, /more than the salary/);
                refused++;
                continue;
              }
              if (!k.published && requested > k.limit) {
                throwsFigureError(expr, /has not published the \d{4} 401\(k\) limit/);
                refused++;
                continue;
              }
              const e = engine(year, salary, status, state, c.pct, c.amount);
              const got = rec(expr);
              const fica = e.socialSecurity + e.medicare;
              same(got.takeHome as number, e.netAnnual, `${expr} takeHome`);
              same(got.monthly as number, e.netAnnual / 12, `${expr} monthly`);
              same(got.biweekly as number, e.netAnnual / 26, `${expr} biweekly`);
              same(got.weekly as number, e.netAnnual / 52, `${expr} weekly`);
              same(got.federal as number, e.federalTax, `${expr} federal`);
              same(got.fica as number, fica, `${expr} fica`);
              same(got.socialSecurity as number, e.socialSecurity, `${expr} ss`);
              same(got.medicare as number, e.medicare, `${expr} medicare`);
              same(got.state as number, e.stateTax, `${expr} state`);
              same(got.k401 as number, e.retirement401k, `${expr} k401`);
              same(got.taxRate as number, salary > 0 ? ((e.federalTax + fica + e.stateTax) / salary) * 100 : 0, `${expr} taxRate`);
              same(got.effectiveRate as number, e.effectiveDeductionRate * 100, `${expr} effectiveRate`);
              same(got.taxableIncome as number, e.taxableIncome, `${expr} taxableIncome`);
              same(got.bracket as number, e.marginalFederalRate * 100, `${expr} bracket`);
              expect(Object.keys(got).sort()).toEqual([...FIELDS].sort());
              // Independent cross-check with the simple hub model (standard deduction only).
              near(got.federal as number, calcFederalTax(salary - e.retirement401k, status, year), 1e-9, `${expr} simple-model federal`);
              near(got.fica as number, calcFICA(salary, status, year).total, 1e-9, `${expr} simple-model fica`);
              compared++;
            }
          }
        }
      }
    }
    report('US pay (usPay vs computeUsSalary)', compared, refused);
    expect(compared).toBeGreaterThan(900);
    expect(compared + refused).toBe(US_TAX_YEARS.length * statuses.length * salaries.length * states.length * k401s.length);
  });

  it('no year= uses the calculator default year (US_DEFAULT_TAX_YEAR)', () => {
    for (const status of statuses) {
      for (const salary of [40_000, 75_000, 250_000]) {
        same(num(`usTakeHome(${salary}, status=${status})`), num(`usTakeHome(${salary}, status=${status}, year=${US_DEFAULT_TAX_YEAR})`), `default year ${salary} ${status}`);
      }
    }
    expect(US_TAX_YEAR).toBe(String(US_DEFAULT_TAX_YEAR));
  });

  it('TY2026 and TY2027 differ where the IRS changed the numbers, and a missing year fails', () => {
    expect(num('usFederalTax(100000, year=2026)')).not.toBe(num('usFederalTax(100000, year=2027)'));
    expect(num("usFact('ssWageBase', year=2026)")).toBe(184_500);
    expect(num("usFact('ssWageBase', year=2027)")).toBe(192_300);
    throwsFigureError('usTakeHome(75000, year=1999)', /no US tax data wired for 1999 \(available: 2026, 2027\)/);
  });

  it('single-value functions and usMarginalRate come from the same engine', () => {
    for (const year of US_TAX_YEARS) {
      for (const status of statuses) {
        for (const salary of [30_000, 90_000, 400_000]) {
          const opts = `status=${status}, state=5, year=${year}`;
          const full = rec(`usPay(${salary}, ${opts})`);
          same(num(`usTakeHome(${salary}, ${opts})`), full.takeHome as number, 'usTakeHome');
          same(num(`usFederalTax(${salary}, ${opts})`), full.federal as number, 'usFederalTax');
          same(num(`usFica(${salary}, ${opts})`), full.fica as number, 'usFica');
          same(num(`usBracket(${salary}, ${opts})`), full.bracket as number, 'usBracket');
          const e1 = engine(year, salary + 1, status, 5, 0, 0);
          const e0 = engine(year, salary, status, 5, 0, 0);
          const lost = (e: ReturnType<typeof engine>) => e.federalTax + (e.socialSecurity + e.medicare) + e.stateTax;
          same(num(`usMarginalRate(${salary}, ${opts})`), (lost(e1) - lost(e0)) * 100, 'usMarginalRate');
        }
      }
    }
  });

  it('the calculator shows the lowest bracket (10%) when taxable income is 0, and so does the figure', () => {
    same(num('usBracket(10000)'), 10, 'usBracket below the standard deduction');
  });

  it('facts, bracket starts and CGT take the year from us-rates.ts', () => {
    for (const year of US_TAX_YEARS) {
      const r = getUsRates(year);
      for (const status of statuses) {
        same(num(`usFact('standardDeduction', status=${status}, year=${year})`), r.standardDeduction[status], 'standardDeduction');
        same(num(`usFact('additionalMedicareThreshold', status=${status}, year=${year})`), r.medicare.additionalThreshold[status], 'additional medicare threshold');
        same(num(`usFact('niitThreshold', status=${status}, year=${year})`), r.capitalGains.niit.threshold[status], 'niit threshold');
        same(num(`usFact('ltcgZeroTop', status=${status}, year=${year})`), r.capitalGains.longTerm[status][1].from, 'ltcg zero top');
        same(num(`usFact('ltcg15Top', status=${status}, year=${year})`), r.capitalGains.longTerm[status][2].from, 'ltcg 15 top');
        for (const [from, rate] of r.brackets[status]) {
          same(num(`usBracketStart(${Math.round(rate * 100)}, status=${status}, year=${year})`), from, `bracket start ${rate} ${status} ${year}`);
        }
        for (const gain of [0, 20_000, 80_000, 300_000]) {
          for (const income of [0, 30_000, 90_000, 250_000]) {
            for (const holding of ['long', 'short'] as const) {
              same(
                num(`usCgt(${gain}, ${income}, status=${status}, holding=${holding}, year=${year})`),
                calculateUSCgt(0, gain, holding, status, income, r).totalTax,
                `usCgt ${gain} ${income} ${status} ${holding} ${year}`,
              );
            }
          }
        }
      }
      same(num(`usFact('ssRate', year=${year})`), r.socialSecurity.rate * 100, 'ssRate');
      same(num(`usFact('medicareRate', year=${year})`), r.medicare.rate * 100, 'medicareRate');
    }
  });

  it('401(k) facts for a year whose IRS limits are not published are refused; published years print', () => {
    for (const year of US_TAX_YEARS) {
      const k = getUsRates(year).retirement401k;
      for (const key of ['k401Limit', 'k401CatchUp', 'k401CatchUp60to63']) {
        const expr = `usFact('${key}', year=${year})`;
        if (k.published) {
          same(num(expr), key === 'k401Limit' ? k.limit : key === 'k401CatchUp' ? k.catchUp : k.catchUp60to63, expr);
        } else {
          throwsFigureError(expr, /has not published the \d{4} 401\(k\) limits/);
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════
 * Debt: card and loan payoff
 * ════════════════════════════════════════════════════════════ */

describe('card payoff: figures == simulateCardPayoff (600-month horizon)', () => {
  const balances = [500, 5_000, 20_000, 50_000];
  const aprs = [0, 9.9, 22.99, 29.99];
  const fixedPayments = [10, 50, 100, 200, 600, 1_200, 5_000];
  const pctModes: Array<{ pct: number; floor: number }> = [
    { pct: 1, floor: 10 }, { pct: 2, floor: 25 }, { pct: 3, floor: 25 }, { pct: 5, floor: 5 },
  ];
  const extras = [0, 50, 500];

  function check(expr: string, inputs: CardPayoffInputs): 'paid' | 'never' | 'beyondHorizon' | 'noBalance' {
    const e = simulateCardPayoff(inputs);
    if (e.status === 'beyondHorizon') {
      throwsFigureError(`${expr}.months`, new RegExp(`not cleared within ${CARD_HORIZON_MONTHS} months`));
      return e.status;
    }
    const got = rec(expr);
    if (e.status === 'never') {
      expect(got.months, expr).toBe(Infinity);
      expect(got.interest, expr).toBe(Infinity);
      expect(got.totalPaid, expr).toBe(Infinity);
      expect(got.never, expr).toBe(true);
    } else {
      same(got.months as number, e.months, `${expr} months`);
      same(got.interest as number, e.totalInterest, `${expr} interest`);
      same(got.totalPaid as number, e.totalPaid, `${expr} totalPaid`);
      expect(got.never, expr).toBe(false);
    }
    same(got.firstInterest as number, e.firstMonthInterest, `${expr} firstInterest`);
    same(got.firstPayment as number, e.firstPayment, `${expr} firstPayment`);
    return e.status;
  }

  it('fixed payments, with and without extra, and loanPayoff', () => {
    const seen = new Set<string>();
    let count = 0;
    for (const balance of balances) {
      for (const apr of aprs) {
        for (const payment of fixedPayments) {
          for (const extra of extras) {
            count++;
            const expr = `cardPayoff(${balance}, ${apr}, ${payment}${extra ? `, extra=${extra}` : ''})`;
            const inputs: CardPayoffInputs = { balance, aprPercent: apr, mode: 'fixed', fixedPayment: payment, percentOfBalance: 0, floor: 0, extra };
            seen.add(check(expr, inputs));
            if (apr > 0 || extra === 0) {
              check(`loanPayoff(${balance}, ${apr}, ${payment}${extra ? `, extra=${extra}` : ''})`, inputs);
            }
          }
        }
      }
    }
    report('cardPayoff/loanPayoff fixed payment vs simulateCardPayoff', count);
    expect([...seen].sort()).toEqual(['beyondHorizon', 'never', 'paid']);
  });

  it('declining minimum (percentage) and interest-plus-percentage minimum', () => {
    const seen = new Set<string>();
    for (const balance of balances) {
      for (const apr of aprs) {
        for (const m of pctModes) {
          for (const plusInterest of [false, true]) {
            for (const extra of extras) {
              const expr = `cardPayoff(${balance}, ${apr}, minPct=${m.pct}, minFloor=${m.floor}${plusInterest ? ', plusInterest=true' : ''}${extra ? `, extra=${extra}` : ''})`;
              seen.add(
                check(expr, {
                  balance, aprPercent: apr, mode: plusInterest ? 'interestPlus' : 'percentage',
                  fixedPayment: 0, percentOfBalance: m.pct, floor: m.floor, extra,
                }),
              );
            }
          }
        }
      }
    }
    expect([...seen]).toEqual(expect.arrayContaining(['paid', 'beyondHorizon']));
  });

  it('a payment that does not exceed the first month\'s interest is "never"; a slow decline past 600 months is refused, not printed', () => {
    expect(v('cardPayoff(8000, 24, 160).months')).toBe(Infinity);
    expect(v('cardPayoff(8000, 24, 160).never')).toBe(true);
    throwsFigureError('cardPayoff(50000, 22, minPct=2, minFloor=25).months', /beyond 50 years/);
    // The old figure code capped at 1,200 months; the calculator's horizon is 600.
    expect(simulateCardPayoff({ balance: 50_000, aprPercent: 22, mode: 'percentage', fixedPayment: 0, percentOfBalance: 2, floor: 25, extra: 0 }).status).toBe('beyondHorizon');
  });

  it('payoffBalance = the full schedule\'s balance after that many months', () => {
    for (const balance of [5_000, 50_000]) {
      for (const apr of [0, 9.9, 22]) {
        for (const payment of [100, 600, 1_200, 5_000]) {
          const full = simulateCardPayoff({ balance, aprPercent: apr, mode: 'fixed', fixedPayment: payment, percentOfBalance: 0, floor: 0, extra: 0 });
          for (const months of [0, 1, 6, 12, 48, 120, 360, 600]) {
            const expr = `payoffBalance(${balance}, ${apr}, ${payment}, ${months})`;
            if (months === 0) {
              same(num(expr), balance, expr); // no payments made yet: the starting balance, whatever the payment
              continue;
            }
            if (full.status === 'never') {
              throwsFigureError(expr, /never repaid/);
              continue;
            }
            const expected = months > full.schedule.length ? 0 : full.schedule[months - 1].balance;
            near(num(expr), expected, 0.005, expr);
          }
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════
 * Investing: fee drag, compounding, targets, retirement, savings, inflation
 * ════════════════════════════════════════════════════════════ */

describe('fee drag: figures == compareFees', () => {
  it('grid of starts, deposits, returns, terms and fees', () => {
    let compared = 0;
    let refused = 0;
    for (const start of [0, 10_000, 100_000]) {
      for (const monthly of [0, 200, 1_000]) {
        for (const rate of [0, 4, 7, 10]) {
          for (const years of [1, 10, 30, 40]) {
            for (const fee of [0, 0.1, 0.5, 1, 1.5, 3]) {
              for (const compareFee of [0, 0.03, 1]) {
                const expr = `feeDrag(${start}, ${monthly}, ${rate}, ${years}, ${fee}, compareFee=${compareFee})`;
                const c = compareFees({ principal: start, monthlyContribution: monthly, grossReturnPercent: rate, years, yourFeePercent: fee, comparisonFeePercent: compareFee });
                if (c.shareOfReturnsLost === null) {
                  throwsFigureError(`${expr}.cost`, /earns nothing/);
                  refused++;
                  continue;
                }
                const got = rec(expr);
                same(got.cost as number, c.feeCost, `${expr} cost`);
                same(got.balance as number, c.yourBalance, `${expr} balance`);
                same(got.compareBalance as number, c.compBalance, `${expr} compareBalance`);
                same(got.zeroFeeBalance as number, c.zeroFeeBalance, `${expr} zeroFeeBalance`);
                same(got.feesPaid as number, c.yourFeesPaid, `${expr} feesPaid`);
                same(got.contributions as number, c.totalContributions, `${expr} contributions`);
                same(got.shareOfGrowth as number, c.shareOfReturnsLost * 100, `${expr} shareOfGrowth`);
                same(got.contributionsLost as number, c.contributionsLost, `${expr} contributionsLost`);
                compared++;
              }
            }
          }
        }
      }
    }
    report('feeDrag vs compareFees', compared, refused);
    expect(compared).toBeGreaterThan(1500);
  });

  it('MTH-08 table ($100k + $500/month at 7% for 30 years at 0.03 / 0.5 / 1 / 1.5% fees)', () => {
    const at = (fee: number) => Math.round(num(`feeDrag(100000, 500, 7, 30, ${fee}).balance`));
    expect(at(0.03)).toBe(1_410_807);
    expect(at(0.5)).toBe(1_252_269);
    expect(at(1)).toBe(1_104_515);
    expect(at(1.5)).toBe(975_545);
  });
});

describe('growth, targets and savings: figures == the calculators\' engines', () => {
  it('compoundFV and compoundEarned = futureValue (the compound interest engine)', () => {
    for (const start of [0, 1_000, 25_000]) {
      for (const monthly of [0, 250]) {
        for (const rate of [0, 3.5, 7, 12]) {
          for (const years of [1, 5, 18.5, 30]) {
            for (const [word, n] of [['annually', 1], ['quarterly', 4], ['monthly', 12], ['daily', 365]] as const) {
              for (const timing of ['end', 'beginning'] as const) {
                const expected = futureValue({ principal: start, monthlyContribution: monthly, annualRate: rate / 100, compoundingPerYear: n, timing }, years * 12);
                const opts = `compounding=${word}, timing=${timing}`;
                same(num(`compoundFV(${start}, ${monthly}, ${rate}, ${years}, ${opts})`), expected, `compoundFV ${start} ${monthly} ${rate} ${years} ${opts}`);
                near(num(`compoundEarned(${start}, ${monthly}, ${rate}, ${years}, ${opts})`), expected - start - monthly * 12 * years, 1e-6, 'compoundEarned');
              }
            }
          }
        }
      }
    }
  });

  it('yearsToTarget = solveMonthsToTarget / 12 (whole months, as the Time tab shows)', () => {
    for (const start of [0, 10_000, 500_000]) {
      for (const monthly of [0, 300, 2_000]) {
        for (const rate of [0, 2, 7, 15]) {
          for (const target of [50_000, 1_000_000, 5_000_000]) {
            for (const timing of ['end', 'beginning'] as const) {
              for (const n of [1, 12, 365]) {
                const expr = `yearsToTarget(${start}, ${monthly}, ${rate}, ${target}, compounding=${n}, timing=${timing})`;
                const r = solveMonthsToTarget({ principal: start, monthlyContribution: monthly, annualRate: rate / 100, compoundingPerYear: n, timing }, target);
                same(num(expr), r.status === 'notWithin' ? Infinity : r.months / 12, expr);
              }
            }
          }
        }
      }
    }
    // Whole months: the old binary search gave 34.8 years as a fraction that no month-end hits.
    expect(num('yearsToTarget(10000, 500, 7, 1000000)') * 12).toBe(Math.round(num('yearsToTarget(10000, 500, 7, 1000000)') * 12));
  });

  it('savingsMonthly and savingsMonths = monthlyForGoal and timeToGoal (the savings goal engine)', () => {
    for (const goal of [1_000, 20_000, 100_000]) {
      for (const current of [0, 5_000, 25_000, 120_000]) {
        for (const rate of [0, 2, 4.5, 10]) {
          for (const months of [1, 12, 60, 360]) {
            const m = monthlyForGoal({ goal, current, annualRate: rate / 100, months });
            same(num(`savingsMonthly(${goal}, ${current}, ${rate}, ${months})`), m.monthly, `savingsMonthly ${goal} ${current} ${rate} ${months}`);
          }
          for (const monthly of [0, 100, 1_000]) {
            const t = timeToGoal({ goal, current, monthly, annualRate: rate / 100 });
            const expected = t.status === 'ok' ? t.months : t.status === 'reached' ? 0 : Infinity;
            same(num(`savingsMonths(${goal}, ${current}, ${monthly}, ${rate})`), expected, `savingsMonths ${goal} ${current} ${monthly} ${rate}`);
          }
        }
      }
    }
  });

  it('retirementFV = projectRetirement (the retirement savings engine)', () => {
    for (const savings of [0, 20_000, 250_000]) {
      for (const monthly of [0, 300, 2_500]) {
        for (const rate of [0, 4, 7]) {
          for (const years of [0, 1, 12.5, 35, 50]) {
            for (const inflation of [0, 2.5, 4]) {
              const p = projectRetirement({ currentAge: 0, retirementAge: years, currentSavings: savings, monthlyContribution: monthly, annualReturn: rate / 100, inflation: inflation / 100 });
              const expr = `retirementFV(${savings}, ${monthly}, ${rate}, ${years}${inflation ? `, inflation=${inflation}` : ''})`;
              const got = rec(expr);
              same(got.nominal as number, p.nominal, `${expr} nominal`);
              same(got.real as number, p.real, `${expr} real`);
              same(got.contributions as number, p.totalContributions, `${expr} contributions`);
              same(got.growth as number, p.totalGrowth, `${expr} growth`);
            }
          }
        }
      }
    }
  });

  it('inflationAdjust = projectInflation, cpiAdjust = adjustForInflation (BLS CPI-U)', () => {
    for (const amount of [100, 45_000]) {
      for (const rate of [0, 2, 3, 8]) {
        for (const years of [0, 1, 20, 100]) {
          const p = projectInflation(amount, rate / 100, years);
          same(num(`inflationAdjust(${amount}, ${rate}, ${years})`), p.futureCost, `cost ${amount} ${rate} ${years}`);
          same(num(`inflationAdjust(${amount}, ${rate}, ${years}, mode=value)`), p.purchasingPower, `value ${amount} ${rate} ${years}`);
        }
      }
    }
    const years = [CPI_FIRST_YEAR, 1950, 1982, 2000, 2010, 2019, 2024, 2025, CPI_LAST_YEAR];
    for (const from of years) {
      for (const to of years) {
        const expr = `cpiAdjust(45000, ${from}, ${to})`;
        if (from === to) {
          throwsFigureError(`${expr}.adjusted`, /same year/);
          continue;
        }
        const r = adjustForInflation(45_000, from, to)!;
        const got = rec(expr);
        same(got.adjusted as number, r.adjusted, `${expr} adjusted`);
        same(got.cumulativeChange as number, r.cumulativeChange * 100, `${expr} cumulativeChange`);
        same(got.averageAnnual as number, r.averageAnnual * 100, `${expr} averageAnnual`);
        same(got.years as number, r.years, `${expr} years`);
      }
    }
    // The plan's W1-SAVE reference value: $45,000 of 2010 in 2025 prices.
    expect(Math.round(num('cpiAdjust(45000, 2010, 2025).adjusted'))).toBe(66_439);
    throwsFigureError('cpiAdjust(100, 1900, 2000).adjusted', /at least 1913/);
    throwsFigureError(`cpiAdjust(100, 2000, ${CPI_LAST_YEAR + 1}).adjusted`, /at most/);
  });
});

/* ════════════════════════════════════════════════════════════
 * Market rates
 * ════════════════════════════════════════════════════════════ */

describe('rate and rateSource = market-rates.ts', () => {
  const table: Array<[string, (typeof MARKET_RATES)['us']['mortgage30']]> = [
    ['us30', MARKET_RATES.us.mortgage30],
    ['us15', MARKET_RATES.us.mortgage15],
    ['boe', MARKET_RATES.uk.bankRate],
    ['uk2yr', MARKET_RATES.uk.fixed2yr75],
    ['uk5yr', MARKET_RATES.uk.fixed5yr75],
    ['ukRevert', MARKET_RATES.uk.revertRate],
    ['eur', MARKET_RATES.eur.housePurchase],
  ];
  it('every key returns the module\'s value and its dated source', () => {
    for (const [key, r] of table) {
      same(num(`rate('${key}')`), r.value, `rate ${key}`);
      expect(v(`rateSource('${key}')`), key).toBe(rateAttribution(r));
    }
    throwsFigureError("rate('us40')", /must be one of/);
  });
});

/* ════════════════════════════════════════════════════════════
 * Loan family: its own arithmetic, proven equal to mortgage-payment.ts
 * ════════════════════════════════════════════════════════════ */

describe('loans: figures agree with mortgage-payment.ts (the mortgage and loan tools\' engine)', () => {
  const principals = [10_000, 50_000, 300_000, 750_000];
  const rates = [0, 3.5, 6.5, 7.11, 12];
  const terms = [1, 4, 15, 30];

  it('payment, total interest, balance, month and year rows to 1e-6', () => {
    for (const P of principals) {
      for (const rate of rates) {
        for (const years of terms) {
          const n = years * 12;
          const sched = buildAmortization(P, rate, n);
          const tag = `${P} ${rate}% ${years}y`;
          near(num(`loanPayment(${P}, ${rate}, ${years})`), monthlyPayment(P, rate, n), 1e-6, `loanPayment ${tag}`);
          near(num(`mortgagePayment(${P}, ${rate}, ${years})`), monthlyPayment(P, rate, n), 1e-6, `mortgagePayment ${tag}`);
          near(num(`loanTotalInterest(${P}, ${rate}, ${years})`), sched.totalInterest, 1e-4, `loanTotalInterest ${tag}`);
          near(num(`mortgageTotalInterest(${P}, ${rate}, ${years})`), sched.totalInterest, 1e-4, `mortgageTotalInterest ${tag}`);
          for (const k of [0, 1, 12, Math.floor(n / 2), n - 1, n]) {
            const expected = k === 0 ? P : k > sched.months.length ? 0 : sched.months[k - 1].balance;
            near(num(`loanBalance(${P}, ${rate}, ${years}, ${k})`), expected, 1e-4, `loanBalance ${tag} k=${k}`);
          }
          for (const k of [1, 2, 12, Math.floor(n / 2), n]) {
            const row = sched.months[k - 1];
            const got = rec(`loanMonth(${P}, ${rate}, ${years}, ${k})`);
            near(got.payment as number, row.payment, 1e-6, `loanMonth.payment ${tag} k=${k}`);
            near(got.interest as number, row.interest, 1e-4, `loanMonth.interest ${tag} k=${k}`);
            near(got.principal as number, row.principal, 1e-4, `loanMonth.principal ${tag} k=${k}`);
            near(got.balance as number, row.balance, 1e-4, `loanMonth.balance ${tag} k=${k}`);
          }
          for (let y = 1; y <= years; y += Math.max(1, Math.floor(years / 3))) {
            const g = sched.yearGroups[y - 1];
            const got = rec(`loanYear(${P}, ${rate}, ${years}, ${y})`);
            near(got.interest as number, g.totalInterest, 1e-3, `loanYear.interest ${tag} y=${y}`);
            near(got.principal as number, g.totalPrincipal, 1e-3, `loanYear.principal ${tag} y=${y}`);
            near(got.endBalance as number, g.endBalance, 1e-3, `loanYear.endBalance ${tag} y=${y}`);
          }
        }
      }
    }
  });

  it('monthly overpayments = buildAmortization with an extra monthly payment', () => {
    for (const P of [50_000, 300_000]) {
      for (const rate of [0, 6.5, 7.11]) {
        for (const years of [4, 30]) {
          for (const extra of [50, 200, 1_000]) {
            const n = years * 12;
            const base = buildAmortization(P, rate, n);
            const withExtra = buildAmortization(P, rate, n, extra);
            const got = rec(`overpaymentSaving(${P}, ${rate}, ${years}, monthly=${extra})`);
            const tag = `${P} ${rate}% ${years}y +${extra}`;
            same(got.months as number, withExtra.payoffMonths, `months ${tag}`);
            same(got.monthsSaved as number, base.payoffMonths - withExtra.payoffMonths, `monthsSaved ${tag}`);
            near(got.interest as number, withExtra.totalInterest, 1e-3, `interest ${tag}`);
            near(got.baseInterest as number, base.totalInterest, 1e-3, `baseInterest ${tag}`);
            near(got.interestSaved as number, base.totalInterest - withExtra.totalInterest, 1e-3, `interestSaved ${tag}`);
          }
        }
      }
    }
  });
});

/**
 * Figure engine tests: formatters, failure modes, and every catalogue function
 * cross-checked against the src/lib engines (and against independent hand
 * calculations / the review's recomputed values where noted).
 *
 * Literal spot checks are guarded by the dataset year so they don't turn into
 * a time bomb when the rates modules move to the next tax year; the engine
 * cross-checks run for every year.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  evaluateFigure as f,
  evaluateFigureValue,
  FIGURE_FUNCTIONS,
  FIGURE_FORMATTERS,
  FigureError,
  resolveFigures,
  resolveFiguresDetailed,
  resolveFiguresPlain,
  figureSignature,
} from './figures';
import { MAX_SOLVE_MONTHS, solveMonthsToTarget } from './investment-solvers';
import { MAX_GOAL_MONTHS, timeToGoal } from './savings-goal';
import {
  compoundInterest,
  amortizationSchedule,
  loanMonthlyPayment,
  monthlySavingsRequired,
} from './calculator-utils';
import { calcSimpleIncomeTax, calcNI, calcStudentLoan, calcIncomeTax } from './uk-tax-calc';
import { calcFederalTax, calcFICA } from './us-tax-calc';
import { calculateSdlt } from './stamp-duty';
import { calculateUKCgt, calculateUSCgt } from './capital-gains';
import {
  UK_TAX_YEAR,
  UK_INCOME_TAX,
  UK_NI,
  UK_STUDENT_LOANS,
  UK_SCOTTISH_TAX,
  UK_SDLT,
  UK_STATE_PENSION,
} from './uk-rates';
import { US_TAX_YEAR, US_401K, US_STANDARD_DEDUCTION, US_BRACKETS } from './us-rates';

/** Evaluate a token and parse the printed number back (for numeric cross-checks). */
function n(src: string): number {
  const out = f(src);
  if (out === 'never') return Infinity;
  return Number(out.replace(/[£$€,%]/g, ''));
}
const close = (a: number, b: number, tol = 0.005) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const UK_2026 = UK_TAX_YEAR === '2026/27';
const US_2026 = US_TAX_YEAR === '2026';

/* ── Formatters ─────────────────────────────────────────── */

describe('formatters', () => {
  it('money: grouped, rounded, signed, never "-£0"', () => {
    expect(f('1234.5 | gbp')).toBe('£1,235');
    expect(f('1234.5 | usd(2)')).toBe('$1,234.50');
    expect(f('1234567 | eur')).toBe('€1,234,567');
    expect(f('-1885.4 | usd')).toBe('-$1,885');
    expect(f('-0.3 | usd')).toBe('$0');
    expect(f('0 | gbp(2)')).toBe('£0.00');
    expect(f('55.35 | gbp(2)')).toBe('£55.35');
  });

  it('percentages take a percentage number', () => {
    expect(f('22.94 | pct')).toBe('23%');
    expect(f('22.94 | pct1')).toBe('22.9%');
    expect(f('6.5 | pct(2)')).toBe('6.50%');
    expect(f('6.5 | pct(auto)')).toBe('6.5%');
    expect(f('9 | pct(auto)')).toBe('9%');
    expect(f('4.756 | pct(auto)')).toBe('4.76%');
  });

  it('int and num', () => {
    expect(f('1234.6 | int')).toBe('1,235');
    expect(f('20.3615 | num(2)')).toBe('20.36');
    expect(f('1234.5 | num(auto)')).toBe('1,234.5');
    expect(f('-2.5 | num(1)')).toBe('-2.5');
  });

  it('months', () => {
    expect(f('167 | months')).toBe('13 years 11 months');
    expect(f('12 | months')).toBe('1 year');
    expect(f('13 | months')).toBe('1 year 1 month');
    expect(f('11 | months')).toBe('11 months');
    expect(f('1 | months')).toBe('1 month');
    expect(f('0 | months')).toBe('0 months');
    expect(f('45.4 | months')).toBe('3 years 9 months');
    expect(f('cardPayoff(8000, 24, 100).months | months')).toBe('never');
  });

  it('numeric transforms', () => {
    expect(f('37540 | round100 | usd')).toBe('$37,500');
    expect(f('37540 | roundTo(1000) | usd')).toBe('$38,000');
    expect(f('2.26 | roundTo(0.5) | num(1)')).toBe('2.5');
    expect(f('45.2 | ceil | months')).toBe('3 years 10 months');
    expect(f('45 | ceil | int')).toBe('45');
    expect(f('45.8 | floor | int')).toBe('45');
    expect(f('-1885 | abs | usd')).toBe('$1,885');
    expect(f('-20 | round100 | usd')).toBe('$0');
  });

  it('formatter failures', () => {
    expect(() => f("taxYear('uk') | gbp")).toThrow(/needs a number, got text/);
    expect(() => f('1 | usd(9)')).toThrow(/decimals 0-4/);
    expect(() => f('1 | usd(1, 2)')).toThrow(/at most one argument/);
    expect(() => f('1 | pct1(2)')).toThrow(/takes no arguments/);
    expect(() => f('1 | roundTo(0)')).toThrow(/positive step/);
    expect(() => f('-3 | months')).toThrow(/negative/);
    expect(() => f('cardPayoff(8000, 24, 100).interest | usd')).toThrow(/Infinity.*never/);
    expect(() => f('1 | dollars')).toThrow(/unknown formatter "dollars"/);
    expect(() => f('1 | gbpp')).toThrow(/did you mean "gbp"/);
  });
});

/* ── Failure modes (each must throw a FigureError, never print) ── */

describe('failure modes', () => {
  const cases: Array<[string, RegExp]> = [
    ['ukTakehome(30000) | gbp', /unknown function "ukTakehome" \(did you mean "ukTakeHome"\?\)/],
    ['nope(1) | gbp', /unknown function "nope"/],
    // A token must compute: a bare word or quoted text would print as typed
    ['taxYear', /"taxYear" on its own is just a word.*missing "\(\)"\? call it, e\.g\. taxYear\(country\)/],
    ['ukTakehome', /missing "\(\)"\?.*did you mean "ukTakeHome"/],
    ['plan2 | gbp', /"plan2" on its own is just a word/],
    ["'£25,064'", /quoted text on its own prints as typed/],
    ['"25064" | gbp', /quoted text on its own prints as typed/],
    // Prototype names are never fields, options, codes or aliases
    ['ukPay(30000).constructor | gbp', /no field ".constructor"/],
    ['ukPay(30000).__proto__ | gbp', /no field ".__proto__"/],
    ['ukPay(30000).toString | gbp', /no field ".toString"/],
    ['compoundFV(1000, 0, 7, 10, compounding=constructor) | usd', /compounding must be a number or one of/],
    ['sdlt(300000, buyer=toString) | gbp', /"buyer" must be one of/],
    ["ukTakeHome(30000, code='__proto__') | gbp", /not a recognised PAYE tax code/],
    ["ukTakeHome(30000, code='CONSTRUCTOR') | gbp", /not a recognised PAYE tax code/],
    ["ukTakeHome(30000, code='12570') | gbp", /not a recognised PAYE tax code/],
    ['ukTakeHome(30000, plan=plan9) | gbp', /"plan" must be one of .*plan2.*got "plan9"/],
    ['ukTakeHome(30000, plna=plan2) | gbp', /unknown option "plna" \(did you mean "plan"\?\)/],
    ['ukTakeHome() | gbp', /missing "salary"/],
    ['ukTakeHome(30000, 2) | gbp', /too many positional arguments/],
    ["ukTakeHome('30000') | gbp", /"salary" must be a number, got text/],
    ['ukTakeHome(-1) | gbp', /at least 0/],
    ['ukTakeHome(plan=plan2, 30000) | gbp', /positional arguments must come before named ones/],
    ['ukTakeHome(30000, plan=plan2, plan=plan1) | gbp', /given twice/],
    ['ukTakeHome(30000, salary=1) | gbp', /given twice/],
    ['ukTakeHome(30000)', /result is a number .* add a formatter/],
    ['ukPay(30000) | gbp', /needs a number, got an object/],
    ['ukPay(30000)', /result is an object; pick a field/],
    ['ukPay(30000).takehome | gbp', /no field ".takehome".*did you mean "takeHome"/],
    ['cardPayoff(5000, 20, 100).never', /result is a boolean/],
    ['ukTakeHome(ukPay(30000)) | gbp', /not an object with fields/],
    ['1 / 0 | gbp', /division by zero/],
    ["'a' + 1 | gbp", /works on numbers only/],
    ["-'a' | gbp", /cannot negate/],
    ['(1).x | gbp', /needs an object result/],
    ['ukTakeHome(30000 | gbp', /syntax error/],
    ['ukTakeHome(30000, pension=5) | gbp', /needs method=sacrifice/],
    ['ukTakeHome(30000, pension=5, pensionAmount=100, method=net) | gbp', /not both/],
    ['ukTakeHome(30000, pensionAmount=40000, method=net) | gbp', /more than the salary/],
    ["ukTakeHome(30000, code='D2') | gbp", /only exists with the S/],
    ["ukTakeHome(30000, code='S1257L', scottish=false) | gbp", /contradicts scottish=false/],
    ['ukTakeHome(30000, plan=postgrad, postgrad=true) | gbp', /same loan/],
    ['ukStudentLoan(30000) | gbp', /needs plan=/],
    ['ukTakeHome(30000, year=2027) | gbp', /no UK tax data wired for 2027\/28/],
    ["ukTakeHome(30000, year='27/28') | gbp", /must look like 2026\/27/],
    ['usTakeHome(75000, year=1999) | usd', /no US tax data wired for 1999/],
    ['usTakeHome(75000, status=widow) | usd', /"status" must be one of/],
    ['usTakeHome(75000, k401=5, k401Amount=100) | usd', /not both/],
    ['usBracketStart(23) | usd', /no 23% federal bracket/],
    ["ukFact('personalallowance') | gbp", /did you mean "personalAllowance"/],
    ["ukFact('statePensionAge') | int", /"key" must be one of/],
    ['loanPayment(0, 7, 4) | usd', /more than 0/],
    ['loanPayment(50000, 7, 4.1) | usd', /not a whole number of months/],
    ['loanPayment(50000, 101, 4) | usd', /at most 100/],
    ['loanBalance(50000, 7, 4, 49) | usd', /beyond the 48-month term/],
    ['loanBalance(50000, 7, 4, 1.5) | usd', /whole number/],
    ['loanMonth(50000, 7, 4, 0).interest | usd', /at least 1/],
    ['loanYear(50000, 7, 4, 5).interest | usd', /beyond the 48-month term/],
    ['overpaymentSaving(300000, 7, 30).interestSaved | usd', /give monthly= and\/or yearly=/],
    ['cardPayoff(5000, 20).months | months', /fixed monthly payment .* or minPct/],
    ['cardPayoff(5000, 20, 100, minPct=2, minFloor=25).months | months', /not both/],
    ['cardPayoff(5000, 20, minPct=2).months | months', /needs minFloor/],
    ['cardPayoff(5000, 20, 100, minFloor=25).months | months', /only applies with minPct/],
    ['compoundFV(1000, 0, 7, 10, compounding=hourly) | usd', /compounding must be a number or one of/],
    ['compoundFV(1000, 0, 7, 10, compounding=3) | usd', /compounding must be 1, 2, 4, 12, 52 or 365/],
    ["rate('us40') | pct(2)", /"key" must be one of us30, us15, boe/],
    ["rateSource('boe2')", /"key" must be one of/],
    ['cardPayoff(5000, 20, 100, plusInterest=true).months | months', /plusInterest only applies with minPct/],
    ['cardPayoff(50000, 22, minPct=2, minFloor=25).months | months', /not cleared within 600 months .*beyond 50 years/],
    ['payoffBalance(8000, 24, 100, 12) | usd', /never repaid/],
    ['payoffBalance(50000, 22, 1200, 601) | usd', /"months" must be at most 600/],
    ['yearsToTarget(10000, 0, 3, 1000000) | months', /not reached within 100 years .*"Not within 100 years"/],
    ['savingsMonths(1000000, 0, 50, 0) | months', /not reached within 100 years .*"Not within 100 years"/],
    ["ukTakeHome(30000, code='ZZ99') | gbp", /W1, M1, X or NONCUM/],
    ["usFact('k401Limit', year=2027) | usd", /has not published the 2027 401\(k\) limits/],
    ['usTakeHome(100000, k401=30, year=2027) | usd', /has not published the 2027 401\(k\) limit/],
    ['cpiAdjust(100, 2000, 2000).adjusted | usd', /same year/],
    ['cpiAdjust(100, 1900, 2000).adjusted | usd', /at least 1913/],
    ['feeDrag(1000, 0, 0, 10, 0).cost | usd', /earns nothing/],
    ["taxYear('fr')", /must be one of uk, us/],
  ];
  for (const [src, re] of cases) {
    it(src, () => {
      let caught: unknown;
      try {
        f(src);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(FigureError);
      expect((caught as FigureError).message).toMatch(re);
      expect((caught as FigureError).message.startsWith(`{{ ${src} }}`)).toBe(true);
    });
  }

  it('errors are memoised but still thrown every time', () => {
    expect(() => f('nope2(1) | gbp')).toThrow(FigureError);
    expect(() => f('nope2(1) | gbp')).toThrow(FigureError);
  });
});

/* ── Catalogue health ───────────────────────────────────── */

describe('catalogue', () => {
  it('every function example evaluates to text', () => {
    for (const fn of FIGURE_FUNCTIONS.values()) {
      const out = f(fn.example);
      expect(typeof out, fn.name).toBe('string');
      expect(out, fn.name).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('every formatter example evaluates', () => {
    for (const fmt of FIGURE_FORMATTERS.values()) {
      expect(f(fmt.example), fmt.name).not.toMatch(/NaN|undefined/);
    }
  });

  it('every function and formatter is documented in docs/figures.md', () => {
    const doc = readFileSync('docs/figures.md', 'utf8');
    for (const name of FIGURE_FUNCTIONS.keys()) expect(doc, name).toContain(`\`${name}(`);
    for (const name of FIGURE_FORMATTERS.keys()) expect(doc, name).toMatch(new RegExp('`' + name + '[`(]'));
  });

  it('every example value printed in docs/figures.md tables is what the engine gives', () => {
    // The values are for the 2026/27 (UK) and 2026 (US) datasets; each country's
    // rows are skipped only once that country's data has moved on.
    const doc = readFileSync('docs/figures.md', 'utf8');
    const rows = [...doc.matchAll(/`\{\{ (.+?) \}\}` \| ([^|\r\n]+?) \|\r?$/gm)];
    expect(rows.length).toBeGreaterThan(40);
    let checked = 0;
    for (const [, expr, value] of rows) {
      if (value === 'fails' || value === 'varies') continue; // 'varies': market rates move whenever market-rates.ts is updated
      if (!UK_2026 && /\buk[A-Z]|\bsdlt\(|taxYear\('uk'\)/.test(expr)) continue;
      if (!US_2026 && /\bus[A-Z]|taxYear\('us'\)/.test(expr)) continue;
      expect(f(expr.replace(/\\\|/g, '|')), expr).toBe(value);
      checked++;
    }
    expect(checked).toBeGreaterThan(UK_2026 && US_2026 ? 40 : 15);
  });

  it('no function is INTERIM (W2-FIG re-pointed them all); the flag and the docs section stay in step', () => {
    const doc = readFileSync('docs/figures.md', 'utf8');
    const start = doc.indexOf('### INTERIM functions');
    expect(start).toBeGreaterThan(0);
    const section = doc.slice(start, doc.indexOf('\n## ', start));
    const interim = [...FIGURE_FUNCTIONS.values()].filter((fn) => fn.interim);
    // Adding an INTERIM function means listing it here and in the docs, and telling Wave 2 not to use it.
    expect(interim.map((fn) => fn.name)).toEqual([]);
    expect(section).toMatch(/None\./);
    for (const fn of interim) expect(section, fn.name).toContain(`\`${fn.name}\``);
  });

  it('every object function documents its fields, and they match the result', () => {
    for (const fn of FIGURE_FUNCTIONS.values()) {
      if (fn.returns !== 'object') continue;
      expect(fn.fields, fn.name).toBeDefined();
      const call = fn.example.split(' | ')[0].replace(/\.[A-Za-z]+$/, '');
      const fieldList = Object.keys(fn.fields!);
      for (const field of fieldList) {
        // Each documented field exists (an unknown field would throw "no field").
        expect(() => f(`${call}.${field} | months`), `${fn.name}.${field}`).not.toThrow(/no field/);
      }
    }
  });

  it('signatures list positional params then options', () => {
    expect(figureSignature('mortgagePayment')).toBe('mortgagePayment(principal, rate, years)');
    expect(figureSignature('cardPayoff')).toBe('cardPayoff(balance, apr, payment?, minPct=, minFloor=, plusInterest=, extra=)');
  });
});

/* ── UK pay ─────────────────────────────────────────────── */

describe('UK pay vs uk-tax-calc engine', () => {
  const salaries = [0, 5000, 12570, 12571, 20000, 29385, 30000, 37700, 50270, 50271, 60000, 99999, 100000, 100001, 110000, 125140, 125141, 150000, 250000];

  it('no options: take-home = salary - engine income tax - engine NI (hub method)', () => {
    for (const s of salaries) {
      close(n(`ukTakeHome(${s}) | gbp(2)`), s - calcSimpleIncomeTax(s) - calcNI(s));
      close(n(`ukIncomeTax(${s}) | gbp(2)`), calcSimpleIncomeTax(s));
      close(n(`ukNi(${s}) | gbp(2)`), calcNI(s));
    }
  });

  it('student loans match calcStudentLoan for every plan (no sacrifice)', () => {
    for (const plan of ['plan1', 'plan2', 'plan4', 'plan5', 'postgrad'] as const) {
      for (const s of salaries) {
        close(n(`ukStudentLoan(${s}, plan=${plan}) | gbp(2)`), calcStudentLoan(s, plan));
      }
    }
    close(n('ukStudentLoan(40000, plan=plan2, postgrad=true) | gbp(2)'), calcStudentLoan(40000, 'plan2') + calcStudentLoan(40000, 'postgrad'));
  });

  it('salary sacrifice: tax, NI and student loan all on post-sacrifice pay (HMRC; S1-4 fix)', () => {
    for (const [s, pct] of [[35000, 5], [60000, 10], [45000, 8]] as const) {
      const pay = s * (1 - pct / 100);
      const expected = s - calcSimpleIncomeTax(pay) - calcNI(pay) - calcStudentLoan(pay, 'plan2') - (s - pay);
      close(n(`ukTakeHome(${s}, pension=${pct}, method=sacrifice, plan=plan2) | gbp(2)`), expected);
    }
  });

  it('net pay: tax on pay after pension, NI and student loan on full pay', () => {
    const s = 50000;
    const g = 2500;
    close(n('ukTakeHome(50000, pension=5, method=net, plan=plan2) | gbp(2)'), s - calcSimpleIncomeTax(s - g) - calcNI(s) - calcStudentLoan(s, 'plan2') - g);
  });

  it('pensionAmount (£) equals the same contribution given as %', () => {
    expect(f('ukTakeHome(80000, pensionAmount=8000, method=sacrifice) | gbp(2)')).toBe(
      f('ukTakeHome(80000, pension=10, method=sacrifice) | gbp(2)'),
    );
  });

  it('allowance taper keys on adjusted net income, so sacrifice restores it', () => {
    close(n('ukPay(110000).personalAllowance | gbp'), UK_INCOME_TAX.personalAllowance - 5000);
    close(n('ukPay(110000, pensionAmount=10000, method=sacrifice).personalAllowance | gbp'), UK_INCOME_TAX.personalAllowance);
    close(n('ukPay(130000).personalAllowance | gbp'), 0);
    close(n('ukPay(110000, pensionAmount=10000, method=net).ani | gbp'), 100000);
  });

  it('marginal rate on the next £2', () => {
    const basic = UK_INCOME_TAX.bands[0].rate * 100;
    const higher = UK_INCOME_TAX.bands[1].rate * 100;
    const niMain = UK_NI.mainRate * 100;
    const niUpper = UK_NI.upperRate * 100;
    close(n('ukMarginalRate(30000) | pct(2)'), basic + niMain);
    close(n('ukMarginalRate(30000, plan=plan2) | pct(2)'), basic + niMain + UK_STUDENT_LOANS.plan2.rate * 100);
    close(n('ukMarginalRate(110000) | pct(2)'), higher * 1.5 + niUpper);
    close(n('ukMarginalRate(5000) | pct(2)'), 0);
  });

  it('Scottish bands via S prefix or scottish=true; C prefix is rUK', () => {
    const scot: [number, number][] = UK_SCOTTISH_TAX.bands.map((b) => [b.from, b.rate]);
    for (const s of [20000, 30000, 50000, 80000, 130000]) {
      const expected = calcIncomeTax(s, scot);
      close(n(`ukIncomeTax(${s}, code='S1257L') | gbp(2)`), expected);
      close(n(`ukIncomeTax(${s}, scottish=true) | gbp(2)`), expected);
      close(n(`ukIncomeTax(${s}, code='C1257L') | gbp(2)`), calcSimpleIncomeTax(s));
    }
  });

  it('flat-rate and other codes', () => {
    const rate = (scottish: boolean, name: string) =>
      (scottish ? UK_SCOTTISH_TAX.bands : UK_INCOME_TAX.bands).find((b) => b.name === name)!.rate;
    close(n("ukIncomeTax(30000, code=BR) | gbp(2)"), 30000 * rate(false, 'Basic'));
    close(n("ukIncomeTax(30000, code=D0) | gbp(2)"), 30000 * rate(false, 'Higher'));
    close(n("ukIncomeTax(30000, code=D1) | gbp(2)"), 30000 * rate(false, 'Additional'));
    close(n("ukIncomeTax(30000, code=SBR) | gbp(2)"), 30000 * rate(true, 'Basic'));
    close(n("ukIncomeTax(30000, code=SD0) | gbp(2)"), 30000 * rate(true, 'Intermediate'));
    close(n("ukIncomeTax(30000, code=SD1) | gbp(2)"), 30000 * rate(true, 'Higher'));
    close(n("ukIncomeTax(30000, code=SD2) | gbp(2)"), 30000 * rate(true, 'Advanced'));
    close(n("ukIncomeTax(30000, code=SD3) | gbp(2)"), 30000 * rate(true, 'Top'));
    close(n("ukIncomeTax(30000, code=NT) | gbp(2)"), 0);
    close(n("ukIncomeTax(30000, code='0T') | gbp(2)"), calcIncomeTax(30000, undefined, 0));
    close(n("ukIncomeTax(30000, code='1100L') | gbp(2)"), calcIncomeTax(30000, undefined, 11000));
    // A code below 1257L is not tapered twice: the calculator uses the lower of the code and the tapered
    // allowance (7,570 at 110,000), not 11,000 - 5,000 = 6,000 (figures-grid.test.ts, divergence (ii)).
    close(n("ukIncomeTax(110000, code='1100L') | gbp(2)"), calcIncomeTax(110000, undefined, 7570));
  });

  it('relief at source: basic-rate relief added, bands extended by the gross contribution', () => {
    const s = 60000;
    const g = 3000;
    const bands: [number, number][] = UK_INCOME_TAX.bands.map((b) => [b.from > 0 ? b.from + g : 0, b.rate]);
    const tax = calcIncomeTax(s, bands, UK_INCOME_TAX.personalAllowance);
    close(n('ukPay(60000, pension=5, method=ras).incomeTax | gbp(2)'), tax);
    close(n('ukPay(60000, pension=5, method=ras).pension | gbp(2)'), g * (1 - UK_INCOME_TAX.bands[0].rate));
    close(n('ukTakeHome(60000, pension=5, method=ras) | gbp(2)'), s - tax - calcNI(s) - g * 0.8);
  });

  it('literal 2026/27 checks (independent hand calculations)', () => {
    if (!UK_2026) return;
    expect(f('ukTakeHome(30000, plan=plan2) | gbp(2)')).toBe('£25,064.25');
    // S1-4 acceptance figures: £35k/5% and £60k/10% sacrifice, Plan 2
    expect(f('ukTakeHome(35000, pension=5, method=sacrifice, plan=plan2) | gbp(2)')).toBe('£27,111.75');
    expect(f('ukTakeHome(60000, pension=10, method=sacrifice, plan=plan2) | gbp(2)')).toBe('£39,662.05');
    expect(f("ukIncomeTax(50000, code='S1257L') | gbp(2)")).toBe('£8,982.05');
    expect(f('ukIncomeTax(110000) | gbp')).toBe('£33,432');
    expect(f('ukTakeHome(60000, pension=5, method=ras) | gbp(2)')).toBe('£43,557.40');
  });

  it('facts mirror uk-rates.ts', () => {
    close(n("ukFact('personalAllowance') | gbp"), UK_INCOME_TAX.personalAllowance);
    close(n("ukFact('higherRateThreshold') | gbp"), UK_INCOME_TAX.personalAllowance + UK_INCOME_TAX.bands[1].from);
    close(n("ukFact('plan2Threshold') | gbp"), UK_STUDENT_LOANS.plan2.threshold);
    close(n("ukFact('studentLoanRate') | pct(2)"), UK_STUDENT_LOANS.plan2.rate * 100);
    close(n("ukFact('niMainRate') | pct(2)"), UK_NI.mainRate * 100);
    close(n("ukFact('statePensionAnnual') | gbp(2)"), UK_STATE_PENSION.weeklyRate * 52);
    close(n("ukFact('sdltFtbCap') | gbp"), UK_SDLT.firstTimeBuyerCap);
    expect(f("ukFact('plan2Threshold', year='" + UK_TAX_YEAR + "') | gbp")).toBe(f("ukFact('plan2Threshold') | gbp"));
  });

  it('CGT and SDLT match their engines', () => {
    for (const [gain, income] of [[10000, 30000], [50000, 40000], [50000, 120000], [2000, 20000]]) {
      close(n(`ukCgt(${gain}, ${income}) | gbp(2)`), calculateUKCgt(0, gain, income).totalTax);
    }
    for (const price of [100000, 250000, 300000, 425000, 500000, 600000, 1000000]) {
      close(n(`sdlt(${price}) | gbp(2)`), calculateSdlt(price, 'standard').totalTax);
      close(n(`sdlt(${price}, buyer=ftb) | gbp(2)`), calculateSdlt(price, 'first-time').totalTax);
      close(n(`sdlt(${price}, buyer=additional) | gbp(2)`), calculateSdlt(price, 'additional').totalTax);
    }
  });
});

/* ── US pay ─────────────────────────────────────────────── */

describe('US pay vs us-tax-calc engine', () => {
  const statuses = ['single', 'married', 'head'] as const;
  const salaries = [0, 10000, 16100, 50000, 75000, 100000, 184500, 200001, 260000, 700000];

  it('take-home = salary - federal - FICA (- state - 401k)', () => {
    for (const st of statuses) {
      for (const s of salaries) {
        const fed = calcFederalTax(s, st);
        const fica = calcFICA(s, st).total;
        close(n(`usTakeHome(${s}, status=${st}) | usd(2)`), s - fed - fica);
        close(n(`usFederalTax(${s}, status=${st}) | usd(2)`), fed);
        close(n(`usFica(${s}, status=${st}) | usd(2)`), fica);
      }
    }
  });

  it('401(k) reduces federal and state pay but not FICA, capped at the IRS limit', () => {
    const s = 100000;
    const k = 10000;
    const expected = s - calcFederalTax(s - k, 'single') - calcFICA(s, 'single').total - (s - k) * 0.05 - k;
    close(n('usTakeHome(100000, k401=10, state=5) | usd(2)'), expected);
    close(n('usPay(500000, k401=50).k401 | usd'), US_401K.limit);
    close(n('usPay(100000, k401Amount=6000).k401 | usd'), 6000);
  });

  it('bracket and marginal rate', () => {
    const taxable = 60000 - US_STANDARD_DEDUCTION.single;
    const bracket = US_BRACKETS.single.filter(([from]) => taxable > from).pop()![1] * 100;
    close(n('usBracket(60000) | pct(2)'), bracket);
    // The calculator shows its lowest bracket (10%) when taxable income is 0.
    close(n('usBracket(10000) | pct'), 10);
    // Marginal = bracket + 7.65% FICA + state
    close(n('usMarginalRate(60000, state=5) | pct(2)'), bracket + 7.65 + 5);
  });

  it('facts mirror us-rates.ts', () => {
    close(n("usFact('standardDeduction', status=married) | usd"), US_STANDARD_DEDUCTION.married);
    close(n("usFact('k401Limit') | usd"), US_401K.limit);
    close(n('usBracketStart(22) | usd'), US_BRACKETS.single.find(([, r]) => r === 0.22)![0]);
    close(n('usBracketStart(22, status=mfj) | usd'), US_BRACKETS.married.find(([, r]) => r === 0.22)![0]);
  });

  it('CGT matches the engine', () => {
    for (const [gain, income, st, hold] of [
      [50000, 80000, 'single', 'long'],
      [50000, 20000, 'married', 'long'],
      [300000, 150000, 'single', 'long'],
      [20000, 60000, 'head', 'short'],
    ] as const) {
      close(n(`usCgt(${gain}, ${income}, status=${st}, holding=${hold}) | usd(2)`), calculateUSCgt(0, gain, hold, st, income).totalTax);
    }
  });

  it('literal 2026 checks (review MATH-US verified values)', () => {
    if (!US_2026) return;
    expect(f('usFederalTax(75000) | usd')).toBe('$7,670');
    expect(f('usFica(75000) | usd(2)')).toBe('$5,737.50');
    expect(f('usTakeHome(75000) | usd(2)')).toBe('$61,592.50');
    expect(f('usFederalTax(100000, status=married) | usd')).toBe('$7,640');
  });
});

/* ── Loans and debt ─────────────────────────────────────── */

describe('loans vs calculator-utils engine', () => {
  it('payment and total interest', () => {
    close(n('mortgagePayment(300000, 7, 30) | usd(2)'), loanMonthlyPayment(300000, 0.07, 360));
    expect(f('mortgagePayment(300000, 7, 30) | usd(2)')).toBe('$1,995.91');
    expect(f('loanPayment(50000, 7, 4) | usd(2)')).toBe(f('mortgagePayment(50000, 7, 4) | usd(2)'));
    close(n('loanTotalInterest(50000, 7, 4) | usd(2)'), loanMonthlyPayment(50000, 0.07, 48) * 48 - 50000);
    close(n('loanPayment(12000, 0, 2) | usd(2)'), 500);
    close(n('loanPayment(30000, 6, 5.5) | usd(2)'), loanMonthlyPayment(30000, 0.06, 66));
  });

  it('balances and schedule rows match amortizationSchedule', () => {
    const sched = amortizationSchedule(50000, 0.07, 48);
    for (const k of [1, 6, 12, 24, 36, 47]) {
      close(n(`loanBalance(50000, 7, 4, ${k}) | usd(2)`), sched[k - 1].balance, 0.02);
      close(n(`loanMonth(50000, 7, 4, ${k}).interest | usd(2)`), sched[k - 1].interest, 0.02);
      close(n(`loanMonth(50000, 7, 4, ${k}).principal | usd(2)`), sched[k - 1].principal, 0.02);
    }
    expect(f('loanBalance(50000, 7, 4, 48) | usd(2)')).toBe('$0.00');
    expect(f('loanBalance(50000, 7, 4, 0) | usd')).toBe('$50,000');
    const y1 = sched.slice(0, 12).reduce((s, r) => s + r.interest, 0);
    close(n('loanYear(50000, 7, 4, 1).interest | usd(2)'), y1, 0.1);
    close(n('loanYear(50000, 7, 4, 2).endBalance | usd(2)'), sched[23].balance, 0.02);
  });

  it('overpayments (review values: +$200 on $300k at 7% saves $116,640 and 7.1 years)', () => {
    expect(f('overpaymentSaving(300000, 7, 30, monthly=200).interestSaved | usd')).toBe('$116,640');
    expect(f('overpaymentSaving(300000, 7, 30, monthly=200).monthsSaved | months')).toBe('7 years 1 month');
    // 13th payment each year on $50k / 7% / 4 years: 3 months, ~$515 (review C14)
    expect(f('overpaymentSaving(50000, 7, 4, yearly=loanPayment(50000, 7, 4)).monthsSaved | int')).toBe('3');
    expect(f('overpaymentSaving(50000, 7, 4, yearly=loanPayment(50000, 7, 4)).interestSaved | usd')).toBe('$515');
    close(n('overpaymentSaving(300000, 7, 30, monthly=200).baseInterest | usd(2)'), loanMonthlyPayment(300000, 0.07, 360) * 360 - 300000, 0.05);
  });

  it('card payoff matches the credit card calculator (review values)', () => {
    expect(f('cardPayoff(5000, 22.99, 100).months | months')).toBe('13 years 11 months');
    expect(f('cardPayoff(5000, 22.99, 100).interest | usd')).toBe('$11,694');
    expect(f('cardPayoff(50000, 22, 1200).months | int')).toBe('80');
    expect(f('cardPayoff(50000, 22, 1200).interest | usd')).toBe('$45,347');
    expect(f('loanPayoff(50000, 5.5, 600).months | int')).toBe('106');
    expect(f('loanPayoff(50000, 5.5, 600).interest | usd')).toBe('$13,135');
    expect(f('payoffBalance(50000, 22, 1200, 48) | usd')).toBe('$28,491');
    expect(f('payoffBalance(50000, 22, 1200, 200) | usd')).toBe('$0');
    close(n('cardPayoff(5000, 22.99, 100).totalPaid | usd(2)'), 5000 + n('cardPayoff(5000, 22.99, 100).interest | usd(2)'), 0.02);
    close(n('cardPayoff(5000, 22.99, 100, extra=50).months | int'), n('loanPayoff(5000, 22.99, 150).months | int'));
  });

  it('never pays off: payment at or below interest (DB-1 rule)', () => {
    expect(f('cardPayoff(8000, 24, 160).months | months')).toBe('never');
    expect(f('cardPayoff(8000, 24, 100).firstInterest | usd')).toBe('$160');
    expect(f('cardPayoff(8000, 24, 161).months | months')).not.toBe('never');
    // A 3% declining minimum does clear, slowly
    expect(n('cardPayoff(50000, 22, minPct=3, minFloor=25).months | int')).toBeGreaterThan(360);
  });
});

/* ── Saving and investing ───────────────────────────────── */

describe('saving and investing vs calculator-utils engine', () => {
  it('compound future value', () => {
    for (const [p, m, r, y, c] of [[10000, 0, 7, 30, 12], [1000, 200, 7, 30, 12], [10000, 0, 5, 30, 1], [5000, 100, 4, 10, 365]] as const) {
      close(n(`compoundFV(${p}, ${m}, ${r}, ${y}, compounding=${c}) | usd(2)`), compoundInterest(p, m, r / 100, y, c));
    }
    close(n('compoundFV(0, 500, 7, 30, timing=beginning) | usd(2)'), compoundInterest(0, 500, 0.07, 30, 12, 'beginning'));
    expect(f('compoundFV(10000, 0, 5, 30, compounding=annually) | usd')).toBe(f('compoundFV(10000, 0, 5, 30, compounding=1) | usd'));
    expect(f('compoundFV(10000, 0, 7, 30) | usd')).toBe('$81,165');
    close(n('compoundEarned(1000, 200, 7, 30) | usd(2)'), compoundInterest(1000, 200, 0.07, 30) - 1000 - 200 * 360);
  });

  it('retirement pot', () => {
    const nominal = compoundInterest(50000, 500, 0.07, 35, 12);
    close(n('retirementFV(50000, 500, 7, 35).nominal | usd(2)'), nominal);
    close(n('retirementFV(50000, 500, 7, 35, inflation=3).real | usd(2)'), nominal / Math.pow(1.03, 35));
    close(n('retirementFV(50000, 500, 7, 35).contributions | usd'), 50000 + 500 * 12 * 35);
  });

  it('savings goal: monthly needed and months to goal', () => {
    close(n('savingsMonthly(100000, 5000, 5, 60) | usd(2)'), monthlySavingsRequired(100000, 5000, 0.05, 60));
    expect(f('savingsMonthly(100000, 5000, 5, 60) | usd(2)')).toBe('$1,376.10');
    expect(f('savingsMonthly(1000, 5000, 5, 12) | usd')).toBe('$0');
    expect(f('savingsMonths(50000, 0, 1000, 5) | int')).toBe(String((timeToGoal({ goal: 50000, current: 0, monthly: 1000, annualRate: 0.05 }) as { months: number }).months));
    expect(f('savingsMonths(50000, 60000, 1000, 5) | int')).toBe('0');
    expect(f('savingsMonths(50000, 0, 0, 0) | months')).toBe('never');
    expect(f('savingsMonths(50000, 10000, 0, 0) | months')).toBe('never');
    expect(() => f('savingsMonths(1000000, 0, 50, 0) | months')).toThrow(/not reached within 100 years/);
    expect(f('goalHorizonYears() | int')).toBe('100');
    expect(MAX_GOAL_MONTHS).toBe(MAX_SOLVE_MONTHS); // goalHorizonYears() is valid for both calculators
  });

  it('years to target', () => {
    // Whole months, as the investment return calculator's Time tab (solveMonthsToTarget), not a fractional solve.
    const months = solveMonthsToTarget({ principal: 10000, monthlyContribution: 500, annualRate: 0.07 }, 1000000);
    expect(months.status).toBe('reached');
    close(n('yearsToTarget(10000, 500, 7, 1000000) | num(4)'), (months as { months: number }).months / 12, 0.00005);
    // Truly never: no deposits and no growth.
    expect(evaluateFigureValue('yearsToTarget(10000, 0, 0, 1000000)')).toBe(Infinity);
    expect(evaluateFigureValue('yearsToTarget(0, 0, 5, 1000000)')).toBe(Infinity);
    // Not within 100 years is NOT "never" (the tools say "Not within 100 years"): the token fails the build.
    expect(() => f('yearsToTarget(10000, 0, 3, 1000000) | months')).toThrow(/not reached within 100 years/);
    expect(f('yearsToTarget(20000, 0, 3, 1000) | num')).toBe('0');
  });

  it('fee drag matches the investment fee calculator (review: 1% on $100k over 30y = $209,392)', () => {
    expect(f('feeDrag(100000, 0, 7, 30, 1).cost | usd')).toBe('$209,392');
    close(n('feeDrag(50000, 500, 7, 30, 1, compareFee=0.03).cost | usd(2)'),
      compoundInterest(50000, 500, 0.0697, 30) - compoundInterest(50000, 500, 0.06, 30));
  });

  it('inflation', () => {
    expect(f('inflationAdjust(100000, 3, 20, mode=value) | usd')).toBe('$55,368');
    close(n('inflationAdjust(100, 3, 10) | usd(2)'), 100 * Math.pow(1.03, 10));
  });
});

/* ── Labels and helpers ─────────────────────────────────── */

describe('labels and helpers', () => {
  it('taxYear follows the rates modules', () => {
    expect(f("taxYear('uk')")).toBe(UK_TAX_YEAR);
    expect(f('taxYear(us)')).toBe(US_TAX_YEAR);
  });
  it('min, max and arithmetic', () => {
    expect(f('min(3, 5) | int')).toBe('3');
    expect(f('max(0, 50000 - 60000) | usd')).toBe('$0');
    expect(f('(ukTakeHome(50000) - ukTakeHome(40000)) / 12 | gbp')).toBe(
      f(`${(n('ukTakeHome(50000) | gbp(2)') - n('ukTakeHome(40000) | gbp(2)')) / 12} | gbp`),
    );
  });
});

/* ── Document-level resolution ──────────────────────────── */

describe('resolveFigures*', () => {
  it('replaces every token and leaves other text alone', () => {
    const text = 'Take-home {{ ukTakeHome(30000, plan=plan2) | gbp }} for {{ taxYear(uk) }}; braces { } stay.';
    expect(resolveFigures(text)).toBe(`Take-home ${f('ukTakeHome(30000, plan=plan2) | gbp')} for ${UK_TAX_YEAR}; braces { } stay.`);
    expect(resolveFigures('no tokens')).toBe('no tokens');
  });

  it('collects every problem with its offset instead of stopping at the first', () => {
    const text = 'a {{ bad1() | gbp }} b {{ 1 | gbp }} c {{ bad2() }} d {{ unterminated';
    const r = resolveFiguresDetailed(text);
    expect(r.problems.map((p) => p.start)).toEqual([2, 39, 54]);
    expect(r.problems[0].message).toMatch(/unknown function "bad1"/);
    expect(r.problems[2].message).toMatch(/unterminated/);
    expect(r.text).toContain('£1');
    expect(() => resolveFigures(text)).toThrow(/bad1[\s\S]*bad2[\s\S]*unterminated/);
  });

  it('plain variant turns the \\{{ escape into a literal {{', () => {
    expect(resolveFiguresPlain('use \\{{ like this }}').text).toBe('use {{ like this }}');
  });
});

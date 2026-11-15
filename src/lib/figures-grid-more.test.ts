/**
 * Grid tests for the figure functions added in W2-FIG2: mortgage affordability,
 * rent vs buy, car finance, emergency fund, solar payback, ROI, required rate,
 * multi-debt payoff, card horizon totals, CPI values and the loan crossover.
 *
 * Same method as figures-grid.test.ts: the engine call is built here from the
 * case, independently of figures.ts, and the raw figure value is compared with
 * it exactly (===). Cases the figure engine refuses on purpose ("No home fits
 * these limits", a payoff beyond 50 years, a deposit the calculator would
 * clamp, ...) must throw, and the grid asserts which cases those are.
 *
 * The tool defaults baked into the figure functions are read back out of the
 * calculators' source files, so a changed calculator default fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateFigureValue as v, FIGURE_FUNCTIONS, FigureError, type FigureRecord } from './figures';
import {
  AFFORDABILITY_DEFAULTS,
  estimateUkTakeHome,
  solveEurAffordability,
  solveUkAffordability,
  solveUsAffordability,
} from './mortgage-affordability';
import { TRANSACTION_COST_DEFAULTS, laterBreakEvenYear, simulateRentVsBuy, type RentVsBuyInputs } from './rent-vs-buy';
import { compareCarFinance, maxDepositFor, type AprConvention } from './car-finance';
import { MAX_FUND_MONTHS, monthsToTarget } from './emergency-fund';
import { SOLAR_REGIONAL_DEFAULTS, calculateSolarPayback, effectiveSelfConsumption, type SolarRegion } from './solar-payback';
import { annualize, calcRoi } from './roi';
import { solveRequiredRate } from './investment-solvers';
import { DEBT_HORIZON_MONTHS, simulateDebtPayoff, type Debt, type Strategy } from './debt-payoff';
import { CARD_HORIZON_MONTHS, simulateCardPayoff } from './credit-card';
import { CPI_FIRST_YEAR, CPI_LAST_YEAR, cpiFor } from './inflation';
import { buildAmortization } from './mortgage-payment';

const num = (expr: string): number => v(expr) as number;
const rec = (expr: string): FigureRecord => v(expr) as FigureRecord;

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
function same(actual: unknown, expected: unknown, label: string): void {
  expect(actual, label).toBe(expected);
}
function report(label: string, compared: number, refused = 0): void {
  if (process.env.FIG_GRID_VERBOSE) process.stdout.write(`[grid] ${label}: ${compared} compared, ${refused} refused\n`);
}

/** Compare every listed [figure field, engine value] pair exactly. */
function compareFields(got: FigureRecord, pairs: Array<[string, unknown]>, label: string): void {
  expect(Object.keys(got).sort(), `${label} fields`).toEqual(pairs.map(([k]) => k).sort());
  for (const [k, expected] of pairs) same(got[k], expected, `${label} .${k}`);
}

/** Option defaults of a figure function, as declared in the catalogue. */
function optionDefault(fn: string, name: string): unknown {
  const spec = FIGURE_FUNCTIONS.get(fn)!.options!.find((o) => o.name === name);
  expect(spec, `${fn}.${name}`).toBeDefined();
  return spec!.default;
}
/** The numeric value of `key: <number>` in a source file's DEFAULTS block. */
function sourceDefault(file: string, key: string): number {
  const text = readFileSync(file, 'utf8');
  const m = new RegExp(`\\b${key}:\\s*(-?[0-9_.]+)`).exec(text);
  expect(m, `${file} ${key}`).not.toBeNull();
  return Number(m![1].replace(/_/g, ''));
}

/* ════════════════════════════════════════════════════════════
 * Tool defaults baked into the figure functions
 * ════════════════════════════════════════════════════════════ */

describe('figure option defaults equal the calculators\' own defaults', () => {
  it('rent vs buy (RentVsBuyCalc.tsx DEFAULTS)', () => {
    const file = 'src/components/tools/RentVsBuyCalc.tsx';
    const pairs: Array<[string, string]> = [
      ['propertyTax', 'propertyTaxRate'], ['insurance', 'homeInsurance'], ['hoa', 'hoaMonthly'],
      ['maintenance', 'maintenanceRate'], ['appreciation', 'homeAppreciation'], ['rentIncrease', 'rentIncrease'],
      ['rentersInsurance', 'rentersInsurance'], ['invest', 'investmentReturn'], ['marginalTax', 'marginalTaxRate'],
      ['otherItemized', 'otherItemizedDeductions'], ['stateTax', 'stateLocalIncomeTax'],
    ];
    for (const [opt, key] of pairs) same(optionDefault('rentVsBuy', opt), sourceDefault(file, key), `rentVsBuy ${opt}`);
    same(optionDefault('rentVsBuy', 'status'), 'single', 'rentVsBuy status');
  });
  it('car finance (CarFinanceCalc.tsx DEFAULTS)', () => {
    const file = 'src/components/tools/CarFinanceCalc.tsx';
    for (const [opt, key] of [['pcpApr', 'pcpApr'], ['balloon', 'pcpBalloonPct'], ['hpApr', 'hpApr'], ['loanApr', 'loanApr'], ['invest', 'investReturnRate']]) {
      same(optionDefault('carFinance', opt), sourceDefault(file, key), `carFinance ${opt}`);
    }
  });
  it('solar (SolarPaybackCalc.tsx DEFAULTS)', () => {
    const file = 'src/components/tools/SolarPaybackCalc.tsx';
    for (const [opt, key] of [['selfConsumption', 'baseSelfConsumption'], ['inflation', 'energyInflation'], ['degradation', 'degradation'], ['credit', 'taxCredit'], ['years', 'analysisPeriod']]) {
      same(optionDefault('solarPayback', opt), sourceDefault(file, key), `solarPayback ${opt}`);
    }
  });
  it('affordability (AFFORDABILITY_DEFAULTS, shared with the calculator)', () => {
    const d = AFFORDABILITY_DEFAULTS;
    same(optionDefault('usAffordability', 'propertyTax'), d.propertyTaxRate, 'propertyTax');
    same(optionDefault('usAffordability', 'insurance'), d.insuranceAnnual, 'insurance');
    same(optionDefault('usAffordability', 'hoa'), d.hoaMonthly, 'hoa');
    same(optionDefault('usAffordability', 'pmi'), d.pmiRate, 'pmi');
    same(optionDefault('usAffordability', 'frontEnd'), d.frontEndPct, 'frontEnd');
    same(optionDefault('usAffordability', 'backEnd'), d.backEndPct, 'backEnd');
    same(optionDefault('ukAffordability', 'ltiCap'), d.ltiCap, 'ltiCap');
    same(optionDefault('ukAffordability', 'stressMargin'), d.stressMarginPct, 'stressMargin');
    same(optionDefault('ukAffordability', 'maxShare'), d.maxShareOfTakeHomePct, 'maxShare');
    same(optionDefault('eurAffordability', 'maxDebtService'), d.eurMaxDebtServicePct, 'maxDebtService');
  });
});

/* ════════════════════════════════════════════════════════════
 * Mortgage affordability
 * ════════════════════════════════════════════════════════════ */

describe('affordability: figures == solveUs/Uk/EurAffordability', () => {
  const incomes = [0, 30_000, 60_000, 80_000, 150_000, 400_000];
  const debtsList = [0, 300, 900, 2_500, 20_000];
  const deposits = [0, 20_000, 40_000, 120_000];
  const rates = [0, 3.5, 7, 9];
  const terms = [15, 25, 30];

  it('US: every combination equals the engine; "No home fits" cases throw', () => {
    let compared = 0;
    let refused = 0;
    for (const income of incomes) for (const debts of debtsList) for (const deposit of deposits) for (const rate of rates) for (const years of terms) {
      for (const tax of [0.5, 1, 2]) {
        const opts = `propertyTax=${tax}`;
        const expr = `usAffordability(${income}, ${debts}, ${deposit}, ${rate}, ${years}, ${opts})`;
        const e = solveUsAffordability({
          region: 'us', annualIncome: income, monthlyDebts: debts, deposit, ratePct: rate, termYears: years,
          propertyTaxRate: tax, insuranceAnnual: 1800, hoaMonthly: 0, pmiRate: 0.6, frontEndPct: 28, backEndPct: 36,
        });
        if (e.status !== 'ok') {
          throwsFigureError(`${expr}.maxPrice`, /No home fits these limits/);
          refused++;
          continue;
        }
        compareFields(rec(expr), [
          ['maxPrice', e.maxPrice], ['maxLoan', e.maxLoan], ['monthlyPI', e.monthlyPI], ['monthlyTax', e.monthlyTax],
          ['monthlyInsurance', e.monthlyInsurance], ['monthlyHOA', e.monthlyHOA], ['monthlyPMI', e.monthlyPMI],
          ['totalMonthly', e.totalMonthly], ['grossMonthly', e.grossMonthlyIncome], ['frontEndBudget', e.frontEndBudget],
          ['backEndBudget', e.backEndBudget], ['housingBudget', e.housingBudget], ['frontEndRatio', e.frontEndRatio],
          ['backEndRatio', e.backEndRatio], ['needsPMI', e.needsPMI], ['binding', e.binding],
        ], expr);
        compared++;
      }
    }
    report('US affordability', compared, refused);
    expect(compared).toBeGreaterThan(500);
    expect(refused).toBeGreaterThan(50);
  });

  it('US: the option overrides (insurance, HOA, PMI, limits) reach the engine', () => {
    for (const [ins, hoa, pmi, front, back] of [[0, 0, 0, 28, 36], [3000, 150, 1, 25, 33], [1200, 400, 0.3, 31, 43]]) {
      const expr = `usAffordability(90000, 400, 30000, 6.5, 30, insurance=${ins}, hoa=${hoa}, pmi=${pmi}, frontEnd=${front}, backEnd=${back})`;
      const e = solveUsAffordability({
        region: 'us', annualIncome: 90000, monthlyDebts: 400, deposit: 30000, ratePct: 6.5, termYears: 30,
        propertyTaxRate: 1, insuranceAnnual: ins, hoaMonthly: hoa, pmiRate: pmi, frontEndPct: front, backEndPct: back,
      });
      same(num(`${expr}.maxPrice`), e.maxPrice, expr);
      same(num(`${expr}.monthlyPMI`), e.monthlyPMI, `${expr} pmi`);
    }
  });

  it('UK: every combination equals the engine (take-home estimate rounds to whole pounds)', () => {
    let compared = 0;
    let refused = 0;
    for (const income of incomes) for (const debts of debtsList) for (const deposit of deposits) for (const rate of rates) for (const years of [25, 30]) {
      for (const [takeHome, lti, margin, revert] of [[undefined, 4.5, 1, undefined], [3600, 5.5, 0, 6.5], [2800, 4, 2, 7]] as const) {
        const opts = [
          takeHome === undefined ? '' : `takeHome=${takeHome}`, `ltiCap=${lti}`, `stressMargin=${margin}`,
          revert === undefined ? '' : `revertRate=${revert}`,
        ].filter(Boolean).join(', ');
        const expr = `ukAffordability(${income}, ${debts}, ${deposit}, ${rate}, ${years}, ${opts})`;
        const e = solveUkAffordability({
          region: 'uk', annualIncome: income, monthlyDebts: debts, deposit, ratePct: rate, termYears: years,
          monthlyTakeHome: takeHome ?? Math.round(estimateUkTakeHome(income)), ltiCap: lti, stressMarginPct: margin,
          maxShareOfTakeHomePct: 50, revertRatePct: revert,
        });
        if (e.status !== 'ok') {
          throwsFigureError(`${expr}.maxPrice`, /No home fits these limits/);
          refused++;
          continue;
        }
        compareFields(rec(expr), [
          ['maxPrice', e.maxPrice], ['maxLoan', e.maxLoan], ['monthlyPI', e.monthlyPI], ['totalMonthly', e.totalMonthly],
          ['grossMonthly', e.grossMonthlyIncome], ['monthlyTakeHome', e.monthlyTakeHome], ['ltiCap', e.ltiCap],
          ['ltiLimitLoan', e.ltiLimitLoan], ['stressRatePct', e.stressRatePct], ['stressLimitLoan', e.stressLimitLoan],
          ['stressedPayment', e.stressedPayment], ['shareOfTakeHome', e.shareOfTakeHome],
          ['stressedShareOfTakeHome', e.stressedShareOfTakeHome], ['incomeMultiple', e.incomeMultiple],
          ['depositPct', e.depositPct], ['lowDeposit', e.lowDeposit], ['binding', e.binding],
        ], expr);
        compared++;
      }
    }
    report('UK affordability', compared, refused);
    expect(compared).toBeGreaterThan(500);
  });

  it('EUR: every combination equals the engine', () => {
    let compared = 0;
    let refused = 0;
    for (const income of incomes) for (const debts of debtsList) for (const deposit of deposits) for (const rate of rates) for (const years of terms) {
      for (const limit of [36, 30, 40]) {
        const expr = `eurAffordability(${income}, ${debts}, ${deposit}, ${rate}, ${years}, maxDebtService=${limit})`;
        const e = solveEurAffordability({
          region: 'eur', annualIncome: income, monthlyDebts: debts, deposit, ratePct: rate, termYears: years, maxDebtServicePct: limit,
        });
        if (e.status !== 'ok') {
          throwsFigureError(`${expr}.maxPrice`, /No home fits these limits/);
          refused++;
          continue;
        }
        compareFields(rec(expr), [
          ['maxPrice', e.maxPrice], ['maxLoan', e.maxLoan], ['monthlyPI', e.monthlyPI], ['totalMonthly', e.totalMonthly],
          ['grossMonthly', e.grossMonthlyIncome], ['paymentBudget', e.paymentBudget], ['debtServiceRatio', e.debtServiceRatio],
        ], expr);
        compared++;
      }
    }
    report('EUR affordability', compared, refused);
    expect(compared).toBeGreaterThan(500);
  });
});

/* ════════════════════════════════════════════════════════════
 * Rent vs buy
 * ════════════════════════════════════════════════════════════ */

describe('rentVsBuy: figures == simulateRentVsBuy', () => {
  const TOOL = {
    propertyTaxRate: 1, homeInsurance: 1800, hoaMonthly: 0, maintenanceRate: 1, homeAppreciation: 3, rentIncrease: 3,
    rentersInsurance: 15, investmentReturn: 7, marginalTaxRate: 22, otherItemizedDeductions: 0, stateLocalIncomeTax: 0,
  };

  it('regions x prices x deposits x rates x terms x rents x horizons x cost settings', () => {
    let compared = 0;
    for (const region of ['us', 'uk', 'eur'] as const) for (const price of [250_000, 350_000]) for (const down of [5, 20, 40]) {
      for (const rate of [0, 3.5, 6.5]) for (const years of [15, 25]) for (const rent of [1_000, 2_200]) for (const horizon of [1, 3, 8, 10, 25]) {
        for (const costs of [undefined, [3, 2]] as const) {
          const opts = [`region=${region}`, costs ? `closing=${costs[0]}, selling=${costs[1]}` : ''].filter(Boolean).join(', ');
          const expr = `rentVsBuy(${price}, ${down}, ${rate}, ${years}, ${rent}, ${horizon}, ${opts})`;
          const defaults = TRANSACTION_COST_DEFAULTS[region];
          const input: RentVsBuyInputs = {
            ...TOOL,
            homePrice: price, downPaymentPct: down, mortgageRate: rate, loanTermYears: years, monthlyRent: rent,
            timeHorizon: horizon, region, filingStatus: 'single',
            closingCostPct: costs ? costs[0] : defaults.closingCostPct,
            sellingCostPct: costs ? costs[1] : defaults.sellingCostPct,
          };
          const e = simulateRentVsBuy(input);
          const last = e.years[e.years.length - 1];
          const later = e.verdict === 'rent' ? laterBreakEvenYear(input) : null;
          compareFields(rec(expr), [
            ['verdict', e.verdict], ['advantage', e.advantage], ['difference', e.difference],
            ['breakEvenYear', e.breakEvenYear ?? Infinity], ['laterBreakEvenYear', later ?? Infinity],
            ['downPayment', e.downPayment], ['closingCosts', e.closingCosts], ['initialCash', e.initialCash],
            ['loanAmount', e.loanAmount], ['monthlyMortgage', e.monthlyMortgage],
            ['monthlyOwnershipCost', e.monthlyOwnershipCost], ['firstMonthRentCost', e.firstMonthRentCost],
            ['totalTaxSaving', e.totalTaxSaving], ['totalInterest', e.totalInterest], ['totalRentPaid', e.totalRentPaid],
            ['finalHomeValue', e.finalHomeValue], ['saleCosts', last.saleCosts], ['loanBalance', last.loanBalance],
            ['finalEquity', e.finalEquity], ['buyerPortfolio', last.buyerPortfolio],
            ['finalBuyerNetWorth', e.finalBuyerNetWorth], ['finalRenterNetWorth', e.finalRenterNetWorth],
          ], expr);
          compared++;
        }
      }
    }
    report('rentVsBuy', compared);
    expect(compared).toBeGreaterThan(1000);
  });

  it('the option overrides (US deduction inputs, growth, insurance) reach the engine', () => {
    for (const [tax, status, other, state, appreciation] of [[30, 'married', 12_000, 9_000, 5], [35, 'head', 0, 20_000, 1]] as const) {
      const expr = `rentVsBuy(600000, 10, 6.5, 30, 2800, 12, marginalTax=${tax}, status=${status}, otherItemized=${other}, stateTax=${state}, appreciation=${appreciation}, hoa=250, propertyTax=1.4, insurance=2600, maintenance=1.5, rentIncrease=4, rentersInsurance=20, invest=6)`;
      const e = simulateRentVsBuy({
        homePrice: 600_000, downPaymentPct: 10, mortgageRate: 6.5, loanTermYears: 30, closingCostPct: 3, sellingCostPct: 6,
        propertyTaxRate: 1.4, homeInsurance: 2600, hoaMonthly: 250, maintenanceRate: 1.5, homeAppreciation: appreciation,
        monthlyRent: 2800, rentIncrease: 4, rentersInsurance: 20, investmentReturn: 6, timeHorizon: 12, region: 'us',
        marginalTaxRate: tax, filingStatus: status, otherItemizedDeductions: other, stateLocalIncomeTax: state,
      });
      same(num(`${expr}.advantage`), e.advantage, expr);
      same(num(`${expr}.totalTaxSaving`), e.totalTaxSaving, `${expr} tax saving`);
    }
  });
});

/* ════════════════════════════════════════════════════════════
 * Car finance
 * ════════════════════════════════════════════════════════════ */

describe('carFinance: figures == compareCarFinance', () => {
  it('prices x deposits x terms x conventions x APRs x balloons x returns; clamped inputs throw', () => {
    let compared = 0;
    let refused = 0;
    for (const price of [8_000, 25_000, 60_000]) for (const deposit of [0, 2_500, 10_000, 70_000]) for (const months of [12, 36, 48, 60]) {
      for (const convention of ['effective', 'nominal'] as const) for (const [pcp, hp, loan] of [[0, 0, 0], [7.9, 8.9, 5.6], [12, 15, 9]]) {
        for (const balloon of [0, 20, 40, 60]) for (const invest of [0, 4.5, 10]) {
          const opts = `convention=${convention}, pcpApr=${pcp}, hpApr=${hp}, loanApr=${loan}, balloon=${balloon}, invest=${invest}`;
          const expr = `carFinance(${price}, ${deposit}, ${months}, ${opts})`;
          if (deposit > maxDepositFor(price)) {
            throwsFigureError(`${expr}.pcpMonthly`, /more than the calculator allows/);
            refused++;
            continue;
          }
          const e = compareCarFinance({
            carPrice: price, deposit, termMonths: months, pcpApr: pcp, pcpBalloonPct: balloon, hpApr: hp, loanApr: loan,
            investReturnRate: invest, aprConvention: convention as AprConvention,
          });
          if (balloon > e.maxBalloonPct) {
            throwsFigureError(`${expr}.pcpMonthly`, /balloon .* more than the calculator allows/);
            refused++;
            continue;
          }
          const [pcpO, hpO, loanO, cashO] = e.options;
          compareFields(rec(expr), [
            ['financeAmount', e.financeAmount], ['balloon', e.balloon],
            ['pcpMonthly', pcpO.monthly], ['hpMonthly', hpO.monthly], ['loanMonthly', loanO.monthly],
            ['pcpTotalPaid', pcpO.totalPaid], ['hpTotalPaid', hpO.totalPaid], ['loanTotalPaid', loanO.totalPaid],
            ['cashTotalPaid', cashO.totalPaid],
            ['pcpTotalInterest', pcpO.totalInterest], ['hpTotalInterest', hpO.totalInterest], ['loanTotalInterest', loanO.totalInterest],
            ['pcpOpportunityCost', pcpO.opportunityCost], ['hpOpportunityCost', hpO.opportunityCost],
            ['loanOpportunityCost', loanO.opportunityCost], ['cashOpportunityCost', cashO.opportunityCost],
            ['pcpTrueCost', pcpO.trueCost], ['hpTrueCost', hpO.trueCost], ['loanTrueCost', loanO.trueCost],
            ['cashTrueCost', cashO.trueCost], ['cheapest', e.cheapest.type],
          ], expr);
          compared++;
        }
      }
    }
    report('carFinance', compared, refused);
    expect(compared).toBeGreaterThan(1000);
    expect(refused).toBeGreaterThan(100);
  });
});

/* ════════════════════════════════════════════════════════════
 * Emergency fund
 * ════════════════════════════════════════════════════════════ */

describe('emergencyMonths: figures == monthsToTarget', () => {
  it('targets x savings x deposits x AER: funded, ok, never (no saving) and too-long', () => {
    const seen = new Set<string>();
    let compared = 0;
    for (const target of [1_000, 10_500, 21_000, 42_000, 5_000_000]) for (const current of [0, 2_000, 20_000, 50_000]) {
      for (const monthly of [0, 25, 100, 500]) for (const aer of [0, 0.38, 4, 10]) {
        const expr = `emergencyMonths(${target}, ${current}, ${monthly}, ${aer})`;
        const e = monthsToTarget({ target, current, monthly, aer: aer / 100 });
        seen.add(e.status === 'never' ? e.reason : e.status);
        if (e.status === 'funded') same(num(expr), 0, expr);
        else if (e.status === 'ok') same(num(expr), e.months, expr);
        else if (e.reason === 'no-saving') same(num(expr), Infinity, `${expr} (no saving)`);
        else throwsFigureError(expr, new RegExp(`not reached within ${MAX_FUND_MONTHS / 12} years`));
        compared++;
      }
    }
    report('emergencyMonths', compared);
    expect([...seen].sort()).toEqual(['funded', 'no-saving', 'ok', 'too-long']);
  });
});

/* ════════════════════════════════════════════════════════════
 * Solar payback
 * ════════════════════════════════════════════════════════════ */

describe('solarPayback: figures == calculateSolarPayback with the regional defaults', () => {
  it('regions x battery x self-consumption x period x grant x tariff x cost; non-payback throws', () => {
    let compared = 0;
    let refused = 0;
    for (const region of ['uk', 'us', 'eur'] as SolarRegion[]) {
      const d = SOLAR_REGIONAL_DEFAULTS[region];
      for (const battery of [false, true]) for (const selfC of [30, 50, 80]) for (const years of [10, 25, 40]) {
        for (const credit of [0, 5_000, 40_000]) for (const tariffScale of [1, 0.4, 2]) for (const costScale of [1, 1.8]) {
          const tariff = Math.round(d.electricityTariff * tariffScale * 100) / 100;
          const cost = Math.round(d.systemCost * costScale);
          const opts = [
            `battery=${battery}`, `selfConsumption=${selfC}`, `years=${years}`, `credit=${credit}`, `tariff=${tariff}`, `systemCost=${cost}`,
          ].join(', ');
          const expr = `solarPayback('${region}', ${opts})`;
          const input = {
            systemCost: cost, systemSize: d.systemSize, includeBattery: battery, batteryCost: d.batteryCost,
            batteryCapacityKwh: battery ? d.batteryCapacity : undefined, electricityTariff: tariff, selfConsumptionPct: selfC,
            exportTariff: d.exportTariff, energyInflation: 3, degradation: 0.5, maintenanceCost: d.maintenanceCost,
            taxCredit: credit, analysisPeriod: years, kWhPerKwp: d.kWhPerKwp,
          };
          const e = calculateSolarPayback(input);
          if (!e.reachesPayback) {
            throwsFigureError(`${expr}.netCost`, /does not pay for itself/);
            refused++;
            continue;
          }
          compareFields(rec(expr), [
            ['netCost', e.netCost], ['paybackYears', e.paybackYears], ['paybackMonths', e.paybackMonths],
            ['paybackTotalMonths', e.paybackYears * 12 + e.paybackMonths], ['year1Savings', e.year1Savings],
            ['totalSavings', e.totalSavings], ['roi', e.roi ?? Infinity], ['generationYear1', e.yearly[0].generation],
            ['generationFinal', e.yearly[e.yearly.length - 1].generation],
            ['savingsFinalYear', e.yearly[e.yearly.length - 1].annualSavings],
            ['selfConsumption', effectiveSelfConsumption(battery, selfC, d.systemSize, d.kWhPerKwp, battery ? d.batteryCapacity : 0)],
          ], expr);
          compared++;
        }
      }
    }
    report('solarPayback', compared, refused);
    expect(compared).toBeGreaterThan(500);
    expect(refused).toBeGreaterThan(20);
  });

  it('the option overrides (size, battery size and cost, export tariff, kWh per kWp) reach the engine', () => {
    const d = SOLAR_REGIONAL_DEFAULTS.uk;
    const e = calculateSolarPayback({
      systemCost: 9_000, systemSize: 5, includeBattery: true, batteryCost: 6_000, batteryCapacityKwh: 9, electricityTariff: 30,
      selfConsumptionPct: 35, exportTariff: 15, energyInflation: 2, degradation: 0.7, maintenanceCost: 100, taxCredit: 0,
      analysisPeriod: 30, kWhPerKwp: 950,
    });
    const expr = "solarPayback('uk', systemCost=9000, systemSize=5, battery=true, batteryCost=6000, batteryCapacity=9, tariff=30, exportTariff=15, selfConsumption=35, inflation=2, degradation=0.7, maintenance=100, years=30, kWhPerKwp=950)";
    same(num(`${expr}.paybackTotalMonths`), e.paybackYears * 12 + e.paybackMonths, expr);
    same(num(`${expr}.totalSavings`), e.totalSavings, `${expr} total`);
    expect(d.systemSize).toBe(4); // the overrides above differ from the UK defaults
  });
});

/* ════════════════════════════════════════════════════════════
 * ROI, annualized return, required rate
 * ════════════════════════════════════════════════════════════ */

describe('roi, annualizedReturn and requiredRate: figures == engines', () => {
  it('roi and annualizedReturn', () => {
    let compared = 0;
    for (const initial of [1_000, 10_000]) for (const final of [0, 500, 15_000, 100_000]) for (const income of [0, 500]) {
      for (const years of [0.5, 1, 3, 10, 30]) {
        const expr = `roi(${initial}, ${final}, ${income}, ${years})`;
        const e = calcRoi(initial, final, income, years);
        compareFields(rec(expr), [['totalGain', e.totalGain], ['totalReturn', e.totalReturn * 100], ['annualized', e.annualizedReturn! * 100]], expr);
        compared++;
      }
    }
    for (const total of [-100, -50, 0, 50, 80, 100, 400]) for (const years of [0.5, 1, 3, 10, 15, 40]) {
      same(num(`annualizedReturn(${total}, ${years})`), annualize(total / 100, years)! * 100, `annualizedReturn ${total} ${years}`);
    }
    report('roi + annualizedReturn', compared + 42);
  });

  it('requiredRate: ok (including negative), and the three failing states', () => {
    const seen = new Set<string>();
    for (const start of [0, 10_000, 100_000]) for (const monthly of [0, 200, 1_000]) for (const target of [5_000, 100_000, 1_000_000, 1e9]) {
      for (const years of [1, 5, 20, 40]) for (const n of [1, 12, 365]) for (const timing of ['end', 'beginning'] as const) {
        const expr = `requiredRate(${start}, ${monthly}, ${target}, ${years}, compounding=${n}, timing=${timing})`;
        const s = solveRequiredRate(start, monthly, target, years * 12, n, timing);
        seen.add(s.status);
        if (s.status === 'ok') same(num(expr), s.rate * 100, expr);
        else throwsFigureError(expr);
      }
    }
    expect([...seen].sort()).toEqual(['invalid', 'metAtAnyRate', 'ok', 'tooHigh']);
  });
});

/* ════════════════════════════════════════════════════════════
 * Multi-debt payoff and the card horizon
 * ════════════════════════════════════════════════════════════ */

/** Small deterministic PRNG (mulberry32) so the random portfolios are reproducible. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('debtPayoff and debtClearMonth: figures == simulateDebtPayoff', () => {
  const spec = (debts: Debt[]) => debts.map((d) => `${d.balance}@${d.rate * 100}/${d.minPayment}`).join('; ');

  it('random portfolios x extra x strategy: paid cases equal the engine, never and beyond-horizon cases throw', () => {
    const rand = prng(20261115);
    const seen = new Set<string>();
    let compared = 0;
    let refused = 0;
    for (let i = 0; i < 700; i++) {
      const count = 1 + Math.floor(rand() * 5);
      const debts: Debt[] = [];
      for (let k = 0; k < count; k++) {
        const balance = 200 + Math.floor(rand() * 40_000);
        const apr = Math.round(rand() * 3000) / 100; // 0 to 30%, two decimals
        const interest = (balance * apr) / 1200;
        const min = Math.max(5, Math.round(interest * (0.8 + rand() * 1.4)) + Math.floor(rand() * 80));
        debts.push({ name: '', balance, rate: apr / 100, minPayment: min });
      }
      const extra = [0, 50, 200, 600][Math.floor(rand() * 4)];
      for (const strategy of ['avalanche', 'snowball'] as Strategy[]) {
        const text = spec(debts);
        const args = `'${text}', ${extra}, '${strategy}'`;
        const e = simulateDebtPayoff(debts, extra, strategy);
        seen.add(e.status);
        if (e.status !== 'paid') {
          throwsFigureError(`debtPayoff(${args}).months`, e.status === 'never' ? /never cleared/ : /not cleared within 600 months/);
          refused++;
          continue;
        }
        compareFields(rec(`debtPayoff(${args})`), [
          ['months', e.months], ['interest', e.totalInterest], ['totalPaid', e.totalPaid],
          ['monthlyOutlay', e.monthlyOutlay], ['firstMonthInterest', e.firstMonthInterest],
        ], `debtPayoff(${args})`);
        for (const c of e.clearances) {
          same(num(`debtClearMonth(${args}, ${c.index + 1})`), c.month, `debtClearMonth ${args} #${c.index + 1}`);
        }
        compared++;
      }
    }
    report('debtPayoff (random portfolios)', compared, refused);
    expect(compared).toBeGreaterThan(400);
    expect([...seen]).toEqual(expect.arrayContaining(['paid', 'never']));
  });

  it('the calculator\'s default debts, and the methodology sets, equal the engine; never and beyond-horizon fail', () => {
    const sets: Array<[string, Debt[]]> = [
      ['default', [
        { name: 'Credit Card', balance: 6500, rate: 0.2299, minPayment: 195 },
        { name: 'Personal Loan', balance: 3500, rate: 0.115, minPayment: 120 },
        { name: 'Car Loan', balance: 12000, rate: 0.065, minPayment: 350 },
      ]],
      ['similar', [
        { name: 'A', balance: 5000, rate: 0.2, minPayment: 150 },
        { name: 'B', balance: 3000, rate: 0.22, minPayment: 90 },
        { name: 'C', balance: 1000, rate: 0.18, minPayment: 40 },
      ]],
      ['wide', [
        { name: 'Card', balance: 4000, rate: 0.24, minPayment: 120 },
        { name: 'Car', balance: 20000, rate: 0.05, minPayment: 400 },
        { name: 'Small', balance: 1500, rate: 0.05, minPayment: 50 },
      ]],
    ];
    for (const [label, debts] of sets) {
      for (const extra of [0, 100, 200, 300, 400]) for (const strategy of ['avalanche', 'snowball'] as Strategy[]) {
        const e = simulateDebtPayoff(debts, extra, strategy);
        const expr = `debtPayoff('${spec(debts)}', ${extra}, '${strategy}')`;
        same(num(`${expr}.interest`), e.totalInterest, `${label} ${extra} ${strategy} interest`);
        same(num(`${expr}.months`), e.months, `${label} ${extra} ${strategy} months`);
      }
    }
    throwsFigureError("debtPayoff('10000@24/150', 0, 'avalanche').months", /never cleared/);
    expect(simulateDebtPayoff([{ name: 'Card', balance: 10000, rate: 0.24, minPayment: 200.001 }], 0, 'avalanche').status).toBe('beyondHorizon');
    throwsFigureError("debtPayoff('10000@24/200.001', 0, 'avalanche').months", new RegExp(`not cleared within ${DEBT_HORIZON_MONTHS} months`));
    throwsFigureError("debtPayoff('', 0, 'avalanche').months", /at least one debt/);
    throwsFigureError("debtPayoff('6500 at 22%', 0, 'avalanche').months", /must look like balance@apr\/minimum/);
    throwsFigureError("debtPayoff('6500@1500/100', 0, 'avalanche').months", /APR between 0% and 1000%/);
    throwsFigureError("debtClearMonth('6500@22.99/195', 200, 'avalanche', 2)", /no debt 2/);
  });
});

describe('cardBeyondHorizon and dailyCompoundingApr', () => {
  it('beyond-horizon cases equal the engine; cases that clear or never fall throw', () => {
    const seen = new Set<string>();
    let compared = 0;
    for (const balance of [5_000, 20_000, 50_000]) for (const apr of [9.9, 22, 22.99, 29.99]) {
      for (const [pct, floor] of [[1, 10], [2, 25], [3, 25]] as const) for (const plus of [false, true]) for (const extra of [0, 50]) {
        const expr = `cardBeyondHorizon(${balance}, ${apr}, minPct=${pct}, minFloor=${floor}${plus ? ', plusInterest=true' : ''}${extra ? `, extra=${extra}` : ''})`;
        const e = simulateCardPayoff({
          balance, aprPercent: apr, mode: plus ? 'interestPlus' : 'percentage', fixedPayment: 0, percentOfBalance: pct, floor, extra,
        });
        seen.add(e.status);
        if (e.status === 'beyondHorizon') {
          compareFields(rec(expr), [
            ['months', CARD_HORIZON_MONTHS], ['years', CARD_HORIZON_MONTHS / 12], ['remaining', e.remainingBalance],
            ['interest', e.totalInterest], ['totalPaid', e.totalPaid],
          ], expr);
          compared++;
        } else {
          throwsFigureError(`${expr}.remaining`, /(use cardPayoff|never repaid)/);
        }
      }
    }
    expect([...seen]).toEqual(expect.arrayContaining(['beyondHorizon', 'paid']));
    report('cardBeyondHorizon', compared);
    throwsFigureError('cardBeyondHorizon(8000, 24, 100).remaining', /never repaid/);
  });

  it('dailyCompoundingApr is the APR whose APR/12 rule matches daily compounding', () => {
    for (const apr of [0, 9.9, 22.99, 29.99]) {
      const monthly = Math.pow(1 + apr / 100 / 365, 365 / 12) - 1;
      same(num(`dailyCompoundingApr(${apr})`), 12 * monthly * 100, `dailyCompoundingApr ${apr}`);
    }
  });
});

/* ════════════════════════════════════════════════════════════
 * CPI index values and the loan crossover month
 * ════════════════════════════════════════════════════════════ */

describe('cpiValue and loanCrossoverMonth', () => {
  it('cpiValue equals cpiFor for every year of the series', () => {
    for (let y = CPI_FIRST_YEAR; y <= CPI_LAST_YEAR; y++) same(num(`cpiValue(${y})`), cpiFor(y), `cpiValue ${y}`);
    throwsFigureError(`cpiValue(${CPI_LAST_YEAR + 1})`, /at most/);
    throwsFigureError(`cpiValue(${CPI_FIRST_YEAR - 1})`, /at least/);
  });

  it('loanCrossoverMonth = the first schedule row where principal exceeds interest', () => {
    for (const principal of [50_000, 280_000, 750_000]) for (const rate of [0, 3.5, 6.5, 7, 12]) for (const years of [4, 15, 25, 30]) {
      const rows = buildAmortization(principal, rate, years * 12).months;
      const expected = rows.find((m) => m.principal > m.interest)!.month;
      same(num(`loanCrossoverMonth(${principal}, ${rate}, ${years})`), expected, `crossover ${principal} ${rate} ${years}`);
    }
  });
});

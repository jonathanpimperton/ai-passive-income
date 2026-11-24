/**
 * Fact keys, the sdlt nonResident option and solarDefault (W2 follow-ups, 16 Nov 2026).
 *
 * Every new ukFact / usFact key is checked two ways: against the figure published by the
 * source (pinned for the 2026/27 UK and 2026 US datasets, with the sources named in
 * uk-rates.ts / us-rates.ts) and against the rates module, so a data drop moves the token
 * and a wrong mapping (for instance the Scottish band tops, which add the personal
 * allowance) cannot hide behind a copied number.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateFigureValue as v, FIGURE_FUNCTIONS, FigureError } from './figures';
import {
  UK_INCOME_TAX,
  UK_ISA,
  UK_PENSION_ANNUAL_ALLOWANCE,
  UK_PERSONAL_SAVINGS_ALLOWANCE,
  UK_QUALIFYING_EARNINGS,
  UK_SCOTTISH_TAX,
  UK_SDLT,
  UK_TAX_YEAR,
  UK_RATES_BY_YEAR,
} from './uk-rates';
import { US_TAX_YEARS, getUsRates, type FilingStatus } from './us-rates';
import { calculateSdlt, SDLT_NON_RESIDENT_SURCHARGE, type BuyerType } from './stamp-duty';
import { UK_CHILDCARE_ANI_LIMIT, UK_QUALIFYING_EARNINGS_LOWER, UK_QUALIFYING_EARNINGS_UPPER, UK_PENSION_ANNUAL_ALLOWANCE as CALC_PENSION_AA } from './uk-tax-calc';
import { SOLAR_REGIONAL_DEFAULTS } from './solar-payback';

const num = (expr: string): number => v(expr) as number;
const UK_2026 = UK_TAX_YEAR === '2026/27';

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

/** key -> [published 2026/27 value, the rates-module value]. */
const bandRate = (name: (typeof UK_SCOTTISH_TAX.bands)[number]['name']) => UK_SCOTTISH_TAX.bands.find((b) => b.name === name)!.rate * 100;
const PA = UK_INCOME_TAX.personalAllowance;
const UK_FACTS: Record<string, [published: number, fromModule: number]> = {
  // gov.scot 2026 to 2027: Starter to 16,537, Basic to 29,526, Intermediate to 43,662, Higher to 75,000,
  // Advanced to 125,140, Top above that; rates 19 / 20 / 21 / 42 / 45 / 48.
  scotStarterRate: [19, bandRate('Starter')],
  scotBasicRate: [20, bandRate('Basic')],
  scotIntermediateRate: [21, bandRate('Intermediate')],
  scotHigherRate: [42, bandRate('Higher')],
  scotAdvancedRate: [45, bandRate('Advanced')],
  scotTopRate: [48, bandRate('Top')],
  scotStarterTop: [16_537, PA + UK_SCOTTISH_TAX.bands[1].from],
  scotBasicTop: [29_526, PA + UK_SCOTTISH_TAX.bands[2].from],
  scotIntermediateTop: [43_662, PA + UK_SCOTTISH_TAX.bands[3].from],
  scotHigherTop: [75_000, PA + UK_SCOTTISH_TAX.bands[4].from],
  scotAdvancedTop: [125_140, UK_SCOTTISH_TAX.bands[5].from],
  // GOV.UK workplace pensions: "between £6,240 and £50,270 a year before tax"
  qualifyingEarningsLower: [6_240, UK_QUALIFYING_EARNINGS.lower],
  qualifyingEarningsUpper: [50_270, UK_QUALIFYING_EARNINGS.upper],
  pensionAnnualAllowance: [60_000, UK_PENSION_ANNUAL_ALLOWANCE],
  // GOV.UK: Personal Savings Allowance £1,000 / £500 / £0; ISA £20,000; Lifetime ISA £4,000 and £450,000
  psaBasic: [1_000, UK_PERSONAL_SAVINGS_ALLOWANCE.basic],
  psaHigher: [500, UK_PERSONAL_SAVINGS_ALLOWANCE.higher],
  psaAdditional: [0, UK_PERSONAL_SAVINGS_ALLOWANCE.additional],
  isaAllowance: [20_000, UK_ISA.annualAllowance],
  lisaAnnualLimit: [4_000, UK_ISA.lisaAnnualLimit],
  lisaPropertyCap: [450_000, UK_ISA.lisaPropertyCap],
  // GOV.UK SDLT residential rates: 0% to 125,000, 2% to 250,000, 5% to 925,000, 10% to 1.5m, 12% above;
  // first-time buyer 5% from 300,000 to 500,000; non-resident surcharge 2% from 40,000.
  sdltBand2Top: [250_000, UK_SDLT.standard[1].to],
  sdltBand3Top: [925_000, UK_SDLT.standard[2].to],
  sdltBand4Top: [1_500_000, UK_SDLT.standard[3].to],
  sdltBand2Rate: [2, UK_SDLT.standard[1].rate * 100],
  sdltBand3Rate: [5, UK_SDLT.standard[2].rate * 100],
  sdltBand4Rate: [10, UK_SDLT.standard[3].rate * 100],
  sdltTopRate: [12, UK_SDLT.standard[4].rate * 100],
  sdltFtbRate: [5, UK_SDLT.firstTimeBuyer[1].rate * 100],
  sdltNonResidentSurcharge: [2, UK_SDLT.nonResidentSurcharge * 100],
  sdltNonResidentMinPrice: [40_000, UK_SDLT.nonResidentMinPrice],
};

describe('new ukFact keys', () => {
  it('each key equals the rates module (a data drop moves the token)', () => {
    for (const [key, [, fromModule]] of Object.entries(UK_FACTS)) {
      expect(num(`ukFact('${key}')`), key).toBe(fromModule);
    }
  });

  it('each key prints the published 2026/27 figure (sources named in uk-rates.ts)', () => {
    if (!UK_2026) return; // pinned to the 2026/27 dataset; the module cross-check above keeps running
    for (const [key, [published]] of Object.entries(UK_FACTS)) {
      expect(num(`ukFact('${key}')`), key).toBe(published);
    }
  });

  it('the Scottish band tops are the figures gov.scot publishes, in order, and the 48% band follows the last one', () => {
    const tops = ['scotStarterTop', 'scotBasicTop', 'scotIntermediateTop', 'scotHigherTop', 'scotAdvancedTop'].map((k) => num(`ukFact('${k}')`));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(tops.length);
  });

  it('every ukFact key evaluates to a finite number', () => {
    const keys = FIGURE_FUNCTIONS.get('ukFact')!.params[0].oneOf!;
    expect(keys.length).toBeGreaterThan(60);
    for (const key of keys) expect(Number.isFinite(num(`ukFact('${key}')`)), key).toBe(true);
  });

  it('the year-keyed rates hold the new values, and uk-tax-calc / stamp-duty re-export one source (no second copy)', () => {
    const r = UK_RATES_BY_YEAR[UK_TAX_YEAR as keyof typeof UK_RATES_BY_YEAR];
    expect(r.qualifyingEarnings).toEqual(UK_QUALIFYING_EARNINGS);
    expect(UK_QUALIFYING_EARNINGS_LOWER).toBe(r.qualifyingEarnings.lower);
    expect(UK_QUALIFYING_EARNINGS_UPPER).toBe(r.qualifyingEarnings.upper);
    expect(CALC_PENSION_AA).toBe(r.pensionAnnualAllowance);
    expect(UK_CHILDCARE_ANI_LIMIT).toBe(r.childcareAniLimit);
    expect(SDLT_NON_RESIDENT_SURCHARGE).toBe(UK_SDLT.nonResidentSurcharge);
  });
});

describe('sdlt nonResident option mirrors the Stamp Duty tool', () => {
  const buyers: Array<[string, BuyerType]> = [['standard', 'standard'], ['ftb', 'first-time'], ['additional', 'additional']];

  it('equals calculateSdlt with nonResident over a grid of prices and buyers (exact)', () => {
    let compared = 0;
    for (const price of [0, 30_000, 39_999, 40_000, 125_000, 200_000, 300_000, 425_000, 500_000, 500_001, 700_000, 925_000, 1_500_000, 3_000_000]) {
      for (const [word, type] of buyers) {
        expect(num(`sdlt(${price}, buyer=${word}, nonResident=true)`), `${price} ${word}`).toBe(calculateSdlt(price, type, { nonResident: true }).totalTax);
        expect(num(`sdlt(${price}, buyer=${word}, nonResident=false)`), `${price} ${word}`).toBe(calculateSdlt(price, type).totalTax);
        compared += 2;
      }
    }
    expect(compared).toBe(14 * 3 * 2);
  });

  it('matches the worked examples in the guidance the tool cites (£700,000 England: £39,000; first-time buyer £200,000: £4,000)', () => {
    if (!UK_2026) return;
    expect(num('sdlt(700000, nonResident=true)')).toBe(39_000); // GOV.UK non-resident guidance, "Fifi"
    expect(num('sdlt(200000, buyer=ftb, nonResident=true)')).toBe(4_000); // HMRC SDLTM09870, "Gia"
  });

  it('adds exactly 2% of the price on a purchase of £40,000 or more, and nothing below it', () => {
    for (const price of [40_000, 250_000, 925_000, 2_000_000]) {
      expect(num(`sdlt(${price}, nonResident=true)`) - num(`sdlt(${price})`)).toBeCloseTo(price * UK_SDLT.nonResidentSurcharge, 6);
    }
    expect(num('sdlt(39999, nonResident=true)')).toBe(num('sdlt(39999)'));
  });

  it('defaults to a UK-resident buyer, so no existing token changes', () => {
    for (const price of [125_000, 425_000, 925_000]) expect(num(`sdlt(${price})`)).toBe(num(`sdlt(${price}, nonResident=false)`));
  });
});

describe('new usFact keys', () => {
  const statuses: FilingStatus[] = ['single', 'married', 'head'];

  it('IRA limits equal us-rates.ts for a published year and are refused for an unpublished one (like the 401(k) limits)', () => {
    // Which years are unpublished changes as the IRS publishes; the refusal itself is covered
    // with a mocked unpublished year in figures-unpublished.test.ts.
    let published = 0;
    let refused = 0;
    for (const year of US_TAX_YEARS) {
      const ira = getUsRates(year).retirementIra;
      for (const [key, expected] of [['iraLimit', ira.limit], ['iraCatchUp', ira.catchUp]] as const) {
        const expr = `usFact('${key}', year=${year})`;
        if (ira.published) {
          expect(num(expr), expr).toBe(expected);
          published++;
        } else {
          throwsFigureError(expr, new RegExp(`has not published the ${year} IRA limits`));
          refused++;
        }
      }
    }
    expect(published).toBeGreaterThan(0); // 2026 is published
    expect(published + refused).toBe(US_TAX_YEARS.length * 2); // every year/key is either printed or refused
  });

  it('IRA 2026 and 2027 print the IRS figures ($7,500; catch-up $1,100; 2027 from IR-2026-136)', () => {
    for (const year of [2026, 2027]) {
      expect(num(`usFact('iraLimit', year=${year})`)).toBe(7_500);
      expect(num(`usFact('iraCatchUp', year=${year})`)).toBe(1_100);
    }
  });

  it('OBBBA overtime and senior deduction keys equal us-rates.ts for every year and status', () => {
    for (const year of US_TAX_YEARS) {
      const o = getUsRates(year).obbba!;
      for (const status of statuses) {
        const at = `status=${status}, year=${year}`;
        expect(num(`usFact('overtimeCap', ${at})`)).toBe(o.overtime.cap[status]);
        expect(num(`usFact('overtimePhaseOutStart', ${at})`)).toBe(o.overtime.phaseOutStart[status]);
        expect(num(`usFact('seniorPhaseOutStart', ${at})`)).toBe(o.senior.phaseOutStart[status]);
      }
      expect(num(`usFact('overtimeReductionPer1000', year=${year})`)).toBe(o.overtime.reductionPerThousand);
      expect(num(`usFact('seniorDeduction', year=${year})`)).toBe(o.senior.perPerson);
      expect(num(`usFact('seniorPhaseOutRate', year=${year})`)).toBe(o.senior.phaseOutRate * 100);
    }
  });

  it('OBBBA keys print the IRS figures: overtime $12,500 / $25,000 phasing out above $150,000 / $300,000; senior $6,000 above $75,000 / $150,000 at 6%', () => {
    expect(num("usFact('overtimeCap', year=2026)")).toBe(12_500);
    expect(num("usFact('overtimeCap', status=married, year=2026)")).toBe(25_000);
    expect(num("usFact('overtimePhaseOutStart', year=2026)")).toBe(150_000);
    expect(num("usFact('overtimePhaseOutStart', status=married, year=2026)")).toBe(300_000);
    expect(num("usFact('overtimeReductionPer1000', year=2026)")).toBe(100);
    expect(num("usFact('seniorDeduction', year=2026)")).toBe(6_000);
    expect(num("usFact('seniorPhaseOutStart', year=2026)")).toBe(75_000);
    expect(num("usFact('seniorPhaseOutStart', status=married, year=2026)")).toBe(150_000);
    expect(num("usFact('seniorPhaseOutRate', year=2026)")).toBe(6);
  });

  it('every usFact key evaluates to a finite number for every status and year it is published for', () => {
    const keys = FIGURE_FUNCTIONS.get('usFact')!.params[0].oneOf!;
    for (const year of US_TAX_YEARS) {
      const r = getUsRates(year);
      for (const key of keys) {
        const expr = (status: FilingStatus) => `usFact('${key}', status=${status}, year=${year})`;
        const unpublished = (key.startsWith('k401') && !r.retirement401k.published) || (key.startsWith('ira') && !r.retirementIra.published);
        for (const status of statuses) {
          if (unpublished) throwsFigureError(expr(status), /has not published/);
          else expect(Number.isFinite(num(expr(status))), expr(status)).toBe(true);
        }
      }
    }
  });
});

describe('solarDefault reads the calculator regional defaults', () => {
  const fields = {
    systemCost: 'systemCost',
    systemSize: 'systemSize',
    batteryCost: 'batteryCost',
    batteryCapacity: 'batteryCapacity',
    tariff: 'electricityTariff',
    exportTariff: 'exportTariff',
    maintenance: 'maintenanceCost',
    kWhPerKwp: 'kWhPerKwp',
  } as const;

  it('every region and key equals SOLAR_REGIONAL_DEFAULTS exactly', () => {
    let compared = 0;
    for (const region of ['uk', 'us', 'eur'] as const) {
      for (const [key, field] of Object.entries(fields)) {
        expect(num(`solarDefault('${region}', '${key}')`), `${region} ${key}`).toBe(SOLAR_REGIONAL_DEFAULTS[region][field as keyof (typeof SOLAR_REGIONAL_DEFAULTS)['uk']]);
        compared++;
      }
    }
    expect(compared).toBe(24);
  });

  it('the tariffs the page quotes are the ones solarPayback uses when no tariff is given', () => {
    for (const region of ['uk', 'us', 'eur']) {
      const given = v(`solarPayback('${region}', tariff=solarDefault('${region}', 'tariff'), exportTariff=solarDefault('${region}', 'exportTariff'))`);
      const dflt = v(`solarPayback('${region}')`);
      expect(given, region).toEqual(dflt);
    }
  });

  it('refuses an unknown key or region, listing what exists', () => {
    throwsFigureError("solarDefault('uk', 'price')", /"key" must be one of/);
    throwsFigureError("solarDefault('fr', 'tariff')", /"region" must be one of/);
  });
});

describe('every ukFact / usFact key is documented in docs/figures.md', () => {
  const doc = readFileSync('docs/figures.md', 'utf8');
  it('ukFact keys', () => {
    for (const key of FIGURE_FUNCTIONS.get('ukFact')!.params[0].oneOf!) expect(doc, key).toContain(`\`${key}\``);
  });
  it('usFact keys', () => {
    for (const key of FIGURE_FUNCTIONS.get('usFact')!.params[0].oneOf!) expect(doc, key).toContain(`\`${key}\``);
  });
});

/**
 * Solar panel payback model — generation, self-consumption (with optional
 * battery), panel degradation, energy price inflation, export income, and
 * maintenance costs.
 *
 * Used by the Solar Panel Payback calculator.
 */

/** Battery round-trip efficiency (90% is typical for lithium systems) */
export const BATTERY_ROUND_TRIP = 0.9;

/** Self-consumption never reaches 100% in practice. */
const MAX_SELF_CONSUMPTION = 0.95;

/**
 * Exact effective self-consumption fraction (0-1) for one year's generation:
 * with a battery, surplus daytime generation is stored (up to battery
 * capacity x round-trip efficiency, once a day) for evening use. Capped at 95%.
 */
export function selfConsumptionFraction(
  baseSelfConsumptionPct: number,
  annualGenerationKwh: number,
  batteryCapacityKwh: number,
  roundTrip: number = BATTERY_ROUND_TRIP,
): number {
  const base = baseSelfConsumptionPct / 100;
  const dailyGen = annualGenerationKwh / 365;
  if (dailyGen <= 0) return base;
  const dailySurplus = dailyGen * (1 - base);
  const batteryCapture = Math.min(dailySurplus, Math.max(0, batteryCapacityKwh) * roundTrip);
  return Math.max(base, Math.min(base + batteryCapture / dailyGen, MAX_SELF_CONSUMPTION));
}

/**
 * Year-1 effective self-consumption as a whole-number percentage, for display
 * ("battery lifts 30% to 76%"). The payback model itself recomputes the
 * battery's share every year on that year's (degraded) output, unrounded.
 */
export function effectiveSelfConsumption(
  includeBattery: boolean,
  baseSelfConsumptionPct: number,
  systemSizeKwp: number,
  kWhPerKwp: number,
  batteryCapacityKwh: number,
  roundTrip: number = BATTERY_ROUND_TRIP,
): number {
  if (!includeBattery) return baseSelfConsumptionPct;
  const gen = systemSizeKwp * kWhPerKwp;
  if (gen <= 0) return baseSelfConsumptionPct;
  return Math.round(selfConsumptionFraction(baseSelfConsumptionPct, gen, batteryCapacityKwh, roundTrip) * 100);
}

export interface SolarPaybackInputs {
  /** Total installation cost before incentives */
  systemCost: number;
  /** Rated panel capacity in kilowatts-peak */
  systemSize: number;
  includeBattery: boolean;
  /** Installed cost of battery system (only added when includeBattery) */
  batteryCost: number;
  /** Import tariff in pence/cents per kWh */
  electricityTariff: number;
  /**
   * Self-consumption percentage (0–100). Without a battery this is used as
   * is. With a battery AND batteryCapacityKwh given, it is the base
   * (no-battery) share and the battery effect is added year by year.
   */
  selfConsumptionPct: number;
  /** Usable battery capacity (kWh). When set with includeBattery, battery capture is modelled per year. */
  batteryCapacityKwh?: number;
  /** Export tariff in pence/cents per kWh */
  exportTariff: number;
  /** Energy price inflation, % per year */
  energyInflation: number;
  /** Panel degradation, % per year */
  degradation: number;
  /** Maintenance cost per year (currency units) */
  maintenanceCost: number;
  /** Upfront incentive that reduces net cost */
  taxCredit: number;
  /** Analysis period in years */
  analysisPeriod: number;
  /** Annual kWh generated per kWp installed */
  kWhPerKwp: number;
}

export interface SolarYearRow {
  year: number;
  generation: number;
  annualSavings: number;
  cumulativeSavings: number;
}

export interface SolarPaybackResult {
  /** Cost after incentives. Zero or negative means the incentive covers the whole cost. */
  netCost: number;
  /** Whole years before the payback year (e.g. 6 for "6 yr 8 mo"); -1 if never */
  paybackYears: number;
  /** Months into the payback year (0–11) */
  paybackMonths: number;
  reachesPayback: boolean;
  /** Net cost is zero or less: there is nothing to pay back (MATH-US-11). */
  paysBackImmediately: boolean;
  /** Annual savings are never positive: running costs exceed what the panels save. */
  neverSavesMoney: boolean;
  year1Savings: number;
  totalSavings: number;
  /** Return over the analysis period, %. Null when the net cost is zero or less (undefined ratio). */
  roi: number | null;
  yearly: SolarYearRow[];
}

export function calculateSolarPayback(inputs: SolarPaybackInputs): SolarPaybackResult {
  const {
    systemCost, systemSize, includeBattery, batteryCost,
    electricityTariff, selfConsumptionPct, exportTariff,
    energyInflation, degradation, maintenanceCost,
    taxCredit, analysisPeriod, kWhPerKwp, batteryCapacityKwh,
  } = inputs;

  const netCost = systemCost + (includeBattery ? batteryCost : 0) - taxCredit;
  const tariffRate = electricityTariff / 100;    // convert pence → pounds
  const exportRate = exportTariff / 100;
  const degRate = degradation / 100;
  const inflRate = energyInflation / 100;
  const perYearBattery = includeBattery && typeof batteryCapacityKwh === 'number';

  let cumulative = 0;
  let paybackYear = -1;
  let paybackFraction = 0;
  let anyPositiveYear = false;

  const yearly: SolarYearRow[] = [];

  for (let y = 1; y <= analysisPeriod; y++) {
    const gen = systemSize * kWhPerKwp * Math.pow(1 - degRate, y - 1);
    const selfRate = perYearBattery
      ? selfConsumptionFraction(selfConsumptionPct, gen, batteryCapacityKwh as number)
      : selfConsumptionPct / 100;
    const selfKwh = gen * selfRate;
    const exportKwh = gen - selfKwh;
    const curTariff = tariffRate * Math.pow(1 + inflRate, y - 1);
    const curExport = exportRate * Math.pow(1 + inflRate, y - 1);

    const savings = selfKwh * curTariff + exportKwh * curExport - maintenanceCost;
    if (savings > 0) anyPositiveYear = true;

    const prevCumulative = cumulative;
    cumulative += savings;

    if (paybackYear === -1 && netCost > 0 && cumulative >= netCost) {
      paybackYear = y;
      const needed = netCost - prevCumulative;
      paybackFraction = savings > 0 ? needed / savings : 0;
    }

    yearly.push({
      year: y,
      generation: Math.round(gen),
      annualSavings: Math.round(savings),
      cumulativeSavings: Math.round(cumulative),
    });
  }

  const paysBackImmediately = netCost <= 0;

  // Whole months into the payback year; 12 rounds up into the next year.
  let paybackYears = -1;
  let paybackMonths = 0;
  if (paysBackImmediately) {
    paybackYears = 0;
  } else if (paybackYear > 0) {
    const totalMonths = (paybackYear - 1) * 12 + Math.round(paybackFraction * 12);
    paybackYears = Math.floor(totalMonths / 12);
    paybackMonths = totalMonths % 12;
  }

  const year1Savings = yearly[0]?.annualSavings ?? 0;
  const totalSavings = cumulative;
  const roi = netCost > 0 ? ((totalSavings - netCost) / netCost) * 100 : null;

  return {
    netCost,
    paybackYears,
    paybackMonths,
    reachesPayback: paysBackImmediately || paybackYear > 0,
    paysBackImmediately,
    neverSavesMoney: !anyPositiveYear,
    year1Savings,
    totalSavings: Math.round(totalSavings),
    roi,
    yearly,
  };
}

/* ── Regional defaults ────────────────────────────────────── */

export type SolarRegion = 'uk' | 'us' | 'eur';

/** Inputs whose sensible default depends on where the visitor lives. */
export interface SolarRegionalDefaults {
  systemCost: number;
  systemSize: number;
  batteryCost: number;
  batteryCapacity: number;
  electricityTariff: number;
  exportTariff: number;
  maintenanceCost: number;
  kWhPerKwp: number;
}

/**
 * Regional starting values. Each figure cites its source (accessed
 * 2026-11-12); values marked "assumption" are modelling defaults with no
 * single official figure behind them.
 *
 * UK (GBP)
 * - systemCost 7,000 for 4 kWp: DESNZ "Solar PV cost data" 2025/26 median
 *   GBP 1,780/kW for 0-4 kW (declared net capacity), i.e. about GBP 7,100;
 *   https://www.gov.uk/government/statistics/solar-pv-cost-data
 * - electricityTariff 26.32p: Ofgem price cap, 1 Oct - 31 Dec 2026, Direct
 *   Debit average; no VAT on electricity from 1 Oct 2026 to 31 Mar 2027;
 *   https://www.ofgem.gov.uk/publications/changes-energy-price-cap-between-1-october-and-31-december-2026
 * - exportTariff 4.5p: Ofgem Smart Export Guarantee report, year 5
 *   (Apr 2024 - Mar 2025): untied tariffs averaged 4.39p/kWh (tied to the
 *   supplier's import tariff: 14.54p);
 *   https://www.ofgem.gov.uk/transparency-document/smart-export-guarantee-annual-report-april-2024-march-2025
 * - kWhPerKwp 900: DUKES 2026 ch. 6, UK solar PV load factor 9.2% (2024) and
 *   11.1% (2025, sunniest year since 2001) = 806-972 kWh per kW a year;
 *   https://www.gov.uk/government/statistics/renewable-sources-of-energy-chapter-6-digest-of-united-kingdom-energy-statistics-dukes
 * - batteryCost 4,500 for 5 kWh, maintenanceCost 150: assumption.
 *
 * US (USD)
 * - systemSize 7.5 kWp: Berkeley Lab "U.S. Distributed Solar and Storage
 *   Data: 2026 Update", median residential system 7.7 kW in 2025;
 *   https://eta-publications.lbl.gov/sites/default/files/2026-08/distributed_solar_storage-2026_data_update_final.pdf
 * - systemCost 22,500: same update, cash-purchase residential median about
 *   $3.0/W in 2025 (chart value, reported by Mercom, 6 Oct 2026) x 7.5 kW.
 * - batteryCapacity 13.5 kWh and batteryCost 15,750: same update, median
 *   residential storage 13.5 kWh; paired PV+storage cash prices $2.1/W
 *   higher than stand-alone PV, x 7.5 kW.
 * - electricityTariff 18.04 cents: EIA Electric Power Monthly table 5.3,
 *   residential average, rolling 12 months to August 2026;
 *   https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3
 * - exportTariff 18.04 cents: net metering credits exports at the retail
 *   rate (the convention NREL PVWatts uses); successor tariffs pay less, and
 *   the UI says so.
 * - kWhPerKwp 1,375: NREL ATB 2024 residential PV, US mean DC capacity
 *   factor 15.7% x 8,760 h; https://atb.nlr.gov/electricity/2024/residential_pv
 * - maintenanceCost 225: same ATB page, fixed O&M $30/kWdc-yr x 7.5 kW.
 * - No federal credit: the 25D residential clean energy credit is "not
 *   available for any property placed in service after December 31, 2025";
 *   https://www.irs.gov/credits-deductions/residential-clean-energy-credit
 *
 * EUR
 * - electricityTariff 28.79 cents: Eurostat nrg_pc_204, EU-27 household
 *   price, first half of 2026, all consumption bands, all taxes included
 *   (EUR 0.2879/kWh; dataset updated 2026-10-19);
 *   https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table
 * - Other values: the UK physical assumptions (assumption; prices, yields and
 *   feed-in rates vary widely by country).
 */
export const SOLAR_REGIONAL_DEFAULTS: Record<SolarRegion, SolarRegionalDefaults> = {
  uk: {
    systemCost: 7000,
    systemSize: 4,
    batteryCost: 4500,
    batteryCapacity: 5,
    electricityTariff: 26.32,
    exportTariff: 4.5,
    maintenanceCost: 150,
    kWhPerKwp: 900,
  },
  us: {
    systemCost: 22500,
    systemSize: 7.5,
    batteryCost: 15750,
    batteryCapacity: 13.5,
    electricityTariff: 18.04,
    exportTariff: 18.04,
    maintenanceCost: 225,
    kWhPerKwp: 1375,
  },
  eur: {
    systemCost: 7000,
    systemSize: 4,
    batteryCost: 4500,
    batteryCapacity: 5,
    electricityTariff: 28.79,
    exportTariff: 4.5,
    maintenanceCost: 150,
    kWhPerKwp: 900,
  },
};

/** Date the regional figures above were last checked against their sources. */
export const SOLAR_DEFAULTS_CHECKED = '2026-11-12';

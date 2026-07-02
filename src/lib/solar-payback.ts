/**
 * Solar panel payback model — generation, self-consumption (with optional
 * battery), panel degradation, energy price inflation, export income, and
 * maintenance costs.
 *
 * Used by the Solar Panel Payback calculator.
 */

/** Battery round-trip efficiency (90% is typical for lithium systems) */
export const BATTERY_ROUND_TRIP = 0.9;

/**
 * Effective self-consumption: with a battery, surplus daytime generation
 * is stored (up to battery capacity × round-trip efficiency) for evening use.
 * Returns a whole-number percentage, capped at 95% — never 100% in practice.
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
  const dailyGen = (systemSizeKwp * kWhPerKwp) / 365;
  if (dailyGen <= 0) return baseSelfConsumptionPct;
  const baseFraction = baseSelfConsumptionPct / 100;
  const dailySurplus = dailyGen * (1 - baseFraction);
  const batteryCapture = Math.min(dailySurplus, batteryCapacityKwh * roundTrip);
  const effective = baseFraction + batteryCapture / dailyGen;
  return Math.min(Math.round(effective * 100), 95); // cap at 95% — never 100% in practice
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
  /** Effective self-consumption percentage (0–100) */
  selfConsumptionPct: number;
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
  netCost: number;
  /** Whole years before the payback year (e.g. 6 for "6 yr 8 mo"); -1 if never */
  paybackYears: number;
  /** Months into the payback year (0–11) */
  paybackMonths: number;
  reachesPayback: boolean;
  year1Savings: number;
  totalSavings: number;
  roi: number;
  yearly: SolarYearRow[];
}

export function calculateSolarPayback(inputs: SolarPaybackInputs): SolarPaybackResult {
  const {
    systemCost, systemSize, includeBattery, batteryCost,
    electricityTariff, selfConsumptionPct, exportTariff,
    energyInflation, degradation, maintenanceCost,
    taxCredit, analysisPeriod, kWhPerKwp,
  } = inputs;

  const netCost = systemCost + (includeBattery ? batteryCost : 0) - taxCredit;
  const tariffRate = electricityTariff / 100;    // convert pence → pounds
  const exportRate = exportTariff / 100;
  const selfRate = selfConsumptionPct / 100;
  const degRate = degradation / 100;
  const inflRate = energyInflation / 100;

  let cumulative = 0;
  let paybackYear = -1;
  let paybackFraction = 0;
  let prevCumulative = 0;

  const yearly: SolarYearRow[] = [];

  for (let y = 1; y <= analysisPeriod; y++) {
    const gen = systemSize * kWhPerKwp * Math.pow(1 - degRate, y - 1);
    const selfKwh = gen * selfRate;
    const exportKwh = gen - selfKwh;
    const curTariff = tariffRate * Math.pow(1 + inflRate, y - 1);
    const curExport = exportRate * Math.pow(1 + inflRate, y - 1);

    const savings = selfKwh * curTariff + exportKwh * curExport - maintenanceCost;

    prevCumulative = cumulative;
    cumulative += savings;

    if (paybackYear === -1 && cumulative >= netCost && netCost > 0) {
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

  const paybackMonths = paybackYear > 0
    ? Math.min(Math.round(paybackFraction * 12), 11)
    : 0;
  const paybackYears = paybackYear > 0 ? paybackYear - 1 : -1;

  const year1Savings = yearly[0]?.annualSavings ?? 0;
  const totalSavings = cumulative;
  const roi = netCost > 0 ? ((totalSavings - netCost) / netCost) * 100 : 0;

  return {
    netCost,
    paybackYears,
    paybackMonths,
    reachesPayback: paybackYear > 0,
    year1Savings,
    totalSavings: Math.round(totalSavings),
    roi,
    yearly,
  };
}

import { describe, it, expect } from 'vitest';
import {
  calculateSolarPayback,
  effectiveSelfConsumption,
  type SolarPaybackInputs,
} from './solar-payback';

/**
 * Hand-checkable base case: 1 kWp generating 1,000 kWh/yr, 50% self-consumed
 * at 20p/kWh (£100) + 50% exported at 10p/kWh (£50) = £150/yr flat
 * (no inflation, degradation, or maintenance) against a £1,000 system.
 */
const SIMPLE: SolarPaybackInputs = {
  systemCost: 1_000,
  systemSize: 1,
  includeBattery: false,
  batteryCost: 0,
  electricityTariff: 20,
  selfConsumptionPct: 50,
  exportTariff: 10,
  energyInflation: 0,
  degradation: 0,
  maintenanceCost: 0,
  taxCredit: 0,
  analysisPeriod: 10,
  kWhPerKwp: 1_000,
};

const paybackTotalMonths = (r: ReturnType<typeof calculateSolarPayback>) =>
  r.reachesPayback ? r.paybackYears * 12 + r.paybackMonths : Infinity;

describe('calculateSolarPayback — deterministic snapshots', () => {
  it('flat £150/yr vs £1,000 cost → payback at 6 yr 8 mo', () => {
    const r = calculateSolarPayback(SIMPLE);
    expect(r.netCost).toBe(1_000);
    expect(r.year1Savings).toBe(150);
    expect(r.yearly[0].generation).toBe(1_000);
    expect(r.reachesPayback).toBe(true);
    // Cumulative hits £1,000 during year 7: 6 full years (£900) + 100/150 of a year ≈ 8 months
    expect(r.paybackYears).toBe(6);
    expect(r.paybackMonths).toBe(8);
    expect(r.totalSavings).toBe(1_500);
    expect(r.roi).toBeCloseTo(50, 6);
    expect(r.yearly).toHaveLength(SIMPLE.analysisPeriod);
  });

  it('tax credit reduces net cost and shortens payback', () => {
    const r = calculateSolarPayback({ ...SIMPLE, taxCredit: 500 });
    expect(r.netCost).toBe(500);
    // £500 / £150 per year → year 4: 3 full years (£450) + 50/150 ≈ 4 months
    expect(r.paybackYears).toBe(3);
    expect(r.paybackMonths).toBe(4);
  });

  it('battery cost is added to net cost only when included', () => {
    expect(calculateSolarPayback({ ...SIMPLE, batteryCost: 300 }).netCost).toBe(1_000);
    expect(calculateSolarPayback({ ...SIMPLE, includeBattery: true, batteryCost: 300 }).netCost).toBe(1_300);
  });

  it('reports no payback when savings never reach the cost', () => {
    const r = calculateSolarPayback({ ...SIMPLE, systemCost: 10_000 });
    expect(r.reachesPayback).toBe(false);
    expect(r.paybackYears).toBe(-1);
    expect(r.paybackMonths).toBe(0);
    expect(r.roi).toBeLessThan(0);
  });

  it('degradation reduces generation and savings year on year', () => {
    const r = calculateSolarPayback({ ...SIMPLE, degradation: 10 });
    expect(r.yearly[0].generation).toBe(1_000);
    expect(r.yearly[1].generation).toBe(900); // 1,000 × 0.9
    expect(r.yearly[1].annualSavings).toBe(135); // 900 kWh × blended 15p
  });

  it('energy inflation grows savings year on year', () => {
    const r = calculateSolarPayback({ ...SIMPLE, energyInflation: 10 });
    expect(r.yearly[0].annualSavings).toBe(150);
    expect(r.yearly[1].annualSavings).toBe(165); // 150 × 1.1
  });

  it('maintenance cost is deducted from every year', () => {
    const r = calculateSolarPayback({ ...SIMPLE, maintenanceCost: 50 });
    expect(r.year1Savings).toBe(100);
  });

  it('realistic UK default: 4 kWp / £7,000 system saves £228 in year 1', () => {
    // 3,600 kWh: 30% self-consumed at 24.5p (£264.60) + 70% exported at
    // 4.5p (£113.40) − £150 maintenance = £228
    const r = calculateSolarPayback({
      systemCost: 7_000, systemSize: 4, includeBattery: false, batteryCost: 4_500,
      electricityTariff: 24.5, selfConsumptionPct: 30, exportTariff: 4.5,
      energyInflation: 3, degradation: 0.5, maintenanceCost: 150,
      taxCredit: 0, analysisPeriod: 25, kWhPerKwp: 900,
    });
    expect(r.netCost).toBe(7_000);
    expect(r.year1Savings).toBe(228);
    expect(r.reachesPayback).toBe(true);
  });
});

describe('calculateSolarPayback — invariants', () => {
  it('a more expensive system takes longer to pay back', () => {
    const cheap = calculateSolarPayback(SIMPLE);
    const dear = calculateSolarPayback({ ...SIMPLE, systemCost: 1_190 });
    expect(paybackTotalMonths(dear)).toBeGreaterThan(paybackTotalMonths(cheap));
  });

  it('higher self-consumption increases savings when import tariff exceeds export', () => {
    const low = calculateSolarPayback(SIMPLE);
    const high = calculateSolarPayback({ ...SIMPLE, selfConsumptionPct: 80 });
    expect(high.year1Savings).toBeGreaterThan(low.year1Savings);
  });
});

describe('effectiveSelfConsumption', () => {
  it('returns the base percentage without a battery', () => {
    expect(effectiveSelfConsumption(false, 30, 4, 900, 5)).toBe(30);
  });

  it('4 kWp system with a 5 kWh battery lifts 30% base to 76%', () => {
    // Daily generation 3,600/365 ≈ 9.863 kWh; surplus 6.904 kWh; battery
    // captures min(6.904, 5 × 0.9 = 4.5) → 0.30 + 4.5/9.863 = 75.6% → 76
    expect(effectiveSelfConsumption(true, 30, 4, 900, 5)).toBe(76);
  });

  it('caps at 95% even with an oversized battery', () => {
    expect(effectiveSelfConsumption(true, 30, 1, 900, 20)).toBe(95);
  });

  it('falls back to base when the system generates nothing', () => {
    expect(effectiveSelfConsumption(true, 30, 0, 900, 5)).toBe(30);
  });

  it('battery increases self-consumption savings end-to-end', () => {
    const withoutBattery = calculateSolarPayback({ ...SIMPLE, selfConsumptionPct: effectiveSelfConsumption(false, 50, 1, 1_000, 5) });
    const withBattery = calculateSolarPayback({ ...SIMPLE, selfConsumptionPct: effectiveSelfConsumption(true, 50, 1, 1_000, 5) });
    expect(withBattery.year1Savings).toBeGreaterThan(withoutBattery.year1Savings);
  });
});

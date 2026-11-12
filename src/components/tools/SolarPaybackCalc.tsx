import { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { ChevronDown, RotateCcw, Sun, Zap, TrendingUp, Leaf } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartSkeleton from '../ui/ChartSkeleton';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import {
  calculateSolarPayback,
  effectiveSelfConsumption as calcEffectiveSelfConsumption,
  SOLAR_REGIONAL_DEFAULTS,
  type SolarRegion,
  type SolarRegionalDefaults,
} from '../../lib/solar-payback';

const SolarPaybackChart = lazy(() => import('./charts/SolarPaybackChart'));
const CHART_HEIGHT = 220;

/* ── Defaults ─────────────────────────────────────────────── */

/** Inputs that do not depend on region. Region-dependent ones come from SOLAR_REGIONAL_DEFAULTS. */
const DEFAULTS = {
  includeBattery: false,
  baseSelfConsumption: 30,   // % without battery
  energyInflation: 3,        // % per year
  degradation: 0.5,          // % per year
  taxCredit: 0,
  analysisPeriod: 25,        // years
};

type RegionalKey = keyof SolarRegionalDefaults;

const regionFor = (currency: string): SolarRegion => (currency === 'GBP' ? 'uk' : currency === 'EUR' ? 'eur' : 'us');

const fmtRate = (v: number) => String(Math.round(v * 100) / 100);

export default function SolarPaybackCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const region = regionFor(currency);
  const tariffUnit = currency === 'GBP' ? 'p' : currency === 'EUR' ? 'c' : '¢';

  // Server render and first client render use the USD defaults (useCurrency starts on USD);
  // the region effect below swaps in the visitor's regional defaults for untouched inputs.
  const initial = SOLAR_REGIONAL_DEFAULTS.us;
  const [systemCost, setSystemCost] = useState(initial.systemCost);
  const [systemSize, setSystemSize] = useState(initial.systemSize);
  const [includeBattery, setIncludeBattery] = useState(DEFAULTS.includeBattery);
  const [batteryCost, setBatteryCost] = useState(initial.batteryCost);
  const [batteryCapacity, setBatteryCapacity] = useState(initial.batteryCapacity);
  const [electricityTariff, setElectricityTariff] = useState(initial.electricityTariff);
  const [baseSelfConsumption, setBaseSelfConsumption] = useState(DEFAULTS.baseSelfConsumption);
  const [exportTariff, setExportTariff] = useState(initial.exportTariff);
  const [energyInflation, setEnergyInflation] = useState(DEFAULTS.energyInflation);
  const [degradation, setDegradation] = useState(DEFAULTS.degradation);
  const [maintenanceCost, setMaintenanceCost] = useState(initial.maintenanceCost);
  const [taxCredit, setTaxCredit] = useState(DEFAULTS.taxCredit);
  const [analysisPeriod, setAnalysisPeriod] = useState(DEFAULTS.analysisPeriod);
  const [kWhPerKwp, setKWhPerKwp] = useState(initial.kWhPerKwp);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Regional defaults: applied to inputs the visitor has not changed ── */
  const touched = useRef<Set<RegionalKey>>(new Set());
  const setters: Record<RegionalKey, (v: number) => void> = {
    systemCost: setSystemCost,
    systemSize: setSystemSize,
    batteryCost: setBatteryCost,
    batteryCapacity: setBatteryCapacity,
    electricityTariff: setElectricityTariff,
    exportTariff: setExportTariff,
    maintenanceCost: setMaintenanceCost,
    kWhPerKwp: setKWhPerKwp,
  };
  const userSet = (key: RegionalKey) => (v: number) => {
    touched.current.add(key);
    setters[key](v);
  };

  useEffect(() => {
    const d = SOLAR_REGIONAL_DEFAULTS[region];
    (Object.keys(d) as RegionalKey[]).forEach((key) => {
      if (!touched.current.has(key)) setters[key](d[key]);
    });
    // setters are stable React state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const handleReset = useCallback(() => {
    touched.current.clear();
    const d = SOLAR_REGIONAL_DEFAULTS[region];
    (Object.keys(d) as RegionalKey[]).forEach((key) => setters[key](d[key]));
    setIncludeBattery(DEFAULTS.includeBattery);
    setBaseSelfConsumption(DEFAULTS.baseSelfConsumption);
    setEnergyInflation(DEFAULTS.energyInflation);
    setDegradation(DEFAULTS.degradation);
    setTaxCredit(DEFAULTS.taxCredit);
    setAnalysisPeriod(DEFAULTS.analysisPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const handleBatteryToggle = useCallback(() => {
    setIncludeBattery((prev) => !prev);
  }, []);

  /** Year-1 effective self-consumption, shown as "30% -> 76%". The model recomputes it each year. */
  const effectiveSelfConsumption = useMemo(
    () => calcEffectiveSelfConsumption(includeBattery, baseSelfConsumption, systemSize, kWhPerKwp, batteryCapacity),
    [includeBattery, baseSelfConsumption, systemSize, kWhPerKwp, batteryCapacity],
  );

  /* ── Core calculation (src/lib/solar-payback.ts) ────────── */
  const result = useMemo(() => calculateSolarPayback({
    systemCost,
    systemSize,
    includeBattery,
    batteryCost,
    batteryCapacityKwh: includeBattery ? batteryCapacity : undefined,
    electricityTariff,
    selfConsumptionPct: baseSelfConsumption,
    exportTariff,
    energyInflation,
    degradation,
    maintenanceCost,
    taxCredit,
    analysisPeriod,
    kWhPerKwp,
  }), [
    systemCost, systemSize, includeBattery, batteryCost, batteryCapacity,
    electricityTariff, baseSelfConsumption, exportTariff,
    energyInflation, degradation, maintenanceCost,
    taxCredit, analysisPeriod, kWhPerKwp,
  ]);

  const grossCost = systemCost + (includeBattery ? batteryCost : 0);
  const paybackDisplay = result.paysBackImmediately
    ? 'Pays back immediately'
    : result.reachesPayback
      ? `${result.paybackYears} yr ${result.paybackMonths} mo`
      : result.neverSavesMoney
        ? 'Never'
        : `${analysisPeriod}+ years`;

  const paybackColor = result.paysBackImmediately || (result.reachesPayback && result.paybackYears < 10)
    ? 'text-success-600'
    : result.reachesPayback && result.paybackYears < 15
      ? 'text-amber-600'
      : 'text-red-600';

  const contextLine = result.paysBackImmediately
    ? `The ${fmt(taxCredit)} grant covers the ${fmt(grossCost)} cost, so there is nothing to pay back. Savings over ${analysisPeriod} years: ${fmt(result.totalSavings)}.`
    : result.reachesPayback
      ? `Your ${fmt(result.netCost)} system pays for itself, then earns ${fmt(result.totalSavings - result.netCost)} more over ${analysisPeriod} years`
      : result.neverSavesMoney
        ? 'Running costs are higher than what the panels save each year, so the system never pays for itself at these settings.'
        : `System does not pay for itself within ${analysisPeriod} years at current settings`;

  const roiText = result.roi === null ? 'n/a' : `${result.roi.toFixed(0)}%`;
  const liveText = `Payback: ${paybackDisplay}. Year 1 savings ${fmt(result.year1Savings)}.`;

  /* ── Chart data ─────────────────────────────────────────── */
  const chartRows = useMemo(() => [
    { year: 0, savings: 0 },
    ...result.yearly.map((d) => ({ year: d.year, savings: d.cumulativeSavings })),
  ], [result]);

  /* ── Region-aware hints ─────────────────────────────────── */
  const tariffHint = region === 'uk'
    ? `Ofgem price cap ${fmtRate(SOLAR_REGIONAL_DEFAULTS.uk.electricityTariff)}p/kWh, Oct–Dec 2026 (no VAT on electricity until 31 Mar 2027)`
    : region === 'eur'
      ? `EU household average ${fmtRate(SOLAR_REGIONAL_DEFAULTS.eur.electricityTariff)}c/kWh (Eurostat, first half of 2026); enter your own`
      : `US residential average ${fmtRate(SOLAR_REGIONAL_DEFAULTS.us.electricityTariff)}¢/kWh (EIA, 12 months to Aug 2026)`;
  const exportHint = region === 'uk'
    ? 'Smart Export Guarantee: untied tariffs averaged 4.39p in 2024/25; tariffs tied to your supplier averaged 14.54p'
    : region === 'eur'
      ? 'Feed-in rates vary by country — enter yours'
      : 'Net metering credits exports at your retail rate; many utilities now pay less under newer export tariffs';
  const creditHint = region === 'us'
    ? 'The 30% federal credit (25D) ended for systems placed in service after 31 Dec 2025 — enter any state or utility rebate'
    : 'Any grant or rebate that reduces the upfront cost';
  const costHint = region === 'uk'
    ? 'Total installation cost before incentives (0% VAT on installation until 31 Mar 2027, then 5%)'
    : 'Total installation cost before incentives';

  /* ── Callbacks for PDF / Email ──────────────────────────── */
  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'System Cost', value: fmt(systemCost) },
      { label: 'System Size', value: `${systemSize} kWp` },
      { label: 'Battery', value: includeBattery ? `${batteryCapacity} kWh (${fmt(batteryCost)})` : 'No' },
      { label: 'Electricity Tariff', value: `${fmtRate(electricityTariff)}${tariffUnit}/kWh` },
      { label: 'Self-Consumption', value: `${effectiveSelfConsumption}%${includeBattery ? ` (${baseSelfConsumption}% base, year 1)` : ''}` },
      { label: 'Export Tariff', value: `${fmtRate(exportTariff)}${tariffUnit}/kWh` },
      { label: 'Annual Generation', value: `${formatNumber(kWhPerKwp)} kWh/kWp` },
    ];
    if (taxCredit > 0) inputs.push({ label: 'Grant / Rebate', value: fmt(taxCredit) });
    return inputs;
  }, [systemCost, systemSize, includeBattery, batteryCost, batteryCapacity, electricityTariff, baseSelfConsumption, effectiveSelfConsumption, exportTariff, kWhPerKwp, taxCredit, tariffUnit, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Payback Period', value: paybackDisplay, highlight: true },
    { label: 'Net System Cost', value: fmt(result.netCost) },
    { label: 'Year 1 Savings', value: fmt(result.year1Savings) },
    { label: `${analysisPeriod}-Year Savings`, value: fmt(result.totalSavings) },
    { label: `${analysisPeriod}-Year ROI`, value: result.roi === null ? 'Not applicable (no net cost)' : roiText },
  ], [result, currency, analysisPeriod, paybackDisplay, roiText]);

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ───── Inputs ───── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">System Details</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <SliderInput
              label="System Cost"
              hint={costHint}
              id="solar-cost"
              value={systemCost}
              min={2000}
              max={50000}
              step={500}
              minLabel={`${currencySymbol}2K`}
              maxLabel={`${currencySymbol}50K`}
              onChange={userSet('systemCost')}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="System Size"
              hint="Rated panel capacity in kilowatts-peak"
              id="solar-size"
              value={systemSize}
              min={1}
              max={20}
              step={0.5}
              onChange={userSet('systemSize')}
              suffix=" kWp"
              formatDisplay={(v) => v.toFixed(1)}
            />

            {/* Battery toggle */}
            <div>
              <button
                type="button"
                role="switch"
                aria-checked={includeBattery}
                onClick={handleBatteryToggle}
                className="flex items-center gap-3 group"
              >
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${includeBattery ? 'bg-primary-600' : 'bg-neutral-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${includeBattery ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">
                  Include battery storage
                </span>
              </button>
            </div>

            {includeBattery && (
              <div className="space-y-5 pl-3 border-l-2 border-primary-100">
                <SliderInput
                  label="Battery Capacity"
                  hint="Usable storage capacity"
                  id="solar-battery-kwh"
                  value={batteryCapacity}
                  min={2}
                  max={20}
                  step={0.5}
                  onChange={userSet('batteryCapacity')}
                  suffix=" kWh"
                  formatDisplay={(v) => v.toFixed(1)}
                />
                <SliderInput
                  label="Battery Cost"
                  hint="Installed cost of battery system"
                  id="solar-battery"
                  value={batteryCost}
                  min={1000}
                  max={20000}
                  step={500}
                  minLabel={`${currencySymbol}1K`}
                  maxLabel={`${currencySymbol}20K`}
                  onChange={userSet('batteryCost')}
                  prefix={currencySymbol}
                  formatDisplay={formatNumber}
                />
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Battery boosts self-consumption from {baseSelfConsumption}% to <strong className="text-primary-700">{effectiveSelfConsumption}%</strong> in year 1 by
                  storing up to {batteryCapacity} kWh of surplus a day for evening use. The share is recalculated each year as panel output declines.
                </p>
              </div>
            )}

            <SliderInput
              label="Electricity Tariff"
              hint={tariffHint}
              id="solar-tariff"
              value={electricityTariff}
              min={5}
              max={60}
              step={0.5}
              onChange={userSet('electricityTariff')}
              suffix={`${tariffUnit}/kWh`}
              formatDisplay={fmtRate}
            />
            <SliderInput
              label={includeBattery ? 'Base Self-Consumption' : 'Self-Consumption'}
              hint={includeBattery ? 'Without battery — battery effect is added automatically' : 'Percentage of solar used directly (typically 25–35%)'}
              id="solar-self"
              value={baseSelfConsumption}
              min={10}
              max={80}
              step={5}
              onChange={setBaseSelfConsumption}
              suffix="%"
              formatDisplay={(v) => includeBattery ? `${v.toFixed(0)} → ${effectiveSelfConsumption}` : v.toFixed(0)}
            />
            <SliderInput
              label="Export Tariff"
              hint={exportHint}
              id="solar-export"
              value={exportTariff}
              min={0}
              max={30}
              step={0.5}
              onChange={userSet('exportTariff')}
              suffix={`${tariffUnit}/kWh`}
              formatDisplay={fmtRate}
            />

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              aria-controls="solar-advanced"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>

            {showAdvanced && (
              <div id="solar-advanced" className="space-y-5 pt-1">
                <SliderInput
                  label="Annual Generation"
                  hint={`kWh per kWp installed (UK ~${formatNumber(SOLAR_REGIONAL_DEFAULTS.uk.kWhPerKwp)}, US average ~${formatNumber(SOLAR_REGIONAL_DEFAULTS.us.kWhPerKwp)})`}
                  id="solar-gen"
                  value={kWhPerKwp}
                  min={600}
                  max={2000}
                  step={50}
                  onChange={userSet('kWhPerKwp')}
                  suffix=" kWh/kWp"
                  formatDisplay={(v) => formatNumber(v)}
                />
                <SliderInput
                  label="Energy Price Inflation"
                  hint="Expected annual electricity price increase"
                  id="solar-infl"
                  value={energyInflation}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={setEnergyInflation}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(1)}
                />
                <SliderInput
                  label="Panel Degradation"
                  hint="Annual output decline (0.5% is typical)"
                  id="solar-deg"
                  value={degradation}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={setDegradation}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(1)}
                />
                <SliderInput
                  label="Annual Maintenance"
                  hint="Cleaning, inspection, insurance and minor repairs"
                  id="solar-maint"
                  value={maintenanceCost}
                  min={0}
                  max={1000}
                  step={25}
                  minLabel={`${currencySymbol}0`}
                  maxLabel={`${currencySymbol}1K`}
                  onChange={userSet('maintenanceCost')}
                  prefix={currencySymbol}
                  formatDisplay={formatNumber}
                />
                <SliderInput
                  label="Grant / Rebate"
                  hint={creditHint}
                  id="solar-credit"
                  value={taxCredit}
                  min={0}
                  max={20000}
                  step={500}
                  minLabel={`${currencySymbol}0`}
                  maxLabel={`${currencySymbol}20K`}
                  onChange={setTaxCredit}
                  prefix={currencySymbol}
                  formatDisplay={formatNumber}
                />
                <SliderInput
                  label="Analysis Period"
                  hint="25 years = standard panel warranty"
                  id="solar-period"
                  value={analysisPeriod}
                  min={10}
                  max={40}
                  step={5}
                  onChange={setAnalysisPeriod}
                  suffix=" years"
                  formatDisplay={(v) => v.toFixed(0)}
                />
              </div>
            )}
          </div>
        </div>

        {/* ───── Results ───── */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <p className="sr-only" aria-live="polite">{liveText}</p>

          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Estimated payback period</p>
            <p data-headline-result data-headline-label="Estimated payback period" className={`text-3xl sm:text-4xl font-bold tabular-nums ${paybackColor}`}>
              {paybackDisplay}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{contextLine}</p>
          </div>

          {/* Stat cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Year 1 Savings</p>
                <p className={`text-lg font-semibold tabular-nums ${result.year1Savings < 0 ? 'text-red-600' : 'text-neutral-900'}`}>{fmt(result.year1Savings)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{analysisPeriod}-Year Savings</p>
                <p className={`text-lg font-semibold tabular-nums ${result.totalSavings < 0 ? 'text-red-600' : 'text-neutral-900'}`}>{fmt(result.totalSavings)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sun size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Net System Cost</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.netCost)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <Leaf size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{analysisPeriod}-Year ROI</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{roiText}</p>
                {result.roi === null && <p className="text-xs text-neutral-500">No net cost to compare</p>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="solar-payback" toolName="Solar Panel Payback Calculator" />
            <EmailResultsButton toolSlug="solar-payback" toolName="Solar Panel Payback Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Solar Panel Payback Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Savings vs cost chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Cumulative Savings vs System Cost</h3>
            <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} />}>
              <SolarPaybackChart
                rows={chartRows}
                netCost={result.netCost}
                currency={currency}
                height={CHART_HEIGHT}
                ariaLabel={`Cumulative savings over ${analysisPeriod} years reach ${fmt(result.totalSavings)} against a net system cost of ${fmt(result.netCost)}; payback: ${paybackDisplay}. Year-by-year figures are in the table below.`}
              />
            </Suspense>
          </div>

          {/* Year-by-year table (the chart's text equivalent) */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Solar output and savings by year</caption>
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/60">
                    <th scope="col" className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Year</th>
                    <th scope="col" className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Output</th>
                    <th scope="col" className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Savings</th>
                    <th scope="col" className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {result.yearly
                    .filter((_, i) => i < 10 || (i + 1) % 5 === 0)
                    .map((row, i) => (
                      <tr key={row.year} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                        <th scope="row" className="py-2 px-3 text-left font-medium text-neutral-700 tabular-nums">{row.year}</th>
                        <td className="py-2 px-3 text-right text-neutral-600 tabular-nums">{formatNumber(row.generation)} kWh</td>
                        <td className="py-2 px-3 text-right text-neutral-600 tabular-nums">{fmt(row.annualSavings)}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${row.cumulativeSavings >= result.netCost ? 'text-success-600' : 'text-neutral-600'}`}>
                          {fmt(row.cumulativeSavings)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

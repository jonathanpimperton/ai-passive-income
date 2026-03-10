import { useState, useMemo, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChevronDown, RotateCcw, Sun, Zap, TrendingUp, Leaf } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { useChartTheme } from '../../lib/useChartTheme';

/* ── Defaults ─────────────────────────────────────────────── */

const DEFAULTS = {
  systemCost: 7000,
  systemSize: 4,
  includeBattery: false,
  batteryCost: 4500,
  electricityTariff: 24.5,   // pence or cents per kWh
  selfConsumption: 30,       // %
  exportTariff: 4.5,         // pence or cents per kWh
  energyInflation: 3,        // % per year
  degradation: 0.5,          // % per year
  maintenanceCost: 150,      // per year
  taxCredit: 0,
  analysisPeriod: 25,        // years
  kWhPerKwp: 900,            // annual kWh generated per kWp
};

export default function SolarPaybackCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const tariffUnit = currency === 'GBP' ? 'p' : '¢';

  const [systemCost, setSystemCost] = useState(DEFAULTS.systemCost);
  const [systemSize, setSystemSize] = useState(DEFAULTS.systemSize);
  const [includeBattery, setIncludeBattery] = useState(DEFAULTS.includeBattery);
  const [batteryCost, setBatteryCost] = useState(DEFAULTS.batteryCost);
  const [electricityTariff, setElectricityTariff] = useState(DEFAULTS.electricityTariff);
  const [selfConsumption, setSelfConsumption] = useState(DEFAULTS.selfConsumption);
  const [exportTariff, setExportTariff] = useState(DEFAULTS.exportTariff);
  const [energyInflation, setEnergyInflation] = useState(DEFAULTS.energyInflation);
  const [degradation, setDegradation] = useState(DEFAULTS.degradation);
  const [maintenanceCost, setMaintenanceCost] = useState(DEFAULTS.maintenanceCost);
  const [taxCredit, setTaxCredit] = useState(DEFAULTS.taxCredit);
  const [analysisPeriod, setAnalysisPeriod] = useState(DEFAULTS.analysisPeriod);
  const [kWhPerKwp, setKWhPerKwp] = useState(DEFAULTS.kWhPerKwp);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const ct = useChartTheme();

  const handleReset = useCallback(() => {
    setSystemCost(DEFAULTS.systemCost);
    setSystemSize(DEFAULTS.systemSize);
    setIncludeBattery(DEFAULTS.includeBattery);
    setBatteryCost(DEFAULTS.batteryCost);
    setElectricityTariff(DEFAULTS.electricityTariff);
    setSelfConsumption(DEFAULTS.selfConsumption);
    setExportTariff(DEFAULTS.exportTariff);
    setEnergyInflation(DEFAULTS.energyInflation);
    setDegradation(DEFAULTS.degradation);
    setMaintenanceCost(DEFAULTS.maintenanceCost);
    setTaxCredit(DEFAULTS.taxCredit);
    setAnalysisPeriod(DEFAULTS.analysisPeriod);
    setKWhPerKwp(DEFAULTS.kWhPerKwp);
  }, []);

  const handleBatteryToggle = useCallback(() => {
    setIncludeBattery(prev => {
      const next = !prev;
      setSelfConsumption(next ? 70 : 30);
      return next;
    });
  }, []);

  /* ── Core calculation ───────────────────────────────────── */

  const result = useMemo(() => {
    const netCost = systemCost + (includeBattery ? batteryCost : 0) - taxCredit;
    const tariffRate = electricityTariff / 100;    // convert pence → pounds
    const exportRate = exportTariff / 100;
    const selfRate = selfConsumption / 100;
    const degRate = degradation / 100;
    const inflRate = energyInflation / 100;

    let cumulative = 0;
    let paybackYear = -1;
    let paybackFraction = 0;
    let prevCumulative = 0;

    const yearly: Array<{
      year: number;
      generation: number;
      annualSavings: number;
      cumulativeSavings: number;
    }> = [];

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
  }, [
    systemCost, systemSize, includeBattery, batteryCost,
    electricityTariff, selfConsumption, exportTariff,
    energyInflation, degradation, maintenanceCost,
    taxCredit, analysisPeriod, kWhPerKwp,
  ]);

  const paybackDisplay = result.reachesPayback
    ? `${result.paybackYears} yr ${result.paybackMonths} mo`
    : `${analysisPeriod}+ years`;

  const paybackColor = result.reachesPayback && result.paybackYears < 10
    ? 'text-green-600'
    : result.reachesPayback && result.paybackYears < 15
      ? 'text-amber-600'
      : 'text-red-600';

  /* ── Chart data ─────────────────────────────────────────── */

  const chartData = useMemo(() => [
    { year: 0, savings: 0, cost: result.netCost },
    ...result.yearly.map(d => ({
      year: d.year,
      savings: d.cumulativeSavings,
      cost: result.netCost,
    })),
  ], [result]);

  /* ── Callbacks for PDF / Email ──────────────────────────── */

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'System Cost', value: fmt(systemCost) },
      { label: 'System Size', value: `${systemSize} kWp` },
      { label: 'Battery', value: includeBattery ? `Yes (${fmt(batteryCost)})` : 'No' },
      { label: 'Electricity Tariff', value: `${electricityTariff}${tariffUnit}/kWh` },
      { label: 'Self-Consumption', value: `${selfConsumption}%` },
      { label: 'Export Tariff', value: `${exportTariff}${tariffUnit}/kWh` },
    ];
    if (taxCredit > 0) inputs.push({ label: 'Tax Credit / Grant', value: fmt(taxCredit) });
    return inputs;
  }, [systemCost, systemSize, includeBattery, batteryCost, electricityTariff, selfConsumption, exportTariff, taxCredit, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Payback Period', value: paybackDisplay, highlight: true },
    { label: 'Net System Cost', value: fmt(result.netCost) },
    { label: 'Year 1 Savings', value: fmt(result.year1Savings) },
    { label: `${analysisPeriod}-Year Savings`, value: fmt(result.totalSavings) },
    { label: `${analysisPeriod}-Year ROI`, value: `${result.roi.toFixed(0)}%` },
  ], [result, currency, analysisPeriod, paybackDisplay]);

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
              hint="Total installation cost before incentives"
              id="solar-cost"
              value={systemCost}
              min={2000}
              max={50000}
              step={500}
              onChange={setSystemCost}
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
              onChange={setSystemSize}
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
              {includeBattery && (
                <p className="text-xs text-neutral-500 mt-1 ml-14">
                  Self-consumption updated to 70% (typical with battery)
                </p>
              )}
            </div>

            {includeBattery && (
              <SliderInput
                label="Battery Cost"
                hint="Installed battery storage cost"
                id="solar-battery"
                value={batteryCost}
                min={1000}
                max={20000}
                step={500}
                onChange={setBatteryCost}
                prefix={currencySymbol}
                formatDisplay={formatNumber}
              />
            )}

            <SliderInput
              label="Electricity Tariff"
              hint={currency === 'GBP' ? 'Ofgem cap ~24.5p/kWh (Q2 2026)' : 'US average ~18¢/kWh'}
              id="solar-tariff"
              value={electricityTariff}
              min={5}
              max={60}
              step={0.5}
              onChange={setElectricityTariff}
              suffix={`${tariffUnit}/kWh`}
              formatDisplay={(v) => v.toFixed(1)}
            />
            <SliderInput
              label="Self-Consumption"
              hint={includeBattery ? 'With battery: typically 60–80%' : 'Without battery: typically 25–35%'}
              id="solar-self"
              value={selfConsumption}
              min={10}
              max={100}
              step={5}
              onChange={setSelfConsumption}
              suffix="%"
              formatDisplay={(v) => v.toFixed(0)}
            />
            <SliderInput
              label="Export Tariff"
              hint={currency === 'GBP' ? 'Smart Export Guarantee: ~3–6p typical' : 'Net metering varies by state'}
              id="solar-export"
              value={exportTariff}
              min={0}
              max={30}
              step={0.5}
              onChange={setExportTariff}
              suffix={`${tariffUnit}/kWh`}
              formatDisplay={(v) => v.toFixed(1)}
            />

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
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
              <div className="space-y-5 pt-1">
                <SliderInput
                  label="Annual Generation"
                  hint="kWh per kWp installed (UK ~900, US ~1,400)"
                  id="solar-gen"
                  value={kWhPerKwp}
                  min={600}
                  max={2000}
                  step={50}
                  onChange={setKWhPerKwp}
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
                  hint="Cleaning, inspection, and minor repairs"
                  id="solar-maint"
                  value={maintenanceCost}
                  min={0}
                  max={1000}
                  step={25}
                  onChange={setMaintenanceCost}
                  prefix={currencySymbol}
                  formatDisplay={formatNumber}
                />
                <SliderInput
                  label="Tax Credit / Grant"
                  hint="Upfront incentive that reduces net cost"
                  id="solar-credit"
                  value={taxCredit}
                  min={0}
                  max={20000}
                  step={500}
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
        <div
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          aria-live="polite"
          ref={resultsRef}
        >
          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Estimated payback period</p>
            <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${paybackColor}`}>
              {paybackDisplay}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {result.reachesPayback
                ? `Your ${fmt(result.netCost)} system pays for itself, then earns ${fmt(result.totalSavings - result.netCost)} more over ${analysisPeriod} years`
                : `System does not pay for itself within ${analysisPeriod} years at current settings`}
            </p>
          </div>

          {/* Stat cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Year 1 Savings</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.year1Savings)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{analysisPeriod}-Year Savings</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.totalSavings)}</p>
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
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Leaf size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{analysisPeriod}-Year ROI</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{result.roi.toFixed(0)}%</p>
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
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: ct.axisText, fontSize: 12 }}
                    stroke={ct.axis}
                    label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: ct.axisText, fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: ct.axisText, fontSize: 12 }}
                    stroke={ct.axis}
                    tickFormatter={(v: number) => `${currencySymbol}${formatNumber(v)}`}
                  />
                  <Tooltip content={<ChartTooltip labelPrefix="Year " formatValue={fmt} />} />
                  <ReferenceLine
                    y={result.netCost}
                    stroke="#E8604C"
                    strokeDasharray="5 5"
                    label={{ value: 'System Cost', fill: '#E8604C', fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    name="Cumulative Savings"
                    fill="#0B6E6E"
                    fillOpacity={0.15}
                    stroke="#0B6E6E"
                    strokeWidth={2}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year-by-year table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200/60">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Year</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Output</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Savings</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {result.yearly
                  .filter((_, i) => i < 10 || (i + 1) % 5 === 0)
                  .map((row, i) => (
                    <tr
                      key={row.year}
                      className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                    >
                      <td className="py-2 px-3 font-medium text-neutral-700">{row.year}</td>
                      <td className="py-2 px-3 text-right text-neutral-600 tabular-nums">
                        {formatNumber(row.generation)} kWh
                      </td>
                      <td className="py-2 px-3 text-right text-neutral-600 tabular-nums">{fmt(row.annualSavings)}</td>
                      <td
                        className={`py-2 px-3 text-right tabular-nums font-medium ${
                          row.cumulativeSavings >= result.netCost ? 'text-green-600' : 'text-neutral-600'
                        }`}
                      >
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
  );
}

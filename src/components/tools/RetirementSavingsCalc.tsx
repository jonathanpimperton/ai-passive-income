import { useState, useMemo, useCallback, useRef } from 'react';
import {
  compoundInterest,
  compoundInterestSchedule,
  formatCurrency,
  formatNumber,
} from '../../lib/calculator-utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { RotateCcw, PiggyBank, Calendar, Wallet, Sparkles } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useChartTheme } from '../../lib/useChartTheme';
import ResultAffiliate from '../ui/ResultAffiliate';

/* ── Types ─────────────────────────────────────────────────── */
interface ChartDataPoint {
  age: number;
  year: number;
  'Nominal Balance': number;
  'Inflation-Adjusted': number;
  Contributions: number;
}

/* ── Milestone Markers ─────────────────────────────────────── */
const MILESTONES = [
  { age: 50, label: 'Catch-up eligible' },
  { age: 59.5, label: '401(k) penalty-free' },
  { age: 62, label: 'Early Social Security' },
  { age: 67, label: 'Full Social Security' },
] as const;

/* ── Defaults ──────────────────────────────────────────────── */
const DEFAULTS = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 50000,
  monthlyContribution: 500,
  annualReturn: 7,
  inflationRate: 3,
};

/* ── Main Calculator ───────────────────────────────────────── */
export default function RetirementSavingsCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [retirementAge, setRetirementAge] = useState(DEFAULTS.retirementAge);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULTS.monthlyContribution);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);
  const ct = useChartTheme();

  /* ── Derived values ──────────────────────────────────────── */
  const rateDecimal = annualReturn / 100;
  const inflationDecimal = inflationRate / 100;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  /* ── Core calculations ───────────────────────────────────── */
  const results = useMemo(() => {
    const nominal = compoundInterest(currentSavings, monthlyContribution, rateDecimal, yearsToRetirement, 12);
    const real = nominal / Math.pow(1 + inflationDecimal, yearsToRetirement);
    const totalContributions = currentSavings + monthlyContribution * 12 * yearsToRetirement;
    const totalInterest = nominal - totalContributions;
    return {
      nominal,
      real,
      totalContributions,
      totalInterest,
      contextLine: `By age ${retirementAge}, saving ${fmt(monthlyContribution)}/mo at ${annualReturn}% return`,
    };
  }, [currentAge, retirementAge, currentSavings, monthlyContribution, rateDecimal, inflationDecimal, yearsToRetirement, annualReturn, currency]);

  /* ── Chart data ──────────────────────────────────────────── */
  const chartData = useMemo(() => {
    if (yearsToRetirement <= 0) return [];

    const schedule = compoundInterestSchedule(
      currentSavings,
      monthlyContribution,
      rateDecimal,
      yearsToRetirement,
      12
    );

    return schedule.map((row): ChartDataPoint => {
      const age = currentAge + row.year;
      const inflationFactor = Math.pow(1 + inflationDecimal, row.year);
      return {
        age,
        year: row.year,
        'Nominal Balance': Math.round(row.balance),
        'Inflation-Adjusted': Math.round(row.balance / inflationFactor),
        Contributions: Math.round(row.totalContributions),
      };
    });
  }, [currentAge, currentSavings, monthlyContribution, yearsToRetirement, rateDecimal, inflationDecimal]);

  /* ── Milestone filtering ─────────────────────────────────── */
  const visibleMilestones = useMemo(() => {
    const maxAge = currentAge + yearsToRetirement;
    return MILESTONES.filter((m) => m.age > currentAge && m.age <= maxAge);
  }, [currentAge, yearsToRetirement]);

  /* ── PDF Export ──────────────────────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Current Age', value: `${currentAge} years` },
    { label: 'Retirement Age', value: `${retirementAge} years` },
    { label: 'Current Savings', value: fmt(currentSavings) },
    { label: 'Monthly Contribution', value: fmt(monthlyContribution) },
    { label: 'Expected Annual Return', value: `${annualReturn}%` },
    { label: 'Expected Inflation Rate', value: `${inflationRate}%` },
  ], [currentAge, retirementAge, currentSavings, monthlyContribution, annualReturn, inflationRate, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Estimated Retirement Balance', value: fmt(results.nominal), highlight: true },
    { label: 'Inflation-Adjusted Value', value: fmt(results.real) },
    { label: 'Total Contributions', value: fmt(results.totalContributions) },
    { label: 'Total Interest Earned', value: fmt(results.totalInterest) },
  ], [results, currency]);

  /* ── Reset ───────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setCurrentAge(DEFAULTS.currentAge);
    setRetirementAge(DEFAULTS.retirementAge);
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyContribution(DEFAULTS.monthlyContribution);
    setAnnualReturn(DEFAULTS.annualReturn);
    setInflationRate(DEFAULTS.inflationRate);
  }, []);

  const animatedNominal = useAnimatedNumber(results.nominal);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ──────────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Inputs</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            How much will I have when I retire?
          </p>

          <div className="space-y-5">
            <SliderInput
              label="Current Age"
              id="ret-current-age"
              value={currentAge}
              min={18}
              max={80}
              step={1}
              onChange={(v) => {
                setCurrentAge(v);
                if (retirementAge <= v) setRetirementAge(Math.min(90, v + 1));
              }}
              suffix="yrs"
            />

            <SliderInput
              label="Retirement Age"
              id="ret-retirement-age"
              value={retirementAge}
              min={currentAge + 1}
              max={90}
              step={1}
              onChange={setRetirementAge}
              suffix="yrs"
            />

            <SliderInput
              label="Current Savings"
              hint="Total saved for retirement so far (401k, IRA, etc.)"
              id="ret-current-savings"
              value={currentSavings}
              min={0}
              max={500000}
              step={1000}
              textMax={10000000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}500K`}
              onChange={setCurrentSavings}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />

            <SliderInput
              label="Monthly Contribution"
              hint="Amount you'll save each month toward retirement"
              id="ret-monthly"
              value={monthlyContribution}
              min={0}
              max={5000}
              step={25}
              textMax={50000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}5K`}
              onChange={setMonthlyContribution}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />

            <SliderInput
              label="Expected Annual Return"
              hint="Stock/bond portfolio average: ~6-8% is typical"
              id="ret-return"
              value={annualReturn}
              min={0}
              max={25}
              step={0.1}
              onChange={setAnnualReturn}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />

            <SliderInput
              label="Expected Inflation Rate"
              hint="How fast prices rise — ~3% is the US long-term average"
              id="ret-inflation"
              value={inflationRate}
              min={0}
              max={10}
              step={0.1}
              onChange={setInflationRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />
          </div>
        </div>

        {/* ── Results Panel ─────────────────────────────────── */}
        <div
          ref={resultsRef}
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          aria-live="polite"
          id="retirement-results"
        >
          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Estimated Retirement Balance</p>
            <p data-headline-result data-headline-label="Estimated Retirement Balance" className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {formatCurrency(animatedNominal, currency)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {results.contextLine}
            </p>
          </div>

          {/* Breakdown Cards */}
          <div data-pdf-section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <PiggyBank size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Nominal Balance</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {fmt(results.nominal)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Today&apos;s Dollars</p>
                <p className="text-lg font-semibold text-primary-600 tabular-nums">
                  {fmt(results.real)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {fmt(results.totalContributions)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums">
                  {fmt(results.totalInterest)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="retirement-savings" toolName="Retirement Savings Calculator" />
            <EmailResultsButton toolSlug="retirement-savings" toolName="Retirement Savings Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Retirement Savings Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Inflation Impact Note */}
          {inflationRate > 0 && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Inflation impact:</span>{' '}
                Your {fmt(results.nominal)} will have the purchasing power of{' '}
                <span className="font-semibold tabular-nums">{fmt(results.real)}</span>{' '}
                in today&apos;s dollars, assuming {inflationRate}% annual inflation over {yearsToRetirement} years.
              </p>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Retirement Savings Projection
              </h3>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid stroke={ct.grid} vertical={false} />
                    <XAxis
                      dataKey="age"
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={{ stroke: ct.axis }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                      label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
                    />
                    <YAxis
                      tickFormatter={(v: number) => { const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'; return `${s}${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`; }}
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip labelPrefix="Age" formatValue={fmt} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />

                    {/* Milestone reference lines */}
                    {visibleMilestones.map((m) => (
                      <ReferenceLine
                        key={m.age}
                        x={m.age}
                        stroke={ct.axisText}
                        strokeWidth={1}
                        label={{
                          value: m.label,
                          position: 'top',
                          fontSize: 10,
                          fill: ct.axisText,
                        }}
                      />
                    ))}

                    <Area
                      type="monotone"
                      dataKey="Nominal Balance"
                      stroke={ct.series1}
                      strokeWidth={2}
                      fill={ct.series1Fill}
                      animationDuration={600}
                    />
                    <Area
                      type="monotone"
                      dataKey="Inflation-Adjusted"
                      stroke={ct.segments[2]}
                      strokeWidth={2}
                      fill="none"
                      animationDuration={600}
                    />
                    <Area
                      type="monotone"
                      dataKey="Contributions"
                      stroke={ct.series2}
                      strokeWidth={2}
                      fill={ct.series2Fill}
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Year-by-Year Snapshot */}
          {chartData.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
              <h3 className="text-sm font-medium text-neutral-700 p-4 pb-0 mb-3">
                Projection Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Age</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Nominal</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">
                        Today&apos;s Dollars
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">
                        Contributions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData
                      .filter((_, i) => {
                        if (i === chartData.length - 1) return true;
                        if (i === 0) return false;
                        return i % 5 === 0;
                      })
                      .map((row, i) => (
                        <tr
                          key={row.age}
                          className={`border-b border-neutral-100 transition-colors duration-150
                            ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                        >
                          <td className="py-2.5 px-4 font-medium text-neutral-900 tabular-nums">
                            {row.age}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">
                            {fmt(row['Nominal Balance'])}
                          </td>
                          <td className="py-2.5 px-4 text-right text-primary-600 tabular-nums hidden sm:table-cell">
                            {fmt(row['Inflation-Adjusted'])}
                          </td>
                          <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">
                            {fmt(row.Contributions)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ResultAffiliate toolSlug="retirement-savings" />
        </div>
      </div>
    </div>
  );
}

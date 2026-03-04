import { useState, useMemo, useCallback, useRef } from 'react';
import {
  compoundInterest,
  compoundInterestSchedule,
  solveForContribution,
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

/* ── Types ─────────────────────────────────────────────────── */
type SolveMode = 'balance' | 'contribution' | 'retirement-age';

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

/* ── Tab Configuration ─────────────────────────────────────── */
const TABS: { mode: SolveMode; label: string; description: string }[] = [
  { mode: 'balance', label: 'Retirement Balance', description: 'How much will I have at retirement?' },
  { mode: 'contribution', label: 'Monthly Savings', description: 'How much should I save each month?' },
  { mode: 'retirement-age', label: 'Retirement Age', description: 'When can I afford to retire?' },
];

/* ── Defaults ──────────────────────────────────────────────── */
const DEFAULTS = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 50000,
  monthlyContribution: 500,
  annualReturn: 7,
  inflationRate: 3,
  targetBalance: 1000000,
};

/* ── Solve for retirement age (binary search) ──────────────── */
function solveForRetirementAge(
  currentAge: number,
  currentSavings: number,
  monthlyContribution: number,
  annualRate: number,
  targetBalance: number,
  maxAge: number = 90
): number {
  // If they can already meet the target with 0 years, return current age
  if (currentSavings >= targetBalance) return currentAge;

  let low = 0;
  let high = maxAge - currentAge;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const result = compoundInterest(currentSavings, monthlyContribution, annualRate, mid, 12);
    if (Math.abs(result - targetBalance) < Math.max(1, targetBalance * 0.001)) break;
    if (result < targetBalance) low = mid;
    else high = mid;
  }

  const years = (low + high) / 2;
  return Math.min(maxAge, Math.round((currentAge + years) * 10) / 10);
}

/* ── Main Calculator ───────────────────────────────────────── */
export default function RetirementSavingsCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const [mode, setMode] = useState<SolveMode>('balance');
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [retirementAge, setRetirementAge] = useState(DEFAULTS.retirementAge);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULTS.monthlyContribution);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);
  const [targetBalance, setTargetBalance] = useState(DEFAULTS.targetBalance);
  const ct = useChartTheme();

  /* ── Derived values ──────────────────────────────────────── */
  const rateDecimal = annualReturn / 100;
  const inflationDecimal = inflationRate / 100;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  /* ── Core calculations ───────────────────────────────────── */
  const results = useMemo(() => {
    switch (mode) {
      case 'balance': {
        const nominal = compoundInterest(currentSavings, monthlyContribution, rateDecimal, yearsToRetirement, 12);
        const real = nominal / Math.pow(1 + inflationDecimal, yearsToRetirement);
        const totalContributions = currentSavings + monthlyContribution * 12 * yearsToRetirement;
        const totalInterest = nominal - totalContributions;
        return {
          primaryLabel: 'Estimated Retirement Balance',
          primaryValue: nominal,
          realValue: real,
          totalContributions,
          totalInterest,
          contextLine: `By age ${retirementAge}, saving ${fmt(monthlyContribution)}/mo at ${annualReturn}% return`,
          solvedMonthly: monthlyContribution,
          solvedAge: retirementAge,
          solvedYears: yearsToRetirement,
        };
      }
      case 'contribution': {
        const required = solveForContribution(currentSavings, targetBalance, rateDecimal, yearsToRetirement, 12);
        const monthly = Math.max(0, required);
        const nominal = targetBalance;
        const real = nominal / Math.pow(1 + inflationDecimal, yearsToRetirement);
        const totalContributions = currentSavings + monthly * 12 * yearsToRetirement;
        const totalInterest = nominal - totalContributions;
        return {
          primaryLabel: 'Required Monthly Savings',
          primaryValue: monthly,
          realValue: real,
          totalContributions,
          totalInterest,
          contextLine: `To reach ${fmt(targetBalance)} by age ${retirementAge} at ${annualReturn}% return`,
          solvedMonthly: monthly,
          solvedAge: retirementAge,
          solvedYears: yearsToRetirement,
        };
      }
      case 'retirement-age': {
        const age = solveForRetirementAge(currentAge, currentSavings, monthlyContribution, rateDecimal, targetBalance);
        const roundedAge = Math.round(age);
        const years = Math.max(0, roundedAge - currentAge);
        const nominal = compoundInterest(currentSavings, monthlyContribution, rateDecimal, years, 12);
        const real = nominal / Math.pow(1 + inflationDecimal, years);
        const totalContributions = currentSavings + monthlyContribution * 12 * years;
        const totalInterest = nominal - totalContributions;
        return {
          primaryLabel: 'Estimated Retirement Age',
          primaryValue: roundedAge,
          realValue: real,
          totalContributions,
          totalInterest,
          contextLine: `Saving ${fmt(monthlyContribution)}/mo to reach ${fmt(targetBalance)} at ${annualReturn}% return`,
          solvedMonthly: monthlyContribution,
          solvedAge: roundedAge,
          solvedYears: years,
        };
      }
    }
  }, [mode, currentAge, retirementAge, currentSavings, monthlyContribution, rateDecimal, inflationDecimal, yearsToRetirement, targetBalance, annualReturn]);

  /* ── Chart data ──────────────────────────────────────────── */
  const chartData = useMemo(() => {
    const years = Math.ceil(results.solvedYears);
    if (years <= 0) return [];

    const schedule = compoundInterestSchedule(
      currentSavings,
      results.solvedMonthly,
      rateDecimal,
      years,
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
  }, [currentAge, currentSavings, results.solvedMonthly, results.solvedYears, rateDecimal, inflationDecimal]);

  /* ── Milestone filtering ─────────────────────────────────── */
  const visibleMilestones = useMemo(() => {
    const maxAge = currentAge + Math.ceil(results.solvedYears);
    return MILESTONES.filter((m) => m.age > currentAge && m.age <= maxAge);
  }, [currentAge, results.solvedYears]);

  /* ── PDF Export ──────────────────────────────────────────── */
  const getInputs = useCallback(() => {
    const modeLabel = TABS.find((t) => t.mode === mode)?.label ?? mode;
    const inputs: { label: string; value: string }[] = [
      { label: 'Solve For', value: modeLabel },
      { label: 'Current Age', value: `${currentAge} years` },
    ];
    if (mode !== 'retirement-age') {
      inputs.push({ label: 'Retirement Age', value: `${retirementAge} years` });
    }
    inputs.push({ label: 'Current Savings', value: fmt(currentSavings) });
    if (mode !== 'contribution') {
      inputs.push({ label: 'Monthly Contribution', value: fmt(monthlyContribution) });
    }
    if (mode === 'contribution' || mode === 'retirement-age') {
      inputs.push({ label: 'Target Balance', value: fmt(targetBalance) });
    }
    inputs.push({ label: 'Expected Annual Return', value: `${annualReturn}%` });
    inputs.push({ label: 'Expected Inflation Rate', value: `${inflationRate}%` });
    return inputs;
  }, [mode, currentAge, retirementAge, currentSavings, monthlyContribution, targetBalance, annualReturn, inflationRate, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const primary = mode === 'retirement-age'
      ? `Age ${Math.round(results.primaryValue)}`
      : fmt(results.primaryValue);
    return [
      { label: results.primaryLabel, value: primary, highlight: true },
      { label: 'Inflation-Adjusted Value', value: fmt(results.realValue) },
      { label: 'Total Contributions', value: fmt(results.totalContributions) },
      { label: 'Total Interest', value: fmt(results.totalInterest) },
    ];
  }, [mode, results, currency]);

  /* ── Reset ───────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setCurrentAge(DEFAULTS.currentAge);
    setRetirementAge(DEFAULTS.retirementAge);
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyContribution(DEFAULTS.monthlyContribution);
    setAnnualReturn(DEFAULTS.annualReturn);
    setInflationRate(DEFAULTS.inflationRate);
    setTargetBalance(DEFAULTS.targetBalance);
  }, []);

  /* ── Format helper for primary result ────────────────────── */
  const animatedPrimaryValue = useAnimatedNumber(results.primaryValue);
  const formattedPrimary = mode === 'retirement-age'
    ? `Age ${Math.round(animatedPrimaryValue)}`
    : formatCurrency(animatedPrimaryValue, currency);

  const formattedPrimarySubtext = mode === 'retirement-age'
    ? `(${Math.round(results.solvedYears)} years from now)`
    : mode === 'contribution'
      ? '/month'
      : '';

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>
      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <div className="flex overflow-x-auto border-b border-neutral-200/80 scrollbar-hide" role="tablist" aria-label="Retirement calculation mode">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setMode(tab.mode)}
            className={`flex-1 min-w-[140px] px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all duration-150
              ${
                mode === tab.mode
                  ? 'bg-white border-b-2 border-primary-500 text-primary-900'
                  : 'bg-neutral-50 text-neutral-600 hover:text-primary-600 border-b-2 border-transparent'
              }`}
            role="tab"
            aria-selected={mode === tab.mode}
            aria-controls="retirement-results"
          >
            {tab.label}
          </button>
        ))}
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
            {TABS.find((t) => t.mode === mode)?.description}
          </p>

          <div className="space-y-5">
            {/* Current Age — always an input */}
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

            {/* Retirement Age — input except in 'retirement-age' mode */}
            {mode !== 'retirement-age' && (
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
            )}

            {/* Current Savings — always an input */}
            <SliderInput
              label="Current Savings"
              hint="Total saved for retirement so far (401k, IRA, etc.)"
              id="ret-current-savings"
              value={currentSavings}
              min={0}
              max={10000000}
              step={5000}
              onChange={setCurrentSavings}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />

            {/* Monthly Contribution — input except in 'contribution' mode */}
            {mode !== 'contribution' && (
              <SliderInput
                label="Monthly Contribution"
                hint="Amount you'll save each month toward retirement"
                id="ret-monthly"
                value={monthlyContribution}
                min={0}
                max={50000}
                step={100}
                onChange={setMonthlyContribution}
                prefix={currencySymbol}
                formatDisplay={(v) => formatNumber(v)}
              />
            )}

            {/* Target Balance — input for 'contribution' and 'retirement-age' modes */}
            {(mode === 'contribution' || mode === 'retirement-age') && (
              <SliderInput
                label="Target Retirement Balance"
                hint="How much you want saved by retirement — in today's dollars"
                id="ret-target"
                value={targetBalance}
                min={50000}
                max={50000000}
                step={25000}
                onChange={setTargetBalance}
                prefix={currencySymbol}
                formatDisplay={(v) => formatNumber(v)}
              />
            )}

            {/* Annual Return Rate — always an input */}
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

            {/* Inflation Rate — always an input */}
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
          role="tabpanel"
        >
          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{results.primaryLabel}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                {formattedPrimary}
              </p>
              {formattedPrimarySubtext && (
                <span className="text-lg text-neutral-500 font-medium">{formattedPrimarySubtext}</span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {results.contextLine}
            </p>
          </div>

          {/* Breakdown Cards */}
          <div data-pdf-section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {mode === 'balance' && (
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <PiggyBank size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Nominal Balance</p>
                  <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                    {fmt(results.primaryValue)}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">
                  {mode === 'balance' ? "Today's Dollars" : 'Inflation-Adjusted'}
                </p>
                <p className="text-lg font-semibold text-amber-600 tabular-nums">
                  {fmt(results.realValue)}
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
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
                <p className="text-lg font-semibold text-accent-600 tabular-nums">
                  {fmt(results.totalInterest)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <ShareButton toolSlug="retirement-savings" toolName="Retirement Savings Calculator" />
            <div className="flex flex-wrap gap-2">
              <EmailResultsButton toolSlug="retirement-savings" toolName="Retirement Savings Calculator" getInputs={getInputs} getResults={getResults} />
              <ExportPdfButton toolName="Retirement Savings Calculator" getInputs={getInputs} resultsRef={resultsRef} />
            </div>
          </div>

          {/* Inflation Impact Note */}
          {inflationRate > 0 && mode === 'balance' && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Inflation impact:</span>{' '}
                Your {fmt(results.primaryValue)} will have the purchasing power of{' '}
                <span className="font-semibold tabular-nums">{fmt(results.realValue)}</span>{' '}
                in today&apos;s dollars, assuming {inflationRate}% annual inflation over {Math.round(results.solvedYears)} years.
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
                    <defs>
                      <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B6E6E" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0B6E6E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22A06B" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22A06B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis
                      dataKey="age"
                      tick={{ fontSize: 12, fill: ct.axisText }}
                      tickLine={false}
                      axisLine={{ stroke: ct.axis }}
                      label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9CA3AF' }}
                    />
                    <YAxis
                      tickFormatter={(v: number) => { const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'; return `${s}${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`; }}
                      tick={{ fontSize: 12, fill: ct.axisText }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip labelPrefix="Age" formatValue={fmt} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />

                    {/* Milestone reference lines */}
                    {visibleMilestones.map((m) => (
                      <ReferenceLine
                        key={m.age}
                        x={m.age}
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{
                          value: m.label,
                          position: 'top',
                          fontSize: 10,
                          fill: '#64748B',
                        }}
                      />
                    ))}

                    <Area
                      type="monotone"
                      dataKey="Nominal Balance"
                      stroke="#0B6E6E"
                      strokeWidth={2}
                      fill="url(#colorNominal)"
                      animationDuration={600}
                    />
                    <Area
                      type="monotone"
                      dataKey="Inflation-Adjusted"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fill="url(#colorReal)"
                      animationDuration={600}
                    />
                    <Area
                      type="monotone"
                      dataKey="Contributions"
                      stroke="#22A06B"
                      strokeWidth={2}
                      fill="url(#colorContrib)"
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
                        // Show every 5 years plus the last row
                        if (i === chartData.length - 1) return true;
                        if (i === 0) return false; // skip year 0
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
                          <td className="py-2.5 px-4 text-right text-amber-600 tabular-nums hidden sm:table-cell">
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
        </div>
      </div>
    </div>
  );
}

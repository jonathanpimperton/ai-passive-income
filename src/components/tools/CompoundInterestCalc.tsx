import { useState, useMemo, useCallback, useRef, Fragment } from 'react';
import {
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
} from 'recharts';
import { ChevronDown, RotateCcw, Wallet, Sparkles } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

/* ── Compounding frequency options ────────────────────────── */
const COMPOUND_OPTIONS = [
  { label: 'Annually', value: 1 },
  { label: 'Semi-annually', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
  { label: 'Daily', value: 365 },
] as const;

const TIMING_OPTIONS = [
  { label: 'End of period', value: 'end' },
  { label: 'Beginning of period', value: 'beginning' },
] as const;

/* ── Collapsible year row ─────────────────────────────────── */
interface YearRowData {
  year: number;
  balance: number;
  totalContributions: number;
  totalInterest: number;
  yearContributions: number;
  yearInterest: number;
}

function ScheduleTable({ data, cc }: { data: YearRowData[]; cc: string }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmt = (v: number) => formatCurrency(v, cc);

  if (data.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600">Balance</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Contributions</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Interest</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const isExpanded = expandedYear === row.year;
            return (
              <Fragment key={row.year}>
                <tr
                  className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150
                    ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                    ${isExpanded ? 'bg-primary-50/50' : 'hover:bg-primary-50/30'}`}
                  onClick={() => setExpandedYear(isExpanded ? null : row.year)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedYear(isExpanded ? null : row.year); }}}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <td className="py-2.5 px-4 text-neutral-900 font-medium tabular-nums">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown
                        size={14}
                        className={`text-neutral-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                      {row.year}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">
                    {fmt(row.balance)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">
                    {fmt(row.totalContributions)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-accent-600 tabular-nums hidden sm:table-cell">
                    {fmt(row.totalInterest)}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-primary-50/30 border-b border-primary-100/50">
                    <td colSpan={4} className="py-3 px-4 pl-10">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-neutral-500 mb-0.5">Starting Balance</p>
                          <p className="font-semibold text-neutral-900 tabular-nums">
                            {fmt(row.balance - row.yearContributions - row.yearInterest)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Year Contributions</p>
                          <p className="font-semibold text-neutral-900 tabular-nums">
                            +{fmt(row.yearContributions)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Year Interest</p>
                          <p className="font-semibold text-accent-600 tabular-nums">
                            +{fmt(row.yearInterest)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Ending Balance</p>
                          <p className="font-semibold text-primary-700 tabular-nums">
                            {fmt(row.balance)}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main Calculator ──────────────────────────────────────── */
const DEFAULTS = {
  principal: 10000,
  monthlyContribution: 200,
  annualRate: 7,
  years: 20,
  compoundingFrequency: 12,
  contributionTiming: 'end' as 'end' | 'beginning',
};

export default function CompoundInterestCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [monthly, setMonthly] = useState(DEFAULTS.monthlyContribution);
  const [rate, setRate] = useState(DEFAULTS.annualRate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [frequency, setFrequency] = useState(DEFAULTS.compoundingFrequency);
  const [timing, setTiming] = useState(DEFAULTS.contributionTiming);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fmt = (v: number) => formatCurrency(v, currency);

  const schedule = useMemo(
    () => compoundInterestSchedule(principal, monthly, rate / 100, years, frequency, timing as 'end' | 'beginning'),
    [principal, monthly, rate, years, frequency, timing]
  );

  const finalBalance = schedule[schedule.length - 1]?.balance ?? 0;
  const totalContributions = principal + monthly * 12 * years;
  const totalInterest = finalBalance - totalContributions;

  const chartData = useMemo(
    () =>
      schedule.map((row) => ({
        year: row.year,
        'Total Balance': row.balance,
        Contributions: row.totalContributions,
        Interest: row.totalInterest,
      })),
    [schedule]
  );

  const yearTableData: YearRowData[] = useMemo(() => {
    return schedule.slice(1).map((row, i) => {
      const prev = schedule[i]; // i maps to previous year since we sliced
      return {
        year: row.year,
        balance: row.balance,
        totalContributions: row.totalContributions,
        totalInterest: row.totalInterest,
        yearContributions: row.totalContributions - prev.totalContributions,
        yearInterest: row.totalInterest - prev.totalInterest,
      };
    });
  }, [schedule]);

  const getInputs = useCallback(() => {
    const freqLabel = COMPOUND_OPTIONS.find((o) => o.value === frequency)?.label ?? `${frequency}x/yr`;
    const timingLabel = TIMING_OPTIONS.find((o) => o.value === timing)?.label ?? timing;
    return [
      { label: 'Starting Amount', value: fmt(principal) },
      { label: 'Monthly Contribution', value: fmt(monthly) },
      { label: 'Annual Growth Rate', value: `${rate}%` },
      { label: 'Time Period', value: `${years} year${years !== 1 ? 's' : ''}` },
      { label: 'Compounding Frequency', value: freqLabel },
      { label: 'Contribution Timing', value: timingLabel },
    ];
  }, [principal, monthly, rate, years, frequency, timing, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Final Balance', value: fmt(finalBalance), highlight: true },
    { label: 'Total Contributions', value: fmt(totalContributions) },
    { label: 'Interest Earned', value: fmt(totalInterest) },
  ], [finalBalance, totalContributions, totalInterest, currency]);

  const handleReset = useCallback(() => {
    setPrincipal(DEFAULTS.principal);
    setMonthly(DEFAULTS.monthlyContribution);
    setRate(DEFAULTS.annualRate);
    setYears(DEFAULTS.years);
    setFrequency(DEFAULTS.compoundingFrequency);
    setTiming(DEFAULTS.contributionTiming);
  }, []);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ────────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Inputs</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <SliderInput
              label="Starting Amount"
              hint="Amount you're starting with today"
              id="ci-principal"
              value={principal}
              min={0}
              max={10000000}
              step={5000}
              onChange={setPrincipal}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Monthly Contribution"
              hint="Amount you'll add each month"
              id="ci-monthly"
              value={monthly}
              min={0}
              max={50000}
              step={100}
              onChange={setMonthly}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Annual Growth Rate"
              hint="~4-5% for savings accounts, ~7-10% for stock market index funds"
              id="ci-rate"
              value={rate}
              min={0}
              max={25}
              step={0.1}
              onChange={setRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />
            <SliderInput
              label="Time Period (Years)"
              hint="How long you'll let it grow"
              id="ci-years"
              value={years}
              min={1}
              max={100}
              step={1}
              onChange={setYears}
            />
          </div>

          {/* ── Advanced Settings ─────────────────────── */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-expanded={showAdvanced}
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              Advanced settings
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ${
                showAdvanced ? 'max-h-60 opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="ci-frequency" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Compounding Frequency
                  </label>
                  <select
                    id="ci-frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                    className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                  >
                    {COMPOUND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ci-timing" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Contribution Timing
                  </label>
                  <select
                    id="ci-timing"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                  >
                    {TIMING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Results Panel ───────────────────────────── */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite">
          {/* Big Number — gradient text + count-up animation */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Final Balance</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {fmt(useAnimatedNumber(finalBalance))}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              After {years} year{years !== 1 ? 's' : ''} of compounding at {rate}% annually
            </p>
          </div>

          {/* Breakdown — with icons */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {fmt(totalContributions)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
                <p className="text-lg font-semibold text-accent-600 tabular-nums">
                  {fmt(totalInterest)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <ShareButton toolSlug="compound-interest" toolName="Compound Interest Calculator" />
            <div className="flex flex-wrap gap-2">
              <EmailResultsButton toolSlug="compound-interest" toolName="Compound Interest Calculator" getInputs={getInputs} getResults={getResults} />
              <ExportPdfButton toolName="Compound Interest Calculator" getInputs={getInputs} resultsRef={resultsRef} />
            </div>
          </div>

          {/* Chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Growth Over Time</h3>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B6E6E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0B6E6E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22A06B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22A06B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => { const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'; return `${s}${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`; }}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip formatValue={fmt} />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="Total Balance"
                    stroke="#0B6E6E"
                    strokeWidth={2}
                    fill="url(#colorBalance)"
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

          {/* Schedule Table */}
          <div data-pdf-section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Year-by-Year Breakdown</h3>
            <ScheduleTable data={yearTableData} cc={currency} />
          </div>
        </div>
      </div>
    </div>
  );
}

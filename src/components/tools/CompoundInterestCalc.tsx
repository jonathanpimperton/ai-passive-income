import { useState, useMemo, useCallback } from 'react';
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
import { ChevronDown, RotateCcw } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';

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

function ScheduleTable({ data }: { data: YearRowData[] }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

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
          {data.map((row, i) => (
            <tr
              key={row.year}
              className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150
                ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                ${expandedYear === row.year ? 'bg-primary-50/50' : 'hover:bg-primary-50/30'}`}
              onClick={() => setExpandedYear(expandedYear === row.year ? null : row.year)}
              aria-expanded={expandedYear === row.year}
            >
              <td className="py-2.5 px-4 text-neutral-900 font-medium tabular-nums">
                <span className="flex items-center gap-1.5">
                  <ChevronDown
                    size={14}
                    className={`text-neutral-400 transition-transform duration-200 ${
                      expandedYear === row.year ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                  {row.year}
                </span>
              </td>
              <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">
                {formatCurrency(row.balance)}
              </td>
              <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">
                {formatCurrency(row.totalContributions)}
              </td>
              <td className="py-2.5 px-4 text-right text-accent-600 tabular-nums hidden sm:table-cell">
                {formatCurrency(row.totalInterest)}
              </td>
            </tr>
          ))}
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
  contributionTiming: 'end' as string,
};

export default function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [monthly, setMonthly] = useState(DEFAULTS.monthlyContribution);
  const [rate, setRate] = useState(DEFAULTS.annualRate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [frequency, setFrequency] = useState(DEFAULTS.compoundingFrequency);
  const [timing, setTiming] = useState(DEFAULTS.contributionTiming);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const schedule = useMemo(
    () => compoundInterestSchedule(principal, monthly, rate / 100, years, frequency),
    [principal, monthly, rate, years, frequency]
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

  const handleReset = useCallback(() => {
    setPrincipal(DEFAULTS.principal);
    setMonthly(DEFAULTS.monthlyContribution);
    setRate(DEFAULTS.annualRate);
    setYears(DEFAULTS.years);
    setFrequency(DEFAULTS.compoundingFrequency);
    setTiming(DEFAULTS.contributionTiming);
  }, []);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ────────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Inputs</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-500 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-5">
            <SliderInput
              label="Starting Amount"
              id="ci-principal"
              value={principal}
              min={0}
              max={1000000}
              step={1000}
              onChange={setPrincipal}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Monthly Contribution"
              id="ci-monthly"
              value={monthly}
              min={0}
              max={10000}
              step={50}
              onChange={setMonthly}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Annual Interest Rate"
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
              id="ci-years"
              value={years}
              min={1}
              max={50}
              step={1}
              onChange={setYears}
            />
          </div>

          {/* ── Advanced Settings ─────────────────────── */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-500 transition-colors duration-150"
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
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          {/* Big Number */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Final Balance</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary-900 tabular-nums">
              {formatCurrency(finalBalance)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              After {years} year{years !== 1 ? 's' : ''} of compounding at {rate}% annually
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                {formatCurrency(totalContributions)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
              <p className="text-lg font-semibold text-accent-600 tabular-nums">
                {formatCurrency(totalInterest)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Growth Over Time</h3>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                    tickFormatter={(v: number) => `$${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="Total Balance"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#colorBalance)"
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="Contributions"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#colorContrib)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Schedule Table */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Year-by-Year Breakdown</h3>
            <ScheduleTable data={yearTableData} />
          </div>
        </div>
      </div>
    </div>
  );
}

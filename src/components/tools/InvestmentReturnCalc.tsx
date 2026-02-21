import { useState, useMemo, useCallback } from 'react';
import {
  compoundInterest,
  compoundInterestSchedule,
  solveForContribution,
  solveForRate,
  solveForTime,
  solveForPrincipal,
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

/* ── Solve-for-X tab definitions ─────────────────────────── */
type SolveMode = 'endAmount' | 'contribution' | 'returnRate' | 'startingAmount' | 'time';

const TABS: { key: SolveMode; label: string }[] = [
  { key: 'endAmount', label: 'End Amount' },
  { key: 'contribution', label: 'Contribution' },
  { key: 'returnRate', label: 'Return Rate' },
  { key: 'startingAmount', label: 'Starting Amount' },
  { key: 'time', label: 'Time' },
];

/* ── SliderInput ─────────────────────────────────────────── */
interface SliderInputProps {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  formatDisplay?: (v: number) => string;
}

function SliderInput({
  label,
  id,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
  formatDisplay,
}: SliderInputProps) {
  const displayValue = formatDisplay ? formatDisplay(value) : String(value);

  const handleText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleText}
          className={`w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
            ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 mt-2.5 rounded-full appearance-none cursor-pointer
          bg-neutral-200 accent-primary-500
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        aria-label={`${label} slider`}
      />
    </div>
  );
}

/* ── Chart tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-neutral-900 mb-1">Year {label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Compounding frequency options ────────────────────────── */
const COMPOUND_OPTIONS = [
  { label: 'Annually', value: 1 },
  { label: 'Semi-annually', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
  { label: 'Daily', value: 365 },
] as const;

/* ── Defaults ─────────────────────────────────────────────── */
const DEFAULTS = {
  principal: 10000,
  monthly: 200,
  rate: 7,
  years: 20,
  target: 100000,
  frequency: 12,
};

/* ── Main Calculator ──────────────────────────────────────── */
export default function InvestmentReturnCalc() {
  const [mode, setMode] = useState<SolveMode>('endAmount');
  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [monthly, setMonthly] = useState(DEFAULTS.monthly);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [target, setTarget] = useState(DEFAULTS.target);
  const [frequency, setFrequency] = useState(DEFAULTS.frequency);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Solve based on active tab ──────────────────────────── */
  const result = useMemo(() => {
    try {
      switch (mode) {
        case 'endAmount': {
          const endAmount = compoundInterest(principal, monthly, rate / 100, years, frequency);
          return {
            label: 'End Amount',
            value: endAmount,
            formatted: formatCurrency(endAmount),
            context: `After investing ${formatCurrency(monthly)}/mo for ${years} year${years !== 1 ? 's' : ''} at ${rate}% return`,
            chartYears: years,
          };
        }
        case 'contribution': {
          const contrib = solveForContribution(principal, target, rate / 100, years, frequency);
          const clamped = Math.max(0, contrib);
          return {
            label: 'Monthly Contribution',
            value: clamped,
            formatted: formatCurrency(clamped),
            context: `To reach ${formatCurrency(target)} in ${years} year${years !== 1 ? 's' : ''} starting from ${formatCurrency(principal)} at ${rate}%`,
            chartYears: years,
          };
        }
        case 'returnRate': {
          const r = solveForRate(principal, monthly, target, years, frequency);
          const pct = r * 100;
          return {
            label: 'Required Return Rate',
            value: pct,
            formatted: `${pct.toFixed(2)}%`,
            context: `To grow ${formatCurrency(principal)} + ${formatCurrency(monthly)}/mo to ${formatCurrency(target)} in ${years} year${years !== 1 ? 's' : ''}`,
            chartYears: years,
          };
        }
        case 'startingAmount': {
          const start = solveForPrincipal(monthly, target, rate / 100, years, frequency);
          const clamped = Math.max(0, start);
          return {
            label: 'Starting Amount',
            value: clamped,
            formatted: formatCurrency(clamped),
            context: `To reach ${formatCurrency(target)} in ${years} year${years !== 1 ? 's' : ''} with ${formatCurrency(monthly)}/mo at ${rate}%`,
            chartYears: years,
          };
        }
        case 'time': {
          const t = solveForTime(principal, monthly, rate / 100, target, frequency);
          const clamped = Math.max(0, t);
          const wholeYears = Math.floor(clamped);
          const remainderMonths = Math.round((clamped - wholeYears) * 12);
          return {
            label: 'Time Required',
            value: clamped,
            formatted:
              remainderMonths > 0
                ? `${wholeYears} yr${wholeYears !== 1 ? 's' : ''} ${remainderMonths} mo`
                : `${wholeYears} year${wholeYears !== 1 ? 's' : ''}`,
            context: `To grow ${formatCurrency(principal)} + ${formatCurrency(monthly)}/mo to ${formatCurrency(target)} at ${rate}%`,
            chartYears: Math.ceil(clamped) || 1,
          };
        }
      }
    } catch {
      return {
        label: 'Result',
        value: 0,
        formatted: '--',
        context: 'Adjust inputs to calculate',
        chartYears: years,
      };
    }
  }, [mode, principal, monthly, rate, years, target, frequency]);

  /* ── Derive effective values for charting ───────────────── */
  const effectiveValues = useMemo(() => {
    switch (mode) {
      case 'endAmount':
        return { principal, monthly, rate: rate / 100, years };
      case 'contribution':
        return { principal, monthly: Math.max(0, result.value), rate: rate / 100, years };
      case 'returnRate':
        return { principal, monthly, rate: result.value / 100, years };
      case 'startingAmount':
        return { principal: Math.max(0, result.value), monthly, rate: rate / 100, years };
      case 'time':
        return { principal, monthly, rate: rate / 100, years: Math.ceil(Math.max(0, result.value)) || 1 };
    }
  }, [mode, principal, monthly, rate, years, result.value]);

  /* ── Chart data ─────────────────────────────────────────── */
  const chartData = useMemo(() => {
    const schedule = compoundInterestSchedule(
      effectiveValues.principal,
      effectiveValues.monthly,
      effectiveValues.rate,
      effectiveValues.years,
      frequency
    );
    return schedule.map((row) => ({
      year: row.year,
      'Total Balance': row.balance,
      Contributions: row.totalContributions,
    }));
  }, [effectiveValues, frequency]);

  /* ── Summary stats ──────────────────────────────────────── */
  const summary = useMemo(() => {
    const finalBalance = chartData[chartData.length - 1]?.['Total Balance'] ?? 0;
    const totalContributions = chartData[chartData.length - 1]?.Contributions ?? 0;
    const totalEarnings = finalBalance - totalContributions;
    return { finalBalance, totalContributions, totalEarnings };
  }, [chartData]);

  /* ── Reset ──────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setPrincipal(DEFAULTS.principal);
    setMonthly(DEFAULTS.monthly);
    setRate(DEFAULTS.rate);
    setYears(DEFAULTS.years);
    setTarget(DEFAULTS.target);
    setFrequency(DEFAULTS.frequency);
  }, []);

  /* ── Render input fields based on active mode ───────────── */
  const renderInputs = () => {
    const inputs: React.ReactNode[] = [];

    if (mode !== 'startingAmount') {
      inputs.push(
        <SliderInput
          key="principal"
          label="Starting Amount"
          id="ir-principal"
          value={principal}
          min={0}
          max={1000000}
          step={1000}
          onChange={setPrincipal}
          prefix="$"
          formatDisplay={(v) => formatNumber(v)}
        />
      );
    }

    if (mode !== 'contribution') {
      inputs.push(
        <SliderInput
          key="monthly"
          label="Monthly Contribution"
          id="ir-monthly"
          value={monthly}
          min={0}
          max={10000}
          step={50}
          onChange={setMonthly}
          prefix="$"
          formatDisplay={(v) => formatNumber(v)}
        />
      );
    }

    if (mode !== 'returnRate') {
      inputs.push(
        <SliderInput
          key="rate"
          label="Annual Return Rate"
          id="ir-rate"
          value={rate}
          min={0}
          max={25}
          step={0.1}
          onChange={setRate}
          suffix="%"
          formatDisplay={(v) => v.toFixed(1)}
        />
      );
    }

    if (mode !== 'time') {
      inputs.push(
        <SliderInput
          key="years"
          label="Time Period (Years)"
          id="ir-years"
          value={years}
          min={1}
          max={50}
          step={1}
          onChange={setYears}
        />
      );
    }

    if (mode !== 'endAmount') {
      inputs.push(
        <SliderInput
          key="target"
          label="Target Amount"
          id="ir-target"
          value={target}
          min={1000}
          max={5000000}
          step={5000}
          onChange={setTarget}
          prefix="$"
          formatDisplay={(v) => formatNumber(v)}
        />
      );
    }

    return inputs;
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      {/* ── Tab Bar ─────────────────────────────────────── */}
      <div className="border-b border-neutral-200/80">
        <div className="flex overflow-x-auto" role="tablist" aria-label="Solve for variable">
          {TABS.map((tab) => {
            const isActive = mode === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls="ir-results"
                onClick={() => setMode(tab.key)}
                className={`flex-1 min-w-[120px] px-4 py-3 text-sm whitespace-nowrap transition-colors duration-150
                  ${
                    isActive
                      ? 'bg-white border-b-2 border-primary-500 font-medium text-primary-900'
                      : 'bg-neutral-50 text-neutral-600 hover:text-primary-500'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ──────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
              Inputs
            </h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-500 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-5">{renderInputs()}</div>

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
                showAdvanced ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div>
                <label
                  htmlFor="ir-frequency"
                  className="block text-sm font-medium text-neutral-700 mb-1.5"
                >
                  Compounding Frequency
                </label>
                <select
                  id="ir-frequency"
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
            </div>
          </div>
        </div>

        {/* ── Results Panel ─────────────────────────────── */}
        <div id="ir-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          {/* Big Number */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{result.label}</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary-900 tabular-nums">
              {result.formatted}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{result.context}</p>
          </div>

          {/* Summary Breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Final Balance</p>
              <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">
                {formatCurrency(summary.finalBalance)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Invested</p>
              <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">
                {formatCurrency(summary.totalContributions)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Earnings</p>
              <p className="text-base sm:text-lg font-semibold text-accent-600 tabular-nums">
                {formatCurrency(summary.totalEarnings)}
              </p>
            </div>
          </div>

          {/* Area Chart */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Growth Over Time</h3>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="irColorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="irColorContrib" x1="0" y1="0" x2="0" y2="1">
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
                    tickFormatter={(v: number) =>
                      `$${
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(1)}M`
                          : v >= 1000
                            ? `${(v / 1000).toFixed(0)}K`
                            : v
                      }`
                    }
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="Total Balance"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#irColorBalance)"
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="Contributions"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#irColorContrib)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year-by-Year Table */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Year-by-Year Breakdown</h3>
            <ScheduleTable chartData={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Schedule Table ───────────────────────────────────────── */
function ScheduleTable({
  chartData,
}: {
  chartData: Array<{ year: number; 'Total Balance': number; Contributions: number }>;
}) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // Skip year 0 (starting point)
  const rows = chartData.filter((row) => row.year > 0);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600">Balance</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">
              Invested
            </th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">
              Earnings
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const earnings = row['Total Balance'] - row.Contributions;
            const prev = chartData[row.year - 1];
            const yearEarnings = prev
              ? row['Total Balance'] -
                row.Contributions -
                (prev['Total Balance'] - prev.Contributions)
              : earnings;

            return (
              <tr
                key={row.year}
                className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150
                  ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                  ${expandedYear === row.year ? 'bg-primary-50/50' : 'hover:bg-primary-50/30'}`}
                onClick={() => setExpandedYear(expandedYear === row.year ? null : row.year)}
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
                  {formatCurrency(row['Total Balance'])}
                </td>
                <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">
                  {formatCurrency(row.Contributions)}
                </td>
                <td className="py-2.5 px-4 text-right text-accent-600 tabular-nums hidden sm:table-cell">
                  {formatCurrency(earnings)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

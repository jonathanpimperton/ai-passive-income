import { useState, useMemo, useCallback, Fragment } from 'react';
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
import { ChevronDown, RotateCcw, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

/* ── Solve-for-X tab definitions ─────────────────────────── */
type SolveMode = 'endAmount' | 'contribution' | 'returnRate' | 'startingAmount' | 'time';

const TABS: { key: SolveMode; label: string }[] = [
  { key: 'endAmount', label: 'End Amount' },
  { key: 'contribution', label: 'Contribution' },
  { key: 'returnRate', label: 'Return Rate' },
  { key: 'startingAmount', label: 'Starting Amount' },
  { key: 'time', label: 'Time' },
];

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

/* ── Defaults ─────────────────────────────────────────────── */
const DEFAULTS = {
  principal: 10000,
  monthly: 200,
  rate: 7,
  years: 20,
  target: 100000,
  frequency: 12,
  timing: 'end' as 'end' | 'beginning',
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
  const [timing, setTiming] = useState(DEFAULTS.timing);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Solve based on active tab ──────────────────────────── */
  const result = useMemo(() => {
    try {
      switch (mode) {
        case 'endAmount': {
          const endAmount = compoundInterest(principal, monthly, rate / 100, years, frequency, timing);
          return {
            label: 'End Amount',
            value: endAmount,
            formatted: formatCurrency(endAmount),
            context: `After investing ${formatCurrency(monthly)}/mo for ${years} year${years !== 1 ? 's' : ''} at ${rate}% return`,
            chartYears: years,
          };
        }
        case 'contribution': {
          const contrib = solveForContribution(principal, target, rate / 100, years, frequency, timing);
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
          const r = solveForRate(principal, monthly, target, years, frequency, timing);
          const pct = r * 100;
          // Verify the solved rate actually reaches the target
          const verified = compoundInterest(principal, monthly, r, years, frequency, timing);
          const reachable = verified >= target * 0.99;
          return {
            label: 'Required Return Rate',
            value: pct,
            formatted: reachable ? `${pct.toFixed(2)}%` : 'Not achievable',
            context: reachable
              ? `To grow ${formatCurrency(principal)} + ${formatCurrency(monthly)}/mo to ${formatCurrency(target)} in ${years} year${years !== 1 ? 's' : ''}`
              : `Target requires a return rate exceeding 100% annually`,
            chartYears: years,
          };
        }
        case 'startingAmount': {
          const start = solveForPrincipal(monthly, target, rate / 100, years, frequency, timing);
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
          const t = solveForTime(principal, monthly, rate / 100, target, frequency, timing);
          if (!isFinite(t)) {
            return {
              label: 'Time Required',
              value: Infinity,
              formatted: 'Not reachable',
              context: `Target of ${formatCurrency(target)} is not reachable with current inputs`,
              chartYears: 1,
            };
          }
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
  }, [mode, principal, monthly, rate, years, target, frequency, timing]);

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
      frequency,
      timing
    );
    return schedule.map((row) => ({
      year: row.year,
      'Total Balance': row.balance,
      Contributions: row.totalContributions,
    }));
  }, [effectiveValues, frequency, timing]);

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
    setTiming(DEFAULTS.timing);
  }, []);

  /* ── Animated result value ─────────────────────────────── */
  const animatedValue = useAnimatedNumber(result.value);
  const animatedFormatted = (() => {
    const isCurrency = mode === 'endAmount' || mode === 'contribution' || mode === 'startingAmount';
    if (isCurrency) return formatCurrency(animatedValue);
    return result.formatted;
  })();

  /* ── Render input fields based on active mode ───────────── */
  const renderInputs = () => {
    const inputs: React.ReactNode[] = [];

    if (mode !== 'startingAmount') {
      inputs.push(
        <SliderInput
          key="principal"
          label="Starting Amount"
          hint="Your initial investment amount"
          id="ir-principal"
          value={principal}
          min={0}
          max={1000000}
          step={500}
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
          hint="Regular amount you'll invest each month"
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
          label="Expected Annual Return"
          hint="Historical stock market average: ~7-10% before inflation"
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
          hint="How long you plan to stay invested"
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
          hint="The amount you want to reach"
          id="ir-target"
          value={target}
          min={1000}
          max={2000000}
          step={1000}
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
                      : 'bg-neutral-50 text-neutral-600 hover:text-primary-600'
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
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-5">{renderInputs()}</div>

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

                <div>
                  <label
                    htmlFor="ir-timing"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    Contribution Timing
                  </label>
                  <select
                    id="ir-timing"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value as 'end' | 'beginning')}
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

        {/* ── Results Panel ─────────────────────────────── */}
        <div id="ir-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          {/* Big Number */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{result.label}</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {animatedFormatted}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{result.context}</p>
          </div>

          {/* Summary Breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Final Balance</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">
                  {formatCurrency(summary.finalBalance)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Invested</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">
                  {formatCurrency(summary.totalContributions)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Earnings</p>
                <p className="text-base sm:text-lg font-semibold text-accent-600 tabular-nums">
                  {formatCurrency(summary.totalEarnings)}
                </p>
              </div>
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
            const yearContributions = prev
              ? row.Contributions - prev.Contributions
              : row.Contributions;
            const yearEarnings = prev
              ? row['Total Balance'] -
                row.Contributions -
                (prev['Total Balance'] - prev.Contributions)
              : earnings;
            const startBalance = prev ? prev['Total Balance'] : 0;
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
                    {formatCurrency(row['Total Balance'])}
                  </td>
                  <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">
                    {formatCurrency(row.Contributions)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-accent-600 tabular-nums hidden sm:table-cell">
                    {formatCurrency(earnings)}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-primary-50/30 border-b border-primary-100/50">
                    <td colSpan={4} className="py-3 px-4 pl-10">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-neutral-500 mb-0.5">Starting Balance</p>
                          <p className="font-semibold text-neutral-900 tabular-nums">
                            {formatCurrency(startBalance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Year Contributions</p>
                          <p className="font-semibold text-neutral-900 tabular-nums">
                            +{formatCurrency(yearContributions)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Year Earnings</p>
                          <p className="font-semibold text-accent-600 tabular-nums">
                            +{formatCurrency(yearEarnings)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Ending Balance</p>
                          <p className="font-semibold text-primary-700 tabular-nums">
                            {formatCurrency(row['Total Balance'])}
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

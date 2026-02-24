import { useState, useMemo, useCallback } from 'react';
import {
  monthlySavingsRequired,
  compoundInterestSchedule,
  solveForTime,
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
} from 'recharts';
import { RotateCcw, Target, Wallet, Sparkles } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

/* ── Tabs ─────────────────────────────────────────────────── */
type Mode = 'monthly' | 'time';

const TABS: { key: Mode; label: string }[] = [
  { key: 'monthly', label: 'Monthly Savings Needed' },
  { key: 'time', label: 'Time to Goal' },
];

/* ── Defaults ─────────────────────────────────────────────── */
const DEFAULTS = {
  goalAmount: 50000,
  currentSavings: 5000,
  monthlyContribution: 500,
  annualRate: 5,
  months: 60,
};

/* ── Main Calculator ──────────────────────────────────────── */
export default function SavingsGoalCalc() {
  const [mode, setMode] = useState<Mode>('monthly');
  const [goalAmount, setGoalAmount] = useState(DEFAULTS.goalAmount);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULTS.monthlyContribution);
  const [annualRate, setAnnualRate] = useState(DEFAULTS.annualRate);
  const [months, setMonths] = useState(DEFAULTS.months);

  /* ── Derived calculations ──────────────────────────────── */
  const rateDecimal = annualRate / 100;

  // Mode 1: monthly savings needed
  const monthlySavings = useMemo(() => {
    if (mode !== 'monthly') return 0;
    if (months <= 0 || goalAmount <= 0) return 0;
    const result = monthlySavingsRequired(goalAmount, currentSavings, rateDecimal, months);
    return Math.max(0, result);
  }, [mode, goalAmount, currentSavings, rateDecimal, months]);

  // Mode 2: time to goal (in years, converted to months for display)
  const timeToGoalYears = useMemo(() => {
    if (mode !== 'time') return 0;
    if (monthlyContribution <= 0 && rateDecimal <= 0) return Infinity;
    if (goalAmount <= currentSavings) return 0;
    const years = solveForTime(currentSavings, monthlyContribution, rateDecimal, goalAmount, 12);
    return Math.max(0, years);
  }, [mode, currentSavings, monthlyContribution, rateDecimal, goalAmount]);

  const timeToGoalMonths = Math.ceil(timeToGoalYears * 12);

  // Progress bar: % of goal already saved
  const progressPercent = useMemo(() => {
    if (goalAmount <= 0) return 0;
    return Math.min(100, (currentSavings / goalAmount) * 100);
  }, [currentSavings, goalAmount]);

  // Chart data: savings growth over time
  const chartData = useMemo(() => {
    if (mode === 'monthly') {
      // Show growth using the calculated monthly savings
      const yearsToChart = Math.ceil(months / 12);
      const schedule = compoundInterestSchedule(
        currentSavings,
        monthlySavings,
        rateDecimal,
        yearsToChart,
        12
      );
      return schedule.map((row) => ({
        year: row.year,
        'Projected Balance': row.balance,
        Contributions: row.totalContributions,
        'Interest Earned': row.totalInterest,
      }));
    } else {
      // Show growth using the entered monthly contribution until goal
      const yearsToChart = Math.min(Math.ceil(timeToGoalYears) + 1, 100);
      if (yearsToChart <= 0 || !isFinite(yearsToChart)) return [];
      const schedule = compoundInterestSchedule(
        currentSavings,
        monthlyContribution,
        rateDecimal,
        yearsToChart,
        12
      );
      return schedule.map((row) => ({
        year: row.year,
        'Projected Balance': Math.min(row.balance, goalAmount * 1.1),
        Contributions: row.totalContributions,
        'Interest Earned': row.totalInterest,
      }));
    }
  }, [mode, currentSavings, monthlySavings, monthlyContribution, rateDecimal, months, timeToGoalYears, goalAmount]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (mode === 'monthly') {
      const totalContributions = currentSavings + monthlySavings * months;
      const interestEarned = goalAmount - totalContributions;
      return { totalContributions, interestEarned };
    } else {
      // Guard: if time is infinite, goal is unreachable
      if (!isFinite(timeToGoalYears)) return { totalContributions: 0, interestEarned: 0 };
      // Use precise time value (not ceiling) to avoid overshoot
      const preciseMonths = timeToGoalYears * 12;
      const totalContributions = currentSavings + monthlyContribution * preciseMonths;
      const interestEarned = goalAmount - totalContributions;
      return { totalContributions, interestEarned };
    }
  }, [mode, currentSavings, monthlySavings, monthlyContribution, months, timeToGoalYears, goalAmount]);

  const animatedMonthlySavings = useAnimatedNumber(monthlySavings);
  const animatedTimeMonths = useAnimatedNumber(timeToGoalMonths);

  const handleReset = useCallback(() => {
    setGoalAmount(DEFAULTS.goalAmount);
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyContribution(DEFAULTS.monthlyContribution);
    setAnnualRate(DEFAULTS.annualRate);
    setMonths(DEFAULTS.months);
  }, []);

  // Format time to goal for display
  const formatTimeResult = (totalMonths: number): string => {
    if (!isFinite(totalMonths) || totalMonths <= 0) return '0 months';
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    if (years === 0) return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    return `${years} yr${years !== 1 ? 's' : ''} ${remainingMonths} mo`;
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      {/* ── Tab Bar ──────────────────────────────────────── */}
      <div className="flex overflow-x-auto border-b border-neutral-200/80" role="tablist" aria-label="Savings goal mode">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 min-w-[140px] py-3.5 px-4 text-sm font-medium whitespace-nowrap transition-all duration-150
              ${mode === tab.key
                ? 'bg-white border-b-2 border-primary-500 text-primary-900'
                : 'bg-neutral-50 text-neutral-600 hover:text-primary-600 border-b-2 border-transparent'
              }`}
            aria-selected={mode === tab.key}
            aria-controls="sg-results"
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ──────────────────────────────── */}
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

          <div className="space-y-5">
            <SliderInput
              label="Savings Goal"
              hint="Your target amount — e.g. car, vacation, house deposit"
              id="sg-goal"
              value={goalAmount}
              min={1000}
              max={500000}
              step={500}
              onChange={setGoalAmount}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Current Savings"
              hint="How much you've already saved toward this goal"
              id="sg-current"
              value={currentSavings}
              min={0}
              max={200000}
              step={500}
              onChange={setCurrentSavings}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Annual Interest Rate"
              hint="Rate your savings earn — ~4–5% for high-yield savings accounts"
              id="sg-rate"
              value={annualRate}
              min={0}
              max={15}
              step={0.1}
              onChange={setAnnualRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />

            {/* Mode-specific input */}
            {mode === 'monthly' ? (
              <SliderInput
                label="Timeframe"
                hint="How many months you have to reach your goal"
                id="sg-months"
                value={months}
                min={1}
                max={360}
                step={1}
                onChange={setMonths}
                suffix=" months"
              />
            ) : (
              <SliderInput
                label="Monthly Contribution"
                hint="How much you can put away each month"
                id="sg-monthly"
                value={monthlyContribution}
                min={0}
                max={5000}
                step={25}
                onChange={setMonthlyContribution}
                prefix="$"
                formatDisplay={(v) => formatNumber(v)}
              />
            )}
          </div>

          {/* ── Progress Indicator ──────────────────────── */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Current Progress</span>
              <span className="text-sm font-semibold text-primary-700 tabular-nums">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: progressPercent >= 100
                    ? '#10B981'
                    : 'linear-gradient(90deg, #2563EB, #3B82F6)',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-neutral-500 tabular-nums">
                {formatCurrency(currentSavings)} saved
              </span>
              <span className="text-xs text-neutral-500 tabular-nums">
                {formatCurrency(goalAmount)} goal
              </span>
            </div>
          </div>
        </div>

        {/* ── Results Panel ──────────────────────────────── */}
        <div id="sg-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          {/* Big Number Result */}
          <div className="mb-6">
            {mode === 'monthly' ? (
              <>
                <p className="text-sm text-neutral-500 mb-1">Monthly Savings Needed</p>
                <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  {formatCurrency(animatedMonthlySavings)}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  Save {formatCurrency(monthlySavings)}/month for {months} month{months !== 1 ? 's' : ''}{' '}
                  ({(months / 12).toFixed(1)} yr{months !== 12 ? 's' : ''}) to reach your{' '}
                  {formatCurrency(goalAmount)} goal at {annualRate}% annual return
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-1">Time to Reach Your Goal</p>
                <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  {!isFinite(timeToGoalMonths) ? (
                    <span className="text-negative-600">Not reachable</span>
                  ) : goalAmount <= currentSavings ? (
                    <span className="text-accent-600">Already reached!</span>
                  ) : (
                    formatTimeResult(Math.round(animatedTimeMonths))
                  )}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  {!isFinite(timeToGoalMonths)
                    ? 'Increase your monthly contribution or expected return rate to reach your goal.'
                    : goalAmount <= currentSavings
                      ? `Your current savings of ${formatCurrency(currentSavings)} already exceed your ${formatCurrency(goalAmount)} goal.`
                      : `Contributing ${formatCurrency(monthlyContribution)}/month at ${annualRate}% annual return to reach ${formatCurrency(goalAmount)}`}
                </p>
              </>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {formatCurrency(Math.max(0, summaryStats.totalContributions))}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Interest Earned</p>
                <p className="text-lg font-semibold text-accent-600 tabular-nums">
                  {formatCurrency(Math.max(0, summaryStats.interestEarned))}
                </p>
              </div>
            </div>
          </div>

          {/* Remaining amount card */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Target size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Remaining to Save</p>
                  <p className="text-lg font-semibold text-primary-700 tabular-nums">
                    {formatCurrency(Math.max(0, goalAmount - currentSavings))}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500 mb-0.5">Goal Amount</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {formatCurrency(goalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Savings Growth Projection</h3>
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="sgColorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="sgColorContrib" x1="0" y1="0" x2="0" y2="1">
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
                      label={{ value: 'Year', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9CA3AF' }}
                    />
                    <YAxis
                      tickFormatter={(v: number) =>
                        `$${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`
                      }
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {/* Goal line reference */}
                    <Area
                      type="monotone"
                      dataKey="Projected Balance"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#sgColorBalance)"
                      animationDuration={600}
                    />
                    <Area
                      type="monotone"
                      dataKey="Contributions"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#sgColorContrib)"
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Goal reference line label */}
              <div className="flex items-center justify-end gap-4 mt-2 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[#2563EB] rounded-full" />
                  Projected Balance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[#10B981] rounded-full" />
                  Contributions
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

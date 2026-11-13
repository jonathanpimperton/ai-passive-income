import { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import type { KeyboardEvent } from 'react';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import {
  monthlyForGoal,
  timeToGoal,
  savingsPath,
  formatMonthsShort,
  MAX_GOAL_MONTHS,
  type SavingsPathRow,
} from '../../lib/savings-goal';
import { RotateCcw, Target, Wallet, Sparkles } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import ResultAffiliate from '../ui/ResultAffiliate';
import { monthLabel } from './charts/chart-format';

const SavingsGoalChart = lazy(() => import('./charts/SavingsGoalChart'));
const CHART_HEIGHT = 256;

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const [mode, setMode] = useState<Mode>('monthly');
  const [goalAmount, setGoalAmount] = useState(DEFAULTS.goalAmount);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULTS.monthlyContribution);
  const [annualRate, setAnnualRate] = useState(DEFAULTS.annualRate);
  const [months, setMonths] = useState(DEFAULTS.months);

  const rateDecimal = annualRate / 100;

  /* ── Core calculations (src/lib/savings-goal.ts) ─────────── */
  const needed = useMemo(
    () => monthlyForGoal({ goal: goalAmount, current: currentSavings, annualRate: rateDecimal, months }),
    [goalAmount, currentSavings, rateDecimal, months],
  );
  const time = useMemo(
    () => timeToGoal({ goal: goalAmount, current: currentSavings, monthly: monthlyContribution, annualRate: rateDecimal }),
    [goalAmount, currentSavings, monthlyContribution, rateDecimal],
  );

  const monthlySavings = needed.status === 'ok' ? needed.monthly : 0;
  const progressPercent = goalAmount > 0 ? Math.min(100, (currentSavings / goalAmount) * 100) : 0;

  const chartRows: SavingsPathRow[] = useMemo(() => {
    if (mode === 'monthly') {
      return needed.status === 'reached' ? [] : savingsPath(currentSavings, monthlySavings, rateDecimal, months);
    }
    if (time.status === 'ok') return savingsPath(currentSavings, monthlyContribution, rateDecimal, time.months);
    if (time.status === 'unreachable') return savingsPath(currentSavings, monthlyContribution, rateDecimal, MAX_GOAL_MONTHS);
    return [];
  }, [mode, needed.status, currentSavings, monthlySavings, monthlyContribution, rateDecimal, months, time]);

  // Summary figures for the current mode, or null where they would mislead.
  const summary = useMemo(() => {
    if (mode === 'monthly') {
      if (needed.status === 'ok') return { contributions: needed.totalContributions, interest: needed.interestEarned };
      if (needed.status === 'on-track') return { contributions: currentSavings, interest: needed.projected - currentSavings };
      return null;
    }
    if (time.status === 'ok') return { contributions: time.totalContributions, interest: time.interestEarned };
    return null;
  }, [mode, needed, time, currentSavings]);

  const animatedMonthlySavings = useAnimatedNumber(monthlySavings);
  const animatedTimeMonths = useAnimatedNumber(time.status === 'ok' ? time.months : 0);

  const timeText = time.status === 'ok'
    ? formatMonthsShort(time.months)
    : time.status === 'reached'
      ? 'Already reached'
      : 'Not within 100 years';

  const liveText = mode === 'monthly'
    ? needed.status === 'reached'
      ? `Your savings already meet your ${fmt(goalAmount)} goal.`
      : needed.status === 'on-track'
        ? `No monthly saving needed: interest alone reaches ${fmt(goalAmount)} in ${months} months.`
        : `Save ${fmt(monthlySavings)} a month to reach ${fmt(goalAmount)} in ${months} months.`
    : time.status === 'ok'
      ? `You reach ${fmt(goalAmount)} in ${formatMonthsShort(time.months)}.`
      : time.status === 'reached'
        ? `Your savings already meet your ${fmt(goalAmount)} goal.`
        : `${fmt(goalAmount)} is not reached within 100 years at this rate.`;

  /* ── PDF / email ─────────────────────────────────────────── */
  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Mode', value: mode === 'monthly' ? 'Monthly Savings Needed' : 'Time to Goal' },
      { label: 'Savings Goal', value: fmt(goalAmount) },
      { label: 'Current Savings', value: fmt(currentSavings) },
      { label: 'Annual Interest Rate', value: `${annualRate}%` },
    ];
    if (mode === 'monthly') {
      inputs.push({ label: 'Timeframe', value: `${months} month${months !== 1 ? 's' : ''}` });
    } else {
      inputs.push({ label: 'Monthly Contribution', value: fmt(monthlyContribution) });
    }
    return inputs;
  }, [mode, goalAmount, currentSavings, annualRate, months, monthlyContribution, currency]);

  const getResults = useCallback((): ResultItem[] => {
    if (mode === 'monthly') {
      if (needed.status === 'reached') {
        return [{ label: 'Monthly Savings Needed', value: `${fmt(0)}: current savings already meet the goal`, highlight: true }];
      }
      if (needed.status === 'on-track') {
        return [
          { label: 'Monthly Savings Needed', value: `${fmt(0)}: interest alone reaches the goal`, highlight: true },
          { label: `Projected Balance after ${months} months`, value: fmt(needed.projected) },
        ];
      }
      return [
        { label: 'Monthly Savings Needed', value: fmt(needed.monthly), highlight: true },
        { label: 'Total Contributions', value: fmt(needed.totalContributions) },
        { label: 'Interest Earned', value: fmt(needed.interestEarned) },
      ];
    }
    if (time.status === 'ok') {
      return [
        { label: 'Time to Reach Goal', value: formatMonthsShort(time.months), highlight: true },
        { label: 'Total Contributions', value: fmt(time.totalContributions) },
        { label: 'Interest Earned', value: fmt(time.interestEarned) },
      ];
    }
    if (time.status === 'reached') return [{ label: 'Time to Reach Goal', value: 'Already reached', highlight: true }];
    return [
      { label: 'Time to Reach Goal', value: 'Not reached within 100 years', highlight: true },
      { label: 'Balance after 100 years', value: fmt(time.balanceAtMax) },
    ];
  }, [mode, needed, time, months, currency]);

  const handleReset = useCallback(() => {
    setGoalAmount(DEFAULTS.goalAmount);
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyContribution(DEFAULTS.monthlyContribution);
    setAnnualRate(DEFAULTS.annualRate);
    setMonths(DEFAULTS.months);
  }, []);

  /* ── Tabs: APG keyboard pattern (arrows, Home, End) ──────── */
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next = e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : e.key === 'Home' ? 0
          : e.key === 'End' ? last
            : -1;
    if (next < 0) return;
    e.preventDefault();
    setMode(TABS[next].key);
    document.getElementById(`sg-tab-${TABS[next].key}`)?.focus();
  };

  const tableRows = chartRows.map((r) => ({ ...r, interest: r.balance - r.contributions }));

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>
      {/* ── Tab Bar ──────────────────────────────────────── */}
      <div className="flex overflow-x-auto border-b border-neutral-200/80" role="tablist" aria-label="Savings goal mode">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            id={`sg-tab-${tab.key}`}
            type="button"
            onClick={() => setMode(tab.key)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`flex-1 min-w-[140px] py-3.5 px-4 text-sm font-medium whitespace-nowrap transition-all duration-150
              ${mode === tab.key
                ? 'bg-white border-b-2 border-primary-500 text-primary-900'
                : 'bg-neutral-50 text-neutral-600 hover:text-primary-600 border-b-2 border-transparent'
              }`}
            aria-selected={mode === tab.key}
            aria-controls="sg-results"
            tabIndex={mode === tab.key ? 0 : -1}
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
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
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
              step={1000}
              textMax={50000000}
              minLabel={`${currencySymbol}1K`}
              maxLabel={`${currencySymbol}500K`}
              onChange={setGoalAmount}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Current Savings"
              hint="How much you've already saved toward this goal"
              id="sg-current"
              value={currentSavings}
              min={0}
              max={500000}
              step={1000}
              textMax={2000000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}500K`}
              onChange={setCurrentSavings}
              prefix={currencySymbol}
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
                textMax={50000}
                minLabel={`${currencySymbol}0`}
                maxLabel={`${currencySymbol}5K`}
                onChange={setMonthlyContribution}
                prefix={currencySymbol}
                formatDisplay={(v) => formatNumber(v)}
              />
            )}
          </div>

          {/* ── Progress Indicator ──────────────────────── */}
          <div className="mt-6 pt-5 border-t border-neutral-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Current Progress</span>
              <span className="text-sm font-semibold text-primary-700 tabular-nums">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${progressPercent >= 100 ? 'bg-success-600' : 'bg-primary-600'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-neutral-500 tabular-nums">{fmt(currentSavings)} saved</span>
              <span className="text-xs text-neutral-500 tabular-nums">{fmt(goalAmount)} goal</span>
            </div>
          </div>
        </div>

        {/* ── Results Panel ──────────────────────────────── */}
        <div
          id="sg-results"
          role="tabpanel"
          aria-labelledby={`sg-tab-${mode}`}
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start"
          ref={resultsRef}
        >
          <p className="sr-only" aria-live="polite">{liveText}</p>

          {/* Big Number Result */}
          <div data-pdf-section className="mb-6">
            {mode === 'monthly' ? (
              <>
                <p className="text-sm text-neutral-500 mb-1">Monthly Savings Needed</p>
                {needed.status === 'reached' ? (
                  <p data-headline-result data-headline-label="Monthly Savings Needed" className="text-3xl sm:text-4xl font-bold text-success-600">
                    Already reached
                  </p>
                ) : (
                  <p data-headline-result data-headline-label="Monthly Savings Needed" className={`text-3xl sm:text-4xl font-bold tabular-nums ${needed.status === 'on-track' ? 'text-success-600' : 'result-number'}`}>
                    {fmt(animatedMonthlySavings)}
                  </p>
                )}
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  {needed.status === 'reached'
                    ? `Your ${fmt(currentSavings)} already covers your ${fmt(goalAmount)} goal.`
                    : needed.status === 'on-track'
                      ? `Interest alone grows your ${fmt(currentSavings)} to ${fmt(needed.projected)} in ${months} months at ${annualRate}%, so no monthly saving is needed.`
                      : `Save ${fmt(monthlySavings)}/month for ${months} month${months !== 1 ? 's' : ''} (${(months / 12).toFixed(1)} yr${months !== 12 ? 's' : ''}) to reach your ${fmt(goalAmount)} goal at ${annualRate}% annual return`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-1">Time to Reach Your Goal</p>
                <p
                  data-headline-result
                  data-headline-label="Time to Reach Your Goal"
                  className={`text-3xl sm:text-4xl font-bold tabular-nums ${time.status === 'unreachable' ? 'text-red-600' : time.status === 'reached' ? 'text-success-600' : 'result-number'}`}
                >
                  {time.status === 'ok' ? formatMonthsShort(Math.round(animatedTimeMonths)) : timeText}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  {time.status === 'unreachable'
                    ? `After 100 years you would have ${fmt(time.balanceAtMax)}. Increase your monthly contribution or expected return to reach ${fmt(goalAmount)}.`
                    : time.status === 'reached'
                      ? `Your current savings of ${fmt(currentSavings)} already meet your ${fmt(goalAmount)} goal.`
                      : `Contributing ${fmt(monthlyContribution)}/month at ${annualRate}% annual return to reach ${fmt(goalAmount)}`}
                </p>
              </>
            )}
          </div>

          {/* Summary Cards */}
          {summary && (
            <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                  <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(summary.contributions)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Interest Earned</p>
                  <p className="text-lg font-semibold text-success-600 tabular-nums">{fmt(summary.interest)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Remaining amount card */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Target size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Remaining to Save</p>
                  <p className="text-lg font-semibold text-primary-700 tabular-nums">{fmt(Math.max(0, goalAmount - currentSavings))}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500 mb-0.5">Goal Amount</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(goalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="savings-goal" toolName="Savings Goal Calculator" />
            <EmailResultsButton toolSlug="savings-goal" toolName="Savings Goal Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Savings Goal Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          {chartRows.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Savings Growth Projection</h3>
              <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} />}>
                <SavingsGoalChart
                  rows={chartRows}
                  goal={goalAmount}
                  currency={currency}
                  height={CHART_HEIGHT}
                  ariaLabel={`Savings growth from ${fmt(currentSavings)} toward the ${fmt(goalAmount)} goal over ${formatMonthsShort(chartRows[chartRows.length - 1].month)}, ending at ${fmt(chartRows[chartRows.length - 1].balance)}.`}
                />
              </Suspense>
              <ChartDataTable
                className="mt-3"
                caption="Savings balance over time"
                columns={[
                  { key: 'month', label: 'When', format: (v) => monthLabel(Number(v)) },
                  { key: 'balance', label: 'Balance', format: (v) => fmt(Number(v)) },
                  { key: 'contributions', label: 'Contributions', format: (v) => fmt(Number(v)) },
                  { key: 'interest', label: 'Interest', format: (v) => fmt(Number(v)) },
                ]}
                rows={tableRows}
              />
            </div>
          )}

          <ResultAffiliate toolSlug="savings-goal" />
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import {
  solveRetirementAge,
  projectionRows,
  retirementMilestones,
  toTodaysMoney,
  formatDuration,
} from '../../lib/retirement';
import { RotateCcw, Calendar, Wallet, Sparkles, AlertTriangle } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartSkeleton from '../ui/ChartSkeleton';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import ResultAffiliate from '../ui/ResultAffiliate';
import {
  regionFor,
  SAVINGS_HINTS,
  INFLATION_HINTS,
  todaysMoneyLabel,
  useClientToday,
  MilestoneLegend,
  chartMilestoneAges,
  ProjectionSummaryTable,
} from './retirement-shared';

const RetirementProjectionChart = lazy(() => import('./charts/RetirementProjectionChart'));
const CHART_HEIGHT = 280;
/** The search stops here; beyond it the target is reported as not reached. */
const MAX_AGE = 90;

/* ── Defaults ──────────────────────────────────────────────── */
const DEFAULTS = {
  currentAge: 30,
  currentSavings: 50000,
  monthlyContribution: 500,
  targetBalance: 1000000,
  annualReturn: 7,
  inflationRate: 3,
};

/* ── Main Calculator ───────────────────────────────────────── */
export default function RetirementAgeCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const region = regionFor(currency);
  const realLabel = todaysMoneyLabel(currency);
  const today = useClientToday();
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULTS.monthlyContribution);
  const [targetBalance, setTargetBalance] = useState(DEFAULTS.targetBalance);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);

  const rateDecimal = annualReturn / 100;
  const inflationDecimal = inflationRate / 100;

  /* ── Core calculation (src/lib/retirement.ts) ────────────── */
  const solved = useMemo(
    () => solveRetirementAge({
      currentAge,
      currentSavings,
      monthlyContribution,
      annualReturn: rateDecimal,
      target: targetBalance,
      maxAge: MAX_AGE,
    }),
    [currentAge, currentSavings, monthlyContribution, rateDecimal, targetBalance],
  );

  // Chart horizon: to the month the target is reached, or to MAX_AGE when it never is.
  const horizonMonths = solved.status === 'reached'
    ? solved.months
    : solved.status === 'unreachable'
      ? Math.max(0, Math.floor((MAX_AGE - currentAge) * 12))
      : 0;

  const rows = useMemo(
    () => projectionRows({
      currentAge,
      currentSavings,
      monthlyContribution,
      annualReturn: rateDecimal,
      inflation: inflationDecimal,
      months: horizonMonths,
    }),
    [currentAge, currentSavings, monthlyContribution, rateDecimal, inflationDecimal, horizonMonths],
  );

  const endAge = currentAge + horizonMonths / 12;
  const milestones = useMemo(
    () => (today ? retirementMilestones(region, currentAge, endAge, today) : []),
    [today, region, currentAge, endAge],
  );

  const reached = solved.status === 'reached' ? solved : null;
  const unreachable = solved.status === 'unreachable' ? solved : null;
  const retireAgeWhole = reached ? Math.floor(reached.age + 1e-9) : currentAge;
  const realTarget = reached ? toTodaysMoney(reached.balance, inflationDecimal, reached.months / 12) : 0;

  const contextLine = `Saving ${fmt(monthlyContribution)}/mo to reach ${fmt(targetBalance)} at ${annualReturn}% return`;
  const liveText = reached
    ? `You reach ${fmt(targetBalance)} at age ${retireAgeWhole}, in ${formatDuration(reached.months)}.`
    : unreachable
      ? `${fmt(targetBalance)} is not reached by age ${MAX_AGE}; you would have ${fmt(unreachable.balanceAtMaxAge)}.`
      : `Your savings already meet ${fmt(targetBalance)}.`;

  /* ── PDF / email ─────────────────────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Current Age', value: `${currentAge} years` },
    { label: 'Current Savings', value: fmt(currentSavings) },
    { label: 'Monthly Contribution', value: fmt(monthlyContribution) },
    { label: 'Target Balance', value: fmt(targetBalance) },
    { label: 'Expected Annual Return', value: `${annualReturn}%` },
    { label: 'Expected Inflation Rate', value: `${inflationRate}%` },
  ], [currentAge, currentSavings, monthlyContribution, targetBalance, annualReturn, inflationRate, currency]);

  const getResults = useCallback((): ResultItem[] => {
    if (solved.status === 'already') {
      return [
        { label: 'Estimated Retirement Age', value: `Now (age ${currentAge}): savings already meet the target`, highlight: true },
        { label: 'Current Savings', value: fmt(solved.balance) },
      ];
    }
    if (solved.status === 'unreachable') {
      const items: ResultItem[] = [
        { label: 'Estimated Retirement Age', value: `Not reached by age ${MAX_AGE}`, highlight: true },
        { label: `Projected Balance at ${MAX_AGE}`, value: fmt(solved.balanceAtMaxAge) },
        { label: 'Shortfall', value: fmt(solved.shortfall) },
      ];
      if (solved.requiredMonthly !== null) {
        items.push({ label: `Monthly Saving Needed to Reach It by ${MAX_AGE}`, value: fmt(solved.requiredMonthly) });
      }
      return items;
    }
    return [
      { label: 'Estimated Retirement Age', value: `Age ${retireAgeWhole} (in ${formatDuration(solved.months)})`, highlight: true },
      { label: 'Projected Balance', value: fmt(solved.balance) },
      { label: `Inflation-Adjusted Value (${realLabel})`, value: fmt(realTarget) },
      { label: 'Total Contributions', value: fmt(solved.totalContributions) },
      { label: 'Total Interest Earned', value: fmt(solved.balance - solved.totalContributions) },
    ];
  }, [solved, currentAge, retireAgeWhole, realTarget, realLabel, currency]);

  const handleReset = useCallback(() => {
    setCurrentAge(DEFAULTS.currentAge);
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlyContribution(DEFAULTS.monthlyContribution);
    setTargetBalance(DEFAULTS.targetBalance);
    setAnnualReturn(DEFAULTS.annualReturn);
    setInflationRate(DEFAULTS.inflationRate);
  }, []);

  const animatedAge = useAnimatedNumber(retireAgeWhole);

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
            When can I afford to retire?
          </p>

          <div className="space-y-5">
            <SliderInput
              label="Current Age"
              id="reta-current-age"
              value={currentAge}
              min={18}
              max={80}
              step={1}
              onChange={setCurrentAge}
              suffix="yrs"
            />

            <SliderInput
              label="Current Savings"
              hint={SAVINGS_HINTS[region]}
              id="reta-current-savings"
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
              id="reta-monthly"
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
              label="Target Retirement Balance"
              hint="How much you want saved before retiring"
              id="reta-target"
              value={targetBalance}
              min={50000}
              max={5000000}
              step={10000}
              textMax={50000000}
              minLabel={`${currencySymbol}50K`}
              maxLabel={`${currencySymbol}5M`}
              onChange={setTargetBalance}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />

            <SliderInput
              label="Expected Annual Return"
              hint="Stock/bond portfolio average: ~6-8% is typical"
              id="reta-return"
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
              hint={INFLATION_HINTS[region]}
              id="reta-inflation"
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
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start"
          id="retirement-age-results"
        >
          <p className="sr-only" aria-live="polite">{liveText}</p>

          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Estimated Retirement Age</p>
            {reached && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <p data-headline-result data-headline-label="Estimated Retirement Age" className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  Age {Math.round(animatedAge)}
                </p>
                <span className="text-lg text-neutral-500 font-medium tabular-nums">
                  (in {formatDuration(reached.months)})
                </span>
              </div>
            )}
            {unreachable && (
              <p data-headline-result data-headline-label="Estimated Retirement Age" className="text-3xl sm:text-4xl font-bold text-red-600">
                Not by age {MAX_AGE}
              </p>
            )}
            {solved.status === 'already' && (
              <p data-headline-result data-headline-label="Estimated Retirement Age" className="text-3xl sm:text-4xl font-bold text-success-600">
                Already there
              </p>
            )}
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {unreachable
                ? `At ${fmt(monthlyContribution)}/mo and ${annualReturn}% you would have ${fmt(unreachable.balanceAtMaxAge)} at ${MAX_AGE}, ${fmt(unreachable.shortfall)} short of ${fmt(targetBalance)}.`
                : solved.status === 'already'
                  ? `Your ${fmt(currentSavings)} already meets your ${fmt(targetBalance)} target.`
                  : contextLine}
            </p>
          </div>

          {/* Breakdown Cards */}
          {reached && (
            <div data-pdf-section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Target in {realLabel.toLowerCase()}</p>
                  <p className="text-lg font-semibold text-primary-600 tabular-nums">{fmt(realTarget)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                  <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(reached.totalContributions)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
                  <p className="text-lg font-semibold text-success-600 tabular-nums">{fmt(reached.balance - reached.totalContributions)}</p>
                </div>
              </div>
            </div>
          )}

          {unreachable && (
            <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Shortfall at {MAX_AGE}</p>
                  <p className="text-lg font-semibold text-red-600 tabular-nums">{fmt(unreachable.shortfall)}</p>
                </div>
              </div>
              {unreachable.requiredMonthly !== null && (
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Needed to reach it by {MAX_AGE}</p>
                    <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(unreachable.requiredMonthly)}/mo</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="retirement-age" toolName="Retirement Age Calculator" />
            <EmailResultsButton toolSlug="retirement-age" toolName="Retirement Age Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Retirement Age Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          {rows.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Savings Projection</h3>
              <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} />}>
                <RetirementProjectionChart
                  rows={rows}
                  milestoneAges={chartMilestoneAges(milestones)}
                  currency={currency}
                  realLabel={realLabel}
                  target={targetBalance}
                  height={CHART_HEIGHT}
                  ariaLabel={reached
                    ? `Savings projection from age ${currentAge}: the balance reaches the ${fmt(targetBalance)} target line at age ${retireAgeWhole}. Figures are in the Projection Summary table.`
                    : `Savings projection from age ${currentAge} to ${MAX_AGE}: the balance stays below the ${fmt(targetBalance)} target line. Figures are in the Projection Summary table.`}
                />
              </Suspense>
              <MilestoneLegend milestones={milestones} region={region} />
            </div>
          )}

          <ProjectionSummaryTable
            rows={rows}
            currency={currency}
            caption={`Savings projection by age from ${currentAge}`}
          />

          <ResultAffiliate toolSlug="retirement-age" />
        </div>
      </div>
    </div>
  );
}

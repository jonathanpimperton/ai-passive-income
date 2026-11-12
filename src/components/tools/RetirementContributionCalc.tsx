import { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import {
  solveRequiredMonthly,
  projectionRows,
  retirementMilestones,
  toTodaysMoney,
  check401kLimit,
} from '../../lib/retirement';
import { RotateCcw, Calendar, Wallet, Sparkles } from 'lucide-react';
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

/* ── Defaults ──────────────────────────────────────────────── */
const DEFAULTS = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 50000,
  targetBalance: 1000000,
  annualReturn: 7,
  inflationRate: 3,
};

/* ── Main Calculator ───────────────────────────────────────── */
export default function RetirementContributionCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const region = regionFor(currency);
  const realLabel = todaysMoneyLabel(currency);
  const today = useClientToday();
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [retirementAge, setRetirementAge] = useState(DEFAULTS.retirementAge);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [targetBalance, setTargetBalance] = useState(DEFAULTS.targetBalance);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);

  const rateDecimal = annualReturn / 100;
  const inflationDecimal = inflationRate / 100;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const months = yearsToRetirement * 12;

  /* ── Core calculation (src/lib/retirement.ts) ────────────── */
  const solved = useMemo(
    () => solveRequiredMonthly({ currentSavings, target: targetBalance, annualReturn: rateDecimal, months }),
    [currentSavings, targetBalance, rateDecimal, months],
  );
  const monthly = solved.status === 'ok' ? solved.monthly : 0;
  const realTarget = toTodaysMoney(targetBalance, inflationDecimal, yearsToRetirement);

  const rows = useMemo(
    () => projectionRows({
      currentAge,
      currentSavings,
      monthlyContribution: monthly,
      annualReturn: rateDecimal,
      inflation: inflationDecimal,
      months,
    }),
    [currentAge, currentSavings, monthly, rateDecimal, inflationDecimal, months],
  );

  const milestones = useMemo(
    () => (today ? retirementMilestones(region, currentAge, retirementAge, today) : []),
    [today, region, currentAge, retirementAge],
  );

  // US only: compare the required saving with the 401(k) employee limit (us-rates.ts).
  const limitCheck = region === 'us' && solved.status === 'ok' ? check401kLimit(monthly, currentAge) : null;

  const contextLine = solved.status === 'already'
    ? `With no more contributions, your ${fmt(currentSavings)} is projected to grow to ${fmt(solved.projected)} by age ${retirementAge} at ${annualReturn}% return.`
    : `To reach ${fmt(targetBalance)} by age ${retirementAge} at ${annualReturn}% return`;
  const liveText = solved.status === 'already'
    ? `No monthly saving needed: your savings are projected to reach ${fmt(targetBalance)} by ${retirementAge}.`
    : `Required monthly saving: ${fmt(monthly)} to reach ${fmt(targetBalance)} by ${retirementAge}.`;

  /* ── PDF / email ─────────────────────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Current Age', value: `${currentAge} years` },
    { label: 'Retirement Age', value: `${retirementAge} years` },
    { label: 'Current Savings', value: fmt(currentSavings) },
    { label: 'Target Balance', value: fmt(targetBalance) },
    { label: 'Expected Annual Return', value: `${annualReturn}%` },
    { label: 'Expected Inflation Rate', value: `${inflationRate}%` },
  ], [currentAge, retirementAge, currentSavings, targetBalance, annualReturn, inflationRate, currency]);

  const getResults = useCallback((): ResultItem[] => {
    if (solved.status === 'already') {
      return [
        { label: 'Required Monthly Savings', value: `${fmt(0)}: current savings are on track`, highlight: true },
        { label: `Projected Balance at ${retirementAge} (no more contributions)`, value: fmt(solved.projected) },
        { label: `Target in ${realLabel.toLowerCase()}`, value: fmt(realTarget) },
      ];
    }
    if (solved.status === 'no-time') {
      return [{ label: 'Required Monthly Savings', value: 'Not available: retirement age must be after current age', highlight: true }];
    }
    return [
      { label: 'Required Monthly Savings', value: fmt(solved.monthly), highlight: true },
      { label: `Target in ${realLabel.toLowerCase()}`, value: fmt(realTarget) },
      { label: 'Total Contributions', value: fmt(solved.totalContributions) },
      { label: 'Total Interest Earned', value: fmt(solved.totalGrowth) },
    ];
  }, [solved, retirementAge, realTarget, realLabel, currency]);

  const handleReset = useCallback(() => {
    setCurrentAge(DEFAULTS.currentAge);
    setRetirementAge(DEFAULTS.retirementAge);
    setCurrentSavings(DEFAULTS.currentSavings);
    setTargetBalance(DEFAULTS.targetBalance);
    setAnnualReturn(DEFAULTS.annualReturn);
    setInflationRate(DEFAULTS.inflationRate);
  }, []);

  const animatedMonthly = useAnimatedNumber(monthly);

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
            How much should I save each month to retire with my target?
          </p>

          <div className="space-y-5">
            <SliderInput
              label="Current Age"
              id="retc-current-age"
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
              id="retc-retirement-age"
              value={retirementAge}
              min={currentAge + 1}
              max={90}
              step={1}
              onChange={setRetirementAge}
              suffix="yrs"
            />

            <SliderInput
              label="Current Savings"
              hint={SAVINGS_HINTS[region]}
              id="retc-current-savings"
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
              label="Target Retirement Balance"
              hint="How much you want saved by retirement"
              id="retc-target"
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
              id="retc-return"
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
              id="retc-inflation"
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
          id="retirement-contribution-results"
        >
          <p className="sr-only" aria-live="polite">{liveText}</p>

          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Required Monthly Savings</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p data-headline-result data-headline-label="Required Monthly Savings" className={`text-3xl sm:text-4xl font-bold tabular-nums ${solved.status === 'already' ? 'text-success-600' : 'result-number'}`}>
                {formatCurrency(animatedMonthly, currency)}
              </p>
              <span className="text-lg text-neutral-500 font-medium">/month</span>
            </div>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{contextLine}</p>
          </div>

          {/* Breakdown Cards */}
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
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                  {fmt(solved.status === 'ok' || solved.status === 'already' ? solved.totalContributions : 0)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{solved.status === 'already' ? 'Projected Growth' : 'Total Interest Earned'}</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums">
                  {fmt(solved.status === 'ok' || solved.status === 'already' ? solved.totalGrowth : 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="retirement-contribution" toolName="Retirement Contribution Calculator" />
            <EmailResultsButton toolSlug="retirement-contribution" toolName="Retirement Contribution Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Retirement Contribution Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {limitCheck && (
            <p className="text-sm text-neutral-600 leading-relaxed border-l-2 border-neutral-300 pl-3 mb-4">
              {limitCheck.exceeds ? (
                <>
                  That is <span className="tabular-nums">{fmt(limitCheck.annualContribution)}</span> a year, more than the {limitCheck.year} 401(k) employee limit of{' '}
                  <span className="tabular-nums">{fmt(limitCheck.annualLimit)}</span>
                  {limitCheck.catchUpApplies ? ' (including the age-50+ catch-up)' : ''}. The rest would need an IRA or a taxable account; employer contributions do not count toward this limit.
                </>
              ) : (
                <>
                  That is <span className="tabular-nums">{fmt(limitCheck.annualContribution)}</span> a year, within the {limitCheck.year} 401(k) employee limit of{' '}
                  <span className="tabular-nums">{fmt(limitCheck.baseLimit)}</span> (plus <span className="tabular-nums">{fmt(limitCheck.catchUp)}</span> catch-up from age 50).
                </>
              )}
            </p>
          )}

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
                  ariaLabel={`Savings projection from age ${currentAge} to ${retirementAge} saving ${fmt(monthly)} a month: the balance reaches ${fmt(rows[rows.length - 1].nominal)}. Figures are in the Projection Summary table.`}
                />
              </Suspense>
              <MilestoneLegend milestones={milestones} region={region} />
            </div>
          )}

          <ProjectionSummaryTable
            rows={rows}
            currency={currency}
            caption={`Savings projection by age, ${currentAge} to ${retirementAge}`}
          />

          <ResultAffiliate toolSlug="retirement-contribution" />
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import {
  projectRetirement,
  projectionRows,
  retirementMilestones,
  check401kLimit,
} from '../../lib/retirement';
import { RotateCcw, PiggyBank, Calendar, Wallet, Sparkles } from 'lucide-react';
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
  const region = regionFor(currency);
  const realLabel = todaysMoneyLabel(currency);
  const today = useClientToday();
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [retirementAge, setRetirementAge] = useState(DEFAULTS.retirementAge);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULTS.monthlyContribution);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);

  const rateDecimal = annualReturn / 100;
  const inflationDecimal = inflationRate / 100;

  /* ── Core calculations (src/lib/retirement.ts) ───────────── */
  const results = useMemo(
    () => projectRetirement({
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      annualReturn: rateDecimal,
      inflation: inflationDecimal,
    }),
    [currentAge, retirementAge, currentSavings, monthlyContribution, rateDecimal, inflationDecimal],
  );

  const rows = useMemo(
    () => projectionRows({
      currentAge,
      currentSavings,
      monthlyContribution,
      annualReturn: rateDecimal,
      inflation: inflationDecimal,
      months: Math.round(results.years * 12),
    }),
    [currentAge, currentSavings, monthlyContribution, rateDecimal, inflationDecimal, results.years],
  );

  const milestones = useMemo(
    () => (today ? retirementMilestones(region, currentAge, retirementAge, today) : []),
    [today, region, currentAge, retirementAge],
  );

  // US only: compare the planned saving with the 401(k) employee limit (us-rates.ts).
  const limitCheck = region === 'us' ? check401kLimit(monthlyContribution, currentAge) : null;

  const contextLine = `By age ${retirementAge}, saving ${fmt(monthlyContribution)}/mo at ${annualReturn}% return`;
  const liveText = `Estimated balance at ${retirementAge}: ${fmt(results.nominal)}, or ${fmt(results.real)} in today's money.`;

  /* ── PDF / email ─────────────────────────────────────────── */
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
    { label: `Inflation-Adjusted Value (${realLabel})`, value: fmt(results.real) },
    { label: 'Total Contributions', value: fmt(results.totalContributions) },
    { label: 'Total Interest Earned', value: fmt(results.totalGrowth) },
  ], [results, currency, realLabel]);

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
              hint={SAVINGS_HINTS[region]}
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
              hint={INFLATION_HINTS[region]}
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
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start"
          id="retirement-results"
        >
          <p className="sr-only" aria-live="polite">{liveText}</p>

          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Estimated Retirement Balance</p>
            <p data-headline-result data-headline-label="Estimated Retirement Balance" className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {formatCurrency(animatedNominal, currency)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{contextLine}</p>
          </div>

          {/* Breakdown Cards */}
          <div data-pdf-section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <PiggyBank size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Nominal Balance</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(results.nominal)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{realLabel}</p>
                <p className="text-lg font-semibold text-primary-600 tabular-nums">{fmt(results.real)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(results.totalContributions)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums">{fmt(results.totalGrowth)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="retirement-savings" toolName="Retirement Savings Calculator" />
            <EmailResultsButton toolSlug="retirement-savings" toolName="Retirement Savings Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Retirement Savings Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {limitCheck?.exceeds && (
            <p className="text-sm text-neutral-600 leading-relaxed border-l-2 border-neutral-300 pl-3 mb-4">
              <span className="tabular-nums">{fmt(limitCheck.annualContribution)}</span> a year is more than the {limitCheck.year} 401(k) employee limit of{' '}
              <span className="tabular-nums">{fmt(limitCheck.annualLimit)}</span>
              {limitCheck.catchUpApplies ? ' (including the age-50+ catch-up)' : ''}. The rest would need to go into an IRA or a taxable account.
            </p>
          )}

          {/* Inflation Impact Note */}
          {inflationRate > 0 && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Inflation impact:</span>{' '}
                Your <span className="tabular-nums">{fmt(results.nominal)}</span> will have the purchasing power of{' '}
                <span className="font-semibold tabular-nums">{fmt(results.real)}</span>{' '}
                today, assuming {inflationRate}% annual inflation over {results.years} years.
              </p>
            </div>
          )}

          {/* Chart */}
          {rows.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Retirement Savings Projection</h3>
              <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} />}>
                <RetirementProjectionChart
                  rows={rows}
                  milestoneAges={chartMilestoneAges(milestones)}
                  currency={currency}
                  realLabel={realLabel}
                  height={CHART_HEIGHT}
                  ariaLabel={`Retirement savings projection from age ${currentAge} to ${retirementAge}: the balance grows to ${fmt(results.nominal)}, ${fmt(results.real)} in today's money. Figures are in the Projection Summary table.`}
                />
              </Suspense>
              <MilestoneLegend milestones={milestones} region={region} />
            </div>
          )}

          <ProjectionSummaryTable
            rows={rows}
            currency={currency}
            caption={`Retirement savings projection by age, ${currentAge} to ${retirementAge}`}
          />

          <ResultAffiliate toolSlug="retirement-savings" />
        </div>
      </div>
    </div>
  );
}

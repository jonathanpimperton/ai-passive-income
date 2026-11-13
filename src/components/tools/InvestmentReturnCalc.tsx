import { useState, useMemo, useCallback, useDeferredValue, useRef, Fragment, Suspense } from 'react';
import { formatNumber } from '../../lib/calculator-utils';
import {
  futureValue,
  contributionsAfter,
  growthSchedule,
  solveRequiredContribution,
  solveRequiredPrincipal,
  solveRequiredRate,
  solveMonthsToTarget,
  MAX_SOLVE_MONTHS,
  type ContributionTiming,
  type GrowthInputs,
} from '../../lib/investment-solvers';
import { formatMoneyGuarded, formatPercentGuarded, formatMonthsShort, isExtremeMoney } from '../../lib/result-format';
import { ChevronDown, RotateCcw, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import ChartSkeleton from '../ui/ChartSkeleton';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import ResultAffiliate from '../ui/ResultAffiliate';
import LiveResult from './fields/LiveResult';
import { lazyChart } from './charts/InvestDebtLazyChart';

const InvestGrowthChart = lazyChart(() => import('./charts/InvestGrowthChart'));

/* -- Solve-for-X tab definitions ---------------------------- */
type SolveMode = 'endAmount' | 'contribution' | 'returnRate' | 'startingAmount' | 'time';

const TABS: { key: SolveMode; label: string }[] = [
  { key: 'endAmount', label: 'End Amount' },
  { key: 'contribution', label: 'Contribution' },
  { key: 'returnRate', label: 'Return Rate' },
  { key: 'startingAmount', label: 'Starting Amount' },
  { key: 'time', label: 'Time' },
];

/* -- Compounding frequency options ------------------------- */
const COMPOUND_OPTIONS = [
  { label: 'Annually', value: 1 },
  { label: 'Semi-annually', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
  { label: 'Daily', value: 365 },
] as const;

// Contributions are always monthly; timing says when in the month they land.
const TIMING_OPTIONS = [
  { label: 'End of each month', value: 'end' },
  { label: 'Start of each month', value: 'beginning' },
] as const;

/* -- Defaults ---------------------------------------------- */
const DEFAULTS = {
  principal: 10000,
  monthly: 200,
  rate: 7,
  years: 20,
  target: 100000,
  frequency: 12,
  timing: 'end' as ContributionTiming,
};

interface SolveResult {
  label: string;
  /** Number to animate for currency results; null when the headline is text. */
  amount: number | null;
  formatted: string;
  context: string;
  /** Inputs and horizon to chart, or null when there is nothing meaningful to chart. */
  effective: { inputs: GrowthInputs; months: number } | null;
}

/* -- Main Calculator --------------------------------------- */
export default function InvestmentReturnCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const [mode, setMode] = useState<SolveMode>('endAmount');
  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [monthly, setMonthly] = useState(DEFAULTS.monthly);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [target, setTarget] = useState(DEFAULTS.target);
  const [frequency, setFrequency] = useState(DEFAULTS.frequency);
  const [timing, setTiming] = useState<ContributionTiming>(DEFAULTS.timing);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* -- Solve based on active tab (every branch terminates; see investment-solvers.ts) -- */
  const result = useMemo((): SolveResult => {
    const months = years * 12;
    const yearsText = `${years} year${years !== 1 ? 's' : ''}`;
    const base = { compoundingPerYear: frequency, timing };
    const withAll = (p: number, d: number, r: number): GrowthInputs => ({ principal: p, monthlyContribution: d, annualRate: r, ...base });
    const r = rate / 100;

    switch (mode) {
      case 'endAmount': {
        const inputs = withAll(principal, monthly, r);
        const end = futureValue(inputs, months);
        return {
          label: 'End Amount',
          amount: end,
          formatted: fmt(end),
          context: `After investing ${fmt(monthly)}/mo for ${yearsText} at ${rate}% return`,
          effective: { inputs, months },
        };
      }
      case 'contribution': {
        const s = solveRequiredContribution(principal, target, r, months, frequency, timing);
        if (s.status === 'needed') {
          return {
            label: 'Monthly Contribution',
            amount: s.monthly,
            formatted: fmt(s.monthly),
            context: `To reach ${fmt(target)} in ${yearsText} starting from ${fmt(principal)} at ${rate}%`,
            effective: { inputs: withAll(principal, s.monthly, r), months },
          };
        }
        if (s.status === 'alreadyMet') {
          return {
            label: 'Monthly Contribution',
            amount: 0,
            formatted: fmt(0),
            context: `Your ${fmt(principal)} starting amount alone grows to ${fmt(s.balanceWithoutDeposits)} in ${yearsText}, past your ${fmt(target)} target.`,
            effective: { inputs: withAll(principal, 0, r), months },
          };
        }
        return { label: 'Monthly Contribution', amount: null, formatted: '--', context: 'Adjust the inputs to calculate.', effective: null };
      }
      case 'returnRate': {
        const s = solveRequiredRate(principal, monthly, target, months, frequency, timing);
        if (s.status === 'ok') {
          const paidIn = contributionsAfter(withAll(principal, monthly, 0), months);
          return {
            label: 'Required Return Rate',
            amount: null,
            formatted: formatPercentGuarded(s.rate),
            context:
              s.rate < 0
                ? `Your ${fmt(paidIn)} of contributions already exceeds ${fmt(target)}, so even a negative return gets there in ${yearsText}.`
                : `To grow ${fmt(principal)} + ${fmt(monthly)}/mo to ${fmt(target)} in ${yearsText}`,
            effective: { inputs: withAll(principal, monthly, s.rate), months },
          };
        }
        if (s.status === 'metAtAnyRate') {
          return {
            label: 'Required Return Rate',
            amount: null,
            formatted: 'No growth needed',
            context: `Even losing 99% a year leaves ${fmt(s.balanceAtMinRate)} after ${yearsText}, above your ${fmt(target)} target, so there is no rate to solve for.`,
            effective: null,
          };
        }
        if (s.status === 'tooHigh') {
          return {
            label: 'Required Return Rate',
            amount: null,
            formatted: 'Over 100% a year',
            context: `Even 100% a year would only reach ${fmt(s.balanceAtMaxRate)} in ${yearsText}. Raise the contribution or time, or lower the target.`,
            effective: null,
          };
        }
        return {
          label: 'Required Return Rate',
          amount: null,
          formatted: '--',
          context: 'Add a starting amount or a monthly contribution to calculate a rate.',
          effective: null,
        };
      }
      case 'startingAmount': {
        const s = solveRequiredPrincipal(monthly, target, r, months, frequency, timing);
        if (s.status === 'needed') {
          return {
            label: 'Starting Amount',
            amount: s.principal,
            formatted: fmt(s.principal),
            context: `To reach ${fmt(target)} in ${yearsText} with ${fmt(monthly)}/mo at ${rate}%`,
            effective: { inputs: withAll(s.principal, monthly, r), months },
          };
        }
        if (s.status === 'alreadyMet') {
          return {
            label: 'Starting Amount',
            amount: 0,
            formatted: fmt(0),
            context: `Your ${fmt(monthly)}/mo alone grows to ${fmt(s.balanceWithoutPrincipal)} in ${yearsText}, past your ${fmt(target)} target.`,
            effective: { inputs: withAll(0, monthly, r), months },
          };
        }
        return { label: 'Starting Amount', amount: null, formatted: '--', context: 'Adjust the inputs to calculate.', effective: null };
      }
      case 'time': {
        const inputs = withAll(principal, monthly, r);
        const s = solveMonthsToTarget(inputs, target);
        if (s.status === 'reached') {
          return {
            label: 'Time Required',
            amount: null,
            formatted: formatMonthsShort(s.months),
            context: `To grow ${fmt(principal)} + ${fmt(monthly)}/mo to ${fmt(target)} at ${rate}%`,
            effective: { inputs, months: s.months },
          };
        }
        if (s.status === 'alreadyMet') {
          return {
            label: 'Time Required',
            amount: null,
            formatted: 'Already there',
            context: `Your ${fmt(principal)} starting amount already meets the ${fmt(target)} target.`,
            effective: null,
          };
        }
        return {
          label: 'Time Required',
          amount: null,
          formatted: 'Not within 100 years',
          context: `Target not reached within 100 years: after ${MAX_SOLVE_MONTHS / 12} years the balance would be ${fmt(s.balanceAtLimit)}. Raise the contribution or return, or lower the target.`,
          effective: null,
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, principal, monthly, rate, years, target, frequency, timing, currency]);

  /* -- Chart / table data (only for meaningful results) ------- */
  const deferredEffective = useDeferredValue(result.effective);
  const chartData = useMemo(() => {
    if (!deferredEffective) return [];
    const { inputs, months } = deferredEffective;
    return growthSchedule(inputs, Math.floor(months / 12), months).map((row) => ({
      year: row.year,
      'Total Balance': row.balance,
      Contributions: row.totalContributions,
    }));
  }, [deferredEffective]);

  /** First year where cumulative earnings exceed cumulative contributions. */
  const crossover = useMemo(() => {
    const row = chartData.find((r) => r.year > 0 && r['Total Balance'] - r.Contributions > r.Contributions);
    return row ? { x: row.year, y: row['Total Balance'] } : null;
  }, [chartData]);

  /* -- Summary stats (exact, from the solved horizon) ---------- */
  const summary = useMemo(() => {
    if (!result.effective) return null;
    const { inputs, months } = result.effective;
    const finalBalance = futureValue(inputs, months);
    const totalContributions = contributionsAfter(inputs, months);
    return { finalBalance, totalContributions, totalEarnings: finalBalance - totalContributions };
  }, [result.effective]);

  const extreme = summary !== null && isExtremeMoney(summary.finalBalance);

  /* -- PDF / email ------------------------------------------ */
  const getInputs = useCallback(() => {
    const freqLabel = COMPOUND_OPTIONS.find((o) => o.value === frequency)?.label ?? `${frequency}x/yr`;
    const timingLabel = TIMING_OPTIONS.find((o) => o.value === timing)?.label ?? timing;
    const modeLabel = TABS.find((t) => t.key === mode)?.label ?? mode;
    const inputs: { label: string; value: string }[] = [{ label: 'Solve For', value: modeLabel }];
    if (mode !== 'startingAmount') inputs.push({ label: 'Starting Amount', value: fmt(principal) });
    if (mode !== 'contribution') inputs.push({ label: 'Monthly Contribution', value: fmt(monthly) });
    if (mode !== 'returnRate') inputs.push({ label: 'Expected Annual Return', value: `${rate}%` });
    if (mode !== 'time') inputs.push({ label: 'Time Period', value: `${years} year${years !== 1 ? 's' : ''}` });
    if (mode !== 'endAmount') inputs.push({ label: 'Target Amount', value: fmt(target) });
    inputs.push({ label: 'Compounding Frequency', value: freqLabel });
    inputs.push({ label: 'Contribution Timing', value: timingLabel });
    return inputs;
  }, [mode, principal, monthly, rate, years, target, frequency, timing, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [{ label: result.label, value: result.formatted, highlight: true }];
    if (summary) {
      items.push(
        { label: 'Final Balance', value: fmt(summary.finalBalance) },
        { label: 'Total Contributions', value: fmt(summary.totalContributions) },
        { label: 'Total Earnings', value: fmt(summary.totalEarnings) },
      );
    } else {
      items.push({ label: 'Note', value: result.context.slice(0, 200) });
    }
    return items;
  }, [result, summary, currency]);

  /* -- Reset ------------------------------------------------ */
  const handleReset = useCallback(() => {
    setPrincipal(DEFAULTS.principal);
    setMonthly(DEFAULTS.monthly);
    setRate(DEFAULTS.rate);
    setYears(DEFAULTS.years);
    setTarget(DEFAULTS.target);
    setFrequency(DEFAULTS.frequency);
    setTiming(DEFAULTS.timing);
  }, []);

  /* -- Animated result value -------------------------------- */
  const animatedValue = useAnimatedNumber(result.amount ?? 0);
  const headline = result.amount !== null && !isExtremeMoney(result.amount) ? fmt(animatedValue) : result.formatted;

  /* -- Render input fields based on active mode ------------- */
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
          max={500000}
          step={1000}
          textMax={10000000}
          minLabel={`${currencySymbol}0`}
          maxLabel={`${currencySymbol}500K`}
          onChange={setPrincipal}
          prefix={currencySymbol}
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
          max={5000}
          step={25}
          textMax={50000}
          minLabel={`${currencySymbol}0`}
          maxLabel={`${currencySymbol}5K`}
          onChange={setMonthly}
          prefix={currencySymbol}
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
          max={100}
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
          step={5000}
          textMax={10000000}
          minLabel={`${currencySymbol}1K`}
          maxLabel={`${currencySymbol}2M`}
          onChange={setTarget}
          prefix={currencySymbol}
          formatDisplay={(v) => formatNumber(v)}
        />
      );
    }
    return inputs;
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="px-6 pt-6 lg:px-8 lg:pt-8">
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>
      {/* -- Tab Bar -- */}
      <div className="border-b border-neutral-200/80">
        <div className="flex overflow-x-auto" role="tablist" aria-label="Solve for variable">
          {TABS.map((tab) => {
            const isActive = mode === tab.key;
            return (
              <button
                key={tab.key}
                id={`ir-tab-${tab.key}`}
                type="button"
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
        {/* -- Input Panel -- */}
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

          <div className="space-y-5">{renderInputs()}</div>

          {/* -- Advanced Settings -- */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-neutral-200/80 mb-5" />
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-expanded={showAdvanced}
              aria-controls="ir-advanced"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              Advanced settings
            </button>

            <div
              id="ir-advanced"
              inert={showAdvanced ? undefined : true}
              aria-hidden={showAdvanced ? undefined : true}
              className={`overflow-hidden transition-all duration-200 ${
                showAdvanced ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="ir-frequency" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Compounding Frequency
                  </label>
                  <select
                    id="ir-frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                    aria-describedby="ir-frequency-note"
                    className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                  >
                    {COMPOUND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p id="ir-frequency-note" className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                    Sets how often returns are added. Your contribution still goes in every month.
                  </p>
                </div>

                <div>
                  <label htmlFor="ir-timing" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Contribution Timing
                  </label>
                  <select
                    id="ir-timing"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value === 'beginning' ? 'beginning' : 'end')}
                    className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
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

        {/* -- Results Panel -- */}
        <div
          id="ir-results"
          ref={resultsRef}
          role="tabpanel"
          aria-labelledby={`ir-tab-${mode}`}
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start"
        >
          <LiveResult text={`${result.label}: ${result.formatted}.`} />
          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{result.label}</p>
            <p data-headline-result data-headline-label={result.label} className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {headline}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{result.context}</p>
            {extreme && (
              <p className="text-sm text-red-600 mt-1.5 leading-relaxed">That is beyond any realistic outcome. Check your inputs.</p>
            )}
          </div>

          {/* Summary Breakdown */}
          {summary && (
            <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 mb-0.5">Final Balance</p>
                  <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums break-words">{fmt(summary.finalBalance)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 mb-0.5">Total Invested</p>
                  <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums break-words">{fmt(summary.totalContributions)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 mb-0.5">{summary.totalEarnings < 0 ? 'Total Loss' : 'Total Earnings'}</p>
                  <p className={`text-base sm:text-lg font-semibold tabular-nums break-words ${summary.totalEarnings < 0 ? 'text-red-600' : 'text-success-600'}`}>
                    {fmt(summary.totalEarnings)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="investment-return" toolName="Investment Return Calculator" />
            <EmailResultsButton toolSlug="investment-return" toolName="Investment Return Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Investment Return Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {chartData.length > 1 && (
            <>
              {/* Area Chart */}
              <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Growth Over Time</h3>
                <div className="h-56 sm:h-64">
                  <Suspense fallback={<ChartSkeleton height="100%" />}>
                    <InvestGrowthChart
                      data={chartData}
                      xKey="year"
                      series={[
                        { key: 'Total Balance', tone: 'primary' },
                        { key: 'Contributions', tone: 'comparison' },
                      ]}
                      currency={currency}
                      marker={crossover}
                      ariaLabel="Area chart of balance and money invested by year; the year-by-year table below lists the same figures."
                    />
                  </Suspense>
                </div>
                {crossover && (
                  <p className="text-xs text-neutral-500 mt-2">
                    Earnings overtake deposits in year <span className="font-mono tabular-nums">{crossover.x}</span>
                  </p>
                )}
              </div>

              {/* Year-by-Year Table */}
              <div data-pdf-section>
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Year-by-Year Breakdown</h3>
                <ScheduleTable chartData={chartData} cc={currency} />
              </div>
            </>
          )}

          <ResultAffiliate toolSlug="investment-return" />
        </div>
      </div>
    </div>
  );
}

/* -- Schedule Table ---------------------------------------- */
function yearLabel(year: number): string {
  return Number.isInteger(year) ? String(year) : formatMonthsShort(Math.round(year * 12));
}

function ScheduleTable({
  chartData,
  cc,
}: {
  chartData: Array<{ year: number; 'Total Balance': number; Contributions: number }>;
  cc: string;
}) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmt = (v: number) => formatMoneyGuarded(v, cc);

  if (chartData.length < 2) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <caption className="sr-only">Balance, money invested and earnings by year</caption>
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th scope="col" className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600">Balance</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Invested</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Earnings</th>
          </tr>
        </thead>
        <tbody>
          {chartData.slice(1).map((row, i) => {
            const prev = chartData[i]; // previous row (slice offset)
            const earnings = row['Total Balance'] - row.Contributions;
            const yearContributions = row.Contributions - prev.Contributions;
            const yearEarnings = earnings - (prev['Total Balance'] - prev.Contributions);
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
                        className={`text-neutral-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                      {yearLabel(row.year)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">{fmt(row['Total Balance'])}</td>
                  <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">{fmt(row.Contributions)}</td>
                  <td className={`py-2.5 px-4 text-right tabular-nums hidden sm:table-cell ${earnings < 0 ? 'text-red-600' : 'text-success-600'}`}>{fmt(earnings)}</td>
                </tr>
                {isExpanded && (
                  <tr className="bg-primary-50/30 border-b border-primary-100/50">
                    <td colSpan={4} className="py-3 px-4 pl-10">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-neutral-500 mb-0.5">Starting Balance</p>
                          <p className="font-semibold text-neutral-900 tabular-nums">{fmt(prev['Total Balance'])}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Contributions</p>
                          <p className="font-semibold text-neutral-900 tabular-nums">+{fmt(yearContributions)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Earnings</p>
                          <p className={`font-semibold tabular-nums ${yearEarnings < 0 ? 'text-red-600' : 'text-success-600'}`}>
                            {yearEarnings < 0 ? '' : '+'}{fmt(yearEarnings)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-0.5">Ending Balance</p>
                          <p className="font-semibold text-primary-700 tabular-nums">{fmt(row['Total Balance'])}</p>
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

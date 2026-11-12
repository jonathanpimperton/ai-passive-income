import { useState, useMemo, useCallback, useDeferredValue, useRef, Fragment, Suspense } from 'react';
import { formatNumber } from '../../lib/calculator-utils';
import { growthSchedule, type ContributionTiming, type GrowthInputs } from '../../lib/investment-solvers';
import { formatMoneyGuarded, isExtremeMoney } from '../../lib/result-format';
import { ChevronDown, RotateCcw, Wallet, Sparkles } from 'lucide-react';
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

/* ── Compounding frequency options ────────────────────────── */
const COMPOUND_OPTIONS = [
  { label: 'Annually', value: 1 },
  { label: 'Semi-annually', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
  { label: 'Daily', value: 365 },
] as const;

// Deposits are always monthly; timing says when in the month they land.
const TIMING_OPTIONS = [
  { label: 'End of each month', value: 'end' },
  { label: 'Start of each month', value: 'beginning' },
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
  const fmt = (v: number) => formatMoneyGuarded(v, cc);

  if (data.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <caption className="sr-only">Balance, contributions and interest by year</caption>
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th scope="col" className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600">Balance</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Contributions</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Interest</th>
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
                        className={`text-neutral-500 transition-transform duration-200 ${
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
                  <td className="py-2.5 px-4 text-right text-success-600 tabular-nums hidden sm:table-cell">
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
                          <p className="font-semibold text-success-600 tabular-nums">
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

/* -- Inputs and defaults ------------------------------------ */
export interface CompoundInterestInputs {
  principal: number;
  monthlyContribution: number;
  /** Percent, e.g. 7 for 7%. */
  annualRate: number;
  years: number;
  compoundingFrequency: number;
  contributionTiming: ContributionTiming;
}

const DEFAULTS: CompoundInterestInputs = {
  principal: 10000,
  monthlyContribution: 200,
  annualRate: 7,
  years: 20,
  compoundingFrequency: 12,
  contributionTiming: 'end',
};

/** Keep only finite, in-range values from a caller's `defaults` (e.g. a hub page). */
function mergeDefaults(overrides?: Partial<CompoundInterestInputs>): CompoundInterestInputs {
  const o = overrides ?? {};
  const num = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback;
  return {
    principal: num(o.principal, 0, 10_000_000, DEFAULTS.principal),
    monthlyContribution: num(o.monthlyContribution, 0, 50_000, DEFAULTS.monthlyContribution),
    annualRate: num(o.annualRate, 0, 25, DEFAULTS.annualRate),
    years: Math.round(num(o.years, 1, 100, DEFAULTS.years)),
    compoundingFrequency: COMPOUND_OPTIONS.some((c) => c.value === o.compoundingFrequency)
      ? (o.compoundingFrequency as number)
      : DEFAULTS.compoundingFrequency,
    contributionTiming: o.contributionTiming === 'beginning' || o.contributionTiming === 'end' ? o.contributionTiming : DEFAULTS.contributionTiming,
  };
}

export interface CompoundInterestCalcProps {
  /** Starting values, e.g. from a hub page that embeds this calculator. Reset returns to these. */
  defaults?: Partial<CompoundInterestInputs>;
}

export default function CompoundInterestCalc({ defaults }: CompoundInterestCalcProps = {}) {
  const start = useMemo(() => mergeDefaults(defaults), [defaults]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const [principal, setPrincipal] = useState(start.principal);
  const [monthly, setMonthly] = useState(start.monthlyContribution);
  const [rate, setRate] = useState(start.annualRate);
  const [years, setYears] = useState(start.years);
  const [frequency, setFrequency] = useState(start.compoundingFrequency);
  const [timing, setTiming] = useState<ContributionTiming>(start.contributionTiming);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fmt = (v: number) => formatMoneyGuarded(v, currency);

  const growth: GrowthInputs = useMemo(
    () => ({ principal, monthlyContribution: monthly, annualRate: rate / 100, compoundingPerYear: frequency, timing }),
    [principal, monthly, rate, frequency, timing]
  );
  const schedule = useMemo(() => growthSchedule(growth, years), [growth, years]);
  // The chart and the 100-row table follow a frame behind fast slider drags.
  const deferredSchedule = useDeferredValue(schedule);

  const finalRow = schedule[schedule.length - 1];
  const finalBalance = finalRow?.balance ?? 0;
  const totalContributions = finalRow?.totalContributions ?? principal;
  const totalInterest = finalBalance - totalContributions;
  const extreme = isExtremeMoney(finalBalance);
  const freqLabel = COMPOUND_OPTIONS.find((o) => o.value === frequency)?.label ?? `${frequency}x/yr`;

  const chartData = useMemo(
    () =>
      deferredSchedule.map((row) => ({
        year: row.year,
        'Total Balance': row.balance,
        Contributions: row.totalContributions,
      })),
    [deferredSchedule]
  );

  /** First year where cumulative interest exceeds cumulative contributions. */
  const crossover = useMemo(() => {
    const row = deferredSchedule.find((r) => r.year > 0 && r.totalInterest > r.totalContributions);
    return row ? { x: row.year, y: row.balance } : null;
  }, [deferredSchedule]);

  const yearTableData: YearRowData[] = useMemo(() => {
    return deferredSchedule.slice(1).map((row, i) => {
      const prev = deferredSchedule[i]; // i maps to previous year since we sliced
      return {
        year: row.year,
        balance: row.balance,
        totalContributions: row.totalContributions,
        totalInterest: row.totalInterest,
        yearContributions: row.totalContributions - prev.totalContributions,
        yearInterest: row.totalInterest - prev.totalInterest,
      };
    });
  }, [deferredSchedule]);

  const getInputs = useCallback(() => {
    const timingLabel = TIMING_OPTIONS.find((o) => o.value === timing)?.label ?? timing;
    return [
      { label: 'Starting Amount', value: fmt(principal) },
      { label: 'Monthly Contribution', value: fmt(monthly) },
      { label: 'Annual Growth Rate', value: `${rate}%` },
      { label: 'Time Period', value: `${years} year${years !== 1 ? 's' : ''}` },
      { label: 'Compounding Frequency', value: freqLabel },
      { label: 'Contribution Timing', value: timingLabel },
    ];
  }, [principal, monthly, rate, years, freqLabel, timing, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const results: ResultItem[] = [
      { label: 'Final Balance', value: fmt(finalBalance), highlight: true },
      { label: 'Total Contributions', value: fmt(totalContributions) },
      { label: 'Interest Earned', value: fmt(totalInterest) },
    ];
    if (extreme) results.push({ label: 'Note', value: 'Beyond any realistic outcome - check your inputs' });
    return results;
  }, [finalBalance, totalContributions, totalInterest, extreme, currency]);

  const handleReset = useCallback(() => {
    setPrincipal(start.principal);
    setMonthly(start.monthlyContribution);
    setRate(start.annualRate);
    setYears(start.years);
    setFrequency(start.compoundingFrequency);
    setTiming(start.contributionTiming);
  }, [start]);

  const animatedBalance = useAnimatedNumber(finalBalance);
  const yearsText = `${years} year${years !== 1 ? 's' : ''}`;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ────────────────────────────────── */}
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

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <SliderInput
              label="Starting Amount"
              hint="Amount you're starting with today"
              id="ci-principal"
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
            <SliderInput
              label="Monthly Contribution"
              hint="Amount you'll add each month"
              id="ci-monthly"
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
            <div className="h-px bg-neutral-200/80 mb-5" />
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-expanded={showAdvanced}
              aria-controls="ci-advanced"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              Advanced settings
            </button>

            <div
              id="ci-advanced"
              inert={showAdvanced ? undefined : true}
              aria-hidden={showAdvanced ? undefined : true}
              className={`overflow-hidden transition-all duration-200 ${
                showAdvanced ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
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
                    aria-describedby="ci-frequency-note"
                    className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                  >
                    {COMPOUND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p id="ci-frequency-note" className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                    Sets how often interest is added. Your contribution still goes in every month.
                  </p>
                </div>

                <div>
                  <label htmlFor="ci-timing" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Contribution Timing
                  </label>
                  <select
                    id="ci-timing"
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

        {/* ── Results Panel ───────────────────────────── */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start">
          <LiveResult text={`Final balance ${fmt(finalBalance)} after ${yearsText}.`} />
          {/* Big Number with count-up animation */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Final Balance</p>
            <p data-headline-result data-headline-label="Final Balance" className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {extreme ? fmt(finalBalance) : fmt(animatedBalance)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              After {yearsText} at {rate}% a year, compounded {freqLabel.toLowerCase()}
            </p>
            {extreme && (
              <p className="text-sm text-red-600 mt-1.5 leading-relaxed">
                That is beyond any realistic outcome. Check your inputs.
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Contributions</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums break-words">
                  {fmt(totalContributions)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest Earned</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums break-words">
                  {fmt(totalInterest)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="compound-interest" toolName="Compound Interest Calculator" />
            <EmailResultsButton toolSlug="compound-interest" toolName="Compound Interest Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Compound Interest Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
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
                  ariaLabel={`Area chart of balance and contributions by year over ${yearsText}; the year-by-year table below lists the same figures.`}
                />
              </Suspense>
            </div>
            {crossover && (
              <p className="text-xs text-neutral-500 mt-2">
                Interest overtakes deposits in year <span className="font-mono tabular-nums">{crossover.x}</span>
              </p>
            )}
          </div>

          {/* Schedule Table */}
          <div data-pdf-section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Year-by-Year Breakdown</h3>
            <ScheduleTable data={yearTableData} cc={currency} />
          </div>

          <ResultAffiliate toolSlug="compound-interest" />
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import type { KeyboardEvent } from 'react';
import { RotateCcw, Percent, Wallet, ArrowUpDown } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import {
  CPI_FIRST_YEAR,
  CPI_LAST_YEAR,
  CPI_U_LATEST,
  CPI_SOURCE,
  adjustForInflation,
  projectInflation,
  historicalSeries,
  cpiYearLabel,
} from '../../lib/inflation';

const InflationChart = lazy(() => import('./charts/InflationChart'));
const CHART_HEIGHT = 260;

type Mode = 'historical' | 'future';

const TABS: { key: Mode; label: string }[] = [
  { key: 'historical', label: 'Historical' },
  { key: 'future', label: 'Future Projection' },
];

const DEFAULTS = {
  amount: 1000,
  startYear: 2000,
  // The latest CPI month stands in for "today".
  endYear: CPI_LAST_YEAR,
  futureYears: 10,
  inflationRate: 3,
};

const usd = (v: number) => formatCurrency(v, 'USD');
const yearsText = (y: number) => {
  const rounded = Math.round(y * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} year${rounded === 1 ? '' : 's'}`;
};

export default function InflationCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('historical');
  const [amount, setAmount] = useState(DEFAULTS.amount);
  const [startYear, setStartYear] = useState(DEFAULTS.startYear);
  const [endYear, setEndYear] = useState<number>(DEFAULTS.endYear);
  const [futureYears, setFutureYears] = useState(DEFAULTS.futureYears);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);
  // Calendar year for the projection axis; set on the client so server HTML and hydration agree.
  const [baseYear, setBaseYear] = useState<number>(CPI_U_LATEST.year);
  useEffect(() => setBaseYear(new Date().getFullYear()), []);

  const handleReset = useCallback(() => {
    setAmount(DEFAULTS.amount);
    setStartYear(DEFAULTS.startYear);
    setEndYear(DEFAULTS.endYear);
    setFutureYears(DEFAULTS.futureYears);
    setInflationRate(DEFAULTS.inflationRate);
  }, []);

  /* ── Core calculations (src/lib/inflation.ts) ────────────── */
  const historicalResult = useMemo(() => adjustForInflation(amount, startYear, endYear), [amount, startYear, endYear]);
  const futureResult = useMemo(() => projectInflation(amount, inflationRate / 100, futureYears), [amount, inflationRate, futureYears]);

  const animatedHistorical = useAnimatedNumber(historicalResult?.adjusted ?? 0);
  const animatedFuture = useAnimatedNumber(futureResult.futureCost);

  const startLabel = cpiYearLabel(startYear);
  const endLabel = cpiYearLabel(endYear);
  const backwards = endYear < startYear;

  const liveText = mode === 'historical'
    ? historicalResult
      ? `${usd(amount)} in ${startLabel} equals ${usd(historicalResult.adjusted)} in ${endLabel} prices.`
      : 'Choose two different years to compare.'
    : `${usd(amount)} today will cost ${usd(futureResult.futureCost)} in ${futureYears} years at ${inflationRate.toFixed(1)}% inflation.`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Mode', value: mode === 'historical' ? 'Historical' : 'Future Projection' },
      { label: 'Dollar Amount', value: usd(amount) },
    ];
    if (mode === 'historical') {
      inputs.push(
        { label: 'Start Year', value: startLabel },
        { label: 'End Year', value: endLabel },
      );
    } else {
      inputs.push(
        { label: 'Years Into Future', value: `${futureYears} years` },
        { label: 'Assumed Annual Inflation', value: `${inflationRate.toFixed(1)}%` },
      );
    }
    return inputs;
  }, [mode, amount, startLabel, endLabel, futureYears, inflationRate]);

  const getResults = useCallback((): ResultItem[] => {
    if (mode === 'historical') {
      if (!historicalResult) return [{ label: 'Result', value: 'Choose two different years to compare', highlight: true }];
      return [
        { label: `${usd(amount)} in ${startLabel} equals (in ${endLabel} prices)`, value: usd(historicalResult.adjusted), highlight: true },
        { label: 'Average Annual Inflation', value: `${(historicalResult.averageAnnual * 100).toFixed(2)}%` },
        { label: 'Cumulative Inflation', value: `${(historicalResult.cumulativeChange * 100).toFixed(1)}%` },
        { label: 'Data', value: `${CPI_SOURCE.name}; latest month ${CPI_U_LATEST.label}` },
      ];
    }
    return [
      { label: `${usd(amount)} today will cost`, value: usd(futureResult.futureCost), highlight: true },
      { label: 'Purchasing Power Lost', value: usd(amount - futureResult.purchasingPower) },
    ];
  }, [mode, amount, startLabel, endLabel, historicalResult, futureResult]);

  /* ── Chart + table rows ──────────────────────────────────── */
  const chartRows = useMemo(() => {
    if (mode === 'historical') {
      if (!historicalResult) return [];
      // Amount anchored at the start year, expressed in each year's prices.
      return historicalSeries(amount, startYear, endYear).map((r) => ({ year: r.year, value: Math.round(r.value), original: amount }));
    }
    const rows: Array<Record<string, number>> = [];
    for (let y = 0; y <= futureYears; y++) {
      const p = projectInflation(amount, inflationRate / 100, y);
      rows.push({ year: baseYear + y, futureCost: Math.round(p.futureCost), purchasingPower: Math.round(p.purchasingPower) });
    }
    return rows;
  }, [mode, amount, startYear, endYear, futureYears, inflationRate, historicalResult, baseYear]);

  /* ── Tabs: APG keyboard pattern ──────────────────────────── */
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
    document.getElementById(`inf-tab-${TABS[next].key}`)?.focus();
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200/80" role="tablist" aria-label="Inflation calculation mode">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            id={`inf-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={mode === tab.key}
            aria-controls="inf-results"
            tabIndex={mode === tab.key ? 0 : -1}
            onClick={() => setMode(tab.key)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
              mode === tab.key
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/40'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              {mode === 'historical' ? 'Historical Lookup' : 'Future Projection'}
            </h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60 mb-5">
            <p className="text-xs text-neutral-500 leading-relaxed">
              Historical mode uses US CPI data ({CPI_FIRST_YEAR}–{CPI_U_LATEST.label}); projections apply to any currency.
            </p>
          </div>
          <div className="space-y-5">
            <SliderInput label="Dollar Amount" id="inf-amount" value={amount} min={1} max={500000} step={1000} textMax={10000000} minLabel="$1" maxLabel="$500K" onChange={setAmount} prefix="$" formatDisplay={formatNumber} hint="The amount you want to check" />

            {mode === 'historical' ? (
              <>
                <SliderInput label="Start Year" id="inf-start" value={startYear} min={CPI_FIRST_YEAR} max={CPI_LAST_YEAR} step={1} onChange={setStartYear} formatDisplay={(v) => String(Math.round(v))} hint="The year the amount is from" />
                <SliderInput
                  label="End Year"
                  id="inf-end"
                  value={endYear}
                  min={CPI_FIRST_YEAR}
                  max={CPI_LAST_YEAR}
                  step={1}
                  onChange={setEndYear}
                  formatDisplay={(v) => String(Math.round(v))}
                  hint={`The year whose prices to use. ${CPI_LAST_YEAR} uses the latest month, ${CPI_U_LATEST.label}.`}
                />
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60">
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Using U.S. Bureau of Labor Statistics CPI-U annual averages ({CPI_FIRST_YEAR}–{CPI_LAST_YEAR - 1}) and the latest monthly index ({CPI_U_LATEST.label}).{' '}
                    <a href={CPI_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-primary-700 underline underline-offset-2 hover:text-primary-800">
                      BLS data
                    </a>
                  </p>
                </div>
              </>
            ) : (
              <>
                <SliderInput label="Years Into Future" id="inf-future" value={futureYears} min={1} max={100} step={1} onChange={setFutureYears} />
                <SliderInput label="Assumed Annual Inflation Rate" id="inf-rate" value={inflationRate} min={0} max={15} step={0.1} onChange={setInflationRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="How fast prices rise each year — ~3% is the US long-term average" />
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <div id="inf-results" role="tabpanel" aria-labelledby={`inf-tab-${mode}`} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <p className="sr-only" aria-live="polite">{liveText}</p>

          {mode === 'historical' && historicalResult && (
            <>
              <div data-pdf-section className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">{usd(amount)} in {startLabel} equals</p>
                <p data-headline-result data-headline-label={`${usd(amount)} in ${startLabel} equals`} className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  {usd(animatedHistorical)}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  in {endLabel} prices ({yearsText(historicalResult.years)}, {(historicalResult.cumulativeChange * 100).toFixed(1)}% cumulative {historicalResult.cumulativeChange >= 0 ? 'inflation' : 'deflation'}{backwards ? `, counting back from ${startLabel}` : ''})
                </p>
              </div>
              <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Percent size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Avg. Annual Inflation</p>
                    <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                      {(historicalResult.averageAnnual * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5"><Wallet size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">{endLabel} Purchasing Power</p>
                    <p className="text-lg font-semibold text-red-600 tabular-nums">
                      {usd(historicalResult.adjusted > 0 ? (amount * amount) / historicalResult.adjusted : 0)}
                    </p>
                    <p className="text-xs text-neutral-500">{startLabel} value of {usd(amount)} in {endLabel}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'historical' && !historicalResult && (
            <div className="text-sm text-neutral-500 mb-6">
              Choose two different years to compare.
            </div>
          )}

          {mode === 'future' && (
            <>
              <div data-pdf-section className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">{usd(amount)} today will cost</p>
                <p data-headline-result data-headline-label={`${usd(amount)} today will cost`} className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
                  {usd(animatedFuture)}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  in {futureYears} years at {inflationRate.toFixed(1)}% annual inflation ({(futureResult.totalInflation * 100).toFixed(1)}% total)
                </p>
              </div>
              <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5"><Wallet size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Your {usd(amount)} Will Buy</p>
                    <p className="text-lg font-semibold text-red-600 tabular-nums">{usd(futureResult.purchasingPower)}</p>
                    <p className="text-xs text-neutral-500">worth of today's goods</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><ArrowUpDown size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Purchasing Power Lost</p>
                    <p className="text-lg font-semibold text-red-600 tabular-nums">{usd(amount - futureResult.purchasingPower)}</p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {amount > 0 ? `${((1 - futureResult.purchasingPower / amount) * 100).toFixed(1)}% decrease` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="inflation" toolName="Inflation Calculator" />
            <EmailResultsButton toolSlug="inflation" toolName="Inflation Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Inflation Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          {chartRows.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                {mode === 'historical' ? 'Value Over Time' : 'Purchasing Power Over Time'}
              </h3>
              <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} />}>
                <InflationChart
                  mode={mode}
                  rows={chartRows}
                  height={CHART_HEIGHT}
                  yearLabel={cpiYearLabel}
                  ariaLabel={mode === 'historical' && historicalResult
                    ? `${usd(amount)} from ${startLabel} expressed in each year's prices up to ${endLabel}, reaching ${usd(historicalResult.adjusted)}.`
                    : `${usd(amount)} over the next ${futureYears} years at ${inflationRate.toFixed(1)}% inflation: future cost rises to ${usd(futureResult.futureCost)} while purchasing power falls to ${usd(futureResult.purchasingPower)}.`}
                />
              </Suspense>
              <ChartDataTable
                className="mt-3"
                caption={mode === 'historical' ? `${usd(amount)} from ${startLabel} in each year's prices` : 'Future cost and purchasing power by year'}
                columns={mode === 'historical'
                  ? [
                      { key: 'year', label: 'Year', numeric: true, format: (v) => cpiYearLabel(Number(v)) },
                      { key: 'value', label: `Value of ${usd(amount)} from ${startLabel}`, format: (v) => usd(Number(v)) },
                    ]
                  : [
                      { key: 'year', label: 'Year', numeric: true },
                      { key: 'futureCost', label: 'Future cost', format: (v) => usd(Number(v)) },
                      { key: 'purchasingPower', label: 'Purchasing power', format: (v) => usd(Number(v)) },
                    ]}
                rows={chartRows}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { RotateCcw, DollarSign, Calendar } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatNumber } from '../../lib/calculator-utils';
import { calcRoi, type RoiResult } from '../../lib/roi';
import { formatMoneyGuarded, formatPercentGuarded, EXTREME_PERCENT } from '../../lib/result-format';
import LiveResult from './fields/LiveResult';
import { lazyChart } from './charts/InvestDebtLazyChart';

const RoiChart = lazyChart(() => import('./charts/RoiChart'));

const DEFAULTS = {
  initialInvestment: 10000,
  finalValue: 15000,
  yearsHeld: 3,
  dividendsReceived: 500,
};

/** Annualized return text: '--' when undefined (no holding period). */
const annualText = (r: RoiResult) => (r.annualizedReturn === null ? '--' : formatPercentGuarded(r.annualizedReturn));
/** Very large percentages are capped on the chart so one bar cannot flatten the other. */
const chartPct = (fraction: number | null) => {
  if (fraction === null || !Number.isFinite(fraction)) return 0;
  const pct = fraction * 100;
  return Math.max(-EXTREME_PERCENT, Math.min(EXTREME_PERCENT, pct));
};

export default function RoiCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const [initialInvestment, setInitialInvestment] = useState(DEFAULTS.initialInvestment);
  const [finalValue, setFinalValue] = useState(DEFAULTS.finalValue);
  const [yearsHeld, setYearsHeld] = useState(DEFAULTS.yearsHeld);
  const [dividendsReceived, setDividendsReceived] = useState(DEFAULTS.dividendsReceived);

  // Comparison mode
  const [showComparison, setShowComparison] = useState(false);
  const [initialB, setInitialB] = useState(10000);
  const [finalB, setFinalB] = useState(13000);
  const [yearsB, setYearsB] = useState(3);
  const [dividendsB, setDividendsB] = useState(0);

  const handleReset = useCallback(() => {
    setInitialInvestment(DEFAULTS.initialInvestment);
    setFinalValue(DEFAULTS.finalValue);
    setYearsHeld(DEFAULTS.yearsHeld);
    setDividendsReceived(DEFAULTS.dividendsReceived);
    setShowComparison(false);
    setInitialB(10000);
    setFinalB(13000);
    setYearsB(3);
    setDividendsB(0);
  }, []);

  const resultA = useMemo(
    () => calcRoi(initialInvestment, finalValue, dividendsReceived, yearsHeld),
    [initialInvestment, finalValue, yearsHeld, dividendsReceived]
  );
  const resultB = useMemo(
    () => (showComparison ? calcRoi(initialB, finalB, dividendsB, yearsB) : null),
    [showComparison, initialB, finalB, yearsB, dividendsB]
  );

  const totalPctA = resultA.totalReturn * 100;
  const animatedTotalReturn = useAnimatedNumber(Math.abs(totalPctA) < EXTREME_PERCENT ? totalPctA : 0);
  const headline = Math.abs(totalPctA) < EXTREME_PERCENT ? formatPercentGuarded(animatedTotalReturn / 100) : formatPercentGuarded(resultA.totalReturn);
  const extremeA = Math.abs(totalPctA) >= EXTREME_PERCENT || (resultA.annualizedReturn !== null && Math.abs(resultA.annualizedReturn * 100) >= EXTREME_PERCENT);

  const chartData = useMemo(() => {
    const items = [{ name: 'Investment A', 'Total Return': chartPct(resultA.totalReturn), Annualized: chartPct(resultA.annualizedReturn) }];
    if (resultB) items.push({ name: 'Investment B', 'Total Return': chartPct(resultB.totalReturn), Annualized: chartPct(resultB.annualizedReturn) });
    return items;
  }, [resultA, resultB]);

  const tableRows = useMemo(() => {
    const rows = [{ name: 'Investment A', total: formatPercentGuarded(resultA.totalReturn), annual: annualText(resultA) }];
    if (resultB) rows.push({ name: 'Investment B', total: formatPercentGuarded(resultB.totalReturn), annual: annualText(resultB) });
    return rows;
  }, [resultA, resultB]);

  const yearsText = (y: number) => `${y} year${y !== 1 ? 's' : ''}`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Initial Investment (A)', value: fmt(initialInvestment) },
      { label: 'Final Value (A)', value: fmt(finalValue) },
      { label: 'Dividends Received (A)', value: fmt(dividendsReceived) },
      { label: 'Time Held (A)', value: yearsText(yearsHeld) },
    ];
    if (showComparison) {
      inputs.push(
        { label: 'Initial Investment (B)', value: fmt(initialB) },
        { label: 'Final Value (B)', value: fmt(finalB) },
        { label: 'Dividends Received (B)', value: fmt(dividendsB) },
        { label: 'Time Held (B)', value: yearsText(yearsB) },
      );
    }
    return inputs;
  }, [initialInvestment, finalValue, dividendsReceived, yearsHeld, showComparison, initialB, finalB, dividendsB, yearsB, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Total Return', value: formatPercentGuarded(resultA.totalReturn), highlight: true },
      { label: 'Annualized Return', value: annualText(resultA) },
      { label: resultA.totalGain < 0 ? 'Net Loss' : 'Net Profit', value: fmt(resultA.totalGain) },
    ];
    if (resultB) {
      items.push(
        { label: 'Investment B Total Return', value: formatPercentGuarded(resultB.totalReturn) },
        { label: 'Investment B Annualized Return', value: annualText(resultB) },
      );
    }
    return items;
  }, [resultA, resultB, currency]);

  const pctClass = (v: number | null) => (v !== null && v < 0 ? 'text-red-600' : 'text-neutral-900');

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Investment Details</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Investment A</p>
            <SliderInput label="Initial Investment" id="roi-initial" value={initialInvestment} min={100} max={500000} step={1000} textMax={10000000} minLabel={`${currencySymbol}100`} maxLabel={`${currencySymbol}500K`} onChange={setInitialInvestment} prefix={currencySymbol} formatDisplay={formatNumber} hint="How much you originally put in" />
            <SliderInput label="Final Value" id="roi-final" value={finalValue} min={0} max={1000000} step={2500} textMax={20000000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}1M`} onChange={setFinalValue} prefix={currencySymbol} formatDisplay={formatNumber} hint="What your investment is worth now (or when you sold)" />
            <SliderInput label="Dividends / Income Received" id="roi-div" value={dividendsReceived} min={0} max={20000} step={50} textMax={100000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}20K`} onChange={setDividendsReceived} prefix={currencySymbol} formatDisplay={formatNumber} hint="Total cash payments received over the holding period" />
            <SliderInput label="Time Held (Years)" id="roi-years" value={yearsHeld} min={0.25} max={100} step={0.25} onChange={setYearsHeld} formatDisplay={(v) => v.toFixed(v % 1 === 0 ? 0 : 2)} hint="How long you held the investment; use 0.5 for 6 months" />

            <div className="h-px bg-neutral-200/80" />

            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="w-full text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-150 text-left"
              aria-expanded={showComparison}
              aria-controls="roi-compare"
            >
              {showComparison ? '- Hide comparison' : '+ Compare with another investment'}
            </button>

            <div
              id="roi-compare"
              inert={showComparison ? undefined : true}
              aria-hidden={showComparison ? undefined : true}
              className={`grid grid-cols-1 transition-all duration-200 ${showComparison ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 -mt-5'}`}
            >
              <div className="min-h-0 overflow-hidden">
              <div className="space-y-5 pt-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Investment B</p>
                <SliderInput label="Initial Investment" id="roi-initial-b" value={initialB} min={100} max={500000} step={1000} textMax={10000000} minLabel={`${currencySymbol}100`} maxLabel={`${currencySymbol}500K`} onChange={setInitialB} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Final Value" id="roi-final-b" value={finalB} min={0} max={1000000} step={2500} textMax={20000000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}1M`} onChange={setFinalB} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Dividends / Income Received" id="roi-div-b" value={dividendsB} min={0} max={20000} step={50} textMax={100000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}20K`} onChange={setDividendsB} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Time Held (Years)" id="roi-years-b" value={yearsB} min={0.25} max={100} step={0.25} onChange={setYearsB} formatDisplay={(v) => v.toFixed(v % 1 === 0 ? 0 : 2)} />
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <LiveResult text={`Total return ${formatPercentGuarded(resultA.totalReturn)}, ${annualText(resultA)} a year.`} />
          {/* Investment A results */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{showComparison ? 'Investment A: ' : ''}Total Return</p>
            <p data-headline-result data-headline-label="Total Return" className={`text-3xl sm:text-4xl font-bold tabular-nums ${resultA.totalReturn >= 0 ? 'result-number' : 'text-red-600'}`}>
              {headline}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {resultA.totalGain >= 0 ? 'Gained' : 'Lost'} {fmt(Math.abs(resultA.totalGain))} over {yearsText(yearsHeld)}
            </p>
            {extremeA && (
              <p className="text-sm text-red-600 mt-1.5 leading-relaxed">That return is beyond anything realistic. Check your inputs.</p>
            )}
            {resultA.totalReturn <= -1 && (
              <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">A total loss is -100% a year however long it was held.</p>
            )}
          </div>

          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Calendar size={16} aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Annualized Return</p>
                <p className={`text-lg font-semibold tabular-nums break-words ${pctClass(resultA.annualizedReturn)}`}>{annualText(resultA)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${resultA.totalGain >= 0 ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}><DollarSign size={16} aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Gain / Loss</p>
                <p className={`text-lg font-semibold tabular-nums break-words ${resultA.totalGain >= 0 ? 'text-success-600' : 'text-red-600'}`}>{fmt(resultA.totalGain)}</p>
              </div>
            </div>
          </div>

          {/* Investment B results */}
          {resultB && (
            <div data-pdf-section>
              <div className="h-px bg-neutral-200/80 mb-6" />
              <div className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">Investment B: Total Return</p>
                <p className={`text-2xl font-bold tabular-nums ${resultB.totalReturn >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                  {formatPercentGuarded(resultB.totalReturn)}
                </p>
                <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                  {resultB.totalGain >= 0 ? 'Gained' : 'Lost'} {fmt(Math.abs(resultB.totalGain))} over {yearsText(yearsB)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Calendar size={16} aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 mb-0.5">Annualized Return</p>
                    <p className={`text-lg font-semibold tabular-nums break-words ${pctClass(resultB.annualizedReturn)}`}>{annualText(resultB)}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${resultB.totalGain >= 0 ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}><DollarSign size={16} aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 mb-0.5">Total Gain / Loss</p>
                    <p className={`text-lg font-semibold tabular-nums break-words ${resultB.totalGain >= 0 ? 'text-success-600' : 'text-red-600'}`}>{fmt(resultB.totalGain)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="roi" toolName="ROI Calculator" />
            <EmailResultsButton toolSlug="roi" toolName="ROI Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="ROI Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Comparison chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">{showComparison ? 'Return Comparison' : 'Return Breakdown'}</h3>
            <div className="h-[220px]">
              <Suspense fallback={<ChartSkeleton height="100%" />}>
                <RoiChart
                  data={chartData}
                  ariaLabel={`Bar chart of total and annualized return${showComparison ? ' for both investments' : ''}; use Show data for the figures.`}
                />
              </Suspense>
            </div>
            <ChartDataTable
              className="mt-3"
              caption="Total and annualized return"
              columns={[
                { key: 'name', label: 'Investment' },
                { key: 'total', label: 'Total return' },
                { key: 'annual', label: 'Annualized' },
              ]}
              rows={tableRows}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

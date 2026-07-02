import { useState, useMemo, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { RotateCcw, DollarSign, Calendar } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { useChartTheme } from '../../lib/useChartTheme';

const DEFAULTS = {
  initialInvestment: 10000,
  finalValue: 15000,
  yearsHeld: 3,
  dividendsReceived: 500,
};

function calcROI(initial: number, final: number, dividends: number) {
  if (initial <= 0) return { totalGain: 0, totalReturn: 0, annualizedReturn: 0 };
  const totalGain = final + dividends - initial;
  const totalReturn = totalGain / initial;
  return { totalGain, totalReturn, annualizedReturn: 0 };
}

function annualizedROI(totalReturn: number, years: number): number {
  if (years <= 0 || totalReturn <= -1) return 0;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

export default function RoiCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const [initialInvestment, setInitialInvestment] = useState(DEFAULTS.initialInvestment);
  const [finalValue, setFinalValue] = useState(DEFAULTS.finalValue);
  const [yearsHeld, setYearsHeld] = useState(DEFAULTS.yearsHeld);
  const [dividendsReceived, setDividendsReceived] = useState(DEFAULTS.dividendsReceived);
  const ct = useChartTheme();

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

  const resultA = useMemo(() => {
    const r = calcROI(initialInvestment, finalValue, dividendsReceived);
    const ann = annualizedROI(r.totalReturn, yearsHeld);
    return { ...r, annualizedReturn: ann };
  }, [initialInvestment, finalValue, yearsHeld, dividendsReceived]);

  const resultB = useMemo(() => {
    if (!showComparison) return null;
    const r = calcROI(initialB, finalB, dividendsB);
    const ann = annualizedROI(r.totalReturn, yearsB);
    return { ...r, annualizedReturn: ann };
  }, [showComparison, initialB, finalB, yearsB, dividendsB]);

  const animatedTotalReturn = useAnimatedNumber(resultA.totalReturn * 100);

  const chartData = useMemo(() => {
    const items = [
      { name: 'Investment A', 'Total Return': resultA.totalReturn * 100, 'Annualized': resultA.annualizedReturn * 100 },
    ];
    if (resultB) {
      items.push({ name: 'Investment B', 'Total Return': resultB.totalReturn * 100, 'Annualized': resultB.annualizedReturn * 100 });
    }
    return items;
  }, [resultA, resultB]);

  const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Initial Investment (A)', value: fmt(initialInvestment) },
      { label: 'Final Value (A)', value: fmt(finalValue) },
      { label: 'Dividends Received (A)', value: fmt(dividendsReceived) },
      { label: 'Time Held (A)', value: `${yearsHeld} year${yearsHeld !== 1 ? 's' : ''}` },
    ];
    if (showComparison) {
      inputs.push(
        { label: 'Initial Investment (B)', value: fmt(initialB) },
        { label: 'Final Value (B)', value: fmt(finalB) },
        { label: 'Dividends Received (B)', value: fmt(dividendsB) },
        { label: 'Time Held (B)', value: `${yearsB} year${yearsB !== 1 ? 's' : ''}` },
      );
    }
    return inputs;
  }, [initialInvestment, finalValue, dividendsReceived, yearsHeld, showComparison, initialB, finalB, dividendsB, yearsB, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Total Return', value: `${(resultA.totalReturn * 100).toFixed(2)}%`, highlight: true },
    { label: 'Annualized Return', value: `${(resultA.annualizedReturn * 100).toFixed(2)}%` },
    { label: 'Net Profit', value: fmt(resultA.totalGain) },
  ], [resultA, currency]);

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
            <SliderInput label="Time Held (Years)" id="roi-years" value={yearsHeld} min={0.25} max={100} step={0.25} onChange={setYearsHeld} formatDisplay={(v) => v.toFixed(v % 1 === 0 ? 0 : 2)} hint="How long you held the investment — use 0.5 for 6 months" />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <button
              onClick={() => setShowComparison(!showComparison)}
              className="w-full text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-150 text-left"
              aria-expanded={showComparison}
            >
              {showComparison ? '− Hide comparison' : '+ Compare with another investment'}
            </button>

            {showComparison && (
              <div className="space-y-5 pt-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Investment B</p>
                <SliderInput label="Initial Investment" id="roi-initial-b" value={initialB} min={100} max={500000} step={1000} textMax={10000000} minLabel={`${currencySymbol}100`} maxLabel={`${currencySymbol}500K`} onChange={setInitialB} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Final Value" id="roi-final-b" value={finalB} min={0} max={1000000} step={2500} textMax={20000000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}1M`} onChange={setFinalB} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Dividends / Income Received" id="roi-div-b" value={dividendsB} min={0} max={20000} step={50} textMax={100000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}20K`} onChange={setDividendsB} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Time Held (Years)" id="roi-years-b" value={yearsB} min={0.25} max={100} step={0.25} onChange={setYearsB} formatDisplay={(v) => v.toFixed(v % 1 === 0 ? 0 : 2)} />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite" ref={resultsRef}>
          {/* Investment A results */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{showComparison ? 'Investment A — ' : ''}Total Return</p>
            <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${resultA.totalReturn >= 0 ? 'result-number' : 'text-red-600'}`}>
              {animatedTotalReturn.toFixed(2)}%
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {resultA.totalGain >= 0 ? 'Gained' : 'Lost'} {fmt(Math.abs(resultA.totalGain))} over {yearsHeld} year{yearsHeld !== 1 ? 's' : ''}
            </p>
          </div>

          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Calendar size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Annualized Return</p>
                <p className={`text-lg font-semibold tabular-nums ${resultA.annualizedReturn >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                  {fmtPct(resultA.annualizedReturn)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${resultA.totalGain >= 0 ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}><DollarSign size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Gain / Loss</p>
                <p className={`text-lg font-semibold tabular-nums ${resultA.totalGain >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                  {fmt(resultA.totalGain)}
                </p>
              </div>
            </div>
          </div>

          {/* Investment B results */}
          {resultB && (
            <div data-pdf-section>
              <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-6" />
              <div className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">Investment B — Total Return</p>
                <p className={`text-2xl font-bold tabular-nums ${resultB.totalReturn >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                  {fmtPct(resultB.totalReturn)}
                </p>
                <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                  {resultB.totalGain >= 0 ? 'Gained' : 'Lost'} {fmt(Math.abs(resultB.totalGain))} over {yearsB} year{yearsB !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Calendar size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Annualized Return</p>
                    <p className={`text-lg font-semibold tabular-nums ${resultB.annualizedReturn >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                      {fmtPct(resultB.annualizedReturn)}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${resultB.totalGain >= 0 ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}><DollarSign size={16} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-0.5">Total Gain / Loss</p>
                    <p className={`text-lg font-semibold tabular-nums ${resultB.totalGain >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                      {fmt(resultB.totalGain)}
                    </p>
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
            <h3 className="text-sm font-medium text-neutral-700 mb-3">
              {showComparison ? 'Return Comparison' : 'Return Breakdown'}
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={{ stroke: ct.axis }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    tick={{ fontSize: 12, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    content={<ChartTooltip labelPrefix="" formatValue={(v) => `${v.toFixed(2)}%`} />}
                  />
                  <Bar dataKey="Total Return" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#0B6E6E' : '#7C3AED'} />
                    ))}
                  </Bar>
                  <Bar dataKey="Annualized" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#60A5FA' : '#A78BFA'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

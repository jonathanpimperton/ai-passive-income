import { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { RotateCcw, Target, TrendingUp } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useChartTheme } from '../../lib/useChartTheme';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { emergencyTargets, fundPath, type TimeToTargetResult } from '../../lib/emergency-fund';
import { monthLabel } from './charts/chart-format';

const EmergencyFundChart = lazy(() => import('./charts/EmergencyFundChart'));
const CHART_HEIGHT = 260;

const DEFAULTS = {
  housing: 1500,
  food: 600,
  transportation: 400,
  utilities: 200,
  insurance: 300,
  debtPayments: 200,
  other: 300,
  currentSavings: 2000,
  monthlySaving: 500,
  savingsRate: 4,
};

const TARGET_LABELS: Record<number, string> = { 3: '3 Months', 6: '6 Months', 12: '12 Months' };

/** "8 mo", "3y 2mo", or a plain-English reason when the target is never reached. */
function timeLabel(t: TimeToTargetResult): string {
  if (t.status === 'funded') return 'Fully funded';
  if (t.status === 'never') return t.reason === 'no-saving' ? 'Add a monthly amount to reach this' : 'More than 50 years at this rate';
  const span = t.months < 12 ? `${t.months} mo` : `${Math.floor(t.months / 12)}y ${t.months % 12}mo`;
  return t.interestOnly ? `${span} (interest only)` : span;
}

export default function EmergencyFundCalc() {
  const ct = useChartTheme();
  // Target identity colors from the chart theme: 6 months is the recommended
  // (primary) target, 3 months the quiet milestone, 12 months the stretch goal.
  const TARGET_COLORS: Record<number, string> = {
    3: ct.segments[1],
    6: ct.series1,
    12: ct.segments[2],
  };
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  // Region-aware wording: US quotes APY, UK quotes AER, EUR stays generic.
  // The model treats the rate as an annual equivalent rate (compounding included).
  const region = currency === 'GBP' ? 'uk' : currency === 'EUR' ? 'eur' : 'us';
  const savingsRateLabel =
    region === 'uk' ? 'Savings interest rate (AER)' : region === 'eur' ? 'Savings interest rate (annual)' : 'Savings interest rate (APY)';
  const savingsRateHint =
    region === 'uk'
      ? 'Interest rate on your savings account — easy-access savings accounts offer ~4-5%'
      : region === 'eur'
        ? 'Annual equivalent rate on your savings account'
        : 'Interest rate on your savings account — high-yield accounts offer ~4-5%';
  const [housing, setHousing] = useState(DEFAULTS.housing);
  const [food, setFood] = useState(DEFAULTS.food);
  const [transportation, setTransportation] = useState(DEFAULTS.transportation);
  const [utilities, setUtilities] = useState(DEFAULTS.utilities);
  const [insurance, setInsurance] = useState(DEFAULTS.insurance);
  const [debtPayments, setDebtPayments] = useState(DEFAULTS.debtPayments);
  const [other, setOther] = useState(DEFAULTS.other);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.currentSavings);
  const [monthlySaving, setMonthlySaving] = useState(DEFAULTS.monthlySaving);
  const [savingsRate, setSavingsRate] = useState(DEFAULTS.savingsRate);

  const handleReset = useCallback(() => {
    setHousing(DEFAULTS.housing);
    setFood(DEFAULTS.food);
    setTransportation(DEFAULTS.transportation);
    setUtilities(DEFAULTS.utilities);
    setInsurance(DEFAULTS.insurance);
    setDebtPayments(DEFAULTS.debtPayments);
    setOther(DEFAULTS.other);
    setCurrentSavings(DEFAULTS.currentSavings);
    setMonthlySaving(DEFAULTS.monthlySaving);
    setSavingsRate(DEFAULTS.savingsRate);
  }, []);

  const monthlyExpenses = housing + food + transportation + utilities + insurance + debtPayments + other;
  const aer = savingsRate / 100;

  /* ── Core calculation (src/lib/emergency-fund.ts) ────────── */
  const targets = useMemo(
    () => emergencyTargets({ monthlyExpenses, current: currentSavings, monthly: monthlySaving, aer }),
    [monthlyExpenses, currentSavings, monthlySaving, aer],
  );
  const sixMonth = targets[1];
  const recommended = monthlyExpenses * 6;

  const chartRows = useMemo(() => {
    const reachable = targets
      .map((t) => (t.time.status === 'ok' ? t.time.months : null))
      .filter((m): m is number => m !== null);
    const horizon = Math.min(60, Math.max(12, ...reachable.map((m) => m + 3)));
    return fundPath(currentSavings, monthlySaving, aer, horizon);
  }, [targets, currentSavings, monthlySaving, aer]);

  const animatedRecommendedTarget = useAnimatedNumber(recommended);

  const liveText = monthlyExpenses <= 0
    ? 'Enter your monthly expenses to see your targets.'
    : `Recommended target ${fmt(recommended)}; ${sixMonth.time.status === 'ok' ? `reached in ${timeLabel(sixMonth.time)}` : timeLabel(sixMonth.time).toLowerCase()}.`;

  const getInputs = useCallback(() => [
    { label: 'Housing / Rent', value: fmt(housing) },
    { label: 'Food & Groceries', value: fmt(food) },
    { label: 'Transportation', value: fmt(transportation) },
    { label: 'Utilities', value: fmt(utilities) },
    { label: 'Insurance', value: fmt(insurance) },
    { label: 'Debt Payments', value: fmt(debtPayments) },
    { label: 'Other Expenses', value: fmt(other) },
    { label: 'Total Monthly Expenses', value: fmt(monthlyExpenses) },
    { label: 'Current Emergency Savings', value: fmt(currentSavings) },
    { label: 'Monthly Savings Contribution', value: fmt(monthlySaving) },
    { label: savingsRateLabel, value: `${savingsRate.toFixed(1)}%` },
  ], [housing, food, transportation, utilities, insurance, debtPayments, other, monthlyExpenses, currentSavings, monthlySaving, savingsRate, savingsRateLabel, currency]);

  const getResults = useCallback((): ResultItem[] => {
    if (monthlyExpenses <= 0) {
      return [{ label: 'Recommended Target (6 months)', value: 'Enter your monthly expenses to see a target', highlight: true }];
    }
    return [
      { label: 'Recommended Target (6 months)', value: fmt(recommended), highlight: true },
      { label: 'Monthly Contribution', value: fmt(monthlySaving) },
      { label: 'Time to Reach 6-Month Target', value: sixMonth.time.status === 'funded' ? 'Already funded' : timeLabel(sixMonth.time) },
    ];
  }, [monthlyExpenses, recommended, monthlySaving, sixMonth, currency]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Monthly Expenses</h2>
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
            <SliderInput label="Housing / Rent" id="ef-housing" value={housing} min={0} max={5000} step={25} textMax={15000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}5K`} onChange={setHousing} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Food & Groceries" id="ef-food" value={food} min={0} max={2000} step={10} textMax={5000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}2K`} onChange={setFood} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Transportation" id="ef-transport" value={transportation} min={0} max={2000} step={10} textMax={5000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}2K`} onChange={setTransportation} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Utilities" id="ef-utilities" value={utilities} min={0} max={1000} step={5} textMax={3000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}1K`} onChange={setUtilities} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Insurance" id="ef-insurance" value={insurance} min={0} max={2000} step={10} textMax={5000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}2K`} onChange={setInsurance} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Debt Payments" id="ef-debt" value={debtPayments} min={0} max={5000} step={25} textMax={10000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}5K`} onChange={setDebtPayments} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Other Expenses" id="ef-other" value={other} min={0} max={2000} step={10} textMax={5000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}2K`} onChange={setOther} prefix={currencySymbol} formatDisplay={formatNumber} />

            <div className="h-px bg-neutral-200/80" />

            <div className="bg-primary-50/60 rounded-xl p-4 border border-primary-100/60">
              <p className="text-xs text-neutral-500 mb-0.5">Total Monthly Expenses</p>
              <p className="text-xl font-bold text-primary-900 tabular-nums">{fmt(monthlyExpenses)}</p>
            </div>

            <SliderInput label="Current Emergency Savings" id="ef-current" value={currentSavings} min={0} max={100000} step={250} textMax={500000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}100K`} onChange={setCurrentSavings} prefix={currencySymbol} formatDisplay={formatNumber} hint="Cash you have set aside for unexpected expenses" />
            <SliderInput label="Monthly Savings Contribution" id="ef-monthly" value={monthlySaving} min={0} max={5000} step={25} textMax={50000} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}5K`} onChange={setMonthlySaving} prefix={currencySymbol} formatDisplay={formatNumber} hint="Amount you can put toward your emergency fund each month" />
            <SliderInput label={savingsRateLabel} id="ef-rate" value={savingsRate} min={0} max={10} step={0.1} onChange={setSavingsRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint={savingsRateHint} />
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <p className="sr-only" aria-live="polite">{liveText}</p>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Your Emergency Fund Targets</h2>

          {monthlyExpenses <= 0 && (
            <p className="text-sm text-neutral-500 mb-4">Enter your monthly expenses to see your 3, 6 and 12-month targets.</p>
          )}

          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {targets.map((t) => (
              <div key={t.coverMonths} className="bg-white rounded-xl border border-neutral-200/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TARGET_COLORS[t.coverMonths] }} aria-hidden="true" />
                  <p className="text-xs font-medium text-neutral-500">{TARGET_LABELS[t.coverMonths]}</p>
                </div>
                <p className="text-xl font-bold text-neutral-900 tabular-nums">{fmt(t.target)}</p>
                {t.funded >= 1 ? (
                  <p className="text-xs text-success-600 font-medium mt-1">Fully funded</p>
                ) : (
                  <>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-2 overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${t.funded * 100}%`, backgroundColor: TARGET_COLORS[t.coverMonths] }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      <span className="tabular-nums">{fmt(t.remaining)}</span> remaining · <span className="tabular-nums">{timeLabel(t.time)}</span>
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Summary cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Target size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Recommended Target</p>
                <p data-headline-result data-headline-label="Recommended Target" className="text-lg font-semibold result-number tabular-nums">{fmt(animatedRecommendedTarget)}</p>
                <p className="text-xs text-neutral-500">6 months of expenses</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5"><TrendingUp size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Current Progress</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums">
                  {monthlyExpenses > 0 ? `${((currentSavings / recommended) * 100).toFixed(0)}%` : '—'}
                </p>
                <p className="text-xs text-neutral-500">of 6-month target</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="emergency-fund" toolName="Emergency Fund Calculator" />
            <EmailResultsButton toolSlug="emergency-fund" toolName="Emergency Fund Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Emergency Fund Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Savings Growth Timeline</h3>
            <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} />}>
              <EmergencyFundChart
                rows={chartRows}
                targets={targets.map((t) => ({ coverMonths: t.coverMonths, target: t.target }))}
                currency={currency}
                height={CHART_HEIGHT}
                ariaLabel={`Emergency savings over ${chartRows.length - 1} months, from ${fmt(currentSavings)} to ${fmt(chartRows[chartRows.length - 1]?.balance ?? currentSavings)}, against targets of ${targets.map((t) => fmt(t.target)).join(', ')}.`}
              />
            </Suspense>
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
              Interest is earned on the savings you already have as well as on each monthly deposit, at the annual rate entered.
            </p>
            <ChartDataTable
              className="mt-2"
              caption="Emergency savings by month"
              columns={[
                { key: 'month', label: 'When', format: (v) => monthLabel(Number(v)) },
                { key: 'balance', label: 'Savings', format: (v) => fmt(Number(v)) },
              ]}
              rows={chartRows}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

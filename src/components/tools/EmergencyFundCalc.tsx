import { useState, useMemo, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RotateCcw, Target, TrendingUp } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useChartTheme } from '../../lib/useChartTheme';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';

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

const TARGETS = [3, 6, 12] as const;
const TARGET_COLORS: Record<number, string> = { 3: '#F59E0B', 6: '#0B6E6E', 12: '#7C3AED' };
const TARGET_LABELS: Record<number, string> = { 3: '3 Months', 6: '6 Months', 12: '12 Months' };

export default function EmergencyFundCalc() {
  const ct = useChartTheme();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
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

  const targets = useMemo(() => {
    return TARGETS.map((months) => {
      const target = monthlyExpenses * months;
      const remaining = Math.max(0, target - currentSavings);
      const monthlyRate = savingsRate / 100 / 12;

      let monthsToReach: number;
      if (remaining <= 0) {
        monthsToReach = 0;
      } else if (monthlySaving <= 0) {
        monthsToReach = Infinity;
      } else if (monthlyRate <= 0) {
        monthsToReach = Math.ceil(remaining / monthlySaving);
      } else {
        monthsToReach = Math.ceil(
          Math.log((remaining * monthlyRate) / monthlySaving + 1) / Math.log(1 + monthlyRate)
        );
      }

      const pctFunded = target > 0 ? Math.min(1, currentSavings / target) : 1;

      return { months, target, remaining, monthsToReach, pctFunded };
    });
  }, [monthlyExpenses, currentSavings, monthlySaving, savingsRate]);

  const animatedRecommendedTarget = useAnimatedNumber(monthlyExpenses * 6);

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
    { label: 'Savings Account APY', value: `${savingsRate.toFixed(1)}%` },
  ], [housing, food, transportation, utilities, insurance, debtPayments, other, monthlyExpenses, currentSavings, monthlySaving, savingsRate, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const sixMonthTarget = targets.find((t) => t.months === 6);
    const items: ResultItem[] = [
      { label: 'Recommended Target (6 months)', value: fmt(monthlyExpenses * 6), highlight: true },
      { label: 'Monthly Savings Needed', value: fmt(monthlySaving) },
    ];
    if (sixMonthTarget && isFinite(sixMonthTarget.monthsToReach)) {
      const y = Math.floor(sixMonthTarget.monthsToReach / 12);
      const m = sixMonthTarget.monthsToReach % 12;
      const timeStr = y > 0 ? `${y} yr${y !== 1 ? 's' : ''} ${m} mo` : `${m} month${m !== 1 ? 's' : ''}`;
      items.push({ label: 'Time to Reach Goal', value: sixMonthTarget.monthsToReach === 0 ? 'Already funded!' : timeStr });
    }
    return items;
  }, [monthlyExpenses, monthlySaving, targets, currency]);

  const chartData = useMemo(() => {
    const maxMonths = Math.min(
      60,
      Math.max(12, ...targets.map((t) => (isFinite(t.monthsToReach) ? t.monthsToReach + 3 : 24)))
    );
    const monthlyRate = savingsRate / 100 / 12;
    const data = [];
    for (let m = 0; m <= maxMonths; m++) {
      let balance: number;
      if (monthlyRate > 0) {
        balance =
          currentSavings * Math.pow(1 + monthlyRate, m) +
          monthlySaving * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate);
      } else {
        balance = currentSavings + monthlySaving * m;
      }
      data.push({ month: m, Savings: Math.round(balance) });
    }
    return data;
  }, [currentSavings, monthlySaving, savingsRate, targets]);

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
            <SliderInput label="Housing / Rent" id="ef-housing" value={housing} min={0} max={15000} step={100} onChange={setHousing} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Food & Groceries" id="ef-food" value={food} min={0} max={5000} step={50} onChange={setFood} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Transportation" id="ef-transport" value={transportation} min={0} max={5000} step={50} onChange={setTransportation} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Utilities" id="ef-utilities" value={utilities} min={0} max={3000} step={25} onChange={setUtilities} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Insurance" id="ef-insurance" value={insurance} min={0} max={5000} step={50} onChange={setInsurance} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Debt Payments" id="ef-debt" value={debtPayments} min={0} max={10000} step={50} onChange={setDebtPayments} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Other Expenses" id="ef-other" value={other} min={0} max={5000} step={50} onChange={setOther} prefix={currencySymbol} formatDisplay={formatNumber} />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <div className="bg-primary-50/60 rounded-xl p-4 border border-primary-100/60">
              <p className="text-xs text-neutral-500 mb-0.5">Total Monthly Expenses</p>
              <p className="text-xl font-bold text-primary-900 tabular-nums">{fmt(monthlyExpenses)}</p>
            </div>

            <SliderInput label="Current Emergency Savings" id="ef-current" value={currentSavings} min={0} max={500000} step={1000} onChange={setCurrentSavings} prefix={currencySymbol} formatDisplay={formatNumber} hint="Cash you have set aside for unexpected expenses" />
            <SliderInput label="Monthly Savings Contribution" id="ef-monthly" value={monthlySaving} min={0} max={50000} step={50} onChange={setMonthlySaving} prefix={currencySymbol} formatDisplay={formatNumber} hint="Amount you can put toward your emergency fund each month" />
            <SliderInput label="Savings Account APY" id="ef-rate" value={savingsRate} min={0} max={10} step={0.1} onChange={setSavingsRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Interest rate on your savings account — high-yield accounts offer ~4-5%" />
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite" ref={resultsRef}>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Your Emergency Fund Targets</h2>

          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {targets.map((t) => (
              <div
                key={t.months}
                className="bg-white rounded-xl border border-neutral-200/80 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TARGET_COLORS[t.months] }} />
                  <p className="text-xs font-medium text-neutral-500">{TARGET_LABELS[t.months]}</p>
                </div>
                <p className="text-xl font-bold text-neutral-900 tabular-nums">{fmt(t.target)}</p>
                {t.pctFunded >= 1 ? (
                  <p className="text-xs text-accent-600 font-medium mt-1">Fully funded</p>
                ) : (
                  <>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${t.pctFunded * 100}%`, backgroundColor: TARGET_COLORS[t.months] }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5 tabular-nums">
                      {fmt(t.remaining)} remaining
                      {isFinite(t.monthsToReach) && t.monthsToReach > 0 && (
                        <span className="text-neutral-500">
                          {' '}· {t.monthsToReach < 12
                            ? `${t.monthsToReach} mo`
                            : `${Math.floor(t.monthsToReach / 12)}y ${t.monthsToReach % 12}mo`}
                        </span>
                      )}
                      {!isFinite(t.monthsToReach) && (
                        <span className="text-neutral-500"> · Start saving to reach this</span>
                      )}
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
                <p className="text-lg font-semibold result-number tabular-nums">{fmt(animatedRecommendedTarget)}</p>
                <p className="text-xs text-neutral-500">6 months of expenses</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5"><TrendingUp size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Current Progress</p>
                <p className="text-lg font-semibold text-accent-600 tabular-nums">
                  {monthlyExpenses > 0 ? `${((currentSavings / (monthlyExpenses * 6)) * 100).toFixed(0)}%` : '—'}
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
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="efColorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B6E6E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0B6E6E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={{ stroke: ct.axis }}
                    label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => {
                      const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
                      return `${s}${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`;
                    }}
                    tick={{ fontSize: 12, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip labelPrefix="Month" formatValue={fmt} />} />
                  {TARGETS.map((m) => (
                    <ReferenceLine
                      key={m}
                      y={monthlyExpenses * m}
                      stroke={TARGET_COLORS[m]}
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                      label={{
                        value: TARGET_LABELS[m],
                        position: 'right',
                        fill: TARGET_COLORS[m],
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="Savings"
                    stroke="#0B6E6E"
                    strokeWidth={2}
                    fill="url(#efColorSavings)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

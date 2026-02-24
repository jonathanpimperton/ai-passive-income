import { useState, useMemo, useCallback } from 'react';
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
const TARGET_COLORS: Record<number, string> = { 3: '#F59E0B', 6: '#2563EB', 12: '#7C3AED' };
const TARGET_LABELS: Record<number, string> = { 3: '3 Months', 6: '6 Months', 12: '12 Months' };

export default function EmergencyFundCalc() {
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
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Monthly Expenses</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="space-y-5">
            <SliderInput label="Housing / Rent" id="ef-housing" value={housing} min={0} max={8000} step={50} onChange={setHousing} prefix="$" formatDisplay={formatNumber} />
            <SliderInput label="Food & Groceries" id="ef-food" value={food} min={0} max={2000} step={25} onChange={setFood} prefix="$" formatDisplay={formatNumber} />
            <SliderInput label="Transportation" id="ef-transport" value={transportation} min={0} max={2000} step={25} onChange={setTransportation} prefix="$" formatDisplay={formatNumber} />
            <SliderInput label="Utilities" id="ef-utilities" value={utilities} min={0} max={1000} step={10} onChange={setUtilities} prefix="$" formatDisplay={formatNumber} />
            <SliderInput label="Insurance" id="ef-insurance" value={insurance} min={0} max={3000} step={25} onChange={setInsurance} prefix="$" formatDisplay={formatNumber} />
            <SliderInput label="Debt Payments" id="ef-debt" value={debtPayments} min={0} max={3000} step={25} onChange={setDebtPayments} prefix="$" formatDisplay={formatNumber} />
            <SliderInput label="Other Expenses" id="ef-other" value={other} min={0} max={3000} step={25} onChange={setOther} prefix="$" formatDisplay={formatNumber} />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <div className="bg-primary-50/60 rounded-xl p-4 border border-primary-100/60">
              <p className="text-xs text-neutral-500 mb-0.5">Total Monthly Expenses</p>
              <p className="text-xl font-bold text-primary-900 tabular-nums">{formatCurrency(monthlyExpenses)}</p>
            </div>

            <SliderInput label="Current Emergency Savings" id="ef-current" value={currentSavings} min={0} max={100000} step={500} onChange={setCurrentSavings} prefix="$" formatDisplay={formatNumber} hint="Cash you have set aside for unexpected expenses" />
            <SliderInput label="Monthly Savings Contribution" id="ef-monthly" value={monthlySaving} min={0} max={5000} step={25} onChange={setMonthlySaving} prefix="$" formatDisplay={formatNumber} hint="Amount you can put toward your emergency fund each month" />
            <SliderInput label="Savings Account APY" id="ef-rate" value={savingsRate} min={0} max={10} step={0.1} onChange={setSavingsRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Interest rate on your savings account — high-yield accounts offer ~4-5%" />
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Your Emergency Fund Targets</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {targets.map((t) => (
              <div
                key={t.months}
                className="bg-white rounded-xl border border-neutral-200/80 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TARGET_COLORS[t.months] }} />
                  <p className="text-xs font-medium text-neutral-500">{TARGET_LABELS[t.months]}</p>
                </div>
                <p className="text-xl font-bold text-neutral-900 tabular-nums">{formatCurrency(t.target)}</p>
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
                      {formatCurrency(t.remaining)} remaining
                      {isFinite(t.monthsToReach) && t.monthsToReach > 0 && (
                        <span className="text-neutral-400">
                          {' '}· {t.monthsToReach < 12
                            ? `${t.monthsToReach} mo`
                            : `${Math.floor(t.monthsToReach / 12)}y ${t.monthsToReach % 12}mo`}
                        </span>
                      )}
                      {!isFinite(t.monthsToReach) && (
                        <span className="text-neutral-400"> · Start saving to reach this</span>
                      )}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Target size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Recommended Target</p>
                <p className="text-lg font-semibold result-number tabular-nums">{formatCurrency(animatedRecommendedTarget)}</p>
                <p className="text-xs text-neutral-400">6 months of expenses</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5"><TrendingUp size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Current Progress</p>
                <p className="text-lg font-semibold text-accent-600 tabular-nums">
                  {monthlyExpenses > 0 ? `${((currentSavings / (monthlyExpenses * 6)) * 100).toFixed(0)}%` : '—'}
                </p>
                <p className="text-xs text-neutral-400">of 6-month target</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Savings Growth Timeline</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="efColorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                    label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      `$${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`
                    }
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip labelPrefix="Month" />} />
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
                    stroke="#2563EB"
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

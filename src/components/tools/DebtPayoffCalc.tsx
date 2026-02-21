import { useState, useMemo, useCallback, useRef } from 'react';
import {
  debtPayoff,
  formatCurrency,
  formatNumber,
  type Debt,
  type DebtPayoffResult,
} from '../../lib/calculator-utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Plus, X, RotateCcw } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';

/* ── Compact text input for debt card fields ─────────────── */
interface DebtFieldProps {
  label: string;
  id: string;
  value: string | number;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  type?: 'text' | 'number';
  placeholder?: string;
}

function DebtField({ label, id, value, onChange, prefix, suffix, type = 'number', placeholder }: DebtFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-neutral-500 mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-9 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
            ${prefix ? 'pl-6' : 'pl-2.5'} ${suffix ? 'pr-6' : 'pr-2.5'}`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Strategy type and colors ────────────────────────────── */
type Strategy = 'snowball' | 'avalanche';
const STRATEGY_COLORS = {
  snowball: '#2563EB',
  avalanche: '#10B981',
} as const;

/* ── Default debts ───────────────────────────────────────── */
interface DebtInput {
  id: string;
  name: string;
  balance: string;
  rate: string;
  minPayment: string;
}

function makeDefaultDebts(getNextId: () => string): DebtInput[] {
  return [
    { id: getNextId(), name: 'Credit Card', balance: '5000', rate: '18.99', minPayment: '150' },
    { id: getNextId(), name: 'Car Loan', balance: '12000', rate: '5.5', minPayment: '350' },
    { id: getNextId(), name: 'Student Loan', balance: '25000', rate: '4.5', minPayment: '280' },
  ];
}

const DEFAULT_EXTRA = 200;
const MAX_DEBTS = 10;

/* ── Parse debt inputs into Debt[] ───────────────────────── */
function parseDebts(inputs: DebtInput[]): Debt[] {
  return inputs
    .filter((d) => {
      const bal = parseFloat(d.balance);
      const min = parseFloat(d.minPayment);
      return d.name.trim() !== '' && !isNaN(bal) && bal > 0 && !isNaN(min) && min > 0;
    })
    .map((d) => ({
      name: d.name.trim(),
      balance: parseFloat(d.balance),
      rate: parseFloat(d.rate) / 100, // convert percent to decimal
      minPayment: parseFloat(d.minPayment),
    }));
}

/* ── Format months as "X years, Y months" ────────────────── */
function formatMonths(months: number): string {
  if (months === 0) return '0 months';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} month${m !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

/* ── Main Calculator ──────────────────────────────────────── */
export default function DebtPayoffCalc() {
  const debtIdCounter = useRef(0);
  const getNextId = useCallback(() => `debt-${++debtIdCounter.current}`, []);

  const [debtInputs, setDebtInputs] = useState<DebtInput[]>(() =>
    makeDefaultDebts(() => `debt-${++debtIdCounter.current}`)
  );
  const [extraPayment, setExtraPayment] = useState(DEFAULT_EXTRA);
  const [activeStrategy, setActiveStrategy] = useState<Strategy>('avalanche');

  /* ── Parsed debts ─────────────────────────────────────── */
  const debts = useMemo(() => parseDebts(debtInputs), [debtInputs]);

  /* ── Compute both strategies ──────────────────────────── */
  const snowballResult = useMemo<DebtPayoffResult>(
    () => debtPayoff(debts, extraPayment, 'snowball'),
    [debts, extraPayment]
  );

  const avalancheResult = useMemo<DebtPayoffResult>(
    () => debtPayoff(debts, extraPayment, 'avalanche'),
    [debts, extraPayment]
  );

  const activeResult = activeStrategy === 'snowball' ? snowballResult : avalancheResult;
  const savings = Math.abs(snowballResult.totalInterest - avalancheResult.totalInterest);
  const betterStrategy: Strategy =
    avalancheResult.totalInterest <= snowballResult.totalInterest ? 'avalanche' : 'snowball';
  const monthsDiff = Math.abs(snowballResult.months - avalancheResult.months);

  const totalDebt = useMemo(
    () => debts.reduce((sum, d) => sum + d.balance, 0),
    [debts]
  );

  const totalMinPayments = useMemo(
    () => debts.reduce((sum, d) => sum + d.minPayment, 0),
    [debts]
  );

  /* ── Chart data: merge snowball + avalanche timelines ── */
  const chartData = useMemo(() => {
    const maxLen = Math.max(snowballResult.timeline.length, avalancheResult.timeline.length);
    const data: Array<{ month: number; Snowball: number; Avalanche: number }> = [];

    // Sample at reasonable intervals to avoid too many data points
    const interval = maxLen > 120 ? 6 : maxLen > 60 ? 3 : 1;

    for (let i = 0; i < maxLen; i += interval) {
      const snowVal = snowballResult.timeline[i]?.totalBalance ?? 0;
      const avaVal = avalancheResult.timeline[i]?.totalBalance ?? 0;
      data.push({
        month: i + 1,
        Snowball: Math.round(snowVal),
        Avalanche: Math.round(avaVal),
      });
    }

    // Ensure last point is included
    if (maxLen > 0) {
      const lastIdx = maxLen - 1;
      const lastMonth = lastIdx + 1;
      if (data.length === 0 || data[data.length - 1].month !== lastMonth) {
        data.push({
          month: lastMonth,
          Snowball: Math.round(snowballResult.timeline[lastIdx]?.totalBalance ?? 0),
          Avalanche: Math.round(avalancheResult.timeline[lastIdx]?.totalBalance ?? 0),
        });
      }
    }

    return data;
  }, [snowballResult, avalancheResult]);

  /* ── Debt input handlers ──────────────────────────────── */
  const updateDebt = useCallback((id: string, field: keyof DebtInput, value: string) => {
    setDebtInputs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }, []);

  const addDebt = useCallback(() => {
    setDebtInputs((prev) => {
      if (prev.length >= MAX_DEBTS) return prev;
      return [
        ...prev,
        { id: getNextId(), name: '', balance: '', rate: '', minPayment: '' },
      ];
    });
  }, [getNextId]);

  const removeDebt = useCallback((id: string) => {
    setDebtInputs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const handleReset = useCallback(() => {
    debtIdCounter.current = 0;
    setDebtInputs(makeDefaultDebts(getNextId));
    setExtraPayment(DEFAULT_EXTRA);
    setActiveStrategy('avalanche');
  }, [getNextId]);

  const hasValidDebts = debts.length > 0;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ──────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
              Your Debts
            </h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-500 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          {/* ── Debt Cards ────────────────────────────── */}
          <div className="space-y-4 mb-5">
            {debtInputs.map((debt, index) => (
              <div
                key={debt.id}
                className="relative bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-4 transition-all duration-200"
              >
                {/* Remove button */}
                {debtInputs.length > 1 && (
                  <button
                    onClick={() => removeDebt(debt.id)}
                    className="absolute top-2.5 right-2.5 p-1 rounded-lg text-neutral-400 hover:text-negative-500 hover:bg-negative-50 transition-all duration-150"
                    aria-label={`Remove ${debt.name || `debt ${index + 1}`}`}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}

                {/* Debt name */}
                <div className="pr-7 mb-3">
                  <DebtField
                    label={`Debt ${index + 1} Name`}
                    id={`${debt.id}-name`}
                    value={debt.name}
                    onChange={(v) => updateDebt(debt.id, 'name', v)}
                    type="text"
                    placeholder="e.g. Credit Card"
                  />
                </div>

                {/* Balance, Rate, Min Payment row */}
                <div className="grid grid-cols-3 gap-2.5">
                  <DebtField
                    label="Balance"
                    id={`${debt.id}-balance`}
                    value={debt.balance}
                    onChange={(v) => updateDebt(debt.id, 'balance', v.replace(/[^0-9.]/g, ''))}
                    prefix="$"
                  />
                  <DebtField
                    label="Rate (APR)"
                    id={`${debt.id}-rate`}
                    value={debt.rate}
                    onChange={(v) => updateDebt(debt.id, 'rate', v.replace(/[^0-9.]/g, ''))}
                    suffix="%"
                  />
                  <DebtField
                    label="Min Payment"
                    id={`${debt.id}-min`}
                    value={debt.minPayment}
                    onChange={(v) => updateDebt(debt.id, 'minPayment', v.replace(/[^0-9.]/g, ''))}
                    prefix="$"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Debt Button */}
          {debtInputs.length < MAX_DEBTS && (
            <button
              onClick={addDebt}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border-2 border-dashed border-neutral-300
                text-sm font-medium text-neutral-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50
                transition-all duration-200"
            >
              <Plus size={16} aria-hidden="true" />
              Add Debt
            </button>
          )}

          {/* ── Extra Monthly Payment ─────────────────── */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
            <SliderInput
              label="Extra Monthly Payment"
              id="dp-extra"
              value={extraPayment}
              min={0}
              max={2000}
              step={25}
              onChange={setExtraPayment}
              prefix="$"
              formatDisplay={(v) => formatNumber(v)}
            />
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              Amount above your minimum payments to accelerate payoff
            </p>
          </div>

          {/* ── Summary stats ─────────────────────────── */}
          {hasValidDebts && (
            <div className="mt-5 pt-5">
              <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-neutral-200/80 p-3">
                  <p className="text-xs text-neutral-500 mb-0.5">Total Debt</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(totalDebt)}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-neutral-200/80 p-3">
                  <p className="text-xs text-neutral-500 mb-0.5">Total Min. Payments</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(totalMinPayments)}/mo
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Results Panel ─────────────────────────────── */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          {!hasValidDebts ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center">
                <p className="text-neutral-400 text-sm">
                  Add at least one debt with a balance and minimum payment to see results.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Strategy Toggle ────────────────────── */}
              <div className="mb-6">
                <div className="inline-flex rounded-xl bg-neutral-100 p-1" role="tablist" aria-label="Debt payoff strategy">
                  <button
                    role="tab"
                    aria-selected={activeStrategy === 'avalanche'}
                    onClick={() => setActiveStrategy('avalanche')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeStrategy === 'avalanche'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STRATEGY_COLORS.avalanche }}
                        aria-hidden="true"
                      />
                      Avalanche
                    </span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeStrategy === 'snowball'}
                    onClick={() => setActiveStrategy('snowball')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeStrategy === 'snowball'
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STRATEGY_COLORS.snowball }}
                        aria-hidden="true"
                      />
                      Snowball
                    </span>
                  </button>
                </div>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  {activeStrategy === 'avalanche'
                    ? 'Pays highest interest rate first — saves the most money.'
                    : 'Pays smallest balance first — quick wins for motivation.'}
                </p>
              </div>

              {/* ── Big Number: Time to Debt-Free ──────── */}
              <div className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">Debt-Free In</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary-900 tabular-nums">
                  {formatMonths(activeResult.months)}
                </p>
                <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                  Paying {formatCurrency(totalMinPayments + extraPayment)}/mo total ({formatCurrency(extraPayment)} extra)
                </p>
              </div>

              {/* ── Side-by-Side Strategy Comparison ──── */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Avalanche Card */}
                <div
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    activeStrategy === 'avalanche'
                      ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-200/50'
                      : 'bg-white border-neutral-200/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: STRATEGY_COLORS.avalanche }}
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Avalanche
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-neutral-400">Time to Payoff</p>
                      <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                        {formatMonths(avalancheResult.months)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Total Interest</p>
                      <p className="text-sm font-semibold text-negative-500 tabular-nums">
                        {formatCurrency(avalancheResult.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Total Paid</p>
                      <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                        {formatCurrency(avalancheResult.totalPaid)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Snowball Card */}
                <div
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    activeStrategy === 'snowball'
                      ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-200/50'
                      : 'bg-white border-neutral-200/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: STRATEGY_COLORS.snowball }}
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Snowball
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-neutral-400">Time to Payoff</p>
                      <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                        {formatMonths(snowballResult.months)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Total Interest</p>
                      <p className="text-sm font-semibold text-negative-500 tabular-nums">
                        {formatCurrency(snowballResult.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Total Paid</p>
                      <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                        {formatCurrency(snowballResult.totalPaid)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Savings Banner ────────────────────── */}
              {savings > 0 && (
                <div className="mb-6 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/60 p-4">
                  <p className="text-sm font-medium text-primary-900">
                    <span className="font-bold">{betterStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'}</span> saves you{' '}
                    <span className="font-bold text-accent-600">{formatCurrency(savings)}</span> in interest
                    {monthsDiff > 0 && (
                      <> and pays off <span className="font-bold">{monthsDiff} month{monthsDiff !== 1 ? 's' : ''}</span> sooner</>
                    )}
                  </p>
                </div>
              )}

              {/* ── Balance Over Time Chart ───────────── */}
              {chartData.length > 1 && (
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">
                    Balance Over Time
                  </h3>
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                          label={{ value: 'Months', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: '#9CA3AF' } }}
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
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                          iconType="circle"
                          iconSize={8}
                        />
                        <Line
                          type="monotone"
                          dataKey="Snowball"
                          stroke={STRATEGY_COLORS.snowball}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          animationDuration={600}
                        />
                        <Line
                          type="monotone"
                          dataKey="Avalanche"
                          stroke={STRATEGY_COLORS.avalanche}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          animationDuration={600}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Payoff Order ──────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Avalanche Order */}
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: STRATEGY_COLORS.avalanche }}
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium text-neutral-700">
                      Avalanche Payoff Order
                    </h3>
                  </div>
                  <ol className="space-y-1.5">
                    {avalancheResult.payoffOrder.map((name, i) => (
                      <li key={name} className="flex items-center gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-neutral-700 truncate">{name}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
                    Highest interest rate paid first
                  </p>
                </div>

                {/* Snowball Order */}
                <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: STRATEGY_COLORS.snowball }}
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium text-neutral-700">
                      Snowball Payoff Order
                    </h3>
                  </div>
                  <ol className="space-y-1.5">
                    {snowballResult.payoffOrder.map((name, i) => (
                      <li key={name} className="flex items-center gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-neutral-700 truncate">{name}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
                    Smallest balance paid first
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useDeferredValue, useEffect, useRef, Suspense } from 'react';
import { formatNumber } from '../../lib/calculator-utils';
import {
  prepareDebts,
  simulateDebtPayoff,
  debtLabel,
  DEBT_HORIZON_MONTHS,
  MAX_APR_PERCENT,
  type DebtField,
  type DebtSimulation,
  type Strategy,
} from '../../lib/debt-payoff';
import { formatMoneyGuarded, formatMonthsLong } from '../../lib/result-format';
import { Plus, X, RotateCcw, CreditCard, DollarSign, AlertTriangle } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useChartTheme } from '../../lib/useChartTheme';
import ResultAffiliate from '../ui/ResultAffiliate';
import NumericTextField from './fields/NumericTextField';
import LiveResult from './fields/LiveResult';
import { lazyChart } from './charts/InvestDebtLazyChart';

const DebtBalanceChart = lazyChart(() => import('./charts/DebtBalanceChart'));

const HORIZON_YEARS = DEBT_HORIZON_MONTHS / 12;

/* -- Form rows ---------------------------------------------- */
interface DebtRowState {
  id: string;
  name: string;
  balance: number | null;
  ratePercent: number | null;
  minPayment: number | null;
}

// Chosen so the two strategies differ: the smallest balance is not the
// highest rate, so snowball clears the personal loan first while avalanche
// targets the card (avalanche saves about $400 here).
function makeDefaultDebts(getNextId: () => string): DebtRowState[] {
  return [
    { id: getNextId(), name: 'Credit Card', balance: 6500, ratePercent: 22.99, minPayment: 195 },
    { id: getNextId(), name: 'Personal Loan', balance: 3500, ratePercent: 11.5, minPayment: 120 },
    { id: getNextId(), name: 'Car Loan', balance: 12000, ratePercent: 6.5, minPayment: 350 },
  ];
}

const DEFAULT_EXTRA = 200;
const MAX_DEBTS = 10;

/** Debt name box that keeps any name typed before hydration. */
function DebtNameInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dom = ref.current?.value ?? '';
    if (dom !== value) onChange(dom);
    // Only on mount: later renders are controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
      <input
        ref={ref}
        id={id}
        type="text"
        value={value}
        maxLength={60}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Credit Card"
        className="w-full h-10 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-2.5
          focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
      />
    </div>
  );
}

function statusTime(r: DebtSimulation): string {
  if (r.status === 'paid') return formatMonthsLong(r.months);
  if (r.status === 'never') return 'Never';
  if (r.status === 'beyondHorizon') return `Over ${HORIZON_YEARS} years`;
  return '--';
}

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" className="shrink-0" aria-hidden="true">
      <circle cx="5" cy="5" r="5" fill={color} />
    </svg>
  );
}

/* -- Main Calculator ---------------------------------------- */
export default function DebtPayoffCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const debtIdCounter = useRef(0);
  const getNextId = useCallback(() => `debt-${++debtIdCounter.current}`, []);

  const [rows, setRows] = useState<DebtRowState[]>(() => makeDefaultDebts(() => `debt-${++debtIdCounter.current}`));
  const [extraPayment, setExtraPayment] = useState(DEFAULT_EXTRA);
  const [activeStrategy, setActiveStrategy] = useState<Strategy>('avalanche');
  const ct = useChartTheme();
  // Strategy identity colors: avalanche (recommended) = primary series,
  // snowball = quiet comparison series. Used in chart, toggle and cards.
  const STRATEGY_COLORS: Record<Strategy, string> = { avalanche: ct.series1, snowball: ct.series2 };

  /* -- Validated debts (blank names become "Debt n"; bad rows are reported) -- */
  const prepared = useMemo(() => prepareDebts(rows), [rows]);
  const debts = prepared.debts;

  /* -- Both strategies ---------------------------------------- */
  const snowballResult = useMemo(() => simulateDebtPayoff(debts, extraPayment, 'snowball'), [debts, extraPayment]);
  const avalancheResult = useMemo(() => simulateDebtPayoff(debts, extraPayment, 'avalanche'), [debts, extraPayment]);
  const resultFor = (s: Strategy) => (s === 'snowball' ? snowballResult : avalancheResult);
  const activeResult = resultFor(activeStrategy);

  const bothPaid = snowballResult.status === 'paid' && avalancheResult.status === 'paid';
  const savings = bothPaid ? Math.abs(snowballResult.totalInterest - avalancheResult.totalInterest) : 0;
  const betterStrategy: Strategy = avalancheResult.totalInterest <= snowballResult.totalInterest ? 'avalanche' : 'snowball';
  const monthsDiff = bothPaid ? Math.abs(snowballResult.months - avalancheResult.months) : 0;
  const onlyOnePays =
    (snowballResult.status === 'paid') !== (avalancheResult.status === 'paid') ? (snowballResult.status === 'paid' ? 'snowball' : 'avalanche') : null;

  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.balance, 0), [debts]);
  const totalMinPayments = useMemo(() => debts.reduce((sum, d) => sum + d.minPayment, 0), [debts]);

  /* -- Row issues, by row and field --------------------------- */
  const issuesByRow = useMemo(() => {
    const map = new Map<number, Partial<Record<DebtField, string>>>();
    for (const issue of prepared.issues) {
      const entry = map.get(issue.row) ?? {};
      entry[issue.field] = issue.message;
      map.set(issue.row, entry);
    }
    return map;
  }, [prepared.issues]);

  /* -- Chart and table follow a frame behind fast edits -------- */
  const deferredSnow = useDeferredValue(snowballResult);
  const deferredAva = useDeferredValue(avalancheResult);
  const chartData = useMemo(() => {
    const maxLen = Math.max(deferredSnow.timeline.length, deferredAva.timeline.length);
    const interval = maxLen > 120 ? 6 : maxLen > 60 ? 3 : 1;
    const point = (i: number) => ({
      month: i + 1,
      Avalanche: Math.round(deferredAva.timeline[i]?.totalBalance ?? 0),
      Snowball: Math.round(deferredSnow.timeline[i]?.totalBalance ?? 0),
    });
    const data: Array<Record<string, number>> = [];
    for (let i = 0; i < maxLen; i += interval) data.push(point(i));
    if (maxLen > 0 && data[data.length - 1].month !== maxLen) data.push(point(maxLen - 1));
    return data;
  }, [deferredSnow, deferredAva]);

  const yearRows = useMemo(() => {
    const maxLen = Math.max(deferredSnow.timeline.length, deferredAva.timeline.length);
    const out: Array<Record<string, unknown>> = [];
    for (let year = 1; year * 12 <= maxLen + 11; year++) {
      const idx = Math.min(year * 12, maxLen) - 1;
      out.push({
        year,
        Avalanche: deferredAva.timeline[Math.min(idx, deferredAva.timeline.length - 1)]?.totalBalance ?? 0,
        Snowball: deferredSnow.timeline[Math.min(idx, deferredSnow.timeline.length - 1)]?.totalBalance ?? 0,
      });
    }
    return out;
  }, [deferredSnow, deferredAva]);

  /* -- Row handlers ------------------------------------------- */
  const updateRow = useCallback(<K extends keyof DebtRowState>(id: string, field: K, value: DebtRowState[K]) => {
    setRows((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }, []);

  const addDebt = useCallback(() => {
    setRows((prev) =>
      prev.length >= MAX_DEBTS ? prev : [...prev, { id: getNextId(), name: '', balance: null, ratePercent: null, minPayment: null }]
    );
  }, [getNextId]);

  const removeDebt = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.id !== id)));
  }, []);

  const handleReset = useCallback(() => {
    debtIdCounter.current = 0;
    setRows(makeDefaultDebts(getNextId));
    setExtraPayment(DEFAULT_EXTRA);
    setActiveStrategy('avalanche');
  }, [getNextId]);

  /* -- Email / PDF --------------------------------------------- */
  const getInputs = useCallback(() => {
    // One line per debt keeps even 10 debts well inside the email's 20-field limit.
    const inputs: { label: string; value: string }[] = debts.map((d) => ({
      label: d.name,
      value: `${fmt(d.balance)} at ${(d.rate * 100).toFixed(2)}% APR, min ${fmt(d.minPayment)}/mo`,
    }));
    inputs.push({ label: 'Strategy', value: activeStrategy === 'avalanche' ? 'Avalanche (highest rate first)' : 'Snowball (lowest balance first)' });
    inputs.push({ label: 'Extra Monthly Payment', value: fmt(extraPayment) });
    return inputs;
  }, [debts, activeStrategy, extraPayment, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const r = activeResult;
    if (r.status === 'never') {
      return [
        { label: 'Debt-Free In', value: 'Never - the payments do not keep up with the interest', highlight: true },
        { label: 'Monthly Payment', value: `${fmt(r.monthlyOutlay)}/mo` },
        { label: 'Interest in the First Month', value: fmt(r.firstMonthInterest) },
        { label: 'Total Debt', value: fmt(totalDebt) },
      ];
    }
    if (r.status === 'beyondHorizon') {
      return [
        { label: 'Debt-Free In', value: `Not within ${HORIZON_YEARS} years`, highlight: true },
        { label: `Still Owed After ${HORIZON_YEARS} Years`, value: fmt(r.remainingBalance) },
        { label: `Interest Paid in ${HORIZON_YEARS} Years`, value: fmt(r.totalInterest) },
        { label: 'Total Debt', value: fmt(totalDebt) },
      ];
    }
    return [
      { label: 'Debt-Free In', value: statusTime(r), highlight: true },
      { label: 'Total Interest', value: fmt(r.totalInterest) },
      { label: 'Total Amount Paid', value: fmt(r.totalPaid) },
      { label: 'Total Debt', value: fmt(totalDebt) },
    ];
  }, [activeResult, totalDebt, currency]);

  const animatedMonths = useAnimatedNumber(activeResult.status === 'paid' ? activeResult.months : 0);
  const hasValidDebts = debts.length > 0;
  const headline = activeResult.status === 'paid' ? formatMonthsLong(Math.round(animatedMonths)) : statusTime(activeResult);
  const strategyName = (s: Strategy) => (s === 'avalanche' ? 'Avalanche' : 'Snowball');
  const unclearedNames = activeResult.clearances.filter((c) => c.month === null).map((c) => c.name);
  const liveText = !hasValidDebts
    ? 'Add a debt to see results.'
    : activeResult.status === 'paid'
      ? `${strategyName(activeStrategy)}: debt-free in ${statusTime(activeResult)}.`
      : activeResult.status === 'never'
        ? `${strategyName(activeStrategy)}: never debt-free at this payment level.`
        : `${strategyName(activeStrategy)}: not debt-free within ${HORIZON_YEARS} years.`;

  const excludedRows = Array.from(issuesByRow.keys()).sort((a, b) => a - b);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* -- Input Panel -- */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Your Debts</h2>
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

          {/* -- Debt Cards -- */}
          <div className="space-y-4 mb-5">
            {rows.map((debt, index) => {
              const issues = issuesByRow.get(index);
              const issueId = `${debt.id}-issues`;
              const label = debtLabel(debt.name, index);
              return (
                <div key={debt.id} className="relative bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-4 transition-all duration-200">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDebt(debt.id)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
                      aria-label={`Remove ${label}`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}

                  <div className="pr-7 mb-3">
                    <DebtNameInput id={`${debt.id}-name`} label={`Debt ${index + 1} Name`} value={debt.name} onChange={(v) => updateRow(debt.id, 'name', v)} />
                  </div>

                  <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5">
                    <div>
                      <label htmlFor={`${debt.id}-balance`} className="block text-xs font-medium text-neutral-500 mb-1">Balance</label>
                      <NumericTextField
                        id={`${debt.id}-balance`}
                        value={debt.balance}
                        onChange={(v) => updateRow(debt.id, 'balance', v)}
                        currency={currency}
                        prefix={currencySymbol}
                        min={0}
                        max={100_000_000}
                        invalid={Boolean(issues?.balance)}
                        describedBy={issues ? issueId : undefined}
                        inputClassName="h-10"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${debt.id}-rate`} className="block text-xs font-medium text-neutral-500 mb-1">Rate (APR)</label>
                      <NumericTextField
                        id={`${debt.id}-rate`}
                        value={debt.ratePercent}
                        onChange={(v) => updateRow(debt.id, 'ratePercent', v)}
                        currency={currency}
                        suffix="%"
                        min={0}
                        max={MAX_APR_PERCENT}
                        maxFractionDigits={3}
                        invalid={Boolean(issues?.ratePercent)}
                        describedBy={issues ? issueId : undefined}
                        inputClassName="h-10"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${debt.id}-min`} className="block text-xs font-medium text-neutral-500 mb-1">Min Payment</label>
                      <NumericTextField
                        id={`${debt.id}-min`}
                        value={debt.minPayment}
                        onChange={(v) => updateRow(debt.id, 'minPayment', v)}
                        currency={currency}
                        prefix={currencySymbol}
                        min={0}
                        max={10_000_000}
                        invalid={Boolean(issues?.minPayment)}
                        describedBy={issues ? issueId : undefined}
                        inputClassName="h-10"
                      />
                    </div>
                  </div>
                  {issues && (
                    <p id={issueId} className="text-xs text-red-600 mt-2 leading-snug">
                      Not included yet: {Object.values(issues).join(' ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {rows.length < MAX_DEBTS && (
            <button
              type="button"
              onClick={addDebt}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border-2 border-dashed border-neutral-300
                text-sm font-medium text-neutral-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50
                transition-all duration-200"
            >
              <Plus size={16} aria-hidden="true" />
              Add Debt
            </button>
          )}

          {/* -- Extra Monthly Payment -- */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-neutral-200/80 mb-5" />
            <SliderInput
              label="Extra Monthly Payment"
              id="dp-extra"
              value={extraPayment}
              min={0}
              max={5000}
              step={25}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}5K`}
              onChange={setExtraPayment}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
              hint="Amount above your minimum payments; it goes to one debt at a time"
            />
          </div>

          {/* -- Summary stats -- */}
          {hasValidDebts && (
            <div className="mt-5 pt-5">
              <div className="h-px bg-neutral-200/80 mb-5" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-neutral-200/80 p-3 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 mb-0.5">Total Debt</p>
                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(totalDebt)}</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-neutral-200/80 p-3 flex items-start gap-3 min-w-0 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 mb-0.5">Total Min. Payments</p>
                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(totalMinPayments)}/mo</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* -- Results Panel -- */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start">
          <LiveResult text={liveText} />
          {excludedRows.length > 0 && (
            <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200/60 p-3 flex gap-2.5" data-pdf-hide>
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-800 leading-relaxed">
                {excludedRows.map((r) => debtLabel(rows[r]?.name ?? '', r)).join(', ')}{' '}
                {excludedRows.length === 1 ? 'is' : 'are'} not included until the highlighted fields are filled in.
              </p>
            </div>
          )}
          {!hasValidDebts ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-neutral-500 text-sm text-center">
                Add at least one debt with a balance, APR and minimum payment to see results.
              </p>
            </div>
          ) : (
            <>
              {/* -- Strategy Toggle -- */}
              <div data-pdf-section className="mb-6">
                <div className="inline-flex rounded-xl bg-neutral-100 p-1" role="group" aria-label="Debt payoff strategy">
                  {(['avalanche', 'snowball'] as Strategy[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={activeStrategy === s}
                      onClick={() => setActiveStrategy(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeStrategy === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Dot color={STRATEGY_COLORS[s]} size={10} />
                        {strategyName(s)}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  {activeStrategy === 'avalanche'
                    ? 'Extra money goes to the highest interest rate first, which keeps total interest lowest.'
                    : 'Extra money goes to the smallest balance first, for quicker wins.'}
                </p>
              </div>

              {/* -- Big Number: Time to Debt-Free -- */}
              <div data-pdf-section className="mb-6">
                <p className="text-sm text-neutral-500 mb-1">Debt-Free In</p>
                <p
                  data-headline-result
                  data-headline-label="Debt-Free In"
                  className={`text-3xl sm:text-4xl font-bold tabular-nums ${activeResult.status === 'paid' ? 'result-number' : 'text-red-600'}`}
                >
                  {headline}
                </p>
                {activeResult.status === 'paid' && (
                  <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                    Paying {fmt(activeResult.monthlyOutlay)}/mo total ({fmt(extraPayment)} extra)
                  </p>
                )}
                {activeResult.status === 'never' && (
                  <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                    At {fmt(activeResult.monthlyOutlay)}/mo the payments never catch up with the interest
                    {unclearedNames.length > 0 && <> on {unclearedNames.join(', ')}</>}, so the balance keeps growing. Raise the
                    extra payment or the minimums.
                  </p>
                )}
                {activeResult.status === 'beyondHorizon' && (
                  <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                    Not repaid within {HORIZON_YEARS} years: {fmt(activeResult.remainingBalance)} would still be owed after paying{' '}
                    {fmt(activeResult.totalInterest)} in interest.
                  </p>
                )}
              </div>

              {/* -- Side-by-Side Strategy Comparison -- */}
              <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
                {(['avalanche', 'snowball'] as Strategy[]).map((s) => {
                  const r = resultFor(s);
                  return (
                    <div
                      key={s}
                      className={`rounded-xl border p-4 bg-white transition-all duration-200 ${
                        activeStrategy === s ? 'border-primary-300 shadow-sm ring-1 ring-primary-200/50' : 'border-neutral-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-3">
                        <Dot color={STRATEGY_COLORS[s]} />
                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{strategyName(s)}</p>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-neutral-500">Time to Payoff</p>
                          <p className={`text-sm font-semibold tabular-nums ${r.status === 'paid' ? 'text-neutral-900' : 'text-red-600'}`}>{statusTime(r)}</p>
                        </div>
                        {r.status === 'paid' && (
                          <>
                            <div>
                              <p className="text-xs text-neutral-500">Total Interest</p>
                              <p className="text-sm font-semibold text-red-600 tabular-nums">{fmt(r.totalInterest)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500">Total Paid</p>
                              <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(r.totalPaid)}</p>
                            </div>
                          </>
                        )}
                        {r.status === 'beyondHorizon' && (
                          <div>
                            <p className="text-xs text-neutral-500">Still owed after {HORIZON_YEARS} years</p>
                            <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(r.remainingBalance)}</p>
                          </div>
                        )}
                        {r.status === 'never' && (
                          <p className="text-xs text-neutral-500 leading-relaxed">The balance keeps growing at this payment level.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* -- Comparison Banner -- */}
              {bothPaid && savings >= 1 && (
                <div data-pdf-section className="mb-6 rounded-xl bg-primary-50 border border-primary-200/60 p-4">
                  <p className="text-sm font-medium text-primary-900">
                    <span className="font-bold">{strategyName(betterStrategy)}</span> saves you{' '}
                    <span className="font-bold text-success-600">{fmt(savings)}</span> in interest
                    {monthsDiff > 0 && (
                      <> and pays off <span className="font-bold">{monthsDiff} month{monthsDiff !== 1 ? 's' : ''}</span> sooner</>
                    )}
                  </p>
                </div>
              )}
              {bothPaid && savings < 1 && (
                <div data-pdf-section className="mb-6 rounded-xl bg-white border border-neutral-200/80 p-4">
                  <p className="text-sm text-neutral-700">
                    Both strategies cost the same here: they work through these debts in the same order.
                  </p>
                </div>
              )}
              {onlyOnePays && (
                <div data-pdf-section className="mb-6 rounded-xl bg-primary-50 border border-primary-200/60 p-4">
                  <p className="text-sm font-medium text-primary-900">
                    Only <span className="font-bold">{strategyName(onlyOnePays)}</span> clears these debts at this payment level.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <ShareButton toolSlug="debt-payoff" toolName="Debt Payoff Calculator" />
                <EmailResultsButton toolSlug="debt-payoff" toolName="Debt Payoff Calculator" getInputs={getInputs} getResults={getResults} />
                <ExportPdfButton toolName="Debt Payoff Calculator" getInputs={getInputs} resultsRef={resultsRef} />
              </div>

              {/* -- Balance Over Time Chart -- */}
              {chartData.length > 1 && (
                <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Balance Over Time</h3>
                  <div className="h-56 sm:h-64">
                    <Suspense fallback={<ChartSkeleton height="100%" />}>
                      <DebtBalanceChart
                        data={chartData}
                        lines={[
                          { key: 'Snowball', tone: 'comparison' },
                          { key: 'Avalanche', tone: 'primary' },
                        ]}
                        currency={currency}
                        ariaLabel="Line chart of total remaining debt by month under avalanche and snowball; use Show data for the figures by year."
                      />
                    </Suspense>
                  </div>
                  {(snowballResult.status !== 'paid' || avalancheResult.status !== 'paid') && (
                    <p className="text-xs text-neutral-500 mt-2">The chart stops at {HORIZON_YEARS} years.</p>
                  )}
                  <ChartDataTable
                    className="mt-3"
                    caption="Total remaining debt at the end of each year"
                    columns={[
                      { key: 'year', label: 'Year', numeric: true },
                      { key: 'Avalanche', label: 'Avalanche', format: (v) => formatMoneyGuarded(Number(v), currency) },
                      { key: 'Snowball', label: 'Snowball', format: (v) => formatMoneyGuarded(Number(v), currency) },
                    ]}
                    rows={yearRows}
                  />
                </div>
              )}

              {/* -- Payoff Order -- */}
              <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['avalanche', 'snowball'] as Strategy[]).map((s) => {
                  const r = resultFor(s);
                  return (
                    <div key={s} className="bg-white rounded-xl border border-neutral-200/80 p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Dot color={STRATEGY_COLORS[s]} />
                        <h3 className="text-sm font-medium text-neutral-700">{strategyName(s)}: order debts are cleared</h3>
                      </div>
                      <ol className="space-y-1.5">
                        {r.clearances.map((c, i) => (
                          <li key={`${c.index}-${i}`} className="flex items-center gap-2.5">
                            <span
                              className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center ${
                                s === 'avalanche' ? 'bg-primary-50 text-primary-700' : 'bg-neutral-100 text-neutral-600'
                              }`}
                              aria-hidden="true"
                            >
                              {i + 1}
                            </span>
                            <span className="text-sm text-neutral-700 truncate">{c.name}</span>
                            <span className="ml-auto text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                              {c.month === null ? 'not cleared' : c.month === 0 ? 'already clear' : `month ${c.month}`}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                        {s === 'avalanche'
                          ? 'Extra payments target the highest APR first. A small debt can still clear sooner on its own minimum.'
                          : 'Extra payments target the smallest balance first.'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <ResultAffiliate toolSlug="debt-payoff" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

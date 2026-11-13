import { useState, useMemo, useCallback, useDeferredValue, useRef, Fragment, Suspense } from 'react';
import { formatNumber } from '../../lib/calculator-utils';
import {
  simulateCardPayoff,
  paymentToClearIn,
  paymentToStopGrowth,
  CARD_HORIZON_MONTHS,
  type CardMonth,
  type CardPayoffResult,
  type MinPaymentMode,
} from '../../lib/credit-card';
import { formatMoneyGuarded, formatMoneyCents, formatMonthsLong } from '../../lib/result-format';
import { ChevronDown, RotateCcw, CreditCard, TrendingDown, Clock, DollarSign, AlertTriangle } from 'lucide-react';
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
import ResultAffiliate from '../ui/ResultAffiliate';
import LiveResult from './fields/LiveResult';
import { lazyChart } from './charts/InvestDebtLazyChart';

const DebtBalanceChart = lazyChart(() => import('./charts/DebtBalanceChart'));

const HORIZON_YEARS = CARD_HORIZON_MONTHS / 12;

/* -- Outcome wording (shared by the headline, cards, email and PDF) -- */
function timeText(r: CardPayoffResult): string {
  if (r.status === 'paid') return formatMonthsLong(r.months);
  if (r.status === 'never') return 'Never';
  if (r.status === 'beyondHorizon') return `Over ${HORIZON_YEARS} years`;
  return '0 months';
}

/* -- Collapsible Year-Group Schedule Table ------------------ */
interface YearGroup {
  year: number;
  endBalance: number;
  totalPrincipal: number;
  totalInterest: number;
  months: CardMonth[];
}

function buildYearGroups(schedule: CardMonth[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    let g = groups[groups.length - 1];
    if (!g || g.year !== year) {
      g = { year, endBalance: row.balance, totalPrincipal: 0, totalInterest: 0, months: [] };
      groups.push(g);
    }
    g.months.push(row);
    g.endBalance = row.balance;
    g.totalPrincipal += row.principal;
    g.totalInterest += row.interest;
  }
  return groups;
}

function ScheduleTable({ yearGroups, cc }: { yearGroups: YearGroup[]; cc: string }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmt = (v: number) => formatMoneyGuarded(v, cc);

  if (yearGroups.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <caption className="sr-only">Principal, interest and balance by year; expand a year for monthly detail</caption>
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th scope="col" className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600">Principal</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600">Interest</th>
            <th scope="col" className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Balance</th>
          </tr>
        </thead>
        <tbody>
          {yearGroups.map((group, i) => (
            <Fragment key={`year-${group.year}`}>
              <tr
                className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150
                  ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                  ${expandedYear === group.year ? 'bg-primary-50/50' : 'hover:bg-primary-50/30'}`}
                onClick={() => setExpandedYear(expandedYear === group.year ? null : group.year)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedYear(expandedYear === group.year ? null : group.year); } }}
                tabIndex={0}
                role="button"
                aria-expanded={expandedYear === group.year}
              >
                <td className="py-2.5 px-4 font-medium text-neutral-900 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <ChevronDown
                      size={14}
                      className={`text-neutral-500 transition-transform duration-200 ${expandedYear === group.year ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                    {group.year}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums">{fmt(group.totalPrincipal)}</td>
                <td className="py-2.5 px-4 text-right text-red-600 tabular-nums">{fmt(group.totalInterest)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums hidden sm:table-cell">{fmt(group.endBalance)}</td>
              </tr>
              {expandedYear === group.year && (
                <tr className="bg-primary-50/30 border-b border-primary-100/50">
                  <td colSpan={4} className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-primary-100/50">
                            <th scope="col" className="text-left py-2 px-4 font-medium text-neutral-500">Month</th>
                            <th scope="col" className="text-right py-2 px-4 font-medium text-neutral-500">Payment</th>
                            <th scope="col" className="text-right py-2 px-4 font-medium text-neutral-500">Principal</th>
                            <th scope="col" className="text-right py-2 px-4 font-medium text-neutral-500">Interest</th>
                            <th scope="col" className="text-right py-2 px-4 font-medium text-neutral-500">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.months.map((m) => (
                            <tr key={m.month} className="border-b border-primary-50/50">
                              <td className="py-1.5 px-4 text-neutral-600 tabular-nums">{m.month}</td>
                              <td className="py-1.5 px-4 text-right text-neutral-900 tabular-nums">{fmt(m.payment)}</td>
                              <td className="py-1.5 px-4 text-right text-neutral-900 tabular-nums">{fmt(m.principal)}</td>
                              <td className="py-1.5 px-4 text-right text-red-600 tabular-nums">{fmt(m.interest)}</td>
                              <td className="py-1.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">{fmt(m.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -- Result card for one plan (minimum only / with extra) --- */
function PlanCard({ title, icon, result, active, cc }: { title: string; icon: React.ReactNode; result: CardPayoffResult; active: boolean; cc: string }) {
  const fmt = (v: number) => formatMoneyGuarded(v, cc);
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 bg-white ${
        active ? 'border-primary-300 shadow-sm ring-1 ring-primary-200/50' : 'border-neutral-200/80'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-3">
        {icon}
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-neutral-500">Time to Payoff</p>
          <p className={`text-sm font-semibold tabular-nums ${result.status === 'paid' ? 'text-neutral-900' : 'text-red-600'}`}>{timeText(result)}</p>
        </div>
        {result.status === 'paid' && (
          <>
            <div>
              <p className="text-xs text-neutral-500">Total Interest</p>
              <p className="text-sm font-semibold text-red-600 tabular-nums">{fmt(result.totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Total Paid</p>
              <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(result.totalPaid)}</p>
            </div>
          </>
        )}
        {result.status === 'beyondHorizon' && (
          <>
            <div>
              <p className="text-xs text-neutral-500">Interest in {HORIZON_YEARS} years</p>
              <p className="text-sm font-semibold text-red-600 tabular-nums">{fmt(result.totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Still owed after {HORIZON_YEARS} years</p>
              <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(result.remainingBalance)}</p>
            </div>
          </>
        )}
        {result.status === 'never' && (
          <p className="text-xs text-neutral-500 leading-relaxed">
            The payment does not cover the {formatMoneyCents(result.firstMonthInterest, cc)}/mo interest, so the balance never falls.
          </p>
        )}
      </div>
    </div>
  );
}

/* -- Defaults ---------------------------------------------- */
const DEFAULTS = {
  balance: 5000,
  apr: 22.99,
  minType: 'fixed' as MinPaymentMode,
  minFixed: 100,
  minPercent: 2,
  plusPercent: 1,
  extra: 0,
};

const MODE_OPTIONS: { value: MinPaymentMode; label: string }[] = [
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'percentage', label: '% of balance' },
  { value: 'interestPlus', label: 'Interest + %' },
];

/* -- Main Calculator --------------------------------------- */
export default function CreditCardPayoffCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const cents = (v: number) => formatMoneyCents(v, currency);
  // Percentage-mode minimum payment floor: US cards typically use $25, UK
  // cards often 5 pounds. Not user-editable, so it flips safely with the currency.
  const minFloor = currency === 'GBP' ? 5 : 25;

  const [balance, setBalance] = useState(DEFAULTS.balance);
  const [apr, setApr] = useState(DEFAULTS.apr);
  const [minType, setMinType] = useState<MinPaymentMode>(DEFAULTS.minType);
  const [minFixed, setMinFixed] = useState(DEFAULTS.minFixed);
  const [minPercent, setMinPercent] = useState(DEFAULTS.minPercent);
  const [plusPercent, setPlusPercent] = useState(DEFAULTS.plusPercent);
  const [extra, setExtra] = useState(DEFAULTS.extra);

  const baseInputs = useMemo(
    () => ({
      balance,
      aprPercent: apr,
      mode: minType,
      fixedPayment: minFixed,
      percentOfBalance: minType === 'interestPlus' ? plusPercent : minPercent,
      floor: minFloor,
    }),
    [balance, apr, minType, minFixed, minPercent, plusPercent, minFloor]
  );

  const minOnlyResult = useMemo(() => simulateCardPayoff({ ...baseInputs, extra: 0 }), [baseInputs]);
  const withExtraResult = useMemo(() => simulateCardPayoff({ ...baseInputs, extra }), [baseInputs, extra]);

  const hasExtra = extra > 0;
  const activeResult = hasExtra ? withExtraResult : minOnlyResult;
  const bothPaid = minOnlyResult.status === 'paid' && withExtraResult.status === 'paid';
  const interestSaved = bothPaid ? minOnlyResult.totalInterest - withExtraResult.totalInterest : 0;
  const monthsSaved = bothPaid ? minOnlyResult.months - withExtraResult.months : 0;
  const stopGrowth = paymentToStopGrowth(balance, apr);
  const clearIn5 = paymentToClearIn(balance, apr, 60);

  /* -- Schedule table and chart follow a frame behind slider drags -- */
  const deferredActive = useDeferredValue(activeResult);
  const deferredMin = useDeferredValue(minOnlyResult);
  const deferredExtra = useDeferredValue(withExtraResult);
  const deferredHasExtra = useDeferredValue(hasExtra);
  const yearGroups = useMemo(() => buildYearGroups(deferredActive.schedule), [deferredActive]);

  const lines = useMemo(() => {
    const out: Array<{ key: string; tone: 'primary' | 'comparison'; result: CardPayoffResult }> = [];
    if (deferredMin.schedule.length > 0) out.push({ key: 'Minimum only', tone: 'comparison', result: deferredMin });
    if (deferredHasExtra && deferredExtra.schedule.length > 0) out.push({ key: 'With extra', tone: 'primary', result: deferredExtra });
    return out;
  }, [deferredMin, deferredExtra, deferredHasExtra]);

  const chartData = useMemo(() => {
    const maxLen = Math.max(0, ...lines.map((l) => l.result.schedule.length));
    const interval = maxLen > 120 ? 6 : maxLen > 60 ? 3 : 1;
    const row = (i: number) => {
      const point: Record<string, number> = { month: i + 1 };
      for (const l of lines) point[l.key] = Math.round(l.result.schedule[i]?.balance ?? 0);
      return point;
    };
    const data: Array<Record<string, number>> = [];
    for (let i = 0; i < maxLen; i += interval) data.push(row(i));
    if (maxLen > 0 && data[data.length - 1].month !== maxLen) data.push(row(maxLen - 1));
    return data;
  }, [lines]);

  const tableRows = useMemo(() => {
    const maxLen = Math.max(0, ...lines.map((l) => l.result.schedule.length));
    const rows: Array<Record<string, unknown>> = [];
    for (let year = 1; year * 12 <= maxLen + 11; year++) {
      const idx = Math.min(year * 12, maxLen) - 1;
      const r: Record<string, unknown> = { year };
      for (const l of lines) r[l.key] = l.result.schedule[idx]?.balance ?? 0;
      rows.push(r);
    }
    return rows;
  }, [lines]);

  /* -- Current payment display -------------------------------- */
  const firstPayment = activeResult.status === 'noBalance' ? 0 : activeResult.firstPayment;
  const paymentLabel = minType === 'fixed' ? 'Monthly Payment' : 'First Payment';

  /* -- Handlers --------------------------------------------- */
  const handleReset = useCallback(() => {
    setBalance(DEFAULTS.balance);
    setApr(DEFAULTS.apr);
    setMinType(DEFAULTS.minType);
    setMinFixed(DEFAULTS.minFixed);
    setMinPercent(DEFAULTS.minPercent);
    setPlusPercent(DEFAULTS.plusPercent);
    setExtra(DEFAULTS.extra);
  }, []);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Credit Card Balance', value: fmt(balance) },
      { label: 'Annual Interest Rate (APR)', value: `${apr}%` },
    ];
    if (minType === 'fixed') inputs.push({ label: 'Minimum Payment (Fixed)', value: fmt(minFixed) });
    else if (minType === 'percentage') inputs.push({ label: 'Minimum Payment', value: `${minPercent}% of balance (min ${fmt(minFloor)})` });
    else inputs.push({ label: 'Minimum Payment', value: `Interest + ${plusPercent}% of balance (min ${fmt(minFloor)})` });
    inputs.push({ label: 'Extra Monthly Payment', value: fmt(extra) });
    return inputs;
  }, [balance, apr, minType, minFixed, minPercent, plusPercent, minFloor, extra, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const r = activeResult;
    if (r.status === 'never') {
      return [
        { label: 'Paid Off In', value: 'Never - the payment does not cover the interest', highlight: true },
        { label: 'Interest Charged in Month 1', value: cents(r.firstMonthInterest) },
        { label: 'Your Payment', value: cents(r.firstPayment) },
        { label: 'Payment Needed to Reduce the Balance', value: `At least ${fmt(stopGrowth)}/mo` },
        { label: 'Payment to Clear in 5 Years', value: `${fmt(clearIn5)}/mo` },
      ];
    }
    if (r.status === 'beyondHorizon') {
      return [
        { label: 'Paid Off In', value: `Not within ${HORIZON_YEARS} years`, highlight: true },
        { label: `Interest Paid in ${HORIZON_YEARS} Years`, value: fmt(r.totalInterest) },
        { label: `Still Owed After ${HORIZON_YEARS} Years`, value: fmt(r.remainingBalance) },
        { label: 'Payment to Clear in 5 Years', value: `${fmt(clearIn5)}/mo` },
      ];
    }
    const results: ResultItem[] = [
      { label: 'Paid Off In', value: timeText(r), highlight: true },
      { label: 'Total Interest', value: fmt(r.totalInterest) },
      { label: 'Total Amount Paid', value: fmt(r.totalPaid) },
    ];
    if (hasExtra && interestSaved > 0) results.push({ label: 'Interest Saved', value: fmt(interestSaved) });
    return results;
  }, [activeResult, interestSaved, hasExtra, stopGrowth, clearIn5, currency]);

  const animatedMonths = useAnimatedNumber(activeResult.status === 'paid' ? activeResult.months : 0);
  const headlineLabel = hasExtra ? 'Paid Off In (with extra payments)' : 'Paid Off In';
  const headline = activeResult.status === 'paid' ? formatMonthsLong(Math.round(animatedMonths)) : timeText(activeResult);
  const liveText =
    activeResult.status === 'never'
      ? 'Never paid off: the payment does not cover the interest.'
      : activeResult.status === 'beyondHorizon'
        ? `Not paid off within ${HORIZON_YEARS} years.`
        : `Paid off in ${timeText(activeResult)}.`;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
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

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <SliderInput
              label="Credit Card Balance"
              hint="Current balance on your credit card"
              id="cc-balance"
              value={balance}
              min={100}
              max={50000}
              step={100}
              textMax={100000}
              minLabel={`${currencySymbol}100`}
              maxLabel={`${currencySymbol}50K`}
              onChange={setBalance}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Annual Interest Rate (APR)"
              hint="Check your card statement for the exact rate"
              id="cc-apr"
              value={apr}
              min={0}
              max={35}
              step={0.01}
              onChange={setApr}
              suffix="%"
              formatDisplay={(v) => v.toFixed(2)}
            />

            {/* -- Minimum Payment Type -- */}
            <div>
              <p id="cc-mode-label" className="block text-sm font-medium text-neutral-700 mb-2">Minimum Payment Type</p>
              <div className="inline-flex flex-wrap rounded-lg bg-neutral-100 p-1" role="group" aria-labelledby="cc-mode-label">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={minType === opt.value}
                    onClick={() => setMinType(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      minType === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {minType === 'fixed' && (
              <SliderInput
                label="Minimum Payment"
                hint="Fixed monthly minimum payment amount"
                id="cc-min-fixed"
                value={minFixed}
                min={25}
                max={2000}
                step={5}
                minLabel={`${currencySymbol}25`}
                maxLabel={`${currencySymbol}2K`}
                onChange={setMinFixed}
                prefix={currencySymbol}
                formatDisplay={(v) => formatNumber(v)}
              />
            )}
            {minType === 'percentage' && (
              <SliderInput
                label="Minimum Payment Percentage"
                hint={`A share of the balance, never less than ${currencySymbol}${minFloor}. It falls as the balance falls.`}
                id="cc-min-pct"
                value={minPercent}
                min={1}
                max={10}
                step={0.5}
                onChange={setMinPercent}
                suffix="%"
                formatDisplay={(v) => v.toFixed(1)}
              />
            )}
            {minType === 'interestPlus' && (
              <SliderInput
                label="Percentage of Balance (plus interest)"
                hint={`The month's interest plus this share of the balance, never less than ${currencySymbol}${minFloor}. UK rules require at least interest + 1%.`}
                id="cc-min-plus"
                value={plusPercent}
                min={1}
                max={5}
                step={0.5}
                onChange={setPlusPercent}
                suffix="%"
                formatDisplay={(v) => v.toFixed(1)}
              />
            )}
          </div>

          {/* -- Extra Monthly Payment -- */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-neutral-200/80 mb-5" />
            <SliderInput
              label="Extra Monthly Payment"
              hint="Additional amount above your minimum payment"
              id="cc-extra"
              value={extra}
              min={0}
              max={2000}
              step={10}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}2K`}
              onChange={setExtra}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              Even small extra payments cut years off your payoff timeline
            </p>
          </div>

          {/* -- Summary stats -- */}
          <div className="mt-5 pt-5">
            <div className="h-px bg-neutral-200/80 mb-5" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-neutral-200/80 p-3 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 mb-0.5">Balance</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(balance)}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200/80 p-3 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <DollarSign size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 mb-0.5">{paymentLabel}</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(firstPayment)}/mo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -- Results Panel -- */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start">
          <LiveResult text={liveText} />
          {/* -- Big Number: Time to Payoff -- */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{headlineLabel}</p>
            <p
              data-headline-result
              data-headline-label={headlineLabel}
              className={`text-3xl sm:text-4xl font-bold tabular-nums ${activeResult.status === 'paid' ? 'result-number' : 'text-red-600'}`}
            >
              {headline}
            </p>
            {activeResult.status === 'never' ? (
              <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                The {cents(activeResult.firstPayment)} payment doesn't cover the {cents(activeResult.firstMonthInterest)}/mo
                interest, so the balance never goes down. Pay at least {fmt(stopGrowth)}/mo to start reducing it;{' '}
                {fmt(clearIn5)}/mo clears it in 5 years.
              </p>
            ) : activeResult.status === 'beyondHorizon' ? (
              <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                Not repaid within {HORIZON_YEARS} years: after {HORIZON_YEARS} years you would still owe{' '}
                {fmt(activeResult.remainingBalance)}, having paid {fmt(activeResult.totalInterest)} in interest.{' '}
                {fmt(clearIn5)}/mo clears it in 5 years.
              </p>
            ) : (
              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                Paying {fmt(firstPayment)}/mo{minType === 'fixed' ? '' : ' at first'} on a {fmt(balance)} balance at {apr}% APR
              </p>
            )}
          </div>

          {/* -- Comparison Cards -- */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <PlanCard
              title="Minimum Only"
              icon={<Clock size={14} className="text-neutral-500" aria-hidden="true" />}
              result={minOnlyResult}
              active={!hasExtra}
              cc={currency}
            />
            {hasExtra ? (
              <PlanCard
                title="With Extra"
                icon={<TrendingDown size={14} className="text-primary-600" aria-hidden="true" />}
                result={withExtraResult}
                active
                cc={currency}
              />
            ) : (
              <div className="rounded-xl border p-4 bg-white border-neutral-200/80">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingDown size={14} className="text-neutral-500" aria-hidden="true" />
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">With Extra</p>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">Add an extra monthly payment above to see the savings</p>
              </div>
            )}
          </div>

          {/* -- Savings / Minimum Payment Trap Banner -- */}
          {hasExtra && bothPaid && interestSaved > 0 ? (
            <div data-pdf-section className="mb-6 rounded-xl bg-primary-50 border border-primary-200/60 p-4">
              <p className="text-sm font-medium text-primary-900">
                Adding <span className="font-bold">{fmt(extra)}/mo</span> extra saves you{' '}
                <span className="font-bold text-success-600">{fmt(interestSaved)}</span> in interest
                {monthsSaved > 0 && (
                  <> and pays off <span className="font-bold">{formatMonthsLong(monthsSaved)}</span> sooner</>
                )}
              </p>
            </div>
          ) : hasExtra && withExtraResult.status === 'paid' ? (
            <div data-pdf-section className="mb-6 rounded-xl bg-primary-50 border border-primary-200/60 p-4">
              <p className="text-sm font-medium text-primary-900">
                With <span className="font-bold">{fmt(extra)}/mo</span> extra you are debt-free in{' '}
                <span className="font-bold">{formatMonthsLong(withExtraResult.months)}</span>, paying{' '}
                {fmt(withExtraResult.totalInterest)} in interest. The minimum alone{' '}
                {minOnlyResult.status === 'never' ? 'never clears this balance.' : `does not clear it within ${HORIZON_YEARS} years.`}
              </p>
            </div>
          ) : (
            <div data-pdf-section className="mb-6 rounded-xl bg-amber-50 border border-amber-200/60 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">The Minimum Payment Trap</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {minOnlyResult.status === 'paid' && (
                      <>
                        Making only minimum payments on a {fmt(balance)} balance at {apr}% costs{' '}
                        <span className="font-bold">{fmt(minOnlyResult.totalInterest)}</span> in interest and takes{' '}
                        <span className="font-bold">{formatMonthsLong(minOnlyResult.months)}</span> to pay off.
                      </>
                    )}
                    {minOnlyResult.status === 'never' && (
                      <>Minimum payments on a {fmt(balance)} balance at {apr}% never clear it: the interest grows faster than you pay.</>
                    )}
                    {minOnlyResult.status === 'beyondHorizon' && (
                      <>
                        Minimum payments on a {fmt(balance)} balance at {apr}% do not clear it within {HORIZON_YEARS} years; you
                        would pay {fmt(minOnlyResult.totalInterest)} in interest over that time and still owe{' '}
                        {fmt(minOnlyResult.remainingBalance)}.
                      </>
                    )}
                    {(minOnlyResult.status !== 'paid' || minOnlyResult.months > 12) && (
                      <> Try adding even {fmt(50)}/mo extra to see the difference.</>
                    )}
                    {hasExtra && withExtraResult.status !== 'paid' && (
                      <> Even with {fmt(extra)}/mo extra it is {withExtraResult.status === 'never' ? 'never repaid' : `not repaid within ${HORIZON_YEARS} years`}.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="credit-card-payoff" toolName="Credit Card Payoff Calculator" />
            <EmailResultsButton toolSlug="credit-card-payoff" toolName="Credit Card Payoff Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Credit Card Payoff Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* -- Balance Over Time Chart -- */}
          {chartData.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Balance Over Time</h3>
              <div className="h-56 sm:h-64">
                <Suspense fallback={<ChartSkeleton height="100%" />}>
                  <DebtBalanceChart
                    data={chartData}
                    lines={lines.map(({ key, tone }) => ({ key, tone }))}
                    currency={currency}
                    ariaLabel="Line chart of the remaining card balance by month; use Show data for the figures by year."
                  />
                </Suspense>
              </div>
              {lines.some((l) => l.result.status === 'beyondHorizon') && (
                <p className="text-xs text-neutral-500 mt-2">The chart and schedule stop at {HORIZON_YEARS} years.</p>
              )}
              <ChartDataTable
                className="mt-3"
                caption="Remaining balance at the end of each year"
                columns={[
                  { key: 'year', label: 'Year', numeric: true },
                  ...lines.map((l) => ({ key: l.key, label: l.key, format: (v: unknown) => formatMoneyGuarded(Number(v), currency) })),
                ]}
                rows={tableRows}
              />
            </div>
          )}

          {/* -- Payoff Schedule Table -- */}
          {yearGroups.length > 0 && (
            <div data-pdf-section>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Payoff Schedule</h3>
              <ScheduleTable yearGroups={yearGroups} cc={currency} />
            </div>
          )}

          <ResultAffiliate toolSlug="credit-card-payoff" />
        </div>
      </div>
    </div>
  );
}

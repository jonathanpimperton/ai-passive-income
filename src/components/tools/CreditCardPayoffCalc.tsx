import { useState, useMemo, useCallback, useRef, Fragment } from 'react';
import {
  formatCurrency,
  formatNumber,
} from '../../lib/calculator-utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, RotateCcw, CreditCard, TrendingDown, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useChartTheme } from '../../lib/useChartTheme';
import ResultAffiliate from '../ui/ResultAffiliate';

/* ── Types ────────────────────────────────────────────────── */
type MinPaymentType = 'fixed' | 'percentage';

interface PayoffMonth {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface PayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  schedule: PayoffMonth[];
}

/* ── Credit card payoff simulation ────────────────────────── */
function simulatePayoff(
  balance: number,
  apr: number,
  minType: MinPaymentType,
  minFixed: number,
  minPercent: number,
  minFloor: number,
  extra: number
): PayoffResult {
  if (balance <= 0 || (minType === 'fixed' && minFixed <= 0 && extra <= 0)) {
    return { months: 0, totalInterest: 0, totalPaid: 0, schedule: [] };
  }

  const monthlyRate = apr / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  const schedule: PayoffMonth[] = [];
  const maxMonths = 1200; // 100 years cap

  for (let month = 1; month <= maxMonths && remaining > 0.01; month++) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;

    let minPayment: number;
    if (minType === 'fixed') {
      minPayment = minFixed;
    } else {
      minPayment = Math.max(remaining * (minPercent / 100), minFloor);
    }

    let payment = minPayment + extra;

    // Can't pay more than balance + interest
    if (payment > remaining + interest) {
      payment = remaining + interest;
    }

    // Check if minimum payment even covers interest
    if (payment <= interest && month > 1) {
      // Payment doesn't cover interest — debt grows forever
      // Return with a large month count to signal this
      return {
        months: maxMonths,
        totalInterest: totalInterest,
        totalPaid: totalPaid,
        schedule,
      };
    }

    const principalPaid = payment - interest;
    remaining = Math.max(0, remaining - principalPaid);
    totalPaid += payment;

    schedule.push({
      month,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(remaining * 100) / 100,
    });
  }

  return {
    months: schedule.length,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    schedule,
  };
}

/* ── Format months as "X years, Y months" ─────────────────── */
function formatMonths(months: number): string {
  if (months >= 1200) return '100+ years';
  if (months === 0) return '0 months';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} month${m !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

/* ── Collapsible Year-Group Schedule Table ─────────────────── */
interface YearGroup {
  year: number;
  startBalance: number;
  endBalance: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  months: PayoffMonth[];
}

function buildYearGroups(schedule: PayoffMonth[], startingBalance: number): YearGroup[] {
  const groups: YearGroup[] = [];
  let currentYear = 1;
  let yearMonths: PayoffMonth[] = [];
  let yearStart = startingBalance;

  for (const row of schedule) {
    const rowYear = Math.ceil(row.month / 12);
    if (rowYear !== currentYear) {
      if (yearMonths.length > 0) {
        groups.push({
          year: currentYear,
          startBalance: yearStart,
          endBalance: yearMonths[yearMonths.length - 1].balance,
          totalPrincipal: yearMonths.reduce((s, m) => s + m.principal, 0),
          totalInterest: yearMonths.reduce((s, m) => s + m.interest, 0),
          totalPayment: yearMonths.reduce((s, m) => s + m.payment, 0),
          months: yearMonths,
        });
      }
      yearStart = yearMonths.length > 0 ? yearMonths[yearMonths.length - 1].balance : yearStart;
      yearMonths = [];
      currentYear = rowYear;
    }
    yearMonths.push(row);
  }

  if (yearMonths.length > 0) {
    groups.push({
      year: currentYear,
      startBalance: yearStart,
      endBalance: yearMonths[yearMonths.length - 1].balance,
      totalPrincipal: yearMonths.reduce((s, m) => s + m.principal, 0),
      totalInterest: yearMonths.reduce((s, m) => s + m.interest, 0),
      totalPayment: yearMonths.reduce((s, m) => s + m.payment, 0),
      months: yearMonths,
    });
  }

  return groups;
}

function ScheduleTable({ yearGroups, cc }: { yearGroups: YearGroup[]; cc: string }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmt = (v: number) => formatCurrency(v, cc);

  if (yearGroups.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600">Principal</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600">Interest</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Balance</th>
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
                <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums">
                  {fmt(group.totalPrincipal)}
                </td>
                <td className="py-2.5 px-4 text-right text-red-600 tabular-nums">
                  {fmt(group.totalInterest)}
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums hidden sm:table-cell">
                  {fmt(group.endBalance)}
                </td>
              </tr>
              {expandedYear === group.year && (
                <tr className="bg-primary-50/30 border-b border-primary-100/50">
                  <td colSpan={4} className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-primary-100/50">
                            <th className="text-left py-2 px-4 font-medium text-neutral-500">Month</th>
                            <th className="text-right py-2 px-4 font-medium text-neutral-500">Payment</th>
                            <th className="text-right py-2 px-4 font-medium text-neutral-500">Principal</th>
                            <th className="text-right py-2 px-4 font-medium text-neutral-500">Interest</th>
                            <th className="text-right py-2 px-4 font-medium text-neutral-500">Balance</th>
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

/* ── Defaults ──────────────────────────────────────────────── */
const DEFAULTS = {
  balance: 5000,
  apr: 22.99,
  minType: 'fixed' as MinPaymentType,
  minFixed: 100,
  minPercent: 2,
  minFloor: 25,
  extra: 0,
};

/* ── Main Calculator ──────────────────────────────────────── */
export default function CreditCardPayoffCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const ct = useChartTheme();

  const [balance, setBalance] = useState(DEFAULTS.balance);
  const [apr, setApr] = useState(DEFAULTS.apr);
  const [minType, setMinType] = useState<MinPaymentType>(DEFAULTS.minType);
  const [minFixed, setMinFixed] = useState(DEFAULTS.minFixed);
  const [minPercent, setMinPercent] = useState(DEFAULTS.minPercent);
  const [extra, setExtra] = useState(DEFAULTS.extra);

  /* ── Compute payoff: minimum only ────────────────────── */
  const minOnlyResult = useMemo(
    () => simulatePayoff(balance, apr, minType, minFixed, minPercent, DEFAULTS.minFloor, 0),
    [balance, apr, minType, minFixed, minPercent]
  );

  /* ── Compute payoff: with extra payments ─────────────── */
  const withExtraResult = useMemo(
    () => simulatePayoff(balance, apr, minType, minFixed, minPercent, DEFAULTS.minFloor, extra),
    [balance, apr, minType, minFixed, minPercent, extra]
  );

  const hasExtra = extra > 0;
  const interestSaved = minOnlyResult.totalInterest - withExtraResult.totalInterest;
  const monthsSaved = minOnlyResult.months - withExtraResult.months;
  const activeResult = hasExtra ? withExtraResult : minOnlyResult;
  const isNeverPaidOff = activeResult.months >= 1200;

  /* ── Year groups for schedule table ──────────────────── */
  const yearGroups = useMemo(
    () => buildYearGroups(activeResult.schedule, balance),
    [activeResult.schedule, balance]
  );

  /* ── Chart data: min-only vs with-extra ──────────────── */
  const chartData = useMemo(() => {
    const maxLen = Math.max(minOnlyResult.schedule.length, withExtraResult.schedule.length);
    // Cap at 600 for display (50 years)
    const cappedMax = Math.min(maxLen, 600);
    const data: Array<{ month: number; 'Minimum Only': number; 'With Extra': number }> = [];

    const interval = cappedMax > 120 ? 6 : cappedMax > 60 ? 3 : 1;

    for (let i = 0; i < cappedMax; i += interval) {
      const minVal = minOnlyResult.schedule[i]?.balance ?? 0;
      const extraVal = withExtraResult.schedule[i]?.balance ?? 0;
      data.push({
        month: i + 1,
        'Minimum Only': Math.round(minVal),
        'With Extra': hasExtra ? Math.round(extraVal) : Math.round(minVal),
      });
    }

    // Ensure last point included
    if (cappedMax > 0) {
      const lastIdx = cappedMax - 1;
      const lastMonth = lastIdx + 1;
      if (data.length === 0 || data[data.length - 1].month !== lastMonth) {
        data.push({
          month: lastMonth,
          'Minimum Only': Math.round(minOnlyResult.schedule[lastIdx]?.balance ?? 0),
          'With Extra': hasExtra
            ? Math.round(withExtraResult.schedule[lastIdx]?.balance ?? 0)
            : Math.round(minOnlyResult.schedule[lastIdx]?.balance ?? 0),
        });
      }
    }

    return data;
  }, [minOnlyResult, withExtraResult, hasExtra]);

  /* ── Current monthly payment display ─────────────────── */
  const currentMinPayment = useMemo(() => {
    if (minType === 'fixed') return minFixed;
    return Math.max(balance * (minPercent / 100), DEFAULTS.minFloor);
  }, [balance, minType, minFixed, minPercent]);

  /* ── Handlers ────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setBalance(DEFAULTS.balance);
    setApr(DEFAULTS.apr);
    setMinType(DEFAULTS.minType);
    setMinFixed(DEFAULTS.minFixed);
    setMinPercent(DEFAULTS.minPercent);
    setExtra(DEFAULTS.extra);
  }, []);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Credit Card Balance', value: fmt(balance) },
      { label: 'Annual Interest Rate (APR)', value: `${apr}%` },
    ];
    if (minType === 'fixed') {
      inputs.push({ label: 'Minimum Payment (Fixed)', value: fmt(minFixed) });
    } else {
      inputs.push({ label: 'Minimum Payment (%)', value: `${minPercent}% (min ${fmt(DEFAULTS.minFloor)})` });
    }
    inputs.push({ label: 'Extra Monthly Payment', value: fmt(extra) });
    return inputs;
  }, [balance, apr, minType, minFixed, minPercent, extra, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const results: ResultItem[] = [
      { label: 'Paid Off In', value: formatMonths(activeResult.months), highlight: true },
      { label: 'Total Interest', value: fmt(activeResult.totalInterest) },
      { label: 'Total Amount Paid', value: fmt(activeResult.totalPaid) },
    ];
    if (hasExtra && interestSaved > 0) {
      results.push({ label: 'Interest Saved', value: fmt(interestSaved) });
    }
    return results;
  }, [activeResult, interestSaved, hasExtra, currency]);

  const animatedMonths = useAnimatedNumber(activeResult.months);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ──────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
              Inputs
            </h2>
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

            {/* ── Minimum Payment Type Toggle ─────────── */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Minimum Payment Type
              </label>
              <div className="inline-flex rounded-lg bg-neutral-100 p-1" role="radiogroup" aria-label="Minimum payment type">
                <button
                  role="radio"
                  aria-checked={minType === 'fixed'}
                  onClick={() => setMinType('fixed')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    minType === 'fixed'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Fixed Amount
                </button>
                <button
                  role="radio"
                  aria-checked={minType === 'percentage'}
                  onClick={() => setMinType('percentage')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    minType === 'percentage'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  % of Balance
                </button>
              </div>
            </div>

            {minType === 'fixed' ? (
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
            ) : (
              <SliderInput
                label="Minimum Payment Percentage"
                hint={`Percentage of balance (min ${currencySymbol}${DEFAULTS.minFloor} floor)`}
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
          </div>

          {/* ── Extra Monthly Payment ──────────────────── */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
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

          {/* ── Summary stats ──────────────────────────── */}
          <div className="mt-5 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-neutral-200/80 p-3 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Balance</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {fmt(balance)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-neutral-200/80 p-3 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <DollarSign size={16} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Monthly Payment</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {fmt(currentMinPayment + extra)}/mo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Results Panel ──────────────────────────────── */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" aria-live="polite">
          {/* ── Big Number: Time to Payoff ──────────────── */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">
              {hasExtra ? 'Paid Off In (with extra payments)' : 'Paid Off In'}
            </p>
            <p data-headline-result data-headline-label={hasExtra ? 'Paid Off In (with extra payments)' : 'Paid Off In'} className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {isNeverPaidOff ? '100+ years' : formatMonths(Math.round(animatedMonths))}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Paying {fmt(currentMinPayment + extra)}/mo on a {fmt(balance)} balance at {apr}% APR
            </p>
          </div>

          {/* ── Comparison Cards ────────────────────────── */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            {/* Minimum Only Card */}
            <div className={`rounded-xl border p-4 transition-all duration-200 ${
              !hasExtra
                ? 'bg-white border-primary-300 shadow-sm ring-1 ring-primary-200/50'
                : 'bg-white border-neutral-200/80'
            }`}>
              <div className="flex items-center gap-1.5 mb-3">
                <Clock size={14} className="text-neutral-500" aria-hidden="true" />
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Minimum Only
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-neutral-500">Time to Payoff</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {formatMonths(minOnlyResult.months)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Total Interest</p>
                  <p className="text-sm font-semibold text-red-600 tabular-nums">
                    {fmt(minOnlyResult.totalInterest)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Total Paid</p>
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {fmt(minOnlyResult.totalPaid)}
                  </p>
                </div>
              </div>
            </div>

            {/* With Extra Card */}
            <div className={`rounded-xl border p-4 transition-all duration-200 ${
              hasExtra
                ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-200/50'
                : 'bg-white border-neutral-200/80 opacity-60'
            }`}>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingDown size={14} className="text-emerald-600" aria-hidden="true" />
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  With Extra
                </p>
              </div>
              {hasExtra ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-neutral-500">Time to Payoff</p>
                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                      {formatMonths(withExtraResult.months)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Total Interest</p>
                    <p className="text-sm font-semibold text-red-600 tabular-nums">
                      {fmt(withExtraResult.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Total Paid</p>
                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                      {fmt(withExtraResult.totalPaid)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Add an extra monthly payment above to see the savings
                </p>
              )}
            </div>
          </div>

          {/* ── Savings / Minimum Payment Trap Banner ──── */}
          {hasExtra && interestSaved > 0 ? (
            <div data-pdf-section className="mb-6 rounded-xl bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-200/60 p-4">
              <p className="text-sm font-medium text-primary-900">
                Adding <span className="font-bold">{fmt(extra)}/mo</span> extra saves you{' '}
                <span className="font-bold text-success-600">{fmt(interestSaved)}</span> in interest
                {monthsSaved > 0 && (
                  <> and pays off <span className="font-bold">{formatMonths(monthsSaved)}</span> sooner</>
                )}
              </p>
            </div>
          ) : (
            <div data-pdf-section className="mb-6 rounded-xl bg-amber-50 border border-amber-200/60 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">The Minimum Payment Trap</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Making only minimum payments on a {fmt(balance)} balance at {apr}% costs{' '}
                    <span className="font-bold">{fmt(minOnlyResult.totalInterest)}</span> in interest and takes{' '}
                    <span className="font-bold">{formatMonths(minOnlyResult.months)}</span> to pay off.
                    {minOnlyResult.months > 12 && (
                      <> Try adding even {fmt(50)}/mo extra to see the difference.</>
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

          {/* ── Balance Over Time Chart ─────────────────── */}
          {chartData.length > 1 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Balance Over Time
              </h3>
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid stroke={ct.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={{ stroke: ct.axis }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                      label={{ value: 'Months', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: ct.axisText } }}
                    />
                    <YAxis
                      tickFormatter={(v: number) => { const s = currency === 'GBP' ? '\u00A3' : currency === 'EUR' ? '\u20AC' : '$'; return `${s}${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`; }}
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip labelPrefix="Month" formatValue={fmt} />} />
                    <Line
                      type="monotone"
                      dataKey="Minimum Only"
                      stroke={ct.series2}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      animationDuration={600}
                    />
                    {hasExtra && (
                      <Line
                        type="monotone"
                        dataKey="With Extra"
                        stroke={ct.series1}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        animationDuration={600}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Payoff Schedule Table ───────────────────── */}
          {yearGroups.length > 0 && (
            <div data-pdf-section>
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Payoff Schedule
              </h3>
              <ScheduleTable yearGroups={yearGroups} cc={currency} />
            </div>
          )}

          <ResultAffiliate toolSlug="credit-card-payoff" />
        </div>
      </div>
    </div>
  );
}

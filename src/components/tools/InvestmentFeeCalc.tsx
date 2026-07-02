import { useState, useMemo, useCallback, useRef } from 'react';
import {
  compoundInterest,
  compoundInterestSchedule,
  formatCurrency,
  formatNumber,
} from '../../lib/calculator-utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RotateCcw, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
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

/* ── Defaults ─────────────────────────────────────────────── */
const DEFAULTS = {
  principal: 50000,
  monthly: 500,
  rate: 7,
  years: 30,
  yourFee: 0.5,
  comparisonFee: 1.0,
};

/* ── Main Calculator ──────────────────────────────────────── */
export default function InvestmentFeeCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const ct = useChartTheme();

  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [monthly, setMonthly] = useState(DEFAULTS.monthly);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [yourFee, setYourFee] = useState(DEFAULTS.yourFee);
  const [comparisonFee, setComparisonFee] = useState(DEFAULTS.comparisonFee);

  /* ── Core calculations ──────────────────────────────────── */
  const results = useMemo(() => {
    const lowFee = Math.min(yourFee, comparisonFee);
    const highFee = Math.max(yourFee, comparisonFee);

    // Effective returns = gross return minus fee
    const yourEffective = (rate - yourFee) / 100;
    const compEffective = (rate - comparisonFee) / 100;
    const zeroFeeReturn = rate / 100;

    // Final balances
    const yourBalance = compoundInterest(principal, monthly, yourEffective, years);
    const compBalance = compoundInterest(principal, monthly, compEffective, years);
    const zeroFeeBalance = compoundInterest(principal, monthly, zeroFeeReturn, years);

    // Total contributions
    const totalContributions = principal + monthly * 12 * years;

    // Earnings
    const yourEarnings = yourBalance - totalContributions;
    const compEarnings = compBalance - totalContributions;

    // Fees paid = what you would have earned with 0% fee minus what you actually earned
    const yourFeesPaid = zeroFeeBalance - yourBalance;
    const compFeesPaid = zeroFeeBalance - compBalance;

    // Fee cost = difference between the two scenarios
    const feeCost = Math.abs(yourBalance - compBalance);

    // Who has the lower fee?
    const lowerFeeBalance = yourFee <= comparisonFee ? yourBalance : compBalance;
    const higherFeeBalance = yourFee <= comparisonFee ? compBalance : yourBalance;

    // Percentage of returns lost to higher fee vs lower fee
    const lowerFeeEarnings = lowerFeeBalance - totalContributions;
    const pctReturnsLost = lowerFeeEarnings > 0 ? (feeCost / lowerFeeEarnings) * 100 : 0;

    return {
      yourBalance,
      compBalance,
      yourEffectiveRate: rate - yourFee,
      compEffectiveRate: rate - comparisonFee,
      totalContributions,
      yourEarnings,
      compEarnings,
      yourFeesPaid,
      compFeesPaid,
      feeCost,
      pctReturnsLost,
      lowFee,
      highFee,
    };
  }, [principal, monthly, rate, years, yourFee, comparisonFee]);

  /* ── Chart data ─────────────────────────────────────────── */
  const chartData = useMemo(() => {
    const yourSchedule = compoundInterestSchedule(principal, monthly, (rate - yourFee) / 100, years);
    const compSchedule = compoundInterestSchedule(principal, monthly, (rate - comparisonFee) / 100, years);

    return yourSchedule.map((row, i) => ({
      year: row.year,
      [`Your fund (${yourFee}% fee)`]: row.balance,
      [`Comparison (${comparisonFee}% fee)`]: compSchedule[i]?.balance ?? 0,
    }));
  }, [principal, monthly, rate, years, yourFee, comparisonFee]);

  /* ── Animated big number ────────────────────────────────── */
  const animatedFeeCost = useAnimatedNumber(results.feeCost);

  /* ── PDF / Email callbacks ──────────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Initial Investment', value: fmt(principal) },
    { label: 'Monthly Contribution', value: fmt(monthly) },
    { label: 'Expected Annual Return', value: `${rate}%` },
    { label: 'Investment Period', value: `${years} year${years !== 1 ? 's' : ''}` },
    { label: 'Your Fund Fee', value: `${yourFee}%` },
    { label: 'Comparison Fee', value: `${comparisonFee}%` },
  ], [principal, monthly, rate, years, yourFee, comparisonFee, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Fee Difference Cost', value: fmt(results.feeCost), highlight: true },
    { label: `Balance at ${yourFee}% fee`, value: fmt(results.yourBalance) },
    { label: `Balance at ${comparisonFee}% fee`, value: fmt(results.compBalance) },
    { label: 'Total Contributions', value: fmt(results.totalContributions) },
    { label: 'Returns Lost to Fee Gap', value: `${results.pctReturnsLost.toFixed(1)}%` },
  ], [results, yourFee, comparisonFee, currency]);

  /* ── Reset ──────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setPrincipal(DEFAULTS.principal);
    setMonthly(DEFAULTS.monthly);
    setRate(DEFAULTS.rate);
    setYears(DEFAULTS.years);
    setYourFee(DEFAULTS.yourFee);
    setComparisonFee(DEFAULTS.comparisonFee);
  }, []);

  /* ── Chart keys and Y-axis formatter ────────────────────── */
  const yourKey = `Your fund (${yourFee}% fee)`;
  const compKey = `Comparison (${comparisonFee}% fee)`;

  const yAxisFormatter = (v: number) => {
    const s = currency === 'GBP' ? '\u00A3' : currency === 'EUR' ? '\u20AC' : '$';
    if (v >= 1000000) return `${s}${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${s}${(v / 1000).toFixed(0)}K`;
    return `${s}${v}`;
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ────────────────────────────────── */}
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
              label="Initial Investment"
              hint="Your starting balance today"
              id="if-principal"
              value={principal}
              min={0}
              max={500000}
              step={1000}
              textMax={1000000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}500K`}
              onChange={setPrincipal}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Monthly Contribution"
              hint="Amount you'll add each month"
              id="if-monthly"
              value={monthly}
              min={0}
              max={5000}
              step={25}
              textMax={10000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}5K`}
              onChange={setMonthly}
              prefix={currencySymbol}
              formatDisplay={(v) => formatNumber(v)}
            />
            <SliderInput
              label="Expected Annual Return"
              hint="Gross return before fees (~7-10% for stocks)"
              id="if-rate"
              value={rate}
              min={1}
              max={15}
              step={0.1}
              onChange={setRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />
            <SliderInput
              label="Investment Period (Years)"
              hint="How long you'll stay invested"
              id="if-years"
              value={years}
              min={1}
              max={50}
              step={1}
              onChange={setYears}
            />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent my-2" />

            <SliderInput
              label="Your Fund Fee (Expense Ratio)"
              hint="Annual fee charged by your fund"
              id="if-your-fee"
              value={yourFee}
              min={0}
              max={3}
              step={0.01}
              onChange={setYourFee}
              suffix="%"
              formatDisplay={(v) => v.toFixed(2)}
            />
            <SliderInput
              label="Comparison Fee"
              hint="Fee of the fund you're comparing against"
              id="if-comp-fee"
              value={comparisonFee}
              min={0}
              max={3}
              step={0.01}
              onChange={setComparisonFee}
              suffix="%"
              formatDisplay={(v) => v.toFixed(2)}
            />
          </div>
        </div>

        {/* ── Results Panel ───────────────────────────── */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite">
          {/* Big Number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Fee Difference Costs You</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {fmt(animatedFeeCost)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              A {Math.abs(yourFee - comparisonFee).toFixed(2)}% fee gap over {years} year{years !== 1 ? 's' : ''} on your investment
            </p>
          </div>

          {/* Side-by-side stat cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Your fund at {yourFee}%</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums truncate">
                  {fmt(results.yourBalance)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingDown size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Comparison at {comparisonFee}%</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums truncate">
                  {fmt(results.compBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Insight card */}
          <div data-pdf-section className="bg-amber-50 border border-amber-200/60 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">The Hidden Cost of Fees</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  A {Math.abs(yourFee - comparisonFee).toFixed(2)}% difference in fees on a {fmt(principal)} investment
                  with {fmt(monthly)}/month over {years} years costs {fmt(results.feeCost)}
                  {results.pctReturnsLost > 0 && (
                    <> &mdash; that's {results.pctReturnsLost.toFixed(1)}% of your potential returns</>
                  )}.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200/80">
                  <th className="text-left py-3 px-4 font-medium text-neutral-600"></th>
                  <th className="text-right py-3 px-4 font-medium text-primary-700">Your Fund ({yourFee}%)</th>
                  <th className="text-right py-3 px-4 font-medium text-accent-700">Comparison ({comparisonFee}%)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 px-4 text-neutral-700 font-medium">Effective Return</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-neutral-900">{results.yourEffectiveRate.toFixed(2)}%</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-neutral-900">{results.compEffectiveRate.toFixed(2)}%</td>
                </tr>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <td className="py-2.5 px-4 text-neutral-700 font-medium">Final Balance</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-neutral-900">{fmt(results.yourBalance)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-neutral-900">{fmt(results.compBalance)}</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 px-4 text-neutral-700 font-medium">Total Contributions</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-neutral-900">{fmt(results.totalContributions)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-neutral-900">{fmt(results.totalContributions)}</td>
                </tr>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <td className="py-2.5 px-4 text-neutral-700 font-medium">Total Earnings</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-primary-700">{fmt(results.yourEarnings)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-accent-700">{fmt(results.compEarnings)}</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2.5 px-4 text-neutral-700 font-medium">Fees Paid (Lost Growth)</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-red-600">{fmt(results.yourFeesPaid)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-red-600">{fmt(results.compFeesPaid)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="investment-fee" toolName="Investment Fee Calculator" />
            <EmailResultsButton toolSlug="investment-fee" toolName="Investment Fee Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Investment Fee Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          <ResultAffiliate toolSlug="investment-fee" />

          {/* Area Chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Portfolio Growth Comparison</h3>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="ifColorYour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B6E6E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0B6E6E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ifColorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22A06B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22A06B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={{ stroke: ct.axis }}
                  />
                  <YAxis
                    tickFormatter={yAxisFormatter}
                    tick={{ fontSize: 12, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip formatValue={fmt} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey={yourKey}
                    stroke="#0B6E6E"
                    strokeWidth={2}
                    fill="url(#ifColorYour)"
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey={compKey}
                    stroke="#22A06B"
                    strokeWidth={2}
                    fill="url(#ifColorComp)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year-by-Year Table */}
          <div data-pdf-section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Year-by-Year Comparison</h3>
            <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
                    <th className="text-right py-3 px-4 font-medium text-primary-700">{yourFee}% Fee</th>
                    <th className="text-right py-3 px-4 font-medium text-accent-700 hidden sm:table-cell">{comparisonFee}% Fee</th>
                    <th className="text-right py-3 px-4 font-medium text-red-600">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.filter((row) => row.year > 0).map((row, i) => {
                    const yourVal = row[yourKey] as number;
                    const compVal = row[compKey] as number;
                    const diff = Math.abs(yourVal - compVal);
                    return (
                      <tr
                        key={row.year}
                        className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                      >
                        <td className="py-2.5 px-4 text-neutral-900 font-medium tabular-nums">{row.year}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums">{fmt(yourVal)}</td>
                        <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums hidden sm:table-cell">{fmt(compVal)}</td>
                        <td className="py-2.5 px-4 text-right text-red-600 tabular-nums">{fmt(diff)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
import { ChevronDown, RotateCcw, Trophy } from 'lucide-react';
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
import ResultAffiliate from '../ui/ResultAffiliate';

/* ── Finance calculation helpers ──────────────────────────── */

/** Standard loan monthly payment: M = P × r(1+r)^n / ((1+r)^n - 1) */
function calcMonthly(principal: number, aprPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (aprPercent <= 0) return principal / months;
  const r = aprPercent / 100 / 12;
  const n = months;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * PCP monthly payment with balloon (GMFV).
 * Monthly = r × (PV - FV / (1+r)^n) / (1 - (1+r)^-n)
 * Where PV = finance amount, FV = balloon, r = monthly rate, n = months.
 */
function calcPcpMonthly(financeAmount: number, balloon: number, aprPercent: number, months: number): number {
  if (financeAmount <= 0 || months <= 0) return 0;
  if (aprPercent <= 0) return (financeAmount - balloon) / months;
  const r = aprPercent / 100 / 12;
  const n = months;
  const pvMinusFv = financeAmount - balloon / Math.pow(1 + r, n);
  return (pvMinusFv * r) / (1 - Math.pow(1 + r, -n));
}

const BAR_COLORS = ['#0B6E6E', '#22A06B', '#3B82F6', '#8B5CF6'];

interface FinanceResult {
  type: string;
  label: string;
  monthly: number;
  totalPaid: number;
  totalInterest: number;
  ownAtEnd: string;
  note: string;
}

const DEFAULTS = {
  carPrice: 25000,
  deposit: 2500,
  termMonths: 48,
  pcpApr: 7.9,
  pcpBalloonPct: 40,
  hpApr: 8.9,
  loanApr: 5.6,
  cashReturnRate: 4.5,
};

export default function CarFinanceCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const ct = useChartTheme();

  const [carPrice, setCarPrice] = useState(DEFAULTS.carPrice);
  const [deposit, setDeposit] = useState(DEFAULTS.deposit);
  const [termMonths, setTermMonths] = useState(DEFAULTS.termMonths);
  const [pcpApr, setPcpApr] = useState(DEFAULTS.pcpApr);
  const [pcpBalloonPct, setPcpBalloonPct] = useState(DEFAULTS.pcpBalloonPct);
  const [hpApr, setHpApr] = useState(DEFAULTS.hpApr);
  const [loanApr, setLoanApr] = useState(DEFAULTS.loanApr);
  const [cashReturnRate, setCashReturnRate] = useState(DEFAULTS.cashReturnRate);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReset = useCallback(() => {
    setCarPrice(DEFAULTS.carPrice);
    setDeposit(DEFAULTS.deposit);
    setTermMonths(DEFAULTS.termMonths);
    setPcpApr(DEFAULTS.pcpApr);
    setPcpBalloonPct(DEFAULTS.pcpBalloonPct);
    setHpApr(DEFAULTS.hpApr);
    setLoanApr(DEFAULTS.loanApr);
    setCashReturnRate(DEFAULTS.cashReturnRate);
  }, []);

  /* ── Core calculation ───────────────────────────────────── */

  const results = useMemo((): FinanceResult[] => {
    const financeAmount = Math.max(0, carPrice - deposit);
    const balloon = carPrice * (pcpBalloonPct / 100);

    // PCP (keep the car)
    const pcpMonthly = calcPcpMonthly(financeAmount, balloon, pcpApr, termMonths);
    const pcpTotalPaid = deposit + pcpMonthly * termMonths + balloon;
    const pcpInterest = pcpTotalPaid - carPrice;

    // HP
    const hpMonthly = calcMonthly(financeAmount, hpApr, termMonths);
    const hpTotalPaid = deposit + hpMonthly * termMonths;
    const hpInterest = hpTotalPaid - carPrice;

    // Personal Loan
    const loanMonthly = calcMonthly(financeAmount, loanApr, termMonths);
    const loanTotalPaid = deposit + loanMonthly * termMonths;
    const loanInterest = loanTotalPaid - carPrice;

    // Cash
    const cashTotalPaid = carPrice;
    const years = termMonths / 12;
    const opportunityCost = financeAmount * (Math.pow(1 + cashReturnRate / 100, years) - 1);

    return [
      {
        type: 'pcp',
        label: 'PCP',
        monthly: pcpMonthly,
        totalPaid: pcpTotalPaid,
        totalInterest: pcpInterest,
        ownAtEnd: `Optional (${fmt(balloon)} balloon)`,
        note: 'Lowest monthly payment. Balloon payment required to keep the car.',
      },
      {
        type: 'hp',
        label: 'Hire Purchase',
        monthly: hpMonthly,
        totalPaid: hpTotalPaid,
        totalInterest: hpInterest,
        ownAtEnd: 'Yes',
        note: 'You own the car at the end. No mileage limits.',
      },
      {
        type: 'loan',
        label: 'Personal Loan',
        monthly: loanMonthly,
        totalPaid: loanTotalPaid,
        totalInterest: loanInterest,
        ownAtEnd: 'Yes (from day one)',
        note: 'Often the lowest APR. You own the car outright immediately.',
      },
      {
        type: 'cash',
        label: 'Cash Purchase',
        monthly: 0,
        totalPaid: cashTotalPaid,
        totalInterest: 0,
        ownAtEnd: 'Yes (immediate)',
        note: `No interest, but ${fmt(Math.round(opportunityCost))} opportunity cost if invested at ${cashReturnRate}%.`,
      },
    ];
  }, [carPrice, deposit, termMonths, pcpApr, pcpBalloonPct, hpApr, loanApr, cashReturnRate, currency]);

  // Find cheapest (owning the car at the end — exclude PCP return-only)
  const cheapest = useMemo(() => {
    const owning = results.filter(r => r.type !== 'pcp');
    return owning.reduce((best, r) => r.totalPaid < best.totalPaid ? r : best, owning[0]);
  }, [results]);

  // Chart data
  const chartData = useMemo(() =>
    results.map(r => ({
      name: r.label,
      total: Math.round(r.totalPaid),
      interest: Math.round(r.totalInterest),
    })),
  [results]);

  /* ── Callbacks for PDF / Email ──────────────────────────── */

  const getInputs = useCallback(() => [
    { label: 'Car Price', value: fmt(carPrice) },
    { label: 'Deposit', value: fmt(deposit) },
    { label: 'Term', value: `${termMonths} months` },
    { label: 'PCP APR', value: `${pcpApr}%` },
    { label: 'PCP Balloon', value: `${pcpBalloonPct}%` },
    { label: 'HP APR', value: `${hpApr}%` },
    { label: 'Personal Loan APR', value: `${loanApr}%` },
  ], [carPrice, deposit, termMonths, pcpApr, pcpBalloonPct, hpApr, loanApr, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const winner = cheapest;
    return [
      { label: 'Cheapest Option', value: winner.label, highlight: true },
      ...results.map(r => ({ label: `${r.label} Monthly`, value: r.monthly > 0 ? fmt(r.monthly) : 'N/A' })),
      ...results.map(r => ({ label: `${r.label} Total`, value: fmt(r.totalPaid) })),
    ];
  }, [results, cheapest, currency]);

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ───── Inputs ───── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Car Details</h2>
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
            <SliderInput
              label="Car Price"
              hint="On-the-road price of the vehicle"
              id="car-price"
              value={carPrice}
              min={3000}
              max={150000}
              step={500}
              onChange={setCarPrice}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Deposit"
              hint="Upfront payment or trade-in value"
              id="car-deposit"
              value={deposit}
              min={0}
              max={Math.min(carPrice, 75000)}
              step={500}
              onChange={setDeposit}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Term"
              hint="Finance period in months"
              id="car-term"
              value={termMonths}
              min={12}
              max={84}
              step={6}
              onChange={setTermMonths}
              suffix=" months"
              formatDisplay={(v) => v.toFixed(0)}
            />

            {/* PCP section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BAR_COLORS[0] }} />
                PCP (Personal Contract Purchase)
              </h3>
              <div className="space-y-4">
                <SliderInput
                  label="PCP APR"
                  hint="Annual percentage rate for PCP deal"
                  id="car-pcp-apr"
                  value={pcpApr}
                  min={0}
                  max={25}
                  step={0.1}
                  onChange={setPcpApr}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(1)}
                />
                <SliderInput
                  label="Balloon / GMFV"
                  hint="Guaranteed future value as % of car price"
                  id="car-pcp-balloon"
                  value={pcpBalloonPct}
                  min={15}
                  max={60}
                  step={1}
                  onChange={setPcpBalloonPct}
                  suffix="%"
                  formatDisplay={(v) => `${v.toFixed(0)} (${fmt(carPrice * v / 100)})`}
                />
              </div>
            </div>

            {/* HP section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BAR_COLORS[1] }} />
                HP (Hire Purchase)
              </h3>
              <SliderInput
                label="HP APR"
                hint="Annual percentage rate for hire purchase"
                id="car-hp-apr"
                value={hpApr}
                min={0}
                max={25}
                step={0.1}
                onChange={setHpApr}
                suffix="%"
                formatDisplay={(v) => v.toFixed(1)}
              />
            </div>

            {/* Personal Loan section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BAR_COLORS[2] }} />
                Personal Loan
              </h3>
              <SliderInput
                label="Loan APR"
                hint="Bank or credit union personal loan rate"
                id="car-loan-apr"
                value={loanApr}
                min={0}
                max={25}
                step={0.1}
                onChange={setLoanApr}
                suffix="%"
                formatDisplay={(v) => v.toFixed(1)}
              />
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1">
                <SliderInput
                  label="Savings Return Rate"
                  hint="Expected return if you invested the cash instead"
                  id="car-cash-return"
                  value={cashReturnRate}
                  min={0}
                  max={12}
                  step={0.5}
                  onChange={setCashReturnRate}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(1)}
                />
              </div>
            )}
          </div>
        </div>

        {/* ───── Results ───── */}
        <div
          className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          aria-live="polite"
          ref={resultsRef}
        >
          {/* Winner badge */}
          <div data-pdf-section className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium mb-3">
              <Trophy size={14} aria-hidden="true" />
              {cheapest.label} is cheapest to own
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Based on total cost to own the car over {termMonths} months with a {fmt(deposit)} deposit.
              {results[0].monthly > 0 && ` PCP has the lowest monthly payment at ${fmt(results[0].monthly)}/mo.`}
            </p>
          </div>

          {/* Comparison cards */}
          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {results.map((r, i) => (
              <div
                key={r.type}
                className={`bg-white rounded-xl border p-4 relative overflow-hidden ${
                  r.type === cheapest.type
                    ? 'border-green-300 ring-1 ring-green-200'
                    : 'border-neutral-200/80'
                }`}
              >
                {r.type === cheapest.type && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wide">
                    Cheapest
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: BAR_COLORS[i] }}
                  />
                  <h3 className="text-sm font-semibold text-neutral-800">{r.label}</h3>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-neutral-500 mb-0.5">Monthly Payment</p>
                  <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                    {r.monthly > 0 ? fmt(r.monthly) : '—'}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total paid</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(r.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Interest</span>
                    <span className={`font-medium tabular-nums ${r.totalInterest > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {r.totalInterest > 0 ? fmt(r.totalInterest) : fmt(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Own the car?</span>
                    <span className="font-medium text-neutral-700 text-right text-xs leading-snug max-w-[60%]">{r.ownAtEnd}</span>
                  </div>
                </div>

                <p className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 leading-relaxed">
                  {r.note}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="car-finance" toolName="Car Finance Comparison Calculator" />
            <EmailResultsButton toolSlug="car-finance" toolName="Car Finance Comparison Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Car Finance Comparison Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          <ResultAffiliate toolSlug="car-finance" />

          {/* Total cost bar chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Total Cost Comparison</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="name" tick={{ fill: ct.axisText, fontSize: 11 }} stroke={ct.axis} />
                  <YAxis tick={{ fill: ct.axisText, fontSize: 12 }} stroke={ct.axis} tickFormatter={(v: number) => `${currencySymbol}${formatNumber(v)}`} />
                  <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
                  <Bar dataKey="total" name="Total Paid" animationDuration={600} radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed comparison table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200/60">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Metric</th>
                  {results.map(r => (
                    <th key={r.type} className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Monthly Payment', key: 'monthly' as const },
                  { label: 'Total Paid', key: 'totalPaid' as const },
                  { label: 'Total Interest', key: 'totalInterest' as const },
                ].map((row, ri) => (
                  <tr key={row.key} className={`border-b border-neutral-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                    <td className="py-2.5 px-3 font-medium text-neutral-700">{row.label}</td>
                    {results.map(r => (
                      <td key={r.type} className="py-2.5 px-3 text-right text-neutral-600 tabular-nums">
                        {row.key === 'monthly' && r.monthly === 0 ? '—' : fmt(r[row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-medium text-neutral-700">Own at End?</td>
                  {results.map(r => (
                    <td key={r.type} className="py-2.5 px-3 text-right text-neutral-600 text-xs">
                      {r.ownAtEnd}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
import { calcMonthly, calcPcpMonthly, calcOpportunityCost } from '../../lib/car-finance';

interface FinanceResult {
  type: string;
  label: string;
  monthly: number;
  totalPaid: number;
  totalInterest: number;
  opportunityCost: number;
  trueCost: number;
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
  investReturnRate: 4.5,
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
  const [investReturnRate, setInvestReturnRate] = useState(DEFAULTS.investReturnRate);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReset = useCallback(() => {
    setCarPrice(DEFAULTS.carPrice);
    setDeposit(DEFAULTS.deposit);
    setTermMonths(DEFAULTS.termMonths);
    setPcpApr(DEFAULTS.pcpApr);
    setPcpBalloonPct(DEFAULTS.pcpBalloonPct);
    setHpApr(DEFAULTS.hpApr);
    setLoanApr(DEFAULTS.loanApr);
    setInvestReturnRate(DEFAULTS.investReturnRate);
  }, []);

  /* ── Derived constraints ──────────────────────────────────── */
  const financeAmount = Math.max(0, carPrice - deposit);
  // Balloon + deposit must not exceed car price
  const maxBalloonPct = Math.min(60, Math.floor((financeAmount / carPrice) * 100));
  const effectiveBalloonPct = Math.min(Math.max(0, pcpBalloonPct), Math.max(0, maxBalloonPct));
  const balloon = Math.round(carPrice * effectiveBalloonPct / 100);

  /* ── Core calculation ───────────────────────────────────── */
  const results = useMemo((): FinanceResult[] => {
    // --- PCP (keep the car — pay balloon at end) ---
    const pcpMonthly = calcPcpMonthly(financeAmount, balloon, pcpApr, termMonths);
    const pcpTotalPaid = deposit + pcpMonthly * termMonths + balloon;
    const pcpInterest = pcpTotalPaid - carPrice;
    // Opportunity cost: deposit paid at month 0, monthly payments each month, balloon at end (0 opp cost)
    const pcpOpp = calcOpportunityCost(deposit, pcpMonthly, termMonths, investReturnRate);
    const pcpTrue = pcpTotalPaid + pcpOpp;

    // --- HP ---
    const hpMonthly = calcMonthly(financeAmount, hpApr, termMonths);
    const hpTotalPaid = deposit + hpMonthly * termMonths;
    const hpInterest = hpTotalPaid - carPrice;
    const hpOpp = calcOpportunityCost(deposit, hpMonthly, termMonths, investReturnRate);
    const hpTrue = hpTotalPaid + hpOpp;

    // --- Personal Loan ---
    const loanMonthly = calcMonthly(financeAmount, loanApr, termMonths);
    const loanTotalPaid = deposit + loanMonthly * termMonths;
    const loanInterest = loanTotalPaid - carPrice;
    const loanOpp = calcOpportunityCost(deposit, loanMonthly, termMonths, investReturnRate);
    const loanTrue = loanTotalPaid + loanOpp;

    // --- Cash ---
    // All money spent on day 1 → maximum opportunity cost
    const cashOpp = calcOpportunityCost(carPrice, 0, termMonths, investReturnRate);
    const cashTrue = carPrice + cashOpp;

    return [
      {
        type: 'pcp',
        label: 'PCP',
        monthly: pcpMonthly,
        totalPaid: pcpTotalPaid,
        totalInterest: pcpInterest,
        opportunityCost: pcpOpp,
        trueCost: pcpTrue,
        ownAtEnd: `Yes (${fmt(balloon)} balloon at end)`,
        note: `Lower monthly payments, but a ${fmt(balloon)} balloon is due at month ${termMonths} to keep the car.`,
      },
      {
        type: 'hp',
        label: 'Hire Purchase',
        monthly: hpMonthly,
        totalPaid: hpTotalPaid,
        totalInterest: hpInterest,
        opportunityCost: hpOpp,
        trueCost: hpTrue,
        ownAtEnd: 'Yes',
        note: 'Higher monthly payments than PCP, but you own the car at the end with no final payment.',
      },
      {
        type: 'loan',
        label: 'Personal Loan',
        monthly: loanMonthly,
        totalPaid: loanTotalPaid,
        totalInterest: loanInterest,
        opportunityCost: loanOpp,
        trueCost: loanTrue,
        ownAtEnd: 'Yes (from day one)',
        note: 'You own the car outright immediately. Often the lowest APR with good credit.',
      },
      {
        type: 'cash',
        label: 'Cash',
        monthly: 0,
        totalPaid: carPrice,
        totalInterest: 0,
        opportunityCost: cashOpp,
        trueCost: cashTrue,
        ownAtEnd: 'Yes (immediate)',
        note: `No interest, but you lose ${fmt(Math.round(cashOpp))} in potential investment returns over ${termMonths} months.`,
      },
    ];
  }, [carPrice, deposit, financeAmount, balloon, termMonths, pcpApr, effectiveBalloonPct, hpApr, loanApr, investReturnRate, currency]);

  // Find cheapest by true cost (all options included — all end with ownership)
  const cheapest = useMemo(() => {
    return results.reduce((best, r) => r.trueCost < best.trueCost ? r : best, results[0]);
  }, [results]);

  // Chart data — stacked bar: payments + opportunity cost = true cost
  const chartData = useMemo(() =>
    results.map(r => ({
      name: r.label,
      payments: Math.round(r.totalPaid),
      opportunity: Math.round(r.opportunityCost),
    })),
  [results]);

  /* ── Callbacks for PDF / Email ──────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Car Price', value: fmt(carPrice) },
    { label: 'Deposit', value: fmt(deposit) },
    { label: 'Term', value: `${termMonths} months` },
    { label: 'PCP APR', value: `${pcpApr}%` },
    { label: 'PCP Balloon', value: `${effectiveBalloonPct}% (${fmt(balloon)})` },
    { label: 'HP APR', value: `${hpApr}%` },
    { label: 'Loan APR', value: `${loanApr}%` },
    { label: 'Investment Return', value: `${investReturnRate}%` },
  ], [carPrice, deposit, termMonths, pcpApr, effectiveBalloonPct, balloon, hpApr, loanApr, investReturnRate, currency]);

  const getResults = useCallback((): ResultItem[] => {
    return [
      { label: 'Cheapest Option (True Cost)', value: cheapest.label, highlight: true },
      ...results.map(r => ({ label: `${r.label} True Cost`, value: fmt(Math.round(r.trueCost)) })),
      ...results.map(r => ({ label: `${r.label} Monthly`, value: r.monthly > 0 ? fmt(Math.round(r.monthly)) : 'N/A' })),
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
              hint="On-the-road price"
              id="car-price"
              value={carPrice}
              min={3000}
              max={150000}
              step={500}
              minLabel={`${currencySymbol}3K`}
              maxLabel={`${currencySymbol}150K`}
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
              max={Math.min(carPrice - 1000, 75000)}
              step={500}
              minLabel={`${currencySymbol}0`}
              maxLabel={fmt(Math.min(carPrice - 1000, 75000))}
              onChange={setDeposit}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Term"
              hint="How long you'll finance the car"
              id="car-term"
              value={termMonths}
              min={12}
              max={84}
              step={6}
              onChange={setTermMonths}
              suffix=" months"
              formatDisplay={(v) => v.toFixed(0)}
            />

            <div className="h-px bg-gradient-to-r from-transparent via-primary-300/30 to-transparent" />

            <SliderInput
              label="Expected Investment Return"
              hint="What your cash could earn if not spent on the car"
              id="car-invest-return"
              value={investReturnRate}
              min={0}
              max={12}
              step={0.5}
              onChange={setInvestReturnRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />

            {/* Advanced toggle for APR and balloon settings */}
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
              {showAdvanced ? 'Hide' : 'Adjust'} Interest Rates
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1 pl-3 border-l-2 border-primary-100">
                <SliderInput
                  label="PCP APR"
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
                  label="PCP Balloon / GMFV"
                  hint={`Final payment to own the car (${fmt(balloon)})`}
                  id="car-pcp-balloon"
                  value={effectiveBalloonPct}
                  min={0}
                  max={Math.max(0, maxBalloonPct)}
                  step={1}
                  onChange={setPcpBalloonPct}
                  suffix={`% of price`}
                  formatDisplay={(v) => v.toFixed(0)}
                />
                <SliderInput
                  label="HP APR"
                  id="car-hp-apr"
                  value={hpApr}
                  min={0}
                  max={25}
                  step={0.1}
                  onChange={setHpApr}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(1)}
                />
                <SliderInput
                  label="Personal Loan APR"
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-50 border border-success-100 text-success-700 text-sm font-medium mb-3">
              <Trophy size={14} aria-hidden="true" />
              {cheapest.label} has the lowest true cost
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              <strong>True cost</strong> = total payments + the investment returns you give up by spending money earlier.
              {investReturnRate > 0 && ` Assumes ${investReturnRate}% annual return on uninvested cash.`}
            </p>
          </div>

          {/* Comparison cards */}
          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {results.map((r, i) => (
              <div
                key={r.type}
                className={`bg-white rounded-xl border p-4 relative overflow-hidden ${
                  r.type === cheapest.type
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : 'border-neutral-200/80'
                }`}
              >
                {r.type === cheapest.type && (
                  <div className="absolute top-0 right-0 bg-success-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wide">
                    Best Value
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: ct.segments[i % ct.segments.length] }}
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-semibold text-neutral-800">{r.label}</h3>
                </div>

                {/* Primary metric: True Cost */}
                <div className="mb-2">
                  <p className="text-xs text-neutral-500 mb-0.5">True Cost</p>
                  <p
                    data-headline-result={r.type === cheapest.type ? '' : undefined}
                    data-headline-label={r.type === cheapest.type ? `${r.label} — True Cost` : undefined}
                    className="text-2xl font-bold text-neutral-900 tabular-nums"
                  >
                    {fmt(Math.round(r.trueCost))}
                  </p>
                </div>

                {/* Monthly payment */}
                <div className="mb-3">
                  <p className="text-xs text-neutral-500 mb-0.5">Monthly Payment</p>
                  <p className="text-lg font-semibold text-neutral-700 tabular-nums">
                    {r.monthly > 0 ? `${fmt(Math.round(r.monthly))}/mo` : '—'}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total paid</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(Math.round(r.totalPaid))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Interest</span>
                    <span className={`font-medium tabular-nums ${r.totalInterest > 0 ? 'text-red-600' : 'text-success-600'}`}>
                      {fmt(Math.round(r.totalInterest))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Opportunity cost</span>
                    <span className="font-medium text-neutral-500 tabular-nums">
                      {fmt(Math.round(r.opportunityCost))}
                    </span>
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

          {/* True cost stacked bar chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-1">True Cost Breakdown</h3>
            <p className="text-xs text-neutral-400 mb-3">Payments + opportunity cost (what your cash could have earned)</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: ct.axisText, fontSize: 11, fontFamily: ct.monoFont }} stroke={ct.axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: ct.axisText, fontSize: 11, fontFamily: ct.monoFont }} stroke={ct.axis} tickFormatter={(v: number) => `${currencySymbol}${formatNumber(v)}`} />
                  <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
                  <Bar dataKey="payments" name="Total Paid" stackId="a" fill={ct.series1} radius={[0, 0, 0, 0]} animationDuration={600} />
                  <Bar dataKey="opportunity" name="Opportunity Cost" stackId="a" fill={ct.cost} radius={[4, 4, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed comparison table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
            <div className="overflow-x-auto">
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
                <tr className="border-b border-neutral-100 bg-white">
                  <td className="py-2.5 px-3 font-medium text-neutral-700">Monthly Payment</td>
                  {results.map(r => (
                    <td key={r.type} className="py-2.5 px-3 text-right text-neutral-600 tabular-nums">
                      {r.monthly > 0 ? fmt(Math.round(r.monthly)) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-medium text-neutral-700">Total Paid</td>
                  {results.map(r => (
                    <td key={r.type} className="py-2.5 px-3 text-right text-neutral-600 tabular-nums">
                      {fmt(Math.round(r.totalPaid))}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-neutral-100 bg-white">
                  <td className="py-2.5 px-3 font-medium text-neutral-700">Interest</td>
                  {results.map(r => (
                    <td key={r.type} className={`py-2.5 px-3 text-right tabular-nums ${r.totalInterest > 0 ? 'text-red-600' : 'text-success-600'}`}>
                      {fmt(Math.round(r.totalInterest))}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-medium text-neutral-700">Opportunity Cost</td>
                  {results.map(r => (
                    <td key={r.type} className="py-2.5 px-3 text-right text-neutral-500 tabular-nums">
                      {fmt(Math.round(r.opportunityCost))}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-neutral-100 bg-success-50/50 font-semibold">
                  <td className="py-2.5 px-3 text-neutral-900">True Cost</td>
                  {results.map(r => (
                    <td key={r.type} className={`py-2.5 px-3 text-right tabular-nums ${r.type === cheapest.type ? 'text-success-700' : 'text-neutral-900'}`}>
                      {fmt(Math.round(r.trueCost))}
                    </td>
                  ))}
                </tr>
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

          <ResultAffiliate toolSlug="car-finance" />
        </div>
      </div>
    </div>
  );
}

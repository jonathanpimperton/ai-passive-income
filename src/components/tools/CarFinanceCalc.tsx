import { useState, useMemo, useCallback, useRef, lazy } from 'react';
import { ChevronDown, RotateCcw, Trophy } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { useChartTheme } from '../../lib/useChartTheme';
import ResultAffiliate from '../ui/ResultAffiliate';
import {
  aprConventionForCurrency,
  compareCarFinance,
  maxDepositFor,
  MIN_FINANCE_AMOUNT,
  type CarFinanceOption,
  type CarFinanceOptionType,
} from '../../lib/car-finance';
import { Collapse, DeferredChart, ResultAnnouncer } from './property-shared';

const CarFinanceChart = lazy(() => import('./charts/CarFinanceChart'));

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

const LABELS: Record<CarFinanceOptionType, string> = {
  pcp: 'PCP',
  hp: 'Hire Purchase',
  loan: 'Personal Loan',
  cash: 'Cash',
};

export default function CarFinanceCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const ct = useChartTheme();
  const aprConvention = aprConventionForCurrency(currency);

  const [carPrice, setCarPrice] = useState(DEFAULTS.carPrice);
  const [deposit, setDeposit] = useState(DEFAULTS.deposit);
  const [depositNotice, setDepositNotice] = useState<string | null>(null);
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
    setDepositNotice(null);
    setTermMonths(DEFAULTS.termMonths);
    setPcpApr(DEFAULTS.pcpApr);
    setPcpBalloonPct(DEFAULTS.pcpBalloonPct);
    setHpApr(DEFAULTS.hpApr);
    setLoanApr(DEFAULTS.loanApr);
    setInvestReturnRate(DEFAULTS.investReturnRate);
  }, []);

  // A lower price must never leave a deposit larger than the car (CALC-UX-A-07):
  // pull the deposit down with it and say so.
  const handlePriceChange = useCallback((price: number) => {
    setCarPrice(price);
    const cap = maxDepositFor(price);
    if (deposit > cap) {
      setDeposit(cap);
      setDepositNotice(`Deposit reduced to ${formatCurrency(cap, currency)} so at least ${formatCurrency(MIN_FINANCE_AMOUNT, currency)} is financed.`);
    }
  }, [deposit, currency]);

  const handleDepositChange = useCallback((v: number) => {
    setDepositNotice(null);
    setDeposit(v);
  }, []);

  const comparison = useMemo(
    () => compareCarFinance({ carPrice, deposit, termMonths, pcpApr, pcpBalloonPct, hpApr, loanApr, investReturnRate, aprConvention }),
    [carPrice, deposit, termMonths, pcpApr, pcpBalloonPct, hpApr, loanApr, investReturnRate, aprConvention],
  );
  const { options, cheapest, balloon, balloonPct, maxBalloonPct } = comparison;
  const usedDeposit = comparison.deposit;
  const depositMax = maxDepositFor(carPrice);

  const note = (o: CarFinanceOption): string => {
    switch (o.type) {
      case 'pcp': return `Lower monthly payments, but a ${fmt(balloon)} balloon is due at month ${termMonths} to keep the car.`;
      case 'hp': return 'Higher monthly payments than PCP, but you own the car at the end with no final payment.';
      case 'loan': return 'You own the car outright immediately. Often the lowest APR with good credit.';
      case 'cash': return `No interest, but you give up ${fmt(Math.round(o.opportunityCost))} in potential investment returns over ${termMonths} months.`;
    }
  };
  const ownAtEnd = (o: CarFinanceOption): string => {
    switch (o.type) {
      case 'pcp': return `Yes (${fmt(balloon)} balloon at end)`;
      case 'hp': return 'Yes';
      case 'loan': return 'Yes (from day one)';
      case 'cash': return 'Yes (immediate)';
    }
  };

  const chartData = useMemo(
    () => options.map((o) => ({ name: LABELS[o.type], payments: Math.round(o.totalPaid), opportunity: Math.round(o.opportunityCost) })),
    [options],
  );

  const announcement = `${LABELS[cheapest.type]} has the lowest true cost: ${fmt(Math.round(cheapest.trueCost))}.`;

  /* ── Callbacks for PDF / Email ──────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Car Price', value: fmt(carPrice) },
    { label: 'Deposit', value: fmt(usedDeposit) },
    { label: 'Term', value: `${termMonths} months` },
    { label: 'PCP APR', value: `${pcpApr}%` },
    { label: 'PCP Balloon', value: `${balloonPct}% (${fmt(balloon)})` },
    { label: 'HP APR', value: `${hpApr}%` },
    { label: 'Loan APR', value: `${loanApr}%` },
    { label: 'Investment Return', value: `${investReturnRate}%` },
  ], [carPrice, usedDeposit, termMonths, pcpApr, balloonPct, balloon, hpApr, loanApr, investReturnRate, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Cheapest Option (True Cost)', value: LABELS[cheapest.type], highlight: true },
    ...options.map((o) => ({ label: `${LABELS[o.type]} True Cost`, value: fmt(Math.round(o.trueCost)) })),
    ...options.map((o) => ({ label: `${LABELS[o.type]} Monthly`, value: o.monthly > 0 ? fmt(Math.round(o.monthly)) : 'N/A' })),
  ], [options, cheapest, currency]);

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
              onChange={handlePriceChange}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <div>
              <SliderInput
                label="Deposit"
                hint="Upfront payment or trade-in value"
                id="car-deposit"
                value={usedDeposit}
                min={0}
                max={depositMax}
                step={500}
                minLabel={`${currencySymbol}0`}
                maxLabel={fmt(depositMax)}
                onChange={handleDepositChange}
                prefix={currencySymbol}
                formatDisplay={formatNumber}
              />
              {depositNotice && (
                <p className="mt-1.5 text-xs text-amber-800">{depositNotice}</p>
              )}
            </div>
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

            <div className="h-px bg-neutral-200/80" />

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
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              aria-controls="car-advanced"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              {showAdvanced ? 'Hide' : 'Adjust'} Interest Rates
            </button>

            <Collapse open={showAdvanced} id="car-advanced">
              <div className="space-y-4 pt-1 pl-3 border-l-2 border-primary-100">
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {aprConvention === 'effective'
                    ? 'APRs are treated as annual effective rates, as UK and EU lenders quote them.'
                    : 'APRs are treated as US lenders quote them: the monthly rate is the APR divided by 12.'}
                </p>
                <SliderInput label="PCP APR" id="car-pcp-apr" value={pcpApr} min={0} max={25} step={0.1} onChange={setPcpApr} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
                <SliderInput
                  label="PCP Balloon / GMFV"
                  hint={`Final payment to own the car (${fmt(balloon)})`}
                  id="car-pcp-balloon"
                  value={balloonPct}
                  min={0}
                  max={Math.max(0, maxBalloonPct)}
                  step={1}
                  onChange={setPcpBalloonPct}
                  suffix="% of price"
                  formatDisplay={(v) => v.toFixed(0)}
                />
                <SliderInput label="HP APR" id="car-hp-apr" value={hpApr} min={0} max={25} step={0.1} onChange={setHpApr} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
                <SliderInput label="Personal Loan APR" id="car-loan-apr" value={loanApr} min={0} max={25} step={0.1} onChange={setLoanApr} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
              </div>
            </Collapse>
          </div>
        </div>

        {/* ───── Results ───── */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <ResultAnnouncer text={announcement} />
          {/* Winner badge */}
          <div data-pdf-section className="mb-6">
            {/* The answer sits first, above the cards, so it is on screen on phones. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-50 border border-success-100 text-success-700 text-sm font-medium">
                <Trophy size={14} aria-hidden="true" />
                {LABELS[cheapest.type]} has the lowest true cost
              </div>
              <p
                data-headline-result
                data-headline-label={`${LABELS[cheapest.type]} — lowest true cost`}
                className="text-2xl font-bold text-neutral-900 tabular-nums whitespace-nowrap"
              >
                {fmt(Math.round(cheapest.trueCost))}
              </p>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              <strong>True cost</strong> = total payments + the investment returns you give up by spending money earlier.
              {investReturnRate > 0 && ` Assumes ${investReturnRate}% annual return on uninvested cash.`}
            </p>
          </div>

          {/* Comparison cards */}
          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {options.map((o, i) => (
              <div
                key={o.type}
                className={`bg-white rounded-xl border p-4 relative overflow-hidden ${
                  o.type === cheapest.type ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-neutral-200/80'
                }`}
              >
                {o.type === cheapest.type && (
                  <div className="absolute top-0 right-0 bg-success-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wide">
                    Best Value
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ct.segments[i % ct.segments.length] }} aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-neutral-800">{LABELS[o.type]}</h3>
                </div>

                <div className="mb-2">
                  <p className="text-xs text-neutral-500 mb-0.5">True Cost</p>
                  <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                    {fmt(Math.round(o.trueCost))}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-neutral-500 mb-0.5">Monthly Payment</p>
                  <p className="text-lg font-semibold text-neutral-700 tabular-nums">
                    {o.monthly > 0 ? `${fmt(Math.round(o.monthly))}/mo` : '—'}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total paid</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(Math.round(o.totalPaid))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Interest</span>
                    <span className={`font-medium tabular-nums ${o.totalInterest > 0.5 ? 'text-red-600' : 'text-neutral-900'}`}>
                      {fmt(Math.round(o.totalInterest))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Opportunity cost</span>
                    <span className="font-medium text-neutral-500 tabular-nums">{fmt(Math.round(o.opportunityCost))}</span>
                  </div>
                </div>

                <p className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 leading-relaxed">{note(o)}</p>
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
            <p className="text-xs text-neutral-500 mb-3">Payments + opportunity cost (what your cash could have earned)</p>
            <DeferredChart height={220}>
              <CarFinanceChart data={chartData} currency={currency} />
            </DeferredChart>
          </div>

          {/* Detailed comparison table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
            {/* Scrolls sideways on phones; focusable so keyboard users can scroll it too. */}
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Car finance options compared (scrolls sideways)">
              <table className="w-full text-sm">
                <caption className="sr-only">Car finance options compared</caption>
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/60">
                    <th scope="col" className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Metric</th>
                    {options.map((o) => (
                      <th scope="col" key={o.type} className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        {LABELS[o.type]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-100 bg-white">
                    <th scope="row" className="py-2.5 px-3 text-left font-medium text-neutral-700">Monthly Payment</th>
                    {options.map((o) => (
                      <td key={o.type} className="py-2.5 px-3 text-right text-neutral-600 tabular-nums whitespace-nowrap">{o.monthly > 0 ? fmt(Math.round(o.monthly)) : '—'}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-100 bg-neutral-50/50">
                    <th scope="row" className="py-2.5 px-3 text-left font-medium text-neutral-700">Total Paid</th>
                    {options.map((o) => (
                      <td key={o.type} className="py-2.5 px-3 text-right text-neutral-600 tabular-nums whitespace-nowrap">{fmt(Math.round(o.totalPaid))}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-100 bg-white">
                    <th scope="row" className="py-2.5 px-3 text-left font-medium text-neutral-700">Interest</th>
                    {options.map((o) => (
                      <td key={o.type} className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${o.totalInterest > 0.5 ? 'text-red-600' : 'text-neutral-600'}`}>
                        {fmt(Math.round(o.totalInterest))}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-100 bg-neutral-50/50">
                    <th scope="row" className="py-2.5 px-3 text-left font-medium text-neutral-700">Opportunity Cost</th>
                    {options.map((o) => (
                      <td key={o.type} className="py-2.5 px-3 text-right text-neutral-500 tabular-nums whitespace-nowrap">{fmt(Math.round(o.opportunityCost))}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-100 bg-success-50/50 font-semibold">
                    <th scope="row" className="py-2.5 px-3 text-left text-neutral-900">True Cost</th>
                    {options.map((o) => (
                      <td key={o.type} className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${o.type === cheapest.type ? 'text-success-700' : 'text-neutral-900'}`}>
                        {fmt(Math.round(o.trueCost))}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-neutral-50/50">
                    <th scope="row" className="py-2.5 px-3 text-left font-medium text-neutral-700">Own at End?</th>
                    {options.map((o) => (
                      <td key={o.type} className="py-2.5 px-3 text-right text-neutral-600 text-xs">{ownAtEnd(o)}</td>
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

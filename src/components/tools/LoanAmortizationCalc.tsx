import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue, Fragment, lazy } from 'react';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { ChevronDown, RotateCcw, Banknote, Percent, Wallet } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { buildAmortization, type AmortizationYear } from '../../lib/mortgage-payment';
import { defaultMortgageRate, defaultMortgageRateInfo, rateAttribution, regionForCurrency } from '../../lib/market-rates';
import ResultAffiliate from '../ui/ResultAffiliate';
import { Collapse, DeferredChart, ResultAnnouncer } from './property-shared';

const LoanAmortizationCharts = lazy(() => import('./charts/LoanAmortizationCharts'));

/** Up to 3 decimals, no trailing zeros: the field shows exactly the rate used. */
const fmtRate = (v: number) => String(parseFloat(v.toFixed(3)));

/* ── Collapsible Year-Group Table ─────────────────────────── */
function AmortizationTable({ yearGroups, cc }: { yearGroups: AmortizationYear[]; cc: string }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmt = (v: number) => formatCurrency(v, cc);

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <caption className="sr-only">Amortization schedule by year; select a year to show its months</caption>
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedYear(expandedYear === group.year ? null : group.year); }}}
                tabIndex={0}
                role="button"
                aria-expanded={expandedYear === group.year}
              >
                <td className="py-2.5 px-4 font-medium text-neutral-900 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <ChevronDown size={14}
                      className={`text-neutral-500 transition-transform duration-200 ${expandedYear === group.year ? 'rotate-180' : ''}`}
                      aria-hidden="true" />
                    {group.year}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums">{fmt(group.totalPrincipal)}</td>
                <td className="py-2.5 px-4 text-right text-red-600 tabular-nums">{fmt(group.totalInterest)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums hidden sm:table-cell">{fmt(group.endBalance)}</td>
              </tr>
              {expandedYear === group.year && group.months.map((m) => (
                <tr key={`month-${m.month}`} className="bg-primary-50/30 border-b border-primary-100/50">
                  <td className="py-1.5 px-4 pl-10 text-xs text-neutral-500 tabular-nums">Month {m.month}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-neutral-600 tabular-nums">{fmt(m.principal)}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-red-600 tabular-nums">{fmt(m.interest)}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-neutral-600 tabular-nums hidden sm:table-cell">{fmt(m.balance)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main Calculator ──────────────────────────────────────── */
const DEFAULTS = { loanAmount: 300000, termYears: 30, extraPayment: 0 };

export default function LoanAmortizationCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const region = regionForCurrency(currency);
  const [loanAmount, setLoanAmount] = useState(DEFAULTS.loanAmount);
  const [rate, setRate] = useState(() => defaultMortgageRate('us', DEFAULTS.termYears));
  const [rateTouched, setRateTouched] = useState(false);
  const [termYears, setTermYears] = useState(DEFAULTS.termYears);
  const [extraPayment, setExtraPayment] = useState(DEFAULTS.extraPayment);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // The default rate is today's mortgage benchmark for the currency's region,
  // until the user types their own.
  useEffect(() => {
    if (!rateTouched) setRate(defaultMortgageRate(region, termYears));
  }, [region, termYears, rateTouched]);

  const handleRateChange = useCallback((v: number) => {
    setRateTouched(true);
    setRate(v);
  }, []);

  const termMonths = termYears * 12;

  const schedule = useMemo(
    () => buildAmortization(loanAmount, rate, termMonths, extraPayment),
    [loanAmount, rate, termMonths, extraPayment],
  );
  const baseInterest = useMemo(
    () => (extraPayment > 0 ? buildAmortization(loanAmount, rate, termMonths, 0).totalInterest : schedule.totalInterest),
    [loanAmount, rate, termMonths, extraPayment, schedule],
  );

  const monthlyPayment = schedule.scheduledPayment;
  const totalInterest = schedule.totalInterest;
  const totalCost = loanAmount + totalInterest;
  const monthsSaved = termMonths - schedule.payoffMonths;
  const interestSaved = baseInterest - totalInterest;

  // Table and charts may lag a slider drag; the headline never does.
  const deferred = useDeferredValue(schedule);
  const balanceByYear = useMemo(
    () => deferred.yearGroups.map((g) => ({ year: g.year, balance: g.endBalance })),
    [deferred],
  );

  const animatedPayment = useAnimatedNumber(monthlyPayment);
  const announcement = extraPayment > 0
    ? `Monthly payment ${fmt(monthlyPayment)}. Paying ${fmt(extraPayment)} extra saves ${fmt(interestSaved)} in interest.`
    : `Monthly payment ${fmt(monthlyPayment)}; ${fmt(totalInterest)} total interest.`;

  const rateInfo = defaultMortgageRateInfo(region, termYears);
  const rateHint = `Use your loan's rate. Average ${rateInfo.label.split(',')[0].toLowerCase()}: ${rateInfo.value}% (${rateAttribution(rateInfo)})`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Loan Amount', value: fmt(loanAmount) },
      { label: 'Annual Interest Rate', value: `${fmtRate(rate)}%` },
      { label: 'Loan Term', value: `${termYears} year${termYears !== 1 ? 's' : ''}` },
    ];
    if (extraPayment > 0) {
      inputs.push({ label: 'Extra Monthly Payment', value: fmt(extraPayment) });
    }
    return inputs;
  }, [loanAmount, rate, termYears, extraPayment, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Monthly Payment', value: fmt(monthlyPayment), highlight: true },
      { label: 'Total Interest', value: fmt(totalInterest) },
      { label: 'Total Cost', value: fmt(totalCost) },
    ];
    if (extraPayment > 0) {
      items.push({ label: 'Interest Saved by Extra Payments', value: fmt(interestSaved) });
      items.push({ label: 'Months Saved', value: String(monthsSaved) });
    }
    return items;
  }, [monthlyPayment, totalInterest, totalCost, extraPayment, interestSaved, monthsSaved, currency]);

  const handleReset = useCallback(() => {
    setLoanAmount(DEFAULTS.loanAmount);
    setTermYears(DEFAULTS.termYears);
    setRate(defaultMortgageRate(region, DEFAULTS.termYears));
    setRateTouched(false);
    setExtraPayment(DEFAULTS.extraPayment);
  }, [region]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Inputs ─────────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Inputs</h2>
            <button onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset calculator to defaults">
              <RotateCcw size={12} aria-hidden="true" /> Reset
            </button>
          </div>

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <SliderInput label="Loan Amount" id="la-amount" value={loanAmount}
              min={1000} max={1000000} step={2500} textMax={10000000}
              minLabel={`${currencySymbol}1K`} maxLabel={`${currencySymbol}1M`} onChange={setLoanAmount}
              prefix={currencySymbol} formatDisplay={(v) => formatNumber(v)} hint="Total amount you're borrowing" />
            <SliderInput label="Annual Interest Rate" id="la-rate" value={rate}
              min={0.125} max={20} step={0.125} onChange={handleRateChange}
              suffix="%" formatDisplay={fmtRate} hint={rateHint} />
            <SliderInput label="Loan Term (Years)" id="la-term" value={termYears}
              min={1} max={50} step={1} onChange={setTermYears} hint="How long you have to pay it back" />
          </div>

          <div className="mt-6 pt-5">
            <div className="h-px bg-neutral-200/80 mb-5" />
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-expanded={showAdvanced} aria-controls="la-advanced">
              <ChevronDown size={14} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              Advanced settings
            </button>
            <Collapse open={showAdvanced} id="la-advanced">
              <div className="pt-4">
                <SliderInput label="Extra Monthly Payment" id="la-extra" value={extraPayment}
                  min={0} max={5000} step={25}
                  minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}5K`} onChange={setExtraPayment}
                  prefix={currencySymbol} formatDisplay={(v) => formatNumber(v)} hint="Any extra amount above your minimum — saves interest" />
              </div>
            </Collapse>
          </div>
        </div>

        {/* ── Results ────────────────────────────────── */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start">
          <ResultAnnouncer text={announcement} />
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Monthly Payment</p>
            <p data-headline-result data-headline-label="Monthly Payment" className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {fmt(animatedPayment)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {extraPayment > 0 ? (
                <>Paying <span className="tabular-nums">{fmt(extraPayment)}</span> extra/mo saves <span className="tabular-nums">{fmt(interestSaved)}</span> in interest and {monthsSaved} month{monthsSaved !== 1 ? 's' : ''}</>
              ) : (
                <>You&apos;ll pay <span className="tabular-nums">{fmt(totalInterest)}</span> in total interest over {termYears} year{termYears !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>

          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Principal</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">{fmt(loanAmount)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest</p>
                <p className="text-base sm:text-lg font-semibold text-red-600 tabular-nums">{fmt(totalInterest)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Cost</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">{fmt(totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="loan-amortization" toolName="Loan Amortization Calculator" />
            <EmailResultsButton toolSlug="loan-amortization" toolName="Loan Amortization Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Loan Amortization Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Pie + Area Charts (lazy) */}
          <DeferredChart height={230} className="mb-6">
            <LoanAmortizationCharts
              currency={currency}
              principal={loanAmount}
              totalInterest={deferred.totalInterest}
              monthlyPayment={deferred.scheduledPayment}
              balanceByYear={balanceByYear}
            />
          </DeferredChart>

          {/* Amortization Table */}
          <div data-pdf-section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Amortization Schedule</h3>
            <AmortizationTable yearGroups={deferred.yearGroups} cc={currency} />
          </div>

          <ResultAffiliate toolSlug="loan-amortization" />
        </div>
      </div>
    </div>
  );
}

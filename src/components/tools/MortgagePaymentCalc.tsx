import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue, Fragment, lazy } from 'react';
import { ChevronDown, RotateCcw, Home, Percent, Banknote, DollarSign } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { defaultMortgageRate, defaultMortgageRateInfo, rateAttribution, regionForCurrency } from '../../lib/market-rates';
import {
  computeMortgagePayment,
  DEFAULT_PMI_RATE,
  type AmortizationYear,
  type MortgagePaymentInputs,
} from '../../lib/mortgage-payment';
import ResultAffiliate from '../ui/ResultAffiliate';
import { Collapse, DeferredChart, ResultAnnouncer } from './property-shared';

export type { MortgagePaymentInputs };

const MortgagePaymentCharts = lazy(() => import('./charts/MortgagePaymentCharts'));

function AmortizationTable({ yearGroups, cc }: { yearGroups: AmortizationYear[]; cc: string }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmtCell = (v: number) => formatCurrency(v, cc);

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
          {yearGroups.map((row) => {
            const isExpanded = expandedYear === row.year;
            return (
              <Fragment key={row.year}>
                <tr
                  className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150 ${
                    row.year % 2 === 0 ? 'bg-neutral-50/50' : 'bg-white'
                  } hover:bg-primary-50/40`}
                  onClick={() => setExpandedYear(isExpanded ? null : row.year)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedYear(isExpanded ? null : row.year);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <td className="py-2.5 px-4 font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <ChevronDown
                        size={14}
                        className={`text-neutral-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                      Year {row.year}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums font-medium">{fmtCell(row.totalPrincipal)}</td>
                  <td className="py-2.5 px-4 text-right text-red-600 tabular-nums">{fmtCell(row.totalInterest)}</td>
                  <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">{fmtCell(row.endBalance)}</td>
                </tr>
                {isExpanded &&
                  row.months.map((mo) => (
                    <tr key={mo.month} className="bg-primary-50/20 border-b border-neutral-100/60 text-xs">
                      <td className="py-2 px-4 pl-10 text-neutral-500">Month {mo.month}</td>
                      <td className="py-2 px-4 text-right text-neutral-700 tabular-nums">{fmtCell(mo.principal)}</td>
                      <td className="py-2 px-4 text-right text-red-600 tabular-nums">{fmtCell(mo.interest)}</td>
                      <td className="py-2 px-4 text-right text-neutral-500 tabular-nums hidden sm:table-cell">{fmtCell(mo.balance)}</td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const BASE_DEFAULTS: MortgagePaymentInputs = {
  homePrice: 350000,
  downPaymentPercent: 20,
  interestRate: defaultMortgageRate('us', 30),
  loanTerm: 30,
  extraMonthly: 0,
  propertyTaxRate: 1.0,
  insuranceAnnual: 1800,
  pmiRate: DEFAULT_PMI_RATE,
};

const TERM_OPTIONS = { us: [15, 20, 30], uk: [20, 25, 30, 35], eur: [20, 25, 30] } as const;

export interface MortgagePaymentCalcProps {
  /**
   * Starting values for pages that embed the calculator (e.g. the mortgage hub
   * passes downPaymentPercent: 0 so the price is the loan amount). A rate or
   * term given here is kept on currency switches; Reset returns to these.
   */
  defaults?: Partial<MortgagePaymentInputs>;
}

export default function MortgagePaymentCalc({ defaults }: MortgagePaymentCalcProps = {}) {
  const start = useMemo(() => ({ ...BASE_DEFAULTS, ...defaults }), [defaults]);
  const fixedRate = defaults?.interestRate !== undefined;
  const fixedTerm = defaults?.loanTerm !== undefined;

  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const region = regionForCurrency(currency);
  const downLabel = region === 'uk' ? 'Deposit' : 'Down Payment';
  const piLabel = region === 'us' ? 'Monthly Payment (P&I)' : 'Monthly Payment';
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const termOptions = TERM_OPTIONS[region];
  const regionDefaultTerm = region === 'uk' ? 25 : 30;

  const [homePrice, setHomePrice] = useState(start.homePrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(start.downPaymentPercent);
  const [interestRate, setInterestRate] = useState(start.interestRate);
  const [rateTouched, setRateTouched] = useState(fixedRate);
  const [loanTerm, setLoanTerm] = useState(start.loanTerm);
  const [termTouched, setTermTouched] = useState(fixedTerm);
  const [extraMonthly, setExtraMonthly] = useState(start.extraMonthly);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [propertyTaxRate, setPropertyTaxRate] = useState(start.propertyTaxRate);
  const [insuranceAnnual, setInsuranceAnnual] = useState(start.insuranceAnnual);
  const [pmiRate, setPmiRate] = useState(start.pmiRate);
  const [showSchedule, setShowSchedule] = useState(false);

  // Regional term (UK mortgages typically run 25 years) and market rate apply
  // only while the user (or the embedding page) hasn't set them.
  useEffect(() => {
    if (!termTouched) setLoanTerm(regionDefaultTerm);
    else if (!(termOptions as readonly number[]).includes(loanTerm)) setLoanTerm(regionDefaultTerm);
  }, [region, regionDefaultTerm, termTouched]);
  useEffect(() => {
    if (!rateTouched) setInterestRate(defaultMortgageRate(region, loanTerm));
  }, [region, loanTerm, rateTouched]);

  const handleRateChange = useCallback((v: number) => {
    setRateTouched(true);
    setInterestRate(v);
  }, []);

  const handleReset = useCallback(() => {
    setHomePrice(start.homePrice);
    setDownPaymentPercent(start.downPaymentPercent);
    const term = fixedTerm ? start.loanTerm : regionDefaultTerm;
    setLoanTerm(term);
    setTermTouched(fixedTerm);
    setInterestRate(fixedRate ? start.interestRate : defaultMortgageRate(region, term));
    setRateTouched(fixedRate);
    setExtraMonthly(start.extraMonthly);
    setPropertyTaxRate(start.propertyTaxRate);
    setInsuranceAnnual(start.insuranceAnnual);
    setPmiRate(start.pmiRate);
  }, [start, fixedRate, fixedTerm, region, regionDefaultTerm]);

  const result = useMemo(
    () => computeMortgagePayment({ homePrice, downPaymentPercent, interestRate, loanTerm, extraMonthly, propertyTaxRate, insuranceAnnual, pmiRate }, region),
    [homePrice, downPaymentPercent, interestRate, loanTerm, extraMonthly, propertyTaxRate, insuranceAnnual, pmiRate, region],
  );
  // The schedule table and charts can lag a slider drag; the headline can't.
  const deferred = useDeferredValue(result);
  const balanceByYear = useMemo(
    () => deferred.yearGroups.map((yg) => ({ year: `Yr ${yg.year}`, balance: Math.round(yg.endBalance) })),
    [deferred],
  );

  const animatedMonthlyPI = useAnimatedNumber(result.monthlyPI);
  const announcement = `${piLabel}: ${fmt(result.monthlyPI)}${region === 'us' ? `; ${fmt(result.totalMonthly)} with taxes and insurance` : ''}.`;

  const rateInfo = defaultMortgageRateInfo(region, loanTerm);
  const rateHint = `Average ${rateInfo.label.split(',')[0].toLowerCase()}: ${rateInfo.value}% (${rateAttribution(rateInfo)})`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Home Price', value: fmt(homePrice) },
      { label: downLabel, value: `${downPaymentPercent}% (${fmt(homePrice * (downPaymentPercent / 100))})` },
      { label: 'Interest Rate', value: `${interestRate}%` },
      { label: 'Loan Term', value: `${loanTerm} years` },
    ];
    if (extraMonthly > 0) {
      inputs.push({ label: 'Extra Monthly Payment', value: fmt(extraMonthly) });
    }
    if (region === 'us') {
      inputs.push({ label: 'Property Tax Rate', value: `${propertyTaxRate}%` });
      inputs.push({ label: 'Annual Insurance', value: fmt(insuranceAnnual) });
      if (result.needsPMI) inputs.push({ label: 'PMI Rate', value: `${pmiRate}%` });
    }
    return inputs;
  }, [homePrice, downPaymentPercent, interestRate, loanTerm, extraMonthly, propertyTaxRate, insuranceAnnual, pmiRate, result.needsPMI, region, currency]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: piLabel, value: fmt(result.monthlyPI), highlight: true },
    ];
    if (region === 'us') items.push({ label: `Total Monthly (PITI${result.needsPMI ? ' + PMI' : ''})`, value: fmt(result.totalMonthly) });
    items.push(
      { label: 'Total Interest', value: fmt(result.totalInterest) },
      { label: 'Total Paid (principal + interest)', value: fmt(result.totalPaid) },
      { label: downLabel, value: fmt(result.downPayment) },
    );
    return items;
  }, [result, region, currency]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Mortgage Details</h2>
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
            <SliderInput label="Home Price" id="mort-price" value={homePrice} min={50000} max={2000000} step={5000} textMax={10000000} minLabel={`${currencySymbol}50K`} maxLabel={`${currencySymbol}2M`} onChange={setHomePrice} prefix={currencySymbol} formatDisplay={formatNumber} hint={downPaymentPercent === 0 ? 'With 0% down, the price is the loan amount' : undefined} />
            <SliderInput label={downLabel} id="mort-down" value={downPaymentPercent} min={0} max={90} step={1} onChange={setDownPaymentPercent} suffix="%" formatDisplay={(v) => v.toFixed(0)} hint={`${fmt(homePrice * (downPaymentPercent / 100))} ${region === 'uk' ? 'deposit' : 'down'}`} />
            <SliderInput label="Interest Rate" id="mort-rate" value={interestRate} min={1} max={15} step={0.125} onChange={handleRateChange} suffix="%" formatDisplay={(v) => v.toFixed(3)} hint={rateHint} />

            {/* Loan term selection */}
            <div>
              <span id="mort-term-label" className="block text-sm font-medium text-neutral-700 mb-2">{region === 'uk' ? 'Mortgage Term' : 'Loan Term'}</span>
              <div className={`grid ${termOptions.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`} role="group" aria-labelledby="mort-term-label">
                {termOptions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => { setTermTouched(true); setLoanTerm(term); }}
                    aria-pressed={loanTerm === term}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                      loanTerm === term
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {term} yrs
                  </button>
                ))}
              </div>
            </div>

            <SliderInput label="Extra Monthly Payment" id="mort-extra" value={extraMonthly} min={0} max={5000} step={25} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}5K`} onChange={setExtraMonthly} prefix={currencySymbol} formatDisplay={formatNumber} hint="Additional principal paid each month" />

            {/* Advanced toggle — US-only (property tax, insurance and PMI are US concepts) */}
            {region === 'us' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  aria-expanded={showAdvanced}
                  aria-controls="mort-advanced"
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
                >
                  <ChevronDown size={16} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
                  {showAdvanced ? 'Hide' : 'Show'} Taxes, Insurance & PMI
                </button>

                <Collapse open={showAdvanced} id="mort-advanced">
                  <div className="space-y-5 pt-1">
                    <SliderInput label="Property Tax Rate" id="mort-tax" value={propertyTaxRate} min={0} max={5} step={0.1} onChange={setPropertyTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Annual tax as % of home value — check your county assessor" />
                    <SliderInput label="Annual Insurance" id="mort-ins" value={insuranceAnnual} min={0} max={10000} step={100} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}10K`} onChange={setInsuranceAnnual} prefix={currencySymbol} formatDisplay={formatNumber} hint="Homeowners insurance premium — get a local quote" />
                    <SliderInput label="PMI Rate" id="mort-pmi" value={pmiRate} min={0} max={2} step={0.1} onChange={setPmiRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Annual private mortgage insurance, % of the loan, while you put down less than 20%" />
                  </div>
                </Collapse>
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <ResultAnnouncer text={announcement} />
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{piLabel}</p>
            <p data-headline-result data-headline-label={piLabel} className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {fmt(animatedMonthlyPI)}
            </p>
            {region === 'us' && (
              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                Total monthly (PITI{result.needsPMI ? ' + PMI' : ''}): <span className="tabular-nums">{fmt(result.totalMonthly)}</span>
              </p>
            )}
          </div>

          {/* Payment breakdown cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-primary-50 text-primary-600 items-center justify-center shrink-0 mt-0.5">
                <Home size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Loan Amount</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums whitespace-nowrap">{fmt(result.principal)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-red-50 text-red-600 items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest</p>
                <p className="text-base sm:text-lg font-semibold text-red-600 tabular-nums whitespace-nowrap">{fmt(result.totalInterest)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-primary-50 text-primary-600 items-center justify-center shrink-0 mt-0.5">
                <Banknote size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">{downLabel}</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums whitespace-nowrap">{fmt(result.downPayment)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-primary-50 text-primary-600 items-center justify-center shrink-0 mt-0.5">
                <DollarSign size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Paid</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums whitespace-nowrap">{fmt(result.totalPaid)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="mortgage-payment" toolName="Mortgage Payment Calculator" />
            <EmailResultsButton toolSlug="mortgage-payment" toolName="Mortgage Payment Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Mortgage Payment Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Extra payment savings */}
          {extraMonthly > 0 && result.interestSaved > 0 && (
            <div data-pdf-section className="mb-6 p-4 rounded-xl border border-success-100 bg-success-50/50">
              <p className="text-sm font-medium text-success-700">
                Extra <span className="tabular-nums">{fmt(extraMonthly)}</span>/month saves <span className="tabular-nums">{fmt(result.interestSaved)}</span> in interest
              </p>
              <p className="text-xs text-success-700 mt-1">
                Loan paid off {Math.floor(result.monthsSaved / 12)} years and {result.monthsSaved % 12} months earlier
              </p>
            </div>
          )}

          {/* PMI warning */}
          {result.needsPMI && (
            <div data-pdf-section className="mb-6 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 leading-relaxed">
              <strong>PMI required:</strong> With less than 20% down, expect about <span className="tabular-nums">{fmt(result.monthlyPMI)}</span>/month in private mortgage insurance ({pmiRate}% a year) until you reach 20% equity.
            </div>
          )}

          {/* PITI breakdown — US-only */}
          {region === 'us' && showAdvanced && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Monthly payment breakdown</caption>
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200/60">
                      <th scope="col" className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Component</th>
                      <th scope="col" className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Principal & Interest', value: result.monthlyPI },
                      { label: 'Property Tax', value: result.monthlyTax },
                      { label: 'Insurance', value: result.monthlyInsurance },
                      ...(result.needsPMI ? [{ label: 'PMI (est.)', value: result.monthlyPMI }] : []),
                      ...(extraMonthly > 0 ? [{ label: 'Extra Payment', value: extraMonthly }] : []),
                    ].map((row, i) => (
                      <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                        <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-700">{row.label}</th>
                        <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{fmt(row.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-50 font-semibold">
                      <th scope="row" className="py-2.5 px-4 text-left text-neutral-900">Total Monthly</th>
                      <td className="py-2.5 px-4 text-right text-primary-700 tabular-nums">{fmt(result.totalMonthly + extraMonthly)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts (lazy) */}
          <DeferredChart height={560} className="mb-6">
            <MortgagePaymentCharts
              currency={currency}
              principal={deferred.principal}
              totalInterest={deferred.totalInterest}
              monthlyTotal={deferred.totalMonthly}
              balanceByYear={balanceByYear}
            />
          </DeferredChart>

          {/* Amortization schedule */}
          <div data-pdf-section>
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              aria-expanded={showSchedule}
              data-pdf-hide
              className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-150 mb-4"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${showSchedule ? 'rotate-180' : ''}`} aria-hidden="true" />
              {showSchedule ? 'Hide' : 'Show'} Amortization Schedule
            </button>

            {deferred.yearGroups.length > 0 && (
              <div data-pdf-force-show style={showSchedule ? undefined : { display: 'none' }}>
                <AmortizationTable yearGroups={deferred.yearGroups} cc={currency} />
              </div>
            )}
          </div>

          <ResultAffiliate toolSlug="mortgage-payment" />
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef, useEffect, useId, lazy, type KeyboardEvent } from 'react';
import { RotateCcw, Percent, TrendingUp, DollarSign, PoundSterling } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartDataTable from '../ui/ChartDataTable';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import ResultAffiliate from '../ui/ResultAffiliate';
import LazyChartFrame from './charts/LazyChartFrame';
import type { CgtTermRow, CgtBreakdownRow } from './charts/CapitalGainsTaxChart';
import type { ResultItem } from '../../lib/email-types';
import { formatNumber } from '../../lib/calculator-utils';
import {
  calculateUSCgt,
  calculateUKCgt,
  defaultCgtCountry,
  type CgtCountry,
  type HoldingPeriod,
  type UkIncomeBand,
} from '../../lib/capital-gains';
import { US_CAPITAL_GAINS, type FilingStatus } from '../../lib/us-rates';
import { UK_TAX_YEAR, UK_CGT } from '../../lib/uk-rates';
import { safeGet } from '../../lib/safe-storage';
import { detectRegion } from '../../lib/region';

const CapitalGainsTaxChart = lazy(() => import('./charts/CapitalGainsTaxChart'));

/* -- Types ------------------------------------------------- */
const COUNTRY_TABS: { key: CgtCountry; label: string }[] = [
  { key: 'us', label: 'United States' },
  { key: 'uk', label: 'United Kingdom' },
];

const FILING_OPTIONS: { key: FilingStatus; label: string }[] = [
  { key: 'single', label: 'Single' },
  { key: 'married', label: 'Married (joint)' },
  { key: 'head', label: 'Head of household' },
];

const UK_BAND_LABEL: Record<UkIncomeBand, string> = {
  basic: 'Basic rate',
  higher: 'Higher rate',
  additional: 'Additional rate',
};

/* -- Format helpers ---------------------------------------- */
function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
function fmtGBP(v: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

/** Live-region text, updated at most every ~500 ms (A11Y-PERF-03). */
function useDebouncedText(text: string, ms = 500): string {
  const [value, setValue] = useState(text);
  useEffect(() => {
    const t = setTimeout(() => setValue(text), ms);
    return () => clearTimeout(t);
  }, [text, ms]);
  return value;
}

/* -- Defaults ---------------------------------------------- */
const DEFAULTS = {
  // Server render and first client render use 'us'; an effect then applies
  // the stored currency choice or the detected region (no hydration mismatch).
  country: 'us' as CgtCountry,
  purchasePrice: 50_000,
  salePrice: 80_000,
  holdingPeriod: 'long' as HoldingPeriod,
  filing: 'single' as FilingStatus,
  usTaxableIncome: 75_000,
  ukAnnualIncome: 35_000,
};

const segBase = 'cursor-pointer px-3 py-1.5 rounded-md font-medium transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500';
const segOn = 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm';
const segOff = 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300';

/* -- Component --------------------------------------------- */
export default function CapitalGainsTaxCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const userPickedCountry = useRef(false);
  const tabRefs = useRef<Record<CgtCountry, HTMLButtonElement | null>>({ us: null, uk: null });

  const [country, setCountry] = useState<CgtCountry>(DEFAULTS.country);
  const [purchasePrice, setPurchasePrice] = useState(DEFAULTS.purchasePrice);
  const [salePrice, setSalePrice] = useState(DEFAULTS.salePrice);
  const [holdingPeriod, setHoldingPeriod] = useState<HoldingPeriod>(DEFAULTS.holdingPeriod);
  const [filing, setFiling] = useState<FilingStatus>(DEFAULTS.filing);
  const [usTaxableIncome, setUsTaxableIncome] = useState(DEFAULTS.usTaxableIncome);
  const [ukAnnualIncome, setUkAnnualIncome] = useState(DEFAULTS.ukAnnualIncome);

  // Country tab default from the stored currency choice or the visitor's region.
  useEffect(() => {
    if (userPickedCountry.current) return;
    setCountry(defaultCgtCountry(safeGet('calcrun.currency'), detectRegion()));
  }, []);

  const pickCountry = (c: CgtCountry) => {
    userPickedCountry.current = true;
    setCountry(c);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const order = COUNTRY_TABS.map((t) => t.key);
    const i = order.indexOf(country);
    const next =
      e.key === 'Home' ? order[0]
        : e.key === 'End' ? order[order.length - 1]
          : order[(i + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
    pickCountry(next);
    tabRefs.current[next]?.focus();
  };

  const fmt = country === 'us' ? fmtUSD : fmtGBP;
  const currencySymbol = country === 'us' ? '$' : '£';

  const usResult = useMemo(
    () => calculateUSCgt(purchasePrice, salePrice, holdingPeriod, filing, usTaxableIncome),
    [purchasePrice, salePrice, holdingPeriod, filing, usTaxableIncome]
  );

  const ukResult = useMemo(
    () => calculateUKCgt(purchasePrice, salePrice, ukAnnualIncome),
    [purchasePrice, salePrice, ukAnnualIncome]
  );

  const totalTax = country === 'us' ? usResult.totalTax : ukResult.totalTax;
  const gain = salePrice - purchasePrice;
  const effectiveRate = country === 'us' ? usResult.effectiveRate : ukResult.effectiveRate;

  const animatedTax = useAnimatedNumber(totalTax);
  const liveText = useDebouncedText(
    gain > 0 ? `Capital gains tax ${fmt(totalTax)} on a ${fmt(gain)} gain.` : 'No gain, no capital gains tax.'
  );

  const handleReset = useCallback(() => {
    setPurchasePrice(DEFAULTS.purchasePrice);
    setSalePrice(DEFAULTS.salePrice);
    setHoldingPeriod(DEFAULTS.holdingPeriod);
    setFiling(DEFAULTS.filing);
    setUsTaxableIncome(DEFAULTS.usTaxableIncome);
    setUkAnnualIncome(DEFAULTS.ukAnnualIncome);
  }, []);

  /* -- UK chart data: gain breakdown ----------------------- */
  const ukChartData = useMemo<CgtBreakdownRow[]>(() => {
    if (gain <= 0) return [];
    const rows: CgtBreakdownRow[] = [{ name: 'Annual Exempt', value: Math.min(gain, ukResult.annualExempt), kind: 'exempt' }];
    if (ukResult.basicRateTax > 0) rows.push({ name: 'Tax at 18%', value: Math.round(ukResult.basicRateTax), kind: 'tax' });
    if (ukResult.higherRateTax > 0) rows.push({ name: 'Tax at 24%', value: Math.round(ukResult.higherRateTax), kind: 'tax' });
    rows.push({ name: 'Net Proceeds', value: Math.round(gain - ukResult.totalTax), kind: 'kept' });
    return rows;
  }, [gain, ukResult]);

  /* -- US comparison: short vs long term ------------------- */
  const comparison = useMemo(() => {
    if (gain <= 0) return null;
    const short = calculateUSCgt(purchasePrice, salePrice, 'short', filing, usTaxableIncome);
    const long = calculateUSCgt(purchasePrice, salePrice, 'long', filing, usTaxableIncome);
    const rows: CgtTermRow[] = [
      { name: 'Short-term', 'Federal Tax': Math.round(short.federalTax), NIIT: Math.round(short.niit) },
      { name: 'Long-term', 'Federal Tax': Math.round(long.federalTax), NIIT: Math.round(long.niit) },
    ];
    return { rows, saving: short.totalTax - long.totalTax };
  }, [purchasePrice, salePrice, filing, usTaxableIncome, gain]);

  /* -- Email/PDF ------------------------------------------- */
  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Country', value: country === 'us' ? 'United States' : 'United Kingdom' },
      { label: 'Purchase Price', value: fmt(purchasePrice) },
      { label: 'Sale Price', value: fmt(salePrice) },
    ];
    if (country === 'us') {
      inputs.push(
        { label: 'Holding Period', value: holdingPeriod === 'long' ? 'Long-term (over 1 year)' : 'Short-term (1 year or less)' },
        { label: 'Filing Status', value: FILING_OPTIONS.find((f) => f.key === filing)?.label ?? filing },
        { label: 'Other Taxable Income', value: fmt(usTaxableIncome) },
      );
    } else {
      inputs.push(
        { label: 'Annual Income', value: fmt(ukAnnualIncome) },
        { label: 'Tax Band', value: UK_BAND_LABEL[ukResult.incomeBand] },
      );
    }
    return inputs;
  }, [country, fmt, purchasePrice, salePrice, holdingPeriod, filing, usTaxableIncome, ukAnnualIncome, ukResult.incomeBand]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [{ label: 'Capital Gain', value: fmt(gain) }];
    if (country === 'uk') {
      items.push({ label: 'Annual Exempt Amount', value: fmt(ukResult.annualExempt) });
      items.push({ label: 'Taxable Gain', value: fmt(ukResult.taxableGain) });
    }
    items.push(
      { label: 'Capital Gains Tax', value: fmt(totalTax), highlight: true },
      { label: 'Effective Tax Rate', value: `${effectiveRate.toFixed(2)}%` },
      { label: 'Net Proceeds', value: fmt(gain - totalTax) },
    );
    return items;
  }, [country, fmt, gain, totalTax, effectiveRate, ukResult]);

  const tabId = (c: CgtCountry) => `${uid}-tab-${c}`;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-lg shadow-card overflow-hidden">
      {/* Country tabs (arrow keys move between them) */}
      <div className="flex border-b border-neutral-200/80 dark:border-neutral-700" role="tablist" aria-label="Country">
        {COUNTRY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            id={tabId(tab.key)}
            ref={(el) => { tabRefs.current[tab.key] = el; }}
            role="tab"
            aria-selected={country === tab.key}
            aria-controls="cgt-results"
            tabIndex={country === tab.key ? 0 : -1}
            onClick={() => pickCountry(tab.key)}
            onKeyDown={onTabKeyDown}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
              country === tab.key
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 bg-primary-50/40 dark:bg-primary-900/20'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* -- Input Panel -------------------------------- */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Inputs
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-150"
              aria-label="Reset calculator to defaults"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-5">
            <SliderInput
              label="Purchase Price (Cost Basis)"
              hint="Original price you paid for the asset"
              id="cgt-purchase"
              value={purchasePrice}
              min={0}
              max={1_000_000}
              step={2500}
              textMax={5_000_000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}1M`}
              onChange={setPurchasePrice}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Sale Price"
              hint="Price you sold (or plan to sell) the asset for"
              id="cgt-sale"
              value={salePrice}
              min={0}
              max={1_000_000}
              step={2500}
              textMax={5_000_000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}1M`}
              onChange={setSalePrice}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />

            {country === 'us' && (
              <>
                {/* Holding Period */}
                <div>
                  <p id={`${uid}-hold-label`} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Holding Period
                  </p>
                  <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-sm" role="radiogroup" aria-labelledby={`${uid}-hold-label`}>
                    {(['long', 'short'] as const).map((h) => (
                      <label key={h} className={`${segBase} ${holdingPeriod === h ? segOn : segOff}`}>
                        <input
                          type="radio"
                          name={`${uid}-hold`}
                          value={h}
                          checked={holdingPeriod === h}
                          onChange={() => setHoldingPeriod(h)}
                          className="sr-only"
                        />
                        {h === 'long' ? 'Long-term (over 1 yr)' : 'Short-term (1 yr or less)'}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Filing Status */}
                <div>
                  <p id={`${uid}-filing-label`} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Filing Status
                  </p>
                  <div className="inline-flex flex-wrap rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-xs" role="radiogroup" aria-labelledby={`${uid}-filing-label`}>
                    {FILING_OPTIONS.map((opt) => (
                      <label key={opt.key} className={`${segBase} ${filing === opt.key ? segOn : segOff}`}>
                        <input
                          type="radio"
                          name={`${uid}-filing`}
                          value={opt.key}
                          checked={filing === opt.key}
                          onChange={() => setFiling(opt.key)}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <SliderInput
                  label="Other Taxable Income"
                  hint="Your ordinary taxable income after deductions, not counting this gain"
                  id="cgt-us-income"
                  value={usTaxableIncome}
                  min={0}
                  max={500_000}
                  step={1000}
                  textMax={1_000_000}
                  minLabel="$0"
                  maxLabel="$500K"
                  onChange={setUsTaxableIncome}
                  prefix="$"
                  formatDisplay={formatNumber}
                />
              </>
            )}

            {country === 'uk' && (
              <>
                <SliderInput
                  label="Annual Income"
                  hint="Your total taxable income for the year (salary, pension, rental profit) before the Personal Allowance"
                  id="cgt-uk-income"
                  value={ukAnnualIncome}
                  min={0}
                  max={250_000}
                  step={500}
                  textMax={500_000}
                  minLabel="£0"
                  maxLabel="£250K"
                  onChange={setUkAnnualIncome}
                  prefix="£"
                  formatDisplay={formatNumber}
                />

                {/* Band derived from income (MATH-UK-14): no toggle can contradict it */}
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200/60 dark:border-neutral-700">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    <strong>Income tax band: {UK_BAND_LABEL[ukResult.incomeBand]}.</strong>{' '}
                    {ukResult.unusedBasicBand > 0 ? (
                      <>
                        <span className="tabular-nums">{fmtGBP(ukResult.unusedBasicBand)}</span> of your basic rate band is left, so gains up to that
                        amount (after the allowance) are taxed at {UK_CGT.basicRate * 100}% and the rest at {UK_CGT.higherRate * 100}%.
                      </>
                    ) : (
                      <>Your income uses the whole basic rate band, so taxable gains are charged at {UK_CGT.higherRate * 100}%.</>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1.5">
                    Annual exempt amount for {UK_TAX_YEAR}: <strong className="tabular-nums">{fmtGBP(UK_CGT.annualExempt)}</strong>. Gains below this are tax-free.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* -- Results Panel -------------------------------- */}
        <div
          id="cgt-results"
          role="tabpanel"
          aria-labelledby={tabId(country)}
          ref={resultsRef}
          className="p-6 lg:p-8 bg-neutral-50/50 dark:bg-neutral-800/30 lg:sticky lg:top-20 lg:self-start"
        >
          <p className="sr-only" role="status" aria-live="polite">{liveText}</p>
          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Capital Gains Tax
            </p>
            <p data-headline-result data-headline-label="Capital Gains Tax" className="text-3xl sm:text-4xl font-bold result-number tabular-nums text-neutral-900 dark:text-neutral-100">
              {gain > 0 ? fmt(Math.round(animatedTax)) : fmt(0)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
              {gain > 0
                ? <>on a <span className="tabular-nums">{fmt(gain)}</span> gain (<span className="tabular-nums">{effectiveRate.toFixed(1)}%</span> effective rate)</>
                : gain === 0
                ? 'No gain, so no tax owed'
                : <>Capital loss of <span className="tabular-nums">{fmt(Math.abs(gain))}</span>, so no tax owed</>}
            </p>
          </div>

          {/* Stat cards */}
          {gain > 0 && (
            <div data-pdf-section className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-3 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={14} className="text-primary-600 dark:text-primary-400" aria-hidden="true" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Capital Gain</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {fmt(gain)}
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-3 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Percent size={14} className="text-red-600" aria-hidden="true" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Effective Rate</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {effectiveRate.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-3 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {country === 'us'
                    ? <DollarSign size={14} className="text-success-600" aria-hidden="true" />
                    : <PoundSterling size={14} className="text-success-600" aria-hidden="true" />
                  }
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">You Keep</p>
                </div>
                <p className="text-sm font-semibold text-success-600 tabular-nums">
                  {fmt(gain - totalTax)}
                </p>
              </div>
            </div>
          )}

          {/* Tax breakdown detail */}
          {gain > 0 && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tax Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Capital gains tax breakdown</caption>
                  <tbody>
                    {country === 'us' ? (
                      <>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">Capital Gain</th>
                          <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(gain)}</td>
                        </tr>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">
                            Federal Tax ({holdingPeriod === 'long' ? 'long-term rates' : 'ordinary income rates'})
                          </th>
                          <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(usResult.federalTax)}</td>
                        </tr>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">
                            Modified AGI for NIIT (estimate)
                          </th>
                          <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(usResult.magi)}</td>
                        </tr>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">
                            Net Investment Income Tax (3.8% over {fmt(US_CAPITAL_GAINS.niit.threshold[filing])})
                          </th>
                          <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(usResult.niit)}</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">Total Gain</th>
                          <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(gain)}</td>
                        </tr>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">Annual Exempt Amount</th>
                          <td className="py-2 px-4 text-right font-medium text-success-600 tabular-nums">-{fmt(Math.min(gain, ukResult.annualExempt))}</td>
                        </tr>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">Taxable Gain</th>
                          <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(ukResult.taxableGain)}</td>
                        </tr>
                        {ukResult.basicRateTax > 0 && (
                          <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                            <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">
                              Tax at 18% on <span className="tabular-nums">{fmt(ukResult.gainAtBasicRate)}</span>
                            </th>
                            <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(ukResult.basicRateTax)}</td>
                          </tr>
                        )}
                        {ukResult.higherRateTax > 0 && (
                          <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                            <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600 dark:text-neutral-400">
                              Tax at 24% on <span className="tabular-nums">{fmt(ukResult.gainAtHigherRate)}</span>
                            </th>
                            <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(ukResult.higherRateTax)}</td>
                          </tr>
                        )}
                      </>
                    )}
                    <tr className="bg-primary-50/50 dark:bg-primary-900/20">
                      <th scope="row" className="py-2.5 px-4 text-left font-semibold text-neutral-900 dark:text-neutral-100">Total Tax</th>
                      <td className="py-2.5 px-4 text-right font-bold text-primary-700 dark:text-primary-400 tabular-nums">{fmt(totalTax)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {country === 'us' && (
                <p className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  NIIT is tested on modified AGI, estimated here as your taxable income plus the standard deduction plus the gain.
                  Itemized deductions or other adjustments would change it.
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="capital-gains-tax" toolName="Capital Gains Tax Calculator" />
            <EmailResultsButton toolSlug="capital-gains-tax" toolName="Capital Gains Tax Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Capital Gains Tax Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* US: short vs long term comparison (lazy) + text alternative */}
          {country === 'us' && comparison && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Short-Term vs Long-Term Tax
              </h3>
              <LazyChartFrame height={192}>
                <CapitalGainsTaxChart
                  kind="us-term"
                  data={comparison.rows}
                  formatValue={fmtUSD}
                  ariaLabel={`Short-term tax ${fmtUSD(comparison.rows[0]['Federal Tax'] + comparison.rows[0].NIIT)}, long-term tax ${fmtUSD(comparison.rows[1]['Federal Tax'] + comparison.rows[1].NIIT)}.`}
                />
              </LazyChartFrame>
              <ChartDataTable
                className="mt-3"
                caption="Short-term vs long-term tax"
                columns={[
                  { key: 'name', label: 'Holding period' },
                  { key: 'Federal Tax', label: 'Federal tax', format: (v) => fmtUSD(Number(v)) },
                  { key: 'NIIT', label: 'NIIT', format: (v) => fmtUSD(Number(v)) },
                  { key: 'total', label: 'Total', format: (v) => fmtUSD(Number(v)) },
                ]}
                rows={comparison.rows.map((r) => ({ ...r, total: r['Federal Tax'] + r.NIIT }))}
              />
              {holdingPeriod === 'short' && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Holding for over 1 year would save you{' '}
                  <span className="font-semibold text-success-600 tabular-nums">{fmtUSD(comparison.saving)}</span>{' '}
                  in tax.
                </p>
              )}
            </div>
          )}

          {/* UK: gain breakdown chart (lazy; the table above is its text equivalent) */}
          {country === 'uk' && ukChartData.length > 0 && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-4">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Gain Breakdown
              </h3>
              <LazyChartFrame height={192}>
                <CapitalGainsTaxChart
                  kind="uk-breakdown"
                  data={ukChartData}
                  formatValue={fmtGBP}
                  ariaLabel={`Gain breakdown: ${ukChartData.map((d) => `${d.name} ${fmtGBP(d.value)}`).join(', ')}.`}
                />
              </LazyChartFrame>
            </div>
          )}

          <ResultAffiliate toolSlug="capital-gains-tax" />
        </div>
      </div>
    </div>
  );
}

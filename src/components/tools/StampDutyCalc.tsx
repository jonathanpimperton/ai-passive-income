import { useState, useMemo, useCallback, useRef, useEffect, useId, lazy } from 'react';
import { RotateCcw, Building2, Percent, PoundSterling } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartDataTable from '../ui/ChartDataTable';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import ResultAffiliate from '../ui/ResultAffiliate';
import LazyChartFrame from './charts/LazyChartFrame';
import type { StampDutyPoint } from './charts/StampDutyChart';
import type { ResultItem } from '../../lib/email-types';
import { formatNumber } from '../../lib/calculator-utils';
import {
  calculateSdlt,
  SDLT_NON_RESIDENT_SURCHARGE,
  SDLT_SURCHARGE_FLOOR,
  type BuyerType,
} from '../../lib/stamp-duty';
import { UK_SDLT } from '../../lib/uk-rates';

const StampDutyChart = lazy(() => import('./charts/StampDutyChart'));

const BUYER_TYPES: { key: BuyerType; label: string; hint: string }[] = [
  { key: 'first-time', label: 'First-time buyer', hint: 'Never owned a property before' },
  { key: 'standard', label: 'Moving home', hint: 'Replacing your main residence' },
  { key: 'additional', label: 'Additional property', hint: 'Buy-to-let or second home' },
];

/* -- Format currency (always GBP) -------------------------- */
function fmt(v: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function pctLabel(rate: number): string {
  return `${Number((rate * 100).toFixed(2))}%`;
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

/** Comparison-price step giving about 20 bars up to `max`. */
const NICE_STEPS = [5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000];
function chartStep(max: number): number {
  const raw = max / 20;
  return NICE_STEPS.find((s) => s >= raw) ?? NICE_STEPS[NICE_STEPS.length - 1];
}

/* -- Defaults ---------------------------------------------- */
const DEFAULTS = {
  price: 300_000,
  buyerType: 'first-time' as BuyerType,
  nonResident: false,
};

/* -- Component --------------------------------------------- */
export default function StampDutyCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const [price, setPrice] = useState(DEFAULTS.price);
  const [buyerType, setBuyerType] = useState<BuyerType>(DEFAULTS.buyerType);
  const [nonResident, setNonResident] = useState(DEFAULTS.nonResident);

  const result = useMemo(() => calculateSdlt(price, buyerType, { nonResident }), [price, buyerType, nonResident]);
  const animatedTax = useAnimatedNumber(result.totalTax);
  const liveText = useDebouncedText(`Stamp duty ${fmt(result.totalTax)} on ${fmt(price)}.`);

  const handleReset = useCallback(() => {
    setPrice(DEFAULTS.price);
    setBuyerType(DEFAULTS.buyerType);
    setNonResident(DEFAULTS.nonResident);
  }, []);

  /* -- Chart data: SDLT at different price points ---------- */
  const chartData = useMemo<StampDutyPoint[]>(() => {
    const max = Math.max(price * 1.5, 1_000_000);
    const step = chartStep(max);
    const points: number[] = [];
    for (let p = 0; p <= max; p += step) points.push(p);
    if (!points.includes(price)) {
      points.push(price);
      points.sort((a, b) => a - b);
    }
    return points.map((p) => ({
      label: fmt(p),
      price: p,
      'Stamp Duty': Math.round(calculateSdlt(p, buyerType, { nonResident }).totalTax),
      isCurrent: p === price,
    }));
  }, [price, buyerType, nonResident]);

  /* -- Rates reference (what applies at this price) -------- */
  const surcharge =
    (result.higherRatesApplied ? UK_SDLT.additionalSurcharge : 0) +
    (result.nonResidentApplied ? SDLT_NON_RESIDENT_SURCHARGE : 0);
  const referenceBands = result.firstTimeBuyerRelief ? UK_SDLT.firstTimeBuyer : UK_SDLT.standard;
  const referenceTitle = [
    result.firstTimeBuyerRelief ? 'First-time buyer rates' : 'Standard rates',
    result.higherRatesApplied ? `+ ${pctLabel(UK_SDLT.additionalSurcharge)} higher rates` : '',
    result.nonResidentApplied ? `+ ${pctLabel(SDLT_NON_RESIDENT_SURCHARGE)} non-resident` : '',
  ].filter(Boolean).join(' ');

  const describeBuyer = () => {
    const parts: string[] = [];
    if (result.firstTimeBuyerRelief) parts.push('first-time buyer');
    if (result.higherRatesApplied) parts.push(`incl. ${pctLabel(UK_SDLT.additionalSurcharge)} higher rates`);
    if (result.nonResidentApplied) parts.push(`incl. ${pctLabel(SDLT_NON_RESIDENT_SURCHARGE)} non-resident surcharge`);
    return parts.length ? ` (${parts.join(', ')})` : '';
  };

  /* -- Email/PDF export ------------------------------------ */
  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Property Price', value: fmt(price) },
      { label: 'Buyer Type', value: BUYER_TYPES.find((b) => b.key === buyerType)?.label ?? buyerType },
    ];
    if (nonResident) inputs.push({ label: 'Non-UK Resident', value: 'Yes' });
    return inputs;
  }, [price, buyerType, nonResident]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Stamp Duty (SDLT)', value: fmt(result.totalTax), highlight: true },
    { label: 'Effective Tax Rate', value: `${result.effectiveRate.toFixed(2)}%` },
    { label: 'Total Cost (Price + SDLT)', value: fmt(price + result.totalTax) },
  ], [result, price]);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-lg shadow-card overflow-hidden">
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

          {/* Currency locked notice */}
          <div className="mb-4 flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-200/60 dark:border-neutral-700 leading-relaxed">
            <PoundSterling size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>SDLT applies in England and Northern Ireland. Scotland (LBTT) and Wales (LTT) have their own taxes. Currency locked to GBP.</span>
          </div>

          <div className="space-y-5">
            <SliderInput
              label="Property Price"
              hint="Purchase price of the property"
              id="sdlt-price"
              value={price}
              min={0}
              max={2_000_000}
              step={5000}
              textMax={50_000_000}
              minLabel="£0"
              maxLabel="£2M"
              onChange={setPrice}
              prefix="£"
              formatDisplay={formatNumber}
            />

            {/* Buyer Type (native radios: arrow keys work) */}
            <div>
              <p id={`${uid}-buyer-label`} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Buyer Type
              </p>
              <div className="space-y-2" role="radiogroup" aria-labelledby={`${uid}-buyer-label`}>
                {BUYER_TYPES.map((bt) => (
                  <label
                    key={bt.key}
                    className={`block cursor-pointer px-4 py-3 rounded-lg border transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 ${
                      buyerType === bt.key
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200/80 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${uid}-buyer`}
                      value={bt.key}
                      checked={buyerType === bt.key}
                      onChange={() => setBuyerType(bt.key)}
                      className="sr-only"
                    />
                    <span className={`block text-sm font-medium ${
                      buyerType === bt.key ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {bt.label}
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{bt.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Non-UK resident surcharge (MATH-UK-16a) */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nonResident}
                  onChange={(e) => setNonResident(e.target.checked)}
                  aria-describedby={`${uid}-nonres-hint`}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 accent-primary-600"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Buyer is not UK resident</span>
              </label>
              <p id={`${uid}-nonres-hint`} className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-7 leading-relaxed">
                Not in the UK for at least 183 days in the 12 months before buying. Adds {pctLabel(SDLT_NON_RESIDENT_SURCHARGE)} to every
                band, on purchases of {fmt(SDLT_SURCHARGE_FLOOR)} or more; some buyers can reclaim it later.{' '}
                <a
                  href="https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents"
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-2 hover:text-primary-600"
                >
                  GOV.UK guidance
                </a>
              </p>
            </div>
          </div>

          {/* Eligibility and floor notes */}
          {buyerType === 'first-time' && price > UK_SDLT.firstTimeBuyerCap && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                First-time buyer relief only applies to properties up to {fmt(UK_SDLT.firstTimeBuyerCap)}. Standard rates are being used for this price.
              </p>
            </div>
          )}
          {result.belowSurchargeFloor && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                {buyerType === 'additional'
                  ? nonResident ? 'The higher rates and the non-resident surcharge do' : 'The higher rates do'
                  : 'The non-resident surcharge does'}{' '}
                not apply below {fmt(SDLT_SURCHARGE_FLOOR)}.
              </p>
            </div>
          )}

          {/* Rate bands reference */}
          <div className="mt-6 pt-5 border-t border-neutral-200/80 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              {referenceTitle}
            </p>
            <div className="space-y-1.5">
              {referenceBands.map((band) => (
                <div key={band.from} className="flex justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {fmt(band.from)} to {band.to === Infinity ? 'above' : fmt(band.to)}
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{pctLabel(band.rate + surcharge)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* -- Results Panel -------------------------------- */}
        <div
          ref={resultsRef}
          className="p-6 lg:p-8 bg-neutral-50/50 dark:bg-neutral-800/30 lg:sticky lg:top-20 lg:self-start"
        >
          <p className="sr-only" role="status" aria-live="polite">{liveText}</p>
          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Stamp Duty (SDLT) to pay
            </p>
            <p data-headline-result data-headline-label="Stamp Duty (SDLT) to pay" className="text-3xl sm:text-4xl font-bold result-number tabular-nums text-neutral-900 dark:text-neutral-100">
              {fmt(Math.round(animatedTax))}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
              on a <span className="tabular-nums">{fmt(price)}</span> property{describeBuyer()}
            </p>
          </div>

          {/* Stat cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <Percent size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                  Effective Rate
                </p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {result.effectiveRate.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <Building2 size={16} className="text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                  Total Cost (Price + SDLT)
                </p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {fmt(price + result.totalTax)}
                </p>
              </div>
            </div>
          </div>

          {/* Band breakdown table */}
          {result.bands.length > 0 && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tax Breakdown by Band
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Stamp duty by price band</caption>
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200/80 dark:border-neutral-700">
                      <th scope="col" className="text-left py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">Band</th>
                      <th scope="col" className="text-right py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">Rate</th>
                      <th scope="col" className="text-right py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.bands.map((band, i) => (
                      <tr key={band.from} className={`border-b border-neutral-100 dark:border-neutral-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-neutral-800/50' : 'bg-neutral-50/50 dark:bg-neutral-800'}`}>
                        <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-700 dark:text-neutral-300 tabular-nums">
                          {fmt(band.from)} to {fmt(band.to)}
                        </th>
                        <td className="py-2 px-4 text-right text-neutral-900 dark:text-neutral-100 font-medium tabular-nums">
                          {pctLabel(band.rate)}
                        </td>
                        <td className="py-2 px-4 text-right text-neutral-900 dark:text-neutral-100 font-semibold tabular-nums">
                          {fmt(band.tax)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary-50/50 dark:bg-primary-900/20">
                      <th scope="row" className="py-2.5 px-4 text-left font-semibold text-neutral-900 dark:text-neutral-100">Total</th>
                      <td className="py-2.5 px-4 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                        {result.effectiveRate.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-primary-700 dark:text-primary-400 tabular-nums">
                        {fmt(result.totalTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="stamp-duty" toolName="Stamp Duty Calculator" />
            <EmailResultsButton toolSlug="stamp-duty" toolName="Stamp Duty Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Stamp Duty Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart: SDLT at different price points (lazy) + text alternative */}
          <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 p-4">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Stamp Duty by Property Price
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">Your price is the highlighted bar.</p>
            <LazyChartFrame height={256}>
              <StampDutyChart
                data={chartData}
                formatValue={fmt}
                ariaLabel={`Bar chart of stamp duty from ${fmt(chartData[0]?.price ?? 0)} to ${fmt(chartData[chartData.length - 1]?.price ?? 0)}; at your price of ${fmt(price)} it is ${fmt(result.totalTax)}.`}
              />
            </LazyChartFrame>
            <ChartDataTable
              className="mt-3"
              caption="Stamp duty by property price"
              columns={[
                { key: 'label', label: 'Price', numeric: true, format: (v, row) => `${String(v)}${row.isCurrent ? ' (yours)' : ''}` },
                { key: 'Stamp Duty', label: 'Stamp duty', format: (v) => fmt(Number(v)) },
              ]}
              rows={chartData as unknown as Array<Record<string, unknown>>}
            />
          </div>

          <ResultAffiliate toolSlug="stamp-duty" />
        </div>
      </div>
    </div>
  );
}

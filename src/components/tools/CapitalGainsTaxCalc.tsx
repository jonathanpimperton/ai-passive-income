import { useState, useMemo, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RotateCcw, Percent, TrendingUp, DollarSign, PoundSterling } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import type { ResultItem } from '../../lib/email-types';
import { formatNumber } from '../../lib/calculator-utils';
import { useChartTheme } from '../../lib/useChartTheme';
import ResultAffiliate from '../ui/ResultAffiliate';
import { calculateUSCgt, calculateUKCgt, type HoldingPeriod, type UKTaxpayer } from '../../lib/capital-gains';
import { type FilingStatus } from '../../lib/us-rates';
import { UK_TAX_YEAR, UK_CGT } from '../../lib/uk-rates';

/* ── Types ───────────────────────────────────────────────── */
type Country = 'us' | 'uk';

const COUNTRY_TABS: { key: Country; label: string }[] = [
  { key: 'us', label: '🇺🇸 United States' },
  { key: 'uk', label: '🇬🇧 United Kingdom' },
];

const FILING_OPTIONS: { key: FilingStatus; label: string }[] = [
  { key: 'single', label: 'Single' },
  { key: 'married', label: 'Married (joint)' },
  { key: 'head', label: 'Head of household' },
];

/* ── Format helpers ──────────────────────────────────────── */
function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
function fmtGBP(v: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

/* ── Defaults ────────────────────────────────────────────── */
const DEFAULTS = {
  country: 'us' as Country,
  purchasePrice: 50_000,
  salePrice: 80_000,
  holdingPeriod: 'long' as HoldingPeriod,
  filing: 'single' as FilingStatus,
  usTaxableIncome: 75_000,
  ukTaxpayer: 'basic' as UKTaxpayer,
  ukAnnualIncome: 35_000,
};

/* ── Component ───────────────────────────────────────────── */
export default function CapitalGainsTaxCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const ct = useChartTheme();

  const [country, setCountry] = useState<Country>(DEFAULTS.country);
  const [purchasePrice, setPurchasePrice] = useState(DEFAULTS.purchasePrice);
  const [salePrice, setSalePrice] = useState(DEFAULTS.salePrice);
  const [holdingPeriod, setHoldingPeriod] = useState<HoldingPeriod>(DEFAULTS.holdingPeriod);
  const [filing, setFiling] = useState<FilingStatus>(DEFAULTS.filing);
  const [usTaxableIncome, setUsTaxableIncome] = useState(DEFAULTS.usTaxableIncome);
  const [ukTaxpayer, setUkTaxpayer] = useState<UKTaxpayer>(DEFAULTS.ukTaxpayer);
  const [ukAnnualIncome, setUkAnnualIncome] = useState(DEFAULTS.ukAnnualIncome);

  const fmt = country === 'us' ? fmtUSD : fmtGBP;
  const currencySymbol = country === 'us' ? '$' : '£';

  const usResult = useMemo(
    () => calculateUSCgt(purchasePrice, salePrice, holdingPeriod, filing, usTaxableIncome),
    [purchasePrice, salePrice, holdingPeriod, filing, usTaxableIncome]
  );

  const ukResult = useMemo(
    () => calculateUKCgt(purchasePrice, salePrice, ukTaxpayer, ukAnnualIncome),
    [purchasePrice, salePrice, ukTaxpayer, ukAnnualIncome]
  );

  const result = country === 'us' ? usResult : ukResult;
  const totalTax = country === 'us' ? usResult.totalTax : ukResult.totalTax;
  const gain = salePrice - purchasePrice;
  const effectiveRate = country === 'us' ? usResult.effectiveRate : ukResult.effectiveRate;

  const animatedTax = useAnimatedNumber(totalTax);

  const handleReset = useCallback(() => {
    setPurchasePrice(DEFAULTS.purchasePrice);
    setSalePrice(DEFAULTS.salePrice);
    setHoldingPeriod(DEFAULTS.holdingPeriod);
    setFiling(DEFAULTS.filing);
    setUsTaxableIncome(DEFAULTS.usTaxableIncome);
    setUkTaxpayer(DEFAULTS.ukTaxpayer);
    setUkAnnualIncome(DEFAULTS.ukAnnualIncome);
  }, []);

  /* ── Chart data: tax breakdown ─────────────────────────── */
  const chartData = useMemo(() => {
    if (gain <= 0) return [];

    if (country === 'us') {
      const items = [
        { name: 'Federal Tax', value: Math.round(usResult.federalTax) },
      ];
      if (usResult.niit > 0) {
        items.push({ name: 'NIIT (3.8%)', value: Math.round(usResult.niit) });
      }
      items.push({ name: 'Net Proceeds', value: Math.round(gain - usResult.totalTax) });
      return items;
    } else {
      const items: { name: string; value: number }[] = [];
      if (ukResult.annualExempt > 0 && gain > 0) {
        items.push({ name: 'Annual Exempt', value: Math.min(gain, ukResult.annualExempt) });
      }
      if (ukResult.basicRateTax > 0) {
        items.push({ name: 'Tax at 18%', value: Math.round(ukResult.basicRateTax) });
      }
      if (ukResult.higherRateTax > 0) {
        items.push({ name: 'Tax at 24%', value: Math.round(ukResult.higherRateTax) });
      }
      items.push({ name: 'Net Proceeds', value: Math.round(gain - ukResult.totalTax) });
      return items;
    }
  }, [country, gain, usResult, ukResult]);

  /* ── Comparison chart: short vs long term (US) ─────────── */
  const comparisonData = useMemo(() => {
    if (country !== 'us' || gain <= 0) return [];
    const shortResult = calculateUSCgt(purchasePrice, salePrice, 'short', filing, usTaxableIncome);
    const longResult = calculateUSCgt(purchasePrice, salePrice, 'long', filing, usTaxableIncome);
    return [
      { name: 'Short-term', 'Federal Tax': Math.round(shortResult.federalTax), 'NIIT': Math.round(shortResult.niit) },
      { name: 'Long-term', 'Federal Tax': Math.round(longResult.federalTax), 'NIIT': Math.round(longResult.niit) },
    ];
  }, [country, purchasePrice, salePrice, filing, usTaxableIncome, gain]);

  /* ── Email/PDF ─────────────────────────────────────────── */
  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Country', value: country === 'us' ? 'United States' : 'United Kingdom' },
      { label: 'Purchase Price', value: fmt(purchasePrice) },
      { label: 'Sale Price', value: fmt(salePrice) },
    ];
    if (country === 'us') {
      inputs.push(
        { label: 'Holding Period', value: holdingPeriod === 'long' ? 'Long-term (> 1 year)' : 'Short-term (≤ 1 year)' },
        { label: 'Filing Status', value: FILING_OPTIONS.find((f) => f.key === filing)?.label ?? filing },
        { label: 'Other Taxable Income', value: fmt(usTaxableIncome) },
      );
    } else {
      inputs.push(
        { label: 'Tax Band', value: ukTaxpayer === 'basic' ? 'Basic rate' : 'Higher/additional rate' },
        { label: 'Annual Income', value: fmt(ukAnnualIncome) },
      );
    }
    return inputs;
  }, [country, purchasePrice, salePrice, holdingPeriod, filing, usTaxableIncome, ukTaxpayer, ukAnnualIncome]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Capital Gain', value: fmt(gain) },
    ];
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
  }, [country, gain, totalTax, effectiveRate, ukResult]);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-lg shadow-card overflow-hidden">
      {/* Country tabs */}
      <div className="flex border-b border-neutral-200/80 dark:border-neutral-700" role="tablist" aria-label="Country">
        {COUNTRY_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={country === tab.key}
            aria-controls="cgt-results"
            onClick={() => setCountry(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
              country === tab.key
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/40 dark:bg-primary-900/20'
                : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Input Panel ──────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Inputs
            </h2>
            <button
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
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Holding Period
                  </label>
                  <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1" role="radiogroup" aria-label="Holding period">
                    <button
                      role="radio"
                      aria-checked={holdingPeriod === 'long'}
                      onClick={() => setHoldingPeriod('long')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        holdingPeriod === 'long'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                    >
                      Long-term (&gt;1yr)
                    </button>
                    <button
                      role="radio"
                      aria-checked={holdingPeriod === 'short'}
                      onClick={() => setHoldingPeriod('short')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        holdingPeriod === 'short'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                    >
                      Short-term (≤1yr)
                    </button>
                  </div>
                </div>

                {/* Filing Status */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Filing Status
                  </label>
                  <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1" role="radiogroup" aria-label="Filing status">
                    {FILING_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        role="radio"
                        aria-checked={filing === opt.key}
                        onClick={() => setFiling(opt.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                          filing === opt.key
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <SliderInput
                  label="Other Taxable Income"
                  hint="Your ordinary taxable income (excl. the capital gain)"
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
                {/* Taxpayer Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Income Tax Band
                  </label>
                  <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1" role="radiogroup" aria-label="Tax band">
                    <button
                      role="radio"
                      aria-checked={ukTaxpayer === 'basic'}
                      onClick={() => setUkTaxpayer('basic')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        ukTaxpayer === 'basic'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                    >
                      Basic rate
                    </button>
                    <button
                      role="radio"
                      aria-checked={ukTaxpayer === 'higher'}
                      onClick={() => setUkTaxpayer('higher')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        ukTaxpayer === 'higher'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                    >
                      Higher / additional
                    </button>
                  </div>
                </div>

                <SliderInput
                  label="Annual Income"
                  hint="Your salary/employment income (determines how much basic rate band remains)"
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

                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200/60 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Annual exempt amount for {UK_TAX_YEAR}: <strong>£{UK_CGT.annualExempt.toLocaleString()}</strong>.
                    Gains below this are tax-free.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Results Panel ──────────────────────────────── */}
        <div
          id="cgt-results"
          role="tabpanel"
          ref={resultsRef}
          className="p-6 lg:p-8 bg-neutral-50/50 dark:bg-neutral-800/30 lg:sticky lg:top-20 lg:self-start"
          aria-live="polite"
        >
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
                ? `on a ${fmt(gain)} gain (${effectiveRate.toFixed(1)}% effective rate)`
                : gain === 0
                ? 'No gain — no tax owed'
                : `Capital loss of ${fmt(Math.abs(gain))} — no tax owed`}
            </p>
          </div>

          {/* Stat cards */}
          {gain > 0 && (
            <div data-pdf-section className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={14} className="text-primary-600 dark:text-primary-400" aria-hidden="true" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Capital Gain</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {fmt(gain)}
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Percent size={14} className="text-red-600" aria-hidden="true" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Effective Rate</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {effectiveRate.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {country === 'us'
                    ? <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    : <PoundSterling size={14} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  }
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">You Keep</p>
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmt(gain - totalTax)}
                </p>
              </div>
            </div>
          )}

          {/* Tax breakdown detail */}
          {gain > 0 && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tax Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <tbody>
                  {country === 'us' ? (
                    <>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">Capital Gain</td>
                        <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(gain)}</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">
                          Federal Tax ({holdingPeriod === 'long' ? 'long-term rates' : 'ordinary income rates'})
                        </td>
                        <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(usResult.federalTax)}</td>
                      </tr>
                      {usResult.niit > 0 && (
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">
                            Net Investment Income Tax (3.8%)
                          </td>
                          <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(usResult.niit)}</td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">Total Gain</td>
                        <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(gain)}</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">Annual Exempt Amount</td>
                        <td className="py-2 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">−{fmt(Math.min(gain, ukResult.annualExempt))}</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">Taxable Gain</td>
                        <td className="py-2 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{fmt(ukResult.taxableGain)}</td>
                      </tr>
                      {ukResult.basicRateTax > 0 && (
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">Tax at 18% (basic rate)</td>
                          <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(ukResult.basicRateTax)}</td>
                        </tr>
                      )}
                      {ukResult.higherRateTax > 0 && (
                        <tr className="border-b border-neutral-100 dark:border-neutral-700/50">
                          <td className="py-2 px-4 text-neutral-600 dark:text-neutral-400">Tax at 24% (higher rate)</td>
                          <td className="py-2 px-4 text-right font-medium text-red-600 tabular-nums">{fmt(ukResult.higherRateTax)}</td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr className="bg-primary-50/50 dark:bg-primary-900/20">
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">Total Tax</td>
                    <td className="py-2.5 px-4 text-right font-bold text-primary-700 dark:text-primary-400 tabular-nums">{fmt(totalTax)}</td>
                  </tr>
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="capital-gains-tax" toolName="Capital Gains Tax Calculator" />
            <EmailResultsButton toolSlug="capital-gains-tax" toolName="Capital Gains Tax Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Capital Gains Tax Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* US: Short vs Long term comparison */}
          {country === 'us' && comparisonData.length > 0 && gain > 0 && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Short-Term vs Long-Term Tax
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid stroke={ct.grid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={{ stroke: ct.axis }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <Tooltip content={<ChartTooltip formatValue={(v) => fmtUSD(v as number)} />} />
                    {/* Both segments are tax paid — cost family, NIIT lighter */}
                    <Bar dataKey="Federal Tax" stackId="a" fill={ct.cost} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="NIIT" stackId="a" fill={ct.cost} fillOpacity={0.55} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {holdingPeriod === 'short' && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Holding for over 1 year would save you{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {fmtUSD(
                      calculateUSCgt(purchasePrice, salePrice, 'short', filing, usTaxableIncome).totalTax -
                      calculateUSCgt(purchasePrice, salePrice, 'long', filing, usTaxableIncome).totalTax
                    )}
                  </span>{' '}
                  in tax.
                </p>
              )}
            </div>
          )}

          {/* UK: gain breakdown chart */}
          {country === 'uk' && chartData.length > 0 && gain > 0 && (
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Gain Breakdown
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid stroke={ct.grid} vertical={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => v >= 1000 ? `£${(v / 1000).toFixed(0)}K` : `£${v}`}
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={{ stroke: ct.axis }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip content={<ChartTooltip formatValue={(v) => fmtGBP(v as number)} />} />
                    {/* Semantic per row: tax = cost, exempt/kept = gain/primary */}
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
                      {chartData.map((d, i) => {
                        const isTax = d.name.startsWith('Tax') || d.name.startsWith('Federal') || d.name.startsWith('NIIT');
                        const isExempt = d.name === 'Annual Exempt';
                        return (
                          <Cell
                            key={i}
                            fill={isTax ? ct.cost : isExempt ? ct.gain : ct.series1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <ResultAffiliate toolSlug="capital-gains-tax" />
        </div>
      </div>
    </div>
  );
}

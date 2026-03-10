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
import { RotateCcw, Building2, Percent, PoundSterling } from 'lucide-react';
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

/* ── SDLT Rates (from 1 April 2025) ─────────────────────── */
const STANDARD_BANDS = [
  { from: 0, to: 125_000, rate: 0 },
  { from: 125_000, to: 250_000, rate: 0.02 },
  { from: 250_000, to: 925_000, rate: 0.05 },
  { from: 925_000, to: 1_500_000, rate: 0.10 },
  { from: 1_500_000, to: Infinity, rate: 0.12 },
];

const FTB_BANDS = [
  { from: 0, to: 300_000, rate: 0 },
  { from: 300_000, to: 500_000, rate: 0.05 },
];

const FTB_CAP = 500_000;
const ADDITIONAL_SURCHARGE = 0.05;

type BuyerType = 'standard' | 'first-time' | 'additional';

const BUYER_TYPES: { key: BuyerType; label: string; hint: string }[] = [
  { key: 'first-time', label: 'First-time buyer', hint: 'Never owned a property before' },
  { key: 'standard', label: 'Moving home', hint: 'Replacing your main residence' },
  { key: 'additional', label: 'Additional property', hint: 'Buy-to-let or second home' },
];

/* ── SDLT Calculation ────────────────────────────────────── */
interface SdltBand {
  from: number;
  to: number;
  rate: number;
  tax: number;
}

interface SdltResult {
  totalTax: number;
  effectiveRate: number;
  bands: SdltBand[];
}

function calculateSdlt(price: number, buyerType: BuyerType): SdltResult {
  if (price <= 0) return { totalTax: 0, effectiveRate: 0, bands: [] };

  let baseBands: typeof STANDARD_BANDS;

  if (buyerType === 'first-time' && price <= FTB_CAP) {
    baseBands = FTB_BANDS;
  } else {
    baseBands = STANDARD_BANDS;
  }

  const surcharge = buyerType === 'additional' ? ADDITIONAL_SURCHARGE : 0;
  const bands: SdltBand[] = [];
  let totalTax = 0;

  for (const band of baseBands) {
    if (price <= band.from) break;
    const taxableInBand = Math.min(price, band.to) - band.from;
    if (taxableInBand <= 0) continue;
    const effectiveRate = band.rate + surcharge;
    const tax = taxableInBand * effectiveRate;
    totalTax += tax;
    bands.push({
      from: band.from,
      to: Math.min(price, band.to),
      rate: effectiveRate,
      tax,
    });
  }

  // For additional property, if price is within a band that has 0% base,
  // the surcharge still applies to the full amount in that band
  const effectiveRate = price > 0 ? (totalTax / price) * 100 : 0;

  return { totalTax, effectiveRate, bands };
}

/* ── Format currency (always GBP) ────────────────────────── */
function fmt(v: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

/* ── Defaults ────────────────────────────────────────────── */
const DEFAULTS = {
  price: 300_000,
  buyerType: 'first-time' as BuyerType,
};

/* ── Component ───────────────────────────────────────────── */
export default function StampDutyCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const ct = useChartTheme();

  const [price, setPrice] = useState(DEFAULTS.price);
  const [buyerType, setBuyerType] = useState<BuyerType>(DEFAULTS.buyerType);

  const result = useMemo(() => calculateSdlt(price, buyerType), [price, buyerType]);
  const animatedTax = useAnimatedNumber(result.totalTax);

  const handleReset = useCallback(() => {
    setPrice(DEFAULTS.price);
    setBuyerType(DEFAULTS.buyerType);
  }, []);

  /* ── Chart data: SDLT at different price points ────────── */
  const chartData = useMemo(() => {
    const points: number[] = [];
    const step = price <= 500_000 ? 50_000 : price <= 2_000_000 ? 100_000 : 250_000;
    const max = Math.max(price * 1.5, 1_000_000);
    for (let p = 0; p <= max; p += step) {
      points.push(p);
    }
    if (!points.includes(price)) {
      points.push(price);
      points.sort((a, b) => a - b);
    }

    return points.map((p) => {
      const r = calculateSdlt(p, buyerType);
      return {
        price: p,
        'Stamp Duty': Math.round(r.totalTax),
        isCurrent: p === price,
      };
    });
  }, [price, buyerType]);

  /* ── Email/PDF export ──────────────────────────────────── */
  const getInputs = useCallback(() => [
    { label: 'Property Price', value: fmt(price) },
    { label: 'Buyer Type', value: BUYER_TYPES.find((b) => b.key === buyerType)?.label ?? buyerType },
  ], [price, buyerType]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Stamp Duty (SDLT)', value: fmt(result.totalTax), highlight: true },
      { label: 'Effective Tax Rate', value: `${result.effectiveRate.toFixed(2)}%` },
    ];
    for (const band of result.bands) {
      items.push({
        label: `${fmt(band.from)} – ${band.to === Infinity ? '...' : fmt(band.to)} (${(band.rate * 100).toFixed(0)}%)`,
        value: fmt(band.tax),
      });
    }
    return items;
  }, [result, price]);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-lg shadow-card overflow-hidden">
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

          {/* Currency locked notice */}
          <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-200/60 dark:border-neutral-700">
            <PoundSterling size={14} aria-hidden="true" />
            SDLT applies to England and Northern Ireland only. Currency locked to GBP.
          </div>

          <div className="space-y-5">
            <SliderInput
              label="Property Price"
              hint="Purchase price of the property"
              id="sdlt-price"
              value={price}
              min={0}
              max={5_000_000}
              step={5000}
              onChange={setPrice}
              prefix="£"
              formatDisplay={formatNumber}
            />

            {/* Buyer Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Buyer Type
              </label>
              <div className="space-y-2" role="radiogroup" aria-label="Buyer type">
                {BUYER_TYPES.map((bt) => (
                  <button
                    key={bt.key}
                    role="radio"
                    aria-checked={buyerType === bt.key}
                    onClick={() => setBuyerType(bt.key)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                      buyerType === bt.key
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600 ring-1 ring-primary-200/50 dark:ring-primary-700/50'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200/80 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      buyerType === bt.key ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {bt.label}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{bt.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* First-time buyer eligibility note */}
          {buyerType === 'first-time' && price > FTB_CAP && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/50 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                First-time buyer relief only applies to properties up to {fmt(FTB_CAP)}. Standard rates are being used for this price.
              </p>
            </div>
          )}

          {/* Rate bands reference */}
          <div className="mt-6 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-700 to-transparent mb-5" />
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              {buyerType === 'first-time' && price <= FTB_CAP ? 'First-Time Buyer Rates' : buyerType === 'additional' ? 'Rates (incl. 5% surcharge)' : 'Standard Rates'}
            </p>
            <div className="space-y-1.5">
              {(buyerType === 'first-time' && price <= FTB_CAP ? FTB_BANDS : STANDARD_BANDS).map((band, i) => {
                const surcharge = buyerType === 'additional' ? ADDITIONAL_SURCHARGE : 0;
                const effectiveRate = ((band.rate + surcharge) * 100).toFixed(0);
                return (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {fmt(band.from)} – {band.to === Infinity ? '...' : fmt(band.to)}
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{effectiveRate}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Results Panel ──────────────────────────────── */}
        <div
          ref={resultsRef}
          className="p-6 lg:p-8 bg-neutral-50/50 dark:bg-neutral-800/30 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          aria-live="polite"
        >
          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Stamp Duty (SDLT) to pay
            </p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums text-neutral-900 dark:text-neutral-100">
              {fmt(Math.round(animatedTax))}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
              on a {fmt(price)} property
              {buyerType === 'first-time' && price <= FTB_CAP && ' (first-time buyer)'}
              {buyerType === 'additional' && ' (incl. 5% additional property surcharge)'}
            </p>
          </div>

          {/* Stat cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                  Effective Rate
                </p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {result.effectiveRate.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-accent-50 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 size={16} aria-hidden="true" />
              </div>
              <div>
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
            <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tax Breakdown by Band
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200/80 dark:border-neutral-700">
                    <th className="text-left py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">Band</th>
                    <th className="text-right py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">Rate</th>
                    <th className="text-right py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-400">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.bands.map((band, i) => (
                    <tr key={i} className={`border-b border-neutral-100 dark:border-neutral-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-neutral-800/50' : 'bg-neutral-50/50 dark:bg-neutral-800'}`}>
                      <td className="py-2 px-4 text-neutral-700 dark:text-neutral-300 tabular-nums">
                        {fmt(band.from)} – {fmt(band.to)}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-900 dark:text-neutral-100 font-medium tabular-nums">
                        {(band.rate * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-900 dark:text-neutral-100 font-semibold tabular-nums">
                        {fmt(band.tax)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary-50/50 dark:bg-primary-900/20">
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">Total</td>
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
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="stamp-duty" toolName="Stamp Duty Calculator" />
            <EmailResultsButton toolSlug="stamp-duty" toolName="Stamp Duty Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Stamp Duty Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          <ResultAffiliate toolSlug="stamp-duty" />

          {/* Chart: SDLT at different price points */}
          <div data-pdf-section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Stamp Duty by Property Price
            </h3>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis
                    dataKey="price"
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}M` : `£${(v / 1000).toFixed(0)}K`
                    }
                    tick={{ fontSize: 11, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={{ stroke: ct.axis }}
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `£${(v / 1000).toFixed(0)}K` : `£${v}`
                    }
                    tick={{ fontSize: 11, fill: ct.axisText }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip
                    content={<ChartTooltip labelPrefix="Price" formatValue={(v) => fmt(v as number)} />}
                  />
                  <Bar
                    dataKey="Stamp Duty"
                    fill="#0B6E6E"
                    radius={[4, 4, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

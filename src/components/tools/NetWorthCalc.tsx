import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { RotateCcw, Plus, X, TrendingUp, CreditCard, Scale, Percent } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { summarizeNetWorth, breakdown, itemLabel } from '../../lib/net-worth';
import { formatMoneyGuarded, isExtremeMoney } from '../../lib/result-format';
import NumericTextField from './fields/NumericTextField';
import LiveResult from './fields/LiveResult';
import { lazyChart } from './charts/InvestDebtLazyChart';

const NetWorthChart = lazyChart(() => import('./charts/NetWorthChart'));

interface Item {
  id: string;
  name: string;
  /** null = blank field (counts as 0). */
  value: number | null;
}

type Kind = 'asset' | 'liability';

/** Largest amount a single item accepts. */
const MAX_ITEM_VALUE = 1e11;

/**
 * Row ids come from a counter that belongs to one calculator instance (a ref in
 * the component), never from module state: the server renders every request, and
 * the static build renders several pages, in one process, so a module-level counter
 * would give the server HTML different ids from the client's (React #418 on hydrate).
 */
type NextId = () => string;

// Two default item names are region-flavoured: US gets "Checking Account" /
// "401(k)", UK and EUR get "Current Account" / "Pension". Only untouched
// defaults are renamed; anything the user typed is left alone.
const REGION_NAMES: Array<{ us: string; other: string }> = [
  { us: 'Checking Account', other: 'Current Account' },
  { us: '401(k)', other: 'Pension' },
];

function defaultAssets(newId: NextId, currency: string = 'USD'): Item[] {
  const us = currency !== 'GBP' && currency !== 'EUR';
  return [
    { id: newId(), name: us ? 'Checking Account' : 'Current Account', value: 5000 },
    { id: newId(), name: 'Savings Account', value: 15000 },
    { id: newId(), name: us ? '401(k)' : 'Pension', value: 45000 },
    { id: newId(), name: 'Home', value: 300000 },
    { id: newId(), name: 'Car', value: 18000 },
  ];
}

function defaultLiabilities(newId: NextId): Item[] {
  return [
    { id: newId(), name: 'Mortgage', value: 240000 },
    { id: newId(), name: 'Student Loans', value: 25000 },
    { id: newId(), name: 'Auto Loan', value: 12000 },
    { id: newId(), name: 'Credit Card', value: 3000 },
  ];
}

/** Name box that keeps any name typed before hydration. */
function NameInput({ id, value, ariaLabel, onChange }: { id: string; value: string; ariaLabel: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dom = ref.current?.value ?? '';
    if (dom !== value) onChange(dom);
    // Only on mount: later renders are controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      value={value}
      maxLength={60}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
        focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
      placeholder="Item name"
      aria-label={ariaLabel}
    />
  );
}

function ItemRow({ item, index, kind, symbol, currency, onChange, onRemove }: {
  item: Item;
  index: number;
  kind: Kind;
  symbol: string;
  currency: string;
  onChange: (id: string, patch: Partial<Item>) => void;
  onRemove: (id: string) => void;
}) {
  const kindLabel = kind === 'asset' ? 'Asset' : 'Liability';
  const label = itemLabel(item.name, kind, index);
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <NameInput id={`${item.id}-name`} value={item.name} ariaLabel={`${kindLabel} ${index + 1} name`} onChange={(v) => onChange(item.id, { name: v })} />
      </div>
      <NumericTextField
        id={`${item.id}-value`}
        className="w-36 shrink-0"
        inputClassName="h-10"
        value={item.value}
        onChange={(v) => onChange(item.id, { value: v })}
        currency={currency}
        prefix={symbol}
        min={0}
        max={MAX_ITEM_VALUE}
        negativeMessage={kind === 'asset' ? 'Use a positive amount. Add money you owe under Liabilities.' : 'Use a positive amount for what you owe.'}
        ariaLabel={`${label} value`}
      />
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="w-8 h-10 flex items-center justify-center rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 shrink-0"
        aria-label={`Remove ${label}`}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function NetWorthCalc() {
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const fmtCompact = (v: number) =>
    `${currencySymbol}${v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : Math.round(v)}`;
  // Per-instance id counter (server and client both start the defaults at item-1).
  const idCounter = useRef(0);
  const newId = useCallback<NextId>(() => `item-${++idCounter.current}`, []);
  const [assets, setAssets] = useState<Item[]>(() => defaultAssets(newId));
  const [liabilities, setLiabilities] = useState<Item[]>(() => defaultLiabilities(newId));

  // Region-flavour untouched default names whenever the display currency
  // changes (stored, detected or picked). Client-only, so SSR markup stays stable.
  useEffect(() => {
    const us = currency !== 'GBP' && currency !== 'EUR';
    setAssets((prev) =>
      prev.map((item) => {
        const match = REGION_NAMES.find((n) => item.name === n.us || item.name === n.other);
        if (!match) return item;
        const name = us ? match.us : match.other;
        return name === item.name ? item : { ...item, name };
      })
    );
  }, [currency]);

  const handleReset = useCallback(() => {
    idCounter.current = 0;
    setAssets(defaultAssets(newId, currency));
    setLiabilities(defaultLiabilities(newId));
  }, [currency, newId]);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<Item[]>>, id: string, patch: Partial<Item>) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const handleAdd = (setter: React.Dispatch<React.SetStateAction<Item[]>>) => {
    // Allocated here, not inside the updater: an updater may be called more than once.
    const id = newId();
    setter((prev) => [...prev, { id, name: '', value: null }]);
  };
  const handleRemove = (setter: React.Dispatch<React.SetStateAction<Item[]>>, id: string) => {
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const asNumbers = (items: Item[]) => items.map((i) => ({ name: i.name, value: i.value ?? 0 }));
  const summary = useMemo(() => summarizeNetWorth(asNumbers(assets), asNumbers(liabilities)), [assets, liabilities]);
  const { totalAssets, totalLiabilities, netWorth } = summary;
  const extreme = isExtremeMoney(totalAssets) || isExtremeMoney(totalLiabilities);
  const animatedNetWorth = useAnimatedNumber(netWorth);
  const resultsRef = useRef<HTMLDivElement>(null);

  const ratioText = (v: number | null) => (v === null ? '--' : `${(v * 100).toFixed(1)}%`);
  const equityText = summary.equityShare === null ? '--' : summary.equityShare < 0 ? 'None' : ratioText(summary.equityShare);

  const getInputs = useCallback(() => [
    { label: 'Total Assets', value: fmt(totalAssets) },
    { label: 'Total Liabilities', value: fmt(totalLiabilities) },
    { label: 'Number of Assets', value: `${assets.filter((a) => a.name.trim() || (a.value ?? 0) > 0).length}` },
    { label: 'Number of Liabilities', value: `${liabilities.filter((l) => l.name.trim() || (l.value ?? 0) > 0).length}` },
  ], [assets, liabilities, totalAssets, totalLiabilities, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Net Worth', value: fmt(netWorth), highlight: true },
    { label: 'Total Assets', value: fmt(totalAssets) },
    { label: 'Total Liabilities', value: fmt(totalLiabilities) },
    { label: 'Debt-to-Asset Ratio', value: ratioText(summary.debtToAsset) },
  ], [netWorth, totalAssets, totalLiabilities, summary.debtToAsset, currency]);

  const assetRows = useMemo(() => breakdown(asNumbers(assets), 'asset'), [assets]);
  const liabilityRows = useMemo(() => breakdown(asNumbers(liabilities), 'liability'), [liabilities]);
  const shareColumns = [
    { key: 'name', label: 'Item' },
    { key: 'value', label: 'Value', format: (v: unknown) => formatMoneyGuarded(Number(v), currency) },
    { key: 'share', label: 'Share', format: (v: unknown) => `${(Number(v) * 100).toFixed(1)}%` },
  ];

  const renderList = (kind: Kind, items: Item[], setter: React.Dispatch<React.SetStateAction<Item[]>>) => (
    <div className="space-y-2.5">
      {items.map((item, index) => (
        <ItemRow
          key={item.id}
          item={item}
          index={index}
          kind={kind}
          symbol={currencySymbol}
          currency={currency}
          onChange={(id, patch) => handleChange(setter, id, patch)}
          onRemove={(id) => handleRemove(setter, id)}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Your Finances</h2>
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

          {/* Assets */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-success-600 uppercase tracking-wide mb-3">Assets</h3>
            {renderList('asset', assets, setAssets)}
            <button
              type="button"
              onClick={() => handleAdd(setAssets)}
              className="flex items-center gap-1.5 mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <Plus size={15} aria-hidden="true" />
              Add Asset
            </button>
          </div>

          <div className="h-px bg-neutral-200/80 mb-6" />

          {/* Liabilities */}
          <div>
            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Liabilities</h3>
            {renderList('liability', liabilities, setLiabilities)}
            <button
              type="button"
              onClick={() => handleAdd(setLiabilities)}
              className="flex items-center gap-1.5 mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <Plus size={15} aria-hidden="true" />
              Add Liability
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <LiveResult text={`Net worth ${fmt(netWorth)}.`} />
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Your Net Worth</p>
            <p data-headline-result data-headline-label="Your Net Worth" className={`text-3xl sm:text-4xl font-bold tabular-nums ${netWorth >= 0 ? 'result-number' : 'text-red-600'}`}>
              {extreme || isExtremeMoney(netWorth) ? fmt(netWorth) : fmt(animatedNetWorth)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {fmt(totalAssets)} in assets minus {fmt(totalLiabilities)} in liabilities
            </p>
            {extreme && <p className="text-sm text-red-600 mt-1.5">These totals look too large. Check the amounts you entered.</p>}
          </div>

          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5"><TrendingUp size={16} aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Assets</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums break-words">{fmt(totalAssets)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5"><CreditCard size={16} aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Liabilities</p>
                <p className="text-lg font-semibold text-red-600 tabular-nums break-words">{fmt(totalLiabilities)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Percent size={16} aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Debt-to-Asset Ratio</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{ratioText(summary.debtToAsset)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Scale size={16} aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Assets Owned Free</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{equityText}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="net-worth" toolName="Net Worth Calculator" />
            <EmailResultsButton toolSlug="net-worth" toolName="Net Worth Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Net Worth Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Charts side by side */}
          <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { kind: 'asset' as Kind, title: 'Assets Breakdown', rows: assetRows, total: totalAssets, centerLabel: 'assets', empty: 'No assets added' },
              { kind: 'liability' as Kind, title: 'Liabilities Breakdown', rows: liabilityRows, total: totalLiabilities, centerLabel: 'owed', empty: 'No liabilities added' },
            ]).map((panel) => (
              <div key={panel.kind} className="bg-white rounded-xl border border-neutral-200/80 p-4 min-w-0">
                <h3 className="text-sm font-medium text-neutral-700 mb-2">{panel.title}</h3>
                {panel.rows.length > 0 ? (
                  <>
                    <Suspense fallback={<ChartSkeleton height={180} />}>
                      <NetWorthChart
                        data={panel.rows.map(({ name, value }) => ({ name, value }))}
                        kind={panel.kind}
                        currency={currency}
                        centerValue={fmtCompact(panel.total)}
                        centerLabel={panel.centerLabel}
                        ariaLabel={`Donut chart of ${panel.kind === 'asset' ? 'assets' : 'liabilities'} by item; use Show data for the figures.`}
                      />
                    </Suspense>
                    <ChartDataTable
                      className="mt-2"
                      caption={`${panel.title} by item`}
                      columns={shareColumns}
                      rows={panel.rows}
                    />
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 py-8 text-center">{panel.empty}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RotateCcw, Plus, X } from 'lucide-react';
import ChartTooltip from '../ui/ChartTooltip';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';

interface Item {
  id: string;
  name: string;
  value: number;
}

const ASSET_CATEGORIES = [
  { key: 'cash', label: 'Cash & Savings' },
  { key: 'investments', label: 'Investments' },
  { key: 'retirement', label: 'Retirement Accounts' },
  { key: 'realEstate', label: 'Real Estate' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'other', label: 'Other Assets' },
] as const;

const LIABILITY_CATEGORIES = [
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'studentLoans', label: 'Student Loans' },
  { key: 'autoLoans', label: 'Auto Loans' },
  { key: 'creditCards', label: 'Credit Cards' },
  { key: 'otherDebt', label: 'Other Debt' },
] as const;

const ASSET_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#10B981', '#F59E0B', '#8B5CF6'];
const LIABILITY_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EC4899', '#6366F1'];

let idCounter = 0;
function newId() { return `item-${++idCounter}`; }

const DEFAULT_ASSETS: Item[] = [
  { id: newId(), name: 'Checking Account', value: 5000 },
  { id: newId(), name: 'Savings Account', value: 15000 },
  { id: newId(), name: '401(k)', value: 45000 },
  { id: newId(), name: 'Home', value: 300000 },
  { id: newId(), name: 'Car', value: 18000 },
];

const DEFAULT_LIABILITIES: Item[] = [
  { id: newId(), name: 'Mortgage', value: 240000 },
  { id: newId(), name: 'Student Loans', value: 25000 },
  { id: newId(), name: 'Auto Loan', value: 12000 },
  { id: newId(), name: 'Credit Card', value: 3000 },
];

function ItemRow({ item, onChange, onRemove }: {
  item: Item;
  onChange: (id: string, field: 'name' | 'value', val: string | number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={item.name}
        onChange={(e) => onChange(item.id, 'name', e.target.value)}
        className="flex-1 h-10 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
          focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
        placeholder="Item name"
        aria-label="Item name"
      />
      <div className="relative w-32 shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={formatNumber(item.value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, '');
            const parsed = parseFloat(raw);
            onChange(item.id, 'value', isNaN(parsed) ? 0 : parsed);
          }}
          className="w-full h-10 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm pl-6 pr-3
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150 tabular-nums"
          aria-label="Item value"
        />
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 shrink-0"
        aria-label={`Remove ${item.name}`}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function NetWorthCalc() {
  const [assets, setAssets] = useState<Item[]>(DEFAULT_ASSETS);
  const [liabilities, setLiabilities] = useState<Item[]>(DEFAULT_LIABILITIES);

  const handleReset = useCallback(() => {
    idCounter = 0;
    setAssets([
      { id: newId(), name: 'Checking Account', value: 5000 },
      { id: newId(), name: 'Savings Account', value: 15000 },
      { id: newId(), name: '401(k)', value: 45000 },
      { id: newId(), name: 'Home', value: 300000 },
      { id: newId(), name: 'Car', value: 18000 },
    ]);
    setLiabilities([
      { id: newId(), name: 'Mortgage', value: 240000 },
      { id: newId(), name: 'Student Loans', value: 25000 },
      { id: newId(), name: 'Auto Loan', value: 12000 },
      { id: newId(), name: 'Credit Card', value: 3000 },
    ]);
  }, []);

  const handleChange = (
    setter: React.Dispatch<React.SetStateAction<Item[]>>,
    id: string,
    field: 'name' | 'value',
    val: string | number
  ) => {
    setter((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleAdd = (setter: React.Dispatch<React.SetStateAction<Item[]>>) => {
    setter((prev) => [...prev, { id: newId(), name: '', value: 0 }]);
  };

  const handleRemove = (setter: React.Dispatch<React.SetStateAction<Item[]>>, id: string) => {
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const totalAssets = useMemo(() => assets.reduce((sum, a) => sum + a.value, 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((sum, l) => sum + l.value, 0), [liabilities]);
  const netWorth = totalAssets - totalLiabilities;

  const assetPieData = useMemo(
    () => assets.filter((a) => a.value > 0).map((a) => ({ name: a.name, value: a.value })),
    [assets]
  );
  const liabilityPieData = useMemo(
    () => liabilities.filter((l) => l.value > 0).map((l) => ({ name: l.name, value: l.value })),
    [liabilities]
  );

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Your Finances</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary-500 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>

          {/* Assets */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-accent-600 uppercase tracking-wide mb-3">Assets</h3>
            <div className="space-y-2.5">
              {assets.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onChange={(id, field, val) => handleChange(setAssets, id, field, val)}
                  onRemove={(id) => handleRemove(setAssets, id)}
                />
              ))}
            </div>
            <button
              onClick={() => handleAdd(setAssets)}
              className="flex items-center gap-1.5 mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <Plus size={15} aria-hidden="true" />
              Add Asset
            </button>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-6" />

          {/* Liabilities */}
          <div>
            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Liabilities</h3>
            <div className="space-y-2.5">
              {liabilities.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onChange={(id, field, val) => handleChange(setLiabilities, id, field, val)}
                  onRemove={(id) => handleRemove(setLiabilities, id)}
                />
              ))}
            </div>
            <button
              onClick={() => handleAdd(setLiabilities)}
              className="flex items-center gap-1.5 mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <Plus size={15} aria-hidden="true" />
              Add Liability
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Your Net Worth</p>
            <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${netWorth >= 0 ? 'text-primary-900' : 'text-red-600'}`}>
              {formatCurrency(netWorth)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {formatCurrency(totalAssets)} in assets − {formatCurrency(totalLiabilities)} in liabilities
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Assets</p>
              <p className="text-lg font-semibold text-accent-600 tabular-nums">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Liabilities</p>
              <p className="text-lg font-semibold text-red-600 tabular-nums">{formatCurrency(totalLiabilities)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Debt-to-Asset Ratio</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                {totalAssets > 0 ? `${((totalLiabilities / totalAssets) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Assets Owned Free</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">
                {totalAssets > 0 ? `${(((totalAssets - totalLiabilities) / totalAssets) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assets pie */}
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Assets Breakdown</h3>
              {assetPieData.length > 0 ? (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={assetPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" animationDuration={600}>
                          {assetPieData.map((_, i) => (
                            <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip labelPrefix="" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {assetPieData.map((d, i) => (
                      <span key={d.name} className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-400 py-8 text-center">No assets added</p>
              )}
            </div>

            {/* Liabilities pie */}
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Liabilities Breakdown</h3>
              {liabilityPieData.length > 0 ? (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={liabilityPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" animationDuration={600}>
                          {liabilityPieData.map((_, i) => (
                            <Cell key={i} fill={LIABILITY_COLORS[i % LIABILITY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip labelPrefix="" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {liabilityPieData.map((d, i) => (
                      <span key={d.name} className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: LIABILITY_COLORS[i % LIABILITY_COLORS.length] }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-400 py-8 text-center">No liabilities added</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

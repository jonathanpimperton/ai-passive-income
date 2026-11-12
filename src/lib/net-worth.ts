/**
 * Net worth totals (Net Worth Calculator).
 *
 *   net worth            = total assets - total liabilities
 *   debt-to-asset ratio  = total liabilities / total assets
 *   equity share         = net worth / total assets
 * Ratios are not defined when total assets are zero. Item values are amounts
 * of money (never negative here: debts belong under liabilities); anything
 * non-finite counts as 0 so a half-typed row can never produce NaN.
 */

export interface NetWorthItem {
  name: string;
  value: number;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  /** Fraction, or null when total assets are 0. */
  debtToAsset: number | null;
  /** Fraction (negative when debts exceed assets), or null when total assets are 0. */
  equityShare: number | null;
}

const safeValue = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);

export function summarizeNetWorth(assets: NetWorthItem[], liabilities: NetWorthItem[]): NetWorthSummary {
  const totalAssets = assets.reduce((s, a) => s + safeValue(a.value), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + safeValue(l.value), 0);
  const netWorth = totalAssets - totalLiabilities;
  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    debtToAsset: totalAssets > 0 ? totalLiabilities / totalAssets : null,
    equityShare: totalAssets > 0 ? netWorth / totalAssets : null,
  };
}

/** Display name for an item: the typed name, or "Asset n" / "Liability n". */
export function itemLabel(name: string, kind: 'asset' | 'liability', index: number): string {
  const trimmed = name.trim();
  if (trimmed !== '') return trimmed;
  return `${kind === 'asset' ? 'Asset' : 'Liability'} ${index + 1}`;
}

/** Breakdown rows for the donut chart and its data table: positive items only, with each one's share. */
export function breakdown(items: NetWorthItem[], kind: 'asset' | 'liability'): Array<{ name: string; value: number; share: number }> {
  const named = items.map((item, i) => ({ name: itemLabel(item.name, kind, i), value: safeValue(item.value) }));
  const positive = named.filter((r) => r.value > 0);
  const total = positive.reduce((s, r) => s + r.value, 0);
  return positive.map((r) => ({ ...r, share: total > 0 ? r.value / total : 0 }));
}

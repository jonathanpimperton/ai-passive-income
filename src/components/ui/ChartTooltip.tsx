/**
 * Shared chart tooltip component for recharts.
 * Used across all calculator components that render charts.
 *
 * "Precision Instrument" styling: flat card, 1px border, per-series rows in
 * neutral ink with a small color swatch carrying series identity (never
 * colored text), values in mono + tabular numerals. Dark-mode correct via
 * Tailwind `dark:` classes (mapped to [data-theme="dark"]).
 */
import { formatCurrency } from '../../lib/calculator-utils';

interface TooltipPayloadEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  /** Prefix before the label value, e.g. "Year", "Age", "Month" */
  labelPrefix?: string;
  /** Custom formatter for values. Defaults to formatCurrency. */
  formatValue?: (value: number) => string;
}

export default function ChartTooltip({
  active,
  payload,
  label,
  labelPrefix = 'Year',
  formatValue = formatCurrency,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-md px-3 py-2.5 text-sm">
      <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-1.5">
        {labelPrefix} {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <span
                className="inline-block w-2 h-2 rounded-[2px] shrink-0"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.name}
            </span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { ChartTooltipProps, TooltipPayloadEntry };

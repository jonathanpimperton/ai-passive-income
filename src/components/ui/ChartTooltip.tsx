/**
 * Shared chart tooltip component for recharts.
 * Used across all calculator components that render charts.
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
    <div className="bg-white border border-neutral-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-neutral-900 mb-1">
        {labelPrefix} {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatValue(entry.value)}
        </p>
      ))}
    </div>
  );
}

export type { ChartTooltipProps, TooltipPayloadEntry };

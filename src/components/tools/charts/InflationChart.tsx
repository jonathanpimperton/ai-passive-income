/**
 * Inflation chart (lazy-loaded by InflationCalc). Historical mode: what the
 * amount is worth in each year's prices. Projection mode: future cost and
 * purchasing power by year.
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency } from './chart-format';

export interface InflationChartProps {
  mode: 'historical' | 'future';
  /** historical: { year, value, original }; future: { year, futureCost, purchasingPower } */
  rows: Array<Record<string, number>>;
  ariaLabel: string;
  height: number;
  /** Formats the year axis label in the tooltip (e.g. "2026 (October)"). */
  yearLabel: (year: number) => string;
}

export default function InflationChart({ mode, rows, ariaLabel, height, yearLabel }: InflationChartProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, 'USD');
  const first = rows[0]?.year ?? 0;
  const last = rows[rows.length - 1]?.year ?? 0;

  return (
    <div style={{ height }}>
      <ClientChart ariaLabel={ariaLabel}>
        <AreaChart data={rows} margin={{ top: 5, right: 8, left: 5, bottom: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[first, last]}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
          />
          <YAxis
            tickFormatter={(v: number) => compactCurrency(v, 'USD')}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload as never}
                label={yearLabel(Number(props.label))}
                labelPrefix=""
                formatValue={fmt}
              />
            )}
          />
          {mode === 'historical' ? (
            <>
              <Area type="monotone" dataKey="value" name="Equivalent Value" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} isAnimationActive={false} />
              <Area type="monotone" dataKey="original" name="Original Amount" stroke={ct.series2} strokeWidth={2} fill={ct.series2Fill} isAnimationActive={false} />
            </>
          ) : (
            <>
              <Area type="monotone" dataKey="futureCost" name="Cost in Future Dollars" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} isAnimationActive={false} />
              <Area type="monotone" dataKey="purchasingPower" name="Purchasing Power" stroke={ct.series2} strokeWidth={2} fill={ct.series2Fill} isAnimationActive={false} />
            </>
          )}
        </AreaChart>
      </ClientChart>
    </div>
  );
}

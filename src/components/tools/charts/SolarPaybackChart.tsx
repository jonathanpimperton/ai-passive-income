/**
 * Cumulative savings vs net system cost (lazy-loaded by SolarPaybackCalc).
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency } from './chart-format';

export interface SolarPaybackChartProps {
  rows: Array<{ year: number; savings: number }>;
  netCost: number;
  currency: string;
  ariaLabel: string;
  height: number;
}

export default function SolarPaybackChart({ rows, netCost, currency, ariaLabel, height }: SolarPaybackChartProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  const last = rows[rows.length - 1]?.year ?? 0;

  return (
    <div style={{ height }}>
      <ClientChart ariaLabel={ariaLabel}>
        <AreaChart data={rows} margin={{ top: 5, right: 8, bottom: 5, left: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, last]}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            label={{ value: 'Year', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v: number) => compactCurrency(v, currency)}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload as never}
                label={`Year ${props.label}`}
                labelPrefix=""
                formatValue={fmt}
              />
            )}
          />
          {netCost > 0 && (
            <ReferenceLine
              y={netCost}
              stroke={ct.cost}
              strokeWidth={1.5}
              label={{ value: 'Net system cost', position: 'insideTopLeft', fill: ct.cost, fontSize: 11 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="savings"
            name="Cumulative Savings"
            fill={ct.series1Fill}
            stroke={ct.series1}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ClientChart>
    </div>
  );
}

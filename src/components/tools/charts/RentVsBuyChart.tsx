/**
 * Rent vs buy net-worth chart. Loaded lazily by RentVsBuyCalc (plan 5.4), so
 * recharts never ships with the calculator's first paint.
 */
import type { ComponentType, ReactNode } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency } from '../property-shared';

// ClientChart gains a required `ariaLabel` (W1-CORE, CO-9). Typed here so this
// file compiles both before and after that change lands.
const Chart = ClientChart as ComponentType<{ children: ReactNode; ariaLabel: string }>;

export interface RentVsBuyChartRow {
  year: number;
  buy: number;
  rent: number;
}

export default function RentVsBuyChart({
  data,
  currency,
  breakEvenYear,
  ariaLabel,
}: {
  data: RentVsBuyChartRow[];
  currency: string;
  breakEvenYear: number | null;
  ariaLabel: string;
}) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  return (
    <div className="h-[280px]">
      <Chart ariaLabel={ariaLabel}>
        <AreaChart data={data} margin={{ top: 16, right: 8, left: 4, bottom: 5 }}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => compactCurrency(v, currency)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip formatValue={fmt} />} />
          {breakEvenYear !== null && breakEvenYear > 1 && (
            <ReferenceLine
              x={breakEvenYear}
              stroke={ct.axisText}
              strokeWidth={1.5}
              label={{ value: 'Break-even', position: 'top', fill: ct.axisText, fontSize: 11, fontWeight: 600 }}
            />
          )}
          <Area type="monotone" dataKey="buy" name="Buying: net worth" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} animationDuration={600} />
          <Area type="monotone" dataKey="rent" name="Renting: net worth" stroke={ct.series2} strokeWidth={2} fill={ct.series2Fill} animationDuration={600} />
        </AreaChart>
      </Chart>
    </div>
  );
}

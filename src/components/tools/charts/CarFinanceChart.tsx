/**
 * Car finance true-cost stacked bars. Loaded lazily by CarFinanceCalc
 * (plan 5.4); the comparison table below is its text equivalent.
 */
import type { ComponentType, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency } from '../property-shared';

// ClientChart gains a required `ariaLabel` (W1-CORE, CO-9). Typed here so this
// file compiles both before and after that change lands.
const Chart = ClientChart as ComponentType<{ children: ReactNode; ariaLabel: string }>;

export interface CarFinanceChartRow {
  name: string;
  payments: number;
  opportunity: number;
}

export default function CarFinanceChart({ data, currency }: { data: CarFinanceChartRow[]; currency: string }) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  const label = `True cost by option: ${data.map((d) => `${d.name} ${fmt(d.payments + d.opportunity)}`).join(', ')}`;
  return (
    <div className="h-[220px]">
      <Chart ariaLabel={label}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: ct.axisText, fontSize: 11, fontFamily: ct.monoFont }} stroke={ct.axis} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fill: ct.axisText, fontSize: 11, fontFamily: ct.monoFont }} stroke={ct.axis} tickFormatter={(v: number) => compactCurrency(v, currency)} width={56} />
          <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
          <Bar dataKey="payments" name="Total Paid" stackId="a" fill={ct.series1} radius={[0, 0, 0, 0]} animationDuration={600} />
          <Bar dataKey="opportunity" name="Opportunity Cost" stackId="a" fill={ct.cost} radius={[4, 4, 0, 0]} animationDuration={600} />
        </BarChart>
      </Chart>
    </div>
  );
}

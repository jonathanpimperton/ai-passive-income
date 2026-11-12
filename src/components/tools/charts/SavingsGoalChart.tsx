/**
 * Savings goal growth chart (lazy-loaded by SavingsGoalCalc): balance and
 * contributions by month, with the goal as a reference line.
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import type { SavingsPathRow } from '../../../lib/savings-goal';
import { compactCurrency, monthLabel } from './chart-format';

export interface SavingsGoalChartProps {
  rows: SavingsPathRow[];
  goal: number;
  currency: string;
  ariaLabel: string;
  height: number;
}

export default function SavingsGoalChart({ rows, goal, currency, ariaLabel, height }: SavingsGoalChartProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  const last = rows[rows.length - 1]?.month ?? 0;
  const byYear = last > 36;
  const ticks: number[] = [];
  const step = byYear ? 12 * Math.max(1, Math.ceil(last / 12 / 8)) : Math.max(1, Math.ceil(last / 8));
  for (let t = 0; t <= last; t += step) ticks.push(t);
  const data = rows.map((r) => ({ month: r.month, balance: Math.round(r.balance), contributions: Math.round(r.contributions) }));

  return (
    <div style={{ height }}>
      <ClientChart ariaLabel={ariaLabel}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 5, bottom: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, last]}
            ticks={ticks}
            tickFormatter={(m: number) => (byYear ? String(m / 12) : String(m))}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            label={{ value: byYear ? 'Year' : 'Month', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
          />
          <YAxis
            tickFormatter={(v: number) => compactCurrency(v, currency)}
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
                label={monthLabel(Number(props.label))}
                labelPrefix=""
                formatValue={fmt}
              />
            )}
          />
          <ReferenceLine
            y={goal}
            ifOverflow="extendDomain"
            stroke={ct.series1}
            strokeWidth={1}
            strokeOpacity={0.8}
            label={{ value: 'Goal', position: 'insideTopLeft', fontSize: 10, fill: ct.axisText }}
          />
          <Area type="monotone" dataKey="balance" name="Projected Balance" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} isAnimationActive={false} />
          <Area type="monotone" dataKey="contributions" name="Contributions" stroke={ct.series2} strokeWidth={2} fill={ct.series2Fill} isAnimationActive={false} />
        </AreaChart>
      </ClientChart>
    </div>
  );
}

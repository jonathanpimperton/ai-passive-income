/**
 * Emergency fund timeline (lazy-loaded by EmergencyFundCalc): savings by
 * month against the 3, 6 and 12-month targets.
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency, monthLabel } from './chart-format';

export interface EmergencyFundChartProps {
  rows: Array<{ month: number; balance: number }>;
  /** [coverMonths, target amount] pairs. */
  targets: Array<{ coverMonths: number; target: number }>;
  currency: string;
  ariaLabel: string;
  height: number;
}

export default function EmergencyFundChart({ rows, targets, currency, ariaLabel, height }: EmergencyFundChartProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  // 6 months is the recommended (primary) target, 3 months the quiet milestone, 12 the stretch goal.
  const colors: Record<number, string> = { 3: ct.segments[1], 6: ct.series1, 12: ct.segments[2] };
  const data = rows.map((r) => ({ month: r.month, balance: Math.round(r.balance) }));
  const last = data[data.length - 1]?.month ?? 0;

  return (
    <div style={{ height }}>
      <ClientChart ariaLabel={ariaLabel}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 5, bottom: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, last]}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
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
          {targets.map((t) => (
            <ReferenceLine
              key={t.coverMonths}
              y={t.target}
              ifOverflow="extendDomain"
              stroke={colors[t.coverMonths]}
              strokeWidth={1.5}
              label={{ value: `${t.coverMonths} months`, position: 'insideTopRight', fill: ct.axisText, fontSize: 10 }}
            />
          ))}
          <Area type="monotone" dataKey="balance" name="Savings" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} isAnimationActive={false} />
        </AreaChart>
      </ClientChart>
    </div>
  );
}

/**
 * Retirement projection chart (lazy-loaded by the three retirement
 * calculators). Balance, inflation-adjusted balance and contributions by
 * age, with numbered milestone markers explained in the legend the parent
 * renders under the chart, and an optional target line.
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import type { ProjectionRow } from '../../../lib/retirement';
import { ageLabel, compactCurrency, integerTicks } from './chart-format';

export interface RetirementProjectionChartProps {
  rows: ProjectionRow[];
  /** Marker ages; marker i is labelled i + 1 to match the legend list. */
  milestoneAges: number[];
  currency: string;
  realLabel: string;
  ariaLabel: string;
  /** Optional horizontal target line. */
  target?: number;
  height: number;
}

export default function RetirementProjectionChart({
  rows,
  milestoneAges,
  currency,
  realLabel,
  ariaLabel,
  target,
  height,
}: RetirementProjectionChartProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  const data = rows.map((r) => ({
    age: r.age,
    nominal: Math.round(r.nominal),
    real: Math.round(r.real),
    contributions: Math.round(r.contributions),
  }));
  const minAge = data[0]?.age ?? 0;
  const maxAge = data[data.length - 1]?.age ?? 0;

  return (
    <div style={{ height }}>
      <ClientChart ariaLabel={ariaLabel}>
        <AreaChart data={data} margin={{ top: 18, right: 12, left: 5, bottom: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="age"
            type="number"
            domain={[minAge, maxAge]}
            ticks={integerTicks(minAge, maxAge)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
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
                label={ageLabel(Number(props.label))}
                labelPrefix=""
                formatValue={fmt}
              />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />

          {milestoneAges.map((age, i) => (
            <ReferenceLine
              key={`${age}-${i}`}
              x={age}
              stroke={ct.axisText}
              strokeWidth={1}
              strokeOpacity={0.6}
              label={{ value: String(i + 1), position: 'top', fontSize: 10, fill: ct.axisText, fontFamily: ct.monoFont }}
            />
          ))}
          {typeof target === 'number' && target > 0 && (
            <ReferenceLine y={target} ifOverflow="extendDomain" stroke={ct.series1} strokeWidth={1} strokeOpacity={0.7} />
          )}

          <Area type="monotone" dataKey="nominal" name="Balance" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} isAnimationActive={false} />
          <Area type="monotone" dataKey="real" name={realLabel} stroke={ct.segments[2]} strokeWidth={2} fill="none" isAnimationActive={false} />
          <Area type="monotone" dataKey="contributions" name="Contributions" stroke={ct.series2} strokeWidth={2} fill={ct.series2Fill} isAnimationActive={false} />
        </AreaChart>
      </ClientChart>
    </div>
  );
}

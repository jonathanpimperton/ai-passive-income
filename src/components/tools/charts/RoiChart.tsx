/**
 * Total and annualized return bars for one or two investments (ROI
 * Calculator). Loaded lazily; the calculator pairs it with a ChartDataTable.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatPercentGuarded } from '../../../lib/result-format';
import {
  ChartArea,
  ChartCanvas,
  CHART_ANIMATION_MS,
  animationProps,
  usePrefersReducedMotion,
} from './InvestDebtChartFrame';

export interface RoiChartRow {
  name: string;
  /** Percent values (55 = 55%). */
  'Total Return': number;
  Annualized: number;
}

export default function RoiChart({ data, ariaLabel }: { data: RoiChartRow[]; ariaLabel: string }) {
  const ct = useChartTheme();
  const reduced = usePrefersReducedMotion();
  const anim = animationProps(reduced);
  const pct = (v: number) => formatPercentGuarded(v / 100);

  return (
    <ChartArea dataKey={data} animationMs={reduced ? 0 : CHART_ANIMATION_MS}>
      <ChartCanvas ariaLabel={ariaLabel}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} barGap={8} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => (Math.abs(v) >= 1e4 ? `${(v / 1000).toFixed(0)}K%` : `${v.toFixed(0)}%`)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip labelPrefix="" formatValue={pct} />} />
          {/* Identity by investment (A = primary, B = comparison); the
              annualized measure is the same hue at lower opacity. */}
          <Bar dataKey="Total Return" radius={[6, 6, 0, 0]} maxBarSize={60} {...anim}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? ct.series1 : ct.series2} />
            ))}
          </Bar>
          <Bar dataKey="Annualized" radius={[6, 6, 0, 0]} maxBarSize={60} {...anim}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? ct.series1 : ct.series2} fillOpacity={0.45} />
            ))}
          </Bar>
        </BarChart>
      </ChartCanvas>
    </ChartArea>
  );
}

/**
 * Two-series area chart of balance over time, used by the Compound
 * Interest, Investment Return and Investment Fee calculators. Loaded lazily
 * (see InvestDebtLazyChart.tsx); the calculator's own year-by-year table is
 * the text alternative.
 */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from 'recharts';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatMoneyGuarded } from '../../../lib/result-format';
import {
  ChartArea,
  ChartCanvas,
  CHART_ANIMATION_MS,
  animationProps,
  moneyTick,
  usePrefersReducedMotion,
} from './InvestDebtChartFrame';

export interface GrowthSeries {
  /** Property in each data row. Also shown as the series name in the tooltip. */
  key: string;
  /** 'primary' = brand teal (the answer), 'comparison' = quiet neutral. */
  tone: 'primary' | 'comparison';
}

export interface InvestGrowthChartProps {
  data: Array<Record<string, number>>;
  xKey: string;
  series: GrowthSeries[];
  currency: string;
  ariaLabel: string;
  /** Optional highlighted point (e.g. where earnings overtake deposits). */
  marker?: { x: number; y: number } | null;
  labelPrefix?: string;
}

export default function InvestGrowthChart({
  data,
  xKey,
  series,
  currency,
  ariaLabel,
  marker,
  labelPrefix = 'Year',
}: InvestGrowthChartProps) {
  const ct = useChartTheme();
  const reduced = usePrefersReducedMotion();
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const anim = animationProps(reduced);

  return (
    <ChartArea dataKey={data} animationMs={reduced ? 0 : CHART_ANIMATION_MS}>
      <ChartCanvas ariaLabel={ariaLabel}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={moneyTick(currency)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip labelPrefix={labelPrefix} formatValue={fmt} />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.key}
              stroke={s.tone === 'primary' ? ct.series1 : ct.series2}
              strokeWidth={2}
              fill={s.tone === 'primary' ? ct.series1Fill : ct.series2Fill}
              {...anim}
            />
          ))}
          {marker && (
            <ReferenceDot x={marker.x} y={marker.y} r={4} fill={ct.series1} stroke={ct.tooltipBg} strokeWidth={2} />
          )}
        </AreaChart>
      </ChartCanvas>
    </ChartArea>
  );
}

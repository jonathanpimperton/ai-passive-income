/**
 * Donut of assets or liabilities for the Net Worth Calculator, with the
 * total as the centre KPI and a direct legend. Loaded lazily; the
 * calculator pairs it with a ChartDataTable.
 */
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatMoneyGuarded } from '../../../lib/result-format';
import {
  ChartArea,
  ChartCanvas,
  CHART_ANIMATION_MS,
  animationProps,
  usePrefersReducedMotion,
} from './InvestDebtChartFrame';

// Liability slices share the cost hue, differentiated by opacity steps.
const LIABILITY_OPACITY = [1, 0.75, 0.55, 0.38, 0.25];

export interface NetWorthChartProps {
  data: Array<{ name: string; value: number }>;
  kind: 'asset' | 'liability';
  currency: string;
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
}

export default function NetWorthChart({ data, kind, currency, centerValue, centerLabel, ariaLabel }: NetWorthChartProps) {
  const ct = useChartTheme();
  const reduced = usePrefersReducedMotion();
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const colorFor = (i: number) => (kind === 'asset' ? ct.segments[i % ct.segments.length] : ct.cost);
  const opacityFor = (i: number) => (kind === 'asset' ? 1 : LIABILITY_OPACITY[i % LIABILITY_OPACITY.length]);

  return (
    <>
      <div className="relative h-[180px]">
        <ChartArea dataKey={data} animationMs={reduced ? 0 : CHART_ANIMATION_MS}>
          <ChartCanvas ariaLabel={ariaLabel}>
            <PieChart accessibilityLayer={false}>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name" {...animationProps(reduced)}>
                {data.map((_, i) => (
                  <Cell key={i} fill={colorFor(i)} fillOpacity={opacityFor(i)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
            </PieChart>
          </ChartCanvas>
        </ChartArea>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
          <span className="font-mono tabular-nums text-sm font-semibold text-neutral-900">{centerValue}</span>
          <span className="text-[9px] uppercase tracking-wide text-neutral-500">{centerLabel}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-1" aria-hidden="true">
        {data.map((d, i) => (
          <span key={`${d.name}-${i}`} className="flex items-center gap-1 text-[11px] text-neutral-500">
            <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
              <circle cx="4" cy="4" r="4" fill={colorFor(i)} fillOpacity={opacityFor(i)} />
            </svg>
            {d.name}
          </span>
        ))}
      </div>
    </>
  );
}

/**
 * Remaining balance by month for two payoff plans (Credit Card Payoff:
 * minimum vs with extra; Debt Payoff: avalanche vs snowball). Loaded lazily;
 * each calculator pairs it with a ChartDataTable.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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

export interface BalanceLine {
  key: string;
  tone: 'primary' | 'comparison';
}

export interface DebtBalanceChartProps {
  data: Array<Record<string, number>>;
  lines: BalanceLine[];
  currency: string;
  ariaLabel: string;
}

export default function DebtBalanceChart({ data, lines, currency, ariaLabel }: DebtBalanceChartProps) {
  const ct = useChartTheme();
  const reduced = usePrefersReducedMotion();
  const fmt = (v: number) => formatMoneyGuarded(v, currency);
  const anim = animationProps(reduced);

  return (
    <ChartArea dataKey={data} animationMs={reduced ? 0 : CHART_ANIMATION_MS}>
      <ChartCanvas ariaLabel={ariaLabel}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} accessibilityLayer={false}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
            label={{ value: 'Months', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: ct.axisText } }}
          />
          <YAxis
            tickFormatter={moneyTick(currency)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip labelPrefix="Month" formatValue={fmt} />} />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.key}
              stroke={l.tone === 'primary' ? ct.series1 : ct.series2}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              {...anim}
            />
          ))}
        </LineChart>
      </ChartCanvas>
    </ChartArea>
  );
}

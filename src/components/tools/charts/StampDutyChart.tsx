/**
 * "Stamp duty by property price" bar chart, loaded lazily by StampDutyCalc.
 * The user's own price is the one teal bar; the comparison prices are
 * neutral (CALC-UX-A-20: the current price was computed but never shown).
 */
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';

export interface StampDutyPoint {
  /** Formatted price, e.g. "£400,000" (category axis and tooltip label). */
  label: string;
  price: number;
  'Stamp Duty': number;
  isCurrent: boolean;
}

interface Props {
  data: StampDutyPoint[];
  ariaLabel: string;
  formatValue: (v: number) => string;
}

function shortGbp(v: number): string {
  if (v >= 1_000_000) return `£${Number((v / 1_000_000).toFixed(1))}M`;
  if (v >= 1000) return `£${Number((v / 1000).toFixed(0))}K`;
  return `£${v}`;
}

export default function StampDutyChart({ data, ariaLabel, formatValue }: Props) {
  const ct = useChartTheme();
  const priceByLabel = new Map(data.map((d) => [d.label, d.price]));

  return (
    <div className="h-64">
      <ClientChart ariaLabel={ariaLabel}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tickFormatter={(v: string) => shortGbp(priceByLabel.get(v) ?? 0)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => shortGbp(v)}
            tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip content={<ChartTooltip labelPrefix="Price" formatValue={formatValue} />} />
          <Bar dataKey="Stamp Duty" radius={[4, 4, 0, 0]} animationDuration={600}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.isCurrent ? ct.series1 : ct.series2} />
            ))}
          </Bar>
        </BarChart>
      </ClientChart>
    </div>
  );
}

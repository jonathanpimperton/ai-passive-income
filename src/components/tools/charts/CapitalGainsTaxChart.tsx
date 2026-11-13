/**
 * Capital Gains Tax charts, loaded lazily by CapitalGainsTaxCalc:
 * - 'us-term':      short-term vs long-term federal tax + NIIT (stacked bars)
 * - 'uk-breakdown': how the gain splits into exempt amount, tax and proceeds
 */
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';

export interface CgtTermRow {
  name: 'Short-term' | 'Long-term';
  'Federal Tax': number;
  NIIT: number;
}

export interface CgtBreakdownRow {
  name: string;
  value: number;
  kind: 'exempt' | 'tax' | 'kept';
}

type Props =
  | { kind: 'us-term'; data: CgtTermRow[]; ariaLabel: string; formatValue: (v: number) => string }
  | { kind: 'uk-breakdown'; data: CgtBreakdownRow[]; ariaLabel: string; formatValue: (v: number) => string };

function shortMoney(symbol: string, v: number): string {
  return v >= 1000 ? `${symbol}${Number((v / 1000).toFixed(0))}K` : `${symbol}${v}`;
}

export default function CapitalGainsTaxChart(props: Props) {
  const ct = useChartTheme();
  const tick = { fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont };

  if (props.kind === 'us-term') {
    return (
      <div className="h-48">
        <ClientChart ariaLabel={props.ariaLabel}>
          <BarChart data={props.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid stroke={ct.grid} vertical={false} />
            <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: ct.axis }} />
            <YAxis tickFormatter={(v: number) => shortMoney('$', v)} tick={tick} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<ChartTooltip labelPrefix="" formatValue={props.formatValue} />} />
            {/* Both segments are tax paid: cost family, NIIT lighter */}
            <Bar dataKey="Federal Tax" stackId="a" fill={ct.cost} radius={[0, 0, 0, 0]} />
            <Bar dataKey="NIIT" stackId="a" fill={ct.cost} fillOpacity={0.55} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ClientChart>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ClientChart ariaLabel={props.ariaLabel}>
        <BarChart data={props.data} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid stroke={ct.grid} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => shortMoney('£', v)}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: ct.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis type="category" dataKey="name" tick={tick} tickLine={false} axisLine={false} width={90} />
          <Tooltip content={<ChartTooltip labelPrefix="" formatValue={props.formatValue} />} />
          {/* Semantic per row: tax = cost, exempt = gain, kept = primary */}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
            {props.data.map((d) => (
              <Cell key={d.name} fill={d.kind === 'tax' ? ct.cost : d.kind === 'exempt' ? ct.gain : ct.series1} />
            ))}
          </Bar>
        </BarChart>
      </ClientChart>
    </div>
  );
}

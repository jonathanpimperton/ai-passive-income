/**
 * Affordability monthly-payment donut. Loaded lazily by
 * MortgageAffordabilityCalc (plan 5.4); the breakdown table above it is its
 * text equivalent.
 */
import type { ComponentType, ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';

// ClientChart gains a required `ariaLabel` (W1-CORE, CO-9). Typed here so this
// file compiles both before and after that change lands.
const Chart = ClientChart as ComponentType<{ children: ReactNode; ariaLabel: string }>;

export interface AffordabilitySlice {
  name: string;
  value: number;
}

export default function AffordabilityChart({ slices, currency, total }: { slices: AffordabilitySlice[]; currency: string; total: number }) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  // P&I = teal (builds equity); recurring taxes/fees = cost family by opacity.
  const style = (name: string): { fill: string; opacity: number } => {
    switch (name) {
      case 'Principal & Interest': return { fill: ct.series1, opacity: 1 };
      case 'Property Tax': return { fill: ct.cost, opacity: 1 };
      case 'Insurance': return { fill: ct.cost, opacity: 0.7 };
      case 'PMI': return { fill: ct.cost, opacity: 0.5 };
      case 'HOA': return { fill: ct.cost, opacity: 0.32 };
      default: return { fill: ct.segments[1], opacity: 1 };
    }
  };
  const label = `Monthly payment of ${fmt(total)}: ${slices.map((s) => `${s.name} ${fmt(s.value)}`).join(', ')}`;

  return (
    <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
      <h3 className="text-sm font-medium text-neutral-700 mb-3">Monthly Payment Breakdown</h3>
      <div className="relative h-[200px]">
        <Chart ariaLabel={label}>
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" animationDuration={600}>
              {slices.map((d) => {
                const s = style(d.name);
                return <Cell key={d.name} fill={s.fill} fillOpacity={s.opacity} />;
              })}
            </Pie>
            <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
          </PieChart>
        </Chart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
          <span className="font-mono tabular-nums text-lg font-semibold text-neutral-900">{fmt(total)}</span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">monthly</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2">
        {slices.map((d) => {
          const s = style(d.name);
          return (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill, opacity: s.opacity }} aria-hidden="true" />
              {d.name}: <span className="tabular-nums whitespace-nowrap">{fmt(d.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

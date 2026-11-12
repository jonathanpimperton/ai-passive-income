/**
 * Mortgage payment charts (principal vs interest donut + balance over time).
 * Loaded lazily by MortgagePaymentCalc (plan 5.4). The amortization schedule
 * table below them is their text equivalent.
 */
import type { ComponentType, ReactNode } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency } from '../property-shared';

const Chart = ClientChart as ComponentType<{ children: ReactNode; ariaLabel: string }>;

export interface MortgagePaymentChartsProps {
  currency: string;
  principal: number;
  totalInterest: number;
  /** Shown in the donut centre */
  monthlyTotal: number;
  balanceByYear: Array<{ year: string; balance: number }>;
}

export default function MortgagePaymentCharts({ currency, principal, totalInterest, monthlyTotal, balanceByYear }: MortgagePaymentChartsProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  const pieData = [
    { name: 'Principal', value: Math.round(principal) },
    { name: 'Total Interest', value: Math.round(totalInterest) },
  ];
  const color = (name: string) => (name === 'Total Interest' ? ct.cost : ct.series1);

  return (
    <>
      <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
        <h3 className="text-sm font-medium text-neutral-700 mb-3">Principal vs Interest</h3>
        <div className="relative h-[200px]">
          <Chart ariaLabel={`Principal ${fmt(principal)} versus total interest ${fmt(totalInterest)}`}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" animationDuration={600}>
                {pieData.map((d) => (
                  <Cell key={d.name} fill={color(d.name)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
            </PieChart>
          </Chart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
            <span className="font-mono tabular-nums text-lg font-semibold text-neutral-900">{fmt(monthlyTotal)}</span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">monthly</span>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color(d.name) }} aria-hidden="true" />
              {d.name}: <span className="tabular-nums">{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {balanceByYear.length > 0 && (
        <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Balance Over Time</h3>
          <div className="h-[260px]">
            <Chart ariaLabel={`Remaining balance by year, from ${fmt(principal)} to ${fmt(balanceByYear[balanceByYear.length - 1].balance)}. The amortization schedule below lists every year.`}>
              <AreaChart data={balanceByYear} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={ct.grid} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }} tickFormatter={(v: number) => compactCurrency(v, currency)} width={60} />
                <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
                <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke={ct.series1} fill={ct.series1Fill} strokeWidth={2} animationDuration={800} />
              </AreaChart>
            </Chart>
          </div>
        </div>
      )}
    </>
  );
}

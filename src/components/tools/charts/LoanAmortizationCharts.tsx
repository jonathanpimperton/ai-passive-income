/**
 * Loan amortization charts (principal vs interest donut + balance over time).
 * Loaded lazily by LoanAmortizationCalc (plan 5.4); the amortization schedule
 * below them is their text equivalent.
 */
import type { ComponentType, ReactNode } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';
import { formatCurrency } from '../../../lib/calculator-utils';
import { compactCurrency } from '../property-shared';

// ClientChart gains a required `ariaLabel` (W1-CORE, CO-9). Typed here so this
// file compiles both before and after that change lands.
const Chart = ClientChart as ComponentType<{ children: ReactNode; ariaLabel: string }>;

export interface LoanAmortizationChartsProps {
  currency: string;
  principal: number;
  totalInterest: number;
  monthlyPayment: number;
  balanceByYear: Array<{ year: number; balance: number }>;
}

export default function LoanAmortizationCharts({ currency, principal, totalInterest, monthlyPayment, balanceByYear }: LoanAmortizationChartsProps) {
  const ct = useChartTheme();
  const fmt = (v: number) => formatCurrency(v, currency);
  const pieData = [
    { name: 'Principal', value: principal },
    { name: 'Interest', value: totalInterest },
  ];
  const last = balanceByYear[balanceByYear.length - 1];

  return (
    <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
        <h3 className="text-sm font-medium text-neutral-700 mb-2">Principal vs Interest</h3>
        <div className="relative h-40">
          <Chart ariaLabel={`Principal ${fmt(principal)} versus total interest ${fmt(totalInterest)}`}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} animationDuration={600}>
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.name === 'Interest' ? ct.cost : ct.series1} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
            </PieChart>
          </Chart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
            <span className="font-mono tabular-nums text-sm font-semibold text-neutral-900">{fmt(monthlyPayment)}</span>
            <span className="text-[9px] uppercase tracking-wide text-neutral-500">monthly</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
        <h3 className="text-sm font-medium text-neutral-700 mb-2">Balance Over Time</h3>
        <div className="h-40">
          <Chart ariaLabel={`Remaining balance by year, from ${fmt(principal)} to ${fmt(last ? last.balance : 0)}. The amortization schedule below lists every year.`}>
            <AreaChart data={balanceByYear} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={ct.grid} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickFormatter={(v: number) => compactCurrency(v, currency)} tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<ChartTooltip formatValue={fmt} />} />
              <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} animationDuration={600} />
            </AreaChart>
          </Chart>
        </div>
      </div>
    </div>
  );
}

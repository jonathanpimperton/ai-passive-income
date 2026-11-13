/**
 * US Salary income-breakdown donut. Loaded with React.lazy by SalaryCalc so
 * recharts stays out of the calculator's first bundle (A11Y-PERF-05).
 * SalaryCalc owns the data, colors, center KPI, legend and "Show data" table;
 * this file only draws the chart.
 */
import { Tooltip, PieChart, Pie, Cell } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';

export interface SalarySlice {
  name: string;
  value: number;
  fill: string;
  opacity: number;
}

interface SalaryChartProps {
  slices: SalarySlice[];
  /** Accessible name for the chart image */
  ariaLabel: string;
}

export default function SalaryChart({ slices, ariaLabel }: SalaryChartProps) {
  return (
    <ClientChart ariaLabel={ariaLabel}>
      <PieChart>
        <Pie
          data={slices}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          animationDuration={600}
        >
          {slices.map((s) => (
            <Cell key={s.name} fill={s.fill} fillOpacity={s.opacity} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip labelPrefix="" />} />
      </PieChart>
    </ClientChart>
  );
}

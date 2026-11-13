/**
 * UK Salary "Income breakdown" donut. Loaded lazily by SalaryUkCalc so
 * recharts stays out of the calculator's first-load bundle (plan 5.4).
 */
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ClientChart from '../../ui/ClientChart';
import ChartTooltip from '../../ui/ChartTooltip';
import { useChartTheme } from '../../../lib/useChartTheme';

export interface SalarySlice {
  name: 'Take-Home Pay' | 'Income Tax' | 'National Insurance' | 'Student Loan' | 'Pension';
  value: number;
}

interface Props {
  slices: SalarySlice[];
  /** Share of gross pay kept, shown in the donut centre. */
  pctKept: number;
  ariaLabel: string;
  formatValue: (v: number) => string;
}

export default function SalaryUkChart({ slices, pctKept, ariaLabel, formatValue }: Props) {
  const ct = useChartTheme();

  // Semantic slice colours: take-home = primary teal, pension = money kept
  // (gain), deductions = cost family differentiated by opacity steps.
  const sliceStyle = (name: SalarySlice['name']): { fill: string; opacity: number } => {
    switch (name) {
      case 'Take-Home Pay': return { fill: ct.series1, opacity: 1 };
      case 'Income Tax': return { fill: ct.cost, opacity: 1 };
      case 'National Insurance': return { fill: ct.cost, opacity: 0.7 };
      case 'Student Loan': return { fill: ct.cost, opacity: 0.45 };
      case 'Pension': return { fill: ct.gain, opacity: 1 };
    }
  };

  return (
    <div>
      <div className="relative h-[240px]">
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
              {slices.map((d) => {
                const s = sliceStyle(d.name);
                return <Cell key={d.name} fill={s.fill} fillOpacity={s.opacity} />;
              })}
            </Pie>
            <Tooltip content={<ChartTooltip labelPrefix="" formatValue={formatValue} />} />
          </PieChart>
        </ClientChart>
        {/* Donut centre KPI */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
          <span className="font-mono tabular-nums text-2xl font-semibold text-neutral-900">{pctKept}%</span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">kept</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2" aria-hidden="true">
        {slices.map((d) => {
          const s = sliceStyle(d.name);
          return (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill, opacity: s.opacity }} />
              {d.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

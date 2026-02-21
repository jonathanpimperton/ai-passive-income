import { useState, useMemo, useCallback } from 'react';
import {
  loanMonthlyPayment,
  amortizationSchedule,
  formatCurrency,
  formatNumber,
} from '../../lib/calculator-utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChevronDown, RotateCcw } from 'lucide-react';

/* ── Reusable SliderInput ─────────────────────────────────── */
interface SliderInputProps {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  formatDisplay?: (v: number) => string;
}

function SliderInput({ label, id, value, min, max, step, onChange, prefix, suffix, formatDisplay }: SliderInputProps) {
  const displayValue = formatDisplay ? formatDisplay(value) : String(value);
  const handleText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">{prefix}</span>}
        <input id={id} type="text" inputMode="decimal" value={displayValue} onChange={handleText}
          className={`w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
            ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">{suffix}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 mt-2.5 rounded-full appearance-none cursor-pointer bg-neutral-200 accent-primary-500
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        aria-label={`${label} slider`} />
    </div>
  );
}

/* ── Chart tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-neutral-900 mb-1">Year {label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Collapsible Year-Group Table ─────────────────────────── */
interface YearGroup {
  year: number;
  startBalance: number;
  endBalance: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  months: Array<{ month: number; payment: number; principal: number; interest: number; balance: number }>;
}

function AmortizationTable({ yearGroups }: { yearGroups: YearGroup[] }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200/80 sticky top-0 z-10">
            <th className="text-left py-3 px-4 font-medium text-neutral-600">Year</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600">Principal</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600">Interest</th>
            <th className="text-right py-3 px-4 font-medium text-neutral-600 hidden sm:table-cell">Balance</th>
          </tr>
        </thead>
        <tbody>
          {yearGroups.map((group, i) => (
            <>
              <tr
                key={`year-${group.year}`}
                className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150
                  ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                  ${expandedYear === group.year ? 'bg-primary-50/50' : 'hover:bg-primary-50/30'}`}
                onClick={() => setExpandedYear(expandedYear === group.year ? null : group.year)}
              >
                <td className="py-2.5 px-4 font-medium text-neutral-900 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <ChevronDown size={14}
                      className={`text-neutral-400 transition-transform duration-200 ${expandedYear === group.year ? 'rotate-180' : ''}`}
                      aria-hidden="true" />
                    {group.year}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums">{formatCurrency(group.totalPrincipal)}</td>
                <td className="py-2.5 px-4 text-right text-negative-500 tabular-nums">{formatCurrency(group.totalInterest)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums hidden sm:table-cell">{formatCurrency(group.endBalance)}</td>
              </tr>
              {expandedYear === group.year && group.months.map((m) => (
                <tr key={`month-${m.month}`} className="bg-primary-50/30 border-b border-primary-100/50">
                  <td className="py-1.5 px-4 pl-10 text-xs text-neutral-500 tabular-nums">Month {m.month}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-neutral-600 tabular-nums">{formatCurrency(m.principal)}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-negative-500/80 tabular-nums">{formatCurrency(m.interest)}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-neutral-600 tabular-nums hidden sm:table-cell">{formatCurrency(m.balance)}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Pie chart colors ─────────────────────────────────────── */
const PIE_COLORS = ['#2563EB', '#EF4444'];

/* ── Main Calculator ──────────────────────────────────────── */
const DEFAULTS = { loanAmount: 300000, annualRate: 6.5, termYears: 30, extraPayment: 0 };

export default function LoanAmortizationCalc() {
  const [loanAmount, setLoanAmount] = useState(DEFAULTS.loanAmount);
  const [rate, setRate] = useState(DEFAULTS.annualRate);
  const [termYears, setTermYears] = useState(DEFAULTS.termYears);
  const [extraPayment, setExtraPayment] = useState(DEFAULTS.extraPayment);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const termMonths = termYears * 12;

  const monthlyPayment = useMemo(
    () => loanMonthlyPayment(loanAmount, rate / 100, termMonths),
    [loanAmount, rate, termMonths]
  );

  const schedule = useMemo(
    () => amortizationSchedule(loanAmount, rate / 100, termMonths),
    [loanAmount, rate, termMonths]
  );

  const totalInterest = useMemo(
    () => schedule.reduce((sum, row) => sum + row.interest, 0),
    [schedule]
  );

  const totalCost = loanAmount + totalInterest;

  const pieData = [
    { name: 'Principal', value: loanAmount },
    { name: 'Interest', value: totalInterest },
  ];

  // Group schedule into years
  const yearGroups: YearGroup[] = useMemo(() => {
    const groups: YearGroup[] = [];
    for (let y = 0; y < termYears; y++) {
      const startIdx = y * 12;
      const months = schedule.slice(startIdx, startIdx + 12);
      if (months.length === 0) break;
      groups.push({
        year: y + 1,
        startBalance: y === 0 ? loanAmount : schedule[startIdx - 1]?.balance ?? 0,
        endBalance: months[months.length - 1].balance,
        totalPrincipal: months.reduce((s, m) => s + m.principal, 0),
        totalInterest: months.reduce((s, m) => s + m.interest, 0),
        totalPayment: months.reduce((s, m) => s + m.payment, 0),
        months,
      });
    }
    return groups;
  }, [schedule, termYears, loanAmount]);

  // Chart data: yearly principal vs interest paid
  const chartData = useMemo(
    () =>
      yearGroups.map((g) => ({
        year: g.year,
        'Remaining Balance': g.endBalance,
        'Cumulative Principal': loanAmount - g.endBalance,
        'Cumulative Interest': yearGroups
          .slice(0, g.year)
          .reduce((s, gg) => s + gg.totalInterest, 0),
      })),
    [yearGroups, loanAmount]
  );

  const handleReset = useCallback(() => {
    setLoanAmount(DEFAULTS.loanAmount);
    setRate(DEFAULTS.annualRate);
    setTermYears(DEFAULTS.termYears);
    setExtraPayment(DEFAULTS.extraPayment);
  }, []);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* ── Inputs ─────────────────────────────────── */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Inputs</h2>
            <button onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-500 transition-colors duration-150"
              aria-label="Reset calculator to defaults">
              <RotateCcw size={12} aria-hidden="true" /> Reset
            </button>
          </div>
          <div className="space-y-5">
            <SliderInput label="Loan Amount" id="la-amount" value={loanAmount}
              min={1000} max={2000000} step={5000} onChange={setLoanAmount}
              prefix="$" formatDisplay={(v) => formatNumber(v)} />
            <SliderInput label="Annual Interest Rate" id="la-rate" value={rate}
              min={0.1} max={20} step={0.1} onChange={setRate}
              suffix="%" formatDisplay={(v) => v.toFixed(1)} />
            <SliderInput label="Loan Term (Years)" id="la-term" value={termYears}
              min={1} max={40} step={1} onChange={setTermYears} />
          </div>

          <div className="mt-6 pt-5 border-t border-neutral-100">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-500 transition-colors duration-150"
              aria-expanded={showAdvanced}>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              Advanced settings
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${showAdvanced ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <SliderInput label="Extra Monthly Payment" id="la-extra" value={extraPayment}
                min={0} max={5000} step={50} onChange={setExtraPayment}
                prefix="$" formatDisplay={(v) => formatNumber(v)} />
            </div>
          </div>
        </div>

        {/* ── Results ────────────────────────────────── */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Monthly Payment</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary-900 tabular-nums">
              {formatCurrency(monthlyPayment)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              You&apos;ll pay {formatCurrency(totalInterest)} in total interest over {termYears} years
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Principal</p>
              <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(loanAmount)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Interest</p>
              <p className="text-base sm:text-lg font-semibold text-negative-500 tabular-nums">{formatCurrency(totalInterest)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Total Cost</p>
              <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(totalCost)}</p>
            </div>
          </div>

          {/* Pie + Area Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Principal vs Interest</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}
                      animationDuration={600}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Balance Over Time</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
                      tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} width={45} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Remaining Balance" stroke="#2563EB" strokeWidth={2} fill="#2563EB" fillOpacity={0.1} animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Amortization Table */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Amortization Schedule</h3>
            <AmortizationTable yearGroups={yearGroups} />
          </div>
        </div>
      </div>
    </div>
  );
}

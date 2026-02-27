import { useState, useMemo, useCallback, useRef, Fragment } from 'react';
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
import { ChevronDown, RotateCcw, Banknote, Percent, DollarSign } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

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
            <Fragment key={`year-${group.year}`}>
              <tr
                className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150
                  ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                  ${expandedYear === group.year ? 'bg-primary-50/50' : 'hover:bg-primary-50/30'}`}
                onClick={() => setExpandedYear(expandedYear === group.year ? null : group.year)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedYear(expandedYear === group.year ? null : group.year); }}}
                tabIndex={0}
                role="button"
                aria-expanded={expandedYear === group.year}
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
                <td className="py-2.5 px-4 text-right text-negative-600 tabular-nums">{formatCurrency(group.totalInterest)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 tabular-nums hidden sm:table-cell">{formatCurrency(group.endBalance)}</td>
              </tr>
              {expandedYear === group.year && group.months.map((m) => (
                <tr key={`month-${m.month}`} className="bg-primary-50/30 border-b border-primary-100/50">
                  <td className="py-1.5 px-4 pl-10 text-xs text-neutral-500 tabular-nums">Month {m.month}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-neutral-600 tabular-nums">{formatCurrency(m.principal)}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-negative-600 tabular-nums">{formatCurrency(m.interest)}</td>
                  <td className="py-1.5 px-4 text-right text-xs text-neutral-600 tabular-nums hidden sm:table-cell">{formatCurrency(m.balance)}</td>
                </tr>
              ))}
            </Fragment>
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
  const resultsRef = useRef<HTMLDivElement>(null);
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

  // Generate schedule with extra payments applied
  const schedule = useMemo(() => {
    if (extraPayment === 0) {
      return amortizationSchedule(loanAmount, rate / 100, termMonths);
    }
    // Custom schedule with extra payments
    const r = rate / 100 / 12;
    let balance = loanAmount;
    const result: Array<{ month: number; payment: number; principal: number; interest: number; balance: number }> = [];
    for (let month = 1; month <= termMonths && balance > 0.01; month++) {
      const interestPayment = balance * r;
      const basePrincipal = monthlyPayment - interestPayment;
      const totalPrincipal = Math.min(balance, basePrincipal + extraPayment);
      const totalPayment = interestPayment + totalPrincipal;
      balance = Math.max(0, balance - totalPrincipal);
      result.push({
        month,
        payment: Math.round(totalPayment * 100) / 100,
        principal: Math.round(totalPrincipal * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }
    return result;
  }, [loanAmount, rate, termMonths, extraPayment, monthlyPayment]);

  const totalInterest = useMemo(
    () => schedule.reduce((sum, row) => sum + row.interest, 0),
    [schedule]
  );

  const totalCost = loanAmount + totalInterest;
  const actualMonths = schedule.length;
  const monthsSaved = termMonths - actualMonths;

  // Interest saved compared to base schedule (no extra payments)
  const interestSaved = useMemo(() => {
    if (extraPayment === 0) return 0;
    const baseSchedule = amortizationSchedule(loanAmount, rate / 100, termMonths);
    const baseInterest = baseSchedule.reduce((s, r) => s + r.interest, 0);
    return baseInterest - totalInterest;
  }, [loanAmount, rate, termMonths, extraPayment, totalInterest]);

  const pieData = [
    { name: 'Principal', value: loanAmount },
    { name: 'Interest', value: totalInterest },
  ];

  // Group schedule into years
  const yearGroups: YearGroup[] = useMemo(() => {
    const groups: YearGroup[] = [];
    const totalYears = Math.ceil(schedule.length / 12);
    for (let y = 0; y < totalYears; y++) {
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
  }, [schedule, loanAmount]);

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

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Loan Amount', value: `$${formatNumber(loanAmount)}` },
      { label: 'Annual Interest Rate', value: `${rate}%` },
      { label: 'Loan Term', value: `${termYears} year${termYears !== 1 ? 's' : ''}` },
    ];
    if (extraPayment > 0) {
      inputs.push({ label: 'Extra Monthly Payment', value: `$${formatNumber(extraPayment)}` });
    }
    return inputs;
  }, [loanAmount, rate, termYears, extraPayment]);

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
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset calculator to defaults">
              <RotateCcw size={12} aria-hidden="true" /> Reset
            </button>
          </div>
          <div className="space-y-5">
            <SliderInput label="Loan Amount" id="la-amount" value={loanAmount}
              min={1000} max={2000000} step={5000} onChange={setLoanAmount}
              prefix="$" formatDisplay={(v) => formatNumber(v)} hint="Total amount you're borrowing" />
            <SliderInput label="Annual Interest Rate" id="la-rate" value={rate}
              min={0.1} max={20} step={0.1} onChange={setRate}
              suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Your loan's interest rate (check your loan terms)" />
            <SliderInput label="Loan Term (Years)" id="la-term" value={termYears}
              min={1} max={40} step={1} onChange={setTermYears} hint="How long you have to pay it back" />
          </div>

          <div className="mt-6 pt-5">
            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent mb-5" />
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-expanded={showAdvanced}>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              Advanced settings
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${showAdvanced ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <SliderInput label="Extra Monthly Payment" id="la-extra" value={extraPayment}
                min={0} max={5000} step={50} onChange={setExtraPayment}
                prefix="$" formatDisplay={(v) => formatNumber(v)} hint="Any extra amount above your minimum — saves interest" />
            </div>
          </div>
        </div>

        {/* ── Results ────────────────────────────────── */}
        <div ref={resultsRef} className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Monthly Payment</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {formatCurrency(useAnimatedNumber(monthlyPayment))}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {extraPayment > 0 ? (
                <>Paying {formatCurrency(extraPayment)} extra/mo saves {formatCurrency(interestSaved)} in interest and {monthsSaved} month{monthsSaved !== 1 ? 's' : ''}</>
              ) : (
                <>You&apos;ll pay {formatCurrency(totalInterest)} in total interest over {termYears} years</>
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Principal</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(loanAmount)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest</p>
                <p className="text-base sm:text-lg font-semibold text-negative-600 tabular-nums">{formatCurrency(totalInterest)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Cost</p>
                <p className="text-base sm:text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <ExportPdfButton toolName="Loan Amortization Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Pie + Area Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Principal vs Interest</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { RotateCcw } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';

type InputMode = 'annual' | 'hourly';

const FILING_STATUSES = ['single', 'married', 'head'] as const;
type FilingStatus = (typeof FILING_STATUSES)[number];
const FILING_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married: 'Married Filing Jointly',
  head: 'Head of Household',
};

/**
 * 2024 Federal Income Tax Brackets.
 * Each bracket: [threshold, marginal rate].
 */
const BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [
    [0, 0.10], [11600, 0.12], [47150, 0.22], [100525, 0.24],
    [191950, 0.32], [243725, 0.35], [609350, 0.37],
  ],
  married: [
    [0, 0.10], [23200, 0.12], [94300, 0.22], [201050, 0.24],
    [383900, 0.32], [487450, 0.35], [731200, 0.37],
  ],
  head: [
    [0, 0.10], [16550, 0.12], [63100, 0.22], [100500, 0.24],
    [191950, 0.32], [243700, 0.35], [609350, 0.37],
  ],
};

const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 14600, married: 29200, head: 21900,
};

const SS_RATE = 0.062;
const SS_CAP = 168600;
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_THRESHOLD: Record<FilingStatus, number> = {
  single: 200000, married: 250000, head: 200000,
};
const MEDICARE_ADDITIONAL_RATE = 0.009;

function calcFederalTax(grossIncome: number, filingStatus: FilingStatus): number {
  const taxableIncome = Math.max(0, grossIncome - STANDARD_DEDUCTION[filingStatus]);
  const brackets = BRACKETS[filingStatus];
  let tax = 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    const [threshold, rate] = brackets[i];
    if (taxableIncome > threshold) {
      tax += (taxableIncome - threshold) * rate;
      const prevThreshold = i > 0 ? brackets[i - 1][1] : 0;
      // Use remaining as base for next bracket — actually, let's calc properly
      break;
    }
  }
  // Recalculate correctly with proper marginal bracket math
  tax = 0;
  const taxable = Math.max(0, grossIncome - STANDARD_DEDUCTION[filingStatus]);
  for (let i = 0; i < brackets.length; i++) {
    const [threshold, rate] = brackets[i];
    const nextThreshold = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    if (taxable <= threshold) break;
    const taxableInBracket = Math.min(taxable, nextThreshold) - threshold;
    tax += taxableInBracket * rate;
  }
  return Math.max(0, tax);
}

function calcFICA(grossIncome: number, filingStatus: FilingStatus) {
  const ss = Math.min(grossIncome, SS_CAP) * SS_RATE;
  const medicareBase = grossIncome * MEDICARE_RATE;
  const additionalThreshold = MEDICARE_ADDITIONAL_THRESHOLD[filingStatus];
  const medicareAdditional = grossIncome > additionalThreshold
    ? (grossIncome - additionalThreshold) * MEDICARE_ADDITIONAL_RATE
    : 0;
  return { ss, medicare: medicareBase + medicareAdditional, total: ss + medicareBase + medicareAdditional };
}

const PIE_COLORS = ['#2563EB', '#F59E0B', '#10B981', '#7C3AED', '#EF4444'];

const DEFAULTS = {
  salary: 75000,
  hourlyRate: 36,
  hoursPerWeek: 40,
  weeksPerYear: 52,
  overtimeHours: 0,
  stateTaxRate: 5,
  filingStatus: 'single' as FilingStatus,
};

export default function SalaryCalc() {
  const [inputMode, setInputMode] = useState<InputMode>('annual');
  const [salary, setSalary] = useState(DEFAULTS.salary);
  const [hourlyRate, setHourlyRate] = useState(DEFAULTS.hourlyRate);
  const [hoursPerWeek, setHoursPerWeek] = useState(DEFAULTS.hoursPerWeek);
  const [weeksPerYear, setWeeksPerYear] = useState(DEFAULTS.weeksPerYear);
  const [overtimeHours, setOvertimeHours] = useState(DEFAULTS.overtimeHours);
  const [stateTaxRate, setStateTaxRate] = useState(DEFAULTS.stateTaxRate);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(DEFAULTS.filingStatus);

  const handleReset = useCallback(() => {
    setSalary(DEFAULTS.salary);
    setHourlyRate(DEFAULTS.hourlyRate);
    setHoursPerWeek(DEFAULTS.hoursPerWeek);
    setWeeksPerYear(DEFAULTS.weeksPerYear);
    setOvertimeHours(DEFAULTS.overtimeHours);
    setStateTaxRate(DEFAULTS.stateTaxRate);
    setFilingStatus(DEFAULTS.filingStatus);
  }, []);

  const result = useMemo(() => {
    let grossAnnual: number;
    let effectiveHourly: number;

    if (inputMode === 'annual') {
      grossAnnual = salary;
      const totalHoursPerYear = hoursPerWeek * weeksPerYear;
      effectiveHourly = totalHoursPerYear > 0 ? salary / totalHoursPerYear : 0;
      // Add overtime if applicable
      if (overtimeHours > 0) {
        const overtimePay = effectiveHourly * 1.5 * overtimeHours * weeksPerYear;
        grossAnnual += overtimePay;
      }
    } else {
      effectiveHourly = hourlyRate;
      const regularHours = Math.min(hoursPerWeek, 40);
      const otHours = Math.max(0, hoursPerWeek - 40) + overtimeHours;
      grossAnnual = (regularHours * hourlyRate + otHours * hourlyRate * 1.5) * weeksPerYear;
    }

    const federalTax = calcFederalTax(grossAnnual, filingStatus);
    const fica = calcFICA(grossAnnual, filingStatus);
    const stateTax = grossAnnual * (stateTaxRate / 100);
    const totalTax = federalTax + fica.total + stateTax;
    const netAnnual = grossAnnual - totalTax;
    const effectiveTaxRate = grossAnnual > 0 ? totalTax / grossAnnual : 0;

    return {
      grossAnnual,
      grossMonthly: grossAnnual / 12,
      grossBiweekly: grossAnnual / 26,
      grossWeekly: grossAnnual / 52,
      effectiveHourly,
      federalTax,
      fica,
      stateTax,
      totalTax,
      netAnnual,
      netMonthly: netAnnual / 12,
      netBiweekly: netAnnual / 26,
      netWeekly: netAnnual / 52,
      netHourly: weeksPerYear > 0 && hoursPerWeek > 0 ? netAnnual / (hoursPerWeek * weeksPerYear) : 0,
      effectiveTaxRate,
    };
  }, [inputMode, salary, hourlyRate, hoursPerWeek, weeksPerYear, overtimeHours, stateTaxRate, filingStatus]);

  const pieData = useMemo(() => [
    { name: 'Take-Home Pay', value: result.netAnnual },
    { name: 'Federal Tax', value: result.federalTax },
    { name: 'State Tax', value: result.stateTax },
    { name: 'Social Security', value: result.fica.ss },
    { name: 'Medicare', value: result.fica.medicare },
  ].filter((d) => d.value > 0), [result]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-neutral-200/80" role="tablist">
        {(['annual', 'hourly'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={inputMode === m}
            onClick={() => setInputMode(m)}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
              inputMode === m
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/40'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {m === 'annual' ? 'Annual Salary' : 'Hourly Rate'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Income Details</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="space-y-5">
            {inputMode === 'annual' ? (
              <SliderInput label="Annual Salary" id="sal-annual" value={salary} min={10000} max={500000} step={1000} onChange={setSalary} prefix="$" formatDisplay={formatNumber} hint="Your gross yearly pay before taxes" />
            ) : (
              <SliderInput label="Hourly Rate" id="sal-hourly" value={hourlyRate} min={7.25} max={200} step={0.25} onChange={setHourlyRate} prefix="$" formatDisplay={(v) => v.toFixed(2)} hint="Your pay per hour before taxes" />
            )}
            <SliderInput label="Hours per Week" id="sal-hours" value={hoursPerWeek} min={1} max={80} step={1} onChange={setHoursPerWeek} />
            <SliderInput label="Weeks per Year" id="sal-weeks" value={weeksPerYear} min={1} max={52} step={1} onChange={setWeeksPerYear} />
            <SliderInput label="Overtime Hours / Week" id="sal-ot" value={overtimeHours} min={0} max={40} step={1} onChange={setOvertimeHours} suffix="hrs" />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <div>
              <label htmlFor="sal-filing" className="block text-sm font-medium text-neutral-700 mb-1.5">Filing Status</label>
              <select
                id="sal-filing"
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                {FILING_STATUSES.map((s) => (
                  <option key={s} value={s}>{FILING_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <SliderInput label="State Tax Rate" id="sal-state" value={stateTaxRate} min={0} max={13} step={0.1} onChange={setStateTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Your state income tax rate — enter 0 for no-income-tax states (FL, TX, WA, etc.)" />
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Annual Take-Home Pay</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary-900 tabular-nums">
              {formatCurrency(result.netAnnual)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Effective tax rate: {(result.effectiveTaxRate * 100).toFixed(1)}% · {formatCurrency(result.totalTax)} total taxes
            </p>
          </div>

          {/* Breakdown table */}
          <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200/60">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Period</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Gross</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Take-Home</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Annual', gross: result.grossAnnual, net: result.netAnnual },
                  { label: 'Monthly', gross: result.grossMonthly, net: result.netMonthly },
                  { label: 'Bi-Weekly', gross: result.grossBiweekly, net: result.netBiweekly },
                  { label: 'Weekly', gross: result.grossWeekly, net: result.netWeekly },
                  { label: 'Hourly', gross: result.effectiveHourly, net: result.netHourly },
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                    <td className="py-2.5 px-4 font-medium text-neutral-700">{row.label}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{formatCurrency(row.gross)}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-accent-600 tabular-nums">{formatCurrency(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax breakdown cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Federal Income Tax</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.federalTax)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">State Tax</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.stateTax)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Social Security</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.fica.ss)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Medicare</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.fica.medicare)}</p>
            </div>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Income Breakdown</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={600}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip labelPrefix="" />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { RotateCcw, Banknote, Globe, Shield, DollarSign, PiggyBank } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { calcFederalTax, calcFICA } from '../../lib/us-tax-calc';
import { US_TAX_YEAR, US_401K, type FilingStatus } from '../../lib/us-rates';

type InputMode = 'annual' | 'hourly';

const FILING_STATUSES = ['single', 'married', 'head'] as const;
const FILING_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married: 'Married Filing Jointly',
  head: 'Head of Household',
};

const PIE_COLORS = ['#0B6E6E', '#F59E0B', '#22A06B', '#7C3AED', '#EF4444', '#EC4899'];

const DEFAULTS = {
  salary: 75000,
  hourlyRate: 36,
  hoursPerWeek: 40,
  weeksPerYear: 52,
  overtimeHours: 0,
  stateTaxRate: 5,
  filingStatus: 'single' as FilingStatus,
  retirement401k: 0,
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
  const [retirement401k, setRetirement401k] = useState(DEFAULTS.retirement401k);

  const handleReset = useCallback(() => {
    setSalary(DEFAULTS.salary);
    setHourlyRate(DEFAULTS.hourlyRate);
    setHoursPerWeek(DEFAULTS.hoursPerWeek);
    setWeeksPerYear(DEFAULTS.weeksPerYear);
    setOvertimeHours(DEFAULTS.overtimeHours);
    setStateTaxRate(DEFAULTS.stateTaxRate);
    setFilingStatus(DEFAULTS.filingStatus);
    setRetirement401k(DEFAULTS.retirement401k);
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

    // 401(k) contribution — reduces federal & state taxable income, but NOT FICA
    const retirement401kAmount = grossAnnual * (retirement401k / 100);
    // Cap at the IRS employee elective deferral limit (from the central rates module)
    const cappedRetirement = Math.min(retirement401kAmount, US_401K.limit);

    const federalTax = calcFederalTax(grossAnnual - cappedRetirement, filingStatus);
    const fica = calcFICA(grossAnnual, filingStatus); // FICA is on full gross
    const stateTax = (grossAnnual - cappedRetirement) * (stateTaxRate / 100);
    const totalTax = federalTax + fica.total + stateTax;
    const totalDeductions = totalTax + cappedRetirement;
    const netAnnual = grossAnnual - totalDeductions;
    const effectiveTaxRate = grossAnnual > 0 ? totalDeductions / grossAnnual : 0;

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
      retirement401kAmount: cappedRetirement,
      totalDeductions,
      netAnnual,
      netMonthly: netAnnual / 12,
      netBiweekly: netAnnual / 26,
      netWeekly: netAnnual / 52,
      netHourly: weeksPerYear > 0 && hoursPerWeek > 0 ? netAnnual / (hoursPerWeek * weeksPerYear) : 0,
      effectiveTaxRate,
    };
  }, [inputMode, salary, hourlyRate, hoursPerWeek, weeksPerYear, overtimeHours, stateTaxRate, filingStatus, retirement401k]);

  const animatedNetAnnual = useAnimatedNumber(result.netAnnual);
  const resultsRef = useRef<HTMLDivElement>(null);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Annual Salary', value: inputMode === 'annual' ? `$${formatNumber(salary)}` : `$${hourlyRate.toFixed(2)}/hr` },
      { label: 'Filing Status', value: FILING_LABELS[filingStatus] },
      { label: 'State Tax Rate', value: `${stateTaxRate.toFixed(1)}%` },
      { label: 'Hours / Week', value: `${hoursPerWeek}` },
      { label: 'Weeks / Year', value: `${weeksPerYear}` },
    ];
    if (overtimeHours > 0) {
      inputs.push({ label: 'Overtime Hours / Week', value: `${overtimeHours} hrs` });
    }
    if (retirement401k > 0) {
      inputs.push({ label: '401(k) Contribution', value: `${retirement401k.toFixed(1)}%` });
    }
    return inputs;
  }, [inputMode, salary, hourlyRate, filingStatus, stateTaxRate, hoursPerWeek, weeksPerYear, overtimeHours, retirement401k]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Annual Take-Home Pay', value: formatCurrency(result.netAnnual), highlight: true },
      { label: 'Federal Tax', value: formatCurrency(result.federalTax) },
      { label: 'State Tax', value: formatCurrency(result.stateTax) },
      { label: 'Social Security', value: formatCurrency(result.fica.ss) },
      { label: 'Medicare', value: formatCurrency(result.fica.medicare) },
    ];
    if (result.retirement401kAmount > 0) {
      items.push({ label: '401(k) Contribution', value: formatCurrency(result.retirement401kAmount) });
    }
    return items;
  }, [result]);

  const pieData = useMemo(() => [
    { name: 'Take-Home Pay', value: result.netAnnual },
    { name: 'Federal Tax', value: result.federalTax },
    { name: 'State Tax', value: result.stateTax },
    { name: 'Social Security', value: result.fica.ss },
    { name: 'Medicare', value: result.fica.medicare },
    ...(result.retirement401kAmount > 0 ? [{ name: '401(k)', value: result.retirement401kAmount }] : []),
  ].filter((d) => d.value > 0), [result]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-neutral-200/80" role="tablist" aria-label="Salary input mode">
        {(['annual', 'hourly'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={inputMode === m}
            aria-controls="sal-results"
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
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="space-y-5">
            {inputMode === 'annual' ? (
              <SliderInput label="Annual Salary" id="sal-annual" value={salary} min={10000} max={500000} step={1000} textMax={1000000} minLabel="$10K" maxLabel="$500K" onChange={setSalary} prefix="$" formatDisplay={formatNumber} hint="Your gross yearly pay before taxes" />
            ) : (
              <SliderInput label="Hourly Rate" id="sal-hourly" value={hourlyRate} min={7.25} max={200} step={0.25} minLabel="$7.25" maxLabel="$200" onChange={setHourlyRate} prefix="$" formatDisplay={(v) => v.toFixed(2)} hint="Your pay per hour before taxes" />
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

            <SliderInput label="401(k) Contribution" id="sal-401k" value={retirement401k} min={0} max={30} step={0.5} onChange={setRetirement401k} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Pre-tax 401(k) contribution — reduces federal & state taxes, not FICA" />
          </div>
        </div>

        {/* Results */}
        <div id="sal-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite" ref={resultsRef}>
          <div data-pdf-section className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">Tax year {US_TAX_YEAR}</span>
            </div>
            <p className="text-sm text-neutral-500 mb-1">Annual Take-Home Pay</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {formatCurrency(animatedNetAnnual)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Effective deduction rate: {(result.effectiveTaxRate * 100).toFixed(1)}% · {formatCurrency(result.totalDeductions)} total deductions
            </p>
          </div>

          {/* Breakdown table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
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
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Banknote size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Federal Income Tax</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.federalTax)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Globe size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">State Tax</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.stateTax)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><Shield size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Social Security</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.fica.ss)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><DollarSign size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Medicare</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.fica.medicare)}</p>
              </div>
            </div>
            {result.retirement401kAmount > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5"><PiggyBank size={16} aria-hidden="true" /></div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">401(k)</p>
                  <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.retirement401kAmount)}</p>
                  <p className="text-xs text-accent-600 mt-0.5">Pre-tax</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="salary" toolName="US Salary Calculator" />
            <EmailResultsButton toolSlug="salary" toolName="US Salary Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="US Salary Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Pie chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Income Breakdown</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

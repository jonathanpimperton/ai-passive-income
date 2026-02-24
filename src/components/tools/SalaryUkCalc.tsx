import { useState, useMemo, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RotateCcw } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import { formatNumber } from '../../lib/calculator-utils';

/* ── UK Tax Constants (2025/26 Tax Year) ───────────────────── */

const PERSONAL_ALLOWANCE = 12570;
const PA_TAPER_THRESHOLD = 100000;
const PA_TAPER_LIMIT = 125140; // PA fully withdrawn

/** Rest-of-UK Income Tax bands (2025/26) */
const UK_BANDS: [number, number][] = [
  [0, 0.20],       // Basic rate
  [37700, 0.40],   // Higher rate (applied to taxable income above PA)
  [112570, 0.45],  // Additional rate
];

/** Scottish Income Tax bands (2025/26) */
const SCOTTISH_BANDS: [number, number][] = [
  [0, 0.19],       // Starter
  [2306, 0.20],    // Basic
  [13991, 0.21],   // Intermediate
  [31092, 0.42],   // Higher
  [62430, 0.45],   // Advanced
  [112570, 0.48],  // Top
];

/** Employee NI thresholds and rates (2025/26) */
const NI_PRIMARY_THRESHOLD = 12570; // per year
const NI_UPPER_EARNINGS_LIMIT = 50270;
const NI_MAIN_RATE = 0.08;
const NI_UPPER_RATE = 0.02;

/** Student loan plans */
type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad';

const STUDENT_LOAN_THRESHOLDS: Record<Exclude<StudentLoanPlan, 'none'>, { threshold: number; rate: number }> = {
  plan1: { threshold: 24990, rate: 0.09 },
  plan2: { threshold: 27295, rate: 0.09 },
  plan4: { threshold: 31395, rate: 0.09 },
  plan5: { threshold: 25000, rate: 0.09 },
  postgrad: { threshold: 21000, rate: 0.06 },
};

const STUDENT_LOAN_LABELS: Record<StudentLoanPlan, string> = {
  none: 'No Student Loan',
  plan1: 'Plan 1 (pre-2012 England/Wales)',
  plan2: 'Plan 2 (post-2012 England/Wales)',
  plan4: 'Plan 4 (Scotland)',
  plan5: 'Plan 5 (from 2023)',
  postgrad: 'Postgraduate Loan',
};

const PIE_COLORS = ['#2563EB', '#F59E0B', '#10B981', '#7C3AED', '#EF4444', '#EC4899'];

function formatGBP(value: number): string {
  return '£' + formatNumber(Math.round(value));
}

function calcPersonalAllowance(grossIncome: number): number {
  if (grossIncome <= PA_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  if (grossIncome >= PA_TAPER_LIMIT) return 0;
  const reduction = Math.floor((grossIncome - PA_TAPER_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

function calcIncomeTax(grossIncome: number, isScottish: boolean): number {
  const pa = calcPersonalAllowance(grossIncome);
  const taxable = Math.max(0, grossIncome - pa);
  const bands = isScottish ? SCOTTISH_BANDS : UK_BANDS;

  let tax = 0;
  for (let i = 0; i < bands.length; i++) {
    const [threshold, rate] = bands[i];
    const nextThreshold = i + 1 < bands.length ? bands[i + 1][0] : Infinity;
    if (taxable <= threshold) break;
    const taxableInBand = Math.min(taxable, nextThreshold) - threshold;
    tax += taxableInBand * rate;
  }
  return tax;
}

function calcNI(grossIncome: number): number {
  if (grossIncome <= NI_PRIMARY_THRESHOLD) return 0;
  const mainBand = Math.min(grossIncome, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD;
  const upperBand = Math.max(0, grossIncome - NI_UPPER_EARNINGS_LIMIT);
  return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
}

function calcStudentLoan(grossIncome: number, plan: StudentLoanPlan): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = STUDENT_LOAN_THRESHOLDS[plan];
  return grossIncome > threshold ? (grossIncome - threshold) * rate : 0;
}

const DEFAULTS = {
  salary: 35000,
  isScottish: false,
  studentLoan: 'none' as StudentLoanPlan,
  pensionPercent: 5,
  pensionIsSacrifice: false,
};

export default function SalaryUkCalc() {
  const [salary, setSalary] = useState(DEFAULTS.salary);
  const [isScottish, setIsScottish] = useState(DEFAULTS.isScottish);
  const [studentLoan, setStudentLoan] = useState<StudentLoanPlan>(DEFAULTS.studentLoan);
  const [pensionPercent, setPensionPercent] = useState(DEFAULTS.pensionPercent);
  const [pensionIsSacrifice, setPensionIsSacrifice] = useState(DEFAULTS.pensionIsSacrifice);

  const handleReset = useCallback(() => {
    setSalary(DEFAULTS.salary);
    setIsScottish(DEFAULTS.isScottish);
    setStudentLoan(DEFAULTS.studentLoan);
    setPensionPercent(DEFAULTS.pensionPercent);
    setPensionIsSacrifice(DEFAULTS.pensionIsSacrifice);
  }, []);

  const result = useMemo(() => {
    const pensionAmount = salary * (pensionPercent / 100);

    // Salary sacrifice reduces gross income for tax AND NI
    // Standard pension deduction reduces taxable income (tax relief) but NI is on full salary
    const taxableIncome = pensionIsSacrifice
      ? salary - pensionAmount
      : salary - pensionAmount; // Both reduce taxable income for Income Tax

    const niIncome = pensionIsSacrifice
      ? salary - pensionAmount // Salary sacrifice saves NI
      : salary;               // Standard pension: NI on full salary

    const incomeTax = calcIncomeTax(taxableIncome, isScottish);
    const ni = calcNI(niIncome);
    const studentLoanRepayment = calcStudentLoan(salary, studentLoan);
    const personalAllowance = calcPersonalAllowance(taxableIncome);

    const totalDeductions = incomeTax + ni + studentLoanRepayment + pensionAmount;
    const netAnnual = salary - totalDeductions;

    // NI saving from salary sacrifice
    const niSaving = pensionIsSacrifice
      ? calcNI(salary) - calcNI(salary - pensionAmount)
      : 0;

    const effectiveTaxRate = salary > 0 ? totalDeductions / salary : 0;

    // Marginal rate at current income
    let marginalRate = 0.20;
    if (taxableIncome > personalAllowance + (isScottish ? 62430 : 112570)) {
      marginalRate = isScottish ? 0.48 : 0.45;
    } else if (taxableIncome > personalAllowance + (isScottish ? 31092 : 37700)) {
      marginalRate = isScottish ? 0.42 : 0.40;
    }
    // 60% trap detection
    const isIn60Trap = salary > PA_TAPER_THRESHOLD && salary < PA_TAPER_LIMIT;

    return {
      grossAnnual: salary,
      personalAllowance,
      incomeTax,
      ni,
      studentLoanRepayment,
      pensionAmount,
      niSaving,
      totalDeductions,
      netAnnual,
      netMonthly: netAnnual / 12,
      netWeekly: netAnnual / 52,
      netDaily: netAnnual / 260,
      effectiveTaxRate,
      marginalRate,
      isIn60Trap,
    };
  }, [salary, isScottish, studentLoan, pensionPercent, pensionIsSacrifice]);

  const pieData = useMemo(() => [
    { name: 'Take-Home Pay', value: result.netAnnual },
    { name: 'Income Tax', value: result.incomeTax },
    { name: 'National Insurance', value: result.ni },
    ...(result.studentLoanRepayment > 0 ? [{ name: 'Student Loan', value: result.studentLoanRepayment }] : []),
    ...(result.pensionAmount > 0 ? [{ name: 'Pension', value: result.pensionAmount }] : []),
  ].filter((d) => d.value > 0), [result]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Salary Details</h2>
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
            <SliderInput
              label="Annual Salary"
              id="uk-salary"
              value={salary}
              min={10000}
              max={200000}
              step={500}
              onChange={setSalary}
              prefix="£"
              formatDisplay={formatNumber}
              hint="Your gross yearly salary before deductions"
            />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            {/* Scottish tax toggle */}
            <div className="flex items-center justify-between">
              <label htmlFor="uk-scottish" className="text-sm font-medium text-neutral-700">
                Scottish Tax Rates
              </label>
              <button
                id="uk-scottish"
                role="switch"
                aria-checked={isScottish}
                onClick={() => setIsScottish(!isScottish)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  isScottish ? 'bg-primary-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    isScottish ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="uk-student-loan" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Student Loan Plan
              </label>
              <select
                id="uk-student-loan"
                value={studentLoan}
                onChange={(e) => setStudentLoan(e.target.value as StudentLoanPlan)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                {(Object.keys(STUDENT_LOAN_LABELS) as StudentLoanPlan[]).map((plan) => (
                  <option key={plan} value={plan}>{STUDENT_LOAN_LABELS[plan]}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <SliderInput
              label="Pension Contribution"
              id="uk-pension"
              value={pensionPercent}
              min={0}
              max={40}
              step={0.5}
              onChange={setPensionPercent}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
              hint="Employee contribution (auto-enrolment default: 5%)"
            />

            {/* Salary sacrifice toggle */}
            <div className="flex items-center justify-between">
              <label htmlFor="uk-sacrifice" className="text-sm font-medium text-neutral-700">
                Salary Sacrifice
              </label>
              <button
                id="uk-sacrifice"
                role="switch"
                aria-checked={pensionIsSacrifice}
                onClick={() => setPensionIsSacrifice(!pensionIsSacrifice)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  pensionIsSacrifice ? 'bg-primary-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    pensionIsSacrifice ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {pensionIsSacrifice && result.niSaving > 0 && (
              <p className="text-xs text-accent-600 leading-relaxed">
                Salary sacrifice saves you {formatGBP(result.niSaving)}/year in NI compared to a standard pension deduction.
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50" aria-live="polite">
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Annual Take-Home Pay</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary-900 tabular-nums">
              {formatGBP(result.netAnnual)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Effective deduction rate: {(result.effectiveTaxRate * 100).toFixed(1)}% · {formatGBP(result.totalDeductions)} total deductions
            </p>
          </div>

          {/* 60% tax trap warning */}
          {result.isIn60Trap && (
            <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 leading-relaxed">
              <strong>60% tax trap:</strong> Between £100,000 and £125,140, your Personal Allowance is reduced by £1 for every £2 earned, creating an effective ~60% marginal rate. Consider salary sacrifice to bring taxable income below £100,000.
            </div>
          )}

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
                  { label: 'Annual', gross: salary, net: result.netAnnual },
                  { label: 'Monthly', gross: salary / 12, net: result.netMonthly },
                  { label: 'Weekly', gross: salary / 52, net: result.netWeekly },
                  { label: 'Daily', gross: salary / 260, net: result.netDaily },
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                    <td className="py-2.5 px-4 font-medium text-neutral-700">{row.label}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{formatGBP(row.gross)}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-accent-600 tabular-nums">{formatGBP(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax breakdown cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Income Tax</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.incomeTax)}</p>
              <p className="text-xs text-neutral-400 mt-0.5">PA: {formatGBP(result.personalAllowance)}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">National Insurance</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.ni)}</p>
            </div>
            {result.studentLoanRepayment > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
                <p className="text-xs text-neutral-500 mb-0.5">Student Loan</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.studentLoanRepayment)}</p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <p className="text-xs text-neutral-500 mb-0.5">Pension</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.pensionAmount)}</p>
              {pensionIsSacrifice && <p className="text-xs text-accent-600 mt-0.5">Salary sacrifice</p>}
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
                  <Tooltip content={<ChartTooltip labelPrefix="" />} />
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

import { useState, useMemo, useCallback, useRef, useEffect, useId, lazy } from 'react';
import { RotateCcw, Banknote, Shield, CreditCard, PiggyBank, ChevronDown } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ChartDataTable from '../ui/ChartDataTable';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import LazyChartFrame from './charts/LazyChartFrame';
import type { SalarySlice } from './charts/SalaryUkChart';
import type { ResultItem } from '../../lib/email-types';
import { formatNumber } from '../../lib/calculator-utils';
import {
  calculateUkTakeHome,
  UK_CHILDCARE_ANI_LIMIT,
  UK_PENSION_ANNUAL_ALLOWANCE,
  type StudentLoanPlan,
  type PensionMethod,
  type PensionInputMode,
} from '../../lib/uk-tax-calc';
import type { ParsedTaxCode } from '../../lib/uk-tax-codes';
import { UK_TAX_YEAR, UK_INCOME_TAX } from '../../lib/uk-rates';

const SalaryUkChart = lazy(() => import('./charts/SalaryUkChart'));

/* -- Inputs ------------------------------------------------ */

/** Every input the calculator holds. Hub pages seed it through the `defaults` prop. */
export interface SalaryUkInputs {
  salary: number;
  isScottish: boolean;
  studentLoan: StudentLoanPlan;
  pensionMode: PensionInputMode;
  /** Percent of full gross salary. */
  pensionPercent: number;
  /** Annual amount into the pension, gross. */
  pensionAmount: number;
  pensionMethod: PensionMethod;
  taxCode: string;
}

const DEFAULTS: SalaryUkInputs = {
  salary: 35_000,
  isScottish: false,
  studentLoan: 'none',
  pensionMode: 'percent',
  pensionPercent: 5,
  pensionAmount: 1_750,
  pensionMethod: 'netPay',
  taxCode: '',
};

const STUDENT_LOAN_LABELS: Record<StudentLoanPlan, string> = {
  none: 'No Student Loan',
  plan1: 'Plan 1 (pre-2012 England/Wales, Northern Ireland)',
  plan2: 'Plan 2 (post-2012 England/Wales)',
  plan4: 'Plan 4 (Scotland)',
  plan5: 'Plan 5 (England, from 2023)',
  postgrad: 'Postgraduate Loan',
};

const PENSION_METHODS: { key: PensionMethod; label: string; hint: string }[] = [
  { key: 'netPay', label: 'Net pay', hint: 'Taken from pay before tax. NI is still charged on it.' },
  { key: 'reliefAtSource', label: 'Relief at source', hint: 'Paid from take-home pay; your provider adds 20% tax relief.' },
  { key: 'sacrifice', label: 'Salary sacrifice', hint: 'Your salary is cut instead. Saves tax, NI and student loan.' },
];

const PENSION_METHOD_LABEL: Record<PensionMethod, string> = {
  netPay: 'Net pay arrangement',
  reliefAtSource: 'Relief at source',
  sacrifice: 'Salary sacrifice',
};

function formatGBP(value: number): string {
  const rounded = Math.round(value);
  return (rounded < 0 ? '-£' : '£') + formatNumber(Math.abs(rounded));
}

function formatPercent(v: number): string {
  // Show what is used: up to 2 decimals, no trailing zeros (CALC-UX-A-12).
  return String(Number(v.toFixed(2)));
}

function pct(rate: number): string {
  return `${Number((rate * 100).toFixed(1))}%`;
}

/** Drop undefined entries so `{...DEFAULTS, ...defaults}` never writes undefined. */
function cleanDefaults(d: Partial<SalaryUkInputs> | undefined): Partial<SalaryUkInputs> {
  if (!d) return {};
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) as Partial<SalaryUkInputs>;
}

/** Live-region text, updated at most every ~500 ms (A11Y-PERF-03). */
function useDebouncedText(text: string, ms = 500): string {
  const [value, setValue] = useState(text);
  useEffect(() => {
    const t = setTimeout(() => setValue(text), ms);
    return () => clearTimeout(t);
  }, [text, ms]);
  return value;
}

/** One-line meaning of a parsed code, for the hint under the field. */
function describeCode(code: ParsedTaxCode): string {
  const region = code.prefix === 'S' ? 'Scottish rates. ' : code.prefix === 'C' ? 'Welsh rates (same bands as England). ' : '';
  const emergency = code.emergency ? ` Emergency code (${code.emergency}): full-year figures shown.` : '';
  switch (code.kind) {
    case 'blank':
      return `Leave blank for the standard 1257L (${formatGBP(UK_INCOME_TAX.personalAllowance)} allowance)`;
    case 'invalid':
      return 'Code not recognised; using 1257L';
    case 'allowance': {
      if (code.allowance === 0) return `${region}0T: no tax-free allowance.${emergency}`;
      const suffix =
        code.suffix === 'M' ? ' (Marriage Allowance received)' : code.suffix === 'N' ? ' (Marriage Allowance transferred)' : '';
      const unusual = code.unusual ? ' That is unusually high; check your payslip.' : '';
      return `${region}Allowance ${formatGBP(code.allowance)}${suffix}.${unusual}${emergency}`;
    }
    case 'k':
      return `${region}K code: adds ${formatGBP(code.addition)} to taxable pay. Tax is capped at half your pay.${emergency}`;
    case 'flat':
      return `${pct(code.rate)} (${code.bandLabel}) on all pay from this job.${emergency}`;
    case 'nt':
      return 'NT: no tax on this pay.';
  }
}

/* -- Component --------------------------------------------- */

export default function SalaryUkCalc({ defaults }: { defaults?: Partial<SalaryUkInputs> } = {}) {
  // Starting values: the site defaults, overridden by the embedding page (hubs).
  const initial = useMemo<SalaryUkInputs>(() => ({ ...DEFAULTS, ...cleanDefaults(defaults) }), [defaults]);
  const uid = useId();

  const [salary, setSalary] = useState(initial.salary);
  const [isScottish, setIsScottish] = useState(initial.isScottish);
  const [studentLoan, setStudentLoan] = useState<StudentLoanPlan>(initial.studentLoan);
  const [pensionMode, setPensionMode] = useState<PensionInputMode>(initial.pensionMode);
  const [pensionPercent, setPensionPercent] = useState(initial.pensionPercent);
  const [pensionAmount, setPensionAmount] = useState(initial.pensionAmount);
  const [pensionMethod, setPensionMethod] = useState<PensionMethod>(initial.pensionMethod);
  const [taxCode, setTaxCode] = useState(initial.taxCode);
  const [taxCodeFocused, setTaxCodeFocused] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const handleReset = useCallback(() => {
    setSalary(initial.salary);
    setIsScottish(initial.isScottish);
    setStudentLoan(initial.studentLoan);
    setPensionMode(initial.pensionMode);
    setPensionPercent(initial.pensionPercent);
    setPensionAmount(initial.pensionAmount);
    setPensionMethod(initial.pensionMethod);
    setTaxCode(initial.taxCode);
  }, [initial]);

  const result = useMemo(
    () =>
      calculateUkTakeHome({
        salary,
        scottish: isScottish,
        taxCode,
        studentLoan,
        pensionMode,
        pensionPercent,
        pensionAmount,
        pensionMethod,
      }),
    [salary, isScottish, taxCode, studentLoan, pensionMode, pensionPercent, pensionAmount, pensionMethod],
  );
  const code = result.code;

  /** Switching % <-> £ keeps the same contribution. */
  const changePensionMode = (mode: PensionInputMode) => {
    if (mode === pensionMode) return;
    if (mode === 'amount') {
      setPensionAmount(Math.round(result.pension.gross));
    } else if (salary > 0) {
      setPensionPercent(Math.min(100, Math.round((result.pension.gross / salary) * 1000) / 10));
    }
    setPensionMode(mode);
  };

  const animatedNetAnnual = useAnimatedNumber(result.netAnnual);
  const resultsRef = useRef<HTMLDivElement>(null);
  const liveText = useDebouncedText(
    `Annual take-home pay ${formatGBP(result.netAnnual)}, ${formatGBP(result.netMonthly)} a month.`,
  );

  const regionLabel = result.region === 'scotland' ? 'Scotland' : code.prefix === 'C' ? 'Wales' : 'England, Wales and NI';
  const codeHint = code.kind === 'invalid' && taxCodeFocused ? 'For example 1257L, S1257L, K475 or BR' : describeCode(code);
  const codeError = code.kind === 'invalid' && !taxCodeFocused;

  const getInputs = useCallback(() => {
    const inputs = [{ label: 'Annual Salary', value: `£${formatNumber(salary)}` }];
    if (taxCode.trim()) {
      inputs.push({
        label: 'Tax Code',
        value: code.kind === 'invalid' ? `${taxCode.trim().toUpperCase()} (not recognised, 1257L used)` : taxCode.trim().toUpperCase(),
      });
    }
    if (result.region === 'scotland') {
      inputs.push({ label: 'Tax Region', value: 'Scotland' });
    }
    if (studentLoan !== 'none') {
      inputs.push({ label: 'Student Loan', value: STUDENT_LOAN_LABELS[studentLoan] });
    }
    inputs.push({
      label: 'Pension Contribution',
      value: pensionMode === 'percent' ? `${formatPercent(pensionPercent)}%` : `£${formatNumber(Math.round(pensionAmount))} a year`,
    });
    if (result.pension.gross > 0) {
      inputs.push({ label: 'Pension Type', value: PENSION_METHOD_LABEL[pensionMethod] });
    }
    return inputs;
  }, [salary, taxCode, code.kind, result.region, result.pension.gross, studentLoan, pensionMode, pensionPercent, pensionAmount, pensionMethod]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Annual Take-Home Pay', value: formatGBP(result.netAnnual), highlight: true },
      { label: 'Income Tax', value: formatGBP(result.incomeTax) },
      { label: 'National Insurance', value: formatGBP(result.ni) },
    ];
    if (result.studentLoan > 0) {
      items.push({ label: 'Student Loan', value: formatGBP(result.studentLoan) });
    }
    if (result.pension.gross > 0) {
      items.push({ label: 'Pension', value: formatGBP(result.pension.fromPay) });
      if (result.pension.providerRelief > 0) {
        items.push({ label: 'Into Your Pension', value: formatGBP(result.pension.gross) });
      }
    }
    if (result.gross > UK_INCOME_TAX.paTaperThreshold) {
      items.push({ label: 'Adjusted Net Income', value: formatGBP(result.adjustedNetIncome) });
    }
    return items;
  }, [result]);

  const slices = useMemo<SalarySlice[]>(() => {
    const all: SalarySlice[] = [
      { name: 'Take-Home Pay', value: result.netAnnual },
      { name: 'Income Tax', value: result.incomeTax },
      { name: 'National Insurance', value: result.ni },
      { name: 'Student Loan', value: result.studentLoan },
      { name: 'Pension', value: result.pension.fromPay },
    ];
    return all.filter((d) => d.value > 0);
  }, [result]);

  const pctKept = salary > 0 ? Math.max(0, Math.round((result.netAnnual / salary) * 100)) : 0;
  const sliceTotal = slices.reduce((s, d) => s + d.value, 0);

  const showChildcareGood = result.gross > UK_CHILDCARE_ANI_LIMIT && !result.overChildcareLimit;
  const noteClass = 'text-xs leading-relaxed';
  const calloutClass = 'mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 leading-relaxed';

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Salary Details</h2>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
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
              max={250000}
              step={500}
              textMin={0}
              textMax={10_000_000}
              minLabel="£10K"
              maxLabel="£250K"
              onChange={setSalary}
              prefix="£"
              formatDisplay={formatNumber}
              hint="Your gross yearly salary before deductions"
            />

            {/* Tax code (optional) */}
            <div>
              <label htmlFor="uk-tax-code" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Tax Code <span className="text-neutral-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="uk-tax-code"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                onFocus={() => setTaxCodeFocused(true)}
                onBlur={() => setTaxCodeFocused(false)}
                placeholder="e.g. 1257L"
                maxLength={16}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="uk-tax-code-hint"
                aria-invalid={codeError || undefined}
                className={`w-full h-11 rounded-lg border bg-white text-neutral-900 text-base px-3 uppercase
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150 ${
                    codeError ? 'border-red-600' : 'border-neutral-200'
                  }`}
              />
              <p id="uk-tax-code-hint" className={`text-xs mt-1 leading-relaxed ${codeError ? 'text-red-700' : 'text-neutral-500'}`}>
                {codeHint}
              </p>
            </div>

            <div className="h-px bg-neutral-200/80" />

            {/* Scottish tax toggle (an S or C code decides instead) */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="uk-scottish" className="text-sm font-medium text-neutral-700">
                  Scottish Tax Rates
                </label>
                <button
                  type="button"
                  id="uk-scottish"
                  role="switch"
                  aria-checked={result.region === 'scotland'}
                  aria-describedby={result.regionSource === 'code' ? 'uk-scottish-note' : undefined}
                  disabled={result.regionSource === 'code'}
                  onClick={() => setIsScottish(!isScottish)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-colors duration-200 disabled:opacity-60 ${
                    result.region === 'scotland' ? 'bg-primary-600' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      result.region === 'scotland' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {result.regionSource === 'code' && (
                <p id="uk-scottish-note" className="text-xs text-neutral-500 mt-1">
                  Set by the {code.prefix} prefix on your tax code.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="uk-student-loan" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Student Loan Plan
              </label>
              <select
                id="uk-student-loan"
                value={studentLoan}
                onChange={(e) => setStudentLoan(e.target.value as StudentLoanPlan)}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
              >
                {(Object.keys(STUDENT_LOAN_LABELS) as StudentLoanPlan[]).map((plan) => (
                  <option key={plan} value={plan}>{STUDENT_LOAN_LABELS[plan]}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-neutral-200/80" />

            {/* Pension: % or £, then method */}
            <div>
              <div className="flex items-center justify-between mb-2 gap-3">
                <p className="text-sm font-medium text-neutral-700">Pension Contribution</p>
                <div className="inline-flex rounded-lg bg-neutral-100 p-1" role="radiogroup" aria-label="Enter pension as">
                  {(['percent', 'amount'] as const).map((mode) => (
                    <label
                      key={mode}
                      className={`cursor-pointer px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 ${
                        pensionMode === mode ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-pension-mode`}
                        value={mode}
                        checked={pensionMode === mode}
                        onChange={() => changePensionMode(mode)}
                        className="sr-only"
                      />
                      {mode === 'percent' ? '% of salary' : '£ a year'}
                    </label>
                  ))}
                </div>
              </div>

              {pensionMode === 'percent' ? (
                <SliderInput
                  label="Contribution (% of salary)"
                  id="uk-pension"
                  value={pensionPercent}
                  min={0}
                  max={40}
                  step={0.5}
                  textMax={100}
                  onChange={setPensionPercent}
                  suffix="%"
                  formatDisplay={formatPercent}
                  hint="Percentage of your full salary"
                />
              ) : (
                <SliderInput
                  label="Contribution (£ a year)"
                  id="uk-pension-amount"
                  value={pensionAmount}
                  min={0}
                  max={60_000}
                  step={100}
                  textMax={10_000_000}
                  minLabel="£0"
                  maxLabel="£60K"
                  onChange={setPensionAmount}
                  prefix="£"
                  formatDisplay={formatNumber}
                  hint="Total going into your pension each year (before any relief at source)"
                />
              )}

              <div className="mt-4">
                <p id={`${uid}-method-label`} className="text-sm font-medium text-neutral-700 mb-2">How it is paid</p>
                <div className="space-y-2" role="radiogroup" aria-labelledby={`${uid}-method-label`}>
                  {PENSION_METHODS.map((m) => (
                    <label
                      key={m.key}
                      className={`block cursor-pointer px-4 py-2.5 rounded-lg border transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 ${
                        pensionMethod === m.key
                          ? 'bg-primary-50 border-primary-300'
                          : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-pension-method`}
                        value={m.key}
                        checked={pensionMethod === m.key}
                        onChange={() => setPensionMethod(m.key)}
                        className="sr-only"
                      />
                      <span className={`block text-sm font-medium ${pensionMethod === m.key ? 'text-primary-700' : 'text-neutral-900'}`}>
                        {m.label}
                      </span>
                      <span className="block text-xs text-neutral-500 mt-0.5">{m.hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              {result.sacrificeSaving && (result.sacrificeSaving.ni > 0 || result.sacrificeSaving.studentLoan > 0) && (
                <p className={`${noteClass} text-success-600 mt-3`}>
                  Salary sacrifice saves you {formatGBP(result.sacrificeSaving.ni)}/year in NI
                  {result.sacrificeSaving.studentLoan > 0 && <> and {formatGBP(result.sacrificeSaving.studentLoan)}/year in student loan repayments</>}
                  {' '}compared with a net pay pension of the same size.
                </p>
              )}
              {result.pension.providerRelief > 0 && (
                <p className={`${noteClass} text-neutral-600 mt-3`}>
                  You pay {formatGBP(result.pension.fromPay)}; your provider claims {formatGBP(result.pension.providerRelief)} basic-rate relief,
                  so {formatGBP(result.pension.gross)} goes into your pension.
                </p>
              )}
              {result.pension.capped && (
                <p className={`${noteClass} text-amber-800 mt-3`}>
                  Contributions are limited to your salary ({formatGBP(result.gross)}) in this calculation.
                </p>
              )}
              {result.overAnnualAllowance && (
                <p className={`${noteClass} text-amber-800 mt-3`}>
                  That is above the {formatGBP(UK_PENSION_ANNUAL_ALLOWANCE)} annual allowance. An annual allowance charge may apply;
                  it is not included here.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <p className="sr-only" role="status" aria-live="polite">{liveText}</p>
          <div data-pdf-section className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">Tax year {UK_TAX_YEAR}</span>
              <span className="text-xs text-neutral-500">{regionLabel} rates</span>
            </div>
            <p className="text-sm text-neutral-500 mb-1">Annual Take-Home Pay</p>
            <p data-headline-result data-headline-label="Annual Take-Home Pay" className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {formatGBP(animatedNetAnnual)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Effective deduction rate: <span className="tabular-nums">{(result.effectiveDeductionRate * 100).toFixed(1)}%</span> &middot;{' '}
              <span className="tabular-nums">{formatGBP(result.totalDeductions)}</span> total deductions
            </p>
          </div>

          {result.netAnnual < 0 && (
            <div data-pdf-section className={calloutClass}>
              Your pension contributions are larger than your pay after tax, so take-home pay is negative.
            </div>
          )}

          {code.kind === 'invalid' && (
            <div data-pdf-section className={calloutClass}>
              Tax code &ldquo;{code.input}&rdquo; not recognised, so these figures use the standard 1257L code.
            </div>
          )}

          {result.kCapApplied && (
            <div data-pdf-section className={calloutClass}>
              K code limit: tax from this job is capped at half your pay ({formatGBP(result.incomeTax)}). HMRC collects the rest another way.
            </div>
          )}

          {/* 60% trap: keyed on adjusted net income (MATH-UK-06) */}
          {result.inTaperZone && (
            <div data-pdf-section className={calloutClass}>
              <strong>60% tax trap:</strong> your adjusted net income of <span className="tabular-nums">{formatGBP(result.adjustedNetIncome)}</span> is
              between £100,000 and £125,140, so you lose £1 of Personal Allowance for every £2 above £100,000. The next £100 of pay is
              taxed at about <span className="tabular-nums">{pct(result.marginal.incomeTax)}</span> (
              <span className="tabular-nums">{pct(result.marginal.withNiAndLoan)}</span> with NI{result.studentLoan > 0 ? ' and student loan' : ''}).
              Another <span className="tabular-nums">{formatGBP(result.pensionToReach100k)}</span> a year into your pension would bring it down to £100,000.
            </div>
          )}

          {/* Childcare cliff (CALC-UX-A-05) */}
          {result.overChildcareLimit && (
            <div data-pdf-section className={calloutClass}>
              <strong>Childcare limit:</strong> with adjusted net income over £100,000 you cannot get Tax-Free Childcare or the free
              childcare hours for working parents. Another <span className="tabular-nums">{formatGBP(result.pensionToReach100k)}</span> a year
              into your pension would bring you to the limit.{' '}
              <a
                href="https://www.gov.uk/tax-free-childcare/check-if-youre-eligible"
                target="_blank"
                rel="noopener"
                className="underline underline-offset-2 hover:text-neutral-900"
              >
                GOV.UK eligibility
              </a>
            </div>
          )}
          {showChildcareGood && (
            <div data-pdf-section className="mb-4 p-3 rounded-lg border border-success-100 bg-success-50 text-sm text-success-700 leading-relaxed">
              Your pension brings adjusted net income to <span className="tabular-nums">{formatGBP(result.adjustedNetIncome)}</span>, within the
              £100,000 limit for Tax-Free Childcare and working-parent free childcare hours.
            </div>
          )}

          {/* Breakdown table */}
          <div data-pdf-section className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Gross and take-home pay by period</caption>
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/60">
                    <th scope="col" className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Period</th>
                    <th scope="col" className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Gross</th>
                    <th scope="col" className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Take-Home</th>
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
                      <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-700">{row.label}</th>
                      <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{formatGBP(row.gross)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-success-600 tabular-nums">{formatGBP(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax breakdown cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-lg border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <Banknote size={16} className="text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Income Tax</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.incomeTax)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {code.kind === 'flat' ? 'Flat rate code' : code.kind === 'k' ? 'K code' : code.kind === 'nt' ? 'No tax code' : (
                    <>Allowance <span className="tabular-nums">{formatGBP(result.personalAllowance)}</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <Shield size={16} className="text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">National Insurance</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.ni)}</p>
              </div>
            </div>
            {result.studentLoan > 0 && (
              <div className="bg-white rounded-lg border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <CreditCard size={16} className="text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500 mb-0.5">Student Loan</p>
                  <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.studentLoan)}</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-lg border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <PiggyBank size={16} className="text-success-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Pension{result.pension.providerRelief > 0 ? ' (you pay)' : ''}</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.pension.fromPay)}</p>
                {result.pension.gross > 0 && (
                  <p className="text-xs text-success-600 mt-0.5">
                    {result.pension.providerRelief > 0
                      ? <><span className="tabular-nums">{formatGBP(result.pension.gross)}</span> into pension</>
                      : PENSION_METHOD_LABEL[pensionMethod]}
                  </p>
                )}
              </div>
            </div>
            <div className="col-span-2 bg-white rounded-lg border border-neutral-200/80 p-4 min-w-0">
              <p className="text-xs text-neutral-500 mb-0.5">Adjusted net income</p>
              <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatGBP(result.adjustedNetIncome)}</p>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                Salary less pension contributions that get tax relief. It sets the £100,000 allowance taper and the childcare limit.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="salary-uk" toolName="UK Salary Calculator" />
            <EmailResultsButton toolSlug="salary-uk" toolName="UK Salary Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="UK Salary Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Income breakdown chart (lazy) + text alternative */}
          {slices.length > 0 && (
            <div data-pdf-section className="bg-white rounded-lg border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Income Breakdown</h3>
              <LazyChartFrame height={268}>
                <SalaryUkChart
                  slices={slices}
                  pctKept={pctKept}
                  formatValue={formatGBP}
                  ariaLabel={`Income breakdown: ${slices.map((s) => `${s.name} ${formatGBP(s.value)}`).join(', ')}`}
                />
              </LazyChartFrame>
              <ChartDataTable
                className="mt-3"
                caption="Income breakdown"
                columns={[
                  { key: 'name', label: 'Part of salary' },
                  { key: 'value', label: 'Amount', format: (v) => formatGBP(Number(v)) },
                  { key: 'share', label: 'Share', format: (v) => `${Number(v).toFixed(1)}%` },
                ]}
                rows={slices.map((s) => ({ name: s.name, value: s.value, share: sliceTotal > 0 ? (s.value / sliceTotal) * 100 : 0 }))}
              />
            </div>
          )}

          {/* Assumptions (UK-4: disclose the remaining simplifications) */}
          <div data-pdf-hide className="border-t border-neutral-200/80 pt-4">
            <button
              type="button"
              aria-expanded={assumptionsOpen}
              aria-controls="uk-assumptions"
              onClick={() => setAssumptionsOpen(!assumptionsOpen)}
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-primary-600 transition-colors duration-150"
            >
              <ChevronDown size={14} className={`transition-transform duration-200 ${assumptionsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              What this calculation assumes
            </button>
            <div
              id="uk-assumptions"
              inert={assumptionsOpen ? undefined : true}
              aria-hidden={assumptionsOpen ? undefined : true}
              className={`grid transition-all duration-200 ${assumptionsOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <ul className="min-h-0 overflow-hidden list-disc pl-5 space-y-1.5 text-xs text-neutral-600 leading-relaxed">
                <li>One job, paid evenly through the {UK_TAX_YEAR} tax year, with no bonus, benefits in kind or other income. Employee Class 1 NI (category A).</li>
                <li>Pension percentages apply to your full salary. Auto-enrolment minimums use a band of &ldquo;qualifying earnings&rdquo;, so a 5% workplace contribution can be smaller than shown.</li>
                <li>Employer pension contributions are not included.</li>
                <li>Relief at source: your provider adds 20% to what you pay. Higher-rate relief is included in the tax figure, but you claim it through Self Assessment or a tax code change.</li>
                <li>Salary sacrifice cannot take pay below the National Minimum Wage. From 6 April 2029, NI relief on sacrifice above £2,000 a year is due to end; this {UK_TAX_YEAR} figure does not apply that.</li>
                <li>Student loan repayments use pay after salary sacrifice, the same pay as NI. Only one plan is shown at a time.</li>
                <li>L tax codes: the £100,000 taper reduces the Personal Allowance part of your code. A code already below 1257L is taken as issued. Emergency codes are shown as full-year figures.</li>
                <li>The annual allowance ({formatGBP(UK_PENSION_ANNUAL_ALLOWANCE)}) and its taper are flagged but not charged.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

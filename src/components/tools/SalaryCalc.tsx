import { useState, useMemo, useCallback, useRef, useEffect, useId, lazy, Suspense } from 'react';
import { RotateCcw, Banknote, Globe, Shield, DollarSign, PiggyBank } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import ChartSkeleton from '../ui/ChartSkeleton';
import ChartDataTable from '../ui/ChartDataTable';
import SalaryHeadline, { SalaryHeadlineCompact } from './SalaryHeadline';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { computeUsSalary, clampSeniors, type SalaryInputMode } from '../../lib/us-tax-calc';
import {
  getUsRates,
  isUsTaxYear,
  defaultUsTaxYearFor,
  US_DEFAULT_TAX_YEAR,
  US_TAX_YEARS,
  TAX_YEAR_LABELS,
  type FilingStatus,
  type UsTaxYear,
} from '../../lib/us-rates';
import { taxClockNow } from '../../lib/tax-years.mjs';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '../../lib/safe-storage';
import { useChartTheme } from '../../lib/useChartTheme';
import type { SalarySlice } from './charts/SalaryChart';

/** recharts loads only when the chart is needed. A failed load shows a note instead of breaking the calculator. */
const SalaryChart = lazy(() =>
  import('./charts/SalaryChart').catch(() => ({ default: ChartUnavailable })),
);

function ChartUnavailable() {
  return (
    <p className="h-full flex items-center justify-center text-center text-sm text-neutral-500 px-4">
      The chart could not load. Every figure is in the table above and under "Show data".
    </p>
  );
}

const FILING_STATUSES = ['single', 'married', 'head'] as const;
const FILING_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married: 'Married Filing Jointly',
  head: 'Head of Household',
};

const SENIOR_OPTIONS: Record<FilingStatus, { value: number; label: string }[]> = {
  single: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }],
  head: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }],
  married: [{ value: 0, label: 'Neither of us' }, { value: 1, label: 'One of us' }, { value: 2, label: 'Both of us' }],
};

/** Every input the calculator holds. Hub pages pass a subset through `defaults`. */
export interface SalaryInputs {
  inputMode: SalaryInputMode;
  salary: number;
  hourlyRate: number;
  hoursPerWeek: number;
  weeksPerYear: number;
  overtimeHours: number;
  /** Overtime is FLSA-required, so its premium half qualifies for the 2025-2028 deduction */
  overtimeQualifies: boolean;
  /** Effective state income tax rate, percent */
  stateTaxRate: number;
  filingStatus: FilingStatus;
  /** Pre-tax 401(k), percent of gross pay */
  retirement401k: number;
  /** People aged 65+ on the return (0-1; 0-2 when married filing jointly) */
  seniors: number;
  /** Passing a year pins it: no automatic switch by date or stored choice. */
  taxYear: UsTaxYear;
}

type BaseInputs = Omit<SalaryInputs, 'taxYear'>;

const BASE_DEFAULTS: BaseInputs = {
  inputMode: 'annual',
  salary: 75000,
  hourlyRate: 36,
  hoursPerWeek: 40,
  weeksPerYear: 52,
  overtimeHours: 0,
  overtimeQualifies: true,
  stateTaxRate: 5,
  filingStatus: 'single',
  retirement401k: 0,
  seniors: 0,
};

/** Session key for the visitor's year choice (session only, so a new visit starts on the date default). */
const YEAR_KEY = 'calcrun.usTaxYear';

function mergeDefaults(defaults: Partial<SalaryInputs> | undefined): BaseInputs {
  const d = defaults ?? {};
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const filingStatus = FILING_STATUSES.includes(d.filingStatus as FilingStatus)
    ? (d.filingStatus as FilingStatus)
    : BASE_DEFAULTS.filingStatus;
  return {
    inputMode: d.inputMode === 'hourly' || d.inputMode === 'annual' ? d.inputMode : BASE_DEFAULTS.inputMode,
    salary: num(d.salary, BASE_DEFAULTS.salary),
    hourlyRate: num(d.hourlyRate, BASE_DEFAULTS.hourlyRate),
    hoursPerWeek: num(d.hoursPerWeek, BASE_DEFAULTS.hoursPerWeek),
    weeksPerYear: num(d.weeksPerYear, BASE_DEFAULTS.weeksPerYear),
    overtimeHours: num(d.overtimeHours, BASE_DEFAULTS.overtimeHours),
    overtimeQualifies: typeof d.overtimeQualifies === 'boolean' ? d.overtimeQualifies : BASE_DEFAULTS.overtimeQualifies,
    stateTaxRate: num(d.stateTaxRate, BASE_DEFAULTS.stateTaxRate),
    filingStatus,
    retirement401k: num(d.retirement401k, BASE_DEFAULTS.retirement401k),
    seniors: clampSeniors(num(d.seniors, BASE_DEFAULTS.seniors), filingStatus),
  };
}

/**
 * The year the server rendered, read from this island's SSR markup during
 * hydration. The module default differs between build time and page-load
 * time across 1 January, so the first client render reuses the server's year
 * (no hydration mismatch); the mount effect then applies the visitor's choice
 * or today's default.
 */
function readRenderedTaxYear(rootId: string): UsTaxYear | null {
  if (typeof document === 'undefined') return null;
  for (const el of document.querySelectorAll<HTMLElement>('[data-salary-root]')) {
    if (el.dataset.salaryRoot === rootId) {
      const year = Number(el.dataset.taxYear);
      return isUsTaxYear(year) ? year : null;
    }
  }
  return null;
}

const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (rate: number) => `${Math.round(rate * 100)}%`;

interface SalaryCalcProps {
  /** Starting inputs (e.g. hub pages pass stateTaxRate: 0 to match their tables). Reset returns here. */
  defaults?: Partial<SalaryInputs>;
}

export default function SalaryCalc({ defaults }: SalaryCalcProps = {}) {
  const ct = useChartTheme();
  const initial = useMemo(() => mergeDefaults(defaults), [defaults]);
  const pinnedYear: UsTaxYear | null = isUsTaxYear(defaults?.taxYear) ? (defaults?.taxYear as UsTaxYear) : null;

  const rootId = useId();
  const [taxYear, setTaxYear] = useState<UsTaxYear>(
    () => pinnedYear ?? readRenderedTaxYear(rootId) ?? US_DEFAULT_TAX_YEAR,
  );
  const [inputMode, setInputMode] = useState<SalaryInputMode>(initial.inputMode);
  const [salary, setSalary] = useState(initial.salary);
  const [hourlyRate, setHourlyRate] = useState(initial.hourlyRate);
  const [hoursPerWeek, setHoursPerWeek] = useState(initial.hoursPerWeek);
  const [weeksPerYear, setWeeksPerYear] = useState(initial.weeksPerYear);
  const [overtimeHours, setOvertimeHours] = useState(initial.overtimeHours);
  const [overtimeQualifies, setOvertimeQualifies] = useState(initial.overtimeQualifies);
  const [stateTaxRate, setStateTaxRate] = useState(initial.stateTaxRate);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(initial.filingStatus);
  const [retirement401k, setRetirement401k] = useState(initial.retirement401k);
  const [seniors, setSeniors] = useState(initial.seniors);

  // After hydration: the visitor's choice this session, else today's default year.
  useEffect(() => {
    if (pinnedYear) return;
    const stored = Number(safeSessionGet(YEAR_KEY));
    const next = isUsTaxYear(stored) ? stored : defaultUsTaxYearFor(taxClockNow());
    setTaxYear((current) => (current === next ? current : next));
  }, [pinnedYear]);

  const chooseYear = useCallback((year: UsTaxYear) => {
    setTaxYear(year);
    safeSessionSet(YEAR_KEY, String(year));
  }, []);

  const handleReset = useCallback(() => {
    setInputMode(initial.inputMode);
    setSalary(initial.salary);
    setHourlyRate(initial.hourlyRate);
    setHoursPerWeek(initial.hoursPerWeek);
    setWeeksPerYear(initial.weeksPerYear);
    setOvertimeHours(initial.overtimeHours);
    setOvertimeQualifies(initial.overtimeQualifies);
    setStateTaxRate(initial.stateTaxRate);
    setFilingStatus(initial.filingStatus);
    setRetirement401k(initial.retirement401k);
    setSeniors(initial.seniors);
    safeSessionRemove(YEAR_KEY);
    setTaxYear(pinnedYear ?? defaultUsTaxYearFor(taxClockNow()));
  }, [initial, pinnedYear]);

  const rates = getUsRates(taxYear);
  const seniorsShown = clampSeniors(seniors, filingStatus);
  const yearLabel = TAX_YEAR_LABELS[taxYear];

  const result = useMemo(() => computeUsSalary({
    year: taxYear,
    mode: inputMode,
    salary,
    hourlyRate,
    hoursPerWeek,
    weeksPerYear,
    overtimeHours,
    overtimeQualifies,
    stateTaxRate,
    filingStatus,
    retirement401kPct: retirement401k,
    seniors: seniorsShown,
  }), [taxYear, inputMode, salary, hourlyRate, hoursPerWeek, weeksPerYear, overtimeHours, overtimeQualifies, stateTaxRate, filingStatus, retirement401k, seniorsShown]);

  const perHour = (v: number) => (result.hoursWorkedPerYear > 0 ? v / result.hoursWorkedPerYear : 0);
  const periods = [
    { label: 'Annual', gross: formatCurrency(result.grossAnnual), net: formatCurrency(result.netAnnual) },
    { label: 'Monthly', gross: formatCurrency(result.grossAnnual / 12), net: formatCurrency(result.netMonthly) },
    { label: 'Bi-Weekly', gross: formatCurrency(result.grossAnnual / 26), net: formatCurrency(result.netAnnual / 26) },
    { label: 'Weekly', gross: formatCurrency(result.grossAnnual / 52), net: formatCurrency(result.netAnnual / 52) },
    { label: 'Per hour worked', gross: usdCents.format(perHour(result.grossAnnual)), net: usdCents.format(perHour(result.netAnnual)) },
  ];

  const animatedNetAnnual = useAnimatedNumber(result.netAnnual);
  const resultsRef = useRef<HTMLDivElement>(null);

  // One short sentence for screen readers, announced once input settles.
  // Nothing is announced on load, only after a change.
  const liveSentence = `Take-home pay ${formatCurrency(result.netMonthly)} a month, ${formatCurrency(result.netAnnual)} a year, ${yearLabel}.`;
  const [liveText, setLiveText] = useState('');
  const announcedOnce = useRef(false);
  useEffect(() => {
    if (!announcedOnce.current) {
      announcedOnce.current = true;
      return;
    }
    const t = window.setTimeout(() => setLiveText(liveSentence), 600);
    return () => window.clearTimeout(t);
  }, [liveSentence]);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Tax Year', value: yearLabel },
      inputMode === 'annual'
        ? { label: 'Annual Salary', value: `$${formatNumber(salary)}` }
        : { label: 'Hourly Rate', value: `$${hourlyRate.toFixed(2)}/hr` },
      { label: 'Filing Status', value: FILING_LABELS[filingStatus] },
      { label: 'State Tax Rate', value: `${stateTaxRate.toFixed(1)}%` },
      { label: 'Hours / Week', value: `${hoursPerWeek}` },
      { label: 'Weeks / Year', value: `${weeksPerYear}` },
    ];
    if (seniorsShown > 0) {
      inputs.push({ label: 'Aged 65 or Older', value: SENIOR_OPTIONS[filingStatus].find((o) => o.value === seniorsShown)?.label ?? 'Yes' });
    }
    if (overtimeHours > 0) {
      inputs.push({ label: 'Overtime Hours / Week', value: `${overtimeHours} hrs` });
    }
    if (retirement401k > 0) {
      inputs.push({ label: '401(k) Contribution', value: `${retirement401k.toFixed(1)}%` });
    }
    return inputs;
  }, [yearLabel, inputMode, salary, hourlyRate, filingStatus, stateTaxRate, hoursPerWeek, weeksPerYear, seniorsShown, overtimeHours, retirement401k]);

  const getResults = useCallback((): ResultItem[] => {
    const items: ResultItem[] = [
      { label: 'Annual Take-Home Pay', value: formatCurrency(result.netAnnual), highlight: true },
      { label: 'Monthly Take-Home Pay', value: formatCurrency(result.netMonthly) },
      { label: 'Federal Tax', value: formatCurrency(result.federalTax) },
      { label: 'State Tax', value: formatCurrency(result.stateTax) },
      { label: 'Social Security', value: formatCurrency(result.socialSecurity) },
      { label: 'Medicare', value: formatCurrency(result.medicare) },
    ];
    if (result.retirement401k > 0) {
      items.push({ label: '401(k) Contribution', value: formatCurrency(result.retirement401k) });
    }
    if (result.overtimeDeduction > 0) {
      items.push({ label: 'Overtime Deduction', value: formatCurrency(result.overtimeDeduction) });
    }
    if (result.seniorDeduction > 0) {
      items.push({ label: 'Senior Deduction', value: formatCurrency(result.seniorDeduction) });
    }
    return items;
  }, [result]);

  // Semantic slice colors: take-home = primary teal, 401(k) = money kept
  // (gain), taxes/FICA = cost family differentiated by opacity steps.
  const slices: SalarySlice[] = useMemo(() => {
    const style: Record<string, { fill: string; opacity: number }> = {
      'Take-Home Pay': { fill: ct.series1, opacity: 1 },
      'Federal Tax': { fill: ct.cost, opacity: 1 },
      'State Tax': { fill: ct.cost, opacity: 0.7 },
      'Social Security': { fill: ct.cost, opacity: 0.5 },
      'Medicare': { fill: ct.cost, opacity: 0.32 },
      '401(k)': { fill: ct.gain, opacity: 1 },
    };
    return [
      { name: 'Take-Home Pay', value: result.netAnnual },
      { name: 'Federal Tax', value: result.federalTax },
      { name: 'State Tax', value: result.stateTax },
      { name: 'Social Security', value: result.socialSecurity },
      { name: 'Medicare', value: result.medicare },
      { name: '401(k)', value: result.retirement401k },
    ]
      .filter((d) => d.value > 0)
      .map((d) => ({ ...d, ...style[d.name] }));
  }, [result, ct]);

  const pctKept = result.grossAnnual > 0 ? Math.round((result.netAnnual / result.grossAnnual) * 100) : 0;
  const chartLabel = `Income breakdown: ${pctKept}% of gross pay kept as take-home pay.`;

  const otQualifyingShown = result.qualifiedOvertimePremium > 0 && rates.obbba !== null;
  // Overtime entered, but none of it is over 40 hours a week, so none can qualify.
  const otUnder40Shown = result.overtimePay > 0 && result.qualifiedOvertimePremium === 0 && rates.obbba !== null;
  const k401Hint = rates.retirement401k.published
    ? `Pre-tax; cuts federal and state tax, not FICA. Capped at the ${taxYear} limit of ${formatCurrency(rates.retirement401k.limit)}.`
    : `Pre-tax; cuts federal and state tax, not FICA. The IRS has not published the ${taxYear} limit yet, so the ${formatCurrency(rates.retirement401k.limit)} limit from ${taxYear - 1} is used.`;

  const selectClass = 'w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150';

  return (
    <div
      className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden"
      data-salary-root={rootId}
      data-tax-year={taxYear}
    >
      {/* Narrow screens: the pair at the top of the card, above the inputs (aria-hidden copy of the headline) */}
      <SalaryHeadlineCompact annual={animatedNetAnnual} format={formatCurrency} />

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
            <div>
              <label htmlFor="sal-year" className="block text-sm font-medium text-neutral-700 mb-1.5">Tax year</label>
              <select
                id="sal-year"
                value={taxYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  if (isUsTaxYear(y)) chooseYear(y);
                }}
                aria-describedby="sal-year-hint"
                className={selectClass}
              >
                {US_TAX_YEARS.map((y) => (
                  <option key={y} value={y}>{TAX_YEAR_LABELS[y]}</option>
                ))}
              </select>
              <p id="sal-year-hint" className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Pick the year you file a return for, or the year your paychecks are in.
              </p>
            </div>

            {inputMode === 'annual' ? (
              <SliderInput label="Annual Salary" id="sal-annual" value={salary} min={10000} max={500000} step={1000} textMax={1000000} minLabel="$10K" maxLabel="$500K" onChange={setSalary} prefix="$" formatDisplay={formatNumber} hint="Your gross yearly pay before taxes" />
            ) : (
              <SliderInput label="Hourly Rate" id="sal-hourly" value={hourlyRate} min={7.25} max={200} step={0.25} minLabel="$7.25" maxLabel="$200" onChange={setHourlyRate} prefix="$" formatDisplay={(v) => v.toFixed(2)} hint="Your pay per hour before taxes" />
            )}
            <SliderInput
              label="Hours per Week"
              id="sal-hours"
              value={hoursPerWeek}
              min={1}
              max={80}
              step={1}
              onChange={setHoursPerWeek}
              hint={inputMode === 'hourly' ? 'Hours above 40 a week are paid as overtime at 1.5x' : undefined}
            />
            <SliderInput label="Weeks per Year" id="sal-weeks" value={weeksPerYear} min={1} max={52} step={1} onChange={setWeeksPerYear} />
            <SliderInput label="Overtime Hours / Week" id="sal-ot" value={overtimeHours} min={0} max={40} step={1} onChange={setOvertimeHours} suffix="hrs" hint="Extra hours paid at 1.5x your hourly rate" />

            {otQualifyingShown && rates.obbba && (
              <label className="flex items-start gap-2.5 text-sm text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overtimeQualifies}
                  onChange={(e) => setOvertimeQualifies(e.target.checked)}
                  aria-describedby="sal-ot-qual-hint"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-primary-600 focus:ring-primary-500"
                />
                <span>
                  My overtime is required by federal law (FLSA)
                  <span id="sal-ot-qual-hint" className="block text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    Most hourly, non-exempt jobs. Only hours over 40 in a week count
                    ({formatNumber(result.qualifyingOvertimeHoursPerWeek, result.qualifyingOvertimeHoursPerWeek % 1 ? 1 : 0)} a week here):
                    the extra half of time-and-a-half on them is deductible for 2025-2028, up to {formatCurrency(rates.obbba.overtime.cap[filingStatus])} a year,
                    phasing out above {formatCurrency(rates.obbba.overtime.phaseOutStart[filingStatus])} of income.
                  </span>
                </span>
              </label>
            )}
            {otUnder40Shown && (
              <p className="text-xs text-neutral-500 leading-relaxed">
                No overtime deduction: under federal law (FLSA) only hours over 40 in a week count as overtime,
                and this adds up to {formatNumber(hoursPerWeek + overtimeHours, (hoursPerWeek + overtimeHours) % 1 ? 1 : 0)} hours a week.
              </p>
            )}

            <div className="h-px bg-neutral-200/80" />

            <div>
              <label htmlFor="sal-filing" className="block text-sm font-medium text-neutral-700 mb-1.5">Filing Status</label>
              <select
                id="sal-filing"
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className={selectClass}
              >
                {FILING_STATUSES.map((s) => (
                  <option key={s} value={s}>{FILING_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sal-seniors" className="block text-sm font-medium text-neutral-700 mb-1.5">
                {filingStatus === 'married' ? 'Aged 65 or older (either spouse)' : 'Aged 65 or older'}
              </label>
              <select
                id="sal-seniors"
                value={seniorsShown}
                onChange={(e) => setSeniors(Number(e.target.value))}
                aria-describedby="sal-seniors-hint"
                className={selectClass}
              >
                {SENIOR_OPTIONS[filingStatus].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p id="sal-seniors-hint" className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Adds the extra standard deduction for age 65+
                {rates.obbba ? ` and the 2025-2028 senior deduction (up to ${formatCurrency(rates.obbba.senior.perPerson)} each)` : ''}.
              </p>
            </div>

            <SliderInput
              label="State Income Tax (effective %)"
              id="sal-state"
              value={stateTaxRate}
              min={0}
              max={13}
              step={0.1}
              onChange={setStateTaxRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
              hint="Your average state rate on pay after 401(k); this tool has no state brackets. Enter 0 in AK, FL, NV, NH, SD, TN, TX, WA and WY, which do not tax wages."
            />

            <SliderInput label="401(k) Contribution" id="sal-401k" value={retirement401k} min={0} max={30} step={0.5} onChange={setRetirement401k} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint={k401Hint} />
          </div>
        </div>

        {/* Results */}
        <div id="sal-results" role="tabpanel" className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{liveText}</p>
          <div data-pdf-section className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">{yearLabel}</span>
            </div>
            <p className="text-sm text-neutral-500 mb-1.5">Take-home pay</p>
            <SalaryHeadline annual={animatedNetAnnual} format={formatCurrency} />
            <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
              Effective deduction rate: <span className="tabular-nums">{(result.effectiveDeductionRate * 100).toFixed(1)}%</span> · <span className="tabular-nums">{formatCurrency(result.totalDeductions)}</span> total deductions
            </p>
          </div>

          {/* Breakdown table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
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
                  {periods.map((row, i) => (
                    <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                      <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-700">{row.label}</th>
                      <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums whitespace-nowrap">{row.gross}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-success-600 tabular-nums whitespace-nowrap">{row.net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.socialSecurity)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5"><DollarSign size={16} aria-hidden="true" /></div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Medicare</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.medicare)}</p>
              </div>
            </div>
            {result.retirement401k > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5"><PiggyBank size={16} aria-hidden="true" /></div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">401(k)</p>
                  <p className="text-lg font-semibold text-neutral-900 tabular-nums">{formatCurrency(result.retirement401k)}</p>
                  <p className="text-xs text-success-600 mt-0.5">Pre-tax</p>
                </div>
              </div>
            )}
          </div>

          {/* How federal tax is worked out */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <caption className="text-left px-4 pt-3 pb-2 text-sm font-medium text-neutral-700">How your federal tax is worked out</caption>
              <tbody>
                <tr className="border-t border-neutral-100">
                  <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600">Gross pay</th>
                  <td className="py-2 px-4 text-right text-neutral-900 tabular-nums whitespace-nowrap">{formatCurrency(result.grossAnnual)}</td>
                </tr>
                {result.retirement401k > 0 && (
                  <tr className="border-t border-neutral-100">
                    <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600">401(k), pre-tax</th>
                    <td className="py-2 px-4 text-right text-neutral-900 tabular-nums whitespace-nowrap">-{formatCurrency(result.retirement401k)}</td>
                  </tr>
                )}
                <tr className="border-t border-neutral-100">
                  <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600">
                    Standard deduction{result.additionalStandardDeduction > 0 ? ', incl. age 65+' : ''}
                  </th>
                  <td className="py-2 px-4 text-right text-neutral-900 tabular-nums whitespace-nowrap">-{formatCurrency(result.standardDeduction)}</td>
                </tr>
                {result.overtimeDeduction > 0 && (
                  <tr className="border-t border-neutral-100">
                    <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600">Overtime deduction</th>
                    <td className="py-2 px-4 text-right text-neutral-900 tabular-nums whitespace-nowrap">-{formatCurrency(result.overtimeDeduction)}</td>
                  </tr>
                )}
                {result.seniorDeduction > 0 && (
                  <tr className="border-t border-neutral-100">
                    <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600">Senior deduction</th>
                    <td className="py-2 px-4 text-right text-neutral-900 tabular-nums whitespace-nowrap">-{formatCurrency(result.seniorDeduction)}</td>
                  </tr>
                )}
                <tr className="border-t border-neutral-200/80 bg-neutral-50/50">
                  <th scope="row" className="py-2 px-4 text-left font-medium text-neutral-700">Taxable income</th>
                  <td className="py-2 px-4 text-right font-medium text-neutral-900 tabular-nums whitespace-nowrap">{formatCurrency(result.taxableIncome)}</td>
                </tr>
                <tr className="border-t border-neutral-100">
                  <th scope="row" className="py-2 px-4 text-left font-normal text-neutral-600">
                    Federal income tax (bracket <span className="tabular-nums">{pct(result.marginalFederalRate)}</span>)
                  </th>
                  <td className="py-2 px-4 text-right text-neutral-900 tabular-nums whitespace-nowrap">{formatCurrency(result.federalTax)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Assumptions that change the answer */}
          <div data-pdf-section className="space-y-2 mb-6 text-xs text-neutral-500 leading-relaxed">
            {result.twoEarnerSocialSecurityGap > 0 && (
              <p className="rounded-lg border border-neutral-200/80 bg-white p-3 text-sm text-neutral-700">
                Two earners? Social Security is capped per person, at <span className="tabular-nums">{formatCurrency(rates.socialSecurity.wageCap)}</span> of
                wages in {taxYear}. If this is two salaries, you could pay up to <span className="tabular-nums">{formatCurrency(result.twoEarnerSocialSecurityGap)}</span> more
                Social Security than shown.
              </p>
            )}
            <p>
              Federal figures use the IRS {taxYear} brackets and standard deduction
              {rates.obbba ? ', plus the 2025-2028 overtime and senior deductions where they apply' : ''}.
              Not included: {rates.obbba ? 'the tips deduction (up to $25,000) and car-loan interest deduction (up to $10,000), ' : ''}itemized
              deductions, tax credits such as the Child Tax Credit, and city or county taxes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="salary" toolName="US Salary Calculator" />
            <EmailResultsButton toolSlug="salary" toolName="US Salary Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="US Salary Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Pie chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Income Breakdown</h3>
            <div className="relative h-[240px]">
              <Suspense fallback={<ChartSkeleton height={240} />}>
                <SalaryChart slices={slices} ariaLabel={chartLabel} />
              </Suspense>
              {/* Donut center KPI */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
                <span className="font-mono tabular-nums text-2xl font-semibold text-neutral-900">{pctKept}%</span>
                <span className="text-[10px] uppercase tracking-wide text-neutral-500">kept</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2" aria-hidden="true">
              {slices.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill, opacity: s.opacity }} />
                  {s.name}
                </div>
              ))}
            </div>
            <ChartDataTable
              className="mt-3"
              caption={`Income breakdown, ${yearLabel}`}
              columns={[
                { key: 'name', label: 'Item' },
                { key: 'value', label: 'Amount', format: (v) => formatCurrency(Number(v)) },
                { key: 'share', label: 'Share of gross', format: (v) => `${(Number(v) * 100).toFixed(1)}%` },
              ]}
              rows={slices.map((s) => ({ name: s.name, value: s.value, share: result.grossAnnual > 0 ? s.value / result.grossAnnual : 0 }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

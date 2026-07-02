import { useState, useMemo, useCallback, useRef, Fragment } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChevronDown, RotateCcw, Home, Percent, Banknote, DollarSign } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useChartTheme } from '../../lib/useChartTheme';
import ResultAffiliate from '../ui/ResultAffiliate';

/* ── Mortgage calculation helpers ─────────────────────────── */

interface YearGroup {
  year: number;
  startBalance: number;
  endBalance: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  months: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function buildAmortization(
  principal: number,
  annualRate: number,
  years: number,
  extraMonthly: number,
): { yearGroups: YearGroup[]; totalInterest: number; totalPaid: number; payoffMonths: number } {
  const r = annualRate / 100 / 12;
  const basePayment = calcMonthlyPayment(principal, annualRate, years);
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let payoffMonths = 0;
  const yearGroups: YearGroup[] = [];
  let currentYear: YearGroup | null = null;

  const maxMonths = years * 12;
  for (let m = 1; m <= maxMonths && balance > 0.01; m++) {
    const yearNum = Math.ceil(m / 12);
    if (!currentYear || currentYear.year !== yearNum) {
      if (currentYear) yearGroups.push(currentYear);
      currentYear = {
        year: yearNum,
        startBalance: balance,
        endBalance: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        totalPayment: 0,
        months: [],
      };
    }

    const interest = balance * r;
    const scheduledPayment = Math.min(basePayment + extraMonthly, balance + interest);
    const principalPortion = scheduledPayment - interest;
    balance = Math.max(0, balance - principalPortion);

    totalInterest += interest;
    totalPaid += scheduledPayment;
    payoffMonths = m;

    currentYear.totalPrincipal += principalPortion;
    currentYear.totalInterest += interest;
    currentYear.totalPayment += scheduledPayment;
    currentYear.endBalance = balance;
    currentYear.months.push({
      month: m,
      payment: scheduledPayment,
      principal: principalPortion,
      interest,
      balance,
    });
  }
  if (currentYear) yearGroups.push(currentYear);

  return { yearGroups, totalInterest, totalPaid, payoffMonths };
}

const PIE_COLORS = ['#0B6E6E', '#F59E0B'];

function AmortizationTable({ yearGroups, cc }: { yearGroups: YearGroup[]; cc: string }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const fmtCell = (v: number) => formatCurrency(v, cc);

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
          {yearGroups.map((row) => {
            const isExpanded = expandedYear === row.year;
            return (
              <Fragment key={row.year}>
                <tr
                  className={`border-b border-neutral-100 cursor-pointer transition-colors duration-150 ${
                    row.year % 2 === 0 ? 'bg-neutral-50/50' : 'bg-white'
                  } hover:bg-primary-50/40`}
                  onClick={() => setExpandedYear(isExpanded ? null : row.year)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedYear(isExpanded ? null : row.year);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <td className="py-2.5 px-4 font-medium text-neutral-700">
                    <span className="flex items-center gap-2">
                      <ChevronDown
                        size={14}
                        className={`text-neutral-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                      Year {row.year}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-neutral-900 tabular-nums font-medium">
                    {fmtCell(row.totalPrincipal)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-red-600 tabular-nums">
                    {fmtCell(row.totalInterest)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums hidden sm:table-cell">
                    {fmtCell(row.endBalance)}
                  </td>
                </tr>
                {isExpanded &&
                  row.months.map((mo) => (
                    <tr key={mo.month} className="bg-primary-50/20 border-b border-neutral-100/60 text-xs">
                      <td className="py-2 px-4 pl-10 text-neutral-500">Month {mo.month}</td>
                      <td className="py-2 px-4 text-right text-neutral-700 tabular-nums">
                        {fmtCell(mo.principal)}
                      </td>
                      <td className="py-2 px-4 text-right text-red-600 tabular-nums">
                        {fmtCell(mo.interest)}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-500 tabular-nums hidden sm:table-cell">
                        {fmtCell(mo.balance)}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const DEFAULTS = {
  homePrice: 350000,
  downPaymentPercent: 20,
  interestRate: 7.0,
  loanTerm: 30,
  extraMonthly: 0,
  propertyTaxRate: 1.0,
  insuranceAnnual: 1800,
};

export default function MortgagePaymentCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const [homePrice, setHomePrice] = useState(DEFAULTS.homePrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(DEFAULTS.downPaymentPercent);
  const [interestRate, setInterestRate] = useState(DEFAULTS.interestRate);
  const [loanTerm, setLoanTerm] = useState(DEFAULTS.loanTerm);
  const [extraMonthly, setExtraMonthly] = useState(DEFAULTS.extraMonthly);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [propertyTaxRate, setPropertyTaxRate] = useState(DEFAULTS.propertyTaxRate);
  const [insuranceAnnual, setInsuranceAnnual] = useState(DEFAULTS.insuranceAnnual);
  const [showSchedule, setShowSchedule] = useState(false);
  const ct = useChartTheme();

  const handleReset = useCallback(() => {
    setHomePrice(DEFAULTS.homePrice);
    setDownPaymentPercent(DEFAULTS.downPaymentPercent);
    setInterestRate(DEFAULTS.interestRate);
    setLoanTerm(DEFAULTS.loanTerm);
    setExtraMonthly(DEFAULTS.extraMonthly);
    setPropertyTaxRate(DEFAULTS.propertyTaxRate);
    setInsuranceAnnual(DEFAULTS.insuranceAnnual);
  }, []);

  const result = useMemo(() => {
    const downPayment = homePrice * (downPaymentPercent / 100);
    const principal = homePrice - downPayment;
    const monthlyPI = calcMonthlyPayment(principal, interestRate, loanTerm);

    const monthlyTax = homePrice * (propertyTaxRate / 100) / 12;
    const monthlyInsurance = insuranceAnnual / 12;
    const needsPMI = downPaymentPercent < 20;
    const monthlyPMI = needsPMI ? (principal * 0.007) / 12 : 0; // ~0.7% PMI estimate
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI;

    // Build amortization with and without extra payments
    const base = buildAmortization(principal, interestRate, loanTerm, 0);
    const withExtra = extraMonthly > 0
      ? buildAmortization(principal, interestRate, loanTerm, extraMonthly)
      : base;

    const interestSaved = extraMonthly > 0 ? base.totalInterest - withExtra.totalInterest : 0;
    const monthsSaved = extraMonthly > 0 ? base.payoffMonths - withExtra.payoffMonths : 0;

    // Chart data (yearly)
    const chartData = withExtra.yearGroups.map((yg) => ({
      year: `Yr ${yg.year}`,
      balance: Math.round(yg.endBalance),
      principal: Math.round(yg.totalPrincipal),
      interest: Math.round(yg.totalInterest),
    }));

    return {
      downPayment,
      principal,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      needsPMI,
      totalMonthly,
      totalInterest: withExtra.totalInterest,
      totalPaid: withExtra.totalPaid,
      interestSaved,
      monthsSaved,
      payoffMonths: withExtra.payoffMonths,
      yearGroups: withExtra.yearGroups,
      chartData,
    };
  }, [homePrice, downPaymentPercent, interestRate, loanTerm, extraMonthly, propertyTaxRate, insuranceAnnual]);

  const animatedMonthlyPI = useAnimatedNumber(result.monthlyPI);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Home Price', value: fmt(homePrice) },
      { label: 'Down Payment', value: `${downPaymentPercent}% (${fmt(homePrice * (downPaymentPercent / 100))})` },
      { label: 'Interest Rate', value: `${interestRate}%` },
      { label: 'Loan Term', value: `${loanTerm} years` },
    ];
    if (extraMonthly > 0) {
      inputs.push({ label: 'Extra Monthly Payment', value: fmt(extraMonthly) });
    }
    if (showAdvanced) {
      inputs.push({ label: 'Property Tax Rate', value: `${propertyTaxRate}%` });
      inputs.push({ label: 'Annual Insurance', value: fmt(insuranceAnnual) });
    }
    return inputs;
  }, [homePrice, downPaymentPercent, interestRate, loanTerm, extraMonthly, showAdvanced, propertyTaxRate, insuranceAnnual, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Monthly Payment (P&I)', value: fmt(result.monthlyPI), highlight: true },
    { label: 'Total Interest', value: fmt(result.totalInterest) },
    { label: 'Total Cost', value: fmt(result.totalPaid) },
    { label: 'Down Payment', value: fmt(result.downPayment) },
  ], [result, currency]);

  const pieData = useMemo(
    () => [
      { name: 'Principal', value: Math.round(result.principal) },
      { name: 'Total Interest', value: Math.round(result.totalInterest) },
    ],
    [result],
  );

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Mortgage Details</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-150"
              aria-label="Reset all inputs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          </div>

          <CurrencySelector value={currency} onChange={setCurrency} />

          <div className="space-y-5">
            <SliderInput label="Home Price" id="mort-price" value={homePrice} min={50000} max={2000000} step={5000} textMax={10000000} minLabel={`${currencySymbol}50K`} maxLabel={`${currencySymbol}2M`} onChange={setHomePrice} prefix={currencySymbol} formatDisplay={formatNumber} />
            <SliderInput label="Down Payment" id="mort-down" value={downPaymentPercent} min={0} max={90} step={1} onChange={setDownPaymentPercent} suffix="%" formatDisplay={(v) => v.toFixed(0)} hint={`${fmt(homePrice * (downPaymentPercent / 100))} down`} />
            <SliderInput label="Interest Rate" id="mort-rate" value={interestRate} min={1} max={15} step={0.125} onChange={setInterestRate} suffix="%" formatDisplay={(v) => v.toFixed(3)} />

            {/* Loan term selection */}
            <div>
              <label id="mort-term-label" className="block text-sm font-medium text-neutral-700 mb-2">Loan Term</label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="mort-term-label">
                {[15, 20, 30].map((term) => (
                  <button
                    key={term}
                    onClick={() => setLoanTerm(term)}
                    aria-pressed={loanTerm === term}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                      loanTerm === term
                        ? 'bg-primary-600 text-white border-primary-500 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {term} years
                  </button>
                ))}
              </div>
            </div>

            <SliderInput label="Extra Monthly Payment" id="mort-extra" value={extraMonthly} min={0} max={5000} step={25} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}5K`} onChange={setExtraMonthly} prefix={currencySymbol} formatDisplay={formatNumber} hint="Additional principal paid each month" />

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              {showAdvanced ? 'Hide' : 'Show'} Taxes & Insurance
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1">
                <SliderInput label="Property Tax Rate" id="mort-tax" value={propertyTaxRate} min={0} max={5} step={0.1} onChange={setPropertyTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
                <SliderInput label="Annual Insurance" id="mort-ins" value={insuranceAnnual} min={0} max={10000} step={100} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}10K`} onChange={setInsuranceAnnual} prefix={currencySymbol} formatDisplay={formatNumber} />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite" ref={resultsRef}>
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">Monthly Payment (P&I)</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {fmt(animatedMonthlyPI)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              Total monthly (PITI{result.needsPMI ? '+PMI' : ''}): {fmt(result.totalMonthly)}
            </p>
          </div>

          {/* Payment breakdown cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Home size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Loan Amount</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.principal)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Interest</p>
                <p className="text-lg font-semibold text-red-600 tabular-nums">{fmt(result.totalInterest)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Down Payment</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.downPayment)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Paid</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.totalPaid)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="mortgage-payment" toolName="Mortgage Payment Calculator" />
            <EmailResultsButton toolSlug="mortgage-payment" toolName="Mortgage Payment Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Mortgage Payment Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          <ResultAffiliate toolSlug="mortgage-payment" />

          {/* Extra payment savings */}
          {extraMonthly > 0 && result.interestSaved > 0 && (
            <div data-pdf-section className="mb-6 p-4 rounded-xl border border-success-100 bg-success-50/50">
              <p className="text-sm font-medium text-success-700">
                Extra {fmt(extraMonthly)}/month saves {fmt(result.interestSaved)} in interest
              </p>
              <p className="text-xs text-success-600 mt-1">
                Loan paid off {Math.floor(result.monthsSaved / 12)} years and {result.monthsSaved % 12} months earlier
              </p>
            </div>
          )}

          {/* PMI warning */}
          {result.needsPMI && (
            <div className="mb-6 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 leading-relaxed">
              <strong>PMI required:</strong> With less than 20% down, expect ~{fmt(result.monthlyPMI)}/month in Private Mortgage Insurance until you reach 20% equity.
            </div>
          )}

          {/* PITI breakdown */}
          {showAdvanced && (
            <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/60">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Component</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Principal & Interest', value: result.monthlyPI },
                    { label: 'Property Tax', value: result.monthlyTax },
                    { label: 'Insurance', value: result.monthlyInsurance },
                    ...(result.needsPMI ? [{ label: 'PMI (est.)', value: result.monthlyPMI }] : []),
                    ...(extraMonthly > 0 ? [{ label: 'Extra Payment', value: extraMonthly }] : []),
                  ].map((row, i) => (
                    <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                      <td className="py-2.5 px-4 font-medium text-neutral-700">{row.label}</td>
                      <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{fmt(row.value)}</td>
                    </tr>
                  ))}
                  <tr className="bg-neutral-50 font-semibold">
                    <td className="py-2.5 px-4 text-neutral-900">Total Monthly</td>
                    <td className="py-2.5 px-4 text-right text-primary-700 tabular-nums">{fmt(result.totalMonthly + extraMonthly)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Pie chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Principal vs Interest</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" animationDuration={600}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  {d.name}: {fmt(d.value)}
                </div>
              ))}
            </div>
          </div>

          {/* Balance over time chart */}
          {result.chartData.length > 0 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Balance Over Time</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={result.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke={ct.grid} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: ct.axisText }} interval={Math.max(0, Math.floor(result.chartData.length / 8) - 1)} />
                    <YAxis tick={{ fontSize: 11, fill: ct.axisText }} tickFormatter={(v: number) => { const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'; return `${s}${(v / 1000).toFixed(0)}k`; }} width={55} />
                    <Tooltip content={<ChartTooltip formatValue={fmt} />} />
                    <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke="#0B6E6E" fill="#D1F0F0" strokeWidth={2} animationDuration={800} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Amortization schedule */}
          <div data-pdf-section>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            aria-expanded={showSchedule}
            data-pdf-hide
            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-150 mb-4"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${showSchedule ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {showSchedule ? 'Hide' : 'Show'} Amortization Schedule
          </button>

          {result.yearGroups.length > 0 && (
            <div data-pdf-force-show style={showSchedule ? undefined : { display: 'none' }}>
              <AmortizationTable yearGroups={result.yearGroups} cc={currency} />
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

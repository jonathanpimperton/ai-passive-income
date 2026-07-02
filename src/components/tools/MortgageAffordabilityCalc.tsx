import { useState, useMemo, useCallback, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, RotateCcw, Home, Percent, Banknote, DollarSign, AlertTriangle, ShieldCheck } from 'lucide-react';
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

/* ── Mortgage affordability helpers ──────────────────────── */

/**
 * Calculate monthly P&I payment from a loan amount.
 * M = L * [r(1+r)^n] / [(1+r)^n - 1]
 */
function calcMonthlyPI(loanAmount: number, annualRate: number, years: number): number {
  if (loanAmount <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return loanAmount / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Calculate max loan amount from a target monthly P&I payment.
 * L = P&I * [(1+r)^n - 1] / [r(1+r)^n]
 */
function calcMaxLoan(monthlyPI: number, annualRate: number, years: number): number {
  if (monthlyPI <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return monthlyPI * years * 12;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return monthlyPI * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

const PIE_COLORS = ['#0B6E6E', '#22A06B', '#F59E0B', '#E8604C', '#6366F1'];

const DEFAULTS = {
  annualIncome: 80000,
  monthlyDebt: 500,
  downPayment: 40000,
  interestRate: 6.75,
  loanTerm: 30,
  propertyTaxRate: 1.2,
  insuranceAnnual: 1500,
  hoaMonthly: 0,
  dtiLimit: 36,
  pmiRate: 0.5,
};

export default function MortgageAffordabilityCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);

  const [annualIncome, setAnnualIncome] = useState(DEFAULTS.annualIncome);
  const [monthlyDebt, setMonthlyDebt] = useState(DEFAULTS.monthlyDebt);
  const [downPayment, setDownPayment] = useState(DEFAULTS.downPayment);
  const [interestRate, setInterestRate] = useState(DEFAULTS.interestRate);
  const [loanTerm, setLoanTerm] = useState(DEFAULTS.loanTerm);
  const [propertyTaxRate, setPropertyTaxRate] = useState(DEFAULTS.propertyTaxRate);
  const [insuranceAnnual, setInsuranceAnnual] = useState(DEFAULTS.insuranceAnnual);
  const [hoaMonthly, setHoaMonthly] = useState(DEFAULTS.hoaMonthly);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dtiLimit, setDtiLimit] = useState(DEFAULTS.dtiLimit);
  const [pmiRate, setPmiRate] = useState(DEFAULTS.pmiRate);
  const ct = useChartTheme();

  const handleReset = useCallback(() => {
    setAnnualIncome(DEFAULTS.annualIncome);
    setMonthlyDebt(DEFAULTS.monthlyDebt);
    setDownPayment(DEFAULTS.downPayment);
    setInterestRate(DEFAULTS.interestRate);
    setLoanTerm(DEFAULTS.loanTerm);
    setPropertyTaxRate(DEFAULTS.propertyTaxRate);
    setInsuranceAnnual(DEFAULTS.insuranceAnnual);
    setHoaMonthly(DEFAULTS.hoaMonthly);
    setDtiLimit(DEFAULTS.dtiLimit);
    setPmiRate(DEFAULTS.pmiRate);
  }, []);

  const result = useMemo(() => {
    const grossMonthlyIncome = annualIncome / 12;
    const maxTotalHousing = grossMonthlyIncome * (dtiLimit / 100) - monthlyDebt;

    if (maxTotalHousing <= 0) {
      return {
        maxHomePrice: 0,
        maxLoanAmount: 0,
        monthlyPI: 0,
        monthlyTax: 0,
        monthlyInsurance: 0,
        monthlyPMI: 0,
        monthlyHOA: hoaMonthly,
        totalMonthly: 0,
        dtiRatio: monthlyDebt / grossMonthlyIncome * 100,
        needsPMI: false,
        grossMonthlyIncome,
      };
    }

    // Iterative solver: PMI depends on loan amount, loan amount depends on PMI.
    // Start without PMI, iterate until convergence.
    let maxHomePrice = 0;
    let maxLoanAmount = 0;
    let monthlyPMI = 0;

    for (let iteration = 0; iteration < 20; iteration++) {
      // Estimate monthly property tax based on current home price guess
      const monthlyTaxEstimate = maxHomePrice * (propertyTaxRate / 100) / 12;
      const monthlyInsurance = insuranceAnnual / 12;

      // Available for P&I after subtracting fixed costs
      const availableForPI = maxTotalHousing - monthlyTaxEstimate - monthlyInsurance - monthlyPMI - hoaMonthly;

      if (availableForPI <= 0) {
        maxHomePrice = downPayment;
        maxLoanAmount = 0;
        break;
      }

      // Calculate max loan from available P&I budget
      const newLoanAmount = calcMaxLoan(availableForPI, interestRate, loanTerm);
      const newHomePrice = newLoanAmount + downPayment;

      // Check if PMI applies (down payment < 20% of home price)
      const downPaymentPct = newHomePrice > 0 ? (downPayment / newHomePrice) * 100 : 100;
      const newPMI = downPaymentPct < 20 ? (newLoanAmount * (pmiRate / 100)) / 12 : 0;

      // Check convergence
      if (Math.abs(newHomePrice - maxHomePrice) < 1) {
        maxHomePrice = newHomePrice;
        maxLoanAmount = newLoanAmount;
        monthlyPMI = newPMI;
        break;
      }

      maxHomePrice = newHomePrice;
      maxLoanAmount = newLoanAmount;
      monthlyPMI = newPMI;
    }

    const monthlyPI = calcMonthlyPI(maxLoanAmount, interestRate, loanTerm);
    const monthlyTax = maxHomePrice * (propertyTaxRate / 100) / 12;
    const monthlyInsurance = insuranceAnnual / 12;
    const needsPMI = maxHomePrice > 0 && (downPayment / maxHomePrice) * 100 < 20;
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI + hoaMonthly;

    // Actual DTI ratio
    const dtiRatio = grossMonthlyIncome > 0
      ? ((totalMonthly + monthlyDebt) / grossMonthlyIncome) * 100
      : 0;

    return {
      maxHomePrice: Math.max(0, maxHomePrice),
      maxLoanAmount: Math.max(0, maxLoanAmount),
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      monthlyHOA: hoaMonthly,
      totalMonthly,
      dtiRatio,
      needsPMI,
      grossMonthlyIncome,
    };
  }, [annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, propertyTaxRate, insuranceAnnual, hoaMonthly, dtiLimit, pmiRate]);

  const animatedHomePrice = useAnimatedNumber(result.maxHomePrice);

  // DTI color indicator
  const dtiColor = result.dtiRatio <= 28
    ? 'text-green-600'
    : result.dtiRatio <= 36
      ? 'text-amber-600'
      : 'text-red-600';

  const dtiBg = result.dtiRatio <= 28
    ? 'bg-green-50 border-green-200'
    : result.dtiRatio <= 36
      ? 'bg-amber-50 border-amber-200'
      : 'bg-red-50 border-red-200';

  const dtiLabel = result.dtiRatio <= 28
    ? 'Conservative'
    : result.dtiRatio <= 36
      ? 'Moderate'
      : 'Stretched';

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Annual Gross Income', value: fmt(annualIncome) },
      { label: 'Monthly Debt Payments', value: fmt(monthlyDebt) },
      { label: 'Down Payment', value: fmt(downPayment) },
      { label: 'Interest Rate', value: `${interestRate}%` },
      { label: 'Loan Term', value: `${loanTerm} years` },
      { label: 'Property Tax Rate', value: `${propertyTaxRate}%` },
      { label: 'Annual Insurance', value: fmt(insuranceAnnual) },
    ];
    if (hoaMonthly > 0) {
      inputs.push({ label: 'HOA Fees', value: `${fmt(hoaMonthly)}/mo` });
    }
    if (showAdvanced) {
      inputs.push({ label: 'DTI Limit', value: `${dtiLimit}%` });
      inputs.push({ label: 'PMI Rate', value: `${pmiRate}%` });
    }
    return inputs;
  }, [annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, propertyTaxRate, insuranceAnnual, hoaMonthly, showAdvanced, dtiLimit, pmiRate, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: 'Maximum Home Price', value: fmt(result.maxHomePrice), highlight: true },
    { label: 'Loan Amount', value: fmt(result.maxLoanAmount) },
    { label: 'Total Monthly Payment', value: fmt(result.totalMonthly) },
    { label: 'Debt-to-Income Ratio', value: `${result.dtiRatio.toFixed(1)}%` },
  ], [result, currency]);

  // Pie chart data for monthly payment breakdown
  const pieData = useMemo(() => {
    const data = [
      { name: 'Principal & Interest', value: Math.round(result.monthlyPI) },
      { name: 'Property Tax', value: Math.round(result.monthlyTax) },
      { name: 'Insurance', value: Math.round(result.monthlyInsurance) },
    ];
    if (result.monthlyPMI > 0) {
      data.push({ name: 'PMI', value: Math.round(result.monthlyPMI) });
    }
    if (result.monthlyHOA > 0) {
      data.push({ name: 'HOA', value: Math.round(result.monthlyHOA) });
    }
    return data.filter(d => d.value > 0);
  }, [result]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Your Finances</h2>
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
            <SliderInput
              label="Annual Gross Income"
              hint="Your total yearly income before taxes"
              id="afford-income"
              value={annualIncome}
              min={30000}
              max={500000}
              step={1000}
              textMax={1000000}
              minLabel={`${currencySymbol}30K`}
              maxLabel={`${currencySymbol}500K`}
              onChange={setAnnualIncome}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Monthly Debt Payments"
              hint="Car loans, student loans, credit cards, etc."
              id="afford-debt"
              value={monthlyDebt}
              min={0}
              max={5000}
              step={25}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}5K`}
              onChange={setMonthlyDebt}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Down Payment"
              hint="Amount you have saved for the deposit"
              id="afford-down"
              value={downPayment}
              min={0}
              max={200000}
              step={500}
              textMax={2000000}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}200K`}
              onChange={setDownPayment}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="Interest Rate"
              id="afford-rate"
              value={interestRate}
              min={2}
              max={12}
              step={0.125}
              onChange={setInterestRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(3)}
            />

            {/* Loan term toggle */}
            <div>
              <label id="afford-term-label" className="block text-sm font-medium text-neutral-700 mb-2">Loan Term</label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="afford-term-label">
                {[15, 30].map((term) => (
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

            <SliderInput
              label="Property Tax Rate"
              hint="Annual property tax as % of home value"
              id="afford-tax"
              value={propertyTaxRate}
              min={0.1}
              max={4}
              step={0.1}
              onChange={setPropertyTaxRate}
              suffix="%"
              formatDisplay={(v) => v.toFixed(1)}
            />
            <SliderInput
              label="Homeowners Insurance"
              hint="Annual homeowners insurance cost"
              id="afford-ins"
              value={insuranceAnnual}
              min={0}
              max={5000}
              step={100}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}5K`}
              onChange={setInsuranceAnnual}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            <SliderInput
              label="HOA Fees"
              hint="Monthly homeowners association dues"
              id="afford-hoa"
              value={hoaMonthly}
              min={0}
              max={1000}
              step={25}
              minLabel={`${currencySymbol}0`}
              maxLabel={`${currencySymbol}1K`}
              onChange={setHoaMonthly}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />

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
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1">
                <SliderInput
                  label="DTI Limit"
                  hint="Max debt-to-income ratio your lender allows (28-45%)"
                  id="afford-dti"
                  value={dtiLimit}
                  min={28}
                  max={45}
                  step={1}
                  onChange={setDtiLimit}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(0)}
                />
                {/* Only show PMI rate if down payment could result in < 20% */}
                {downPayment < (result.maxHomePrice * 0.2) && (
                  <SliderInput
                    label="PMI Rate"
                    hint="Annual private mortgage insurance rate"
                    id="afford-pmi"
                    value={pmiRate}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={setPmiRate}
                    suffix="%"
                    formatDisplay={(v) => v.toFixed(1)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" aria-live="polite" ref={resultsRef}>
          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">You can afford up to</p>
            <p className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {fmt(animatedHomePrice)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              With a {fmt(downPayment)} down payment and {fmt(result.maxLoanAmount)} loan
            </p>
          </div>

          {/* Key stats cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Home size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Loan Amount</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.maxLoanAmount)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Monthly</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.totalMonthly)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Down Payment</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(downPayment)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                <Percent size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Monthly P&I</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(result.monthlyPI)}</p>
              </div>
            </div>
          </div>

          {/* DTI indicator */}
          <div data-pdf-section className={`mb-6 p-4 rounded-xl border ${dtiBg}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.dtiRatio <= 28 ? (
                <ShieldCheck size={16} className="text-green-600" aria-hidden="true" />
              ) : result.dtiRatio <= 36 ? (
                <AlertTriangle size={16} className="text-amber-600" aria-hidden="true" />
              ) : (
                <AlertTriangle size={16} className="text-red-600" aria-hidden="true" />
              )}
              <p className={`text-sm font-semibold ${dtiColor}`}>
                Debt-to-Income: {result.dtiRatio.toFixed(1)}% ({dtiLabel})
              </p>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {result.dtiRatio <= 28
                ? 'Well within the recommended 28% housing DTI. You have room for other financial goals.'
                : result.dtiRatio <= 36
                  ? 'Within typical lender limits. Consider whether this leaves enough for savings and emergencies.'
                  : 'Above the recommended 36% total DTI. Lenders may still approve, but this leaves little buffer.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="mortgage-affordability" toolName="Mortgage Affordability Calculator" />
            <EmailResultsButton toolSlug="mortgage-affordability" toolName="Mortgage Affordability Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Mortgage Affordability Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          <ResultAffiliate toolSlug="mortgage-affordability" />

          {/* PMI warning */}
          {result.needsPMI && (
            <div data-pdf-section className="mb-6 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 leading-relaxed">
              <strong>PMI required:</strong> Your down payment is less than 20% of the home price.
              Expect ~{fmt(result.monthlyPMI)}/month in Private Mortgage Insurance until you reach 20% equity.
            </div>
          )}

          {/* Monthly payment breakdown table */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
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
                  ...(result.monthlyHOA > 0 ? [{ label: 'HOA', value: result.monthlyHOA }] : []),
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                    <td className="py-2.5 px-4 font-medium text-neutral-700">{row.label}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{fmt(row.value)}</td>
                  </tr>
                ))}
                <tr className="bg-neutral-50 font-semibold">
                  <td className="py-2.5 px-4 text-neutral-900">Total Monthly Payment</td>
                  <td className="py-2.5 px-4 text-right text-primary-700 tabular-nums">{fmt(result.totalMonthly)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pie chart — payment breakdown */}
          {pieData.length > 0 && result.totalMonthly > 0 && (
            <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4 mb-6">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Monthly Payment Breakdown</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={600}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip labelPrefix="" formatValue={fmt} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {d.name}: {fmt(d.value)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income context */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Income Breakdown</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Gross monthly income</span>
                <span className="font-medium text-neutral-900 tabular-nums">{fmt(result.grossMonthlyIncome)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Max housing payment ({dtiLimit}% DTI)</span>
                <span className="font-medium text-neutral-900 tabular-nums">{fmt(result.grossMonthlyIncome * (dtiLimit / 100))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Less existing debt</span>
                <span className="font-medium text-red-600 tabular-nums">-{fmt(monthlyDebt)}</span>
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex justify-between text-sm">
                <span className="font-medium text-neutral-900">Available for housing</span>
                <span className="font-semibold text-primary-700 tabular-nums">
                  {fmt(Math.max(0, result.grossMonthlyIncome * (dtiLimit / 100) - monthlyDebt))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

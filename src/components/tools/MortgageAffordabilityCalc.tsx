import { useState, useMemo, useCallback, useEffect, useRef, lazy, type ReactNode } from 'react';
import { ChevronDown, RotateCcw, Home, Percent, Banknote, DollarSign, AlertTriangle, ShieldCheck } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { defaultMortgageRate, defaultMortgageRateInfo, rateAttribution, regionForCurrency } from '../../lib/market-rates';
import {
  AFFORDABILITY_DEFAULTS,
  LTI_RANGE,
  estimateUkTakeHome,
  solveUsAffordability,
  solveUkAffordability,
  solveEurAffordability,
} from '../../lib/mortgage-affordability';
import ResultAffiliate from '../ui/ResultAffiliate';
import { Collapse, DeferredChart, ResultAnnouncer } from './property-shared';

const AffordabilityChart = lazy(() => import('./charts/AffordabilityChart'));

const D = AFFORDABILITY_DEFAULTS;

const TERM_OPTIONS = {
  us: [15, 30],
  uk: [20, 25, 30, 35],
  eur: [20, 25, 30],
} as const;

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default function MortgageAffordabilityCalc() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);

  // Region follows the display currency: US 28/36 model, UK income multiple +
  // rate-rise check, euro-area single limit (D11).
  const region = regionForCurrency(currency);
  const isUS = region === 'us';
  const isUK = region === 'uk';
  const depositLabel = isUK ? 'Deposit' : 'Down Payment';
  const termOptions = TERM_OPTIONS[region];
  const regionDefaultTerm = isUS ? 30 : 25;

  const [annualIncome, setAnnualIncome] = useState<number>(D.annualIncome);
  const [monthlyDebt, setMonthlyDebt] = useState<number>(D.monthlyDebts);
  const [downPayment, setDownPayment] = useState<number>(D.deposit);
  const [interestRate, setInterestRate] = useState(() => defaultMortgageRate('us', 30));
  const [rateTouched, setRateTouched] = useState(false);
  const [loanTerm, setLoanTerm] = useState(30);
  const [termTouched, setTermTouched] = useState(false);
  const [propertyTaxRate, setPropertyTaxRate] = useState<number>(D.propertyTaxRate);
  const [insuranceAnnual, setInsuranceAnnual] = useState<number>(D.insuranceAnnual);
  const [hoaMonthly, setHoaMonthly] = useState<number>(D.hoaMonthly);
  const [pmiRate, setPmiRate] = useState<number>(D.pmiRate);
  const [frontEndPct, setFrontEndPct] = useState<number>(D.frontEndPct);
  const [backEndPct, setBackEndPct] = useState<number>(D.backEndPct);
  const [ltiCap, setLtiCap] = useState<number>(D.ltiCap);
  const [stressMargin, setStressMargin] = useState<number>(D.stressMarginPct);
  const [maxShare, setMaxShare] = useState<number>(D.maxShareOfTakeHomePct);
  const [takeHomeOverride, setTakeHomeOverride] = useState<number | null>(null);
  const [eurLimit, setEurLimit] = useState<number>(D.eurMaxDebtServicePct);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Regional term and market rate apply only while the user hasn't chosen
  // their own; never stomp an explicit choice on a currency switch.
  useEffect(() => {
    if (!termTouched) setLoanTerm(regionDefaultTerm);
    else if (!(termOptions as readonly number[]).includes(loanTerm)) setLoanTerm(regionDefaultTerm);
  }, [regionDefaultTerm, termTouched]);
  useEffect(() => {
    if (!rateTouched) setInterestRate(defaultMortgageRate(region, loanTerm));
  }, [region, loanTerm, rateTouched]);

  const handleRateChange = useCallback((v: number) => {
    setRateTouched(true);
    setInterestRate(v);
  }, []);

  const handleReset = useCallback(() => {
    setAnnualIncome(D.annualIncome);
    setMonthlyDebt(D.monthlyDebts);
    setDownPayment(D.deposit);
    setLoanTerm(regionDefaultTerm);
    setTermTouched(false);
    setInterestRate(defaultMortgageRate(region, regionDefaultTerm));
    setRateTouched(false);
    setPropertyTaxRate(D.propertyTaxRate);
    setInsuranceAnnual(D.insuranceAnnual);
    setHoaMonthly(D.hoaMonthly);
    setPmiRate(D.pmiRate);
    setFrontEndPct(D.frontEndPct);
    setBackEndPct(D.backEndPct);
    setLtiCap(D.ltiCap);
    setStressMargin(D.stressMarginPct);
    setMaxShare(D.maxShareOfTakeHomePct);
    setTakeHomeOverride(null);
    setEurLimit(D.eurMaxDebtServicePct);
  }, [regionDefaultTerm, region]);

  const estimatedTakeHome = useMemo(() => Math.round(estimateUkTakeHome(annualIncome)), [annualIncome]);
  const takeHome = takeHomeOverride ?? estimatedTakeHome;

  const common = { annualIncome, monthlyDebts: monthlyDebt, deposit: downPayment, ratePct: interestRate, termYears: loanTerm };
  const us = useMemo(
    () => solveUsAffordability({ region: 'us', ...common, propertyTaxRate, insuranceAnnual, hoaMonthly, pmiRate, frontEndPct, backEndPct }),
    [annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, propertyTaxRate, insuranceAnnual, hoaMonthly, pmiRate, frontEndPct, backEndPct],
  );
  const uk = useMemo(
    () => solveUkAffordability({ region: 'uk', ...common, monthlyTakeHome: takeHome, ltiCap, stressMarginPct: stressMargin, maxShareOfTakeHomePct: maxShare }),
    [annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, takeHome, ltiCap, stressMargin, maxShare],
  );
  const eur = useMemo(
    () => solveEurAffordability({ region: 'eur', ...common, maxDebtServicePct: eurLimit }),
    [annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, eurLimit],
  );
  const result = isUS ? us : isUK ? uk : eur;
  const affordable = result.status === 'ok';

  const animatedHomePrice = useAnimatedNumber(result.maxPrice);

  /* ── Headline copy ─────────────────────────────────────── */
  const headlineLabel = affordable ? 'You could afford up to' : 'No home fits these limits';
  const subline = !affordable
    ? result.status === 'costs-exceed'
      ? 'Insurance and HOA fees alone use up your housing budget.'
      : isUK
        ? `Your monthly commitments already use ${fmtPct(uk.stressedShareOfTakeHome)} of take-home pay (limit ${maxShare}%).`
        : `Your existing debts already use up the ${isUS ? `${backEndPct}% debt-to-income` : `${eurLimit}% of income`} limit.`
    : result.maxLoan > 0
      ? `With a ${fmt(downPayment)} ${isUK ? 'deposit' : 'down payment'} and a ${fmt(result.maxLoan)} loan`
      : 'Cash only: your budget does not stretch to a loan at these costs';
  const announcement = affordable
    ? `You could afford up to ${fmt(result.maxPrice)}, with a ${fmt(result.maxLoan)} loan.`
    : `${headlineLabel}. ${subline}`;

  // Risk band for the indicator box.
  type Band = 'good' | 'ok' | 'stretched';
  const band: Band = isUS
    ? (us.backEndRatio <= 28 ? 'good' : us.backEndRatio <= 36 ? 'ok' : 'stretched')
    : isUK
      ? (uk.stressedShareOfTakeHome <= D.comfortableShareOfTakeHomePct ? 'good' : uk.stressedShareOfTakeHome <= 50 ? 'ok' : 'stretched')
      : (eur.debtServiceRatio <= 28 ? 'good' : eur.debtServiceRatio <= 36 ? 'ok' : 'stretched');
  const bandStyle = {
    good: { box: 'bg-success-50 border-success-100', text: 'text-success-600', label: 'Comfortable' },
    ok: { box: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: isUK ? 'Stretched' : 'Moderate' },
    stretched: { box: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'High risk' },
  }[band];

  const rateInfo = defaultMortgageRateInfo(region, loanTerm);
  const rateHint = `Average ${rateInfo.label.split(',')[0].toLowerCase()}: ${rateInfo.value}% (${rateAttribution(rateInfo)})`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: isUK ? 'Gross Household Income' : 'Annual Gross Income', value: fmt(annualIncome) },
      { label: isUK ? 'Monthly Credit Commitments' : 'Monthly Debt Payments', value: fmt(monthlyDebt) },
      { label: depositLabel, value: fmt(downPayment) },
      { label: 'Interest Rate', value: `${interestRate}%` },
      { label: 'Loan Term', value: `${loanTerm} years` },
    ];
    if (isUS) {
      inputs.push({ label: 'Property Tax Rate', value: `${propertyTaxRate}%` });
      inputs.push({ label: 'Annual Insurance', value: fmt(insuranceAnnual) });
      if (hoaMonthly > 0) inputs.push({ label: 'HOA Fees', value: `${fmt(hoaMonthly)}/mo` });
      inputs.push({ label: 'DTI Limits (front / back)', value: `${frontEndPct}% / ${backEndPct}%` });
      inputs.push({ label: 'PMI Rate', value: `${pmiRate}%` });
    } else if (isUK) {
      inputs.push({ label: 'Monthly Take-Home Pay', value: `${fmt(takeHome)}${takeHomeOverride === null ? ' (estimated)' : ''}` });
      inputs.push({ label: 'Income Multiple Cap', value: `${ltiCap}x` });
      inputs.push({ label: 'Rate-Rise Check', value: `+${stressMargin} points, max ${maxShare}% of take-home pay` });
    } else {
      inputs.push({ label: 'Max Share of Gross Income', value: `${eurLimit}%` });
    }
    return inputs;
  }, [annualIncome, monthlyDebt, downPayment, interestRate, loanTerm, propertyTaxRate, insuranceAnnual, hoaMonthly, frontEndPct, backEndPct, pmiRate, takeHome, takeHomeOverride, ltiCap, stressMargin, maxShare, eurLimit, region, currency]);

  const getResults = useCallback((): ResultItem[] => {
    if (!affordable) {
      return [
        { label: headlineLabel, value: 'Not affordable', highlight: true },
        { label: 'Why', value: subline },
      ];
    }
    const items: ResultItem[] = [
      { label: 'Maximum Home Price', value: fmt(result.maxPrice), highlight: true },
      { label: 'Loan Amount', value: fmt(result.maxLoan) },
    ];
    if (isUS) {
      items.push({ label: 'Total Monthly Housing Payment', value: fmt(us.totalMonthly) });
      items.push({ label: 'Housing / All-Debt Ratios', value: `${fmtPct(us.frontEndRatio)} / ${fmtPct(us.backEndRatio)}` });
    } else if (isUK) {
      items.push({ label: `Monthly Payment at ${interestRate}%`, value: fmt(uk.monthlyPI) });
      items.push({ label: `Payment if Rates Rise to ${uk.stressRatePct.toFixed(2)}%`, value: fmt(uk.stressedPayment) });
      items.push({ label: 'Income Multiple', value: `${uk.incomeMultiple.toFixed(2)}x` });
    } else {
      items.push({ label: 'Monthly Payment', value: fmt(eur.monthlyPI) });
      items.push({ label: 'Share of Gross Income on Loan Payments', value: fmtPct(eur.debtServiceRatio) });
    }
    return items;
  }, [result, us, uk, eur, affordable, headlineLabel, subline, interestRate, region, currency]);

  const slices = useMemo(() => {
    const data = [
      { name: 'Principal & Interest', value: Math.round(us.monthlyPI) },
      { name: 'Property Tax', value: Math.round(us.monthlyTax) },
      { name: 'Insurance', value: Math.round(us.monthlyInsurance) },
      { name: 'PMI', value: Math.round(us.monthlyPMI) },
      { name: 'HOA', value: Math.round(us.monthlyHOA) },
    ];
    return data.filter((d) => d.value > 0);
  }, [us]);

  const card = (icon: ReactNode, label: string, value: string, valueClass = 'text-neutral-900') => (
    <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
      <div className="hidden sm:flex w-8 h-8 rounded-lg bg-primary-50 text-primary-600 items-center justify-center shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
        <p className={`text-base sm:text-lg font-semibold whitespace-nowrap tabular-nums ${valueClass}`}>{value}</p>
      </div>
    </div>
  );

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
              label={isUK ? 'Gross Household Income' : 'Annual Gross Income'}
              hint={isUK ? 'Total yearly income before tax — add both incomes for a joint mortgage' : 'Your total yearly income before taxes'}
              id="afford-income"
              value={annualIncome}
              min={10000}
              max={500000}
              step={1000}
              textMax={1000000}
              minLabel={`${currencySymbol}10K`}
              maxLabel={`${currencySymbol}500K`}
              onChange={setAnnualIncome}
              prefix={currencySymbol}
              formatDisplay={formatNumber}
            />
            {isUK && (
              <SliderInput
                label="Monthly Take-Home Pay"
                hint={takeHomeOverride === null
                  ? 'Estimated for one earner at rest-of-UK tax and NI — edit for joint, Scottish or pension-adjusted pay'
                  : 'Your household take-home pay after tax, NI and pension'}
                id="afford-takehome"
                value={takeHome}
                min={500}
                max={30000}
                step={50}
                minLabel={`${currencySymbol}500`}
                maxLabel={`${currencySymbol}30K`}
                onChange={setTakeHomeOverride}
                prefix={currencySymbol}
                formatDisplay={formatNumber}
              />
            )}
            <SliderInput
              label={isUK ? 'Monthly Credit Commitments' : 'Monthly Debt Payments'}
              hint={isUK ? 'Loans, car finance, credit card and student loan payments' : 'Car loans, student loans, credit cards, etc.'}
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
              label={depositLabel}
              hint={isUK ? 'Amount you have saved for the deposit' : 'Amount you have saved to put down'}
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
              min={1}
              max={15}
              step={0.125}
              onChange={handleRateChange}
              suffix="%"
              formatDisplay={(v) => v.toFixed(3)}
              hint={rateHint}
            />

            {/* Loan term toggle */}
            <div>
              <span id="afford-term-label" className="block text-sm font-medium text-neutral-700 mb-2">{isUK ? 'Mortgage Term' : 'Loan Term'}</span>
              <div className={`grid ${termOptions.length === 4 ? 'grid-cols-4' : termOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`} role="group" aria-labelledby="afford-term-label">
                {termOptions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => { setLoanTerm(term); setTermTouched(true); }}
                    aria-pressed={loanTerm === term}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                      loanTerm === term
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {term} yrs
                  </button>
                ))}
              </div>
            </div>

            {isUS && (
              <>
                <SliderInput
                  label="Property Tax Rate"
                  hint="Annual property tax as % of home value — check your county assessor"
                  id="afford-tax"
                  value={propertyTaxRate}
                  min={0}
                  max={4}
                  step={0.1}
                  onChange={setPropertyTaxRate}
                  suffix="%"
                  formatDisplay={(v) => v.toFixed(1)}
                />
                <SliderInput
                  label="Homeowners Insurance"
                  hint="Annual premium — get a quote for the area you're buying in"
                  id="afford-ins"
                  value={insuranceAnnual}
                  min={0}
                  max={6000}
                  step={100}
                  minLabel={`${currencySymbol}0`}
                  maxLabel={`${currencySymbol}6K`}
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
              </>
            )}

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              aria-controls="afford-advanced"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              {showAdvanced ? 'Hide' : 'Show'} {isUS ? 'Lender Limits' : 'Affordability Limits'}
            </button>

            <Collapse open={showAdvanced} id="afford-advanced">
              <div className="space-y-5 pt-1">
                {isUS && (
                  <>
                    <SliderInput label="Housing Limit (Front-End DTI)" hint="Max share of gross income for the housing payment — 28% guideline" id="afford-front" value={frontEndPct} min={20} max={45} step={1} onChange={setFrontEndPct} suffix="%" formatDisplay={(v) => v.toFixed(0)} />
                    <SliderInput label="All-Debt Limit (Back-End DTI)" hint="Max share of gross income for housing plus other debts — 36% guideline" id="afford-back" value={backEndPct} min={28} max={50} step={1} onChange={setBackEndPct} suffix="%" formatDisplay={(v) => v.toFixed(0)} />
                    <SliderInput label="PMI Rate" hint="Annual private mortgage insurance, % of the loan, while your down payment is under 20%" id="afford-pmi" value={pmiRate} min={0} max={2} step={0.1} onChange={setPmiRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
                  </>
                )}
                {isUK && (
                  <>
                    <SliderInput label="Income Multiple Cap" hint="Most lenders cap borrowing around 4.5x income; some go to 5-5.5x for higher earners" id="afford-lti" value={ltiCap} min={LTI_RANGE.min} max={LTI_RANGE.max} step={0.25} onChange={setLtiCap} suffix="x" formatDisplay={(v) => v.toFixed(2)} />
                    <SliderInput label="Rate Rise to Test" hint="Checks the payment still fits if your rate rose this many points (MoneyHelper uses 3)" id="afford-stress" value={stressMargin} min={0} max={5} step={0.5} onChange={setStressMargin} suffix=" pts" formatDisplay={(v) => v.toFixed(1)} />
                    <SliderInput label="Max Share of Take-Home Pay" hint="Payments above half of take-home pay are high risk (MoneyHelper)" id="afford-share" value={maxShare} min={30} max={60} step={1} onChange={setMaxShare} suffix="%" formatDisplay={(v) => v.toFixed(0)} />
                  </>
                )}
                {region === 'eur' && (
                  <SliderInput label="Max Share of Gross Income" hint="Loan payments plus other debts. Rules differ by country; many lenders cap payments at about a third of net income" id="afford-eur-limit" value={eurLimit} min={20} max={45} step={1} onChange={setEurLimit} suffix="%" formatDisplay={(v) => v.toFixed(0)} />
                )}
              </div>
            </Collapse>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <ResultAnnouncer text={announcement} />
          {/* Big number */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{headlineLabel}</p>
            <p data-headline-result data-headline-label={headlineLabel} className="text-3xl sm:text-4xl font-bold result-number tabular-nums">
              {affordable ? fmt(animatedHomePrice) : 'Not affordable'}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{subline}</p>
          </div>

          {affordable && (
            <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
              {card(<Home size={16} aria-hidden="true" />, 'Loan Amount', fmt(result.maxLoan))}
              {isUS && card(<Banknote size={16} aria-hidden="true" />, 'Total Monthly', fmt(us.totalMonthly))}
              {isUK && card(<Banknote size={16} aria-hidden="true" />, 'Monthly Payment', fmt(uk.monthlyPI))}
              {region === 'eur' && card(<Banknote size={16} aria-hidden="true" />, 'Monthly Payment', fmt(eur.monthlyPI))}
              {card(<DollarSign size={16} aria-hidden="true" />, depositLabel, fmt(downPayment))}
              {isUS && card(<Percent size={16} aria-hidden="true" />, 'Monthly P&I', fmt(us.monthlyPI))}
              {isUK && card(<Percent size={16} aria-hidden="true" />, `If Rates Rise ${stressMargin} pts`, fmt(uk.stressedPayment), 'text-red-600')}
              {region === 'eur' && card(<Percent size={16} aria-hidden="true" />, 'Share of Income', fmtPct(eur.debtServiceRatio))}
            </div>
          )}

          {/* Ratio / stress indicator */}
          {affordable && (
            <div data-pdf-section className={`mb-6 p-4 rounded-xl border ${bandStyle.box}`}>
              <div className="flex items-center gap-2 mb-1">
                {band === 'good'
                  ? <ShieldCheck size={16} className={bandStyle.text} aria-hidden="true" />
                  : <AlertTriangle size={16} className={bandStyle.text} aria-hidden="true" />}
                <p className={`text-sm font-semibold ${bandStyle.text}`}>
                  {isUS && <>Housing {fmtPct(us.frontEndRatio)} · All debts {fmtPct(us.backEndRatio)} of gross income ({bandStyle.label})</>}
                  {isUK && <>Rate-rise check: {fmtPct(uk.stressedShareOfTakeHome)} of take-home pay ({bandStyle.label})</>}
                  {region === 'eur' && <>Loan and debt payments: {fmtPct(eur.debtServiceRatio)} of gross income ({bandStyle.label})</>}
                </p>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {isUS && (
                  <>Your maximum is set by the {us.binding === 'front-end'
                    ? `${frontEndPct}% housing limit (front-end)`
                    : `${backEndPct}% all-debt limit (back-end), after your ${fmt(monthlyDebt)}/month of other debts`}.
                  {us.needsPMI ? '' : us.maxLoan > 0 && Math.abs(us.maxLoan - downPayment * 4) < 1 ? ' Stopping at exactly 20% down avoids PMI.' : ''}</>
                )}
                {isUK && (
                  <>If your rate rose {stressMargin} points to {uk.stressRatePct.toFixed(2)}%, the payment would be {fmt(uk.stressedPayment)}
                  {monthlyDebt > 0 ? ` plus ${fmt(monthlyDebt)} of other commitments` : ''}. MoneyHelper treats more than half of take-home pay as high risk.</>
                )}
                {region === 'eur' && (
                  <>Lending rules differ across the euro area, and many lenders cap payments as a share of net income. Check your lender's own limit.</>
                )}
              </p>
            </div>
          )}

          {/* UK: which limit binds, deposit warning */}
          {isUK && affordable && (
            <div data-pdf-section className="mb-6 bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
              <table className="w-full text-sm">
                <caption className="sr-only">UK borrowing limits</caption>
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/60">
                    <th scope="col" className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Limit</th>
                    <th scope="col" className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Max loan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-100">
                    <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-700">Income multiple ({ltiCap}x income){uk.binding === 'lti' ? ' — sets your maximum' : ''}</th>
                    <td className="py-2.5 px-4 text-right text-neutral-700 tabular-nums">{fmt(uk.ltiLimitLoan)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-700">Rate-rise check ({maxShare}% of take-home at {uk.stressRatePct.toFixed(2)}%){uk.binding === 'stress' ? ' — sets your maximum' : ''}</th>
                    <td className="py-2.5 px-4 text-right text-neutral-700 tabular-nums">{fmt(uk.stressLimitLoan)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100">
                This is {uk.incomeMultiple.toFixed(2)}x your income. The Bank of England limits lending at 4.5x income or more to 15% of each lender's new mortgages, so most cap around 4.5x; each lender then runs its own affordability check.
                {uk.lowDeposit && <span className="block mt-1 font-medium text-amber-800">Your deposit is under 5% of this price. Most lenders need at least 5%.</span>}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="mortgage-affordability" toolName="Mortgage Affordability Calculator" />
            <EmailResultsButton toolSlug="mortgage-affordability" toolName="Mortgage Affordability Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Mortgage Affordability Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* PMI warning */}
          {isUS && us.needsPMI && (
            <div data-pdf-section className="mb-6 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 leading-relaxed">
              <strong>PMI required:</strong> Your down payment is less than 20% of the home price.
              Expect about <span className="tabular-nums">{fmt(us.monthlyPMI)}</span>/month in private mortgage insurance until you reach 20% equity.
            </div>
          )}

          {/* US monthly payment breakdown table + donut */}
          {isUS && affordable && (
            <>
              <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Monthly housing payment breakdown</caption>
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200/60">
                        <th scope="col" className="text-left py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Component</th>
                        <th scope="col" className="text-right py-2.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Monthly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Principal & Interest', value: us.monthlyPI },
                        { label: 'Property Tax', value: us.monthlyTax },
                        { label: 'Insurance', value: us.monthlyInsurance },
                        ...(us.needsPMI ? [{ label: 'PMI (est.)', value: us.monthlyPMI }] : []),
                        ...(us.monthlyHOA > 0 ? [{ label: 'HOA', value: us.monthlyHOA }] : []),
                      ].map((row, i) => (
                        <tr key={row.label} className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                          <th scope="row" className="py-2.5 px-4 text-left font-medium text-neutral-700">{row.label}</th>
                          <td className="py-2.5 px-4 text-right text-neutral-600 tabular-nums">{fmt(row.value)}</td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-50 font-semibold">
                        <th scope="row" className="py-2.5 px-4 text-left text-neutral-900">Total Monthly Payment</th>
                        <td className="py-2.5 px-4 text-right text-primary-700 tabular-nums">{fmt(us.totalMonthly)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {slices.length > 1 && (
                <DeferredChart height={260} className="mb-6">
                  <AffordabilityChart slices={slices} currency={currency} total={us.totalMonthly} />
                </DeferredChart>
              )}
            </>
          )}

          {/* Income context */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">How the Budget Is Set</h3>
            <div className="space-y-2.5">
              {isUS && (
                <>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">Gross monthly income</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(us.grossMonthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">Housing limit ({frontEndPct}% of income)</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(us.frontEndBudget)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">All-debt limit ({backEndPct}%{monthlyDebt > 0 ? ' minus other debts' : ''})</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(Math.max(0, us.backEndBudget))}</span>
                  </div>
                  <div className="h-px bg-neutral-200" />
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-neutral-900">Available for housing (lower of the two)</span>
                    <span className="font-semibold text-primary-700 tabular-nums">{fmt(Math.max(0, us.housingBudget))}</span>
                  </div>
                </>
              )}
              {isUK && (
                <>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">Take-home pay{takeHomeOverride === null ? ' (estimated)' : ''}</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(takeHome)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">{maxShare}% of take-home pay</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt((takeHome * maxShare) / 100)}</span>
                  </div>
                  {monthlyDebt > 0 && (
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-neutral-600">Less credit commitments</span>
                      <span className="font-medium text-red-600 tabular-nums">-{fmt(monthlyDebt)}</span>
                    </div>
                  )}
                  <div className="h-px bg-neutral-200" />
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-neutral-900">Mortgage payment allowed at {uk.stressRatePct.toFixed(2)}%</span>
                    <span className="font-semibold text-primary-700 tabular-nums">{fmt(Math.max(0, (takeHome * maxShare) / 100 - monthlyDebt))}</span>
                  </div>
                </>
              )}
              {region === 'eur' && (
                <>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">Gross monthly income</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt(eur.grossMonthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-600">{eurLimit}% of income</span>
                    <span className="font-medium text-neutral-900 tabular-nums">{fmt((eur.grossMonthlyIncome * eurLimit) / 100)}</span>
                  </div>
                  {monthlyDebt > 0 && (
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-neutral-600">Less existing debt</span>
                      <span className="font-medium text-red-600 tabular-nums">-{fmt(monthlyDebt)}</span>
                    </div>
                  )}
                  <div className="h-px bg-neutral-200" />
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-neutral-900">Available for the mortgage payment</span>
                    <span className="font-semibold text-primary-700 tabular-nums">{fmt(Math.max(0, eur.paymentBudget))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <ResultAffiliate toolSlug="mortgage-affordability" />
        </div>
      </div>
    </div>
  );
}

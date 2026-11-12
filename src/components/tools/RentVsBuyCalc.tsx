import { useState, useMemo, useCallback, useRef, useEffect, useDeferredValue, lazy } from 'react';
import { RotateCcw, ChevronDown, Home, DollarSign, TrendingUp, Landmark } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import ChartDataTable from '../ui/ChartDataTable';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { formatCurrency, formatNumber } from '../../lib/calculator-utils';
import { defaultMortgageRate, defaultMortgageRateInfo, rateAttribution, regionForCurrency } from '../../lib/market-rates';
import { simulateRentVsBuy, TRANSACTION_COST_DEFAULTS, type FilingStatus } from '../../lib/rent-vs-buy';
import ResultAffiliate from '../ui/ResultAffiliate';
import { Collapse, DeferredChart, ResultAnnouncer } from './property-shared';

const RentVsBuyChart = lazy(() => import('./charts/RentVsBuyChart'));

const DEFAULTS = {
  homePrice: 350000,
  downPaymentPct: 20,
  loanTermYears: 30,
  propertyTaxRate: 1.0,
  homeInsurance: 1800,
  hoaMonthly: 0,
  maintenanceRate: 1,
  homeAppreciation: 3,
  monthlyRent: 1800,
  rentIncrease: 3,
  rentersInsurance: 15,
  investmentReturn: 7,
  marginalTaxRate: 22,
  filingStatus: 'single' as FilingStatus,
  otherItemizedDeductions: 0,
  timeHorizon: 10,
};

const FILING_OPTIONS: Array<{ value: FilingStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married (joint)' },
  { value: 'head', label: 'Head of household' },
];

type RegionField = 'loanTermYears' | 'mortgageRate' | 'closingCostPct' | 'sellingCostPct';

export default function RentVsBuyCalc() {
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const region = regionForCurrency(currency);
  const currencyWord = currency === 'GBP' ? 'pounds' : currency === 'EUR' ? 'euros' : 'dollars';
  const propertyChargesLabel = region === 'us' ? 'Property Tax Rate' : 'Annual property charges (% of home value)';
  const propertyChargesHint = region === 'us'
    ? "Annual tax as % of home value — check your county assessor's site"
    : region === 'uk'
      ? 'Council tax and other annual property charges as a % of home value'
      : 'Property taxes and other annual charges as a % of home value';
  const hoaLabel = region === 'us' ? 'HOA / Month' : region === 'uk' ? 'Service charge / ground rent (monthly)' : 'Monthly service charges';
  const closingHint = region === 'us'
    ? 'Closing costs, paid when you buy — Freddie Mac suggests budgeting 2-5% of the price'
    : region === 'uk'
      ? 'Stamp duty plus legal and survey fees, as a % of the price (our stamp duty calculator gives the tax)'
      : 'Transfer taxes, notary and legal fees, as a % of the price';
  const sellingHint = region === 'us'
    ? 'Agent commission and fees if you sell at the end — commission is typically 3-8% (Freddie Mac)'
    : 'Estate agent and legal fees if you sell at the end, as a % of the sale price';

  const regionDefault = useCallback((field: RegionField, termYears: number): number => {
    switch (field) {
      case 'loanTermYears': return region === 'uk' ? 25 : DEFAULTS.loanTermYears;
      case 'mortgageRate': return defaultMortgageRate(region, termYears);
      case 'closingCostPct': return TRANSACTION_COST_DEFAULTS[region].closingCostPct;
      case 'sellingCostPct': return TRANSACTION_COST_DEFAULTS[region].sellingCostPct;
    }
  }, [region]);

  const [homePrice, setHomePrice] = useState(DEFAULTS.homePrice);
  const [downPaymentPct, setDownPaymentPct] = useState(DEFAULTS.downPaymentPct);
  const [mortgageRate, setMortgageRate] = useState(() => defaultMortgageRate('us', DEFAULTS.loanTermYears));
  const [loanTermYears, setLoanTermYears] = useState(DEFAULTS.loanTermYears);
  const [closingCostPct, setClosingCostPct] = useState(TRANSACTION_COST_DEFAULTS.us.closingCostPct);
  const [sellingCostPct, setSellingCostPct] = useState(TRANSACTION_COST_DEFAULTS.us.sellingCostPct);
  const [propertyTaxRate, setPropertyTaxRate] = useState(DEFAULTS.propertyTaxRate);
  const [homeInsurance, setHomeInsurance] = useState(DEFAULTS.homeInsurance);
  const [hoaMonthly, setHoaMonthly] = useState(DEFAULTS.hoaMonthly);
  const [maintenanceRate, setMaintenanceRate] = useState(DEFAULTS.maintenanceRate);
  const [homeAppreciation, setHomeAppreciation] = useState(DEFAULTS.homeAppreciation);
  const [monthlyRent, setMonthlyRent] = useState(DEFAULTS.monthlyRent);
  const [rentIncrease, setRentIncrease] = useState(DEFAULTS.rentIncrease);
  const [rentersInsurance, setRentersInsurance] = useState(DEFAULTS.rentersInsurance);
  const [investmentReturn, setInvestmentReturn] = useState(DEFAULTS.investmentReturn);
  const [marginalTaxRate, setMarginalTaxRate] = useState(DEFAULTS.marginalTaxRate);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(DEFAULTS.filingStatus);
  const [otherItemized, setOtherItemized] = useState(DEFAULTS.otherItemizedDeductions);
  const [timeHorizon, setTimeHorizon] = useState(DEFAULTS.timeHorizon);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Region defaults (term, market rate, transaction costs) follow the
  // currency only while the user hasn't set that field themselves — never
  // stomp user input on a currency switch.
  const touched = useRef<Set<RegionField>>(new Set());
  const touch = useCallback(<T,>(field: RegionField, set: (v: T) => void) => (v: T) => {
    touched.current.add(field);
    set(v);
  }, []);
  const handleLoanTermChange = useMemo(() => touch('loanTermYears', setLoanTermYears), [touch]);
  const handleRateChange = useMemo(() => touch('mortgageRate', setMortgageRate), [touch]);
  const handleClosingChange = useMemo(() => touch('closingCostPct', setClosingCostPct), [touch]);
  const handleSellingChange = useMemo(() => touch('sellingCostPct', setSellingCostPct), [touch]);

  useEffect(() => {
    const t = touched.current;
    const term = t.has('loanTermYears') ? loanTermYears : regionDefault('loanTermYears', loanTermYears);
    if (!t.has('loanTermYears')) setLoanTermYears(term);
    if (!t.has('mortgageRate')) setMortgageRate(regionDefault('mortgageRate', term));
    if (!t.has('closingCostPct')) setClosingCostPct(regionDefault('closingCostPct', term));
    if (!t.has('sellingCostPct')) setSellingCostPct(regionDefault('sellingCostPct', term));
  }, [regionDefault, loanTermYears]);

  const handleReset = useCallback(() => {
    touched.current.clear();
    const term = regionDefault('loanTermYears', DEFAULTS.loanTermYears);
    setHomePrice(DEFAULTS.homePrice);
    setDownPaymentPct(DEFAULTS.downPaymentPct);
    setLoanTermYears(term);
    setMortgageRate(regionDefault('mortgageRate', term));
    setClosingCostPct(regionDefault('closingCostPct', term));
    setSellingCostPct(regionDefault('sellingCostPct', term));
    setPropertyTaxRate(DEFAULTS.propertyTaxRate);
    setHomeInsurance(DEFAULTS.homeInsurance);
    setHoaMonthly(DEFAULTS.hoaMonthly);
    setMaintenanceRate(DEFAULTS.maintenanceRate);
    setHomeAppreciation(DEFAULTS.homeAppreciation);
    setMonthlyRent(DEFAULTS.monthlyRent);
    setRentIncrease(DEFAULTS.rentIncrease);
    setRentersInsurance(DEFAULTS.rentersInsurance);
    setInvestmentReturn(DEFAULTS.investmentReturn);
    setMarginalTaxRate(DEFAULTS.marginalTaxRate);
    setFilingStatus(DEFAULTS.filingStatus);
    setOtherItemized(DEFAULTS.otherItemizedDeductions);
    setTimeHorizon(DEFAULTS.timeHorizon);
    setShowAdvanced(false);
  }, [regionDefault]);

  const analysis = useMemo(() => simulateRentVsBuy({
    homePrice,
    downPaymentPct,
    mortgageRate,
    loanTermYears,
    closingCostPct,
    sellingCostPct,
    propertyTaxRate,
    homeInsurance,
    hoaMonthly,
    maintenanceRate,
    homeAppreciation,
    monthlyRent,
    rentIncrease,
    rentersInsurance,
    investmentReturn,
    timeHorizon,
    region,
    marginalTaxRate,
    filingStatus,
    otherItemizedDeductions: otherItemized,
  }), [homePrice, downPaymentPct, mortgageRate, loanTermYears, closingCostPct, sellingCostPct, propertyTaxRate, homeInsurance, hoaMonthly, maintenanceRate, homeAppreciation, monthlyRent, rentIncrease, rentersInsurance, investmentReturn, timeHorizon, region, marginalTaxRate, filingStatus, otherItemized]);

  const verdictLabel = analysis.verdict === 'tie'
    ? `Over ${timeHorizon} years, buying and renting come out even`
    : `Over ${timeHorizon} years, ${analysis.verdict === 'buy' ? 'buying' : 'renting'} leaves you better off by`;
  const contextLine = analysis.verdict === 'buy'
    ? (analysis.breakEvenYear !== null && analysis.breakEvenYear > 1
        ? `Buying pulls ahead in year ${analysis.breakEvenYear} and stays ahead`
        : 'Buying is ahead from the first year')
    : analysis.verdict === 'rent'
      ? `Renting stays ahead at the end of the ${timeHorizon}-year period`
      : 'Both paths end with the same net worth';
  const announcement = analysis.verdict === 'tie'
    ? `${verdictLabel}.`
    : `${verdictLabel} ${fmt(analysis.difference)}.`;

  const animatedDifference = useAnimatedNumber(analysis.difference);
  const animatedMortgage = useAnimatedNumber(analysis.monthlyMortgage);
  const animatedOwnCost = useAnimatedNumber(analysis.monthlyOwnershipCost);
  const animatedBuyNW = useAnimatedNumber(analysis.finalBuyerNetWorth);
  const animatedRentNW = useAnimatedNumber(analysis.finalRenterNetWorth);
  const resultsRef = useRef<HTMLDivElement>(null);

  const chartRows = useMemo(
    () => analysis.years.map((y) => ({ year: y.year, buy: Math.round(y.buyerNetWorth), rent: Math.round(y.renterNetWorth) })),
    [analysis],
  );
  const deferredChartRows = useDeferredValue(chartRows);
  const tableRows = useMemo(
    () => analysis.years.map((y) => ({ year: y.year, buy: y.buyerNetWorth, rent: y.renterNetWorth, advantage: y.advantage })),
    [analysis],
  );

  const rateInfo = defaultMortgageRateInfo(region, loanTermYears);
  const rateHint = `Average ${rateInfo.label.split(',')[0].toLowerCase()}: ${rateInfo.value}% (${rateAttribution(rateInfo)})`;

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Home Price', value: fmt(homePrice) },
      { label: region === 'uk' ? 'Deposit' : 'Down Payment', value: `${downPaymentPct}% (${fmt(Math.round(homePrice * downPaymentPct / 100))})` },
      { label: 'Mortgage Rate', value: `${mortgageRate.toFixed(3)}%` },
      { label: 'Loan Term', value: `${loanTermYears} years` },
      { label: 'Monthly Rent', value: fmt(monthlyRent) },
      { label: 'Rent Increase', value: `${rentIncrease.toFixed(1)}%/yr` },
      { label: 'Home Appreciation', value: `${homeAppreciation.toFixed(1)}%/yr` },
      { label: 'Investment Return', value: `${investmentReturn.toFixed(1)}%/yr` },
      { label: 'Buying Costs', value: `${closingCostPct.toFixed(1)}% of price` },
      { label: 'Selling Costs', value: `${sellingCostPct.toFixed(1)}% of sale price` },
      { label: propertyChargesLabel, value: `${propertyTaxRate.toFixed(1)}%` },
      { label: 'Home Insurance', value: `${fmt(homeInsurance)}/yr` },
      { label: 'Maintenance Rate', value: `${maintenanceRate.toFixed(1)}%` },
      { label: 'Time Horizon', value: `${timeHorizon} years` },
    ];
    if (region === 'us') {
      inputs.push({ label: 'Filing Status', value: FILING_OPTIONS.find((o) => o.value === filingStatus)?.label ?? filingStatus });
      inputs.push({ label: 'Marginal Tax Rate', value: `${marginalTaxRate}%` });
    }
    return inputs;
  }, [homePrice, downPaymentPct, mortgageRate, loanTermYears, monthlyRent, rentIncrease, homeAppreciation, investmentReturn, closingCostPct, sellingCostPct, propertyTaxRate, homeInsurance, maintenanceRate, timeHorizon, filingStatus, marginalTaxRate, region, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: verdictLabel, value: analysis.verdict === 'tie' ? 'Even' : fmt(analysis.difference), highlight: true },
    { label: `Net worth at year ${timeHorizon} if you buy`, value: fmt(analysis.finalBuyerNetWorth) },
    { label: `Net worth at year ${timeHorizon} if you rent`, value: fmt(analysis.finalRenterNetWorth) },
    { label: 'Monthly Mortgage (P&I)', value: fmt(analysis.monthlyMortgage) },
    { label: 'Monthly Cost to Own (first month)', value: fmt(analysis.monthlyOwnershipCost) },
  ], [timeHorizon, analysis, verdictLabel, currency]);

  return (
    <div className="bg-white border border-neutral-200/80 rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Compare Costs</h2>
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
            {/* Buy section */}
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Buying</p>
            <SliderInput label="Home Price" id="rvb-price" value={homePrice} min={50000} max={2000000} step={5000} textMax={10000000} minLabel={`${currencySymbol}50K`} maxLabel={`${currencySymbol}2M`} onChange={setHomePrice} prefix={currencySymbol} formatDisplay={formatNumber} hint="Purchase price of the home you're considering" />
            <SliderInput label={region === 'uk' ? 'Deposit' : 'Down Payment'} id="rvb-down" value={downPaymentPct} min={0} max={100} step={1} onChange={setDownPaymentPct} suffix="%" formatDisplay={(v) => `${v.toFixed(0)} (${fmt(homePrice * v / 100)})`} hint={`Percentage of the price you'll pay upfront — shown in ${currencyWord} below`} />
            <SliderInput label="Mortgage Rate" id="rvb-rate" value={mortgageRate} min={1} max={15} step={0.125} onChange={handleRateChange} suffix="%" formatDisplay={(v) => v.toFixed(3)} hint={rateHint} />
            <SliderInput label="Loan Term (Years)" id="rvb-term" value={loanTermYears} min={10} max={35} step={1} onChange={handleLoanTermChange} />

            <div className="h-px bg-neutral-200/80" />

            {/* Rent section */}
            <p className="text-xs font-semibold text-success-600 uppercase tracking-wide">Renting</p>
            <SliderInput label="Monthly Rent" id="rvb-rent" value={monthlyRent} min={500} max={5000} step={25} textMax={15000} minLabel={`${currencySymbol}500`} maxLabel={`${currencySymbol}5K`} onChange={setMonthlyRent} prefix={currencySymbol} formatDisplay={formatNumber} hint="What you'd pay monthly to rent a comparable home" />
            <SliderInput label="Annual Rent Increase" id="rvb-rent-inc" value={rentIncrease} min={0} max={10} step={0.5} onChange={setRentIncrease} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="How much rent goes up each year" />

            <div className="h-px bg-neutral-200/80" />

            <SliderInput label="Time Horizon (Years)" id="rvb-horizon" value={timeHorizon} min={1} max={30} step={1} onChange={setTimeHorizon} hint="How long you expect to stay before selling" />

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
              aria-expanded={showAdvanced}
              aria-controls="rvb-advanced"
            >
              <ChevronDown size={15} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              Advanced Settings
            </button>

            <Collapse open={showAdvanced} id="rvb-advanced">
              <div className="space-y-5 pt-1">
                <SliderInput label="Buying Costs" id="rvb-closing" value={closingCostPct} min={0} max={10} step={0.5} onChange={handleClosingChange} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint={closingHint} />
                <SliderInput label="Selling Costs" id="rvb-selling" value={sellingCostPct} min={0} max={10} step={0.5} onChange={handleSellingChange} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint={sellingHint} />
                <SliderInput label={propertyChargesLabel} id="rvb-ptax" value={propertyTaxRate} min={0} max={5} step={0.1} onChange={setPropertyTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint={propertyChargesHint} />
                <SliderInput label="Home Insurance (Annual)" id="rvb-hins" value={homeInsurance} min={0} max={10000} step={100} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}10K`} onChange={setHomeInsurance} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label={hoaLabel} id="rvb-hoa" value={hoaMonthly} min={0} max={2000} step={25} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}2K`} onChange={setHoaMonthly} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Maintenance Rate" id="rvb-maint" value={maintenanceRate} min={0} max={3} step={0.1} onChange={setMaintenanceRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Rule of thumb: 1% of home value per year for upkeep" />
                <SliderInput label="Home Appreciation" id="rvb-appr" value={homeAppreciation} min={-5} max={10} step={0.5} onChange={setHomeAppreciation} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
                <SliderInput label="Renter's Insurance / Month" id="rvb-rins" value={rentersInsurance} min={0} max={100} step={5} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}100`} onChange={setRentersInsurance} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Investment Return" id="rvb-inv" value={investmentReturn} min={0} max={15} step={0.5} onChange={setInvestmentReturn} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="What either household earns on cash it invests each month instead of spending on housing" />
                {region === 'us' && (
                  <>
                    <div>
                      <span id="rvb-filing-label" className="block text-sm font-medium text-neutral-700 mb-1">Tax Filing Status</span>
                      <p className="text-xs text-neutral-500 mb-2 leading-relaxed">Mortgage interest only saves tax when itemising beats your standard deduction.</p>
                      <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="rvb-filing-label">
                        {FILING_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setFilingStatus(o.value)}
                            aria-pressed={filingStatus === o.value}
                            className={`py-2 px-1 rounded-lg text-xs font-medium transition-all duration-150 border ${
                              filingStatus === o.value
                                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <SliderInput label="Marginal Tax Rate" id="rvb-tax" value={marginalTaxRate} min={0} max={55} step={1} onChange={setMarginalTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(0)} hint="Your top combined federal + state rate — 22% is common for middle incomes" />
                    <SliderInput label="Other Itemized Deductions (Annual)" id="rvb-other-ded" value={otherItemized} min={0} max={50000} step={500} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}50K`} onChange={setOtherItemized} prefix={currencySymbol} formatDisplay={formatNumber} hint="Charity and other deductions you'd itemize anyway (not property tax)" />
                  </>
                )}
              </div>
            </Collapse>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" ref={resultsRef}>
          <ResultAnnouncer text={announcement} />
          {/* Verdict */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">{verdictLabel}</p>
            <p data-headline-result data-headline-label={verdictLabel} className="text-3xl sm:text-4xl font-bold tabular-nums result-number">
              {analysis.verdict === 'tie' ? fmt(0) : fmt(animatedDifference)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{contextLine}</p>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Net worth if you sold up at the end. Both paths start with <span className="tabular-nums">{fmt(analysis.initialCash)}</span> ({region === 'uk' ? 'deposit' : 'down payment'}
              {analysis.closingCosts > 0 ? ' + buying costs' : ''}); each month the cheaper path invests the difference.
            </p>
          </div>

          {/* Summary cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Landmark size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Monthly Mortgage</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedMortgage)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Total Monthly Cost to Own</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedOwnCost)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Home size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Net Worth if You Buy</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedBuyNW)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-0.5">Net Worth if You Rent</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedRentNW)}</p>
              </div>
            </div>
          </div>

          {region === 'us' && (
            <p data-pdf-section className="mb-6 text-xs text-neutral-500 leading-relaxed">
              {analysis.totalTaxSaving > 0
                ? <>Itemising mortgage interest and property tax saves an estimated <span className="tabular-nums">{fmt(analysis.totalTaxSaving)}</span> in tax over {timeHorizon} years.</>
                : <>With this filing status the standard deduction beats itemising, so mortgage interest saves no tax.</>}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="rent-vs-buy" toolName="Rent vs Buy Calculator" />
            <EmailResultsButton toolSlug="rent-vs-buy" toolName="Rent vs Buy Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Rent vs Buy Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-1">Net Worth Over Time</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-neutral-600" aria-hidden="true">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-primary-600" />Buying</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-neutral-400" />Renting</span>
            </div>
            <DeferredChart height={280}>
              <RentVsBuyChart
                data={deferredChartRows}
                currency={currency}
                breakEvenYear={analysis.breakEvenYear}
                ariaLabel={`Net worth by year if you buy versus if you rent, over ${timeHorizon} years. ${announcement}`}
              />
            </DeferredChart>
            <ChartDataTable
              className="mt-3"
              caption="Net worth by year if you buy or rent"
              columns={[
                { key: 'year', label: 'Year', numeric: true },
                { key: 'buy', label: 'Buying', format: (v) => fmt(Number(v)) },
                { key: 'rent', label: 'Renting', format: (v) => fmt(Number(v)) },
                { key: 'advantage', label: 'Buying ahead by', format: (v) => fmt(Number(v)) },
              ]}
              rows={tableRows}
            />
          </div>

          <ResultAffiliate toolSlug="rent-vs-buy" />
        </div>
      </div>
    </div>
  );
}

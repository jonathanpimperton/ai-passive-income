import { useState, useMemo, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RotateCcw, ChevronDown, Home, DollarSign, TrendingUp, Landmark } from 'lucide-react';
import SliderInput from '../ui/SliderInput';
import ChartTooltip from '../ui/ChartTooltip';
import ExportPdfButton from '../ui/ExportPdfButton';
import EmailResultsButton from '../ui/EmailResultsButton';
import ShareButton from '../ui/ShareButton';
import CurrencySelector, { useCurrency } from '../ui/CurrencySelector';
import { getCurrencyConfig } from '../../lib/currency';
import type { ResultItem } from '../../lib/email-types';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useChartTheme } from '../../lib/useChartTheme';
import { formatCurrency, formatNumber, loanMonthlyPayment } from '../../lib/calculator-utils';
import ResultAffiliate from '../ui/ResultAffiliate';

const DEFAULTS = {
  homePrice: 350000,
  downPaymentPct: 20,
  mortgageRate: 6.5,
  loanTermYears: 30,
  propertyTaxRate: 1.2,
  homeInsurance: 1500,
  hoaMonthly: 0,
  maintenanceRate: 1,
  homeAppreciation: 3,
  monthlyRent: 1800,
  rentIncrease: 3,
  rentersInsurance: 15,
  investmentReturn: 7,
  marginalTaxRate: 22,
  timeHorizon: 10,
};

export default function RentVsBuyCalc() {
  const ct = useChartTheme();
  const { currency, setCurrency } = useCurrency();
  const currencySymbol = getCurrencyConfig(currency).symbol;
  const fmt = (v: number) => formatCurrency(v, currency);
  const [homePrice, setHomePrice] = useState(DEFAULTS.homePrice);
  const [downPaymentPct, setDownPaymentPct] = useState(DEFAULTS.downPaymentPct);
  const [mortgageRate, setMortgageRate] = useState(DEFAULTS.mortgageRate);
  const [loanTermYears, setLoanTermYears] = useState(DEFAULTS.loanTermYears);
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
  const [timeHorizon, setTimeHorizon] = useState(DEFAULTS.timeHorizon);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReset = useCallback(() => {
    setHomePrice(DEFAULTS.homePrice);
    setDownPaymentPct(DEFAULTS.downPaymentPct);
    setMortgageRate(DEFAULTS.mortgageRate);
    setLoanTermYears(DEFAULTS.loanTermYears);
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
    setTimeHorizon(DEFAULTS.timeHorizon);
    setShowAdvanced(false);
  }, []);

  const analysis = useMemo(() => {
    const downPayment = homePrice * (downPaymentPct / 100);
    const loanAmount = homePrice - downPayment;
    const monthlyMortgage = loanMonthlyPayment(loanAmount, mortgageRate / 100, loanTermYears * 12);
    const monthlyPropertyTax = (homePrice * (propertyTaxRate / 100)) / 12;
    const monthlyInsurance = homeInsurance / 12;
    const monthlyMaintenance = (homePrice * (maintenanceRate / 100)) / 12;

    const monthlyInvestReturn = investmentReturn / 100 / 12;
    const buyYearData: Array<{ year: number; totalCostBuy: number; totalCostRent: number; equity: number; netCostBuy: number }> = [];

    let totalRentCost = 0;
    let totalBuyCost = downPayment; // Upfront cost
    let currentRent = monthlyRent;
    let loanBalance = loanAmount;
    let investmentBalance = 0; // Renter invests the down payment difference
    let renterInvestment = downPayment; // Renter starts by investing the down payment
    let totalInterestPaid = 0;

    // Year-by-year simulation
    for (let year = 1; year <= timeHorizon; year++) {
      let yearBuyCost = 0;
      let yearRentCost = 0;

      for (let month = 1; month <= 12; month++) {
        // Buy costs
        const interestPayment = loanBalance * (mortgageRate / 100 / 12);
        const principalPayment = monthlyMortgage - interestPayment;
        loanBalance = Math.max(0, loanBalance - principalPayment);
        totalInterestPaid += interestPayment;

        // Tax deduction on mortgage interest (simplified)
        const taxSavings = interestPayment * (marginalTaxRate / 100);

        const monthBuyCost = monthlyMortgage + monthlyPropertyTax + monthlyInsurance + hoaMonthly + monthlyMaintenance - taxSavings;
        yearBuyCost += monthBuyCost;

        // Rent costs
        const monthRentCost = currentRent + rentersInsurance;
        yearRentCost += monthRentCost;

        // Renter invests the difference if buying costs more
        const diff = monthBuyCost - monthRentCost;
        if (diff > 0) {
          renterInvestment += diff;
        }

        // Grow renter's investment
        renterInvestment *= (1 + monthlyInvestReturn);
      }

      totalBuyCost += yearBuyCost;
      totalRentCost += yearRentCost;

      // Rent increases annually
      currentRent *= (1 + rentIncrease / 100);

      // Home value and equity
      const homeValue = homePrice * Math.pow(1 + homeAppreciation / 100, year);
      const equity = homeValue - loanBalance;

      // Net cost of buying = total spent - equity gained
      const netCostBuy = totalBuyCost - equity + downPayment;

      // Net cost of renting = total rent - investment gains
      const netCostRent = totalRentCost - (renterInvestment - downPayment);

      buyYearData.push({
        year,
        totalCostBuy: Math.round(netCostBuy),
        totalCostRent: Math.round(netCostRent),
        equity: Math.round(equity),
        netCostBuy: Math.round(netCostBuy),
      });
    }

    // Find break-even year
    let breakEvenYear: number | null = null;
    for (let i = 1; i < buyYearData.length; i++) {
      const prev = buyYearData[i - 1];
      const curr = buyYearData[i];
      if (prev.totalCostBuy > prev.totalCostRent && curr.totalCostBuy <= curr.totalCostRent) {
        breakEvenYear = curr.year;
        break;
      }
    }

    const finalYear = buyYearData[buyYearData.length - 1];
    const buyWins = finalYear ? finalYear.totalCostBuy < finalYear.totalCostRent : false;
    const savings = finalYear ? Math.abs(finalYear.totalCostBuy - finalYear.totalCostRent) : 0;

    return {
      downPayment,
      monthlyMortgage,
      monthlyBuyCost: monthlyMortgage + monthlyPropertyTax + monthlyInsurance + hoaMonthly + monthlyMaintenance,
      yearData: buyYearData,
      breakEvenYear,
      buyWins,
      savings,
      finalEquity: finalYear?.equity ?? 0,
      totalInterestPaid: Math.round(totalInterestPaid),
    };
  }, [homePrice, downPaymentPct, mortgageRate, loanTermYears, propertyTaxRate, homeInsurance, hoaMonthly, maintenanceRate, homeAppreciation, monthlyRent, rentIncrease, rentersInsurance, investmentReturn, marginalTaxRate, timeHorizon]);

  const animatedSavings = useAnimatedNumber(analysis.savings);
  const animatedMortgage = useAnimatedNumber(analysis.monthlyMortgage);
  const animatedBuyCost = useAnimatedNumber(analysis.monthlyBuyCost);
  const animatedEquity = useAnimatedNumber(analysis.finalEquity);
  const animatedDownPayment = useAnimatedNumber(analysis.downPayment);
  const resultsRef = useRef<HTMLDivElement>(null);

  const getInputs = useCallback(() => {
    const inputs = [
      { label: 'Home Price', value: fmt(homePrice) },
      { label: 'Down Payment', value: `${downPaymentPct}% (${fmt(Math.round(homePrice * downPaymentPct / 100))})` },
      { label: 'Mortgage Rate', value: `${mortgageRate.toFixed(3)}%` },
      { label: 'Loan Term', value: `${loanTermYears} years` },
      { label: 'Monthly Rent', value: fmt(monthlyRent) },
      { label: 'Rent Increase', value: `${rentIncrease.toFixed(1)}%/yr` },
      { label: 'Home Appreciation', value: `${homeAppreciation.toFixed(1)}%/yr` },
      { label: 'Property Tax Rate', value: `${propertyTaxRate.toFixed(1)}%` },
      { label: 'Home Insurance', value: `${fmt(homeInsurance)}/yr` },
      { label: 'Maintenance Rate', value: `${maintenanceRate.toFixed(1)}%` },
      { label: 'Time Horizon', value: `${timeHorizon} years` },
    ];
    return inputs;
  }, [homePrice, downPaymentPct, mortgageRate, loanTermYears, monthlyRent, rentIncrease, homeAppreciation, propertyTaxRate, homeInsurance, maintenanceRate, timeHorizon, currency]);

  const getResults = useCallback((): ResultItem[] => [
    { label: `Over ${timeHorizon} years, ${analysis.buyWins ? 'buying' : 'renting'} saves you`, value: fmt(analysis.savings), highlight: true },
    { label: 'Monthly Mortgage', value: fmt(analysis.monthlyMortgage) },
    { label: 'Monthly Buy Cost (Total)', value: fmt(analysis.monthlyBuyCost) },
    { label: 'Equity Built', value: fmt(analysis.finalEquity) },
  ], [timeHorizon, analysis, currency]);

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
            <SliderInput label="Down Payment" id="rvb-down" value={downPaymentPct} min={0} max={100} step={1} onChange={setDownPaymentPct} suffix="%" formatDisplay={(v) => `${v.toFixed(0)} (${fmt(homePrice * v / 100)})`} hint="Percentage of the price you'll pay upfront — shown in dollars below" />
            <SliderInput label="Mortgage Rate" id="rvb-rate" value={mortgageRate} min={2} max={12} step={0.125} onChange={setMortgageRate} suffix="%" formatDisplay={(v) => v.toFixed(3)} hint="Current mortgage interest rates — check bankrate.com" />
            <SliderInput label="Loan Term (Years)" id="rvb-term" value={loanTermYears} min={10} max={30} step={1} onChange={setLoanTermYears} />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            {/* Rent section */}
            <p className="text-xs font-semibold text-success-600 uppercase tracking-wide">Renting</p>
            <SliderInput label="Monthly Rent" id="rvb-rent" value={monthlyRent} min={500} max={5000} step={25} textMax={15000} minLabel={`${currencySymbol}500`} maxLabel={`${currencySymbol}5K`} onChange={setMonthlyRent} prefix={currencySymbol} formatDisplay={formatNumber} hint="What you'd pay monthly to rent a comparable home" />
            <SliderInput label="Annual Rent Increase" id="rvb-rent-inc" value={rentIncrease} min={0} max={10} step={0.5} onChange={setRentIncrease} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="How much rent goes up each year — ~3% is typical" />

            <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <SliderInput label="Time Horizon (Years)" id="rvb-horizon" value={timeHorizon} min={1} max={30} step={1} onChange={setTimeHorizon} />

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
              aria-expanded={showAdvanced}
            >
              <ChevronDown size={15} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1">
                <SliderInput label="Property Tax Rate" id="rvb-ptax" value={propertyTaxRate} min={0} max={5} step={0.1} onChange={setPropertyTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Annual tax as % of home value — check your county assessor's site" />
                <SliderInput label="Home Insurance (Annual)" id="rvb-hins" value={homeInsurance} min={0} max={10000} step={100} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}10K`} onChange={setHomeInsurance} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="HOA / Month" id="rvb-hoa" value={hoaMonthly} min={0} max={2000} step={25} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}2K`} onChange={setHoaMonthly} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Maintenance Rate" id="rvb-maint" value={maintenanceRate} min={0} max={3} step={0.1} onChange={setMaintenanceRate} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="Rule of thumb: 1% of home value per year for upkeep" />
                <SliderInput label="Home Appreciation" id="rvb-appr" value={homeAppreciation} min={-5} max={10} step={0.5} onChange={setHomeAppreciation} suffix="%" formatDisplay={(v) => v.toFixed(1)} />
                <SliderInput label="Renter's Insurance / Month" id="rvb-rins" value={rentersInsurance} min={0} max={100} step={5} minLabel={`${currencySymbol}0`} maxLabel={`${currencySymbol}100`} onChange={setRentersInsurance} prefix={currencySymbol} formatDisplay={formatNumber} />
                <SliderInput label="Investment Return (Renter)" id="rvb-inv" value={investmentReturn} min={0} max={15} step={0.5} onChange={setInvestmentReturn} suffix="%" formatDisplay={(v) => v.toFixed(1)} hint="If renting, what return you'd earn investing the difference — ~7% for index funds" />
                <SliderInput label="Marginal Tax Rate" id="rvb-tax" value={marginalTaxRate} min={0} max={55} step={1} onChange={setMarginalTaxRate} suffix="%" formatDisplay={(v) => v.toFixed(0)} hint="Your highest combined federal + state tax bracket — 22% is common for middle incomes" />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 lg:p-8 bg-neutral-50/50 lg:sticky lg:top-20 lg:self-start" aria-live="polite" ref={resultsRef}>
          {/* Verdict */}
          <div data-pdf-section className="mb-6">
            <p className="text-sm text-neutral-500 mb-1">
              Over {timeHorizon} years, {analysis.buyWins ? 'buying' : 'renting'} saves you
            </p>
            <p data-headline-result data-headline-label={`Over ${timeHorizon} years, ${analysis.buyWins ? 'buying' : 'renting'} saves you`} className={`text-3xl sm:text-4xl font-bold tabular-nums result-number`}>
              {fmt(animatedSavings)}
            </p>
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {analysis.breakEvenYear
                ? `Buying breaks even at year ${analysis.breakEvenYear}`
                : analysis.buyWins
                  ? 'Buying is cheaper from year 1'
                  : `Renting stays cheaper for the full ${timeHorizon}-year period`}
            </p>
          </div>

          {/* Summary cards */}
          <div data-pdf-section className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Landmark size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Monthly Mortgage</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedMortgage)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Total Monthly Buy Cost</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedBuyCost)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Equity at Year {timeHorizon}</p>
                <p className="text-lg font-semibold text-success-600 tabular-nums">{fmt(animatedEquity)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4 flex items-start gap-3 min-w-0 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                <Home size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Down Payment</p>
                <p className="text-lg font-semibold text-neutral-900 tabular-nums">{fmt(animatedDownPayment)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ShareButton toolSlug="rent-vs-buy" toolName="Rent vs Buy Calculator" />
            <EmailResultsButton toolSlug="rent-vs-buy" toolName="Rent vs Buy Calculator" getInputs={getInputs} getResults={getResults} />
            <ExportPdfButton toolName="Rent vs Buy Calculator" getInputs={getInputs} resultsRef={resultsRef} />
          </div>

          {/* Chart */}
          <div data-pdf-section className="bg-white rounded-xl border border-neutral-200/80 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Net Cost Comparison Over Time</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={analysis.yearData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke={ct.grid} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                    tickLine={false}
                    axisLine={{ stroke: ct.axis }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    label={{ value: 'Year', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: ct.axisText }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => { const s = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'; return `${s}${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`; }}
                    tick={{ fontSize: 11, fill: ct.axisText, fontFamily: ct.monoFont }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip formatValue={fmt} />} />
                  {analysis.breakEvenYear && (
                    <ReferenceLine
                      x={analysis.breakEvenYear}
                      stroke={ct.axisText}
                      strokeWidth={1.5}
                      label={{ value: 'Break-even', position: 'top', fill: ct.axisText, fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                  <Area type="monotone" dataKey="totalCostBuy" name="Buy (Net Cost)" stroke={ct.series1} strokeWidth={2} fill={ct.series1Fill} animationDuration={600} />
                  <Area type="monotone" dataKey="totalCostRent" name="Rent (Net Cost)" stroke={ct.series2} strokeWidth={2} fill={ct.series2Fill} animationDuration={600} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <ResultAffiliate toolSlug="rent-vs-buy" />
        </div>
      </div>
    </div>
  );
}

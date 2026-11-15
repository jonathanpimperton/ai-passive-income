/**
 * Server-side source of truth for the calculators that support "Email my results".
 *
 * worker.ts imports this to:
 *  - validate `toolSlug` and derive the display name and canonical URL (never trust a
 *    client-supplied tool name);
 *  - render result-email rows ONLY when the label matches the tool's `labels` and the
 *    value matches the tool's `values` phrases or the strict numeric grammar
 *    (src/lib/email-sanitize.ts). Anything else is dropped, never rendered.
 *
 * Template syntax (implemented in src/lib/email-sanitize.ts): plain text is exact
 * (case-insensitive); `{n}` one well-formed number; `{dur}` a duration; `{month}` a month
 * name; `{taxcode}` a UK tax code; `{a|b}` alternatives; `{item}` (labels only) a
 * user-named row rendered as "<itemNoun> <n>", never as the user's text.
 *
 * When a calculator adds or renames a label or a text value in getInputs()/getResults(),
 * add it here. src/lib/tool-registry.test.ts scans every calculator (and the shared
 * helpers that build rows) and fails when a row would be dropped.
 *
 * Entries marked "(W1-DEBT)" / "(W1-UK)" pre-register phrases from those branches before
 * they merge; the drift test confirms them once the calculators land.
 */

export interface ToolEntry {
  /** Display name used in the email subject and heading. */
  name: string;
  /** Canonical path of the tool page (trailing slash). */
  path: string;
  /** Calculator source file under src/components/tools/ (used by the drift test). */
  component: string;
  /** Allowed row labels (inputs and results share one list). */
  labels: string[];
  /** Allowed non-numeric values (phrase templates). Plain figures need no entry. */
  values?: string[];
  /** Noun used to rename `{item}` rows, for example "Debt" gives "Debt 1". */
  itemNoun?: string;
}

const COMPOUNDING_LABELS = ['Compounding Frequency', 'Contribution Timing'];
const COMPOUNDING_VALUES = ['Annually', 'Semi-annually', 'Quarterly', 'Monthly', 'Daily', 'End of each month', 'Start of each month'];
// Extremes printed by formatMoneyGuarded / formatPercentGuarded (src/lib/result-format.ts):
// "Over $1 trillion", "Under -$1 trillion", "Over 1,000,000%", "Under -1,000,000%".
const GUARDED_MONEY_VALUES = ['Over {n} trillion', 'Under {n} trillion'];
const GUARDED_PERCENT_VALUES = ['Over {n}%', 'Under {n}%'];
const TODAYS_MONEY = "{Today's dollars|Today's pounds|Today's euros}";
const RETIREMENT_INPUTS = [
  'Current Age', 'Retirement Age', 'Current Savings', 'Monthly Contribution', 'Target Balance',
  'Expected Annual Return', 'Expected Inflation Rate',
];
const FILING_US_SHORT = ['Single', 'Married (joint)', 'Head of household'];
const PAYOFF_HORIZON_LABELS = ['Interest Paid in {n} Years', 'Still Owed After {n} Years']; // (W1-DEBT)

export const TOOL_REGISTRY: Record<string, ToolEntry> = {
  'compound-interest': {
    name: 'Compound Interest Calculator',
    path: '/tools/saving-and-growth/compound-interest/',
    component: 'CompoundInterestCalc.tsx',
    labels: [
      'Starting Amount', 'Monthly Contribution', 'Annual Growth Rate', 'Time Period', ...COMPOUNDING_LABELS,
      'Final Balance', 'Total Contributions', 'Interest Earned',
      'Note', // (W1-DEBT)
    ],
    values: [...COMPOUNDING_VALUES, ...GUARDED_MONEY_VALUES, 'Beyond any realistic outcome - check your inputs'],
  },
  'loan-amortization': {
    name: 'Loan Amortization Calculator',
    path: '/tools/debt-and-loans/loan-amortization/',
    component: 'LoanAmortizationCalc.tsx',
    labels: [
      'Loan Amount', 'Annual Interest Rate', 'Loan Term', 'Extra Monthly Payment',
      'Monthly Payment', 'Total Interest', 'Total Cost', 'Interest Saved by Extra Payments', 'Months Saved',
    ],
  },
  'investment-return': {
    name: 'Investment Return Calculator',
    path: '/tools/saving-and-growth/investment-return/',
    component: 'InvestmentReturnCalc.tsx',
    labels: [
      'Solve For', 'Starting Amount', 'Monthly Contribution', 'Expected Annual Return', 'Time Period',
      'Target Amount', ...COMPOUNDING_LABELS,
      'End Amount', 'Required Return Rate', 'Time Required', 'Result',
      'Final Balance', 'Total Contributions', 'Total Earnings',
      'Note', // (W1-DEBT)
    ],
    values: [
      ...COMPOUNDING_VALUES, ...GUARDED_MONEY_VALUES, ...GUARDED_PERCENT_VALUES,
      'End Amount', 'Contribution', 'Return Rate', 'Starting Amount', 'Time',
      'Beyond any realistic outcome - check your inputs',
      // Solver outcomes shown instead of a figure (InvestmentReturnCalc result.formatted).
      'No growth needed', 'Over 100% a year', 'Already there', 'Not within {n} years',
      // "Note" row: the result's context sentence when there is no chart (result.effective is null).
      'Adjust the inputs to calculate.',
      'Even losing 99% a year leaves {n} after {n} {year|years}, above your {n} target, so there is no rate to solve for.',
      'Even 100% a year would only reach {n} in {n} {year|years}. Raise the contribution or time, or lower the target.',
      'Add a starting amount or a monthly contribution to calculate a rate.',
      'Your {n} starting amount already meets the {n} target.',
      'Target not reached within {n} years: after {n} years the balance would be {n}. Raise the contribution or return, or lower the target.',
    ],
  },
  'retirement-savings': {
    name: 'Retirement Savings Calculator',
    path: '/tools/income-and-planning/retirement-savings/',
    component: 'RetirementSavingsCalc.tsx',
    labels: [
      ...RETIREMENT_INPUTS,
      'Estimated Retirement Balance', `Inflation-Adjusted Value (${TODAYS_MONEY})`,
      'Total Contributions', 'Total Interest Earned',
    ],
  },
  'retirement-contribution': {
    name: 'Retirement Contribution Calculator',
    path: '/tools/income-and-planning/retirement-contribution/',
    component: 'RetirementContributionCalc.tsx',
    labels: [
      ...RETIREMENT_INPUTS,
      'Required Monthly Savings', 'Projected Balance at {n} (no more contributions)',
      `Target in ${TODAYS_MONEY}`, 'Total Contributions', 'Total Interest Earned',
    ],
    values: ['{n}: current savings are on track', 'Not available: retirement age must be after current age'],
  },
  'retirement-age': {
    name: 'Retirement Age Calculator',
    path: '/tools/income-and-planning/retirement-age/',
    component: 'RetirementAgeCalc.tsx',
    labels: [
      ...RETIREMENT_INPUTS,
      'Estimated Retirement Age', 'Projected Balance', 'Projected Balance at {n}', 'Shortfall',
      'Monthly Saving Needed to Reach It by {n}', `Inflation-Adjusted Value (${TODAYS_MONEY})`,
      'Total Contributions', 'Total Interest Earned',
    ],
    values: ['Now (age {n}): savings already meet the target', 'Not reached by age {n}', 'Age {n} (in {dur})'],
  },
  'debt-payoff': {
    name: 'Debt Payoff Calculator',
    path: '/tools/debt-and-loans/debt-payoff/',
    component: 'DebtPayoffCalc.tsx',
    itemNoun: 'Debt',
    labels: [
      'Strategy', 'Extra Monthly Payment',
      'Debt-Free In', 'Total Interest', 'Total Amount Paid', 'Total Debt',
      'Interest in the First Month', 'Monthly Payment', ...PAYOFF_HORIZON_LABELS, // (W1-DEBT)
      // Per-debt rows labelled with the user's own debt name (before and after W1-DEBT).
      '{item} Balance', '{item} APR', '{item} Min Payment', '{item}',
    ],
    values: [
      'Avalanche (highest rate first)', 'Snowball (lowest balance first)',
      'Never - the payments do not keep up with the interest', 'Not within {n} years', // (W1-DEBT)
      'Over {n} years', // statusTime() when the simulation runs past the horizon
      '{n} at {n} APR, min {n}/mo', // (W1-DEBT) per-debt row
      ...GUARDED_MONEY_VALUES,
    ],
  },
  'savings-goal': {
    name: 'Savings Goal Calculator',
    path: '/tools/saving-and-growth/savings-goal/',
    component: 'SavingsGoalCalc.tsx',
    labels: [
      'Mode', 'Savings Goal', 'Current Savings', 'Annual Interest Rate', 'Timeframe', 'Monthly Contribution',
      'Monthly Savings Needed', 'Total Contributions', 'Interest Earned', 'Time to Reach Goal',
      'Projected Balance after {n} months', 'Balance after {n} years',
    ],
    values: [
      'Monthly Savings Needed', 'Time to Goal',
      '{n}: current savings already meet the goal', '{n}: interest alone reaches the goal',
      'Already reached', 'Not reached within {n} years',
    ],
  },
  salary: {
    name: 'US Salary Calculator',
    path: '/tools/income-and-planning/salary-us/',
    component: 'SalaryCalc.tsx',
    labels: [
      'Annual Salary', 'Filing Status', 'State Tax Rate', 'Hours / Week', 'Weeks / Year',
      'Overtime Hours / Week', '401(k) Contribution',
      'Tax Year', 'Hourly Rate', 'Aged 65 or Older', 'Overtime Deduction', 'Senior Deduction',
      'Annual Take-Home Pay', 'Federal Tax', 'State Tax', 'Social Security', 'Medicare',
      'Monthly Take-Home Pay', // (W2-SALARY) monthly headline
    ],
    values: [
      '{n} paychecks', '{n} tax year (filing in {n})',
      'Single', 'Married Filing Jointly', 'Head of Household', 'Neither of us', 'One of us', 'Both of us',
    ],
  },
  'salary-uk': {
    name: 'UK Salary Calculator',
    path: '/tools/income-and-planning/salary-uk/',
    component: 'SalaryUkCalc.tsx',
    labels: [
      'Annual Salary', 'Tax Code', 'Tax Region', 'Student Loan', 'Pension Contribution', 'Pension Type',
      'Annual Take-Home Pay', 'Income Tax', 'National Insurance', 'Pension',
      'Into Your Pension', 'Adjusted Net Income', // (W1-UK)
      // (W2-SALARY) monthly headline and the relief-at-source payslip comparison
      'Monthly Take-Home Pay', 'Payslip Take-Home Pay (a month)', 'Payslip Take-Home Pay (a year)',
      'Extra Relief to Claim (a year)',
    ],
    values: [
      '{taxcode}', 'Scotland', 'Salary Sacrifice', 'No Student Loan',
      'Plan 1 (pre-2012 England/Wales)', 'Plan 2 (post-2012 England/Wales)', 'Plan 4 (Scotland)',
      'Plan 5 (from 2023)', 'Postgraduate Loan',
      // (W1-UK)
      '{taxcode} (not recognised, 1257L used)', '{n} a year', 'Plan 1 (pre-2012 England/Wales, Northern Ireland)',
      'Plan 5 (England, from 2023)', 'Net pay arrangement', 'Relief at source',
      // (W2-SALARY) pension entered as a payslip amount, or as % of qualifying earnings
      '{n} a year taken from pay', '{n} of qualifying earnings',
    ],
  },
  'mortgage-payment': {
    name: 'Mortgage Payment Calculator',
    path: '/tools/debt-and-loans/mortgage-payment/',
    component: 'MortgagePaymentCalc.tsx',
    labels: [
      'Home Price', 'Property Price', 'Deposit', 'Down Payment', 'Interest Rate', 'Loan Term',
      'Extra Monthly Payment', 'Property Tax Rate', 'Annual Insurance', 'PMI Rate',
      'Monthly Payment (P&I)', 'Monthly Payment', 'Total Monthly (PITI)', 'Total Monthly (PITI + PMI)',
      'Total Interest', 'Total Paid (principal + interest)',
    ],
  },
  inflation: {
    name: 'Inflation Calculator',
    path: '/tools/economic/inflation/',
    component: 'InflationCalc.tsx',
    labels: [
      'Mode', 'Dollar Amount', 'Start Year', 'End Year', 'Years Into Future', 'Assumed Annual Inflation',
      // Start and end years can carry the latest CPI month, for example "2026 (October)".
      '{n} in {n} equals (in {n} prices)', '{n} in {n} equals (in {n} ({month}) prices)',
      '{n} in {n} ({month}) equals (in {n} prices)', '{n} in {n} ({month}) equals (in {n} ({month}) prices)',
      'Average Annual Inflation', 'Cumulative Inflation', 'Data',
      '{n} today will cost', 'Purchasing Power Lost', 'Result',
    ],
    values: [
      'Historical', 'Future Projection', '{n} ({month})', 'Choose two different years to compare',
      'CPI-U, U.S. city average, all items (BLS); latest month {month} {n}',
    ],
  },
  roi: {
    name: 'ROI Calculator',
    path: '/tools/saving-and-growth/roi/',
    component: 'RoiCalc.tsx',
    labels: [
      'Initial Investment ({A|B})', 'Final Value ({A|B})', 'Dividends Received ({A|B})', 'Time Held ({A|B})',
      'Total Return', 'Annualized Return', 'Net Profit',
      'Net Loss', 'Investment B Total Return', 'Investment B Annualized Return', // (W1-DEBT)
    ],
    values: [...GUARDED_MONEY_VALUES, ...GUARDED_PERCENT_VALUES],
  },
  'net-worth': {
    name: 'Net Worth Calculator',
    path: '/tools/income-and-planning/net-worth/',
    component: 'NetWorthCalc.tsx',
    labels: [
      'Total Assets', 'Total Liabilities', 'Number of Assets', 'Number of Liabilities', 'Net Worth',
      'Debt-to-Asset Ratio', // (W1-DEBT)
    ],
    values: GUARDED_MONEY_VALUES,
  },
  'rent-vs-buy': {
    name: 'Rent vs Buy Calculator',
    path: '/tools/debt-and-loans/rent-vs-buy/',
    component: 'RentVsBuyCalc.tsx',
    labels: [
      'Home Price', 'Property Price', 'Down Payment', 'Deposit', 'Mortgage Rate', 'Loan Term', 'Monthly Rent',
      'Rent Increase', 'Home Appreciation', 'Investment Return', 'Buying Costs', 'Selling Costs',
      'Property Tax Rate', 'Annual property charges (% of home value)', 'Home Insurance', 'Maintenance Rate',
      'Time Horizon', 'Filing Status', 'Marginal Tax Rate', 'State & Local Income Tax', 'Other Itemized Deductions',
      'Over {n} years, buying and renting come out even', 'Over {n} years, {buying|renting} leaves you better off by',
      'Net worth at year {n} if you {buy|rent}', 'Monthly Mortgage (P&I)', 'Monthly Cost to Own (first month)',
      'Buying would pull ahead (if you stayed) in year',
      // Excluded-costs note (src/lib/rent-vs-buy.ts excludedCostsNote)
      'Buying and selling costs', 'Buying costs', 'Selling costs',
    ],
    values: ['{n} of price', '{n} of sale price', ...FILING_US_SHORT, 'Even', 'Not included'],
  },
  'emergency-fund': {
    name: 'Emergency Fund Calculator',
    path: '/tools/income-and-planning/emergency-fund/',
    component: 'EmergencyFundCalc.tsx',
    labels: [
      'Housing / Rent', 'Food & Groceries', 'Transportation', 'Utilities', 'Insurance', 'Debt Payments',
      'Other Expenses', 'Total Monthly Expenses', 'Current Emergency Savings', 'Monthly Savings Contribution',
      'Savings interest rate', 'Savings interest rate ({AER|APY|annual})',
      'Recommended Target ({n} months)', 'Monthly Contribution', 'Time to Reach {n}-Month Target',
    ],
    values: [
      'Enter your monthly expenses to see a target', 'Already funded', 'Fully funded',
      'Add a monthly amount to reach this', 'More than 50 years at this rate',
      '{n} mo (interest only)', '{n}y {n}mo (interest only)',
    ],
  },
  'investment-fee': {
    name: 'Investment Fee Calculator',
    path: '/tools/saving-and-growth/investment-fee/',
    component: 'InvestmentFeeCalc.tsx',
    labels: [
      'Initial Investment', 'Monthly Contribution', 'Expected Annual Return', 'Investment Period',
      'Your Fund Fee', 'Comparison Fee',
      'Fee Difference Cost', 'Balance at {n} fee', 'Total Contributions', 'Returns Lost to Fee Gap',
    ],
    values: ['All of them, plus {n} of contributions', ...GUARDED_MONEY_VALUES], // (W1-DEBT)
  },
  'mortgage-affordability': {
    name: 'Mortgage Affordability Calculator',
    path: '/tools/debt-and-loans/mortgage-affordability/',
    component: 'MortgageAffordabilityCalc.tsx',
    labels: [
      'Annual Gross Income', 'Gross Household Income', 'Monthly Debt Payments', 'Monthly Credit Commitments',
      'Deposit', 'Down Payment', 'Interest Rate', 'Loan Term', 'Property Tax Rate', 'Annual Insurance', 'HOA Fees',
      'DTI Limits (front / back)', 'PMI Rate', 'Monthly Take-Home Pay', 'Income Multiple Cap', 'Stress Test',
      'Max Share of Gross Income',
      'You could afford up to', 'No home fits these limits', 'Why',
      'Maximum Home Price', 'Loan Amount', 'Total Monthly Housing Payment', 'Housing / All-Debt Ratios',
      'Monthly Payment', 'Share of Gross Income on Loan Payments',
      // UK result rows (src/lib/affordability-report.ts ukResultItems)
      'Monthly Payment at {n}', 'Payment at Stress Rate {n}', '{Stress test|Payment check}: Share of Take-Home Pay',
      'Income Multiple',
    ],
    values: [
      'Not affordable', '{n} (estimated)',
      // "Why" row when nothing is affordable (the component's subline)
      'Insurance and HOA fees alone use up your housing budget.',
      'Your monthly commitments already use {n} of take-home pay (limit {n}).',
      'Your existing debts already use up the {n} debt-to-income limit.',
      'Your existing debts already use up the {n} of income limit.',
      'With a {n} {deposit|down payment} and a {n} loan',
      'Cash only: your budget does not stretch to a loan at these costs',
      // UK "Stress Test" input (src/lib/affordability-report.ts ukStressTestInput)
      'None (fixed 5+ years): payment checked at your {n} rate; max {n} of take-home pay',
      '{n} (the higher of your {n} rate and the {n} average standard variable rate, + {n} pt); max {n} of take-home pay',
    ],
  },
  'credit-card-payoff': {
    name: 'Credit Card Payoff Calculator',
    path: '/tools/debt-and-loans/credit-card-payoff/',
    component: 'CreditCardPayoffCalc.tsx',
    labels: [
      'Credit Card Balance', 'Annual Interest Rate (APR)', 'Minimum Payment (Fixed)', 'Minimum Payment (%)',
      'Extra Monthly Payment',
      'Paid Off In', 'Total Interest', 'Total Amount Paid', 'Interest Saved',
      // (W1-DEBT)
      'Minimum Payment', 'Your Payment', 'Interest Charged in Month 1', 'Payment Needed to Reduce the Balance',
      'Payment to Clear in 5 Years', ...PAYOFF_HORIZON_LABELS,
    ],
    values: [
      // (W1-DEBT)
      'Never - the payment does not cover the interest', 'Not within {n} years', 'At least {n}/mo',
      '{n} of balance (min {n})', 'Interest + {n} of balance (min {n})',
      'Over {n} years', // timeText() when the schedule runs past the horizon
      ...GUARDED_MONEY_VALUES,
    ],
  },
  'solar-payback': {
    name: 'Solar Panel Payback Calculator',
    path: '/tools/saving-and-growth/solar-payback/',
    component: 'SolarPaybackCalc.tsx',
    labels: [
      'System Cost', 'System Size', 'Annual Generation', 'Battery', 'Electricity Tariff', 'Self-Consumption',
      'Export Tariff', 'Tax Credit / Grant', 'Grant / Rebate',
      'Payback Period', 'Net System Cost', 'Year 1 Savings', '{n}-Year Savings', '{n}-Year ROI',
    ],
    values: ['Pays back immediately', 'Not applicable (no net cost)', '{pct} ({pct} base, year 1)'],
  },
  'car-finance': {
    name: 'Car Finance Comparison Calculator',
    path: '/tools/debt-and-loans/car-finance/',
    component: 'CarFinanceCalc.tsx',
    labels: [
      'Car Price', 'Deposit', 'Term', 'PCP APR', 'PCP Balloon', 'HP APR', 'Loan APR', 'Investment Return',
      'Cheapest Option (True Cost)',
      '{PCP|Hire Purchase|Personal Loan|Cash} True Cost', '{PCP|Hire Purchase|Personal Loan|Cash} Monthly',
    ],
    values: ['PCP', 'Hire Purchase', 'Personal Loan', 'Cash'],
  },
  'stamp-duty': {
    name: 'Stamp Duty Calculator',
    path: '/tools/economic/stamp-duty/',
    component: 'StampDutyCalc.tsx',
    labels: [
      'Property Price', 'Buyer Type', 'Non-UK Resident',
      'Stamp Duty (SDLT)', 'Effective Tax Rate', 'Total Cost (Price + SDLT)',
      // Band rows, for example "GBP 125,000 - GBP 250,000 (2%)" (en dash): the amounts must carry
      // the currency sign and the rate the percent sign, so the label cannot be a bare number run.
      '{money} \u2013 {money} ({pct})', '{money} \u2013 ... ({pct})',
    ],
    values: ['First-time buyer', 'Moving home', 'Additional property'],
  },
  'capital-gains-tax': {
    name: 'Capital Gains Tax Calculator',
    path: '/tools/economic/capital-gains-tax/',
    component: 'CapitalGainsTaxCalc.tsx',
    labels: [
      'Country', 'Purchase Price', 'Sale Price', 'Holding Period', 'Filing Status', 'Other Taxable Income',
      'Tax Band', 'Annual Income',
      'Capital Gain', 'Annual Exempt Amount', 'Taxable Gain', 'Capital Gains Tax', 'Effective Tax Rate',
      'Net Proceeds',
    ],
    values: [
      'United States', 'United Kingdom', 'Long-term (> 1 year)', 'Short-term (\u2264 1 year)', ...FILING_US_SHORT,
      'Basic rate', 'Higher/additional rate',
      // (W1-UK)
      'Long-term (over 1 year)', 'Short-term (1 year or less)', 'Higher rate', 'Additional rate',
    ],
  },
};

/** True when `slug` is a known email-capable tool. Guards against prototype keys. */
export function isKnownTool(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, slug);
}

/**
 * Server-side source of truth for the calculators that support "Email my results".
 *
 * worker.ts imports this to:
 *  - validate `toolSlug` and derive the display name and canonical URL (never trust a
 *    client-supplied tool name);
 *  - render result-email row labels ONLY from the per-tool `labels` allowlist below.
 *    A client label that matches no entry is dropped, never rendered.
 *
 * Label template syntax (implemented in src/lib/email-sanitize.ts):
 *  - plain text      exact label (matched case-insensitively, rendered as written here)
 *  - `{n}`           one numeric token: optional sign and currency symbol, digits with
 *                    `,`/`.` separators, optional trailing `%` or currency symbol
 *  - `{a|b|c}`       one of the listed literal words or phrases
 *  - `{item}`        a user-named row (for example a debt name). The user's text is NEVER
 *                    rendered; it is replaced by "<itemNoun> <n>" (for example "Debt 2").
 *
 * When a calculator adds or renames a label in getInputs()/getResults(), add it here.
 * src/lib/tool-registry.test.ts scans the calculator sources for literal labels and fails
 * when one is missing, so drift is caught by `npm test`.
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
  /** Noun used to rename `{item}` rows, for example "Debt" gives "Debt 1". */
  itemNoun?: string;
}

const COMPOUNDING = ['Compounding Frequency', 'Contribution Timing'];
const RETIREMENT_COMMON = [
  'Current Age', 'Current Savings', 'Expected Annual Return', 'Expected Inflation Rate',
  'Total Contributions', 'Total Interest Earned',
];

export const TOOL_REGISTRY: Record<string, ToolEntry> = {
  'compound-interest': {
    name: 'Compound Interest Calculator',
    path: '/tools/saving-and-growth/compound-interest/',
    component: 'CompoundInterestCalc.tsx',
    labels: [
      'Starting Amount', 'Monthly Contribution', 'Annual Growth Rate', 'Time Period', ...COMPOUNDING,
      'Final Balance', 'Total Contributions', 'Interest Earned',
    ],
  },
  'loan-amortization': {
    name: 'Loan Amortization Calculator',
    path: '/tools/debt-and-loans/loan-amortization/',
    component: 'LoanAmortizationCalc.tsx',
    labels: [
      'Loan Amount', 'Annual Interest Rate', 'Loan Term', 'Extra Monthly Payment',
      'Monthly Payment', 'Total Interest', 'Total Cost',
    ],
  },
  'investment-return': {
    name: 'Investment Return Calculator',
    path: '/tools/saving-and-growth/investment-return/',
    component: 'InvestmentReturnCalc.tsx',
    labels: [
      'Solve For', 'Starting Amount', 'Monthly Contribution', 'Expected Annual Return', 'Time Period',
      'Target Amount', ...COMPOUNDING,
      'End Amount', 'Required Return Rate', 'Time Required', 'Result',
      'Final Balance', 'Total Contributions', 'Total Earnings',
    ],
  },
  'retirement-savings': {
    name: 'Retirement Savings Calculator',
    path: '/tools/income-and-planning/retirement-savings/',
    component: 'RetirementSavingsCalc.tsx',
    labels: [
      ...RETIREMENT_COMMON, 'Retirement Age', 'Monthly Contribution',
      'Estimated Retirement Balance', 'Inflation-Adjusted Value',
    ],
  },
  'retirement-contribution': {
    name: 'Retirement Contribution Calculator',
    path: '/tools/income-and-planning/retirement-contribution/',
    component: 'RetirementContributionCalc.tsx',
    labels: [
      ...RETIREMENT_COMMON, 'Retirement Age', 'Target Balance',
      'Required Monthly Savings', 'Inflation-Adjusted Target',
    ],
  },
  'retirement-age': {
    name: 'Retirement Age Calculator',
    path: '/tools/income-and-planning/retirement-age/',
    component: 'RetirementAgeCalc.tsx',
    labels: [
      ...RETIREMENT_COMMON, 'Monthly Contribution', 'Target Balance',
      'Estimated Retirement Age', 'Projected Balance', 'Inflation-Adjusted Value',
    ],
  },
  'debt-payoff': {
    name: 'Debt Payoff Calculator',
    path: '/tools/debt-and-loans/debt-payoff/',
    component: 'DebtPayoffCalc.tsx',
    itemNoun: 'Debt',
    labels: [
      'Strategy', 'Extra Monthly Payment',
      'Debt-Free In', 'Total Interest', 'Total Amount Paid', 'Total Debt',
      // Per-debt rows: the client labels them with the user's own debt name.
      '{item} Balance', '{item} APR', '{item} Min Payment',
    ],
  },
  'savings-goal': {
    name: 'Savings Goal Calculator',
    path: '/tools/saving-and-growth/savings-goal/',
    component: 'SavingsGoalCalc.tsx',
    labels: [
      'Mode', 'Savings Goal', 'Current Savings', 'Annual Interest Rate', 'Timeframe', 'Monthly Contribution',
      'Monthly Savings Needed', 'Total Contributions', 'Interest Earned', 'Time to Reach Goal',
    ],
  },
  salary: {
    name: 'US Salary Calculator',
    path: '/tools/income-and-planning/salary-us/',
    component: 'SalaryCalc.tsx',
    labels: [
      'Annual Salary', 'Filing Status', 'State Tax Rate', 'Hours / Week', 'Weeks / Year',
      'Overtime Hours / Week', '401(k) Contribution',
      'Annual Take-Home Pay', 'Federal Tax', 'State Tax', 'Social Security', 'Medicare',
    ],
  },
  'salary-uk': {
    name: 'UK Salary Calculator',
    path: '/tools/income-and-planning/salary-uk/',
    component: 'SalaryUkCalc.tsx',
    labels: [
      'Annual Salary', 'Tax Code', 'Tax Region', 'Student Loan', 'Pension Contribution', 'Pension Type',
      'Annual Take-Home Pay', 'Income Tax', 'National Insurance', 'Pension',
    ],
  },
  'mortgage-payment': {
    name: 'Mortgage Payment Calculator',
    path: '/tools/debt-and-loans/mortgage-payment/',
    component: 'MortgagePaymentCalc.tsx',
    labels: [
      'Home Price', 'Deposit', 'Down Payment', 'Interest Rate', 'Loan Term', 'Extra Monthly Payment',
      'Property Tax Rate', 'Annual Insurance',
      'Monthly Payment (P&I)', 'Monthly Payment', 'Total Interest', 'Total Cost',
    ],
  },
  inflation: {
    name: 'Inflation Calculator',
    path: '/tools/economic/inflation/',
    component: 'InflationCalc.tsx',
    labels: [
      'Mode', 'Dollar Amount', 'Start Year', 'End Year', 'Years Into Future', 'Assumed Annual Inflation',
      '{n} in {n} equals', 'Average Annual Inflation', 'Purchasing Power Today',
      '{n} today will cost', 'Purchasing Power Lost', 'Result',
    ],
  },
  roi: {
    name: 'ROI Calculator',
    path: '/tools/saving-and-growth/roi/',
    component: 'RoiCalc.tsx',
    labels: [
      'Initial Investment ({A|B})', 'Final Value ({A|B})', 'Dividends Received ({A|B})', 'Time Held ({A|B})',
      'Total Return', 'Annualized Return', 'Net Profit',
    ],
  },
  'net-worth': {
    name: 'Net Worth Calculator',
    path: '/tools/income-and-planning/net-worth/',
    component: 'NetWorthCalc.tsx',
    labels: ['Total Assets', 'Total Liabilities', 'Number of Assets', 'Number of Liabilities', 'Net Worth'],
  },
  'rent-vs-buy': {
    name: 'Rent vs Buy Calculator',
    path: '/tools/debt-and-loans/rent-vs-buy/',
    component: 'RentVsBuyCalc.tsx',
    labels: [
      'Home Price', 'Down Payment', 'Mortgage Rate', 'Loan Term', 'Monthly Rent', 'Rent Increase',
      'Home Appreciation', 'Property Tax Rate', 'Annual property charges (% of home value)',
      'Home Insurance', 'Maintenance Rate', 'Time Horizon',
      'Over {n} years, {buying|renting} saves you', 'Monthly Mortgage', 'Monthly Buy Cost (Total)',
      'Equity Built',
    ],
  },
  'emergency-fund': {
    name: 'Emergency Fund Calculator',
    path: '/tools/income-and-planning/emergency-fund/',
    component: 'EmergencyFundCalc.tsx',
    labels: [
      'Housing / Rent', 'Food & Groceries', 'Transportation', 'Utilities', 'Insurance', 'Debt Payments',
      'Other Expenses', 'Total Monthly Expenses', 'Current Emergency Savings', 'Monthly Savings Contribution',
      'Savings interest rate', 'Savings interest rate ({AER|APY})',
      'Recommended Target ({n} months)', 'Monthly Savings Needed', 'Time to Reach Goal',
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
  },
  'mortgage-affordability': {
    name: 'Mortgage Affordability Calculator',
    path: '/tools/debt-and-loans/mortgage-affordability/',
    component: 'MortgageAffordabilityCalc.tsx',
    labels: [
      'Annual Gross Income', 'Monthly Debt Payments', 'Deposit', 'Down Payment', 'Interest Rate', 'Loan Term',
      'Property Tax Rate', 'Annual Insurance', 'HOA Fees', 'DTI Limit', 'Income Spent on Housing', 'PMI Rate',
      'Maximum Home Price', 'Loan Amount', 'Total Monthly Payment', 'Debt-to-Income Ratio',
      'Share of Income on Housing & Debt',
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
    ],
  },
  'solar-payback': {
    name: 'Solar Panel Payback Calculator',
    path: '/tools/saving-and-growth/solar-payback/',
    component: 'SolarPaybackCalc.tsx',
    labels: [
      'System Cost', 'System Size', 'Battery', 'Electricity Tariff', 'Self-Consumption', 'Export Tariff',
      'Tax Credit / Grant',
      'Payback Period', 'Net System Cost', 'Year 1 Savings', '{n}-Year Savings', '{n}-Year ROI',
    ],
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
  },
  'stamp-duty': {
    name: 'Stamp Duty Calculator',
    path: '/tools/economic/stamp-duty/',
    component: 'StampDutyCalc.tsx',
    labels: [
      'Property Price', 'Buyer Type',
      'Stamp Duty (SDLT)', 'Effective Tax Rate',
      // Band rows (en dash), for example "<from> - <to> (2%)" and "<from> - ... (12%)".
      '{n} \u2013 {n} ({n})', '{n} \u2013 ... ({n})',
    ],
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
  },
};

/** True when `slug` is a known email-capable tool. Guards against prototype keys. */
export function isKnownTool(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, slug);
}

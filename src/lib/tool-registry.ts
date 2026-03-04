/**
 * Single source of truth for tool slugs that support email results.
 * Used by worker.ts to validate toolSlug and derive display names server-side.
 * Never trust client-supplied toolName — always derive from this registry.
 */
export const TOOL_REGISTRY: Record<string, string> = {
  'compound-interest': 'Compound Interest Calculator',
  'loan-amortization': 'Loan Amortization Calculator',
  'investment-return': 'Investment Return Calculator',
  'retirement-savings': 'Retirement Savings Calculator',
  'debt-payoff': 'Debt Payoff Calculator',
  'savings-goal': 'Savings Goal Calculator',
  'salary': 'US Salary Calculator',
  'salary-uk': 'UK Salary Calculator',
  'mortgage-payment': 'Mortgage Payment Calculator',
  'inflation': 'Inflation Calculator',
  'roi': 'ROI Calculator',
  'net-worth': 'Net Worth Calculator',
  'rent-vs-buy': 'Rent vs Buy Calculator',
  'emergency-fund': 'Emergency Fund Calculator',
};

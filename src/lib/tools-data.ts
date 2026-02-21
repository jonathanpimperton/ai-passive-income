/**
 * Static tool metadata for navigation, homepage grid, and category labels.
 * This data is used by navigation and page components that need tool info
 * without loading the full content collection.
 */

export const CATEGORIES = {
  'saving-and-growth': {
    label: 'Saving & Growth',
    slug: 'saving-and-growth',
  },
  'debt-and-loans': {
    label: 'Debt & Loans',
    slug: 'debt-and-loans',
  },
  'income-and-planning': {
    label: 'Income & Planning',
    slug: 'income-and-planning',
  },
  economic: {
    label: 'Economic',
    slug: 'economic',
  },
  utility: {
    label: 'Utility Tools',
    slug: 'utility',
  },
  'file-tools': {
    label: 'File Tools',
    slug: 'file-tools',
  },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export interface ToolMeta {
  name: string;
  slug: string;
  category: CategorySlug;
  description: string;
  icon: string; // Lucide icon name
}

/**
 * All 15 MVP tools with metadata for navigation and homepage display.
 * Order within each category matches the build-spec priority.
 */
export const TOOLS: ToolMeta[] = [
  // Saving & Growth
  {
    name: 'Compound Interest Calculator',
    slug: 'compound-interest',
    category: 'saving-and-growth',
    description: 'See how your money grows over time with compound interest.',
    icon: 'trending-up',
  },
  {
    name: 'Investment Return Calculator',
    slug: 'investment-return',
    category: 'saving-and-growth',
    description: 'Calculate your portfolio growth with dividend reinvestment.',
    icon: 'chart-line',
  },
  {
    name: 'Savings Goal Calculator',
    slug: 'savings-goal',
    category: 'saving-and-growth',
    description: 'Find out how much to save each month to reach your goal.',
    icon: 'target',
  },
  {
    name: 'ROI Calculator',
    slug: 'roi',
    category: 'saving-and-growth',
    description: 'Calculate your return on investment and annualized returns.',
    icon: 'percent',
  },
  // Debt & Loans
  {
    name: 'Loan Amortization Calculator',
    slug: 'loan-amortization',
    category: 'debt-and-loans',
    description: 'See your full amortization schedule and total interest paid.',
    icon: 'calculator',
  },
  {
    name: 'Debt Payoff Calculator',
    slug: 'debt-payoff',
    category: 'debt-and-loans',
    description: 'Compare snowball vs avalanche strategies to pay off debt faster.',
    icon: 'credit-card',
  },
  {
    name: 'Rent vs. Buy Calculator',
    slug: 'rent-vs-buy',
    category: 'debt-and-loans',
    description: 'Compare the total cost of renting versus buying over time.',
    icon: 'home',
  },
  // Income & Planning
  {
    name: 'Retirement Savings Calculator',
    slug: 'retirement-savings',
    category: 'income-and-planning',
    description: 'Plan your retirement savings with inflation-adjusted projections.',
    icon: 'piggy-bank',
  },
  {
    name: 'Salary & Take-Home Calculator',
    slug: 'salary',
    category: 'income-and-planning',
    description: 'Convert between salary, hourly, and take-home pay.',
    icon: 'wallet',
  },
  {
    name: 'Net Worth Calculator',
    slug: 'net-worth',
    category: 'income-and-planning',
    description: 'Track your total assets minus liabilities in one place.',
    icon: 'bar-chart-3',
  },
  {
    name: 'Emergency Fund Calculator',
    slug: 'emergency-fund',
    category: 'income-and-planning',
    description: 'Calculate how much you need for a 3, 6, or 12-month emergency fund.',
    icon: 'umbrella',
  },
  // Economic
  {
    name: 'Inflation Calculator',
    slug: 'inflation',
    category: 'economic',
    description: 'See how inflation affects your purchasing power over time.',
    icon: 'trending-down',
  },
  // Utility
  {
    name: 'QR Code Generator',
    slug: 'qr-code',
    category: 'utility',
    description: 'Create free QR codes for URLs, text, and more.',
    icon: 'qr-code',
  },
  {
    name: 'Password Generator',
    slug: 'password-generator',
    category: 'utility',
    description: 'Generate strong, random passwords with customizable options.',
    icon: 'shield-check',
  },
  {
    name: 'JSON Formatter',
    slug: 'json-formatter',
    category: 'utility',
    description: 'Format, validate, and beautify JSON with syntax highlighting.',
    icon: 'braces',
  },
];

/** Get tools filtered by category */
export function getToolsByCategory(category: CategorySlug): ToolMeta[] {
  return TOOLS.filter((t) => t.category === category);
}

/** Get a tool by its slug */
export function getToolBySlug(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Get URL path for a tool */
export function getToolPath(tool: ToolMeta): string {
  return `/tools/${tool.category}/${tool.slug}`;
}

/** Popular tools for homepage — covers all 5 customer segments */
export const POPULAR_TOOL_SLUGS = [
  'compound-interest',
  'loan-amortization',
  'retirement-savings',
  'investment-return',
  'debt-payoff',
  'salary',
];

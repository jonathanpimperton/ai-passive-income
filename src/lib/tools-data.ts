/**
 * Static tool metadata for navigation, homepage grid, and category labels.
 * This data is used by navigation and page components that need tool info
 * without loading the full content collection.
 */

export const CATEGORIES = {
  'saving-and-growth': {
    label: 'Saving & Growth',
    slug: 'saving-and-growth',
    tagline: 'Watch your money compound over time.',
    color: '#047857',
  },
  'debt-and-loans': {
    label: 'Debt & Loans',
    slug: 'debt-and-loans',
    tagline: 'Understand every payment before you sign.',
    color: '#D97706',
  },
  'income-and-planning': {
    label: 'Income & Planning',
    slug: 'income-and-planning',
    tagline: 'Know exactly what you keep and what you need.',
    color: '#2563EB',
  },
  economic: {
    label: 'Economic',
    slug: 'economic',
    tagline: 'Track the forces that affect every pound and dollar.',
    color: '#0B6E6E',
  },
  utility: {
    label: 'Utility Tools',
    slug: 'utility',
    tagline: 'Quick tools for everyday tasks.',
    color: '#555573',
  },
  'file-tools': {
    label: 'File Tools',
    slug: 'file-tools',
    tagline: 'Convert and compress — everything stays in your browser.',
    color: '#C84335',
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
 * All 37 tools (18 MVP + 13 file converters + 6 developer/utility) with metadata for navigation and homepage display.
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
    name: 'Investment Fee Calculator',
    slug: 'investment-fee',
    category: 'saving-and-growth',
    description: 'See how fund fees eat into your returns over time.',
    icon: 'scale',
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
    name: 'Mortgage Payment Calculator',
    slug: 'mortgage-payment',
    category: 'debt-and-loans',
    description: 'Calculate your monthly mortgage payment and total interest.',
    icon: 'landmark',
  },
  {
    name: 'Mortgage Affordability Calculator',
    slug: 'mortgage-affordability',
    category: 'debt-and-loans',
    description: 'Find out how much house you can afford based on your income and debts.',
    icon: 'circle-dollar-sign',
  },
  {
    name: 'Debt Payoff Calculator',
    slug: 'debt-payoff',
    category: 'debt-and-loans',
    description: 'Compare snowball vs avalanche strategies to pay off debt faster.',
    icon: 'credit-card',
  },
  {
    name: 'Credit Card Payoff Calculator',
    slug: 'credit-card-payoff',
    category: 'debt-and-loans',
    description: 'See how long to pay off your credit card and how extra payments save thousands.',
    icon: 'receipt',
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
    name: 'US Salary & Take-Home Calculator',
    slug: 'salary-us',
    category: 'income-and-planning',
    description: 'Calculate US take-home pay after federal and state taxes.',
    icon: 'wallet',
  },
  {
    name: 'UK Salary & Take-Home Calculator',
    slug: 'salary-uk',
    category: 'income-and-planning',
    description: 'Calculate UK take-home pay after Income Tax, NI, and pension.',
    icon: 'coins',
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
    description: 'Create QR codes for URLs, text, Wi-Fi, and more.',
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
    name: 'Percentage Calculator',
    slug: 'percentage-calculator',
    category: 'utility',
    description: 'Calculate percentages, percentage change, and more instantly.',
    icon: 'divide',
  },
  {
    name: 'JSON Formatter',
    slug: 'json-formatter',
    category: 'utility',
    description: 'Format, validate, and beautify JSON with syntax highlighting.',
    icon: 'braces',
  },
  {
    name: 'Base64 Encode/Decode',
    slug: 'base64-encode-decode',
    category: 'utility',
    description: 'Encode text or files to Base64 and decode Base64 back instantly.',
    icon: 'binary',
  },
  {
    name: 'URL Encode/Decode',
    slug: 'url-encode-decode',
    category: 'utility',
    description: 'URL-encode and decode text instantly. Supports component and full URI modes.',
    icon: 'link',
  },
  {
    name: 'JWT Decoder',
    slug: 'jwt-decoder',
    category: 'utility',
    description: 'Decode JWT tokens to inspect header, payload, and expiration.',
    icon: 'key-round',
  },
  // File Tools
  {
    name: 'Image Compressor',
    slug: 'image-compressor',
    category: 'file-tools',
    description: 'Compress JPG, PNG, and WebP images while keeping quality. Files stay in your browser.',
    icon: 'minimize-2',
  },
  {
    name: 'Image Resizer',
    slug: 'image-resizer',
    category: 'file-tools',
    description: 'Resize images by pixels or percentage. Maintains aspect ratio.',
    icon: 'scaling',
  },
  {
    name: 'Image Format Converter',
    slug: 'image-format-converter',
    category: 'file-tools',
    description: 'Convert between PNG, JPG, and WebP instantly in your browser.',
    icon: 'image',
  },
  {
    name: 'SVG to PNG Converter',
    slug: 'svg-to-png',
    category: 'file-tools',
    description: 'Convert SVG files to high-resolution PNG images. Adjustable scale.',
    icon: 'file-image',
  },
  {
    name: 'HEIC to JPG Converter',
    slug: 'heic-to-jpg',
    category: 'file-tools',
    description: 'Convert iPhone HEIC photos to JPG. Files stay in your browser.',
    icon: 'smartphone',
  },
  {
    name: 'CSV ↔ JSON Converter',
    slug: 'csv-json',
    category: 'file-tools',
    description: 'Convert between CSV and JSON formats. Paste or upload, download instantly.',
    icon: 'table',
  },
  {
    name: 'Markdown ↔ HTML Converter',
    slug: 'markdown-html',
    category: 'file-tools',
    description: 'Convert Markdown to HTML and back. Live preview included.',
    icon: 'file-code',
  },
  {
    name: 'Images to PDF',
    slug: 'images-to-pdf',
    category: 'file-tools',
    description: 'Combine multiple images into a single PDF. Reorder pages, set margins.',
    icon: 'file-text',
  },
  {
    name: 'PDF Merge',
    slug: 'pdf-merge',
    category: 'file-tools',
    description: 'Combine multiple PDF files into one document. Files stay in your browser.',
    icon: 'file-plus',
  },
  {
    name: 'PDF Split',
    slug: 'pdf-split',
    category: 'file-tools',
    description: 'Extract pages from a PDF or split into individual pages.',
    icon: 'scissors',
  },
  {
    name: 'PDF Compress',
    slug: 'pdf-compress',
    category: 'file-tools',
    description: 'Reduce PDF file size by optimizing embedded images.',
    icon: 'archive',
  },
  {
    name: 'PDF to Image Converter',
    slug: 'pdf-to-image',
    category: 'file-tools',
    description: 'Convert PDF pages to JPG or PNG images in your browser.',
    icon: 'image-down',
  },
  {
    name: 'Excel to PDF Converter',
    slug: 'excel-to-pdf',
    category: 'file-tools',
    description: 'Convert Excel spreadsheets and CSV files to PDF.',
    icon: 'sheet',
  },
  {
    name: 'JSON ↔ YAML Converter',
    slug: 'json-yaml',
    category: 'file-tools',
    description: 'Convert between JSON and YAML formats instantly.',
    icon: 'file-json',
  },
  {
    name: 'JSON ↔ XML Converter',
    slug: 'json-xml',
    category: 'file-tools',
    description: 'Convert between JSON and XML formats with attribute support.',
    icon: 'file-code-2',
  },
  {
    name: 'PNG to ICO Converter',
    slug: 'png-to-ico',
    category: 'file-tools',
    description: 'Convert PNG images to ICO favicon files with multiple sizes.',
    icon: 'app-window',
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

/** Popular tools for homepage — high search volume + affiliate revenue potential */
export const POPULAR_TOOL_SLUGS = [
  'mortgage-payment',      // ~3.35M monthly searches — LendingTree affiliate
  'compound-interest',     // ~150-300K monthly searches — Betterment affiliate
  'loan-amortization',     // ~100K monthly searches — LendingTree affiliate
  'retirement-savings',    // ~100K monthly searches — Betterment affiliate
  'salary-uk',             // ~250K monthly searches — Nutmeg/InvestEngine affiliate
  'debt-payoff',           // ~50K monthly searches — SoFi affiliate
];

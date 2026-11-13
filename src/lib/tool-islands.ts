/**
 * Which interactive island renders each tool, and which tools can be embedded.
 *
 * One source for three consumers:
 * - `src/components/ui/ToolIsland.astro` renders the island (the static import
 *   switch lives there because Astro needs literal `client:*` usages),
 * - `src/pages/tools/[category]/[tool].astro` (full tool pages), and
 * - `src/pages/embed/*` (embed v2 route + snippet generator, plan decision D6).
 *
 * The component name doubles as the client chunk name (`_astro/<Name>.<hash>.js`),
 * which `island-preload.ts` uses to emit modulepreload hints.
 */
import type { CategorySlug } from './tools-data';

export const TOOL_COMPONENTS: Record<string, string> = {
  'compound-interest': 'CompoundInterestCalc',
  'loan-amortization': 'LoanAmortizationCalc',
  'investment-return': 'InvestmentReturnCalc',
  'investment-fee': 'InvestmentFeeCalc',
  'retirement-savings': 'RetirementSavingsCalc',
  'retirement-contribution': 'RetirementContributionCalc',
  'retirement-age': 'RetirementAgeCalc',
  'debt-payoff': 'DebtPayoffCalc',
  'savings-goal': 'SavingsGoalCalc',
  'qr-code': 'QrCodeGenerator',
  'password-generator': 'PasswordGenerator',
  'emergency-fund': 'EmergencyFundCalc',
  'roi': 'RoiCalc',
  'inflation': 'InflationCalc',
  'salary-us': 'SalaryCalc',
  'salary-uk': 'SalaryUkCalc',
  'net-worth': 'NetWorthCalc',
  'rent-vs-buy': 'RentVsBuyCalc',
  'mortgage-payment': 'MortgagePaymentCalc',
  'mortgage-affordability': 'MortgageAffordabilityCalc',
  'percentage-calculator': 'PercentageCalculator',
  'json-formatter': 'JsonFormatter',
  'image-compressor': 'ImageCompressor',
  'image-resizer': 'ImageResizer',
  'image-format-converter': 'ImageFormatConverter',
  'svg-to-png': 'SvgToPngConverter',
  'heic-to-jpg': 'HeicToJpgConverter',
  'csv-json': 'CsvJsonConverter',
  'markdown-html': 'MarkdownHtmlConverter',
  'images-to-pdf': 'ImagesToPdf',
  'pdf-merge': 'PdfMerge',
  'pdf-split': 'PdfSplit',
  'pdf-compress': 'PdfCompress',
  'pdf-to-image': 'PdfToImage',
  'excel-to-pdf': 'ExcelToPdf',
  'base64-encode-decode': 'Base64EncodeDecode',
  'url-encode-decode': 'UrlEncodeDecode',
  'jwt-decoder': 'JwtDecoder',
  'json-yaml': 'JsonYamlConverter',
  'json-xml': 'JsonXmlConverter',
  'png-to-ico': 'PngToIco',
  'credit-card-payoff': 'CreditCardPayoffCalc',
  'solar-payback': 'SolarPaybackCalc',
  'car-finance': 'CarFinanceCalc',
  'stamp-duty': 'StampDutyCalc',
  'capital-gains-tax': 'CapitalGainsTaxCalc',
};

/** Island used for a tool that has no calculator yet. */
export const PLACEHOLDER_COMPONENT = 'PlaceholderCalc';

/** Component (= client chunk) name for a tool slug. */
export function toolComponent(slug: string): string {
  return TOOL_COMPONENTS[slug] ?? PLACEHOLDER_COMPONENT;
}

/**
 * Only the financial calculators are offered as embeds (D6); file converters
 * and developer utilities need the full page (drop zones, long outputs).
 */
export const EMBEDDABLE_CATEGORIES: ReadonlySet<CategorySlug> = new Set<CategorySlug>([
  'saving-and-growth',
  'debt-and-loans',
  'income-and-planning',
  'economic',
]);

export function isEmbeddable(category: CategorySlug, slug: string): boolean {
  return EMBEDDABLE_CATEGORIES.has(category) && slug in TOOL_COMPONENTS;
}

/** Path of the embed v2 route for a tool (always with trailing slash). */
export function embedPath(slug: string): string {
  return `/embed/${slug}/`;
}

/** Allowed values for the embed `?theme=` parameter; anything else means light. */
export const EMBED_THEMES = ['light', 'dark', 'auto'] as const;
export type EmbedTheme = (typeof EMBED_THEMES)[number];

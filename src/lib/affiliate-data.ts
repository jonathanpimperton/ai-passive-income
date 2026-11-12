/**
 * Affiliate partner metadata, URL builder, region rules and risk wording.
 *
 * Partners with live CJ tracking links use their tracked URLs directly.
 * Partners pending approval still use public landing pages with UTM parameters.
 * The buildAffiliateUrl() function only appends UTM params to non-tracked URLs.
 *
 * Regions (review CALC-UX-B-09, HOME-CHROME-10)
 * - Every partner lists the regions it serves: 'US', 'UK', 'EU'.
 * - A page with a fixed region (UK-only stamp duty and UK salary, US-only
 *   salary and CPI inflation, region-specific comparisons) only ever shows
 *   partners for that region -- decided at build time.
 * - Any other page follows the visitor's display currency
 *   (USD=US, GBP=UK, EUR=EU), decided in the browser: AffiliateLinks via the
 *   `data-currency-region` attribute on <html>, ResultAffiliate via the
 *   shared currency store. No partner is shown for a region it doesn't serve.
 *
 * Risk wording
 * - "Your home may be repossessed..." appears only on secured-lending pages
 *   (mortgage payment, affordability, rent-vs-buy and the mortgage
 *   comparisons), never on car, card, debt or personal-loan pages.
 * - "Capital at risk..." appears only where an investing partner is shown.
 */
import type { CurrencyRegion } from './currency';

export type PartnerRegion = CurrencyRegion;

export interface AffiliatePartner {
  /** Key used in tool frontmatter affiliatePrograms array */
  id: string;
  /** Display name */
  name: string;
  /** One-line value proposition */
  tagline: string;
  /** Base URL -- tracked affiliate link or partner landing page */
  url: string;
  /** Short category label */
  category: string;
  /** Lucide icon name */
  icon: string;
  /** Whether this URL is already a tracked affiliate link (skip UTM append) */
  tracked?: boolean;
  /** Regions where the product is available to consumers. */
  regions: readonly PartnerRegion[];
  /** Investment product: capital is at risk (drives the risk warning). */
  investing?: boolean;
}

const ALL_REGIONS: readonly PartnerRegion[] = ['US', 'UK', 'EU'];

export const AFFILIATE_PARTNERS: Record<string, AffiliatePartner> = {
  Betterment: {
    id: 'Betterment',
    name: 'Betterment',
    tagline: 'Automated investing with no minimum balance',
    url: 'https://www.betterment.com/',
    category: 'Investing',
    icon: 'trending-up',
    regions: ['US'],
    investing: true,
  },
  Wealthfront: {
    id: 'Wealthfront',
    name: 'Wealthfront',
    tagline: 'Automated investing and tax-loss harvesting',
    url: 'https://www.wealthfront.com/',
    category: 'Investing',
    icon: 'chart-line',
    regions: ['US'],
    investing: true,
  },
  SoFi: {
    id: 'SoFi',
    name: 'SoFi',
    tagline: 'Loans, investing, and banking — all in one app',
    url: 'https://www.sofi.com/',
    category: 'Banking',
    icon: 'wallet',
    regions: ['US'],
  },
  LendingTree: {
    id: 'LendingTree',
    name: 'LendingTree',
    tagline: 'Compare mortgage rates from multiple lenders',
    url: 'https://www.lendingtree.com/',
    category: 'Mortgages',
    icon: 'landmark',
    regions: ['US'],
  },
  Ally: {
    id: 'Ally',
    name: 'Ally Bank',
    tagline: 'Online savings with competitive APY and no fees',
    url: 'https://www.ally.com/',
    category: 'Savings',
    icon: 'shield-check',
    regions: ['US'],
  },
  NordPass: {
    id: 'NordPass',
    name: 'NordPass',
    tagline: 'Simple, secure password management',
    url: 'https://go.nordpass.io/aff_c?offer_id=490&aff_id=34741&url_id=25686',
    category: 'Security',
    icon: 'lock',
    tracked: true,
    regions: ALL_REGIONS,
  },
  NordVPN: {
    id: 'NordVPN',
    name: 'NordVPN',
    tagline: 'Protect your privacy online with a trusted VPN',
    url: 'https://go.nordvpn.net/aff_c?aff_id=2495&offer_id=312&url_id=2584',
    category: 'Privacy',
    icon: 'shield',
    tracked: true,
    regions: ALL_REGIONS,
  },
  Nutmeg: {
    id: 'Nutmeg',
    name: 'Nutmeg',
    tagline: 'UK investing made simple — ISAs, pensions, and more',
    url: 'https://www.nutmeg.com/',
    category: 'Investing (UK)',
    icon: 'trending-up',
    regions: ['UK'],
    investing: true,
  },
  InvestEngine: {
    id: 'InvestEngine',
    name: 'InvestEngine',
    tagline: 'Commission-free ETF investing in the UK',
    url: 'https://investengine.com/',
    category: 'Investing (UK)',
    icon: 'chart-line',
    regions: ['UK'],
    investing: true,
  },
};

/**
 * Pages whose content only applies in one region. Keys are tool slugs and
 * comparison slugs (the `toolSlug` AffiliateLinks/ResultAffiliate receive).
 */
export const PAGE_REGIONS: Readonly<Record<string, PartnerRegion>> = {
  // Tools
  'stamp-duty': 'UK',
  'salary-uk': 'UK',
  'salary-us': 'US',
  inflation: 'US', // US CPI-U data
  // Comparisons
  'cash-isa-vs-savings-account': 'UK',
  'isa-vs-general-investment': 'UK',
  'lisa-vs-regular-isa': 'UK',
  'pension-vs-isa-uk': 'UK',
  'pcp-vs-hp-vs-personal-loan': 'UK',
  'roth-ira-vs-roth-401k': 'US',
  'roth-vs-traditional-401k': 'US',
};

/** The fixed region of a page, or null when it follows the visitor's currency. */
export function pageRegionFor(slug: string | undefined | null): PartnerRegion | null {
  if (!slug) return null;
  return PAGE_REGIONS[slug] ?? null;
}

/** Whether a partner serves a region. */
export function partnerServes(partner: Pick<AffiliatePartner, 'regions'>, region: PartnerRegion): boolean {
  return partner.regions.includes(region);
}

/**
 * Secured lending: a mortgage is secured on the home, so promotions must
 * carry the repossession warning. Car, card, debt and personal loans are
 * unsecured and must not.
 */
export const SECURED_LENDING_SLUGS: ReadonlySet<string> = new Set([
  'mortgage-payment',
  'mortgage-affordability',
  'rent-vs-buy',
  '15-year-vs-30-year-mortgage',
  'fixed-vs-variable-rate-mortgage',
  'renting-vs-buying-2026',
]);

export const REPOSSESSION_WARNING = 'Your home may be repossessed if you do not keep up repayments on your mortgage.';
export const CAPITAL_AT_RISK_WARNING = 'Capital at risk: the value of investments can go down as well as up.';

export function isSecuredLendingPage(slug: string | undefined | null): boolean {
  return !!slug && SECURED_LENDING_SLUGS.has(slug);
}

/**
 * Risk sentences that must accompany these partners on this page:
 * the repossession warning on secured-lending pages, the capital-at-risk
 * warning when any partner is an investment product.
 */
export function riskWarningsFor(slug: string | undefined | null, partners: readonly Pick<AffiliatePartner, 'investing'>[]): string[] {
  const out: string[] = [];
  if (isSecuredLendingPage(slug)) out.push(REPOSSESSION_WARNING);
  if (partners.some((p) => p.investing)) out.push(CAPITAL_AT_RISK_WARNING);
  return out;
}

/**
 * Build a URL for an affiliate partner link.
 * Tracked links (from CJ/Impact) are returned as-is.
 * Untracked links get UTM parameters appended for GA4 attribution.
 */
export function buildAffiliateUrl(partnerId: string, toolSlug: string): string {
  const partner = AFFILIATE_PARTNERS[partnerId];
  if (!partner) return '#';

  if (partner.tracked) return partner.url;

  const base = partner.url;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}utm_source=calcrun&utm_medium=affiliate&utm_campaign=${toolSlug}`;
}

/**
 * Resolve an array of partner IDs to full partner objects.
 * Silently skips unknown IDs (frontmatter may list retired partners, e.g. LendingClub).
 */
export function resolvePartners(ids: string[]): AffiliatePartner[] {
  return ids
    .map((id) => AFFILIATE_PARTNERS[id])
    .filter((p): p is AffiliatePartner => p != null);
}

/**
 * Partners to render for a page. On a fixed-region page only that region's
 * partners; elsewhere all of them (the browser then hides the ones that don't
 * serve the visitor's currency region).
 */
export function partnersForPage(ids: string[], slug: string | undefined | null): AffiliatePartner[] {
  const partners = resolvePartners(ids);
  const region = pageRegionFor(slug);
  return region ? partners.filter((p) => partnerServes(p, region)) : partners;
}

/**
 * Classic inline script for AffiliateLinks: sets <html data-currency-region>
 * (US | UK | EU) before the partner rows are parsed, from the stored currency
 * if valid, else the region default -- the same rule as currency.ts. Expects
 * SAFE_STORAGE_INLINE_JS and REGION_INLINE_JS to run first. Constant text,
 * so a CSP hash for it stays stable.
 */
export const CURRENCY_REGION_INLINE_JS =
  '(function(){var d=document.documentElement;if(d.getAttribute("data-currency-region"))return;' +
  'var c=window.calcrunStore?window.calcrunStore.get("calcrun.currency"):null;' +
  'if(c!=="USD"&&c!=="GBP"&&c!=="EUR"){var r=window.calcrunRegion;c=r==="UK"?"GBP":r==="EEA"?"EUR":"USD";}' +
  'd.setAttribute("data-currency-region",c==="GBP"?"UK":c==="EUR"?"EU":"US");})();';

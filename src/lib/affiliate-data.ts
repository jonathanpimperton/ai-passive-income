/**
 * Affiliate partner metadata and URL builder.
 *
 * Partners with live CJ tracking links use their tracked URLs directly.
 * Partners pending approval still use public landing pages with UTM parameters.
 * The buildAffiliateUrl() function only appends UTM params to non-tracked URLs.
 */

export interface AffiliatePartner {
  /** Key used in tool frontmatter affiliatePrograms array */
  id: string;
  /** Display name */
  name: string;
  /** One-line value proposition */
  tagline: string;
  /** Base URL — tracked affiliate link or partner landing page */
  url: string;
  /** Short category label */
  category: string;
  /** Lucide icon name */
  icon: string;
  /** Whether this URL is already a tracked affiliate link (skip UTM append) */
  tracked?: boolean;
}

export const AFFILIATE_PARTNERS: Record<string, AffiliatePartner> = {
  Betterment: {
    id: 'Betterment',
    name: 'Betterment',
    tagline: 'Automated investing with no minimum balance',
    url: 'https://www.betterment.com/',
    category: 'Investing',
    icon: 'trending-up',
  },
  Wealthfront: {
    id: 'Wealthfront',
    name: 'Wealthfront',
    tagline: 'Automated investing and tax-loss harvesting',
    url: 'https://www.wealthfront.com/',
    category: 'Investing',
    icon: 'chart-line',
  },
  SoFi: {
    id: 'SoFi',
    name: 'SoFi',
    tagline: 'Loans, investing, and banking — all in one app',
    url: 'https://www.sofi.com/',
    category: 'Banking',
    icon: 'wallet',
  },
  LendingTree: {
    id: 'LendingTree',
    name: 'LendingTree',
    tagline: 'Compare mortgage rates from multiple lenders',
    url: 'https://www.lendingtree.com/',
    category: 'Mortgages',
    icon: 'landmark',
  },
  Ally: {
    id: 'Ally',
    name: 'Ally Bank',
    tagline: 'Online savings with competitive APY and no fees',
    url: 'https://www.ally.com/',
    category: 'Savings',
    icon: 'shield-check',
  },
  NordPass: {
    id: 'NordPass',
    name: 'NordPass',
    tagline: 'Simple, secure password management',
    url: 'https://go.nordpass.io/aff_c?offer_id=490&aff_id=34741&url_id=25686',
    category: 'Security',
    icon: 'lock',
    tracked: true,
  },
  NordVPN: {
    id: 'NordVPN',
    name: 'NordVPN',
    tagline: 'Protect your privacy online with a trusted VPN',
    url: 'https://go.nordvpn.net/aff_c?aff_id=2495&offer_id=312&url_id=2584',
    category: 'Privacy',
    icon: 'shield',
    tracked: true,
  },
  Nutmeg: {
    id: 'Nutmeg',
    name: 'Nutmeg',
    tagline: 'UK investing made simple — ISAs, pensions, and more',
    url: 'https://www.nutmeg.com/',
    category: 'Investing (UK)',
    icon: 'trending-up',
  },
  InvestEngine: {
    id: 'InvestEngine',
    name: 'InvestEngine',
    tagline: 'Commission-free ETF investing in the UK',
    url: 'https://investengine.com/',
    category: 'Investing (UK)',
    icon: 'chart-line',
  },
};

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
 * Silently skips unknown IDs.
 */
export function resolvePartners(ids: string[]): AffiliatePartner[] {
  return ids
    .map((id) => AFFILIATE_PARTNERS[id])
    .filter((p): p is AffiliatePartner => p != null);
}

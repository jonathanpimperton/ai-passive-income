/**
 * Affiliate partner metadata and UTM URL builder.
 * Each partner has a base URL (landing page or signup link) and descriptive copy.
 * Actual affiliate tracking parameters will be added once partnership agreements are live.
 *
 * For now, all URLs point to the partner's public landing pages with UTM parameters
 * so we can track click-through from CalcRun in Google Analytics.
 */

export interface AffiliatePartner {
  /** Key used in tool frontmatter affiliatePrograms array */
  id: string;
  /** Display name */
  name: string;
  /** One-line value proposition */
  tagline: string;
  /** Base URL (partner landing page) */
  url: string;
  /** Short category label */
  category: string;
  /** Lucide icon name */
  icon: string;
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
  Marcus: {
    id: 'Marcus',
    name: 'Marcus by Goldman Sachs',
    tagline: 'High-yield savings with no fees or minimums',
    url: 'https://www.marcus.com/',
    category: 'Savings',
    icon: 'piggy-bank',
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
  LendingClub: {
    id: 'LendingClub',
    name: 'LendingClub',
    tagline: 'Personal loans to consolidate and pay off debt',
    url: 'https://www.lendingclub.com/',
    category: 'Loans',
    icon: 'credit-card',
  },
  Ally: {
    id: 'Ally',
    name: 'Ally Bank',
    tagline: 'Online savings with competitive APY and no fees',
    url: 'https://www.ally.com/',
    category: 'Savings',
    icon: 'shield-check',
  },
  Vanguard: {
    id: 'Vanguard',
    name: 'Vanguard',
    tagline: 'Low-cost index funds for long-term growth',
    url: 'https://investor.vanguard.com/',
    category: 'Investing',
    icon: 'bar-chart-3',
  },
  '1Password': {
    id: '1Password',
    name: '1Password',
    tagline: 'Secure password manager for every device',
    url: 'https://1password.com/',
    category: 'Security',
    icon: 'key-round',
  },
  NordPass: {
    id: 'NordPass',
    name: 'NordPass',
    tagline: 'Simple, secure password management',
    url: 'https://nordpass.com/',
    category: 'Security',
    icon: 'lock',
  },
  NordVPN: {
    id: 'NordVPN',
    name: 'NordVPN',
    tagline: 'Protect your privacy online with a trusted VPN',
    url: 'https://nordvpn.com/',
    category: 'Privacy',
    icon: 'shield',
  },
  Nutmeg: {
    id: 'Nutmeg',
    name: 'Nutmeg',
    tagline: 'UK investing made simple — ISAs, pensions, and more',
    url: 'https://www.nutmeg.com/',
    category: 'Investing (UK)',
    icon: 'trending-up',
  },
  Moneybox: {
    id: 'Moneybox',
    name: 'Moneybox',
    tagline: 'Save and invest for your future, starting from £1',
    url: 'https://www.moneyboxapp.com/',
    category: 'Savings (UK)',
    icon: 'coins',
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
 * Build a UTM-tagged URL for an affiliate partner link.
 * Once real affiliate tracking IDs are set up, this function
 * will append the correct tracking parameters.
 */
export function buildAffiliateUrl(partnerId: string, toolSlug: string): string {
  const partner = AFFILIATE_PARTNERS[partnerId];
  if (!partner) return '#';

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

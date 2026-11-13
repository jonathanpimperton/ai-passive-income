/**
 * Inline affiliate recommendation for calculator results panels.
 * Renders a slim bordered row (not a colored box) with the FTC
 * disclosure above the partner link, matching AffiliateLinks.astro.
 * Only shows for calculators with a natural affiliate fit.
 *
 * Region (review CALC-UX-B-09, HOME-CHROME-10): the first configured partner
 * that serves the page's region is shown, or nothing. The region is the
 * `region` prop, else the page's fixed region (stamp duty and UK salary are
 * UK-only), else the visitor's display currency (USD=US, GBP=UK, EUR=EU).
 * Nothing renders on the server or during hydration (the visitor's currency
 * isn't known yet), so there is no hydration mismatch (CALC-UX-A-13) and no
 * US partner ever flashes for a UK visitor. Never renders inside an embed.
 */

import { currencyRegion, useResolvedCurrency } from '@lib/currency';
import {
  AFFILIATE_PARTNERS,
  pageRegionFor,
  partnerServes,
  riskWarningsFor,
  type AffiliatePartner,
  type PartnerRegion,
} from '@lib/affiliate-data';

interface InlinePartner {
  /** Key in AFFILIATE_PARTNERS (supplies name, URL, regions). */
  id: string;
  /** Overrides the partner's default tagline for this tool. */
  tagline?: string;
  bestFor?: string;
  /** Overrides the tool's call to action when this partner is shown. */
  cta?: string;
}

interface ToolAffiliateConfig {
  cta: string;
  /** In preference order; the first one serving the region is shown. */
  partners: InlinePartner[];
}

const RESULT_AFFILIATES: Record<string, ToolAffiliateConfig> = {
  'mortgage-payment': {
    cta: 'Compare rates from multiple lenders',
    partners: [{ id: 'LendingTree', tagline: 'See personalised mortgage rates in minutes', bestFor: 'Best for comparing rates' }],
  },
  'compound-interest': {
    cta: 'Start growing your money',
    partners: [{ id: 'Betterment', bestFor: 'Best for automated investing' }],
  },
  'debt-payoff': {
    cta: 'See if you can consolidate at a lower rate',
    partners: [{ id: 'SoFi', tagline: 'Personal loans from 8.99% APR', bestFor: 'Best for debt consolidation' }],
  },
  'retirement-savings': {
    cta: 'Open a retirement account',
    partners: [{ id: 'Betterment', bestFor: 'Best for hands-off retirement' }],
  },
  'retirement-contribution': {
    cta: 'Start saving for retirement',
    partners: [{ id: 'Betterment', bestFor: 'Best for automated saving' }],
  },
  'retirement-age': {
    cta: 'Start building toward retirement',
    partners: [{ id: 'Betterment', bestFor: 'Best for long-term growth' }],
  },
  'investment-return': {
    cta: 'Start investing with low fees',
    partners: [{ id: 'Betterment', bestFor: 'Best for low-fee investing' }],
  },
  'investment-fee': {
    cta: 'Switch to a low-fee investment platform',
    partners: [
      { id: 'Betterment', tagline: 'Automated investing — 0.25% annual fee, no trade commissions', bestFor: 'Best for low fees' },
      { id: 'InvestEngine', bestFor: 'Best for low fees' },
    ],
  },
  'savings-goal': {
    cta: 'Earn more on your savings',
    partners: [{ id: 'SoFi', tagline: 'High-yield savings with no account fees', bestFor: 'Best for high-yield savings' }],
  },
  'loan-amortization': {
    cta: 'Compare loan rates',
    partners: [{ id: 'LendingTree', tagline: 'See personalised loan rates in minutes', bestFor: 'Best for comparing rates' }],
  },
  'rent-vs-buy': {
    cta: 'Get pre-approved for a mortgage',
    partners: [{ id: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders', bestFor: 'Best for comparing rates' }],
  },
  'mortgage-affordability': {
    cta: 'Get pre-approved and see your rate',
    partners: [{ id: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders', bestFor: 'Best for comparing rates' }],
  },
  'credit-card-payoff': {
    cta: 'Pay off your card faster with a lower rate',
    partners: [{ id: 'SoFi', tagline: 'Consolidate credit card debt — low rates, no hidden fees', bestFor: 'Best for consolidation' }],
  },
  'car-finance': {
    cta: 'Compare auto loan rates',
    partners: [{ id: 'LendingTree', tagline: 'Compare car loan rates from multiple lenders in minutes', bestFor: 'Best for rate comparison' }],
  },
  'stamp-duty': {
    // UK-only page: the US lender never shows here (no UK mortgage partner yet).
    cta: 'Compare mortgage rates for your purchase',
    partners: [{ id: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders in minutes', bestFor: 'Best for comparing rates' }],
  },
  'capital-gains-tax': {
    cta: 'Reduce your tax bill with tax-loss harvesting',
    partners: [
      { id: 'Betterment', tagline: 'Automated tax-loss harvesting — keep more of your gains', bestFor: 'Best for tax efficiency' },
      { id: 'Nutmeg', cta: 'Shelter future gains in a Stocks and Shares ISA', bestFor: 'Best for ISAs' },
    ],
  },
};

export interface ResolvedInlineAffiliate {
  cta: string;
  partner: AffiliatePartner;
  tagline: string;
  bestFor?: string;
  disclosure: string;
}

/**
 * The inline affiliate for a tool in a region, or null. Pure (unit-tested
 * over every tool x region).
 */
export function resolveInlineAffiliate(toolSlug: string, region: PartnerRegion): ResolvedInlineAffiliate | null {
  const config = RESULT_AFFILIATES[toolSlug];
  if (!config) return null;
  for (const entry of config.partners) {
    const partner = AFFILIATE_PARTNERS[entry.id];
    if (!partner || !partnerServes(partner, region)) continue;
    const warnings = riskWarningsFor(toolSlug, [partner]);
    return {
      cta: entry.cta ?? config.cta,
      partner,
      tagline: entry.tagline ?? partner.tagline,
      bestFor: entry.bestFor,
      disclosure: [
        partner.tracked ? 'Affiliate link: we may earn a commission at no extra cost to you.' : 'We are not paid for this link.',
        ...warnings,
      ].join(' '),
    };
  }
  return null;
}

/** Tool slugs with an inline affiliate configured. */
export const INLINE_AFFILIATE_TOOLS: readonly string[] = Object.keys(RESULT_AFFILIATES);

function buildUrl(partner: AffiliatePartner, toolSlug: string): string {
  if (partner.tracked) return partner.url;
  const sep = partner.url.includes('?') ? '&' : '?';
  return `${partner.url}${sep}utm_source=calcrun&utm_medium=affiliate&utm_campaign=${toolSlug}`;
}

interface ResultAffiliateProps {
  toolSlug: string;
  /**
   * Region this result applies to, when the calculator knows better than the
   * page (e.g. capital gains in UK mode). Default: the page's fixed region,
   * else the visitor's display currency.
   */
  region?: PartnerRegion;
}

/** Embeds (embed v2 /embed/<tool>/, or legacy ?embed) never carry affiliate links. */
function isEmbed(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    !!document.body?.classList.contains('embed-mode') ||
    window.location.pathname.startsWith('/embed/') ||
    new URLSearchParams(window.location.search).has('embed')
  );
}

export default function ResultAffiliate({ toolSlug, region }: ResultAffiliateProps) {
  const currency = useResolvedCurrency();
  if (currency === null) return null; // server render / hydration: visitor's region unknown
  if (isEmbed()) return null; // client-only check, so it cannot cause a hydration mismatch

  const effectiveRegion = region ?? pageRegionFor(toolSlug) ?? currencyRegion(currency);
  const resolved = resolveInlineAffiliate(toolSlug, effectiveRegion);
  if (!resolved) return null;
  const { cta, partner, tagline, bestFor, disclosure } = resolved;

  return (
    <div data-pdf-hide data-embed-hide className="mt-6 mb-6 rounded-lg border border-neutral-200/80 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {cta}
      </p>
      {/* FTC disclosure -- before the link */}
      <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
        {disclosure}{' '}
        <a href="/disclosure/" className="underline hover:text-primary-600 transition-colors duration-150">
          Disclosure
        </a>
      </p>
      <div className="mt-3 pt-3 border-t border-neutral-200/80 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-neutral-900">{partner.name}</span>
            {bestFor && (
              <span className="text-xs text-neutral-500">{bestFor}</span>
            )}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{tagline}</p>
        </div>
        {partner.tracked && <span className="shrink-0 text-xs text-neutral-500">Affiliate link</span>}
        <a
          href={buildUrl(partner, toolSlug)}
          target="_blank"
          rel="noopener sponsored"
          data-affiliate-partner={partner.name.toLowerCase().replace(/\s+/g, '-')}
          data-affiliate-placement="inline"
          className="affiliate-link shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-150 whitespace-nowrap"
        >
          Visit {partner.name} <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
  );
}

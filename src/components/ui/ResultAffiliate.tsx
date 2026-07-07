/**
 * Inline affiliate recommendation for calculator results panels.
 * Renders a slim bordered row (not a colored box) with the FTC
 * disclosure above the partner link, matching AffiliateLinks.astro.
 * Only shows for calculators with a natural affiliate fit.
 */

import { getSavedCurrency } from '@lib/currency';

interface PartnerConfig {
  name: string;
  tagline: string;
  url: string;
  tracked?: boolean;
  bestFor?: string;
}

interface ToolAffiliateConfig {
  cta: string;
  partners: PartnerConfig[];
  /** US-only partners (e.g. LendingTree) — hidden when display currency isn't USD. */
  usOnly?: boolean;
}

const RESULT_AFFILIATES: Record<string, ToolAffiliateConfig> = {
  'mortgage-payment': {
    cta: 'Compare rates from multiple lenders',
    usOnly: true,
    partners: [{
      name: 'LendingTree',
      tagline: 'See personalised mortgage rates in minutes',
      url: 'https://www.lendingtree.com/',
      bestFor: 'Best for comparing rates',
    }],
  },
  'compound-interest': {
    cta: 'Start growing your money',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for automated investing',
    }],
  },
  'debt-payoff': {
    cta: 'See if you can consolidate at a lower rate',
    partners: [{
      name: 'SoFi',
      tagline: 'Personal loans from 8.99% APR',
      url: 'https://www.sofi.com/',
      bestFor: 'Best for debt consolidation',
    }],
  },
  'retirement-savings': {
    cta: 'Open a retirement account',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for hands-off retirement',
    }],
  },
  'retirement-contribution': {
    cta: 'Start saving for retirement',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for automated saving',
    }],
  },
  'retirement-age': {
    cta: 'Start building toward retirement',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for long-term growth',
    }],
  },
  'investment-return': {
    cta: 'Start investing with low fees',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for low-fee investing',
    }],
  },
  'investment-fee': {
    cta: 'Switch to a low-fee investment platform',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing — 0.25% annual fee, no trade commissions',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for low fees',
    }],
  },
  'savings-goal': {
    cta: 'Earn more on your savings',
    partners: [{
      name: 'SoFi',
      tagline: 'High-yield savings with no account fees',
      url: 'https://www.sofi.com/',
      bestFor: 'Best for high-yield savings',
    }],
  },
  'loan-amortization': {
    cta: 'Compare loan rates',
    usOnly: true,
    partners: [{
      name: 'LendingTree',
      tagline: 'See personalised loan rates in minutes',
      url: 'https://www.lendingtree.com/',
      bestFor: 'Best for comparing rates',
    }],
  },
  'rent-vs-buy': {
    cta: 'Get pre-approved for a mortgage',
    usOnly: true,
    partners: [{
      name: 'LendingTree',
      tagline: 'Compare mortgage rates from multiple lenders',
      url: 'https://www.lendingtree.com/',
      bestFor: 'Best for comparing rates',
    }],
  },
  'mortgage-affordability': {
    cta: 'Get pre-approved and see your rate',
    usOnly: true,
    partners: [{
      name: 'LendingTree',
      tagline: 'Compare mortgage rates from multiple lenders',
      url: 'https://www.lendingtree.com/',
      bestFor: 'Best for comparing rates',
    }],
  },
  'credit-card-payoff': {
    cta: 'Pay off your card faster with a lower rate',
    partners: [{
      name: 'SoFi',
      tagline: 'Consolidate credit card debt — low rates, no hidden fees',
      url: 'https://www.sofi.com/',
      bestFor: 'Best for consolidation',
    }],
  },
  'car-finance': {
    cta: 'Compare auto loan rates',
    usOnly: true,
    partners: [{
      name: 'LendingTree',
      tagline: 'Compare car loan rates from multiple lenders in minutes',
      url: 'https://www.lendingtree.com/',
      bestFor: 'Best for rate comparison',
    }],
  },
  'stamp-duty': {
    cta: 'Compare mortgage rates for your purchase',
    usOnly: true,
    partners: [{
      name: 'LendingTree',
      tagline: 'Compare mortgage rates from multiple lenders in minutes',
      url: 'https://www.lendingtree.com/',
      bestFor: 'Best for comparing rates',
    }],
  },
  'capital-gains-tax': {
    cta: 'Reduce your tax bill with tax-loss harvesting',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated tax-loss harvesting — keep more of your gains',
      url: 'https://www.betterment.com/',
      bestFor: 'Best for tax efficiency',
    }],
  },
};

function buildUrl(partner: PartnerConfig, toolSlug: string): string {
  if (partner.tracked) return partner.url;
  const sep = partner.url.includes('?') ? '&' : '?';
  return `${partner.url}${sep}utm_source=calcrun&utm_medium=affiliate&utm_campaign=${toolSlug}`;
}

interface ResultAffiliateProps {
  toolSlug: string;
}

export default function ResultAffiliate({ toolSlug }: ResultAffiliateProps) {
  const config = RESULT_AFFILIATES[toolSlug];
  if (!config) return null;

  // US-only partners are irrelevant to GBP/EUR users — hide entirely.
  if (config.usOnly && getSavedCurrency() !== 'USD') return null;

  const partner = config.partners[0];
  if (!partner) return null;

  const LOAN_TOOLS = new Set(['mortgage-payment', 'mortgage-affordability', 'loan-amortization', 'rent-vs-buy', 'credit-card-payoff', 'debt-payoff', 'car-finance', 'stamp-duty']);
  const INVEST_TOOLS = new Set(['compound-interest', 'investment-return', 'investment-fee', 'retirement-savings', 'retirement-contribution', 'retirement-age', 'savings-goal', 'capital-gains-tax']);

  let disclosure: string;
  if (LOAN_TOOLS.has(toolSlug)) {
    disclosure = 'We may earn a commission. Your home may be repossessed if you do not keep up repayments on your mortgage.';
  } else if (INVEST_TOOLS.has(toolSlug)) {
    disclosure = 'We may earn a commission. Capital at risk — the value of investments can go down as well as up.';
  } else {
    disclosure = 'Affiliate link — we may earn a commission at no extra cost to you.';
  }

  return (
    <div data-pdf-hide className="mt-6 mb-6 rounded-lg border border-neutral-200/80 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {config.cta}
      </p>
      {/* FTC disclosure — before the link */}
      <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
        {disclosure}{' '}
        <a href="/disclosure/" className="underline hover:text-primary-600 transition-colors duration-150">
          Disclosure
        </a>
      </p>
      <div className="mt-3 pt-3 border-t border-neutral-200/80 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold text-neutral-900">{partner.name}</span>
            {partner.bestFor && (
              <span className="ml-2 text-xs text-neutral-500">{partner.bestFor}</span>
            )}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{partner.tagline}</p>
        </div>
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

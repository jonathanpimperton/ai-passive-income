import { ArrowUpRight } from 'lucide-react';

/**
 * Inline affiliate card for calculator results panels.
 * Renders a small, contextual partner recommendation below the main results.
 * Only shows for calculators with a natural affiliate fit.
 */

interface PartnerConfig {
  name: string;
  tagline: string;
  url: string;
  tracked?: boolean;
}

interface ToolAffiliateConfig {
  cta: string;
  partners: PartnerConfig[];
}

const RESULT_AFFILIATES: Record<string, ToolAffiliateConfig> = {
  'mortgage-payment': {
    cta: 'Compare rates from multiple lenders',
    partners: [{
      name: 'LendingTree',
      tagline: 'See personalised mortgage rates in minutes',
      url: 'https://www.lendingtree.com/',
    }],
  },
  'compound-interest': {
    cta: 'Start growing your money',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
    }],
  },
  'debt-payoff': {
    cta: 'See if you can consolidate at a lower rate',
    partners: [{
      name: 'SoFi',
      tagline: 'Personal loans from 8.99% APR',
      url: 'https://www.sofi.com/',
    }],
  },
  'retirement-savings': {
    cta: 'Open a retirement account',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
    }],
  },
  'investment-return': {
    cta: 'Start investing with low fees',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing with no minimum balance',
      url: 'https://www.betterment.com/',
    }],
  },
  'investment-fee': {
    cta: 'Switch to a low-fee investment platform',
    partners: [{
      name: 'Betterment',
      tagline: 'Automated investing — 0.25% annual fee, no trade commissions',
      url: 'https://www.betterment.com/',
    }],
  },
  'savings-goal': {
    cta: 'Earn more on your savings',
    partners: [{
      name: 'SoFi',
      tagline: 'High-yield savings with no account fees',
      url: 'https://www.sofi.com/',
    }],
  },
  'loan-amortization': {
    cta: 'Compare loan rates',
    partners: [{
      name: 'LendingTree',
      tagline: 'See personalised loan rates in minutes',
      url: 'https://www.lendingtree.com/',
    }],
  },
  'rent-vs-buy': {
    cta: 'Get pre-approved for a mortgage',
    partners: [{
      name: 'LendingTree',
      tagline: 'Compare mortgage rates from multiple lenders',
      url: 'https://www.lendingtree.com/',
    }],
  },
  'mortgage-affordability': {
    cta: 'Get pre-approved and see your rate',
    partners: [{
      name: 'LendingTree',
      tagline: 'Compare mortgage rates from multiple lenders',
      url: 'https://www.lendingtree.com/',
    }],
  },
  'credit-card-payoff': {
    cta: 'Pay off your card faster with a lower rate',
    partners: [{
      name: 'SoFi',
      tagline: 'Consolidate credit card debt — low rates, no hidden fees',
      url: 'https://www.sofi.com/',
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

  const partner = config.partners[0];
  if (!partner) return null;

  const LOAN_TOOLS = new Set(['mortgage-payment', 'mortgage-affordability', 'loan-amortization', 'rent-vs-buy', 'credit-card-payoff', 'debt-payoff']);
  const INVEST_TOOLS = new Set(['compound-interest', 'investment-return', 'investment-fee', 'retirement-savings', 'savings-goal']);

  let disclosure: string;
  if (LOAN_TOOLS.has(toolSlug)) {
    disclosure = 'We may earn a commission. Your home may be repossessed if you do not keep up repayments on your mortgage.';
  } else if (INVEST_TOOLS.has(toolSlug)) {
    disclosure = 'We may earn a commission. Capital at risk — the value of investments can go down as well as up.';
  } else {
    disclosure = 'Affiliate link — we may earn a commission at no extra cost to you.';
  }

  return (
    <div data-pdf-hide className="mt-6 mb-6 rounded-lg border border-primary-200/60 bg-primary-50/50 p-4">
      <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">
        {config.cta}
      </p>
      <a
        href={buildUrl(partner, toolSlug)}
        target="_blank"
        rel="noopener sponsored"
        className="group flex items-center gap-3 bg-white rounded-lg border border-neutral-200/80 p-3 hover:border-primary-300 hover:shadow-sm transition-all duration-200"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 group-hover:text-primary-700 transition-colors duration-200">
            {partner.name}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{partner.tagline}</p>
        </div>
        <ArrowUpRight
          size={16}
          className="text-primary-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
          aria-hidden="true"
        />
      </a>
      <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
        {disclosure}{' '}
        <a href="/disclosure" className="text-primary-600 hover:text-primary-700 underline">
          Disclosure
        </a>
      </p>
    </div>
  );
}

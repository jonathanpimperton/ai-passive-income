/**
 * Affiliate region rules (review CALC-UX-B-09, HOME-CHROME-10) over every
 * financial calculator x display currency, using the real tool frontmatter.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AFFILIATE_PARTNERS,
  partnersForPage,
  pageRegionFor,
  partnerServes,
  riskWarningsFor,
  isSecuredLendingPage,
  REPOSSESSION_WARNING,
  CAPITAL_AT_RISK_WARNING,
  CURRENCY_REGION_INLINE_JS,
  type PartnerRegion,
} from './affiliate-data';
import { resolveInlineAffiliate, INLINE_AFFILIATE_TOOLS } from '../components/ui/ResultAffiliate';
import { currencyRegion, type CurrencyCode } from './currency';

const CALCULATORS = [
  'compound-interest', 'investment-return', 'roi', 'savings-goal', 'loan-amortization', 'mortgage-payment',
  'debt-payoff', 'rent-vs-buy', 'salary-us', 'salary-uk', 'retirement-savings', 'retirement-contribution',
  'retirement-age', 'net-worth', 'emergency-fund', 'inflation', 'mortgage-affordability', 'credit-card-payoff',
  'investment-fee', 'stamp-duty', 'capital-gains-tax', 'car-finance', 'solar-payback',
];
const CURRENCIES: CurrencyCode[] = ['USD', 'GBP', 'EUR'];

function frontmatterPrograms(slug: string): string[] {
  const md = readFileSync(resolve(__dirname, `../data/tools/${slug}.md`), 'utf8');
  // The list items directly under `affiliatePrograms:` in the frontmatter.
  const block = md.match(/^affiliatePrograms:[ \t]*\r?\n((?:[ \t]+-[^\n]*\n)*)/m);
  if (!block) return [];
  return [...block[1].matchAll(/-\s*"?([^"\r\n]+?)"?\s*$/gm)].map((m) => m[1]);
}

/** What a visitor sees in AffiliateLinks: build-time page filter, then the browser's currency filter. */
function visibleNextStep(slug: string, currency: CurrencyCode) {
  const partners = partnersForPage(frontmatterPrograms(slug), slug);
  if (pageRegionFor(slug)) return partners;
  return partners.filter((p) => partnerServes(p, currencyRegion(currency)));
}

/** What a visitor sees in ResultAffiliate. */
function visibleInline(slug: string, currency: CurrencyCode) {
  const region: PartnerRegion = pageRegionFor(slug) ?? currencyRegion(currency);
  return resolveInlineAffiliate(slug, region);
}

describe('every partner declares its regions', () => {
  it.each(Object.values(AFFILIATE_PARTNERS).map((p) => [p.id, p]))('%s', (_id, p) => {
    expect(p.regions.length).toBeGreaterThan(0);
    for (const r of p.regions) expect(['US', 'UK', 'EU']).toContain(r);
  });
});

describe('23 calculators x 3 currencies', () => {
  for (const slug of CALCULATORS) {
    for (const currency of CURRENCIES) {
      it(`${slug} / ${currency}`, () => {
        const pageRegion = pageRegionFor(slug);
        const region = pageRegion ?? currencyRegion(currency);
        const nextStep = visibleNextStep(slug, currency);
        const inline = visibleInline(slug, currency);
        for (const p of nextStep) expect(partnerServes(p, region)).toBe(true);
        if (inline) expect(partnerServes(inline.partner, region)).toBe(true);

        // No US-only partner for a GBP/EUR visitor unless the page itself is US-only.
        if (currency !== 'USD' && pageRegion !== 'US') {
          for (const p of nextStep) expect(p.regions).not.toEqual(['US']);
          if (inline) expect(inline.partner.regions).not.toEqual(['US']);
        }
      });
    }
  }
});

describe('fixed-region pages', () => {
  it.each(CURRENCIES)('stamp duty never shows LendingTree (%s visitor)', (currency) => {
    expect(visibleNextStep('stamp-duty', currency).map((p) => p.id)).not.toContain('LendingTree');
    expect(visibleInline('stamp-duty', currency)).toBeNull();
  });

  it('UK salary shows its UK partners to every visitor', () => {
    for (const c of CURRENCIES) {
      expect(visibleNextStep('salary-uk', c).map((p) => p.id)).toEqual(['Nutmeg', 'InvestEngine']);
    }
  });

  it('US salary shows US partners even to a GBP visitor', () => {
    expect(visibleNextStep('salary-us', 'GBP').length).toBeGreaterThan(0);
  });

  it('capital gains offers a UK alternative inline for GBP', () => {
    expect(visibleInline('capital-gains-tax', 'USD')?.partner.id).toBe('Betterment');
    expect(visibleInline('capital-gains-tax', 'GBP')?.partner.id).toBe('Nutmeg');
    expect(visibleInline('capital-gains-tax', 'EUR')).toBeNull();
  });
});

describe('risk wording', () => {
  it('repossession warning only on secured-lending pages', () => {
    for (const slug of INLINE_AFFILIATE_TOOLS) {
      const inline = resolveInlineAffiliate(slug, 'US');
      if (!inline) continue;
      const hasWarning = inline.disclosure.includes(REPOSSESSION_WARNING);
      expect(hasWarning).toBe(['mortgage-payment', 'mortgage-affordability', 'rent-vs-buy'].includes(slug));
    }
    for (const slug of ['car-finance', 'credit-card-payoff', 'debt-payoff', 'loan-amortization', 'stamp-duty']) {
      expect(isSecuredLendingPage(slug)).toBe(false);
    }
  });

  it('capital at risk only with an investing partner', () => {
    expect(riskWarningsFor('savings-goal', [AFFILIATE_PARTNERS.Ally])).toEqual([]);
    expect(riskWarningsFor('compound-interest', [AFFILIATE_PARTNERS.Betterment])).toEqual([CAPITAL_AT_RISK_WARNING]);
    expect(riskWarningsFor('mortgage-payment', [AFFILIATE_PARTNERS.LendingTree])).toEqual([REPOSSESSION_WARNING]);
  });
});

describe('inline region script', () => {
  function run(stored: string | null, region: string): string | null {
    const attrs: Record<string, string> = {};
    const doc = {
      documentElement: {
        getAttribute: (k: string) => attrs[k] ?? null,
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
      },
    };
    const win = { calcrunStore: { get: () => stored }, calcrunRegion: region };
    new Function('window', 'document', CURRENCY_REGION_INLINE_JS)(win, doc);
    return attrs['data-currency-region'] ?? null;
  }

  it('matches the currency store rules', () => {
    expect(run('GBP', 'US')).toBe('UK');
    expect(run('EUR', 'UK')).toBe('EU');
    expect(run('USD', 'EEA')).toBe('US');
    expect(run(null, 'UK')).toBe('UK');
    expect(run(null, 'EEA')).toBe('EU');
    expect(run(null, 'OTHER')).toBe('US');
    expect(run('garbage', 'UK')).toBe('UK');
  });
});

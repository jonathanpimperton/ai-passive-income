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
  fixedCurrencyFor,
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
import { cgtPartnerRegion } from './capital-gains';

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

  it('no dead inline config: every fixed-region page with an inline affiliate shows one in its own region', () => {
    // A US-only partner configured on a UK-only page (LendingTree on stamp duty) can never render:
    // it is dead config that reads as a live placement. Either drop the entry or add a partner for the region.
    for (const slug of INLINE_AFFILIATE_TOOLS) {
      const region = pageRegionFor(slug);
      if (!region) continue;
      expect(resolveInlineAffiliate(slug, region), `${slug} (${region}-only page) has an inline config that never renders`).not.toBeNull();
    }
  });

  it('stamp duty has no inline config while no UK mortgage partner exists', () => {
    expect(INLINE_AFFILIATE_TOOLS).not.toContain('stamp-duty');
  });

  it('UK salary shows its UK partners to every visitor', () => {
    for (const c of CURRENCIES) {
      expect(visibleNextStep('salary-uk', c).map((p) => p.id)).toEqual(['Nutmeg', 'InvestEngine']);
    }
  });

  it('US salary shows US partners even to a GBP visitor', () => {
    expect(visibleNextStep('salary-us', 'GBP').length).toBeGreaterThan(0);
  });

  it('capital gains inline partner follows the tab on screen, not the visitor currency', () => {
    // CapitalGainsTaxCalc passes cgtPartnerRegion(country) to ResultAffiliate, which
    // then ignores the visitor's currency: US tab -> US partner, UK tab -> UK partner
    // (any currency; the Playwright case in tests/followups.spec.ts covers the wiring).
    expect(resolveInlineAffiliate('capital-gains-tax', cgtPartnerRegion('us'))?.partner.id).toBe('Betterment');
    expect(resolveInlineAffiliate('capital-gains-tax', cgtPartnerRegion('uk'))?.partner.id).toBe('Nutmeg');
    for (const country of ['us', 'uk'] as const) {
      const region = cgtPartnerRegion(country);
      const inline = resolveInlineAffiliate('capital-gains-tax', region);
      expect(inline && partnerServes(inline.partner, region)).toBe(true);
    }
  });

  it('capital gains offers a UK alternative inline for GBP', () => {
    expect(visibleInline('capital-gains-tax', 'USD')?.partner.id).toBe('Betterment');
    expect(visibleInline('capital-gains-tax', 'GBP')?.partner.id).toBe('Nutmeg');
    expect(visibleInline('capital-gains-tax', 'EUR')).toBeNull();
  });
});

describe('fixed-currency pages', () => {
  it('UK-only pages format as GBP, US-only pages as USD', () => {
    expect(fixedCurrencyFor('salary-uk')).toBe('GBP');
    expect(fixedCurrencyFor('stamp-duty')).toBe('GBP');
    expect(fixedCurrencyFor('salary-us')).toBe('USD');
  });
  it('the take-home-pay hubs use the number convention of the calculator they embed (no "5,0" for an EUR visitor)', () => {
    // The hub's slug is its file name; each one embeds a one-country calculator.
    for (const [file, calc, currency, region] of [
      ['uk-take-home-pay', 'SalaryUkCalc', 'GBP', 'UK'],
      ['us-take-home-pay', 'SalaryCalc', 'USD', 'US'],
    ] as const) {
      const page = readFileSync(resolve(__dirname, `../pages/scenarios/${file}.astro`), 'utf8');
      expect(page).toContain(`<${calc} `);
      expect(fixedCurrencyFor(file)).toBe(currency);
      expect(pageRegionFor(file)).toBe(region);
    }
  });
  it('every other page follows the visitor', () => {
    expect(fixedCurrencyFor('compound-interest')).toBeNull();
    expect(fixedCurrencyFor(undefined)).toBeNull();
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

describe('paid-link labelling (CONTENT-30)', () => {
  it('untracked partners are described as unpaid, tracked ones as affiliate links', () => {
    expect(resolveInlineAffiliate('compound-interest', 'US')?.disclosure).toMatch(/^We are not paid for this link\./);
    expect(AFFILIATE_PARTNERS.NordPass.tracked).toBe(true);
    expect(AFFILIATE_PARTNERS.Betterment.tracked).toBeUndefined();
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

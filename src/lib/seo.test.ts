import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  buildWebsiteSchema,
  buildArticleSchema,
  buildWebApplicationSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
  toolPageTitle,
  toolTaxYearLabel,
  methodologyDescription,
  ORGANIZATION_ID,
} from './seo';
import { UK_TAX_YEAR } from './uk-rates';
import { US_TAX_YEAR } from './us-rates';

const ROOT = resolve(__dirname, '../..');
/** BaseLayout appends " | CalcRun" (10 chars); keep full titles within 60. */
const SUFFIX = ' | CalcRun';

describe('Organization / WebSite graph (SE-3)', () => {
  const graph = JSON.parse(buildWebsiteSchema())['@graph'];
  const org = graph.find((n: { '@type': string }) => n['@type'] === 'Organization');
  const site = graph.find((n: { '@type': string }) => n['@type'] === 'WebSite');

  it('declares the publisher once with name, url, PNG logo and contact email', () => {
    expect(org['@id']).toBe(ORGANIZATION_ID);
    expect(org.name).toBe('CalcRun');
    expect(org.url).toBe('https://www.calcrun.com/');
    expect(org.email).toBe('hello@calcrun.com');
    expect(org.logo.url).toMatch(/^https:\/\/www\.calcrun\.com\/.+\.png$/);
  });

  it('points at a logo file that exists and is at least 112px square', () => {
    const file = join(ROOT, 'public', new URL(org.logo.url).pathname);
    const buf = readFileSync(file);
    expect(buf.readUInt32BE(16)).toBeGreaterThanOrEqual(112);
    expect(buf.readUInt32BE(20)).toBeGreaterThanOrEqual(112);
  });

  it('has no sameAs (no real profiles yet) and links WebSite -> publisher by @id', () => {
    expect(org.sameAs).toBeUndefined();
    expect(site.publisher).toEqual({ '@id': ORGANIZATION_ID });
  });
});

describe('Article and WebApplication', () => {
  it('references the same publisher @id', () => {
    const a = JSON.parse(buildArticleSchema({ headline: 'H', description: 'D', path: '/x/', datePublished: '2026-01-01', dateModified: '2026-02-02' }));
    expect(a.publisher['@id']).toBe(ORGANIZATION_ID);
    expect(a.datePublished).toBe('2026-01-01');
    expect(a.dateModified).toBe('2026-02-02');
  });

  it('omits dates rather than inventing them', () => {
    const a = JSON.parse(buildArticleSchema({ headline: 'H', description: 'D', path: '/x/', type: 'TechArticle' }));
    expect(a['@type']).toBe('TechArticle');
    expect('datePublished' in a).toBe(false);
    expect('dateModified' in a).toBe(false);
  });

  it('prices UK-only tools in GBP and the rest in USD', () => {
    const uk = JSON.parse(buildWebApplicationSchema({ name: 'n', description: 'd', slug: 'salary-uk', category: 'income-and-planning' }));
    const us = JSON.parse(buildWebApplicationSchema({ name: 'n', description: 'd', slug: 'salary-us', category: 'income-and-planning' }));
    expect(uk.offers.priceCurrency).toBe('GBP');
    expect(us.offers.priceCurrency).toBe('USD');
    expect(uk.publisher['@id']).toBe(ORGANIZATION_ID);
  });
});

describe('no fake ratings anywhere in generated JSON-LD', () => {
  it('emits no aggregateRating / review', () => {
    const all = [
      buildWebsiteSchema(),
      buildArticleSchema({ headline: 'H', description: 'D', path: '/x/' }),
      buildWebApplicationSchema({ name: 'n', description: 'd', slug: 's', category: 'utility' }),
      buildFaqSchema([{ question: 'q', answer: 'a' }]),
      buildBreadcrumbSchema([{ name: 'Home', url: '/' }]),
    ].join('\n');
    expect(all).not.toMatch(/aggregateRating|"review"|ratingValue/i);
  });
});

describe('toolPageTitle (SE-2, GROWTH-SEO-04)', () => {
  it('derives tax years from the rates modules', () => {
    expect(toolPageTitle({ name: 'UK Salary & Take-Home Calculator', slug: 'salary-uk' })).toContain(UK_TAX_YEAR);
    expect(toolPageTitle({ name: 'US Salary & Take-Home Calculator', slug: 'salary-us' })).toContain(US_TAX_YEAR);
    const cgt = toolPageTitle({ name: 'Capital Gains Tax Calculator', slug: 'capital-gains-tax' });
    expect(cgt).toContain(UK_TAX_YEAR);
    expect(cgt).toContain(US_TAX_YEAR);
  });

  it('salary titles state monthly and annual take-home, with the tax year from the rates modules', () => {
    // Owner requirement (Nov 2026): the answer is a month and a year, say so in the title.
    expect(toolPageTitle({ name: 'UK Salary & Take-Home Calculator', slug: 'salary-uk' })).toBe(
      `UK Salary Calculator ${UK_TAX_YEAR}: Monthly and Annual`,
    );
    expect(toolPageTitle({ name: 'US Salary & Take-Home Calculator', slug: 'salary-us' })).toBe(
      `US Paycheck Calculator ${US_TAX_YEAR}: Monthly and Annual`,
    );
    // They are the tools that carry the claim: no other tool title is allowed to drift into it by accident.
    expect(toolPageTitle({ name: 'Mortgage Payment Calculator', slug: 'mortgage-payment' })).not.toMatch(/Monthly and Annual/);
  });

  it('names the nations stamp duty covers', () => {
    expect(toolPageTitle({ name: 'Stamp Duty Calculator', slug: 'stamp-duty' })).toMatch(/England & NI/);
  });

  it('falls back to the tool name', () => {
    expect(toolPageTitle({ name: 'QR Code Generator', slug: 'qr-code' })).toBe('QR Code Generator');
  });

  it('keeps every tool title within 60 characters including the suffix', () => {
    const dir = join(ROOT, 'src/data/tools');
    for (const f of readdirSync(dir)) {
      const raw = readFileSync(join(dir, f), 'utf8');
      const name = raw.match(/^name:\s*"([^"]+)"/m)![1];
      const slug = raw.match(/^slug:\s*"([^"]+)"/m)![1];
      expect([...(toolPageTitle({ name, slug }) + SUFFIX)].length, slug).toBeLessThanOrEqual(60);
    }
  });

  it('labels the tax year on methodology pages of tax-year tools only', () => {
    expect(toolTaxYearLabel('salary-uk')).toContain(UK_TAX_YEAR);
    expect(toolTaxYearLabel('compound-interest')).toBeNull();
  });
});

describe('no hreflang (SE-10: UK and US pages are not equivalents)', () => {
  it('no source file emits hreflang', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(astro|tsx?|mjs)$/.test(f) && !f.endsWith('.test.ts') && /hreflang/i.test(readFileSync(p, 'utf8'))) hits.push(p);
      }
    };
    walk(join(ROOT, 'src'));
    expect(hits).toEqual([]);
  });
});

describe('methodologyDescription (MTH-26 template part)', () => {
  it('is unique per methodology page and within 160 characters', () => {
    const dir = join(ROOT, 'src/data/methodologies');
    const toolDir = join(ROOT, 'src/data/tools');
    const seen = new Set<string>();
    for (const f of readdirSync(dir)) {
      const raw = readFileSync(join(dir, f), 'utf8');
      const toolSlug = raw.match(/^toolSlug:\s*"([^"]+)"/m)![1];
      const toolRaw = readFileSync(join(toolDir, `${toolSlug}.md`), 'utf8');
      const name = toolRaw.match(/^name:\s*"([^"]+)"/m)![1];
      const d = methodologyDescription(name, toolSlug);
      expect([...d].length, toolSlug).toBeLessThanOrEqual(160);
      expect(seen.has(d), toolSlug).toBe(false);
      seen.add(d);
    }
    expect(seen.size).toBe(23);
  });
  it('names the tax year for tax tools', () => {
    expect(methodologyDescription('UK Salary & Take-Home Calculator', 'salary-uk')).toContain(UK_TAX_YEAR);
  });
});

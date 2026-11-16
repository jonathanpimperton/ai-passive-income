import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  contentRegion,
  comparisonsForTool,
  scenariosForTool,
  relatedComparisons,
  relatedScenarios,
  comparisonOptionLabels,
  hubForTool,
  shortTitle,
  type ComparisonLink,
  type ScenarioLink,
} from './internal-links';

const ROOT = resolve(__dirname, '../..');

function loadDir<T>(dir: string): T[] {
  return readdirSync(join(ROOT, 'src/data', dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(ROOT, 'src/data', dir, f), 'utf8');
      return yaml.load(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]) as T;
    });
}

const comparisons = loadDir<ComparisonLink>('comparisons');
const scenarios = loadDir<ScenarioLink>('scenarios');
const tools = loadDir<{ slug: string; category: string }>('tools');

describe('contentRegion', () => {
  it('detects UK, US and neutral content', () => {
    expect(contentRegion('Pension vs ISA: Where Should UK Workers Save?')).toBe('UK');
    expect(contentRegion('Roth vs Traditional 401(k): Which Is Better?')).toBe('US');
    expect(contentRegion('Lump Sum vs Dollar-Cost Averaging')).toBe('ANY');
    expect(contentRegion('£300,000 mortgage vs $300,000 mortgage')).toBe('ANY');
  });
});

describe('comparisonOptionLabels (CMP-22)', () => {
  it('uses the "vs" segment wherever it sits relative to the colon', () => {
    expect(comparisonOptionLabels('Emergency Fund: Savings Account vs Money Market', 2)).toEqual(['Savings Account', 'Money Market']);
    expect(comparisonOptionLabels('Pension vs ISA: Where Should UK Workers Save?', 2)).toEqual(['Pension', 'ISA']);
    expect(comparisonOptionLabels('PCP vs HP vs Personal Loan: Which Costs Least?', 3)).toEqual(['PCP', 'HP', 'Personal Loan']);
  });
  it('falls back to generic labels only when no "vs" exists', () => {
    expect(comparisonOptionLabels('Saving for a deposit', 2)).toEqual(['Option A', 'Option B']);
  });
  it('produces real labels for every comparison article', () => {
    for (const c of comparisons) {
      const hasThird = (c as unknown as { comparisonTable: { option3?: string }[] }).comparisonTable.some((r) => r.option3 !== undefined);
      const labels = comparisonOptionLabels(c.title, hasThird ? 3 : 2);
      for (const l of labels) expect(l, c.slug).not.toMatch(/^Option [ABC]$/);
    }
  });
});

describe('two-way links (GROWTH-SEO-05)', () => {
  it('links the tools that had no scenario links to at least one guide', () => {
    for (const slug of ['credit-card-payoff', 'mortgage-affordability', 'rent-vs-buy', 'car-finance']) {
      const guides = scenariosForTool(slug, scenarios).length + comparisonsForTool(slug, comparisons).length;
      expect(guides, slug).toBeGreaterThan(0);
    }
  });

  it('links every comparison from at least one tool page', () => {
    const linked = new Set(tools.flatMap((t) => comparisonsForTool(t.slug, comparisons).map((c) => c.slug)));
    for (const c of comparisons) expect(linked.has(c.slug), c.slug).toBe(true);
  });

  it('links the formerly curated tool-to-comparison pairs from the comparison relatedTools data', () => {
    const fromTool = (tool: string) => comparisonsForTool(tool, comparisons).map((c) => c.slug);
    expect(fromTool('credit-card-payoff')).toEqual(expect.arrayContaining(['snowball-vs-avalanche-debt', 'pay-off-debt-vs-invest']));
    expect(fromTool('mortgage-affordability')).toEqual(
      expect.arrayContaining(['renting-vs-buying-2026', '15-year-vs-30-year-mortgage', 'fixed-vs-variable-rate-mortgage'])
    );
    expect(fromTool('investment-fee')).toContain('index-funds-vs-active-funds');
    expect(fromTool('capital-gains-tax')).toContain('isa-vs-general-investment');
  });

  it('links the weakly linked comparisons from their own calculators', () => {
    const fromTool = (tool: string) => comparisonsForTool(tool, comparisons).map((c) => c.slug);
    expect(fromTool('car-finance')).toContain('pcp-vs-hp-vs-personal-loan');
    expect(fromTool('savings-goal')).toContain('high-yield-savings-vs-cds');
    expect(fromTool('retirement-savings')).toContain('roth-ira-vs-roth-401k');
  });

  it('never shows the other country\'s comparisons on single-country tools', () => {
    for (const c of comparisonsForTool('salary-uk', comparisons)) expect(contentRegion(`${c.title} ${c.description}`)).not.toBe('US');
    for (const c of comparisonsForTool('salary-us', comparisons)) expect(contentRegion(`${c.title} ${c.description}`)).not.toBe('UK');
  });

  it('only references slugs that exist', () => {
    for (const t of tools) {
      for (const s of scenariosForTool(t.slug, scenarios)) expect(scenarios).toContain(s);
      for (const c of comparisonsForTool(t.slug, comparisons)) expect(comparisons).toContain(c);
    }
  });

  it('de-duplicates curated extras that are already linked by data', () => {
    const list = scenariosForTool('credit-card-payoff', [
      ...scenarios,
      { slug: 'x', title: 'X', description: '', toolSlug: 'credit-card-payoff', resultSummary: '' },
    ]);
    expect(new Set(list.map((s) => s.slug)).size).toBe(list.length);
  });

  it('keeps hub links for the consolidated tools', () => {
    expect(hubForTool('salary-uk')?.href).toBe('/scenarios/uk-take-home-pay/');
    expect(hubForTool('mortgage-affordability')?.href).toBe('/scenarios/mortgage-payments-by-amount/');
    expect(hubForTool('qr-code')).toBeUndefined();
  });
});

describe('relatedComparisons', () => {
  it('ranks by shared calculators and audience, not collection order', () => {
    const pension = comparisons.find((c) => c.slug === 'pension-vs-isa-uk')!;
    const related = relatedComparisons(pension, comparisons);
    expect(related).toHaveLength(5);
    expect(related.map((c) => c.slug)).not.toContain('pension-vs-isa-uk');
    // A UK article's sidebar leads with UK articles
    expect(contentRegion(`${related[0].title} ${related[0].description}`)).toBe('UK');
    for (const c of related) expect(contentRegion(`${c.title} ${c.description}`)).not.toBe('US');
  });

  it('differs between pages (it used to be the same 5 links everywhere)', () => {
    const a = relatedComparisons(comparisons.find((c) => c.slug === 'pension-vs-isa-uk')!, comparisons).map((c) => c.slug);
    const b = relatedComparisons(comparisons.find((c) => c.slug === 'roth-vs-traditional-401k')!, comparisons).map((c) => c.slug);
    expect(a).not.toEqual(b);
  });
});

describe('relatedScenarios', () => {
  it('fills a lone scenario\'s sidebar with same-audience scenarios', () => {
    const cgt = scenarios.find((s) => s.slug === 'cgt-second-home-2026-27')!;
    const related = relatedScenarios(cgt, scenarios);
    expect(related.length).toBeGreaterThan(0);
    for (const s of related) expect(contentRegion(`${s.title} ${s.description}`)).toBe('UK');
  });
  it('puts same-calculator scenarios first', () => {
    const s = scenarios.find((x) => x.slug === '100k-salary-uk-tax')!;
    expect(relatedScenarios(s, scenarios)[0].toolSlug).toBe('salary-uk');
  });
});

describe('shortTitle', () => {
  it('drops the subtitle after the colon', () => {
    expect(shortTitle('Pension vs ISA: Where Should UK Workers Save?')).toBe('Pension vs ISA');
  });
});

describe('deterministic order (getCollection order varies by machine)', () => {
  const reversed = <T,>(a: T[]) => [...a].reverse();
  it('gives the same lists whatever order the collection arrives in', () => {
    for (const c of comparisons) {
      const a = relatedComparisons(c, comparisons).map((x) => x.slug);
      const b = relatedComparisons(c, reversed(comparisons)).map((x) => x.slug);
      expect(b, c.slug).toEqual(a);
    }
    for (const s of scenarios) {
      expect(relatedScenarios(s, reversed(scenarios)).map((x) => x.slug), s.slug).toEqual(
        relatedScenarios(s, scenarios).map((x) => x.slug)
      );
    }
    for (const t of tools) {
      expect(comparisonsForTool(t.slug, reversed(comparisons)).map((x) => x.slug)).toEqual(
        comparisonsForTool(t.slug, comparisons).map((x) => x.slug)
      );
      expect(scenariosForTool(t.slug, reversed(scenarios)).map((x) => x.slug)).toEqual(
        scenariosForTool(t.slug, scenarios).map((x) => x.slug)
      );
    }
  });
});

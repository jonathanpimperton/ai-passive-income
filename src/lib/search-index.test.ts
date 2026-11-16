/**
 * Site search (HOME-CHROME-05): index built from the real content files,
 * ranked with the same code the header combobox runs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { TOOLS } from './tools-data';
import {
  buildSearchIndex,
  prepareIndex,
  searchIndex,
  normalizeText,
  parseQuery,
  resultLabel,
  HUBS,
  type ArticleInput,
  type SearchEntry,
} from './search-index';
import {
  UK_SALARIES,
  US_SALARIES,
  MORTGAGE_AMOUNTS,
  INVEST_MONTHLY_AMOUNTS,
  INVEST_LUMP_SUMS,
  kAnchor,
} from '../components/scenarios/hub-config';

const ROOT = join(__dirname, '..', '..');

function frontmatter(file: string): Record<string, unknown> {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`no frontmatter in ${file}`);
  return yaml.load(m[1]) as Record<string, unknown>;
}

function collection(dir: string): Record<string, unknown>[] {
  const base = join(ROOT, 'src', 'data', dir);
  return readdirSync(base)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => frontmatter(join(base, f)));
}

const toolMd = new Map(collection('tools').map((d) => [d.slug as string, d]));
const asArticle = (d: Record<string, unknown>): ArticleInput => ({
  title: d.title as string,
  slug: d.slug as string,
  description: d.description as string | undefined,
  keywords: d.keywords as string[] | undefined,
  toolSlug: d.toolSlug as string | undefined,
});

const entries: SearchEntry[] = buildSearchIndex({
  tools: TOOLS.map((t) => ({ ...t, keywords: (toolMd.get(t.slug)?.keywords as string[]) || [] })),
  scenarios: collection('scenarios').map(asArticle),
  comparisons: collection('comparisons').map(asArticle),
  methodologies: collection('methodologies').map(asArticle),
});
const index = prepareIndex(entries);
const top = (q: string, region?: string) => searchIndex(index, q, { region })[0];
const urls = (q: string, region?: string) => searchIndex(index, q, { region }).map((e) => e.u);

describe('normalizeText', () => {
  it('canonicalises money and numbers', () => {
    expect(normalizeText('\u00a350,000')).toBe('50000');
    expect(normalizeText('50k salary')).toBe('50000 salary');
    expect(normalizeText('$1.5m')).toBe('1500000');
    expect(normalizeText('1,000,000')).toBe('1000000');
  });
  it('keeps 401(k) as the account, not 401,000', () => {
    expect(normalizeText('Roth 401(k)')).toBe('roth 401k');
    expect(normalizeText('401k')).toBe('401k');
    expect(normalizeText('403(b)')).toBe('403b');
  });
  it('drops punctuation and accents, keeps decimals', () => {
    expect(normalizeText('Take-Home Pay!')).toBe('take home pay');
    expect(normalizeText('Caf\u00e9 & co.')).toBe('cafe and co');
    expect(normalizeText('6.5% rate')).toBe('6.5 rate');
    expect(normalizeText('CSV \u2194 JSON')).toBe('csv json');
  });
});

describe('parseQuery', () => {
  it('turns known phrases into one concept with synonyms', () => {
    const q = parseQuery('take home pay');
    expect(q.concepts).toHaveLength(1);
    expect(q.concepts[0]).toContain('net pay');
  });
  it('drops soft stop-words and lifts the region word out', () => {
    const q = parseQuery('UK salary calculator');
    expect(q.region).toBe('UK');
    expect(q.concepts).toEqual([['salary']]);
  });
  it('empty or stop-word-only queries have no concepts', () => {
    expect(parseQuery('').concepts).toEqual([]);
    expect(parseQuery('the calculator').concepts).toEqual([]);
  });
});

describe('index contents', () => {
  it('covers every tool, scenario, comparison and methodology once', () => {
    const count = (k: string) => entries.filter((e) => e.k === k).length;
    expect(count('tool')).toBe(TOOLS.length);
    expect(count('scenario')).toBe(collection('scenarios').length);
    expect(count('comparison')).toBe(collection('comparisons').length);
    expect(count('method')).toBe(collection('methodologies').length);
    expect(count('hub')).toBe(4);
    const all = entries.map((e) => e.u);
    expect(new Set(all).size).toBe(all.length);
  });

  it('every URL is a site path with a trailing slash (anchor optional)', () => {
    for (const e of entries) expect(e.u).toMatch(/^\/[a-z0-9\-/]*\/(#[a-z0-9-]+)?$/);
  });

  it('is ASCII-safe JSON and stays small', () => {
    const json = JSON.stringify({ v: 1, entries });
    expect(json.length).toBeLessThan(90_000);
  });

  // The hub row anchors in HUBS must match the arrays the hub pages render. Both hubs and
  // this index read their row lists from the hubs' shared config (W2-SCEN).
  const hubSource = (name: string) => readFileSync(join(ROOT, 'src', 'pages', 'scenarios', `${name}.astro`), 'utf8');
  it('hub row anchors match the hub pages (drift fails here)', () => {
    expect([...HUBS.ukTakeHome.salaries]).toEqual(UK_SALARIES);
    expect([...HUBS.usTakeHome.salaries]).toEqual(US_SALARIES);
    expect([...HUBS.mortgage.amounts]).toEqual(MORTGAGE_AMOUNTS);
    expect([...HUBS.investment.monthly]).toEqual(INVEST_MONTHLY_AMOUNTS);
    expect([...HUBS.investment.lumpSums]).toEqual(INVEST_LUMP_SUMS);
    // And the anchor formats the hubs use (row id = kAnchor(value), investment rows by value)
    expect(kAnchor(50000)).toBe('50k');
    expect(hubSource('uk-take-home-pay')).toContain('id: kAnchor(salary)');
    expect(hubSource('us-take-home-pay')).toContain("id: year === mainYear ? kAnchor(salary) : undefined");
    expect(hubSource('mortgage-payments-by-amount')).toContain('id: kAnchor(amount)');
    expect(hubSource('investment-growth')).toContain('const id = `${monthly}-per-month`');
    expect(hubSource('investment-growth')).toContain('const id = `${principal}`');
  });
});

describe('acceptance queries (plan HO-5)', () => {
  it('"take home pay" -> a salary take-home calculator, region-aware', () => {
    expect(['/tools/income-and-planning/salary-uk/', '/tools/income-and-planning/salary-us/']).toContain(top('take home pay').u);
    expect(top('take home pay', 'UK').u).toBe('/tools/income-and-planning/salary-uk/');
    expect(top('take home pay', 'US').u).toBe('/tools/income-and-planning/salary-us/');
  });
  it('"compress pdf" -> PDF Compress', () => {
    expect(top('compress pdf').u).toBe('/tools/file-tools/pdf-compress/');
    expect(top('pdf compress').u).toBe('/tools/file-tools/pdf-compress/');
  });
  it('"isa" -> an ISA comparison, ISA vs GIA first', () => {
    expect(top('isa').u).toBe('/comparisons/isa-vs-general-investment/');
    expect(urls('isa').slice(0, 5).every((u) => /isa/.test(u))).toBe(true);
  });
  it('"401k" -> the retirement savings calculator, then 401(k) articles', () => {
    expect(top('401k').u).toBe('/tools/income-and-planning/retirement-savings/');
    expect(urls('401k').slice(1, 4).some((u) => u.includes('401k'))).toBe(true);
    expect(top('401(k)').u).toBe('/tools/income-and-planning/retirement-savings/');
  });
});

describe('other real queries from the review', () => {
  const cases: Array<[string, RegExp]> = [
    ['net pay', /salary-(uk|us)\/$/],
    ['paycheck', /salary-us\/$/],
    ['paye', /salary-uk\/$/],
    ['stamp duty', /stamp-duty\/$/],
    ['sdlt', /stamp-duty\/$/],
    ['cgt', /capital-gains-tax\/$/],
    ['heic', /heic-to-jpg\/$/],
    ['iphone photo', /heic-to-jpg\/$/],
    ['ltv', /mortgage-(payment|affordability)\/$/],
    ['scenarios', /^\/scenarios\/$/],
    ['mortgage', /mortgage-payment\/$/],
    ['favicon', /png-to-ico\/$/],
    ['take-home', /salary-(uk|us)\/$/],
    ['uk salary', /salary-uk\/$/],
    ['us salary', /salary-us\/$/],
    ['compound interest', /compound-interest\/$/],
    ['rent or buy', /rent-vs-buy\/$/],
  ];
  for (const [q, re] of cases) {
    it(`"${q}"`, () => {
      expect(top(q)?.u).toMatch(re);
    });
  }

  it('salary amounts land on the hub row or scenario for that salary', () => {
    const r = searchIndex(index, '50k salary uk', {});
    expect(r[0].u).toMatch(/50k|uk-take-home-pay\/#50k/);
    expect(r.some((e) => e.u === '/scenarios/uk-take-home-pay/#50k')).toBe(true);
    expect(searchIndex(index, '$80,000 after tax', { region: 'US' }).some((e) => e.u === '/scenarios/us-take-home-pay/#80k')).toBe(true);
    expect(searchIndex(index, '300k mortgage', {}).some((e) => e.u === '/scenarios/mortgage-payments-by-amount/#300k')).toBe(true);
  });

  it('garbage returns nothing rather than noise', () => {
    expect(searchIndex(index, 'zzqx', {})).toEqual([]);
    expect(searchIndex(index, '   ', {})).toEqual([]);
  });

  it('labels results by kind', () => {
    expect(resultLabel({ k: 'tool', u: '/tools/file-tools/pdf-compress/' })).toBe('File tool');
    expect(resultLabel({ k: 'tool', u: '/tools/utility/qr-code/' })).toBe('Tool');
    expect(resultLabel({ k: 'tool', u: '/tools/debt-and-loans/mortgage-payment/' })).toBe('Calculator');
    expect(resultLabel({ k: 'row', u: '/x/#1' })).toBe('Answer');
  });
});

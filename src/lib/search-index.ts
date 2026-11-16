/**
 * Site search: index builder (build time) and ranking (browser).
 *
 * Why this exists: the old header search matched tool NAMES by substring
 * only, was desktop-only, and returned "No tools found" for the way people
 * actually ask ("take home pay", "compress pdf", "isa", "401k") -- review
 * finding HOME-CHROME-05. This module is pure (no DOM, no astro:content) so
 * the same code builds the index in `src/pages/search-index.json.ts` and
 * ranks results in the header combobox, and vitest can exercise both.
 *
 * Index shape: one compact entry per destination -- tools, the four hub
 * pages plus one entry per hub table row (with its #anchor), scenarios,
 * comparisons, methodology pages and a few site pages. `s` carries extra
 * search text (keywords, tags, synonyms) already normalised at build time.
 *
 * Ranking: the query is normalised (numbers like "50k" / "GBP 50,000" become
 * 50000, "401(k)" becomes 401k), soft stop-words are dropped, and each
 * remaining word or known phrase becomes a "concept" with synonym
 * alternatives. An entry must match EVERY concept somewhere (title, tags or
 * description); title hits weigh most, then tags, then description. A kind
 * weight keeps calculators above articles for the same words, and an
 * optional visitor region nudges UK or US pages up.
 */

export type SearchKind = 'tool' | 'hub' | 'row' | 'scenario' | 'comparison' | 'method' | 'page';
export type SearchRegion = 'UK' | 'US';

export interface SearchEntry {
  /** Display title */
  t: string;
  /** Destination path (always with trailing slash, optional #anchor) */
  u: string;
  /** Kind of destination */
  k: SearchKind;
  /** Short description for display (optional) */
  d?: string;
  /** Extra normalised search text: keywords and slug words (weighted below the title) */
  s?: string;
  /** Curated normalised aliases (weighted like the title), e.g. "paye" for UK salary */
  a?: string;
  /** Region the page is specific to, if any */
  r?: SearchRegion;
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const NUMBER_SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, bn: 1e9 };

/**
 * Lower-case, strip accents and punctuation, and canonicalise numbers so
 * "GBP 50,000" (pound sign), "50k" and "50000" all become "50000" and "401(k)" becomes
 * "401k". Returns a single-spaced string.
 */
export function normalizeText(input: string): string {
  let s = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  s = s
    .replace(/401\s*\(\s*k\s*\)/g, '401k')
    .replace(/403\s*\(\s*b\s*\)/g, '403b')
    .replace(/[\u2019']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[\u00a3$\u20ac]/g, ' ');
  // Thousands separators inside numbers: 50,000 -> 50000 (only correctly grouped)
  s = s.replace(/\b(\d{1,3})((?:,\d{3})+)\b/g, (_m, a: string, b: string) => a + b.replace(/,/g, ''));
  // Suffixes: 50k, 1.5m, 2bn -> plain integers
  s = s.replace(/\b(\d+(?:\.\d+)?)\s?(k|m|bn)\b/g, (m, n: string, suf: string) => {
    if (n === '401' && suf === 'k') return m; // the retirement account, not 401,000
    const v = parseFloat(n) * NUMBER_SUFFIX[suf];
    return Number.isFinite(v) && Number.isInteger(Math.round(v)) ? String(Math.round(v)) : m;
  });
  // Keep decimal points inside numbers only (no lookbehind: older Safari lacks it)
  s = s.replace(/[^a-z0-9.]+/g, ' ').replace(/\.(?!\d)/g, ' ').replace(/(^|[^\d])\./g, '$1 ');
  return s.replace(/\s+/g, ' ').trim();
}

/** Light stemming: "savings" -> "saving", "loans" -> "loan". Numbers untouched. */
function stem(word: string): string {
  if (word.length > 3 && /[a-z]s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

function words(normalized: string): string[] {
  return normalized ? normalized.split(' ').map(stem) : [];
}

/* ------------------------------------------------------------------ */
/* Synonyms                                                            */
/* ------------------------------------------------------------------ */

/**
 * Query phrase -> alternatives that also satisfy it. Keys and values are in
 * normalised form. A key may be several words; the longest key found in the
 * query wins. Directional on purpose: "401k" finds retirement pages, but
 * "pension" does not drag in every US 401(k) article for a UK visitor.
 */
export const SYNONYMS: Record<string, string[]> = {
  'take home pay': ['take home', 'net pay', 'salary', 'after tax', 'paycheck'],
  'take home': ['take home', 'net pay', 'salary', 'after tax', 'paycheck'],
  takehome: ['take home', 'net pay', 'salary', 'after tax', 'paycheck'],
  'net pay': ['net pay', 'take home', 'salary', 'after tax', 'paycheck'],
  'net salary': ['take home', 'salary', 'after tax'],
  paycheck: ['paycheck', 'take home', 'salary', 'after tax'],
  'pay check': ['paycheck', 'take home', 'salary', 'after tax'],
  payslip: ['take home', 'salary', 'paye'],
  'after tax': ['after tax', 'take home', 'net pay', 'salary'],
  wage: ['salary', 'take home', 'hourly'],
  wages: ['salary', 'take home', 'hourly'],
  income: ['income', 'salary'],
  paye: ['paye', 'income tax', 'take home', 'salary uk'],
  '401k': ['401k', 'retirement saving', 'roth'],
  '403b': ['403b', '401k', 'retirement saving'],
  ira: ['ira', 'roth', 'retirement saving'],
  isa: ['isa', 'individual savings account'],
  lisa: ['lisa', 'lifetime isa'],
  sipp: ['sipp', 'pension'],
  pension: ['pension', 'retirement'],
  retire: ['retire', 'retirement'],
  'early retirement': ['retire early', 'fire', 'retire at'],
  fire: ['fire', 'retire early', 'retire at'],
  compress: ['compress', 'compressor', 'shrink', 'reduce'],
  shrink: ['compress', 'compressor', 'shrink', 'resize'],
  smaller: ['compress', 'compressor', 'resize'],
  'stamp duty': ['stamp duty', 'sdlt'],
  sdlt: ['sdlt', 'stamp duty'],
  ltv: ['ltv', 'loan to value', 'mortgage', 'deposit'],
  'loan to value': ['loan to value', 'ltv', 'mortgage', 'deposit'],
  cgt: ['cgt', 'capital gain'],
  'capital gains': ['capital gain', 'cgt'],
  heic: ['heic'],
  iphone: ['heic', 'iphone'],
  'iphone photo': ['heic'],
  jpg: ['jpg', 'jpeg'],
  jpeg: ['jpg', 'jpeg'],
  favicon: ['ico', 'favicon'],
  ico: ['ico', 'favicon'],
  b64: ['base64'],
  base64: ['base64'],
  mortgage: ['mortgage', 'home loan'],
  'home loan': ['mortgage', 'home loan'],
  house: ['mortgage', 'house', 'home', 'stamp duty'],
  amortisation: ['amortization', 'amortisation'],
  amortization: ['amortization', 'amortisation'],
  apr: ['apr', 'interest'],
  'student loan': ['student loan', 'plan 2', 'plan 5'],
  'credit card': ['credit card'],
  inflation: ['inflation', 'purchasing power', 'cpi'],
  deposit: ['deposit', 'down payment'],
  'down payment': ['down payment', 'deposit'],
  vs: ['vs', 'versus', 'compare', 'comparison'],
  versus: ['vs', 'versus', 'compare', 'comparison'],
  compare: ['vs', 'versus', 'compare', 'comparison'],
  comparison: ['vs', 'versus', 'compare', 'comparison'],
  scenario: ['scenario', 'instant answer', 'worked example'],
  scenarios: ['scenario', 'instant answer', 'worked example'],
  methodology: ['methodology', 'how we calculate', 'formula'],
  formula: ['formula', 'how we calculate', 'methodology'],
  'how we calculate': ['how we calculate', 'methodology', 'formula'],
};

/** Words that never have to match (they describe the site, not the page). */
const SOFT_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'my', 'me', 'i', 'is', 'and', 'or', 'with', 'how',
  'much', 'what', 'whats', 'do', 'does', 'can', 'calculator', 'calculators', 'calc', 'tool', 'tools',
  'online', 'free', 'converter', 'convert', 'generator',
]);

/* ------------------------------------------------------------------ */
/* Index building (build time)                                         */
/* ------------------------------------------------------------------ */

export interface ToolInput {
  name: string;
  slug: string;
  category: string;
  description: string;
  keywords?: string[];
}
export interface ArticleInput {
  title: string;
  slug: string;
  description?: string;
  keywords?: string[];
  toolSlug?: string;
}
export interface SearchIndexInput {
  tools: ToolInput[];
  scenarios: ArticleInput[];
  comparisons: ArticleInput[];
  methodologies: ArticleInput[];
}

/** Extra tags per tool for the words people use that the copy may not. */
export const TOOL_TAGS: Record<string, string[]> = {
  'salary-uk': ['take home pay', 'net pay', 'paye', 'income tax', 'national insurance', 'payslip', 'after tax', 'student loan', 'salary uk'],
  'salary-us': ['take home pay', 'net pay', 'paycheck', 'after tax', 'federal tax', 'fica', 'w2'],
  'retirement-savings': ['401k', 'ira', 'pension', 'retirement saving', 'nest egg', 'retirement pot'],
  'retirement-contribution': ['pension contribution', 'retirement saving', 'how much to save'],
  'retirement-age': ['fire', 'retire early', 'retire at', 'early retirement', 'state pension age'],
  'mortgage-payment': ['home loan', 'monthly payment', 'repayment', 'ltv', 'loan to value'],
  'mortgage-affordability': ['how much house', 'afford', 'ltv', 'loan to value', 'deposit', 'down payment', 'loan to income'],
  'stamp-duty': ['sdlt', 'stamp duty land tax', 'first time buyer', 'house'],
  'capital-gains-tax': ['cgt', 'capital gain', 'shares', 'second home'],
  'compound-interest': ['interest', 'saving', 'growth', 'apy', 'apr'],
  'loan-amortization': ['amortisation', 'amortization schedule', 'loan', 'apr'],
  'credit-card-payoff': ['credit card', 'minimum payment', 'apr', 'card debt'],
  'debt-payoff': ['snowball', 'avalanche', 'debt free'],
  'pdf-compress': ['compress pdf', 'shrink pdf', 'reduce pdf size', 'smaller pdf'],
  'image-compressor': ['compress image', 'compress jpg', 'compress png', 'shrink photo', 'reduce image size'],
  'heic-to-jpg': ['heic', 'iphone photo', 'heif', 'jpg', 'jpeg'],
  'png-to-ico': ['favicon', 'ico'],
  'inflation': ['cpi', 'purchasing power', 'prices'],
  'emergency-fund': ['rainy day', 'safety net'],
  'rent-vs-buy': ['renting vs buying', 'rent or buy'],
};

const UK_HINT = /(\u00a3|\buk\b|\bisa\b|\blisa\b|\bhmrc\b|stamp duty|national insurance|\bsipp\b|plan [125]\b|student loan)/i;
const US_HINT = /(\$|\b401|\broth\b|\bira\b|\birs\b|\bfica\b|\bhysa\b|\bcds?\b)/i;

function regionOf(text: string): SearchRegion | undefined {
  const uk = UK_HINT.test(text);
  const us = US_HINT.test(text);
  if (uk && !us) return 'UK';
  if (us && !uk) return 'US';
  return undefined;
}

const TOOL_REGION: Record<string, SearchRegion> = {
  'salary-uk': 'UK',
  'stamp-duty': 'UK',
  'capital-gains-tax': 'UK',
  'salary-us': 'US',
};

function trimDesc(d: string | undefined, max = 120): string | undefined {
  if (!d) return undefined;
  const clean = d.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '\u2026';
}

/** Normalise and join phrases, de-duplicating whole phrases (word order inside a phrase is kept for phrase matching). */
function tags(...parts: Array<string | readonly string[] | undefined>): string {
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    for (const item of typeof p === 'string' ? [p] : p) {
      const n = normalizeText(item);
      if (n) out.push(n);
    }
  }
  return Array.from(new Set(out)).join(' | ');
}

/**
 * Hub tables and their row anchors. These MUST match the arrays in the hub
 * pages (src/pages/scenarios/*.astro); search-index.test.ts cross-checks
 * them against the hub sources so a drift fails the test suite.
 */
export const HUBS = {
  ukTakeHome: {
    path: '/scenarios/uk-take-home-pay/',
    title: 'UK take-home pay by salary',
    salaries: [20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 130000, 150000],
  },
  usTakeHome: {
    path: '/scenarios/us-take-home-pay/',
    title: 'US take-home pay by salary',
    salaries: [40000, 50000, 60000, 70000, 75000, 80000, 90000, 100000, 110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000, 250000],
  },
  mortgage: {
    path: '/scenarios/mortgage-payments-by-amount/',
    title: 'Mortgage payments by loan amount',
    amounts: [150000, 175000, 200000, 250000, 300000, 350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 750000],
  },
  investment: {
    path: '/scenarios/investment-growth/',
    title: 'Investment growth by amount',
    monthly: [100, 200, 250, 500, 1000, 2000],
    lumpSums: [5000, 10000, 25000, 50000, 100000, 500000],
  },
} as const;

const fmt = (n: number) => n.toLocaleString('en-GB');

/** Build the full search index from collection data. Pure; order is stable. */
export function buildSearchIndex(input: SearchIndexInput): SearchEntry[] {
  const out: SearchEntry[] = [];
  const toolPath = (t: { category: string; slug: string }) => `/tools/${t.category}/${t.slug}/`;

  for (const t of input.tools) {
    out.push({
      t: t.name,
      u: toolPath(t),
      k: 'tool',
      d: trimDesc(t.description),
      s: tags(t.slug.replace(/-/g, ' '), t.keywords),
      a: TOOL_TAGS[t.slug] ? tags(TOOL_TAGS[t.slug]) : undefined,
      r: TOOL_REGION[t.slug],
    });
  }

  // Hub pages and their rows
  const h = HUBS;
  out.push({ t: h.ukTakeHome.title, u: h.ukTakeHome.path, k: 'hub', d: 'Income tax, National Insurance and take-home pay at every common UK salary.', s: tags('take home pay salary after tax uk paye table'), r: 'UK' });
  out.push({ t: h.usTakeHome.title, u: h.usTakeHome.path, k: 'hub', d: 'Federal tax, FICA and take-home pay at every common US salary.', s: tags('take home pay salary after tax us paycheck table'), r: 'US' });
  out.push({ t: h.mortgage.title, u: h.mortgage.path, k: 'hub', d: 'Monthly payments for common loan sizes at the latest average rate and five fixed rates.', s: tags('mortgage payment monthly loan amount table') });
  out.push({ t: h.investment.title, u: h.investment.path, k: 'hub', d: 'What monthly investing and lump sums grow into over 10, 20 and 30 years.', s: tags('investment growth invested compound monthly lump sum table') });
  for (const n of h.ukTakeHome.salaries) {
    out.push({ t: `\u00a3${fmt(n)} salary after tax (UK)`, u: `${h.ukTakeHome.path}#${n / 1000}k`, k: 'row', s: tags(`${n} salary take home pay after tax uk paye net`), r: 'UK' });
  }
  for (const n of h.usTakeHome.salaries) {
    out.push({ t: `$${fmt(n)} salary after tax (US)`, u: `${h.usTakeHome.path}#${n / 1000}k`, k: 'row', s: tags(`${n} salary take home pay after tax us paycheck net`), r: 'US' });
  }
  for (const n of h.mortgage.amounts) {
    out.push({ t: `$${fmt(n)} mortgage: monthly payment`, u: `${h.mortgage.path}#${n / 1000}k`, k: 'row', s: tags(`${n} mortgage monthly payment loan`) });
  }
  for (const n of h.investment.monthly) {
    out.push({ t: `${fmt(n)} a month invested: growth over time`, u: `${h.investment.path}#${n}-per-month`, k: 'row', s: tags(`${n} per month monthly invested investing growth compound`) });
  }
  for (const n of h.investment.lumpSums) {
    out.push({ t: `${fmt(n)} lump sum invested: growth over time`, u: `${h.investment.path}#${n}`, k: 'row', s: tags(`${n} lump sum invested investing growth compound`) });
  }

  for (const sc of input.scenarios) {
    out.push({
      t: sc.title,
      u: `/scenarios/${sc.slug}/`,
      k: 'scenario',
      d: trimDesc(sc.description),
      s: tags(sc.slug.replace(/-/g, ' '), sc.keywords),
      r: regionOf(`${sc.title} ${sc.slug.replace(/-/g, ' ')}`),
    });
  }
  for (const c of input.comparisons) {
    out.push({
      t: c.title,
      u: `/comparisons/${c.slug}/`,
      k: 'comparison',
      d: trimDesc(c.description),
      s: tags(c.slug.replace(/-/g, ' '), c.keywords, 'vs compare comparison'),
      r: regionOf(`${c.title} ${c.slug.replace(/-/g, ' ')}`),
    });
  }
  for (const m of input.methodologies) {
    out.push({
      t: m.title,
      u: `/how-we-calculate/${m.slug}/`,
      k: 'method',
      s: tags('how we calculate methodology formula', m.slug.replace(/-/g, ' ')),
      r: m.toolSlug ? TOOL_REGION[m.toolSlug] : undefined,
    });
  }

  const pages: SearchEntry[] = [
    { t: 'All tools and calculators', u: '/tools/', k: 'page', s: tags('all tools calculators list browse directory') },
    { t: 'Scenarios: worked answers', u: '/scenarios/', k: 'page', s: tags('scenario scenarios instant answer worked example') },
    { t: 'Comparisons', u: '/comparisons/', k: 'page', s: tags('comparison comparisons vs versus compare') },
    { t: 'About CalcRun', u: '/about/', k: 'page', s: tags('about who') },
    { t: 'Who builds CalcRun', u: '/author/', k: 'page', s: tags('author accountant who builds about') },
    { t: 'Privacy policy and cookies', u: '/privacy/', k: 'page', s: tags('privacy cookies cookie analytics data gdpr') },
    { t: 'Embed a calculator', u: '/embed/', k: 'page', s: tags('embed widget iframe website') },
    { t: 'Accessibility', u: '/accessibility/', k: 'page', s: tags('accessibility a11y screen reader') },
  ];
  out.push(...pages);
  return out;
}

/* ------------------------------------------------------------------ */
/* Ranking (browser)                                                   */
/* ------------------------------------------------------------------ */

interface Field {
  words: string[];
  /** Space-padded word string for phrase matching (phrases never span a " | " boundary) */
  text: string;
}

interface Prepared {
  entry: SearchEntry;
  order: number;
  title: Field;
  alias: Field;
  tags: Field;
  desc: Field;
}

export interface PreparedIndex {
  items: Prepared[];
}

function field(normalized: string): Field {
  const w = words(normalized.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim());
  // Keep the phrase separators so "take home" cannot match across two keywords
  const text = ` ${normalized.split(' | ').map((ph) => words(ph).join(' ')).join(' | ')} `;
  return { words: w, text };
}

/** Tokenise every entry once; call after fetching the JSON. */
export function prepareIndex(entries: SearchEntry[]): PreparedIndex {
  return {
    items: entries.map((entry, order) => ({
      entry,
      order,
      title: field(normalizeText(entry.t)),
      alias: field(entry.a || ''),
      tags: field(entry.s || ''),
      desc: field(normalizeText(entry.d || '')),
    })),
  };
}

type Concept = string[]; // alternatives, each a normalised (stemmed) word or phrase

export interface ParsedQuery {
  concepts: Concept[];
  /** "uk"/"british" or "us"/"usa"/"american" typed in the query */
  region: SearchRegion | null;
}

const REGION_WORDS: Record<string, SearchRegion> = {
  uk: 'UK', british: 'UK', britain: 'UK', england: 'UK', scotland: 'UK', wales: 'UK',
  us: 'US', usa: 'US', american: 'US', america: 'US',
};

/** Turn a raw query into concepts that must all match. Exported for tests. */
export function parseQuery(query: string): ParsedQuery {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  const concepts: Concept[] = [];
  let region: SearchRegion | null = null;
  const keys = Object.keys(SYNONYMS).sort((a, b) => b.split(' ').length - a.split(' ').length);
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (const key of keys) {
      const kw = key.split(' ');
      if (tokens.slice(i, i + kw.length).join(' ') === key) {
        const alts = [key, ...SYNONYMS[key]].map((p) => words(p).join(' '));
        concepts.push(Array.from(new Set(alts)));
        i += kw.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const tok = tokens[i];
    i += 1;
    if (REGION_WORDS[tok]) {
      region = REGION_WORDS[tok];
      continue;
    }
    if (SOFT_STOPWORDS.has(tok)) continue;
    concepts.push([stem(tok)]);
  }
  return { concepts, region };
}

const KIND_WEIGHT: Record<SearchKind, number> = {
  tool: 14,
  hub: 9,
  page: 6,
  comparison: 5,
  scenario: 3,
  row: 2,
  method: -6,
};

function isNumber(w: string): boolean {
  return /^\d/.test(w);
}

/** Best score for one alternative against one field; 0 means no match. */
function fieldScore(alt: string, f: Field, exact: number, prefix: number): number {
  if (alt.includes(' ')) {
    return f.text.includes(` ${alt} `) ? exact + 4 : 0;
  }
  let best = 0;
  for (const w of f.words) {
    if (w === alt) return exact;
    if (!isNumber(alt) && alt.length >= 2 && w.startsWith(alt)) best = Math.max(best, prefix);
  }
  return best;
}

export interface SearchOptions {
  limit?: number;
  /** Visitor region (window.calcrunRegion); a region typed in the query wins */
  region?: string | null;
}

/** Rank the index for a query. Returns at most `limit` entries (default 8). */
export function searchIndex(index: PreparedIndex, query: string, opts: SearchOptions = {}): SearchEntry[] {
  const limit = opts.limit ?? 8;
  const { concepts, region: typedRegion } = parseQuery(query);
  const visitor = opts.region === 'UK' || opts.region === 'US' ? opts.region : null;
  const region = typedRegion || visitor;
  if (concepts.length === 0) {
    // Only a region word typed ("uk"): show that region's main pages
    if (!typedRegion) return [];
    return index.items
      .filter((p) => p.entry.r === typedRegion && (p.entry.k === 'tool' || p.entry.k === 'hub'))
      .slice(0, limit)
      .map((p) => p.entry);
  }

  const scored: Array<{ p: Prepared; score: number }> = [];
  for (const p of index.items) {
    let total = 0;
    let titleHits = 0;
    let ok = true;
    for (let ci = 0; ci < concepts.length; ci++) {
      let best = 0;
      let inTitle = false;
      for (let ai = 0; ai < concepts[ci].length; ai++) {
        const alt = concepts[ci][ai];
        // The literal query word (first alternative) outranks its synonyms
        const literal = ai === 0 ? 1 : 0.8;
        const t = Math.max(fieldScore(alt, p.title, 30, 18), fieldScore(alt, p.alias, 30, 18)) * literal;
        const g = fieldScore(alt, p.tags, 16, 9) * literal;
        const d = fieldScore(alt, p.desc, 6, 3) * literal;
        const s = Math.max(t, g, d);
        if (s > best) {
          best = s;
          inTitle = t > 0 && t >= g && t >= d;
        }
      }
      if (best === 0) {
        ok = false;
        break;
      }
      if (inTitle) titleHits += 1;
      total += best;
    }
    if (!ok) continue;
    total += KIND_WEIGHT[p.entry.k];
    if (titleHits === concepts.length) total += 10;
    if (concepts[0].some((alt) => p.title.text.startsWith(` ${alt} `))) total += 6;
    if (region && p.entry.r === region) total += typedRegion ? 20 : 7;
    if (region && p.entry.r && p.entry.r !== region) total -= typedRegion ? 20 : 3;
    scored.push({ p, score: total });
  }
  scored.sort((a, b) => b.score - a.score || a.p.order - b.p.order);
  return scored.slice(0, limit).map((x) => x.p.entry);
}

/** Human label for a result (shown as quiet meta text, not a badge). */
export function resultLabel(e: Pick<SearchEntry, 'k' | 'u'>): string {
  switch (e.k) {
    case 'tool':
      if (e.u.startsWith('/tools/file-tools/')) return 'File tool';
      if (e.u.startsWith('/tools/utility/')) return 'Tool';
      return 'Calculator';
    case 'hub': return 'Table';
    case 'row': return 'Answer';
    case 'scenario': return 'Worked answer';
    case 'comparison': return 'Comparison';
    case 'method': return 'How we calculate';
    default: return 'Page';
  }
}

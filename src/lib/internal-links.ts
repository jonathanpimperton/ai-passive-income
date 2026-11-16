/**
 * Internal link graph for tool, scenario, comparison and methodology pages.
 *
 * Links were one-way (GROWTH-SEO-05): comparisons linked to tools through
 * `relatedTools`, but no tool page linked back to a comparison, and most
 * methodology pages had a single inlink. These helpers derive the reverse
 * links from the same data, so adding a comparison or scenario automatically
 * links it from its tools. Pure functions over plain data (no astro:content),
 * so they are unit-tested directly.
 */

export type Region = 'UK' | 'US' | 'ANY';

export interface ScenarioLink {
  slug: string;
  title: string;
  description: string;
  toolSlug: string;
  resultSummary: string;
}

export interface ComparisonLink {
  slug: string;
  title: string;
  description: string;
  relatedTools: string[];
}

export interface HubLink {
  href: string;
  label: string;
}

/**
 * Hub reference tables per tool. These consolidated the retired per-value
 * doorway scenarios in July 2026, so they are linked even when a tool has no
 * individual scenarios left.
 */
const HUBS: Record<string, HubLink> = {
  ukTakeHome: { href: '/scenarios/uk-take-home-pay/', label: 'UK take-home pay by salary (£20k to £150k)' },
  usTakeHome: { href: '/scenarios/us-take-home-pay/', label: 'US take-home pay by salary ($40k to $250k)' },
  mortgages: { href: '/scenarios/mortgage-payments-by-amount/', label: 'Mortgage payments by amount ($150,000 to $750,000)' },
  growth: { href: '/scenarios/investment-growth/', label: 'Investment growth by amount' },
};

const HUB_FOR_TOOL: Record<string, HubLink> = {
  'salary-uk': HUBS.ukTakeHome,
  'salary-us': HUBS.usTakeHome,
  'mortgage-payment': HUBS.mortgages,
  'loan-amortization': HUBS.mortgages,
  'mortgage-affordability': HUBS.mortgages,
  'compound-interest': HUBS.growth,
  'investment-return': HUBS.growth,
};

/**
 * Curated additions for tools that no scenario names yet, so none of them is
 * a dead end. The underlying data fix (scenario `toolSlug`) belongs to the Wave 2
 * scenario owner; once it lands these entries become no-ops (results are
 * de-duplicated). Comparison links no longer need extras: every comparison lists
 * its calculators in `relatedTools`.
 */
const EXTRA_SCENARIOS: Record<string, string[]> = {
  'credit-card-payoff': ['50k-credit-card-debt-payoff', 'pay-off-30k-debt'],
  'mortgage-affordability': ['save-for-house-deposit'],
  'rent-vs-buy': ['save-for-house-deposit'],
  'car-finance': ['50k-car-loan-4-years'],
};

/** Tools whose output is for one country only. */
const TOOL_REGION: Record<string, Region> = {
  'salary-uk': 'UK',
  'stamp-duty': 'UK',
  'salary-us': 'US',
};

const UK_SIGNALS = /£|\bUK\b|\bISAs?\b|\bLISA\b|\bHMRC\b|\bPCP\b|National Insurance|stamp duty|\bSDLT\b/i;
const US_SIGNALS = /\$|401\(k\)|\bIRAs?\b|\bRoth\b|\bFDIC\b|\bIRS\b|\bCDs\b|\bFICA\b/;

/** Audience of a piece of content from its own title/description. */
export function contentRegion(text: string): Region {
  const uk = UK_SIGNALS.test(text);
  const us = US_SIGNALS.test(text);
  if (uk && !us) return 'UK';
  if (us && !uk) return 'US';
  return 'ANY';
}

export function toolRegion(toolSlug: string): Region {
  return TOOL_REGION[toolSlug] ?? 'ANY';
}

const regionOf = (item: { title: string; description: string }) => contentRegion(`${item.title} ${item.description}`);

/**
 * getCollection() order follows the filesystem and differs between machines
 * (and between a local build and the CI build), so every list here is ordered
 * by slug first. Same input, same HTML, on every build.
 */
export function bySlug<T extends { slug: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareSlugs(a.slug, b.slug));
}

/** The one slug ordering used everywhere: plain code-point order (locale-independent). */
export function compareSlugs(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
const conflicts = (a: Region, b: Region) => a !== 'ANY' && b !== 'ANY' && a !== b;

export function hubForTool(toolSlug: string): HubLink | undefined {
  return HUB_FOR_TOOL[toolSlug];
}

/** The part of a comparison title before the colon, e.g. "Pension vs ISA". */
export function shortTitle(title: string): string {
  return title.split(':')[0].trim();
}

/**
 * Comparisons that discuss a tool: every comparison listing it in
 * `relatedTools` (where it is listed first ranks first). Comparisons for the
 * other country are dropped on single-country tools.
 */
export function comparisonsForTool<T extends ComparisonLink>(toolSlug: string, comparisons: T[], limit = 6): T[] {
  const region = toolRegion(toolSlug);
  const listed = bySlug(comparisons)
    .map((c, i) => ({ c, i, pos: c.relatedTools.indexOf(toolSlug) }))
    .filter(({ pos }) => pos !== -1)
    .sort((a, b) => a.pos - b.pos || a.i - b.i)
    .map(({ c }) => c);
  return listed.filter((c) => !conflicts(region, regionOf(c))).slice(0, limit);
}

/** Scenarios built on a tool (`toolSlug`), then curated extras. */
export function scenariosForTool<T extends ScenarioLink>(toolSlug: string, scenarios: T[]): T[] {
  const own = bySlug(scenarios).filter((s) => s.toolSlug === toolSlug);
  const extras = (EXTRA_SCENARIOS[toolSlug] ?? [])
    .map((slug) => scenarios.find((s) => s.slug === slug))
    .filter((s): s is T => s !== undefined);
  const seen = new Set<string>();
  return [...own, ...extras].filter((s) => !seen.has(s.slug) && seen.add(s.slug));
}

/**
 * Sidebar "More comparisons": ranked by shared calculators and audience
 * instead of collection order (every page used to show the same 5 links).
 */
export function relatedComparisons<T extends ComparisonLink>(current: T, all: T[], limit = 5): T[] {
  const region = regionOf(current);
  return bySlug(all)
    .map((c, i) => {
      const shared = c.relatedTools.filter((t) => current.relatedTools.includes(t)).length;
      const r = regionOf(c);
      const score = shared * 3 + (region !== 'ANY' && r === region ? 2 : 0) - (conflicts(region, r) ? 20 : 0);
      return { c, i, score };
    })
    .filter(({ c }) => c.slug !== current.slug)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map(({ c }) => c);
}

/** Sidebar "Related scenarios": same calculator first, then same audience. */
export function relatedScenarios<T extends ScenarioLink>(current: T, all: T[], limit = 4): T[] {
  const region = regionOf(current);
  const others = bySlug(all).filter((s) => s.slug !== current.slug);
  const sameTool = others.filter((s) => s.toolSlug === current.toolSlug);
  const sameRegion =
    region === 'ANY' ? [] : others.filter((s) => s.toolSlug !== current.toolSlug && regionOf(s) === region);
  return [...sameTool, ...sameRegion].slice(0, limit);
}

/** Guides that use a tool, for its methodology page: hub, scenarios, comparisons. */
export function guidesForTool<S extends ScenarioLink, C extends ComparisonLink>(
  toolSlug: string,
  scenarios: S[],
  comparisons: C[]
): { hub: HubLink | undefined; scenarios: S[]; comparisons: C[] } {
  return {
    hub: hubForTool(toolSlug),
    scenarios: scenariosForTool(toolSlug, scenarios),
    comparisons: comparisonsForTool(toolSlug, comparisons),
  };
}

/**
 * Labels for a comparison table's option columns. Uses the part of the title
 * that contains "vs" (before or after a colon), so "Emergency Fund: Savings
 * Account vs Money Market" yields "Savings Account" / "Money Market" instead of
 * the "Option A" / "Option B" fallback (CMP-22).
 */
export function comparisonOptionLabels(title: string, columns: number): string[] {
  const vsSplit = /\s+vs\.?\s+/i;
  const segment = title.split(':').map((s) => s.trim()).find((s) => vsSplit.test(s));
  const parts = segment ? segment.split(vsSplit).map((p) => p.trim()) : [];
  const fallback = ['Option A', 'Option B', 'Option C'];
  return Array.from({ length: columns }, (_, i) => (parts.length >= 2 && parts[i]) || fallback[i]);
}

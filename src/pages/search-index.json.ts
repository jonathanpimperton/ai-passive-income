/**
 * Build-time search index (static file: /search-index.json).
 *
 * Built from the same sources as the pages themselves -- tools-data plus the
 * tools / scenarios / comparisons / methodologies content collections -- so
 * search can never point at a page that does not exist. The header search
 * fetches it lazily on first use; see src/lib/search-index.ts for the shape
 * and the ranking.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { TOOLS } from '@lib/tools-data';
import { buildSearchIndex, type ArticleInput } from '@lib/search-index';

export const GET: APIRoute = async () => {
  const [toolDocs, scenarios, comparisons, methodologies] = await Promise.all([
    getCollection('tools'),
    getCollection('scenarios'),
    getCollection('comparisons'),
    getCollection('methodologies'),
  ]);
  const keywordsBySlug = new Map(toolDocs.map((d) => [d.data.slug, d.data.keywords]));
  const article = (d: { title: string; slug: string; description?: string; keywords?: string[]; toolSlug?: string }): ArticleInput => ({
    title: d.title,
    slug: d.slug,
    description: d.description,
    keywords: d.keywords,
    toolSlug: d.toolSlug,
  });
  const bySlug = <T extends { data: { slug: string } }>(a: T, b: T) => a.data.slug.localeCompare(b.data.slug);

  const entries = buildSearchIndex({
    tools: TOOLS.map((t) => ({ ...t, keywords: keywordsBySlug.get(t.slug) ?? [] })),
    scenarios: [...scenarios].sort(bySlug).map((d) => article(d.data)),
    comparisons: [...comparisons].sort(bySlug).map((d) => article(d.data)),
    methodologies: [...methodologies].sort(bySlug).map((d) => article(d.data)),
  });

  return new Response(JSON.stringify({ v: 1, entries }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

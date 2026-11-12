import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'node:fs';
import rehypeMonoFigures from './src/lib/rehype-mono-figures.mjs';
import { remarkFiguresPlugin } from './src/lib/remark-figures.mjs';

/**
 * Map of page pathname -> lastUpdated date, sourced from tool markdown
 * frontmatter. Only pages with a real editorial date get <lastmod> in the
 * sitemap — no fake build-time freshness.
 */
function buildLastmodMap() {
  const map = new Map();
  const dir = new URL('./src/data/tools/', import.meta.url);
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const raw = readFileSync(new URL(file, dir), 'utf8');
    const slug = raw.match(/^slug:\s*"([^"]+)"/m)?.[1];
    const category = raw.match(/^category:\s*"([^"]+)"/m)?.[1];
    const lastUpdated = raw.match(/^lastUpdated:\s*"([^"]+)"/m)?.[1];
    if (slug && category && lastUpdated) {
      map.set(`/tools/${category}/${slug}/`, lastUpdated);
    }
  }
  return map;
}
const lastmodMap = buildLastmodMap();

export default defineConfig({
  site: 'https://www.calcrun.com',
  trailingSlash: 'always',
  // Per-checkout caches. The default (node_modules/.astro) holds the content-layer
  // data store; git worktrees share node_modules through a junction, so a shared
  // cache would let one checkout's content leak into another's build.
  cacheDir: './.astro-cache',
  // The Number Theater prototype was promoted to the production homepage
  redirects: { '/labs/story/': '/' },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  markdown: {
    // Build-time figure tokens {{ ... }} resolved from the src/lib engines (docs/figures.md)
    remarkPlugins: [remarkFiguresPlugin],
    // Mono numerals on financial figures inside markdown tables + bold stats
    rehypePlugins: [rehypeMonoFigures],
  },
  integrations: [
    react(),
    sitemap({
      // /labs/ pages are prototypes — noindex'd and kept out of the sitemap
      filter: (page) => !new URL(page).pathname.startsWith('/labs/'),
      serialize(item) {
        const lastmod = lastmodMap.get(new URL(item.url).pathname);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    cacheDir: './.astro-cache/vite',
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['pdfjs-dist'],
    },
  },
});

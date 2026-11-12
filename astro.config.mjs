import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import rehypeMonoFigures from './src/lib/rehype-mono-figures.mjs';
import rehypeTableA11y from './src/lib/rehype-table-a11y.mjs';
import { buildLastmodMap, ensureFullHistory } from './src/lib/sitemap-lastmod.mjs';

/**
 * Honest sitemap <lastmod> for every URL: editorial dates for content, git
 * last-commit dates for templates, never the build time. See
 * src/lib/sitemap-lastmod.mjs. Shallow CI clones are unshallowed first so the
 * git dates are real; dates that still can't be established are omitted.
 */
const ROOT = fileURLToPath(new URL('.', import.meta.url));
ensureFullHistory(ROOT);
const lastmodMap = buildLastmodMap({ root: ROOT });

/** Pages kept out of the sitemap: noindex'd prototypes and embed-only frames. */
const isSitemapExcluded = (pathname) =>
  pathname.startsWith('/labs/') || /^\/embed\/.+/.test(pathname);

export default defineConfig({
  site: 'https://www.calcrun.com',
  trailingSlash: 'always',
  // Per-checkout caches. The default (node_modules/.astro) holds the content-layer
  // data store; git worktrees share node_modules through a junction, so a shared
  // cache would let one checkout's content leak into another's build.
  cacheDir: './.astro-cache',
  // The Number Theater prototype was promoted to the production homepage
  redirects: { '/labs/story/': '/' },
  // Opt-in prefetch only: links marked data-astro-prefetch load on hover/focus.
  // (prefetchAll + viewport fetched ~35 pages per desktop load, A11Y-PERF-08.)
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  markdown: {
    // Mono numerals on financial figures inside markdown tables + bold stats;
    // column scopes and heading-derived captions on markdown tables (F-25)
    rehypePlugins: [rehypeMonoFigures, rehypeTableA11y],
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !isSitemapExcluded(new URL(page).pathname),
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

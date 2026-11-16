import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import rehypeMonoFigures from './src/lib/rehype-mono-figures.mjs';
import { remarkFiguresPlugin } from './src/lib/remark-figures.mjs';

import rehypeTableA11y from './src/lib/rehype-table-a11y.mjs';
import { buildLastmodMap, ensureFullHistory } from './src/lib/sitemap-lastmod.mjs';

/**
 * Honest sitemap <lastmod> for every URL: editorial dates for content, git
 * last-commit dates for templates, never the build time. See
 * src/lib/sitemap-lastmod.mjs. Shallow CI clones are unshallowed first so the
 * git dates are real; dates that still can't be established are omitted.
 */
const ROOT = fileURLToPath(new URL('.', import.meta.url));
// Pages that read git dates at build time (methodology bylines) use this root,
// not whatever directory the build was started from.
process.env.CALCRUN_ROOT = ROOT;
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
    // Build-time figure tokens {{ ... }} resolved from the src/lib engines (docs/figures.md)
    remarkPlugins: [remarkFiguresPlugin],
    // Mono numerals on financial figures inside markdown tables + bold stats
    rehypePlugins: [rehypeMonoFigures, rehypeTableA11y],
    // (rehypeTableA11y: column scopes and heading-derived captions on markdown tables, F-25)
  },
  integrations: [
    react(),
    // sitemap-index.xml's own <lastmod> is set by the integration to the newest
    // URL lastmod below, so it inherits the same honest dates (never build time).
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
    // marked is imported only by the Markdown tool's Web Worker, which the dev server's dependency
    // scan does not follow. Without this, the first visit finds it late, re-optimises and reloads
    // the page mid-test ("new dependencies optimized: marked").
    optimizeDeps: { include: ['marked'] },
    ssr: {
      noExternal: ['pdfjs-dist'],
    },
  },
});

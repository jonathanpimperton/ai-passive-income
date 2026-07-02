import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'node:fs';

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
  integrations: [
    react(),
    sitemap({
      serialize(item) {
        const lastmod = lastmodMap.get(new URL(item.url).pathname);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['pdfjs-dist'],
    },
  },
});

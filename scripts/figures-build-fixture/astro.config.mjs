// Minimal Astro project for scripts/check-figures-build.mjs: the real figure
// plugin entry, nothing else. Not part of the site build.
import { defineConfig } from 'astro/config';
import { remarkFiguresPlugin } from '../../src/lib/remark-figures.mjs';

export default defineConfig({
  cacheDir: './.astro-cache',
  // Keep Vite's dependency cache inside the cache dir the check script deletes.
  vite: { cacheDir: './.astro-cache/vite' },
  markdown: {
    remarkPlugins: [remarkFiguresPlugin],
  },
});

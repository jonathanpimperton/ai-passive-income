// Minimal Astro project for scripts/check-figures-build.mjs: the real figure
// plugin entry, nothing else. Not part of the site build.
import { defineConfig } from 'astro/config';
import { remarkFiguresPlugin } from '../../src/lib/remark-figures.mjs';

export default defineConfig({
  cacheDir: './.astro-cache',
  markdown: {
    remarkPlugins: [remarkFiguresPlugin],
  },
});

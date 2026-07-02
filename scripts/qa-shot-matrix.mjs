/**
 * Screenshot matrix — full-page captures of representative page types at
 * mobile/tablet/desktop widths (plus a dark-mode subset) for visual review.
 * Pre-scrolls each page so scroll-reveal content is visible in captures.
 *
 * Usage:
 *   npm run build
 *   npx astro preview --port 4399   (in another terminal, serves dist/)
 *   node scripts/qa-shot-matrix.mjs
 *
 * Output: test-results/shots-matrix/*.png
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.QA_BASE_URL || 'http://localhost:4399';
const OUT = join('test-results', 'shots-matrix');
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', '/'],
  ['tools-index', '/tools/'],
  ['calc-compound', '/tools/saving-and-growth/compound-interest/'],
  ['calc-salary-uk', '/tools/income-and-planning/salary-uk/'],
  ['calc-mortgage', '/tools/debt-and-loans/mortgage-payment/'],
  ['calc-stamp-duty', '/tools/economic/stamp-duty/'],
  ['scenario', '/scenarios/50k-salary-uk-take-home/'],
  ['scenarios-index', '/scenarios/'],
  ['comparison', '/comparisons/pension-vs-isa-uk/'],
  ['comparisons-index', '/comparisons/'],
  ['methodology', '/how-we-calculate/compound-interest/'],
  ['about', '/about/'],
  ['converter', '/tools/file-tools/image-compressor/'],
  ['utility', '/tools/utility/percentage-calculator/'],
];

const VIEWPORTS = [
  ['m360', 360, 800],
  ['t768', 768, 1024],
  ['d1440', 1440, 900],
];

const DARK_PAGES = new Set(['home', 'calc-compound', 'scenario', 'tools-index']);

const browser = await chromium.launch();
let n = 0;
for (const [pname, path] of PAGES) {
  for (const [vname, w, h] of VIEWPORTS) {
    for (const dark of [false, true]) {
      if (dark && !(DARK_PAGES.has(pname) && vname !== 't768')) continue;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.addInitScript((t) => localStorage.setItem('calcrun.theme', t), dark ? 'dark' : 'light');
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2200);
      // Scroll through to trigger scroll-reveal animations, then back to top —
      // otherwise below-fold content captures as opacity-0 "blank"
      await page.evaluate(async () => {
        await new Promise((res) => {
          let y = 0;
          const step = () => {
            y += 700;
            window.scrollTo(0, y);
            if (y < document.documentElement.scrollHeight) setTimeout(step, 50);
            else { window.scrollTo(0, 0); setTimeout(res, 400); }
          };
          step();
        });
      });
      await page.screenshot({ path: join(OUT, `${pname}--${vname}${dark ? '--dark' : ''}.png`), fullPage: true });
      await ctx.close();
      n++;
    }
  }
}
await browser.close();
console.log(`DONE ${n} screenshots -> ${OUT}`);

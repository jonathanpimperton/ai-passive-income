/**
 * Responsive QA sweep — loads EVERY built page at mobile/tablet/desktop widths
 * and reports horizontal overflow (with offending elements), page errors, and
 * load failures. Zero findings = pass.
 *
 * Usage:
 *   npm run build
 *   npx astro preview --port 4399   (in another terminal, serves dist/)
 *   node scripts/qa-responsive-sweep.mjs
 *
 * Output: test-results/responsive-report.json
 */
import { chromium } from '@playwright/test';
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.QA_BASE_URL || 'http://localhost:4399';
const DIST = 'dist';
mkdirSync('test-results', { recursive: true });
const OUT = join('test-results', 'responsive-report.json');

function collectRoutes(dir, prefix = '') {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...collectRoutes(full, `${prefix}/${entry}`));
    } else if (entry === 'index.html') {
      routes.push(`${prefix}/` || '/');
    }
  }
  return routes;
}
const routes = collectRoutes(DIST).map((r) => (r === '' ? '/' : r));
console.log(`routes: ${routes.length}`);

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

const CONCURRENCY = 6;
const browser = await chromium.launch();
const findings = [];
let done = 0;

async function checkPage(route, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));
  try {
    await page.addInitScript(() => localStorage.setItem('calcrun.theme', 'light'));
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1400); // client:idle hydration
    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
      const offenders = [];
      if (overflow > 1) {
        const vw = doc.clientWidth;
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > vw + 2 || r.left < -2)) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className && typeof el.className === 'string')
              ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
              : '';
            offenders.push(`${tag}${cls} [w=${Math.round(r.width)} right=${Math.round(r.right)}]`);
            if (offenders.length >= 4) break;
          }
        }
      }
      return { overflow, offenders };
    });
    if (result.overflow > 1 || consoleErrors.length) {
      findings.push({ route, viewport: vp.name, overflowPx: result.overflow, offenders: result.offenders, errors: consoleErrors.slice(0, 3) });
    }
  } catch (e) {
    findings.push({ route, viewport: vp.name, loadError: String(e).slice(0, 150) });
  } finally {
    await ctx.close();
    done++;
    if (done % 60 === 0) console.log(`progress ${done}/${routes.length * VIEWPORTS.length}`);
  }
}

const queue = [];
for (const vp of VIEWPORTS) for (const r of routes) queue.push([r, vp]);
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const [r, vp] = queue.shift();
    await checkPage(r, vp);
  }
});
await Promise.all(workers);
await browser.close();

findings.sort((a, b) => (b.overflowPx || 0) - (a.overflowPx || 0));
writeFileSync(OUT, JSON.stringify({ total: routes.length * VIEWPORTS.length, findingCount: findings.length, findings }, null, 2));
console.log(`DONE: ${findings.length} findings of ${routes.length * VIEWPORTS.length} checks -> ${OUT}`);
process.exit(findings.length > 0 ? 1 : 0);

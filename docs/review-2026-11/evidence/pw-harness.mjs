// Shared Playwright harness for the CalcRun review.
// Import with:  import * as H from 'file:///C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/_shared/pw.mjs';
//
// Guarantees (do not bypass):
//  - GA4/GTM requests are aborted in every context (live AND preview: the built HTML
//    carries the production GA4 tag, so localhost hits would pollute the real property).
//  - /api/* requests never reach production; they are answered by a mock (default 503)
//    unless you pass your own mockApi(route) handler.
//  - Optional liveHeaders:true re-applies public/_headers (CSP etc.) to preview responses,
//    because `astro preview` ignores _headers.
import { createRequire } from 'node:module';
import fs from 'node:fs';

export const REPO = 'C:/Users/jonat/projects/0. Archive - completed projects in use/CalcRun';
const require = createRequire(REPO + '/package.json');
const pw = require('playwright');
export const { chromium, webkit, firefox, devices } = pw;

export const PREVIEW = 'http://127.0.0.1:4399';
export const LIVE = 'https://www.calcrun.com';
export const GA_RE = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;
export const API_RE = /(calcrun\.com|127\.0\.0\.1:4399|localhost:4399)\/api\//;
export const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// ---- _headers emulation -------------------------------------------------------------
function parseHeadersFile() {
  const txt = fs.readFileSync(REPO + '/public/_headers', 'utf8');
  const rules = [];
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { cur = { pattern: raw.trim(), set: [], detach: [] }; rules.push(cur); continue; }
    const line = raw.trim();
    if (line.startsWith('!')) { cur.detach.push(line.slice(1).trim().toLowerCase()); continue; }
    const i = line.indexOf(':');
    cur.set.push([line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim()]);
  }
  return rules;
}
const HEADER_RULES = parseHeadersFile();
function matches(pattern, path) {
  const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return re.test(path);
}
/** Headers Cloudflare would apply to `path` per public/_headers (accumulate + detach semantics). */
export function liveHeadersFor(path) {
  const out = {};
  for (const r of HEADER_RULES) {
    if (!matches(r.pattern, path)) continue;
    for (const d of r.detach) delete out[d];
    for (const [k, v] of r.set) out[k] = out[k] ? out[k] + ', ' + v : v;
  }
  return out;
}

// ---- context factory ----------------------------------------------------------------
/**
 * newContext(browser, { mockApi, liveHeaders, ...playwrightContextOptions })
 * mockApi: async (route) => route.fulfill({...})   (default: 503 JSON)
 */
export async function newContext(browser, opts = {}) {
  const { mockApi, liveHeaders, ...ctxOpts } = opts;
  const ctx = await browser.newContext(ctxOpts);
  await ctx.route(GA_RE, (r) => r.abort());
  await ctx.route(API_RE, (r) =>
    mockApi ? mockApi(r) : r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"blocked by review harness"}' }));
  if (liveHeaders) {
    await ctx.route(/^http:\/\/127\.0\.0\.1:4399\/(?!api\/)/, async (route) => {
      const res = await route.fetch();
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({ response: res, headers: { ...res.headers(), ...liveHeadersFor(path) } });
    });
  }
  return ctx;
}

/** Collect console errors, page errors, failed requests and CSP violations on a page. */
export function instrument(page) {
  const log = { console: [], pageErrors: [], failed: [], requests: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.console.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => log.pageErrors.push(String(e && e.stack || e)));
  page.on('requestfailed', (r) => log.failed.push(`${r.failure()?.errorText} ${r.url()}`));
  page.on('request', (r) => log.requests.push(`${r.method()} ${r.url()}`));
  return log;
}

/** Run axe-core on the current page; returns violations array. */
export async function axe(page, tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']) {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async (t) => (await window.axe.run(document, { runOnly: { type: 'tag', values: t } })).violations, tags);
}

/** Mark the homepage intro as seen (skip the cinematic) before navigation. */
export async function skipIntro(ctx) {
  await ctx.addInitScript(() => { try { sessionStorage.setItem('calcrun.introSeen', '1'); } catch (e) {} });
}

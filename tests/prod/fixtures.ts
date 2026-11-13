/**
 * Shared fixture for the production-config suite (tests/prod/**).
 *
 * Guarantees for every browser context:
 *  - GA4/GTM requests are aborted (the built HTML carries the production GA4 tag) and
 *    counted in `gaRequests`;
 *  - Cloudflare Turnstile's api.js is replaced by a small fake (`turnstileMode` option), so
 *    tests are deterministic and never contact Cloudflare. The fake records every render()
 *    configuration in window.__tsRenders;
 *  - against a deployed site (PROD_BASE_URL), every /api/ request is aborted.
 */
import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export { expect };

export const GA_RE = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;
/** True when the suite runs against scripts/serve-prod.mjs (not a deployed site). */
export const LOCAL = !process.env.PROD_BASE_URL;
export const DIST = path.resolve(process.cwd(), 'dist'); // tests run from the repo root
/** Cloudflare's documented dummy token; serve-prod's siteverify mock accepts only this. */
export const TS_DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

export type TurnstileMode = 'pass' | 'error' | 'never' | 'load-error';

/**
 * Fake Turnstile (test-only). window.__tsMode (set by the test, default from the fixture)
 * decides what render()/reset() do: 'pass' calls callback(token); 'error' calls
 * error-callback; 'never' does nothing.
 */
function fakeTurnstile(mode: TurnstileMode): string {
  return `(() => {
  const opts = {};
  let n = 0;
  window.__tsMode = window.__tsMode || ${JSON.stringify(mode)};
  window.__tsRenders = [];
  const fire = (id) => setTimeout(() => {
    const o = opts[id];
    if (!o) return;
    if (window.__tsMode === 'pass' && o.callback) o.callback(${JSON.stringify(TS_DUMMY_TOKEN)});
    else if (window.__tsMode === 'error' && o['error-callback']) o['error-callback']('300030');
  }, 50);
  window.turnstile = {
    render(el, o) { const id = 'w' + (++n); opts[id] = o; window.__tsRenders.push(Object.keys(o).reduce((a, k) => (a[k] = typeof o[k] === 'function' ? 'fn' : o[k], a), {})); fire(id); return id; },
    reset(id) { fire(id); },
    remove(id) { delete opts[id]; },
    execute(id) { fire(id); },
    getResponse() { return ''; },
    isExpired() { return false; },
  };
})();`;
}

interface Fixtures {
  turnstileMode: TurnstileMode;
  gaRequests: string[];
}

export const test = base.extend<Fixtures>({
  turnstileMode: ['pass', { option: true }],
  gaRequests: async ({}, use) => {
    await use([]);
  },
  context: async ({ context, turnstileMode, gaRequests }, use) => {
    await context.route(GA_RE, (route) => {
      gaRequests.push(route.request().url());
      return route.abort();
    });
    await context.route(/^https:\/\/challenges\.cloudflare\.com\//, (route) => {
      const url = route.request().url();
      if (url.includes('/turnstile/v0/api.js') && turnstileMode !== 'load-error') {
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: fakeTurnstile(turnstileMode) });
      }
      return route.abort();
    });
    if (!LOCAL) await context.route(/\/api\//, (route) => route.abort());
    // Skip the homepage intro (both the current sessionStorage key and the planned localStorage one).
    await context.addInitScript(() => {
      try { sessionStorage.setItem('calcrun.introSeen', '1'); } catch { /* storage blocked: intro may play */ }
      try { localStorage.setItem('calcrun.introSeen', '1'); } catch { /* storage blocked: intro may play */ }
    });
    await use(context);
  },
});

/**
 * Start collecting CSP violations on `page` (securitypolicyviolation events and console
 * "Content Security Policy" errors). Call before navigation; read with the returned fn.
 */
export async function collectCspViolations(page: Page): Promise<() => Promise<string[]>> {
  const consoleHits: string[] = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (/Content[- ]Security[- ]Policy|Refused to (load|execute|apply|connect|frame)/i.test(t)) consoleHits.push(`[console] ${t}`);
  });
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} blocked ${e.blockedURI} (${e.sourceFile}:${e.lineNumber})`);
    });
  });
  return async () => {
    let events: string[] = [];
    try {
      events = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    } catch (err) {
      events = [`could not read CSP events: ${String(err)}`];
    }
    return [...events, ...consoleHits];
  };
}

/** Wait until the Astro island containing `selector` has hydrated (its `ssr` attribute is gone). */
export async function waitForIsland(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    const island = el?.closest('astro-island');
    return Boolean(el) && (!island || !island.hasAttribute('ssr'));
  }, selector, { timeout: 20_000 });
}

/** Title of the built 404 page, used to recognise it in responses. */
export function notFoundTitle(): string {
  const html = fs.readFileSync(path.join(DIST, '404.html'), 'utf8');
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
}

/**
 * Developer tools under the production configuration (CSP and headers from public/_headers).
 *
 * Written for W1-PLAT's playwright.prod.config.ts (`npm run test:prod`, production CSP via
 * scripts/serve-prod.mjs). It is self-contained (no shared fixture import) so it also loads
 * and passes under the repo's default config before that harness is merged.
 *
 * The regression corpus lives in markdown-preview-corpus.spec.ts.
 */
import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route(/(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.abort());
});

async function waitForIsland(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    const island = el?.closest('astro-island');
    return Boolean(el) && Object.keys(el as object).some((k) => k.startsWith('__reactProps')) && (!island || !island.hasAttribute('ssr'));
  }, selector, { timeout: 30_000 });
}

/** Records CSP violation events on the page for the report. */
async function collectCspViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp ?? []);
}

const ROUTE = '/tools/file-tools/markdown-html/';

test.describe('Markdown tool under production config', () => {
  test('preview renders sanitised HTML', async ({ page }) => {
    const readCsp = await collectCspViolations(page);
    await page.goto(ROUTE);
    await waitForIsland(page, '#md-html-input');
    await page.getByRole('checkbox', { name: /Remove unsafe HTML/ }).uncheck();
    await page.locator('#md-html-input').fill('# Title\n\n<p onclick="go()" style="color:red">Hello</p>\n\n<script>go()</script>\n\n![logo](https://example.com/logo.png)');
    await page.getByRole('button', { name: 'Preview' }).click();

    const frameEl = page.locator('iframe[title="Markdown preview"]');
    await expect(frameEl).toHaveAttribute('sandbox', '');
    const frame = page.frameLocator('iframe[title="Markdown preview"]');
    await expect(frame.locator('h1')).toHaveText('Title');
    await expect(frame.locator('p', { hasText: 'Hello' })).toBeVisible();
    await expect(frame.locator('script')).toHaveCount(0);
    await expect(frame.locator('[onclick]')).toHaveCount(0);
    await expect(frame.locator('body [style]')).toHaveCount(0);
    await expect(frame.locator('img')).not.toHaveAttribute('src', /example\.com/);
    await expect(frame.locator('head meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    test.info().annotations.push({ type: 'csp', description: (await readCsp()).join('\n') || 'none' });
  });

  // The conversion worker is a same-origin script; this proves the production CSP allows it
  // and that the 4 s limit still holds when marked cannot be interrupted (Chromium and Firefox).
  test('stops input that parses very slowly in the worker, and the page stays responsive', async ({ page }) => {
    test.setTimeout(90_000);
    const readCsp = await collectCspViolations(page);
    await page.goto(ROUTE);
    await waitForIsland(page, '#md-html-input');
    await page.evaluate(() => {
      const w = window as unknown as { __maxGap: number };
      w.__maxGap = 0;
      let last = performance.now();
      setInterval(() => {
        const now = performance.now();
        w.__maxGap = Math.max(w.__maxGap, now - last);
        last = now;
      }, 50);
    });
    // 256 KB of unclosed link openers: one tokenizer call runs for tens of seconds or more.
    await page.locator('#md-html-input').fill('[a]('.repeat(65536));
    await page.evaluate(() => { (window as unknown as { __maxGap: number }).__maxGap = 0; });
    for (let i = 0; i < 5; i++) {
      const probeStart = Date.now();
      expect(await page.evaluate(() => 1 + 1)).toBe(2);
      expect(Date.now() - probeStart).toBeLessThan(3000);
      await page.waitForTimeout(300);
    }
    const alert = page.locator('astro-island').filter({ has: page.locator('textarea') }).first().getByRole('alert');
    await expect(alert).toContainText('too complex to convert in the browser', { timeout: 30_000 });
    expect(await page.evaluate(() => (window as unknown as { __maxGap: number }).__maxGap)).toBeLessThan(2500);
    expect(await readCsp(), 'no CSP violation (the worker script is allowed)').toEqual([]);

    await page.locator('#md-html-input').fill('# Fine');
    await expect(page.locator('#md-html-output')).toHaveValue(/<h1>Fine<\/h1>/);
  });
});

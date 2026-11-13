/**
 * Developer tools under the production configuration (CSP and headers from public/_headers).
 *
 * Written for W1-PLAT's playwright.prod.config.ts (`npm run test:prod`, production CSP via
 * scripts/serve-prod.mjs). It is self-contained (no shared fixture import) so it also loads
 * and passes under the repo's default config before that harness is merged.
 *
 * The second test reads an optional fixture, tests/fixtures/dev/markdown-preview-corpus.json
 * (a JSON array of Markdown strings), and is skipped while that file is absent.
 */
import fs from 'node:fs';
import path from 'node:path';
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
const CORPUS = path.resolve(process.cwd(), 'tests', 'fixtures', 'dev', 'markdown-preview-corpus.json');

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

  test('preview stays isolated for every fixture entry', async ({ page }) => {
    test.skip(!fs.existsSync(CORPUS), 'Optional fixture not present.');
    const corpus: string[] = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
    expect(corpus.length).toBeGreaterThan(0);

    // Any script that ran, in the page or in a frame, would log this marker.
    const marks: string[] = [];
    page.on('console', (m) => {
      if (m.text().includes('XSSMARK')) marks.push(m.text());
    });
    await page.goto(ROUTE);
    await waitForIsland(page, '#md-html-input');
    const url = page.url();
    const baseURI = await page.evaluate(() => document.baseURI);
    await page.getByRole('checkbox', { name: /Remove unsafe HTML/ }).uncheck();
    const editor = page.locator('#md-html-input');
    const preview = page.getByRole('button', { name: 'Preview' });

    for (const entry of corpus) {
      await editor.fill('');
      await editor.fill(entry);
      if (await preview.count()) {
        if ((await preview.getAttribute('aria-pressed')) !== 'true') await preview.click();
        const link = page.frameLocator('iframe[title="Markdown preview"]').locator('a').first();
        if (await link.count()) await link.click({ timeout: 2000 }).catch(() => { /* nothing clickable is fine */ });
      }
      await page.waitForTimeout(300);
      expect(page.url(), entry).toBe(url);
      expect(await page.evaluate(() => document.baseURI), entry).toBe(baseURI);
      expect(page.context().pages(), entry).toHaveLength(1);
      if (await page.locator('iframe[title="Markdown preview"]').count()) {
        await expect(page.locator('iframe[title="Markdown preview"]'), entry).toHaveAttribute('sandbox', '');
      }
    }
    expect(marks).toEqual([]);
  });
});

/**
 * RC3 / PL-3: zero CSP violations under the production CSP on representative pages
 * (the review found HEIC broken for months by a CSP that only production had).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, DIST, collectCspViolations, waitForIsland } from './fixtures';

const firstComparison = fs.readdirSync(path.join(DIST, 'comparisons'))
  .find((d) => fs.existsSync(path.join(DIST, 'comparisons', d, 'index.html')));

const PAGES = [
  '/',
  '/tools/',
  '/tools/saving-and-growth/compound-interest/',
  '/tools/income-and-planning/salary-uk/',
  '/tools/debt-and-loans/mortgage-payment/',
  '/tools/debt-and-loans/debt-payoff/',
  '/tools/file-tools/image-compressor/',
  '/tools/file-tools/heic-to-jpg/',
  '/tools/utility/json-formatter/',
  '/scenarios/uk-take-home-pay/',
  `/comparisons/${firstComparison}/`,
  '/how-we-calculate/compound-interest/',
  '/about/',
  '/embed/',
  '/plat-qa-missing-page/',
];

test.describe('production CSP', () => {
  for (const url of PAGES) {
    test(`no CSP violations on ${url}`, async ({ page }) => {
      const read = await collectCspViolations(page);
      await page.goto(url, { waitUntil: 'load' });
      // Scroll through the page so client:visible islands hydrate, then let idle work run.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      await page.waitForTimeout(1200);
      expect(await read()).toEqual([]);
    });
  }

  test('opening "Email my results" (loads Turnstile) raises no CSP violation', async ({ page }) => {
    const read = await collectCspViolations(page);
    await page.goto('/tools/saving-and-growth/compound-interest/');
    await waitForIsland(page, 'button[aria-controls^="email-results-panel-"]');
    await page.getByRole('button', { name: 'Email my results' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __tsRenders?: unknown[] }).__tsRenders?.length ?? 0)).toBeGreaterThan(0);
    expect(await read()).toEqual([]);
  });
});

/**
 * Markdown preview sanitisation under the production CSP (W1-DEV, DV-1 / S1-14).
 *
 * ENABLE (remove test.fixme) when the W1-DEV fix is live. The test corpus is NOT stored
 * here: W1-DEV adds it as tests/fixtures/dev/markdown-preview-corpus.json once the fix is
 * deployed (public repo). Format: a JSON array of Markdown strings. Each entry, if it ever
 * executed script, would call window.__calcrunCanary(); the test fails if the canary fires.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, collectCspViolations } from './fixtures';

const CORPUS = path.resolve(process.cwd(), 'tests', 'fixtures', 'dev', 'markdown-preview-corpus.json');

test.describe('Markdown preview never executes script', () => {
  test.fixme(true, 'Enable when the W1-DEV sanitisation fix is live and its corpus file is committed.');

  test('no corpus entry fires the canary', async ({ page }) => {
    const corpus: string[] = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
    expect(corpus.length).toBeGreaterThan(0);
    const read = await collectCspViolations(page);
    await page.addInitScript(() => {
      (window as unknown as { __canaryHits: number; __calcrunCanary: () => void }).__canaryHits = 0;
      (window as unknown as { __calcrunCanary: () => void }).__calcrunCanary = () => {
        (window as unknown as { __canaryHits: number }).__canaryHits++;
      };
    });
    await page.goto('/tools/file-tools/markdown-html/');
    const editor = page.locator('textarea').first();
    for (const entry of corpus) {
      await editor.fill(entry);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __canaryHits: number }).__canaryHits)).toBe(0);
    // Violations are acceptable here only if they are blocked inline handlers; record them.
    test.info().annotations.push({ type: 'csp', description: (await read()).join('\n') || 'none' });
  });
});

/**
 * HEIC conversion under the PRODUCTION CSP, in Chromium and Firefox (review: HEIC was
 * broken in production for months by a CSP that `astro preview` never applied; S1-12).
 *
 * W1-FILES supplies the HEIC route block in public/_headers (worker-src 'self' blob: for
 * heic-to's CSP build) and the fixture: a small synthetic 256x128 HEIC. Runs in the
 * "firefox" project too (playwright.prod.config.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, collectCspViolations } from './fixtures';

const FIXTURE = path.resolve(process.cwd(), 'tests', 'fixtures', 'file-tools', 'quadrants-256x128.heic');

test.describe('HEIC to JPG under production CSP', () => {
  test('a HEIC photo converts to a JPEG with zero CSP violations', async ({ page }) => {
    expect(fs.existsSync(FIXTURE), `missing fixture ${FIXTURE}`).toBe(true);
    const read = await collectCspViolations(page);
    await page.goto('/tools/file-tools/heic-to-jpg/');
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE);
    const download = page.waitForEvent('download', { timeout: 45_000 });
    await page.getByRole('button', { name: /download/i }).first().click({ timeout: 45_000 });
    const file = await download;
    const saved = await file.path();
    const bytes = fs.readFileSync(saved!);
    expect(bytes[0]).toBe(0xff); // JPEG SOI marker
    expect(bytes[1]).toBe(0xd8);
    expect(await read()).toEqual([]);
  });
});

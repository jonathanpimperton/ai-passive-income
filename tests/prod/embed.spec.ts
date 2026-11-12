/**
 * Embed v2 framing headers and behaviour (W1-LAYOUT, LA-6 / EDGE-04/05/06/07, D6).
 *
 * ENABLE (remove test.fixme) when W1-LAYOUT has merged its /embed/<tool>/ route and the
 * "# BEGIN W1-LAYOUT" /embed/* block in public/_headers.
 */
import { test, expect } from './fixtures';

const EMBED = '/embed/mortgage-payment/';

test.describe('embed v2', () => {
  test.fixme(true, 'Enable when W1-LAYOUT (embed v2) has merged.');

  test('framing is allowed, X-Frame-Options absent, page is noindex', async ({ request }) => {
    const res = await request.get(EMBED);
    expect(res.status()).toBe(200);
    const h = res.headers();
    const csp = h['content-security-policy'] ?? '';
    expect(csp.match(/default-src/g)?.length).toBe(1);
    expect(csp).toMatch(/frame-ancestors \*/);
    expect(h['x-frame-options']).toBeUndefined();
    const html = await res.text();
    expect(/<meta name="robots" content="noindex/.test(html) || /noindex/.test(h['x-robots-tag'] ?? '')).toBe(true);
  });

  test('in a cross-origin frame at 360 px: inputs visible, no GA requests', async ({ page, baseURL, gaRequests }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.setContent(`<iframe src="${baseURL}${EMBED}" width="360" height="700" style="border:0"></iframe>`);
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('input').first()).toBeVisible({ timeout: 20_000 });
    expect(gaRequests).toEqual([]);
  });
});

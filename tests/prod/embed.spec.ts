/**
 * Embed v2 framing headers and behaviour (W1-LAYOUT, LA-6 / EDGE-04/05/06/07, D6): the
 * /embed/<tool>/ route and the "# BEGIN W1-LAYOUT" /embed/* block in public/_headers.
 */
import { test, expect, LOCAL } from './fixtures';

const EMBED = '/embed/mortgage-payment/';

test.describe('embed v2', () => {
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

  test('embed CSP mirrors the site CSP apart from frame-ancestors; the site still denies framing', async ({ request }) => {
    const directives = (csp: string) => new Map(csp.split(';').map((p) => p.trim()).filter(Boolean)
      .map((p) => { const [name, ...rest] = p.split(/\s+/); return [name, rest.join(' ')] as [string, string]; }));
    const siteHeaders = (await request.get('/')).headers();
    expect(siteHeaders['x-frame-options']).toBe('DENY');
    const site = directives(siteHeaders['content-security-policy'] ?? '');
    expect(site.get('frame-ancestors')).toBe("'none'");
    const embed = directives((await request.get(EMBED)).headers()['content-security-policy'] ?? '');
    expect(embed.get('frame-ancestors')).toBe('*');
    site.delete('frame-ancestors');
    embed.delete('frame-ancestors');
    expect(Object.fromEntries(embed)).toEqual(Object.fromEntries(site));
  });

  test('in a frame at 360 px: inputs visible, no GA requests', async ({ page, baseURL, gaRequests }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    // A host page served by the test. about:blank / setContent would be refused (a frame-ancestors
    // source of * matches network schemes only). Chromium also blocks a public host from framing
    // a loopback server (private-network checks), so the local run uses a same-origin stub host
    // like tests/layout.spec.ts; the cross-origin case runs when PROD_BASE_URL points at a
    // deployed site. The frame-ancestors policy itself is asserted by the header tests above.
    const host = LOCAL ? `${baseURL}/__embed-host__` : 'http://embed-host.test/';
    await page.route(host, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><iframe src="${baseURL}${EMBED}" width="360" height="700" style="border:0"></iframe>`,
      }),
    );
    await page.goto(host);
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('input').first()).toBeVisible({ timeout: 20_000 });
    expect(gaRequests).toEqual([]);
  });
});

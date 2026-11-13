/**
 * PL-8 / EDGE-13/14/18/19: security and caching headers per route class, exactly as
 * public/_headers produces them on Cloudflare.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, LOCAL, DIST } from './fixtures';

const TOOL_PAGE = '/tools/saving-and-growth/compound-interest/';

function directives(csp: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of csp.split(';').map((p) => p.trim()).filter(Boolean)) {
    const [name, ...rest] = part.split(/\s+/);
    map.set(name, rest.join(' '));
  }
  return map;
}

test.describe('security headers', () => {
  test('site pages: one CSP, framing denied, hardening headers present', async ({ request }) => {
    for (const url of ['/', '/about/', '/scenarios/uk-take-home-pay/']) {
      const h = (await request.get(url)).headers();
      const csp = h['content-security-policy'] ?? '';
      expect(csp.match(/default-src/g)?.length, `${url}: exactly one CSP`).toBe(1);
      const d = directives(csp);
      expect(d.get('frame-ancestors')).toBe("'none'");
      expect(d.get('object-src')).toBe("'none'");
      expect(d.get('base-uri')).toBe("'self'");
      expect(d.get('form-action')).toBe("'self'");
      expect(csp).not.toContain('fonts.googleapis.com');
      expect(csp).not.toContain('fonts.gstatic.com');
      expect(h['x-frame-options']).toBe('DENY');
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['strict-transport-security']).toMatch(/max-age=\d+/);
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['permissions-policy']).toContain('camera=()');
    }
  });

  test('tool pages: frame-ancestors * and NO X-Frame-Options (EDGE-19)', async ({ request }) => {
    const h = (await request.get(TOOL_PAGE)).headers();
    const csp = h['content-security-policy'] ?? '';
    expect(csp.match(/default-src/g)?.length).toBe(1);
    expect(directives(csp).get('frame-ancestors')).toBe('*');
    expect(h['x-frame-options']).toBeUndefined();
  });

  test('tool-page CSP equals the site CSP apart from frame-ancestors', async ({ request }) => {
    const site = directives((await request.get('/')).headers()['content-security-policy'] ?? '');
    const tool = directives((await request.get(TOOL_PAGE)).headers()['content-security-policy'] ?? '');
    site.delete('frame-ancestors');
    tool.delete('frame-ancestors');
    expect(Object.fromEntries(tool)).toEqual(Object.fromEntries(site));
  });

  test('hashed build assets and fonts: immutable and CORS-readable (EDGE-07)', async ({ request }) => {
    const asset = fs.readdirSync(path.join(DIST, '_astro')).find((f) => f.endsWith('.js'));
    expect(asset).toBeTruthy();
    for (const url of [`/_astro/${asset}`, '/fonts/DMSans-Variable.woff2']) {
      const h = (await request.get(url)).headers();
      expect(h['cache-control'], url).toBe('public, max-age=31536000, immutable');
      expect(h['access-control-allow-origin'], url).toBe('*');
    }
  });

  test('OG images cache for a day; HTML revalidates', async ({ request }) => {
    const og = fs.readdirSync(path.join(DIST, 'og')).find((f) => f.endsWith('.png'));
    expect((await request.get(`/og/${og}`)).headers()['cache-control']).toBe('public, max-age=86400');
    expect((await request.get('/')).headers()['cache-control']).toBe('public, max-age=0, must-revalidate');
  });

  test('security.txt is served and does not expire within 30 days (EDGE-18)', async ({ request }) => {
    const res = await request.get('/.well-known/security.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('Contact: mailto:hello@calcrun.com');
    const expires = Date.parse(text.match(/^Expires:\s*(\S+)/m)?.[1] ?? '');
    expect(expires - Date.now()).toBeGreaterThan(30 * 86_400_000);
    // RFC 9116 recommends less than a year ahead (plus slack for the day it was set).
    expect(expires - Date.now()).toBeLessThan(380 * 86_400_000);
  });

  test('_headers and _redirects are never served', async ({ request }) => {
    for (const url of ['/_headers', '/_redirects']) {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status(), url).toBe(404);
      expect(await res.text()).not.toContain('Content-Security-Policy:');
    }
  });

  test('API responses carry their own hardening headers and JSON bodies', async ({ request }) => {
    test.skip(!LOCAL, 'never call the live API from tests');
    const res = await request.post('/api/subscribe', {
      headers: { 'Content-Type': 'text/plain' },
      data: '{"email":"not-an-address"}',
    });
    expect(res.status()).toBe(415);
    const h = res.headers();
    expect(h['content-type']).toContain('application/json');
    expect(h['cache-control']).toBe('no-store');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['content-security-policy']).toContain("default-src 'none'");
    expect(await res.json()).toEqual({ error: 'Unsupported content type' });
  });
});

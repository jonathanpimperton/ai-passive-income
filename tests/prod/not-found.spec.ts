/**
 * PL-1 / S1-1: unknown URLs get the designed 404 page with status 404 (not an empty body),
 * and /favicon.ico exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, LOCAL, DIST, notFoundTitle } from './fixtures';

/** Shapes the review found returning an empty 404 (EDGE addendum), all must be 404 now. */
const ALWAYS_404 = [
  '/plat-qa-missing-page/',
  '/plat-qa-missing-page',
  '/About/',
  '/TOOLS/INCOME-AND-PLANNING/SALARY-UK/',
  '/tools/utility/salary-uk/',
  '/about/%20',
  '/labs/',
  '/tools/saving-and-growth/compound-interest/extra/',
  '/sitemap.xml',
];

/** Parent paths with no page today. If a later branch adds an index page they become 200. */
const PARENT_PATHS = ['/tools/debt-and-loans/', '/how-we-calculate/', '/scenarios/plat-qa-missing/'];

function hasPage(urlPath: string): boolean {
  return fs.existsSync(path.join(DIST, urlPath.replace(/^\//, ''), 'index.html'));
}

test.describe('designed 404 page', () => {
  const title = notFoundTitle();
  const page404 = fs.readFileSync(path.join(DIST, '404.html'));

  test('the built 404 page has a title and is noindex', () => {
    expect(title.length).toBeGreaterThan(0);
    expect(page404.toString('utf8')).toMatch(/<meta name="robots" content="noindex/);
  });

  for (const url of ALWAYS_404) {
    test(`${url} -> 404 with the 404 page body`, async ({ request }) => {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status()).toBe(404);
      expect(res.headers()['content-type']).toContain('text/html');
      const body = await res.body();
      expect(body.toString('utf8')).toContain(`<title>${title}</title>`);
      if (LOCAL) expect(body.equals(page404)).toBe(true);
    });
  }

  for (const url of PARENT_PATHS) {
    test(`${url} -> page if one exists, otherwise the 404 page`, async ({ request }) => {
      const res = await request.get(url, { maxRedirects: 0 });
      if (hasPage(url)) {
        expect(res.status()).toBe(200);
      } else {
        expect(res.status()).toBe(404);
        expect(await res.text()).toContain(`<title>${title}</title>`);
      }
    });
  }

  test('a missing hashed asset is a 404 (not a 200 HTML page)', async ({ request }) => {
    const res = await request.get('/_astro/plat-qa-missing.js', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test('/404 itself is a normal page and /404.html redirects to it', async ({ request }) => {
    expect((await request.get('/404', { maxRedirects: 0 })).status()).toBe(200);
    const r = await request.get('/404.html', { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toBe('/404');
  });

  test('/favicon.ico is served as an icon', async ({ request }) => {
    const res = await request.get('/favicon.ico');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
    const body = await res.body();
    // ICONDIR header: reserved 0, type 1 (icon), at least one image.
    expect(body.readUInt16LE(0)).toBe(0);
    expect(body.readUInt16LE(2)).toBe(1);
    expect(body.readUInt16LE(4)).toBeGreaterThan(0);
  });

  test('unknown /api/ paths are a JSON 404 from the worker', async ({ request }) => {
    test.skip(!LOCAL, 'API is never called on a deployed site from tests');
    const res = await request.get('/api/plat-qa-unknown');
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

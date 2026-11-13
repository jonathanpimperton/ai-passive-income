/**
 * PL-2: every _redirects rule is a single 301 hop to its exact target, and every retired
 * URL works with AND without the trailing slash. Checked against the built dist/_redirects.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, LOCAL, DIST } from './fixtures';

interface Rule { source: string; destination: string; status: number }

const rules: Rule[] = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [source, destination, status] = l.split(/\s+/);
    return { source, destination, status: Number(status) };
  });

// Against a deployed site, sample 10 rules (about 1 request per rule) to stay polite.
const checked = LOCAL ? rules : rules.filter((_, i) => i % Math.ceil(rules.length / 10) === 0);

test.describe('redirects', () => {
  test('every retired URL has both a slash and a slash-less rule to the same target', () => {
    const bySource = new Map(rules.map((r) => [r.source, r]));
    const missing: string[] = [];
    for (const r of rules) {
      const twin = r.source.endsWith('/') ? r.source.slice(0, -1) : `${r.source}/`;
      const t = bySource.get(twin);
      if (!t || t.destination !== r.destination || t.status !== r.status) missing.push(r.source);
    }
    expect(missing).toEqual([]);
    expect(rules.length).toBeLessThanOrEqual(2000); // Cloudflare static redirect limit
    expect(rules.every((r) => r.status === 301)).toBe(true);
  });

  for (const r of checked) {
    test(`${r.source} -> ${r.destination}`, async ({ request }) => {
      const res = await request.get(r.source, { maxRedirects: 0 });
      expect(res.status()).toBe(r.status);
      const location = res.headers().location ?? '';
      expect(new URL(location, 'http://x').pathname + (new URL(location, 'http://x').hash)).toBe(r.destination);
      // Redirects carry the site security headers too.
      expect(res.headers()['x-content-type-options']).toBe('nosniff');
    });
  }

  test('every redirect destination page exists (single hop, no redirect-to-404)', async ({ request }) => {
    test.skip(!LOCAL, 'covered by qa-link-check on the build; avoid extra live requests');
    const destinations = [...new Set(rules.map((r) => r.destination.split('#')[0]))];
    for (const d of destinations) {
      const res = await request.get(d, { maxRedirects: 0 });
      expect(res.status(), d).toBe(200);
    }
  });
});

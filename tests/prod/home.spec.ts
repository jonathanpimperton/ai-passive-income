/**
 * W1-HOME (consent, banner, header, search, heading order) on the production-config server.
 *
 * Every context aborts GA/GTM requests (tests/prod/fixtures.ts) and records them in
 * `gaRequests`, so "GA loads" means "a gtag.js request was attempted (and aborted)".
 * Region comes from the browser time zone (src/lib/region.ts), set per describe block.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, DIST } from './fixtures';

const TOOL = '/tools/saving-and-growth/compound-interest/';
const settle = (page: import('@playwright/test').Page) => page.waitForTimeout(1200);

/* ---------------- consent by region (plan D1) ---------------- */

const REGIONS: Array<{ name: string; tz: string; locale: string; loadsByDefault: boolean }> = [
  { name: 'Paris (EEA)', tz: 'Europe/Paris', locale: 'fr-FR', loadsByDefault: false },
  { name: 'Zurich (Switzerland)', tz: 'Europe/Zurich', locale: 'de-CH', loadsByDefault: false },
  { name: 'London (UK)', tz: 'Europe/London', locale: 'en-GB', loadsByDefault: true },
  { name: 'New York (US)', tz: 'America/New_York', locale: 'en-US', loadsByDefault: true },
  { name: 'Tokyo (other)', tz: 'Asia/Tokyo', locale: 'ja-JP', loadsByDefault: true },
];

for (const r of REGIONS) {
  test.describe(`consent: ${r.name}`, () => {
    test.use({ timezoneId: r.tz, locale: r.locale });

    test(r.loadsByDefault ? 'GA is requested on load; Decline stops it for good' : 'no GA request until Accept', async ({ page, gaRequests }) => {
      await page.goto(TOOL);
      await settle(page);
      const banner = page.locator('#cookie-banner');
      await expect(banner).toBeVisible();
      if (r.loadsByDefault) {
        expect(gaRequests.length).toBeGreaterThan(0);
        await page.locator('#cookie-decline').click();
        await page.waitForTimeout(400);
        const before = gaRequests.length;
        await page.reload();
        await settle(page);
        expect(gaRequests.length).toBe(before);
        expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe('undefined');
        await expect(banner).toBeHidden();
      } else {
        expect(gaRequests).toEqual([]);
        await page.locator('#cookie-accept').click();
        await expect.poll(() => gaRequests.length).toBeGreaterThan(0);
      }
    });
  });
}

test.describe('consent: never on embeds, framed pages or secret-handling tools', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

  test('legacy ?embed: 0 GA requests and no banner', async ({ page, gaRequests }) => {
    await page.goto(`${TOOL}?embed`);
    await settle(page);
    expect(gaRequests).toEqual([]);
    await expect(page.locator('#cookie-banner')).toBeHidden();
  });

  test('embed v2 page: 0 GA requests and no banner', async ({ page, gaRequests }) => {
    await page.goto('/embed/compound-interest/');
    await settle(page);
    expect(gaRequests).toEqual([]);
    await expect(page.locator('#cookie-banner')).toBeHidden();
  });

  for (const slug of ['password-generator', 'jwt-decoder']) {
    test(`${slug}: 0 GA requests even after Accept (DEVTOOLS-26)`, async ({ page, gaRequests }) => {
      await page.goto(`/tools/utility/${slug}/`);
      await settle(page);
      expect(gaRequests).toEqual([]);
      if (await page.locator('#cookie-banner').isVisible()) await page.locator('#cookie-accept').click();
      await page.waitForTimeout(600);
      expect(gaRequests).toEqual([]);
    });
  }
});

/* ---------------- banner never traps or covers the screen ---------------- */

test.describe('cookie banner sizes', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

  const SIZES: Array<[number, number, number]> = [
    // width, height, max share of the viewport height
    [320, 200, 0.41],
    [360, 480, 0.41],
    [375, 500, 0.41],
    [360, 800, 0.2],
    [800, 450, 0.45],
  ];
  for (const [w, h, maxShare] of SIZES) {
    test(`${w}x${h}: Decline and Accept are on screen and the banner stays small`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(TOOL);
      await settle(page);
      const box = await page.locator('#cookie-banner').boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeLessThanOrEqual(h * maxShare + 1);
      for (const id of ['#cookie-decline', '#cookie-accept']) {
        const b = await page.locator(id).boundingBox();
        expect(b, id).not.toBeNull();
        expect(b!.y).toBeGreaterThanOrEqual(0);
        expect(b!.y + b!.height).toBeLessThanOrEqual(h);
      }
    });
  }
});

/* ---------------- storage blocked ---------------- */

test.describe('storage blocked', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`OS ${scheme}: no uncaught errors, theme follows the OS, toggle works`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.addInitScript(() => {
        for (const n of ['localStorage', 'sessionStorage']) {
          Object.defineProperty(window, n, {
            get() {
              throw new DOMException('The operation is insecure.', 'SecurityError');
            },
          });
        }
      });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/about/');
      await settle(page);
      expect(await page.locator('html').getAttribute('data-theme')).toBe(scheme);
      await page.locator('.site-header .theme-toggle').first().click();
      expect(await page.locator('html').getAttribute('data-theme')).toBe(scheme === 'dark' ? 'light' : 'dark');
      expect(errors).toEqual([]);
    });
  }
});

/* ---------------- header and search ---------------- */

test.describe('header', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

  test('opening menus and typing in search does not move the page (real pointer input)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      try { localStorage.setItem('calcrun-cookie-consent', 'accepted'); } catch { /* storage blocked */ }
    });
    await page.goto(TOOL);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await page.waitForTimeout(800);
    const y0 = await page.evaluate(() => Math.round(window.scrollY));
    const center = async (sel: string) => {
      const b = (await page.locator(sel).first().boundingBox())!;
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const tools = await center('#nav-trigger-tools');
    await page.mouse.click(tools.x, tools.y);
    await page.waitForTimeout(500);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y0)).toBeLessThanOrEqual(2);
    await page.keyboard.press('Escape');
    const search = await center('#site-search-input');
    await page.mouse.click(search.x, search.y);
    await page.keyboard.type('compress pdf', { delay: 20 });
    await page.waitForTimeout(500);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y0)).toBeLessThanOrEqual(2);
  });

  test('focusing header controls (script, Tab, Shift+Tab) does not move the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      try { localStorage.setItem('calcrun-cookie-consent', 'accepted'); } catch { /* storage blocked */ }
    });
    await page.goto(TOOL);
    await page.waitForLoadState('networkidle');
    const settleAt1500 = async (setup?: () => void) => {
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        window.scrollTo({ top: 1500, behavior: 'instant' });
      });
      await page.waitForTimeout(250);
      if (setup) await page.evaluate(setup);
      await page.waitForTimeout(150);
    };
    const moved = async () => Math.abs((await page.evaluate(() => window.scrollY)) - 1500);
    const focusPage = () => document.querySelector<HTMLElement>('main input, main button')?.focus({ preventScroll: true });
    const focusTools = () => document.getElementById('nav-trigger-tools')?.focus({ preventScroll: true });

    // From the page into the header, and between header controls, with plain focus()
    await settleAt1500(focusPage);
    await page.evaluate(() => (document.querySelector('.site-header .theme-toggle') as HTMLElement).focus());
    await page.waitForTimeout(400);
    expect(await moved()).toBeLessThanOrEqual(2);
    await settleAt1500(focusTools);
    await page.evaluate(() => (document.getElementById('site-search-input') as HTMLElement).focus());
    await page.waitForTimeout(400);
    expect(await moved()).toBeLessThanOrEqual(2);
    // Keyboard moves inside the header
    await settleAt1500(focusTools);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    expect(await moved()).toBeLessThanOrEqual(2);
    await settleAt1500(() => (document.querySelector('.site-header .theme-toggle') as HTMLElement).focus({ preventScroll: true }));
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(400);
    expect(await moved()).toBeLessThanOrEqual(2);
  });

  test('search: "take home pay" puts UK Salary first for a UK visitor (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/about/');
    await page.locator('.search-toggle').click();
    const input = page.locator('#site-search-input');
    await expect(input).toBeVisible();
    await input.fill('take home pay');
    const first = page.locator('[data-search-list] [role="option"]').first();
    await expect(first).toContainText('UK Salary');
  });
});

/* ---------------- heading order (HOME-CHROME / DEV request) ---------------- */

test('no page has a heading before its h1 (nav and menus use no headings)', () => {
  const bad: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const html = fs.readFileSync(p, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
        const first = html.match(/<h([1-6])[\s>]/);
        if (first && first[1] !== '1') bad.push(`${path.relative(DIST, p)}: first heading is h${first[1]}`);
      }
    }
  })(DIST);
  expect(bad).toEqual([]);
});

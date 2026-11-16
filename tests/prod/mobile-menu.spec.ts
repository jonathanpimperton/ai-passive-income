/**
 * Mobile menu keyboard behaviour (HOME follow-ups (f) and (g)), in Chromium and Firefox.
 *
 * (f) Escape closes the menu with a 200 ms animation. Tab pressed inside that window used to land
 *     in the vanishing menu and then fall to <body>: the menu is now inert from the first moment
 *     of closing, so Tab continues from the menu button into the page.
 * (g) Firefox's natural Tab order left some items only half inside the scrolling panel; every
 *     item must be fully inside it when it takes focus.
 *
 * Production-config server (playwright.prod.config.ts); GA/GTM are aborted by ./fixtures.
 */
import { test, expect } from './fixtures';

const TOOL = '/tools/saving-and-growth/compound-interest/';

test.describe('mobile menu keyboard (390x664)', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB', viewport: { width: 390, height: 664 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('calcrun-cookie-consent', 'accepted'); } catch { /* storage blocked */ }
    });
    await page.goto(TOOL);
    await page.waitForLoadState('networkidle');
    await page.locator('#mobile-menu-btn').click();
    await expect(page.locator('#mobile-menu .mobile-panel')).toBeVisible();
    await page.waitForTimeout(500); // slide-in animation
  });

  test('Escape then an immediate Tab moves on from the menu button, never into the closing menu or <body>', async ({ page }) => {
    await page.keyboard.press('Escape');
    // Focus goes back to the trigger as soon as the menu starts to close...
    const where = () => page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      return { id: a.id, inMenu: !!document.getElementById('mobile-menu')?.contains(a), isBody: a === document.body };
    });
    expect(await where()).toEqual({ id: 'mobile-menu-btn', inMenu: false, isBody: false });
    // ...and the closing menu is inert, so the very next Tab (well inside the 200 ms) goes to the page.
    expect(await page.evaluate(() => (document.getElementById('mobile-menu') as HTMLElement & { inert: boolean }).inert)).toBe(true);
    await page.keyboard.press('Tab');
    const next = await where();
    expect(next.inMenu).toBe(false);
    expect(next.isBody).toBe(false);
    expect(next.id).not.toBe('mobile-menu-btn');
    // Once closed it stays closed and out of the tab order.
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await page.keyboard.press('Tab');
    expect((await where()).inMenu).toBe(false);
  });

  test('reopening right after closing works: the menu is interactive again with focus on Close', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.locator('#mobile-menu-btn').click(); // inside the closing animation
    await expect(page.locator('#mobile-menu .mobile-panel')).toBeVisible();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (document.getElementById('mobile-menu') as HTMLElement & { inert: boolean }).inert)).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('mobile-menu-close');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.getElementById('mobile-menu')?.contains(document.activeElement))).toBe(true);
  });

  test('natural Tab order brings every item fully into the panel', async ({ page }) => {
    // Open every category so there are plenty of stops.
    for (const b of await page.locator('#mobile-menu .m-group-btn').all()) await b.click();
    await page.waitForTimeout(500); // groups finish expanding
    await page.evaluate(() => {
      (document.querySelector('#mobile-menu .mobile-panel') as HTMLElement).scrollTop = 0;
      document.getElementById('mobile-menu-close')!.focus({ preventScroll: true });
    });
    const stops = await page.evaluate(() => document.querySelectorAll('#mobile-menu a[href], #mobile-menu button:not([disabled])').length);
    expect(stops).toBeGreaterThan(40);
    const partial: string[] = [];
    for (let i = 0; i < stops + 2; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(40);
      const s = await page.evaluate(() => {
        const menu = document.getElementById('mobile-menu')!;
        const a = document.activeElement as HTMLElement;
        const p = menu.querySelector('.mobile-panel')!.getBoundingClientRect();
        const r = a.getBoundingClientRect();
        return {
          inMenu: menu.contains(a),
          name: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 30),
          // Sub-pixel layout can leave an item a fraction of a pixel past the edge.
          fully: r.height > 0 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1,
        };
      });
      expect(s.inMenu, `stop ${i + 1} stays in the menu`).toBe(true);
      if (!s.fully) partial.push(`${i + 1}: ${s.name}`);
    }
    expect(partial, 'items only partly inside the panel when focused').toEqual([]);
  });
});

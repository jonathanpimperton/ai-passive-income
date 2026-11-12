/**
 * E2E tests for the tool page layout and embeds (plan-2026-11 W1-LAYOUT).
 *
 * Verifies:
 *  - Embed v2 (/embed/<tool>/): no analytics, noindex, links open new tabs,
 *    no affiliate/email/share/PDF modules, inputs inside a 700px frame at 360px,
 *    height messages to the parent page
 *  - Legacy ?embed on a financial calculator hands over to the v2 route
 *  - /embed/ snippet: iframe + attribution link OUTSIDE the iframe
 *  - Tool page: no scroll email bar; the mobile result bar only appears after
 *    an input change; the back-to-calculator button is not focusable while hidden
 *
 * Analytics requests are aborted in every test (the built HTML carries the
 * production GA tag).
 */
import { test, expect, type Page } from '@playwright/test';

const GA_RE = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;

test.beforeEach(async ({ context }) => {
  await context.route(GA_RE, (route) => route.abort());
  await context.addInitScript(() => {
    try {
      localStorage.setItem('calcrun-cookie-consent', 'accepted');
    } catch {
      // Storage blocked: the cookie banner may show; tests don't depend on it.
    }
  });
});

async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island');
    return !!island && !island.hasAttribute('ssr');
  }, null, { timeout: 30000 });
}

test.describe('Embed v2', () => {
  test('is a minimal, noindex page with no analytics', async ({ page }) => {
    const gaRequests: string[] = [];
    page.on('request', (req) => { if (GA_RE.test(req.url())) gaRequests.push(req.url()); });
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto('/embed/mortgage-payment/');
    await waitForHydration(page);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('base')).toHaveAttribute('target', '_blank');
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
    expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe('undefined');
    expect(gaRequests).toEqual([]);

    // No site chrome, cookie banner, affiliates, email capture, share or PDF.
    expect(await page.locator('body > header, body > footer').count()).toBe(0);
    await expect(page.locator('a.affiliate-link:visible')).toHaveCount(0);
    await expect(page.locator('button[aria-label="Email my results"]:visible')).toHaveCount(0);
    await expect(page.locator('input[type="email"]:visible')).toHaveCount(0);
    await expect(page.locator('button[aria-label="Share this calculator"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-export-pdf]:visible')).toHaveCount(0);

    // One attribution link to the full tool.
    const attribution = page.locator('.embed-attribution a');
    await expect(attribution).toHaveCount(1);
    await expect(attribution).toHaveAttribute('href', 'https://www.calcrun.com/tools/debt-and-loans/mortgage-payment/');

    // At 360px the inputs start inside a 700px frame.
    const firstInput = page.locator('astro-island input:visible').first();
    const box = await firstInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThan(700);
  });

  test('posts its height to the parent and honours ?theme', async ({ page }) => {
    // A stub host page served by the test (no site CSP: our own pages only
    // allow framing Turnstile) that records the embed's height messages.
    await page.route('**/__embed-host__', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body:
          '<!doctype html><script>window.heights=[];addEventListener("message",function(e){' +
          'if(e.data&&e.data.type==="calcrun:height")heights.push(e.data.height)})</script>' +
          '<iframe id="probe" src="/embed/compound-interest/?theme=dark" style="width:360px;height:700px;border:0"></iframe>',
      }),
    );
    await page.goto('/__embed-host__');
    await page.waitForFunction(() => (window as unknown as { heights: number[] }).heights.length > 0, null, { timeout: 30000 });
    const heights = await page.evaluate(() => (window as unknown as { heights: number[] }).heights);
    expect(Math.max(...heights)).toBeGreaterThan(700);
    const frame = page.frameLocator('#probe');
    await expect(frame.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('legacy ?embed on a calculator hands over to the v2 route', async ({ page }) => {
    await page.goto('/tools/debt-and-loans/mortgage-payment/?embed');
    await page.waitForURL(/\/embed\/mortgage-payment\/$/);
  });

  test('generator snippet carries the attribution link outside the iframe', async ({ page }) => {
    await page.goto('/embed/');
    const snippet = await page.locator('#embed-code-mortgage-payment').inputValue();
    expect(snippet).toMatch(/^<iframe src="https:\/\/www\.calcrun\.com\/embed\/mortgage-payment\/"[^>]*><\/iframe>\n<p[^>]*><a href="https:\/\/www\.calcrun\.com\/tools\/debt-and-loans\/mortgage-payment\/">Mortgage Payment Calculator<\/a> by CalcRun<\/p>/);
    expect(snippet).toContain('/embed/resize.js');
    await page.locator('#embed-theme').selectOption('dark');
    await expect(page.locator('#embed-code-mortgage-payment')).toHaveValue(/embed\/mortgage-payment\/\?theme=dark/);
  });
});

test.describe('Tool page layout', () => {
  test('has no scroll-triggered email bar', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/compound-interest/');
    expect(await page.locator('astro-island[component-url*="ScrollEmailBar"]').count()).toBe(0);
  });

  test('mobile result bar appears only after an input change', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/income-and-planning/salary-uk/');
    await waitForHydration(page);
    const bar = page.locator('#mobile-result-bar');
    await expect(bar).toBeHidden();

    const salary = page.locator('astro-island input[type="text"], astro-island input[inputmode]').first();
    await salary.click();
    await page.keyboard.press('End');
    await page.keyboard.type('0');
    await page.keyboard.press('Tab');
    await expect(bar).toBeVisible();
    await expect(page.locator('#mobile-result-value')).not.toHaveText('');
  });

  test('back-to-calculator button is out of the tab order while hidden', async ({ page }) => {
    await page.goto('/tools/debt-and-loans/mortgage-payment/');
    await expect(page.locator('#back-to-calc-btn')).toHaveCSS('visibility', 'hidden');
  });
});

/**
 * Follow-ups after W1-CORE and W1-UK merged:
 *
 * 1. Capital gains offers the partner for the tab on screen (US tab -> US
 *    partner, UK tab -> UK partner), whatever currency the visitor chose.
 * 2. The UK salary, stamp duty and capital gains charts are one named image
 *    each and never a tab stop (no unnamed role="application", no focusable
 *    descendant), and each has a text equivalent beside it.
 * 3. The take-home-pay hub pages use the calculator's own number convention
 *    (GBP / USD), so an EUR visitor never sees "5,0" in a percentage field.
 *
 * (The EUR "5.000" typed before hydration case lives in numeric-fields.spec.ts.)
 *
 * Works against the dev server (repo playwright.config.ts) and a built
 * preview. GA and /api are blocked in every context; nothing is submitted.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const GA = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

async function prepare(context: BrowserContext, currency?: string) {
  await context.route(GA, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await context.addInitScript((c: string | undefined) => {
    try {
      localStorage.setItem('calcrun-cookie-consent', 'accepted');
      sessionStorage.setItem('calcrun.introSeen', '1');
      if (c) localStorage.setItem('calcrun.currency', c);
    } catch {
      /* storage may be unavailable */
    }
  }, currency);
}

/** Astro drops `ssr` when it calls hydrateRoot; React then attaches a fiber key to each node it takes over. */
async function hydrated(page: Page) {
  await page.waitForFunction(
    () => {
      const head = document.querySelector('[data-headline-result]');
      const island = head?.closest('astro-island');
      return !!head && !!island && !island.hasAttribute('ssr') && Object.keys(head).some((k) => k.startsWith('__reactFiber$'));
    },
    null,
    { timeout: 30000 },
  );
}

/** The island holding `selector` has hydrated (scrolls it into view first: hub islands are client:visible). */
async function hydratedAt(page: Page, selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      const island = el?.closest('astro-island');
      return !!el && !!island && !island.hasAttribute('ssr') && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
    },
    selector,
    { timeout: 30000 },
  );
}

/* -- 1. Capital gains: partner follows the tab on screen -------------------- */

const CGT = '/tools/economic/capital-gains-tax/';
const inline = 'a[data-affiliate-placement="inline"]';

for (const currency of ['USD', 'GBP', 'EUR']) {
  test(`capital gains inline partner follows the tab, not the currency (${currency} visitor)`, async ({ page, context }) => {
    await prepare(context, currency);
    await page.goto(CGT);
    await hydrated(page);

    await page.getByRole('tab', { name: 'United States' }).click();
    await expect(page.locator(`${inline}[data-affiliate-partner="betterment"]`)).toHaveCount(1);
    await expect(page.locator(`${inline}[data-affiliate-partner="nutmeg"]`)).toHaveCount(0);

    await page.getByRole('tab', { name: 'United Kingdom' }).click();
    await expect(page.locator(`${inline}[data-affiliate-partner="nutmeg"]`)).toHaveCount(1);
    await expect(page.locator(`${inline}[data-affiliate-partner="betterment"]`)).toHaveCount(0);
  });
}

/* -- 2. Charts: one named image, never a tab stop --------------------------- */

interface ChartCase {
  name: string;
  path: string;
  /** Run before looking at the chart (e.g. pick a tab). */
  setup?: (page: Page) => Promise<void>;
  /** The heading text of the chart's card, to find its neighbours. */
  heading: RegExp;
  /** The chart's text equivalent: a "Show data" toggle beside it, or a table/ aria-label with the figures. */
  textEquivalent: 'data-table' | 'breakdown-table';
}

const CHARTS: ChartCase[] = [
  { name: 'salary-uk', path: '/tools/income-and-planning/salary-uk/', heading: /Income Breakdown/i, textEquivalent: 'data-table' },
  { name: 'stamp-duty', path: '/tools/economic/stamp-duty/', heading: /Stamp Duty by Property Price/i, textEquivalent: 'data-table' },
  { name: 'capital-gains-tax (US tab)', path: CGT, heading: /Short-Term vs Long-Term Tax/i, textEquivalent: 'data-table' },
  {
    name: 'capital-gains-tax (UK tab)',
    path: CGT,
    setup: async (page) => {
      await page.getByRole('tab', { name: 'United Kingdom' }).click();
    },
    heading: /Gain Breakdown/i,
    textEquivalent: 'breakdown-table',
  },
];

for (const c of CHARTS) {
  test(`chart a11y: ${c.name} is one named image and not a tab stop`, async ({ page, context }) => {
    await prepare(context);
    await page.goto(c.path);
    await hydrated(page);
    await c.setup?.(page);

    const card = page.locator('[data-pdf-section]', { has: page.getByRole('heading', { name: c.heading }) }).first();
    const wrapper = card.locator('[role="img"]:has(.recharts-wrapper)');
    await expect(wrapper).toHaveCount(1);
    await expect(wrapper.locator('.recharts-wrapper')).toBeVisible();
    await expect(wrapper).not.toHaveAttribute('data-chart-pending', /.*/); // painted

    // Named, and not the generic fallback.
    const label = (await wrapper.getAttribute('aria-label')) ?? '';
    expect(label.length).toBeGreaterThan(20);
    expect(label).not.toBe('Chart of the calculator results');

    // Recharts' own keyboard layer is off: no unnamed role="application", nothing focusable inside.
    expect(await page.locator('[role="application"]').count()).toBe(0);
    const focusable = await wrapper.evaluate((el) =>
      Array.from(el.querySelectorAll<HTMLElement>('*'))
        .filter((n) => n.matches('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'))
        .filter((n) => n.getAttribute('tabindex') !== '-1')
        .map((n) => `${n.tagName.toLowerCase()}[tabindex=${n.getAttribute('tabindex')}]`),
    );
    expect(focusable).toEqual([]);

    // Text equivalent: a "Show data" table in the same card, or the visible Tax Breakdown table.
    if (c.textEquivalent === 'data-table') {
      await expect(card.getByRole('button', { name: /show data/i })).toHaveCount(1);
    } else {
      await expect(page.getByRole('table', { name: /capital gains tax breakdown/i })).toBeVisible();
    }

    // Real Tab-walk: start at the first field, press Tab until focus has moved past the chart.
    await page.locator('input').first().focus();
    const hits: string[] = [];
    let passed = false;
    for (let i = 0; i < 400 && !passed; i++) {
      await page.keyboard.press('Tab');
      const where = await wrapper.evaluate((chart) => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return { inside: false, after: false, desc: 'body' };
        const inside = chart.contains(el) || !!el.closest('.recharts-wrapper');
        const after = !inside && !!(chart.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
        return { inside, after, desc: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}` };
      });
      if (where.inside) hits.push(where.desc);
      if (where.after) passed = true;
    }
    expect(passed, 'the walk reached past the chart').toBe(true);
    expect(hits, 'tab stops inside the chart').toEqual([]);
  });
}

/* -- 3. Hubs use the calculator's own number convention --------------------- */

const HUBS = [
  { name: 'UK take-home pay hub', path: '/scenarios/uk-take-home-pay/', field: '#uk-pension', tool: '/tools/income-and-planning/salary-uk/' },
  { name: 'US take-home pay hub', path: '/scenarios/us-take-home-pay/', field: '#sal-401k', tool: '/tools/income-and-planning/salary-us/' },
];

for (const h of HUBS) {
  test(`${h.name}: an EUR visitor gets the same number convention as on the tool page`, async ({ page, context }) => {
    await prepare(context, 'EUR');

    for (const url of [h.tool, h.path]) {
      await page.goto(url);
      await hydratedAt(page, h.field);
      const field = page.locator(h.field).first();
      // The shown value never uses a decimal comma ("5,0")...
      expect(await field.inputValue(), url).not.toMatch(/,/);
      // ...and "5.5" is five and a half (an EUR reading would refuse it as unclear).
      await field.fill('5.5');
      await field.press('Tab');
      await expect(field, url).toHaveValue('5.5');
      await expect(field, url).not.toHaveAttribute('aria-invalid', 'true');
    }
  });
}

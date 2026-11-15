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

// Before the visitor picks a tab it is only a default: a euro visitor opens on the US tab but
// is not offered the US-only partner; US and UK visitors get the partner for their own region.
for (const [currency, expected] of [['EUR', null], ['USD', 'betterment'], ['GBP', 'nutmeg']] as const) {
  test(`capital gains first load offers ${expected ?? 'no partner'} to a ${currency} visitor`, async ({ page, context }) => {
    await prepare(context, currency);
    await page.goto(CGT);
    await hydrated(page);
    // The default tab has settled (GBP moves to the UK tab after mount) and results are on screen.
    await expect(page.getByRole('tab', { name: currency === 'GBP' ? 'United Kingdom' : 'United States' })).toHaveAttribute('aria-selected', 'true');
    if (expected) {
      await expect(page.locator(`${inline}[data-affiliate-partner="${expected}"]`)).toHaveCount(1);
    } else {
      await page.waitForTimeout(1000); // the affiliate row renders client-side; give it the chance to (wrongly) appear
      await expect(page.locator(inline)).toHaveCount(0);
    }
  });
}

test('capital gains: a euro visitor who picks the US tab is offered the US partner', async ({ page, context }) => {
  await prepare(context, 'EUR');
  await page.goto(CGT);
  await hydrated(page);
  await expect(page.locator(inline)).toHaveCount(0);
  await page.getByRole('tab', { name: 'United States' }).click(); // the tab already on screen, now chosen
  await expect(page.locator(`${inline}[data-affiliate-partner="betterment"]`)).toHaveCount(1);
});

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

/* -- 4. Net worth: server and client agree, load after load ------------------ */

// Row ids used to come from a module-level counter: the server kept counting across
// requests (dev server) or pages (build: tool page, then embed page), so its ids
// ("item-46-name") differed from the client's ("item-1-name") and React reported a
// hydration mismatch. Loads in a row, on the tool page and the embed page, must be clean.
const NET_WORTH_PAGES = ['/tools/income-and-planning/net-worth/', '/embed/net-worth/'];

test('net worth Reset clears a field that was showing an error', async ({ page, context }) => {
  await prepare(context);
  await page.goto('/tools/income-and-planning/net-worth/');
  await hydrated(page);
  const value = page.locator('input[id$="-value"]').first();
  await value.fill('abc');
  await value.blur();
  await expect(value).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/Enter a number, for example/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset all inputs' }).click();

  // Every field is a fresh one: no error, no invalid flag, the default amount back.
  await expect(page.getByText(/Enter a number, for example/)).toHaveCount(0);
  await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(0);
  await expect(page.locator('input[id$="-value"]').first()).not.toHaveValue('abc');
  // Server/client id parity is untouched: the page still starts at item-1 (see the loads below).
});

for (const currency of [undefined, 'GBP', 'EUR']) {
  test(`net worth hydrates without a mismatch, load after load (${currency ?? 'nothing stored'})`, async ({ page, context }) => {
    await prepare(context, currency);
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    for (const path of [...NET_WORTH_PAGES, ...NET_WORTH_PAGES]) {
      await page.goto(path);
      await hydrated(page);
      await page.waitForTimeout(300);
      // The server's first row is item-1, the same as the client's.
      expect(await page.locator('input#item-1-name').count(), path).toBe(1);
      expect(errors.filter((e) => /418|423|425|hydrat|did(n't| not) match/i.test(e)), path).toEqual([]);
    }
  });
}

/* -- 5. Results panels taller than the window are not pinned ----------------- */

// A panel pinned with lg:sticky that is taller than the window cannot be scrolled into view by
// keyboard focus: Shift+Tab into its last controls left the focused control off screen.
const COMPOUND = '/tools/saving-and-growth/compound-interest/';
const panelSel = 'astro-island .lg\\:sticky';

test('a results panel taller than the window is released, and Shift+Tab keeps focus on screen', async ({ page, context }) => {
  await prepare(context);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(COMPOUND);
  await hydrated(page);
  const panel = page.locator(panelSel).first();
  // The premise: this panel does not fit below its 80px offset in an 800px window.
  expect(await panel.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(800 - 96);
  await expect(panel).toHaveCSS('position', 'static');

  // Start on the first control after the calculator and walk backwards into the panel.
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    const focusable = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')).filter(
      (e) => !(e as HTMLButtonElement).disabled && e.tabIndex >= 0 && e.offsetParent !== null,
    );
    const after = focusable.find((e) => !el.contains(e) && el.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
    after?.focus();
  }, panelSel);
  const inView = () =>
    page.evaluate(() => {
      const r = document.activeElement!.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    });
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    // Page scrolling is smooth, so give the focused control a moment to arrive.
    await expect.poll(inView, { message: `focus stop ${i + 1} is on screen`, timeout: 4000 }).toBe(true);
  }
  expect(await page.evaluate((sel) => document.querySelector(sel)!.contains(document.activeElement), panelSel)).toBe(true);
});

test('a results panel that fits the window stays pinned', async ({ page, context }) => {
  await prepare(context);
  await page.setViewportSize({ width: 1280, height: 2400 });
  await page.goto(COMPOUND);
  await hydrated(page);
  await expect(page.locator(panelSel).first()).toHaveCSS('position', 'sticky');
  // And it is released again when the window shrinks, without a reload.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator(panelSel).first()).toHaveCSS('position', 'static');
});

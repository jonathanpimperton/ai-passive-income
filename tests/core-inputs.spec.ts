/**
 * Shared calculator core (plan W1-CORE): number entry, pre-hydration typing,
 * storage failures, region default and region-correct affiliates.
 *
 * Works against the dev server (repo playwright.config.ts) and a built
 * preview. GA and /api are blocked in every context; nothing is submitted.
 */
import { test, expect, type Page, type BrowserContext, type Browser } from '@playwright/test';

const GA = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;
const POUND = '\u00A3';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

interface Prep {
  currency?: string;
  storageThrows?: boolean;
}

async function prepare(context: BrowserContext, opts: Prep = {}) {
  await context.route(GA, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await context.addInitScript((o: Prep) => {
    try {
      localStorage.setItem('calcrun-cookie-consent', 'accepted');
      if (o.currency) localStorage.setItem('calcrun.currency', o.currency);
    } catch {
      /* storage may already be blocked */
    }
    if (o.storageThrows) {
      const boom = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: boom });
      Object.defineProperty(window, 'sessionStorage', { configurable: true, get: boom });
    }
  }, opts);
}

/**
 * Wait until React has hydrated the calculator: Astro drops `ssr` when it
 * calls hydrateRoot, and React then attaches a fiber key to each node it takes over.
 */
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

/** Headline result once its count-up animation has settled. */
async function headline(page: Page): Promise<string> {
  const el = page.locator('[data-headline-result]').first();
  let last = '';
  let same = 0;
  for (let i = 0; i < 80 && same < 5; i++) {
    const now = (await el.innerText()).trim();
    same = now === last ? same + 1 : 0;
    last = now;
    await page.waitForTimeout(100);
  }
  return last;
}

async function enter(page: Page, id: string, text: string, how: 'fill' | 'type' = 'type') {
  const input = page.locator(`input#${id}`);
  if (how === 'fill') {
    await input.fill(text);
  } else {
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.pressSequentially(text, { delay: 10 });
  }
  await input.press('Tab');
  const message = page.locator(`#${id}-message`); // rendered only when there is something to say
  return {
    value: await input.inputValue(),
    message: (await message.count()) ? (await message.innerText()).trim() : '',
  };
}

const SALARY_UK = '/tools/income-and-planning/salary-uk/';
const COMPOUND = '/tools/saving-and-growth/compound-interest/';
const STAMP = '/tools/economic/stamp-duty/';
const MORTGAGE = '/tools/debt-and-loans/mortgage-payment/';

test.describe('number entry (CO-1)', () => {
  test.beforeEach(async ({ context }) => prepare(context));

  for (const how of ['fill', 'type'] as const) {
    test(`thousands commas, symbols and k suffix (${how})`, async ({ page }) => {
      await page.goto(SALARY_UK);
      await hydrated(page);
      await enter(page, 'uk-salary', '50000', how);
      const plain = await headline(page);
      await enter(page, 'uk-salary', '25000', how);
      expect(await enter(page, 'uk-salary', '50,000', how)).toEqual({ value: '50,000', message: '' });
      expect(await headline(page)).toBe(plain);
      expect((await enter(page, 'uk-salary', `${POUND}52k`, how)).value).toBe('52,000');

      await page.goto(STAMP);
      await hydrated(page);
      expect(await enter(page, 'sdlt-price', `${POUND}425,000`, how)).toEqual({ value: '425,000', message: '' });

      await page.goto(COMPOUND);
      await hydrated(page);
      expect(await enter(page, 'ci-principal', '$50k', how)).toEqual({ value: '50,000', message: '' });
    });
  }

  test('unreadable input keeps the previous value and says why', async ({ page }) => {
    await page.goto(COMPOUND);
    await hydrated(page);
    const before = await page.locator('input#ci-principal').inputValue();
    const r = await enter(page, 'ci-principal', '1e9');
    expect(r.value).toBe(before);
    expect(r.message).toMatch(/not a number we can read/);
    await expect(page.locator('input#ci-principal')).toHaveAttribute('aria-describedby', /ci-principal-message/);
  });

  test('above the maximum clamps with a visible note, never shrinks', async ({ page }) => {
    await page.goto(SALARY_UK);
    await hydrated(page);
    // The UK salary field accepts up to 10,000,000 (W1-UK UK-7: no silent clamping below it).
    expect(await enter(page, 'uk-salary', '5,000,000')).toEqual({ value: '5,000,000', message: '' });
    const r = await enter(page, 'uk-salary', '20,000,000');
    expect(r.value).toBe('10,000,000');
    expect(r.message).toBe(`Maximum is ${POUND}10,000,000, so we used that.`);
  });

  test('EUR convention when the display currency is EUR', async ({ page, context }) => {
    await prepare(context, { currency: 'EUR' });
    await page.goto(COMPOUND);
    await hydrated(page);
    expect(await enter(page, 'ci-principal', '25.000')).toEqual({ value: '25.000', message: '' });
  });

  test('EUR "50,000" in a field that stops at 10,000 is read as 50, and the note says so', async ({ page, context }) => {
    await prepare(context, { currency: 'EUR' });
    await page.goto('/tools/saving-and-growth/investment-fee/');
    await hydrated(page);
    const r = await enter(page, 'if-monthly', '50,000');
    expect(r.value).toBe('50');
    expect(r.message).toBe('Read as \u20AC50, since \u20AC50.000 is above the maximum of \u20AC10.000.');
    await expect(page.locator('#if-monthly-message')).toHaveAttribute('role', 'status');
    await expect(page.locator('input#if-monthly')).toHaveAttribute('aria-describedby', /if-monthly-message/);
    // Typing it the unambiguous way is read as typed, with no note.
    expect(await enter(page, 'if-monthly', '5.000')).toEqual({ value: '5.000', message: '' });
  });

  test('results update while typing, before blur (CO-3)', async ({ page }) => {
    await page.goto(SALARY_UK);
    await hydrated(page);
    const before = await headline(page);
    const input = page.locator('input#uk-salary');
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.pressSequentially('52000', { delay: 20 });
    await expect.poll(() => headline(page), { timeout: 5000 }).not.toBe(before);
    expect(await input.inputValue()).toBe('52000'); // not reformatted mid-edit
  });
});

test.describe('typed before hydration (CO-2)', () => {
  for (const c of [
    { path: SALARY_UK, id: 'uk-salary', text: '52000', component: 'SalaryUkCalc' },
    { path: COMPOUND, id: 'ci-principal', text: '50000', component: 'CompoundInterestCalc' },
    // Hub pages hydrate when the calculator scrolls into view.
    { path: '/scenarios/uk-take-home-pay/', id: 'uk-salary', text: '52000', component: 'SalaryUkCalc' },
  ]) {
    test(`result matches what is on screen: ${c.component} at ${c.path}`, async ({ browser }) => {
      // Reference: the same value typed after hydration.
      const refCtx = await browser.newContext({ timezoneId: 'America/New_York' });
      await prepare(refCtx);
      const ref = await refCtx.newPage();
      await ref.goto(c.path);
      await ref.locator(`input#${c.id}`).scrollIntoViewIfNeeded();
      await hydrated(ref);
      await enter(ref, c.id, c.text, 'fill');
      const expected = await headline(ref);
      await refCtx.close();

      // Hold the island's module so typing happens on the static HTML.
      const ctx = await browser.newContext({ timezoneId: 'America/New_York' });
      await prepare(ctx);
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      await ctx.route(new RegExp(`${c.component}[^/]*\\.(js|tsx)`), async (route) => {
        await gate;
        await route.continue();
      });
      const page = await ctx.newPage();
      await page.goto(c.path, { waitUntil: 'domcontentloaded' });
      const input = page.locator(`input#${c.id}`);
      await input.waitFor();
      expect(await page.locator('astro-island[ssr] [data-headline-result]').count()).toBe(1);
      await input.fill(c.text);
      await input.press('Tab');
      release();
      await hydrated(page);
      expect(await headline(page)).toBe(expected);
      await ctx.close();
    });
  }
});

test.describe('range and EUR text before hydration (CO-2)', () => {
  /** Hold the island module so the page can be used as static HTML; returns a release function. */
  async function heldPage(browser: Browser, path: string, component: string, opts: Prep = {}) {
    const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
    await prepare(ctx, opts);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await ctx.route(new RegExp(`${component}[^/]*\\.(js|tsx)`), async (route) => {
      await gate;
      await route.continue();
    });
    const page = await ctx.newPage();
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="range"]').first().waitFor();
    expect(await page.locator('astro-island[ssr] [data-headline-result]').count()).toBe(1);
    return { ctx, page, release };
  }

  test('a slider moved before hydration drives the result', async ({ browser }) => {
    const refCtx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
    await prepare(refCtx);
    const ref = await refCtx.newPage();
    await ref.goto(COMPOUND);
    await hydrated(ref);
    const refRange = ref.locator('input[type="range"]').first();
    const startPos = await refRange.inputValue();
    await refRange.fill('4000');
    const expected = await headline(ref);
    const expectedText = await ref.locator('input#ci-principal').inputValue();
    await refCtx.close();

    const { ctx, page, release } = await heldPage(browser, COMPOUND, 'CompoundInterestCalc');
    const before = await headline(page);
    await page.locator('input[type="range"]').first().fill('4000');
    release();
    await hydrated(page);
    expect(startPos).not.toBe('4000');
    expect(await headline(page)).toBe(expected);
    expect(await headline(page)).not.toBe(before);
    expect(await page.locator('input#ci-principal').inputValue()).toBe(expectedText);
    await ctx.close();
  });

  test('EUR text typed before hydration keeps its meaning ("25.000" is twenty-five thousand)', async ({ browser }) => {
    const refCtx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
    await prepare(refCtx, { currency: 'EUR' });
    const ref = await refCtx.newPage();
    await ref.goto(COMPOUND);
    await hydrated(ref);
    await enter(ref, 'ci-principal', '25.000', 'fill');
    const expected = await headline(ref);
    await refCtx.close();

    const { ctx, page, release } = await heldPage(browser, COMPOUND, 'CompoundInterestCalc', { currency: 'EUR' });
    const before = await headline(page);
    const input = page.locator('input#ci-principal');
    await input.fill('25.000');
    await input.press('Tab');
    release();
    await hydrated(page);
    expect(await headline(page)).toBe(expected);
    expect(await headline(page)).not.toBe(before);
    expect(await input.inputValue()).toBe('25.000');
    await ctx.close();
  });
});

test.describe('UK and US pages keep their own separators (EUR visitor)', () => {
  test('salary-uk: "8.5" in an unprefixed field is 8.5, not a thousands group', async ({ page, context }) => {
    await prepare(context, { currency: 'EUR' });
    await page.goto(SALARY_UK);
    await hydrated(page);
    expect(await enter(page, 'uk-pension', '8.5')).toEqual({ value: '8.5', message: '' });
  });
});

test.describe('storage and region (CO-4)', () => {
  const STORAGE_PAGES = [
    COMPOUND,
    MORTGAGE,
    SALARY_UK,
    STAMP,
    '/tools/debt-and-loans/debt-payoff/',
    '/tools/income-and-planning/net-worth/',
    '/tools/debt-and-loans/credit-card-payoff/',
  ];
  for (const path of STORAGE_PAGES) {
    test(`storage that throws: ${path.split('/').filter(Boolean).pop()} still renders and responds`, async ({ page, context }) => {
      await prepare(context, { storageThrows: true });
      await page.goto(path);
      await hydrated(page);
      const before = await headline(page);
      const range = page.locator('#main-content input[type="range"]').first();
      if (await range.count()) {
        await range.focus();
        for (let i = 0; i < 5; i++) await range.press('ArrowRight');
      } else {
        const field = page.locator('#main-content input[type="text"][inputmode="decimal"]').first();
        await field.fill('987654');
        await field.press('Tab');
      }
      await expect.poll(() => headline(page), { timeout: 5000 }).not.toBe(before);
    });
  }

  const HYDRATION_PAGES = [
    MORTGAGE,
    COMPOUND,
    SALARY_UK,
    '/tools/debt-and-loans/debt-payoff/',
    '/tools/income-and-planning/net-worth/',
    '/tools/debt-and-loans/credit-card-payoff/',
    '/tools/saving-and-growth/investment-fee/',
    '/tools/debt-and-loans/rent-vs-buy/',
  ];
  for (const currency of ['GBP', 'EUR']) {
    for (const path of HYDRATION_PAGES) {
      test(`no hydration mismatch with ${currency} stored: ${path.split('/').filter(Boolean).pop()}`, async ({ page, context }) => {
        await prepare(context, { currency });
        const errors: string[] = [];
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(path);
        await hydrated(page);
        await page.waitForTimeout(400);
        expect(errors.filter((e) => /418|425|hydrat/i.test(e))).toEqual([]);
      });
    }
  }
});

test.describe('region default (CO-4)', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });
  test('a UK time zone with nothing stored shows GBP and stores nothing', async ({ page, context }) => {
    await prepare(context);
    await page.goto(COMPOUND);
    await hydrated(page);
    await expect(page.locator('button[aria-pressed="true"]', { hasText: 'GBP' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('calcrun.currency'))).toBeNull();
  });
});

test.describe('affiliates by region (CO-5)', () => {
  async function visiblePartners(page: Page): Promise<string[]> {
    return page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a[data-affiliate-partner]')]
        .filter((a) => a.offsetParent !== null)
        .map((a) => a.dataset.affiliatePartner ?? ''),
    );
  }

  test('stamp duty never shows LendingTree, whatever the currency', async ({ page, context }) => {
    await prepare(context, { currency: 'USD' });
    await page.goto(STAMP);
    await hydrated(page);
    expect((await visiblePartners(page)).map((p) => p.toLowerCase())).not.toContain('lendingtree');
  });

  test('a GBP visitor sees no US-only partners on compound interest', async ({ page, context }) => {
    await prepare(context, { currency: 'GBP' });
    await page.goto(COMPOUND);
    await hydrated(page);
    await page.waitForTimeout(300);
    const us = ['betterment', 'wealthfront', 'sofi', 'lendingtree', 'ally', 'ally-bank'];
    expect((await visiblePartners(page)).filter((p) => us.includes(p.toLowerCase()))).toEqual([]);
  });
});

test.describe('charts are not tab stops (CO-9)', () => {
  const CHART_PAGES: Array<[string, string]> = [
    ['mortgage-payment (donut)', MORTGAGE],
    ['mortgage-affordability', '/tools/debt-and-loans/mortgage-affordability/'],
    ['loan-amortization', '/tools/debt-and-loans/loan-amortization/'],
    ['salary-us', '/tools/income-and-planning/salary-us/'],
  ];

  async function chartsPainted(page: Page) {
    await page.locator('[role="img"] svg').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll('[role="img"] svg').length > 0 && !document.querySelector('[data-chart-pending]'), null, {
      timeout: 20000,
    });
  }

  for (const [name, path] of CHART_PAGES) {
    test(`nothing inside a chart can take focus: ${name}`, async ({ page, context }) => {
      await prepare(context);
      await page.goto(path);
      await hydrated(page);
      await chartsPainted(page);
      const stops = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[role="img"] *')]
          .filter((el) => el.tabIndex >= 0 || el.getAttribute('role') === 'application')
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').slice(0, 40)}`),
      );
      expect(stops).toEqual([]);
    });
  }

  test('Tab walks past a donut chart without stopping inside it', async ({ page, context }) => {
    await prepare(context);
    await page.goto(MORTGAGE);
    await hydrated(page);
    await chartsPainted(page);
    // The donut is the chart that contains a Pie layer; start from the focusable control before it.
    const started = await page.evaluate(() => {
      const donut = [...document.querySelectorAll<HTMLElement>('[role="img"]')].find((w) => w.querySelector('.recharts-pie'));
      if (!donut) return false;
      const focusable = [...document.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]')].filter(
        (el) => el.tabIndex >= 0 && !donut.contains(el),
      );
      const before = focusable.filter((el) => donut.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
      const last = before[before.length - 1];
      if (!last) return false;
      last.focus();
      return true;
    });
    expect(started).toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const inChart = await page.evaluate(() => !!document.activeElement?.closest('[role="img"]'));
      expect(inChart, `Tab stop ${i + 1} landed inside a chart`).toBe(false);
    }
  });
});

test.describe('PDF export load failure (CO-7)', () => {
  test('a failed load says to reload instead of offering a retry that cannot work', async ({ page, context }) => {
    await prepare(context);
    let requests = 0;
    await context.route(/\/pdf-export[^/]*$/, async (route) => {
      requests += 1;
      await route.abort('failed');
    });
    await page.goto(COMPOUND);
    await hydrated(page);
    const button = page.locator('button[data-export-pdf]').first();
    await button.click();
    await expect(button).toContainText("Couldn't load the PDF tool. Reload the page to try again.");
    await expect(button).toHaveAttribute('aria-label', /Reload the page/);
    expect(requests).toBeGreaterThan(0);
  });
});

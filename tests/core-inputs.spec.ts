/**
 * Shared calculator core (plan W1-CORE): number entry, pre-hydration typing,
 * storage failures, region default and region-correct affiliates.
 *
 * Works against the dev server (repo playwright.config.ts) and a built
 * preview. GA and /api are blocked in every context; nothing is submitted.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

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

async function hydrated(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0, null, { timeout: 30000 });
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
  return {
    value: await input.inputValue(),
    message: (await page.locator(`#${id}-message`).innerText()).trim(),
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
    const r = await enter(page, 'uk-salary', '5,000,000');
    expect(r.value).toBe('1,000,000');
    expect(r.message).toBe(`Maximum is ${POUND}1,000,000, so we used that.`);
  });

  test('EUR convention when the display currency is EUR', async ({ page, context }) => {
    await prepare(context, { currency: 'EUR' });
    await page.goto(COMPOUND);
    await hydrated(page);
    expect(await enter(page, 'ci-principal', '25.000')).toEqual({ value: '25.000', message: '' });
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
  ]) {
    test(`result matches what is on screen: ${c.component}`, async ({ browser }) => {
      // Reference: the same value typed after hydration.
      const refCtx = await browser.newContext({ timezoneId: 'America/New_York' });
      await prepare(refCtx);
      const ref = await refCtx.newPage();
      await ref.goto(c.path);
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
      expect(await page.locator('astro-island[ssr]').count()).toBeGreaterThan(0);
      await input.fill(c.text);
      await input.press('Tab');
      release();
      await hydrated(page);
      expect(await headline(page)).toBe(expected);
      await ctx.close();
    });
  }
});

test.describe('storage and region (CO-4)', () => {
  test('storage that throws: calculator still renders and responds', async ({ page, context }) => {
    await prepare(context, { storageThrows: true });
    await page.goto(COMPOUND);
    await hydrated(page);
    const before = await headline(page);
    const range = page.locator('input[type="range"]').first();
    await range.focus();
    for (let i = 0; i < 5; i++) await range.press('ArrowRight');
    await expect.poll(() => headline(page), { timeout: 5000 }).not.toBe(before);
  });

  test('no hydration mismatch with GBP stored', async ({ page, context }) => {
    await prepare(context, { currency: 'GBP' });
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(MORTGAGE);
    await hydrated(page);
    await page.waitForTimeout(500);
    expect(errors.filter((e) => /418|hydrat/i.test(e))).toEqual([]);
    expect(await headline(page)).toContain(POUND);
  });
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

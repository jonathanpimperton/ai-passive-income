/**
 * Free-text numeric fields that are not SliderInputs (NumericTextField): debt
 * rows and net-worth items.
 *
 * Regressions covered:
 * - Tab into a field showing a formatted value ("6,500") and type: the typed
 *   number replaces the old one (it used to be appended: 6,500 + 12000 became
 *   65,001,200), and so does Playwright's fill().
 * - Text typed before the island hydrated survives the blur that happens
 *   after hydration (the blur used to commit an empty value and clear it).
 * - Text that cannot be read ("1e9") puts back the value from before the edit
 *   and explains why, instead of keeping a prefix of what was typed.
 *
 * Works against the dev server (repo playwright.config.ts) and a built
 * preview. GA and /api are blocked in every context; nothing is submitted.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const GA = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const CASES = [
  {
    name: 'debt payoff row balance',
    path: '/tools/debt-and-loans/debt-payoff/',
    field: 'input[id$="-balance"]',
    prev: 'input[id$="-name"]',
    component: 'DebtPayoffCalc',
    typed: '12000',
    shown: '12,000',
  },
  {
    name: 'net-worth item value',
    path: '/tools/income-and-planning/net-worth/',
    field: 'input[id$="-value"]',
    prev: 'input[id$="-name"]',
    component: 'NetWorthCalc',
    typed: '70000',
    shown: '70,000',
  },
];

async function prepare(context: BrowserContext) {
  await context.route(GA, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await context.addInitScript(() => {
    try {
      localStorage.setItem('calcrun-cookie-consent', 'accepted');
      sessionStorage.setItem('calcrun.introSeen', '1');
    } catch {
      /* storage may be unavailable */
    }
  });
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

for (const c of CASES) {
  test.describe(c.name, () => {
    test('Tab into the field and type: the number replaces the old one', async ({ page, context }) => {
      await prepare(context);
      await page.goto(c.path);
      await hydrated(page);
      const before = await headline(page);
      const field = page.locator(c.field).first();
      const fieldId = await field.getAttribute('id');
      await page.locator(c.prev).first().focus();
      for (let i = 0; i < 3 && (await page.evaluate(() => document.activeElement?.id)) !== fieldId; i++) {
        await page.keyboard.press('Tab');
      }
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(fieldId);
      await page.keyboard.type(c.typed, { delay: 20 });
      await page.keyboard.press('Tab');
      await expect(field).toHaveValue(c.shown);
      expect(await headline(page)).not.toBe(before);
    });

    test('fill() replaces the value', async ({ page, context }) => {
      await prepare(context);
      await page.goto(c.path);
      await hydrated(page);
      const field = page.locator(c.field).first();
      await field.fill(c.typed);
      await field.press('Tab');
      await expect(field).toHaveValue(c.shown);
    });

    test('text that cannot be read puts the earlier value back and says why', async ({ page, context }) => {
      await prepare(context);
      await page.goto(c.path);
      await hydrated(page);
      const field = page.locator(c.field).first();
      const startValue = await field.inputValue();
      const before = await headline(page);
      await field.click();
      await field.press('ControlOrMeta+a');
      await field.pressSequentially('1e9', { delay: 20 });
      await field.press('Tab');
      await expect(field).toHaveValue(startValue);
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      const errorId = await field.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      await expect(page.locator(`#${errorId!.split(' ')[0]}`)).toContainText(/number/i);
      expect(await headline(page)).toBe(before);
    });

    test('typed before hydration, left after hydration: the value stays', async ({ browser }) => {
      // Reference: the same value typed after hydration.
      const refCtx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
      await prepare(refCtx);
      const ref = await refCtx.newPage();
      await ref.goto(c.path);
      await hydrated(ref);
      const refField = ref.locator(c.field).first();
      await refField.fill(c.typed);
      await refField.press('Tab');
      const expected = await headline(ref);
      await refCtx.close();

      // Hold the island's module so typing happens on the static HTML, and stay in the field.
      const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' });
      await prepare(ctx);
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      await ctx.route(new RegExp(`${c.component}[^/]*\\.(js|tsx)`), async (route) => {
        await gate;
        await route.continue();
      });
      const page = await ctx.newPage();
      await page.goto(c.path, { waitUntil: 'domcontentloaded' });
      const field = page.locator(c.field).first();
      await field.waitFor();
      expect(await page.locator('astro-island[ssr] [data-headline-result]').count()).toBe(1);
      await field.click();
      await field.fill(c.typed);
      release();
      await hydrated(page);
      await field.press('Tab'); // the blur happens after hydration
      await expect(field).toHaveValue(c.shown);
      expect(await headline(page)).toBe(expected);
      await ctx.close();
    });
  });
}

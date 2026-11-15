/**
 * Homepage decision engine (plan-2026-11 W2-ENGINE).
 *
 * - Take-home tab: the monthly figure is a headline with the same weight as
 *   the annual one, and both equal the full UK and US salary calculators for
 *   the same inputs (owner requirement, 13 Nov 2026).
 * - Affordability and retirement answers equal the full tools (MATH-US-07/08).
 * - No duplicate ids, collapsed accordion panels are inert, aria-live is a
 *   compact sentence (A11Y-PERF-14, HOME-CHROME-07, plan 5.4).
 * - No React hydration error in non-UTC time zones or when a 2026 build is
 *   served in 2027 (year rollover).
 * - The "$100K after tax" tile agrees with the US hub; the UK pension chip
 *   includes tax relief (CONTENT-05, MATH-UK-18).
 *
 * Runs against a built preview or the dev server. GA and /api are blocked in
 * every context; nothing is submitted.
 */
import { test, expect, type Page, type BrowserContext, type Locator } from '@playwright/test';

const GA = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;

test.use({ timezoneId: 'America/New_York', locale: 'en-US', viewport: { width: 1280, height: 900 } });

async function prepare(context: BrowserContext, currency?: string) {
  await context.route(GA, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await context.addInitScript((c: string | undefined) => {
    try {
      localStorage.setItem('calcrun-cookie-consent', 'accepted');
      localStorage.setItem('calcrun.introSeen', '1');
      sessionStorage.setItem('calcrun.introSeen', '1');
      if (c) localStorage.setItem('calcrun.currency', c);
    } catch {
      /* storage may be unavailable */
    }
  }, currency);
}

/** The engine island has hydrated (Astro drops `ssr`, React attaches a fiber to the panel). */
async function engineHydrated(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById('engine-panel');
      const island = el?.closest('astro-island');
      return !!el && !!island && !island.hasAttribute('ssr') && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
    },
    null,
    { timeout: 30000 },
  );
}

/** A tool island has hydrated: its headline result is React-owned. */
async function toolHydrated(page: Page) {
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

/** Text of a locator once its count-up animation has stopped changing. */
async function settled(el: Locator): Promise<string> {
  let last = '';
  let same = 0;
  for (let i = 0; i < 80 && same < 5; i++) {
    const now = (await el.first().innerText()).trim();
    same = now === last ? same + 1 : 0;
    last = now;
    await el.page().waitForTimeout(100);
  }
  return last;
}

const digits = (t: string) => Number(t.replace(/[^0-9.]/g, ''));

async function enter(page: Page, id: string, text: string) {
  const input = page.locator(`input#${id}`);
  await input.click();
  await input.press('ControlOrMeta+a');
  await input.pressSequentially(text, { delay: 10 });
  await input.press('Tab');
}

async function openHome(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 800 });
  await page.goto('/');
  await engineHydrated(page);
}

/** Open the take-home pay question (desktop tab or mobile accordion) and return its panel. */
async function openTakeHome(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 1280) >= 1024) {
    await page.getByRole('tab', { name: /take-home pay/i }).click();
    return page.locator('#engine-panel');
  }
  return openAccordion(page, 3);
}

async function openQuestion(page: Page, tabName: RegExp, mobileId: number): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 1280) >= 1024) {
    await page.getByRole('tab', { name: tabName }).click();
    return page.locator('#engine-panel');
  }
  return openAccordion(page, mobileId);
}

/** Open a mobile accordion question (clicking an open one would close it). */
async function openAccordion(page: Page, id: number): Promise<Locator> {
  const button = page.locator(`#engine-mobile-tab-${id}`);
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  return page.locator(`#engine-mobile-panel-${id}`);
}

/** Take-home cell of a period row ("Annual", "Monthly") in a salary tool's period table. */
function toolPeriod(page: Page, label: string): Locator {
  return page.locator(`tr:has(th[scope="row"]:text-is("${label}")) td`).last();
}

const consoleProblems = (page: Page) => {
  const bad: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) bad.push(m.text());
  });
  page.on('pageerror', (e) => bad.push(`pageerror: ${e.message}`));
  return bad;
};

/* -- Take-home tab: monthly and annual are equal headlines -------------- */

for (const width of [1280, 360]) {
  test(`take-home: monthly and annual have equal visual weight at ${width}px`, async ({ page, context }) => {
    await prepare(context);
    await openHome(page, width);
    const panel = await openTakeHome(page);
    const monthly = panel.locator('[data-engine-net="monthly"]');
    const annual = panel.locator('[data-engine-net="annual"]');
    await expect(monthly).toBeVisible();
    await expect(annual).toBeVisible();
    await settled(annual);

    const style = (loc: Locator) =>
      loc.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName,
          className: el.className,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily,
          lineHeight: cs.lineHeight,
          numeric: cs.fontVariantNumeric,
        };
      });
    const [sm, sa] = [await style(monthly), await style(annual)];
    expect(sm).toEqual(sa); // same element class, size, weight, mono face
    expect(sm.className).toContain('tabular-nums'); // every financial figure is mono (.tabular-nums)

    // Same row: same top, same height, both fully inside the viewport
    const [bm, ba] = [await monthly.boundingBox(), await annual.boundingBox()];
    expect(bm && ba).toBeTruthy();
    expect(Math.abs(bm!.y - ba!.y)).toBeLessThan(2);
    expect(Math.abs(bm!.height - ba!.height)).toBeLessThan(2);
    for (const b of [bm!, ba!]) expect(b.x + b.width).toBeLessThanOrEqual(width);

    // 12 x monthly reconciles to annual within rounding
    const [m, a] = [digits(await monthly.innerText()), digits(await annual.innerText())];
    expect(Math.abs(12 * m - a)).toBeLessThanOrEqual(6);
    // Labelled "a month" / "a year"
    await expect(panel.getByText(/take-home, a month/i)).toBeVisible();
    await expect(panel.getByText(/take-home, a year/i)).toBeVisible();
  });
}

test('take-home (US) equals the US Salary calculator for the same inputs', async ({ page, context }) => {
  await prepare(context);
  await openHome(page);
  const panel = await openTakeHome(page);
  const homeMonthly = digits(await settled(panel.locator('[data-engine-net="monthly"]')));
  const homeAnnual = digits(await settled(panel.locator('[data-engine-net="annual"]')));
  expect(homeAnnual).toBeGreaterThan(0);

  // The tool at the engine's inputs: $85,000 (the engine default), no state tax, 0% 401(k), single.
  await page.goto('/tools/income-and-planning/salary-us/');
  await toolHydrated(page);
  await enter(page, 'sal-annual', '85000');
  await enter(page, 'sal-state', '0');
  await page.waitForTimeout(500);
  expect(digits(await settled(toolPeriod(page, 'Annual')))).toBe(homeAnnual);
  expect(digits(await settled(toolPeriod(page, 'Monthly')))).toBe(homeMonthly);
});

test('take-home (UK) equals the UK Salary calculator for the same inputs', async ({ page, context }) => {
  await prepare(context, 'GBP');
  await openHome(page);
  const panel = await openTakeHome(page);
  await expect(panel.getByRole('button', { name: 'UK' })).toHaveAttribute('aria-pressed', 'true');
  const homeMonthly = await settled(panel.locator('[data-engine-net="monthly"]'));
  const homeAnnual = await settled(panel.locator('[data-engine-net="annual"]'));
  expect(homeMonthly).toMatch(/^£/);

  await page.goto('/tools/income-and-planning/salary-uk/');
  await toolHydrated(page);
  await enter(page, 'uk-salary', '45000'); // the engine's UK default
  await enter(page, 'uk-pension', '0');
  await page.waitForTimeout(500);
  expect(digits(await settled(toolPeriod(page, 'Annual')))).toBe(digits(homeAnnual));
  expect(digits(await settled(toolPeriod(page, 'Monthly')))).toBe(digits(homeMonthly));
});

test('country defaults from the visitor region: a UK time zone starts on UK figures', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Europe/London', locale: 'en-GB', viewport: { width: 1280, height: 900 } });
  await prepare(context); // no stored currency: region.ts decides
  const page = await context.newPage();
  await openHome(page);
  const panel = await openTakeHome(page);
  await expect(panel.getByRole('button', { name: 'UK' })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('[data-engine-net="monthly"]')).toContainText('£');
  await expect(panel.getByText(/2026\/27 rates/)).toBeVisible();
  await context.close();
});

test('the US/UK switch sets the site currency, so the full calculator opens in the same country', async ({ page, context }) => {
  await prepare(context);
  await openHome(page);
  const panel = await openTakeHome(page);
  await panel.getByRole('button', { name: 'UK' }).click();
  await expect(panel.locator('[data-engine-net="monthly"]')).toContainText('£');
  expect(await page.evaluate(() => localStorage.getItem('calcrun.currency'))).toBe('GBP');
  await panel.getByRole('button', { name: 'US' }).click();
  await expect(panel.locator('[data-engine-net="monthly"]')).toContainText('$');
  expect(await page.evaluate(() => localStorage.getItem('calcrun.currency'))).toBe('USD');
});

/* -- Affordability and retirement equal the full tools ------------------ */

test('affordability (US) equals the Mortgage Affordability tool at its defaults', async ({ page, context }) => {
  await prepare(context);
  await openHome(page);
  const panel = page.locator('#engine-panel');
  const home = await settled(panel.locator('[data-engine-answer="mortgage"]'));
  expect(home).toMatch(/^\$\d/);
  await expect(panel).toContainText(/Freddie Mac/); // the market rate, not a typed 6.75%
  await expect(panel).not.toContainText('6.75%');

  await page.goto('/tools/debt-and-loans/mortgage-affordability/');
  await toolHydrated(page);
  await page.waitForTimeout(800);
  expect(digits(await settled(page.locator('[data-headline-result]')))).toBe(digits(home));
});

test('affordability (UK) equals the Mortgage Affordability tool in GBP', async ({ page, context }) => {
  await prepare(context, 'GBP');
  await openHome(page);
  const panel = page.locator('#engine-panel');
  await expect(panel.getByRole('button', { name: 'UK' })).toHaveAttribute('aria-pressed', 'true');
  const home = await settled(panel.locator('[data-engine-answer="mortgage"]'));
  expect(home).toMatch(/^£\d/);

  await page.goto('/tools/debt-and-loans/mortgage-affordability/');
  await toolHydrated(page);
  await page.waitForTimeout(800); // the tool applies its UK term and rate after hydration
  expect(digits(await settled(page.locator('[data-headline-result]')))).toBe(digits(home));
});

test('retirement: the default equals the tool; an unreachable target is said so', async ({ page, context }) => {
  await prepare(context);
  await openHome(page);
  const panel = await openQuestion(page, /retire/i, 2);
  const answer = panel.locator('[data-engine-answer="retire"]');
  const homeDefault = await settled(answer);
  expect(homeDefault).toMatch(/^Age \d+$/);

  // Review repro (MATH-US-08): age 65, $100 a month, nothing saved
  await enter(page, 'engine-d-retire-age', '65');
  await enter(page, 'engine-d-retire-saved', '0');
  await enter(page, 'engine-d-retire-monthly', '100');
  await page.waitForTimeout(500);
  await expect(answer).toHaveText('Not by age 90');
  await expect(panel).not.toContainText(/years of saving/i);
  await expect(panel).not.toContainText(/Age 90/);
  await expect(panel).toContainText(/short of \$1,000,000/);

  // The tool agrees, for the default and for the unreachable case
  await page.goto('/tools/income-and-planning/retirement-age/');
  await toolHydrated(page);
  expect(await settled(page.locator('[data-headline-result]'))).toBe(homeDefault);
  await enter(page, 'reta-current-age', '65');
  await enter(page, 'reta-current-savings', '0');
  await enter(page, 'reta-monthly', '100');
  await page.waitForTimeout(500);
  expect(await settled(page.locator('[data-headline-result]'))).toBe('Not by age 90');
});

/* -- Accessibility ------------------------------------------------------ */

for (const width of [1280, 360]) {
  test(`no duplicate ids; every engine input has one name at ${width}px`, async ({ page, context }) => {
    await prepare(context);
    await openHome(page, width);
    const dupes = await page.evaluate(() => {
      const seen = new Map<string, number>();
      for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(dupes).toEqual([]);

    const panel = await openQuestion(page, /afford this house/i, 0);
    const income = panel.getByRole('textbox', { name: 'Annual income' });
    await expect(income).toHaveCount(1);
    await expect(income).toHaveAccessibleName('Annual income'); // not doubled, not empty
    await expect(panel.getByRole('textbox', { name: 'Down payment' })).toHaveAccessibleName('Down payment');
  });
}

test('collapsed accordion panels are inert and unreachable by Tab at 360px', async ({ page, context }) => {
  await prepare(context);
  await openHome(page, 360);
  const states = () =>
    page.evaluate(() =>
      [0, 1, 2, 3].map((i) => {
        const p = document.getElementById(`engine-mobile-panel-${i}`)!;
        return { inert: p.hasAttribute('inert'), hidden: p.getAttribute('aria-hidden') };
      }),
    );
  expect(await states()).toEqual([
    { inert: false, hidden: null },
    { inert: true, hidden: 'true' },
    { inert: true, hidden: 'true' },
    { inert: true, hidden: 'true' },
  ]);

  // Tab through the whole accordion: focus never lands inside a collapsed panel
  await page.locator('#engine-mobile-tab-0').focus();
  const landed = new Set<string>();
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest('[id^="engine-mobile-panel-"]')?.id ?? '';
    });
    if (where) landed.add(where);
  }
  expect([...landed]).toEqual(['engine-mobile-panel-0']);

  // Opening another question moves the inert state with it
  await page.locator('#engine-mobile-tab-2').click();
  expect(await states()).toEqual([
    { inert: true, hidden: 'true' },
    { inert: true, hidden: 'true' },
    { inert: false, hidden: null },
    { inert: true, hidden: 'true' },
  ]);
});

test('aria-live is one compact sentence per panel, never the whole panel', async ({ page, context }) => {
  await prepare(context);
  await openHome(page);
  const regions = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')]
      .filter((el) => el.closest('.d-engine-wrap'))
      .map((el) => ({ tag: el.tagName, role: el.getAttribute('role'), children: el.children.length, text: (el.textContent ?? '').trim() })),
  );
  expect(regions.length).toBeGreaterThan(0);
  for (const r of regions) {
    expect(r.tag).toBe('P');
    expect(r.role).toBe('status');
    expect(r.children).toBe(0);
    expect(r.text.length).toBeLessThan(140);
    expect(r.text.match(/[.!?](\s|$)/g)?.length ?? 0).toBeLessThanOrEqual(1); // one sentence
  }
  expect(await page.locator('#engine-panel').getAttribute('aria-live')).toBeNull();
});

/* -- Hydration: time zones and the year rollover ------------------------ */

const HYDRATION = /#418|#423|#425|hydrat|did not match|server rendered HTML/i;

for (const tz of ['Europe/London', 'Pacific/Kiritimati', 'America/Los_Angeles', 'Asia/Tokyo']) {
  test(`no hydration error in ${tz}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: tz, locale: 'en-US', viewport: { width: 1280, height: 900 } });
    await prepare(context);
    const page = await context.newPage();
    const bad = consoleProblems(page);
    await openHome(page);
    await openTakeHome(page);
    await page.waitForTimeout(500);
    expect(bad.filter((m) => HYDRATION.test(m))).toEqual([]);
    await context.close();
  });
}

test('a 2026 build served in January 2027 reconciles to 2027 without a hydration error', async ({ page, context }) => {
  await prepare(context);
  const bad = consoleProblems(page);
  await page.clock.setFixedTime(new Date('2027-01-02T12:00:00Z'));
  await openHome(page);
  const panel = await openTakeHome(page);
  await expect(page.locator('[data-engine-year]')).toHaveAttribute('data-engine-year', '2027');
  await expect(panel.getByText(/2027 federal tax and FICA/)).toBeVisible();
  const homeAnnual = digits(await settled(panel.locator('[data-engine-net="annual"]')));
  expect(bad.filter((m) => HYDRATION.test(m))).toEqual([]);

  // The tool, on the same date, agrees (it defaults to 2027 too)
  await page.goto('/tools/income-and-planning/salary-us/');
  await toolHydrated(page);
  await enter(page, 'sal-annual', '85000');
  await enter(page, 'sal-state', '0');
  await page.waitForTimeout(500);
  expect(digits(await settled(toolPeriod(page, 'Annual')))).toBe(homeAnnual);
});

test('a time zone already in the new year reconciles too (Pacific/Kiritimati on 31 Dec UTC)', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Pacific/Kiritimati', locale: 'en-US', viewport: { width: 1280, height: 900 } });
  await prepare(context);
  const page = await context.newPage();
  const bad = consoleProblems(page);
  await page.clock.setFixedTime(new Date('2026-12-31T12:00:00Z')); // 2027-01-01 02:00 in Kiritimati
  await openHome(page);
  await openTakeHome(page);
  await expect(page.locator('[data-engine-year]')).toHaveAttribute('data-engine-year', '2027');
  expect(bad.filter((m) => HYDRATION.test(m))).toEqual([]);
  await context.close();
});

/* -- Tiles on the page around the engine -------------------------------- */

test('"$100K after tax" tile points at the US hub row and agrees with it', async ({ page, context }) => {
  await prepare(context);
  await page.goto('/');
  const tile = page.locator('a[href="/scenarios/us-take-home-pay/#100k"]');
  await expect(tile).toHaveCount(1);
  const tileMonthly = (await tile.innerText()).match(/\$[\d,]+(?=\/mo)/)?.[0];
  expect(tileMonthly).toBeTruthy();

  await page.goto('/scenarios/us-take-home-pay/#100k');
  await expect(page.locator('tr[id="100k"]')).toContainText(tileMonthly!);
  // And no link on the homepage still sends "$100K" to the California page
  await page.goto('/');
  await expect(page.locator('a[href="/scenarios/100k-salary-take-home/"]')).toHaveCount(0);
});

test('UK pension chip is the net payment grossed up for basic-rate relief', async ({ page, context }) => {
  await prepare(context);
  await page.goto('/');
  const row = page.locator('a.decision-row', { hasText: 'pension' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('£125 with basic-rate relief');
  // £125 a month for 30 years at 7%, deposits at month end
  const i = 0.07 / 12;
  const expected = 125 * ((Math.pow(1 + i, 360) - 1) / i);
  const shown = digits((await row.locator('.decision-a').innerText()).replace(/after.*/, ''));
  expect(Math.abs(shown - expected)).toBeLessThan(expected * 0.01);
});

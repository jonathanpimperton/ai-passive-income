/**
 * Scenario hub pages (plan W2-SCEN): each page's embedded calculator starts on
 * the same assumptions as its table, take-home hubs give the yearly and the
 * monthly figure the same weight (visible at 390 px), hub rows are labelled
 * for assistive tech, and a legacy anchor lands on a labelled, clearly
 * highlighted row in both themes.
 *
 * Works against the dev server (repo playwright.config.ts) and a built
 * preview. GA and /api are blocked in every context; nothing is submitted.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GA = /(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/;

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

async function prepare(context: BrowserContext, theme: 'light' | 'dark' = 'light') {
  await context.route(GA, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await context.addInitScript((t: string) => {
    try {
      localStorage.setItem('calcrun-cookie-consent', 'accepted');
      localStorage.setItem('calcrun.theme', t);
      localStorage.setItem('calcrun.introSeen', '1');
    } catch {
      /* storage may be blocked */
    }
  }, theme);
}

/** React has taken over the calculator island. */
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

const digits = (s: string) => s.replace(/[^0-9]/g, '');

interface HubCase {
  name: string;
  path: string;
  rowId: string;
  /** Index of the table cell (after the row header) that holds the calculator's headline figure. */
  cell: number;
  /**
   * Allowed difference in whole currency units. The compound interest calculator rounds its
   * final balance to cents and then to whole dollars, so a balance that ends in .4996 shows
   * one dollar higher than the engine value the table prints ($609,986 vs $609,985 for
   * $500 a month over 30 years). Calculator-side double rounding, reported to its owner.
   */
  tolerance?: number;
}

const HUBS: HubCase[] = [
  { name: 'UK take-home pay', path: '/scenarios/uk-take-home-pay/', rowId: '50k', cell: 0 },
  { name: 'US take-home pay', path: '/scenarios/us-take-home-pay/', rowId: '100k', cell: 0 },
  { name: 'mortgage payments', path: '/scenarios/mortgage-payments-by-amount/', rowId: '300k', cell: 0 },
  { name: 'investment growth', path: '/scenarios/investment-growth/', rowId: '500-per-month', cell: 2, tolerance: 1 },
];

/** Where a visitor might be: region detection picks GBP or EUR from these on the calculators. */
const VISITORS = [
  { where: 'US', timezoneId: 'America/New_York', locale: 'en-US' },
  { where: 'UK', timezoneId: 'Europe/London', locale: 'en-GB' },
  { where: 'Germany', timezoneId: 'Europe/Berlin', locale: 'de-DE' },
];

for (const hub of HUBS) {
  // The take-home hubs lock their calculator's currency; the mortgage and investment embeds follow
  // the visitor's region, so check them from the UK and Germany too (same digits, rate and term kept).
  const visitors = hub.cell === 0 && hub.name.includes('take-home') ? VISITORS.slice(0, 1) : VISITORS;
  for (const v of visitors) {
    test(`${hub.name} hub: the embedded calculator shows the table's default row (${v.where})`, async ({ browser }) => {
      const ctx = await browser.newContext({ timezoneId: v.timezoneId, locale: v.locale });
      await prepare(ctx);
      const page = await ctx.newPage();
      await page.goto(hub.path);
      const row = page.locator(`tr[id="${hub.rowId}"]`).first();
      const cells = row.locator('td');
      await page.locator('#calculator').scrollIntoViewIfNeeded();
      await hydrated(page);
      const settled = await headline(page);
      // The take-home calculators show a month figure and a year figure in one headline.
      const figures = await page.locator('[data-headline-result] p.result-number').allInnerTexts();
      const check = (calculator: string, table: string, label: string) => {
        const gap = Math.abs(Number(digits(calculator)) - Number(digits(table)));
        expect(gap, `${label}: calculator ${calculator} vs table ${table}`).toBeLessThanOrEqual(hub.tolerance ?? 0);
      };
      if (figures.length === 2) {
        check(figures[1], (await cells.nth(0).innerText()).trim(), 'a year');
        check(figures[0], (await cells.nth(1).innerText()).trim(), 'a month');
      } else {
        check(settled, (await cells.nth(hub.cell).innerText()).trim(), 'headline');
      }
      await ctx.close();
    });
  }

  test(`${hub.name} hub: tables have captions and row headers`, async ({ page, context }) => {
    await prepare(context);
    await page.goto(hub.path);
    const tables = page.locator('table.hub-table');
    expect(await tables.count()).toBeGreaterThan(0);
    for (let i = 0; i < (await tables.count()); i++) {
      const table = tables.nth(i);
      expect((await table.locator('caption').innerText()).trim().length, `table ${i} caption`).toBeGreaterThan(20);
      const rows = await table.locator('tbody tr.hub-row').count();
      expect(await table.locator('tbody tr.hub-row > th[scope="row"]').count(), `table ${i} row headers`).toBe(rows);
      expect(await table.locator('thead th[scope="col"]').count(), `table ${i} column headers`).toBeGreaterThan(1);
    }
  });
}

for (const hub of [HUBS[0], HUBS[1]]) {
  test(`${hub.name} hub: yearly and monthly figures reconcile for every row`, async ({ page, context }) => {
    await prepare(context);
    await page.goto(hub.path);
    const rows = page.locator('table.hub-table').first().locator('tbody tr.hub-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(15);
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      const year = Number(digits(await cells.nth(0).innerText()));
      const month = Number(digits(await cells.nth(1).innerText()));
      // Both come from one engine result: month = year / 12, each rounded to whole units.
      expect(Math.abs(year - month * 12), `row ${i}: ${year} vs 12 x ${month}`).toBeLessThanOrEqual(6);
    }
  });

  test(`${hub.name} hub: yearly and monthly have equal weight and are on screen at 390 px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York', locale: 'en-US' });
    await prepare(ctx);
    const page = await ctx.newPage();
    await page.goto(hub.path);
    const row = page.locator(`tr[id="${hub.rowId}"]`).first();
    await row.scrollIntoViewIfNeeded();
    const cells = row.locator('td');
    const style = async (i: number) =>
      cells.nth(i).evaluate((el) => {
        const s = getComputedStyle(el);
        return { size: s.fontSize, weight: s.fontWeight, family: s.fontFamily, color: s.color };
      });
    expect(await style(1)).toEqual(await style(0));
    for (const i of [0, 1]) {
      const box = (await cells.nth(i).boundingBox())!;
      expect(box.x, `cell ${i} left`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `cell ${i} right edge on a 390 px screen`).toBeLessThanOrEqual(390);
    }
    // The answer card above the table gives both figures in the first screen.
    const group = page.locator('[role="group"]').first();
    await group.scrollIntoViewIfNeeded();
    const cards = group.locator('p.text-2xl, p.text-3xl');
    expect(await cards.count()).toBe(2);
    const a = await cards.nth(0).evaluate((el) => getComputedStyle(el).fontSize + getComputedStyle(el).fontWeight);
    const b = await cards.nth(1).evaluate((el) => getComputedStyle(el).fontSize + getComputedStyle(el).fontWeight);
    expect(b).toBe(a);
    await ctx.close();
  });
}

test('mortgage hub: the average-rate column is on screen at 390 px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York', locale: 'en-US' });
  await prepare(ctx);
  const page = await ctx.newPage();
  await page.goto('/scenarios/mortgage-payments-by-amount/');
  const cell = page.locator('tr[id="300k"] td').first();
  await cell.scrollIntoViewIfNeeded();
  const box = (await cell.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await ctx.close();
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [390, 1280]) {
    test(`a legacy anchor lands on a labelled, highlighted row (${theme}, ${width} px)`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: 'America/New_York', locale: 'en-US' });
      await prepare(ctx, theme);
      const page = await ctx.newPage();
      // #45k is an odd row in the zebra (a striped row), the case the old highlight lost in dark mode.
      await page.goto('/scenarios/uk-take-home-pay/#45k');
      const row = page.locator('tr[id="45k"]');
      await expect(row).toBeVisible();
      const labels = page.locator('tr.hub-labels').filter({ has: page.locator('td', { hasText: 'Salary' }) });
      // The labels row directly above the target is shown; every other labels row stays hidden.
      const shown = await page.evaluate(() => {
        const target = document.querySelector('tr[id="45k"]')!;
        const prev = target.previousElementSibling as HTMLElement;
        return {
          prevIsLabels: prev.classList.contains('hub-labels'),
          prevDisplay: getComputedStyle(prev).display,
          others: [...document.querySelectorAll<HTMLElement>('tr.hub-labels')].filter((el) => el !== prev && getComputedStyle(el).display !== 'none').length,
        };
      });
      expect(shown.prevIsLabels).toBe(true);
      expect(shown.prevDisplay).toBe('table-row');
      expect(shown.others).toBe(0);
      expect(await labels.count()).toBeGreaterThan(0);

      // The target's cells differ from the neighbouring rows' cells (stripe or not).
      const bg = await page.evaluate(() => {
        const target = document.querySelector('tr[id="45k"]')!;
        const own = getComputedStyle(target.querySelector('td')!).backgroundColor;
        const next = getComputedStyle(target.nextElementSibling!.nextElementSibling!.querySelector('td')!).backgroundColor;
        const prev = getComputedStyle(target.previousElementSibling!.previousElementSibling!.querySelector('td')!).backgroundColor;
        return { own, next, prev };
      });
      expect(bg.own).not.toBe(bg.next);
      expect(bg.own).not.toBe(bg.prev);

      // The row is not hidden under the sticky site header.
      const top = (await row.boundingBox())!.y;
      expect(top).toBeGreaterThan(60);
      await ctx.close();
    });
  }
}

for (const year of [2026, 2027]) {
  test(`US hub: the stable anchor #y${year}-100k lands on that year's row, labelled and highlighted`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, timezoneId: 'America/New_York', locale: 'en-US' });
    await prepare(ctx);
    const page = await ctx.newPage();
    await page.goto(`/scenarios/us-take-home-pay/#y${year}-100k`);
    const th = page.locator(`th[id="y${year}-100k"]`);
    await expect(th).toBeVisible();
    const state = await page.evaluate((id) => {
      const target = document.getElementById(id)!;
      const row = target.closest('tr')!;
      const prev = row.previousElementSibling as HTMLElement;
      const other = row.nextElementSibling!.nextElementSibling!.querySelector('td')!;
      return {
        labelsShown: prev.classList.contains('hub-labels') && getComputedStyle(prev).display === 'table-row',
        highlighted: getComputedStyle(row.querySelector('td')!).backgroundColor !== getComputedStyle(other).backgroundColor,
        top: row.getBoundingClientRect().top,
        // the year in the table caption is the year in the anchor
        caption: row.closest('table')!.querySelector('caption')!.textContent ?? '',
      };
    }, `y${year}-100k`);
    expect(state.labelsShown).toBe(true);
    expect(state.highlighted).toBe(true);
    expect(state.top).toBeGreaterThan(60);
    expect(state.caption).toContain(String(year));
    await ctx.close();
  });
}

test('US hub: the Social Security sentence matches the table', async ({ page, context }) => {
  await prepare(context);
  await page.goto('/scenarios/us-take-home-pay/');
  // Rows from the first capped salary up share one Social Security figure; rows below it do not.
  const rows = page.locator('table.hub-table').first().locator('tbody tr.hub-row');
  const data: { salary: number; ss: number }[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    data.push({
      salary: Number(digits(await rows.nth(i).locator('th').innerText().then((t) => t.split('\n')[0]))),
      ss: Number(digits(await rows.nth(i).locator('td').nth(3).innerText())),
    });
  }
  const maxSs = Math.max(...data.map((d) => d.ss));
  const capped = data.filter((d) => d.ss === maxSs).map((d) => d.salary);
  const text = await page.locator('section', { hasText: 'Social Security stops' }).innerText();
  if (capped.length >= 2) {
    expect(text).toContain(`$${capped[0].toLocaleString('en-US')} row and every row above it`);
  }
  expect(text).not.toMatch(/\$190,000 and \$200,000 rows show the same/);
});

for (const hub of HUBS) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${hub.name} hub passes axe (${theme}, 390 px, anchor landing)`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York', locale: 'en-US' });
      await prepare(ctx, theme);
      const page = await ctx.newPage();
      await page.goto(`${hub.path}#${hub.rowId}`);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('iframe').analyze();
      const text = results.violations
        .map((v) => `[${v.impact}] ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)).join(' | ')}`)
        .join(String.fromCharCode(10));
      expect(results.violations, text).toHaveLength(0);
      await ctx.close();
    });
  }
}

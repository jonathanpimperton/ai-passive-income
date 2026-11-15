/**
 * W2-SALARY: take-home pay is a headline monthly as much as annual (owner requirement 13 Nov 2026),
 * the UK payslip comparison, the "taken from your pay" pension field and qualifying earnings.
 * Browser behaviour only; the maths is pinned in src/lib/uk-payslip.test.ts and salary-headline.test.ts.
 * Run against a built preview (see the plan, section 6.2); GA/GTM are blocked by the config.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const UK = '/tools/income-and-planning/salary-uk/';
const US = '/tools/income-and-planning/salary-us/';

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

async function open(page: Page, path: string, viewport?: { width: number; height: number }) {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(path);
  await page.locator('input[type="range"]').first().waitFor();
  await hydrated(page);
}

async function enter(page: Page, id: string, value: string) {
  const input = page.locator(`input#${id}`);
  await input.fill(value);
  await input.press('Tab');
}

/** Headline figures once the count-up animation has settled: [monthly, annual]. */
async function headlineFigures(page: Page): Promise<[string, string]> {
  const figures = page.locator('[data-headline-result] p.result-number');
  let last = '';
  let same = 0;
  for (let i = 0; i < 60 && same < 4; i++) {
    const now = (await figures.allTextContents()).join('|');
    same = now === last ? same + 1 : 0;
    last = now;
    await page.waitForTimeout(100);
  }
  const [monthly, annual] = last.split('|');
  return [monthly, annual];
}

const amount = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

test.describe('monthly and annual take-home are equal headlines', () => {
  for (const viewport of [{ width: 360, height: 780 }, { width: 1280, height: 900 }]) {
    for (const [name, path] of [['UK', UK], ['US', US]] as const) {
      test(`${name} at ${viewport.width}px: same size, weight and face, both in view, no overflow`, async ({ page }) => {
        await open(page, path, viewport);
        const figures = page.locator('[data-headline-result] p.result-number');
        await expect(figures).toHaveCount(2);
        await figures.first().scrollIntoViewIfNeeded();
        for (let i = 0; i < 2; i++) await expect(figures.nth(i)).toBeInViewport({ ratio: 1 });

        const styles = await figures.evaluateAll((els) =>
          els.map((e) => {
            const cs = getComputedStyle(e);
            return {
              fontSize: cs.fontSize,
              fontWeight: cs.fontWeight,
              fontFamily: cs.fontFamily,
              scrollWidth: e.scrollWidth,
              clientWidth: e.clientWidth,
              top: Math.round(e.getBoundingClientRect().top),
            };
          }),
        );
        expect(styles[0].fontSize).toBe(styles[1].fontSize);
        expect(styles[0].fontWeight).toBe(styles[1].fontWeight);
        expect(styles[0].fontFamily).toBe(styles[1].fontFamily);
        expect(styles[0].fontFamily).toContain('JetBrains Mono');
        for (const s of styles) expect(s.scrollWidth).toBeLessThanOrEqual(s.clientWidth);
        // Side by side on the same row at both widths for the default figures.
        expect(Math.abs(styles[0].top - styles[1].top)).toBeLessThanOrEqual(1);

        const units = await page.locator('[data-headline-result]').innerText();
        expect(units).toMatch(/a month/);
        expect(units).toMatch(/a year/);
        const [monthly, annual] = await headlineFigures(page);
        expect(Math.abs(12 * amount(monthly) - amount(annual))).toBeLessThanOrEqual(6);
        // No horizontal page scroll.
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      });
    }
  }

  test('a large salary still fits at 360px (no clipped digits)', async ({ page }) => {
    await open(page, UK, { width: 360, height: 780 });
    await enter(page, 'uk-salary', '1500000');
    await headlineFigures(page);
    const figures = page.locator('[data-headline-result] p.result-number');
    const fits = await figures.evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth));
    expect(fits).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  for (const [name, path, region] of [['UK', UK, 'astro-island p.sr-only[aria-live="polite"]'], ['US', US, 'astro-island p.sr-only[aria-live="polite"]']] as const) {
    test(`${name}: the live region is one short sentence naming both figures`, async ({ page }) => {
      await open(page, path);
      await enter(page, name === 'UK' ? 'uk-salary' : 'sal-annual', '60000');
      const region$ = page.locator(region);
      await expect(region$).toContainText('a month', { timeout: 5000 });
      await expect(region$).toContainText('a year');
      const text = (await region$.innerText()).trim();
      expect(text.split(/[.]\s/).length).toBeLessThanOrEqual(2);
      expect(text.length).toBeLessThan(110);
      // The big headline block is not itself a live region (only the compact sentence is).
      expect(await page.evaluate(() => !document.querySelector('[data-headline-result]')!.closest('[aria-live]'))).toBe(true);
      expect(await region$.evaluate((el) => el.classList.contains('sr-only'))).toBe(true);
    });
  }

  for (const [name, path, field] of [['UK', UK, 'uk-salary'], ['US', US, 'sal-annual']] as const) {
    test(`${name}: the mobile result bar shows both figures`, async ({ page }) => {
      await open(page, path, { width: 360, height: 780 });
      const bar = page.locator('#mobile-result-bar');
      await expect(bar).toBeHidden();
      await enter(page, field, '65000');
      // Move the real headline out of view (it sits below the inputs on a phone).
      await page.locator('input#' + field).scrollIntoViewIfNeeded();
      await expect(page.locator('[data-headline-result]').first()).not.toBeInViewport();
      await expect(bar).toBeVisible();
      const value = (await page.locator('#mobile-result-value').innerText()).replace(/\s+/g, ' ');
      expect(value).toMatch(/^[£$][\d,]+ a month [£$][\d,]+ a year$/);
      const [monthly, annual] = value.split(' a month ');
      expect(Math.abs(12 * amount(monthly) - amount(annual))).toBeLessThanOrEqual(6);
    });
  }
});

test.describe('first load on a phone: the pair sits at the top of the card (no interaction)', () => {
  const pairs = [['UK', UK], ['US', US]] as const;

  /** Both compact figures, fully inside the viewport and clear of the cookie banner when it is showing. */
  async function expectPairVisible(page: Page, viewportHeight: number) {
    const figures = page.locator('[data-compact-headline] p.font-mono');
    await expect(figures).toHaveCount(2);
    for (let i = 0; i < 2; i++) await expect(figures.nth(i)).toBeInViewport({ ratio: 1 });
    const banner = page.locator('#cookie-banner');
    const bannerTop = (await banner.isVisible()) ? (await banner.boundingBox())!.y : viewportHeight;
    for (let i = 0; i < 2; i++) {
      const box = (await figures.nth(i).boundingBox())!;
      expect(box.y + box.height, `figure ${i} is covered by the cookie banner`).toBeLessThanOrEqual(bannerTop);
    }
  }

  for (const [name, path] of pairs) {
    // First visit: nothing stored, so the cookie banner covers the bottom of the screen.
    for (const [width, height] of [[360, 780], [390, 844]] as const) {
      test(`${name} ${width}x${height}, first visit with the cookie banner: both figures in view above it`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(path);
        await page.locator('input[type="range"]').first().waitFor();
        await hydrated(page);
        await expect(page.locator('#cookie-banner')).toBeVisible();
        await expectPairVisible(page, height);
      });
    }

    // Returning visitor (banner dismissed): fits even on a short 640px screen.
    for (const dark of [false, true]) {
      test(`${name} 360x640, returning visitor (${dark ? 'dark' : 'light'}): both figures in view`, async ({ page }) => {
        await page.addInitScript((d) => {
          try {
            localStorage.setItem('calcrun-cookie-consent', 'declined');
            localStorage.setItem('calcrun.theme', d ? 'dark' : 'light');
          } catch {
            /* storage blocked: the page still renders */
          }
        }, dark);
        await page.setViewportSize({ width: 360, height: 640 });
        await page.goto(path);
        await page.locator('input[type="range"]').first().waitFor();
        await hydrated(page);
        await expect(page.locator('#cookie-banner')).toBeHidden();
        await expectPairVisible(page, 640);
      });
    }

    test(`${name} 360x640 first visit: the strip is the first thing in the card (the banner alone hides it at this height)`, async ({ page }) => {
      // At 360x640 the card starts at y=525 and the banner at y=536, so no in-card element can clear the
      // banner on a first visit; once the banner is answered the pair is in view.
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(path);
      await page.locator('input[type="range"]').first().waitFor();
      await hydrated(page);
      const first = await page.evaluate(() => {
        const card = document.querySelector('astro-island')!.firstElementChild!;
        return card.firstElementChild!.hasAttribute('data-compact-headline');
      });
      expect(first).toBe(true);
      await page.locator('#cookie-decline').click();
      await expect(page.locator('#cookie-banner')).toBeHidden();
      await expectPairVisible(page, 640);
    });

    test(`${name}: the compact pair is a silent duplicate (aria-hidden, one real headline, hidden on desktop)`, async ({ page }) => {
      await open(page, path, { width: 1280, height: 900 });
      const strip = page.locator('[data-compact-headline]');
      await expect(strip).toHaveAttribute('aria-hidden', 'true');
      await expect(strip).toBeHidden(); // lg:hidden
      await expect(page.locator('[data-headline-result]')).toHaveCount(1);
      await page.setViewportSize({ width: 360, height: 780 });
      await expect(strip).toBeVisible();
      // Same values as the real headline, and they follow an input change.
      await enter(page, path === UK ? 'uk-salary' : 'sal-annual', '80000');
      const [monthly, annual] = await headlineFigures(page);
      const compact = await strip.locator('p.font-mono').allTextContents();
      expect(compact).toEqual([monthly, annual]);
      // No tab stop and no announcement from the copy.
      expect(await strip.locator('a, button, input, select, [tabindex], [aria-live]').count()).toBe(0);
    });

    test(`${name}: the mobile result bar label does not truncate at 360px`, async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('calcrun-cookie-consent', 'declined');
        } catch {
          /* storage blocked: the banner just shows */
        }
      });
      await open(page, path, { width: 360, height: 780 });
      await enter(page, path === UK ? 'uk-salary' : 'sal-annual', '65000');
      // The bar steps aside for a focused control under it; drop focus so the check is about the label only.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.locator('#uk-student-loan, #sal-filing').first().scrollIntoViewIfNeeded();
      await expect(page.locator('#mobile-result-bar')).toBeVisible();
      const label = page.locator('#mobile-result-label');
      // Let the count-up settle so the value text has its final width.
      await expect(page.locator('#mobile-result-value')).toHaveText(/^[£$][\d,]+ a month [£$][\d,]+ a year$/);
      await page.waitForTimeout(700);
      const m = await label.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        value: document.getElementById('mobile-result-value')!.textContent,
        valueWidth: Math.round(document.getElementById('mobile-result-value')!.getBoundingClientRect().width),
      }));
      expect(m.clientWidth, `label "${await label.innerText()}" has no room: ${JSON.stringify(m)}`).toBeGreaterThan(0);
      expect(m.scrollWidth, `label "${await label.innerText()}" is truncated: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.clientWidth);
    });
  }

  test('UK period table: no figure wraps at 360px', async ({ page }) => {
    await open(page, UK, { width: 360, height: 780 });
    await enter(page, 'uk-salary', '125000');
    const wrapped = await page.locator('table').first().locator('td').evaluateAll((cells) =>
      cells.filter((td) => {
        const range = document.createRange();
        range.selectNodeContents(td);
        return range.getClientRects().length > 1;
      }).map((td) => td.textContent),
    );
    expect(wrapped).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe('UK relief at source: payslip comparison', () => {
  async function additionalRate(page: Page) {
    await open(page, UK);
    await enter(page, 'uk-salary', '150000');
    await page.getByText('£ a year', { exact: true }).click();
    await page.getByText('Relief at source', { exact: true }).click();
    await enter(page, 'uk-pension-amount', '8000');
  }

  test('additional-rate payer sees the payslip net and the extra relief next to the headline', async ({ page }) => {
    await additionalRate(page);
    // Hand-worked in src/lib/uk-payslip.test.ts: headline 85,786.40; payslip 83,286.40; relief 2,500.
    const [monthly, annual] = await headlineFigures(page);
    expect(monthly).toBe('£7,149');
    expect(annual).toBe('£85,786');
    const block = page.locator('[data-payslip-comparison]');
    await expect(block).toBeVisible();
    await expect(block).toContainText('On your payslip');
    await expect(block).toContainText('£6,941 a month');
    await expect(block).toContainText('£83,286 a year');
    await expect(block).toContainText('Extra relief to claim via Self Assessment');
    await expect(block).toContainText('£2,500 a year');
    // The headline comes first, then the comparison, in the same results section.
    const order = await page.evaluate(() => {
      const head = document.querySelector('[data-headline-result]')!;
      const block = document.querySelector('[data-payslip-comparison]')!;
      return !!(head.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING) && head.parentElement === block.parentElement;
    });
    expect(order).toBe(true);
  });

  test('the comparison disappears when relief at source changes nothing (basic-rate payer)', async ({ page }) => {
    await open(page, UK);
    await page.getByText('Relief at source', { exact: true }).click();
    await expect(page.locator('[data-payslip-comparison]')).toHaveCount(0);
    await enter(page, 'uk-salary', '150000');
    await expect(page.locator('[data-payslip-comparison]')).toHaveCount(1);
    await page.getByText('Net pay', { exact: true }).click();
    await expect(page.locator('[data-payslip-comparison]')).toHaveCount(0);
  });

  test('a payslip deduction x 12 reproduces the pension line exactly', async ({ page }) => {
    await open(page, UK);
    await enter(page, 'uk-salary', '60000');
    await page.getByText('£ a year', { exact: true }).click();
    await page.getByText('Relief at source', { exact: true }).click();
    // Payslip: 412.50 a month out of pay for the pension -> 4,950 a year.
    await enter(page, 'uk-pension-amount', String(412.5 * 12));
    const results = page.locator('[data-headline-result]').locator('xpath=ancestor::div[contains(@class,"lg:sticky")][1]');
    await expect(page.getByText('You pay £4,950; your provider claims £1,238 basic-rate relief, so £6,188 goes into your pension.')).toBeVisible();
    await expect(results.getByText('Pension (you pay)')).toBeVisible();
    await expect(results.locator('p', { hasText: /^£4,950$/ })).toBeVisible();
    await expect(page.getByText('That is £412.50 a month.')).toBeVisible();
  });

  test('switching % to £ keeps the contribution as the amount taken from pay', async ({ page }) => {
    await open(page, UK);
    await enter(page, 'uk-salary', '60000');
    await enter(page, 'uk-pension', '5');
    await page.getByText('Relief at source', { exact: true }).click();
    // 5% of 60,000 = 3,000 gross; the payslip shows 80% of that = 2,400.
    await page.getByText('£ a year', { exact: true }).click();
    await expect(page.locator('input#uk-pension-amount')).toHaveValue('2,400');
  });
});

test.describe('UK pension as a percentage of qualifying earnings', () => {
  test('the option matches an auto-enrolment payslip: 5% of qualifying earnings on £30,000 is £1,188', async ({ page }) => {
    await open(page, UK);
    await enter(page, 'uk-salary', '30000');
    await enter(page, 'uk-pension', '5');
    await expect(page.locator('input#uk-pension')).toHaveValue('5');
    await page.locator('#uk-pension-base').selectOption('qualifying');
    // Switching the base keeps the same contribution (1,500 = 6.31% of 23,760)...
    await expect(page.locator('input#uk-pension')).toHaveValue('6.31');
    await expect(page.locator('#uk-pension-base-hint')).toContainText('£23,760');
    // ...then 5% of qualifying earnings is 1,188.
    await enter(page, 'uk-pension', '5');
    const pensionCard = page.locator('p', { hasText: /^Pension$/ }).locator('xpath=following-sibling::p[1]');
    await expect(pensionCard).toHaveText('£1,188');
    await expect(page.locator('label[for="uk-pension"]')).toContainText('% of qualifying earnings');
  });
});

test.describe('US salary: year rollover keeps the headline in step', () => {
  test('on 2 Jan 2027 the monthly and annual headline come from the 2027 result after hydration', async ({ page }) => {
    // The page was built in 2026; the visitor arrives in 2027.
    await page.clock.setFixedTime(new Date('2027-01-02T12:00:00Z'));
    await open(page, US);
    await expect(page.locator('#sal-year')).toHaveValue('2027');
    const [monthly, annual] = await headlineFigures(page);
    // The period table is built from the same result: Monthly and Annual take-home cells match the headline.
    const cells = page.locator('#sal-results table').first().locator('tbody tr');
    await expect(cells.nth(0).locator('td').nth(1)).toHaveText(annual);
    await expect(cells.nth(1).locator('td').nth(1)).toHaveText(monthly);
    expect(Math.abs(12 * amount(monthly) - amount(annual))).toBeLessThanOrEqual(6);
    // A different year gives a different figure, so the headline really follows the reconciled year.
    await page.locator('#sal-year').selectOption('2026');
    await expect.poll(async () => (await headlineFigures(page))[1]).not.toBe(annual);
  });
});

test.describe('accessibility of the new result blocks (axe, WCAG AA)', () => {
  async function axeViolations(page: Page) {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('iframe').analyze();
    return results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.nodes.slice(0, 2).map((n) => n.html.slice(0, 100)).join(' | ')}`);
  }

  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light';

    test(`US salary (${mode})`, async ({ page }) => {
      if (dark) await page.addInitScript(() => localStorage.setItem('calcrun.theme', 'dark'));
      await open(page, US);
      expect(await axeViolations(page)).toEqual([]);
    });

    test(`UK salary with the payslip comparison and the qualifying-earnings option (${mode})`, async ({ page }) => {
      if (dark) await page.addInitScript(() => localStorage.setItem('calcrun.theme', 'dark'));
      await open(page, UK);
      await enter(page, 'uk-salary', '150000');
      await page.getByText('Relief at source', { exact: true }).click();
      await page.locator('#uk-pension-base').selectOption('qualifying');
      await expect(page.locator('[data-payslip-comparison]')).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
      await page.getByText('£ a year', { exact: true }).click();
      expect(await axeViolations(page)).toEqual([]);
    });
  }
});

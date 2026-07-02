/**
 * Accessibility tests using axe-core.
 *
 * Runs automated WCAG AA checks on representative pages:
 *  - Homepage
 *  - 3 calculator pages (compound interest, UK salary, mortgage)
 *  - Scenarios index
 *  - Dark mode variant
 *
 * All WCAG AA rules are enabled, including color-contrast.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Run axe on the current page and return violations (all WCAG AA rules including color-contrast).
 */
async function runAxe(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('iframe')
    .analyze();
  return results.violations;
}

function formatViolations(violations: import('axe-core').Result[]) {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 3)
        .map((n) => `    - ${n.html.substring(0, 120)}`)
        .join('\n');
      return `[${v.impact}] ${v.id}: ${v.description}\n${nodes}`;
    })
    .join('\n\n');
}

// ════════════════════════════════════════════════════════════════
//  HOMEPAGE
// ════════════════════════════════════════════════════════════════

test.describe('Accessibility — Homepage', () => {
  test('passes WCAG AA checks including color-contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
//  CALCULATOR PAGES
// ════════════════════════════════════════════════════════════════

const calculatorPages = [
  { name: 'Compound Interest', url: '/tools/saving-and-growth/compound-interest/' },
  { name: 'UK Salary', url: '/tools/income-and-planning/salary-uk/' },
  { name: 'Mortgage Payment', url: '/tools/debt-and-loans/mortgage-payment/' },
];

for (const calc of calculatorPages) {
  test.describe(`Accessibility — ${calc.name}`, () => {
    test('passes WCAG AA checks', async ({ page }) => {
      await page.goto(calc.url);
      await page.waitForLoadState('networkidle');
      // Wait for React hydration
      await page.waitForTimeout(500);

      const violations = await runAxe(page);
      expect(violations, formatViolations(violations)).toHaveLength(0);
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  SCENARIOS INDEX
// ════════════════════════════════════════════════════════════════

test.describe('Accessibility — Scenarios Index', () => {
  test('passes WCAG AA checks', async ({ page }) => {
    await page.goto('/scenarios/');
    await page.waitForLoadState('networkidle');

    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
//  DARK MODE
// ════════════════════════════════════════════════════════════════

test.describe('Accessibility — Dark Mode', () => {
  test('homepage in dark mode passes WCAG AA checks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Toggle to dark mode
    const toggle = page.locator('button.theme-toggle').first();
    await toggle.click();
    await page.waitForTimeout(300);

    // Verify dark mode is active
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');

    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('calculator in dark mode passes WCAG AA checks', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/compound-interest/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Toggle to dark mode
    const toggle = page.locator('button.theme-toggle').first();
    await toggle.click();
    await page.waitForTimeout(300);

    const violations = await runAxe(page);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

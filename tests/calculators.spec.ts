/**
 * E2E tests for all 14 financial calculators.
 *
 * Verifies:
 *  - Page loads and React island hydrates
 *  - Inputs accept values via SliderInput text fields
 *  - Results update with expected formatted values
 *  - Share/Email/Export buttons render
 *  - Currency selector works (on compound interest)
 */
import { test, expect, Page } from '@playwright/test';

/** Scope h1 to main content to avoid Astro dev toolbar h1 elements */
const mainH1 = '#main-content h1';

/**
 * Fill a SliderInput text field by ID.
 * Clicks the text input, clears it, types the value, then blurs to trigger formatting.
 */
async function fillSliderInput(page: Page, id: string, value: string) {
  const input = page.locator(`input#${id}`);
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click();
  await input.fill('');
  await input.type(value, { delay: 20 });
  await input.press('Tab');
  // Give React time to update results
  await page.waitForTimeout(300);
}

/**
 * Get the first big result number text from the results panel.
 */
async function getResultText(page: Page): Promise<string> {
  const result = page.locator('.result-number').first();
  await expect(result).toBeVisible({ timeout: 10000 });
  return (await result.textContent()) ?? '';
}

/**
 * Wait for the calculator React island to hydrate.
 */
async function waitForCalcHydration(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for a React-rendered element to appear (SliderInput renders input[type="range"])
  await page.locator('input[type="range"]').first().waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForTimeout(300);
}

// ════════════════════════════════════════════════════════════════
//  SAVING & GROWTH
// ════════════════════════════════════════════════════════════════

test.describe('Compound Interest Calculator', () => {
  test('computes future value with known inputs', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/compound-interest/');
    await waitForCalcHydration(page);

    await expect(page.locator(mainH1).first()).toBeVisible();

    await fillSliderInput(page, 'ci-principal', '10000');
    await fillSliderInput(page, 'ci-monthly', '100');
    await fillSliderInput(page, 'ci-rate', '7');
    await fillSliderInput(page, 'ci-years', '10');

    const result = await getResultText(page);
    // With monthly compounding + $100/mo contribution, expect $30,000-$40,000 range
    expect(result).toMatch(/\$[2-4]\d,\d{3}/);
  });

  test('share, email, and export buttons render', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/compound-interest/');
    await waitForCalcHydration(page);

    await expect(page.getByRole('button', { name: /share/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /email my results/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export results as pdf/i })).toBeVisible();
  });

  test('currency selector switches to GBP', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/compound-interest/');
    await waitForCalcHydration(page);

    // Click GBP button
    await page.click('button:has-text("£ GBP")');
    await page.waitForTimeout(300);

    // Verify result now shows £
    const result = await getResultText(page);
    expect(result).toContain('£');
  });
});

test.describe('Investment Return Calculator', () => {
  test('computes future value', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/investment-return/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'ir-principal', '10000');
    await fillSliderInput(page, 'ir-monthly', '100');
    await fillSliderInput(page, 'ir-rate', '7');
    await fillSliderInput(page, 'ir-years', '10');

    const result = await getResultText(page);
    // Should show a dollar amount in results
    expect(result).toMatch(/\$[\d,]+/);
  });
});

test.describe('Savings Goal Calculator', () => {
  test('computes monthly savings needed', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/savings-goal/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'sg-goal', '50000');

    const result = await getResultText(page);
    // Should show a dollar amount
    expect(result).toMatch(/\$/);
  });
});

test.describe('ROI Calculator', () => {
  test('computes ROI percentage', async ({ page }) => {
    await page.goto('/tools/saving-and-growth/roi/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'roi-initial', '10000');
    await fillSliderInput(page, 'roi-final', '15000');
    // Reset dividends to 0 for a clean 50% ROI
    await fillSliderInput(page, 'roi-div', '0');

    const result = await getResultText(page);
    // Should show a percentage
    expect(result).toMatch(/[\d.]+%/);
  });
});

// ════════════════════════════════════════════════════════════════
//  DEBT & LOANS
// ════════════════════════════════════════════════════════════════

test.describe('Loan Amortization Calculator', () => {
  test('computes monthly payment', async ({ page }) => {
    await page.goto('/tools/debt-and-loans/loan-amortization/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'la-amount', '200000');
    await fillSliderInput(page, 'la-rate', '6');
    await fillSliderInput(page, 'la-term', '30');

    const result = await getResultText(page);
    // ~$1,199/mo
    expect(result).toMatch(/\$1,[12]\d{2}/);
  });
});

test.describe('Mortgage Payment Calculator', () => {
  test('computes monthly payment', async ({ page }) => {
    await page.goto('/tools/debt-and-loans/mortgage-payment/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'mort-price', '400000');

    const result = await getResultText(page);
    // Should show a dollar amount for monthly payment
    expect(result).toMatch(/\$[\d,]+/);
  });
});

test.describe('Debt Payoff Calculator', () => {
  test('shows payoff timeline with default debts', async ({ page }) => {
    await page.goto('/tools/debt-and-loans/debt-payoff/');
    await waitForCalcHydration(page);

    // Calculator has default debts pre-filled, so results should show
    const result = await getResultText(page);
    // Should show a timeframe (months or "Debt-Free" date)
    expect(result.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
//  INCOME & PLANNING
// ════════════════════════════════════════════════════════════════

test.describe('US Salary Calculator', () => {
  test('computes take-home pay', async ({ page }) => {
    await page.goto('/tools/income-and-planning/salary-us/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'sal-annual', '75000');

    const result = await getResultText(page);
    // Should show dollar amount for take-home
    expect(result).toMatch(/\$[\d,]+/);
  });
});

test.describe('UK Salary Calculator', () => {
  test('computes take-home pay', async ({ page }) => {
    await page.goto('/tools/income-and-planning/salary-uk/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'uk-salary', '50000');

    const result = await getResultText(page);
    // Should show pound amount for take-home (~£37,000-£39,000)
    expect(result).toMatch(/£[\d,]+/);
  });
});

test.describe('Retirement Savings Calculator', () => {
  test('computes projected balance', async ({ page }) => {
    await page.goto('/tools/income-and-planning/retirement-savings/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'ret-current-age', '30');
    await fillSliderInput(page, 'ret-retirement-age', '65');

    const result = await getResultText(page);
    // Should show a dollar amount
    expect(result).toMatch(/\$[\d,]+/);
  });
});

test.describe('Retirement Contribution Calculator', () => {
  test('computes required monthly savings', async ({ page }) => {
    await page.goto('/tools/income-and-planning/retirement-contribution/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'retc-current-age', '30');
    await fillSliderInput(page, 'retc-retirement-age', '65');

    const result = await getResultText(page);
    // Should show a dollar amount with /month
    expect(result).toMatch(/\$[\d,]+/);
  });
});

test.describe('Retirement Age Calculator', () => {
  test('computes estimated retirement age', async ({ page }) => {
    await page.goto('/tools/income-and-planning/retirement-age/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'reta-current-age', '30');

    const result = await getResultText(page);
    // Should show "Age XX"
    expect(result).toMatch(/Age \d+/);
  });
});

test.describe('Emergency Fund Calculator', () => {
  test('shows recommended target', async ({ page }) => {
    await page.goto('/tools/income-and-planning/emergency-fund/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'ef-housing', '1500');

    const result = await getResultText(page);
    // Should show a dollar amount for the target
    expect(result).toMatch(/\$[\d,]+/);
  });
});

test.describe('Net Worth Calculator', () => {
  test('shows net worth with default items', async ({ page }) => {
    await page.goto('/tools/income-and-planning/net-worth/');
    await page.waitForLoadState('networkidle');
    // Net Worth has no SliderInputs (no range inputs), wait for the result to appear
    const resultEl = page.locator('.text-3xl.font-bold.tabular-nums').first();
    await expect(resultEl).toBeVisible({ timeout: 15000 });
    const result = (await resultEl.textContent()) ?? '';
    // Should show a dollar amount (positive or negative)
    expect(result).toMatch(/[\$£€-][\d,]+/);
  });
});

test.describe('Rent vs Buy Calculator', () => {
  test('shows verdict with default values', async ({ page }) => {
    await page.goto('/tools/debt-and-loans/rent-vs-buy/');
    // Rent vs Buy has 14+ SliderInputs — give extra time for hydration
    await page.waitForLoadState('networkidle');
    await page.locator('input#rvb-price').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(500);

    // Rent vs Buy has defaults pre-filled — just verify result renders
    const result = await getResultText(page);
    // Should show a verdict or dollar amount
    expect(result.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
//  ECONOMIC
// ════════════════════════════════════════════════════════════════

test.describe('Inflation Calculator', () => {
  test('shows future purchasing power', async ({ page }) => {
    await page.goto('/tools/economic/inflation/');
    await waitForCalcHydration(page);

    await fillSliderInput(page, 'inf-amount', '100000');

    const result = await getResultText(page);
    // Should show a dollar amount
    expect(result).toMatch(/\$[\d,]+/);
  });
});

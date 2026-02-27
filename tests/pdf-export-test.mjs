/**
 * Playwright test: verify PDF export works on all 14 financial calculators.
 * Checks that clicking "Export PDF" triggers a file download without errors.
 *
 * Run: npx playwright test tests/pdf-export-test.mjs --headed
 * Or:  node tests/pdf-export-test.mjs  (standalone)
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4399';

const CALCULATORS = [
  { name: 'Compound Interest', path: '/tools/saving-and-growth/compound-interest/' },
  { name: 'Investment Return', path: '/tools/saving-and-growth/investment-return/' },
  { name: 'ROI', path: '/tools/saving-and-growth/roi/' },
  { name: 'Savings Goal', path: '/tools/saving-and-growth/savings-goal/' },
  { name: 'Loan Amortization', path: '/tools/debt-and-loans/loan-amortization/' },
  { name: 'Mortgage Payment', path: '/tools/debt-and-loans/mortgage-payment/' },
  { name: 'Debt Payoff', path: '/tools/debt-and-loans/debt-payoff/' },
  { name: 'Rent vs Buy', path: '/tools/debt-and-loans/rent-vs-buy/' },
  { name: 'US Salary', path: '/tools/income-and-planning/salary-us/' },
  { name: 'UK Salary', path: '/tools/income-and-planning/salary-uk/' },
  { name: 'Retirement Savings', path: '/tools/income-and-planning/retirement-savings/' },
  { name: 'Net Worth', path: '/tools/income-and-planning/net-worth/' },
  { name: 'Emergency Fund', path: '/tools/income-and-planning/emergency-fund/' },
  { name: 'Inflation', path: '/tools/economic/inflation/' },
];

async function testCalculator(page, calc) {
  const url = `${BASE}${calc.path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for React hydration — the Export PDF button appears
  const btn = page.locator('button:has-text("Export PDF")');
  await btn.waitFor({ state: 'visible', timeout: 15000 });

  // Collect console errors during export
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Click and wait for download simultaneously
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    btn.click(),
  ]);

  const filename = download.suggestedFilename();
  const failure = await download.failure();

  if (failure) {
    return { name: calc.name, ok: false, error: `Download failed: ${failure}` };
  }

  if (!filename.endsWith('.pdf')) {
    return { name: calc.name, ok: false, error: `Expected .pdf, got: ${filename}` };
  }

  // Check file size is reasonable (> 5KB)
  const path = await download.path();
  const { statSync } = await import('fs');
  const size = statSync(path).size;

  if (size < 5000) {
    return { name: calc.name, ok: false, error: `PDF too small: ${size} bytes` };
  }

  const consoleErrors = errors.filter(
    (e) => !e.includes('width(-1)') && !e.includes('height(-1)'),
  );

  if (consoleErrors.length > 0) {
    return { name: calc.name, ok: false, error: `Console errors: ${consoleErrors.join('; ')}` };
  }

  return { name: calc.name, ok: true, filename, size };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const calc of CALCULATORS) {
    try {
      const result = await testCalculator(page, calc);
      results.push(result);
      if (result.ok) {
        passed++;
        console.log(`  ✓ ${result.name} — ${result.filename} (${(result.size / 1024).toFixed(1)} KB)`);
      } else {
        failed++;
        console.log(`  ✗ ${result.name} — ${result.error}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ ${calc.name} — ${err.message}`);
      results.push({ name: calc.name, ok: false, error: err.message });
    }
  }

  console.log(`\n${passed}/${CALCULATORS.length} passed, ${failed} failed`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main();

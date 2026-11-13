/**
 * Production-config E2E suite (review RC3): runs tests/prod/** against
 * scripts/serve-prod.mjs, which serves dist/ with Cloudflare's _headers, _redirects,
 * trailing-slash and 404 behaviour, and answers /api/* with the real worker.ts
 * (third-party calls mocked).
 *
 * Usage (build first, the suite does not build):
 *   npm run build
 *   npm run test:prod                                   # port 4390
 *   PORT=4401 npm run test:prod                         # Git Bash, your own port
 *   $env:PORT=4401; npm run test:prod                   # PowerShell
 *   npm run test:prod -- --project=chromium             # skip the Firefox project (CI)
 *   npm run test:prod -- tests/prod/headers.spec.ts     # one file
 *
 * The server is started by Playwright and never reused, so two agents can't test each
 * other's builds: if the port is taken, the run fails fast. Pick a free port instead.
 *
 * PROD_BASE_URL=https://www.calcrun.com runs only the read-only checks against a deployed
 * site (no server is started; every /api/ request is aborted, GA is always aborted).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || process.env.SERVE_PROD_PORT || 4390);
const EXTERNAL = process.env.PROD_BASE_URL?.replace(/\/$/, '');
const baseURL = EXTERNAL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/prod',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: Number(process.env.PROD_WORKERS || 1),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/prod' }]] : 'list',
  outputDir: 'test-results/prod',
  use: {
    baseURL,
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: EXTERNAL
    ? undefined
    : {
        command: `node scripts/serve-prod.mjs --worker --quiet --port ${PORT}`,
        url: `${baseURL}/__serve-prod/health`,
        reuseExistingServer: false,
        timeout: 60_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Belt and braces with the route-abort in tests/prod/fixtures.ts: GA/GTM hosts
        // resolve to nothing, as in the repo's playwright.config.ts.
        launchOptions: {
          args: [
            '--host-resolver-rules=MAP google-analytics.com ~NOTFOUND, MAP *.google-analytics.com ~NOTFOUND, ' +
              'MAP googletagmanager.com ~NOTFOUND, MAP *.googletagmanager.com ~NOTFOUND, ' +
              'MAP analytics.google.com ~NOTFOUND, MAP *.analytics.google.com ~NOTFOUND',
          ],
        },
      },
    },
    // Browser-sensitive CSP checks also run in Firefox (HEIC conversion under production CSP).
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /heic\.spec\.ts$/ },
  ],
});

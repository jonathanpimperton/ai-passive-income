import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // tests/prod/** needs the production emulator (serve-prod, real worker); it runs
  // only via `npm run test:prod` (playwright.prod.config.ts), never against the dev server.
  testIgnore: ['**/prod/**'],
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Analytics must never be reached from tests (plan 2.4): the pages carry the
    // production GA tag. Resolve the GA/GTM hosts to nothing in every context.
    launchOptions: {
      args: [
        '--host-resolver-rules=MAP google-analytics.com ~NOTFOUND, MAP *.google-analytics.com ~NOTFOUND, ' +
          'MAP googletagmanager.com ~NOTFOUND, MAP *.googletagmanager.com ~NOTFOUND, ' +
          'MAP analytics.google.com ~NOTFOUND, MAP *.analytics.google.com ~NOTFOUND',
      ],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

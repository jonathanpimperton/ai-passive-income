/**
 * PL-6 / PL-7 (S1-16, CALC-UX-B-07/10, EDGE-10/11): the email forms under production
 * config. API answers are mocked with page.route (status matrix) or come from the real
 * worker via serve-prod --worker (upstreams mocked). Turnstile is the fixture's fake.
 */
import { test, expect, LOCAL, TS_DUMMY_TOKEN, waitForIsland } from './fixtures';
import type { Page, Route } from '@playwright/test';

const TOOL_PAGE = '/tools/saving-and-growth/compound-interest/';
const TOGGLE = 'button[aria-controls^="email-results-panel-"]';
// Scope alerts to each form: the cookie banner also uses role=alert (HOME-CHROME, HO-7).
const resultsAlert = (page: Page) => page.locator('[id^="email-results-panel-"] [role="alert"]');
const newsletterAlert = (page: Page) => page.locator('astro-island:has(#email-capture-newsletter) [role="alert"]');

async function openResultsForm(page: Page) {
  await page.goto(TOOL_PAGE);
  await waitForIsland(page, TOGGLE);
  await page.locator(TOGGLE).click();
  const email = page.locator('input[id^="email-results-"]');
  await expect(email).toBeVisible();
  return email;
}

async function submitResults(page: Page, address = 'reader@example.org') {
  await page.locator('input[id^="email-results-"]').fill(address);
  await page.getByRole('button', { name: /^Send/ }).click();
}

function fulfil(status: number, body: string, contentType = 'application/json') {
  return (route: Route) => route.fulfill({ status, body, contentType });
}

test.describe('Email my results: consent and form state (PL-7)', () => {
  test('the marketing checkbox is unticked by default and clearly optional', async ({ page }) => {
    await openResultsForm(page);
    const box = page.getByRole('checkbox', { name: /optional: also email me occasional money tips/i });
    await expect(box).not.toBeChecked();
  });

  test('the collapsed form is inert: not in the tab order, hidden from AT', async ({ page }) => {
    await page.goto(TOOL_PAGE);
    await waitForIsland(page, TOGGLE);
    const panel = page.locator('[id^="email-results-panel-"]');
    await expect(panel).toHaveAttribute('inert', '');
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await page.locator(TOGGLE).focus();
    await page.keyboard.press('Tab');
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusedId.startsWith('email-results-')).toBe(false);
    await page.locator(TOGGLE).click();
    await expect(panel).not.toHaveAttribute('inert', '');
  });

  test('default request body: subscribe false, Turnstile token, no client tool name', async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route('**/api/email-results', (route) => {
      sent = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    await openResultsForm(page);
    await submitResults(page);
    await expect(page.getByText('Results sent!')).toBeVisible();
    expect(sent).not.toBeNull();
    expect(sent!.subscribe).toBe(false);
    expect(sent!.turnstileToken).toBe(TS_DUMMY_TOKEN);
    expect(sent!.toolSlug).toBe('compound-interest');
    expect('toolName' in sent!).toBe(false);
    expect(Array.isArray(sent!.results) && (sent!.results as unknown[]).length).toBeGreaterThan(0);
  });

  test('ticking the box sends subscribe true', async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route('**/api/email-results', (route) => {
      sent = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    await openResultsForm(page);
    await page.getByRole('checkbox', { name: /optional/i }).check();
    await submitResults(page);
    await expect(page.getByText('Results sent!')).toBeVisible();
    expect(sent!.subscribe).toBe(true);
  });

  test('a failed opt-in is reported honestly after a successful send', async ({ page }) => {
    await page.route('**/api/email-results', fulfil(200, '{"success":true,"subscribeFailed":true}'));
    await openResultsForm(page);
    await page.getByRole('checkbox', { name: /optional/i }).check();
    await submitResults(page);
    await expect(page.getByText('Results sent!')).toBeVisible();
    await expect(page.getByText(/couldn't add you to the tips list/)).toBeVisible();
  });

  test('Turnstile is rendered with a valid configuration (no size "invisible")', async ({ page }) => {
    await openResultsForm(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __tsRenders?: unknown[] }).__tsRenders?.length ?? 0)).toBe(1);
    const opts = await page.evaluate(() => (window as unknown as { __tsRenders: Record<string, unknown>[] }).__tsRenders[0]);
    expect(String(opts.sitekey)).toMatch(/^0x4/);
    expect(['normal', 'flexible', 'compact']).toContain(opts.size);
    expect(['always', 'execute', 'interaction-only']).toContain(opts.appearance);
    expect(opts.action).toBe('email-results');
    for (const cb of ['callback', 'error-callback', 'expired-callback', 'timeout-callback']) expect(opts[cb], cb).toBe('fn');
  });
});

test.describe('Email my results: Turnstile failures are visible and recoverable (B-10)', () => {
  test.describe('script blocked', () => {
    test.use({ turnstileMode: 'load-error' });
    test('a blocked Turnstile script shows a message and Retry; nothing is sent', async ({ page }) => {
      let posted = 0;
      await page.route('**/api/email-results', (route) => { posted++; return route.abort(); });
      await openResultsForm(page);
      await expect(resultsAlert(page)).toContainText("Couldn't load the spam check");
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
      await submitResults(page);
      await expect(resultsAlert(page)).toContainText(/spam check/);
      expect(posted).toBe(0);
    });
  });

  test.describe('challenge error', () => {
    test.use({ turnstileMode: 'error' });
    test('an error-callback shows a message; Retry recovers and the send succeeds', async ({ page }) => {
      await page.route('**/api/email-results', fulfil(200, '{"success":true}'));
      await openResultsForm(page);
      await expect(resultsAlert(page)).toContainText('The spam check failed');
      await page.evaluate(() => { (window as unknown as { __tsMode: string }).__tsMode = 'pass'; });
      await page.getByRole('button', { name: 'Retry' }).click();
      await expect(resultsAlert(page)).toHaveCount(0);
      await submitResults(page);
      await expect(page.getByText('Results sent!')).toBeVisible();
    });
  });
});

test.describe('Email my results: API error matrix (PL-6)', () => {
  const CASES: Array<{ name: string; status: number; body: string; type?: string; expected: RegExp }> = [
    { name: '400 JSON', status: 400, body: '{"error":"Please enter a valid email address"}', expected: /Please enter a valid email address/ },
    { name: '403 JSON', status: 403, body: '{"error":"Verification failed. Please try again.","code":"verification_failed"}', expected: /Verification failed/ },
    { name: '413 HTML', status: 413, body: '<html><body>413 Request Entity Too Large</body></html>', type: 'text/html', expected: /too large/ },
    { name: '422 JSON', status: 422, body: '{"error":"We couldn\'t add that address. Please check it and try again."}', expected: /check it/ },
    { name: '429 plain text (Cloudflare 1015)', status: 429, body: 'error code: 1015', type: 'text/plain', expected: /Too many attempts/ },
    { name: '500 HTML', status: 500, body: '<!doctype html><title>500</title>', type: 'text/html', expected: /temporarily unavailable/ },
    { name: '502 JSON', status: 502, body: '{"error":"Failed to send email. Please try again."}', expected: /Failed to send email/ },
  ];
  for (const c of CASES) {
    test(c.name, async ({ page }) => {
      await page.route('**/api/email-results', fulfil(c.status, c.body, c.type));
      await openResultsForm(page);
      await submitResults(page);
      await expect(resultsAlert(page)).toContainText(c.expected);
      // The form stays usable for another attempt (spinner cleared, fresh token requested).
      await expect(page.getByRole('button', { name: /^Send/ })).toBeEnabled();
    });
  }

  test('a hung request times out after 15 s with a specific message', async ({ page }) => {
    test.setTimeout(45_000);
    await page.route('**/api/email-results', () => { /* never answer */ });
    await openResultsForm(page);
    await submitResults(page);
    await expect(resultsAlert(page)).toContainText('timed out', { timeout: 20_000 });
  });
});

test.describe('through the real worker (serve-prod --worker, upstreams mocked)', () => {
  test.skip(!LOCAL, 'never call the live API from tests');

  async function upstream(page: Page, query = '') {
    const res = await page.request.post(`/__serve-prod/upstream${query}`);
    return (await res.json()) as { calls: Array<{ url: string; body: Record<string, unknown> }> };
  }

  test('default send reaches MailerSend and does NOT enrol in MailerLite', async ({ page }) => {
    await upstream(page, '?reset=1&mailerlite=ok&mailersend=ok&siteverify=ok');
    await openResultsForm(page);
    await submitResults(page, 'reader@example.org');
    await expect(page.getByText('Results sent!')).toBeVisible();
    const { calls } = await upstream(page);
    const hosts = calls.map((c) => new URL(c.url).host);
    expect(hosts).toContain('challenges.cloudflare.com');
    expect(hosts).toContain('api.mailersend.com');
    expect(hosts).not.toContain('connect.mailerlite.com');
    const mail = calls.find((c) => c.url.includes('mailersend'))!.body;
    expect(mail.subject).toBe('Your Compound Interest Calculator Results - CalcRun');
  });

  test('an explicit opt-in enrols in MailerLite', async ({ page }) => {
    await upstream(page, '?reset=1');
    await openResultsForm(page);
    await page.getByRole('checkbox', { name: /optional/i }).check();
    await submitResults(page);
    await expect(page.getByText('Results sent!')).toBeVisible();
    const { calls } = await upstream(page);
    expect(calls.some((c) => c.url.includes('connect.mailerlite.com'))).toBe(true);
  });

  test('MailerSend failure surfaces as a visible error', async ({ page }) => {
    await upstream(page, '?reset=1&mailersend=500');
    try {
      await openResultsForm(page);
      await submitResults(page);
      await expect(resultsAlert(page)).toContainText('Failed to send email');
    } finally {
      await upstream(page, '?mailersend=ok');
    }
  });
});

test.describe('Newsletter signup (EmailCapture, homepage)', () => {
  const INPUT = '#email-capture-newsletter';

  async function openNewsletter(page: Page) {
    await page.goto('/');
    await waitForIsland(page, INPUT);
    await page.locator(INPUT).focus();
  }

  test('Turnstile loads on focus with the subscribe action; success shows confirmation', async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route('**/api/subscribe', (route) => {
      sent = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    await openNewsletter(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __tsRenders?: Array<{ action: string }> }).__tsRenders?.[0]?.action)).toBe('subscribe');
    await page.locator(INPUT).fill('reader@example.org');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await expect(page.getByText("You're signed up!")).toBeVisible();
    expect(sent!.turnstileToken).toBe(TS_DUMMY_TOKEN);
    expect(sent!.email).toBe('reader@example.org');
  });

  test("Cloudflare's plain-text 429 shows the rate-limit message", async ({ page }) => {
    await page.route('**/api/subscribe', fulfil(429, 'error code: 1015', 'text/plain'));
    await openNewsletter(page);
    await page.locator(INPUT).fill('reader@example.org');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await expect(newsletterAlert(page)).toContainText('Too many attempts');
  });

  test('through the real worker: subscribe succeeds with a token', async ({ page }) => {
    test.skip(!LOCAL, 'never call the live API from tests');
    await page.request.post('/__serve-prod/upstream?reset=1&mailerlite=ok&siteverify=ok');
    await openNewsletter(page);
    await page.locator(INPUT).fill('reader@example.org');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await expect(page.getByText("You're signed up!")).toBeVisible();
    const { calls } = await (await page.request.get('/__serve-prod/upstream')).json();
    expect(calls.some((c: { url: string }) => c.url.includes('connect.mailerlite.com'))).toBe(true);
  });

  test('through the real worker: MailerLite 422 is shown as a failure, not success (EDGE-10)', async ({ page }) => {
    test.skip(!LOCAL, 'never call the live API from tests');
    await page.request.post('/__serve-prod/upstream?reset=1&mailerlite=422');
    try {
      await openNewsletter(page);
      await page.locator(INPUT).fill('reader@example.org');
      await page.getByRole('button', { name: 'Subscribe' }).click();
      await expect(newsletterAlert(page)).toContainText("couldn't add that address");
    } finally {
      await page.request.post('/__serve-prod/upstream?mailerlite=ok');
    }
  });
});

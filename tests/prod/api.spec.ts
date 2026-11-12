/**
 * PL-4 / PL-5 / PL-6 at the HTTP level, through the real worker.ts served by
 * scripts/serve-prod.mjs --worker (third-party calls mocked). Never runs against live.
 */
import { test, expect, LOCAL, TS_DUMMY_TOKEN } from './fixtures';

test.skip(!LOCAL, 'API tests only run against the local emulator');

test.describe('API gate through the real worker', () => {
  let origin = '';
  test.beforeEach(async ({ baseURL, request }) => {
    origin = new URL(baseURL!).origin;
    await request.post('/__serve-prod/upstream?reset=1&mailerlite=ok&mailersend=ok&siteverify=ok');
  });

  const json = (o: Record<string, string> = {}) => ({ 'Content-Type': 'application/json', ...o });

  test('text/plain is 415 (EDGE-01 no-preflight vector)', async ({ request }) => {
    const res = await request.post('/api/subscribe', { headers: { 'Content-Type': 'text/plain', Origin: origin }, data: '{"email":"x"}' });
    expect(res.status()).toBe(415);
  });

  test('a foreign Origin is 403 on both endpoints', async ({ request }) => {
    for (const path of ['/api/subscribe', '/api/email-results']) {
      const res = await request.post(path, { headers: json({ Origin: 'https://evil.example' }), data: { email: 'reader@example.org' } });
      expect(res.status(), path).toBe(403);
    }
  });

  test('missing token is 403 verification_required; dummy token passes', async ({ request }) => {
    const r1 = await request.post('/api/subscribe', { headers: json({ Origin: origin }), data: { email: 'reader@example.org', honeypot: '' } });
    expect(r1.status()).toBe(403);
    expect((await r1.json()).code).toBe('verification_required');
    const r2 = await request.post('/api/subscribe', {
      headers: json({ Origin: origin }),
      data: { email: 'reader@example.org', honeypot: '', turnstileToken: TS_DUMMY_TOKEN },
    });
    expect(r2.status()).toBe(200);
  });

  test('a wrong token is 403 verification_failed', async ({ request }) => {
    const res = await request.post('/api/subscribe', {
      headers: json({ Origin: origin }),
      data: { email: 'reader@example.org', honeypot: '', turnstileToken: 'not-a-real-token' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('verification_failed');
  });

  test('email-results drops attacker rows; nothing from them reaches the email', async ({ request }) => {
    const res = await request.post('/api/email-results', {
      headers: json({ Origin: origin }),
      data: {
        email: 'reader@example.org',
        toolSlug: 'compound-interest',
        inputs: [{ label: 'Visit', value: 'https://evil.example/login' }],
        results: [
          { label: 'Account notice', value: 'Verify at https://evil.example', highlight: true },
          { label: 'Final Balance', value: '$20,000' },
        ],
        subscribe: false,
        honeypot: '',
        turnstileToken: TS_DUMMY_TOKEN,
      },
    });
    expect(res.status()).toBe(200);
    const { calls } = await (await request.get('/__serve-prod/upstream')).json();
    const mail = calls.find((c: { url: string }) => c.url.includes('mailersend')).body;
    expect(mail.html).not.toContain('evil');
    expect(mail.html).not.toContain('Account notice');
    expect(mail.html).toContain('Final Balance');
    expect(calls.some((c: { url: string }) => c.url.includes('mailerlite'))).toBe(false);
  });

  test('GET is a JSON 405; unknown API path is a JSON 404 even for OPTIONS', async ({ request }) => {
    const r1 = await request.get('/api/subscribe');
    expect(r1.status()).toBe(405);
    expect(r1.headers().allow).toBe('POST, OPTIONS');
    expect((await r1.json()).error).toBe('Method not allowed');
    const r2 = await request.fetch('/api/plat-qa-nope', { method: 'OPTIONS', headers: { Origin: origin } });
    expect(r2.status()).toBe(404);
  });
});

/**
 * Unit tests for worker.ts (API gate, Turnstile, MailerLite/MailerSend handling, routing).
 * Every third-party call is answered by a mocked global fetch; nothing leaves the machine.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../../worker';

const ORIGIN = 'https://www.calcrun.com';
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

interface UpstreamConfig {
  siteverify: { status?: number; body?: Record<string, unknown>; throws?: boolean };
  mailerlite: { status: number };
  mailersend: { status: number };
}

let upstream: UpstreamConfig;
let calls: Array<{ url: string; body: any }>;
let assetsFetch: ReturnType<typeof vi.fn>;

function env(extra: Record<string, unknown> = {}) {
  return {
    ASSETS: { fetch: assetsFetch },
    MAILERLITE_API_KEY: 'ml-test',
    MAILERSEND_API_KEY: 'ms-test',
    TURNSTILE_SECRET_KEY: 'ts-test',
    ...extra,
  } as any;
}

beforeEach(() => {
  upstream = {
    siteverify: { body: { success: true, hostname: 'www.calcrun.com', action: 'subscribe' } },
    mailerlite: { status: 201 },
    mailersend: { status: 202 },
  };
  calls = [];
  assetsFetch = vi.fn(async () => new Response('asset', { status: 200 }));
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, body });
    if (url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')) {
      if (upstream.siteverify.throws) throw new TypeError('network down');
      return new Response(JSON.stringify(upstream.siteverify.body ?? {}), { status: upstream.siteverify.status ?? 200 });
    }
    if (url === 'https://connect.mailerlite.com/api/subscribers') {
      return new Response('{}', { status: upstream.mailerlite.status });
    }
    if (url === 'https://api.mailersend.com/v1/email') {
      return new Response('', { status: upstream.mailersend.status });
    }
    throw new Error(`unexpected outbound fetch in test: ${url}`);
  }));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers };
  for (const [k, v] of Object.entries(h)) if (v === '') delete h[k];
  return new Request(`https://www.calcrun.com${path}`, {
    method: 'POST',
    headers: h,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function call(req: Request, e = env()) {
  const res = await worker.fetch(req, e);
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = '__not_json__'; }
  return { res, data };
}

const subscribeBody = (extra: Record<string, unknown> = {}) => ({
  email: 'reader@example.org', honeypot: '', turnstileToken: TOKEN, ...extra,
});

const resultsBody = (extra: Record<string, unknown> = {}) => ({
  email: 'reader@example.org',
  toolSlug: 'compound-interest',
  inputs: [{ label: 'Starting Amount', value: '$10,000' }],
  results: [{ label: 'Final Balance', value: '$20,000', highlight: true }],
  honeypot: '',
  turnstileToken: TOKEN,
  ...extra,
});

const upstreamUrls = () => calls.map((c) => c.url);

describe('API responses', () => {
  it('every API error body is JSON with no-store, nosniff and a deny-all CSP', async () => {
    const { res, data } = await call(post('/api/subscribe', 'not json'));
    expect(res.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid JSON' });
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
  });

  it('GET on an API route is a JSON 405 with Allow', async () => {
    const { res, data } = await call(new Request('https://www.calcrun.com/api/subscribe'));
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
    expect(data.error).toBe('Method not allowed');
  });

  it('unknown /api paths are a JSON 404 for any method, including OPTIONS', async () => {
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const { res, data } = await call(new Request('https://www.calcrun.com/api/unknown', { method, headers: { Origin: ORIGIN } }));
      expect(res.status).toBe(404);
      expect(data).toEqual({ error: 'Not found' });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
  });

  it('non-API paths go to the static assets binding', async () => {
    const { res } = await call(new Request('https://www.calcrun.com/missing-page/'));
    expect(res.status).toBe(200);
    expect(assetsFetch).toHaveBeenCalledTimes(1);
  });
});

describe('CORS', () => {
  it('preflight from the production origin reflects it', async () => {
    const { res } = await call(new Request('https://www.calcrun.com/api/subscribe', { method: 'OPTIONS', headers: { Origin: ORIGIN } }));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(res.headers.get('Vary')).toBe('Origin');
  });
  it('apex origin is allowed too', async () => {
    const { res } = await call(new Request('https://www.calcrun.com/api/subscribe', { method: 'OPTIONS', headers: { Origin: 'https://calcrun.com' } }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://calcrun.com');
  });
  it('localhost is NOT reflected in production', async () => {
    const { res } = await call(new Request('https://www.calcrun.com/api/subscribe', { method: 'OPTIONS', headers: { Origin: 'http://localhost:4321' } }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  it('localhost is reflected only when ALLOW_DEV_ORIGINS is set', async () => {
    const req = () => new Request('https://www.calcrun.com/api/subscribe', { method: 'OPTIONS', headers: { Origin: 'http://localhost:4321' } });
    const { res } = await call(req(), env({ ALLOW_DEV_ORIGINS: '1' }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4321');
  });
  it('look-alike origins are never reflected', async () => {
    for (const origin of ['https://evil.example', 'http://localhost.evil.example', 'https://www.calcrun.com.evil.example', 'null']) {
      const { res } = await call(new Request('https://www.calcrun.com/api/subscribe', { method: 'OPTIONS', headers: { Origin: origin } }), env({ ALLOW_DEV_ORIGINS: '1' }));
      expect(res.headers.get('Access-Control-Allow-Origin'), origin).toBeNull();
    }
  });
});

describe('POST /api/subscribe gate (EDGE-01)', () => {
  it('rejects text/plain with 415 before doing anything else', async () => {
    const { res, data } = await call(post('/api/subscribe', subscribeBody(), { 'Content-Type': 'text/plain' }));
    expect(res.status).toBe(415);
    expect(data.error).toBe('Unsupported content type');
    expect(calls).toHaveLength(0);
  });
  it('rejects a missing Content-Type and form posts with 415', async () => {
    for (const ct of ['', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
      const { res } = await call(post('/api/subscribe', subscribeBody(), { 'Content-Type': ct }));
      expect(res.status, ct).toBe(415);
    }
  });
  it('accepts application/json with a charset parameter', async () => {
    const { res } = await call(post('/api/subscribe', subscribeBody(), { 'Content-Type': 'application/json; charset=utf-8' }));
    expect(res.status).toBe(200);
  });
  it('rejects a missing or foreign Origin with 403', async () => {
    for (const origin of ['', 'https://evil.example', 'http://localhost:4321']) {
      const { res, data } = await call(post('/api/subscribe', subscribeBody(), { Origin: origin }));
      expect(res.status, origin).toBe(403);
      expect(data.error).toBe('Forbidden');
    }
    expect(calls).toHaveLength(0);
  });
  it('accepts localhost origins only with ALLOW_DEV_ORIGINS', async () => {
    upstream.siteverify.body = { success: true, hostname: 'localhost' };
    const { res } = await call(post('/api/subscribe', subscribeBody(), { Origin: 'http://127.0.0.1:4401' }), env({ ALLOW_DEV_ORIGINS: '1' }));
    expect(res.status).toBe(200);
  });
  it('rejects bodies over 20 KB by Content-Length and by streamed size', async () => {
    const big = JSON.stringify(subscribeBody({ pad: 'x'.repeat(25_000) }));
    const { res: r1 } = await call(post('/api/subscribe', big, { 'Content-Length': String(big.length) }));
    expect(r1.status).toBe(413);
    const stream = new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); },
    });
    const req = new Request('https://www.calcrun.com/api/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: stream, duplex: 'half',
    } as RequestInit);
    const { res: r2, data } = await call(req);
    expect(r2.status).toBe(413);
    expect(data.error).toBe('Request too large');
  });
  it('rejects invalid email addresses with 400', async () => {
    const { res, data } = await call(post('/api/subscribe', subscribeBody({ email: 'not-an-address' })));
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/valid email/);
  });
  it('honeypot submissions get a silent 200 and reach no third party', async () => {
    const { res } = await call(post('/api/subscribe', subscribeBody({ honeypot: 'https://spam' })));
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });
  it('refuses a missing token before validating fields (safe live probe with an invalid address)', async () => {
    const { res, data } = await call(post('/api/subscribe', { email: 'x@invalid' }));
    expect(res.status).toBe(403);
    expect(data.code).toBe('verification_required');
    const r2 = await call(post('/api/email-results', { email: 'x@invalid', toolSlug: 'nope', results: [] }));
    expect(r2.res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
  it('requires a Turnstile token', async () => {
    const { res, data } = await call(post('/api/subscribe', subscribeBody({ turnstileToken: '' })));
    expect(res.status).toBe(403);
    expect(data.code).toBe('verification_required');
    expect(upstreamUrls()).toEqual([]);
  });
  it('rejects a token siteverify does not accept', async () => {
    upstream.siteverify.body = { success: false, 'error-codes': ['invalid-input-response'] };
    const { res, data } = await call(post('/api/subscribe', subscribeBody()));
    expect(res.status).toBe(403);
    expect(data.code).toBe('verification_failed');
    expect(upstreamUrls()).not.toContain('https://connect.mailerlite.com/api/subscribers');
  });
  it('rejects a valid token issued on another hostname', async () => {
    upstream.siteverify.body = { success: true, hostname: 'evil.example' };
    const { res } = await call(post('/api/subscribe', subscribeBody()));
    expect(res.status).toBe(403);
  });
  it('rejects the test-key hostname (example.com) in production', async () => {
    upstream.siteverify.body = { success: true, hostname: 'example.com' };
    expect((await call(post('/api/subscribe', subscribeBody()))).res.status).toBe(403);
    expect((await call(post('/api/subscribe', subscribeBody(), { Origin: 'http://localhost:4401' }), env({ ALLOW_DEV_ORIGINS: '1' }))).res.status).toBe(200);
  });
  it('rejects a token minted for the other endpoint (action mismatch)', async () => {
    upstream.siteverify.body = { success: true, hostname: 'www.calcrun.com', action: 'email-results' };
    expect((await call(post('/api/subscribe', subscribeBody()))).res.status).toBe(403);
  });
  it('fails closed when siteverify is unreachable or errors', async () => {
    upstream.siteverify.throws = true;
    expect((await call(post('/api/subscribe', subscribeBody()))).res.status).toBe(403);
    upstream.siteverify = { status: 500, body: {} };
    expect((await call(post('/api/subscribe', subscribeBody()))).res.status).toBe(403);
  });
  it('rejects absurdly long tokens without calling siteverify', async () => {
    const { res } = await call(post('/api/subscribe', subscribeBody({ turnstileToken: 'x'.repeat(3000) })));
    expect(res.status).toBe(403);
    expect(upstreamUrls()).toEqual([]);
  });
  it('fails closed (503) when the Turnstile secret is not configured', async () => {
    const { res } = await call(post('/api/subscribe', subscribeBody()), env({ TURNSTILE_SECRET_KEY: '' }));
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });
  it('subscribes on success, passing the visitor IP to siteverify', async () => {
    const { res, data } = await call(post('/api/subscribe', subscribeBody({ toolSlug: 'salary-uk' }), { 'CF-Connecting-IP': '203.0.113.9' }));
    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const sv = calls.find((c) => c.url.includes('siteverify'))!;
    expect(sv.body).toMatchObject({ secret: 'ts-test', response: TOKEN, remoteip: '203.0.113.9' });
    const ml = calls.find((c) => c.url.includes('mailerlite'))!;
    expect(ml.body).toEqual({
      email: 'reader@example.org',
      groups: ['180838346043426395'],
      fields: { signup_source: 'newsletter', calculator_slug: 'salary-uk' },
    });
  });
  it('treats MailerLite 200 (existing subscriber) as success', async () => {
    upstream.mailerlite.status = 200;
    expect((await call(post('/api/subscribe', subscribeBody()))).res.status).toBe(200);
  });
  it('MailerLite 422 is a failure with a user message (EDGE-10)', async () => {
    upstream.mailerlite.status = 422;
    const { res, data } = await call(post('/api/subscribe', subscribeBody()));
    expect(res.status).toBe(400);
    expect(data.code).toBe('email_rejected');
    expect(data.error).toMatch(/check it/);
  });
  it('other MailerLite failures are a 502', async () => {
    upstream.mailerlite.status = 500;
    const { res, data } = await call(post('/api/subscribe', subscribeBody()));
    expect(res.status).toBe(502);
    expect(data.error).toMatch(/Subscription failed/);
  });
});

describe('POST /api/email-results (EDGE-02, S1-16)', () => {
  beforeEach(() => {
    upstream.siteverify.body = { success: true, hostname: 'www.calcrun.com', action: 'email-results' };
  });
  const sentEmail = () => calls.find((c) => c.url === 'https://api.mailersend.com/v1/email')?.body;

  it('a request without a token is refused with 403 and sends nothing', async () => {
    const { res } = await call(post('/api/email-results', resultsBody({ turnstileToken: undefined })));
    expect(res.status).toBe(403);
    expect(sentEmail()).toBeUndefined();
  });
  it('applies the same content-type and origin gate', async () => {
    expect((await call(post('/api/email-results', resultsBody(), { 'Content-Type': 'text/plain' }))).res.status).toBe(415);
    expect((await call(post('/api/email-results', resultsBody(), { Origin: 'https://evil.example' }))).res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
  it('fails closed without the MailerSend key or the Turnstile secret', async () => {
    expect((await call(post('/api/email-results', resultsBody()), env({ MAILERSEND_API_KEY: '' }))).res.status).toBe(503);
    expect((await call(post('/api/email-results', resultsBody()), env({ TURNSTILE_SECRET_KEY: '' }))).res.status).toBe(503);
  });
  it('sends the email using the registry name and never the client toolName', async () => {
    const { res, data } = await call(post('/api/email-results', resultsBody({ toolName: 'Account notice from your bank' })));
    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    const email = sentEmail();
    expect(email.subject).toBe('Your Compound Interest Calculator Results - CalcRun');
    expect(email.to).toEqual([{ email: 'reader@example.org' }]);
    expect(email.from).toEqual({ email: 'hello@calcrun.com', name: 'CalcRun' });
    expect(email.html).not.toContain('Account notice');
    expect(email.html).toContain('Final Balance');
    expect(email.html).toContain('$20,000');
  });
  it('unlisted labels and free-text values are not rendered', async () => {
    const { res, data } = await call(post('/api/email-results', resultsBody({
      inputs: [
        { label: 'Visit', value: 'https://evil.example/login' },
        { label: 'Starting Amount', value: 'Verify at https://evil.example' },
        { label: 'Monthly Contribution', value: '$200' },
      ],
      results: [
        { label: 'Account notice', value: 'Verify at https://evil.example', highlight: true },
        { label: 'Final Balance', value: '$20,000' },
      ],
    })));
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    const html: string = sentEmail().html;
    for (const s of ['evil', 'Verify', 'Account notice', 'Visit', 'login']) expect(html).not.toContain(s);
    expect(html).toContain('Monthly Contribution');
  });
  it('refuses when nothing renderable is left in the results', async () => {
    const { res, data } = await call(post('/api/email-results', resultsBody({
      results: [{ label: 'Account notice', value: 'Verify at https://evil.example', highlight: true }],
    })));
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing calculator results');
    expect(sentEmail()).toBeUndefined();
  });
  it('does NOT enrol in MailerLite by default or for non-boolean subscribe values', async () => {
    for (const subscribe of [undefined, false, 'true', 1, 'yes']) {
      calls = [];
      const { res } = await call(post('/api/email-results', resultsBody({ subscribe })));
      expect(res.status).toBe(200);
      expect(upstreamUrls(), String(subscribe)).not.toContain('https://connect.mailerlite.com/api/subscribers');
    }
  });
  it('enrols in MailerLite only on subscribe === true', async () => {
    const { res, data } = await call(post('/api/email-results', resultsBody({ subscribe: true })));
    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    const ml = calls.find((c) => c.url.includes('mailerlite'))!;
    expect(ml.body.fields).toEqual({ signup_source: 'results', calculator_slug: 'compound-interest' });
  });
  it('reports a failed opt-in honestly while still confirming the email', async () => {
    upstream.mailerlite.status = 422;
    const { res, data } = await call(post('/api/email-results', resultsBody({ subscribe: true })));
    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, subscribeFailed: true });
  });
  it('accepts Debt Payoff with 10 debts (32 inputs) and renumbers user-named debts', async () => {
    const inputs: Array<{ label: string; value: string }> = [];
    for (let i = 1; i <= 10; i++) {
      inputs.push({ label: `My card ${i} Balance`, value: '$1,000' });
      inputs.push({ label: `My card ${i} APR`, value: '19.99%' });
      inputs.push({ label: `My card ${i} Min Payment`, value: '$25' });
    }
    inputs.push({ label: 'Strategy', value: 'Avalanche (highest rate first)' });
    inputs.push({ label: 'Extra Monthly Payment', value: '$100' });
    const { res } = await call(post('/api/email-results', resultsBody({
      toolSlug: 'debt-payoff',
      inputs,
      results: [{ label: 'Debt-Free In', value: '3 years, 2 months', highlight: true }],
    })));
    expect(res.status).toBe(200);
    const html: string = sentEmail().html;
    expect(html).toContain('Debt 10 Balance');
    expect(html).not.toContain('My card');
  });
  it('rejects more than 64 input rows', async () => {
    const inputs = Array.from({ length: 65 }, () => ({ label: 'Starting Amount', value: '$1' }));
    const { res, data } = await call(post('/api/email-results', resultsBody({ inputs })));
    expect(res.status).toBe(400);
    expect(data.error).toBe('Too many input fields');
  });
  it('rejects unknown and prototype tool slugs', async () => {
    for (const toolSlug of ['nope', '__proto__', 'constructor', '']) {
      const { res, data } = await call(post('/api/email-results', resultsBody({ toolSlug })));
      expect(res.status, toolSlug).toBe(400);
      expect(data.error).toBe('Invalid calculator');
    }
  });
  it('rejects a token minted for the newsletter endpoint', async () => {
    upstream.siteverify.body = { success: true, hostname: 'www.calcrun.com', action: 'subscribe' };
    expect((await call(post('/api/email-results', resultsBody()))).res.status).toBe(403);
  });
  it('MailerSend failure is a 502 with a JSON message', async () => {
    upstream.mailersend.status = 500;
    const { res, data } = await call(post('/api/email-results', resultsBody()));
    expect(res.status).toBe(502);
    expect(data.error).toMatch(/Failed to send/);
  });
  it('escapes HTML in values that pass the filter', async () => {
    const { res } = await call(post('/api/email-results', resultsBody({
      toolSlug: 'capital-gains-tax',
      inputs: [{ label: 'Holding Period', value: 'Long-term (> 1 year)' }],
      results: [{ label: 'Capital Gains Tax', value: '$1,000', highlight: true }],
    })));
    expect(res.status).toBe(200);
    expect(sentEmail().html).toContain('Long-term (&gt; 1 year)');
  });
});

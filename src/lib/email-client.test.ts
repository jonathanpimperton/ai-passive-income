import { describe, it, expect } from 'vitest';
import { postJson, MESSAGES } from './email-client';

/** A fetch stub that answers with the given status, body and content type. */
function respond(status: number, body: string, contentType = 'application/json') {
  return (async () => new Response(body, { status, headers: { 'Content-Type': contentType } })) as unknown as typeof fetch;
}

describe('postJson (PL-6 client error semantics)', () => {
  it('200 with success:true is ok', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(200, '{"success":true}') });
    expect(r).toMatchObject({ ok: true, status: 200, message: '' });
  });
  it('200 without success:true is not ok', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(200, '{"queued":true}') });
    expect(r.ok).toBe(false);
  });
  it('JSON 400 shows the server message', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(400, '{"error":"Please enter a valid email address"}') });
    expect(r).toMatchObject({ ok: false, status: 400, message: 'Please enter a valid email address' });
  });
  it('JSON 403 verification failure shows the server message', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(403, '{"error":"Verification failed. Please try again.","code":"verification_failed"}') });
    expect(r.message).toBe('Verification failed. Please try again.');
    expect(r.data?.code).toBe('verification_failed');
  });
  it('JSON 422-style rejection keeps the server wording', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(400, '{"error":"We couldn\'t add that address. Please check it and try again.","code":"email_rejected"}') });
    expect(r.message).toMatch(/check it/);
  });
  it("Cloudflare's plain-text 429 gives the rate-limit message, not 'network error'", async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(429, 'error code: 1015', 'text/plain') });
    expect(r).toMatchObject({ ok: false, status: 429, message: MESSAGES.rateLimited });
  });
  it('HTML 413 gives the too-large message', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(413, '<html><body>413</body></html>', 'text/html') });
    expect(r.message).toBe(MESSAGES.tooLarge);
  });
  it('HTML 500/502/503 give the service-unavailable message', async () => {
    for (const status of [500, 502, 503]) {
      const r = await postJson('/api/x', {}, { fetchImpl: respond(status, '<!doctype html><title>Error</title>', 'text/html') });
      expect(r.message, String(status)).toBe(MESSAGES.unavailable);
    }
  });
  it('a JSON 5xx from the worker keeps its own message', async () => {
    const r = await postJson('/api/x', {}, { fetchImpl: respond(502, '{"error":"Failed to send email. Please try again."}') });
    expect(r.message).toBe('Failed to send email. Please try again.');
  });
  it('a network failure gives the network message', async () => {
    const fetchImpl = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    const r = await postJson('/api/x', {}, { fetchImpl });
    expect(r).toMatchObject({ ok: false, status: 0, message: MESSAGES.network });
  });
  it('a hung request times out with the timeout message', async () => {
    const fetchImpl = ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as unknown as typeof fetch;
    const r = await postJson('/api/x', {}, { fetchImpl, timeoutMs: 30 });
    expect(r).toMatchObject({ ok: false, status: 0, message: MESSAGES.timeout });
  });
  it('sends JSON with the right method, header and body', async () => {
    let seen: RequestInit | undefined;
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      seen = init;
      return new Response('{"success":true}', { status: 200 });
    }) as unknown as typeof fetch;
    await postJson('/api/x', { a: 1 }, { fetchImpl });
    expect(seen?.method).toBe('POST');
    expect((seen?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(seen?.body).toBe('{"a":1}');
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });
});

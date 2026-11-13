/**
 * Client helpers for the two email endpoints (EmailCapture, EmailResultsButton).
 *
 *  - postJson(): POST JSON with a 15 s timeout (AbortController) and a specific, honest
 *    message for every failure shape: network error, timeout, Cloudflare's plain-text or
 *    HTML 413/429/5xx bodies, and the Worker's JSON errors.
 *  - useTurnstile(): loads Cloudflare Turnstile lazily (only when the visitor engages with
 *    a form), renders it with a valid configuration and surfaces load errors, expiry and
 *    timeouts as visible state instead of failing silently.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Cloudflare Turnstile site key (public by design). */
export const TURNSTILE_SITE_KEY = '0x4AAAAAACnZPz-6NCP1yfgb';
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const API_TIMEOUT_MS = 15_000;

export interface ApiResult {
  /** HTTP 2xx and a JSON body with success: true. */
  ok: boolean;
  /** HTTP status, or 0 for network failure / timeout. */
  status: number;
  /** Parsed JSON body when there was one. */
  data: Record<string, unknown> | null;
  /** User-facing message for failures ('' on success). */
  message: string;
}

export const MESSAGES = {
  network: 'Network error. Please check your connection and try again.',
  timeout: 'The request timed out. Please check your connection and try again.',
  rateLimited: 'Too many attempts. Please wait a minute and try again.',
  tooLarge: 'That request was too large to send.',
  unavailable: 'The email service is temporarily unavailable. Please try again in a few minutes.',
  generic: 'Something went wrong. Please try again.',
} as const;

function messageForStatus(status: number): string {
  if (status === 429) return MESSAGES.rateLimited;
  if (status === 413) return MESSAGES.tooLarge;
  if (status >= 500) return MESSAGES.unavailable;
  return `${MESSAGES.generic} (error ${status})`;
}

/**
 * POST `body` as JSON to a same-origin API route. Never throws.
 * `fetchImpl` and `timeoutMs` exist for tests.
 */
export async function postJson(
  url: string,
  body: unknown,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? API_TIMEOUT_MS);
  const doFetch = opts.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError');
    return { ok: false, status: 0, data: null, message: aborted ? MESSAGES.timeout : MESSAGES.network };
  }

  let data: Record<string, unknown> | null = null;
  try {
    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
  } catch {
    // Not JSON (for example Cloudflare's "error code: 1015" 429, or an HTML 5xx page),
    // or the body stream was aborted by the timeout. Fall through to a status message.
    if (controller.signal.aborted) {
      clearTimeout(timer);
      return { ok: false, status: 0, data: null, message: MESSAGES.timeout };
    }
    data = null;
  } finally {
    clearTimeout(timer);
  }

  if (response.ok && data && data.success === true) {
    return { ok: true, status: response.status, data, message: '' };
  }
  const serverMessage = data && typeof data.error === 'string' && data.error.trim() ? data.error : '';
  // Cloudflare's own 429/413/5xx pages are not JSON; prefer our wording for those.
  const message = serverMessage || messageForStatus(response.status);
  return { ok: false, status: response.status, data, message };
}

/* -- Turnstile --------------------------------------------------------------- */

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    gtag?: (...args: unknown[]) => void;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Load the Turnstile script once per page. Rejects on load error or after 15 s. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-calcrun-turnstile]');
    if (!script) {
      script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.dataset.calcrunTurnstile = '1';
      document.head.appendChild(script);
    }
    const started = Date.now();
    const poll = () => {
      if (window.turnstile) return resolve(window.turnstile);
      if (Date.now() - started > 15_000) return reject(new Error('turnstile-timeout'));
      setTimeout(poll, 100);
    };
    script.addEventListener('error', () => reject(new Error('turnstile-load-error')), { once: true });
    poll();
  }).catch((err) => {
    // Allow a later retry to inject a fresh script.
    scriptPromise = null;
    document.querySelector('script[data-calcrun-turnstile]')?.remove();
    throw err;
  });
  return scriptPromise;
}

export const TURNSTILE_MESSAGES = {
  loadFailed: "Couldn't load the spam check. If you use a content blocker, allow challenges.cloudflare.com, then press Retry.",
  failed: 'The spam check failed. Please press Retry.',
  expired: 'The spam check expired. It is refreshing; please try again in a moment.',
  slow: 'The spam check is taking too long. Please press Retry.',
} as const;

export type TurnstileStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Lazy Turnstile widget bound to a container element.
 *  - call start() when the visitor engages (focus, expand); it is idempotent;
 *  - call getToken() on submit: resolves with a fresh token, or rejects with a
 *    user-facing message (also exposed as `error`);
 *  - call reset() after every submission: tokens are single-use.
 * appearance 'interaction-only' keeps the widget invisible unless Cloudflare needs the
 * visitor to interact, in which case it appears inside the container.
 */
export function useTurnstile(action: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef('');
  const waitersRef = useRef<Array<{ resolve: (t: string) => void; reject: (e: Error) => void }>>([]);
  const [status, setStatus] = useState<TurnstileStatus>('idle');
  const [error, setError] = useState('');
  const startedRef = useRef(false);
  const errorRef = useRef('');
  /** True while Cloudflare shows an interactive challenge; the wait must not time out then. */
  const interactiveRef = useRef(false);

  const fail = useCallback((message: string) => {
    interactiveRef.current = false; // a failed widget shows no challenge; never keep waiting on it
    tokenRef.current = '';
    errorRef.current = message;
    setStatus('error');
    setError(message);
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const w of waiters) w.reject(new Error(message));
  }, []);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus('loading');
    setError('');
    loadTurnstile()
      .then((ts) => {
        const el = containerRef.current;
        if (!el) throw new Error('turnstile-no-container');
        const id = ts.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          size: 'flexible',
          appearance: 'interaction-only',
          retry: 'auto',
          'refresh-expired': 'auto',
          callback: (token: string) => {
            interactiveRef.current = false;
            tokenRef.current = token;
            errorRef.current = '';
            setStatus('ready');
            setError('');
            const waiters = waitersRef.current;
            waitersRef.current = [];
            for (const w of waiters) w.resolve(token);
          },
          'error-callback': () => {
            fail(TURNSTILE_MESSAGES.failed);
            // Returning true tells Turnstile the error was handled (no uncaught throw).
            return true;
          },
          'expired-callback': () => {
            tokenRef.current = '';
            setStatus('loading');
          },
          'before-interactive-callback': () => { interactiveRef.current = true; },
          'after-interactive-callback': () => { interactiveRef.current = false; },
          // Turnstile's own timeout for an unsolved interactive challenge.
          'timeout-callback': () => {
            interactiveRef.current = false;
            fail(TURNSTILE_MESSAGES.slow);
          },
          'unsupported-callback': () => fail(TURNSTILE_MESSAGES.loadFailed),
        });
        widgetIdRef.current = id ?? null;
      })
      .catch(() => {
        startedRef.current = false; // allow Retry to load again
        fail(TURNSTILE_MESSAGES.loadFailed);
      });
  }, [action, fail]);

  /**
   * Resolve with a token (waiting up to `timeoutMs`), or reject with a visible message.
   * While an interactive challenge is on screen the wait is extended; Turnstile's own
   * timeout-callback ends it if the visitor never solves the challenge.
   */
  const getToken = useCallback((timeoutMs = 12_000): Promise<string> => {
    if (tokenRef.current) return Promise.resolve(tokenRef.current);
    // A widget that already failed needs Retry; don't make the visitor wait for nothing.
    if (errorRef.current && startedRef.current) return Promise.reject(new Error(errorRef.current));
    if (!startedRef.current) start();
    return new Promise<string>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const arm = () => {
        timer = setTimeout(() => {
          if (interactiveRef.current) {
            arm();
            return;
          }
          waitersRef.current = waitersRef.current.filter((w) => w.resolve !== wrappedResolve);
          fail(TURNSTILE_MESSAGES.slow);
          reject(new Error(TURNSTILE_MESSAGES.slow));
        }, timeoutMs);
      };
      const wrappedResolve = (t: string) => { clearTimeout(timer); resolve(t); };
      const wrappedReject = (e: Error) => { clearTimeout(timer); reject(e); };
      arm();
      waitersRef.current.push({ resolve: wrappedResolve, reject: wrappedReject });
    });
  }, [fail, start]);

  /** Discard the current token and get a new one (after a submission or on Retry). */
  const reset = useCallback(() => {
    interactiveRef.current = false;
    tokenRef.current = '';
    errorRef.current = '';
    setError('');
    if (widgetIdRef.current !== null && window.turnstile) {
      setStatus('loading');
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        fail(TURNSTILE_MESSAGES.failed);
      }
    } else {
      startedRef.current = false;
      start();
    }
  }, [fail, start]);

  useEffect(() => () => {
    if (widgetIdRef.current !== null && window.turnstile) window.turnstile.remove(widgetIdRef.current);
    widgetIdRef.current = null;
  }, []);

  return { containerRef, status, error, start, getToken, reset };
}

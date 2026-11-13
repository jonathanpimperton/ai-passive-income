import React, { useState, useRef } from 'react';
import type { SubscribeBody } from '../../lib/email-types';
import { postJson, useTurnstile } from '../../lib/email-client';

/**
 * Email capture component with two variants:
 * - "tool" (default): for financial calculator pages - "Get financial tips"
 * - "newsletter": homepage newsletter signup
 *
 * Posts to /api/subscribe (Cloudflare Worker -> MailerLite). Bot protection: honeypot
 * field plus a Cloudflare Turnstile token. Turnstile loads only when the visitor first
 * focuses or hovers the form, so the page does not pay for it otherwise.
 */
interface EmailCaptureProps {
  toolSlug?: string;
  variant?: 'tool' | 'newsletter';
}

export default function EmailCapture({ toolSlug, variant = 'tool' }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstile = useTurnstile('subscribe');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');

    let turnstileToken: string;
    try {
      turnstileToken = await turnstile.getToken();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'The spam check failed. Please press Retry.');
      return;
    }

    const body: SubscribeBody = {
      email,
      toolSlug: toolSlug || undefined,
      honeypot: honeypotRef.current?.value || '',
      turnstileToken,
    };
    const result = await postJson('/api/subscribe', body);

    if (result.ok) {
      setStatus('success');
      if (window.gtag) window.gtag('event', 'email_capture_submit', { variant });
      return;
    }
    setStatus('error');
    setErrorMsg(result.message);
    // Tokens are single-use: fetch a fresh one for the next attempt.
    turnstile.reset();
  }

  function handleRetry() {
    setStatus('idle');
    setErrorMsg('');
    turnstile.reset();
  }

  const isNewsletter = variant === 'newsletter';

  if (status === 'success') {
    return (
      <div className="bg-primary-50 border border-primary-200/60 rounded-lg p-6 shadow-card text-center" role="status">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 text-white mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-semibold text-neutral-900">Thanks, check your inbox</p>
        <p className="text-sm text-neutral-500 mt-1">
          If we have sent you a confirmation email, click the link in it to start getting tips.
        </p>
      </div>
    );
  }

  const showTurnstileError = turnstile.status === 'error' && status !== 'loading';
  const message = status === 'error' && errorMsg ? errorMsg : showTurnstileError ? turnstile.error : '';
  const canRetry = turnstile.status === 'error' || (status === 'error' && /spam check|verification/i.test(errorMsg));

  return (
    <div className={isNewsletter
      ? "bg-white border border-primary-200/60 rounded-lg p-6 sm:p-8 shadow-card max-w-[600px] mx-auto"
      : "bg-primary-50 border border-primary-200/60 rounded-lg p-6 shadow-card"
    }>
      <div className="flex items-start gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-600 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-neutral-900">
            {isNewsletter
              ? 'Get smarter with your money'
              : 'Get financial tips'}
          </p>
          <p className="text-sm text-neutral-500 mt-0.5">
            {isNewsletter
              ? 'Tips, calculators, and insights — delivered weekly.'
              : 'Strategies and insights to help you make better financial decisions — no spam.'}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onFocus={turnstile.start}
        onPointerEnter={turnstile.start}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Honeypot: hidden from humans, traps bots */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden pointer-events-none"
        />
        <label htmlFor={`email-capture-${variant}`} className="sr-only">Email address</label>
        <input
          id={`email-capture-${variant}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          maxLength={254}
          autoComplete="email"
          disabled={status === 'loading'}
          className="flex-1 px-4 py-3 sm:py-2.5 text-base sm:text-sm border border-neutral-200/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-3 sm:py-2.5 text-base sm:text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-sm disabled:opacity-60 transition-all duration-200 whitespace-nowrap"
        >
          {status === 'loading' ? 'Subscribing...' : isNewsletter ? 'Subscribe' : 'Get tips'}
        </button>
      </form>

      {/* Turnstile renders here; it stays invisible unless Cloudflare needs an interaction. */}
      <div ref={turnstile.containerRef} className="mt-2" />

      {message && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <p className="text-sm text-red-600" role="alert">
            {message}
          </p>
          {canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2 transition-colors duration-150"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-neutral-500 mt-3">
        No spam. Unsubscribe anytime.{' '}
        <a href="/privacy/" className="underline hover:text-primary-600 transition-colors duration-200">
          Privacy policy
        </a>
      </p>
    </div>
  );
}

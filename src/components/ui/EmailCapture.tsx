import React, { useState, useRef } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Email capture component with two variants:
 * - "tool" (default): appears on financial calculator pages — "Get tips to grow your money"
 * - "newsletter": appears on homepage — general newsletter signup
 *
 * Posts to /api/subscribe → Cloudflare Pages Function → MailerLite API.
 * Includes honeypot field for bot protection.
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          toolSlug: toolSlug || undefined,
          honeypot: honeypotRef.current?.value || '',
        }),
      });

      let data: { success?: boolean; error?: string };
      try {
        data = await response.json();
      } catch {
        setStatus('error');
        setErrorMsg('Something went wrong. Please try again.');
        return;
      }

      if (response.ok && data.success) {
        setStatus('success');
        // Fire GA4 event
        if (window.gtag) {
          window.gtag('event', 'email_signup', {
            event_category: 'engagement',
            event_label: toolSlug || 'newsletter',
          });
        }
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection and try again.');
    }
  }

  const isNewsletter = variant === 'newsletter';

  if (status === 'success') {
    return (
      <div className="bg-accent-100 border border-accent-500/20 rounded-lg p-6 shadow-card text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500 text-white mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-semibold text-neutral-900">You're signed up!</p>
        <p className="text-sm text-neutral-500 mt-1">
          We'll send you tips and insights to help you make smarter financial decisions.
        </p>
      </div>
    );
  }

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
              : 'Get free financial tips'}
          </p>
          <p className="text-sm text-neutral-500 mt-0.5">
            {isNewsletter
              ? 'Free tips, calculators, and insights — delivered weekly.'
              : 'Strategies and insights to help you make better financial decisions — no spam.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        {/* Honeypot — hidden from humans, traps bots */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute opacity-0 h-0 w-0 overflow-hidden pointer-events-none"
          style={{ position: 'absolute', left: '-9999px' }}
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
          disabled={status === 'loading'}
          className="flex-1 px-4 py-3 sm:py-2.5 text-base sm:text-sm border border-neutral-200/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-3 sm:py-2.5 text-base sm:text-sm font-semibold text-white bg-accent-600 rounded-xl hover:bg-accent-500 shadow-md shadow-accent-600/20 disabled:opacity-60 transition-all duration-200 whitespace-nowrap"
        >
          {status === 'loading' ? 'Subscribing...' : isNewsletter ? 'Subscribe' : 'Get free tips'}
        </button>
      </form>

      {status === 'error' && (
        <p className="text-sm text-red-600 mt-2" role="alert">
          {errorMsg}
        </p>
      )}

      <p className="text-xs text-neutral-500 mt-3">
        No spam. Unsubscribe anytime.{' '}
        <a href="/privacy" className="underline hover:text-primary-600 transition-colors duration-200">
          Privacy policy
        </a>
      </p>
    </div>
  );
}

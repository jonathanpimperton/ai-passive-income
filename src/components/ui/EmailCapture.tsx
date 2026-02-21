import React, { useState } from 'react';

/**
 * Email capture component for financial calculator pages.
 * "Email me my results" — soft capture, never gates results.
 *
 * Per build-spec: Inline only (never modal/popup), appears after results.
 * Uses MailerLite's embeddable form endpoint — client-side POST.
 *
 * Not rendered on utility tools (QR code, password generator, JSON formatter).
 */
interface EmailCaptureProps {
  toolSlug: string;
  toolName: string;
}

export default function EmailCapture({ toolSlug: _toolSlug, toolName }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    // MailerLite integration will be configured when the account is set up.
    // For now, simulate success for the UI flow.
    try {
      // TODO: Replace with actual MailerLite form POST when form ID is configured
      // const response = await fetch(`https://assets.mailerlite.com/jsonp/...`, {
      //   method: 'POST',
      //   body: JSON.stringify({ email, fields: { calculator: toolSlug } }),
      // });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-accent-100 border border-accent-500/20 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500 text-white mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-semibold text-neutral-900">Check your inbox!</p>
        <p className="text-sm text-neutral-500 mt-1">
          We've sent your {toolName.toLowerCase()} results to {email}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 border border-primary-200/60 rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-500 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-neutral-900">Want a copy of your results?</p>
          <p className="text-sm text-neutral-500 mt-0.5">
            We'll email you a PDF with your full breakdown.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === 'loading'}
          aria-label="Email address"
          className="flex-1 px-4 py-2.5 text-sm border border-neutral-200/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-accent-600 rounded-xl hover:bg-accent-500 shadow-md shadow-accent-600/20 disabled:opacity-60 transition-all duration-200 whitespace-nowrap"
        >
          {status === 'loading' ? 'Sending...' : 'Send my results'}
        </button>
      </form>

      {status === 'error' && (
        <p className="text-sm text-red-600 mt-2">
          Something went wrong. Please try again.
        </p>
      )}

      <p className="text-xs text-neutral-500 mt-3">
        No spam. Unsubscribe anytime.{' '}
        <a href="/privacy" className="underline hover:text-primary-500 transition-colors duration-200">
          Privacy policy
        </a>
      </p>
    </div>
  );
}

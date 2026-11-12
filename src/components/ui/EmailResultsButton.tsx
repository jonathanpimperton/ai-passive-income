import { useState, useRef, useEffect } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import type { ResultItem, EmailResultsBody } from '../../lib/email-types';
import type { PdfInput } from '../../lib/pdf-export';
import { postJson, useTurnstile } from '../../lib/email-client';

interface EmailResultsButtonProps {
  toolSlug: string;
  /** Unused: the server derives the tool name from its own registry. Kept for call-site compatibility. */
  toolName?: string;
  getInputs: () => PdfInput[];
  getResults: () => ResultItem[];
}

/**
 * "Email my results": sends the current inputs and results to the visitor's own address.
 * The newsletter opt-in is a separate, UNTICKED checkbox (consent must be a positive act).
 * Turnstile loads only when the form is first opened.
 */
export default function EmailResultsButton({
  toolSlug,
  getInputs,
  getResults,
}: EmailResultsButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribe, setSubscribe] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [subscribeFailed, setSubscribeFailed] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const turnstile = useTurnstile('email-results');
  const startTurnstile = turnstile.start;

  // Defer the third-party Turnstile script until the visitor opens the form.
  useEffect(() => {
    if (expanded) startTurnstile();
  }, [expanded, startTurnstile]);

  // Focus the error message when it appears, for screen reader and keyboard users.
  useEffect(() => {
    if (status === 'error' && errorRef.current) errorRef.current.focus();
  }, [status, errorMsg]);

  function handleToggle() {
    if (!expanded) {
      setExpanded(true);
      setStatus('idle');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setExpanded(false);
    }
  }

  function handleRetry() {
    setStatus('idle');
    setErrorMsg('');
    turnstile.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

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

    const body: EmailResultsBody = {
      email: email.trim(),
      toolSlug,
      inputs: getInputs(),
      results: getResults(),
      subscribe,
      honeypot: honeypotRef.current?.value || '',
      turnstileToken,
    };
    const result = await postJson('/api/email-results', body);

    if (result.ok) {
      setSubscribeFailed(result.data?.subscribeFailed === true);
      setStatus('success');
      if (window.gtag) window.gtag('event', 'email_capture_submit', { variant: 'results' });
      return;
    }
    setStatus('error');
    setErrorMsg(result.message);
    // Tokens are single-use: fetch a fresh one for the next attempt.
    turnstile.reset();
  }

  if (status === 'success') {
    return (
      <div data-pdf-hide className="inline-flex flex-col items-start gap-1" role="status">
        <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-primary-700 bg-primary-50 border border-primary-200/60">
          <CheckCircle size={16} aria-hidden="true" />
          Results sent!
        </div>
        {subscribeFailed && (
          <p className="text-xs text-neutral-600 max-w-xs">
            We couldn't add you to the tips list this time. Your results email was still sent.
          </p>
        )}
      </div>
    );
  }

  const showTurnstileError = turnstile.status === 'error' && status !== 'loading';
  const message = status === 'error' && errorMsg ? errorMsg : showTurnstileError ? turnstile.error : '';
  const canRetry = turnstile.status === 'error' || (status === 'error' && /spam check|verification/i.test(errorMsg));

  return (
    // items-start keeps this button aligned with its siblings when the parent
    // flex row wraps on mobile (items-end staggered the wrapped rows)
    <div data-pdf-hide className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-primary-600 bg-primary-50 border border-primary-200/60 hover:bg-primary-100"
        aria-expanded={expanded}
        aria-controls={`email-results-panel-${toolSlug}`}
      >
        <Mail size={16} aria-hidden="true" />
        Email my results
      </button>

      <div
        id={`email-results-panel-${toolSlug}`}
        // Collapsed: not focusable, not clickable, hidden from assistive technology.
        inert={!expanded}
        aria-hidden={!expanded}
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-[28rem] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Honeypot: hidden from humans */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-center gap-2">
            <label htmlFor={`email-results-${toolSlug}`} className="sr-only">
              Your email address
            </label>
            <input
              ref={inputRef}
              id={`email-results-${toolSlug}`}
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="h-10 sm:h-9 px-3 text-base sm:text-sm rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-500
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                disabled:opacity-60 w-52"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              className="inline-flex items-center gap-1.5 h-10 sm:h-9 px-3 text-sm font-medium rounded-lg transition-all duration-200
                text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60"
            >
              {status === 'loading' ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={14} aria-hidden="true" />
              )}
              {status === 'loading' ? 'Sending...' : 'Send'}
            </button>
          </div>
          <label className="flex items-start gap-2 cursor-pointer max-w-xs">
            <input
              type="checkbox"
              name="subscribe"
              checked={subscribe}
              onChange={(e) => setSubscribe(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20"
            />
            <span className="text-xs text-neutral-600 leading-relaxed">
              Optional: also email me occasional money tips. Unsubscribe anytime.
            </span>
          </label>
          {/* Turnstile renders here; it stays invisible unless Cloudflare needs an interaction. */}
          <div ref={turnstile.containerRef} />
        </form>
        {message && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 max-w-xs">
            <p ref={errorRef} tabIndex={-1} role="alert" className="flex items-start gap-1 text-xs text-red-600 focus:outline-none">
              <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {message}
            </p>
            {canRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2 transition-colors duration-150"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

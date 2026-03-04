import { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ResultItem } from '../../lib/email-types';
import type { PdfInput } from '../../lib/pdf-export';

/**
 * Cloudflare Turnstile site key (public — safe to embed in client code).
 * Set to empty string to disable Turnstile on the client side (server
 * will also skip verification if TURNSTILE_SECRET_KEY is not set).
 */
const TURNSTILE_SITE_KEY = '0x4AAAAAABfYLWPO3BO0k8ji';

interface EmailResultsButtonProps {
  toolSlug: string;
  toolName: string;
  getInputs: () => PdfInput[];
  getResults: () => ResultItem[];
}

export default function EmailResultsButton({
  toolSlug,
  toolName,
  getInputs,
  getResults,
}: EmailResultsButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribe, setSubscribe] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const turnstileTokenRef = useRef<string>('');
  const turnstileWidgetRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Load Turnstile script once
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (document.querySelector('script[src*="turnstile"]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Render invisible Turnstile widget when expanded
  useEffect(() => {
    if (!expanded || !TURNSTILE_SITE_KEY || !turnstileWidgetRef.current) return;
    if (turnstileWidgetIdRef.current !== null) return;

    const tryRender = () => {
      const turnstile = (window as any).turnstile;
      if (!turnstile) {
        setTimeout(tryRender, 200);
        return;
      }
      turnstileWidgetIdRef.current = turnstile.render(turnstileWidgetRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (token: string) => {
          turnstileTokenRef.current = token;
        },
      });
    };
    tryRender();

    return () => {
      const turnstile = (window as any).turnstile;
      if (turnstile && turnstileWidgetIdRef.current !== null) {
        turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [expanded]);

  // Focus error message when it appears for screen reader users
  useEffect(() => {
    if (status === 'error' && errorRef.current) {
      errorRef.current.focus();
    }
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

  const getTurnstileToken = useCallback(async (): Promise<string> => {
    if (!TURNSTILE_SITE_KEY) return '';
    // If we already have a token, use it
    if (turnstileTokenRef.current) return turnstileTokenRef.current;
    // Otherwise trigger explicit execution
    const turnstile = (window as any).turnstile;
    if (turnstile && turnstileWidgetIdRef.current !== null) {
      turnstile.execute(turnstileWidgetIdRef.current);
      // Wait up to 5s for token
      for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 200));
        if (turnstileTokenRef.current) return turnstileTokenRef.current;
      }
    }
    return '';
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const turnstileToken = await getTurnstileToken();

      const response = await fetch('/api/email-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          toolSlug,
          toolName,
          inputs: getInputs(),
          results: getResults(),
          subscribe,
          honeypot: honeypotRef.current?.value || '',
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        if ((window as any).gtag) {
          (window as any).gtag('event', 'email_results', {
            event_category: 'engagement',
            event_label: toolSlug,
          });
        }
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to send. Please try again.');
        // Reset Turnstile for retry
        const turnstile = (window as any).turnstile;
        if (turnstile && turnstileWidgetIdRef.current !== null) {
          turnstile.reset(turnstileWidgetIdRef.current);
          turnstileTokenRef.current = '';
        }
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-accent-600 bg-accent-50 border border-accent-200/60"
        data-pdf-hide
      >
        <CheckCircle size={16} aria-hidden="true" />
        Results sent!
      </div>
    );
  }

  return (
    <div data-pdf-hide className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-primary-600 bg-primary-50 border border-primary-200/60 hover:bg-primary-100"
        aria-expanded={expanded}
        aria-label="Email my results"
      >
        <Mail size={16} aria-hidden="true" />
        Email my results
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Honeypot — hidden from humans */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            aria-hidden="true"
          />
          {/* Turnstile invisible widget container */}
          <div ref={turnstileWidgetRef} />
          <div className="flex items-center gap-2">
            <label htmlFor={`email-results-${toolSlug}`} className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id={`email-results-${toolSlug}`}
              type="email"
              required
              maxLength={254}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="h-10 sm:h-9 px-3 text-base sm:text-sm rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
                disabled:opacity-60 w-52"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              className="inline-flex items-center gap-1.5 h-10 sm:h-9 px-3 text-sm font-medium rounded-lg transition-all duration-200
                text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60"
              aria-label="Send results to email"
            >
              {status === 'loading' ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={14} aria-hidden="true" />
              )}
              Send
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={subscribe}
              onChange={(e) => setSubscribe(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500/20"
            />
            <span className="text-xs text-neutral-500">Also send me free financial tips</span>
          </label>
        </form>
        {status === 'error' && errorMsg && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="flex items-center gap-1 mt-1.5 text-xs text-red-600 focus:outline-none">
            <AlertCircle size={12} aria-hidden="true" />
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Scroll-triggered email capture bar.
 * Appears as a fixed bottom bar after user scrolls past 60% of the page.
 * Dismissible. Respects "already subscribed" state in localStorage.
 * Not a modal popup — subtle, non-intrusive.
 */
interface ScrollEmailBarProps {
  toolSlug?: string;
}

const LS_KEY = 'calcrun.email_bar_dismissed';

export default function ScrollEmailBar({ toolSlug }: ScrollEmailBarProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Don't show if already dismissed or subscribed
    if (localStorage.getItem(LS_KEY)) return;

    function onScroll() {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const scrollPercent = window.scrollY / scrollableHeight;
      if (scrollPercent > 0.6) {
        setVisible(true);
        window.removeEventListener('scroll', onScroll);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(LS_KEY, '1');
  }

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
        setErrorMsg('Something went wrong.');
        return;
      }

      if (response.ok && data.success) {
        setStatus('success');
        localStorage.setItem(LS_KEY, '1');
        if (window.gtag) {
          window.gtag('event', 'email_signup', {
            event_category: 'engagement',
            event_label: `scroll_bar_${toolSlug || 'page'}`,
          });
        }
        setTimeout(dismiss, 3000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-transform duration-300 animate-slide-up"
      role="complementary"
      aria-label="Email signup"
    >
      <div className="max-w-[800px] mx-auto px-4 py-3 flex items-center gap-3 sm:gap-4">
        {status === 'success' ? (
          <p className="text-sm font-medium text-primary-600 flex-1 text-center">
            You're in! Check your inbox.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-neutral-800 hidden sm:block shrink-0">
              Get financial tips in your inbox
            </p>
            <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
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
              <label htmlFor="scroll-email-bar" className="sr-only">Email address</label>
              <input
                id="scroll-email-bar"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                maxLength={254}
                disabled={status === 'loading'}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-neutral-200/80 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 transition-all duration-200"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors duration-200 whitespace-nowrap"
              >
                {status === 'loading' ? '...' : 'Subscribe'}
              </button>
            </form>
            {status === 'error' && errorMsg && (
              <p className="text-xs text-red-600 hidden sm:block shrink-0" role="alert">{errorMsg}</p>
            )}
          </>
        )}

        <button
          onClick={dismiss}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors duration-200 shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

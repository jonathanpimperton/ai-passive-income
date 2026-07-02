import { useState, useEffect } from 'react';

/**
 * Cookie consent banner for EU compliance, paired with Google Consent Mode v2.
 * GA loads with analytics_storage DENIED by default (set in BaseLayout <head>);
 * Accept upgrades consent via gtag('consent','update'), Decline leaves it denied.
 * Preference is stored in localStorage (not a cookie) and honored on later visits.
 *
 * Mobile: compact single-row bar (~56px). Desktop (sm+): card with icon + paragraph.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('calcrun-cookie-consent');
    if (consent === null) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('calcrun-cookie-consent', 'accepted');
    setVisible(false);
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
  }

  function decline() {
    localStorage.setItem('calcrun-cookie-consent', 'declined');
    setVisible(false);
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  }

  if (!visible) return null;

  return (
    // One slim single-line bar on every viewport — bottom-left on desktop so it
    // never covers the content column; full-width strip on mobile.
    <div
      className="fixed bottom-0 inset-x-0 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[420px] z-50 bg-white border-t sm:border border-neutral-200/80 sm:rounded-lg shadow-card-hover"
      role="alert"
      aria-label="Cookie consent"
    >
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <p className="text-sm text-neutral-600 flex-1 leading-snug">
          Analytics cookies only — no ads, no tracking.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-all duration-200"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all duration-200"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

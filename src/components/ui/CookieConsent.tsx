import { useState, useEffect } from 'react';

/**
 * Cookie consent banner for EU compliance.
 * Stores preference in localStorage (not a cookie).
 * If declined, Google Analytics is never loaded.
 *
 * Per build-spec: "Simple banner, lightweight, no heavy third-party scripts"
 *
 * Mobile: compact single-row bar (~56px). Desktop (sm+): card with icon + paragraph.
 */
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
    // Google Analytics would be loaded here when configured
  }

  function decline() {
    localStorage.setItem('calcrun-cookie-consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-[420px] z-50 bg-white border-t sm:border border-neutral-200/80 sm:rounded-lg shadow-card-hover"
      role="alert"
      aria-label="Cookie consent"
    >
      {/* Mobile: compact bar */}
      <div className="flex items-center gap-3 p-3 sm:hidden">
        <p className="text-sm text-neutral-600 flex-1">We use analytics cookies to improve the site.</p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-all duration-200"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all duration-200"
          >
            Accept
          </button>
        </div>
      </div>

      {/* Desktop (sm+): card layout with icon */}
      <div className="hidden sm:block p-5">
        <div className="flex items-start gap-3 mb-4">
          {/* Cookie icon */}
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 text-primary-600 shrink-0">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M11 17v.01" /><path d="M7 14v.01" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 mb-0.5">Cookie Preferences</p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              We use analytics cookies to improve the site. No advertising or tracking cookies.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={decline}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-all duration-200"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all duration-200"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

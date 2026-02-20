import { useState, useEffect } from 'react';

/**
 * Cookie consent banner for EU compliance.
 * Stores preference in localStorage (not a cookie).
 * If declined, Google Analytics is never loaded.
 *
 * Per build-spec: "Simple banner, lightweight, no heavy third-party scripts"
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('calcpath-cookie-consent');
    if (consent === null) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('calcpath-cookie-consent', 'accepted');
    setVisible(false);
    // Google Analytics would be loaded here when configured
  }

  function decline() {
    localStorage.setItem('calcpath-cookie-consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 shadow-card-hover p-4"
      role="alert"
      aria-label="Cookie consent"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-neutral-700 text-center sm:text-left">
          We use cookies for analytics to improve the site. No advertising or tracking cookies.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors duration-150"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors duration-150"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

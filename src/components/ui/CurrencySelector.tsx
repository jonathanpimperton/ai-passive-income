import { useCallback } from 'react';
import { CURRENCIES, setActiveCurrency, useActiveCurrency, type CurrencyCode } from '@lib/currency';

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function CurrencySelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <span className="text-xs font-medium text-neutral-500 mr-1">Display currency</span>
      <div className="inline-flex rounded-lg border border-neutral-200/80 bg-neutral-50 p-0.5">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onChange(c.code)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${
              value === c.code
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            aria-pressed={value === c.code}
          >
            {c.symbol} {c.code}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Display currency for a calculator with a currency selector.
 *
 * - Server render and hydration render: USD (matches the static HTML, so no
 *   hydration mismatch). Straight after hydration: the visitor's stored
 *   choice if valid, else their region default (UK=GBP, EEA=EUR, else USD).
 * - setCurrency(code) changes it for every island on the page and stores it
 *   as the visitor's explicit choice. Invalid codes are ignored.
 * - Storage failures never throw (safe-storage).
 *
 * Country-specific calculators should NOT use this hook -- they lock to their currency.
 */
export function useCurrency(): { currency: CurrencyCode; setCurrency: (code: string) => void } {
  const currency = useActiveCurrency();
  const setCurrency = useCallback((code: string) => setActiveCurrency(code), []);
  return { currency, setCurrency };
}

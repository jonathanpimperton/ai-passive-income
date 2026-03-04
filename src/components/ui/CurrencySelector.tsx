import { useState, useEffect } from 'react';
import { CURRENCIES, getSavedCurrency, saveCurrency } from '@lib/currency';

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
 * Hook for managing display currency state with localStorage persistence.
 * Country-specific calculators should NOT use this hook — they lock to their currency.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    setCurrency(getSavedCurrency());
  }, []);

  const handleChange = (code: string) => {
    setCurrency(code);
    saveCurrency(code);
  };

  return { currency, setCurrency: handleChange };
}

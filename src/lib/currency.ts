/**
 * Display currency configuration.
 * This only affects how numbers are formatted — it does NOT change
 * any calculation logic (no exchange rate conversion).
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
];

const STORAGE_KEY = 'calcrun.currency';

export function getSavedCurrency(): string {
  if (typeof window === 'undefined') return 'USD';
  return localStorage.getItem(STORAGE_KEY) || 'USD';
}

export function saveCurrency(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, code);
}

export function getCurrencyConfig(code: string): CurrencyConfig {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function formatCurrencyValue(value: number, code: string = 'USD'): string {
  const config = getCurrencyConfig(code);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

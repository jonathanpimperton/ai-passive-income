/**
 * Display currency configuration and the shared display-currency store.
 *
 * This only affects how numbers are formatted -- it does NOT change any
 * calculation logic (no exchange rate conversion).
 *
 * Resolution order for the display currency (plan decision D5):
 *   1. the visitor's stored choice (`calcrun.currency`), validated against
 *      the whitelist -- anything else is ignored;
 *   2. the default for the visitor's region (UK=GBP, EEA=EUR, else USD),
 *      detected client-side from the time zone and browser languages;
 *   3. USD.
 * Only an explicit choice is ever stored; the detected default is not.
 *
 * Storage goes through safe-storage, so blocked site data (SecurityError)
 * can never blank a calculator (review CALC-UX-A-06, CALC-UX-B-03, EDGE-03).
 *
 * The store is shared by every island on the page: the CurrencySelector hook
 * (`useCurrency`), ResultAffiliate, SliderInput's number convention and the
 * PDF date format all read the same value. The server render and the
 * hydration render always use USD (`useSyncExternalStore`'s server
 * snapshot); the stored or detected currency is applied straight after
 * hydration, so a returning GBP/EUR visitor no longer triggers React error
 * #418 (CALC-UX-A-13).
 */
import { useSyncExternalStore } from 'react';
import { safeGet, safeSet } from './safe-storage';
import { defaultCurrencyFor, detectRegion } from './region';

export type CurrencyCode = 'USD' | 'GBP' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
];

/** The only codes the site formats or stores. */
export const CURRENCY_CODES: readonly CurrencyCode[] = ['USD', 'GBP', 'EUR'];

export const CURRENCY_STORAGE_KEY = 'calcrun.currency';

/** Region a currency implies, for region-specific content such as affiliate partners. */
export type CurrencyRegion = 'US' | 'UK' | 'EU';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value);
}

export function currencyRegion(code: CurrencyCode): CurrencyRegion {
  if (code === 'GBP') return 'UK';
  if (code === 'EUR') return 'EU';
  return 'US';
}

/** The visitor's explicit, valid stored choice, or null (nothing stored, invalid value, or storage blocked). */
export function getStoredCurrency(): CurrencyCode | null {
  const stored = safeGet(CURRENCY_STORAGE_KEY);
  return isCurrencyCode(stored) ? stored : null;
}

/** Default currency for the visitor's detected region. USD during SSR. */
export function getRegionDefaultCurrency(): CurrencyCode {
  return defaultCurrencyFor(detectRegion());
}

/** Stored choice, else region default, else USD. Never throws. */
export function getPreferredCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';
  return getStoredCurrency() ?? getRegionDefaultCurrency();
}

/**
 * Kept for existing callers. Now validated, storage-safe and region-aware:
 * returns the stored choice, else the region default, else USD.
 */
export function getSavedCurrency(): CurrencyCode {
  return getPreferredCurrency();
}

/** Persist an explicit choice. Invalid codes are ignored. Returns false if storage is unavailable. */
export function saveCurrency(code: string): boolean {
  if (!isCurrencyCode(code)) return false;
  return safeSet(CURRENCY_STORAGE_KEY, code);
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

/* -- Shared display-currency store --------------------------- */

let activeCurrency: CurrencyCode | null = null;
const listeners = new Set<() => void>();

/**
 * Attribute on <html> that region-filtered static content (AffiliateLinks)
 * keys off. Values: 'US' | 'UK' | 'EU'. Set first by the AffiliateLinks
 * inline script, then kept current by setActiveCurrency().
 */
export const CURRENCY_REGION_ATTR = 'data-currency-region';

function reflectOnDocument(code: CurrencyCode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(CURRENCY_REGION_ATTR, currencyRegion(code));
}

/** Current display currency on the client (lazily resolved). USD on the server. */
export function getActiveCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';
  if (activeCurrency === null) activeCurrency = getPreferredCurrency();
  return activeCurrency;
}

/**
 * Change the display currency for every island on the page.
 * `persist` (default true) stores it as the visitor's explicit choice.
 * Invalid codes are ignored.
 */
export function setActiveCurrency(code: string, options: { persist?: boolean } = {}): void {
  if (!isCurrencyCode(code)) return;
  if (options.persist !== false) saveCurrency(code);
  reflectOnDocument(code);
  if (activeCurrency === code) return;
  activeCurrency = code;
  listeners.forEach((listener) => listener());
}

export function subscribeCurrency(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const usdSnapshot = (): CurrencyCode => 'USD';
const nullSnapshot = (): null => null;

/**
 * The page's display currency for rendering: 'USD' during SSR and the
 * hydration render (matches the static HTML), then the stored/detected one.
 */
export function useActiveCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribeCurrency, getActiveCurrency, usdSnapshot);
}

/**
 * Like useActiveCurrency, but null during SSR and the hydration render, so a
 * component can render nothing until the visitor's currency is known.
 */
export function useResolvedCurrency(): CurrencyCode | null {
  return useSyncExternalStore(subscribeCurrency, getActiveCurrency, nullSnapshot);
}

/** Test helper: forget the resolved currency so the next read re-resolves it. */
export function resetActiveCurrencyForTests(): void {
  activeCurrency = null;
  listeners.clear();
}

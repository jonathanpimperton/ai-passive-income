/**
 * Display-currency resolution: stored choice (validated) -> region default -> USD,
 * with storage that may throw. Runs in node with a stubbed window.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStoredCurrency,
  getPreferredCurrency,
  getSavedCurrency,
  saveCurrency,
  getActiveCurrency,
  setActiveCurrency,
  subscribeCurrency,
  isCurrencyCode,
  currencyRegion,
  formatCurrencyValue,
  getCurrencyConfig,
  resetActiveCurrencyForTests,
  CURRENCY_STORAGE_KEY,
} from './currency';

type Store = Record<string, string>;

function fakeStorage(store: Store, throws = false): Storage {
  const fail = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  return {
    getItem: (k: string) => (throws ? fail() : (store[k] ?? null)),
    setItem: (k: string, v: string) => (throws ? fail() : void (store[k] = v)),
    removeItem: (k: string) => (throws ? fail() : void delete store[k]),
    clear: () => {},
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

type StorageMode = 'ok' | 'calls-throw' | 'getter-throws';

function stubBrowser(opts: { store?: Store; storage?: StorageMode; timeZone?: string; languages?: string[] }) {
  const store = opts.store ?? {};
  const win: Record<string, unknown> = {};
  if (opts.storage === 'getter-throws') {
    Object.defineProperty(win, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  } else {
    win.localStorage = fakeStorage(store, opts.storage === 'calls-throw');
  }
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', { languages: opts.languages ?? ['en-US'], language: (opts.languages ?? ['en-US'])[0] });
  const tz = opts.timeZone ?? 'America/New_York';
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    () => ({ resolvedOptions: () => ({ timeZone: tz }) }) as unknown as Intl.DateTimeFormat,
  );
  return store;
}

beforeEach(() => resetActiveCurrencyForTests());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetActiveCurrencyForTests();
});

describe('whitelist', () => {
  it('accepts only USD, GBP, EUR', () => {
    expect(['USD', 'GBP', 'EUR'].every(isCurrencyCode)).toBe(true);
    for (const bad of ['garbage', '\u20AC', 'XYZ', 'usd', '', null, undefined, 5]) expect(isCurrencyCode(bad)).toBe(false);
  });
  it('maps currencies to regions', () => {
    expect(currencyRegion('USD')).toBe('US');
    expect(currencyRegion('GBP')).toBe('UK');
    expect(currencyRegion('EUR')).toBe('EU');
  });
  it('formats unknown codes as USD instead of throwing (was RangeError: Invalid currency code)', () => {
    expect(() => formatCurrencyValue(1863, 'garbage')).not.toThrow();
    expect(getCurrencyConfig('XYZ').code).toBe('USD');
  });
});

describe('resolution order', () => {
  it('server: USD', () => {
    expect(getPreferredCurrency()).toBe('USD');
    expect(getActiveCurrency()).toBe('USD');
  });

  it('stored valid choice wins over region', () => {
    stubBrowser({ store: { [CURRENCY_STORAGE_KEY]: 'EUR' }, timeZone: 'Europe/London' });
    expect(getPreferredCurrency()).toBe('EUR');
  });

  it.each(['garbage', '\u20AC', 'XYZ', 'gbp', ''])('invalid stored value %j is ignored', (bad) => {
    stubBrowser({ store: { [CURRENCY_STORAGE_KEY]: bad }, timeZone: 'Europe/London' });
    expect(getStoredCurrency()).toBeNull();
    expect(getPreferredCurrency()).toBe('GBP');
  });

  it.each([
    ['Europe/London', 'GBP'],
    ['Europe/Jersey', 'GBP'],
    ['Europe/Paris', 'EUR'],
    ['Europe/Berlin', 'EUR'],
    ['America/New_York', 'USD'],
    ['America/Los_Angeles', 'USD'],
    ['Asia/Tokyo', 'USD'],
    ['Australia/Sydney', 'USD'],
  ])('no stored value, time zone %s -> %s', (tz, expected) => {
    stubBrowser({ timeZone: tz });
    expect(getPreferredCurrency()).toBe(expected);
    expect(getSavedCurrency()).toBe(expected);
  });

  it('storage that throws (SecurityError) never throws here', () => {
    stubBrowser({ storage: 'calls-throw', timeZone: 'Europe/London' });
    expect(() => getPreferredCurrency()).not.toThrow();
    expect(getPreferredCurrency()).toBe('GBP');
    expect(saveCurrency('EUR')).toBe(false);
    expect(() => setActiveCurrency('EUR')).not.toThrow();
    expect(getActiveCurrency()).toBe('EUR');
  });

  it('a window.localStorage getter that throws is also safe', () => {
    stubBrowser({ storage: 'getter-throws', timeZone: 'America/Chicago' });
    expect(getPreferredCurrency()).toBe('USD');
  });
});

describe('shared store', () => {
  it('setActiveCurrency persists valid codes, notifies listeners and ignores invalid ones', () => {
    const store = stubBrowser({ timeZone: 'America/New_York' });
    const seen: string[] = [];
    const unsub = subscribeCurrency(() => seen.push(getActiveCurrency()));
    expect(getActiveCurrency()).toBe('USD');
    setActiveCurrency('GBP');
    expect(getActiveCurrency()).toBe('GBP');
    expect(store[CURRENCY_STORAGE_KEY]).toBe('GBP');
    setActiveCurrency('XYZ');
    expect(getActiveCurrency()).toBe('GBP');
    setActiveCurrency('GBP'); // no change, no notification
    setActiveCurrency('EUR', { persist: false });
    expect(store[CURRENCY_STORAGE_KEY]).toBe('GBP');
    unsub();
    setActiveCurrency('USD');
    expect(seen).toEqual(['GBP', 'EUR']);
  });

  it('only an explicit choice is stored, never the detected default', () => {
    const store = stubBrowser({ timeZone: 'Europe/London' });
    expect(getActiveCurrency()).toBe('GBP');
    expect(store[CURRENCY_STORAGE_KEY]).toBeUndefined();
  });
});

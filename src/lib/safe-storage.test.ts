import { describe, it, expect, afterEach } from 'vitest';
import {
  safeGet,
  safeSet,
  safeRemove,
  safeSessionGet,
  safeSessionSet,
  safeSessionRemove,
  SAFE_STORAGE_INLINE_JS,
} from './safe-storage';

/** Minimal Map-backed Storage. */
function memoryStorage(opts: { throwOnGet?: boolean; throwOnSet?: boolean; throwOnRemove?: boolean } = {}) {
  const m = new Map<string, string>();
  return {
    getItem(k: string) {
      if (opts.throwOnGet) throw new DOMException('blocked', 'SecurityError');
      return m.has(k) ? (m.get(k) as string) : null;
    },
    setItem(k: string, v: string) {
      if (opts.throwOnSet) throw new DOMException('full', 'QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem(k: string) {
      if (opts.throwOnRemove) throw new DOMException('blocked', 'SecurityError');
      m.delete(k);
    },
  };
}

/** A window whose storage property getters throw, like Chrome with site data blocked. */
function blockedWindow() {
  const w: Record<string, unknown> = {};
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(w, name, {
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  }
  return w;
}

const g = globalThis as unknown as { window?: unknown };
afterEach(() => {
  delete g.window;
});

describe('safe-storage (module helpers)', () => {
  it('returns null/false with no window (SSR)', () => {
    expect(safeGet('k')).toBeNull();
    expect(safeSet('k', 'v')).toBe(false);
    expect(safeRemove('k')).toBe(false);
    expect(safeSessionGet('k')).toBeNull();
    expect(safeSessionSet('k', 'v')).toBe(false);
    expect(safeSessionRemove('k')).toBe(false);
  });

  it('reads, writes and removes when storage works', () => {
    g.window = { localStorage: memoryStorage(), sessionStorage: memoryStorage() };
    expect(safeGet('calcrun.currency')).toBeNull();
    expect(safeSet('calcrun.currency', 'GBP')).toBe(true);
    expect(safeGet('calcrun.currency')).toBe('GBP');
    expect(safeRemove('calcrun.currency')).toBe(true);
    expect(safeGet('calcrun.currency')).toBeNull();

    expect(safeSessionSet('s', '1')).toBe(true);
    expect(safeSessionGet('s')).toBe('1');
    expect(safeGet('s')).toBeNull(); // areas are independent
    expect(safeSessionRemove('s')).toBe(true);
    expect(safeSessionGet('s')).toBeNull();
  });

  it('never throws when the storage property itself throws (blocked site data)', () => {
    g.window = blockedWindow();
    expect(() => safeGet('k')).not.toThrow();
    expect(safeGet('k')).toBeNull();
    expect(safeSet('k', 'v')).toBe(false);
    expect(safeRemove('k')).toBe(false);
    expect(safeSessionGet('k')).toBeNull();
    expect(safeSessionSet('k', 'v')).toBe(false);
    expect(safeSessionRemove('k')).toBe(false);
  });

  it('never throws when individual operations throw (quota, security)', () => {
    g.window = {
      localStorage: memoryStorage({ throwOnGet: true, throwOnSet: true, throwOnRemove: true }),
      sessionStorage: memoryStorage({ throwOnSet: true }),
    };
    expect(safeGet('k')).toBeNull();
    expect(safeSet('k', 'v')).toBe(false);
    expect(safeRemove('k')).toBe(false);
    expect(safeSessionSet('k', 'v')).toBe(false);
    expect(safeSessionGet('k')).toBeNull();
  });

  it('returns null when storage is absent (null property)', () => {
    g.window = { localStorage: null, sessionStorage: undefined };
    expect(safeGet('k')).toBeNull();
    expect(safeSet('k', 'v')).toBe(false);
    expect(safeSessionGet('k')).toBeNull();
  });
});

describe('SAFE_STORAGE_INLINE_JS (head-script twin)', () => {
  type Store = {
    get(k: string): string | null;
    set(k: string, v: string): boolean;
    remove(k: string): boolean;
    sget(k: string): string | null;
    sset(k: string, v: string): boolean;
    sremove(k: string): boolean;
  };
  // Evaluate exactly as a classic inline script would, with `window` supplied.
  const run = (win: Record<string, unknown>): Store =>
    new Function('window', `${SAFE_STORAGE_INLINE_JS}; return calcrunStore;`)(win) as Store;

  it('is small and ES5-only (no arrow functions, let/const or template literals)', () => {
    expect(SAFE_STORAGE_INLINE_JS.length).toBeLessThan(900);
    expect(SAFE_STORAGE_INLINE_JS).not.toMatch(/=>|\blet\b|\bconst\b|`/);
  });

  it('works when storage works and installs a single global', () => {
    const win: Record<string, unknown> = { localStorage: memoryStorage(), sessionStorage: memoryStorage() };
    const s = run(win);
    expect(win.calcrunStore).toBe(s);
    expect(s.set('a', '1')).toBe(true);
    expect(s.get('a')).toBe('1');
    expect(s.remove('a')).toBe(true);
    expect(s.get('a')).toBeNull();
    expect(s.sset('b', '2')).toBe(true);
    expect(s.sget('b')).toBe('2');
    expect(s.sremove('b')).toBe(true);
    // A second inline script reuses the same object.
    expect(run(win)).toBe(s);
    // A truthy non-store (e.g. a DOM element exposed by id) is replaced, not trusted.
    const win2: Record<string, unknown> = { calcrunStore: { tagName: 'DIV' }, localStorage: memoryStorage() };
    expect(typeof run(win2).get).toBe('function');
  });

  it('never throws when storage is blocked', () => {
    const s = run(blockedWindow());
    expect(s.get('a')).toBeNull();
    expect(s.set('a', '1')).toBe(false);
    expect(s.remove('a')).toBe(false);
    expect(s.sget('a')).toBeNull();
    expect(s.sset('a', '1')).toBe(false);
  });

  it('never throws when operations throw', () => {
    const s = run({ localStorage: memoryStorage({ throwOnGet: true, throwOnSet: true, throwOnRemove: true }) });
    expect(s.get('a')).toBeNull();
    expect(s.set('a', '1')).toBe(false);
    expect(s.remove('a')).toBe(false);
  });
});

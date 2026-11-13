import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { SAFE_STORAGE_INLINE_JS } from './safe-storage';
import { THEME_INLINE_JS } from './theme-boot';

/**
 * Runs the real pre-paint boot (storage helpers + theme script) in a sandbox
 * with a hand-made window, and reports what the page would end up with.
 */
function boot(opts: { blocked?: boolean; stored?: string; osDark?: boolean; matchMediaThrows?: boolean } = {}) {
  const attrs = new Map<string, string>();
  const classes = new Set<string>();
  const events: string[] = [];
  const mqListeners: Array<() => void> = [];
  let osDark = !!opts.osDark;
  const mq = {
    get matches() {
      return osDark;
    },
    addEventListener(_type: string, fn: () => void) {
      mqListeners.push(fn);
    },
  };

  const win: Record<string, unknown> = {
    matchMedia() {
      if (opts.matchMediaThrows) throw new Error('matchMedia unavailable');
      return mq;
    },
    Event: class {
      constructor(public type: string) {}
    },
    dispatchEvent(e: { type: string }) {
      events.push(e.type);
    },
    document: {
      documentElement: {
        classList: { add: (c: string) => classes.add(c) },
        setAttribute: (k: string, v: string) => attrs.set(k, v),
        getAttribute: (k: string) => attrs.get(k) ?? null,
      },
    },
  };
  win.window = win;
  if (opts.blocked) {
    // Chrome with site data blocked: even reading the property throws
    for (const n of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(win, n, {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    }
  } else {
    const m = new Map<string, string>();
    if (opts.stored !== undefined) m.set('calcrun.theme', opts.stored);
    win.localStorage = { getItem: (k: string) => (m.has(k) ? m.get(k) : null), setItem: () => {}, removeItem: () => {} };
  }
  // The head script reads `document` as a global
  win.document = (win as { document: unknown }).document;
  const ctx = vm.createContext(win);
  vm.runInContext(SAFE_STORAGE_INLINE_JS + THEME_INLINE_JS, ctx);
  return {
    theme: () => attrs.get('data-theme') ?? null,
    classes,
    events,
    setOsDark(v: boolean) {
      osDark = v;
      mqListeners.forEach((fn) => fn());
    },
  };
}

describe('theme boot script', () => {
  it('sets data-theme from the OS when storage throws (dark OS)', () => {
    const page = boot({ blocked: true, osDark: true });
    expect(page.theme()).toBe('dark');
    expect(page.classes.has('js')).toBe(true);
  });

  it('sets data-theme from the OS when storage throws (light OS)', () => {
    expect(boot({ blocked: true, osDark: false }).theme()).toBe('light');
  });

  it('does not throw and still sets a theme when storage AND matchMedia fail', () => {
    expect(boot({ blocked: true, matchMediaThrows: true }).theme()).toBe('light');
  });

  it('follows OS changes while storage is blocked and announces them', () => {
    const page = boot({ blocked: true, osDark: false });
    page.setOsDark(true);
    expect(page.theme()).toBe('dark');
    expect(page.events).toEqual(['calcrun:themechange']);
  });

  it('a stored choice wins over the OS and ignores OS changes', () => {
    const page = boot({ stored: 'light', osDark: true });
    expect(page.theme()).toBe('light');
    page.setOsDark(false);
    page.setOsDark(true);
    expect(page.theme()).toBe('light');
    expect(page.events).toEqual([]);
  });

  it('ignores a corrupt stored value', () => {
    expect(boot({ stored: 'purple', osDark: true }).theme()).toBe('dark');
  });
});

/**
 * Storage access that never throws.
 *
 * Why this exists: merely touching `window.localStorage` throws a
 * SecurityError when a browser blocks site data (Safari private mode in some
 * versions, Chrome "block third-party cookies" inside cross-site iframes such
 * as our embeds, enterprise policies). Six calculators rendered blank because
 * of an unguarded read (review CALC-UX-A-06). Every storage access on the
 * site goes through these helpers.
 *
 * Contract
 * - Getters return the stored string, or `null` on a missing key OR on any
 *   failure (no window, storage disabled, quota, SecurityError).
 * - Setters/removers return `true` on success and `false` on any failure.
 * - Nothing here ever throws. Callers treat storage as a convenience: the
 *   page must work identically when every call fails.
 */

type Area = 'localStorage' | 'sessionStorage';

function area(name: Area): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window[name] ?? null; // the property access itself can throw
  } catch {
    // Storage is blocked by the browser; callers fall back to defaults.
    return null;
  }
}

function get(name: Area, key: string): string | null {
  try {
    return area(name)?.getItem(key) ?? null;
  } catch {
    // getItem can throw SecurityError on some blocked-storage paths.
    return null;
  }
}

function set(name: Area, key: string, value: string): boolean {
  try {
    const s = area(name);
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    // QuotaExceededError or SecurityError: reported to the caller as false.
    return false;
  }
}

function remove(name: Area, key: string): boolean {
  try {
    const s = area(name);
    if (!s) return false;
    s.removeItem(key);
    return true;
  } catch {
    // SecurityError: reported to the caller as false.
    return false;
  }
}

/** localStorage.getItem that returns null instead of throwing. */
export const safeGet = (key: string): string | null => get('localStorage', key);
/** localStorage.setItem that returns false instead of throwing. */
export const safeSet = (key: string, value: string): boolean => set('localStorage', key, value);
/** localStorage.removeItem that returns false instead of throwing. */
export const safeRemove = (key: string): boolean => remove('localStorage', key);

/** sessionStorage.getItem that returns null instead of throwing. */
export const safeSessionGet = (key: string): string | null => get('sessionStorage', key);
/** sessionStorage.setItem that returns false instead of throwing. */
export const safeSessionSet = (key: string, value: string): boolean =>
  set('sessionStorage', key, value);
/** sessionStorage.removeItem that returns false instead of throwing. */
export const safeSessionRemove = (key: string): boolean => remove('sessionStorage', key);

/**
 * The same helpers as a tiny classic-script string for `is:inline` head
 * scripts (theme, intro, consent, region), which run before any module loads.
 *
 * Usage in an .astro file:
 *   <script is:inline set:html={SAFE_STORAGE_INLINE_JS + 'var t = calcrunStore.get("calcrun.theme");'} />
 *
 * It defines (once) a global `calcrunStore` with get/set/remove and
 * sget/sset/sremove for sessionStorage, with exactly the contract above.
 * Keep it ES5 and dependency-free: it runs before anything else on the page.
 */
export const SAFE_STORAGE_INLINE_JS =
  // typeof guard (not ||) so a DOM element with id="calcrunStore" is never taken as the store.
  'var calcrunStore=window.calcrunStore&&typeof window.calcrunStore.get==="function"?window.calcrunStore:(function(){' +
  'function a(n){try{return window[n]||null}catch(e){return null}}' +
  'function g(n,k){try{var s=a(n);return s?s.getItem(k):null}catch(e){return null}}' +
  'function p(n,k,v){try{var s=a(n);if(!s)return false;s.setItem(k,v);return true}catch(e){return false}}' +
  'function r(n,k){try{var s=a(n);if(!s)return false;s.removeItem(k);return true}catch(e){return false}}' +
  'var L="localStorage",S="sessionStorage";' +
  'return window.calcrunStore={' +
  'get:function(k){return g(L,k)},set:function(k,v){return p(L,k,v)},remove:function(k){return r(L,k)},' +
  'sget:function(k){return g(S,k)},sset:function(k,v){return p(S,k,v)},sremove:function(k){return r(S,k)}' +
  '}})();';

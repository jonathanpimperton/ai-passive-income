/**
 * Client state restoration: calculator inputs in the URL, and values the
 * visitor typed before an island hydrated.
 *
 * -- URL state (plan task CO-8; ships DISABLED) -----------------------------
 * Wave 3 wraps each calculator in `<UrlStateProvider enabled>` and binds its
 * inputs, so a Share link reproduces the exact result. Until then nothing is
 * enabled and every hook below behaves exactly like `useState`.
 *
 *   <UrlStateProvider enabled>            // default enabled={false}
 *     <SliderInput id="mort-price" ... /> // sliders sync by their `id` automatically
 *   </UrlStateProvider>
 *
 *   const [term, setTerm] = useUrlEnum('mort-term', 30, [10, 15, 20, 25, 30, 35]);
 *   const [pmi, setPmi]   = useUrlBool('mort-pmi', true);
 *   const [debts, setDebts] = useUrlJson('dp-debts', DEFAULT_DEBTS, parseDebts);
 *
 * Rules
 * - A value equal to the hook's initial default is removed from the URL, so
 *   untouched calculators keep clean URLs.
 * - Writes are batched and debounced (300 ms) through history.replaceState:
 *   no history entries, no navigation, no scroll.
 * - Reads happen once, straight after hydration. Missing, malformed or
 *   out-of-range values never throw: numbers are clamped to [min, max],
 *   anything unparseable is ignored (and removed from the URL).
 * - The server render and hydration render always use the default (static
 *   HTML cannot know the query string); the URL value is applied right after.
 * - Keys must be unique on the page. Wave 3 documents them in
 *   src/lib/url-keys.ts (append-only).
 * - getShareableUrl() returns origin + path + only the params owned by
 *   enabled hooks on this page (tracking params, `embed`, hashes dropped).
 *
 * -- Pre-hydration DOM values (plan task CO-2) ------------------------------
 * useHydrationReconcile(ref, apply) reads a form control's live DOM value
 * once, straight after hydration. If the visitor typed into it (or the
 * browser restored it on Back navigation) before React took over, the value
 * differs from what the server rendered and `apply` receives it, so the
 * result matches what is on screen (review CALC-UX-A-02, A11Y-PERF-01).
 * SliderInput does this itself; calculators use the hook for their own
 * selects, checkboxes and plain text inputs.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';

/* -- Pure codecs (unit-tested) ------------------------------- */

export interface NumberCodecOptions {
  min?: number;
  max?: number;
  /** Round to a whole number after decoding. */
  integer?: boolean;
}

/** Longest JSON payload accepted in one param (keeps share URLs sane). */
export const MAX_JSON_PARAM_LENGTH = 2000;

const PLAIN_NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** Compact, exponent-free string for a finite number, or null. */
export function encodeNumber(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) >= 1e21) return null; // String() would switch to exponent form
  if (Math.abs(value) < 1e-6 && value !== 0) return null; // ditto for tiny values
  return String(value);
}

/** Strictly parse a URL number (no exponents, no separators), clamp, optionally round. */
export function decodeNumber(raw: string | null | undefined, options: NumberCodecOptions = {}): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!PLAIN_NUMBER.test(s)) return null;
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (options.integer) n = Math.round(n);
  if (options.min != null && n < options.min) n = options.min;
  if (options.max != null && n > options.max) n = options.max;
  return n;
}

export function encodeEnum(value: string | number): string {
  return String(value);
}

/** The allowed value whose string form equals `raw`, or null. */
export function decodeEnum<T extends string | number>(raw: string | null | undefined, allowed: readonly T[]): T | null {
  if (raw == null) return null;
  const match = allowed.find((option) => String(option) === raw);
  return match === undefined ? null : match;
}

export function encodeBool(value: boolean): string {
  return value ? '1' : '0';
}

export function decodeBool(raw: string | null | undefined): boolean | null {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return null;
}

/** JSON for a param, or null when it can't be serialised or is too long. */
export function encodeJson(value: unknown): string | null {
  let json: string | undefined;
  try {
    json = JSON.stringify(value);
  } catch {
    return null; // cyclic or BigInt: reported as "cannot encode"
  }
  if (json === undefined || json.length > MAX_JSON_PARAM_LENGTH) return null;
  return json;
}

/**
 * Parse a JSON param and pass it through `validate`, which returns a clean
 * value or null. Malformed, oversized or invalid input gives null.
 */
export function decodeJson<T>(raw: string | null | undefined, validate: (value: unknown) => T | null): T | null {
  if (raw == null || raw.length > MAX_JSON_PARAM_LENGTH) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // malformed JSON: reported as "no valid value"
  }
  return validate(parsed);
}

/**
 * Apply param updates (value = set, null = delete) to a URL and return the
 * new path + query + hash (what history.replaceState expects).
 */
export function applyParamUpdates(href: string, updates: ReadonlyMap<string, string | null>): string {
  const url = new URL(href);
  updates.forEach((value, key) => {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}${url.hash}`;
}

/** origin + path + only `keys`' params from `href`. Hash and every other param dropped. */
export function shareableUrlFrom(href: string, keys: Iterable<string>): string {
  const url = new URL(href);
  const out = new URL(`${url.origin}${url.pathname}`);
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (value !== null) out.searchParams.set(key, value);
  }
  return out.toString();
}

/* -- URL writer (one per page) ------------------------------- */

export const URL_WRITE_DEBOUNCE_MS = 300;

const pendingWrites = new Map<string, string | null>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const activeKeys = new Map<string, number>();

function readParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

/** Write any pending URL updates now. */
export function flushUrlState(): void {
  if (writeTimer !== null) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (pendingWrites.size === 0 || typeof window === 'undefined') return;
  const next = applyParamUpdates(window.location.href, pendingWrites);
  pendingWrites.clear();
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(window.history.state, '', next);
}

function scheduleWrite(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  pendingWrites.set(key, value);
  if (writeTimer !== null) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushUrlState, URL_WRITE_DEBOUNCE_MS);
}

if (typeof window !== 'undefined') {
  // Don't lose the last change when the visitor leaves within the debounce window.
  window.addEventListener('pagehide', flushUrlState);
}

function registerKey(key: string): () => void {
  activeKeys.set(key, (activeKeys.get(key) ?? 0) + 1);
  return () => {
    const n = (activeKeys.get(key) ?? 1) - 1;
    if (n <= 0) activeKeys.delete(key);
    else activeKeys.set(key, n);
  };
}

/**
 * The URL to share for the current page: origin + path + the params owned by
 * enabled URL-state hooks. Identical to the bare page URL while URL state is
 * disabled.
 */
export function getShareableUrl(): string {
  if (typeof window === 'undefined') return '';
  flushUrlState();
  return shareableUrlFrom(window.location.href, activeKeys.keys());
}

/* -- Provider ------------------------------------------------ */

const UrlStateContext = createContext(false);

export interface UrlStateProviderProps {
  /** Default false: hooks inside behave exactly like useState and never touch the URL. */
  enabled?: boolean;
  children?: ReactNode;
}

export function UrlStateProvider({ enabled = false, children }: UrlStateProviderProps) {
  return createElement(UrlStateContext.Provider, { value: enabled }, children);
}

/** True inside an enabled UrlStateProvider. */
export function useUrlStateEnabled(): boolean {
  return useContext(UrlStateContext);
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* -- Hooks --------------------------------------------------- */

interface ParamCodec<T> {
  decode: (raw: string | null) => T | null;
  encode: (value: T) => string | null;
  equals: (a: T, b: T) => boolean;
}

function useUrlParam<T>(key: string, defaultValue: T, codec: ParamCodec<T>): [T, (next: SetStateAction<T>) => void] {
  const enabled = useUrlStateEnabled();
  const [value, setValue] = useState<T>(defaultValue);
  const defaultRef = useRef(defaultValue);
  const codecRef = useRef(codec);
  codecRef.current = codec;
  const readDone = useRef(false);

  // Read once after hydration (layout effect: before paint, before passive effects).
  useIsoLayoutEffect(() => {
    if (!enabled) return undefined;
    const unregister = registerKey(key);
    const raw = readParam(key);
    if (raw !== null) {
      const decoded = codecRef.current.decode(raw);
      if (decoded === null) scheduleWrite(key, null); // drop junk from the URL
      else setValue(decoded);
    }
    readDone.current = true;
    return unregister;
  }, [enabled, key]);

  // Write on change (skipping the mount pass, which only echoes the default).
  const firstWrite = useRef(true);
  useEffect(() => {
    if (!enabled || !readDone.current) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    const c = codecRef.current;
    scheduleWrite(key, c.equals(value, defaultRef.current) ? null : c.encode(value));
  }, [enabled, key, value]);

  return [value, setValue];
}

const sameValue = <T,>(a: T, b: T) => Object.is(a, b);

/** useState for a number, mirrored to `?key=` inside an enabled provider. Clamped to [min, max]. */
export function useUrlNumber(
  key: string,
  defaultValue: number,
  options: NumberCodecOptions = {},
): [number, (next: SetStateAction<number>) => void] {
  return useUrlParam(key, defaultValue, {
    decode: (raw) => decodeNumber(raw, options),
    encode: encodeNumber,
    equals: sameValue,
  });
}

/** useState for one of a fixed set of values, mirrored to `?key=`. Unknown values are ignored. */
export function useUrlEnum<T extends string | number>(
  key: string,
  defaultValue: T,
  allowed: readonly T[],
): [T, (next: SetStateAction<T>) => void] {
  return useUrlParam(key, defaultValue, {
    decode: (raw) => decodeEnum(raw, allowed),
    encode: encodeEnum,
    equals: sameValue,
  });
}

/** useState for a boolean, mirrored to `?key=1|0`. */
export function useUrlBool(key: string, defaultValue: boolean): [boolean, (next: SetStateAction<boolean>) => void] {
  return useUrlParam(key, defaultValue, { decode: decodeBool, encode: encodeBool, equals: sameValue });
}

/**
 * useState for structured data (e.g. a list of debts), mirrored to `?key=<json>`.
 * `validate` turns parsed JSON into a clean value or null (null = ignore the param).
 */
export function useUrlJson<T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => T | null,
): [T, (next: SetStateAction<T>) => void] {
  return useUrlParam(key, defaultValue, {
    decode: (raw) => decodeJson(raw, validate),
    encode: encodeJson,
    equals: (a, b) => a === b || encodeJson(a) === encodeJson(b),
  });
}

/**
 * Two-way sync for a value whose state lives elsewhere (SliderInput uses it
 * with its `id`). No-op outside an enabled provider or when `key` is falsy.
 * The value at mount is treated as the default (removed from the URL).
 */
export function useUrlNumberSync(
  key: string | false | null | undefined,
  value: number,
  apply: (next: number) => void,
  options: NumberCodecOptions = {},
): void {
  const enabled = useUrlStateEnabled() && !!key;
  const defaultRef = useRef(value);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const readDone = useRef(false);
  const firstWrite = useRef(true);

  useIsoLayoutEffect(() => {
    if (!enabled || !key) return undefined;
    const unregister = registerKey(key);
    const raw = readParam(key);
    if (raw !== null) {
      const decoded = decodeNumber(raw, optionsRef.current);
      if (decoded === null) scheduleWrite(key, null);
      else if (!Object.is(decoded, value)) applyRef.current(decoded);
    }
    readDone.current = true;
    return unregister;
    // Mount-only read by design; `value` is the default at that moment.
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !key || !readDone.current) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    scheduleWrite(key, Object.is(value, defaultRef.current) ? null : encodeNumber(value));
  }, [enabled, key, value]);
}

/* -- Pre-hydration DOM reconcile ----------------------------- */

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * The value the server rendered for a control, from its default state
 * (value attribute / selected option / defaultChecked).
 */
export function serverRenderedValue(el: FormControl): string {
  if (el instanceof HTMLSelectElement) {
    const def = Array.from(el.options).find((o) => o.defaultSelected) ?? el.options[0];
    return def ? def.value : '';
  }
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    return el.defaultChecked ? 'on' : 'off';
  }
  return el.defaultValue;
}

/** The control's live value in the same shape as serverRenderedValue(). */
export function liveValue(el: FormControl): string {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    return el.checked ? 'on' : 'off';
  }
  return el.value;
}

/**
 * Once, straight after hydration: if the control's live DOM value differs
 * from what the server rendered (typed before hydration, or restored by the
 * browser on Back), call `apply(liveValue)`. For checkboxes/radios the value
 * is 'on' or 'off'. Must be called in the component that renders the control.
 */
export function useHydrationReconcile<E extends FormControl>(ref: RefObject<E | null>, apply: (live: string) => void): void {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const live = liveValue(el);
    if (live !== serverRenderedValue(el)) applyRef.current(live);
    // Mount-only by design.
  }, []);
}

/** Stable callback that always calls the latest `fn` (for effects and timers). */
export function useLatestCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}

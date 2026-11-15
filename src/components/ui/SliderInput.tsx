/**
 * Shared slider + text input hybrid used across all calculator components.
 * Every numeric input gets both a text field and range slider, synced together.
 *
 * Text field
 * - Parsed with the shared parser (src/lib/parse-number.ts): "50,000",
 *   "£425,000", "$50k" and "1.2m" all work; "1e9" or "12,34" are refused with
 *   a clear message instead of being guessed (review CALC-UX-A-01/B-01).
 *   The number convention follows the currency: EUR uses "." for thousands
 *   and "," for decimals, and the field displays EUR values that way too.
 * - While typing, a cleanly parsed in-range value is applied after a short
 *   pause (300 ms), without reformatting the field (CALC-UX-A-11, B-18).
 * - On blur or Enter the value is parsed, clamped to [textMin, textMax] with a
 *   visible note ("Maximum is £1,000,000, so we used that"), and formatted.
 *   Unreadable input keeps the previous value and explains why. Escape
 *   abandons the edit. Messages are linked with aria-describedby.
 * - The field never shows a rounded figure while calculating with a
 *   different one: if `formatDisplay` would hide precision, a precise form
 *   (up to 6 decimals) is shown instead (CALC-UX-A-12).
 *
 * Hydration (CALC-UX-A-02, A11Y-PERF-01)
 * - Straight after hydration the live DOM values are read. Anything the
 *   visitor typed or dragged before React took over (or that the browser
 *   restored on Back navigation) is applied, so the result always belongs to
 *   the inputs on screen. A field that still has focus keeps its edit.
 *
 * Performance (A11Y-PERF-17)
 * - The range thumb is driven natively (uncontrolled) and the calculator
 *   update is a React transition, so dragging or arrow-keying never blocks
 *   the next frame on slow phones. The component is memoised.
 *
 * URL state (CO-8)
 * - Inside an enabled <UrlStateProvider>, the value syncs to `?<id>=` (or
 *   `?<urlKey>=`). Outside one (the default) nothing touches the URL.
 *
 * Non-linear scaling: when a slider has >250 discrete positions (e.g. $0-$10M
 * at $5K step), it switches to quadratic mapping. This gives the lower
 * portion of the range more track space -- where most users operate. The
 * text input is unaffected and always accepts exact values.
 */
import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { formatForInput, parseNumericInput, rangePickedSmallerReading, type ParseFailureReason } from '../../lib/parse-number';
import { getActiveCurrency, useActiveCurrency, type CurrencyCode } from '../../lib/currency';
import { currentPageSlug, fixedCurrencyFor } from '../../lib/affiliate-data';
import { useUrlNumberSync } from '../../lib/url-state';

interface SliderInputProps {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  formatDisplay?: (v: number) => string;
  /** Labels for slider min/max endpoints, e.g. "$0" / "$500K" */
  minLabel?: string;
  maxLabel?: string;
  /** Plain-English hint displayed below the label */
  hint?: string;
  /**
   * Hard bounds for the TEXT input, when wider than the slider range.
   * The slider covers the realistic range (good drag precision); typed
   * values are accepted up to these limits. Default: min/max.
   */
  textMin?: number;
  textMax?: number;
  /**
   * Number convention for typed text. Default: inferred from `prefix`
   * ($, £, or the euro sign), else the page's display currency, else USD.
   */
  currency?: CurrencyCode;
  /** Accept a leading minus sign. Default: true only when textMin/min is below 0. */
  allowNegative?: boolean;
  /**
   * URL param name inside an enabled <UrlStateProvider>. Default: `id`.
   * Pass false to keep this input out of the URL.
   */
  urlKey?: string | false;
}

/* -- Non-linear slider mapping -------------------------------- */

/** Virtual slider resolution -- higher = smoother drag on non-linear sliders */
const VIRT_MAX = 10000;

/** Convert a real value to virtual slider position (quadratic: sqrt mapping) */
export function valueToVirtual(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.round(Math.sqrt(normalized) * VIRT_MAX);
}

/** Convert a virtual slider position back to a real value, snapped to step */
export function virtualToValue(virt: number, min: number, max: number, step: number): number {
  const normalized = virt / VIRT_MAX;
  const raw = min + (max - min) * normalized * normalized; // quadratic
  return Math.min(max, Math.max(min, Math.round(raw / step) * step));
}

/** Non-linear when the range has more than 250 discrete steps. */
export function isNonLinear(min: number, max: number, step: number): boolean {
  if (max <= min || step <= 0) return false;
  return (max - min) / step > 250;
}

/* -- Pure text helpers (unit-tested) ------------------------- */

const LIVE_APPLY_MS = 300;
const RANGE_SETTLE_MS = 1500;
const QUOTE_MAX = 24;

/** Which separator convention typed text uses. */
export function resolveConvention(
  currency: CurrencyCode | undefined,
  prefix: string | undefined,
  pageCurrency: CurrencyCode,
): CurrencyCode {
  if (currency) return currency;
  if (prefix) {
    if (prefix.includes('\u20AC')) return 'EUR';
    if (prefix.includes('\u00A3')) return 'GBP';
    if (prefix.includes('$')) return 'USD';
  }
  return pageCurrency;
}

/**
 * Convention for text found in the box at hydration. The hydration render is USD
 * by design, so a "$" prefix or `currency="USD"` seen then only means "the
 * default"; only a pound or euro sign (or another explicit currency) is a real
 * choice. Otherwise the page's fixed country, then the visitor's currency.
 */
export function reconcileConvention(
  currency: CurrencyCode | undefined,
  prefix: string | undefined,
  fixed: CurrencyCode | null,
  active: CurrencyCode,
): CurrencyCode {
  if (currency && currency !== 'USD') return currency;
  if (!currency && prefix?.includes('£')) return 'GBP';
  if (!currency && prefix?.includes('€')) return 'EUR';
  return fixed ?? active;
}

/** True when the prefix is a money symbol (shapes the examples in messages). */
function isMoney(prefix: string | undefined): boolean {
  return !!prefix && /[$\u00A3\u20AC]/.test(prefix);
}

/** "1,234.5" -> "1.234,5" for EUR display. Only touches pure numeric strings. */
export function toEurSeparators(s: string): string {
  if (!/^[\s\d.,+-]+$/.test(s)) return s;
  return s.replace(/[.,]/g, (c) => (c === ',' ? '.' : ','));
}

/** Format any number without losing precision (up to 6 dp), grouped, in the convention's style. */
export function preciseNumber(value: number, convention: CurrencyCode): string {
  return new Intl.NumberFormat(convention === 'EUR' ? 'de-DE' : 'en-US', {
    maximumFractionDigits: 6,
  }).format(value);
}

/**
 * The text shown in the field when not editing: the caller's format, made
 * lossless and localised. If `formatted` would read back as a different
 * number (e.g. toFixed(1) turning 6.75 into "6.8"), a precise form is used.
 */
export function displayText(value: number, formatted: string, convention: CurrencyCode): string {
  const read = parseNumericInput(formatted, { currency: 'USD', allowNegative: true });
  const lossy = read.ok && Math.abs(read.value - value) > 1e-9 * Math.max(1, Math.abs(value));
  // Lossy, or an unreadable run of decimals (3.14159265358979): show a precise, tidy form.
  if (lossy || /[.,]\d{7,}/.test(formatted)) return preciseNumber(value, convention);
  return convention === 'EUR' ? toEurSeparators(formatted) : formatted;
}

/**
 * Raw editable text for a value on focus: the shared input formatter (no
 * grouping, no exponent, EUR decimal comma, always parses back to the same
 * number) applied after trimming binary float noise (0.30000000000000004).
 * A tab-through never re-parses this text, so the trim cannot change a value.
 */
export function editText(value: number, convention: CurrencyCode): string {
  if (!Number.isFinite(value)) return '';
  return formatForInput(Number(value.toPrecision(12)), convention);
}

function quote(text: string): string {
  const t = text.trim();
  return `"${t.length > QUOTE_MAX ? `${t.slice(0, QUOTE_MAX - 1)}...` : t}"`;
}

/** User-facing explanation for a parse failure ('' for empty input, which reverts silently). */
export function describeParseFailure(
  reason: ParseFailureReason,
  text: string,
  convention: CurrencyCode,
  money: boolean,
  candidates: readonly number[] = [],
  prefix = '',
): string {
  const eur = convention === 'EUR';
  // "Did you mean ...?" with the readings written so that typing them back works.
  const options = [...new Set(candidates)].map((c) => `${prefix}${preciseNumber(c, convention)}`);
  const didYouMean = options.length ? ` Did you mean ${options.join(' or ')}?` : '';
  switch (reason) {
    case 'empty':
      return '';
    case 'ambiguous':
      return eur
        ? `${quote(text)} could mean two different numbers.${didYouMean} Use a dot for thousands (50.000) and a comma for decimals (7,5).`
        : `${quote(text)} could mean two different numbers.${didYouMean} Use commas only for thousands (50,000) and a dot for decimals (7.5).`;
    case 'negative':
      return 'This value cannot be negative.';
    default:
      if (didYouMean) return `${quote(text)} is not a number we can read.${didYouMean}`;
      return money
        ? `${quote(text)} is not a number we can read. Try ${eur ? '50000, 50.000' : '50000, 50,000'} or 50k.`
        : `${quote(text)} is not a number we can read. Try something like ${eur ? '7,5' : '7.5'}.`;
  }
}

/** A bound formatted for a clamp note, e.g. "£1,000,000" or "30%". */
export function formatBound(bound: number, convention: CurrencyCode, prefix?: string, suffix?: string): string {
  const n = preciseNumber(bound, convention);
  if (!suffix) return `${prefix ?? ''}${n}`;
  return `${prefix ?? ''}${n}${suffix === '%' ? '%' : ` ${suffix}`}`;
}

export interface TextCommit {
  /** Value to apply, or null to keep the current one. */
  value: number | null;
  error: string | null;
  notice: string | null;
}

/** Decide what a finished edit means: a (clamped) value, an error, or nothing. */
export function commitText(
  text: string,
  opts: {
    convention: CurrencyCode;
    hardMin: number;
    hardMax: number;
    allowNegative: boolean;
    prefix?: string;
    suffix?: string;
  },
): TextCommit {
  // The field's bounds let the parser pick the only sensible reading
  // (EUR "6.125" in a 0-15% field is 6.125; "50,000" in a salary field is 50000).
  const r = parseNumericInput(text, {
    currency: opts.convention,
    allowNegative: opts.allowNegative,
    min: opts.hardMin,
    max: opts.hardMax,
  });
  if (!r.ok) {
    const money = isMoney(opts.prefix);
    const msg = describeParseFailure(r.reason, text, opts.convention, money, r.candidates, money ? opts.prefix : '');
    return { value: null, error: msg || null, notice: null };
  }
  if (r.value > opts.hardMax) {
    return {
      value: opts.hardMax,
      error: null,
      notice: `Maximum is ${formatBound(opts.hardMax, opts.convention, opts.prefix, opts.suffix)}, so we used that.`,
    };
  }
  if (r.value < opts.hardMin) {
    return {
      value: opts.hardMin,
      error: null,
      notice: `Minimum is ${formatBound(opts.hardMin, opts.convention, opts.prefix, opts.suffix)}, so we used that.`,
    };
  }
  // The range settled an ambiguous entry by picking the smaller reading ("50,000" in a field
  // that stops at 10,000): say which was used, as the clamp notes do.
  const picked = rangePickedSmallerReading(text, {
    currency: opts.convention,
    allowNegative: opts.allowNegative,
    min: opts.hardMin,
    max: opts.hardMax,
  });
  if (picked) {
    const unit = (v: number) => formatBound(v, opts.convention, opts.prefix, opts.suffix);
    const limit = picked.alternate > opts.hardMax ? `above the maximum of ${unit(opts.hardMax)}` : `below the minimum of ${unit(opts.hardMin)}`;
    return { value: r.value, error: null, notice: `Read as ${unit(picked.value)}, since ${unit(picked.alternate)} is ${limit}.` };
  }
  return { value: r.value, error: null, notice: null };
}

/** A clean, in-range value to apply while the visitor is still typing, else null. */
export function liveValue(
  text: string,
  opts: { convention: CurrencyCode; hardMin: number; hardMax: number; allowNegative: boolean },
): number | null {
  const r = parseNumericInput(text, {
    currency: opts.convention,
    allowNegative: opts.allowNegative,
    min: opts.hardMin,
    max: opts.hardMax,
  });
  if (!r.ok || r.value < opts.hardMin || r.value > opts.hardMax) return null;
  return r.value;
}

/** Live-parse options from the component's latest props. */
function liveOpts(L: { convention: CurrencyCode; hardMin: number; hardMax: number; negativeOk: boolean }) {
  return { convention: L.convention, hardMin: L.hardMin, hardMax: L.hardMax, allowNegative: L.negativeOk };
}

/* -- DOM helpers --------------------------------------------- */

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** The value a range input shows for its server-rendered attribute (min/max/step sanitised). */
function sanitizedDefault(el: HTMLInputElement): string {
  const probe = document.createElement('input');
  probe.type = 'range';
  probe.min = el.min;
  probe.max = el.max;
  probe.step = el.step;
  probe.setAttribute('value', el.defaultValue);
  return probe.value;
}

export function fillPercent(pos: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  // Two decimals: the CSS variable would otherwise carry float noise (33.33333333333333%).
  return Math.round(Math.max(0, Math.min(100, ((pos - lo) / (hi - lo)) * 100)) * 100) / 100;
}

const TRACK_BACKGROUND =
  'linear-gradient(to right, var(--color-primary-500) 0%, var(--color-primary-500) var(--slider-fill, 0%), var(--color-neutral-200) var(--slider-fill, 0%), var(--color-neutral-200) 100%)';

/* -- Component ----------------------------------------------- */

function SliderInput({
  label,
  id,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
  formatDisplay,
  minLabel,
  maxLabel,
  hint,
  textMin,
  textMax,
  currency,
  allowNegative,
  urlKey,
}: SliderInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pageCurrency = useActiveCurrency();
  // UK-only and US-only pages keep their own separators for unprefixed fields (the
  // two look the same in USD and GBP, so server and client markup agree).
  const convention = resolveConvention(currency, prefix, fixedCurrencyFor(currentPageSlug()) ?? pageCurrency);

  const hardMin = textMin ?? min;
  const hardMax = textMax ?? max;
  const negativeOk = allowNegative ?? hardMin < 0;

  const formatted = formatDisplay ? formatDisplay(value) : String(value);
  const displayValue = displayText(value, formatted, convention);
  const shown = isEditing ? editingValue : displayValue;

  const useNonLinear = useMemo(() => isNonLinear(min, max, step), [min, max, step]);
  const rangeMin = useNonLinear ? 0 : min;
  const rangeMax = useNonLinear ? VIRT_MAX : max;
  const rangeStep = useNonLinear ? 1 : step;
  const rangeValue = useNonLinear ? valueToVirtual(value, min, max) : value;

  /* Latest props for event handlers, timers and effects. */
  const onChangeRef = useRef(onChange);
  const latest = useRef({ value, rangeValue, convention, hardMin, hardMax, negativeOk, prefix, suffix });
  useIsoLayoutEffect(() => {
    onChangeRef.current = onChange;
    latest.current = { value, rangeValue, convention, hardMin, hardMax, negativeOk, prefix, suffix };
  });

  const textRef = useRef<HTMLInputElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const focusTextRef = useRef<string | null>(null);
  const focusValueRef = useRef(value);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escaping = useRef(false);

  const clearLiveTimer = () => {
    if (liveTimer.current !== null) {
      clearTimeout(liveTimer.current);
      liveTimer.current = null;
    }
  };
  useEffect(() => clearLiveTimer, []);

  /** Apply a finished edit (blur, Enter, or text found at hydration). */
  const finishEdit = useCallback((text: string, baseline: number) => {
    const L = latest.current;
    const result = commitText(text, {
      convention: L.convention,
      hardMin: L.hardMin,
      hardMax: L.hardMax,
      allowNegative: L.negativeOk,
      prefix: L.prefix,
      suffix: L.suffix,
    });
    setError(result.error);
    setNotice(result.notice);
    const next = result.value ?? baseline; // unreadable or empty: back to the value before the edit
    if (!Object.is(next, L.value)) onChangeRef.current(next);
  }, []);

  /* -- URL state (no-op unless inside an enabled provider) -- */
  const applyExternal = useCallback((v: number) => onChangeRef.current(v), []);
  useUrlNumberSync(urlKey === false ? null : (urlKey ?? id), value, applyExternal, { min: hardMin, max: hardMax });

  /* -- Hydration reconcile: runs once, before anything can re-render -- */
  useIsoLayoutEffect(() => {
    const textEl = textRef.current;
    const rangeEl = rangeRef.current;
    // The hydration render uses USD to match the static HTML. What was typed before it
    // belongs to the visitor's real currency (EUR "25.000" is twenty-five thousand).
    latest.current = {
      ...latest.current,
      convention: reconcileConvention(currency, prefix, fixedCurrencyFor(currentPageSlug()), getActiveCurrency()),
    };
    if (textEl) {
      const live = textEl.value;
      const typed = live !== textEl.defaultValue;
      if (document.activeElement === textEl) {
        // Still typing: keep their text and carry on as a normal edit.
        focusTextRef.current = textEl.defaultValue;
        focusValueRef.current = value;
        setIsEditing(true);
        setEditingValue(live);
        if (typed) {
          const v = liveValue(live, liveOpts(latest.current));
          if (v !== null && !Object.is(v, value)) onChangeRef.current(v);
        }
        return;
      }
      if (typed) {
        finishEdit(live, value);
        return;
      }
    }
    if (rangeEl && rangeEl.value !== sanitizedDefault(rangeEl)) {
      const pos = parseFloat(rangeEl.value);
      if (Number.isFinite(pos)) {
        const v = useNonLinear ? virtualToValue(pos, min, max, step) : Math.min(max, Math.max(min, pos));
        if (!Object.is(v, value)) onChangeRef.current(v);
      }
    }
    // Mount-only by design: reads what the browser had before hydration.
  }, []);

  /* -- Text field ------------------------------------------- */

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const text = editText(value, convention);
    // Write the raw edit text into the field now and select it, instead of
    // waiting for the re-render: a re-render that changes the value would
    // drop the selection, so typing (or a test's fill()) right after focus
    // would append to the old text instead of replacing it.
    const el = e.currentTarget;
    if (el.value !== text) el.value = text;
    el.select();
    focusTextRef.current = text;
    focusValueRef.current = value;
    setIsEditing(true);
    setEditingValue(text);
    setError(null);
    setNotice(null);
  };

  const handleBlur = () => {
    clearLiveTimer();
    setIsEditing(false);
    const baseline = focusValueRef.current;
    if (escaping.current) {
      escaping.current = false;
      setError(null);
      setNotice(null);
      if (!Object.is(latest.current.value, baseline)) onChangeRef.current(baseline);
      return;
    }
    if (editingValue === focusTextRef.current) {
      // Text back to what it was: undo anything applied live along the way.
      if (!Object.is(latest.current.value, baseline)) onChangeRef.current(baseline);
      return;
    }
    finishEdit(editingValue, baseline);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setEditingValue(text);
    if (!isEditing) {
      // Typing continued from before hydration without a focus event.
      setIsEditing(true);
    }
    clearLiveTimer();
    liveTimer.current = setTimeout(() => {
      liveTimer.current = null;
      const v = liveValue(text, liveOpts(latest.current));
      if (v === null) return; // incomplete or out of range: wait for blur
      setError(null);
      if (!Object.is(v, latest.current.value)) startTransition(() => onChangeRef.current(v));
    }, LIVE_APPLY_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape' && isEditing) {
      escaping.current = true;
      e.currentTarget.blur();
    }
  };

  /* -- Range (uncontrolled thumb, transition updates) ------- */

  const sentRef = useRef<number | null>(null); // last value sent from the range, not yet echoed back
  const lastRangeReal = useRef(value); // real value the thumb represents
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  const writeRange = useCallback((pos: number) => {
    const el = rangeRef.current;
    if (!el) return;
    const s = String(pos);
    if (el.value !== s) el.value = s;
    el.style.setProperty('--slider-fill', `${fillPercent(Number(el.value), Number(el.min), Number(el.max))}%`);
  }, []);

  // Follow the value prop (typing, reset, URL), but never pull the thumb back mid-drag.
  useIsoLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (sentRef.current !== null) {
      if (!Object.is(value, sentRef.current)) return; // older transition still landing
      sentRef.current = null;
    }
    lastRangeReal.current = value;
    writeRange(rangeValue);
  }, [value, rangeValue, rangeMin, rangeMax, writeRange]);

  useEffect(
    () => () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    },
    [],
  );

  const sendFromRange = (real: number) => {
    lastRangeReal.current = real;
    if (Object.is(real, latest.current.value) && sentRef.current === null) return; // nothing to change
    sentRef.current = real;
    startTransition(() => onChangeRef.current(real));
  };

  /** After an interaction ends, make sure the thumb matches the value the calculator kept. */
  const scheduleSettle = () => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      if (sentRef.current === null) return;
      sentRef.current = null;
      lastRangeReal.current = latest.current.value;
      writeRange(latest.current.rangeValue);
    }, RANGE_SETTLE_MS);
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const pos = parseFloat(el.value);
    if (!Number.isFinite(pos)) return;
    el.style.setProperty('--slider-fill', `${fillPercent(pos, Number(el.min), Number(el.max))}%`);
    sendFromRange(useNonLinear ? virtualToValue(pos, min, max, step) : pos);
  };

  /**
   * Keyboard support on non-linear sliders: the virtual quadratic mapping makes
   * native arrow-key steps round back to the same value (a no-op) and PageUp
   * jump wildly, so we handle keys against the REAL value instead.
   */
  const handleRangeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!useNonLinear) return;
    const base = lastRangeReal.current;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = base + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = base - step;
        break;
      case 'PageUp':
        next = base + step * 10;
        break;
      case 'PageDown':
        next = base - step * 10;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    const real = Math.min(max, Math.max(min, Math.round(next / step) * step));
    writeRange(valueToVirtual(real, min, max));
    sendFromRange(real);
  };

  // Static after mount so React never overwrites the imperatively managed fill.
  const trackStyle = useRef<CSSProperties>({
    background: TRACK_BACKGROUND,
    ['--slider-fill' as string]: `${fillPercent(rangeValue, rangeMin, rangeMax)}%`,
  } as CSSProperties).current;

  /* -- Accessible value text ------------------------------ */
  const ariaValueText = prefix
    ? `${prefix}${displayValue}`
    : suffix
      ? `${displayValue} ${suffix}`
      : displayValue;

  const hintId = `${id}-hint`;
  const messageId = `${id}-message`;
  const message = error ?? notice;
  const describedBy = [hint ? hintId : null, message ? messageId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-0.5">
        {label}
      </label>
      {hint && <p id={hintId} className="text-xs text-neutral-500 mb-1.5 leading-relaxed">{hint}</p>}
      {!hint && <div className="mb-1" />}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={textRef}
          id={id}
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`w-full h-11 rounded-lg border bg-white text-neutral-900 text-base
            focus:ring-2 focus:outline-none transition-all duration-150
            ${error ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20' : 'border-neutral-200 focus:border-primary-500 focus:ring-primary-500/20'}
            ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <input
        ref={rangeRef}
        type="range"
        min={rangeMin}
        max={rangeMax}
        step={rangeStep}
        defaultValue={rangeValue}
        onChange={handleRangeChange}
        onKeyDown={handleRangeKeyDown}
        onPointerUp={scheduleSettle}
        onKeyUp={scheduleSettle}
        onBlur={scheduleSettle}
        style={trackStyle}
        className="slider-track w-full h-1.5 mt-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-primary-600
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb:hover]:scale-125 [&::-webkit-slider-thumb:active]:scale-110
          [&::-webkit-slider-thumb:active]:bg-primary-700
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb:hover]:scale-125 [&::-moz-range-thumb:active]:scale-110
          [&::-moz-range-thumb:active]:bg-primary-700
          [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full"
        aria-label={`${label} slider`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.min(max, Math.max(min, value))}
        aria-valuetext={ariaValueText}
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-500 tabular-nums">{minLabel}</span>
          <span className="text-xs text-neutral-500 tabular-nums">{maxLabel}</span>
        </div>
      )}
      {/* Rendered only when there is something to say: an inserted role=alert /
          role=status is announced, and the page keeps a single live region
          (the headline result) until then (A11Y-PERF-03). */}
      {error && (
        <p id={messageId} role="alert" className="text-xs leading-relaxed mt-1 text-red-600">
          {error}
        </p>
      )}
      {!error && notice && (
        <p id={messageId} role="status" className="text-xs leading-relaxed mt-1 text-neutral-500">
          {notice}
        </p>
      )}
    </div>
  );
}

/**
 * Skip re-rendering when nothing visible changed. `formatDisplay` is often an
 * inline arrow, so it is compared by its output for the current value rather
 * than by identity; every other prop (including onChange) by identity.
 */
function propsEqual(prev: SliderInputProps, next: SliderInputProps): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof SliderInputProps>;
  for (const key of keys) {
    if (key === 'formatDisplay') continue;
    if (!Object.is(prev[key], next[key])) return false;
  }
  if (prev.formatDisplay === next.formatDisplay) return true;
  if (!prev.formatDisplay || !next.formatDisplay) return false;
  return prev.formatDisplay(prev.value) === next.formatDisplay(next.value);
}

export default memo(SliderInput, propsEqual);

export type { SliderInputProps };

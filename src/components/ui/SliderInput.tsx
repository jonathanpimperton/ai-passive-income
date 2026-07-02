/**
 * Shared slider + text input hybrid used across all calculator components.
 * Every numeric input gets both a text field and range slider, synced together.
 *
 * Key UX: During focus, users type freely (no formatting/clamping). On blur,
 * the value is parsed, validated, clamped to [min, max], and formatted.
 *
 * Non-linear scaling: When a slider has >1000 discrete positions (e.g. $0-$10M
 * at $5K step), it automatically switches to quadratic mapping. This gives the
 * lower portion of the range more track space — where most users operate.
 * The text input is unaffected and always accepts exact values.
 */
import { useState, useMemo } from 'react';

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
}

/* ── Non-linear slider mapping ──────────────────────────────── */

/** Virtual slider resolution — higher = smoother drag on non-linear sliders */
const VIRT_MAX = 10000;

/** Convert a real value to virtual slider position (quadratic: sqrt mapping) */
function valueToVirtual(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.round(Math.sqrt(normalized) * VIRT_MAX);
}

/** Convert a virtual slider position back to a real value, snapped to step */
function virtualToValue(virt: number, min: number, max: number, step: number): number {
  const normalized = virt / VIRT_MAX;
  const raw = min + (max - min) * normalized * normalized; // quadratic
  return Math.min(max, Math.max(min, Math.round(raw / step) * step));
}

export default function SliderInput({
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
}: SliderInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hardMin = textMin ?? min;
  const hardMax = textMax ?? max;

  const displayValue = formatDisplay ? formatDisplay(value) : String(value);

  /** Auto-detect: use non-linear when range has >250 discrete steps */
  const useNonLinear = useMemo(() => {
    if (max <= min || step <= 0) return false;
    return (max - min) / step > 250;
  }, [min, max, step]);

  const handleFocus = () => {
    setIsEditing(true);
    setEditingValue(String(value));
    setError(null);
    setNotice(null);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Strip currency symbols, commas, spaces — support pasted "£10,000" or "10 000"
    let cleaned = editingValue.replace(/[^0-9.,\-]/g, '');
    // If no dot present but has comma, treat comma as decimal (UK format: 7,5 → 7.5)
    if (!cleaned.includes('.') && cleaned.includes(',') && cleaned.indexOf(',') === cleaned.lastIndexOf(',')) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Otherwise strip commas (thousands separators)
      cleaned = cleaned.replace(/,/g, '');
    }
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      setError(null);
      if (parsed < hardMin) {
        setNotice(`Adjusted to the minimum of ${prefix ?? ''}${hardMin.toLocaleString()}${suffix ? ` ${suffix}` : ''}`);
      } else if (parsed > hardMax) {
        setNotice(`Adjusted to the maximum of ${prefix ?? ''}${hardMax.toLocaleString()}${suffix ? ` ${suffix}` : ''}`);
      } else {
        setNotice(null);
      }
      onChange(Math.min(hardMax, Math.max(hardMin, parsed)));
    } else if (editingValue.trim() !== '') {
      setError('Please enter a valid number');
    }
    // If empty, revert silently to current value
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const shown = isEditing ? editingValue : displayValue;

  /* ── Range input values (virtual or real) ──────────────── */
  const rangeMin = useNonLinear ? 0 : min;
  const rangeMax = useNonLinear ? VIRT_MAX : max;
  const rangeStep = useNonLinear ? 1 : step;
  const rangeValue = useNonLinear ? valueToVirtual(value, min, max) : value;

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (useNonLinear) {
      onChange(virtualToValue(raw, min, max, step));
    } else {
      onChange(raw);
    }
  };

  /**
   * Keyboard support on non-linear sliders: the virtual quadratic mapping makes
   * native arrow-key steps round back to the same value (a no-op) and PageUp
   * jump wildly, so we handle keys against the REAL value instead.
   */
  const handleRangeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!useNonLinear) return;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - step;
        break;
      case 'PageUp':
        next = value + step * 10;
        break;
      case 'PageDown':
        next = value - step * 10;
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
    onChange(Math.min(max, Math.max(min, Math.round(next / step) * step)));
  };

  /* ── Track fill gradient ──────────────────────────────── */
  const progressPct = useMemo(() => {
    if (rangeMax <= rangeMin) return 0;
    return ((rangeValue - rangeMin) / (rangeMax - rangeMin)) * 100;
  }, [rangeValue, rangeMin, rangeMax]);

  const trackStyle = useMemo(() => ({
    background: `linear-gradient(to right, var(--color-primary-500) 0%, var(--color-primary-500) ${progressPct}%, var(--color-neutral-200) ${progressPct}%, var(--color-neutral-200) 100%)`,
  }), [progressPct]);

  /* ── Accessible value text ────────────────────────────── */
  const ariaValueText = prefix
    ? `${prefix}${displayValue}`
    : suffix
      ? `${displayValue} ${suffix}`
      : displayValue;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-0.5">
        {label}
      </label>
      {hint && <p className="text-xs text-neutral-500 mb-1.5 leading-relaxed">{hint}</p>}
      {!hint && <div className="mb-1" />}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-describedby={error || notice ? `${id}-message` : undefined}
          className={`w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
            ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <input
        type="range"
        min={rangeMin}
        max={rangeMax}
        step={rangeStep}
        value={rangeValue}
        onChange={handleRangeChange}
        onKeyDown={handleRangeKeyDown}
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
      {error && (
        <p id={`${id}-message`} className="text-xs text-red-600 mt-1" role="alert">{error}</p>
      )}
      {!error && notice && (
        <p id={`${id}-message`} className="text-xs text-neutral-500 mt-1" role="status">{notice}</p>
      )}
    </div>
  );
}

export type { SliderInputProps };

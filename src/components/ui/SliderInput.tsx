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
}: SliderInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const displayValue = formatDisplay ? formatDisplay(value) : String(value);

  /** Auto-detect: use non-linear when range has >1000 discrete steps */
  const useNonLinear = useMemo(() => {
    if (max <= min || step <= 0) return false;
    return (max - min) / step > 1000;
  }, [min, max, step]);

  const handleFocus = () => {
    setIsEditing(true);
    setEditingValue(String(value));
    setError(null);
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
      if (parsed < min || parsed > max) {
        setError(`Value must be between ${min.toLocaleString()} and ${max.toLocaleString()}`);
      } else {
        setError(null);
      }
      onChange(Math.min(max, Math.max(min, parsed)));
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
        style={trackStyle}
        className="slider-track w-full h-2 mt-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb:hover]:scale-110 [&::-webkit-slider-thumb:active]:scale-95
          [&::-webkit-slider-thumb:active]:bg-primary-700
          [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-thumb:hover]:scale-110 [&::-moz-range-thumb:active]:scale-95
          [&::-moz-range-thumb:active]:bg-primary-700
          [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full"
        aria-label={`${label} slider`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-500 tabular-nums">{minLabel}</span>
          <span className="text-xs text-neutral-500 tabular-nums">{maxLabel}</span>
        </div>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>
      )}
    </div>
  );
}

export type { SliderInputProps };

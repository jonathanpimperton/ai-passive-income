/**
 * Shared slider + text input hybrid used across all calculator components.
 * Every numeric input gets both a text field and range slider, synced together.
 *
 * Key UX: During focus, users type freely (no formatting/clamping). On blur,
 * the value is parsed, validated, clamped to [min, max], and formatted.
 * This fixes: can't backspace, can't type decimals, intermediate states reformatted.
 */
import { useState, useCallback, useMemo } from 'react';

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

  /* ── Track fill gradient ──────────────────────────────── */
  const progressPct = useMemo(() => {
    if (max <= min) return 0;
    return ((value - min) / (max - min)) * 100;
  }, [value, min, max]);

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
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
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

/**
 * Shared slider + text input hybrid used across all calculator components.
 * Every numeric input gets both a text field and range slider, synced together.
 */

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
}: SliderInputProps) {
  const displayValue = formatDisplay ? formatDisplay(value) : String(value);

  const handleText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleText}
          className={`w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150
            ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">
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
        className="w-full h-2 mt-2.5 rounded-full appearance-none cursor-pointer
          bg-neutral-200 accent-primary-500
          [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        aria-label={`${label} slider`}
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-400 tabular-nums">{minLabel}</span>
          <span className="text-xs text-neutral-400 tabular-nums">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

export type { SliderInputProps };

/**
 * Free-text numeric input for fields that are not SliderInputs (net worth
 * items, debt rows).
 *
 * - While focused the box holds the raw text the person types; a value is
 *   applied live as soon as the text parses cleanly (real-time results).
 * - On blur the text is interpreted with the shared parse-number rules
 *   (src/lib/numeric-field.ts): a good value is committed and shown
 *   formatted; blank commits null (when allowed); anything else keeps the
 *   previous value and shows an inline, aria-describedby-linked message.
 * - On mount it reconciles text typed before hydration (or restored by Back
 *   navigation) with React state, so results never disagree with the box.
 * - 16px text so iOS does not zoom on focus.
 */
import { useEffect, useRef, useState } from 'react';
import {
  formatEditableNumber,
  interpretNumericText,
  textForEditing,
  type NumericFieldRules,
} from '../../../lib/numeric-field';

export interface NumericTextFieldProps extends NumericFieldRules {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Accessible name when there is no visible <label htmlFor={id}>. */
  ariaLabel?: string;
  placeholder?: string;
  /** Extra classes for the <input> (height, padding). */
  inputClassName?: string;
  className?: string;
  /** Id of an external message (e.g. a row-level issue) to link with aria-describedby. */
  describedBy?: string;
  /** Mark the field invalid from outside (e.g. a required value is missing). */
  invalid?: boolean;
  /** Maximum decimals shown when not editing. Default 2. */
  maxFractionDigits?: number;
}

export default function NumericTextField({
  id,
  value,
  onChange,
  ariaLabel,
  placeholder,
  inputClassName = '',
  className = '',
  describedBy,
  invalid,
  maxFractionDigits = 2,
  ...rules
}: NumericTextFieldProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = editing ? text : formatEditableNumber(value, rules.currency, maxFractionDigits);

  // Text typed before hydration (or restored by bfcache/Back) wins over the
  // SSR default, so the results match what the person sees in the box.
  useEffect(() => {
    const dom = inputRef.current?.value ?? '';
    if (dom === formatEditableNumber(value, rules.currency, maxFractionDigits)) return;
    const r = interpretNumericText(dom, rules);
    if (r.kind === 'value') onChange(r.value);
    else if (r.kind === 'empty') onChange(null);
    // Only on mount: later renders are controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (raw: string) => {
    const r = interpretNumericText(raw, rules);
    if (r.kind === 'value') {
      setError(null);
      onChange(r.value);
    } else if (r.kind === 'empty') {
      setError(null);
      onChange(null);
    } else {
      setError(r.message);
    }
  };

  const errorId = `${id}-error`;
  const describedByIds = [error ? errorId : null, describedBy ?? null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <div className="relative">
        {rules.prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none" aria-hidden="true">
            {rules.prefix}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={error || invalid ? true : undefined}
          aria-describedby={describedByIds}
          onFocus={() => {
            setEditing(true);
            setText(textForEditing(value, rules.currency));
          }}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const r = interpretNumericText(next, rules);
            if (r.kind === 'value') {
              setError(null);
              onChange(r.value);
            }
          }}
          onBlur={() => {
            setEditing(false);
            commit(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className={`w-full rounded-lg border bg-white text-neutral-900 text-base tabular-nums
            focus:ring-2 focus:outline-none transition-all duration-150
            ${error || invalid ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20' : 'border-neutral-200 focus:border-primary-500 focus:ring-primary-500/20'}
            ${rules.prefix ? 'pl-6' : 'pl-2.5'} ${rules.suffix ? 'pr-7' : 'pr-2.5'} ${inputClassName}`}
        />
        {rules.suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none" aria-hidden="true">
            {rules.suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1 leading-snug" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

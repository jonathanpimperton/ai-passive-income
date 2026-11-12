/**
 * Logic behind the free-text numeric fields that are not SliderInputs (net
 * worth items, debt rows). Kept pure so it can be tested without a DOM.
 *
 * - interpretNumericText(): what a typed string means, using the shared
 *   parse-number rules (so "50,000" is 50000, "1234.56" is 1234.56, "$5k" is
 *   5000, and "12,34" in USD is refused as ambiguous rather than guessed).
 * - formatEditableNumber(): how a stored value is shown when the field is
 *   not being edited (grouped, up to 2 decimals, in the currency's
 *   convention, so it parses back to the same number in the same currency).
 * - textForEditing(): what the field holds when focused (parse-number's
 *   formatForInput: no grouping, decimal comma in EUR).
 * The field's range is passed to the parser, which uses it only to choose
 * between the USD/EUR readings of an ambiguous entry; out-of-range values are
 * reported here, never clamped silently.
 */
import { formatForInput, parseNumericInput, type ParseFailureReason } from './parse-number';

export interface NumericFieldRules {
  currency?: string;
  allowNegative?: boolean;
  /** Blank text is a valid "no value" (returns kind 'empty'). Default true. */
  allowEmpty?: boolean;
  min?: number;
  max?: number;
  /** Message for a negative number when negatives are not allowed. */
  negativeMessage?: string;
  /** Unit used in range messages, e.g. "$" (prefix) or "%" (suffix). */
  prefix?: string;
  suffix?: string;
}

export type NumericInterpretation =
  | { kind: 'value'; value: number }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

function localeFor(currency?: string): string {
  return currency === 'EUR' ? 'de-DE' : currency === 'GBP' ? 'en-GB' : 'en-US';
}

export function formatEditableNumber(value: number | null, currency?: string, maxFractionDigits: number = 2): string {
  if (value === null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(localeFor(currency), {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** Text to put in the box when the user starts editing. */
export function textForEditing(value: number | null, currency?: string): string {
  if (value === null || !Number.isFinite(value)) return '';
  return formatForInput(value, currency);
}

function failureMessage(reason: ParseFailureReason, rules: NumericFieldRules): string {
  const eur = rules.currency === 'EUR';
  switch (reason) {
    case 'negative':
      return rules.negativeMessage ?? 'Enter a positive number.';
    case 'ambiguous':
      return eur
        ? 'Unclear number: write 50000 or 50.000 for fifty thousand, 12,5 for twelve and a half.'
        : 'Unclear number: use a point for decimals (12.34) and commas only between thousands (50,000).';
    case 'empty':
    case 'invalid':
    default:
      return eur ? 'Enter a number, for example 5.000 or 12,5.' : 'Enter a number, for example 5,000 or 12.5.';
  }
}

export function interpretNumericText(text: string, rules: NumericFieldRules = {}): NumericInterpretation {
  const allowEmpty = rules.allowEmpty ?? true;
  if (text.trim() === '') {
    return allowEmpty ? { kind: 'empty' } : { kind: 'error', message: failureMessage('empty', rules) };
  }
  const parsed = parseNumericInput(text, {
    currency: rules.currency,
    allowNegative: rules.allowNegative,
    min: rules.min,
    max: rules.max,
  });
  if (!parsed.ok) {
    if (parsed.reason === 'empty' && allowEmpty) return { kind: 'empty' };
    const options = (parsed.candidates ?? []).filter((c) => Number.isFinite(c));
    if (parsed.reason === 'ambiguous' && options.length > 1) {
      const list = options.map((c) => formatEditableNumber(c, rules.currency, 6));
      return { kind: 'error', message: `Did you mean ${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}? Type it without separators to be sure.` };
    }
    return { kind: 'error', message: failureMessage(parsed.reason, rules) };
  }
  const unit = (v: number) => `${rules.prefix ?? ''}${formatEditableNumber(v, rules.currency)}${rules.suffix ?? ''}`;
  if (rules.min !== undefined && parsed.value < rules.min) {
    return { kind: 'error', message: `The minimum is ${unit(rules.min)}.` };
  }
  if (rules.max !== undefined && parsed.value > rules.max) {
    return { kind: 'error', message: `The maximum is ${unit(rules.max)}.` };
  }
  return { kind: 'value', value: parsed.value };
}

/**
 * Pure free-text number parser for every numeric input on the site.
 *
 * Why this exists: the shared SliderInput used to read a lone comma as a
 * decimal point, so "50,000" became 50 in every calculator (review findings
 * CALC-UX-A-01 / CALC-UX-B-01). This module is the single, exhaustively
 * tested source of truth for turning what a person typed into a number.
 *
 * Rules
 * - Currency symbols ($ £ €), currency codes (USD/GBP/EUR) and `%` are
 *   ignored. Spaces are ignored at the ends and may act as thousands
 *   separators inside the number ("50 000"), where they must be grouped
 *   correctly.
 * - Suffixes k / m / bn (case-insensitive) multiply by 1e3 / 1e6 / 1e9.
 * - USD / GBP / default mode: `,` is a thousands separator and `.` is the
 *   decimal point. A comma is only accepted in a correctly grouped position
 *   (1-3 digits in the first group, exactly 3 in every later group).
 *   "12,34" is ambiguous and is rejected, never guessed.
 * - EUR mode: `.` is a thousands separator and `,` is the decimal point
 *   ("1.000.000,50", "450.000", "12,5"). A lone `.` that is NOT a valid
 *   thousands separator is read as a decimal point ("12.5", "0.125").
 *   A lone `,` followed by exactly 3 digits with no `.` ("50,000") is
 *   rejected as ambiguous: it is 50 in continental convention but 50,000
 *   for an Irish visitor, and guessing wrong is the bug this module exists
 *   to kill.
 * - Exponents ("1e9"), repeated decimal points ("1.2.3"), letters,
 *   Infinity/NaN and empty input are rejected.
 * - Negative numbers ("-5", "−5", "-$5", "$-5") are rejected with reason
 *   'negative' unless `allowNegative` is set.
 *
 * The parser never clamps and never rounds: range handling belongs to the
 * caller, which can then explain any adjustment to the user.
 */

export type NumberCurrency = 'USD' | 'GBP' | 'EUR';

export interface ParseNumberOptions {
  /** Formatting convention to apply. Anything other than 'EUR' uses the USD/GBP convention. */
  currency?: NumberCurrency | string;
  /** Accept a leading minus sign. Default false. */
  allowNegative?: boolean;
}

export type ParseFailureReason =
  /** Nothing (or only symbols/spaces) was typed. */
  | 'empty'
  /** Separators could mean two different numbers, e.g. "12,34" in USD or "50,000" in EUR. */
  | 'ambiguous'
  /** A minus sign was typed but negatives are not allowed here. */
  | 'negative'
  /** Not a number we understand: letters, exponents, "1.2.3", bad grouping, etc. */
  | 'invalid';

export type ParseNumberResult =
  | { ok: true; value: number }
  | { ok: false; reason: ParseFailureReason };

const SUFFIX_EXPONENT: Record<string, number> = { k: 3, m: 6, bn: 9 };

/** Every kind of space a keyboard, paste or locale formatter can produce. */
const SPACE_CLASS = '[\\s\\u00a0\\u2007\\u2009\\u202f]';
const HAS_SPACE = new RegExp(SPACE_CLASS);
const SPACES = new RegExp(`${SPACE_CLASS}+`, 'g');

const fail = (reason: ParseFailureReason): ParseNumberResult => ({ ok: false, reason });

/** True when `intPart` is a thousands-grouped integer using `sep`, e.g. "1,234,567". */
function isGrouped(intPart: string, sep: string): boolean {
  const groups = intPart.split(sep);
  if (groups.length < 2) return false;
  const [first, ...rest] = groups;
  return /^[1-9]\d{0,2}$/.test(first) && rest.every((g) => /^\d{3}$/.test(g));
}

/**
 * Split an unsigned, symbol-free, space-free numeric string into integer and
 * fraction digit strings according to the convention.
 */
function splitDigits(
  s: string,
  eur: boolean,
): { ok: true; int: string; frac: string } | { ok: false; reason: ParseFailureReason } {
  const T = eur ? '.' : ','; // thousands separator
  const D = eur ? ',' : '.'; // decimal separator

  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return { ok: false, reason: 'invalid' };

  const parts = s.split(D);
  if (parts.length > 2) return { ok: false, reason: 'invalid' }; // "1.2.3" (USD), "1,2,3" (EUR)
  const hasDecimal = parts.length === 2;
  let int = parts[0];
  let frac = hasDecimal ? parts[1] : '';

  if (frac.includes(T)) return { ok: false, reason: 'invalid' }; // "1.000,5" in USD; "1,000.5" in EUR

  if (int.includes(T)) {
    if (isGrouped(int, T)) {
      int = int.split(T).join('');
    } else if (!hasDecimal && int.split(T).length === 2) {
      // A single separator in a position that cannot be thousands grouping.
      if (!eur) return { ok: false, reason: 'ambiguous' }; // USD "12,34", "0,125", "1,0000"
      // EUR: a lone dot that is not thousands grouping is a decimal point ("12.5", "0.125").
      [int, frac] = int.split('.');
    } else {
      return { ok: false, reason: 'invalid' };
    }
  } else if (eur && hasDecimal && /^\d{3}$/.test(frac) && /^[1-9]\d*$/.test(int)) {
    // EUR "50,000": continental 50 or Irish 50,000. Refuse to guess.
    return { ok: false, reason: 'ambiguous' };
  }

  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return { ok: false, reason: 'invalid' };
  if (int === '' && frac === '') return { ok: false, reason: 'invalid' };
  return { ok: true, int, frac };
}

export function parseNumericInput(
  text: string | null | undefined,
  options: ParseNumberOptions = {},
): ParseNumberResult {
  if (text == null) return fail('empty');
  const eur = options.currency === 'EUR';

  // Currency codes and symbols anywhere ("£50", "50 €", "USD 50"), and `%`.
  let s = String(text)
    .replace(/usd|gbp|eur/gi, '')
    .replace(/[$£€%]/g, '')
    .trim();
  if (s === '') return fail('empty');

  // Sign: ASCII hyphen, Unicode minus or plus, before the digits.
  let negative = false;
  const sign = s.match(/^([-−+])\s*/);
  if (sign) {
    negative = sign[1] !== '+';
    s = s.slice(sign[0].length);
  }

  // Magnitude suffix.
  let exponent = 0;
  const suffix = s.match(/\s*(bn|k|m)$/i);
  if (suffix) {
    exponent = SUFFIX_EXPONENT[suffix[1].toLowerCase()];
    s = s.slice(0, s.length - suffix[0].length);
  }
  s = s.trim();
  if (s === '') return fail('invalid'); // a bare "-", "k" or "-k"

  // Internal spaces are thousands separators and must be grouped correctly.
  if (HAS_SPACE.test(s)) {
    const pieces = s.split(SPACES);
    const D = eur ? ',' : '.';
    const lastInt = pieces[pieces.length - 1].split(D)[0];
    const intForCheck = [...pieces.slice(0, -1), lastInt].join(' ');
    if (!isGrouped(intForCheck, ' ')) return fail('invalid');
    s = pieces.join('');
  }

  const digits = splitDigits(s, eur);
  if (!digits.ok) return fail(digits.reason);

  // Build one decimal literal and let the engine round it exactly once,
  // applying the suffix as an exponent ("1.15e6" === 1150000 exactly,
  // whereas 1.15 * 1e6 === 1149999.9999999998).
  const literal = `${digits.int || '0'}${digits.frac ? `.${digits.frac}` : ''}e${exponent}`;
  const magnitude = Number(literal);
  if (!Number.isFinite(magnitude)) return fail('invalid');

  if (negative && magnitude !== 0) {
    if (!options.allowNegative) return fail('negative');
    return { ok: true, value: -magnitude };
  }
  return { ok: true, value: magnitude };
}

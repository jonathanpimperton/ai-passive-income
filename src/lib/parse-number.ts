/**
 * Pure free-text number parser (and its inverse) for every numeric input on
 * the site.
 *
 * Why this exists: the shared SliderInput used to read a lone comma as a
 * decimal point, so "50,000" became 50 in every calculator (review findings
 * CALC-UX-A-01 / CALC-UX-B-01). This module is the single, exhaustively
 * tested source of truth for turning what a person typed into a number.
 *
 * Rules (without a range)
 * - Currency symbols (dollar, pound, euro), currency codes (USD/GBP/EUR) and `%` are
 *   ignored. Full-width (IME) digits and punctuation are read as ASCII;
 *   zero-width characters from pasted text are dropped. Spaces and
 *   apostrophes ("50 000", Swiss "50'000") may act as thousands separators
 *   and must then be grouped correctly.
 * - Suffixes k / m / bn (case-insensitive) multiply by 1e3 / 1e6 / 1e9.
 * - USD / GBP / default mode: `,` is a thousands separator and `.` the
 *   decimal point. A comma is accepted only in a correctly grouped position
 *   (1-3 digits in the first group, exactly 3 in every later group).
 *   "12,34" is ambiguous and is rejected, never guessed.
 * - EUR mode (`currency` 'EUR', any case): `.` is a thousands separator and
 *   `,` the decimal point ("1.000.000,50", "450.000", "12,5"). A lone `.`
 *   that cannot be thousands grouping is read as a decimal point ("12.5").
 *   A lone `,` followed by exactly 3 digits with no `.` ("50,000", "6,125")
 *   is rejected as ambiguous when the other convention also reads it: it is
 *   50 in continental convention but 50,000 for an Irish visitor, and
 *   guessing wrong is the bug this module exists to kill.
 * - Exponents ("1e9"), repeated decimal points ("1.2.3"), letters,
 *   Infinity/NaN, input longer than 64 characters and empty input are
 *   rejected.
 * - Negative numbers ("-5", Unicode-minus "5", "-$5", "$-5") are rejected with reason
 *   'negative' unless `allowNegative` is set.
 *
 * Range-aware disambiguation (`min` / `max`)
 * Every input is read under BOTH conventions (the selected one = primary,
 * the other = alternate). The field's range may pick the alternate reading
 * in exactly three situations, and never otherwise:
 * 1. The primary reading is genuinely ambiguous (EUR "50,000", "3,875"):
 *    the reading that alone falls in range wins (salary field -> 50000,
 *    rate field -> 3.875).
 * 2. The primary reading fails (USD "12,34", EUR "1,000.50") and the
 *    alternate reading is in range.
 * 3. The primary reading is out of range because its magnitude is too
 *    SMALL and the alternate reading, larger in magnitude, is in range
 *    (USD "52.000" in a salary field -> 52000).
 * A valid primary reading whose magnitude is too LARGE (above max, or below
 * min for a negative) is returned as typed (USD "50,000" in a 5,000-max
 * field stays 50000; EUR "6.125" in a rate field stays 6125; "-60,000" with
 * min -50,000 stays -60000) so the caller clamps and explains: a correctly
 * written number is never silently replaced by one 1000x smaller. The range never
 * clamps anything.
 *
 * Failures carry `candidates` (the valid readings, if any) so the UI can
 * ask "Did you mean 50 or 50,000?".
 *
 * Inverse: `formatForInput(value, currency)` writes a value the way an edit
 * box should show it (no grouping, never exponent notation, decimal comma
 * in EUR). `parseNumericInput(formatForInput(v, c), { currency: c, allowNegative: v < 0 })`
 * returns v, with no range or any range containing v, for every finite v
 * whose plain-decimal text fits the 64-character input cap
 * (about 1e-60 < |v| < 1e63; every real field is far inside that).
 *
 * The parser never clamps and never rounds: range handling belongs to the
 * caller, which can then explain any adjustment to the user.
 */

export type NumberCurrency = 'USD' | 'GBP' | 'EUR';

export interface ParseNumberOptions {
  /** Formatting convention ('EUR' in any case = EUR; anything else = USD/GBP). */
  currency?: NumberCurrency | string;
  /** Accept a leading minus sign. Default false. */
  allowNegative?: boolean;
  /**
   * The field's valid range. Used ONLY to choose between the two
   * conventions' readings in the three situations described in the module
   * header. Never clamps, and never replaces a valid reading that is above max.
   */
  min?: number;
  max?: number;
}

export type ParseFailureReason =
  /** Nothing (or only symbols/spaces) was typed. */
  | 'empty'
  /** Separators could mean two different numbers, e.g. "12,34" in USD or "50,000" in EUR. */
  | 'ambiguous'
  /** A minus sign was typed but negatives are not allowed here. */
  | 'negative'
  /** Not a number we understand: letters, exponents, "1.2.3", bad grouping, too long, etc. */
  | 'invalid';

export type ParseNumberResult =
  | { ok: true; value: number }
  | {
      ok: false;
      reason: ParseFailureReason;
      /** Valid readings of the input (either convention), for a "Did you mean ...?" prompt. */
      candidates?: number[];
    };

const MAX_INPUT_LENGTH = 64;
const SUFFIX_EXPONENT: Record<string, number> = { k: 3, m: 6, bn: 9 };

/** Every kind of space a keyboard, paste or locale formatter can produce. */
const SPACE_CLASS = '[\\s\\u00a0\\u2007\\u2009\\u202f]';
const HAS_SPACE = new RegExp(SPACE_CLASS);
const SPACES = new RegExp(`${SPACE_CLASS}+`, 'g');

const ok = (value: number): ParseNumberResult => ({ ok: true, value });
const fail = (reason: ParseFailureReason): ParseNumberResult => ({ ok: false, reason });

const isEur = (currency: unknown): boolean => String(currency ?? '').toUpperCase() === 'EUR';

/** True when `intPart` is a thousands-grouped integer using `sep`, e.g. "1,234,567". */
function isGrouped(intPart: string, sep: string): boolean {
  const groups = intPart.split(sep);
  if (groups.length < 2) return false;
  const [first, ...rest] = groups;
  return /^[1-9]\d{0,2}$/.test(first) && rest.every((g) => /^\d{3}$/.test(g));
}

/**
 * Read an unsigned, symbol-free numeric string (digits, separators, spaces)
 * strictly under one convention, applying a power-of-ten exponent.
 */
function readConvention(core: string, eur: boolean, exponent: number): ParseNumberResult {
  const T = eur ? '.' : ','; // thousands separator
  const D = eur ? ',' : '.'; // decimal separator
  let s = core;

  // Internal spaces are thousands separators and must be grouped correctly.
  if (HAS_SPACE.test(s)) {
    const pieces = s.split(SPACES);
    const lastInt = pieces[pieces.length - 1].split(D)[0];
    if (!isGrouped([...pieces.slice(0, -1), lastInt].join(' '), ' ')) return fail('invalid');
    s = pieces.join('');
  }

  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return fail('invalid');

  const parts = s.split(D);
  if (parts.length > 2) return fail('invalid'); // "1.2.3" (USD), "1,2,3" (EUR)
  const hasDecimal = parts.length === 2;
  let int = parts[0];
  let frac = hasDecimal ? parts[1] : '';
  if (frac.includes(T)) return fail('invalid'); // "1.000,5" in USD; "1,000.5" in EUR

  if (int.includes(T)) {
    if (isGrouped(int, T)) {
      int = int.split(T).join('');
    } else if (!hasDecimal && int.split(T).length === 2) {
      // A single separator in a position that cannot be thousands grouping.
      if (!eur) return fail('ambiguous'); // USD "12,34", "0,125", "1,0000"
      [int, frac] = int.split('.'); // EUR "12.5", "0.125": a lone dot is a decimal point
    } else {
      return fail('invalid');
    }
  }

  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return fail('invalid');
  if (int === '' && frac === '') return fail('invalid');

  // One decimal literal, rounded by the engine exactly once, with the suffix
  // applied as an exponent ("1.15e6" === 1150000 exactly, whereas
  // 1.15 * 1e6 === 1149999.9999999998).
  const value = Number(`${int || '0'}${frac ? `.${frac}` : ''}e${exponent}`);
  return Number.isFinite(value) ? ok(value) : fail('invalid');
}

/** Map full-width (IME) ASCII, ideographic space and pasted invisible marks to plain text. */
const FULL_WIDTH_ASCII = new RegExp('[\uFF01-\uFF5E]', 'g');
const FULL_WIDTH_POUND = new RegExp('\uFFE1', 'g');
const IDEOGRAPHIC_SPACE = new RegExp('\u3000', 'g');
const INVISIBLE_MARKS = new RegExp('[\u200B-\u200F\u2060\uFEFF]', 'g');
const CURRENCY_SYMBOLS = new RegExp('[$\u00A3\u20AC%]', 'g'); // dollar, pound, euro, percent
const APOSTROPHES = new RegExp("['\u2019]", 'g');
const LEADING_SIGN = /^([-\u2212+])\s*/; // hyphen, Unicode minus, plus
const POUND = String.fromCharCode(0xa3);

function normalise(text: string): string {
  return text
    .replace(FULL_WIDTH_ASCII, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(FULL_WIDTH_POUND, POUND)
    .replace(IDEOGRAPHIC_SPACE, ' ')
    .replace(INVISIBLE_MARKS, '');
}

export function parseNumericInput(
  text: string | null | undefined,
  options: ParseNumberOptions = {},
): ParseNumberResult {
  if (text == null) return fail('empty');
  const raw = String(text);
  if (raw.length > MAX_INPUT_LENGTH * 4) return fail('invalid'); // cheap guard before any regex work
  const eur = isEur(options.currency);

  // Currency codes and symbols anywhere (pound-50, "50 EUR-sign", "USD 50"), `%`, and
  // apostrophe thousands separators (treated like spaces).
  let s = normalise(raw)
    .replace(/usd|gbp|eur/gi, '')
    .replace(CURRENCY_SYMBOLS, '')
    .replace(APOSTROPHES, ' ')
    .trim();
  if (s === '') return fail('empty');
  if (s.length > MAX_INPUT_LENGTH) return fail('invalid');

  // Sign: ASCII hyphen, Unicode minus or plus, before the digits.
  let negative = false;
  const sign = s.match(LEADING_SIGN);
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
  const core = s.trim();
  if (core === '') return fail('invalid'); // a bare "-", "k" or "-k"

  const primary = readConvention(core, eur, exponent);
  const alternate = readConvention(core, !eur, exponent);
  const pv = primary.ok ? primary.value : null;
  const av = alternate.ok ? alternate.value : null;

  if (pv === null && av === null) return primary;
  if (negative && !options.allowNegative && ((pv ?? 0) !== 0 || (av ?? 0) !== 0)) return fail('negative');
  const signed = (v: number) => (negative && v !== 0 ? -v : v);
  const sp = pv === null ? null : signed(pv);
  const sa = av === null ? null : signed(av);

  const { min, max } = options;
  const hasMin = typeof min === 'number' && Number.isFinite(min);
  const hasMax = typeof max === 'number' && Number.isFinite(max);
  const hasRange = hasMin || hasMax;
  const inRange = (v: number) => (!hasMin || v >= (min as number)) && (!hasMax || v <= (max as number));

  if (sp !== null) {
    // EUR "50,000" / "6,125": continental 50 / 6.125 vs English 50000 / 6125.
    const ambiguous = eur && sa !== null && sa !== sp && /^\d+,\d{3}$/.test(core);
    if (ambiguous) {
      // Situation 1: genuinely ambiguous -- the range may pick either reading.
      if (hasRange) {
        const hits = [sp, sa as number].filter(inRange);
        if (hits.length === 1) return ok(hits[0]);
      }
      return { ok: false, reason: 'ambiguous', candidates: [sp, sa as number] };
    }
    // Situation 3: the primary is out of range on the too-small-magnitude side
    // and the alternate, LARGER in magnitude, is in range. The alternate may
    // only ever grow the magnitude: a primary that is too large (above max,
    // or below min for negatives) is NEVER replaced (the caller clamps and explains).
    if (hasRange && !inRange(sp) && sa !== null && Math.abs(sa) > Math.abs(sp) && inRange(sa)) return ok(sa);
    return ok(sp);
  }

  // Situation 2: the primary reading failed; a valid alternate in range wins.
  if (hasRange && sa !== null && inRange(sa)) return ok(sa);
  return sa === null ? primary : { ok: false, reason: (primary as { reason: ParseFailureReason }).reason, candidates: [sa] };
}

/** Plain decimal notation for any finite number: no exponent, no grouping, '.' decimal. */
function plainDecimal(value: number): string {
  const s = String(value);
  if (!/e/i.test(s)) return s;
  const [mantissa, expPart] = s.toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const [ip, fp = ''] = (negative ? mantissa.slice(1) : mantissa).split('.');
  let digits = ip + fp;
  let point = ip.length + Number(expPart);
  if (point <= 0) {
    digits = '0'.repeat(1 - point) + digits;
    point = 1;
  } else if (point > digits.length) {
    digits += '0'.repeat(point - digits.length);
  }
  const out = (digits.slice(0, point) + (point < digits.length ? `.${digits.slice(point)}` : '')).replace(
    /^0+(?=\d)/,
    '',
  );
  return (negative ? '-' : '') + out;
}

/**
 * Write a number the way an edit box should show it, in the given
 * convention: no thousands grouping, never exponent notation, a decimal
 * comma in EUR. Guaranteed to parse back to the same value with
 * parseNumericInput (with no range, or a range containing the value).
 * Non-finite values give ''.
 *
 * EUR detail: a fraction of exactly 3 digits is written with one trailing
 * zero ("6,1250" for 6.125) so it can never trip the "50,000" ambiguity rule.
 */
export function formatForInput(value: number, currency?: NumberCurrency | string): string {
  if (!Number.isFinite(value)) return '';
  const plain = plainDecimal(value === 0 ? 0 : value); // normalise -0
  if (!isEur(currency)) return plain;
  const [intPart, fracPart] = plain.split('.');
  if (fracPart === undefined) return intPart;
  const needsPad = fracPart.length === 3 && !/^-?0+$/.test(intPart);
  return `${intPart},${needsPad ? `${fracPart}0` : fracPart}`;
}

/**
 * Display helpers for calculator results that must stay honest at the edges:
 * non-finite values, astronomically large values (review CALC-UX-B "edge
 * values": "$690,610,009,620,613,100"), and month counts.
 *
 * Pure functions, no DOM access, safe for SSR and tests.
 */
import { formatCurrency } from './calculator-utils';

/** Money at or above this magnitude is shown as "Over ... 1 trillion". */
export const EXTREME_MONEY = 1e12;
/** Percentages at or above this magnitude are shown as "Over 1,000,000%". */
export const EXTREME_PERCENT = 1e6;

// Pound and euro signs by code point, keeping this source file ASCII.
const SYMBOLS: Record<string, string> = { USD: '$', GBP: String.fromCharCode(0xa3), EUR: String.fromCharCode(0x20ac) };

/** True when a money figure is not something a person could plausibly have. */
export function isExtremeMoney(value: number): boolean {
  return !Number.isFinite(value) || Math.abs(value) >= EXTREME_MONEY;
}

/**
 * formatCurrency with guards: '--' for NaN/Infinity, "Over $1 trillion"
 * (or "Under -$1 trillion") for absurd magnitudes. Callers should pair an
 * extreme value with a "check your inputs" note (see isExtremeMoney).
 */
export function formatMoneyGuarded(value: number, currency: string = 'USD'): string {
  if (!Number.isFinite(value)) return '--';
  if (Math.abs(value) >= EXTREME_MONEY) {
    const symbol = SYMBOLS[currency] ?? '$';
    return value > 0 ? `Over ${symbol}1 trillion` : `Under -${symbol}1 trillion`;
  }
  return formatCurrency(value, currency);
}

/** Percent from a fraction (0.155 -> "15.50%"), with '--' and "Over 1,000,000%" guards. */
export function formatPercentGuarded(fraction: number, decimals: number = 2): string {
  if (!Number.isFinite(fraction)) return '--';
  const pct = fraction * 100;
  if (Math.abs(pct) >= EXTREME_PERCENT) return pct > 0 ? 'Over 1,000,000%' : 'Under -1,000,000%';
  const text = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(pct);
  // Avoid "-0.00%" for tiny negatives that round to zero.
  return `${/^-0(\.0+)?$/.test(text) ? text.slice(1) : text}%`;
}

/** "4 years, 11 months" / "11 months" / "0 months". Whole months only. */
export function formatMonthsLong(months: number): string {
  const whole = Math.max(0, Math.round(months));
  if (whole === 0) return '0 months';
  const y = Math.floor(whole / 12);
  const m = whole % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} month${m !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

/** "15 yrs 11 mo" / "16 years" / "11 mo". Whole months only, never "12 mo". */
export function formatMonthsShort(months: number): string {
  const whole = Math.max(0, Math.round(months));
  const y = Math.floor(whole / 12);
  const m = whole % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y} yr${y !== 1 ? 's' : ''} ${m} mo`;
}

/** Money with cents ("$153.27"), in the currency's locale. '--' for non-finite values. */
export function formatMoneyCents(value: number, currency: string = 'USD'): string {
  if (!Number.isFinite(value)) return '--';
  const locale = currency === 'GBP' ? 'en-GB' : currency === 'EUR' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

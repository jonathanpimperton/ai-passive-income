/**
 * Password generation and strength rating (DEVTOOLS-03/27).
 *
 * The strength meter and the page's "What the numbers mean" table share this
 * one threshold table, so they can no longer disagree (8 lowercase letters is
 * "Very weak", not "Good"). Crack times assume an offline attack testing
 * GUESSES_PER_SECOND guesses per second and show the time to try every
 * combination.
 */

export const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

const AMBIGUOUS_CHARS = /[0OoIl1|]/g;

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  excludeAmbiguous: boolean;
}

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

/** The enabled character sets, with ambiguous characters removed if asked. */
export function enabledSets(o: PasswordOptions): string[] {
  const sets: string[] = [];
  for (const key of ['uppercase', 'lowercase', 'numbers', 'special'] as const) {
    if (!o[key]) continue;
    const set = o.excludeAmbiguous ? CHAR_SETS[key].replace(AMBIGUOUS_CHARS, '') : CHAR_SETS[key];
    if (set.length) sets.push(set);
  }
  return sets;
}

export function poolSize(o: PasswordOptions): number {
  return enabledSets(o).reduce((n, s) => n + s.length, 0);
}

/** Entropy in bits of a random password drawn uniformly from the pool. */
export function entropyBits(o: PasswordOptions): number {
  const pool = poolSize(o);
  return pool > 0 ? o.length * Math.log2(pool) : 0;
}

export type StrengthTone = 'very-weak' | 'weak' | 'moderate' | 'strong' | 'very-strong';

export interface StrengthLevel {
  /** Lowest entropy (bits) for this level. */
  min: number;
  label: string;
  meaning: string;
  tone: StrengthTone;
  /** Meter fill, percent. */
  percent: number;
}

/** The single source for the meter and the page's strength table. */
export const STRENGTH_LEVELS: readonly StrengthLevel[] = [
  { min: 0, label: 'Very weak', meaning: 'Cracked almost instantly by an offline attack', tone: 'very-weak', percent: 10 },
  { min: 40, label: 'Weak', meaning: 'Crackable with consumer hardware', tone: 'weak', percent: 30 },
  { min: 60, label: 'Moderate', meaning: 'Resists casual attacks but not determined ones', tone: 'moderate', percent: 55 },
  { min: 80, label: 'Strong', meaning: 'Sufficient for most online accounts', tone: 'strong', percent: 80 },
  { min: 100, label: 'Very strong', meaning: 'Suitable for master passwords, encryption keys and high-security accounts', tone: 'very-strong', percent: 100 },
];

export function strengthFor(bits: number): StrengthLevel {
  let level = STRENGTH_LEVELS[0];
  for (const l of STRENGTH_LEVELS) if (bits >= l.min) level = l;
  return level;
}

/** Offline attack speed assumed for crack times: 100 billion guesses per second. */
export const GUESSES_PER_SECOND = 1e11;

/** Seconds to try every combination at `rate` guesses per second. */
export function crackSeconds(bits: number, rate = GUESSES_PER_SECOND): number {
  return Math.pow(2, bits) / rate;
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const YEAR = 365.25 * DAY;

function sig3(n: number): string {
  return Number(n.toPrecision(3)).toLocaleString('en-US');
}

/** Plain-English duration, e.g. "11 seconds", "67 days", "191,000 years", "4.01 billion years". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'longer than the age of the universe';
  if (seconds < 1) return 'less than a second';
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (seconds < MINUTE) return unit(Math.round(seconds), 'second');
  if (seconds < HOUR) return unit(Math.round(seconds / MINUTE), 'minute');
  if (seconds < DAY) return unit(Math.round(seconds / HOUR), 'hour');
  if (seconds < YEAR) return unit(Math.round(seconds / DAY), 'day');
  const years = seconds / YEAR;
  if (years < 1000) return unit(Math.round(years), 'year');
  if (years < 1e6) return `${sig3(years)} years`;
  if (years < 1e9) return `${sig3(years / 1e6)} million years`;
  if (years < 1e12) return `${sig3(years / 1e9)} billion years`;
  if (years < 1e15) return `${sig3(years / 1e12)} trillion years`;
  return 'more than a quadrillion years';
}

/** Uniform random integer in [0, max) from the Web Crypto API, without modulo bias. */
export function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);
  return array[0] % max;
}

/**
 * Random password with at least one character from each enabled set,
 * shuffled with Fisher-Yates. `randomInt` is injectable for tests.
 */
export function generatePassword(o: PasswordOptions, randomInt: (max: number) => number = secureRandomInt): string {
  const sets = enabledSets(o);
  if (sets.length === 0) return '';
  const charset = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < o.length) chars.push(charset[randomInt(charset.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Clamp a typed length into range; null when the text is not a number. */
export function parseLength(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parseInt(digits, 10)));
}

/**
 * UK PAYE tax code parsing for the UK Salary calculator.
 *
 * Pure and dependency-light: every rate comes from uk-rates.ts, so a rates
 * change flows through without touching this file.
 *
 * Rules implemented (GOV.UK, accessed 12 Nov 2026):
 * - https://www.gov.uk/tax-codes/what-your-tax-code-means
 *   L standard allowance; M / N Marriage Allowance received / transferred;
 *   T "other calculations" (e.g. allowance already reduced); 0T allowance used
 *   up; BR / D0 / D1 all income at basic / higher / additional rate; NT no tax;
 *   K income above the allowance. S prefix = Scottish rates, C prefix = Welsh
 *   rates. Scottish flat codes: SBR basic, SD0 intermediate, SD1 higher,
 *   SD2 advanced, SD3 top. Welsh flat codes: CBR basic, CD0 higher,
 *   CD1 additional.
 * - https://www.gov.uk/tax-codes/emergency-tax-codes
 *   Emergency suffixes W1 (weekly), M1 (monthly), X (pay dates vary) and
 *   NONCUM, e.g. "1257L W1", "S875L M1", "C663L X".
 * - https://www.gov.uk/tax-codes/k-in-your-tax-code
 *   "Employers and pension providers cannot take more than half of your
 *   pre-tax wages or pension when using a K tax code." (applied by the
 *   income-tax engine in uk-tax-calc.ts, not here).
 * - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 *   Wales uses the same bands and rates as England and Northern Ireland in
 *   2026/27, so a C prefix selects the rest-of-UK bands.
 *
 * The numeric part of an allowance code is the allowance divided by 10
 * (1257L = £12,570). Codes with five or more digits are rejected: they are
 * almost always someone typing their allowance ("12570") rather than a code.
 */

import { UK_INCOME_TAX, UK_SCOTTISH_TAX } from './uk-rates';

/** Which income tax bands apply. Wales uses the rest-of-UK bands. */
export type UkTaxRegion = 'rUK' | 'scotland';

export type TaxCodePrefix = 'S' | 'C';
export type EmergencyMarker = 'W1' | 'M1' | 'X' | 'NONCUM';
export type AllowanceSuffix = 'L' | 'M' | 'N' | 'T';

interface ParsedBase {
  /** Trimmed, upper-cased input. */
  input: string;
  /** S (Scotland) or C (Wales) prefix, if present. */
  prefix: TaxCodePrefix | null;
  /** Emergency-basis marker, if present. */
  emergency: EmergencyMarker | null;
}

/** Number + letter codes (1257L, S1257L, 1383M, 0T, 1100T W1 ...). */
export interface AllowanceCode extends ParsedBase {
  kind: 'allowance';
  /** Allowance in pounds implied by the code (digits x 10). */
  allowance: number;
  suffix: AllowanceSuffix;
  /**
   * L codes carry the standard Personal Allowance, which the £100,000
   * adjusted-net-income taper reduces (see allowanceForCode in uk-tax-calc).
   */
  tapers: boolean;
  /** Allowance above £25,000: accepted, but the UI asks the user to check it. */
  unusual: boolean;
}

/** K codes: the number is ADDED to taxable pay (K475 = +£4,750). */
export interface KCode extends ParsedBase {
  kind: 'k';
  addition: number;
}

/** Flat-rate codes: every pound of pay from this job at one rate. */
export interface FlatRateCode extends ParsedBase {
  kind: 'flat';
  /** BR, D0, D1, D2, D3 (without the prefix). */
  code: 'BR' | 'D0' | 'D1' | 'D2' | 'D3';
  rate: number;
  /** Human band name, e.g. "Scottish intermediate rate". */
  bandLabel: string;
}

export interface NoTaxCode extends ParsedBase {
  kind: 'nt';
}

/** Empty field: the calculator uses the standard 1257L with the taper. */
export interface BlankCode {
  kind: 'blank';
  input: '';
  prefix: null;
  emergency: null;
}

/** Anything else: the calculator falls back to 1257L and says so. */
export interface InvalidCode {
  kind: 'invalid';
  input: string;
  prefix: null;
  emergency: null;
}

export type ParsedTaxCode = AllowanceCode | KCode | FlatRateCode | NoTaxCode | BlankCode | InvalidCode;

/** Allowance above which a code is flagged as unusual (2,500L or more). */
export const UNUSUAL_ALLOWANCE_FROM = 25_000;

function rate(bands: readonly { rate: number; name: string }[], name: string): number {
  const band = bands.find((b) => b.name === name);
  if (!band) throw new Error(`uk-tax-codes: band "${name}" missing from uk-rates.ts`);
  return band.rate;
}

/** Flat-rate code table, resolved from the central rates module. */
function flatRate(prefix: TaxCodePrefix | null, code: FlatRateCode['code']): { rate: number; bandLabel: string } | null {
  if (prefix === 'S') {
    const s = UK_SCOTTISH_TAX.bands;
    switch (code) {
      case 'BR': return { rate: rate(s, 'Basic'), bandLabel: 'Scottish basic rate' };
      case 'D0': return { rate: rate(s, 'Intermediate'), bandLabel: 'Scottish intermediate rate' };
      case 'D1': return { rate: rate(s, 'Higher'), bandLabel: 'Scottish higher rate' };
      case 'D2': return { rate: rate(s, 'Advanced'), bandLabel: 'Scottish advanced rate' };
      case 'D3': return { rate: rate(s, 'Top'), bandLabel: 'Scottish top rate' };
    }
  }
  // No prefix (England / NI) and C (Wales) share the same rates in 2026/27.
  const u = UK_INCOME_TAX.bands;
  const welsh = prefix === 'C' ? 'Welsh ' : '';
  switch (code) {
    case 'BR': return { rate: rate(u, 'Basic'), bandLabel: `${welsh}basic rate` };
    case 'D0': return { rate: rate(u, 'Higher'), bandLabel: `${welsh}higher rate` };
    case 'D1': return { rate: rate(u, 'Additional'), bandLabel: `${welsh}additional rate` };
    default: return null; // D2 / D3 exist only as Scottish codes
  }
}

const EMERGENCY_RE = /(W1|M1|X|NONCUM)$/;

/**
 * Parse a PAYE tax code. Never throws. Spaces and slashes are ignored, so
 * "1257L W1", "1257LW1" and "1257L/W1" are the same code.
 */
export function parseUkTaxCode(raw: string): ParsedTaxCode {
  const input = (raw ?? '').trim().toUpperCase();
  if (input === '') return { kind: 'blank', input: '', prefix: null, emergency: null };

  const invalid: InvalidCode = { kind: 'invalid', input, prefix: null, emergency: null };
  let body = input.replace(/[\s/]+/g, '');
  if (!/^[A-Z0-9]+$/.test(body)) return invalid;

  let prefix: TaxCodePrefix | null = null;
  if (body.startsWith('S') || body.startsWith('C')) {
    prefix = body[0] as TaxCodePrefix;
    body = body.slice(1);
  }

  // Number + letter code, optionally followed by an emergency marker.
  // Checked before stripping the marker so "1257LM1" reads as L + M1.
  const allowanceMatch = body.match(/^(\d{1,4})([LMNT])(W1|M1|X|NONCUM)?$/);
  if (allowanceMatch) {
    const allowance = parseInt(allowanceMatch[1], 10) * 10;
    const suffix = allowanceMatch[2] as AllowanceSuffix;
    return {
      kind: 'allowance',
      input,
      prefix,
      emergency: (allowanceMatch[3] as EmergencyMarker | undefined) ?? null,
      allowance,
      suffix,
      tapers: suffix === 'L',
      unusual: allowance >= UNUSUAL_ALLOWANCE_FROM,
    };
  }

  let emergency: EmergencyMarker | null = null;
  const em = body.match(EMERGENCY_RE);
  // Only strip a marker when something is left before it (so "X" alone stays invalid).
  if (em && body.length > em[1].length) {
    emergency = em[1] as EmergencyMarker;
    body = body.slice(0, -em[1].length);
  }

  const kMatch = body.match(/^K(\d{1,4})$/);
  if (kMatch) {
    return { kind: 'k', input, prefix, emergency, addition: parseInt(kMatch[1], 10) * 10 };
  }

  if (body === 'NT') return { kind: 'nt', input, prefix, emergency };

  if (body === 'BR' || body === 'D0' || body === 'D1' || body === 'D2' || body === 'D3') {
    const resolved = flatRate(prefix, body);
    if (!resolved) return invalid;
    return { kind: 'flat', input, prefix, emergency, code: body, ...resolved };
  }

  return invalid;
}

/**
 * The bands to use: an S prefix means Scottish rates and a C prefix means
 * Welsh (rest-of-UK) rates whatever the Scottish toggle says; codes without
 * a prefix follow the toggle.
 */
export function regionForCode(code: ParsedTaxCode, scottishToggle: boolean): { region: UkTaxRegion; source: 'code' | 'toggle' } {
  if (code.prefix === 'S') return { region: 'scotland', source: 'code' };
  if (code.prefix === 'C') return { region: 'rUK', source: 'code' };
  return { region: scottishToggle ? 'scotland' : 'rUK', source: 'toggle' };
}

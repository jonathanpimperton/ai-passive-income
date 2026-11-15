/**
 * JWT decoding and claim checks for the JWT decoder (DEVTOOLS-15).
 *
 * The decoder never verifies signatures, so it never calls a token "Valid".
 * It reports what the time claims say (expired, not yet active, not
 * expired), flags unsigned "alg: none" tokens, notices millisecond
 * timestamps, accepts a pasted "Bearer " prefix, recognises encrypted
 * tokens (JWE) and explains decoding errors in plain English.
 */
import { decodeBase64 } from './base64';

export type AlgFamily = 'none' | 'hmac' | 'rsa' | 'rsa-pss' | 'ecdsa' | 'eddsa' | 'unknown';

export interface TimeClaim {
  name: 'exp' | 'nbf' | 'iat';
  /** Seconds since 1970 as written in the token. */
  seconds: number;
  /** True when the value looks like milliseconds rather than seconds. */
  looksLikeMs: boolean;
}

export interface JwtStatus {
  label: string;
  tone: 'ok' | 'warn' | 'bad';
}

export type JwtDecodeResult =
  | {
      ok: true;
      header: Record<string, unknown>;
      payload: Record<string, unknown>;
      signature: string;
      alg: { name: string; family: AlgFamily; verifyWith: string };
      times: Partial<Record<TimeClaim['name'], TimeClaim>>;
      status: JwtStatus;
      warnings: string[];
      notes: string[];
    }
  | { ok: false; error: string };

/** NumericDate values above this (about the year 5138) are almost certainly milliseconds. */
const MS_THRESHOLD = 1e11;

/** The largest absolute millisecond value a JavaScript Date can hold (year 275760). */
const MAX_DATE_MS = 8.64e15;

/** "2024-05-01" for a millisecond timestamp, or null when it is outside the range of real dates. */
function isoDay(ms: number): string | null {
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) return null;
  const iso = new Date(ms).toISOString();
  return iso.slice(0, iso.indexOf('T'));
}

/** What a time claim written in seconds means, in words that stay valid for any number. */
function describeAsSeconds(v: number): string {
  const ms = v * 1000;
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) return 'a date outside the range of real dates';
  return `the year ${new Date(ms).getUTCFullYear()}`;
}

export function algInfo(alg: unknown): { name: string; family: AlgFamily; verifyWith: string } {
  const name = typeof alg === 'string' ? alg : 'unknown';
  if (name.toLowerCase() === 'none') return { name, family: 'none', verifyWith: 'nothing: the token is not signed' };
  if (/^HS\d+$/.test(name)) return { name, family: 'hmac', verifyWith: 'the shared secret key' };
  if (/^RS\d+$/.test(name)) return { name, family: 'rsa', verifyWith: "the issuer's RSA public key" };
  if (/^PS\d+$/.test(name)) return { name, family: 'rsa-pss', verifyWith: "the issuer's RSA public key" };
  if (/^ES\d+K?$/.test(name)) return { name, family: 'ecdsa', verifyWith: "the issuer's elliptic-curve public key" };
  if (name === 'EdDSA' || name === 'Ed25519') return { name, family: 'eddsa', verifyWith: "the issuer's Ed25519 public key" };
  return { name, family: 'unknown', verifyWith: 'the key for this algorithm' };
}

function decodeSegment(segment: string, label: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!segment) return { ok: false, error: `The ${label} is empty.` };
  const bytes = decodeBase64(segment);
  if (!bytes.ok) return { ok: false, error: `The ${label} is not valid Base64URL. ${bytes.error}` };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.bytes);
  } catch {
    return { ok: false, error: `The ${label} does not decode to readable text, so this is not a JWT ${label}.` };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: `The ${label} decodes to text that is not JSON: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}".` };
  }
}

/** A claim value in words for a warning: names null and arrays (typeof says "object") and shortens long strings. */
export function describeClaimValue(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'an array';
  switch (typeof v) {
    case 'string':
      return `the string "${v.length > 40 ? `${v.slice(0, 37)}...` : v}"`;
    case 'number':
      return 'not a finite number';
    case 'boolean':
      return `the boolean ${v}`;
    case 'object':
      return 'an object';
    default:
      return typeof v;
  }
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "3 days", "5h 20m", "12m", "45s". */
export function formatSpan(ms: number): string {
  const abs = Math.abs(ms);
  if (abs >= 2 * DAY) {
    const days = Math.floor(abs / DAY);
    if (days >= 730) return `${Math.floor(days / 365.25)} years`;
    return `${days} days`;
  }
  if (abs >= HOUR) return `${Math.floor(abs / HOUR)}h ${Math.floor((abs % HOUR) / MINUTE)}m`;
  if (abs >= MINUTE) return `${Math.floor(abs / MINUTE)}m`;
  return `${Math.max(0, Math.floor(abs / SECOND))}s`;
}

export function decodeJwtToken(input: string, nowMs: number = Date.now()): JwtDecodeResult {
  const notes: string[] = [];
  let token = input.trim();
  if (!token) return { ok: false, error: 'Paste a JWT above.' };
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '');
    notes.push('Removed the "Bearer " prefix from an Authorization header.');
  }
  if (/^["'].*["']$/.test(token)) {
    token = token.slice(1, -1);
    notes.push('Removed surrounding quotes.');
  }
  if (/\s/.test(token)) {
    token = token.replace(/\s+/g, '');
    notes.push('Removed spaces and line breaks inside the token.');
  }

  const parts = token.split('.');
  if (parts.length === 5) {
    const header = decodeSegment(parts[0], 'header');
    const enc = header.ok && header.value && typeof header.value === 'object' ? (header.value as Record<string, unknown>).enc : undefined;
    return {
      ok: false,
      error: `This is an encrypted token (JWE: 5 parts${typeof enc === 'string' ? `, encryption ${enc}` : ''}). Its payload cannot be read without the decryption key, so only signed tokens (JWS, 3 parts) can be decoded here.`,
    };
  }
  if (parts.length !== 3) {
    return { ok: false, error: `A JWT has 3 parts separated by dots (header.payload.signature), but this has ${parts.length}.` };
  }

  const header = decodeSegment(parts[0], 'header');
  if (!header.ok) return { ok: false, error: header.error };
  if (!header.value || typeof header.value !== 'object' || Array.isArray(header.value)) {
    return { ok: false, error: 'The header must be a JSON object such as {"alg":"HS256","typ":"JWT"}.' };
  }
  const payload = decodeSegment(parts[1], 'payload');
  if (!payload.ok) return { ok: false, error: payload.error };
  if (!payload.value || typeof payload.value !== 'object' || Array.isArray(payload.value)) {
    return { ok: false, error: 'The payload is not a JSON object, so it has no claims to show.' };
  }

  const h = header.value as Record<string, unknown>;
  const p = payload.value as Record<string, unknown>;
  const alg = algInfo(h.alg);
  const warnings: string[] = [];
  if (alg.family === 'none') {
    warnings.push('This token is unsigned (alg: none). Anyone can create or change it, and servers must reject it.');
    if (parts[2]) warnings.push('It says alg: none but still has a signature part, which is malformed.');
  } else if (!parts[2]) {
    warnings.push('The signature part is empty, so this token cannot be verified.');
  }
  if (h.alg === undefined) warnings.push('The header has no "alg" claim.');

  const times: Partial<Record<TimeClaim['name'], TimeClaim>> = {};
  const notNumbers = new Set<TimeClaim['name']>();
  for (const name of ['exp', 'nbf', 'iat'] as const) {
    const v = p[name];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      notNumbers.add(name);
      warnings.push(`"${name}" should be a number of seconds since 1970 (RFC 7519 NumericDate), but it is ${describeClaimValue(v)}.`);
      continue;
    }
    const looksLikeMs = Math.abs(v) >= MS_THRESHOLD;
    times[name] = { name, seconds: v, looksLikeMs };
    if (looksLikeMs) {
      const asMs = isoDay(v);
      warnings.push(
        `"${name}" looks like milliseconds (${v}). JWT times are seconds since 1970, so as written it means ${describeAsSeconds(v)}; as milliseconds it would be ${asMs ?? 'a date outside the range of real dates'}.`,
      );
    }
  }

  const exp = times.exp && !times.exp.looksLikeMs ? times.exp.seconds * SECOND : undefined;
  const nbf = times.nbf && !times.nbf.looksLikeMs ? times.nbf.seconds * SECOND : undefined;
  const iat = times.iat && !times.iat.looksLikeMs ? times.iat.seconds * SECOND : undefined;
  if (iat !== undefined && iat > nowMs + 5 * MINUTE) warnings.push(`"iat" (issued at) is ${formatSpan(iat - nowMs)} in the future.`);
  if (exp !== undefined && nbf !== undefined && nbf >= exp) warnings.push('"nbf" is not before "exp", so this token is never active.');

  let status: JwtStatus;
  if (exp !== undefined && exp <= nowMs) status = { label: `Expired ${formatSpan(nowMs - exp)} ago`, tone: 'bad' };
  else if (nbf !== undefined && nbf > nowMs) status = { label: `Not active yet: starts in ${formatSpan(nbf - nowMs)}`, tone: 'warn' };
  else if (exp !== undefined) status = { label: `Not expired: expires in ${formatSpan(exp - nowMs)}`, tone: exp - nowMs < HOUR ? 'warn' : 'ok' };
  else if (times.exp?.looksLikeMs) status = { label: 'Expiry unclear: "exp" looks like milliseconds', tone: 'warn' };
  else if (notNumbers.has('exp')) status = { label: 'Expiry unclear: "exp" is not a number', tone: 'warn' };
  else status = { label: 'No expiry: this token has no "exp" claim', tone: 'warn' };

  return { ok: true, header: h, payload: p, signature: parts[2], alg, times, status, warnings, notes };
}

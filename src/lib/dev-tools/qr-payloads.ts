/**
 * QR code payload builders and capacity rules (DEVTOOLS-11/22).
 *
 * Phones only act on a QR code when its text follows a known format. These
 * builders produce the formats camera apps recognise (ZXing "Barcode
 * Contents" conventions): WIFI:, vCard 3.0, mailto: and SMSTO:.
 */

export type QrMode = 'text' | 'wifi' | 'vcard' | 'email' | 'sms';
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

// ---------------------------------------------------------------------------
// Wi-Fi
// ---------------------------------------------------------------------------

export interface WifiFields {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

/** Backslash-escape the characters that are special in a WIFI: payload. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export function buildWifi(f: WifiFields): string {
  let out = `WIFI:T:${f.security};S:${escapeWifi(f.ssid)};`;
  if (f.security !== 'nopass') out += `P:${escapeWifi(f.password)};`;
  if (f.hidden) out += 'H:true;';
  return out + ';';
}

/** Problems that would stop a phone joining; empty when the fields look usable. */
export function wifiProblems(f: WifiFields): string[] {
  const problems: string[] = [];
  if (!f.ssid) problems.push('Enter the network name (SSID).');
  if (f.security === 'WPA' && f.password && (f.password.length < 8 || f.password.length > 63)) {
    problems.push('WPA/WPA2/WPA3 passwords are 8 to 63 characters long.');
  }
  if (f.security !== 'nopass' && !f.password) problems.push('Enter the network password, or choose "No password".');
  return problems;
}

// ---------------------------------------------------------------------------
// vCard
// ---------------------------------------------------------------------------

export interface VcardFields {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  website: string;
}

/** Escape a vCard 3.0 text value (RFC 2426 section 4). */
export function escapeVcard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildVcard(f: VcardFields): string {
  const first = f.firstName.trim();
  const last = f.lastName.trim();
  const full = [first, last].filter(Boolean).join(' ') || f.organization.trim();
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVcard(last)};${escapeVcard(first)};;;`, `FN:${escapeVcard(full)}`];
  if (f.organization.trim()) lines.push(`ORG:${escapeVcard(f.organization.trim())}`);
  if (f.title.trim()) lines.push(`TITLE:${escapeVcard(f.title.trim())}`);
  if (f.phone.trim()) lines.push(`TEL;TYPE=CELL:${escapeVcard(f.phone.trim())}`);
  if (f.email.trim()) lines.push(`EMAIL:${escapeVcard(f.email.trim())}`);
  if (f.website.trim()) lines.push(`URL:${escapeVcard(f.website.trim())}`);
  lines.push('END:VCARD');
  // vCard requires CRLF line endings.
  return lines.join('\r\n');
}

export function vcardProblems(f: VcardFields): string[] {
  const hasName = [f.firstName, f.lastName, f.organization].some((v) => v.trim());
  return hasName ? [] : ['Enter a name or an organisation.'];
}

// ---------------------------------------------------------------------------
// Email and SMS
// ---------------------------------------------------------------------------

export interface EmailFields {
  to: string;
  subject: string;
  body: string;
}

export function buildEmail(f: EmailFields): string {
  const params: string[] = [];
  if (f.subject) params.push(`subject=${encodeURIComponent(f.subject)}`);
  if (f.body) params.push(`body=${encodeURIComponent(f.body)}`);
  return `mailto:${f.to.trim()}${params.length ? `?${params.join('&')}` : ''}`;
}

export function emailProblems(f: EmailFields): string[] {
  if (!f.to.trim()) return ['Enter an email address.'];
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.to.trim()) ? [] : ['That email address does not look complete (name@example.com).'];
}

export interface SmsFields {
  phone: string;
  message: string;
}

export function buildSms(f: SmsFields): string {
  return `SMSTO:${f.phone.replace(/[^\d+]/g, '')}:${f.message}`;
}

export function smsProblems(f: SmsFields): string[] {
  return f.phone.replace(/[^\d]/g, '').length >= 3 ? [] : ['Enter a phone number.'];
}

// ---------------------------------------------------------------------------
// Capacity and sizing
// ---------------------------------------------------------------------------

/** Byte-mode capacity of the largest QR code (version 40) per error-correction level. */
export const BYTE_CAPACITY: Record<ErrorCorrection, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function capacityMessage(bytes: number, ec: ErrorCorrection, ecLabel: string): string | null {
  const max = BYTE_CAPACITY[ec];
  if (bytes <= max) return null;
  const lower = (['L', 'M', 'Q', 'H'] as ErrorCorrection[]).filter((l) => BYTE_CAPACITY[l] >= bytes);
  const suggestion = lower.length
    ? ` Shorten the content or choose ${lower[lower.length - 1] === 'L' ? 'Low' : lower[lower.length - 1] === 'M' ? 'Medium' : 'Quartile'} error correction (up to ${BYTE_CAPACITY[lower[lower.length - 1]].toLocaleString('en-US')} bytes).`
    : ' Shorten the content: no QR code can hold this much.';
  return `Too much data for one QR code: ${bytes.toLocaleString('en-US')} bytes, but the limit at ${ecLabel} error correction is ${max.toLocaleString('en-US')} bytes.${suggestion}`;
}

/** Minimum pixels per module for a PNG that phone cameras read reliably. */
export const MIN_PIXELS_PER_MODULE = 4;

/**
 * Pick a whole number of pixels per module close to the requested size.
 * Dense codes are enlarged rather than squeezed below the minimum.
 */
export function pngScale(modules: number, margin: number, target: number): { scale: number; size: number; enlarged: boolean } {
  const total = modules + 2 * margin;
  const fit = Math.floor(target / total);
  const scale = Math.max(MIN_PIXELS_PER_MODULE, fit);
  return { scale, size: scale * total, enlarged: fit < MIN_PIXELS_PER_MODULE };
}

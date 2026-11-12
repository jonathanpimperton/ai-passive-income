import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { computePercentage, formatNumber, cleanFloat } from './percentage';
import {
  buildWifi, escapeWifi, wifiProblems, buildVcard, escapeVcard, vcardProblems, buildEmail, emailProblems, buildSms, smsProblems,
  BYTE_CAPACITY, utf8Length, capacityMessage, pngScale, MIN_PIXELS_PER_MODULE,
} from './qr-payloads';
import {
  entropyBits, poolSize, strengthFor, STRENGTH_LEVELS, crackSeconds, formatDuration, generatePassword, parseLength, enabledSets, type PasswordOptions,
} from './password';
import { decodeJwtToken, algInfo, formatSpan } from './jwt';
import { encodeUrl, decodeUrl } from './url-codec';
import { encodeText } from './base64';

describe('percentage (DEVTOOLS-10/23)', () => {
  it('reports 0 -> 50 as undefined, not "0% no change"', () => {
    const r = computePercentage('percentChange', 0, 50);
    expect(r.kind).toBe('undefined');
    if (r.kind === 'undefined') expect(r.reason).toMatch(/original value is 0.*infinite percentage increase/);
  });

  it('reports "5 is what % of 0" as undefined', () => {
    expect(computePercentage('xIsWhatPercent', 5, 0).kind).toBe('undefined');
  });

  it('treats 0 -> 0 as no change and handles ordinary changes', () => {
    expect(computePercentage('percentChange', 0, 0)).toEqual({ kind: 'value', value: 0, direction: 'none' });
    expect(computePercentage('percentChange', 52000, 58500)).toEqual({ kind: 'value', value: 12.5, direction: 'increase' });
    expect(computePercentage('percentChange', 150, 120)).toEqual({ kind: 'value', value: -20, direction: 'decrease' });
    expect(computePercentage('percentChange', -50, -25)).toEqual({ kind: 'value', value: 50, direction: 'increase' });
  });

  it('computes the other modes', () => {
    expect(computePercentage('whatIsXofY', 15, 200)).toEqual({ kind: 'value', value: 30 });
    expect(computePercentage('xIsWhatPercent', 42, 50)).toEqual({ kind: 'value', value: 84 });
    expect(computePercentage('percentDiff', 45, 52)).toEqual({ kind: 'value', value: cleanFloat((7 / 48.5) * 100) });
    expect(computePercentage('percentDiff', 0, 0)).toEqual({ kind: 'value', value: 0 });
  });

  it('removes floating-point noise and formats consistently', () => {
    const seven = computePercentage('whatIsXofY', 7, 100);
    expect(seven.kind === 'value' && seven.value).toBe(7);
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(30)).toBe('30');
    expect(formatNumber(15.3)).toBe('15.3');
    expect(formatNumber(1234.56789)).toBe('1,234.5679');
    expect(formatNumber(0.00001)).toBe('0.00001');
    const tiny = computePercentage('whatIsXofY', 0.001, 1);
    expect(tiny.kind === 'value' && formatNumber(tiny.value)).toBe('0.00001');
    expect(formatNumber(-0.5)).toBe('-0.5');
    expect(formatNumber(2e9)).toBe('2,000,000,000');
  });
});

describe('QR payloads (DEVTOOLS-11/22)', () => {
  it('builds the WIFI: format phones join from', () => {
    expect(buildWifi({ ssid: 'ConferenceWiFi', password: 'welcome2026', security: 'WPA', hidden: false })).toBe('WIFI:T:WPA;S:ConferenceWiFi;P:welcome2026;;');
    expect(buildWifi({ ssid: 'Cafe', password: '', security: 'nopass', hidden: true })).toBe('WIFI:T:nopass;S:Cafe;H:true;;');
  });

  it('escapes special characters in Wi-Fi fields', () => {
    expect(escapeWifi('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f');
    expect(buildWifi({ ssid: 'My;Net', password: 'p:ss', security: 'WPA', hidden: false })).toBe('WIFI:T:WPA;S:My\\;Net;P:p\\:ss;;');
  });

  it('checks Wi-Fi fields', () => {
    expect(wifiProblems({ ssid: '', password: 'x', security: 'WPA', hidden: false })).toContain('Enter the network name (SSID).');
    expect(wifiProblems({ ssid: 'a', password: 'short', security: 'WPA', hidden: false })[0]).toMatch(/8 to 63/);
    expect(wifiProblems({ ssid: 'a', password: 'longenough', security: 'WPA', hidden: false })).toEqual([]);
  });

  it('builds a vCard 3.0 with a VERSION line and CRLF endings', () => {
    const card = buildVcard({ firstName: 'Jane', lastName: 'Smith', organization: 'Acme, Inc.', title: '', phone: '+15551234567', email: 'jane@example.com', website: '' });
    expect(card).toBe(
      ['BEGIN:VCARD', 'VERSION:3.0', 'N:Smith;Jane;;;', 'FN:Jane Smith', 'ORG:Acme\\, Inc.', 'TEL;TYPE=CELL:+15551234567', 'EMAIL:jane@example.com', 'END:VCARD'].join('\r\n'),
    );
    expect(escapeVcard('a;b\nc')).toBe('a\\;b\\nc');
    expect(vcardProblems({ firstName: '', lastName: '', organization: '', title: '', phone: '1', email: '', website: '' })).toHaveLength(1);
  });

  it('builds email and SMS payloads', () => {
    expect(buildEmail({ to: 'a@b.co', subject: 'Hi there', body: 'Line 1\nLine 2' })).toBe('mailto:a@b.co?subject=Hi%20there&body=Line%201%0ALine%202');
    expect(buildEmail({ to: 'a@b.co', subject: '', body: '' })).toBe('mailto:a@b.co');
    expect(emailProblems({ to: 'nope', subject: '', body: '' })).toHaveLength(1);
    expect(buildSms({ phone: '+1 (555) 123-4567', message: 'On my way' })).toBe('SMSTO:+15551234567:On my way');
    expect(smsProblems({ phone: '', message: 'x' })).toHaveLength(1);
  });

  it('measures capacity in bytes per error-correction level', () => {
    expect(BYTE_CAPACITY).toEqual({ L: 2953, M: 2331, Q: 1663, H: 1273 });
    expect(utf8Length('caf' + String.fromCharCode(0xe9))).toBe(5);
    expect(capacityMessage(1000, 'H', 'High')).toBeNull();
    expect(capacityMessage(2000, 'H', 'High')).toMatch(/limit at High error correction is 1,273 bytes.*Medium error correction \(up to 2,331 bytes\)/);
    expect(capacityMessage(3000, 'L', 'Low')).toMatch(/no QR code can hold this much/);
  });

  it('never squeezes modules below the minimum pixel size', () => {
    expect(pngScale(21, 2, 256)).toEqual({ scale: 10, size: 250, enlarged: false });
    const dense = pngScale(177, 2, 128);
    expect(dense.scale).toBe(MIN_PIXELS_PER_MODULE);
    expect(dense.size).toBe(MIN_PIXELS_PER_MODULE * 181);
    expect(dense.enlarged).toBe(true);
  });
});

describe('password strength (DEVTOOLS-03/27)', () => {
  const opts = (o: Partial<PasswordOptions>): PasswordOptions => ({ length: 16, uppercase: true, lowercase: true, numbers: true, special: true, excludeAmbiguous: false, ...o });

  it('rates 8 lowercase letters as very weak, not "Good"', () => {
    const o = opts({ length: 8, uppercase: false, numbers: false, special: false });
    expect(Math.round(entropyBits(o))).toBe(38);
    expect(strengthFor(entropyBits(o)).label).toBe('Very weak');
  });

  it('agrees with the page table bands', () => {
    expect(strengthFor(entropyBits(opts({ length: 10 }))).label).toBe('Moderate'); // ~64.6 bits
    expect(strengthFor(entropyBits(opts({ length: 16 }))).label).toBe('Very strong'); // ~103 bits
    expect(strengthFor(entropyBits(opts({ length: 20, uppercase: false, numbers: false, special: false }))).label).toBe('Strong'); // ~94 bits
    expect(STRENGTH_LEVELS.map((l) => l.min)).toEqual([0, 40, 60, 80, 100]);
  });

  it('counts the pool, with and without ambiguous characters', () => {
    expect(poolSize(opts({}))).toBe(88);
    expect(poolSize(opts({ excludeAmbiguous: true }))).toBe(88 - 7);
    expect(enabledSets(opts({ uppercase: false, lowercase: false, numbers: false, special: false }))).toEqual([]);
  });

  it('formats crack times', () => {
    expect(formatDuration(0.5)).toBe('less than a second');
    expect(formatDuration(crackSeconds(40))).toBe('11 seconds');
    expect(formatDuration(crackSeconds(59))).toBe('67 days');
    expect(formatDuration(crackSeconds(60))).toBe('133 days');
    expect(formatDuration(crackSeconds(79))).toBe('192,000 years');
    expect(formatDuration(crackSeconds(80))).toBe('383,000 years');
    expect(formatDuration(crackSeconds(99))).toBe('201 billion years');
    expect(formatDuration(crackSeconds(100))).toBe('402 billion years');
  });

  it('keeps the password page figures in step with the meter', () => {
    const md = fs.readFileSync(path.resolve(__dirname, '../../data/tools/password-generator.md'), 'utf8');
    const eight = formatDuration(crackSeconds(entropyBits(opts({ length: 8 }))));
    const twelve = formatDuration(crackSeconds(entropyBits(opts({ length: 12 }))));
    expect(md).toContain(eight);
    expect(md).toContain(twelve);
    for (const l of STRENGTH_LEVELS) expect(md).toContain(`| ${l.label} |`);
    for (const bits of [40, 59, 60, 79, 80, 99, 100]) expect(md).toContain(formatDuration(crackSeconds(bits)));
    expect(md).toContain(`about ${Math.round(entropyBits(opts({ length: 20 })))} bits`);
  });

  it('generates passwords with every enabled character type', () => {
    let seed = 1;
    const rand = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    for (let i = 0; i < 200; i++) {
      const pw = generatePassword(opts({ length: 8 }), rand);
      expect(pw).toHaveLength(8);
      expect(/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)).toBe(true);
    }
    expect(generatePassword(opts({ excludeAmbiguous: true, length: 64 }), rand)).not.toMatch(/[0OoIl1|]/);
  });

  it('parses the length box without clamping mid-typing surprises', () => {
    expect(parseLength('20')).toBe(20);
    expect(parseLength('2')).toBe(8);
    expect(parseLength('999')).toBe(128);
    expect(parseLength('')).toBeNull();
    expect(parseLength('abc')).toBeNull();
  });
});

describe('JWT decoding (DEVTOOLS-15)', () => {
  const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
  const s = Math.floor(NOW / 1000);
  const b64 = (o: unknown) => encodeText(JSON.stringify(o), { urlSafe: true });
  const token = (payload: unknown, header: unknown = { alg: 'HS256', typ: 'JWT' }, sig = 'c2ln') => `${b64(header)}.${b64(payload)}.${sig}`;

  it('never calls a future-nbf token valid', () => {
    const r = decodeJwtToken(token({ exp: s + 59 * 86400, nbf: s + 2 * 86400 }), NOW);
    expect(r.ok && r.status).toEqual({ label: 'Not active yet: starts in 2 days', tone: 'warn' });
  });

  it('labels expiry without implying the signature was checked', () => {
    const live = decodeJwtToken(token({ exp: s + 59 * 86400 }), NOW);
    expect(live.ok && live.status.label).toBe('Not expired: expires in 59 days');
    const dead = decodeJwtToken(token({ exp: s - 3 * 86400 }), NOW);
    expect(dead.ok && dead.status).toEqual({ label: 'Expired 3 days ago', tone: 'bad' });
    const none = decodeJwtToken(token({ sub: 'x' }), NOW);
    expect(none.ok && none.status.label).toMatch(/No expiry/);
  });

  it('warns about unsigned tokens', () => {
    const r = decodeJwtToken(token({ sub: 'x' }, { alg: 'none' }, ''), NOW);
    expect(r.ok && r.warnings[0]).toMatch(/unsigned \(alg: none\)/);
  });

  it('names the right verification key per algorithm', () => {
    expect(algInfo('RS256').verifyWith).toMatch(/public key/);
    expect(algInfo('ES256').verifyWith).toMatch(/public key/);
    expect(algInfo('HS256').verifyWith).toMatch(/shared secret/);
  });

  it('spots millisecond timestamps', () => {
    const r = decodeJwtToken(token({ exp: NOW + 86400000 }), NOW);
    expect(r.ok && r.warnings.join(' ')).toMatch(/looks like milliseconds/);
    expect(r.ok && r.status.label).toMatch(/Expiry unclear/);
  });

  it('accepts a Bearer prefix and line breaks', () => {
    const r = decodeJwtToken(`Bearer ${token({ sub: '1' })}`, NOW);
    expect(r.ok && r.notes[0]).toMatch(/Bearer/);
    expect(r.ok && r.payload.sub).toBe('1');
  });

  it('explains JWE and malformed input', () => {
    const jwe = decodeJwtToken(`${b64({ alg: 'RSA-OAEP', enc: 'A256GCM' })}.a.b.c.d`, NOW);
    expect(!jwe.ok && jwe.error).toMatch(/encrypted token \(JWE: 5 parts, encryption A256GCM\)/);
    expect(!decodeJwtToken('a.b', NOW).ok).toBe(true);
    const badB64 = decodeJwtToken('ab!c.def.ghi', NOW);
    expect(!badB64.ok && badB64.error).toMatch(/header is not valid Base64URL/);
    const notJson = decodeJwtToken(`${encodeText('hello', { urlSafe: true })}.x.y`, NOW);
    expect(!notJson.ok && notJson.error).toMatch(/not JSON/);
  });

  it('formats time spans', () => {
    expect(formatSpan(90 * 1000)).toBe('1m');
    expect(formatSpan(5 * 3600 * 1000 + 20 * 60 * 1000)).toBe('5h 20m');
    expect(formatSpan(3 * 86400 * 1000)).toBe('3 days');
    expect(formatSpan(800 * 86400 * 1000)).toBe('2 years');
  });
});

describe('URL encoding (DEVTOOLS-28)', () => {
  it('encodes in both modes and optionally writes spaces as +', () => {
    expect(encodeUrl('a b&c', 'component')).toEqual({ ok: true, value: 'a%20b%26c' });
    expect(encodeUrl('a b&c', 'component', true)).toEqual({ ok: true, value: 'a+b%26c' });
    expect(encodeUrl('https://x.com/a b?q=1', 'full')).toEqual({ ok: true, value: 'https://x.com/a%20b?q=1' });
  });

  it('decodes + as a space only when asked', () => {
    expect(decodeUrl('a+b%2Bc', 'component', true)).toEqual({ ok: true, value: 'a b+c' });
    expect(decodeUrl('a+b', 'component', false)).toEqual({ ok: true, value: 'a+b' });
  });

  it('explains malformed escapes with a position', () => {
    const lone = decodeUrl('100% sure', 'component');
    expect(!lone.ok && lone.error).toMatch(/Position 4: "% s" is not a valid escape/);
    const utf8 = decodeUrl('ok%E0%A4%A', 'component');
    expect(!utf8.ok && utf8.error).toMatch(/Position 9/);
    const broken = decodeUrl('x%E0%A4', 'component');
    expect(!broken.ok && broken.error).toMatch(/Position 2: "%E0%A4" is not valid UTF-8/);
  });

  it('explains unpaired surrogates when encoding', () => {
    const r = encodeUrl('a' + String.fromCharCode(0xd800), 'component');
    expect(!r.ok && r.error).toMatch(/Position 2/);
  });
});

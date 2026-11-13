/**
 * Guards the W1-FILES block in public/_headers (review FILES-01).
 *
 * The HEIC route re-sets a full Content-Security-Policy, so it must stay equal
 * to whatever the /tools/* policy is, plus `worker-src 'self' blob:`. This
 * test reads the live file, so it keeps passing when the /tools/* line is
 * changed and fails as soon as the two drift apart.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface Rule { pattern: string; set: Array<[string, string]>; detach: string[] }

function parseHeaders(text: string): Rule[] {
  const rules: Rule[] = [];
  let cur: Rule | null = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { cur = { pattern: raw.trim(), set: [], detach: [] }; rules.push(cur); continue; }
    if (!cur) continue;
    const line = raw.trim();
    if (line.startsWith('!')) { cur.detach.push(line.slice(1).trim().toLowerCase()); continue; }
    const i = line.indexOf(':');
    cur.set.push([line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim()]);
  }
  return rules;
}

/** Cloudflare semantics: values from every matching rule accumulate; "! Name" detaches earlier ones. */
function headersFor(rules: Rule[], urlPath: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const r of rules) {
    const re = new RegExp(`^${r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    if (!re.test(urlPath)) continue;
    for (const d of r.detach) delete out[d];
    for (const [k, v] of r.set) (out[k] ??= []).push(v);
  }
  return out;
}

const normalise = (csp: string) => csp.split(';').map((d) => d.trim().replace(/\s+/g, ' ')).filter(Boolean).join('; ');

const rules = parseHeaders(fs.readFileSync(path.resolve(__dirname, '../../../public/_headers'), 'utf8'));
const HEIC = '/tools/file-tools/heic-to-jpg/*';

describe('public/_headers HEIC route', () => {
  it('has exactly one HEIC block that detaches and re-sets the CSP', () => {
    const blocks = rules.filter((r) => r.pattern === HEIC);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].detach).toContain('content-security-policy');
    expect(blocks[0].set.filter(([k]) => k === 'content-security-policy')).toHaveLength(1);
  });

  it('equals the /tools/* policy plus worker-src for the heic-to blob worker', () => {
    const toolsCsp = headersFor(rules, '/tools/file-tools/svg-to-png/')['content-security-policy'];
    expect(toolsCsp).toHaveLength(1);
    const heicCsp = headersFor(rules, '/tools/file-tools/heic-to-jpg/')['content-security-policy'];
    expect(heicCsp).toHaveLength(1); // detached: no second, stricter policy is sent alongside
    expect(normalise(heicCsp[0])).toBe(normalise(`${toolsCsp[0]}; worker-src 'self' blob:`));
  });

  it('does not loosen anything else (no unsafe-eval)', () => {
    const heicCsp = headersFor(rules, '/tools/file-tools/heic-to-jpg/')['content-security-policy'][0];
    expect(heicCsp).not.toMatch(/unsafe-eval/);
  });
});

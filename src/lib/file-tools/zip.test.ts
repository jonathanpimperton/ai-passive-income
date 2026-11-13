import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { buildZip, sanitiseEntryName } from './zip';

describe('buildZip (FILES-09)', () => {
  it('round-trips entries and de-duplicates names', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    const zip = buildZip([
      { name: 'page_1.pdf', data: a },
      { name: 'page_1.pdf', data: b },
      { name: '../evil/x.jpg', data: a },
    ]);
    const out = unzipSync(zip);
    expect(Object.keys(out).sort()).toEqual(['.._evil_x.jpg', 'page_1 (2).pdf', 'page_1.pdf'].sort());
    expect(Array.from(out['page_1.pdf'])).toEqual([1, 2, 3]);
    expect(Array.from(out['page_1 (2).pdf'])).toEqual([4, 5]);
  });

  it('handles 500 entries in one archive', () => {
    const entries = Array.from({ length: 500 }, (_, i) => ({ name: `doc_page${i + 1}.pdf`, data: new Uint8Array([i & 255]) }));
    const out = unzipSync(buildZip(entries));
    expect(Object.keys(out)).toHaveLength(500);
  });

  it('sanitises entry names', () => {
    expect(sanitiseEntryName('a/b\\c.txt')).toBe('a_b_c.txt');
    expect(sanitiseEntryName('..')).toBe('file');
    expect(sanitiseEntryName('\u0000\u0001')).toBe('file');
    expect(sanitiseEntryName('東京.jpg')).toBe('東京.jpg');
  });
});

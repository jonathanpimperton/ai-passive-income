import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { findKey, selectUrls, redirectSourcesAddedSince } from '../../scripts/indexnow-submit.mjs';

const ROOT = resolve(__dirname, '../..');

describe('IndexNow key file (SE-5)', () => {
  it('has exactly one key file in public/ whose content is its own name', () => {
    const key = findKey(join(ROOT, 'public'));
    expect(key).toMatch(/^[a-f0-9]{32}$/);
    expect(readFileSync(join(ROOT, 'public', `${key}.txt`), 'utf8').trim()).toBe(key);
  });
});

describe('selectUrls', () => {
  const sitemapUrls = [
    { loc: 'https://www.calcrun.com/a/', lastmod: '2026-07-07' },
    { loc: 'https://www.calcrun.com/b/', lastmod: '2026-11-10' },
    { loc: 'https://www.calcrun.com/c/', lastmod: '2026-11-12' },
    { loc: 'https://www.calcrun.com/d/', lastmod: null },
  ];

  it('selects URLs changed on or after the commit date', () => {
    const sel = selectUrls({ sitemapUrls, sinceDate: '2026-11-10' });
    expect(sel.urls).toEqual(['https://www.calcrun.com/b/', 'https://www.calcrun.com/c/']);
    expect(sel.undated).toEqual(['https://www.calcrun.com/d/']);
  });

  it('adds undated URLs only on request, and newly redirected sources', () => {
    const sel = selectUrls({ sitemapUrls, sinceDate: '2026-11-11', includeUndated: true, redirectSources: ['/old/', '/old/'] });
    expect(sel.urls).toEqual(['https://www.calcrun.com/c/', 'https://www.calcrun.com/d/', 'https://www.calcrun.com/old/']);
    expect(sel.moved).toEqual(['https://www.calcrun.com/old/']);
  });
});

describe('redirectSourcesAddedSince', () => {
  it('reads added rule sources from a diff, skipping comments, wildcards and removals', () => {
    const diff = [
      '--- a/public/_redirects',
      '+++ b/public/_redirects',
      '+# a comment',
      '+/scenarios/old-page/ /scenarios/hub/#row 301',
      '+/blog/* /comparisons/ 301',
      '-/removed/ / 301',
      ' /context/ / 301',
    ].join('\n');
    expect(redirectSourcesAddedSince(diff)).toEqual(['/scenarios/old-page/']);
  });
});

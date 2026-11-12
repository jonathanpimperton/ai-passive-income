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

  // What the --since commit's tree would have put in the sitemap.
  const oldMap = new Map([
    ['/a/', '2026-07-07'], // unchanged
    ['/b/', '2026-07-07'], // lastmod moved
    ['/d/', '2026-07-07'], // now undated (e.g. shallow build)
    ['/gone/', '2026-07-07'], // no longer in the sitemap
  ]);

  it('submits new, changed and removed URLs, not unchanged ones', () => {
    const sel = selectUrls({ sitemapUrls, oldMap });
    expect(sel.added).toEqual(['https://www.calcrun.com/c/']);
    expect(sel.changed).toEqual(['https://www.calcrun.com/b/']);
    expect(sel.removed).toEqual(['https://www.calcrun.com/gone/']);
    expect(sel.undated).toEqual(['https://www.calcrun.com/d/']);
    expect(sel.urls).toEqual(['https://www.calcrun.com/b/', 'https://www.calcrun.com/c/', 'https://www.calcrun.com/gone/']);
  });

  it('adds undated URLs only on request, and newly redirected sources', () => {
    const sel = selectUrls({ sitemapUrls, oldMap, includeUndated: true, redirectSources: ['/old/', '/old/'] });
    expect(sel.urls).toContain('https://www.calcrun.com/d/');
    expect(sel.moved).toEqual(['https://www.calcrun.com/old/']);
    expect(sel.urls.filter((u) => u.endsWith('/old/'))).toHaveLength(1);
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

describe('selectUrls --all', () => {
  it('includes every current sitemap URL once', () => {
    const sitemapUrls = [
      { loc: 'https://www.calcrun.com/a/', lastmod: '2026-07-07' },
      { loc: 'https://www.calcrun.com/b/', lastmod: '2026-11-12' },
    ];
    const oldMap = new Map([['/a/', '2026-07-07'], ['/b/', '2026-07-07']]);
    const sel = selectUrls({ sitemapUrls, oldMap, all: true });
    expect(sel.urls).toEqual(['https://www.calcrun.com/a/', 'https://www.calcrun.com/b/']);
    expect(sel.changed).toEqual(['https://www.calcrun.com/b/']);
  });
});

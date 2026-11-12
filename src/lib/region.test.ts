import { describe, it, expect } from 'vitest';
import {
  detectRegion,
  detectRegionFrom,
  defaultCurrencyFor,
  consentRequired,
  REGION_INLINE_JS,
  REGION_TABLES,
  type Region,
} from './region';

describe('detectRegionFrom: time zone decides', () => {
  const cases: Array<[string, Region]> = [
    ['Europe/London', 'UK'],
    ['Europe/Belfast', 'UK'],
    ['Europe/Jersey', 'UK'],
    ['Europe/Guernsey', 'UK'],
    ['Europe/Isle_of_Man', 'UK'],
    ['GB', 'UK'],
    ['Europe/Paris', 'EEA'],
    ['Europe/Berlin', 'EEA'],
    ['Europe/Dublin', 'EEA'],
    ['Europe/Zurich', 'EEA'],
    ['Europe/Oslo', 'EEA'],
    ['Europe/Vaduz', 'EEA'],
    ['Europe/Busingen', 'EEA'],
    ['Europe/Mariehamn', 'EEA'],
    ['Atlantic/Canary', 'EEA'],
    ['Atlantic/Madeira', 'EEA'],
    ['Atlantic/Azores', 'EEA'],
    ['Atlantic/Reykjavik', 'EEA'],
    ['Arctic/Longyearbyen', 'EEA'],
    ['Africa/Ceuta', 'EEA'],
    ['Asia/Nicosia', 'EEA'],
    ['Asia/Famagusta', 'EEA'],
    ['Indian/Reunion', 'EEA'],
    ['America/Cayenne', 'EEA'],
    ['Europe/Kyiv', 'EEA'], // conservative fallback: any other Europe/* zone
    ['Europe/Istanbul', 'EEA'],
    ['Europe/Gibraltar', 'EEA'],
    ['America/New_York', 'US'],
    ['America/Chicago', 'US'],
    ['America/Denver', 'US'],
    ['America/Phoenix', 'US'],
    ['America/Los_Angeles', 'US'],
    ['America/Anchorage', 'US'],
    ['America/Indiana/Knox', 'US'],
    ['America/Kentucky/Louisville', 'US'],
    ['America/North_Dakota/Beulah', 'US'],
    ['Pacific/Honolulu', 'US'],
    ['US/Eastern', 'US'],
    ['America/Puerto_Rico', 'US'],
    ['America/Toronto', 'OTHER'],
    ['America/Mexico_City', 'OTHER'],
    ['America/Sao_Paulo', 'OTHER'],
    ['Asia/Tokyo', 'OTHER'],
    ['Australia/Sydney', 'OTHER'],
    ['Africa/Lagos', 'OTHER'],
  ];
  it.each(cases)('%s -> %s', (tz, expected) => {
    // Languages must not override a decisive zone.
    expect(detectRegionFrom(tz, ['de-DE'])).toBe(expected);
    expect(detectRegionFrom(tz, ['en-US'])).toBe(expected);
  });
});

describe('detectRegionFrom: language tie-break for generic zones', () => {
  const cases: Array<[string, string[], Region]> = [
    ['UTC', ['en-GB', 'en'], 'UK'],
    ['UTC', ['en-US'], 'US'],
    ['UTC', ['de'], 'EEA'],
    ['UTC', ['de-AT'], 'EEA'],
    ['UTC', ['en-IE'], 'EEA'],
    ['UTC', ['fr-CH'], 'EEA'],
    ['UTC', ['fr'], 'OTHER'], // fr alone is not decisive (Canada, Africa)...
    ['UTC', ['fr', 'fr-FR'], 'EEA'], // ...but a later decisive tag is used
    ['UTC', ['en'], 'OTHER'],
    ['UTC', ['en-CA', 'de-DE'], 'OTHER'], // first decisive tag wins
    ['Etc/GMT+5', ['en-US'], 'US'],
    ['Etc/UTC', ['pl'], 'EEA'],
    ['', ['en_GB'], 'UK'], // underscore variant
    ['', ['zh-Hant-TW'], 'OTHER'],
    ['', ['sr-Latn-RS'], 'OTHER'],
    ['', ['es-419'], 'OTHER'],
    ['', [], 'OTHER'],
    ['', ['', 'garbage!!'], 'OTHER'],
  ];
  it.each(cases)('%s + %j -> %s', (tz, langs, expected) => {
    expect(detectRegionFrom(tz, langs)).toBe(expected);
  });

  it('tolerates null/undefined inputs', () => {
    expect(detectRegionFrom(null, null)).toBe('OTHER');
    expect(detectRegionFrom(undefined, ['en-GB'])).toBe('UK');
  });
});

describe('every IANA zone this runtime knows maps to a region', () => {
  const zones: string[] = Intl.supportedValuesOf('timeZone');
  it('has a non-trivial zone list', () => expect(zones.length).toBeGreaterThan(300));

  it('only Europe/London-family zones are UK', () => {
    const uk = zones.filter((z) => detectRegionFrom(z, []) === 'UK');
    for (const z of uk) expect(REGION_TABLES.uk).toContain(z);
    expect(uk).toContain('Europe/London');
  });

  it('every Europe/* zone except the UK family is EEA (conservative)', () => {
    for (const z of zones.filter((x) => x.startsWith('Europe/'))) {
      const r = detectRegionFrom(z, []);
      expect(r === 'EEA' || REGION_TABLES.uk.includes(z), z).toBe(true);
    }
  });

  it('no Asia/Africa/Australia zone is UK or US', () => {
    for (const z of zones.filter((x) => /^(Asia|Africa|Australia)\//.test(x))) {
      expect(['EEA', 'OTHER'], z).toContain(detectRegionFrom(z, []));
    }
  });
});

describe('REGION_INLINE_JS (head-script twin)', () => {
  /** Evaluate the inline script exactly as a classic script would, with mocked globals. */
  function runInline(tz: string | (() => never), langs: string[] | undefined, language = ''): unknown {
    const win: Record<string, unknown> = {};
    const fakeIntl = {
      DateTimeFormat: () => ({
        resolvedOptions: () => {
          if (typeof tz === 'function') return tz();
          return { timeZone: tz };
        },
      }),
    };
    const nav = { languages: langs, language };
    new Function('window', 'Intl', 'navigator', REGION_INLINE_JS)(win, fakeIntl, nav);
    return win.calcrunRegion;
  }

  it('agrees with detectRegionFrom for every IANA zone x language sample', () => {
    const zones = [...Intl.supportedValuesOf('timeZone'), 'UTC', 'Etc/UTC', '', 'GB', 'US/Pacific', 'Eire'];
    const langSets = [[], ['en-GB'], ['en-US'], ['de'], ['fr-CA', 'fr'], ['en']];
    let checked = 0;
    for (const z of zones) {
      for (const l of langSets) {
        expect(runInline(z, l), `${z} ${JSON.stringify(l)}`).toBe(detectRegionFrom(z, l));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1800);
  });

  it('falls back to navigator.language when navigator.languages is empty', () => {
    expect(runInline('UTC', [], 'en-GB')).toBe('UK');
    expect(runInline('UTC', undefined, 'de-DE')).toBe('EEA');
  });

  it('survives Intl throwing', () => {
    const thrower = () => {
      throw new Error('no Intl');
    };
    expect(runInline(thrower, ['en-GB'])).toBe('UK');
  });

  it('does not overwrite an existing value and stays small', () => {
    const win: Record<string, unknown> = { calcrunRegion: 'US' };
    new Function('window', 'Intl', 'navigator', REGION_INLINE_JS)(
      win,
      { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Europe/Paris' }) }) },
      { languages: [] },
    );
    expect(win.calcrunRegion).toBe('US');
    // A truthy non-string (e.g. a DOM element exposed by id) is replaced, not trusted.
    const win2: Record<string, unknown> = { calcrunRegion: { tagName: 'DIV' } };
    new Function('window', 'Intl', 'navigator', REGION_INLINE_JS)(
      win2,
      { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Europe/Paris' }) }) },
      { languages: [] },
    );
    expect(win2.calcrunRegion).toBe('EEA');
    expect(REGION_INLINE_JS.length).toBeLessThan(4096);
    expect(REGION_INLINE_JS).not.toMatch(/__name|=>|`/); // no bundler helpers / modern syntax leaked
  });
});

describe('defaultCurrencyFor / consentRequired / detectRegion', () => {
  it('maps regions to currencies', () => {
    expect(defaultCurrencyFor('UK')).toBe('GBP');
    expect(defaultCurrencyFor('EEA')).toBe('EUR');
    expect(defaultCurrencyFor('US')).toBe('USD');
    expect(defaultCurrencyFor('OTHER')).toBe('USD');
  });
  it('requires consent in the EEA only (plan D1)', () => {
    expect(consentRequired('EEA')).toBe(true);
    expect(consentRequired('UK')).toBe(false);
    expect(consentRequired('US')).toBe(false);
    expect(consentRequired('OTHER')).toBe(false);
  });
  it('returns OTHER during SSR (no window)', () => {
    expect(detectRegion()).toBe('OTHER');
  });
});

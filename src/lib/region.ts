/**
 * Client-side visitor region detection (plan decision D5).
 *
 * Used for two things only:
 * 1. the DEFAULT display currency when the visitor has no stored choice
 *    (a stored choice always wins; the currency selector stays), and
 * 2. whether analytics must wait for consent (plan decision D1: EEA + CH are
 *    consent-first; UK, US and everywhere else keep the July default).
 *
 * Signals: the browser's IANA time zone, with navigator.languages as a
 * tie-break only when the zone is generic (UTC/Etc/missing -- privacy
 * browsers report UTC). No IP lookup, no server, no storage.
 *
 * Mapping
 * - UK: Europe/London and its Crown-dependency / legacy aliases.
 * - EEA (EU + EEA + Switzerland): every other `Europe/*` zone (a deliberately
 *   conservative fallback: Kyiv, Istanbul, Gibraltar etc. are treated as
 *   consent-first too) plus the EU/EEA zones outside the Europe/ prefix
 *   (Canaries, Madeira, Azores, Ceuta, Cyprus, Iceland, Svalbard, the French
 *   outermost regions) and legacy aliases.
 * - US: the US's America/* zones, Hawaii, US territories and legacy aliases.
 * - OTHER: everything else.
 *
 * Usage note: detectRegion() returns 'OTHER' during SSR, so call it in an
 * effect (or event handler), never for a component's initial render state,
 * or the hydrated markup will not match the server markup.
 *
 * One source, two runtimes: `regionCore` below is self-contained (no outer
 * references, no nested functions), so the head-script string
 * `REGION_INLINE_JS` is built from `regionCore.toString()` plus the same
 * tables. A test evaluates both over every IANA zone and asserts they agree.
 */

export type Region = 'UK' | 'EEA' | 'US' | 'OTHER';

export interface RegionTables {
  uk: string[];
  us: string[];
  usPrefix: string[];
  eea: string[];
  generic: string[];
  eeaCountry: string[];
  eeaLang: string[];
}

export const REGION_TABLES: RegionTables = {
  uk: ['Europe/London', 'Europe/Belfast', 'Europe/Guernsey', 'Europe/Jersey', 'Europe/Isle_of_Man', 'GB', 'GB-Eire'],
  us: [
    'America/New_York', 'America/Detroit', 'America/Chicago', 'America/Menominee', 'America/Denver',
    'America/Boise', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'America/Juneau',
    'America/Sitka', 'America/Metlakatla', 'America/Yakutat', 'America/Nome', 'America/Adak',
    'Pacific/Honolulu', 'Pacific/Johnston',
    // Legacy aliases
    'America/Fort_Wayne', 'America/Indianapolis', 'America/Knox_IN', 'America/Louisville',
    'America/Shiprock', 'America/Atka', 'Navajo', 'EST5EDT', 'CST6CDT', 'MST7MDT', 'PST8PDT',
    // Territories (USD)
    'America/Puerto_Rico', 'America/St_Thomas', 'America/Virgin', 'Pacific/Guam', 'Pacific/Saipan',
    'Pacific/Pago_Pago', 'Pacific/Samoa',
  ],
  usPrefix: ['US/', 'America/Indiana/', 'America/Kentucky/', 'America/North_Dakota/'],
  // EU/EEA/CH zones OUTSIDE the Europe/ prefix (all Europe/* non-UK zones are EEA by rule).
  eea: [
    'Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores', 'Africa/Ceuta',
    'Atlantic/Reykjavik', 'Iceland', 'Arctic/Longyearbyen', 'Atlantic/Jan_Mayen',
    'Asia/Nicosia', 'Asia/Famagusta',
    'Indian/Reunion', 'Indian/Mayotte', 'America/Guadeloupe', 'America/Martinique',
    'America/Cayenne', 'America/Marigot',
    'Eire', 'Poland', 'Portugal', 'CET', 'EET', 'MET', 'WET',
  ],
  // Zones that say nothing about where the visitor is.
  generic: ['UTC', 'UCT', 'GMT', 'GMT0', 'GMT+0', 'GMT-0', 'Greenwich', 'Universal', 'Zulu'],
  // ISO 3166 codes of EU + EEA + CH states, for language tags like de-AT.
  eeaCountry: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
    'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH',
  ],
  // Region-less language tags whose speakers are overwhelmingly in the EEA/CH.
  // en, es, fr and pt are deliberately absent (spoken widely outside Europe).
  eeaLang: [
    'de', 'it', 'nl', 'pl', 'sv', 'da', 'fi', 'el', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et',
    'lv', 'lt', 'mt', 'ga', 'is', 'nb', 'nn', 'no', 'lb',
  ],
};

/**
 * Pure mapping from (time zone, languages) to a region.
 *
 * MUST stay self-contained: it is serialised with toString() into the head
 * script. No references to anything outside its parameters, no nested or
 * arrow functions (bundlers may wrap those in helpers), ES5 syntax only.
 */
export function regionCore(tz: string, langs: readonly string[], t: RegionTables): Region {
  var zone = tz ? String(tz) : '';
  var i;
  if (t.uk.indexOf(zone) >= 0) return 'UK';
  if (t.us.indexOf(zone) >= 0) return 'US';
  for (i = 0; i < t.usPrefix.length; i++) {
    if (zone.indexOf(t.usPrefix[i]) === 0) return 'US';
  }
  if (t.eea.indexOf(zone) >= 0 || zone.indexOf('Europe/') === 0) return 'EEA';
  if (zone !== '' && t.generic.indexOf(zone) < 0 && zone.indexOf('Etc/') !== 0) return 'OTHER';

  // Generic or missing zone: fall back to the language list, first decisive tag wins.
  for (i = 0; i < langs.length; i++) {
    var m = /^([a-z]{2,3})(?:[-_][a-z]{4})?(?:[-_]([a-z]{2}|\d{3}))?(?:[-_]|$)/i.exec(String(langs[i] || ''));
    if (!m) continue;
    var cc = m[2] ? m[2].toUpperCase() : '';
    if (cc) {
      if (cc === 'GB') return 'UK';
      if (cc === 'US') return 'US';
      return t.eeaCountry.indexOf(cc) >= 0 ? 'EEA' : 'OTHER';
    }
    if (t.eeaLang.indexOf(m[1].toLowerCase()) >= 0) return 'EEA';
  }
  return 'OTHER';
}

/** Region for explicit inputs (testable, SSR-safe). */
export function detectRegionFrom(tz: string | null | undefined, langs: readonly string[] | null | undefined): Region {
  return regionCore(tz || '', langs || [], REGION_TABLES);
}

/** Region of the current browser. Returns 'OTHER' during SSR or if the APIs are unavailable. */
export function detectRegion(): Region {
  if (typeof window === 'undefined') return 'OTHER';
  let tz = '';
  let langs: readonly string[] = [];
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tz = ''; // Intl unavailable: fall through to the language tie-break.
  }
  try {
    langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  } catch {
    langs = []; // navigator unavailable: region becomes OTHER unless the zone decides.
  }
  return detectRegionFrom(tz, langs);
}

export type DefaultCurrency = 'GBP' | 'EUR' | 'USD';

/** Default display currency for a region: UK=GBP, EEA=EUR, else USD. */
export function defaultCurrencyFor(region: Region): DefaultCurrency {
  if (region === 'UK') return 'GBP';
  if (region === 'EEA') return 'EUR';
  return 'USD';
}

/** Whether analytics must wait for explicit consent (plan D1): EEA + CH only. */
export function consentRequired(region: Region): boolean {
  return region === 'EEA';
}

/**
 * Classic-script twin of detectRegion() for `is:inline` head scripts.
 * Sets (once) `window.calcrunRegion` to 'UK' | 'EEA' | 'US' | 'OTHER'.
 *
 * Usage in an .astro file:
 *   <script is:inline set:html={REGION_INLINE_JS} />
 *   ...later inline scripts read window.calcrunRegion.
 */
function buildRegionInlineJs(): string {
  return (
    // A typeof guard (not ||) so a DOM element with id="calcrunRegion" is never taken as the value.
    'window.calcrunRegion=typeof window.calcrunRegion==="string"?window.calcrunRegion:(function(){var tz="",l=[];' +
    'try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch(e){tz=""}' +
    'try{l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""]}catch(e){l=[]}' +
    `return(${regionCore.toString()})(tz,l,${JSON.stringify(REGION_TABLES)})})();`
  );
}

// Marked pure so bundles that only use detectRegion() can drop the ~2.7 KB string.
export const REGION_INLINE_JS: string = /* @__PURE__ */ buildRegionInlineJs();

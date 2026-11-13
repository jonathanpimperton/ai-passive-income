/**
 * Safety policy for the Markdown -> HTML tool.
 *
 * The preview renders HTML that came from text the visitor pasted, so it is
 * treated as untrusted. Three independent layers apply:
 *
 *  1. DOMPurify with an explicit allow-list (below). Only Markdown-shaped
 *     elements and attributes survive; SVG, MathML, forms, styles and every
 *     document-level element are removed. DOMPurify's string output is used
 *     as-is: it is never re-parsed and re-serialised by our own code.
 *  2. The preview is a separate document in an iframe with `sandbox=""`
 *     (no scripts, opaque origin, no navigation of the page, no popups, no
 *     forms). It cannot touch the CalcRun page even if layer 1 failed.
 *  3. A restrictive Content-Security-Policy <meta> inside that document.
 *
 * This module is pure configuration plus string helpers so it can be unit
 * tested without a DOM. The component wires it to DOMPurify in the browser.
 */
import type { Config, DOMPurify } from 'dompurify';

/** Elements a rendered Markdown document legitimately needs. */
export const ALLOWED_TAGS: readonly string[] = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'ins', 'kbd',
  'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'samp', 'small', 'span', 'strong',
  'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  'u', 'ul', 'var', 'wbr',
];

/** Attributes kept on those elements. No `style`, no event handlers, no ids. */
export const ALLOWED_ATTR: readonly string[] = [
  'href', 'src', 'alt', 'title', 'width', 'height', 'align', 'colspan', 'rowspan',
  'scope', 'headers', 'span', 'start', 'reversed', 'type', 'checked', 'disabled',
  'open', 'class', 'lang', 'dir', 'datetime',
];

/**
 * Belt and braces: explicitly forbidden even though none is in the allow-list.
 * `style`, `base`, `meta`, `form` and `link` are named by the fix plan.
 */
export const FORBID_TAGS: readonly string[] = [
  'style', 'base', 'meta', 'form', 'link', 'script', 'noscript', 'template',
  'iframe', 'frame', 'frameset', 'object', 'embed', 'svg', 'math', 'xmp',
  'noembed', 'noframes', 'plaintext', 'textarea', 'select', 'option', 'button',
  'title', 'audio', 'video', 'source', 'picture', 'portal', 'dialog', 'slot',
];

export const FORBID_ATTR: readonly string[] = [
  'style', 'srcset', 'srcdoc', 'formaction', 'action', 'xlink:href', 'ping',
  'background', 'poster', 'id', 'name', 'target',
];

/**
 * URLs allowed in href/src: http(s), mailto, tel, or a reference with no
 * scheme (relative path, fragment). Same shape as DOMPurify's default but
 * with fewer schemes. DOMPurify tests it after removing whitespace and
 * control characters, which defeats tab/newline-split schemes.
 */
export const SAFE_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/** Characters DOMPurify strips from an attribute value before the URI test. */
// eslint-disable-next-line no-control-regex
const ATTR_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;

/**
 * Mirrors DOMPurify's URI decision for a decoded attribute value, so the
 * regular expression above can be unit tested without a DOM.
 */
export function isAllowedUri(decodedValue: string): boolean {
  return SAFE_URI_REGEXP.test(decodedValue.replace(ATTR_WHITESPACE, ''));
}

/** The one DOMPurify configuration used for both the preview and the output. */
export const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: [...ALLOWED_ATTR],
  FORBID_TAGS: [...FORBID_TAGS],
  FORBID_ATTR: [...FORBID_ATTR],
  ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  ALLOW_SELF_CLOSE_IN_ATTR: false,
  SAFE_FOR_XML: true,
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

/** True for an image source the preview may display without a network request. */
export function isInlineImageSource(src: string): boolean {
  return /^data:image\/[a-z0-9.+-]+[;,]/i.test(src.replace(ATTR_WHITESPACE, ''));
}

/**
 * Preview-only adjustments, run by DOMPurify after it has sanitised each
 * element's attributes:
 * - links get target=_blank; the sandbox has no allow-popups, so clicking
 *   them does nothing instead of loading another site inside the page;
 * - remote images lose their src (no request leaves the browser) and are
 *   shown as their alt text;
 * - task-list inputs are forced to disabled checkboxes;
 * - URL attributes are kept only where they belong: href on links, src on
 *   images. Any other element loses them.
 */
export function installPreviewHooks(purify: DOMPurify): void {
  purify.addHook('afterSanitizeAttributes', (node) => {
    const tag = node.nodeName.toLowerCase();
    if (tag === 'a') {
      if (node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    } else if (tag === 'img') {
      const src = node.getAttribute('src');
      if (src !== null && !isInlineImageSource(src)) {
        node.removeAttribute('src');
        node.setAttribute('data-blocked', 'remote');
      }
      if (!node.getAttribute('alt')) node.setAttribute('alt', 'Image');
    } else if (tag === 'input') {
      node.setAttribute('type', 'checkbox');
      node.setAttribute('disabled', '');
    }
    if (tag !== 'a') node.removeAttribute('href');
    if (tag !== 'img') node.removeAttribute('src');
  });
}

/**
 * Sanitise with a DOMPurify instance, failing closed. DOMPurify returns its
 * input unchanged when the environment has no usable DOM; we refuse instead.
 */
export function sanitizeHtml(purify: DOMPurify, html: string): { html: string; removed: RemovedSummary } {
  if (!purify.isSupported) {
    throw new Error('HTML sanitiser is unavailable in this browser');
  }
  const clean = purify.sanitize(html, PURIFY_CONFIG);
  if (typeof clean !== 'string') throw new Error('HTML sanitiser returned an unexpected result');
  return { html: clean, removed: summarizeRemoved(purify.removed) };
}

export interface RemovedSummary {
  /** Removed elements by lower-case tag name. */
  elements: Record<string, number>;
  /** Removed attributes by lower-case name. */
  attributes: Record<string, number>;
  total: number;
}

type RemovedEntry =
  | { element: { nodeName: string } }
  | { attribute: { name: string } | null; from: { nodeName: string } };

/** Count what DOMPurify removed, for the notice shown to the user. */
export function summarizeRemoved(removed: ReadonlyArray<RemovedEntry | object>): RemovedSummary {
  const summary: RemovedSummary = { elements: {}, attributes: {}, total: 0 };
  for (const entry of removed) {
    if ('element' in entry && entry.element) {
      const name = String((entry.element as { nodeName: string }).nodeName || '').toLowerCase();
      // DOMPurify can report text and comment nodes; only elements are meaningful to users.
      if (!name || name.startsWith('#')) continue;
      summary.elements[name] = (summary.elements[name] ?? 0) + 1;
      summary.total += 1;
    } else if ('attribute' in entry && entry.attribute) {
      const name = String((entry.attribute as { name: string }).name || '').toLowerCase();
      if (!name) continue;
      summary.attributes[name] = (summary.attributes[name] ?? 0) + 1;
      summary.total += 1;
    }
  }
  return summary;
}

/** Plain-English list, e.g. "2 <script> elements, 1 style attribute". */
export function describeRemoved(summary: RemovedSummary, maxItems = 4): string {
  const parts: string[] = [];
  for (const [tag, n] of Object.entries(summary.elements)) {
    parts.push(`${n} <${tag}> element${n === 1 ? '' : 's'}`);
  }
  for (const [attr, n] of Object.entries(summary.attributes)) {
    const label = attr.startsWith('on') ? `${attr} (event handler)` : attr;
    parts.push(`${n} ${label} attribute${n === 1 ? '' : 's'}`);
  }
  if (parts.length <= maxItems) return parts.join(', ');
  return `${parts.slice(0, maxItems).join(', ')} and ${parts.length - maxItems} more`;
}

/**
 * Stylesheet for the preview document. Its SHA-256 hash is pinned in the
 * preview CSP below; a unit test fails if one changes without the other.
 */
export const PREVIEW_CSS = `:root{color-scheme:light;--fg:#14161a;--muted:#5b6170;--bg:#fff;--line:#e3e5e8;--code:#f4f5f6;--link:#0b6e6e}
html[data-theme=dark]{color-scheme:dark;--fg:#e5e7eb;--muted:#9ca3af;--bg:#1e2128;--line:#2d333e;--code:#282c34;--link:#38aeae}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg)}
body{padding:16px 20px;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow-wrap:anywhere}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.4em 0 .5em;font-weight:700}
h1{font-size:2em;border-bottom:1px solid var(--line);padding-bottom:.25em}
h2{font-size:1.5em;border-bottom:1px solid var(--line);padding-bottom:.2em}
h3{font-size:1.25em}h4{font-size:1.05em}h5,h6{font-size:.95em}h6{color:var(--muted)}
body>:first-child{margin-top:0}
p,ul,ol,dl,blockquote,pre,table,details,figure{margin:0 0 1em}
ul,ol{padding-left:1.6em}li+li{margin-top:.25em}
li>input[type=checkbox]{margin:0 .4em 0 -1.3em;vertical-align:middle}
a{color:var(--link);text-decoration:underline;cursor:default}
blockquote{border-left:4px solid var(--line);padding:0 1em;color:var(--muted)}
code,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
:not(pre)>code{background:var(--code);padding:.15em .35em;border-radius:4px}
pre{background:var(--code);padding:12px 14px;border-radius:6px;overflow:auto;line-height:1.45}
kbd{border:1px solid var(--line);border-bottom-width:2px;border-radius:4px;padding:0 .3em}
table{border-collapse:collapse;display:block;max-width:100%;overflow:auto}
th,td{border:1px solid var(--line);padding:6px 12px;text-align:left}
th{font-weight:600}
hr{border:0;border-top:1px solid var(--line);margin:1.5em 0}
img{max-width:100%;height:auto}
img[data-blocked]{display:inline-block;border:1px dashed var(--line);border-radius:4px;padding:2px 8px;color:var(--muted);font-size:.85em;font-style:italic}
summary{cursor:pointer;font-weight:600}
mark{background:#fde68a;color:#14161a}`;

/** base64 SHA-256 of PREVIEW_CSS (verified by markdown-preview.test.ts). */
export const PREVIEW_STYLE_HASH = 'sha256-M8Jj5bZkvZBVwxXBO1akQYuI2XFLj2WDMFCw2/YL7X0=';

/** CSP for the preview document: nothing may load except inline images. */
export const PREVIEW_CSP = [
  "default-src 'none'",
  'img-src data:',
  `style-src '${PREVIEW_STYLE_HASH}'`,
  "script-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

/**
 * The complete document placed in the iframe's srcdoc. `cleanHtml` must be
 * DOMPurify output; it is inserted verbatim.
 */
export function buildPreviewDocument(cleanHtml: string, theme: 'light' | 'dark'): string {
  return (
    '<!doctype html>' +
    `<html lang="en" data-theme="${theme === 'dark' ? 'dark' : 'light'}">` +
    '<head><meta charset="utf-8">' +
    `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">` +
    '<meta name="referrer" content="no-referrer">' +
    `<style>${PREVIEW_CSS}</style>` +
    '</head><body>' +
    cleanHtml +
    '</body></html>'
  );
}

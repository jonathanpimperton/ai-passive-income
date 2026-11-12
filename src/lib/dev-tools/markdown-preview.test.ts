import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS,
  PURIFY_CONFIG,
  PREVIEW_CSS,
  PREVIEW_CSP,
  PREVIEW_STYLE_HASH,
  buildPreviewDocument,
  describeRemoved,
  isAllowedUri,
  isInlineImageSource,
  sanitizeHtml,
  summarizeRemoved,
} from './markdown-preview';

describe('preview allow-list', () => {
  it('never allows document-level, scripting, styling or form elements', () => {
    for (const tag of ['script', 'style', 'base', 'meta', 'link', 'form', 'iframe', 'object', 'embed', 'svg', 'math', 'noscript', 'template', 'textarea', 'button']) {
      expect(ALLOWED_TAGS).not.toContain(tag);
    }
  });

  it('explicitly forbids the elements named by the fix plan', () => {
    for (const tag of ['style', 'base', 'meta', 'form', 'link']) {
      expect(FORBID_TAGS).toContain(tag);
    }
  });

  it('allows no style, id, name or event-handler attributes', () => {
    expect(ALLOWED_ATTR).not.toContain('style');
    expect(ALLOWED_ATTR).not.toContain('id');
    expect(ALLOWED_ATTR).not.toContain('name');
    expect(ALLOWED_ATTR.some((a) => a.startsWith('on'))).toBe(false);
    expect(PURIFY_CONFIG.FORBID_ATTR).toContain('style');
  });

  it('keeps the elements ordinary Markdown produces', () => {
    for (const tag of ['h1', 'h2', 'p', 'a', 'img', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'table', 'th', 'td', 'em', 'strong', 'del', 'hr']) {
      expect(ALLOWED_TAGS).toContain(tag);
    }
  });

  it('uses DOMPurify string output without data attributes or unknown protocols', () => {
    expect(PURIFY_CONFIG.ALLOW_DATA_ATTR).toBe(false);
    expect(PURIFY_CONFIG.ALLOW_UNKNOWN_PROTOCOLS).toBe(false);
    expect(PURIFY_CONFIG.RETURN_DOM).toBe(false);
    expect(PURIFY_CONFIG.WHOLE_DOCUMENT).toBe(false);
  });
});

describe('URL policy', () => {
  it('allows web, mail and phone links and relative references', () => {
    for (const url of ['https://example.com', 'http://example.com/a?b=c', 'mailto:a@b.co', 'tel:+15551234567', '/docs', './a.md', '../b', '#top', 'page.html', 'folder/page']) {
      expect(isAllowedUri(url), url).toBe(true);
    }
  });

  it('rejects script-capable and unknown schemes', () => {
    for (const url of ['javascript:alert(1)', 'JAVASCRIPT:x', ' javascript:x', 'vbscript:x', 'data:text/html,x', 'file:///etc/passwd', 'ftp://x']) {
      expect(isAllowedUri(url), JSON.stringify(url)).toBe(false);
    }
  });

  it('treats only inline data images as displayable without a request', () => {
    expect(isInlineImageSource('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isInlineImageSource('data:image/svg+xml,%3Csvg%3E')).toBe(true);
    expect(isInlineImageSource('https://img.shields.io/badge/x.svg')).toBe(false);
    expect(isInlineImageSource('logo.png')).toBe(false);
    expect(isInlineImageSource('data:text/html,x')).toBe(false);
  });
});

describe('preview document', () => {
  it('pins the stylesheet hash used by the CSP', () => {
    const hash = 'sha256-' + createHash('sha256').update(PREVIEW_CSS, 'utf8').digest('base64');
    expect(PREVIEW_STYLE_HASH).toBe(hash);
    expect(PREVIEW_CSP).toContain(`style-src '${hash}'`);
  });

  it('blocks scripts, network loads, base and forms in its CSP', () => {
    expect(PREVIEW_CSP).toContain("default-src 'none'");
    expect(PREVIEW_CSP).toContain("script-src 'none'");
    expect(PREVIEW_CSP).toContain("base-uri 'none'");
    expect(PREVIEW_CSP).toContain("form-action 'none'");
    expect(PREVIEW_CSP).toContain('img-src data:');
    expect(PREVIEW_CSP).not.toContain('unsafe-inline');
  });

  it('puts the CSP before the stylesheet and the content in the body', () => {
    const doc = buildPreviewDocument('<p>Hi</p>', 'light');
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc.indexOf('Content-Security-Policy')).toBeLessThan(doc.indexOf('<style>'));
    expect(doc).toContain('<body><p>Hi</p></body>');
    expect(doc).toContain('data-theme="light"');
    expect(buildPreviewDocument('', 'dark')).toContain('data-theme="dark"');
  });
});

describe('sanitizeHtml', () => {
  it('fails closed when the sanitiser has no DOM to work with', () => {
    const fake = { isSupported: false, sanitize: (s: string) => s, removed: [] } as unknown as Parameters<typeof sanitizeHtml>[0];
    expect(() => sanitizeHtml(fake, '<p>x</p>')).toThrow(/unavailable/);
  });
});

describe('removed summary', () => {
  it('counts removed elements and attributes and ignores text nodes', () => {
    const summary = summarizeRemoved([
      { element: { nodeName: 'SCRIPT' } },
      { element: { nodeName: 'SCRIPT' } },
      { element: { nodeName: '#text' } },
      { attribute: { name: 'style' }, from: { nodeName: 'P' } },
      { attribute: { name: 'onclick' }, from: { nodeName: 'A' } },
      { attribute: null, from: { nodeName: 'A' } },
    ]);
    expect(summary).toEqual({ elements: { script: 2 }, attributes: { style: 1, onclick: 1 }, total: 4 });
    expect(describeRemoved(summary)).toBe('2 <script> elements, 1 style attribute, 1 onclick (event handler) attribute');
  });

  it('shortens long lists', () => {
    const summary = summarizeRemoved(['a', 'b', 'c', 'd', 'e', 'f'].map((t) => ({ element: { nodeName: t } })));
    expect(describeRemoved(summary)).toBe('1 <a> element, 1 <b> element, 1 <c> element, 1 <d> element and 2 more');
  });
});

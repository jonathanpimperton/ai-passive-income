/**
 * Markdown tool regression corpus, run under the production configuration (CSP and headers
 * from public/_headers, via playwright.prod.config.ts).
 *
 * tests/fixtures/dev/markdown-preview-corpus.json lists inputs that must never do anything
 * beyond being shown as inert text: no script of any kind runs (page or preview frame), the
 * page keeps its address, base URL and look, nothing opens, nothing leaves the browser and
 * the preview frame stays sandboxed and free of script-capable markup. Each entry is loaded
 * into the tool (Markdown to HTML with the preview open, or HTML to Markdown), and entries
 * flagged `click` also get their first link or control clicked.
 *
 * An input that tried to run script would log a PVMARK console message or set window.__pv.
 * A self-test first proves the detector sees both a page and a frame logging, so a silent
 * detector cannot make the suite pass.
 *
 * Runs in Chromium and Firefox (see playwright.prod.config.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

interface CorpusEntry {
  id: string;
  direction: 'md-to-html' | 'html-to-md';
  input: string;
  click?: boolean;
}

const ROUTE = '/tools/file-tools/markdown-html/';
const CORPUS: CorpusEntry[] = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'tests', 'fixtures', 'dev', 'markdown-preview-corpus.json'), 'utf8'),
);
const CHUNK = 12;
const BLOCKED_HOST = /evil\.example/;

test.beforeEach(async ({ context }) => {
  await context.route(/(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.abort());
});

async function waitForTool(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('#md-html-input');
    const island = el?.closest('astro-island');
    return Boolean(el) && Object.keys(el as object).some((k) => k.startsWith('__reactProps')) && (!island || !island.hasAttribute('ssr'));
  }, null, { timeout: 30_000 });
}

/** Everything in the preview frame that could run, load or navigate, as short labels. */
async function auditFrame(page: Page): Promise<string[]> {
  const frameEl = page.locator('iframe[title="Markdown preview"]');
  if (!(await frameEl.count())) return [];
  const handle = await frameEl.elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) return ['frame-unreadable'];
  return frame.evaluate(() => {
    const bad: string[] = [];
    const scriptTags = ['script', 'style', 'base', 'form', 'iframe', 'object', 'embed', 'svg', 'math', 'noscript', 'template', 'link', 'button', 'textarea', 'select'];
    const ownStyle = document.head.querySelector('style');
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const tag = el.localName;
      // The preview's own stylesheet is the one <style> in <head>; anything else is user content.
      if (scriptTags.includes(tag) && !(tag === 'style' && el === ownStyle)) bad.push('tag:' + tag);
      if (tag === 'meta' && el.closest('body')) bad.push('tag:meta-in-body');
      for (const a of Array.from(el.attributes)) {
        if (/^on/i.test(a.name)) bad.push('attr:' + a.name);
        if (a.name === 'style' && el.closest('body')) bad.push('attr:style');
        // eslint-disable-next-line no-control-regex
        if (/^(href|src|xlink:href|action|formaction|data)$/i.test(a.name) && /^(javascript|vbscript|data:text)/i.test(a.value.replace(/[\x00-\x20]/g, ''))) bad.push('url:' + a.name);
      }
    }
    return bad;
  });
}

test('the detector sees script that runs in the page and in a frame', async ({ page }) => {
  const marks: string[] = [];
  page.on('console', (m) => {
    if (m.text().includes('PVMARK')) marks.push(m.text());
  });
  await page.goto(ROUTE);
  await waitForTool(page);
  await page.evaluate(() => {
    console.log('PVMARK:selftest-page');
    const f = document.createElement('iframe');
    f.srcdoc = "<script>console.log('PVMARK:selftest-frame')<\/script>";
    document.body.appendChild(f);
  });
  await expect.poll(() => marks.some((m) => m.includes('selftest-page')) && marks.some((m) => m.includes('selftest-frame'))).toBe(true);
});

test('the corpus is present and covers both directions', () => {
  expect(CORPUS.length).toBeGreaterThanOrEqual(50);
  expect(CORPUS.some((e) => e.direction === 'html-to-md')).toBe(true);
  expect(CORPUS.some((e) => e.click)).toBe(true);
  expect(new Set(CORPUS.map((e) => e.id)).size).toBe(CORPUS.length);
});

for (let from = 0; from < CORPUS.length; from += CHUNK) {
  const chunk = CORPUS.slice(from, from + CHUNK);
  test(`corpus entries ${from + 1}-${from + chunk.length} stay inert`, async ({ page, context }) => {
    test.setTimeout(180_000);
    const marks: string[] = [];
    const blocked: string[] = [];
    const frameNavigations: string[] = [];
    let opened = 0;
    page.on('console', (m) => {
      if (m.text().includes('PVMARK')) marks.push(m.text());
    });
    page.on('framenavigated', (f) => {
      if (f !== page.mainFrame() && !/^about:(srcdoc|blank)$/.test(f.url())) frameNavigations.push(f.url());
    });
    context.on('page', () => {
      opened += 1;
    });
    await context.route(BLOCKED_HOST, (r) => {
      blocked.push(r.request().url());
      return r.abort();
    });

    await page.goto(ROUTE);
    await waitForTool(page);
    const url = page.url();
    const editor = page.locator('#md-html-input');
    const modeButton = page.getByRole('button', { name: /markdown.*html|html.*markdown/i });
    const sanitiseBox = page.getByRole('checkbox', { name: /Remove unsafe HTML/ });
    const preview = page.getByRole('button', { name: 'Preview' });
    const baseURI = await page.evaluate(() => document.baseURI);
    const look = () => page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, metas: document.querySelectorAll('meta').length }));
    const lookBefore = await look();

    for (const entry of chunk) {
      const say = (what: string) => `${entry.id}: ${what}`;
      marks.length = 0;
      blocked.length = 0;
      frameNavigations.length = 0;
      opened = 0;

      await editor.fill(''); // empties the output too, so switching direction cannot overwrite the next input
      const inHtmlToMd = ((await modeButton.textContent()) ?? '').trim().startsWith('HTML');
      if (inHtmlToMd !== (entry.direction === 'html-to-md')) await modeButton.click();

      if (entry.direction === 'md-to-html') {
        // The output sanitiser is switched off so the preview's own layers are what is tested.
        if (await sanitiseBox.isChecked()) await sanitiseBox.uncheck();
      }
      await editor.fill(entry.input);
      if (entry.direction === 'md-to-html') {
        await expect(preview, say('the preview button appears')).toBeVisible();
        if ((await preview.getAttribute('aria-pressed')) !== 'true') await preview.click();
        await expect(page.locator('iframe[title="Markdown preview"]'), say('the preview is sandboxed')).toHaveAttribute('sandbox', '');
        expect(await auditFrame(page), say('script-capable markup in the preview frame')).toEqual([]);
        if (entry.click) {
          // Some entries have nothing to click once sanitised; that is the intended outcome.
          await page
            .frameLocator('iframe[title="Markdown preview"]')
            .locator('a, button, math')
            .first()
            .click({ timeout: 2000 })
            .catch(() => undefined);
        }
      }
      // Time for anything delayed (timers, a refresh, loads) to show itself.
      await page.waitForTimeout(/refresh/.test(entry.id) ? 1800 : 400);

      expect(marks, say('script ran')).toEqual([]);
      expect(await page.evaluate(() => (window as unknown as { __pv?: string }).__pv ?? null), say('page flag set')).toBeNull();
      expect(page.url(), say('page address changed')).toBe(url);
      expect(await page.evaluate(() => document.baseURI), say('base URL changed')).toBe(baseURI);
      expect(await look(), say('page background or head changed')).toEqual(lookBefore);
      expect(await page.locator('#ov').count(), say('overlay in the page')).toBe(0);
      expect(opened, say('a window opened')).toBe(0);
      expect(blocked, say('request to a blocked host')).toEqual([]);
      expect(frameNavigations, say('the preview frame navigated')).toEqual([]);
    }
  });
}

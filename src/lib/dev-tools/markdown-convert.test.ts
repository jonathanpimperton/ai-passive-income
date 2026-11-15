import { describe, it, expect } from 'vitest';
import { Marked, marked } from 'marked';
import {
  markdownToHtml,
  isStackOverflow,
  MarkdownTooDeepError,
  MarkdownTooSlowError,
  MARKDOWN_TIME_BUDGET_MS,
} from './markdown-convert';

describe('markdownToHtml', () => {
  it('matches marked.parse for ordinary documents', () => {
    const doc = '# Title\n\nSome **bold**, *italic*, `code` and [a link](https://example.com).\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<b>raw</b> and ![img](x.png)\n';
    expect(markdownToHtml(Marked, doc)).toBe(marked.parse(doc, { async: false }));
  });

  it('keeps converting inputs that finish inside the budget', () => {
    const doc = '# Heading\n\nText with [a link](https://example.com).\n\n'.repeat(2000);
    expect(() => markdownToHtml(Marked, doc)).not.toThrow();
  });

  it('stops a conversion that runs past the budget, with a plain message', () => {
    // A clock that jumps forward on every reading, so the test does not depend on machine speed.
    let t = 0;
    const clock = () => (t += 500);
    expect(() => markdownToHtml(Marked, 'A [link](https://example.com) here', 1000, clock)).toThrow(MarkdownTooSlowError);
    t = 0;
    try {
      markdownToHtml(Marked, '[a](<'.repeat(50), 1000, clock);
      throw new Error('expected a stop');
    } catch (e) {
      expect(e).toBeInstanceOf(MarkdownTooSlowError);
      expect((e as Error).message).toMatch(/too complex to convert in the browser/);
      expect((e as Error).message).toMatch(/stopped after 1 seconds/);
    }
  });

  // Cooperative only: this input is slow because of many short tokenizer calls. One long
  // call (thousands of unclosed openers in one block) cannot be stopped here; the worker
  // client terminates the worker for that (markdown-worker-client.test.ts, tests/dev-tools.spec.ts).
  it('stops between tokenizer calls when slow work is spread over many short calls', () => {
    const slow = '[a]('.repeat(1500);
    const start = performance.now();
    expect(() => markdownToHtml(Marked, slow, 300)).toThrow(MarkdownTooSlowError);
    expect(performance.now() - start).toBeLessThan(5000);
  });

  it('reports input that nests too deeply for the stack as too complex, not as a raw engine error', () => {
    // 12,000 nested quotes overflow the stack in every engine (and take well under a second here).
    let error: unknown;
    try {
      markdownToHtml(Marked, '> '.repeat(12000));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(MarkdownTooDeepError);
    expect((error as Error).message).toMatch(/too complex to convert in the browser/);
  });

  it('recognises the stack overflow messages of Chromium, Safari and Firefox', () => {
    expect(isStackOverflow(new RangeError('Maximum call stack size exceeded'))).toBe(true);
    const firefox = new Error('too much recursion\nPlease report this to https://github.com/markedjs/marked.');
    firefox.name = 'InternalError';
    expect(isStackOverflow(firefox)).toBe(true);
    expect(isStackOverflow(new Error('unexpected token'))).toBe(false);
    expect(isStackOverflow('too much recursion')).toBe(false);
  });

  it('uses a budget of a few seconds by default', () => {
    expect(MARKDOWN_TIME_BUDGET_MS).toBeGreaterThanOrEqual(2000);
    expect(MARKDOWN_TIME_BUDGET_MS).toBeLessThanOrEqual(10000);
  });
});

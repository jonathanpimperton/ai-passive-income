/**
 * Web Worker entry: runs marked off the page's thread (plan follow-up (h)).
 *
 * One call to marked's link tokenizer on thousands of unclosed link or image
 * openers can run for minutes and cannot be interrupted from inside, so the
 * page terminates this worker when the time budget passes
 * (markdown-worker-client.ts). Only marked runs here. HTML sanitising needs a
 * DOM and stays on the page, exactly as before, so every sanitiser guarantee
 * in markdown-preview.ts is unchanged: this worker only ever produces the
 * raw, untrusted HTML string that the page then sanitises.
 */
import { Marked } from 'marked';
import { markdownToHtml, MarkdownTooDeepError, MarkdownTooSlowError } from './markdown-convert';
import type { MarkdownWorkerMessage, MarkdownWorkerRequest } from './markdown-worker-protocol';

// A minimal view of the worker global, so the DOM and WebWorker libs don't clash.
const scope = self as unknown as {
  onmessage: ((event: { data: MarkdownWorkerRequest }) => void) | null;
  postMessage(message: MarkdownWorkerMessage): void;
};

scope.onmessage = ({ data }) => {
  const { id, source, budgetMs } = data;
  try {
    scope.postMessage({ id, ok: true, html: markdownToHtml(Marked, source, budgetMs) });
  } catch (e) {
    if (e instanceof MarkdownTooSlowError) scope.postMessage({ id, ok: false, reason: 'too-slow' });
    else if (e instanceof MarkdownTooDeepError) scope.postMessage({ id, ok: false, reason: 'too-deep' });
    else scope.postMessage({ id, ok: false, reason: 'error', error: e instanceof Error ? e.message : String(e) });
  }
};

scope.postMessage({ type: 'ready' });

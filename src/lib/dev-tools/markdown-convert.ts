/**
 * Cooperative, time-boxed Markdown to HTML conversion.
 *
 * marked parses synchronously and some small inputs make it very slow (a few
 * KB of unclosed link openers can take tens of seconds, growing steeply with
 * length). The inline tokenizers that do the repeated work check a deadline
 * each time they are called and stop the conversion when it passes.
 *
 * This is NOT a hard bound: the check only runs between tokenizer calls, and
 * one call to marked's link tokenizer on thousands of unclosed link or image
 * openers is uninterruptible (minutes at 256 KB). The hard bound is the Web
 * Worker in markdown-worker.ts, which the page terminates when the budget
 * plus a grace passes (markdown-worker-client.ts). This check keeps the
 * common case cheap: when the slow work is spread over many short calls the
 * worker reports the stop itself and is reused.
 *
 * Ordinary documents are far below the budget: about 1 ms per KB on a
 * desktop, so 1 MB of typical Markdown converts in under two seconds.
 */
import type { Marked } from 'marked';

export const MARKDOWN_TIME_BUDGET_MS = 4000;

export class MarkdownTooSlowError extends Error {
  constructor(budgetMs: number) {
    super(
      `This Markdown is too complex to convert in the browser: it was stopped after ${Math.round(budgetMs / 1000)} seconds. ` +
        'Try converting it in smaller parts, or look for text that repeats the same bracket or link pattern many times.',
    );
    this.name = 'MarkdownTooSlowError';
  }
}

/**
 * marked ran out of stack: the Markdown nests too deeply (long runs of
 * block quotes, or link and image openers the engine's stack cannot hold).
 */
export class MarkdownTooDeepError extends Error {
  constructor() {
    super(
      'This Markdown is too complex to convert in the browser: its quotes, brackets or links nest too deeply. ' +
        'Try converting it in smaller parts, or look for text that repeats the same pattern many times.',
    );
    this.name = 'MarkdownTooDeepError';
  }
}

/** True for the engines' stack overflow errors: RangeError in Chromium and Safari, InternalError in Firefox. */
export function isStackOverflow(e: unknown): boolean {
  const message = e instanceof Error ? e.message : '';
  return /too much recursion|call stack size exceeded/i.test(message);
}

/**
 * Convert Markdown to HTML with the given `Marked` class, or throw
 * MarkdownTooSlowError at the first tokenizer call after `budgetMs` has
 * passed. It cannot interrupt a single long tokenizer call (see above). A
 * stack overflow inside marked becomes MarkdownTooDeepError. The output for
 * inputs that finish in time is identical to marked.parse().
 */
export function markdownToHtml(
  MarkedClass: typeof Marked,
  source: string,
  budgetMs: number = MARKDOWN_TIME_BUDGET_MS,
  now: () => number = () => performance.now(),
): string {
  const deadline = now() + budgetMs;
  // Returning false makes marked fall back to its own tokenizer.
  const checkDeadline = () => {
    if (now() > deadline) throw new MarkdownTooSlowError(budgetMs);
    return false as const;
  };
  const parser = new MarkedClass();
  parser.use({ tokenizer: { link: checkDeadline, reflink: checkDeadline, emStrong: checkDeadline, tag: checkDeadline } });
  try {
    return parser.parse(source, { async: false });
  } catch (e) {
    if (isStackOverflow(e)) throw new MarkdownTooDeepError();
    throw e;
  }
}

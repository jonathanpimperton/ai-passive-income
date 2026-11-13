/**
 * Time-boxed Markdown to HTML conversion.
 *
 * marked parses in the page's thread and some small inputs make it very slow
 * (a few KB of unclosed link openers can take tens of seconds, growing
 * steeply with length). There is no way to interrupt a synchronous parse
 * from outside, so the inline tokenizers that do the repeated work check a
 * deadline each time they are called and stop the conversion when it passes.
 * The caller shows the message instead of leaving the tab frozen.
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
 * Convert Markdown to HTML with the given `Marked` class, or throw
 * MarkdownTooSlowError once `budgetMs` has passed. The output for inputs that
 * finish in time is identical to marked.parse().
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
  return parser.parse(source, { async: false });
}

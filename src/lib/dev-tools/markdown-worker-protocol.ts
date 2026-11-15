/**
 * Messages exchanged between the Markdown tool and its conversion worker.
 * Types only (erased at build time), so the worker can import it without
 * pulling the client, which creates the worker, into the worker's own bundle.
 */

/** Page -> worker: convert `source`, cooperatively giving up after `budgetMs`. */
export interface MarkdownWorkerRequest {
  id: number;
  source: string;
  budgetMs: number;
}

/** Worker -> page, once, when marked has loaded and the worker accepts requests. */
export interface MarkdownWorkerReady {
  type: 'ready';
}

/** Worker -> page: the outcome of one request. */
export type MarkdownWorkerResult =
  | { id: number; ok: true; html: string }
  | { id: number; ok: false; reason: 'too-slow' }
  | { id: number; ok: false; reason: 'too-deep' }
  | { id: number; ok: false; reason: 'error'; error: string };

export type MarkdownWorkerMessage = MarkdownWorkerReady | MarkdownWorkerResult;

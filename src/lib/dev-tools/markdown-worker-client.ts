/**
 * Page-side client for the Markdown conversion worker (plan follow-up (h)).
 *
 * marked can spend minutes inside one tokenizer call on some inputs (thousands
 * of unclosed link or image openers), and nothing can interrupt a synchronous
 * call, so conversion runs in a Web Worker and this client terminates the
 * worker when the time budget passes. That is the hard bound: the page's
 * thread is never blocked by marked, and the visitor gets the existing "too
 * complex" message (MarkdownTooSlowError) after the budget plus a short grace.
 * Inside the worker, markdown-convert.ts also stops cooperatively at the
 * budget when the slow work is spread over many short calls, which lets the
 * worker be reused instead of replaced.
 *
 * One request at a time. A newer request replaces an older one: if the older
 * one was already running, its worker is terminated (it cannot be told to
 * stop) and a fresh one starts for the new request.
 *
 * Failures are never silent: a worker that cannot be created or loaded, or
 * that crashes, rejects the request with MarkdownWorkerError and a plain
 * message. Same-origin module workers fall under script-src 'self' in the
 * site's Content-Security-Policy, so no extra CSP directive is needed.
 */
import { MARKDOWN_TIME_BUDGET_MS, MarkdownTooDeepError, MarkdownTooSlowError } from './markdown-convert';
import type { MarkdownWorkerMessage, MarkdownWorkerRequest } from './markdown-worker-protocol';

/** Extra time, after the cooperative budget, before the worker is terminated. */
export const MARKDOWN_HARD_STOP_GRACE_MS = 250;
/** How long a new worker may take to load marked before that is reported as a failure. */
export const MARKDOWN_WORKER_START_TIMEOUT_MS = 30_000;

/** The request was replaced by a newer one (or the converter was disposed). */
export class MarkdownCancelledError extends Error {
  constructor() {
    super('Conversion cancelled.');
    this.name = 'MarkdownCancelledError';
  }
}

/** The conversion worker could not start, or it crashed. */
export class MarkdownWorkerError extends Error {
  constructor(detail: string) {
    super(
      `The Markdown converter could not run in this browser (${detail}). ` +
        'Reload the page, or try an up-to-date browser.',
    );
    this.name = 'MarkdownWorkerError';
  }
}

/** The slice of the Worker API the client uses (lets unit tests supply a fake). */
export interface WorkerLike {
  postMessage(message: MarkdownWorkerRequest): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessageerror: ((event: unknown) => void) | null;
}

export interface MarkdownConverter {
  /** Resolves with raw (unsanitised) HTML. Rejects with MarkdownTooSlowError, MarkdownTooDeepError, MarkdownCancelledError, MarkdownWorkerError or an Error carrying the conversion failure. */
  convert(source: string): Promise<string>;
  /** Stops any running conversion and releases the worker. */
  dispose(): void;
}

export interface MarkdownConverterOptions {
  budgetMs?: number;
  graceMs?: number;
  startTimeoutMs?: number;
  /** Creates the worker. Defaults to the bundled markdown-worker.ts. */
  spawn?: () => WorkerLike;
}

function spawnBundledWorker(): WorkerLike {
  return new Worker(new URL('./markdown-worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
}

interface Pending {
  id: number;
  source: string;
  posted: boolean;
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  hardStop: ReturnType<typeof setTimeout> | null;
}

function errorDetail(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  const message = (e as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? message : 'the worker failed to load or crashed';
}

export function createMarkdownConverter(options: MarkdownConverterOptions = {}): MarkdownConverter {
  const budgetMs = options.budgetMs ?? MARKDOWN_TIME_BUDGET_MS;
  const graceMs = options.graceMs ?? MARKDOWN_HARD_STOP_GRACE_MS;
  const startTimeoutMs = options.startTimeoutMs ?? MARKDOWN_WORKER_START_TIMEOUT_MS;
  const spawn = options.spawn ?? spawnBundledWorker;

  let worker: WorkerLike | null = null;
  let ready = false;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: Pending | null = null;
  let nextId = 1;
  let disposed = false;

  function discardWorker(): void {
    if (startTimer) clearTimeout(startTimer);
    startTimer = null;
    const w = worker;
    worker = null;
    ready = false;
    if (w) {
      w.onmessage = null;
      w.onerror = null;
      w.onmessageerror = null;
      w.terminate();
    }
  }

  function settle(p: Pending, outcome: { html: string } | { error: Error }): void {
    if (p.hardStop) clearTimeout(p.hardStop);
    if (pending === p) pending = null;
    if ('error' in outcome) p.reject(outcome.error);
    else p.resolve(outcome.html);
  }

  function post(p: Pending): void {
    if (!worker) return;
    p.posted = true;
    // The clock starts when the worker can actually begin: loading marked is not charged to the input.
    p.hardStop = setTimeout(() => {
      discardWorker();
      settle(p, { error: new MarkdownTooSlowError(budgetMs + graceMs) });
    }, budgetMs + graceMs);
    worker.postMessage({ id: p.id, source: p.source, budgetMs });
  }

  function fail(w: WorkerLike, error: Error): void {
    if (w !== worker) return;
    discardWorker();
    if (pending) settle(pending, { error });
  }

  function onMessage(w: WorkerLike, data: unknown): void {
    if (w !== worker) return;
    const message = data as MarkdownWorkerMessage;
    if ('type' in message && message.type === 'ready') {
      ready = true;
      if (startTimer) clearTimeout(startTimer);
      startTimer = null;
      if (pending && !pending.posted) post(pending);
      return;
    }
    if (!('id' in message) || !pending || message.id !== pending.id) return; // a reply to a replaced request
    if (message.ok) settle(pending, { html: message.html });
    else if (message.reason === 'too-slow') settle(pending, { error: new MarkdownTooSlowError(budgetMs) });
    else if (message.reason === 'too-deep') settle(pending, { error: new MarkdownTooDeepError() });
    else settle(pending, { error: new Error(`Conversion failed: ${message.error}`) });
  }

  function start(): void {
    const w = spawn();
    worker = w;
    ready = false;
    w.onmessage = (event) => onMessage(w, event.data);
    w.onerror = (event) => fail(w, new MarkdownWorkerError(errorDetail(event)));
    w.onmessageerror = () => fail(w, new MarkdownWorkerError('the worker sent an unreadable reply'));
    startTimer = setTimeout(() => fail(w, new MarkdownWorkerError('the worker did not start')), startTimeoutMs);
  }

  return {
    convert(source: string): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        if (disposed) {
          reject(new MarkdownCancelledError());
          return;
        }
        if (pending) {
          const older = pending;
          // A request that is already running cannot be told to stop: replace its worker.
          if (older.posted) discardWorker();
          settle(older, { error: new MarkdownCancelledError() });
        }
        try {
          if (!worker) start();
        } catch (e) {
          discardWorker();
          reject(new MarkdownWorkerError(errorDetail(e)));
          return;
        }
        const p: Pending = { id: nextId++, source, posted: false, resolve, reject, hardStop: null };
        pending = p;
        if (ready) post(p);
      });
    },
    dispose(): void {
      disposed = true;
      const older = pending;
      discardWorker();
      if (older) settle(older, { error: new MarkdownCancelledError() });
    },
  };
}

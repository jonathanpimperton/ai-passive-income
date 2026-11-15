import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMarkdownConverter,
  MarkdownCancelledError,
  MarkdownWorkerError,
  type WorkerLike,
} from './markdown-worker-client';
import { MarkdownTooDeepError, MarkdownTooSlowError } from './markdown-convert';
import type { MarkdownWorkerRequest } from './markdown-worker-protocol';

class FakeWorker implements WorkerLike {
  posted: MarkdownWorkerRequest[] = [];
  terminated = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessageerror: ((event: unknown) => void) | null = null;
  postMessage(message: MarkdownWorkerRequest) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  /** Deliver a message from the worker to the page. */
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

function setup(options: { budgetMs?: number; graceMs?: number; startTimeoutMs?: number } = {}) {
  const workers: FakeWorker[] = [];
  const converter = createMarkdownConverter({
    budgetMs: 4000,
    graceMs: 1000,
    startTimeoutMs: 30_000,
    ...options,
    spawn: () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
  });
  return { converter, workers };
}

/** Settles to its outcome so tests can inspect rejections without unhandled-rejection noise. */
function outcome<T>(p: Promise<T>): Promise<{ value?: T; error?: Error }> {
  return p.then(
    (value) => ({ value }),
    (error: Error) => ({ error }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createMarkdownConverter', () => {
  it('posts the source once the worker is ready and resolves with its HTML', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('# Hi'));
    expect(workers).toHaveLength(1);
    expect(workers[0].posted).toEqual([]); // nothing is sent before the worker says it is ready
    workers[0].emit({ type: 'ready' });
    expect(workers[0].posted).toEqual([{ id: 1, source: '# Hi', budgetMs: 4000 }]);
    workers[0].emit({ id: 1, ok: true, html: '<h1>Hi</h1>\n' });
    expect(await result).toEqual({ value: '<h1>Hi</h1>\n' });
    expect(workers[0].terminated).toBe(false);
  });

  it('reuses one worker for consecutive conversions', async () => {
    const { converter, workers } = setup();
    const first = outcome(converter.convert('a'));
    workers[0].emit({ type: 'ready' });
    workers[0].emit({ id: 1, ok: true, html: 'A' });
    await first;
    const second = outcome(converter.convert('b'));
    expect(workers).toHaveLength(1);
    expect(workers[0].posted.map((m) => m.id)).toEqual([1, 2]);
    workers[0].emit({ id: 2, ok: true, html: 'B' });
    expect(await second).toEqual({ value: 'B' });
  });

  it('terminates the worker when the budget plus grace passes, and starts a fresh one next time', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(4999);
    expect(workers[0].terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    const { error } = await result;
    expect(workers[0].terminated).toBe(true);
    expect(error).toBeInstanceOf(MarkdownTooSlowError);
    expect(error?.message).toMatch(/too complex to convert in the browser/);
    expect(error?.message).toMatch(/stopped after 5 seconds/);

    const next = outcome(converter.convert('y'));
    expect(workers).toHaveLength(2);
    workers[1].emit({ type: 'ready' });
    workers[1].emit({ id: 2, ok: true, html: 'Y' });
    expect(await next).toEqual({ value: 'Y' });
  });

  it('does not charge worker start-up time to the input', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    await vi.advanceTimersByTimeAsync(20_000); // slow to load, still inside the start-up allowance
    expect(workers[0].terminated).toBe(false);
    workers[0].emit({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(3000);
    workers[0].emit({ id: 1, ok: true, html: 'X' });
    expect(await result).toEqual({ value: 'X' });
  });

  it('reports the worker\'s own cooperative stop without replacing the worker', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    workers[0].emit({ id: 1, ok: false, reason: 'too-slow' });
    const { error } = await result;
    expect(error).toBeInstanceOf(MarkdownTooSlowError);
    expect(error?.message).toMatch(/stopped after 4 seconds/);
    expect(workers[0].terminated).toBe(false);
  });

  it('maps a stack overflow in the worker to the too-complex message', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    workers[0].emit({ id: 1, ok: false, reason: 'too-deep' });
    const { error } = await result;
    expect(error).toBeInstanceOf(MarkdownTooDeepError);
    expect(error?.message).toMatch(/too complex to convert in the browser/);
    expect(workers[0].terminated).toBe(false);
  });

  it('passes a conversion error from the worker on with its message', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    workers[0].emit({ id: 1, ok: false, reason: 'error', error: 'boom' });
    const { error } = await result;
    expect(error?.message).toBe('Conversion failed: boom');
  });

  it('replaces a running conversion: the old worker is terminated and the new request runs on a new one', async () => {
    const { converter, workers } = setup();
    const first = outcome(converter.convert('slow'));
    workers[0].emit({ type: 'ready' });
    const second = outcome(converter.convert('fast'));
    expect((await first).error).toBeInstanceOf(MarkdownCancelledError);
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);
    workers[1].emit({ type: 'ready' });
    expect(workers[1].posted).toEqual([{ id: 2, source: 'fast', budgetMs: 4000 }]);
    // A reply from the replaced worker is ignored.
    workers[0].emit({ id: 1, ok: true, html: 'OLD' });
    workers[1].emit({ id: 2, ok: true, html: 'NEW' });
    expect(await second).toEqual({ value: 'NEW' });
  });

  it('replaces a request that was still waiting for the worker without discarding the worker', async () => {
    const { converter, workers } = setup();
    const first = outcome(converter.convert('one'));
    const second = outcome(converter.convert('two'));
    expect((await first).error).toBeInstanceOf(MarkdownCancelledError);
    expect(workers).toHaveLength(1);
    expect(workers[0].terminated).toBe(false);
    workers[0].emit({ type: 'ready' });
    expect(workers[0].posted).toEqual([{ id: 2, source: 'two', budgetMs: 4000 }]);
    workers[0].emit({ id: 2, ok: true, html: 'TWO' });
    expect(await second).toEqual({ value: 'TWO' });
  });

  it('says so when the worker cannot be created, and tries again on the next request', async () => {
    let calls = 0;
    const workers: FakeWorker[] = [];
    const converter = createMarkdownConverter({
      spawn: () => {
        calls += 1;
        if (calls === 1) throw new Error('Worker is not defined');
        const w = new FakeWorker();
        workers.push(w);
        return w;
      },
    });
    const { error } = await outcome(converter.convert('x'));
    expect(error).toBeInstanceOf(MarkdownWorkerError);
    expect(error?.message).toMatch(/could not run in this browser \(Worker is not defined\)/);
    const retry = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    workers[0].emit({ id: 1, ok: true, html: 'ok' });
    expect(await retry).toEqual({ value: 'ok' });
  });

  it('says so when the worker fails to load, and when it never starts', async () => {
    const a = setup();
    const failing = outcome(a.converter.convert('x'));
    a.workers[0].onerror?.({ message: '' });
    const e1 = (await failing).error;
    expect(e1).toBeInstanceOf(MarkdownWorkerError);
    expect(e1?.message).toMatch(/failed to load or crashed/);
    expect(a.workers[0].terminated).toBe(true);

    const b = setup({ startTimeoutMs: 1000 });
    const silent = outcome(b.converter.convert('x'));
    await vi.advanceTimersByTimeAsync(1001);
    const e2 = (await silent).error;
    expect(e2).toBeInstanceOf(MarkdownWorkerError);
    expect(e2?.message).toMatch(/did not start/);
    expect(b.workers[0].terminated).toBe(true);
  });

  it('reports a crash while converting', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    workers[0].onerror?.({ message: 'out of memory' });
    const { error } = await result;
    expect(error).toBeInstanceOf(MarkdownWorkerError);
    expect(error?.message).toMatch(/out of memory/);
  });

  it('dispose cancels the running conversion and releases the worker', async () => {
    const { converter, workers } = setup();
    const result = outcome(converter.convert('x'));
    workers[0].emit({ type: 'ready' });
    converter.dispose();
    expect((await result).error).toBeInstanceOf(MarkdownCancelledError);
    expect(workers[0].terminated).toBe(true);
    expect((await outcome(converter.convert('y'))).error).toBeInstanceOf(MarkdownCancelledError);
    expect(workers).toHaveLength(1);
  });
});

describe('markdown worker entry', () => {
  it('announces itself, converts, and reports a cooperative stop', async () => {
    const sent: unknown[] = [];
    const scope: { onmessage: ((e: { data: MarkdownWorkerRequest }) => void) | null; postMessage: (m: unknown) => void } = {
      onmessage: null,
      postMessage: (m) => sent.push(m),
    };
    const g = globalThis as unknown as { self?: unknown };
    const previous = g.self;
    g.self = scope;
    vi.useRealTimers();
    try {
      vi.resetModules();
      await import('./markdown-worker');
      expect(sent).toEqual([{ type: 'ready' }]);

      scope.onmessage?.({ data: { id: 1, source: '# Hi **there**', budgetMs: 4000 } });
      expect(sent[1]).toEqual({ id: 1, ok: true, html: '<h1>Hi <strong>there</strong></h1>\n' });

      // A budget that has already passed stops at the first tokenizer call.
      scope.onmessage?.({ data: { id: 2, source: '[a](<'.repeat(200), budgetMs: -1 } });
      expect(sent[2]).toEqual({ id: 2, ok: false, reason: 'too-slow' });

      // Nesting deeper than the stack allows is reported as such, not as an unexplained failure.
      scope.onmessage?.({ data: { id: 3, source: '> '.repeat(60000), budgetMs: 4000 } });
      expect(sent[3]).toEqual({ id: 3, ok: false, reason: 'too-deep' });
    } finally {
      g.self = previous;
    }
  });
});

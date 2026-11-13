import { describe, it, expect } from 'vitest';
import { safely, unexpectedErrorMessage } from './safe-compute';

describe('safely', () => {
  it('returns the computed value when nothing is thrown', () => {
    expect(safely(() => 42, () => -1)).toBe(42);
  });

  it('turns any thrown value into the fallback instead of propagating', () => {
    expect(safely(() => { throw new RangeError('Invalid time value'); }, (m) => m)).toMatch(/Invalid time value/);
    expect(safely(() => { throw 'plain string'; }, (m) => m)).toMatch(/plain string/);
    expect(safely(() => { throw undefined; }, (m) => m)).toMatch(/^Something unexpected went wrong while processing this input\./);
  });

  it('keeps the message short and on one line', () => {
    const msg = unexpectedErrorMessage(new Error('line one\nline two ' + 'x'.repeat(500)));
    expect(msg).not.toContain('\n');
    expect(msg.length).toBeLessThan(300);
    expect(msg).toMatch(/Your text is unchanged/);
  });
});

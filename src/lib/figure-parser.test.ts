import { describe, it, expect } from 'vitest';
import { parsePipeline, scanTokens, FigureSyntaxError } from './figure-parser';

describe('parsePipeline: values', () => {
  it('parses numbers, with underscores and decimals', () => {
    expect(parsePipeline('300000').expr).toEqual({ kind: 'num', value: 300000 });
    expect(parsePipeline('300_000').expr).toEqual({ kind: 'num', value: 300000 });
    expect(parsePipeline('6.5').expr).toEqual({ kind: 'num', value: 6.5 });
  });

  it('parses single, double and curly quoted strings', () => {
    expect(parsePipeline("'plan2'").expr).toEqual({ kind: 'str', value: 'plan2' });
    expect(parsePipeline('"plan2"').expr).toEqual({ kind: 'str', value: 'plan2' });
    expect(parsePipeline('‘uk’').expr).toEqual({ kind: 'str', value: 'uk' });
    expect(parsePipeline('“uk”').expr).toEqual({ kind: 'str', value: 'uk' });
    expect(parsePipeline("'it\\'s'").expr).toEqual({ kind: 'str', value: "it's" });
  });

  it('parses booleans and bare words', () => {
    expect(parsePipeline('true').expr).toEqual({ kind: 'bool', value: true });
    expect(parsePipeline('false').expr).toEqual({ kind: 'bool', value: false });
    expect(parsePipeline('plan2').expr).toEqual({ kind: 'word', value: 'plan2' });
  });
});

describe('parsePipeline: calls, fields, arithmetic, filters', () => {
  it('parses positional and named arguments', () => {
    const p = parsePipeline("ukTakeHome(30000, plan=plan2, code='S1257L')");
    expect(p.expr).toEqual({
      kind: 'call',
      name: 'ukTakeHome',
      args: [
        { value: { kind: 'num', value: 30000 } },
        { name: 'plan', value: { kind: 'word', value: 'plan2' } },
        { name: 'code', value: { kind: 'str', value: 'S1257L' } },
      ],
    });
  });

  it('parses an empty argument list', () => {
    expect(parsePipeline('f()').expr).toEqual({ kind: 'call', name: 'f', args: [] });
  });

  it('parses field access on a call result', () => {
    expect(parsePipeline('cardPayoff(5000, 22.99, 100).months').expr).toMatchObject({
      kind: 'field',
      field: 'months',
      target: { kind: 'call', name: 'cardPayoff' },
    });
  });

  it('respects precedence and parentheses', () => {
    expect(parsePipeline('1 + 2 * 3').expr).toEqual({
      kind: 'bin',
      op: '+',
      left: { kind: 'num', value: 1 },
      right: { kind: 'bin', op: '*', left: { kind: 'num', value: 2 }, right: { kind: 'num', value: 3 } },
    });
    expect(parsePipeline('(1 + 2) * 3').expr).toMatchObject({ kind: 'bin', op: '*', left: { kind: 'bin', op: '+' } });
    expect(parsePipeline('10 - 4 - 3').expr).toMatchObject({ kind: 'bin', op: '-', left: { kind: 'bin', op: '-' } });
    expect(parsePipeline('-5').expr).toEqual({ kind: 'neg', operand: { kind: 'num', value: 5 } });
  });

  it('parses a chain of filters with literal arguments', () => {
    const p = parsePipeline('x() | round100 | usd(2) | roundTo(-5) | pct(auto)');
    expect(p.filters).toEqual([
      { name: 'round100', args: [] },
      { name: 'usd', args: [2] },
      { name: 'roundTo', args: [-5] },
      { name: 'pct', args: ['auto'] },
    ]);
  });

  it('allows newlines inside a token', () => {
    expect(parsePipeline('\n  mortgagePayment(\n 300000, 7, 30)\n | usd ').filters).toEqual([{ name: 'usd', args: [] }]);
  });
});

describe('parsePipeline: errors', () => {
  const bad: Array<[string, RegExp]> = [
    ['', /empty token/],
    ['   ', /empty token/],
    ["'open", /unterminated string/],
    ['50k', /quote text that starts with a digit/],
    ['1e9', /quote text that starts with a digit/],
    ["code=1257L", /quote text/],
    ['1__0', /badly placed "_"/],
    ['10_', /badly placed "_"/],
    ['f(1', /expected "\)"/],
    ['f(1 2)', /expected "\)"/],
    ['(1 + 2', /expected "\)"/],
    ['1 + ', /expected a value/],
    ['a.', /expected a field name/],
    ['a.5', /expected a field name/],
    ['x | ', /expected a formatter name/],
    ['x | usd(f(1))', /expected "\)"|plain values/],
    ['x | usd(', /plain values|expected/],
    ['1 $ 2', /unexpected character "\$"/],
    ['1 2', /unexpected number 2/],
    ['f() g()', /unexpected/],
  ];
  for (const [src, re] of bad) {
    it(`rejects ${JSON.stringify(src)}`, () => {
      expect(() => parsePipeline(src)).toThrow(FigureSyntaxError);
      expect(() => parsePipeline(src)).toThrow(re);
    });
  }
});

describe('scanTokens', () => {
  it('finds tokens with their spans and inner text', () => {
    const text = 'Pay {{ a() | gbp }} and {{b()|usd}}.';
    const { tokens, problems } = scanTokens(text);
    expect(problems).toEqual([]);
    expect(tokens.map((t) => t.inner)).toEqual([' a() | gbp ', 'b()|usd']);
    expect(text.slice(tokens[0].start, tokens[0].end)).toBe('{{ a() | gbp }}');
  });

  it('treats \\{{ as an escape', () => {
    const { tokens, problems } = scanTokens('literal \\{{ not a token }} here');
    expect(tokens).toEqual([]);
    expect(problems).toEqual([]);
  });

  it('reports an unterminated token, and one interrupted by another {{', () => {
    expect(scanTokens('oops {{ a() | gbp').problems).toHaveLength(1);
    const r = scanTokens('{{ a( {{ b() }}');
    expect(r.problems.map((p) => p.start)).toEqual([0]);
    expect(r.tokens.map((t) => t.inner)).toEqual([' b() ']);
  });

  it('ignores text without tokens and stray closing braces', () => {
    expect(scanTokens('no tokens }} here')).toEqual({ tokens: [], problems: [] });
  });
});

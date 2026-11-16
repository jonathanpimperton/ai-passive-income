/**
 * Figure-token syntax: a small, safe parser for `{{ expression | formatter }}`.
 *
 * This file is syntax only (no engines, no formatting rules). The function
 * catalogue and the evaluator live in `figures.ts`.
 *
 * Grammar (whitespace, including newlines, is allowed between tokens):
 *
 *   token     := '{{' pipeline '}}'
 *   pipeline  := expr ( '|' filter )*
 *   filter    := IDENT ( '(' literal ( ',' literal )* ')' )?
 *   expr      := and ( '||' and )*
 *   and       := compare ( '&&' compare )*
 *   compare   := sum ( ( '<' | '>' | '<=' | '>=' | '==' | '!=' ) sum )?
 *   sum       := term ( ( '+' | '-' ) term )*
 *   term      := unary ( ( '*' | '/' ) unary )*
 *   unary     := '-' unary | '!' unary | postfix
 *   postfix   := primary ( '.' IDENT )*
 *   primary   := NUMBER | STRING | 'true' | 'false' | call | IDENT | '(' expr ')'
 *   call      := IDENT '(' ( arg ( ',' arg )* )? ')'
 *   arg       := IDENT '=' expr | expr
 *   literal   := NUMBER | '-' NUMBER | STRING | 'true' | 'false' | IDENT
 *
 * NUMBER is digits with optional `_` separators and an optional decimal part
 * (`300000`, `300_000`, `6.5`). STRING is single- or double-quoted (curly quotes
 * are accepted too, in case an editor converted them). A bare IDENT that is not
 * a call is a plain string (`plan=plan2` is the same as `plan='plan2'`).
 *
 * Comparisons (`<` `>` `<=` `>=` `==` `!=`) and the joins `&&` `||` `!` give a
 * true/false value. They exist for claim(condition, message) in figures.ts,
 * which asserts a derived statement at build time; a bare true/false cannot be
 * printed. A comparison does not chain (`a < b < c` is refused: write
 * `a < b && b < c`), and `||` is OR while a single `|` is still the formatter pipe.
 *
 * There is no `eval`, no property access on anything but function results, and
 * no way to reach JavaScript: the evaluator only calls functions registered in
 * the figures catalogue.
 */

export class FigureSyntaxError extends Error {
  /** Character offset inside the expression (not the whole document). */
  readonly at: number;
  constructor(message: string, at: number) {
    super(message);
    this.name = 'FigureSyntaxError';
    this.at = at;
  }
}

/* ── AST ─────────────────────────────────────────────────── */

export type Literal = number | string | boolean;

export type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  /** Bare identifier used as a value: evaluates to its own name as a string. */
  | { kind: 'word'; value: string }
  | { kind: 'call'; name: string; args: CallArg[] }
  | { kind: 'field'; target: ExprNode; field: string }
  | { kind: 'neg'; operand: ExprNode }
  | { kind: 'not'; operand: ExprNode }
  | { kind: 'bin'; op: BinaryOp; left: ExprNode; right: ExprNode };

export type CompareOp = '<' | '>' | '<=' | '>=' | '==' | '!=';
export type LogicOp = '&&' | '||';
export type BinaryOp = '+' | '-' | '*' | '/' | CompareOp | LogicOp;

const COMPARE_OPS: readonly CompareOp[] = ['<=', '>=', '==', '!=', '<', '>'];

export interface CallArg {
  /** Set for named arguments (`key=value`). */
  name?: string;
  value: ExprNode;
}

export interface FilterNode {
  name: string;
  args: Literal[];
}

export interface Pipeline {
  expr: ExprNode;
  filters: FilterNode[];
}

/* ── Lexer ───────────────────────────────────────────────── */

type Tok =
  | { t: 'num'; v: number; at: number }
  | { t: 'str'; v: string; at: number }
  | { t: 'id'; v: string; at: number }
  | { t: 'p'; v: string; at: number }
  | { t: 'eof'; at: number };

const PUNCT = new Set(['(', ')', ',', '=', '.', '+', '-', '*', '/', '|', '<', '>', '!']);
/** Two-character operators, tried before the single characters (so `||` is OR, not two pipes). */
const TWO_CHAR_OPS = new Set(['<=', '>=', '==', '!=', '&&', '||']);
const QUOTE_PAIRS: Record<string, string> = {
  "'": "'",
  '"': '"',
  '‘': '’', // ' '
  '“': '”', // " "
};

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const m = /^[0-9][0-9_]*(\.[0-9][0-9_]*)?/.exec(src.slice(i))!;
      const text = m[0];
      if (/_$|_\.|\._|__/.test(text)) {
        throw new FigureSyntaxError(`badly placed "_" in number "${text}"`, i);
      }
      const next = src[i + text.length];
      if (next !== undefined && /[A-Za-z_]/.test(next)) {
        throw new FigureSyntaxError(
          `unexpected "${next}" after number "${text}": quote text that starts with a digit (code='1257L') ` +
            'and write numbers in full (50000 or 50_000, not 50k or 5e4)',
          i + text.length,
        );
      }
      out.push({ t: 'num', v: Number(text.replace(/_/g, '')), at: i });
      i += text.length;
      continue;
    }
    if (ch in QUOTE_PAIRS) {
      const close = QUOTE_PAIRS[ch];
      let j = i + 1;
      let value = '';
      while (j < src.length && src[j] !== close) {
        if (src[j] === '\\' && j + 1 < src.length) {
          value += src[j + 1];
          j += 2;
          continue;
        }
        value += src[j];
        j++;
      }
      if (j >= src.length) throw new FigureSyntaxError('unterminated string', i);
      out.push({ t: 'str', v: value, at: i });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ t: 'id', v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      out.push({ t: 'p', v: two, at: i });
      i += 2;
      continue;
    }
    if (PUNCT.has(ch)) {
      out.push({ t: 'p', v: ch, at: i });
      i++;
      continue;
    }
    if (ch === '&') {
      throw new FigureSyntaxError('unexpected "&": write "&&" for and', i);
    }
    throw new FigureSyntaxError(`unexpected character "${ch}"`, i);
  }
  out.push({ t: 'eof', at: src.length });
  return out;
}

/* ── Parser ──────────────────────────────────────────────── */

class Parser {
  private pos = 0;
  constructor(private readonly toks: Tok[]) {}

  private peek(): Tok {
    return this.toks[this.pos];
  }
  private next(): Tok {
    return this.toks[this.pos++];
  }
  private isP(v: string): boolean {
    const t = this.peek();
    return t.t === 'p' && t.v === v;
  }
  private expectP(v: string, what: string): void {
    const t = this.peek();
    if (t.t === 'p' && t.v === v) {
      this.pos++;
      return;
    }
    throw new FigureSyntaxError(`expected "${v}" ${what}, found ${describe(t)}`, t.at);
  }

  pipeline(): Pipeline {
    const expr = this.expr();
    const filters: FilterNode[] = [];
    while (this.isP('|')) {
      this.pos++;
      filters.push(this.filter());
    }
    const t = this.peek();
    if (t.t !== 'eof') {
      throw new FigureSyntaxError(`unexpected ${describe(t)}`, t.at);
    }
    return { expr, filters };
  }

  private filter(): FilterNode {
    const t = this.next();
    if (t.t !== 'id') {
      throw new FigureSyntaxError(`expected a formatter name after "|", found ${describe(t)}`, t.at);
    }
    const args: Literal[] = [];
    if (this.isP('(')) {
      this.pos++;
      if (!this.isP(')')) {
        args.push(this.literal());
        while (this.isP(',')) {
          this.pos++;
          args.push(this.literal());
        }
      }
      this.expectP(')', `to close formatter "${t.v}"`);
    }
    return { name: t.v, args };
  }

  private literal(): Literal {
    const t = this.next();
    if (t.t === 'num') return t.v;
    if (t.t === 'p' && t.v === '-') {
      const n = this.next();
      if (n.t === 'num') return -n.v;
      throw new FigureSyntaxError(`expected a number after "-", found ${describe(n)}`, n.at);
    }
    if (t.t === 'str') return t.v;
    if (t.t === 'id') {
      if (t.v === 'true') return true;
      if (t.v === 'false') return false;
      return t.v;
    }
    throw new FigureSyntaxError(`formatter arguments must be plain values, found ${describe(t)}`, t.at);
  }

  private expr(): ExprNode {
    let left = this.and();
    while (this.isP('||')) {
      this.pos++;
      left = { kind: 'bin', op: '||', left, right: this.and() };
    }
    return left;
  }

  private and(): ExprNode {
    let left = this.compare();
    while (this.isP('&&')) {
      this.pos++;
      left = { kind: 'bin', op: '&&', left, right: this.compare() };
    }
    return left;
  }

  private compare(): ExprNode {
    const left = this.sum();
    const op = COMPARE_OPS.find((o) => this.isP(o));
    if (!op) return left;
    this.pos++;
    const right = this.sum();
    const again = COMPARE_OPS.find((o) => this.isP(o));
    if (again) {
      throw new FigureSyntaxError(`comparisons do not chain: write a ${op} b && b ${again} c instead of a ${op} b ${again} c`, this.peek().at);
    }
    return { kind: 'bin', op, left, right };
  }

  private sum(): ExprNode {
    let left = this.term();
    while (this.isP('+') || this.isP('-')) {
      const op = (this.next() as { v: '+' | '-' }).v;
      left = { kind: 'bin', op, left, right: this.term() };
    }
    return left;
  }

  private term(): ExprNode {
    let left = this.unary();
    while (this.isP('*') || this.isP('/')) {
      const op = (this.next() as { v: '*' | '/' }).v;
      left = { kind: 'bin', op, left, right: this.unary() };
    }
    return left;
  }

  private unary(): ExprNode {
    if (this.isP('-')) {
      this.pos++;
      return { kind: 'neg', operand: this.unary() };
    }
    if (this.isP('!')) {
      this.pos++;
      return { kind: 'not', operand: this.unary() };
    }
    return this.postfix();
  }

  private postfix(): ExprNode {
    let node = this.primary();
    while (this.isP('.')) {
      this.pos++;
      const t = this.next();
      if (t.t !== 'id') {
        throw new FigureSyntaxError(`expected a field name after ".", found ${describe(t)}`, t.at);
      }
      node = { kind: 'field', target: node, field: t.v };
    }
    return node;
  }

  private primary(): ExprNode {
    const t = this.next();
    if (t.t === 'num') return { kind: 'num', value: t.v };
    if (t.t === 'str') return { kind: 'str', value: t.v };
    if (t.t === 'p' && t.v === '(') {
      const inner = this.expr();
      this.expectP(')', 'to close "("');
      return inner;
    }
    if (t.t === 'id') {
      if (this.isP('(')) {
        this.pos++;
        return { kind: 'call', name: t.v, args: this.callArgs(t.v) };
      }
      if (t.v === 'true') return { kind: 'bool', value: true };
      if (t.v === 'false') return { kind: 'bool', value: false };
      return { kind: 'word', value: t.v };
    }
    throw new FigureSyntaxError(`expected a value, found ${describe(t)}`, t.at);
  }

  private callArgs(fn: string): CallArg[] {
    const args: CallArg[] = [];
    if (this.isP(')')) {
      this.pos++;
      return args;
    }
    for (;;) {
      const t = this.peek();
      const t2 = this.toks[this.pos + 1];
      if (t.t === 'id' && t2 && t2.t === 'p' && t2.v === '=') {
        this.pos += 2;
        args.push({ name: t.v, value: this.expr() });
      } else {
        args.push({ value: this.expr() });
      }
      if (this.isP(',')) {
        this.pos++;
        continue;
      }
      this.expectP(')', `to close the arguments of "${fn}("`);
      return args;
    }
  }
}

function describe(t: Tok): string {
  switch (t.t) {
    case 'eof':
      return 'end of token';
    case 'num':
      return `number ${t.v}`;
    case 'str':
      return `string "${t.v}"`;
    case 'id':
      return `"${t.v}"`;
    case 'p':
      return `"${t.v}"`;
  }
}

/** Parse the inside of a `{{ ... }}` token. Throws FigureSyntaxError. */
export function parsePipeline(src: string): Pipeline {
  if (src.trim() === '') throw new FigureSyntaxError('empty token', 0);
  return new Parser(lex(src)).pipeline();
}

/* ── Token scanning in a document ────────────────────────── */

export interface TokenSpan {
  /** Offset of the opening `{{` in the document. */
  start: number;
  /** Offset just after the closing `}}`. */
  end: number;
  /** Text between the braces. */
  inner: string;
}

export interface ScanProblem {
  start: number;
  message: string;
}

/**
 * Find every `{{ ... }}` token in a document. `\{{` is an escape and is not a
 * token (the backslash is left in place; Markdown removes it when rendering).
 * An opening `{{` with no matching `}}` (or with another `{{` first) is
 * reported as a problem rather than silently passed through.
 */
export function scanTokens(text: string): { tokens: TokenSpan[]; problems: ScanProblem[] } {
  const tokens: TokenSpan[] = [];
  const problems: ScanProblem[] = [];
  let i = 0;
  for (;;) {
    const open = text.indexOf('{{', i);
    if (open === -1) break;
    if (open > 0 && text[open - 1] === '\\') {
      i = open + 2;
      continue;
    }
    const close = text.indexOf('}}', open + 2);
    const nextOpen = text.indexOf('{{', open + 2);
    if (close === -1 || (nextOpen !== -1 && nextOpen < close)) {
      problems.push({ start: open, message: 'unterminated token: "{{" without a matching "}}"' });
      i = open + 2;
      continue;
    }
    tokens.push({ start: open, end: close + 2, inner: text.slice(open + 2, close) });
    i = close + 2;
  }
  return { tokens, problems };
}

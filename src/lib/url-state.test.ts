import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  encodeNumber,
  decodeNumber,
  encodeEnum,
  decodeEnum,
  encodeBool,
  decodeBool,
  encodeJson,
  decodeJson,
  applyParamUpdates,
  shareableUrlFrom,
  MAX_JSON_PARAM_LENGTH,
  UrlStateProvider,
  useUrlNumber,
  useUrlEnum,
  useUrlBool,
  useUrlJson,
  useUrlStateEnabled,
} from './url-state';

describe('number codec', () => {
  it('encodes compactly without exponents', () => {
    expect(encodeNumber(350000)).toBe('350000');
    expect(encodeNumber(6.75)).toBe('6.75');
    expect(encodeNumber(-12.5)).toBe('-12.5');
    expect(encodeNumber(0)).toBe('0');
    expect(encodeNumber(Infinity)).toBeNull();
    expect(encodeNumber(NaN)).toBeNull();
    expect(encodeNumber(1e21)).toBeNull();
    expect(encodeNumber(1e-7)).toBeNull();
  });

  it('round-trips', () => {
    for (const v of [0, 1, 7.25, 6.125, 350000, 9999999, -40, 0.5]) {
      expect(decodeNumber(encodeNumber(v))).toBe(v);
    }
  });

  it('rejects anything that is not a plain number', () => {
    for (const raw of ['', ' ', 'abc', '1e9', '1,000', '1.2.3', '0x10', 'Infinity', 'NaN', '--1', '5k', '$5']) {
      expect(decodeNumber(raw)).toBeNull();
    }
    expect(decodeNumber(null)).toBeNull();
    expect(decodeNumber(undefined)).toBeNull();
  });

  it('clamps to [min, max] and rounds integers', () => {
    expect(decodeNumber('15000000', { min: 0, max: 10000000 })).toBe(10000000);
    expect(decodeNumber('-5', { min: 0, max: 100 })).toBe(0);
    expect(decodeNumber('29.6', { integer: true, min: 1, max: 40 })).toBe(30);
    expect(decodeNumber(' 42 ')).toBe(42);
    expect(decodeNumber('.5')).toBe(0.5);
  });
});

describe('enum, bool and JSON codecs', () => {
  it('enum matches by string form', () => {
    const terms = [10, 15, 20, 25, 30] as const;
    expect(decodeEnum('30', terms)).toBe(30);
    expect(decodeEnum('31', terms)).toBeNull();
    expect(decodeEnum(encodeEnum(15), terms)).toBe(15);
    expect(decodeEnum('plan2', ['none', 'plan1', 'plan2'] as const)).toBe('plan2');
    expect(decodeEnum('PLAN2', ['none', 'plan1', 'plan2'] as const)).toBeNull();
    expect(decodeEnum(null, terms)).toBeNull();
  });

  it('bool', () => {
    expect(decodeBool(encodeBool(true))).toBe(true);
    expect(decodeBool(encodeBool(false))).toBe(false);
    expect(decodeBool('true')).toBe(true);
    expect(decodeBool('yes')).toBeNull();
    expect(decodeBool(null)).toBeNull();
  });

  interface Debt {
    name: string;
    balance: number;
  }
  const validateDebts = (v: unknown): Debt[] | null =>
    Array.isArray(v) &&
    v.length <= 10 &&
    v.every((d) => d && typeof d.name === 'string' && typeof d.balance === 'number' && Number.isFinite(d.balance))
      ? (v as Debt[])
      : null;

  it('JSON round-trips through a validator', () => {
    const debts = [{ name: 'Card', balance: 3000 }, { name: 'Car', balance: 12000 }];
    expect(decodeJson(encodeJson(debts), validateDebts)).toEqual(debts);
  });

  it('JSON rejects malformed, invalid or oversized params', () => {
    expect(decodeJson('{not json', validateDebts)).toBeNull();
    expect(decodeJson('[{"name":1}]', validateDebts)).toBeNull();
    expect(decodeJson('x'.repeat(MAX_JSON_PARAM_LENGTH + 1), validateDebts)).toBeNull();
    expect(encodeJson('x'.repeat(MAX_JSON_PARAM_LENGTH))).toBeNull();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(encodeJson(cyclic)).toBeNull();
  });
});

describe('URL building', () => {
  it('sets and deletes params, keeping path, other params and hash', () => {
    const next = applyParamUpdates(
      'https://www.calcrun.com/tools/x/?a=1&utm_source=z#faq',
      new Map([
        ['price', '425000'],
        ['a', null],
      ]),
    );
    expect(next).toBe('/tools/x/?utm_source=z&price=425000#faq');
  });

  it('share URL keeps only state params', () => {
    const href = 'https://www.calcrun.com/tools/x/?price=425000&utm_source=reddit&embed&gclid=1#faq';
    expect(shareableUrlFrom(href, ['price', 'term'])).toBe('https://www.calcrun.com/tools/x/?price=425000');
    expect(shareableUrlFrom(href, [])).toBe('https://www.calcrun.com/tools/x/');
  });
});

describe('hooks without a browser', () => {
  function Probe() {
    const enabled = useUrlStateEnabled();
    const [n] = useUrlNumber('n', 5, { min: 0, max: 10 });
    const [e] = useUrlEnum('e', 'b', ['a', 'b'] as const);
    const [b] = useUrlBool('b', true);
    const [j] = useUrlJson('j', [1, 2], (v) => (Array.isArray(v) ? (v as number[]) : null));
    return createElement('span', null, `${enabled}|${n}|${e}|${b}|${j.join(',')}`);
  }

  it('render their defaults on the server (disabled by default)', () => {
    expect(renderToStaticMarkup(createElement(Probe))).toBe('<span>false|5|b|true|1,2</span>');
  });

  it('render their defaults on the server even inside an enabled provider', () => {
    const html = renderToStaticMarkup(createElement(UrlStateProvider, { enabled: true }, createElement(Probe)));
    expect(html).toBe('<span>true|5|b|true|1,2</span>');
  });
});

import { describe, it, expect } from 'vitest';
import { parseUkTaxCode, regionForCode, type ParsedTaxCode } from './uk-tax-codes';

/**
 * Code meanings from GOV.UK (accessed 12 Nov 2026):
 * https://www.gov.uk/tax-codes/what-your-tax-code-means
 * https://www.gov.uk/tax-codes/emergency-tax-codes
 * Rates from https://www.gov.uk/scottish-income-tax (2026 to 2027) and
 * https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
 */

function allowanceOf(p: ParsedTaxCode): number {
  if (p.kind !== 'allowance') throw new Error(`expected allowance code, got ${p.kind}`);
  return p.allowance;
}

describe('parseUkTaxCode: allowance codes', () => {
  it('blank means the standard code', () => {
    expect(parseUkTaxCode('').kind).toBe('blank');
    expect(parseUkTaxCode('   ').kind).toBe('blank');
  });

  it('1257L = £12,570, L codes taper', () => {
    const p = parseUkTaxCode('1257L');
    expect(p.kind).toBe('allowance');
    expect(allowanceOf(p)).toBe(12_570);
    expect(p.kind === 'allowance' && p.tapers).toBe(true);
    expect(p.prefix).toBeNull();
  });

  it('is case- and space-insensitive', () => {
    expect(allowanceOf(parseUkTaxCode(' 1257l '))).toBe(12_570);
  });

  it('reads S (Scotland) and C (Wales) prefixes', () => {
    expect(parseUkTaxCode('S1257L').prefix).toBe('S');
    expect(parseUkTaxCode('C1257L').prefix).toBe('C');
    expect(allowanceOf(parseUkTaxCode('S1257L'))).toBe(12_570);
    expect(allowanceOf(parseUkTaxCode('C1257L'))).toBe(12_570);
  });

  it('reads the GOV.UK emergency examples (1257L W1, S875L M1, C663L X)', () => {
    const w1 = parseUkTaxCode('1257L W1');
    expect(w1.emergency).toBe('W1');
    expect(allowanceOf(w1)).toBe(12_570);
    const m1 = parseUkTaxCode('S875L M1');
    expect(m1.emergency).toBe('M1');
    expect(m1.prefix).toBe('S');
    expect(allowanceOf(m1)).toBe(8_750);
    const x = parseUkTaxCode('C663L X');
    expect(x.emergency).toBe('X');
    expect(x.prefix).toBe('C');
    expect(allowanceOf(x)).toBe(6_630);
  });

  it('accepts emergency markers without a space or with a slash, and NONCUM', () => {
    expect(parseUkTaxCode('1257LX').emergency).toBe('X');
    expect(parseUkTaxCode('1257LM1').emergency).toBe('M1');
    expect(parseUkTaxCode('1257L/W1').emergency).toBe('W1');
    expect(parseUkTaxCode('1257L NONCUM').emergency).toBe('NONCUM');
  });

  it('M, N and T codes keep their figure and do not taper', () => {
    for (const code of ['1383M', '1131N', '1100T']) {
      const p = parseUkTaxCode(code);
      expect(p.kind).toBe('allowance');
      expect(p.kind === 'allowance' && p.tapers).toBe(false);
    }
    expect(allowanceOf(parseUkTaxCode('1383M'))).toBe(13_830);
  });

  it('0T means no allowance', () => {
    const p = parseUkTaxCode('0T');
    expect(allowanceOf(p)).toBe(0);
    expect(parseUkTaxCode('S0T').prefix).toBe('S');
  });

  it('flags an implausibly large allowance but still uses it', () => {
    const p = parseUkTaxCode('9999L');
    expect(p.kind).toBe('allowance');
    expect(p.kind === 'allowance' && p.unusual).toBe(true);
    expect(parseUkTaxCode('1257L').kind === 'allowance' && (parseUkTaxCode('1257L') as { unusual: boolean }).unusual).toBe(false);
  });
});

describe('parseUkTaxCode: flat-rate codes', () => {
  const cases: [string, number, string][] = [
    ['BR', 0.20, 'basic rate'],
    ['D0', 0.40, 'higher rate'],
    ['D1', 0.45, 'additional rate'],
    ['CBR', 0.20, 'Welsh basic rate'],
    ['CD0', 0.40, 'Welsh higher rate'],
    ['CD1', 0.45, 'Welsh additional rate'],
    // MATH-UK-03: SD0 was 40% and SD1 48%; SD2/SD3 were ignored.
    ['SBR', 0.20, 'Scottish basic rate'],
    ['SD0', 0.21, 'Scottish intermediate rate'],
    ['SD1', 0.42, 'Scottish higher rate'],
    ['SD2', 0.45, 'Scottish advanced rate'],
    ['SD3', 0.48, 'Scottish top rate'],
  ];
  for (const [code, rate, label] of cases) {
    it(`${code} = ${(rate * 100).toFixed(0)}% (${label})`, () => {
      const p = parseUkTaxCode(code);
      expect(p.kind).toBe('flat');
      if (p.kind !== 'flat') return;
      expect(p.rate).toBeCloseTo(rate, 10);
      expect(p.bandLabel).toBe(label);
    });
  }

  it('D2 and D3 exist only as Scottish codes', () => {
    expect(parseUkTaxCode('D2').kind).toBe('invalid');
    expect(parseUkTaxCode('CD3').kind).toBe('invalid');
  });

  it('NT means no tax', () => {
    expect(parseUkTaxCode('NT').kind).toBe('nt');
  });
});

describe('parseUkTaxCode: K codes', () => {
  it('K475 adds £4,750', () => {
    const p = parseUkTaxCode('K475');
    expect(p.kind).toBe('k');
    expect(p.kind === 'k' && p.addition).toBe(4_750);
  });
  it('accepts prefixes and emergency markers', () => {
    const p = parseUkTaxCode('SK100 M1');
    expect(p.kind).toBe('k');
    expect(p.prefix).toBe('S');
    expect(p.emergency).toBe('M1');
  });
});

describe('parseUkTaxCode: unrecognised input (MATH-UK-05, CALC-UX-A-10)', () => {
  for (const code of ['abc', '??', 'L1257', 'D2', '-1257L', 'K', 'XYZ', '12', '1257', '12570', '99999L', '9999999999', 'X', 'S', 'CM1']) {
    it(`"${code}" is invalid`, () => {
      expect(parseUkTaxCode(code).kind).toBe('invalid');
    });
  }
});

describe('regionForCode', () => {
  it('S prefix selects Scottish bands even with the toggle off (MATH-UK-02)', () => {
    expect(regionForCode(parseUkTaxCode('S1257L'), false)).toEqual({ region: 'scotland', source: 'code' });
  });
  it('C prefix selects rest-of-UK bands even with the toggle on', () => {
    expect(regionForCode(parseUkTaxCode('C1257L'), true)).toEqual({ region: 'rUK', source: 'code' });
  });
  it('no prefix follows the toggle', () => {
    expect(regionForCode(parseUkTaxCode('1257L'), true).region).toBe('scotland');
    expect(regionForCode(parseUkTaxCode(''), false).region).toBe('rUK');
    expect(regionForCode(parseUkTaxCode('garbage'), true).region).toBe('scotland');
  });
});

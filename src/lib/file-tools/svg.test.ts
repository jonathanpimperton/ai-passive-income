import { describe, it, expect } from 'vitest';
import { parseSvgLength, resolveSvgSize, sanitizeSvgCss, parseViewBox } from './svg';

describe('parseSvgLength (FILES-07)', () => {
  it('converts CSS units to pixels', () => {
    expect(parseSvgLength('200')).toBe(200);
    expect(parseSvgLength('200px')).toBe(200);
    expect(parseSvgLength('72pt')).toBeCloseTo(96);
    expect(parseSvgLength('1in')).toBe(96);
    expect(parseSvgLength('10cm')).toBeCloseTo(377.95, 1);
    expect(parseSvgLength('25.4mm')).toBeCloseTo(96);
    expect(parseSvgLength('2em')).toBe(32);
    expect(parseSvgLength(' 1.5e2 ')).toBe(150);
  });
  it('flags percentages and rejects junk', () => {
    expect(parseSvgLength('100%')).toBe('percent');
    expect(parseSvgLength('auto')).toBeNull();
    expect(parseSvgLength('')).toBeNull();
    expect(parseSvgLength('-5')).toBeNull();
    expect(parseSvgLength('0')).toBeNull();
    expect(parseSvgLength(null)).toBeNull();
    expect(parseSvgLength('12furlongs')).toBeNull();
  });
});

describe('resolveSvgSize', () => {
  it('uses absolute sizes, converting units (10cm x 5cm)', () => {
    const s = resolveSvgSize({ width: '10cm', height: '5cm', viewBox: '0 0 100 50' });
    expect(s.width).toBeCloseTo(377.95, 1);
    expect(s.height).toBeCloseTo(188.98, 1);
    expect(s.defaulted).toBe(false);
    expect(s.viewBox).toBeNull();
  });
  it('falls back to the viewBox for percentages (no more 200x200 squares)', () => {
    const s = resolveSvgSize({ width: '100%', height: '100%', viewBox: '0 0 1000 500' });
    expect([s.width, s.height]).toEqual([1000, 500]);
  });
  it('keeps the aspect ratio when only one length is given', () => {
    expect(resolveSvgSize({ width: '200', height: null, viewBox: '0 0 400 100' })).toMatchObject({ width: 200, height: 50 });
    expect(resolveSvgSize({ width: '50%', height: '30', viewBox: '0,0,400,100' })).toMatchObject({ width: 120, height: 30 });
  });
  it('adds a viewBox for absolute sizes without one so content scales', () => {
    expect(resolveSvgSize({ width: '200', height: '100', viewBox: null }).viewBox).toBe('0 0 200 100');
  });
  it('defaults to 300x150 when nothing is usable', () => {
    expect(resolveSvgSize({ width: null, height: null, viewBox: null })).toMatchObject({ width: 300, height: 150, defaulted: true });
    expect(resolveSvgSize({ width: '100%', height: null, viewBox: 'bad' })).toMatchObject({ defaulted: true });
  });
  it('parses viewBoxes strictly', () => {
    expect(parseViewBox('0 0 10 20')).toEqual([0, 0, 10, 20]);
    expect(parseViewBox('0 0 0 20')).toBeNull();
    expect(parseViewBox('0 0 10')).toBeNull();
  });
});

describe('sanitizeSvgCss', () => {
  it('keeps class rules (Illustrator internal CSS) intact', () => {
    const css = '.cls-1{fill:#e63946;}.cls-2{fill:#2a9d8f;}';
    expect(sanitizeSvgCss(css)).toBe(css);
  });
  it('keeps in-document and data-image url() references', () => {
    expect(sanitizeSvgCss('fill:url(#g)')).toBe('fill:url(#g)');
    expect(sanitizeSvgCss('fill:url("#g")')).toBe('fill:url("#g")');
    expect(sanitizeSvgCss('background:url(data:image/png;base64,AAAA)')).toContain('data:image/png');
  });
  it('removes @import and external url() references', () => {
    expect(sanitizeSvgCss('@import url(https://x.invalid/a.css); .a{fill:red}')).toBe(' .a{fill:red}');
    expect(sanitizeSvgCss('.a{fill:url(https://x.invalid/x.svg#g)}')).toBe('.a{fill:none}');
    expect(sanitizeSvgCss(".a{background:url('//x.invalid/t.png')}")).toBe('.a{background:none}');
  });
});

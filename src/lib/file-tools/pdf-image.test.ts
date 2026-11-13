import { describe, it, expect } from 'vitest';
import { zlibSync } from 'fflate';
import { decodeFlateImage, undoPngPredictor, undoTiffPredictor, samplesToRgba, colourModel } from './pdf-image';
import { canvasSizeProblem, MAX_CANVAS_SIDE } from './canvas-limits';

describe('Flate image decoding (FILES-08)', () => {
  it('inflates plain samples', () => {
    const raw = new Uint8Array([1, 2, 3, 4, 5, 6]);
    expect(Array.from(decodeFlateImage(zlibSync(raw), { predictor: 1, colors: 3, bitsPerComponent: 8, columns: 2 }))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('undoes every PNG filter type', () => {
    // 2 columns x RGB = 6 bytes per row; rows use filters Sub, Up, Average, Paeth, None.
    const rows = [
      [10, 20, 30, 40, 50, 60],
      [11, 21, 31, 41, 51, 61],
      [5, 6, 7, 200, 201, 202],
      [9, 9, 9, 8, 8, 8],
      [1, 2, 3, 4, 5, 6],
    ];
    const filters = [1, 2, 3, 4, 0];
    const bpp = 3;
    const encoded: number[] = [];
    rows.forEach((row, y) => {
      const prev = y > 0 ? rows[y - 1] : [0, 0, 0, 0, 0, 0];
      encoded.push(filters[y]);
      row.forEach((x, i) => {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let pred = 0;
        if (filters[y] === 1) pred = a;
        if (filters[y] === 2) pred = b;
        if (filters[y] === 3) pred = (a + b) >> 1;
        if (filters[y] === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        encoded.push((x - pred) & 255);
      });
    });
    const out = undoPngPredictor(new Uint8Array(encoded), 3, 8, 2);
    expect(Array.from(out)).toEqual(rows.flat());
    const viaFlate = decodeFlateImage(zlibSync(new Uint8Array(encoded)), { predictor: 15, colors: 3, bitsPerComponent: 8, columns: 2 });
    expect(Array.from(viaFlate)).toEqual(rows.flat());
  });

  it('undoes the TIFF predictor', () => {
    const diffed = new Uint8Array([10, 5, 5, 250]); // 1 colour, 4 columns: 10, 15, 20, 14
    expect(Array.from(undoTiffPredictor(diffed, 1, 8, 4))).toEqual([10, 15, 20, 14]);
    expect(() => undoTiffPredictor(diffed, 1, 16, 2)).toThrow();
  });

  it('rejects corrupt streams and unknown filters', () => {
    expect(() => decodeFlateImage(new Uint8Array([1, 2, 3]), { predictor: 1, colors: 1, bitsPerComponent: 8, columns: 1 })).toThrow();
    expect(() => undoPngPredictor(new Uint8Array([9, 1]), 1, 8, 1)).toThrow();
  });

  it('expands grey and RGB samples to RGBA', () => {
    expect(Array.from(samplesToRgba(new Uint8Array([7, 9]), 2, 1, 1))).toEqual([7, 7, 7, 255, 9, 9, 9, 255]);
    expect(Array.from(samplesToRgba(new Uint8Array([1, 2, 3]), 1, 1, 3))).toEqual([1, 2, 3, 255]);
    expect(() => samplesToRgba(new Uint8Array([1]), 2, 2, 1)).toThrow();
  });

  it('classifies colour spaces; CMYK and others are left alone (FILES-14)', () => {
    expect(colourModel('/DeviceRGB')).toBe('rgb');
    expect(colourModel('/ICCBased', 3)).toBe('rgb');
    expect(colourModel('/ICCBased', 1)).toBe('grey');
    expect(colourModel('/ICCBased', 4)).toBe('other');
    expect(colourModel('/DeviceCMYK')).toBe('other');
    expect(colourModel('/Indexed')).toBe('other');
  });
});

describe('canvasSizeProblem (FILES-12)', () => {
  it('allows normal sizes and explains impossible ones', () => {
    expect(canvasSizeProblem(4032, 3024)).toBeNull();
    expect(canvasSizeProblem(32000, 24000)).toMatch(/16,384/);
    // 108 MP and 200 MP phone photos are allowed on desktop.
    expect(canvasSizeProblem(12000, 9000)).toBeNull();
    expect(canvasSizeProblem(16320, 12240)).toBeNull();
    expect(canvasSizeProblem(MAX_CANVAS_SIDE, MAX_CANVAS_SIDE)).toBeNull();
    expect(canvasSizeProblem(5000, 5000, true)).toMatch(/iPhone and iPad/);
    expect(canvasSizeProblem(5000, 5000, true)).toMatch(/maximum width/);
    expect(canvasSizeProblem(0, 10)).toMatch(/at least/);
    expect(canvasSizeProblem(NaN, 10)).toMatch(/at least/);
  });
});

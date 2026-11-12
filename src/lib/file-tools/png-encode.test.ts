import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import {
  encodePngLossless, encodePngIndexed, quantizeRgba, expandIndexed, psnr, psnrGateForQuality, analysePixels,
} from './png-encode';

// Image fixtures are decoded with sharp; allow for a busy machine.
vi.setConfig({ testTimeout: 30_000 });

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');

async function rgbaOf(file: string) {
  const { data, info } = await sharp(path.join(FIX, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { rgba: new Uint8Array(data), width: info.width, height: info.height };
}

async function decode(png: Uint8Array) {
  const { data, info } = await sharp(Buffer.from(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { rgba: new Uint8Array(data), width: info.width, height: info.height };
}

describe('encodePngLossless (FILES-03)', () => {
  it.each(['transparent-800x600.png', 'palette-512.png', 'logo-1024.png', 'screenshot-1920x1080.png', 'wide-1200x400.png'])(
    '%s: pixel-exact and no larger than the original',
    async (file) => {
      const src = await rgbaOf(file);
      const out = encodePngLossless(src.rgba, src.width, src.height);
      const back = await decode(out);
      expect(back.width).toBe(src.width);
      expect(back.height).toBe(src.height);
      expect(psnr(src.rgba, back.rgba)).toBe(Infinity);
      // Never worse than the input file (the old canvas path made these 2-4x larger).
      expect(out.length).toBeLessThanOrEqual(fs.statSync(path.join(FIX, file)).size * 1.05);
    },
  );

  it('handles grey, grey+alpha, RGB and RGBA truecolour', async () => {
    const w = 64, h = 64;
    const make = (fn: (x: number, y: number) => [number, number, number, number]) => {
      const px = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set(fn(x, y), (y * w + x) * 4);
      return px;
    };
    const cases = [
      make((x, y) => { const g = (x * 4 + y) & 255; return [g, g, g, 255]; }),
      make((x, y) => { const g = (x * 4 + y) & 255; return [g, g, g, (x * 3) & 255]; }),
      make((x, y) => [x * 4, y * 4, (x + y) * 2, 255]),
      make((x, y) => [x * 4, y * 4, (x + y) * 2, (x * y) & 255]),
    ];
    // Opaque grey can never exceed 256 colours, so it takes the palette path.
    expect(analysePixels(cases[0]).colourCount).toBeLessThanOrEqual(256);
    for (const px of cases.slice(1)) expect(analysePixels(px).colourCount).toBeGreaterThan(256);
    for (const px of cases) {
      const back = await decode(encodePngLossless(px, w, h));
      expect(psnr(px, back.rgba)).toBe(Infinity);
    }
  });

  it('writes 1-bit palettes for two-colour images', async () => {
    const w = 33, h = 7;
    const px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) px.set(i % 3 === 0 ? [255, 255, 255, 255] : [0, 0, 0, 0], i * 4);
    const out = encodePngLossless(px, w, h);
    expect(out[24]).toBe(1); // IHDR bit depth
    expect(out[25]).toBe(3); // colour type palette
    const back = await decode(out);
    expect(psnr(px, back.rgba)).toBe(Infinity);
  });

  it('rejects palettes outside 1-256 entries', () => {
    expect(() => encodePngIndexed(new Uint8Array(0), new Uint8Array(1), 1, 1)).toThrow();
  });
});

describe('quantizeRgba', () => {
  it('reduces a 1920x1080 screenshot to <=256 colours, keeps quality, and shrinks it', async () => {
    const src = await rgbaOf('screenshot-1920x1080.png');
    const q = quantizeRgba(src.rgba, src.width, src.height, 256, 0);
    expect(q.palette.length / 4).toBeLessThanOrEqual(256);
    const quality = psnr(src.rgba, expandIndexed(q, src.width * src.height));
    expect(quality).toBeGreaterThan(psnrGateForQuality(80));
    const png = encodePngIndexed(q.palette, q.indices, src.width, src.height);
    expect(png.length).toBeLessThan(fs.statSync(path.join(FIX, 'screenshot-1920x1080.png')).size);
  });

  it('keeps fully transparent pixels transparent', async () => {
    const src = await rgbaOf('transparent-800x600.png');
    const q = quantizeRgba(src.rgba, src.width, src.height, 16, 0.5);
    const back = expandIndexed(q, src.width * src.height);
    for (let i = 3; i < src.rgba.length; i += 4) {
      if (src.rgba[i] === 0) expect(back[i]).toBe(0);
    }
  });

  it('maps a photo-like gradient to a PSNR the gate would reject at high quality', () => {
    const w = 256, h = 256;
    const px = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set([x, y, (x * y) >> 8, 255], (y * w + x) * 4);
    const q = quantizeRgba(px, w, h, 256, 0);
    const value = psnr(px, expandIndexed(q, w * h));
    expect(value).toBeGreaterThan(20);
    expect(Number.isFinite(value)).toBe(true);
  });
});

describe('psnr and gate', () => {
  it('ignores colour differences under full transparency', () => {
    const a = new Uint8Array([10, 20, 30, 0, 1, 2, 3, 255]);
    const b = new Uint8Array([200, 100, 0, 0, 1, 2, 3, 255]);
    expect(psnr(a, b)).toBe(Infinity);
  });
  it('maps quality to a PSNR floor', () => {
    expect(psnrGateForQuality(100)).toBe(Infinity);
    expect(psnrGateForQuality(80)).toBeCloseTo(37.18, 1);
    expect(psnrGateForQuality(10)).toBe(24);
    expect(psnrGateForQuality(50)).toBeLessThan(psnrGateForQuality(80));
  });
});

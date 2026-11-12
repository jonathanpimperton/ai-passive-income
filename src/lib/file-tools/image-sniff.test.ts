import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { detectImageKind, isAnimatedImage, readJpegInfo, stripJpegApp1, countGifFrames } from './image-sniff';

const FIX = path.resolve(__dirname, '../../../tests/fixtures/file-tools');
const OLD = path.resolve(__dirname, '../../../tests/fixtures');
const read = (name: string, dir = FIX) => new Uint8Array(fs.readFileSync(path.join(dir, name)));

describe('detectImageKind', () => {
  it('identifies formats by magic bytes, not names', () => {
    expect(detectImageKind(read('exif-rot6-600x300.jpg'))).toBe('jpeg');
    expect(detectImageKind(read('logo-1024.png'))).toBe('png');
    expect(detectImageKind(read('transparent-400.webp'))).toBe('webp');
    expect(detectImageKind(read('animated-3f.gif'))).toBe('gif');
    expect(detectImageKind(read('quadrants-256x128.heic'))).toBe('heic');
    expect(detectImageKind(read('illustrator-style.svg'))).toBe('svg');
    expect(detectImageKind(read('complex.svg', OLD))).toBe('svg');
    expect(detectImageKind(read('notanimage.png'))).toBe('unknown');
  });
});

describe('isAnimatedImage (FILES-23)', () => {
  it('detects animated GIF and WebP, not still images', () => {
    expect(isAnimatedImage(read('animated-3f.gif'))).toBe(true);
    expect(isAnimatedImage(read('animated-3f.webp'))).toBe(true);
    expect(countGifFrames(read('animated-3f.gif'))).toBeGreaterThan(1);
    expect(isAnimatedImage(read('transparent-400.webp'))).toBe(false);
    expect(isAnimatedImage(read('logo-1024.png'))).toBe(false);
    expect(isAnimatedImage(read('exif-rot6-600x300.jpg'))).toBe(false);
  });

  it('detects APNG by its acTL chunk', () => {
    const png = read('logo-1024.png');
    // Insert a fake acTL chunk right after IHDR (8 sig + 25 IHDR).
    const actl = new Uint8Array([0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    const apng = new Uint8Array(png.length + actl.length);
    apng.set(png.subarray(0, 33));
    apng.set(actl, 33);
    apng.set(png.subarray(33), 33 + actl.length);
    expect(isAnimatedImage(apng)).toBe(true);
  });
});

describe('readJpegInfo', () => {
  it('reads size and component count', () => {
    const info = readJpegInfo(read('exif-rot6-600x300.jpg'));
    expect(info?.components).toBe(3);
    expect(info && info.width * info.height).toBe(600 * 300);
    expect(readJpegInfo(read('logo-1024.png'))).toBeNull();
  });
});

describe('stripJpegApp1', () => {
  it('removes Exif APP1 and keeps the image decodable structure', () => {
    const src = read('exif-rot6-600x300.jpg');
    const out = stripJpegApp1(src);
    expect(out.length).toBeLessThan(src.length);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    let hasApp1 = false;
    for (let i = 0; i < out.length - 1; i++) if (out[i] === 0xff && out[i + 1] === 0xe1) { hasApp1 = true; break; }
    expect(hasApp1).toBe(false);
    expect(readJpegInfo(out)).toEqual(readJpegInfo(src));
  });
  it('returns non-JPEG input unchanged', () => {
    const png = read('logo-1024.png');
    expect(stripJpegApp1(png)).toBe(png);
  });
});

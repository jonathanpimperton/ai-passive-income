import { describe, it, expect } from 'vitest';
import { formatBytes, baseName, withExtension, extensionOf, uniqueNames, plural } from './names';

describe('names', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(14438)).toBe('14.1 KB');
    expect(formatBytes(2.74 * 1024 * 1024)).toBe('2.74 MB');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });

  it('strips exactly one extension, never doubling it (FILES-18)', () => {
    expect(withExtension('x.jpg', '.jpg')).toBe('x.jpg');
    expect(withExtension('IMG_0001.HEIC', '.jpg')).toBe('IMG_0001.jpg');
    expect(withExtension('photo.heif', '.jpg')).toBe('photo.jpg');
    expect(withExtension('archive.tar.gz', '.zip')).toBe('archive.tar.zip');
    expect(withExtension('README', '.pdf')).toBe('README.pdf');
    expect(baseName('.env')).toBe('.env');
    expect(baseName('C:\\fakepath\\photo.jpg')).toBe('photo');
    expect(baseName('Café façade 東京 (1).jpg')).toBe('Café façade 東京 (1)');
  });

  it('reads extensions in lower case', () => {
    expect(extensionOf('A.PNG')).toBe('.png');
    expect(extensionOf('noext')).toBe('');
  });

  it('makes names unique case-insensitively', () => {
    expect(uniqueNames(['a.jpg', 'A.jpg', 'a.jpg', 'b.png'])).toEqual(['a.jpg', 'A (2).jpg', 'a (3).jpg', 'b.png']);
  });

  it('pluralises', () => {
    expect(plural(1, 'file')).toBe('1 file');
    expect(plural(3, 'file')).toBe('3 files');
  });
});

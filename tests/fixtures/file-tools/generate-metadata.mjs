/**
 * Fixtures for metadata removal in the Image Compressor (images carrying
 * GPS, camera and text metadata). Run: node tests/fixtures/file-tools/generate-metadata.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const EXIF = {
  IFD0: { Make: 'TestCam', Model: 'Phone 9', Copyright: 'secret-owner' },
  IFD2: { DateTimeOriginal: '2025:06:01 12:34:56' },
  IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '0/1 7/1 0/1' },
};
const photo = () => sharp({ create: { width: 400, height: 300, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } }).blur(1.5);

// A heavily compressed (q30) JPEG: re-encoding at the default 80% is larger, so the original is kept.
fs.writeFileSync(path.join(OUT, 'gps-q30.jpg'), await photo().jpeg({ quality: 30 }).withExif(EXIF).toBuffer());
// A WebP with EXIF.
fs.writeFileSync(path.join(OUT, 'meta.webp'), await photo().webp({ quality: 40 }).withExif(EXIF).toBuffer());
// A small palette PNG with eXIf plus a hand-made tEXt chunk.
const png = await sharp(path.join(OUT, 'palette-512.png')).png({ palette: true }).withExif(EXIF).toBuffer();
const text = Buffer.from('Comment\u0000taken at 51N 0W by secret-owner', 'latin1');
const chunk = Buffer.alloc(12 + text.length);
chunk.writeUInt32BE(text.length, 0);
chunk.write('tEXt', 4, 'latin1');
text.copy(chunk, 8);
fs.writeFileSync(path.join(OUT, 'meta.png'), Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]));
// A fully prefixed SVG with a prefixed script and foreignObject (namespace-aware sanitiser).
fs.writeFileSync(path.join(OUT, 'prefixed.svg'),
  '<s:svg xmlns:s="http://www.w3.org/2000/svg" width="20" height="10"><s:script>throw new Error("x")</s:script>'
  + '<s:foreignObject width="20" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></s:foreignObject>'
  + '<s:rect width="20" height="10" fill="#00ff00"/></s:svg>');
console.log('done');

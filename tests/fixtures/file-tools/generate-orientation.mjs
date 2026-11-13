/**
 * Fixtures for the Orientation (rotation flag) regression in the Image Compressor: pictures
 * whose stored pixels are NOT upright and that show the right way up only because of an
 * Orientation tag. Run: node tests/fixtures/file-tools/generate-orientation.mjs
 * (Random noise, so re-running produces different bytes; the files are committed.)
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
const noise = (width, height) => sharp({ create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } }).blur(1.5);

// 400x300 stored, Orientation 6 (shows 300x400), GPS + camera Exif, heavily compressed: at the
// default 80% quality a re-encode is larger, so the original pixels are kept.
fs.writeFileSync(path.join(OUT, 'gps-rot6-q30.jpg'),
  await noise(400, 300).jpeg({ quality: 30 }).withMetadata({ orientation: 6 }).withExif(EXIF).toBuffer());
// 160x80 stored, Orientation 6 (shows 80x160): a palette PNG with an eXIf chunk and a WebP with EXIF.
const png = await sharp(await noise(160, 80).png().toBuffer()).png({ palette: true, colours: 16 }).withMetadata({ orientation: 6 }).toBuffer();
fs.writeFileSync(path.join(OUT, 'rot6.png'), png);
fs.writeFileSync(path.join(OUT, 'rot6.webp'), await noise(160, 80).webp({ quality: 40 }).withMetadata({ orientation: 6 }).toBuffer());
console.log('done');

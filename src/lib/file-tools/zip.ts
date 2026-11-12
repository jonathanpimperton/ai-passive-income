/**
 * Single-ZIP downloads for multi-output actions (review FILES-09).
 *
 * Firing N separate downloads is throttled by browsers (only 20 of 500
 * split pages arrived in Chromium) and only the first works on iOS. Every
 * "download all" in the file tools goes through this instead.
 *
 * Entries are STORED (level 0): JPEG/PNG/WebP/PDF payloads are already
 * compressed, so deflating them wastes CPU for almost no gain.
 */
import { zipSync, type Zippable } from 'fflate';
import { uniqueNames } from './names';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Build a ZIP archive. Duplicate names get " (2)" suffixes instead of overwriting. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const names = uniqueNames(entries.map((e) => sanitiseEntryName(e.name)));
  const files: Zippable = {};
  entries.forEach((entry, i) => {
    files[names[i]] = [entry.data, { level: 0 }];
  });
  return zipSync(files, { level: 0 });
}

/** Strip path separators and control characters so an entry can never escape the archive root. */
export function sanitiseEntryName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/]+/g, '_').trim();
  return cleaned === '' || cleaned === '.' || cleaned === '..' ? 'file' : cleaned;
}

/**
 * Input sniffing and text decoding for the Excel/CSV to PDF tool
 * (review FILES-06, FILES-23).
 *
 * SheetJS reads a CSV ArrayBuffer as Latin-1 unless told otherwise, so UTF-8
 * files without a byte-order mark (the Google Sheets and bank-export format)
 * turned "£" into "Â£". CSVs are now decoded here first: BOM if present,
 * otherwise strict UTF-8, otherwise Windows-1252 (Excel's legacy "CSV" on
 * Western Windows). The tool also refused nothing: a PDF dropped onto it was
 * rendered as binary garbage.
 *
 * Pure functions (no DOM), unit-tested in text-decode.test.ts.
 */

export type SpreadsheetKind = 'zip' | 'ole' | 'text' | 'pdf' | 'binary' | 'empty';

/** Classify an upload by its first bytes. 'zip' = XLSX/ODS, 'ole' = legacy XLS. */
export function sniffSpreadsheet(bytes: Uint8Array): SpreadsheetKind {
  if (bytes.length === 0) return 'empty';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05) && (bytes[3] === 0x04 || bytes[3] === 0x06)) return 'zip';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return 'ole';
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
  // UTF-16 text has NUL bytes by design; recognise it by its BOM.
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) return 'text';
  const n = Math.min(bytes.length, 8192);
  let control = 0;
  for (let i = 0; i < n; i++) {
    const b = bytes[i];
    if (b === 0) return 'binary';
    if (b < 0x09 || (b > 0x0d && b < 0x20)) control += 1;
  }
  return control > n * 0.02 ? 'binary' : 'text';
}

export type TextEncodingName = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';

export interface DecodedText {
  text: string;
  encoding: TextEncodingName;
  hadBom: boolean;
}

/** Decode a text file: BOM first, then strict UTF-8, then Windows-1252. */
export function decodeTextFile(bytes: Uint8Array): DecodedText {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8', hadBom: true };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'utf-16le', hadBom: true };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'utf-16be', hadBom: true };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8', hadBom: false };
  } catch {
    // Not valid UTF-8: legacy Windows export.
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252', hadBom: false };
  }
}

/** True for characters jsPDF's built-in Helvetica (WinAnsi) can draw. */
export function isWinAnsiText(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) continue;
    // The 27 WinAnsi characters in 0x80-0x9F (euro, dashes, quotes, etc.)
    if ('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(ch)) continue;
    return false;
  }
  return true;
}

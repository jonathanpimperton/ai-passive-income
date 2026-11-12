/**
 * Reading spreadsheets for the Excel/CSV to PDF tool (review FILES-05,
 * FILES-06, FILES-21, FILES-23), using the vendored SheetJS CE 0.20.3.
 *
 * - Cells are taken as their formatted text (cell.w / format_cell), so dates
 *   print as dates, and currency and percent formats survive, instead of raw
 *   serial numbers like "46204.04".
 * - CSV/TXT files are decoded here (BOM, UTF-8, Windows-1252) and parsed with
 *   `raw: true`, so values are printed exactly as written (no "Â£", and no
 *   re-interpretation of "01/02/2026" or leading zeros).
 * - Non-spreadsheets (a PDF, an image) are refused with a clear message.
 * - Hidden rows and columns are skipped, as Excel does when printing; leading
 *   one-cell title rows are kept as titles rather than becoming the header.
 *
 * SheetJS is imported lazily. Unit-tested in spreadsheet.test.ts.
 */
import { sniffSpreadsheet, decodeTextFile } from './text-decode';
import { countTitleRows } from './table-layout';

export interface SheetCell {
  text: string;
  numeric: boolean;
}

export interface SheetData {
  name: string;
  titles: string[];
  header: SheetCell[];
  rows: SheetCell[][];
  columnCount: number;
}

export interface SpreadsheetResult {
  sheets: SheetData[];
  notices: string[];
}

/** Read every non-empty sheet. Throws an Error with a user-facing message when the file is not usable. */
export async function readSpreadsheet(bytes: Uint8Array, fileName: string): Promise<SpreadsheetResult> {
  const kind = sniffSpreadsheet(bytes);
  if (kind === 'empty') throw new Error(`"${fileName}" is empty.`);
  if (kind === 'pdf') throw new Error(`"${fileName}" is a PDF, not a spreadsheet. Upload an Excel (.xlsx, .xls) or CSV file.`);
  if (kind === 'binary') throw new Error(`"${fileName}" is not a spreadsheet this tool can read. Upload an Excel (.xlsx, .xls) or CSV file.`);

  const XLSX = await import('xlsx');
  const notices: string[] = [];
  let wb: import('xlsx').WorkBook;
  try {
    if (kind === 'text') {
      const decoded = decodeTextFile(bytes);
      if (decoded.encoding === 'windows-1252') {
        notices.push('This file is not UTF-8, so it was read with the Windows-1252 character set (Excel\'s older CSV format).');
      }
      wb = XLSX.read(decoded.text, { type: 'string', raw: true });
    } else {
      wb = XLSX.read(bytes, { type: 'array' });
    }
  } catch {
    throw new Error(`Could not read "${fileName}". It may be damaged, password-protected, or not a spreadsheet.`);
  }

  const sheets: SheetData[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const hiddenRows = new Set<number>();
    (ws['!rows'] ?? []).forEach((r, i) => { if (r && r.hidden) hiddenRows.add(i); });
    const hiddenCols = new Set<number>();
    (ws['!cols'] ?? []).forEach((c, i) => { if (c && c.hidden) hiddenCols.add(i); });
    const cols: number[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) if (!hiddenCols.has(c)) cols.push(c);

    const matrix: SheetCell[][] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      if (hiddenRows.has(r)) continue;
      const row: SheetCell[] = cols.map((c) => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })] as import('xlsx').CellObject | undefined;
        if (!cell || cell.t === 'z') return { text: '', numeric: false };
        let text: string;
        try {
          text = XLSX.utils.format_cell(cell);
        } catch {
          text = cell.v == null ? '' : String(cell.v);
        }
        return { text, numeric: cell.t === 'n' };
      });
      matrix.push(row);
    }
    // Drop trailing empty rows and columns (used ranges are often larger than the data).
    while (matrix.length > 0 && matrix[matrix.length - 1].every((cell) => cell.text.trim() === '')) matrix.pop();
    let width = matrix.reduce((w, row) => {
      for (let i = row.length - 1; i >= 0; i--) if (row[i].text.trim() !== '') return Math.max(w, i + 1);
      return w;
    }, 0);
    if (matrix.length === 0 || width === 0) continue;
    const trimmed = matrix.map((row) => row.slice(0, width));
    const titleCount = countTitleRows(trimmed.map((row) => row.map((c) => c.text)));
    const titles = trimmed.slice(0, titleCount).map((row) => row.map((c) => c.text).filter((t) => t.trim() !== '').join(' ')).filter(Boolean);
    const header = trimmed[titleCount] ?? [];
    const rows = trimmed.slice(titleCount + 1);
    width = Math.max(width, header.length);
    sheets.push({ name, titles, header, rows, columnCount: width });
  }
  return { sheets, notices };
}

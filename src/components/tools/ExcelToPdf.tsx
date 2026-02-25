/**
 * Excel to PDF — convert XLSX/CSV spreadsheets to PDF using SheetJS + jsPDF.
 * Renders the first sheet as a table in the PDF. Client-side only.
 */
import { useState, useCallback } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export default function ExcelToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setSheets([]);
    setActiveSheet(0);
    setProcessing(true);

    try {
      const XLSX = await import('xlsx');
      const data = await f.arrayBuffer();
      const wb = XLSX.read(data);

      const parsed: SheetData[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (json.length === 0) continue;
        const headers = json[0].map((h) => String(h));
        const rows = json.slice(1).map((row) => row.map((cell) => String(cell)));
        parsed.push({ name: sheetName, headers, rows });
      }

      if (parsed.length === 0) {
        setError('No data found in this spreadsheet.');
      } else {
        setFile(f);
        setSheets(parsed);
      }
    } catch {
      setError('Could not read this file — make sure it is an Excel (.xlsx) or CSV file.');
    }
    setProcessing(false);
  }, []);

  const convertToPdf = useCallback(async () => {
    if (!file || sheets.length === 0) return;
    setConverting(true);
    setError('');

    try {
      const { jsPDF } = await import('jspdf');
      const sheet = sheets[activeSheet];
      const colCount = sheet.headers.length;

      // Auto-detect orientation: many columns → landscape
      const orientation = colCount > 6 ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;

      // Calculate content-aware column widths based on actual data
      const fontSize = Math.max(5, Math.min(8, colCount <= 5 ? 8 : colCount <= 10 ? 7 : 5));
      pdf.setFontSize(fontSize);
      const charWidth = pdf.getTextWidth('W'); // use wide character for measurement

      // Measure max content width per column (header + all data rows, sample up to 100 rows)
      const sampleRows = sheet.rows.slice(0, 100);
      const colMaxChars: number[] = sheet.headers.map((h) => String(h).length);
      for (const row of sampleRows) {
        for (let i = 0; i < colCount; i++) {
          const cellLen = String(row[i] ?? '').length;
          if (cellLen > colMaxChars[i]) colMaxChars[i] = cellLen;
        }
      }

      // Compute proportional widths based on content, with min/max bounds
      const minColW = charWidth * 3; // at least 3 chars wide
      const maxColW = usableW * 0.4; // no column takes more than 40% of page
      let rawWidths = colMaxChars.map((chars) => {
        const w = Math.max(minColW, Math.min(maxColW, (chars + 1) * charWidth));
        return w;
      });

      // Scale to fit usableW
      const totalRaw = rawWidths.reduce((a, b) => a + b, 0);
      const scale = usableW / totalRaw;
      const colWidths = rawWidths.map((w) => w * scale);

      const lineH = fontSize * 0.5; // mm per text line
      const cellPad = 1; // padding inside cell

      /** Get X offset for column i */
      const colX = (i: number) => {
        let x = margin;
        for (let c = 0; c < i; c++) x += colWidths[c];
        return x;
      };

      /** Wrap text to fit within a given width (in mm) */
      const wrapText = (text: string, maxW: number): string[] => {
        const words = text.split(/\s+/);
        if (words.length === 0) return [''];
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          const test = current ? current + ' ' + word : word;
          if (pdf.getTextWidth(test) <= maxW - cellPad * 2) {
            current = test;
          } else {
            if (current) lines.push(current);
            // If single word is too long, truncate with ellipsis
            if (pdf.getTextWidth(word) > maxW - cellPad * 2) {
              let truncated = word;
              while (truncated.length > 1 && pdf.getTextWidth(truncated + '…') > maxW - cellPad * 2) {
                truncated = truncated.slice(0, -1);
              }
              current = truncated + '…';
            } else {
              current = word;
            }
          }
        }
        if (current) lines.push(current);
        return lines.length > 0 ? lines : [''];
      };

      let y = margin + 5;

      // Title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(sheet.name, margin, y);
      y += 8;

      // Reset to data font size
      pdf.setFontSize(fontSize);

      /** Draw a table row and return its height */
      const drawRow = (cells: string[], yPos: number, isHeader: boolean): number => {
        // Wrap all cells and find max line count
        const wrappedCells = cells.map((cell, i) => wrapText(String(cell), colWidths[i]));
        const maxLines = Math.max(...wrappedCells.map((wc) => wc.length));
        const rowH = maxLines * lineH + cellPad * 2;

        // Background
        if (isHeader) {
          pdf.setFillColor(230, 235, 242);
          pdf.rect(margin, yPos, usableW, rowH, 'F');
        }

        // Draw cell text
        pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
        for (let i = 0; i < colCount; i++) {
          const lines = wrappedCells[i] || [''];
          const x = colX(i) + cellPad;
          for (let li = 0; li < lines.length; li++) {
            pdf.text(lines[li], x, yPos + cellPad + lineH * (li + 0.8));
          }
        }

        // Draw cell borders
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        for (let i = 0; i <= colCount; i++) {
          const x = colX(Math.min(i, colCount - 1)) + (i === colCount ? colWidths[colCount - 1] : 0);
          pdf.line(x, yPos, x, yPos + rowH);
        }
        pdf.line(margin, yPos, margin + usableW, yPos);
        pdf.line(margin, yPos + rowH, margin + usableW, yPos + rowH);

        return rowH;
      };

      // Header
      y += drawRow(sheet.headers, y, true);

      // Data rows
      for (let ri = 0; ri < sheet.rows.length; ri++) {
        const row = sheet.rows[ri];
        // Estimate row height to check for page break
        const wrappedCells = row.map((cell, i) => wrapText(String(cell), colWidths[i]));
        const maxLines = Math.max(...wrappedCells.map((wc) => wc.length));
        const estH = maxLines * lineH + cellPad * 2;

        if (y + estH > pageH - margin) {
          pdf.addPage();
          y = margin + 5;
          // Repeat header on new page
          y += drawRow(sheet.headers, y, true);
        }

        // Alternating row background
        if (ri % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          const rowH = maxLines * lineH + cellPad * 2;
          pdf.rect(margin, y, usableW, rowH, 'F');
        }

        y += drawRow(row.slice(0, colCount), y, false);
      }

      pdf.save(file.name.replace(/\.(xlsx?|csv)$/i, '') + '.pdf');
    } catch (e) {
      setError('PDF generation failed. ' + (e instanceof Error ? e.message : ''));
    }
    setConverting(false);
  }, [file, sheets, activeSheet]);

  const sheet = sheets[activeSheet];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          acceptLabel="Supports: XLSX, XLS, CSV"
          onFiles={handleFiles}
        />

        {file && sheets.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Table size={20} className="text-green-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''} — {formatSize(file.size)}</p>
              </div>
            </div>

            {sheets.length > 1 && (
              <div>
                <label htmlFor="sheet-select" className="block text-sm font-medium text-neutral-700 mb-1">Sheet to convert</label>
                <select
                  id="sheet-select"
                  value={activeSheet}
                  onChange={(e) => setActiveSheet(Number(e.target.value))}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>{s.name} ({s.rows.length} rows)</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={convertToPdf}
              disabled={converting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {converting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Converting...
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-primary-700">Reading spreadsheet...</span>
          </div>
        )}

        {sheet ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">
              Preview: {sheet.name} ({sheet.rows.length} rows, {sheet.headers.length} columns)
            </p>
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr>
                      {sheet.headers.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 font-medium text-neutral-700 border-b border-neutral-200 whitespace-nowrap">
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 50).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                        {row.slice(0, sheet.headers.length).map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 text-neutral-800 border-b border-neutral-100 whitespace-nowrap max-w-[200px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sheet.rows.length > 50 && (
                <p className="text-xs text-neutral-400 text-center py-2 bg-neutral-50 border-t border-neutral-200">
                  Showing first 50 of {sheet.rows.length} rows
                </p>
              )}
            </div>
          </div>
        ) : !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload an Excel or CSV file to convert it to PDF</p>
            <p className="text-xs text-neutral-400 mt-1">Preview your data, then download as PDF</p>
          </div>
        )}
      </div>
    </div>
  );
}

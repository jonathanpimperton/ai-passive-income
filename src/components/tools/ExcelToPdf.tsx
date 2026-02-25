/**
 * Excel to PDF — convert XLSX/CSV spreadsheets to PDF using SheetJS + jsPDF.
 * Renders the first sheet as a table in the PDF. Client-side only.
 */
import { useState, useCallback, useRef } from 'react';
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
  const tableRef = useRef<HTMLDivElement>(null);

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
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const colCount = sheet.headers.length;
      const colW = usableW / colCount;
      const rowH = 7;
      let y = margin + 5;

      // Title
      pdf.setFontSize(14);
      pdf.text(sheet.name, margin, y);
      y += 10;

      // Header row
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 4, usableW, rowH, 'F');
      sheet.headers.forEach((h, i) => {
        pdf.text(String(h).substring(0, 25), margin + i * colW + 1, y);
      });
      y += rowH;

      // Data rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      for (const row of sheet.rows) {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin + 5;
        }
        // Alternating row background
        if (sheet.rows.indexOf(row) % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, y - 4, usableW, rowH, 'F');
        }
        row.forEach((cell, i) => {
          if (i < colCount) {
            pdf.text(String(cell).substring(0, 30), margin + i * colW + 1, y);
          }
        });
        y += rowH;
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
          <div className="space-y-3" ref={tableRef}>
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

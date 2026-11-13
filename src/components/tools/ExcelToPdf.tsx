/**
 * Excel to PDF — convert XLSX/XLS/CSV spreadsheets to a PDF table with
 * SheetJS (vendored CE 0.20.3) + jsPDF. One sheet at a time. Client-side only.
 *
 * Review fixes (FILES-05, FILES-06, FILES-21, FILES-23): dates and number
 * formats print as they look in Excel; wide sheets are never truncated
 * (landscape, smaller font, then column bands); non-Latin text prints via an
 * embedded Unicode font (or as images for scripts it lacks); CSV encoding is
 * detected; non-spreadsheets such as PDFs are refused.
 */
import { useState, useCallback } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { ToolMessages, ProcessingBanner } from '../ui/FileToolKit';
import { formatBytes, baseName, plural } from '../../lib/file-tools/names';
import { readSpreadsheet, type SheetData } from '../../lib/file-tools/spreadsheet';
import { downloadBlob, readBytes, bytesToBlob, errorMessage } from '../../lib/file-tools/browser';

export default function ExcelToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [readNotices, setReadNotices] = useState<string[]>([]);

  const processing = progress !== '';

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setErrors([]);
    setNotices([]);
    setReadNotices([]);
    setSheets([]);
    setFile(null);
    setActiveSheet(0);
    setProgress('Reading spreadsheet...');
    try {
      const { sheets: parsed, notices: n } = await readSpreadsheet(await readBytes(f), f.name);
      if (parsed.length === 0) {
        setErrors([`No data found in "${f.name}".`]);
      } else {
        setFile(f);
        setSheets(parsed);
        setReadNotices(n);
      }
    } catch (e) {
      setErrors([errorMessage(e, `Could not read "${f.name}". Make sure it is an Excel (.xlsx, .xls) or CSV file.`)]);
    } finally {
      setProgress('');
    }
  }, []);

  const convertToPdf = useCallback(async () => {
    if (!file || sheets.length === 0) return;
    setErrors([]);
    setNotices([]);
    setProgress('Creating PDF...');
    try {
      const { renderSheetPdf } = await import('../../lib/file-tools/sheet-pdf');
      const sheet = sheets[activeSheet];
      const out = await renderSheetPdf(sheet);
      const name = sheets.length > 1 ? `${baseName(file.name)} - ${sheet.name}.pdf` : `${baseName(file.name)}.pdf`;
      downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), name.replace(/[\\/:*?"<>|]+/g, '_'));
      const info = [`Saved ${plural(out.pages, 'page')} (${out.orientation}, ${formatBytes(out.bytes.length)}).`];
      if (out.bands > 1) info.push(`The sheet is too wide for one page, so its columns are printed in ${out.bands} parts, one after another.`);
      if (out.imageCells > 0) info.push(`${plural(out.imageCells, 'cell')} with characters the PDF font lacks (for example Chinese or Japanese) ${out.imageCells === 1 ? 'was' : 'were'} drawn as images, so ${out.imageCells === 1 ? 'it is' : 'they are'} visible but not searchable.`);
      if (out.fontFallback) info.push('The Unicode font could not be loaded, so non-Western text was drawn as images.');
      setNotices(info);
    } catch (e) {
      setErrors([`PDF generation failed: ${errorMessage(e, 'unknown error.')}`]);
    } finally {
      setProgress('');
    }
  }, [file, sheets, activeSheet]);

  const sheet = sheets[activeSheet];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          acceptLabel="Supports: XLSX, XLS, CSV"
          onFiles={handleFiles}
          disabled={processing}
        />

        {file && sheets.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Table size={20} className="text-primary-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{plural(sheets.length, 'sheet')} — {formatBytes(file.size)}</p>
              </div>
            </div>

            {sheets.length > 1 && (
              <div>
                <label htmlFor="sheet-select" className="block text-sm font-medium text-neutral-700 mb-1">Sheet to convert</label>
                <select
                  id="sheet-select"
                  value={activeSheet}
                  onChange={(e) => setActiveSheet(Number(e.target.value))}
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>{s.name} ({s.rows.length} rows)</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={convertToPdf}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              <Download size={16} aria-hidden="true" />
              Download as PDF
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} />}
          <ToolMessages errors={errors} notices={[...readNotices, ...notices]} />
        </div>

        {sheet ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">
              Preview: {sheet.name} ({sheet.rows.length} rows, {sheet.columnCount} columns)
            </p>
            {sheet.titles.length > 0 && (
              <p className="text-sm font-semibold text-neutral-900">{sheet.titles.join(' · ')}</p>
            )}
            <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">Preview of the first 50 rows of {sheet.name}</caption>
                  <thead className="bg-neutral-50 sticky top-0">
                    <tr>
                      {Array.from({ length: sheet.columnCount }, (_, i) => (
                        <th key={i} scope="col" className="text-left px-3 py-2 font-medium text-neutral-700 border-b border-neutral-200 whitespace-nowrap">
                          {sheet.header[i]?.text || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 50).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                        {Array.from({ length: sheet.columnCount }, (_, ci) => (
                          <td
                            key={ci}
                            className={`px-3 py-1.5 text-neutral-800 border-b border-neutral-100 whitespace-pre-line max-w-[240px] break-words ${row[ci]?.numeric ? 'text-right' : ''}`}
                          >
                            {row[ci]?.text ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sheet.rows.length > 50 && (
                <p className="text-xs text-neutral-500 text-center py-2 bg-neutral-50 border-t border-neutral-200">
                  Showing first 50 of {sheet.rows.length} rows (the PDF includes all of them)
                </p>
              )}
            </div>
          </div>
        ) : !processing && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload an Excel or CSV file to convert it to PDF</p>
            <p className="text-xs text-neutral-500 mt-1">Preview your data, then download as PDF</p>
          </div>
        )}
      </div>
    </div>
  );
}

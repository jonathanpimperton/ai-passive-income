/**
 * PDF Split — extract specific pages from a PDF using pdf-lib.
 * Client-side only. No server upload.
 */
import { useState, useCallback } from 'react';
import { Download, FileText, Scissors } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Parse page range string like "1-3, 5, 8-10" into 0-based indices */
function parsePageRanges(input: string, maxPage: number): number[] {
  const indices = new Set<number>();
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const range = part.split('-').map((s) => parseInt(s.trim(), 10));
    if (range.length === 1 && !isNaN(range[0])) {
      const p = range[0];
      if (p >= 1 && p <= maxPage) indices.add(p - 1);
    } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
      const start = Math.max(1, range[0]);
      const end = Math.min(maxPage, range[1]);
      for (let i = start; i <= end; i++) indices.add(i - 1);
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

type SplitMode = 'range' | 'every-page';

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeInput, setRangeInput] = useState('');
  const [mode, setMode] = useState<SplitMode>('range');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setFile(f);
      setPageCount(doc.getPageCount());
      setRangeInput(`1-${doc.getPageCount()}`);
    } catch {
      setError('Could not read this PDF — it may be encrypted or corrupted.');
    }
  }, []);

  const splitByRange = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const srcBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const indices = parsePageRanges(rangeInput, pageCount);
      if (indices.length === 0) {
        setError('No valid pages in that range.');
        setProcessing(false);
        return;
      }
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, indices);
      pages.forEach((p) => newDoc.addPage(p));
      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '') + '_extracted.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Split failed — the PDF may be corrupted.');
    }
    setProcessing(false);
  }, [file, rangeInput, pageCount]);

  const splitEveryPage = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const srcBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const baseName = file.name.replace(/\.pdf$/i, '');
      for (let i = 0; i < srcDoc.getPageCount(); i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(page);
        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_page${i + 1}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Split failed — the PDF may be corrupted.');
    }
    setProcessing(false);
  }, [file]);

  const handleSplit = mode === 'range' ? splitByRange : splitEveryPage;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
        />

        {file && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{pageCount} page{pageCount !== 1 ? 's' : ''} — {formatSize(file.size)}</p>
              </div>
            </div>

            <div>
              <span id="split-mode-label" className="block text-sm font-medium text-neutral-700 mb-1">Split mode</span>
              <div className="flex gap-2" role="radiogroup" aria-labelledby="split-mode-label">
                <button role="radio" aria-checked={mode === 'range'} onClick={() => setMode('range')} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 ${mode === 'range' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}>
                  Extract range
                </button>
                <button role="radio" aria-checked={mode === 'every-page'} onClick={() => setMode('every-page')} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 ${mode === 'every-page' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}>
                  Every page
                </button>
              </div>
            </div>

            {mode === 'range' && (
              <div>
                <label htmlFor="page-range" className="block text-sm font-medium text-neutral-700 mb-1">
                  Page range
                </label>
                <input
                  id="page-range"
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                />
                <p className="text-xs text-neutral-400 mt-1">Pages 1 to {pageCount}. Use commas and dashes.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-primary-700">Splitting PDF...</span>
          </div>
        )}

        {file ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-6 text-center">
              <Scissors size={40} className="text-primary-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-700 font-medium mb-1">
                {mode === 'range'
                  ? `Extract pages ${rangeInput || '...'} from ${file.name}`
                  : `Split all ${pageCount} pages into separate PDFs`}
              </p>
              <p className="text-xs text-neutral-500 mb-4">
                {mode === 'range'
                  ? `${parsePageRanges(rangeInput, pageCount).length} page(s) will be extracted`
                  : `${pageCount} individual PDF files will be downloaded`}
              </p>
              <button
                onClick={handleSplit}
                disabled={processing}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                {mode === 'range' ? 'Extract & Download' : 'Split & Download All'}
              </button>
            </div>
          </div>
        ) : !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a PDF to extract pages from it</p>
            <p className="text-xs text-neutral-400 mt-1">Split by range or into individual pages</p>
          </div>
        )}
      </div>
    </div>
  );
}

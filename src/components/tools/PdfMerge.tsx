/**
 * PDF Merge — combine multiple PDFs into one using pdf-lib.
 * Drag to reorder. Client-side only. No server upload.
 */
import { useState, useCallback, useRef } from 'react';
import { Download, Trash2, FileText, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

interface PdfEntry {
  id: string;
  file: File;
  pageCount: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfMerge() {
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (files: File[]) => {
    setError('');
    const { PDFDocument } = await import('pdf-lib');
    const entries: PdfEntry[] = [];
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        entries.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          pageCount: doc.getPageCount(),
        });
      } catch {
        setError(`Could not read "${file.name}" — it may be encrypted or corrupted.`);
      }
    }
    if (entries.length > 0) setPdfs((prev) => [...prev, ...entries]);
  }, []);

  const removePdf = (id: string) => setPdfs((prev) => prev.filter((p) => p.id !== id));

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pdfs.length) return;
    setPdfs((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const clearAll = () => setPdfs([]);

  const merge = useCallback(async () => {
    if (pdfs.length < 2) return;
    setMerging(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const merged = await PDFDocument.create();
      for (const entry of pdfs) {
        const bytes = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Merge failed — one or more PDFs may be corrupted.');
    }
    setMerging(false);
  }, [pdfs]);

  const totalPages = pdfs.reduce((sum, p) => sum + p.pageCount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          multiple
          onFiles={handleFiles}
        />
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>
        )}

        {pdfs.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                <span className="font-semibold">{pdfs.length}</span> PDF{pdfs.length !== 1 ? 's' : ''} — {totalPages} total page{totalPages !== 1 ? 's' : ''}
              </span>
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors duration-150">
                <Trash2 size={14} aria-hidden="true" /> Clear all
              </button>
            </div>

            <div className="space-y-2">
              {pdfs.map((pdf, i) => (
                <div key={pdf.id} className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200/80 shadow-card p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 transition-colors" aria-label="Move up">
                      <ChevronUp size={14} aria-hidden="true" />
                    </button>
                    <button onClick={() => moveItem(i, 1)} disabled={i === pdfs.length - 1} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 transition-colors" aria-label="Move down">
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <FileText size={20} className="text-red-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{pdf.file.name}</p>
                    <p className="text-xs text-neutral-500">{pdf.pageCount} page{pdf.pageCount !== 1 ? 's' : ''} — {formatSize(pdf.file.size)}</p>
                  </div>
                  <button onClick={() => removePdf(pdf.id)} className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors duration-150" aria-label={`Remove ${pdf.file.name}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                ref={addMoreRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleFiles(Array.from(files));
                  e.target.value = '';
                }}
              />
              <button onClick={() => addMoreRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 transition-colors duration-150">
                <Plus size={16} aria-hidden="true" /> Add more
              </button>
              <button
                onClick={merge}
                disabled={merging || pdfs.length < 2}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
              >
                {merging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Download size={16} aria-hidden="true" />
                    Merge & Download
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload 2 or more PDFs to merge them</p>
            <p className="text-xs text-neutral-400 mt-1">Reorder with arrows, then download as one file</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PDF Merge — combine multiple PDFs into one using pdf-lib.
 * Reorder with arrow buttons. Client-side only. No server upload.
 *
 * Encrypted PDFs are refused by name with a workaround instead of becoming
 * blank pages in the output (review FILES-02). Form fields from every file
 * keep working in the merged PDF (FILES-19).
 */
import { useState, useCallback, useRef } from 'react';
import { Download, Trash2, FileText, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import type { PDFDocument } from 'pdf-lib';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { ToolMessages, ProcessingBanner, ResultsToolbar } from '../ui/FileToolKit';
import { formatBytes, plural } from '../../lib/file-tools/names';
import { loadPdfForEditing, rebuildAcroForm } from '../../lib/file-tools/pdf-load';
import { downloadBlob, readBytes, errorMessage, bytesToBlob } from '../../lib/file-tools/browser';

interface PdfEntry {
  id: string;
  file: File;
  doc: PDFDocument;
  pageCount: number;
}

export default function PdfMerge() {
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);

  const processing = progress !== '';

  const handleFiles = useCallback(async (files: File[]) => {
    setErrors([]);
    setNotices([]);
    const entries: PdfEntry[] = [];
    const failures: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Reading ${i + 1} of ${files.length}: ${file.name}...`);
        try {
          const res = await loadPdfForEditing(await readBytes(file), file.name);
          if (!res.ok) { failures.push(res.message); continue; }
          entries.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            doc: res.doc,
            pageCount: res.pageCount,
          });
        } catch (e) {
          failures.push(errorMessage(e, `Could not read "${file.name}".`));
        }
      }
    } finally {
      setProgress('');
    }
    if (entries.length > 0) setPdfs((prev) => [...prev, ...entries]);
    if (failures.length > 0) setErrors(failures);
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

  const clearAll = () => {
    setPdfs([]);
    setErrors([]);
    setNotices([]);
  };

  const merge = useCallback(async () => {
    if (pdfs.length < 2) return;
    setErrors([]);
    setNotices([]);
    try {
      const { PDFDocument: Doc } = await import('pdf-lib');
      const merged = await Doc.create();
      for (let i = 0; i < pdfs.length; i++) {
        const entry = pdfs[i];
        setProgress(`Merging ${i + 1} of ${pdfs.length}: ${entry.file.name}...`);
        const pages = await merged.copyPages(entry.doc, entry.doc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const fields = await rebuildAcroForm(merged, pdfs.map((p) => p.doc));
      setProgress('Saving merged PDF...');
      const pdfBytes = await merged.save();
      downloadBlob(bytesToBlob(pdfBytes, 'application/pdf'), 'merged.pdf');
      setNotices([
        `Merged ${plural(merged.getPageCount(), 'page')} into merged.pdf (${formatBytes(pdfBytes.length)}).` +
        (fields > 0 ? ` ${plural(fields, 'form field')} kept.` : ''),
      ]);
    } catch (e) {
      setErrors([`Merge failed: ${errorMessage(e, 'one of the PDFs could not be processed.')}`]);
    } finally {
      setProgress('');
    }
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
          disabled={processing}
        />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {pdfs.length > 0 ? (
          <>
            <ResultsToolbar
              summary={<><span className="font-semibold">{pdfs.length}</span> PDF{pdfs.length !== 1 ? 's' : ''} — {totalPages} total page{totalPages !== 1 ? 's' : ''}</>}
              onClear={clearAll}
              busy={processing}
            />

            <ul className="space-y-2">
              {pdfs.map((pdf, i) => (
                <li key={pdf.id} className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200/80 shadow-card p-2 pr-3">
                  <div className="flex shrink-0">
                    <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 transition-colors duration-150" aria-label={`Move ${pdf.file.name} up`}>
                      <ChevronUp size={20} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => moveItem(i, 1)} disabled={i === pdfs.length - 1} className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 transition-colors duration-150" aria-label={`Move ${pdf.file.name} down`}>
                      <ChevronDown size={20} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="hidden sm:flex w-10 h-10 rounded-lg bg-red-50 items-center justify-center shrink-0">
                    <FileText size={20} className="text-red-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{pdf.file.name}</p>
                    <p className="text-xs text-neutral-500">{plural(pdf.pageCount, 'page')} — {formatBytes(pdf.file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removePdf(pdf.id)} className="inline-flex items-center justify-center w-11 h-11 text-neutral-500 hover:text-red-600 transition-colors duration-150" aria-label={`Remove ${pdf.file.name}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <input
                ref={addMoreRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) void handleFiles(Array.from(files));
                  e.target.value = '';
                }}
              />
              <button type="button" onClick={() => addMoreRef.current?.click()} disabled={processing} className="inline-flex items-center gap-2 min-h-11 px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 disabled:opacity-50 transition-colors duration-150">
                <Plus size={16} aria-hidden="true" /> Add more
              </button>
              <button
                type="button"
                onClick={merge}
                disabled={processing || pdfs.length < 2}
                className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                Merge & Download
              </button>
            </div>
            {pdfs.length < 2 && <p className="text-xs text-neutral-500">Add at least one more PDF to merge.</p>}
          </>
        ) : !processing && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload 2 or more PDFs to merge them</p>
            <p className="text-xs text-neutral-500 mt-1">Reorder with arrows, then download as one file</p>
          </div>
        )}
      </div>
    </div>
  );
}

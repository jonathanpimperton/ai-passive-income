/**
 * PDF Split — extract specific pages from a PDF using pdf-lib.
 * Client-side only. No server upload.
 *
 * Encrypted PDFs are refused with a workaround instead of producing blank
 * pages (review FILES-02). "Every page" downloads one ZIP instead of firing
 * hundreds of separate downloads that browsers throttle (FILES-09). Form
 * fields on extracted pages keep working (FILES-19). Page ranges accept
 * dashes of any kind and open ranges such as "3-" (FILES-23).
 */
import { useState, useCallback, useRef } from 'react';
import { Download, FileText, Scissors } from 'lucide-react';
import type { PDFDocument } from 'pdf-lib';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { ToolMessages, ProcessingBanner } from '../ui/FileToolKit';
import { formatBytes, baseName, plural } from '../../lib/file-tools/names';
import { parsePageRanges } from '../../lib/file-tools/pdf-checks';
import { loadPdfForEditing, rebuildAcroForm } from '../../lib/file-tools/pdf-load';
import { buildZip } from '../../lib/file-tools/zip';
import { downloadBlob, readBytes, errorMessage, nextFrame, bytesToBlob } from '../../lib/file-tools/browser';

type SplitMode = 'range' | 'every-page';

/** Copy `indices` of `src` into a new PDF and return its bytes. */
async function extractPages(src: PDFDocument, indices: number[]): Promise<Uint8Array> {
  const { PDFDocument: Doc } = await import('pdf-lib');
  const out = await Doc.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  await rebuildAcroForm(out, [src]);
  return out.save();
}

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeInput, setRangeInput] = useState('');
  const [mode, setMode] = useState<SplitMode>('range');
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const docRef = useRef<PDFDocument | null>(null);
  const runRef = useRef(0);

  const processing = progress !== '';

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    runRef.current += 1;
    setErrors([]);
    setNotices([]);
    setProgress('Reading PDF...');
    try {
      const res = await loadPdfForEditing(await readBytes(f), f.name);
      if (!res.ok) {
        docRef.current = null;
        setFile(null);
        setPageCount(0);
        setErrors([res.message]);
        return;
      }
      docRef.current = res.doc;
      setFile(f);
      setPageCount(res.pageCount);
      setRangeInput(`1-${res.pageCount}`);
    } catch (e) {
      setErrors([errorMessage(e, `Could not read "${f.name}".`)]);
    } finally {
      setProgress('');
    }
  }, []);

  const parsed = parsePageRanges(rangeInput, pageCount);

  const splitByRange = useCallback(async () => {
    const src = docRef.current;
    if (!file || !src) return;
    if (parsed.pages.length === 0) {
      setErrors([`No valid pages in "${rangeInput}". Use pages 1 to ${pageCount}, for example 1-3, 5.`]);
      return;
    }
    setErrors([]);
    setNotices([]);
    setProgress(`Extracting ${plural(parsed.pages.length, 'page')}...`);
    try {
      const bytes = await extractPages(src, parsed.pages);
      downloadBlob(bytesToBlob(bytes, 'application/pdf'), `${baseName(file.name)}_extracted.pdf`);
      setNotices([`Extracted ${plural(parsed.pages.length, 'page')} (${formatBytes(bytes.length)}).`]);
    } catch (e) {
      setErrors([`Split failed: ${errorMessage(e, 'the PDF could not be processed.')}`]);
    } finally {
      setProgress('');
    }
  }, [file, parsed.pages, rangeInput, pageCount]);

  const splitEveryPage = useCallback(async () => {
    const src = docRef.current;
    if (!file || !src) return;
    const runId = ++runRef.current;
    setErrors([]);
    setNotices([]);
    const base = baseName(file.name);
    try {
      if (pageCount === 1) {
        setProgress('Extracting page 1...');
        const bytes = await extractPages(src, [0]);
        downloadBlob(bytesToBlob(bytes, 'application/pdf'), `${base}_page1.pdf`);
        return;
      }
      const entries: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < pageCount; i++) {
        if (runRef.current !== runId) return;
        setProgress(`Splitting page ${i + 1} of ${pageCount}...`);
        entries.push({ name: `${base}_page${i + 1}.pdf`, data: await extractPages(src, [i]) });
        if (i % 10 === 9) await nextFrame();
      }
      setProgress('Creating ZIP file...');
      await nextFrame();
      const zip = buildZip(entries);
      downloadBlob(bytesToBlob(zip, 'application/zip'), `${base}_pages.zip`);
      setNotices([`Split into ${pageCount} PDFs, downloaded as one ZIP file (${formatBytes(zip.length)}).`]);
    } catch (e) {
      setErrors([`Split failed: ${errorMessage(e, 'the PDF could not be processed.')}`]);
    } finally {
      if (runRef.current === runId) setProgress('');
    }
  }, [file, pageCount]);

  const cancel = () => {
    runRef.current += 1;
    setProgress('');
    setNotices(['Split cancelled. Nothing was downloaded.']);
  };

  const handleSplit = mode === 'range' ? splitByRange : splitEveryPage;
  const canSplit = !processing && (mode === 'every-page' || parsed.pages.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
          disabled={processing}
        />

        {file && (
          <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{plural(pageCount, 'page')} — {formatBytes(file.size)}</p>
              </div>
            </div>

            <div>
              <span id="split-mode-label" className="block text-sm font-medium text-neutral-700 mb-1">Split mode</span>
              <div className="flex gap-2" role="radiogroup" aria-labelledby="split-mode-label">
                <button type="button" role="radio" aria-checked={mode === 'range'} onClick={() => setMode('range')} className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 ${mode === 'range' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}>
                  Extract range
                </button>
                <button type="button" role="radio" aria-checked={mode === 'every-page'} onClick={() => setMode('every-page')} className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 ${mode === 'every-page' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}>
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
                  aria-describedby="page-range-hint"
                  className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-base px-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-150"
                />
                <p id="page-range-hint" className="text-xs text-neutral-500 mt-1">
                  Pages 1 to {pageCount}. Use commas and dashes; "3-" means page 3 to the end.
                </p>
                {parsed.invalid.length > 0 && (
                  <p className="text-xs text-red-700 mt-1">Ignored: {parsed.invalid.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div aria-live="polite" className="space-y-4">
          {processing && <ProcessingBanner label={progress} onCancel={mode === 'every-page' && file ? cancel : undefined} />}
          <ToolMessages errors={errors} notices={notices} />
        </div>

        {file ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-neutral-200/80 shadow-card p-6 text-center">
              <Scissors size={40} className="text-primary-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-700 font-medium mb-1">
                {mode === 'range'
                  ? `Extract pages ${rangeInput || '...'} from ${file.name}`
                  : `Split all ${pageCount} pages into separate PDFs`}
              </p>
              <p className="text-xs text-neutral-500 mb-4">
                {mode === 'range'
                  ? `${plural(parsed.pages.length, 'page')} will be extracted into one PDF`
                  : pageCount === 1 ? 'The single page will be downloaded as a PDF' : `${pageCount} PDF files will be downloaded together as one ZIP file`}
              </p>
              <button
                type="button"
                onClick={handleSplit}
                disabled={!canSplit}
                className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
              >
                <Download size={16} aria-hidden="true" />
                {mode === 'range' ? 'Extract & Download' : pageCount === 1 ? 'Download page' : 'Split & Download ZIP'}
              </button>
            </div>
          </div>
        ) : !processing && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a PDF to extract pages from it</p>
            <p className="text-xs text-neutral-500 mt-1">Split by range or into individual pages</p>
          </div>
        )}
      </div>
    </div>
  );
}

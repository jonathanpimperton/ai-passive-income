/**
 * PDF to Word — extract text from PDF and generate a DOCX using pdfjs-dist + docx.
 * Client-side only. No server upload.
 * Best for text-heavy PDFs. Complex layouts may lose formatting.
 */
import { useState, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

interface ExtractedLine {
  text: string;
  fontSize: number;
}

interface ExtractedPage {
  pageNum: number;
  lines: ExtractedLine[];
}

/** Group text items into lines using tolerance-based Y grouping */
function extractLines(items: TextItem[]): ExtractedLine[] {
  if (items.length === 0) return [];

  // Sort by Y descending (PDF coords are bottom-up), then X ascending
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  // Group items into lines using Y tolerance (items within 3 PDF units = same line)
  const lines: { items: TextItem[]; y: number }[] = [];
  for (const item of sorted) {
    const existing = lines.find((l) => Math.abs(l.y - item.y) <= 3);
    if (existing) {
      existing.items.push(item);
    } else {
      lines.push({ items: [item], y: item.y });
    }
  }

  // Sort lines top-to-bottom, items within each line left-to-right
  lines.sort((a, b) => b.y - a.y);

  return lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);

    // Build line text with smart spacing
    let text = '';
    for (let i = 0; i < line.items.length; i++) {
      const item = line.items[i];
      if (i > 0) {
        const prev = line.items[i - 1];
        const gap = item.x - (prev.x + prev.width);
        // Large gap → tab-like spacing, small gap → single space
        if (gap > prev.fontSize * 2) {
          text += '\t';
        } else if (gap > 0.5) {
          text += ' ';
        }
      }
      text += item.str;
    }

    // Use median font size for the line
    const sizes = line.items.map((it) => it.fontSize);
    const medianSize = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)];

    return { text: text.trim(), fontSize: medianSize };
  }).filter((l) => l.text.length > 0);
}

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setPages([]);
    setProcessing(true);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loadingTask = pdfjsLib.getDocument({ data: await f.arrayBuffer() });
      const pdfDoc = await loadingTask.promise;
      setPageCount(pdfDoc.numPages);

      const extracted: ExtractedPage[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        const items: TextItem[] = [];
        for (const item of textContent.items) {
          if ('str' in item && item.str && 'transform' in item) {
            const t = item.transform as number[];
            items.push({
              str: item.str,
              x: t[4],
              y: t[5],
              width: ('width' in item ? (item as { width: number }).width : 0),
              fontSize: Math.abs(t[0]) || Math.abs(t[3]) || 12,
            });
          }
        }

        extracted.push({ pageNum: i, lines: extractLines(items) });
      }
      setFile(f);
      setPages(extracted);
    } catch {
      setError('Could not read this PDF — it may be encrypted, image-only, or corrupted.');
    }
    setProcessing(false);
  }, []);

  const generateDocx = useCallback(async () => {
    if (pages.length === 0 || !file) return;
    setGenerating(true);
    setError('');

    try {
      const docxLib = await import('docx');
      const { Document, Packer, Paragraph, TextRun, PageBreak } = docxLib;

      const children: docxLib.Paragraph[] = [];

      // Determine the most common font size across all pages (= body text)
      const allSizes = pages.flatMap((p) => p.lines.map((l) => l.fontSize));
      const sizeFreq = new Map<number, number>();
      for (const s of allSizes) {
        const rounded = Math.round(s);
        sizeFreq.set(rounded, (sizeFreq.get(rounded) || 0) + 1);
      }
      let bodySize = 12;
      let maxFreq = 0;
      for (const [size, freq] of sizeFreq) {
        if (freq > maxFreq) { bodySize = size; maxFreq = freq; }
      }

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
        for (const line of page.lines) {
          // Heading = font size significantly larger than body text
          const isHeading = line.fontSize > bodySize * 1.2 && line.text.length < 120;
          const isBold = isHeading || (line.fontSize > bodySize * 1.05 && line.text.length < 80);

          children.push(
            new Paragraph({
              children: [new TextRun({
                text: line.text,
                bold: isBold,
                size: isHeading ? 28 : 22,
                font: 'Calibri',
              })],
              spacing: { after: isHeading ? 200 : 80 },
            }),
          );
        }
      }

      const doc = new Document({
        sections: [{ children }],
      });

      const buffer = await Packer.toBlob(doc);
      const url = URL.createObjectURL(buffer);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '') + '.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('DOCX generation failed. ' + (e instanceof Error ? e.message : ''));
    }
    setGenerating(false);
  }, [pages, file]);

  const totalLines = pages.reduce((sum, p) => sum + p.lines.length, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".pdf,application/pdf"
          acceptLabel="Supports: PDF files"
          onFiles={handleFiles}
        />

        {file && pages.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{pageCount} page{pageCount !== 1 ? 's' : ''} — {totalLines} lines extracted</p>
              </div>
            </div>

            <button
              onClick={generateDocx}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Generating DOCX...
                </>
              ) : (
                <>
                  <Download size={16} aria-hidden="true" />
                  Download as Word (.docx)
                </>
              )}
            </button>

            <p className="text-xs text-neutral-400">
              Best for text-based PDFs. Scanned documents (image-only PDFs) cannot be converted without OCR.
            </p>
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
            <span className="text-sm text-primary-700">Extracting text from PDF...</span>
          </div>
        )}

        {pages.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">Extracted Text Preview</p>
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-6 max-h-[500px] overflow-auto">
              {pages.map((page) => (
                <div key={page.pageNum} className="mb-6 last:mb-0">
                  <p className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">
                    Page {page.pageNum}
                  </p>
                  {page.lines.length > 0 ? (
                    page.lines.map((line, li) => (
                      <p key={li} className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{line.text}</p>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-400 italic">No text found on this page (may be image-only)</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a PDF to convert it to a Word document</p>
            <p className="text-xs text-neutral-400 mt-1">Text is extracted and formatted as an editable .docx</p>
          </div>
        )}
      </div>
    </div>
  );
}

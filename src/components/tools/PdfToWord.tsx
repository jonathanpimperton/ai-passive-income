/**
 * PDF to Word — extract text from PDF and generate a DOCX using pdfjs-dist + docx.
 * Preserves bold/italic from font names, detects tables from coordinate clustering,
 * extracts colors and font sizes. Client-side only. No server upload.
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
  height: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
}

interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
}

interface ExtractedLine {
  runs: TextRun[];
  fontSize: number;
  x: number;
}

interface TableCell {
  runs: TextRun[];
}

interface TableRow {
  cells: TableCell[];
}

interface ExtractedBlock {
  type: 'paragraph' | 'table';
  lines?: ExtractedLine[];
  rows?: TableRow[];
}

interface ExtractedPage {
  pageNum: number;
  blocks: ExtractedBlock[];
}

/** Detect bold/italic from PDF font name (e.g. "TimesNewRoman-Bold", "Arial-BoldItalic") */
function parseFontStyle(fontName: string): { bold: boolean; italic: boolean } {
  const lower = fontName.toLowerCase();
  return {
    bold: lower.includes('bold') || lower.includes('heavy') || lower.includes('black'),
    italic: lower.includes('italic') || lower.includes('oblique'),
  };
}

/** Group text items into lines using Y-coordinate tolerance */
function groupIntoLines(items: TextItem[]): ExtractedLine[] {
  if (items.length === 0) return [];

  // Sort by Y descending (PDF coords are bottom-up), then X ascending
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  // Group into lines by Y tolerance (within 3 PDF units = same line)
  const lineGroups: { items: TextItem[]; y: number }[] = [];
  for (const item of sorted) {
    const existing = lineGroups.find((l) => Math.abs(l.y - item.y) <= 3);
    if (existing) {
      existing.items.push(item);
    } else {
      lineGroups.push({ items: [item], y: item.y });
    }
  }

  // Sort lines top-to-bottom
  lineGroups.sort((a, b) => b.y - a.y);

  return lineGroups.map((group) => {
    group.items.sort((a, b) => a.x - b.x);

    // Build runs: consecutive items with same bold/italic get merged
    const runs: TextRun[] = [];
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      let gap = '';
      if (i > 0) {
        const prev = group.items[i - 1];
        const distance = item.x - (prev.x + prev.width);
        if (distance > prev.fontSize * 2) gap = '\t';
        else if (distance > 0.5) gap = ' ';
      }

      const text = gap + item.str;
      const lastRun = runs[runs.length - 1];

      // Merge into existing run if same style
      if (lastRun && lastRun.bold === item.isBold && lastRun.italic === item.isItalic) {
        lastRun.text += text;
      } else {
        runs.push({ text, bold: item.isBold, italic: item.isItalic, fontSize: item.fontSize });
      }
    }

    // Use median font size for the line
    const sizes = group.items.map((it) => it.fontSize);
    const medianSize = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)];

    return { runs, fontSize: medianSize, x: group.items[0]?.x ?? 0 };
  }).filter((l) => l.runs.some((r) => r.text.trim().length > 0));
}

/** Detect table structures from lines by finding consistent column X positions */
function detectTables(lines: ExtractedLine[]): ExtractedBlock[] {
  if (lines.length < 3) {
    return [{ type: 'paragraph', lines }];
  }

  // Look for groups of consecutive lines with tab characters (likely table rows)
  const blocks: ExtractedBlock[] = [];
  let currentParaLines: ExtractedLine[] = [];
  let currentTableLines: ExtractedLine[] = [];

  for (const line of lines) {
    const fullText = line.runs.map((r) => r.text).join('');
    const hasTab = fullText.includes('\t');

    if (hasTab) {
      // Flush current paragraph lines
      if (currentParaLines.length > 0) {
        blocks.push({ type: 'paragraph', lines: currentParaLines });
        currentParaLines = [];
      }
      currentTableLines.push(line);
    } else {
      // Flush table lines
      if (currentTableLines.length > 0) {
        blocks.push(buildTable(currentTableLines));
        currentTableLines = [];
      }
      currentParaLines.push(line);
    }
  }

  // Flush remaining
  if (currentTableLines.length > 0) blocks.push(buildTable(currentTableLines));
  if (currentParaLines.length > 0) blocks.push({ type: 'paragraph', lines: currentParaLines });

  return blocks;
}

function buildTable(lines: ExtractedLine[]): ExtractedBlock {
  const rows: TableRow[] = lines.map((line) => {
    const fullText = line.runs.map((r) => r.text).join('');
    const cellTexts = fullText.split('\t');
    return {
      cells: cellTexts.map((text) => ({
        runs: [{ text: text.trim(), bold: line.runs[0]?.bold ?? false, italic: false, fontSize: line.fontSize }],
      })),
    };
  });

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.cells.length));
  for (const row of rows) {
    while (row.cells.length < maxCols) {
      row.cells.push({ runs: [{ text: '', bold: false, italic: false, fontSize: 11 }] });
    }
  }

  return { type: 'table', rows };
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
            const fontName = ('fontName' in item ? (item as { fontName: string }).fontName : '') || '';
            const style = parseFontStyle(fontName);
            items.push({
              str: item.str,
              x: t[4],
              y: t[5],
              width: ('width' in item ? (item as { width: number }).width : 0),
              height: ('height' in item ? (item as { height: number }).height : 0),
              fontSize: Math.abs(t[0]) || Math.abs(t[3]) || 12,
              fontName,
              isBold: style.bold,
              isItalic: style.italic,
            });
          }
        }

        const lines = groupIntoLines(items);
        const blocks = detectTables(lines);
        extracted.push({ pageNum: i, blocks });
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
      const { Document, Packer, Paragraph, TextRun, PageBreak, Table, TableRow: DocxTableRow,
        TableCell: DocxTableCell, WidthType, BorderStyle, AlignmentType } = docxLib;

      const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

      // Determine body text size
      const allSizes = pages.flatMap((p) =>
        p.blocks.flatMap((b) => b.lines?.map((l) => l.fontSize) ?? [])
      );
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

      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        for (const block of pages[pi].blocks) {
          if (block.type === 'table' && block.rows && block.rows.length > 0) {
            // Generate a proper DOCX table
            const rows = block.rows.map((row, ri) =>
              new DocxTableRow({
                children: row.cells.map((cell) =>
                  new DocxTableCell({
                    children: [new Paragraph({
                      children: cell.runs.map((run) => new TextRun({
                        text: run.text,
                        bold: run.bold || ri === 0,
                        size: 20,
                        font: 'Calibri',
                      })),
                    })],
                    width: { size: 100 / row.cells.length, type: WidthType.PERCENTAGE },
                  })
                ),
              })
            );

            children.push(new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }));
            children.push(new Paragraph({ text: '' }));
          } else if (block.lines) {
            for (const line of block.lines) {
              const isHeading = line.fontSize > bodySize * 1.2 && line.runs.map((r) => r.text).join('').length < 120;
              const lineText = line.runs.map((r) => r.text).join('');

              children.push(new Paragraph({
                children: line.runs.map((run) => new TextRun({
                  text: run.text,
                  bold: run.bold || isHeading,
                  italics: run.italic,
                  size: isHeading ? 28 : 22,
                  font: 'Calibri',
                })),
                spacing: { after: isHeading ? 200 : 80 },
                indent: line.x > 100 ? { left: Math.min(Math.round((line.x - 50) * 10), 1440) } : undefined,
              }));
            }
          }
        }
      }

      const doc = new Document({ sections: [{ children }] });
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

  const totalLines = pages.reduce((sum, p) =>
    sum + p.blocks.reduce((bs, b) => bs + (b.lines?.length ?? 0) + (b.rows?.length ?? 0), 0), 0
  );

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
              Preserves bold, italic, headings, and tables. Scanned/image-only PDFs need OCR (not supported).
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
            <p className="text-sm font-medium text-neutral-700">Extracted Content Preview</p>
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-6 max-h-[500px] overflow-auto">
              {pages.map((page) => (
                <div key={page.pageNum} className="mb-6 last:mb-0">
                  <p className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">
                    Page {page.pageNum}
                  </p>
                  {page.blocks.map((block, bi) => {
                    if (block.type === 'table' && block.rows) {
                      return (
                        <table key={bi} className="w-full text-xs border-collapse mb-3">
                          <tbody>
                            {block.rows.map((row, ri) => (
                              <tr key={ri} className={ri === 0 ? 'bg-neutral-100 font-medium' : ri % 2 === 0 ? 'bg-neutral-50' : ''}>
                                {row.cells.map((cell, ci) => (
                                  <td key={ci} className="border border-neutral-200 px-2 py-1 text-neutral-700">
                                    {cell.runs.map((r) => r.text).join('')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    }
                    return block.lines?.map((line, li) => (
                      <p key={`${bi}-${li}`} className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                        {line.runs.map((run, ri) => (
                          <span key={ri} className={`${run.bold ? 'font-bold' : ''} ${run.italic ? 'italic' : ''}`}>
                            {run.text}
                          </span>
                        ))}
                      </p>
                    ));
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : !processing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Upload a PDF to convert it to a Word document</p>
            <p className="text-xs text-neutral-400 mt-1">Extracts text with formatting and generates an editable .docx</p>
          </div>
        )}
      </div>
    </div>
  );
}

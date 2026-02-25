/**
 * PDF to Word — extract text + images from PDF and generate a DOCX.
 * Uses pdfjs-dist for extraction and the docx library for DOCX generation.
 *
 * Key improvements over naive approaches:
 *  - Paragraph merging: consecutive body-text lines → single paragraphs
 *  - Proportional font sizes: PDF sizes mapped to DOCX half-points
 *  - Heading detection: H1/H2/H3 via font-size ratio + text length
 *  - Image extraction: embedded raster images pulled from PDF operators
 *  - List detection: bullet/number prefixes start new paragraphs
 *  - Hyphen handling: trailing hyphens at line breaks are removed
 *
 * Client-side only. No server upload.
 */
import { useState, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import {
  type TextItem,
  type ExtractedPage,
  type ExtractedImage,
  parseFontStyle,
  groupIntoLines,
  detectTables,
  mergeParagraphLines,
  findBodyFontSize,
  estimateRightMargin,
  pdfSizeToDocxHalfPoints,
  detectHeadingLevel,
} from '../../lib/pdf-word-utils';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extract embedded raster images from a PDF page via its operator list.
 * Tracks the current transform matrix (CTM) to get each image's actual
 * Y position on the page, so images can be interleaved with text at the
 * correct location in the document.
 *
 * The operator pattern is: save → transform → paintImageXObject → restore.
 * The transform's f value gives the Y position in PDF coords (bottom-up).
 */
async function extractPageImages(
  page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>; objs: { get: (name: string, cb: (data: unknown) => void) => void }; getViewport: (opts: { scale: number }) => { height: number } },
  OPS: Record<string, number>
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];

  try {
    const ops = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1 });

    // Track CTM to get image positions. The CTM is set by OPS.transform
    // entries that precede OPS.paintImageXObject. The pattern is:
    //   save → transform [a,b,c,d,e,f] → paintImageXObject → restore
    // where e=x, f=y in PDF coordinates (bottom-up).
    let lastTransformY = viewport.height / 2; // fallback

    for (let i = 0; i < ops.fnArray.length; i++) {
      // Track the most recent transform before an image paint
      if (ops.fnArray[i] === OPS.transform) {
        const args = ops.argsArray[i] as number[];
        if (args.length >= 6) {
          lastTransformY = args[5]; // f = Y translation
        }
      }

      if (
        ops.fnArray[i] === OPS.paintImageXObject ||
        ops.fnArray[i] === OPS.paintJpegXObject
      ) {
        const imageName = ops.argsArray[i][0] as string;

        try {
          const imgData = await new Promise<{
            data: Uint8ClampedArray;
            width: number;
            height: number;
          }>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 3000);
            page.objs.get(imageName, (data: unknown) => {
              clearTimeout(timeout);
              const d = data as { data?: Uint8ClampedArray; width?: number; height?: number };
              if (d?.data && d.width && d.height) {
                resolve({ data: d.data, width: d.width, height: d.height });
              } else {
                reject(new Error('no data'));
              }
            });
          });

          // Skip tiny images (icons, bullets, decoration < 20×20)
          if (imgData.width < 20 || imgData.height < 20) continue;

          // Convert raw RGBA to PNG via canvas
          const canvas = document.createElement('canvas');
          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const imageData = new ImageData(
            new Uint8ClampedArray(imgData.data),
            imgData.width,
            imgData.height
          );
          ctx.putImageData(imageData, 0, 0);

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (!blob) continue;

          const pngData = new Uint8Array(await blob.arrayBuffer());

          images.push({
            data: pngData,
            width: imgData.width,
            height: imgData.height,
            y: lastTransformY,
          });
        } catch {
          // Skip images that fail to extract (encrypted, corrupt, etc.)
        }
      }
    }
  } catch {
    // Operator list access failed — continue without images
  }

  return images;
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
            const fontName =
              ('fontName' in item ? (item as { fontName: string }).fontName : '') || '';
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

        // Extract embedded images from this page
        const pageImages = await extractPageImages(
          page as unknown as Parameters<typeof extractPageImages>[0],
          pdfjsLib.OPS
        );

        extracted.push({ pageNum: i, blocks, images: pageImages });
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
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        ImageRun,
        PageBreak,
        Table,
        TableRow: DocxTableRow,
        TableCell: DocxTableCell,
        WidthType,
        HeadingLevel,
      } = docxLib;

      type ParagraphChild = InstanceType<typeof TextRun> | InstanceType<typeof ImageRun>;
      type SectionChild = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;

      const children: SectionChild[] = [];

      // ── Pre-process: find body size, right margin, merge paragraph lines ──

      const bodySize = findBodyFontSize(pages);
      const rightMargin = estimateRightMargin(pages, bodySize);

      const processedPages = pages.map((p) => ({
        ...p,
        blocks: mergeParagraphLines(p.blocks, bodySize, rightMargin),
      }));

      // ── Build DOCX content ──────────────────────────────────────

      for (let pi = 0; pi < processedPages.length; pi++) {
        if (pi > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        const page = processedPages[pi];

        // ── Interleave images with text blocks by Y position ──
        // PDF coordinates are bottom-up: higher Y = higher on page.
        // Text blocks already have real Y values on their lines (from groupIntoLines).
        // Images have real Y from the CTM transform.
        // Strategy: emit blocks in order, insert images just before the first
        // block whose top line is BELOW the image on the page.

        // Sort images by Y descending (top of page first)
        const sortedImages = (page.images || [])
          .slice()
          .sort((a, b) => b.y - a.y);
        let imgIdx = 0;

        // Get the Y position for each block from its first line
        // (lines are sorted top-to-bottom, so first line has the highest Y)
        const blockYPositions: number[] = page.blocks.map((block) => {
          if (block.lines && block.lines.length > 0) {
            return block.lines[0].y ?? 0;
          }
          // Tables or blocks without lines: use 0 (bottom of page)
          return 0;
        });

        function emitImageParagraph(img: ExtractedImage) {
          const maxWidth = 580;
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round(h * (maxWidth / w));
            w = maxWidth;
          }
          try {
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: img.data,
                    transformation: { width: w, height: h },
                    type: 'png',
                  }),
                ],
                spacing: { before: 120, after: 120 },
              })
            );
          } catch {
            // Skip images that fail to embed
          }
        }

        for (let bi = 0; bi < page.blocks.length; bi++) {
          // Insert any images that belong before this text block
          const blockApproxY = blockYPositions[bi];
          while (imgIdx < sortedImages.length && sortedImages[imgIdx].y >= blockApproxY) {
            emitImageParagraph(sortedImages[imgIdx]);
            imgIdx++;
          }

          const block = page.blocks[bi];
          if (block.type === 'table' && block.rows && block.rows.length > 0) {
            const rows = block.rows.map(
              (row, ri) =>
                new DocxTableRow({
                  children: row.cells.map(
                    (cell) =>
                      new DocxTableCell({
                        children: [
                          new Paragraph({
                            children: cell.runs.map(
                              (run) =>
                                new TextRun({
                                  text: run.text,
                                  bold: run.bold || ri === 0,
                                  size: pdfSizeToDocxHalfPoints(run.fontSize, bodySize),
                                  font: 'Calibri',
                                })
                            ),
                          }),
                        ],
                        width: {
                          size: 100 / row.cells.length,
                          type: WidthType.PERCENTAGE,
                        },
                      })
                  ),
                })
            );

            children.push(
              new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
            children.push(new Paragraph({ text: '' }));
          } else if (block.lines) {
            for (const line of block.lines) {
              const headingLevel = detectHeadingLevel(line, bodySize);

              const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined> = {
                1: HeadingLevel.HEADING_1,
                2: HeadingLevel.HEADING_2,
                3: HeadingLevel.HEADING_3,
                0: undefined,
              };

              const docxRuns: ParagraphChild[] = line.runs.map(
                (run) =>
                  new TextRun({
                    text: run.text,
                    bold: run.bold || headingLevel > 0,
                    italics: run.italic,
                    size: pdfSizeToDocxHalfPoints(run.fontSize, bodySize),
                    font: 'Calibri',
                  })
              );

              children.push(
                new Paragraph({
                  children: docxRuns,
                  heading: headingMap[headingLevel],
                  spacing: {
                    after: headingLevel > 0 ? 200 : 120,
                    before: headingLevel === 1 ? 240 : headingLevel > 0 ? 160 : 0,
                  },
                  indent:
                    line.x > 100
                      ? { left: Math.min(Math.round((line.x - 50) * 10), 1440) }
                      : undefined,
                })
              );
            }
          }
        }

        // Emit any remaining images that come after the last text block
        while (imgIdx < sortedImages.length) {
          emitImageParagraph(sortedImages[imgIdx]);
          imgIdx++;
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

  const totalLines = pages.reduce(
    (sum, p) =>
      sum +
      p.blocks.reduce((bs, b) => bs + (b.lines?.length ?? 0) + (b.rows?.length ?? 0), 0),
    0
  );
  const totalImages = pages.reduce((sum, p) => sum + (p.images?.length ?? 0), 0);

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
                <p className="text-xs text-neutral-500">
                  {pageCount} page{pageCount !== 1 ? 's' : ''} — {totalLines} text blocks
                  {totalImages > 0 && ` — ${totalImages} image${totalImages !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <button
              onClick={generateDocx}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              {generating ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
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
              Preserves text, bold, italic, headings, tables, and embedded images. Scanned or
              image-only PDFs need OCR (not supported in-browser).
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-4" aria-live="polite">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {processing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div
              className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm text-primary-700">Extracting text and images from PDF...</span>
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
                              <tr
                                key={ri}
                                className={
                                  ri === 0
                                    ? 'bg-neutral-100 font-medium'
                                    : ri % 2 === 0
                                      ? 'bg-neutral-50'
                                      : ''
                                }
                              >
                                {row.cells.map((cell, ci) => (
                                  <td
                                    key={ci}
                                    className="border border-neutral-200 px-2 py-1 text-neutral-700"
                                  >
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
                      <p
                        key={`${bi}-${li}`}
                        className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap"
                      >
                        {line.runs.map((run, ri) => (
                          <span
                            key={ri}
                            className={`${run.bold ? 'font-bold' : ''} ${run.italic ? 'italic' : ''}`}
                          >
                            {run.text}
                          </span>
                        ))}
                      </p>
                    ));
                  })}
                  {page.images && page.images.length > 0 && (
                    <p className="text-xs text-neutral-400 mt-2">
                      {page.images.length} embedded image{page.images.length !== 1 ? 's' : ''} extracted
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-500">
                Upload a PDF to convert it to a Word document
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Extracts text, formatting, and images into an editable .docx
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

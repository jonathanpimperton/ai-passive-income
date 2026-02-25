/**
 * PDF to Word — positioned text frames approach.
 *
 * Instead of trying to reconstruct document flow (paragraphs, tables, headings),
 * which always loses formatting, this extracts every text line with its EXACT
 * (x, y) position from the PDF and places it as an absolutely-positioned frame
 * in the DOCX. Images are extracted and embedded at their exact positions too.
 *
 * The result: editable text that looks like the original PDF, because nothing
 * gets reconstructed — everything stays exactly where it was.
 *
 * Client-side only. No server upload.
 */
import { useState, useCallback, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';
import { parseFontStyle } from '../../lib/pdf-word-utils';

// ── Types ────────────────────────────────────────────────────────

interface TextRunData {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number; // PDF points
  fontName: string;
}

interface PositionedLine {
  x: number; // PDF points from left edge
  y: number; // PDF points from TOP of page (already flipped from PDF coords)
  width: number; // approximate line width in PDF points
  runs: TextRunData[];
}

interface ExtractedImageData {
  pngBytes: Uint8Array;
  x: number; // PDF points from left edge
  y: number; // PDF points from TOP of page (flipped)
  widthPt: number; // display width in PDF points
  heightPt: number; // display height in PDF points
}

interface PageData {
  pageNum: number;
  widthPt: number;
  heightPt: number;
  lines: PositionedLine[];
  images: ExtractedImageData[];
  previewUrl: string; // canvas render for visual preview
}

// ── Helpers ──────────────────────────────────────────────────────

/** Group raw pdfjs text items into lines by Y proximity, preserving exact positions. */
function groupTextIntoLines(
  items: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName: string;
  }>,
  styles: Record<string, { fontFamily?: string }>,
  pageHeight: number,
  yTolerance = 3
): PositionedLine[] {
  if (items.length === 0) return [];

  // Parse each text item into our format
  const parsed = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => {
      const x = item.transform[4];
      const yFromBottom = item.transform[5];
      // Font size from transform matrix (handles rotation/scaling)
      const fontSize = Math.sqrt(
        item.transform[2] * item.transform[2] + item.transform[3] * item.transform[3]
      );
      const fontName = styles[item.fontName]?.fontFamily || item.fontName || '';
      const { bold, italic } = parseFontStyle(fontName);

      return {
        str: item.str,
        x,
        yFromBottom,
        yFromTop: pageHeight - yFromBottom - fontSize, // flip Y to top-down
        width: item.width,
        fontSize,
        fontName,
        bold,
        italic,
      };
    });

  if (parsed.length === 0) return [];

  // Group by Y proximity (items on the same visual line)
  const lineGroups: { items: (typeof parsed)[0][]; yFromTop: number }[] = [];
  // Sort top-to-bottom first
  const sorted = [...parsed].sort((a, b) => a.yFromTop - b.yFromTop);

  for (const item of sorted) {
    const existing = lineGroups.find((g) => Math.abs(g.yFromTop - item.yFromTop) <= yTolerance);
    if (existing) {
      existing.items.push(item);
    } else {
      lineGroups.push({ items: [item], yFromTop: item.yFromTop });
    }
  }

  // Sort groups top-to-bottom, items within each group left-to-right
  lineGroups.sort((a, b) => a.yFromTop - b.yFromTop);

  return lineGroups.map((group) => {
    group.items.sort((a, b) => a.x - b.x);

    // Build runs, inserting spaces for gaps between items
    const runs: TextRunData[] = [];
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      let prefix = '';
      if (i > 0) {
        const prev = group.items[i - 1];
        const gap = item.x - (prev.x + prev.width);
        if (gap > item.fontSize * 0.3) prefix = ' ';
      }

      const text = prefix + item.str;
      const lastRun = runs[runs.length - 1];

      // Merge into previous run if same style
      if (
        lastRun &&
        lastRun.bold === item.bold &&
        lastRun.italic === item.italic &&
        Math.abs(lastRun.fontSize - item.fontSize) < 1
      ) {
        lastRun.text += text;
      } else {
        runs.push({
          text,
          bold: item.bold,
          italic: item.italic,
          fontSize: item.fontSize,
          fontName: item.fontName,
        });
      }
    }

    // Line position = leftmost item's X, topmost Y in group
    const firstItem = group.items[0];
    const lastItem = group.items[group.items.length - 1];
    const lineWidth = lastItem.x + lastItem.width - firstItem.x;

    return {
      x: firstItem.x,
      y: group.yFromTop,
      width: lineWidth,
      runs,
    };
  });
}

/** Multiply two 2D transform matrices [a, b, c, d, e, f] */
function multiplyMatrix(
  m1: number[],
  m2: number[]
): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Convert raw RGBA image data from pdfjs to PNG via canvas */
async function rgbaToPng(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = new ImageData(data, width, height);
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('Failed to encode PNG');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Extract embedded images from a PDF page using the operator list */
async function extractPageImages(
  page: {
    getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
    objs: { get: (name: string, callback: (data: unknown) => void) => void };
    commonObjs: { get: (name: string, callback: (data: unknown) => void) => void };
  },
  pageHeight: number,
  pdfjsOPS: Record<string, number>
): Promise<ExtractedImageData[]> {
  const images: ExtractedImageData[] = [];

  try {
    const ops = await page.getOperatorList();
    const ctmStack: number[][] = [];
    let ctm = [1, 0, 0, 1, 0, 0]; // identity matrix

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === pdfjsOPS.save) {
        ctmStack.push([...ctm]);
      } else if (fn === pdfjsOPS.restore) {
        ctm = ctmStack.pop() || [1, 0, 0, 1, 0, 0];
      } else if (fn === pdfjsOPS.transform) {
        const t = args as number[];
        ctm = multiplyMatrix(ctm, t);
      } else if (fn === pdfjsOPS.paintImageXObject) {
        const imgName = args[0] as string;
        try {
          const imgObj = await new Promise<{
            width: number;
            height: number;
            data: Uint8ClampedArray;
          }>((resolve, reject) => {
            let resolved = false;
            page.objs.get(imgName, (data: unknown) => {
              if (!resolved) {
                resolved = true;
                resolve(data as { width: number; height: number; data: Uint8ClampedArray });
              }
            });
            page.commonObjs.get(imgName, (data: unknown) => {
              if (!resolved) {
                resolved = true;
                resolve(data as { width: number; height: number; data: Uint8ClampedArray });
              }
            });
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                reject(new Error('timeout'));
              }
            }, 2000);
          });

          if (imgObj && imgObj.data && imgObj.width > 1 && imgObj.height > 1) {
            const displayWidth = Math.abs(ctm[0]);
            const displayHeight = Math.abs(ctm[3]);
            const xPos = ctm[4];
            const yFromBottom = ctm[5];

            // Skip tiny images (likely artifacts)
            if (displayWidth < 5 || displayHeight < 5) continue;

            const pngBytes = await rgbaToPng(imgObj.data, imgObj.width, imgObj.height);

            images.push({
              pngBytes,
              x: xPos,
              y: pageHeight - yFromBottom - displayHeight,
              widthPt: displayWidth,
              heightPt: displayHeight,
            });
          }
        } catch {
          // Skip images we can't extract
        }
      }
    }
  } catch {
    // If operator list fails entirely, continue without images
  }

  return images;
}

// ── Main Component ───────────────────────────────────────────────

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Clean up preview object URLs on unmount
  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [pages]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setError('');
      pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPages([]);
      setProcessing(true);
      setProgressMsg('Loading PDF...');

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const pdfDoc = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        const PREVIEW_SCALE = 2;
        const extractedPages: PageData[] = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          setProgressMsg(`Processing page ${i} of ${pdfDoc.numPages}...`);

          const page = await pdfDoc.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const previewViewport = page.getViewport({ scale: PREVIEW_SCALE });

          // 1. Render canvas for visual preview
          const canvas = document.createElement('canvas');
          canvas.width = previewViewport.width;
          canvas.height = previewViewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: previewViewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          const previewUrl = blob ? URL.createObjectURL(blob) : '';

          // 2. Extract text with exact positions
          const textContent = await page.getTextContent();
          const textItems = textContent.items.filter(
            (item: Record<string, unknown>) => typeof item.str === 'string'
          ) as Array<{
            str: string;
            transform: number[];
            width: number;
            height: number;
            fontName: string;
          }>;
          const styles = (textContent.styles || {}) as Record<
            string,
            { fontFamily?: string }
          >;

          const lines = groupTextIntoLines(
            textItems,
            styles,
            baseViewport.height
          );

          // 3. Extract embedded images
          const images = await extractPageImages(
            page as unknown as Parameters<typeof extractPageImages>[0],
            baseViewport.height,
            pdfjsLib.OPS as unknown as Record<string, number>
          );

          extractedPages.push({
            pageNum: i,
            widthPt: baseViewport.width,
            heightPt: baseViewport.height,
            lines,
            images,
            previewUrl,
          });
        }

        setFile(f);
        setPages(extractedPages);
      } catch {
        setError('Could not read this PDF — it may be encrypted or corrupted.');
      }
      setProcessing(false);
      setProgressMsg('');
    },
    [pages]
  );

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
        FrameAnchorType,
        HeightRule,
        FrameWrap,
        TextWrappingType,
        HorizontalPositionRelativeFrom,
        VerticalPositionRelativeFrom,
      } = docxLib;

      const PT_TO_TWIP = 20;
      const PT_TO_EMU = 12700;
      const PT_TO_HALF_PT = 2;

      /** Map PDF font name to a common Word font */
      function mapFont(fontName: string): string {
        const lower = fontName.toLowerCase();
        if (lower.includes('times') || lower.includes('serif')) return 'Times New Roman';
        if (lower.includes('courier') || lower.includes('mono')) return 'Courier New';
        if (lower.includes('helvetica') || lower.includes('arial') || lower.includes('sans'))
          return 'Arial';
        if (lower.includes('calibri')) return 'Calibri';
        if (lower.includes('georgia')) return 'Georgia';
        if (lower.includes('verdana')) return 'Verdana';
        if (lower.includes('cambria')) return 'Cambria';
        if (lower.includes('tahoma')) return 'Tahoma';
        if (lower.includes('trebuchet')) return 'Trebuchet MS';
        return fontName.split('-')[0].split('+').pop() || 'Arial';
      }

      const sections = pages.map((page) => {
        const pageWidthTwip = Math.round(page.widthPt * PT_TO_TWIP);
        const pageHeightTwip = Math.round(page.heightPt * PT_TO_TWIP);

        const children: InstanceType<typeof Paragraph>[] = [];

        // Add positioned text frames for each line
        for (const line of page.lines) {
          const textRuns = line.runs.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.bold,
                italics: r.italic,
                size: Math.round(r.fontSize * PT_TO_HALF_PT),
                font: mapFont(r.fontName),
              })
          );

          children.push(
            new Paragraph({
              frame: {
                type: 'absolute',
                position: {
                  x: Math.round(line.x * PT_TO_TWIP),
                  y: Math.round(line.y * PT_TO_TWIP),
                },
                width: Math.max(Math.round(line.width * PT_TO_TWIP), 200),
                height: Math.round(
                  Math.max(...line.runs.map((r) => r.fontSize)) * PT_TO_TWIP * 1.3
                ),
                anchor: {
                  horizontal: FrameAnchorType.PAGE,
                  vertical: FrameAnchorType.PAGE,
                },
                wrap: FrameWrap.NONE,
                rule: HeightRule.AUTO,
              },
              children: textRuns,
              spacing: { before: 0, after: 0, line: 240 },
            })
          );
        }

        // Add positioned images
        for (const img of page.images) {
          // docx lib multiplies transformation dims × 9525 to get EMU
          // We want: displayPx * 9525 = widthPt * 12700
          // So displayPx = widthPt * 12700 / 9525 ≈ widthPt * 1.3333
          const displayW = Math.round(img.widthPt * (4 / 3));
          const displayH = Math.round(img.heightPt * (4 / 3));

          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: 'png',
                  data: img.pngBytes,
                  transformation: { width: displayW, height: displayH },
                  floating: {
                    horizontalPosition: {
                      relative: HorizontalPositionRelativeFrom.PAGE,
                      offset: Math.round(img.x * PT_TO_EMU),
                    },
                    verticalPosition: {
                      relative: VerticalPositionRelativeFrom.PAGE,
                      offset: Math.round(img.y * PT_TO_EMU),
                    },
                    behindDocument: true,
                    allowOverlap: true,
                    wrap: { type: TextWrappingType.NONE },
                  },
                }),
              ],
              spacing: { before: 0, after: 0, line: 240 },
            })
          );
        }

        // Need at least one paragraph per section
        if (children.length === 0) {
          children.push(new Paragraph({ children: [], spacing: { before: 0, after: 0 } }));
        }

        return {
          properties: {
            page: {
              size: { width: pageWidthTwip, height: pageHeightTwip },
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
            },
          },
          children,
        };
      });

      const doc = new Document({ sections });
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
  const totalImages = pages.reduce((sum, p) => sum + p.images.length, 0);

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
                  {pages.length} page{pages.length !== 1 ? 's' : ''} &middot; {totalLines} text
                  line{totalLines !== 1 ? 's' : ''}
                  {totalImages > 0 && (
                    <> &middot; {totalImages} image{totalImages !== 1 ? 's' : ''}</>
                  )}
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
              Text is placed at exact positions from the PDF — fully editable in Word with
              preserved layout.
              {totalImages > 0 && ' Embedded images included at original positions.'}
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
            <span className="text-sm text-primary-700">{progressMsg || 'Processing...'}</span>
          </div>
        )}

        {pages.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">
              Original PDF — your Word document will preserve this layout with editable text
            </p>
            <div className="bg-neutral-100 rounded-2xl border border-neutral-200/80 shadow-card p-4 max-h-[600px] overflow-auto space-y-4">
              {pages.map((page) => (
                <div key={page.pageNum} className="relative">
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    Page {page.pageNum}
                  </div>
                  <img
                    src={page.previewUrl}
                    alt={`Page ${page.pageNum}`}
                    className="w-full rounded-lg shadow-md bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-500">
                Upload a PDF to convert it to an editable Word document
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Text stays at exact positions — fully editable with preserved layout
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

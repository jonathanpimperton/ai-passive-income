/**
 * Pure utility functions for PDF text extraction and DOCX reconstruction.
 * Extracted from PdfToWord.tsx so they can be unit-tested independently.
 *
 * Key design principle: CONSERVATIVE merging. A PDF line break is preserved
 * unless there's strong evidence it was caused by text wrapping (the previous
 * line fills >85% of the available text width). This prevents address blocks,
 * label-value pairs, and other intentionally-short lines from being mashed
 * into run-on paragraphs.
 */

// ── Types ────────────────────────────────────────────────────────

export interface TextItem {
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

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
}

export interface ExtractedLine {
  runs: TextRun[];
  fontSize: number;
  /** Left X position (PDF units) */
  x: number;
  /** Y position (PDF units, bottom-up: higher Y = higher on page) */
  y: number;
  /** Rightmost extent of text on this line (PDF units). Used to detect
   *  whether a line fills the full text width (wrapping) or ends short
   *  (intentional line break). */
  endX: number;
}

export interface TableCell {
  runs: TextRun[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface ExtractedBlock {
  type: 'paragraph' | 'table';
  lines?: ExtractedLine[];
  rows?: TableRow[];
}

export interface ExtractedImage {
  data: Uint8Array;
  width: number;
  height: number;
  y: number;
}

export interface ExtractedPage {
  pageNum: number;
  blocks: ExtractedBlock[];
  images: ExtractedImage[];
}

// ── Font Style Detection ─────────────────────────────────────────

export function parseFontStyle(fontName: string): { bold: boolean; italic: boolean } {
  const lower = fontName.toLowerCase();
  return {
    bold:
      lower.includes('bold') ||
      lower.includes('heavy') ||
      lower.includes('black') ||
      lower.includes('demi') ||
      lower.includes('semibold'),
    italic: lower.includes('italic') || lower.includes('oblique'),
  };
}

// ── Line Grouping ────────────────────────────────────────────────

/**
 * Group raw text items into lines based on Y-coordinate proximity.
 * Items within `yTolerance` PDF units of each other are on the same line.
 * Within each line, items are sorted left-to-right, and consecutive items
 * with the same bold/italic style are merged into runs.
 * Large horizontal gaps become tab characters (for table detection later).
 *
 * Each line tracks `endX` — the rightmost text extent — used later
 * to decide whether the line fills the page width (wrapping) or is
 * intentionally short.
 */
export function groupIntoLines(items: TextItem[], yTolerance = 3): ExtractedLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const lineGroups: { items: TextItem[]; y: number }[] = [];
  for (const item of sorted) {
    const existing = lineGroups.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (existing) {
      existing.items.push(item);
    } else {
      lineGroups.push({ items: [item], y: item.y });
    }
  }

  lineGroups.sort((a, b) => b.y - a.y);

  return lineGroups
    .map((group) => {
      group.items.sort((a, b) => a.x - b.x);

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

        if (lastRun && lastRun.bold === item.isBold && lastRun.italic === item.isItalic) {
          lastRun.text += text;
        } else {
          runs.push({ text, bold: item.isBold, italic: item.isItalic, fontSize: item.fontSize });
        }
      }

      const sizes = group.items.map((it) => it.fontSize).sort((a, b) => a - b);
      const medianSize = sizes[Math.floor(sizes.length / 2)];

      // Calculate endX: rightmost extent of the last text item
      const lastItem = group.items[group.items.length - 1];
      const endX = lastItem.x + lastItem.width;

      return { runs, fontSize: medianSize, x: group.items[0]?.x ?? 0, y: group.y, endX };
    })
    .filter((l) => l.runs.some((r) => r.text.trim().length > 0));
}

// ── Table Detection ──────────────────────────────────────────────

export function buildTable(lines: ExtractedLine[]): ExtractedBlock {
  const rows: TableRow[] = lines.map((line) => {
    const fullText = line.runs.map((r) => r.text).join('');
    const cellTexts = fullText.split('\t');
    return {
      cells: cellTexts.map((text) => ({
        runs: [
          {
            text: text.trim(),
            bold: line.runs[0]?.bold ?? false,
            italic: false,
            fontSize: line.fontSize,
          },
        ],
      })),
    };
  });

  const maxCols = Math.max(...rows.map((r) => r.cells.length));
  for (const row of rows) {
    while (row.cells.length < maxCols) {
      row.cells.push({ runs: [{ text: '', bold: false, italic: false, fontSize: 11 }] });
    }
  }

  return { type: 'table', rows };
}

export function detectTables(lines: ExtractedLine[]): ExtractedBlock[] {
  if (lines.length === 0) return [];
  if (lines.length < 3) {
    return [{ type: 'paragraph', lines }];
  }

  const blocks: ExtractedBlock[] = [];
  let currentParaLines: ExtractedLine[] = [];
  let currentTableLines: ExtractedLine[] = [];

  for (const line of lines) {
    const fullText = line.runs.map((r) => r.text).join('');
    const hasTab = fullText.includes('\t');

    if (hasTab) {
      if (currentParaLines.length > 0) {
        blocks.push({ type: 'paragraph', lines: currentParaLines });
        currentParaLines = [];
      }
      currentTableLines.push(line);
    } else {
      if (currentTableLines.length > 0) {
        blocks.push(buildTable(currentTableLines));
        currentTableLines = [];
      }
      currentParaLines.push(line);
    }
  }

  if (currentTableLines.length > 0) blocks.push(buildTable(currentTableLines));
  if (currentParaLines.length > 0) blocks.push({ type: 'paragraph', lines: currentParaLines });

  return blocks;
}

// ── Right Margin Estimation ──────────────────────────────────────

/**
 * Estimate the right edge of the text area by finding the maximum endX
 * among body-sized lines. This represents where text hits the right margin
 * when it fills the full line width (i.e., wrapping lines).
 *
 * Returns 0 if no body-sized lines are found (caller should skip merging).
 */
export function estimateRightMargin(pages: ExtractedPage[], bodySize: number): number {
  let maxEndX = 0;
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.lines) {
        for (const line of block.lines) {
          if (Math.abs(line.fontSize - bodySize) < 1.5 && line.endX > maxEndX) {
            maxEndX = line.endX;
          }
        }
      }
    }
  }
  return maxEndX;
}

// ── Paragraph Merging ────────────────────────────────────────────

/**
 * CONSERVATIVELY merge consecutive body-text lines that were wrapped
 * by the PDF renderer. The key heuristic:
 *
 *   Only merge line N+1 into line N if line N fills >85% of the
 *   available text width — meaning its text ran to near the right
 *   margin, strongly suggesting the line break was caused by wrapping,
 *   not by intentional formatting.
 *
 * This prevents address blocks, dates, label-value pairs, and other
 * intentionally-short lines from being mashed together.
 *
 * Additional conditions for merging:
 *  - Same font size (within 1.5 units)
 *  - Same left margin (within 30 PDF units)
 *  - Body-sized text (not headings)
 *  - Next line doesn't start with bullet/number
 */
export function mergeParagraphLines(
  blocks: ExtractedBlock[],
  bodySize: number,
  rightMargin: number
): ExtractedBlock[] {
  // If we couldn't estimate the right margin, skip merging entirely
  if (rightMargin <= 0) return blocks;

  return blocks.map((block) => {
    if (block.type !== 'paragraph' || !block.lines || block.lines.length <= 1) {
      return block;
    }

    const groups: ExtractedLine[][] = [];
    let current: ExtractedLine[] = [];

    for (let i = 0; i < block.lines.length; i++) {
      const line = block.lines[i];
      const prev = current[current.length - 1];

      if (!prev) {
        current.push(line);
        continue;
      }

      const sameSize = Math.abs(line.fontSize - prev.fontSize) < 1.5;
      const sameMargin = Math.abs(line.x - prev.x) < 30;
      const isBodySize = Math.abs(line.fontSize - bodySize) < 1.5;
      const isHeading = line.fontSize > bodySize * 1.15;
      const prevIsHeading = prev.fontSize > bodySize * 1.15;

      // KEY HEURISTIC: did the previous line fill the available text width?
      // If the text area runs from prev.x to rightMargin, the available width
      // is (rightMargin - prev.x). The prev line used (prev.endX - prev.x).
      // Only merge if prev line fills >85% of available width.
      const availableWidth = rightMargin - prev.x;
      const prevLineWidth = prev.endX - prev.x;
      const prevFillsWidth = availableWidth > 0 && prevLineWidth > availableWidth * 0.85;

      // Check if line starts with a bullet or number (list item)
      const lineText = line.runs.map((r) => r.text).join('').trimStart();
      const isList =
        /^[\u2022\u2023\u25E6\u25AA\u25CF\u2013\u2014•\-–—]\s/.test(lineText) ||
        /^\d{1,3}[.)]\s/.test(lineText);

      // Merge ONLY if: same style, body-sized, AND previous line fills the width
      if (
        sameSize &&
        sameMargin &&
        isBodySize &&
        !isHeading &&
        !prevIsHeading &&
        !isList &&
        prevFillsWidth
      ) {
        current.push(line);
      } else {
        groups.push(current);
        current = [line];
      }
    }
    if (current.length > 0) groups.push(current);

    const mergedLines: ExtractedLine[] = groups.map((group) => {
      if (group.length === 1) return group[0];

      const allRuns: TextRun[] = [];
      for (let i = 0; i < group.length; i++) {
        if (i > 0) {
          const lastRun = allRuns[allRuns.length - 1];
          if (lastRun) {
            const lastChar = lastRun.text.trimEnd().slice(-1);
            if (lastChar === '-') {
              lastRun.text = lastRun.text.replace(/-\s*$/, '');
            } else if (!lastRun.text.endsWith(' ')) {
              lastRun.text += ' ';
            }
          }
        }
        for (const run of group[i].runs) {
          const lastRun = allRuns[allRuns.length - 1];
          if (lastRun && lastRun.bold === run.bold && lastRun.italic === run.italic) {
            lastRun.text += run.text;
          } else {
            allRuns.push({ ...run });
          }
        }
      }

      return {
        runs: allRuns,
        fontSize: group[0].fontSize,
        x: group[0].x,
        y: group[0].y,
        endX: group[group.length - 1].endX,
      };
    });

    return { type: 'paragraph' as const, lines: mergedLines };
  });
}

// ── Font Size Helpers ────────────────────────────────────────────

export function findBodyFontSize(pages: ExtractedPage[]): number {
  const sizeFreq = new Map<number, number>();
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.lines) {
        for (const line of block.lines) {
          const rounded = Math.round(line.fontSize);
          sizeFreq.set(rounded, (sizeFreq.get(rounded) || 0) + 1);
        }
      }
    }
  }

  let bodySize = 12;
  let maxFreq = 0;
  for (const [size, freq] of sizeFreq) {
    if (freq > maxFreq) {
      bodySize = size;
      maxFreq = freq;
    }
  }
  return bodySize;
}

export function pdfSizeToDocxHalfPoints(pdfSize: number, bodySize: number): number {
  const ratio = pdfSize / bodySize;
  const docxSize = Math.round(22 * ratio);
  return Math.max(16, Math.min(56, docxSize));
}

export function detectHeadingLevel(
  line: ExtractedLine,
  bodySize: number
): 0 | 1 | 2 | 3 {
  const ratio = line.fontSize / bodySize;
  const text = line.runs.map((r) => r.text).join('');

  if (text.length > 120) return 0;

  if (ratio >= 1.6) return 1;
  if (ratio >= 1.3) return 2;
  if (ratio >= 1.15) return 3;
  return 0;
}

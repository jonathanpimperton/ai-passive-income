/**
 * Pure utility functions for PDF text extraction and DOCX reconstruction.
 * Extracted from PdfToWord.tsx so they can be unit-tested independently.
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
  x: number;
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
  /** Raw PNG blob data */
  data: Uint8Array;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Approximate Y position on the page (PDF coords, bottom-up) */
  y: number;
}

export interface ExtractedPage {
  pageNum: number;
  blocks: ExtractedBlock[];
  images: ExtractedImage[];
}

// ── Font Style Detection ─────────────────────────────────────────

/** Detect bold/italic from PDF font name (e.g. "TimesNewRoman-Bold", "Arial-BoldItalic") */
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
 */
export function groupIntoLines(items: TextItem[], yTolerance = 3): ExtractedLine[] {
  if (items.length === 0) return [];

  // Sort by Y descending (PDF coords are bottom-up), then X ascending
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  // Group into lines by Y tolerance
  const lineGroups: { items: TextItem[]; y: number }[] = [];
  for (const item of sorted) {
    const existing = lineGroups.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (existing) {
      existing.items.push(item);
    } else {
      lineGroups.push({ items: [item], y: item.y });
    }
  }

  // Sort lines top-to-bottom (higher Y = higher on page)
  lineGroups.sort((a, b) => b.y - a.y);

  return lineGroups
    .map((group) => {
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
      const sizes = group.items.map((it) => it.fontSize).sort((a, b) => a - b);
      const medianSize = sizes[Math.floor(sizes.length / 2)];

      return { runs, fontSize: medianSize, x: group.items[0]?.x ?? 0 };
    })
    .filter((l) => l.runs.some((r) => r.text.trim().length > 0));
}

// ── Table Detection ──────────────────────────────────────────────

/**
 * Build a table block from a set of lines.
 * Each line is split by tab characters into cells.
 * Column count is normalized (padded with empty cells).
 */
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

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.cells.length));
  for (const row of rows) {
    while (row.cells.length < maxCols) {
      row.cells.push({ runs: [{ text: '', bold: false, italic: false, fontSize: 11 }] });
    }
  }

  return { type: 'table', rows };
}

/**
 * Detect table structures from lines by finding consecutive lines with tab
 * characters (large horizontal gaps between text items).
 * Interleaves paragraph and table blocks.
 */
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

  // Flush remaining
  if (currentTableLines.length > 0) blocks.push(buildTable(currentTableLines));
  if (currentParaLines.length > 0) blocks.push({ type: 'paragraph', lines: currentParaLines });

  return blocks;
}

// ── Paragraph Merging ────────────────────────────────────────────

/**
 * Merge consecutive body-text lines within paragraph blocks into single
 * logical paragraphs.  Without this, every wrapped PDF line becomes its
 * own paragraph in the DOCX output, which looks terrible.
 *
 * Lines are merged when they share:
 *  - similar font size (within 1.5 units of body size)
 *  - similar left margin (within 30 PDF units)
 *  - are NOT heading-sized
 *
 * A new paragraph starts on:
 *  - font size change
 *  - left margin shift
 *  - heading-like text (large font + short text)
 *  - lines starting with bullet/number characters
 */
export function mergeParagraphLines(
  blocks: ExtractedBlock[],
  bodySize: number
): ExtractedBlock[] {
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

      // Check if line starts with a bullet or number (list item)
      const lineText = line.runs.map((r) => r.text).join('').trimStart();
      const isList = /^[\u2022\u2023\u25E6\u25AA\u25CF\u2013\u2014•\-–—]\s/.test(lineText) ||
        /^\d{1,3}[.)]\s/.test(lineText);

      // Merge if: same font size, similar margin, body-sized, not heading, not list item
      if (sameSize && sameMargin && isBodySize && !isHeading && !prevIsHeading && !isList) {
        current.push(line);
      } else {
        groups.push(current);
        current = [line];
      }
    }
    if (current.length > 0) groups.push(current);

    // Convert each group of lines into a single merged line
    const mergedLines: ExtractedLine[] = groups.map((group) => {
      if (group.length === 1) return group[0];

      const allRuns: TextRun[] = [];
      for (let i = 0; i < group.length; i++) {
        if (i > 0) {
          // Join lines with a space (unless previous ends with hyphen = word break)
          const lastRun = allRuns[allRuns.length - 1];
          if (lastRun) {
            const lastChar = lastRun.text.trimEnd().slice(-1);
            if (lastChar === '-') {
              // Remove trailing hyphen (word was hyphenated across lines)
              lastRun.text = lastRun.text.replace(/-\s*$/, '');
            } else if (!lastRun.text.endsWith(' ')) {
              lastRun.text += ' ';
            }
          }
        }
        for (const run of group[i].runs) {
          // Try to merge with previous run if same style
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
      };
    });

    return { type: 'paragraph' as const, lines: mergedLines };
  });
}

// ── Font Size Helpers ────────────────────────────────────────────

/**
 * Find the most frequently used font size across all pages.
 * This is the "body text" size — everything else is relative to it.
 */
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

/**
 * Map a PDF font size to DOCX half-points, proportional to body text.
 * Body text = 22 half-points (11pt). Clamped to reasonable range.
 */
export function pdfSizeToDocxHalfPoints(pdfSize: number, bodySize: number): number {
  const ratio = pdfSize / bodySize;
  const docxSize = Math.round(22 * ratio);
  return Math.max(16, Math.min(56, docxSize)); // 8pt – 28pt
}

/**
 * Classify a line as a heading level (0 = body, 1 = H1, 2 = H2, 3 = H3).
 * Based on font size relative to body text and text length.
 */
export function detectHeadingLevel(
  line: ExtractedLine,
  bodySize: number
): 0 | 1 | 2 | 3 {
  const ratio = line.fontSize / bodySize;
  const text = line.runs.map((r) => r.text).join('');

  // Only short-ish text can be a heading
  if (text.length > 120) return 0;

  if (ratio >= 1.6) return 1; // H1: 60%+ larger
  if (ratio >= 1.3) return 2; // H2: 30-59% larger
  if (ratio >= 1.15) return 3; // H3: 15-29% larger
  return 0;
}

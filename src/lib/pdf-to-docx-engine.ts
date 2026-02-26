/**
 * PDF → DOCX conversion engine.
 *
 * Pipeline:
 *  1. pdfjs-dist extracts text (getTextContent) + images (operator list)
 *  2. pdf-geometry.ts extracts H/V line segments for table detection
 *  3. Layout analysis: detect tables (lattice + tab-based), headings, lists, paragraphs
 *  4. docx npm package generates a flowing DOCX — not positioned frames
 *
 * The result: an editable Word document with proper headings, paragraphs,
 * tables, lists, and images — text reflows naturally when edited.
 *
 * Client-side only. No server upload.
 */

import { extractPageLines, type GeoLine } from './pdf-geometry';
import { parseFontStyle } from './pdf-word-utils';

// ── Types ────────────────────────────────────────────────────────

interface RunData {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  fontName: string;
}

interface PageLine {
  x: number; // left edge (top-down page coords)
  y: number; // top of line (top-down page coords)
  endX: number; // right edge
  height: number; // line height in pts
  runs: RunData[];
}

interface PageImage {
  pngBytes: Uint8Array;
  x: number;
  y: number; // top-down
  widthPt: number;
  heightPt: number;
}

type DocBlock =
  | { type: 'heading'; level: 1 | 2 | 3; runs: RunData[]; _y: number }
  | { type: 'paragraph'; runs: RunData[]; _y: number }
  | { type: 'list-item'; level: number; ordered: boolean; runs: RunData[]; _y: number }
  | { type: 'table'; rows: { cells: { runs: RunData[] }[] }[]; _y: number }
  | { type: 'image'; data: Uint8Array; widthPt: number; heightPt: number; _y: number };

interface PageResult {
  widthPt: number;
  heightPt: number;
  elements: DocBlock[];
}

// ── Font helpers ─────────────────────────────────────────────────

function mapFont(fontName: string): string {
  const lower = fontName.toLowerCase();
  if (lower.includes('times') || (lower.includes('serif') && !lower.includes('sans')))
    return 'Times New Roman';
  if (lower.includes('courier') || lower.includes('mono')) return 'Courier New';
  if (lower.includes('helvetica') || lower.includes('arial') || lower.includes('sans'))
    return 'Arial';
  if (lower.includes('calibri')) return 'Calibri';
  if (lower.includes('georgia')) return 'Georgia';
  if (lower.includes('verdana')) return 'Verdana';
  if (lower.includes('cambria')) return 'Cambria';
  if (lower.includes('tahoma')) return 'Tahoma';
  // Strip subset prefix (e.g. "ABCDEF+TimesNewRoman" → "TimesNewRoman")
  const cleaned = fontName.split('+').pop()?.split('-')[0] || 'Calibri';
  return cleaned || 'Calibri';
}

// ── Image helpers (from operator list) ───────────────────────────

function mulMatrix(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

async function rgbaToPng(data: Uint8ClampedArray, w: number, h: number): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(data, w, h), 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('PNG encode failed');
  return new Uint8Array(await blob.arrayBuffer());
}

async function imageObjToPng(
  imgObj: unknown,
  fbW?: number,
  fbH?: number
): Promise<{ pngBytes: Uint8Array; w: number; h: number } | null> {
  // Raw RGBA data object
  if (imgObj && typeof imgObj === 'object' && 'data' in imgObj) {
    const raw = imgObj as { width: number; height: number; data: Uint8ClampedArray };
    if (raw.data && raw.width > 1 && raw.height > 1) {
      return { pngBytes: await rgbaToPng(raw.data, raw.width, raw.height), w: raw.width, h: raw.height };
    }
  }
  // HTMLImageElement (common for JPEG in pdfjs)
  if (typeof HTMLImageElement !== 'undefined' && imgObj instanceof HTMLImageElement) {
    const w = imgObj.naturalWidth || fbW || imgObj.width;
    const h = imgObj.naturalHeight || fbH || imgObj.height;
    if (w > 1 && h > 1) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(imgObj, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
      if (!blob) return null;
      return { pngBytes: new Uint8Array(await blob.arrayBuffer()), w, h };
    }
  }
  // ImageBitmap
  if (typeof ImageBitmap !== 'undefined' && imgObj instanceof ImageBitmap) {
    const { width: w, height: h } = imgObj;
    if (w > 1 && h > 1) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(imgObj, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
      if (!blob) return null;
      return { pngBytes: new Uint8Array(await blob.arrayBuffer()), w, h };
    }
  }
  return null;
}

function resolveImageObj(
  page: {
    objs: { get: (n: string, cb: (d: unknown) => void) => void };
    commonObjs: { get: (n: string, cb: (d: unknown) => void) => void };
  },
  name: string,
  timeoutMs = 2000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (d: unknown) => {
      if (!done) {
        done = true;
        resolve(d);
      }
    };
    page.objs.get(name, finish);
    page.commonObjs.get(name, finish);
    setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error('timeout'));
      }
    }, timeoutMs);
  });
}

// ── Text extraction ──────────────────────────────────────────────

function extractTextLines(
  textContent: { items: unknown[]; styles: Record<string, { fontFamily?: string }> },
  pageHeight: number
): PageLine[] {
  const items = textContent.items.filter(
    (item: Record<string, unknown>) => typeof item.str === 'string' && (item.str as string).trim()
  ) as Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName: string;
  }>;

  const styles = textContent.styles || {};
  const Y_TOL = 3;

  const parsed = items.map((item) => {
    const x = item.transform[4];
    const yBot = item.transform[5];
    const fontSize = Math.sqrt(
      item.transform[2] * item.transform[2] + item.transform[3] * item.transform[3]
    );
    const fontName = styles[item.fontName]?.fontFamily || item.fontName || '';
    const { bold, italic } = parseFontStyle(fontName);
    return {
      str: item.str,
      x,
      y: pageHeight - yBot - fontSize,
      width: item.width,
      fontSize,
      fontName,
      bold,
      italic,
    };
  });

  if (parsed.length === 0) return [];

  // Group by Y proximity
  const groups: { items: (typeof parsed)[0][]; y: number }[] = [];
  const sorted = [...parsed].sort((a, b) => a.y - b.y);

  for (const item of sorted) {
    const existing = groups.find((g) => Math.abs(g.y - item.y) <= Y_TOL);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ items: [item], y: item.y });
    }
  }

  groups.sort((a, b) => a.y - b.y);

  return groups
    .map((group) => {
      group.items.sort((a, b) => a.x - b.x);

      const runs: RunData[] = [];
      for (let i = 0; i < group.items.length; i++) {
        const item = group.items[i];
        let prefix = '';
        if (i > 0) {
          const prev = group.items[i - 1];
          const gap = item.x - (prev.x + prev.width);
          if (gap > item.fontSize * 2) prefix = '\t';
          else if (gap > item.fontSize * 0.3) prefix = ' ';
        }

        const text = prefix + item.str;
        const lastRun = runs[runs.length - 1];
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

      const first = group.items[0];
      const last = group.items[group.items.length - 1];
      const maxFontSize = Math.max(...group.items.map((i) => i.fontSize));

      return {
        x: first.x,
        y: group.y,
        endX: last.x + last.width,
        height: maxFontSize,
        runs,
      };
    })
    .filter((l) => l.runs.some((r) => r.text.trim()));
}

// ── Image extraction from operator list ──────────────────────────

async function extractImages(
  page: {
    getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
    objs: { get: (n: string, cb: (d: unknown) => void) => void };
    commonObjs: { get: (n: string, cb: (d: unknown) => void) => void };
  },
  pageHeight: number,
  OPS: Record<string, number>
): Promise<PageImage[]> {
  const images: PageImage[] = [];
  let ops: { fnArray: number[]; argsArray: unknown[][] };
  try {
    ops = await page.getOperatorList();
  } catch {
    return images;
  }

  const ctmStack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (fn === OPS.save) {
      ctmStack.push([...ctm]);
    } else if (fn === OPS.restore) {
      ctm = ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = mulMatrix(ctm, args as number[]);
    } else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
      const imgName = args[0] as string;
      try {
        const imgObj = await resolveImageObj(page, imgName);
        const result = await imageObjToPng(
          imgObj,
          fn === OPS.paintJpegXObject ? (args[1] as number) : undefined,
          fn === OPS.paintJpegXObject ? (args[2] as number) : undefined
        );
        if (result) {
          const displayW = Math.abs(ctm[0]);
          const displayH = Math.abs(ctm[3]);
          const xPos = ctm[4];
          const yBot = ctm[5];
          if (displayW < 5 || displayH < 5) continue; // skip artifacts
          images.push({
            pngBytes: result.pngBytes,
            x: xPos,
            y: pageHeight - yBot - displayH,
            widthPt: displayW,
            heightPt: displayH,
          });
        }
      } catch {
        // Skip unresolvable images
      }
    }
  }

  return images;
}

// ── Analysis helpers ─────────────────────────────────────────────

function findBodySize(lines: PageLine[]): number {
  const freq = new Map<number, number>();
  for (const line of lines) {
    const s = Math.round(line.height);
    freq.set(s, (freq.get(s) || 0) + 1);
  }
  let best = 12;
  let bestCount = 0;
  for (const [size, count] of freq) {
    if (count > bestCount) {
      best = size;
      bestCount = count;
    }
  }
  return best;
}

function estimateRightMargin(lines: PageLine[], bodySize: number): number {
  let maxEndX = 0;
  for (const line of lines) {
    if (Math.abs(line.height - bodySize) < 1.5 && line.endX > maxEndX) {
      maxEndX = line.endX;
    }
  }
  return maxEndX;
}

function detectHeading(line: PageLine, bodySize: number): 0 | 1 | 2 | 3 {
  const ratio = line.height / bodySize;
  const text = line.runs.map((r) => r.text).join('');
  if (text.length > 150) return 0; // too long for a heading
  if (ratio >= 1.6) return 1;
  if (ratio >= 1.3) return 2;
  if (ratio >= 1.15) return 3;
  return 0;
}

function detectListItem(text: string): { ordered: boolean; prefixLen: number } | null {
  const trimmed = text.trimStart();
  const indent = text.length - trimmed.length;

  // Bullet patterns
  const bulletMatch = trimmed.match(
    /^[\u2022\u2023\u25E6\u25AA\u25CF\u25B8\u25BA\u2013\u2014•\-–—►▪▸◦]\s+/
  );
  if (bulletMatch) return { ordered: false, prefixLen: indent + bulletMatch[0].length };

  // Numbered patterns: "1. ", "2) ", "(a) ", "i. "
  const numMatch = trimmed.match(
    /^(?:\d{1,3}[.)]\s+|\(\d{1,3}\)\s+|[a-z][.)]\s+|[ivx]{1,4}[.)]\s+)/i
  );
  if (numMatch) return { ordered: true, prefixLen: indent + numMatch[0].length };

  return null;
}

function stripListPrefix(runs: RunData[], prefixLen: number): RunData[] {
  const result = runs.map((r) => ({ ...r }));
  let rem = prefixLen;
  while (rem > 0 && result.length > 0) {
    if (result[0].text.length <= rem) {
      rem -= result[0].text.length;
      result.shift();
    } else {
      result[0].text = result[0].text.substring(rem);
      rem = 0;
    }
  }
  return result;
}

function snapValues(values: number[], tolerance: number): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = groups[groups.length - 1];
    if (sorted[i] - last[last.length - 1] <= tolerance) {
      last.push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  return groups.map((g) => g.reduce((a, b) => a + b) / g.length);
}

// ── Table detection: lattice (bordered tables) ───────────────────

function detectLatticeTables(
  textLines: PageLine[],
  hLines: GeoLine[],
  vLines: GeoLine[],
  pageWidth: number
): { tables: DocBlock[]; usedIndices: Set<number> } {
  const usedIndices = new Set<number>();
  const tables: DocBlock[] = [];

  if (hLines.length < 2 || vLines.length < 2) return { tables, usedIndices };

  const SNAP = 5;

  // Filter to significant lines (at least 10% of page width / height relevant)
  const sigH = hLines.filter((l) => l.x2 - l.x1 > pageWidth * 0.05);
  const sigV = vLines.filter((l) => l.y2 - l.y1 > 5);
  if (sigH.length < 2 || sigV.length < 2) return { tables, usedIndices };

  // Get unique snapped positions
  const rowYs = snapValues(
    sigH.map((l) => l.y1),
    SNAP
  ).sort((a, b) => a - b);
  const colXs = snapValues(
    sigV.map((l) => l.x1),
    SNAP
  ).sort((a, b) => a - b);

  if (rowYs.length < 2 || colXs.length < 2) return { tables, usedIndices };

  // Helper: check if an H line exists at given Y spanning from x1 to x2
  function hasH(y: number, x1: number, x2: number): boolean {
    return sigH.some(
      (l) => Math.abs(l.y1 - y) <= SNAP && l.x1 <= x1 + SNAP && l.x2 >= x2 - SNAP
    );
  }

  // Helper: check if a V line exists at given X spanning from y1 to y2
  function hasV(x: number, y1: number, y2: number): boolean {
    return sigV.some(
      (l) => Math.abs(l.x1 - x) <= SNAP && l.y1 <= y1 + SNAP && l.y2 >= y2 - SNAP
    );
  }

  // Validate grid: count cells with ≥3 borders
  const numRows = rowYs.length - 1;
  const numCols = colXs.length - 1;
  let validCells = 0;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const borders =
        (hasH(rowYs[r], colXs[c], colXs[c + 1]) ? 1 : 0) +
        (hasH(rowYs[r + 1], colXs[c], colXs[c + 1]) ? 1 : 0) +
        (hasV(colXs[c], rowYs[r], rowYs[r + 1]) ? 1 : 0) +
        (hasV(colXs[c + 1], rowYs[r], rowYs[r + 1]) ? 1 : 0);
      if (borders >= 3) validCells++;
    }
  }

  // Need at least 40% valid cells and minimum 2 cells
  const totalCells = numRows * numCols;
  if (validCells < totalCells * 0.4 || validCells < 2) return { tables, usedIndices };

  // Build table
  const tableRows: { cells: { runs: RunData[] }[] }[] = [];

  for (let r = 0; r < numRows; r++) {
    const rowCells: { runs: RunData[] }[] = [];
    for (let c = 0; c < numCols; c++) {
      const cellTop = rowYs[r];
      const cellBot = rowYs[r + 1];
      const cellLeft = colXs[c];
      const cellRight = colXs[c + 1];

      // Find text lines within this cell
      const cellLines: PageLine[] = [];
      textLines.forEach((line, idx) => {
        if (
          line.y >= cellTop - SNAP &&
          line.y <= cellBot + SNAP &&
          line.x >= cellLeft - SNAP &&
          line.x <= cellRight + SNAP
        ) {
          cellLines.push(line);
          usedIndices.add(idx);
        }
      });

      // Merge lines into runs
      const runs: RunData[] = [];
      for (let li = 0; li < cellLines.length; li++) {
        if (li > 0 && runs.length > 0) {
          // Add space between lines within the same cell
          const lastRun = runs[runs.length - 1];
          if (!lastRun.text.endsWith(' ')) lastRun.text += ' ';
        }
        for (const run of cellLines[li].runs) {
          const lastRun = runs[runs.length - 1];
          if (
            lastRun &&
            lastRun.bold === run.bold &&
            lastRun.italic === run.italic &&
            Math.abs(lastRun.fontSize - run.fontSize) < 1
          ) {
            lastRun.text += run.text;
          } else {
            runs.push({ ...run });
          }
        }
      }
      if (runs.length === 0) {
        runs.push({ text: '', bold: false, italic: false, fontSize: 11, fontName: '' });
      }

      rowCells.push({ runs });
    }
    tableRows.push({ cells: rowCells });
  }

  tables.push({ type: 'table', rows: tableRows, _y: rowYs[0] });
  return { tables, usedIndices };
}

// ── Table detection: tab-based (borderless tables) ───────────────

function detectTabTables(
  textLines: PageLine[],
  alreadyUsed: Set<number>
): { tables: DocBlock[]; usedIndices: Set<number> } {
  const usedIndices = new Set(alreadyUsed);
  const tables: DocBlock[] = [];

  // Find consecutive lines with tab characters
  let current: { line: PageLine; idx: number }[] = [];

  function flushTable() {
    if (current.length < 2) {
      current = [];
      return;
    }

    const tableRows = current.map(({ line, idx }) => {
      usedIndices.add(idx);
      const fullText = line.runs.map((r) => r.text).join('');
      const cellTexts = fullText.split('\t');
      return {
        cells: cellTexts.map((text) => ({
          runs: [
            {
              text: text.trim(),
              bold: line.runs[0]?.bold || false,
              italic: line.runs[0]?.italic || false,
              fontSize: line.runs[0]?.fontSize || 11,
              fontName: line.runs[0]?.fontName || '',
            },
          ],
        })),
      };
    });

    // Normalize column count
    const maxCols = Math.max(...tableRows.map((r) => r.cells.length));
    for (const row of tableRows) {
      while (row.cells.length < maxCols) {
        row.cells.push({
          runs: [{ text: '', bold: false, italic: false, fontSize: 11, fontName: '' }],
        });
      }
    }

    tables.push({ type: 'table', rows: tableRows, _y: current[0].line.y });
    current = [];
  }

  const available = textLines
    .map((l, i) => ({ line: l, idx: i }))
    .filter(({ idx }) => !alreadyUsed.has(idx))
    .sort((a, b) => a.line.y - b.line.y);

  for (const entry of available) {
    const hasTab = entry.line.runs.some((r) => r.text.includes('\t'));
    if (hasTab) {
      current.push(entry);
    } else {
      flushTable();
    }
  }
  flushTable();

  return { tables, usedIndices };
}

// ── Paragraph/heading/list grouping ──────────────────────────────

function groupIntoElements(
  lines: PageLine[],
  bodySize: number,
  rightMargin: number
): DocBlock[] {
  const elements: DocBlock[] = [];
  const sorted = [...lines].sort((a, b) => a.y - b.y);

  let i = 0;
  while (i < sorted.length) {
    const line = sorted[i];
    const lineText = line.runs.map((r) => r.text).join('');

    // Check heading
    const headingLevel = detectHeading(line, bodySize);
    if (headingLevel > 0) {
      elements.push({
        type: 'heading',
        level: headingLevel,
        runs: line.runs,
        _y: line.y,
      });
      i++;
      continue;
    }

    // Check list item
    const listMatch = detectListItem(lineText);
    if (listMatch) {
      const cleanRuns = stripListPrefix(line.runs, listMatch.prefixLen);
      elements.push({
        type: 'list-item',
        level: 0,
        ordered: listMatch.ordered,
        runs: cleanRuns.length > 0 ? cleanRuns : line.runs,
        _y: line.y,
      });
      i++;
      continue;
    }

    // Regular paragraph — try merging consecutive wrapping lines
    const paraRuns: RunData[] = line.runs.map((r) => ({ ...r }));
    const paraY = line.y;
    let prevLine = line;

    while (i + 1 < sorted.length) {
      const next = sorted[i + 1];
      const nextText = next.runs.map((r) => r.text).join('');

      // Don't merge into headings or list items
      if (detectHeading(next, bodySize) > 0) break;
      if (detectListItem(nextText)) break;

      // Don't merge if font size differs significantly
      if (Math.abs(next.height - prevLine.height) > 1.5) break;

      // Don't merge if indentation differs
      if (Math.abs(next.x - line.x) > 30) break;

      // Key heuristic: only merge if previous line fills >85% of available width
      if (rightMargin > 0) {
        const avail = rightMargin - prevLine.x;
        const used = prevLine.endX - prevLine.x;
        if (avail <= 0 || used <= avail * 0.85) break;
      } else {
        break; // can't determine if line wraps without a right margin
      }

      // Don't merge across large vertical gaps (>1.5× line height)
      const gap = next.y - (prevLine.y + prevLine.height);
      if (gap > prevLine.height * 1.5) break;

      // Merge: handle hyphenation and add space
      const lastRun = paraRuns[paraRuns.length - 1];
      if (lastRun) {
        const lastChar = lastRun.text.trimEnd().slice(-1);
        if (lastChar === '-') {
          lastRun.text = lastRun.text.replace(/-\s*$/, '');
        } else if (!lastRun.text.endsWith(' ')) {
          lastRun.text += ' ';
        }
      }

      for (const run of next.runs) {
        const lastR = paraRuns[paraRuns.length - 1];
        if (
          lastR &&
          lastR.bold === run.bold &&
          lastR.italic === run.italic &&
          Math.abs(lastR.fontSize - run.fontSize) < 1
        ) {
          lastR.text += run.text;
        } else {
          paraRuns.push({ ...run });
        }
      }

      prevLine = next;
      i++;
    }

    elements.push({ type: 'paragraph', runs: paraRuns, _y: paraY });
    i++;
  }

  return elements;
}

// ── Page layout assembly ─────────────────────────────────────────

function buildPageElements(
  textLines: PageLine[],
  hLines: GeoLine[],
  vLines: GeoLine[],
  images: PageImage[],
  pageWidth: number
): DocBlock[] {
  if (textLines.length === 0 && images.length === 0) return [];

  const bodySize = findBodySize(textLines);

  // 1. Detect lattice (bordered) tables
  const lattice = detectLatticeTables(textLines, hLines, vLines, pageWidth);

  // 2. Detect tab-based (borderless) tables from remaining lines
  const tabBased = detectTabTables(textLines, lattice.usedIndices);

  // 3. Get remaining (non-table) text lines
  const allUsed = tabBased.usedIndices;
  const remainingLines = textLines.filter((_, i) => !allUsed.has(i));

  // 4. Estimate right margin for paragraph merging
  const rightMargin = estimateRightMargin(remainingLines, bodySize);

  // 5. Group remaining lines into paragraphs, headings, lists
  const textElements = groupIntoElements(remainingLines, bodySize, rightMargin);

  // 6. Combine all elements with images, sort by Y position
  const all: DocBlock[] = [
    ...lattice.tables,
    ...tabBased.tables,
    ...textElements,
    ...images.map(
      (img): DocBlock => ({
        type: 'image',
        data: img.pngBytes,
        widthPt: img.widthPt,
        heightPt: img.heightPt,
        _y: img.y,
      })
    ),
  ];

  all.sort((a, b) => a._y - b._y);
  return all;
}

// ── DOCX generation ──────────────────────────────────────────────

async function generateDocx(pages: PageResult[]): Promise<Blob> {
  const docxLib = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    AlignmentType,
    LevelFormat,
    BorderStyle,
  } = docxLib;

  const PT_TO_HALF_PT = 2;
  const PT_TO_TWIP = 20;

  function makeRun(run: RunData): InstanceType<typeof TextRun> {
    return new TextRun({
      text: run.text,
      bold: run.bold || undefined,
      italics: run.italic || undefined,
      size: Math.round(run.fontSize * PT_TO_HALF_PT),
      font: mapFont(run.fontName),
    });
  }

  const BORDER_THIN = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '999999',
  };

  const sections = pages.map((page) => {
    const children: (
      | InstanceType<typeof Paragraph>
      | InstanceType<typeof Table>
    )[] = [];

    for (const el of page.elements) {
      switch (el.type) {
        case 'heading': {
          const hMap = {
            1: HeadingLevel.HEADING_1,
            2: HeadingLevel.HEADING_2,
            3: HeadingLevel.HEADING_3,
          } as const;
          children.push(
            new Paragraph({
              heading: hMap[el.level],
              children: el.runs.map(makeRun),
              spacing: { before: 240, after: 120 },
            })
          );
          break;
        }

        case 'paragraph': {
          children.push(
            new Paragraph({
              children: el.runs.map(makeRun),
              spacing: { before: 80, after: 80, line: 276 },
            })
          );
          break;
        }

        case 'list-item': {
          children.push(
            new Paragraph({
              numbering: {
                reference: el.ordered ? 'numbered-list' : 'bullet-list',
                level: el.level,
              },
              children: el.runs.map(makeRun),
              spacing: { before: 40, after: 40 },
            })
          );
          break;
        }

        case 'table': {
          const maxCols = Math.max(...el.rows.map((r) => r.cells.length), 1);
          const usableWidth = Math.round((page.widthPt - 144) * PT_TO_TWIP); // minus 2×72pt margins
          const colWidth = Math.round(usableWidth / maxCols);

          try {
            const tRows = el.rows.map(
              (row) =>
                new TableRow({
                  children: row.cells.map(
                    (cell) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: cell.runs.map(makeRun),
                            spacing: { before: 20, after: 20 },
                          }),
                        ],
                        width: { size: colWidth, type: WidthType.DXA },
                        borders: {
                          top: BORDER_THIN,
                          bottom: BORDER_THIN,
                          left: BORDER_THIN,
                          right: BORDER_THIN,
                        },
                      })
                  ),
                })
            );

            children.push(
              new Table({
                rows: tRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          } catch {
            // If table construction fails, fall back to paragraphs
            for (const row of el.rows) {
              const text = row.cells.map((c) => c.runs.map((r) => r.text).join('')).join('\t');
              children.push(
                new Paragraph({
                  children: [new TextRun({ text })],
                  spacing: { before: 40, after: 40 },
                })
              );
            }
          }
          break;
        }

        case 'image': {
          try {
            // docx lib: transformation dimensions are in pixels, internally multiplied by 9525 for EMU
            // We want: widthPt * 12700 EMU. So pixel value = widthPt * 12700 / 9525 ≈ widthPt * 4/3
            const displayW = Math.round(el.widthPt * (4 / 3));
            const displayH = Math.round(el.heightPt * (4 / 3));

            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    type: 'png',
                    data: el.data,
                    transformation: { width: displayW, height: displayH },
                  }),
                ],
                spacing: { before: 100, after: 100 },
              })
            );
          } catch {
            // Skip images that fail
          }
          break;
        }
      }
    }

    if (children.length === 0) {
      children.push(new Paragraph({ children: [] }));
    }

    return {
      properties: {
        page: {
          size: {
            width: Math.round(page.widthPt * PT_TO_TWIP),
            height: Math.round(page.heightPt * PT_TO_TWIP),
          },
          margin: {
            top: Math.round(72 * PT_TO_TWIP),
            bottom: Math.round(72 * PT_TO_TWIP),
            left: Math.round(72 * PT_TO_TWIP),
            right: Math.round(72 * PT_TO_TWIP),
          },
        },
      },
      children,
    };
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
        {
          reference: 'numbered-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections,
  });

  return Packer.toBlob(doc);
}

// ── Main pipeline ────────────────────────────────────────────────

/**
 * Convert a PDF to an editable DOCX document.
 *
 * @param pdfData    - Raw PDF bytes as an ArrayBuffer
 * @param onProgress - Optional callback for progress messages
 * @returns          - A DOCX Blob ready for download
 */
export async function convertPdfToDocx(
  pdfData: ArrayBuffer,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const OPS = pdfjsLib.OPS as unknown as Record<string, number>;

  const pageResults: PageResult[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    onProgress?.(`Analyzing page ${i} of ${pdfDoc.numPages}...`);

    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    // 1. Extract text lines
    const textContent = await page.getTextContent();
    const textLines = extractTextLines(
      textContent as { items: unknown[]; styles: Record<string, { fontFamily?: string }> },
      pageHeight
    );

    // 2. Extract geometric lines for table detection
    let hLines: GeoLine[] = [];
    let vLines: GeoLine[] = [];
    try {
      const geo = await extractPageLines(
        page as unknown as Parameters<typeof extractPageLines>[0],
        pageHeight,
        OPS
      );
      hLines = geo.hLines;
      vLines = geo.vLines;
    } catch {
      // Geometry extraction is optional — tables fall back to tab-based
    }

    // 3. Extract images
    const images = await extractImages(
      page as unknown as Parameters<typeof extractImages>[0],
      pageHeight,
      OPS
    );

    // 4. Analyze layout → document elements
    const elements = buildPageElements(textLines, hLines, vLines, images, pageWidth);

    pageResults.push({
      widthPt: pageWidth,
      heightPt: pageHeight,
      elements,
    });
  }

  onProgress?.('Generating Word document...');
  return generateDocx(pageResults);
}

/**
 * Unit tests for PDF-to-Word utility functions.
 * Tests the pure extraction and reconstruction algorithms with known inputs
 * to verify correct grouping, merging, heading detection, and font mapping.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFontStyle,
  groupIntoLines,
  buildTable,
  detectTables,
  mergeParagraphLines,
  findBodyFontSize,
  pdfSizeToDocxHalfPoints,
  detectHeadingLevel,
  type TextItem,
  type ExtractedLine,
  type ExtractedBlock,
  type ExtractedPage,
} from './pdf-word-utils';

// ── Helpers ────────────────────────────────────────────────────────

function makeTextItem(overrides: Partial<TextItem> = {}): TextItem {
  return {
    str: 'test',
    x: 0,
    y: 0,
    width: 30,
    height: 12,
    fontSize: 12,
    fontName: 'Arial',
    isBold: false,
    isItalic: false,
    ...overrides,
  };
}

function makeLine(
  text: string,
  fontSize = 12,
  x = 72,
  bold = false,
  italic = false
): ExtractedLine {
  return {
    runs: [{ text, bold, italic, fontSize }],
    fontSize,
    x,
  };
}

// ── parseFontStyle ─────────────────────────────────────────────────

describe('parseFontStyle', () => {
  it('detects bold from font name', () => {
    expect(parseFontStyle('TimesNewRoman-Bold')).toEqual({ bold: true, italic: false });
    expect(parseFontStyle('Arial-Heavy')).toEqual({ bold: true, italic: false });
    expect(parseFontStyle('Futura-Black')).toEqual({ bold: true, italic: false });
    expect(parseFontStyle('Roboto-SemiBold')).toEqual({ bold: true, italic: false });
    expect(parseFontStyle('OpenSans-DemiBold')).toEqual({ bold: true, italic: false });
  });

  it('detects italic from font name', () => {
    expect(parseFontStyle('Arial-Italic')).toEqual({ bold: false, italic: true });
    expect(parseFontStyle('Georgia-Oblique')).toEqual({ bold: false, italic: true });
  });

  it('detects bold+italic combinations', () => {
    expect(parseFontStyle('Arial-BoldItalic')).toEqual({ bold: true, italic: true });
    expect(parseFontStyle('TimesNewRoman-BoldOblique')).toEqual({ bold: true, italic: true });
  });

  it('returns false/false for regular fonts', () => {
    expect(parseFontStyle('Arial')).toEqual({ bold: false, italic: false });
    expect(parseFontStyle('TimesNewRoman')).toEqual({ bold: false, italic: false });
    expect(parseFontStyle('')).toEqual({ bold: false, italic: false });
  });
});

// ── groupIntoLines ─────────────────────────────────────────────────

describe('groupIntoLines', () => {
  it('returns empty array for empty input', () => {
    expect(groupIntoLines([])).toEqual([]);
  });

  it('groups items on the same Y coordinate into one line', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 0, y: 100, width: 30 }),
      makeTextItem({ str: 'World', x: 35, y: 100, width: 30 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(1);
    const text = lines[0].runs.map((r) => r.text).join('');
    expect(text).toContain('Hello');
    expect(text).toContain('World');
  });

  it('groups items within Y tolerance into one line', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 0, y: 100, width: 30 }),
      makeTextItem({ str: 'World', x: 35, y: 102, width: 30 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(1);
  });

  it('separates items with different Y coordinates into different lines', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Line 1', x: 0, y: 100, width: 30 }),
      makeTextItem({ str: 'Line 2', x: 0, y: 80, width: 30 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(2);
  });

  it('sorts lines top-to-bottom (higher Y first in PDF coords)', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Bottom', x: 0, y: 50, width: 40 }),
      makeTextItem({ str: 'Top', x: 0, y: 200, width: 20 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(2);
    expect(lines[0].runs[0].text).toBe('Top');
    expect(lines[1].runs[0].text).toBe('Bottom');
  });

  it('inserts tab character for large horizontal gaps', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Col1', x: 0, y: 100, width: 30, fontSize: 12 }),
      makeTextItem({ str: 'Col2', x: 200, y: 100, width: 30, fontSize: 12 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(1);
    const text = lines[0].runs.map((r) => r.text).join('');
    expect(text).toContain('\t');
  });

  it('inserts space for small horizontal gaps', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 0, y: 100, width: 30, fontSize: 12 }),
      makeTextItem({ str: 'World', x: 35, y: 100, width: 30, fontSize: 12 }),
    ];
    const lines = groupIntoLines(items);
    const text = lines[0].runs.map((r) => r.text).join('');
    expect(text).toContain('Hello World');
  });

  it('merges consecutive items with same bold/italic into one run', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 0, y: 100, width: 30, isBold: true }),
      makeTextItem({ str: 'World', x: 35, y: 100, width: 30, isBold: true }),
    ];
    const lines = groupIntoLines(items);
    expect(lines[0].runs).toHaveLength(1);
    expect(lines[0].runs[0].bold).toBe(true);
  });

  it('creates separate runs for different bold/italic styles', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Bold', x: 0, y: 100, width: 30, isBold: true }),
      makeTextItem({ str: 'Normal', x: 35, y: 100, width: 40, isBold: false }),
    ];
    const lines = groupIntoLines(items);
    expect(lines[0].runs.length).toBeGreaterThanOrEqual(2);
    expect(lines[0].runs[0].bold).toBe(true);
  });

  it('filters out lines with only whitespace', () => {
    const items: TextItem[] = [
      makeTextItem({ str: ' ', x: 0, y: 100, width: 5 }),
      makeTextItem({ str: '  ', x: 10, y: 100, width: 5 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(0);
  });

  it('uses median font size for line', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'A', x: 0, y: 100, width: 10, fontSize: 10 }),
      makeTextItem({ str: 'B', x: 15, y: 100, width: 10, fontSize: 14 }),
      makeTextItem({ str: 'C', x: 30, y: 100, width: 10, fontSize: 12 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines[0].fontSize).toBe(12);
  });
});

// ── buildTable ─────────────────────────────────────────────────────

describe('buildTable', () => {
  it('splits lines by tab into cells', () => {
    const lines: ExtractedLine[] = [
      makeLine('Name\tAge\tCity'),
      makeLine('Alice\t30\tNew York'),
    ];
    const table = buildTable(lines);
    expect(table.type).toBe('table');
    expect(table.rows).toHaveLength(2);
    expect(table.rows![0].cells).toHaveLength(3);
    expect(table.rows![0].cells[0].runs[0].text).toBe('Name');
    expect(table.rows![1].cells[1].runs[0].text).toBe('30');
  });

  it('normalizes column count with empty cells', () => {
    const lines: ExtractedLine[] = [
      makeLine('A\tB\tC'),
      makeLine('X\tY'),
    ];
    const table = buildTable(lines);
    expect(table.rows![0].cells).toHaveLength(3);
    expect(table.rows![1].cells).toHaveLength(3);
    expect(table.rows![1].cells[2].runs[0].text).toBe('');
  });
});

// ── detectTables ───────────────────────────────────────────────────

describe('detectTables', () => {
  it('returns empty for no lines', () => {
    expect(detectTables([])).toEqual([]);
  });

  it('returns single paragraph block for lines without tabs', () => {
    const lines = [makeLine('Hello world'), makeLine('Second line'), makeLine('Third line')];
    const blocks = detectTables(lines);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].lines).toHaveLength(3);
  });

  it('detects consecutive tab-lines as a table', () => {
    const lines = [
      makeLine('Intro text'),
      makeLine('Name\tAge'),
      makeLine('Alice\t30'),
      makeLine('Bob\t25'),
      makeLine('Conclusion'),
    ];
    const blocks = detectTables(lines);
    expect(blocks.length).toBeGreaterThanOrEqual(2);

    const tableBlock = blocks.find((b) => b.type === 'table');
    expect(tableBlock).toBeDefined();
    expect(tableBlock!.rows).toHaveLength(3);
  });

  it('interleaves paragraph and table blocks', () => {
    const lines = [
      makeLine('Paragraph 1'),
      makeLine('Still paragraph'),
      makeLine('Also paragraph'),
      makeLine('Col1\tCol2'),
      makeLine('A\tB'),
      makeLine('C\tD'),
      makeLine('After table'),
      makeLine('More text'),
      makeLine('Even more'),
    ];
    const blocks = detectTables(lines);
    const types = blocks.map((b) => b.type);
    expect(types).toEqual(['paragraph', 'table', 'paragraph']);
  });
});

// ── mergeParagraphLines ────────────────────────────────────────────

describe('mergeParagraphLines', () => {
  const bodySize = 12;

  it('returns table blocks unchanged', () => {
    const blocks: ExtractedBlock[] = [
      { type: 'table', rows: [{ cells: [{ runs: [{ text: 'A', bold: false, italic: false, fontSize: 12 }] }] }] },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result).toEqual(blocks);
  });

  it('returns single-line paragraphs unchanged', () => {
    const blocks: ExtractedBlock[] = [
      { type: 'paragraph', lines: [makeLine('Only line')] },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result[0].lines).toHaveLength(1);
  });

  it('merges consecutive body-text lines into one paragraph', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('This is the first line of a long paragraph that', 12, 72),
          makeLine('wraps to a second line in the PDF because the', 12, 72),
          makeLine('text is wider than the page margin allows.', 12, 72),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result[0].lines).toHaveLength(1);
    const text = result[0].lines![0].runs.map((r) => r.text).join('');
    expect(text).toContain('first line');
    expect(text).toContain('second line');
    expect(text).toContain('page margin');
  });

  it('does NOT merge lines with different font sizes', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('Heading Text', 18, 72),
          makeLine('Body text that follows the heading.', 12, 72),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result[0].lines!.length).toBe(2);
  });

  it('does NOT merge lines starting with bullet characters', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('First bullet point text', 12, 72),
          makeLine('\u2022 Second bullet point', 12, 72),
          makeLine('\u2022 Third bullet point', 12, 72),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result[0].lines!.length).toBe(3);
  });

  it('does NOT merge lines starting with numbered list prefixes', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('Introduction text', 12, 72),
          makeLine('1. First item', 12, 72),
          makeLine('2. Second item', 12, 72),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result[0].lines!.length).toBe(3);
  });

  it('does NOT merge lines with different left margins', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('Normal text', 12, 72),
          makeLine('Indented text', 12, 200),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    expect(result[0].lines!.length).toBe(2);
  });

  it('joins merged lines with spaces', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('word1', 12, 72),
          makeLine('word2', 12, 72),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    const text = result[0].lines![0].runs.map((r) => r.text).join('');
    expect(text).toBe('word1 word2');
  });

  it('handles trailing hyphens (word hyphenation across lines)', () => {
    const blocks: ExtractedBlock[] = [
      {
        type: 'paragraph',
        lines: [
          makeLine('hyphen-', 12, 72),
          makeLine('ated word', 12, 72),
        ],
      },
    ];
    const result = mergeParagraphLines(blocks, bodySize);
    const text = result[0].lines![0].runs.map((r) => r.text).join('');
    expect(text).toBe('hyphenated word');
  });
});

// ── findBodyFontSize ───────────────────────────────────────────────

describe('findBodyFontSize', () => {
  it('returns the most frequent font size', () => {
    const pages: ExtractedPage[] = [
      {
        pageNum: 1,
        images: [],
        blocks: [
          {
            type: 'paragraph',
            lines: [
              makeLine('Heading', 18),
              makeLine('Body text line 1', 12),
              makeLine('Body text line 2', 12),
              makeLine('Body text line 3', 12),
              makeLine('Body text line 4', 12),
              makeLine('Sub-heading', 15),
            ],
          },
        ],
      },
    ];
    expect(findBodyFontSize(pages)).toBe(12);
  });

  it('defaults to 12 for empty pages', () => {
    expect(findBodyFontSize([])).toBe(12);
    expect(findBodyFontSize([{ pageNum: 1, blocks: [], images: [] }])).toBe(12);
  });
});

// ── pdfSizeToDocxHalfPoints ────────────────────────────────────────

describe('pdfSizeToDocxHalfPoints', () => {
  it('maps body size to 22 half-points (11pt)', () => {
    expect(pdfSizeToDocxHalfPoints(12, 12)).toBe(22);
  });

  it('scales proportionally for larger sizes', () => {
    expect(pdfSizeToDocxHalfPoints(18, 12)).toBe(33);
  });

  it('scales proportionally for smaller sizes', () => {
    expect(pdfSizeToDocxHalfPoints(9, 12)).toBe(17);
  });

  it('clamps to minimum of 16 (8pt)', () => {
    expect(pdfSizeToDocxHalfPoints(3, 12)).toBe(16);
  });

  it('clamps to maximum of 56 (28pt)', () => {
    expect(pdfSizeToDocxHalfPoints(36, 12)).toBe(56);
  });
});

// ── detectHeadingLevel ─────────────────────────────────────────────

describe('detectHeadingLevel', () => {
  const bodySize = 12;

  it('returns 0 for body-sized text', () => {
    expect(detectHeadingLevel(makeLine('Body text', 12), bodySize)).toBe(0);
  });

  it('returns 3 for H3 (15-29% larger)', () => {
    expect(detectHeadingLevel(makeLine('Sub-heading', 14), bodySize)).toBe(3);
  });

  it('returns 2 for H2 (30-59% larger)', () => {
    expect(detectHeadingLevel(makeLine('Section Title', 16), bodySize)).toBe(2);
  });

  it('returns 1 for H1 (60%+ larger)', () => {
    expect(detectHeadingLevel(makeLine('Document Title', 20), bodySize)).toBe(1);
  });

  it('returns 0 for long text even if large font', () => {
    const longText = 'A'.repeat(121);
    expect(detectHeadingLevel(makeLine(longText, 20), bodySize)).toBe(0);
  });
});

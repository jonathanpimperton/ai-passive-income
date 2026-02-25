import { describe, it, expect } from 'vitest';
import {
  parseFontStyle,
  groupIntoLines,
  buildTable,
  detectTables,
  mergeParagraphLines,
  findBodyFontSize,
  estimateRightMargin,
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

const RIGHT_MARGIN = 523;

function makeLine(
  text: string,
  opts: { fontSize?: number; x?: number; endX?: number; bold?: boolean; italic?: boolean } = {}
): ExtractedLine {
  const { fontSize = 12, x = 72, endX = 200, bold = false, italic = false } = opts;
  return { runs: [{ text, bold, italic, fontSize }], fontSize, x, endX };
}

function makeFullWidthLine(text: string, x = 72): ExtractedLine {
  return makeLine(text, { x, endX: RIGHT_MARGIN - 2 });
}

function makeShortLine(text: string, x = 72, endXPct = 0.4): ExtractedLine {
  return makeLine(text, { x, endX: x + (RIGHT_MARGIN - x) * endXPct });
}

// ── parseFontStyle ─────────────────────────────────────────────────

describe('parseFontStyle', () => {
  it('detects bold from font name', () => {
    expect(parseFontStyle('TimesNewRoman-Bold')).toEqual({ bold: true, italic: false });
    expect(parseFontStyle('Arial-Heavy')).toEqual({ bold: true, italic: false });
    expect(parseFontStyle('Roboto-SemiBold')).toEqual({ bold: true, italic: false });
  });

  it('detects italic from font name', () => {
    expect(parseFontStyle('Arial-Italic')).toEqual({ bold: false, italic: true });
    expect(parseFontStyle('Georgia-Oblique')).toEqual({ bold: false, italic: true });
  });

  it('detects bold+italic combinations', () => {
    expect(parseFontStyle('Arial-BoldItalic')).toEqual({ bold: true, italic: true });
  });

  it('returns false/false for regular fonts', () => {
    expect(parseFontStyle('Arial')).toEqual({ bold: false, italic: false });
    expect(parseFontStyle('')).toEqual({ bold: false, italic: false });
  });
});

// ── groupIntoLines ─────────────────────────────────────────────────

describe('groupIntoLines', () => {
  it('returns empty array for empty input', () => {
    expect(groupIntoLines([])).toEqual([]);
  });

  it('groups items on the same Y into one line', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 0, y: 100, width: 30 }),
      makeTextItem({ str: 'World', x: 35, y: 100, width: 30 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines).toHaveLength(1);
  });

  it('separates items with different Y into different lines', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Line 1', x: 0, y: 100, width: 30 }),
      makeTextItem({ str: 'Line 2', x: 0, y: 80, width: 30 }),
    ];
    expect(groupIntoLines(items)).toHaveLength(2);
  });

  it('sorts lines top-to-bottom', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Bottom', x: 0, y: 50, width: 40 }),
      makeTextItem({ str: 'Top', x: 0, y: 200, width: 20 }),
    ];
    const lines = groupIntoLines(items);
    expect(lines[0].runs[0].text).toBe('Top');
    expect(lines[1].runs[0].text).toBe('Bottom');
  });

  it('inserts tab for large horizontal gaps', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Col1', x: 0, y: 100, width: 30, fontSize: 12 }),
      makeTextItem({ str: 'Col2', x: 200, y: 100, width: 30, fontSize: 12 }),
    ];
    const text = groupIntoLines(items)[0].runs.map((r) => r.text).join('');
    expect(text).toContain('\t');
  });

  it('inserts space for small gaps', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 0, y: 100, width: 30, fontSize: 12 }),
      makeTextItem({ str: 'World', x: 35, y: 100, width: 30, fontSize: 12 }),
    ];
    const text = groupIntoLines(items)[0].runs.map((r) => r.text).join('');
    expect(text).toContain('Hello World');
  });

  it('computes endX from last item x + width', () => {
    const items: TextItem[] = [
      makeTextItem({ str: 'Hello', x: 72, y: 100, width: 50 }),
      makeTextItem({ str: 'World', x: 130, y: 100, width: 60 }),
    ];
    expect(groupIntoLines(items)[0].endX).toBe(190);
  });

  it('filters out whitespace-only lines', () => {
    const items: TextItem[] = [
      makeTextItem({ str: ' ', x: 0, y: 100, width: 5 }),
    ];
    expect(groupIntoLines(items)).toHaveLength(0);
  });
});

// ── buildTable / detectTables ──────────────────────────────────────

describe('buildTable', () => {
  it('splits lines by tab into cells', () => {
    const lines = [makeLine('Name\tAge\tCity'), makeLine('Alice\t30\tNY')];
    const table = buildTable(lines);
    expect(table.rows).toHaveLength(2);
    expect(table.rows![0].cells).toHaveLength(3);
    expect(table.rows![0].cells[0].runs[0].text).toBe('Name');
  });
});

describe('detectTables', () => {
  it('returns paragraph block for lines without tabs', () => {
    const lines = [makeLine('a'), makeLine('b'), makeLine('c')];
    const blocks = detectTables(lines);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
  });

  it('detects consecutive tab-lines as a table', () => {
    const lines = [
      makeLine('Intro'),
      makeLine('A\tB'),
      makeLine('C\tD'),
      makeLine('E\tF'),
      makeLine('After'),
    ];
    const types = detectTables(lines).map((b) => b.type);
    expect(types).toContain('table');
  });
});

// ── estimateRightMargin ────────────────────────────────────────────

describe('estimateRightMargin', () => {
  it('returns 0 for empty pages', () => {
    expect(estimateRightMargin([], 12)).toBe(0);
  });

  it('returns max endX of body-sized lines', () => {
    const pages: ExtractedPage[] = [{
      pageNum: 1, images: [],
      blocks: [{
        type: 'paragraph',
        lines: [
          makeLine('Short', { endX: 200 }),
          makeLine('Full width', { endX: 520 }),
        ],
      }],
    }];
    expect(estimateRightMargin(pages, 12)).toBe(520);
  });

  it('ignores heading-sized lines', () => {
    const pages: ExtractedPage[] = [{
      pageNum: 1, images: [],
      blocks: [{
        type: 'paragraph',
        lines: [
          makeLine('Heading', { fontSize: 18, endX: 600 }),
          makeLine('Body', { fontSize: 12, endX: 520 }),
        ],
      }],
    }];
    expect(estimateRightMargin(pages, 12)).toBe(520);
  });
});

// ── mergeParagraphLines — THE CRITICAL TESTS ───────────────────────

describe('mergeParagraphLines', () => {
  const bodySize = 12;

  it('does NOT merge short address-block lines', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeShortLine('JP Morgan Chase Bank', 72, 0.35),
        makeShortLine('Attn: Wire Transfers', 72, 0.30),
        makeShortLine('14201 Dallas Parkway', 72, 0.30),
        makeShortLine('Dallas, TX 75254', 72, 0.25),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines).toHaveLength(4);
  });

  it('does NOT merge label-value pairs', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeShortLine('Currency: USD', 72, 0.20),
        makeShortLine('Account No.: 936598785', 72, 0.35),
        makeShortLine('Routing: 021000021', 72, 0.30),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines).toHaveLength(3);
  });

  it('does NOT merge closing/signature lines', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeShortLine('Sincerely,', 72, 0.15),
        makeShortLine('John Smith', 72, 0.15),
        makeShortLine('Vice President', 72, 0.20),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines).toHaveLength(3);
  });

  it('DOES merge consecutive full-width wrapped lines', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeFullWidthLine('This is the first line of a long paragraph that continues to'),
        makeFullWidthLine('wrap across multiple lines because the text content is wider'),
        makeShortLine('than what fits on a single line.', 72, 0.50),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines!.length).toBeLessThan(3);
    const text = result[0].lines![0].runs.map((r) => r.text).join('');
    expect(text).toContain('first line');
    expect(text).toContain('wrap across');
  });

  it('handles trailing hyphen merge', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeFullWidthLine('hyphen-'),
        makeShortLine('ated word', 72, 0.3),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    const text = result[0].lines![0].runs.map((r) => r.text).join('');
    expect(text).toBe('hyphenated word');
  });

  it('does NOT merge bullet list items', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeFullWidthLine('First bullet point text that extends to fill the full'),
        makeLine('\u2022 Second bullet point', { endX: 300 }),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines!.length).toBe(2);
  });

  it('does NOT merge numbered list items', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeFullWidthLine('Introduction text that fills the line'),
        makeLine('1. First item', { endX: 250 }),
        makeLine('2. Second item', { endX: 260 }),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines!.length).toBe(3);
  });

  it('does NOT merge lines with different font sizes', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeLine('Heading', { fontSize: 18, endX: RIGHT_MARGIN }),
        makeFullWidthLine('Body text'),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines!.length).toBe(2);
  });

  it('does NOT merge lines with different margins', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeFullWidthLine('Normal text'),
        makeLine('Indented', { x: 200, endX: RIGHT_MARGIN }),
      ],
    }];
    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    expect(result[0].lines!.length).toBe(2);
  });

  it('skips merging when rightMargin is 0', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [makeFullWidthLine('A'), makeFullWidthLine('B')],
    }];
    expect(mergeParagraphLines(blocks, bodySize, 0)[0].lines).toHaveLength(2);
  });

  it('realistic business letter: preserves all structure', () => {
    const blocks: ExtractedBlock[] = [{
      type: 'paragraph',
      lines: [
        makeLine('IMPORTANT: Settlement Instructions', { fontSize: 16, endX: 400 }),
        makeShortLine('August 22, 2023', 72, 0.25),
        makeShortLine('Acme Corporation', 72, 0.25),
        makeShortLine('123 Main Street', 72, 0.25),
        makeShortLine('New York, NY 10001', 72, 0.30),
        makeFullWidthLine('Please find attached the settlement instructions for your account. These'),
        makeFullWidthLine('instructions are effective immediately and supersede any previous versions'),
        makeShortLine('that may have been provided to your team.', 72, 0.60),
        makeFullWidthLine('If you have any questions or require clarification, please do not hesitate'),
        makeShortLine('to contact our office.', 72, 0.30),
        makeShortLine('Sincerely,', 72, 0.15),
        makeShortLine('Jane Doe', 72, 0.15),
        makeShortLine('Senior Manager', 72, 0.20),
      ],
    }];

    const result = mergeParagraphLines(blocks, bodySize, RIGHT_MARGIN);
    const lines = result[0].lines!;

    // Heading, date, 3 address lines, 2 merged body paragraphs, sincerely, name, title = 10
    // (heading=1, date=1, address=3, body para 1=1 merged, body para 2=1 merged, closing=3)
    // Each short line stays separate; full-width lines merge with each other
    const lineTexts = lines.map((l) => l.runs.map((r) => r.text).join(''));

    // Address lines must be separate
    expect(lineTexts.filter((t) => t.includes('Acme'))).toHaveLength(1);
    expect(lineTexts.filter((t) => t.includes('Main Street'))).toHaveLength(1);
    expect(lineTexts.filter((t) => t.includes('New York'))).toHaveLength(1);

    // Body paragraph lines should be merged
    const bodyPara = lineTexts.find((t) => t.includes('Please find'));
    expect(bodyPara).toContain('supersede');

    // Closing lines must be separate
    expect(lineTexts.filter((t) => t.includes('Sincerely'))).toHaveLength(1);
    expect(lineTexts.filter((t) => t.includes('Jane Doe'))).toHaveLength(1);
    expect(lineTexts.filter((t) => t.includes('Senior Manager'))).toHaveLength(1);
  });
});

// ── findBodyFontSize ───────────────────────────────────────────────

describe('findBodyFontSize', () => {
  it('returns the most frequent font size', () => {
    const pages: ExtractedPage[] = [{
      pageNum: 1, images: [],
      blocks: [{
        type: 'paragraph',
        lines: [
          makeLine('Heading', { fontSize: 18 }),
          makeLine('Body 1'), makeLine('Body 2'), makeLine('Body 3'), makeLine('Body 4'),
        ],
      }],
    }];
    expect(findBodyFontSize(pages)).toBe(12);
  });

  it('defaults to 12 for empty pages', () => {
    expect(findBodyFontSize([])).toBe(12);
  });
});

// ── pdfSizeToDocxHalfPoints ────────────────────────────────────────

describe('pdfSizeToDocxHalfPoints', () => {
  it('maps body size to 22 half-points', () => {
    expect(pdfSizeToDocxHalfPoints(12, 12)).toBe(22);
  });
  it('clamps to 16 minimum', () => {
    expect(pdfSizeToDocxHalfPoints(3, 12)).toBe(16);
  });
  it('clamps to 56 maximum', () => {
    expect(pdfSizeToDocxHalfPoints(36, 12)).toBe(56);
  });
});

// ── detectHeadingLevel ─────────────────────────────────────────────

describe('detectHeadingLevel', () => {
  it('returns 0 for body text', () => {
    expect(detectHeadingLevel(makeLine('Body'), 12)).toBe(0);
  });
  it('returns 1 for H1', () => {
    expect(detectHeadingLevel(makeLine('Title', { fontSize: 20 }), 12)).toBe(1);
  });
  it('returns 2 for H2', () => {
    expect(detectHeadingLevel(makeLine('Section', { fontSize: 16 }), 12)).toBe(2);
  });
  it('returns 0 for long text even if large font', () => {
    expect(detectHeadingLevel(makeLine('A'.repeat(121), { fontSize: 20 }), 12)).toBe(0);
  });
});

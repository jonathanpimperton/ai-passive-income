/**
 * Extract horizontal/vertical line segments from a PDF page's operator list.
 * Used for lattice (bordered) table detection in the PDF-to-Word converter.
 *
 * Handles:
 *  - Stroked paths (explicit border lines)
 *  - Thin filled rectangles (common alternative for drawing table rules)
 *  - CTM (current transformation matrix) tracking through save/restore
 *
 * All output coordinates are in top-down page space (origin at top-left).
 */

// ── Types ────────────────────────────────────────────────────────

export interface GeoLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface PageGeometry {
  hLines: GeoLine[];
  vLines: GeoLine[];
}

// ── Matrix helpers ───────────────────────────────────────────────

/** Multiply two 2D affine transform matrices [a, b, c, d, e, f]. */
function mulMat(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

/** Transform a point (x, y) through a CTM, returning [tx, ty]. */
function txPt(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// ── Main extraction ──────────────────────────────────────────────

const SNAP = 3; // tolerance for classifying lines as H or V (in PDF pts)

/**
 * Extract horizontal and vertical line segments from a PDF page's operator list.
 *
 * @param page       - A pdfjs page proxy (must have getOperatorList())
 * @param pageHeight - Page height in PDF points (for Y-axis flip)
 * @param OPS        - pdfjs OPS constants object (pdfjsLib.OPS)
 */
export async function extractPageLines(
  page: {
    getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  },
  pageHeight: number,
  OPS: Record<string, number>
): Promise<PageGeometry> {
  const hLines: GeoLine[] = [];
  const vLines: GeoLine[] = [];

  let opList: { fnArray: number[]; argsArray: unknown[][] };
  try {
    opList = await page.getOperatorList();
  } catch {
    return { hLines, vLines };
  }

  const { fnArray, argsArray } = opList;
  const ctmStack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  let lineWidth = 1;

  // Path commands accumulator
  interface PathCmd {
    op: 'M' | 'L' | 'R';
    pts: [number, number][];
  }
  let path: PathCmd[] = [];

  /** Classify a line segment and add to hLines or vLines. Coords are in PDF space (Y up). */
  function addSegment(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    w: number
  ) {
    // Flip Y to top-down page coordinates
    const y1 = pageHeight - ay;
    const y2 = pageHeight - by;
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(y1 - y2);

    if (dx < 2 && dy < 2) return; // skip degenerate segments

    if (dy <= SNAP && dx > 5) {
      // Horizontal
      const avgY = (y1 + y2) / 2;
      hLines.push({
        x1: Math.min(ax, bx),
        y1: avgY,
        x2: Math.max(ax, bx),
        y2: avgY,
        width: w,
      });
    } else if (dx <= SNAP && dy > 5) {
      // Vertical
      const avgX = (ax + bx) / 2;
      vLines.push({
        x1: avgX,
        y1: Math.min(y1, y2),
        x2: avgX,
        y2: Math.max(y1, y2),
        width: w,
      });
    }
  }

  /** Emit stroked line segments from the current path. */
  function emitStrokedPath() {
    let last: [number, number] | null = null;
    for (const cmd of path) {
      if (cmd.op === 'M') {
        last = cmd.pts[0];
      } else if (cmd.op === 'L' && last) {
        addSegment(last[0], last[1], cmd.pts[0][0], cmd.pts[0][1], lineWidth);
        last = cmd.pts[0];
      } else if (cmd.op === 'R') {
        // Rectangle: emit all 4 sides
        const [p0, p1, p2, p3] = cmd.pts;
        addSegment(p0[0], p0[1], p1[0], p1[1], lineWidth);
        addSegment(p1[0], p1[1], p2[0], p2[1], lineWidth);
        addSegment(p2[0], p2[1], p3[0], p3[1], lineWidth);
        addSegment(p3[0], p3[1], p0[0], p0[1], lineWidth);
      }
    }
  }

  /** Check filled rectangles — thin ones act as lines. */
  function emitFilledRects() {
    for (const cmd of path) {
      if (cmd.op !== 'R') continue;
      const [p0, p1, p2, p3] = cmd.pts;
      const w = Math.abs(p1[0] - p0[0]);
      const h = Math.abs(p0[1] - p3[1]);

      if (h < 3 && w > 5) {
        // Thin horizontal filled rect → horizontal line
        const midY = (p0[1] + p3[1]) / 2;
        addSegment(
          Math.min(p0[0], p3[0]),
          midY,
          Math.max(p1[0], p2[0]),
          midY,
          h || 1
        );
      } else if (w < 3 && h > 5) {
        // Thin vertical filled rect → vertical line
        const midX = (p0[0] + p1[0]) / 2;
        addSegment(midX, Math.max(p0[1], p1[1]), midX, Math.min(p2[1], p3[1]), w || 1);
      }
    }
  }

  // ── Walk the operator list ─────────────────────────────────────
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];

    if (fn === OPS.save) {
      ctmStack.push([...ctm]);
    } else if (fn === OPS.restore) {
      ctm = ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = mulMat(ctm, args as number[]);
    } else if (fn === OPS.setLineWidth) {
      lineWidth = (args as number[])[0] || 1;
    } else if (fn === OPS.constructPath) {
      // args[0] = sub-operation codes, args[1] = flat coordinate array
      const subOps = args[0] as number[];
      const coords = args[1] as number[];
      path = [];
      let ci = 0;

      for (const op of subOps) {
        if (op === OPS.moveTo) {
          path.push({ op: 'M', pts: [txPt(ctm, coords[ci], coords[ci + 1])] });
          ci += 2;
        } else if (op === OPS.lineTo) {
          path.push({ op: 'L', pts: [txPt(ctm, coords[ci], coords[ci + 1])] });
          ci += 2;
        } else if (op === OPS.rectangle) {
          const rx = coords[ci],
            ry = coords[ci + 1],
            rw = coords[ci + 2],
            rh = coords[ci + 3];
          path.push({
            op: 'R',
            pts: [
              txPt(ctm, rx, ry + rh), // top-left in PDF space
              txPt(ctm, rx + rw, ry + rh), // top-right
              txPt(ctm, rx + rw, ry), // bottom-right
              txPt(ctm, rx, ry), // bottom-left
            ],
          });
          ci += 4;
        } else if (op === OPS.curveTo) {
          ci += 6; // skip curves — irrelevant for table borders
        } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
          ci += 4;
        }
        // closePath consumes 0 coordinates
      }
    } else if (
      fn === OPS.stroke ||
      fn === OPS.closeStroke ||
      fn === OPS.fillStroke ||
      fn === OPS.eoFillStroke ||
      fn === OPS.closeFillStroke ||
      fn === OPS.closeEOFillStroke
    ) {
      emitStrokedPath();
      if (fn === OPS.fillStroke || fn === OPS.eoFillStroke) {
        emitFilledRects();
      }
      path = [];
    } else if (fn === OPS.fill || fn === OPS.eoFill) {
      emitFilledRects();
      path = [];
    } else if (fn === OPS.endPath) {
      path = [];
    }
  }

  return { hLines, vLines };
}

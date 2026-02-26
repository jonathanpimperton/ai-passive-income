/**
 * Word to PDF — convert DOCX to PDF by parsing the OOXML directly.
 *
 * Pipeline:
 *  1. JSZip extracts the DOCX (it's a ZIP of XML files)
 *  2. Parse word/document.xml + word/styles.xml + word/numbering.xml
 *  3. Render faithful HTML preserving fonts, sizes, colors, tables, images, lists
 *  4. Browser's native print engine renders to PDF (pixel-perfect output)
 *
 * Uses the browser's print-to-PDF for perfect rendering — CSS page breaks,
 * font rendering, and image placement are all handled natively.
 *
 * Client-side only. No server upload.
 */
import { useState, useCallback, useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import FileDropZone from '../ui/FileDropZone';
import PrivacyBadge from '../ui/PrivacyBadge';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── DOCX XML Parser ──────────────────────────────────────────────

/** Parse DOCX XML into faithful HTML preserving formatting */
async function parseDocxToHtml(arrayBuffer: ArrayBuffer): Promise<{
  html: string;
  warnings: string[];
}> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const warnings: string[] = [];

  // Parse document XML
  const docXml = await zip.file('word/document.xml')?.async('text');
  if (!docXml) throw new Error('Invalid DOCX: missing word/document.xml');

  // Parse styles XML (optional)
  const stylesXml = await zip.file('word/styles.xml')?.async('text');

  // Parse numbering XML (optional, for lists)
  const numberingXml = await zip.file('word/numbering.xml')?.async('text');

  // Extract images as base64
  const imageMap = new Map<string, string>();
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('text');
  const relsDoc = relsXml ? new DOMParser().parseFromString(relsXml, 'text/xml') : null;

  if (relsDoc) {
    const rels = relsDoc.getElementsByTagName('Relationship');
    for (let i = 0; i < rels.length; i++) {
      const rel = rels[i];
      const id = rel.getAttribute('Id') || '';
      const target = rel.getAttribute('Target') || '';
      const type = rel.getAttribute('Type') || '';

      if (type.includes('/image')) {
        const imgPath = target.startsWith('/') ? target.slice(1) : `word/${target}`;
        const imgFile = zip.file(imgPath);
        if (imgFile) {
          try {
            const imgData = await imgFile.async('base64');
            const ext = target.split('.').pop()?.toLowerCase() || 'png';
            const mime =
              ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : ext === 'png'
                  ? 'image/png'
                  : ext === 'gif'
                    ? 'image/gif'
                    : ext === 'svg'
                      ? 'image/svg+xml'
                      : `image/${ext}`;
            imageMap.set(id, `data:${mime};base64,${imgData}`);
          } catch {
            warnings.push(`Could not extract image: ${target}`);
          }
        }
      }
    }
  }

  // Parse styles into a lookup
  const styleMap = new Map<
    string,
    {
      fontFamily?: string;
      fontSize?: string;
      bold?: boolean;
      italic?: boolean;
      color?: string;
      underline?: boolean;
      alignment?: string;
      spaceBefore?: string;
      spaceAfter?: string;
      lineSpacing?: string;
      indentLeft?: string;
      indentRight?: string;
      indentFirstLine?: string;
      isHeading?: boolean;
      headingLevel?: number;
    }
  >();

  // Default document font/size
  let defaultFont = 'Calibri';
  let defaultSize = '11pt';

  if (stylesXml) {
    const stylesDoc = new DOMParser().parseFromString(stylesXml, 'text/xml');

    // Get document defaults
    const docDefaults = stylesDoc.getElementsByTagName('w:docDefaults')[0];
    if (docDefaults) {
      const rPrDefault = docDefaults.getElementsByTagName('w:rPrDefault')[0];
      if (rPrDefault) {
        const rPr = rPrDefault.getElementsByTagName('w:rPr')[0];
        if (rPr) {
          const szEl = rPr.getElementsByTagName('w:sz')[0];
          if (szEl) {
            const halfPts = parseInt(szEl.getAttribute('w:val') || '22', 10);
            defaultSize = `${halfPts / 2}pt`;
          }
          const fontEl = rPr.getElementsByTagName('w:rFonts')[0];
          if (fontEl) {
            defaultFont =
              fontEl.getAttribute('w:ascii') ||
              fontEl.getAttribute('w:hAnsi') ||
              fontEl.getAttribute('w:cs') ||
              'Calibri';
          }
        }
      }
    }

    // Parse each style definition
    const styleEls = stylesDoc.getElementsByTagName('w:style');
    for (let i = 0; i < styleEls.length; i++) {
      const styleEl = styleEls[i];
      const styleId = styleEl.getAttribute('w:styleId') || '';
      const styleType = styleEl.getAttribute('w:type') || '';
      const style: (typeof styleMap extends Map<string, infer V> ? V : never) = {};

      // Check if heading
      const nameEl = styleEl.getElementsByTagName('w:name')[0];
      const name = nameEl?.getAttribute('w:val') || '';
      if (name.toLowerCase().startsWith('heading')) {
        style.isHeading = true;
        const level = parseInt(name.replace(/\D/g, ''), 10);
        if (level >= 1 && level <= 6) style.headingLevel = level;
      }

      // Run properties (font, size, bold, italic, color)
      const rPr = styleEl.getElementsByTagName('w:rPr')[0];
      if (rPr) {
        const fontEl = rPr.getElementsByTagName('w:rFonts')[0];
        if (fontEl) {
          style.fontFamily =
            fontEl.getAttribute('w:ascii') ||
            fontEl.getAttribute('w:hAnsi') ||
            fontEl.getAttribute('w:cs') ||
            undefined;
        }
        const szEl = rPr.getElementsByTagName('w:sz')[0];
        if (szEl) {
          const halfPts = parseInt(szEl.getAttribute('w:val') || '0', 10);
          if (halfPts > 0) style.fontSize = `${halfPts / 2}pt`;
        }
        if (rPr.getElementsByTagName('w:b').length > 0) style.bold = true;
        if (rPr.getElementsByTagName('w:i').length > 0) style.italic = true;
        if (rPr.getElementsByTagName('w:u').length > 0) style.underline = true;
        const colorEl = rPr.getElementsByTagName('w:color')[0];
        if (colorEl) {
          const val = colorEl.getAttribute('w:val');
          if (val && val !== 'auto') style.color = `#${val}`;
        }
      }

      // Paragraph properties
      const pPr = styleEl.getElementsByTagName('w:pPr')[0];
      if (pPr) {
        const jcEl = pPr.getElementsByTagName('w:jc')[0];
        if (jcEl) style.alignment = jcEl.getAttribute('w:val') || undefined;

        const spacingEl = pPr.getElementsByTagName('w:spacing')[0];
        if (spacingEl) {
          const before = spacingEl.getAttribute('w:before');
          if (before) style.spaceBefore = `${parseInt(before, 10) / 20}pt`;
          const after = spacingEl.getAttribute('w:after');
          if (after) style.spaceAfter = `${parseInt(after, 10) / 20}pt`;
          const line = spacingEl.getAttribute('w:line');
          if (line) {
            const lineVal = parseInt(line, 10);
            // line value in 240ths of a line (240 = single, 480 = double)
            style.lineSpacing = `${lineVal / 240}`;
          }
        }

        const indEl = pPr.getElementsByTagName('w:ind')[0];
        if (indEl) {
          const left = indEl.getAttribute('w:left') || indEl.getAttribute('w:start');
          if (left) style.indentLeft = `${parseInt(left, 10) / 20}pt`;
          const right = indEl.getAttribute('w:right') || indEl.getAttribute('w:end');
          if (right) style.indentRight = `${parseInt(right, 10) / 20}pt`;
          const firstLine = indEl.getAttribute('w:firstLine');
          if (firstLine) style.indentFirstLine = `${parseInt(firstLine, 10) / 20}pt`;
        }
      }

      if (styleType === 'paragraph' || styleType === 'character') {
        styleMap.set(styleId, style);
      }
    }
  }

  // Parse numbering definitions for list formatting
  const numFmtMap = new Map<string, Map<number, { fmt: string; text: string }>>();
  const numIdMap = new Map<string, string>();
  if (numberingXml) {
    const numDoc = new DOMParser().parseFromString(numberingXml, 'text/xml');
    const abstractNums = numDoc.getElementsByTagName('w:abstractNum');
    for (let i = 0; i < abstractNums.length; i++) {
      const an = abstractNums[i];
      const abstractNumId = an.getAttribute('w:abstractNumId') || '';
      const levels = new Map<number, { fmt: string; text: string }>();
      const lvls = an.getElementsByTagName('w:lvl');
      for (let j = 0; j < lvls.length; j++) {
        const lvl = lvls[j];
        const ilvl = parseInt(lvl.getAttribute('w:ilvl') || '0', 10);
        const numFmt =
          lvl.getElementsByTagName('w:numFmt')[0]?.getAttribute('w:val') || 'decimal';
        const lvlText =
          lvl.getElementsByTagName('w:lvlText')[0]?.getAttribute('w:val') || '%1.';
        levels.set(ilvl, { fmt: numFmt, text: lvlText });
      }
      numFmtMap.set(abstractNumId, levels);
    }

    // Map numId → abstractNumId
    const nums = numDoc.getElementsByTagName('w:num');
    for (let i = 0; i < nums.length; i++) {
      const numEl = nums[i];
      const numId = numEl.getAttribute('w:numId') || '';
      const absIdEl = numEl.getElementsByTagName('w:abstractNumId')[0];
      const absId = absIdEl?.getAttribute('w:val') || '';
      if (numId && absId) numIdMap.set(numId, absId);
    }
  }

  // ── Parse document body ────────────────────────────────────────

  const docDoc = new DOMParser().parseFromString(docXml, 'text/xml');
  const body = docDoc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('Invalid DOCX: missing w:body');

  // Get page margins from section properties
  let marginTop = '72pt'; // 1 inch default
  let marginBottom = '72pt';
  let marginLeft = '72pt';
  let marginRight = '72pt';
  const sectPr = body.getElementsByTagName('w:sectPr')[0];
  if (sectPr) {
    const pgMar = sectPr.getElementsByTagName('w:pgMar')[0];
    if (pgMar) {
      const t = pgMar.getAttribute('w:top');
      const b = pgMar.getAttribute('w:bottom');
      const l = pgMar.getAttribute('w:left');
      const r = pgMar.getAttribute('w:right');
      if (t) marginTop = `${parseInt(t, 10) / 20}pt`;
      if (b) marginBottom = `${parseInt(b, 10) / 20}pt`;
      if (l) marginLeft = `${parseInt(l, 10) / 20}pt`;
      if (r) marginRight = `${parseInt(r, 10) / 20}pt`;
    }
  }

  /** Convert a w:rPr element to inline CSS */
  function runPropsToStyle(
    rPr: Element | null,
    parentStyleId?: string
  ): string {
    const parts: string[] = [];
    const parentStyle = parentStyleId ? styleMap.get(parentStyleId) : undefined;

    let fontFamily = parentStyle?.fontFamily || defaultFont;
    let fontSize = parentStyle?.fontSize || defaultSize;
    let bold = parentStyle?.bold || false;
    let italic = parentStyle?.italic || false;
    let underline = parentStyle?.underline || false;
    let color = parentStyle?.color || '';

    if (rPr) {
      const fontEl = rPr.getElementsByTagName('w:rFonts')[0];
      if (fontEl) {
        fontFamily =
          fontEl.getAttribute('w:ascii') ||
          fontEl.getAttribute('w:hAnsi') ||
          fontEl.getAttribute('w:cs') ||
          fontFamily;
      }
      const szEl = rPr.getElementsByTagName('w:sz')[0];
      if (szEl) {
        const halfPts = parseInt(szEl.getAttribute('w:val') || '0', 10);
        if (halfPts > 0) fontSize = `${halfPts / 2}pt`;
      }
      const bEl = rPr.getElementsByTagName('w:b')[0];
      if (bEl) {
        const val = bEl.getAttribute('w:val');
        bold = val !== '0' && val !== 'false';
      }
      const iEl = rPr.getElementsByTagName('w:i')[0];
      if (iEl) {
        const val = iEl.getAttribute('w:val');
        italic = val !== '0' && val !== 'false';
      }
      const uEl = rPr.getElementsByTagName('w:u')[0];
      if (uEl) {
        const val = uEl.getAttribute('w:val');
        underline = val !== 'none' && val !== undefined;
      }
      const colorEl = rPr.getElementsByTagName('w:color')[0];
      if (colorEl) {
        const val = colorEl.getAttribute('w:val');
        if (val && val !== 'auto') color = `#${val}`;
      }
    }

    // Safe font family (add fallback)
    const safeFontFamily = `'${fontFamily}', '${defaultFont}', sans-serif`;
    parts.push(`font-family:${safeFontFamily}`);
    parts.push(`font-size:${fontSize}`);
    if (bold) parts.push('font-weight:bold');
    if (italic) parts.push('font-style:italic');
    if (underline) parts.push('text-decoration:underline');
    if (color) parts.push(`color:${color}`);

    return parts.join(';');
  }

  /** Convert a w:pPr element to CSS style for a paragraph */
  function paraPropsToStyle(pPr: Element | null, styleId?: string): string {
    const parts: string[] = [];
    const parentStyle = styleId ? styleMap.get(styleId) : undefined;

    // Alignment
    let alignment = parentStyle?.alignment || '';
    let spaceBefore = parentStyle?.spaceBefore || '0pt';
    let spaceAfter = parentStyle?.spaceAfter || '8pt';
    let lineSpacing = parentStyle?.lineSpacing || '1.15';
    let indentLeft = parentStyle?.indentLeft || '0pt';
    let indentRight = parentStyle?.indentRight || '0pt';
    let indentFirstLine = parentStyle?.indentFirstLine || '0pt';

    if (pPr) {
      const jcEl = pPr.getElementsByTagName('w:jc')[0];
      if (jcEl) alignment = jcEl.getAttribute('w:val') || alignment;

      const spacingEl = pPr.getElementsByTagName('w:spacing')[0];
      if (spacingEl) {
        const before = spacingEl.getAttribute('w:before');
        if (before) spaceBefore = `${parseInt(before, 10) / 20}pt`;
        const after = spacingEl.getAttribute('w:after');
        if (after) spaceAfter = `${parseInt(after, 10) / 20}pt`;
        const line = spacingEl.getAttribute('w:line');
        if (line) {
          const lineVal = parseInt(line, 10);
          lineSpacing = `${lineVal / 240}`;
        }
      }

      const indEl = pPr.getElementsByTagName('w:ind')[0];
      if (indEl) {
        const left = indEl.getAttribute('w:left') || indEl.getAttribute('w:start');
        if (left) indentLeft = `${parseInt(left, 10) / 20}pt`;
        const right = indEl.getAttribute('w:right') || indEl.getAttribute('w:end');
        if (right) indentRight = `${parseInt(right, 10) / 20}pt`;
        const fl = indEl.getAttribute('w:firstLine');
        if (fl) indentFirstLine = `${parseInt(fl, 10) / 20}pt`;
        const hanging = indEl.getAttribute('w:hanging');
        if (hanging) {
          const hangPt = parseInt(hanging, 10) / 20;
          indentFirstLine = `-${hangPt}pt`;
          // Add the hanging value to left indent
          const leftVal = parseFloat(indentLeft);
          indentLeft = `${leftVal + hangPt}pt`;
        }
      }
    }

    // Map alignment
    if (alignment === 'center') parts.push('text-align:center');
    else if (alignment === 'right' || alignment === 'end') parts.push('text-align:right');
    else if (alignment === 'both' || alignment === 'distribute') parts.push('text-align:justify');
    else parts.push('text-align:left');

    parts.push(`margin-top:${spaceBefore}`);
    parts.push(`margin-bottom:${spaceAfter}`);
    parts.push(`line-height:${lineSpacing}`);
    parts.push(`margin-left:${indentLeft}`);
    parts.push(`margin-right:${indentRight}`);
    if (indentFirstLine !== '0pt') parts.push(`text-indent:${indentFirstLine}`);

    return parts.join(';');
  }

  /** Convert number to Roman numerals */
  function toRoman(n: number): string {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
      while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
    }
    return result;
  }

  // Track numbered list counters: numId → array of counts per level
  const listCounters = new Map<string, number[]>();

  /** Process a paragraph element */
  function processParagraph(pEl: Element): string {
    const pPr = pEl.getElementsByTagName('w:pPr')[0];
    let styleId = '';
    if (pPr) {
      const pStyleEl = pPr.getElementsByTagName('w:pStyle')[0];
      styleId = pStyleEl?.getAttribute('w:val') || '';
    }

    const parentStyle = styleId ? styleMap.get(styleId) : undefined;

    // Detect list numbering
    let listPrefix = '';
    let listIndentStyle = '';
    if (pPr) {
      const numPr = pPr.getElementsByTagName('w:numPr')[0];
      if (numPr) {
        const ilvlEl = numPr.getElementsByTagName('w:ilvl')[0];
        const numIdEl = numPr.getElementsByTagName('w:numId')[0];
        const ilvl = parseInt(ilvlEl?.getAttribute('w:val') || '0', 10);
        const numIdVal = numIdEl?.getAttribute('w:val') || '';

        if (numIdVal && numIdVal !== '0') {
          const abstractId = numIdMap.get(numIdVal) || '';
          const levels = numFmtMap.get(abstractId);
          const levelInfo = levels?.get(ilvl);
          listIndentStyle = `padding-left:${(ilvl + 1) * 24}pt;`;

          if (levelInfo && levelInfo.fmt === 'bullet') {
            const bullets = ['\u2022', '\u25E6', '\u25AA', '\u2022', '\u25E6', '\u25AA'];
            listPrefix = `<span style="display:inline-block;width:18pt;text-align:center">${bullets[ilvl % bullets.length]}</span>`;
          } else {
            // Numbered list
            if (!listCounters.has(numIdVal)) listCounters.set(numIdVal, []);
            const counters = listCounters.get(numIdVal)!;
            while (counters.length <= ilvl) counters.push(0);
            counters[ilvl] = (counters[ilvl] || 0) + 1;
            for (let l = ilvl + 1; l < counters.length; l++) counters[l] = 0;
            const num = counters[ilvl];
            let marker: string;
            const fmt = levelInfo?.fmt || 'decimal';
            if (fmt === 'lowerLetter') marker = String.fromCharCode(96 + ((num - 1) % 26) + 1) + '.';
            else if (fmt === 'upperLetter') marker = String.fromCharCode(64 + ((num - 1) % 26) + 1) + '.';
            else if (fmt === 'lowerRoman') marker = toRoman(num).toLowerCase() + '.';
            else if (fmt === 'upperRoman') marker = toRoman(num) + '.';
            else marker = num + '.';
            listPrefix = `<span style="display:inline-block;min-width:18pt;text-align:right;margin-right:6pt">${marker}</span>`;
          }
        }
      }
    }

    const paraStyle = paraPropsToStyle(pPr, styleId);

    // Check if this is a heading
    const isHeading = parentStyle?.isHeading;
    const headingLevel = parentStyle?.headingLevel || 0;
    const tag =
      isHeading && headingLevel >= 1 && headingLevel <= 6
        ? `h${headingLevel}`
        : 'p';

    // Process runs within the paragraph
    let runsHtml = '';
    const children = pEl.childNodes;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as Element;
      if (!child.tagName) continue;

      const localName = child.tagName.replace(/^w:/, '');

      if (localName === 'r') {
        // Text run
        const rPr = child.getElementsByTagName('w:rPr')[0];
        const runStyle = runPropsToStyle(rPr, styleId);

        // Get text content
        const tEls = child.getElementsByTagName('w:t');
        let text = '';
        for (let j = 0; j < tEls.length; j++) {
          text += tEls[j].textContent || '';
        }

        // Check for breaks
        const brEls = child.getElementsByTagName('w:br');
        let breakHtml = '';
        for (let j = 0; j < brEls.length; j++) {
          const brType = brEls[j].getAttribute('w:type');
          if (brType === 'page') {
            breakHtml += '<div style="page-break-before:always"></div>';
          } else {
            breakHtml += '<br/>';
          }
        }

        // Check for tabs
        const tabEls = child.getElementsByTagName('w:tab');
        if (tabEls.length > 0) {
          text = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' + text;
        }

        // Check for images
        const drawingEls = child.getElementsByTagName('w:drawing');
        for (let j = 0; j < drawingEls.length; j++) {
          const drawing = drawingEls[j];
          // Get relationship ID for the image
          const blipEls = drawing.getElementsByTagName('a:blip');
          for (let k = 0; k < blipEls.length; k++) {
            const embed = blipEls[k].getAttribute('r:embed');
            if (embed && imageMap.has(embed)) {
              // Get image dimensions from extent
              const extEls = drawing.getElementsByTagName('wp:extent');
              let imgStyle = 'max-width:100%;height:auto';
              if (extEls.length > 0) {
                const cx = parseInt(extEls[0].getAttribute('cx') || '0', 10);
                const cy = parseInt(extEls[0].getAttribute('cy') || '0', 10);
                if (cx > 0 && cy > 0) {
                  // EMU to px (914400 EMU = 1 inch, 96 DPI)
                  const widthPx = Math.round((cx / 914400) * 96);
                  const heightPx = Math.round((cy / 914400) * 96);
                  imgStyle = `width:${widthPx}px;height:${heightPx}px;max-width:100%`;
                }
              }
              runsHtml += `<img src="${imageMap.get(embed)}" style="${imgStyle}" />`;
            }
          }
        }

        if (text) {
          // Escape HTML entities
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          runsHtml += `<span style="${runStyle}">${escaped}</span>`;
        }
        runsHtml += breakHtml;
      } else if (localName === 'hyperlink') {
        // Hyperlink
        const runs = child.getElementsByTagName('w:r');
        let linkText = '';
        for (let j = 0; j < runs.length; j++) {
          const tEls = runs[j].getElementsByTagName('w:t');
          for (let k = 0; k < tEls.length; k++) {
            linkText += tEls[k].textContent || '';
          }
        }
        const rId = child.getAttribute('r:id') || '';
        // Get URL from rels (if available)
        let href = '#';
        if (relsDoc && rId) {
          const relEls = relsDoc.getElementsByTagName('Relationship');
          for (let j = 0; j < relEls.length; j++) {
            if (relEls[j].getAttribute('Id') === rId) {
              href = relEls[j].getAttribute('Target') || '#';
              break;
            }
          }
        }
        const escaped = linkText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        runsHtml += `<a href="${href}" style="color:#0563C1;text-decoration:underline">${escaped}</a>`;
      }
    }

    // Empty paragraph = just spacing
    if (!runsHtml.trim()) {
      runsHtml = '&nbsp;';
    }

    return `<${tag} style="${paraStyle}${listIndentStyle}">${listPrefix}${runsHtml}</${tag}>`;
  }

  /** Process a table element */
  function processTable(tblEl: Element): string {
    let tableHtml = '<table style="border-collapse:collapse;width:100%;margin:8pt 0">';

    // Get table grid for column widths
    const gridCols = tblEl.getElementsByTagName('w:gridCol');
    const colWidths: number[] = [];
    let totalWidth = 0;
    for (let i = 0; i < gridCols.length; i++) {
      const w = parseInt(gridCols[i].getAttribute('w:w') || '0', 10);
      colWidths.push(w);
      totalWidth += w;
    }

    // Check table-level borders
    const tblPr = tblEl.getElementsByTagName('w:tblPr')[0];
    let tableBorderStyle = 'border:1px solid #a6a6a6';
    if (tblPr) {
      const borders = tblPr.getElementsByTagName('w:tblBorders')[0];
      if (borders) {
        // Check if borders are "none"
        const top = borders.getElementsByTagName('w:top')[0];
        if (top && top.getAttribute('w:val') === 'none') {
          tableBorderStyle = 'border:none';
        }
      }
    }

    const rows = tblEl.getElementsByTagName('w:tr');
    for (let r = 0; r < rows.length; r++) {
      // Only process direct child rows (not nested table rows)
      if (rows[r].parentElement !== tblEl) continue;

      tableHtml += '<tr>';
      const cells = rows[r].getElementsByTagName('w:tc');
      for (let c = 0; c < cells.length; c++) {
        if (cells[c].parentElement !== rows[r]) continue;

        const tcPr = cells[c].getElementsByTagName('w:tcPr')[0];
        let cellStyle = `${tableBorderStyle};padding:4pt 6pt;vertical-align:top`;

        // Cell width
        if (tcPr) {
          const tcW = tcPr.getElementsByTagName('w:tcW')[0];
          if (tcW) {
            const w = parseInt(tcW.getAttribute('w:w') || '0', 10);
            const type = tcW.getAttribute('w:type');
            if (type === 'pct') {
              cellStyle += `;width:${(w / 50)}%`; // w:type="pct" uses 50ths of percent
            } else if (w > 0 && totalWidth > 0) {
              cellStyle += `;width:${((w / totalWidth) * 100).toFixed(1)}%`;
            }
          }

          // Cell shading
          const shd = tcPr.getElementsByTagName('w:shd')[0];
          if (shd) {
            const fill = shd.getAttribute('w:fill');
            if (fill && fill !== 'auto' && fill !== 'FFFFFF') {
              cellStyle += `;background-color:#${fill}`;
            }
          }

          // Cell borders
          const tcBorders = tcPr.getElementsByTagName('w:tcBorders')[0];
          if (tcBorders) {
            const sides = ['top', 'bottom', 'left', 'right'] as const;
            for (const side of sides) {
              const borderEl = tcBorders.getElementsByTagName(`w:${side}`)[0];
              if (borderEl) {
                const val = borderEl.getAttribute('w:val');
                if (val === 'none' || val === 'nil') {
                  cellStyle += `;border-${side}:none`;
                } else {
                  const sz = parseInt(borderEl.getAttribute('w:sz') || '4', 10);
                  const color = borderEl.getAttribute('w:color') || 'auto';
                  const borderColor = color === 'auto' ? '#000' : `#${color}`;
                  cellStyle += `;border-${side}:${sz / 8}pt solid ${borderColor}`;
                }
              }
            }
          }

          // Column span
          const gridSpan = tcPr.getElementsByTagName('w:gridSpan')[0];
          if (gridSpan) {
            const span = parseInt(gridSpan.getAttribute('w:val') || '1', 10);
            if (span > 1) {
              cellStyle += `" colspan="${span}`;
            }
          }

          // Vertical merge
          const vMerge = tcPr.getElementsByTagName('w:vMerge')[0];
          if (vMerge && !vMerge.getAttribute('w:val')) {
            // This is a continuation cell, skip it (Word hides these)
            continue;
          }
        }

        // Process paragraphs inside the cell
        let cellContent = '';
        const cellChildren = cells[c].childNodes;
        for (let p = 0; p < cellChildren.length; p++) {
          const cellChild = cellChildren[p] as Element;
          if (!cellChild.tagName) continue;
          const localName = cellChild.tagName.replace(/^w:/, '');
          if (localName === 'p') {
            cellContent += processParagraph(cellChild);
          } else if (localName === 'tbl') {
            cellContent += processTable(cellChild);
          }
        }

        tableHtml += `<td style="${cellStyle}">${cellContent || '&nbsp;'}</td>`;
      }
      tableHtml += '</tr>';
    }

    tableHtml += '</table>';
    return tableHtml;
  }

  // ── Build the HTML ──────────────────────────────────────────────

  let htmlParts: string[] = [];
  const bodyChildren = body.childNodes;

  for (let i = 0; i < bodyChildren.length; i++) {
    const child = bodyChildren[i] as Element;
    if (!child.tagName) continue;
    const localName = child.tagName.replace(/^w:/, '');

    if (localName === 'p') {
      htmlParts.push(processParagraph(child));
    } else if (localName === 'tbl') {
      htmlParts.push(processTable(child));
    }
  }

  // Wrap in a container with document-level styling
  const html = `<div style="
    font-family:'${defaultFont}',sans-serif;
    font-size:${defaultSize};
    color:#000;
    line-height:1.15;
    padding:${marginTop} ${marginRight} ${marginBottom} ${marginLeft};
    box-sizing:border-box;
    -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility;
  ">${htmlParts.join('\n')}</div>`;

  return { html, warnings };
}

// ── Main Component ───────────────────────────────────────────────

export default function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError('');
    setWarnings([]);
    setHtmlContent('');
    setProcessing(true);

    try {
      const arrayBuffer = await f.arrayBuffer();
      const result = await parseDocxToHtml(arrayBuffer);
      setFile(f);
      setHtmlContent(result.html);
      if (result.warnings.length > 0) {
        setWarnings(result.warnings.slice(0, 5));
      }
    } catch (e) {
      setError(
        'Could not read this file — ' +
          (e instanceof Error ? e.message : 'make sure it is a .docx file (not .doc).')
      );
    }
    setProcessing(false);
  }, []);

  const convertToPdf = useCallback(() => {
    if (!htmlContent || !file) return;
    setError('');

    const docName = file.name.replace(/\.docx?$/i, '').replace(/[<>&"']/g, '');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Pop-up blocked — please allow pop-ups for this site to save as PDF.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html><html>
<head><title>${docName}</title>
<style>
  @page { size: A4; margin: 0; }
  @media print { body { margin: 0; padding: 0; } }
  body {
    margin: 0; padding: 0; background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img { max-width: 100%; height: auto; }
  a { color: #0563C1; text-decoration: underline; }
  h1, h2, h3, h4, h5, h6 { margin-top: 12pt; margin-bottom: 4pt; }
  table { page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
</style>
</head><body>${htmlContent}</body></html>`);
    printWindow.document.close();

    const triggerPrint = () => {
      try { printWindow.print(); } catch {}
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 200);
    } else {
      printWindow.addEventListener('load', () => setTimeout(triggerPrint, 200));
      setTimeout(triggerPrint, 2000);
    }
  }, [htmlContent, file]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <PrivacyBadge />
        <FileDropZone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          acceptLabel="Supports: DOCX files (Word 2007+)"
          onFiles={handleFiles}
        />

        {file && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText size={20} className="text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
              </div>
            </div>

            <button
              onClick={convertToPdf}
              disabled={!htmlContent}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg transition-colors duration-150"
            >
              <Download size={16} aria-hidden="true" />
              Save as PDF
            </button>

            {warnings.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                <p className="font-medium mb-1">Notes:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-neutral-400">
              Opens your browser's print dialog — select "Save as PDF" for
              pixel-perfect output with fonts, images, tables, and lists preserved.
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
            <span className="text-sm text-primary-700">Reading Word document...</span>
          </div>
        )}

        {htmlContent ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">Document Preview</p>
            <div
              ref={previewRef}
              className="bg-white rounded-2xl border border-neutral-200/80 shadow-card min-h-[400px] max-h-[700px] overflow-auto"
              style={{ padding: 0 }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        ) : (
          !processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-neutral-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-500">
                Upload a Word document (.docx) to convert it to PDF
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Preview appears here, then download as PDF
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

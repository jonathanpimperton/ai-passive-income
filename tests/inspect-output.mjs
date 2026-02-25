/**
 * Inspect the actual output files from the visual test:
 * 1. Open the generated DOCX and extract all text to verify structure
 * 2. Open the generated PDF and extract text to verify content
 *
 * Run: node tests/inspect-output.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, 'visual-output');

async function inspectDocx() {
  console.log('\n=== Inspecting DOCX Output (pdf-to-word-output.docx) ===\n');

  const mammoth = await import('mammoth');
  const buffer = readFileSync(join(OUTPUT, 'pdf-to-word-output.docx'));

  // Extract raw text
  const textResult = await mammoth.extractRawText({ buffer });
  const text = textResult.value;
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  console.log(`Total text lines: ${lines.length}`);
  console.log('\n--- Full text content ---\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const truncated = line.length > 120 ? line.slice(0, 120) + '...' : line;
    console.log(`  ${String(i + 1).padStart(3)}: ${truncated}`);
  }

  // Structural checks
  console.log('\n--- Structure Verification ---\n');
  const checks = [
    ['CONFIDENTIAL on its own line', lines.some(l => l.trim() === 'CONFIDENTIAL')],
    ['Title on its own line', lines.some(l => l.includes('Quarterly Financial Report') && !l.includes('CONFIDENTIAL'))],
    ['Date separate', lines.some(l => l.includes('January 15, 2025') && l.length < 50)],
    ['Company separate', lines.some(l => l.includes('Acme Technologies') && !l.includes('achieved'))],
    ['Executive Summary heading', lines.some(l => l.trim() === '1. Executive Summary')],
    ['Revenue Breakdown heading', lines.some(l => l.includes('Revenue Breakdown'))],
    ['KPI heading', lines.some(l => l.includes('Key Performance'))],
    ['Geographic heading', lines.some(l => l.includes('Geographic'))],
    ['Body paragraphs are merged (not one-line-per-PDF-line)', lines.some(l => l.includes('achieved') && l.length > 80)],
    ['Label-value data preserved (ARR line)', lines.some(l => l.includes('ARR'))],
    ['No heading mashed into body text', !lines.some(l => l.includes('achieved') && l.includes('Executive Summary'))],
  ];

  for (const [label, passed] of checks) {
    console.log(`  ${passed ? '✓' : '✗'} ${label}`);
  }

  // Also extract as HTML to check formatting
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value;
  const hasH1 = html.includes('<h1');
  const hasH2 = html.includes('<h2');
  const hasBold = html.includes('<strong');
  const hasTable = html.includes('<table');
  console.log(`\n  HTML formatting: H1=${hasH1}, H2=${hasH2}, Bold=${hasBold}, Table=${hasTable}`);
}

async function inspectPdf() {
  console.log('\n\n=== Inspecting PDF Output (word-to-pdf-output.pdf) ===\n');

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const buffer = readFileSync(join(OUTPUT, 'word-to-pdf-output.pdf'));
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  console.log(`Total pages: ${doc.numPages}`);

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    console.log(`\n  Page ${i}: ${Math.round(viewport.width)}×${Math.round(viewport.height)}`);

    const textContent = await page.getTextContent();
    const textItems = textContent.items.filter(item => 'str' in item && item.str.trim());

    if (textItems.length === 0) {
      console.log('  *** NO TEXT FOUND — page may be image-only (html2canvas output) ***');

      // Check for images on the page (this is expected for html2canvas PDF output)
      const ops = await page.getOperatorList();
      const imageOps = ops.fnArray.filter(
        fn => fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject
      );
      console.log(`  Images on page: ${imageOps.length}`);
      if (imageOps.length > 0) {
        console.log('  (Page rendered as image — this is expected for Word-to-PDF html2canvas approach)');
      }
    } else {
      console.log(`  Text items: ${textItems.length}`);
      for (const item of textItems.slice(0, 20)) {
        console.log(`    "${item.str}"`);
      }
      if (textItems.length > 20) {
        console.log(`    ... and ${textItems.length - 20} more`);
      }
    }
  }
}

async function main() {
  try {
    await inspectDocx();
  } catch (e) {
    console.error('DOCX inspection failed:', e.message);
  }

  try {
    await inspectPdf();
  } catch (e) {
    console.error('PDF inspection failed:', e.message);
  }

  console.log('\n=== Inspection complete ===');
}

main().catch(console.error);

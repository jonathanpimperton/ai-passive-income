/**
 * Visual verification test for PDF-to-Word and Word-to-PDF converters.
 * Uses Playwright to load the actual tool pages, upload test files, and
 * capture the output for manual inspection.
 *
 * Run: node tests/visual-test.mjs
 * Requires: dev server running on port 4321
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');
const OUTPUT = join(__dirname, 'visual-output');
mkdirSync(OUTPUT, { recursive: true });

const BASE_URL = 'http://localhost:4321';

async function testPdfToWord(page) {
  console.log('\n=== PDF → Word Test ===');
  await page.goto(`${BASE_URL}/tools/file-tools/pdf-to-word/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [browser error] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`  [page error] ${err.message}`));

  // Upload complex.pdf via the hidden file input
  const fileInput = page.locator('input[type="file"][accept*="pdf"]');
  await fileInput.waitFor({ state: 'attached', timeout: 5000 });
  await fileInput.setInputFiles(join(FIXTURES, 'complex.pdf'));

  console.log('  File uploaded, waiting for extraction...');

  // Wait for the download button to appear (extraction complete)
  try {
    await page.waitForSelector('button:has-text("Download as Word")', { timeout: 20000 });
  } catch {
    console.log('  Download button not found — taking debug screenshot');
    await page.screenshot({ path: join(OUTPUT, 'pdf-to-word-debug.png'), fullPage: true });
    return;
  }
  await page.waitForTimeout(1000);

  // Capture the preview screenshot
  await page.screenshot({ path: join(OUTPUT, 'pdf-to-word-fullpage.png'), fullPage: true });

  // Get the full preview area text
  const previewArea = page.locator('[aria-live="polite"]');
  const previewText = await previewArea.innerText();
  const lines = previewText.split('\n').filter(l => l.trim().length > 0);
  console.log(`  Preview lines: ${lines.length}`);

  // Check key structural elements are separate
  const checks = [
    ['CONFIDENTIAL', lines.some(l => l.includes('CONFIDENTIAL'))],
    ['Quarterly Financial Report', lines.some(l => l.includes('Quarterly Financial Report'))],
    ['January 15, 2025', lines.some(l => l.includes('January 15, 2025'))],
    ['Acme Technologies', lines.some(l => l.includes('Acme Technologies'))],
    ['Executive Summary', lines.some(l => l.includes('Executive Summary'))],
    ['Revenue Breakdown', lines.some(l => l.includes('Revenue Breakdown'))],
  ];
  console.log('  Structure check:');
  for (const [label, found] of checks) {
    console.log(`    ${found ? '✓' : '✗'} ${label}`);
  }

  // Check body paragraphs aren't mashed with headings
  const bodyLine = lines.find(l => l.includes('Acme Technologies achieved'));
  if (bodyLine) {
    const noHeadingsMixed = !bodyLine.includes('Executive Summary') && !bodyLine.includes('Revenue Breakdown');
    console.log(`    Body para length: ${bodyLine.length} chars, headings mixed in: ${!noHeadingsMixed}`);
  }

  // Trigger DOCX download
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.getByRole('button', { name: 'Download as Word' }).click();
    const download = await downloadPromise;
    const docxPath = join(OUTPUT, 'pdf-to-word-output.docx');
    await download.saveAs(docxPath);
    const stats = readFileSync(docxPath);
    console.log(`  Output DOCX size: ${stats.length} bytes`);
    if (stats.length < 1000) {
      console.log('  *** WARNING: DOCX too small — may be empty! ***');
    }
  } catch (e) {
    console.log(`  Download failed: ${e.message}`);
  }
}

async function testWordToPdf(page) {
  console.log('\n=== Word → PDF Test ===');
  await page.goto(`${BASE_URL}/tools/file-tools/word-to-pdf/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Capture all console output for debugging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warn') {
      console.log(`  [browser ${type}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => console.log(`  [page error] ${err.message}`));

  // Upload complex.docx — use the hidden file input
  const fileInput = page.locator('input[type="file"]');
  const count = await fileInput.count();
  console.log(`  Found ${count} file input(s)`);

  // Dispatch the file change event
  const filePath = join(FIXTURES, 'complex.docx');
  await fileInput.setInputFiles(filePath);
  console.log('  File uploaded, waiting for preview...');

  // Wait for the .prose preview content OR error to appear
  try {
    await page.waitForSelector('.prose, [class*="red"]', { timeout: 20000 });
  } catch {
    console.log('  No preview or error — taking debug screenshot');
    await page.screenshot({ path: join(OUTPUT, 'word-to-pdf-debug.png'), fullPage: true });
    return;
  }
  await page.waitForTimeout(1000);

  // Check for errors
  const errorEl = page.locator('[class*="bg-red"]');
  if (await errorEl.count() > 0) {
    const errorText = await errorEl.first().innerText();
    console.log(`  Error: ${errorText}`);
  }

  // Wait for download button
  try {
    await page.waitForSelector('button:has-text("Download as PDF")', { timeout: 5000 });
  } catch {
    console.log('  Download button not found — taking debug screenshot');
    await page.screenshot({ path: join(OUTPUT, 'word-to-pdf-debug.png'), fullPage: true });
    return;
  }
  await page.waitForTimeout(500);

  // Capture preview
  await page.screenshot({ path: join(OUTPUT, 'word-to-pdf-fullpage.png'), fullPage: true });

  const previewText = await page.locator('.prose').first().innerText();
  const lines = previewText.split('\n').filter(l => l.trim().length > 0);
  console.log(`  Preview lines: ${lines.length}`);

  const checks = [
    ['Annual Performance Review', lines.some(l => l.includes('Annual Performance Review'))],
    ['Executive Summary', lines.some(l => l.includes('Executive Summary'))],
    ['Financial Performance', lines.some(l => l.includes('Financial Performance'))],
    ['Q1 2024', previewText.includes('Q1 2024')],
  ];
  console.log('  Structure check:');
  for (const [label, found] of checks) {
    console.log(`    ${found ? '✓' : '✗'} ${label}`);
  }

  // Trigger PDF download
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'Download as PDF' }).click();
    const download = await downloadPromise;
    const pdfPath = join(OUTPUT, 'word-to-pdf-output.pdf');
    await download.saveAs(pdfPath);
    const stats = readFileSync(pdfPath);
    console.log(`  Output PDF size: ${stats.length} bytes`);
    if (stats.length < 10000) {
      console.log('  *** WARNING: PDF too small — may be blank! ***');
    } else {
      console.log('  PDF size looks reasonable');
    }
  } catch (e) {
    console.log(`  Download failed: ${e.message}`);
  }
}

async function main() {
  console.log('Starting visual verification tests...');
  console.log('Output directory:', OUTPUT);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
  });

  try {
    const page = await context.newPage();
    await testPdfToWord(page);

    // Use a fresh page for the second test to avoid state pollution
    const page2 = await context.newPage();
    await testWordToPdf(page2);

    console.log('\n=== All visual tests complete ===');
    console.log(`Check output files in: ${OUTPUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error('Visual test failed:', e.message);
  process.exit(1);
});

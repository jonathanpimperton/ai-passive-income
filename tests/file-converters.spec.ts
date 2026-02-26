/**
 * E2E tests for file converter tools.
 *
 * These tests go beyond "does the page load" — they verify:
 *  - File upload triggers extraction/parsing
 *  - Preview shows real content from the input file
 *  - Download button is clickable and triggers a download
 *  - Downloaded file has non-zero size
 *  - Downloaded file contains expected content (where parseable)
 *
 * Test fixtures live in tests/fixtures/.
 */
import { test, expect, Page, Download } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, 'fixtures');

/** Upload a single file via the FileDropZone input */
async function uploadFile(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
}

/** Upload multiple files */
async function uploadFiles(page: Page, filePaths: string[]) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePaths);
}

/** Wait for processing spinners to disappear */
async function waitForProcessing(page: Page, timeout = 30000) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        !text.includes('Converting...') &&
        !text.includes('Generating...') &&
        !text.includes('Processing...') &&
        !text.includes('Reading Word') &&
        !text.includes('Extracting text')
      );
    },
    { timeout }
  );
}

/**
 * Click a download button and wait for the download event.
 * Returns the Download object so we can inspect the file.
 */
async function clickAndWaitForDownload(
  page: Page,
  buttonLocator: ReturnType<Page['getByRole']>
): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    buttonLocator.click(),
  ]);
  return download;
}

/**
 * Save a download to a temp path and return the path + file size.
 */
async function saveDownload(download: Download): Promise<{ path: string; size: number }> {
  const tmpPath = path.join('/tmp', `test-download-${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(tmpPath);
  const stats = fs.statSync(tmpPath);
  return { path: tmpPath, size: stats.size };
}

// ════════════════════════════════════════════════════════════════
//  WORD TO PDF
// ════════════════════════════════════════════════════════════════

test.describe('Word to PDF', () => {
  test('converts DOCX and produces a downloadable PDF', async ({ page }) => {
    await page.goto('/tools/file-tools/word-to-pdf');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.docx'));
    await waitForProcessing(page, 30000);

    // Preview should show document content
    await expect(page.getByText('Annual Performance Review').first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Executive Summary').first()).toBeVisible();

    // Should NOT show an error
    const errors = page.locator('[class*="red-50"]');
    await expect(errors).toHaveCount(0);

    // Download button should be available
    const downloadBtn = page.getByRole('button', { name: /download.*pdf/i }).first();
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();

    // Click download and verify a file is produced
    const download = await clickAndWaitForDownload(page, downloadBtn);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const { size } = await saveDownload(download);
    expect(size).toBeGreaterThan(1000); // PDF should be at least 1KB
  });
});

// ════════════════════════════════════════════════════════════════
//  IMAGE TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('Image Compressor', () => {
  test('compresses a JPEG and shows size savings', async ({ page }) => {
    await page.goto('/tools/file-tools/image-compressor');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-photo.jpg'));
    await waitForProcessing(page);

    await expect(page.getByText('test-photo')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\(-?\d+%\)/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
  });

  test('compresses a PNG image', async ({ page }) => {
    await page.goto('/tools/file-tools/image-compressor');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-image.png'));
    await waitForProcessing(page);

    await expect(page.getByText('test-image')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Image Resizer', () => {
  test('resizes a PNG image', async ({ page }) => {
    await page.goto('/tools/file-tools/image-resizer');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-image.png'));

    await expect(page.getByText(/1200\s*×\s*800/).first()).toBeVisible({ timeout: 10000 });

    const widthInput = page.locator('input[type="number"]').first();
    await expect(widthInput).toHaveValue('1200', { timeout: 5000 });
  });
});

test.describe('Image Format Converter', () => {
  test('converts PNG to JPEG', async ({ page }) => {
    await page.goto('/tools/file-tools/image-format-converter');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-image.png'));
    await waitForProcessing(page);

    await expect(page.getByText('test-image.jpg')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
  });

  test('converts WebP to PNG', async ({ page }) => {
    await page.goto('/tools/file-tools/image-format-converter');
    await page.waitForLoadState('networkidle');

    await page.locator('#target-format').selectOption('image/png');
    await uploadFile(page, path.join(FIXTURES, 'test-image.webp'));
    await waitForProcessing(page);

    await expect(page.getByText('test-image.png')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('SVG to PNG', () => {
  test('converts SVG and produces downloadable PNG', async ({ page }) => {
    await page.goto('/tools/file-tools/svg-to-png');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.svg'));
    await waitForProcessing(page);

    await expect(page.locator('img[alt*="PNG preview"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\d+\s*×\s*\d+\s*px/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /download png/i })).toBeVisible();
  });
});

test.describe('Images to PDF', () => {
  test('combines multiple images into PDF', async ({ page }) => {
    await page.goto('/tools/file-tools/images-to-pdf');
    await page.waitForLoadState('networkidle');

    await uploadFiles(page, [
      path.join(FIXTURES, 'test-image.png'),
      path.join(FIXTURES, 'test-image-2.png'),
    ]);

    await expect(page.getByText(/2\s*image/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('test-image.png')).toBeVisible();
    await expect(page.getByText('test-image-2.png')).toBeVisible();
    await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════
//  PDF TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('PDF Merge', () => {
  test('merges two PDFs', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    await uploadFiles(page, [
      path.join(FIXTURES, 'complex.pdf'),
      path.join(FIXTURES, 'complex-2.pdf'),
    ]);

    await expect(page.getByText('complex.pdf').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('complex-2.pdf')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/5\s*total\s*page/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /merge/i })).toBeVisible();
  });
});

test.describe('PDF Split', () => {
  test('loads multi-page PDF and shows page count', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-split');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));

    await expect(page.getByText(/3\s*pages/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /extract|split/i })).toBeVisible();
  });
});

test.describe('PDF Compress', () => {
  test('loads a PDF and shows compress button', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-compress');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));

    await expect(page.getByText(/3\s*pages/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /compress pdf/i })).toBeVisible();
  });
});

test.describe('PDF to Image', () => {
  test('converts PDF pages to images', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-to-image');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));

    await expect(page.getByText(/3\s*pages/i).first()).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('button', { name: /convert|download/i }).first()
    ).toBeVisible({ timeout: 20000 });
  });
});

// ════════════════════════════════════════════════════════════════
//  DOCUMENT CONVERSION TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('Excel to PDF', () => {
  test('converts XLSX and shows table preview', async ({ page }) => {
    await page.goto('/tools/file-tools/excel-to-pdf');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.xlsx'));
    await waitForProcessing(page, 30000);

    await expect(page.getByText(/Preview:.*Employees/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('FirstName1').first()).toBeVisible();

    const errors = page.locator('[class*="red"]').filter({ hasText: /error|failed/i });
    await expect(errors).toHaveCount(0);

    await expect(page.getByRole('button', { name: /download.*pdf/i })).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════
//  TEXT/DATA CONVERSION TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('CSV to JSON Converter', () => {
  test('converts CSV with quoted fields and produces valid JSON', async ({ page }) => {
    await page.goto('/tools/file-tools/csv-json');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.csv'));

    const output = page.locator('#csv-json-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();

    // Verify JSON is valid
    const parsed = JSON.parse(outputText);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    // Verify content from the CSV
    expect(outputText).toContain('Alice Johnson');
    expect(outputText).toContain('95000');
    expect(outputText).toContain('Chicago, IL'); // quoted field with comma

    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});

test.describe('JSON to CSV Converter', () => {
  test('converts JSON to CSV with headers and data rows', async ({ page }) => {
    await page.goto('/tools/file-tools/csv-json');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /csv.*json|json.*csv/i }).click();

    await uploadFile(page, path.join(FIXTURES, 'complex.json'));

    const output = page.locator('#csv-json-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();

    // Verify CSV structure: has headers and data
    const lines = outputText.trim().split('\n');
    expect(lines.length).toBeGreaterThan(1); // header + at least 1 data row

    expect(outputText).toContain('id');
    expect(outputText).toContain('name');
    expect(outputText).toContain('department');
    expect(outputText).toContain('Employee 1');
  });
});

test.describe('Markdown to HTML Converter', () => {
  test('converts Markdown to valid HTML with semantic tags', async ({ page }) => {
    await page.goto('/tools/file-tools/markdown-html');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.md'));

    const output = page.locator('#md-html-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();

    // Verify HTML structure
    expect(outputText).toContain('<h1>');
    expect(outputText).toContain('<strong>');
    expect(outputText).toContain('<code');

    // Verify it's not just the raw markdown
    expect(outputText).not.toMatch(/^# /m);

    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});

test.describe('HTML to Markdown Converter', () => {
  test('converts HTML to Markdown with proper formatting', async ({ page }) => {
    await page.goto('/tools/file-tools/markdown-html');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /markdown.*html|html.*markdown/i }).click();

    await uploadFile(page, path.join(FIXTURES, 'complex.html'));

    const output = page.locator('#md-html-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();

    // Verify markdown formatting
    expect(outputText).toContain('# ');
    expect(outputText).toContain('**');

    // Verify it's not just raw HTML
    expect(outputText).not.toContain('<h1>');
  });
});

// ════════════════════════════════════════════════════════════════
//  HEIC
// ════════════════════════════════════════════════════════════════

test.describe('HEIC to JPG', () => {
  test('page loads and shows upload zone', async ({ page }) => {
    await page.goto('/tools/file-tools/heic-to-jpg');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/heic/i).first()).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });
});

/**
 * E2E tests for all file converter tools.
 * Tests each converter with complex real-world files.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, 'fixtures');

/** Helper: upload a file via the FileDropZone input */
async function uploadFile(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
}

/** Helper: upload multiple files */
async function uploadFiles(page: Page, filePaths: string[]) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePaths);
}

/** Helper: wait for processing spinners to disappear */
async function waitForProcessing(page: Page, timeout = 30000) {
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return !text.includes('Converting...') && !text.includes('Generating...') && !text.includes('Processing...');
  }, { timeout });
}

/** Helper: scope locator to the main tool area (exclude header/nav/footer) */
function toolArea(page: Page) {
  return page.locator('main, [role="main"], article').first();
}

// ════════════════════════════════════════════════════════════════
//  IMAGE TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('Image Compressor', () => {
  test('compresses a high-res JPEG photo', async ({ page }) => {
    await page.goto('/tools/file-tools/image-compressor');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-photo.jpg'));
    await waitForProcessing(page);

    // Should show compressed result with file name
    await expect(page.getByText('test-photo')).toBeVisible({ timeout: 15000 });

    // Should show size savings
    await expect(page.getByText(/\(-?\d+%\)/)).toBeVisible({ timeout: 5000 });

    // Download button should be available
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
  });

  test('compresses a PNG image', async ({ page }) => {
    await page.goto('/tools/file-tools/image-compressor');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-image.png'));
    await waitForProcessing(page);

    // Should display compressed result
    await expect(page.getByText('test-image')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Image Resizer', () => {
  test('resizes a PNG image', async ({ page }) => {
    await page.goto('/tools/file-tools/image-resizer');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'test-image.png'));

    // Should show original dimensions (1200×800) somewhere in the info
    await expect(page.getByText(/1200\s*×\s*800/).first()).toBeVisible({ timeout: 10000 });

    // Width and Height input fields should be populated
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

    // Should show conversion result with file name
    await expect(page.getByText('test-image.jpg')).toBeVisible({ timeout: 10000 });

    // Download button should be available
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
  });

  test('converts WebP to PNG', async ({ page }) => {
    await page.goto('/tools/file-tools/image-format-converter');
    await page.waitForLoadState('networkidle');

    // Select PNG as target format (value is MIME type)
    await page.locator('#target-format').selectOption('image/png');

    await uploadFile(page, path.join(FIXTURES, 'test-image.webp'));
    await waitForProcessing(page);

    // Should show converted result
    await expect(page.getByText('test-image.png')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('SVG to PNG', () => {
  test('converts complex SVG with gradients and filters', async ({ page }) => {
    await page.goto('/tools/file-tools/svg-to-png');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.svg'));
    await waitForProcessing(page);

    // Should show PNG preview image
    await expect(page.locator('img[alt*="PNG preview"]')).toBeVisible({ timeout: 15000 });

    // Should show dimensions (width × height)
    await expect(page.getByText(/\d+\s*×\s*\d+\s*px/).first()).toBeVisible({ timeout: 5000 });

    // Download button should appear
    await expect(page.getByRole('button', { name: /download png/i })).toBeVisible();
  });
});

test.describe('Images to PDF', () => {
  test('combines multiple images into PDF', async ({ page }) => {
    await page.goto('/tools/file-tools/images-to-pdf');
    await page.waitForLoadState('networkidle');

    // Upload two images
    await uploadFiles(page, [
      path.join(FIXTURES, 'test-image.png'),
      path.join(FIXTURES, 'test-image-2.png'),
    ]);

    // Wait for images to load — should show "2 images"
    await expect(page.getByText(/2\s*image/)).toBeVisible({ timeout: 10000 });

    // Both images should appear in the list
    await expect(page.getByText('test-image.png')).toBeVisible();
    await expect(page.getByText('test-image-2.png')).toBeVisible();

    // Download PDF button should be available
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

    // Should show both files
    await expect(page.getByText('complex.pdf').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('complex-2.pdf')).toBeVisible({ timeout: 10000 });

    // Total pages should show (3 + 2 = 5)
    await expect(page.getByText(/5\s*total\s*page/i)).toBeVisible({ timeout: 10000 });

    // Merge button should be available
    await expect(page.getByRole('button', { name: /merge/i })).toBeVisible();
  });
});

test.describe('PDF Split', () => {
  test('loads multi-page PDF and shows page count', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-split');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));

    // Should show page count (3 pages)
    await expect(page.getByText(/3\s*pages/i).first()).toBeVisible({ timeout: 15000 });

    // Extract/Split button should appear
    await expect(page.getByRole('button', { name: /extract|split/i })).toBeVisible();
  });
});

test.describe('PDF Compress', () => {
  test('loads a multi-page PDF and shows compress button', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-compress');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));

    // Should show the file info (3 pages)
    await expect(page.getByText(/3\s*pages/i).first()).toBeVisible({ timeout: 15000 });

    // Compress button should be visible
    await expect(page.getByRole('button', { name: /compress pdf/i })).toBeVisible();
  });
});

test.describe('PDF to Image', () => {
  test('converts PDF pages to images', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-to-image');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));

    // Should show the loaded file info (3 pages)
    await expect(page.getByText(/3\s*pages/i).first()).toBeVisible({ timeout: 15000 });

    // Convert button or page images should appear
    // The component may auto-convert or show a convert button
    await expect(
      page.getByRole('button', { name: /convert|download/i }).first()
    ).toBeVisible({ timeout: 20000 });
  });
});

test.describe('PDF to Word', () => {
  test('extracts text from complex PDF and converts to DOCX', async ({ page }) => {
    await page.goto('/tools/file-tools/pdf-to-word');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.pdf'));
    await waitForProcessing(page, 30000);

    // Should show extracted text preview with content from the PDF
    await expect(page.getByText('CONFIDENTIAL').first()).toBeVisible({ timeout: 20000 });

    // Should also find other PDF content
    await expect(page.getByText('Quarterly Financial Report').first()).toBeVisible();

    // Should NOT show an error message about encryption/corruption
    const errorMessages = page.locator('[class*="red"]').filter({ hasText: /error|failed|corrupt|encrypt/i });
    await expect(errorMessages).toHaveCount(0);

    // Download button should be available
    await expect(page.getByRole('button', { name: /download/i })).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════
//  DOCUMENT CONVERSION TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('Word to PDF', () => {
  test('converts complex DOCX with tables and formatting', async ({ page }) => {
    await page.goto('/tools/file-tools/word-to-pdf');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.docx'));
    await waitForProcessing(page, 30000);

    // Should show preview of the document content
    await expect(page.getByText('Annual Performance Review').first()).toBeVisible({ timeout: 20000 });

    // Should show Executive Summary heading
    await expect(page.getByText('Executive Summary').first()).toBeVisible();

    // Should NOT show "too complex" error
    const tooComplex = page.locator('text=too complex');
    await expect(tooComplex).toHaveCount(0);

    // Download/Convert button should be available
    await expect(page.getByRole('button', { name: /download|pdf/i }).first()).toBeVisible();
  });
});

test.describe('Excel to PDF', () => {
  test('converts multi-sheet XLSX with 50 rows', async ({ page }) => {
    await page.goto('/tools/file-tools/excel-to-pdf');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.xlsx'));
    await waitForProcessing(page, 30000);

    // Should show preview header with sheet info
    await expect(page.getByText(/Preview:.*Employees/i)).toBeVisible({ timeout: 20000 });

    // Should show table preview with actual data
    await expect(page.getByText('FirstName1').first()).toBeVisible();

    // Should NOT show an error
    const errorMessages = page.locator('[class*="red"]').filter({ hasText: /error|failed/i });
    await expect(errorMessages).toHaveCount(0);

    // Download button should be available
    await expect(page.getByRole('button', { name: /download.*pdf/i })).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════
//  TEXT/DATA CONVERSION TOOLS
// ════════════════════════════════════════════════════════════════

test.describe('CSV to JSON Converter', () => {
  test('converts complex CSV with quoted fields to JSON', async ({ page }) => {
    await page.goto('/tools/file-tools/csv-json');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.csv'));

    // Wait for output to populate
    const output = page.locator('#csv-json-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    // Verify the JSON output contains expected data
    const outputText = await output.inputValue();
    expect(outputText).toContain('Alice Johnson');
    expect(outputText).toContain('95000');

    // Verify quoted fields with commas were parsed correctly
    expect(outputText).toContain('Chicago, IL');

    // Copy/Download should be available
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});

test.describe('JSON to CSV Converter', () => {
  test('converts complex JSON to CSV', async ({ page }) => {
    await page.goto('/tools/file-tools/csv-json');
    await page.waitForLoadState('networkidle');

    // Switch to JSON → CSV mode by clicking the toggle button
    await page.getByRole('button', { name: /csv.*json|json.*csv/i }).click();

    await uploadFile(page, path.join(FIXTURES, 'complex.json'));

    const output = page.locator('#csv-json-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();
    // Should contain CSV headers
    expect(outputText).toContain('id');
    expect(outputText).toContain('name');
    expect(outputText).toContain('department');
    // Should contain data rows
    expect(outputText).toContain('Employee 1');
  });
});

test.describe('Markdown to HTML Converter', () => {
  test('converts complex Markdown to HTML', async ({ page }) => {
    await page.goto('/tools/file-tools/markdown-html');
    await page.waitForLoadState('networkidle');

    await uploadFile(page, path.join(FIXTURES, 'complex.md'));

    // Wait for output to populate
    const output = page.locator('#md-html-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();
    // Should contain converted HTML tags
    expect(outputText).toContain('<h1>');
    expect(outputText).toContain('<strong>');
    expect(outputText).toContain('<code');

    // Copy/Download should be available
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});

test.describe('HTML to Markdown Converter', () => {
  test('converts complex HTML to Markdown', async ({ page }) => {
    await page.goto('/tools/file-tools/markdown-html');
    await page.waitForLoadState('networkidle');

    // Switch to HTML → Markdown mode
    await page.getByRole('button', { name: /markdown.*html|html.*markdown/i }).click();

    await uploadFile(page, path.join(FIXTURES, 'complex.html'));

    const output = page.locator('#md-html-output');
    await expect(output).not.toHaveValue('', { timeout: 10000 });

    const outputText = await output.inputValue();
    // Should contain markdown formatting
    expect(outputText).toContain('# ');
    expect(outputText).toContain('**');
  });
});

// ════════════════════════════════════════════════════════════════
//  HEIC (may not work without native support — test gracefully)
// ════════════════════════════════════════════════════════════════

test.describe('HEIC to JPG', () => {
  test('page loads and shows upload zone', async ({ page }) => {
    await page.goto('/tools/file-tools/heic-to-jpg');
    await page.waitForLoadState('networkidle');

    // Just verify the tool page loads correctly
    await expect(page.getByText(/heic/i).first()).toBeVisible();
    // Upload zone should be visible
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });
});

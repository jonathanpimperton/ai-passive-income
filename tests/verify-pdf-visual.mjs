/**
 * Visually verify PDF output by rendering it through our PDF-to-Image converter.
 *
 * Run: node tests/verify-pdf-visual.mjs
 * Requires: dev server on port 4321
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, 'visual-output');
mkdirSync(OUTPUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [browser] ${msg.text()}`);
  });

  console.log('Opening PDF-to-Image converter...');
  await page.goto('http://localhost:4321/tools/file-tools/pdf-to-image/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Upload the Word-to-PDF output
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(join(OUTPUT, 'word-to-pdf-output.pdf'));
  console.log('Uploaded PDF...');
  await page.waitForTimeout(2000);

  // Click the "Convert to JPG" button
  const convertBtn = page.getByRole('button', { name: /Convert to (JPG|PNG)/i });
  if (await convertBtn.count() > 0) {
    console.log('Clicking convert button...');
    await convertBtn.click();

    // Wait for images to be generated
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: join(OUTPUT, 'pdf-rendered-as-image.png'), fullPage: true });
    console.log('Screenshot saved: pdf-rendered-as-image.png');

    // Check for rendered page images (blob: URLs or data: URLs)
    const allImages = await page.locator('img').all();
    let pageImgCount = 0;
    for (const img of allImages) {
      const src = await img.getAttribute('src');
      if (src && (src.startsWith('blob:') || src.startsWith('data:'))) {
        pageImgCount++;
        await img.screenshot({ path: join(OUTPUT, `pdf-rendered-page${pageImgCount}.png`) });
        console.log(`  Rendered page ${pageImgCount} saved`);
      }
    }

    if (pageImgCount === 0) {
      console.log('  No rendered page images found');
      // Check for canvases
      const canvasCount = await page.locator('canvas').count();
      console.log(`  Found ${canvasCount} canvas elements`);
    }
  } else {
    console.log('Convert button not found');
    await page.screenshot({ path: join(OUTPUT, 'pdf-rendered-debug.png'), fullPage: true });
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});

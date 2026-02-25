/**
 * Render downloaded PDF and DOCX output as images for visual inspection.
 * Uses Playwright to view files in browser.
 *
 * Run: node tests/render-pdf-pages.mjs
 * Requires: dev server running on port 4321
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, 'visual-output');
mkdirSync(OUTPUT, { recursive: true });

async function renderPdfPages() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
  });

  const pdfPath = join(OUTPUT, 'word-to-pdf-output.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  const base64 = pdfBuffer.toString('base64');

  const page = await context.newPage();

  // Use pdfjs from the local dev server
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#e0e0e0;font-family:sans-serif;">
  <h2 style="text-align:center;">Word-to-PDF Output Verification</h2>
  <div id="pages"></div>
  <script>
    async function render() {
      // Load pdfjs
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/pdfjs-dist@4.9.155/build/pdf.min.mjs';
      script.type = 'module';

      // Since we can't use ESM easily, use the legacy UMD build
      const script2 = document.createElement('script');
      script2.src = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.min.js';
      script2.onload = async () => {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js';

        const pdfData = Uint8Array.from(atob('${base64}'), c => c.charCodeAt(0));
        const doc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const container = document.getElementById('pages');

        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i);
          const vp = pg.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.id = 'page-' + i;
          canvas.style.cssText = 'display:block;margin:10px auto;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
          const label = document.createElement('p');
          label.textContent = 'Page ' + i + ' of ' + doc.numPages;
          label.style.cssText = 'text-align:center;margin:15px 0 5px;font-weight:bold;';
          container.appendChild(label);
          container.appendChild(canvas);
          await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        }
        window.__done = true;
      };
      document.head.appendChild(script2);
    }
    render();
  </script>
</body>
</html>`;

  await page.setContent(html);

  // Wait for render
  try {
    await page.waitForFunction(() => window.__done === true, { timeout: 20000 });
  } catch (e) {
    console.log('PDF render timeout — checking for errors');
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.waitForTimeout(2000);
    console.log('Console:', logs.join('\n'));
    await page.screenshot({ path: join(OUTPUT, 'pdf-render-debug.png'), fullPage: true });
    await browser.close();
    return;
  }

  await page.waitForTimeout(500);

  // Screenshot each page
  const pageCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
  console.log(`PDF has ${pageCount} pages`);

  for (let i = 1; i <= pageCount; i++) {
    const canvas = page.locator(`#page-${i}`);
    const outPath = join(OUTPUT, `word-to-pdf-page${i}.png`);
    await canvas.screenshot({ path: outPath });
    console.log(`  Page ${i} → ${outPath}`);
  }

  // Also take a full page screenshot
  await page.screenshot({ path: join(OUTPUT, 'word-to-pdf-all-pages.png'), fullPage: true });

  await browser.close();
}

async function renderDocx() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
  });
  const page = await context.newPage();

  // Convert DOCX to HTML using mammoth in the browser
  const docxPath = join(OUTPUT, 'pdf-to-word-output.docx');
  const docxBuffer = readFileSync(docxPath);
  const base64 = docxBuffer.toString('base64');

  const html = `<!DOCTYPE html>
<html>
<head>
<script src="https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js"></script>
</head>
<body style="margin:0;padding:20px;background:#e0e0e0;font-family:sans-serif;">
  <h2 style="text-align:center;">PDF-to-Word Output Verification</h2>
  <div id="content" style="max-width:700px;margin:20px auto;padding:40px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;"></div>
  <script>
    async function render() {
      const base64 = '${base64}';
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
      document.getElementById('content').innerHTML = result.value;
      window.__done = true;
    }
    render();
  </script>
</body>
</html>`;

  await page.setContent(html);

  try {
    await page.waitForFunction(() => window.__done === true, { timeout: 15000 });
  } catch {
    console.log('DOCX render timeout');
    await page.screenshot({ path: join(OUTPUT, 'docx-render-debug.png'), fullPage: true });
    await browser.close();
    return;
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUTPUT, 'pdf-to-word-rendered.png'), fullPage: true });
  console.log('  DOCX rendered → pdf-to-word-rendered.png');

  await browser.close();
}

async function main() {
  console.log('Rendering output files for visual inspection...\n');

  console.log('=== Rendering Word-to-PDF output (PDF → PNG) ===');
  await renderPdfPages();

  console.log('\n=== Rendering PDF-to-Word output (DOCX → HTML → PNG) ===');
  await renderDocx();

  console.log('\nAll renders complete! Check:', OUTPUT);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});

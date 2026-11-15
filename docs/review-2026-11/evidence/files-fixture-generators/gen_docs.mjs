// Generate PDF / XLSX / CSV / SVG fixtures (pdf-lib + xlsx from the repo node_modules).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const REPO = 'C:/Users/jonat/projects/0. Archive - completed projects in use/CalcRun';
const require = createRequire(REPO + '/package.json');
const { PDFDocument, StandardFonts, rgb, PDFName, PDFNumber, PDFRawStream, PDFArray } = require('pdf-lib');
const XLSX = require('xlsx');
const sharp = require('sharp');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, '$1'), 'fixtures');
fs.mkdirSync(OUT, { recursive: true });
const P = (n) => path.join(OUT, n);

// ---------- PDFs ----------
async function textPdf(n, name) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= n; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText(`Page ${i} of ${n}`, { x: 50, y: 780, size: 28, font, color: rgb(0.1, 0.1, 0.1) });
    p.drawText('The quick brown fox jumps over the lazy dog. 0123456789', { x: 50, y: 740, size: 12, font });
    p.drawRectangle({ x: 50, y: 600, width: 200, height: 100, color: rgb(0.04, 0.43, 0.43) });
  }
  fs.writeFileSync(P(name), await doc.save());
}
await textPdf(3, 'text-3p.pdf');
await textPdf(500, 'text-500p.pdf');

// photo PDF: N pages each with a big JPEG (q95)
async function photoPdf(n, w, h, name, q = 95) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) {
    const jpg = await sharp({ create: { width: w, height: h, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 40 } } })
      .blur(1.2).modulate({ hue: i * 40 }).jpeg({ quality: q }).toBuffer();
    const img = await doc.embedJpg(jpg);
    const p = doc.addPage([595, 842]);
    p.drawImage(img, { x: 20, y: 200, width: 555, height: 555 * h / w });
    p.drawText(`Scanned page ${i + 1}`, { x: 40, y: 100, size: 20 });
  }
  fs.writeFileSync(P(name), await doc.save());
}
await photoPdf(10, 3000, 2000, 'photos-10p.pdf');

// ~48MB photo pdf
await photoPdf(16, 4000, 3000, 'photos-big.pdf', 97);

// Flate (PNG) images pdf
{
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const png = await sharp({ create: { width: 2000, height: 1500, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } } }).png().toBuffer();
    const img = await doc.embedPng(png);
    doc.addPage([595, 842]).drawImage(img, { x: 20, y: 300, width: 555, height: 416 });
  }
  fs.writeFileSync(P('flate-images-3p.pdf'), await doc.save());
}

// CMYK JPEG pdf (pdf-lib sets DeviceCMYK + Decode for Adobe CMYK) and JPEG+SMask pdf
{
  const doc = await PDFDocument.create();
  const cmyk = fs.readFileSync(P('cmyk-1200x800.jpg'));
  const img = await doc.embedJpg(cmyk);
  doc.addPage([595, 842]).drawImage(img, { x: 20, y: 300, width: 555, height: 370 });
  fs.writeFileSync(P('cmyk-jpeg.pdf'), await doc.save());
}
{
  // JPEG with /SMask (alpha) -- as produced by Chrome/Skia "Save as PDF" for photos with transparency
  const doc = await PDFDocument.create();
  const W = 1500, H = 1000;
  const jpg = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 230, g: 57, b: 70 } } })
    .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H / 2}" fill="#0b6e6e"/></svg>`) }])
    .jpeg({ quality: 98 }).toBuffer();
  // alpha: a circle opaque, rest transparent
  const alphaRaw = await sharp(Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="black"/><circle cx="${W / 2}" cy="${H / 2}" r="${H / 2.2}" fill="white"/></svg>`))
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const zlib = await import('node:zlib');
  const gray = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) gray[i] = alphaRaw.data[i * alphaRaw.info.channels];
  const smaskData = zlib.deflateSync(gray);
  const ctx = doc.context;
  const smaskDict = ctx.obj({ Type: 'XObject', Subtype: 'Image', Width: W, Height: H, ColorSpace: 'DeviceGray', BitsPerComponent: 8, Filter: 'FlateDecode', Length: smaskData.length });
  const smaskRef = ctx.register(PDFRawStream.of(smaskDict, smaskData));
  const imgDict = ctx.obj({ Type: 'XObject', Subtype: 'Image', Width: W, Height: H, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode', Length: jpg.length });
  imgDict.set(PDFName.of('SMask'), smaskRef);
  const imgRef = ctx.register(PDFRawStream.of(imgDict, jpg));
  const page = doc.addPage([595, 842]);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 0.6) }); // yellow page bg shows through alpha
  page.node.setXObject(PDFName.of('Im1'), imgRef);
  const { pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = require('pdf-lib');
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(555, 0, 0, 370, 20, 300), drawObject('Im1'), popGraphicsState());
  fs.writeFileSync(P('jpeg-smask.pdf'), await doc.save());
}
// JPX image pdf
{
  const doc = await PDFDocument.create();
  const jp2 = fs.readFileSync(P('img.jp2'));
  const ctx = doc.context;
  const d = ctx.obj({ Type: 'XObject', Subtype: 'Image', Width: 800, Height: 600, Filter: 'JPXDecode', Length: jp2.length });
  const ref = ctx.register(PDFRawStream.of(d, jp2));
  const page = doc.addPage([595, 842]);
  page.node.setXObject(PDFName.of('Jx'), ref);
  const { pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = require('pdf-lib');
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(500, 0, 0, 375, 40, 400), drawObject('Jx'), popGraphicsState());
  fs.writeFileSync(P('jpx-image.pdf'), await doc.save());
}
// Form PDF
{
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const form = doc.getForm();
  const tf = form.createTextField('applicant.name'); tf.setText('Jane Doe'); tf.addToPage(page, { x: 50, y: 700, width: 300, height: 30 });
  const cb = form.createCheckBox('agree'); cb.check(); cb.addToPage(page, { x: 50, y: 650, width: 20, height: 20 });
  fs.writeFileSync(P('form-1p.pdf'), await doc.save());
}
// broken pdfs
fs.writeFileSync(P('zero.pdf'), Buffer.alloc(0));
{ const b = fs.readFileSync(P('photos-10p.pdf')); fs.writeFileSync(P('truncated.pdf'), b.subarray(0, Math.floor(b.length / 2))); }
fs.writeFileSync(P('random.pdf'), Buffer.concat([Buffer.from('%PDF-1.7\n'), require('node:crypto').randomBytes(20000)]));
fs.copyFileSync(P('photo-4032x3024.jpg'), P('jpeg-named-as.pdf'));
fs.copyFileSync(P('text-3p.pdf'), P('Résumé final v2 (copy) 東京.pdf'));

// ---------- Spreadsheets ----------
{
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Q3 Expense Report'],
    ['Date', 'Vendor', 'Category', 'Amount', 'VAT rate', 'Notes'],
  ];
  const vendors = ['Łódź Logistics sp. z o.o.', '東京 Trading', 'Café Zürich', 'Ελληνικά Ltd', 'Acme Corp', 'Москва Imports'];
  for (let i = 0; i < 40; i++) rows.push([new Date(Date.UTC(2026, 6, 1 + i)), vendors[i % 6], i % 2 ? 'Travel' : 'Office', 1234.5 + i * 101.25, 0.2, i === 3 ? 'A very long note that keeps going and going to test wrapping of long text inside narrow cells in the PDF output, more words here' : '€ refund pending']);
  rows.push(['Total', '', '', { f: 'SUM(D3:D42)' }, '', '']);
  const ws = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  // number formats
  for (let r = 3; r <= 42; r++) {
    ws['A' + r].z = 'dd/mm/yyyy';
    ws['D' + r].z = '"£"#,##0.00';
    ws['E' + r].z = '0%';
  }
  ws['D43'] = { t: 'n', f: 'SUM(D3:D42)', v: rows.slice(2, 42).reduce((s, r) => s + r[3], 0), z: '"£"#,##0.00' };
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  const ws2 = XLSX.utils.aoa_to_sheet([['Name', 'Score'], ['Ann', 91], ['Bob', 78]]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Second sheet');
  XLSX.writeFile(wb, P('report.xlsx'));
  XLSX.writeFile(wb, P('report.xls'), { bookType: 'biff8' });
}
{
  // wide sheet: 30 columns of long numbers
  const head = Array.from({ length: 30 }, (_, i) => `Account ${i + 1}`);
  const rows = [head];
  for (let r = 0; r < 20; r++) rows.push(head.map((_, c) => 1000000 + r * 12345.67 + c));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Wide');
  XLSX.writeFile(wb, P('wide-30cols.xlsx'));
}
{
  // big sheet: 50,000 rows x 8 cols
  const rows = [['ID', 'Name', 'Email', 'City', 'Amount', 'Status', 'Ref', 'Note']];
  for (let r = 0; r < 50000; r++) rows.push([r + 1, `Customer ${r}`, `c${r}@example.invalid`, ['Leeds', 'York', 'Bath'][r % 3], (r * 7.31) % 9999, r % 5 ? 'Open' : 'Closed', `REF-${r}`, 'ok']);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Big');
  XLSX.writeFile(wb, P('big-50k.xlsx'));
}
{
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Empty');
  XLSX.writeFile(wb, P('empty.xlsx'));
}
fs.writeFileSync(P('utf8-nobom.csv'), 'City,Amount,Note\nZürich,£100,café\n東京,¥200,日本語\nŁódź,zł300,ąęś\n');
fs.writeFileSync(P('utf8-bom.csv'), '\ufeffCity,Amount,Note\nZürich,£100,café\n東京,¥200,日本語\nŁódź,zł300,ąęś\n');
fs.writeFileSync(P('corrupt.xlsx'), Buffer.concat([Buffer.from('PK\x03\x04'), require('node:crypto').randomBytes(5000)]));

// ---------- SVGs ----------
const svgs = {
  'basic.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="#0b6e6e"/><circle cx="100" cy="50" r="40" fill="#e8604c"/></svg>',
  'illustrator-style.svg': '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><defs><style>.cls-1{fill:#e63946;}.cls-2{fill:#2a9d8f;}</style></defs><rect class="cls-2" width="200" height="100"/><circle class="cls-1" cx="100" cy="50" r="40"/></svg>',
  'script.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" onload="fetch(\'https://example.invalid/pwn?onload\')"><script>fetch("https://example.invalid/pwn?script")</script><rect width="200" height="100" fill="#264653"/><a href="javascript:alert(1)"><text x="10" y="50" fill="white">click</text></a></svg>',
  'external-refs.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="100"><image href="https://example.invalid/track.png" width="50" height="50"/><image xlink:href="https://example.invalid/track2.png" x="60" width="50" height="50"/><rect x="120" width="80" height="100" fill="url(https://example.invalid/x.svg#g)"/><rect x="0" y="60" width="200" height="40" fill="#f4a261"/></svg>',
  'viewbox-only.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="#e9c46a"/><rect width="100" height="100" fill="#264653"/></svg>',
  'percent-size.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 500"><rect width="1000" height="500" fill="#2a9d8f"/><circle cx="500" cy="250" r="200" fill="#e76f51"/></svg>',
  'units-cm.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="10cm" height="5cm" viewBox="0 0 100 50"><rect width="100" height="50" fill="#8ab17d"/></svg>',
  'no-size-no-viewbox.svg': '<svg xmlns="http://www.w3.org/2000/svg"><rect width="120" height="80" fill="#b5838d"/></svg>',
  'huge-viewbox.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100000 100000"><rect width="100000" height="100000" fill="#6d6875"/></svg>',
  'corrupt.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"><circle></svg',
  'inline-style-attr.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" style="fill:#3a86ff"/></svg>',
  'gradient-use.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="100"><defs><linearGradient id="g"><stop offset="0" stop-color="#ff006e"/><stop offset="1" stop-color="#8338ec"/></linearGradient><circle id="c" r="20" fill="#ffbe0b"/></defs><rect width="200" height="100" fill="url(#g)"/><use xlink:href="#c" x="50" y="50"/><use href="#c" x="150" y="50"/></svg>',
};
for (const [n, s] of Object.entries(svgs)) fs.writeFileSync(P(n), s);
console.log('docs done');
for (const f of fs.readdirSync(OUT)) { const st = fs.statSync(P(f)); if (st.isFile()) console.log(f, st.size); }

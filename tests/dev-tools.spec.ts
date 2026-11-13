/**
 * Behaviour checks for the developer and utility tools (plan W1-DEV, DV-1..DV-11).
 * Benign inputs only. Analytics requests are aborted in every test.
 */
import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route(/(googletagmanager|google-analytics|analytics\.google|doubleclick)\.(com|net)/, (r) => r.abort());
  await context.route(/\/api\//, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"blocked in tests"}' }));
});

/** Wait until every island has hydrated and its controls carry React props. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const islands = [...document.querySelectorAll('astro-island')];
    if (!(islands.length > 0 && islands.every((i) => !i.hasAttribute('ssr')))) return false;
    const controls = [...document.querySelectorAll('astro-island textarea, astro-island input, astro-island button')];
    return controls.length > 0 && controls.every((el) => Object.keys(el).some((k) => k.startsWith('__reactProps')));
  }, null, { timeout: 30000 });
}

/** The tool itself (page copy and the cookie banner can repeat the same text). */
function tool(page: Page) {
  return page.locator('astro-island').filter({ has: page.locator('textarea, input') }).first();
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
}

test.describe('Markdown preview (DV-1)', () => {
  test('renders in a sandboxed iframe with scripts, handlers and styles removed', async ({ page }) => {
    await open(page, '/tools/file-tools/markdown-html/');
    await page.locator('#md-html-input').fill('# Title\n\n<p onclick="go()" style="color:red">Hello</p>\n\n<script>go()</script>\n\n[site](https://example.com)');
    await expect(page.locator('#md-html-output')).not.toHaveValue('');
    const output = await page.locator('#md-html-output').inputValue();
    expect(output).toContain('<h1>Title</h1>');
    expect(output).not.toContain('<script');
    expect(output).not.toContain('onclick');
    await expect(page.getByText(/Removed from the HTML output for safety/)).toBeVisible();

    await page.getByRole('button', { name: 'Preview' }).click();
    const frameEl = page.locator('iframe[title="Markdown preview"]');
    await expect(frameEl).toHaveAttribute('sandbox', '');
    const frame = page.frameLocator('iframe[title="Markdown preview"]');
    await expect(frame.locator('h1')).toHaveText('Title');
    await expect(frame.locator('script')).toHaveCount(0);
    await expect(frame.locator('[onclick]')).toHaveCount(0);
    await expect(frame.locator('body [style]')).toHaveCount(0);
    await expect(frame.locator('a')).toHaveAttribute('href', 'https://example.com');
    await expect(frame.locator('head meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
  });

  test('can keep the HTML output exactly as written', async ({ page }) => {
    await open(page, '/tools/file-tools/markdown-html/');
    await page.getByRole('checkbox', { name: /Remove unsafe HTML/ }).uncheck();
    await page.locator('#md-html-input').fill('<p style="color:red">Hi</p>');
    await expect(page.locator('#md-html-output')).toHaveValue(/style="color:red"/);
  });
});

test.describe('Markdown conversion limits', () => {
  test('stops input that parses very slowly and stays usable', async ({ page }) => {
    test.setTimeout(120000);
    await open(page, '/tools/file-tools/markdown-html/');
    await page.locator('#md-html-input').fill('[a]('.repeat(1500));
    await expect(tool(page).getByRole('alert')).toContainText('too complex to convert in the browser', { timeout: 60000 });
    await page.locator('#md-html-input').fill('# Fine');
    await expect(page.locator('#md-html-output')).toHaveValue(/<h1>Fine<\/h1>/);
  });
});

test.describe('JSON formatter (DV-3)', () => {
  test('keeps big numbers exactly and minifies into the output', async ({ page }) => {
    await open(page, '/tools/utility/json-formatter/');
    const input = '{"id":12345678901234567890,"id2":9007199254740993,"price":1.10,"big":1e400}';
    await page.locator('#json-input').fill(input);
    const out = page.getByLabel('Formatted JSON output');
    await expect(out).toContainText('"id": 12345678901234567890');
    await expect(out).toContainText('"price": 1.10');
    await expect(page.getByText(/Valid, with 3 warnings/)).toBeVisible();
    await page.getByRole('button', { name: 'Minify' }).click();
    await expect(out).toHaveText(input);
    await expect(page.locator('#json-input')).toHaveValue(input);
  });

  test('explains errors with a position and a hint', async ({ page }) => {
    await open(page, '/tools/utility/json-formatter/');
    await page.locator('#json-input').fill('{\n  "a": 1,\n}');
    await expect(page.getByText('Parse error on line 3, column 1')).toBeVisible();
    await expect(tool(page).getByText(/Trailing comma/)).toBeVisible();
  });
});

test.describe('JSON and XML (DV-4, DV-5)', () => {
  test('XML to JSON keeps zip codes and phone numbers as text', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.getByRole('button', { name: /Switch to XML to JSON/ }).click();
    await page.locator('#xml-input').fill('<order id="00123"><zip>02134</zip><phone>+441234567890</phone><ver>1.10</ver></order>');
    const out = page.locator('#xml-output');
    await expect(out).toHaveValue(/"zip": "02134"/);
    await expect(out).toHaveValue(/"phone": "\+441234567890"/);
    await expect(out).toHaveValue(/"@_id": "00123"/);
  });

  test('XML to JSON reports broken XML', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.getByRole('button', { name: /Switch to XML to JSON/ }).click();
    await page.locator('#xml-input').fill('this is not xml at all');
    await expect(tool(page).getByRole('alert')).toContainText('does not look like XML');
  });

  test('XML to JSON names a reserved element and the tool stays usable', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.getByRole('button', { name: /Switch to XML to JSON/ }).click();
    await page.locator('#xml-input').fill('<root><constructor>1</constructor></root>');
    await expect(tool(page).getByRole('alert')).toContainText('"constructor"');
    await expect(page.getByRole('button', { name: /Switch to JSON to XML/ })).toBeVisible();
    await page.locator('#xml-input').fill('<root><item>ok</item></root>');
    await expect(page.locator('#xml-output')).toHaveValue(/"item": "ok"/);
  });

  test('XML to JSON explains declarations it does not support', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.getByRole('button', { name: /Switch to XML to JSON/ }).click();
    await page.locator('#xml-input').fill('<!DOCTYPE a [<!ENTITY % p "x">]><a>1</a>');
    await expect(tool(page).getByRole('alert')).toContainText('parameter entity');
    await page.locator('#xml-input').fill(`<!DOCTYPE a [<!ENTITY big "${'x'.repeat(10001)}">]><a>&big;</a>`);
    await expect(tool(page).getByRole('alert')).toContainText('"&big;"');
    await page.locator('#xml-input').fill('<a><b>1</b></a>');
    await expect(page.locator('#xml-output')).toHaveValue(/"b": "1"/);
  });

  test('XML to JSON says when it renames a name JavaScript objects already use', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.getByRole('button', { name: /Switch to XML to JSON/ }).click();
    await page.locator('#xml-input').fill('<a><toString>1</toString></a>');
    await expect(page.locator('#xml-output')).toHaveValue(/"__toString": "1"/);
    await expect(tool(page).getByText(/<toString> is a name that JavaScript objects already use/)).toBeVisible();
  });

  test('JSON to XML writes each attribute once and says so', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.locator('#xml-input').fill('{"r":{"@_a b":"1","@_a_b":"2"}}');
    await expect(page.locator('#xml-output')).toHaveValue(/<r a_b="2"\/>/);
    await expect(tool(page).getByText(/only the last value was kept/)).toBeVisible();
    await expect(tool(page).getByText(/Please report/)).toHaveCount(0);
  });

  test('JSON to XML writes one root and valid names', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.locator('#xml-input').fill('{"name":"Alice","age":30,"first name":"A","tags":["x","y"]}');
    const out = page.locator('#xml-output');
    await expect(out).toHaveValue(/<root>\n {2}<name>Alice<\/name>/);
    await expect(out).toHaveValue(/<first_name>A<\/first_name>/);
    const parses = await page.evaluate((xml) => !new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'), await out.inputValue());
    expect(parses).toBe(true);
  });

  test('swapping direction keeps the converted data', async ({ page }) => {
    await open(page, '/tools/file-tools/json-xml/');
    await page.locator('#xml-input').fill('{"note":{"to":"Bob"}}');
    await expect(page.locator('#xml-output')).toHaveValue(/<to>Bob<\/to>/);
    await page.getByRole('button', { name: /Switch to XML to JSON/ }).click();
    await expect(page.locator('#xml-input')).toHaveValue(/<to>Bob<\/to>/);
  });
});

test.describe('JSON and YAML (DV-11)', () => {
  test('keeps whole numbers beyond 2^53 exactly', async ({ page }) => {
    await open(page, '/tools/file-tools/json-yaml/');
    await page.locator('#yaml-input').fill('{"id":12345678901234567890,"n":5}');
    await expect(page.locator('#yaml-output')).toHaveValue(/id: 12345678901234567890\n/);
    await expect(tool(page).getByText(/rounded/)).toHaveCount(0);
  });

  test('converts a multi-document YAML file to an array', async ({ page }) => {
    await open(page, '/tools/file-tools/json-yaml/');
    await page.getByRole('button', { name: /Switch to YAML to JSON/ }).click();
    await page.locator('#yaml-input').fill('kind: Service\n---\nkind: Deployment\nwhen: 2024-01-01\n');
    const out = page.locator('#yaml-output');
    await expect(out).toHaveValue(/"kind": "Deployment"/);
    await expect(out).toHaveValue(/"when": "2024-01-01"/);
    expect(JSON.parse(await out.inputValue())).toHaveLength(2);
  });
});

test.describe('CSV and JSON (DV-6, DV-7)', () => {
  test('parses quoted line breaks correctly on the first paste', async ({ page }) => {
    await open(page, '/tools/file-tools/csv-json/');
    await page.locator('#csv-json-input').fill('name,note\n"Alice","line1\nline2"\nBob,x');
    const out = page.locator('#csv-json-output');
    await expect(out).toHaveValue(/"note": "line1\\nline2"/);
    expect(JSON.parse(await out.inputValue())).toHaveLength(2);
  });

  test('detects semicolon files', async ({ page }) => {
    await open(page, '/tools/file-tools/csv-json/');
    await page.locator('#csv-json-input').fill('a;b\n1;2');
    await expect(page.locator('#csv-json-output')).toHaveValue(/"b": "2"/);
  });

  test('JSON to CSV takes columns from every row and writes nested values as JSON', async ({ page }) => {
    await open(page, '/tools/file-tools/csv-json/');
    await page.getByRole('button', { name: /csv.*json/i }).click();
    await page.locator('#csv-json-input').fill('[{"a":1},{"a":2,"b":{"c":3}}]');
    await expect(page.locator('#csv-json-output')).toHaveValue('a,b\n1,\n2,"{""c"":3}"');
  });
});

test.describe('Base64 (DV-8)', () => {
  test('decodes binary data to a download of the original bytes', async ({ page }) => {
    await open(page, '/tools/utility/base64-encode-decode/');
    await page.getByRole('button', { name: /Switch to decode mode/ }).click();
    await page.locator('#base64-input').fill('iVBORw0KGgoA//6A');
    await expect(page.getByText('PNG image', { exact: true })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download decoded.png' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('decoded.png');
    const path = await download.path();
    const fs = await import('node:fs');
    expect(fs.statSync(path!).size).toBe(12);
  });

  test('accepts URL-safe input and explains invalid characters', async ({ page }) => {
    await open(page, '/tools/utility/base64-encode-decode/');
    await page.getByRole('button', { name: /Switch to decode mode/ }).click();
    await page.locator('#base64-input').fill('SGVsbG8_');
    await expect(page.locator('#base64-output')).toHaveValue(/^Hello/);
    await page.locator('#base64-input').fill('abc!def');
    await expect(tool(page).getByRole('alert')).toContainText("'!' at position 4");
  });
});

test.describe('Percentage calculator (DV-9)', () => {
  test('reports a change from zero as undefined', async ({ page }) => {
    await open(page, '/tools/utility/percentage-calculator/');
    await page.getByRole('tab', { name: /Percentage Change|% Change/ }).click();
    await page.locator('#pct-input-a').fill('0');
    await page.locator('#pct-input-b').fill('50');
    await expect(tool(page).getByText('Undefined', { exact: true })).toBeVisible();
    await expect(page.getByText(/original value is 0/)).toBeVisible();
  });
});

test.describe('QR codes (DV-10)', () => {
  test('builds the Wi-Fi format phones join from', async ({ page }) => {
    await open(page, '/tools/utility/qr-code/');
    await page.getByRole('button', { name: 'Wi-Fi' }).click();
    await page.getByLabel('Network name (SSID)').fill('ConferenceWiFi');
    await page.getByLabel('Password').fill('welcome2026');
    await expect(page.getByAltText(/QR code/)).toBeVisible();
    await page.getByText('What the code contains').click();
    await expect(tool(page).getByText('WIFI:T:WPA;S:ConferenceWiFi;P:welcome2026;;')).toBeVisible();
  });
});

test.describe('Password generator (DV-2, DV-11)', () => {
  test('rates 8 lowercase letters as very weak and keeps a typed length', async ({ page }) => {
    await open(page, '/tools/utility/password-generator/');
    await page.getByRole('switch', { name: 'Uppercase (A-Z)' }).click();
    await page.getByRole('switch', { name: 'Numbers (0-9)' }).click();
    await page.getByRole('switch', { name: 'Special Characters' }).click();
    const length = page.locator('#pw-length');
    await length.fill('8');
    await length.press('Enter');
    await expect(tool(page).getByText('Very weak', { exact: true })).toBeVisible();
    await length.fill('');
    await length.pressSequentially('20');
    await expect(length).toHaveValue('20');
    await length.blur();
    await expect(length).toHaveValue('20');
  });
});

test.describe('JWT decoder (DV-11)', () => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

  test('decodes a token whose time claims are far outside the range of real dates', async ({ page }) => {
    await open(page, '/tools/utility/jwt-decoder/');
    await page.locator('#jwt-input').fill(`${b64({ alg: 'HS256' })}.${b64({ sub: 'x', exp: 1e20, nbf: -1e20, iat: 1e300 })}.c2ln`);
    await expect(page.getByRole('heading', { name: 'Payload' })).toBeVisible();
    await expect(page.getByText('Expiry unclear: "exp" looks like milliseconds')).toBeVisible();
    await expect(tool(page).getByText(/outside the range of real dates/).first()).toBeVisible();
    await page.locator('#jwt-input').fill('not a token');
    await expect(tool(page).getByRole('alert')).toBeVisible();
  });

  test('says the expiry is not a number when it is written as text', async ({ page }) => {
    await open(page, '/tools/utility/jwt-decoder/');
    await page.locator('#jwt-input').fill(`${b64({ alg: 'HS256' })}.${b64({ exp: '1893456000' })}.c2ln`);
    await expect(page.getByText('Expiry unclear: "exp" is not a number')).toBeVisible();
    await expect(page.getByText(/no "exp" claim/)).toHaveCount(0);
  });

  test('never calls a not-yet-active token valid', async ({ page }) => {
    await open(page, '/tools/utility/jwt-decoder/');
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    await page.locator('#jwt-input').fill(`Bearer ${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ nbf: now + 2 * 86400, exp: now + 59 * 86400 })}.c2ln`);
    await expect(page.getByText(/Not active yet: starts in/)).toBeVisible();
    await expect(page.getByText('Signature not checked')).toBeVisible();
    await expect(tool(page).getByText(/^Valid/)).toHaveCount(0);
  });
});

test.describe('URL encoder (DV-11)', () => {
  test('explains a malformed escape with its position', async ({ page }) => {
    await open(page, '/tools/utility/url-encode-decode/');
    await page.getByRole('button', { name: /Switch to decode mode/ }).click();
    await page.locator('#url-input').fill('100% sure');
    await expect(tool(page).getByRole('alert')).toContainText('Position 4');
  });
});

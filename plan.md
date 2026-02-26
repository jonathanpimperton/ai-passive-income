# Plan: Build 6 New Developer/Utility Tools

## Summary

Add 6 new tools with provably perfect client-side output. All are text/data transformations where correctness is mathematically verifiable — no image rendering, no heuristics, no "looks about right."

## Tools to Build (priority order)

| # | Tool | Slug | Category | Library | Bundle |
|---|------|------|----------|---------|--------|
| 1 | Base64 Encode/Decode | `base64-encode-decode` | `utility` | Native `btoa`/`atob`/`TextEncoder` | 0 KB |
| 2 | JWT Decoder | `jwt-decoder` | `utility` | Native JS (split + atob + JSON.parse) | 0 KB |
| 3 | JSON ↔ YAML Converter | `json-yaml` | `file-tools` | `js-yaml` (~13 KB gz) | 13 KB |
| 4 | JSON ↔ XML Converter | `json-xml` | `file-tools` | `fast-xml-parser` (~9 KB gz) | 9 KB |
| 5 | URL Encode/Decode | `url-encode-decode` | `utility` | Native `encodeURIComponent`/`decodeURIComponent` | 0 KB |
| 6 | PNG to ICO (Favicon Generator) | `png-to-ico` | `file-tools` | `PNG2ICOjs` (~1.3 KB) | 1.3 KB |

## Per-Tool Specifications

### Tool 1: Base64 Encode/Decode

**What it does:** Encodes text/files to Base64, decodes Base64 to text/files.

**UI Pattern:** Two-panel layout (like JSON Formatter). Mode toggle: Text ↔ File.
- **Text mode:** Left textarea = input, right textarea = output (readonly). Toggle button: "Encode" / "Decode". Real-time conversion as user types. Copy button on output.
- **File mode:** FileDropZone for upload. Shows Base64 output for encode, or downloads decoded file for decode.
- Stats bar: input size, output size, encoding ratio.

**Implementation:**
- Text encode: `btoa(unescape(encodeURIComponent(input)))` — handles full Unicode
- Text decode: `decodeURIComponent(escape(atob(input)))` — handles full Unicode
- File encode: `FileReader.readAsDataURL()` → strip `data:...;base64,` prefix
- File decode: convert Base64 string to `Uint8Array` → `Blob` → download link
- Line wrapping option (76 chars per line, standard MIME)

**Correctness verification (unit test):**
```
// Round-trip: encode then decode must produce identical output
assert(decode(encode("Hello World")) === "Hello World")
assert(decode(encode("日本語テスト")) === "日本語テスト")  // Unicode
assert(decode(encode("🎉🚀💻")) === "🎉🚀💻")  // Emoji
assert(decode(encode("")) === "")  // Empty string
assert(decode(encode("a".repeat(10000))) === "a".repeat(10000))  // Large input
// Known Base64 values (RFC 4648 test vectors)
assert(encode("") === "")
assert(encode("f") === "Zg==")
assert(encode("fo") === "Zm8=")
assert(encode("foo") === "Zm9v")
assert(encode("foob") === "Zm9vYg==")
assert(encode("fooba") === "Zm9vYmE=")
assert(encode("foobar") === "Zm9vYmFy")
```

**Why this proves success:** RFC 4648 defines the exact Base64 alphabet and padding. These test vectors are from the RFC itself. If our encode/decode matches these AND round-trips arbitrary Unicode, the implementation is provably correct.

---

### Tool 2: JWT Decoder

**What it does:** Decodes JWT tokens into readable header + payload JSON. Shows expiration status.

**UI Pattern:** Single input (textarea or paste), three output panels: Header, Payload, Signature info.
- Paste JWT → instantly see decoded header (algorithm, type) and payload (claims, expiry).
- Color-coded expiration: green "Valid (expires in X)" / red "Expired X ago".
- Signature section shows algorithm but does NOT verify (no secret key).
- Copy buttons on each section.
- Example JWT pre-loaded for empty state.

**Implementation:**
- Split on `.` → must have exactly 3 parts
- Base64URL decode each part: replace `-` with `+`, `_` with `/`, add `=` padding, then `atob()`
- `JSON.parse()` the decoded header and payload
- Read `exp` claim, compare to `Date.now() / 1000`
- Read `iat` (issued at), `nbf` (not before), `iss` (issuer), `sub` (subject), `aud` (audience)

**Correctness verification (unit test):**
```
// Use a known JWT from jwt.io's documentation:
// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
const testJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
const { header, payload } = decodeJwt(testJwt)
assert(header.alg === "HS256")
assert(header.typ === "JWT")
assert(payload.sub === "1234567890")
assert(payload.name === "John Doe")
assert(payload.iat === 1516239022)
// Edge cases
assert(decodeJwt("not.a.jwt").error !== null)  // Invalid Base64
assert(decodeJwt("abc").error !== null)  // Wrong number of parts
assert(decodeJwt("").error !== null)  // Empty
```

**Why this proves success:** The jwt.io example JWT is the canonical reference. If our decoder produces identical header/payload objects, it's correct. JWT decoding is deterministic — Base64URL decode + JSON parse. No ambiguity.

---

### Tool 3: JSON ↔ YAML Converter

**What it does:** Bidirectional conversion between JSON and YAML.

**UI Pattern:** Two-panel layout with direction toggle (like CSV ↔ JSON). Left = input, right = output.
- Mode toggle: "JSON → YAML" / "YAML → JSON"
- Real-time conversion as user types
- Indent size selector (2/4 spaces) for YAML output
- Copy + download buttons on output
- Error display with line numbers for parse errors

**Implementation:**
- Install `js-yaml` (npm package, 44M+ weekly downloads, YAML 1.2 compliant)
- JSON → YAML: `JSON.parse(input)` → `jsYaml.dump(obj, { indent, lineWidth: -1 })`
- YAML → JSON: `jsYaml.load(input)` → `JSON.stringify(obj, null, indent)`
- Handle edge cases: YAML comments are lost in conversion (inherent — JSON has no comments)

**Correctness verification (unit test):**
```
// Round-trip: JSON → YAML → JSON must produce identical parsed objects
const testCases = [
  '{"name":"test","age":30}',
  '{"nested":{"a":{"b":{"c":1}}}}',
  '{"array":[1,2,3,{"x":"y"}]}',
  '{"empty_obj":{},"empty_arr":[],"null_val":null}',
  '{"bool_true":true,"bool_false":false}',
  '{"unicode":"日本語","emoji":"🎉"}',
  '{"number_types":{"int":42,"float":3.14,"neg":-1,"zero":0}}',
  '{"special_strings":{"colon":"a:b","hash":"a#b","quote":"a\\"b"}}',
]
for (const json of testCases) {
  const obj = JSON.parse(json)
  const yaml = jsYaml.dump(obj)
  const roundTripped = jsYaml.load(yaml)
  assert(JSON.stringify(roundTripped) === JSON.stringify(obj))
}
// Known YAML → JSON conversion
const yamlInput = "name: test\nage: 30\nitems:\n  - one\n  - two"
const expected = {"name":"test","age":30,"items":["one","two"]}
assert(JSON.stringify(jsYaml.load(yamlInput)) === JSON.stringify(expected))
```

**Why this proves success:** JSON ↔ YAML for JSON-compatible data is bijective (one-to-one). Round-tripping through both formats must produce identical JavaScript objects. Testing with nested objects, arrays, nulls, booleans, numbers, Unicode, and special strings covers all JSON data types. The known YAML→JSON test verifies the library produces the expected parse result.

---

### Tool 4: JSON ↔ XML Converter

**What it does:** Bidirectional conversion between JSON and XML.

**UI Pattern:** Two-panel layout with direction toggle. Left = input, right = output.
- Mode toggle: "JSON → XML" / "XML → JSON"
- Options: root element name (default: "root"), array item name (default: "item"), indent size
- Real-time conversion
- XML syntax highlighting on output (basic — tag names in one color, values in another)

**Implementation:**
- Install `fast-xml-parser` (npm package, 3,600+ dependents, zero deps, ~9 KB gz)
- XML → JSON: `new XMLParser({ ignoreAttributes: false }).parse(xmlString)` → `JSON.stringify()`
- JSON → XML: `JSON.parse(input)` → `new XMLBuilder({ ignoreAttributes: false, format: true }).build(obj)`
- Handle attributes with `@_` prefix convention

**Correctness verification (unit test):**
```
// XML → JSON with known input
const xml = '<root><user id="1"><name>Alice</name><age>30</age></user></root>'
const json = xmlToJson(xml)
assert(json.root.user["@_id"] === "1")
assert(json.root.user.name === "Alice")
assert(json.root.user.age === 30)  // auto-parsed as number

// JSON → XML → JSON round-trip (for JSON-compatible structures)
const testObj = { root: { items: { item: ["a", "b", "c"] }, count: 3 } }
const xmlOutput = jsonToXml(testObj)
const roundTripped = xmlToJson(xmlOutput)
assert(JSON.stringify(roundTripped) === JSON.stringify(testObj))

// XML → JSON → XML preserves structure
const xmlInput = '<config><db host="localhost" port="5432"/><cache enabled="true"/></config>'
const jsonMiddle = xmlToJson(xmlInput)
const xmlBack = jsonToXml(jsonMiddle)
const jsonFinal = xmlToJson(xmlBack)
assert(JSON.stringify(jsonMiddle) === JSON.stringify(jsonFinal))

// Edge cases
assert(xmlToJson('<empty/>').empty === "")  // Self-closing tags
assert(xmlToJson('<root><![CDATA[<not xml>]]></root>').root === "<not xml>")  // CDATA
```

**Why this proves success:** XML↔JSON has known semantic gaps (XML attributes, ordering, mixed content). Our tests verify: (1) attributes are preserved, (2) round-tripping produces identical parsed structures, (3) CDATA sections work, (4) self-closing tags work. We test the structure-preservation property, not string-equality (which would be wrong for XML since whitespace can vary).

---

### Tool 5: URL Encode/Decode

**What it does:** URL-encodes and URL-decodes text.

**UI Pattern:** Two-panel layout. Mode toggle: "Encode" / "Decode".
- Left textarea = input, right textarea = output (readonly)
- Real-time conversion
- Options: encode full URL (`encodeURI`) vs encode component (`encodeURIComponent`)
- Stats: character count, encoded size

**Implementation:**
- Encode component: `encodeURIComponent(input)` — encodes everything except `A-Z a-z 0-9 - _ . ! ~ * ' ( )`
- Encode full URI: `encodeURI(input)` — preserves `:/?#[]@!$&'()*+,;=`
- Decode: `decodeURIComponent(input)` with try/catch for malformed sequences
- Show which characters were encoded (highlight differences)

**Correctness verification (unit test):**
```
// RFC 3986 reserved characters must be encoded by encodeURIComponent
assert(encodeURIComponent(":/?#[]@!$&'()*+,;=") === "%3A%2F%3F%23%5B%5D%40!%24%26'()*%2B%2C%3B%3D")
// Round-trip
assert(decodeURIComponent(encodeURIComponent("Hello World!")) === "Hello World!")
assert(decodeURIComponent(encodeURIComponent("日本語")) === "日本語")
assert(decodeURIComponent(encodeURIComponent("a=1&b=2&c=hello world")) === "a=1&b=2&c=hello world")
// Known encodings
assert(encodeURIComponent(" ") === "%20")
assert(encodeURIComponent("@") === "%40")
assert(encodeURIComponent("/") === "%2F")
// encodeURI preserves URL structure
assert(encodeURI("https://example.com/path?q=hello world") === "https://example.com/path?q=hello%20world")
```

**Why this proves success:** `encodeURIComponent`/`decodeURIComponent` are ECMAScript spec built-ins. The test vectors verify specific RFC 3986 reserved character encodings. Round-trip tests verify lossless conversion for Unicode. These are the same functions every web browser uses internally.

---

### Tool 6: PNG to ICO (Favicon Generator)

**What it does:** Converts PNG image(s) to ICO format with multiple sizes for favicons.

**UI Pattern:** File upload (FileDropZone) + size selection + download.
- Upload a PNG image
- Preview at multiple sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Checkboxes to select which sizes to include in ICO
- Default: 16 + 32 + 48 (standard favicon set)
- Download button generates multi-size ICO file

**Implementation:**
- Use Canvas API to resize PNG to each selected size with high-quality bicubic interpolation
- Use PNG2ICOjs library to assemble PNG buffers into ICO container format
- ICO format: header (6 bytes) + directory entries (16 bytes each) + PNG data blocks
- The PNG data is embedded verbatim — ICO is just a container, no re-encoding

**Correctness verification (unit test):**
```
// Create a test PNG programmatically (1x1 red pixel)
const canvas = document.createElement('canvas')
canvas.width = canvas.height = 16
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#ff0000'
ctx.fillRect(0, 0, 16, 16)
const pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'))

// Convert to ICO
const icoBlob = await pngToIco([pngBlob], [16])

// Verify ICO structure
const icoBuffer = await icoBlob.arrayBuffer()
const view = new DataView(icoBuffer)
// ICO header: reserved=0, type=1 (icon), count=1
assert(view.getUint16(0, true) === 0)    // Reserved
assert(view.getUint16(2, true) === 1)    // Type: ICO
assert(view.getUint16(4, true) === 1)    // Image count
// Directory entry: width=16, height=16
assert(view.getUint8(6) === 16)   // Width
assert(view.getUint8(7) === 16)   // Height

// Multi-size ICO
const multiIco = await pngToIco([pngBlob, pngBlob, pngBlob], [16, 32, 48])
const multiView = new DataView(await multiIco.arrayBuffer())
assert(multiView.getUint16(4, true) === 3)  // 3 images
```

**Why this proves success:** ICO is a well-defined binary format. We verify the exact header bytes match the ICO specification (reserved=0, type=1 for icons, correct image count). The directory entries must list the correct dimensions. Since ICO embeds PNG data verbatim, if the header is correct and the PNG data is intact, the file is valid. We also verify multi-size ICOs have the correct image count.

---

## Files to Create/Modify

### New files (per tool):
1. `src/components/tools/{ComponentName}.tsx` — React component
2. `src/data/tools/{slug}.md` — Content collection entry (frontmatter + educational content)

### Modified files (once, for all 6 tools):
3. `src/lib/tools-data.ts` — Add 6 entries to TOOLS array
4. `src/pages/tools/[category]/[tool].astro` — Add 6 imports + 6 slug mappings + 6 render conditionals
5. `src/components/ui/ToolIcon.astro` — Add Lucide icon SVG paths for any new icons
6. `package.json` — Add `js-yaml`, `fast-xml-parser`, `png2ico-js` dependencies

### Updated docs:
7. `CLAUDE.md` — Update tool count (32 → 38)
8. `docs/build-spec.md` — Update tool count
9. `README.md` — Update tool count

## New Dependencies

| Package | Version | Size (gz) | Weekly Downloads | Purpose |
|---------|---------|-----------|-----------------|---------|
| `js-yaml` | ^4.1.0 | ~13 KB | 44M+ | YAML parse/dump |
| `fast-xml-parser` | ^5.3.0 | ~9 KB | 18M+ | XML parse/build |

PNG2ICOjs is tiny enough to vendor inline (~50 lines) or install from npm.

## Icon Assignments

| Tool | Lucide Icon | Notes |
|------|-------------|-------|
| Base64 Encode/Decode | `binary` | Data encoding theme |
| JWT Decoder | `key-round` | Authentication/token theme |
| JSON ↔ YAML | `file-json` | Data format conversion |
| JSON ↔ XML | `file-code-2` | Structured data |
| URL Encode/Decode | `link` | URL/web theme |
| PNG to ICO | `app-window` | Favicon/browser theme |

Must verify none of these duplicate existing icons in tools-data.ts.

## Build Order

1. **Base64 Encode/Decode** — zero deps, highest traffic (7.6M proxy), simplest to verify
2. **URL Encode/Decode** — zero deps, pairs with Base64 as developer tools
3. **JWT Decoder** — zero deps, 1.6M proxy traffic, pairs with above
4. **JSON ↔ YAML** — one new dep (js-yaml), high developer demand
5. **JSON ↔ XML** — one new dep (fast-xml-parser), reuse layout from YAML tool
6. **PNG to ICO** — file-based tool (different UI pattern), needs Canvas API + ICO lib

## QA Checklist (per tool)

- [ ] Unit tests pass with RFC/spec test vectors (not just "it works for me")
- [ ] `npm run build` — 0 errors, page generates correctly
- [ ] `npm test` — all tests pass (existing + new)
- [ ] Meta description ≤ 160 chars
- [ ] 5+ FAQ items with substantive answers
- [ ] 3 worked examples with realistic scenarios
- [ ] `relatedTools` array has 4-7 valid slugs (cross-link to existing tools)
- [ ] No affiliate programs forced (utility tools don't have natural product fits)
- [ ] WCAG AA contrast on all text
- [ ] `aria-live="polite"` on output regions
- [ ] Keyboard navigable (Tab, Enter/Space for actions)
- [ ] Icons added to ToolIcon.astro (verify no duplicates)
- [ ] Tool count updated in all docs

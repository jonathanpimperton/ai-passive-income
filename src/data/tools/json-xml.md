---
name: "JSON ↔ XML Converter"
slug: "json-xml"
category: "file-tools"
description: "Convert between JSON and XML formats with attribute support."
keywords:
  - "JSON to XML converter"
  - "XML to JSON converter"
  - "convert JSON to XML online"
  - "convert XML to JSON online"
  - "JSON XML converter"
  - "XML to JSON online free"
relatedTools:
  - "json-formatter"
  - "json-yaml"
  - "csv-json"
  - "markdown-html"
  - "base64-encode-decode"
workedExamples:
  - title: "Converting a REST API response to XML for a SOAP service"
    inputs:
      mode: "JSON to XML"
      inputFile: "api-response.json"
    description: "A developer integrates a modern REST API (JSON) with a legacy SOAP service that only accepts XML. The JSON response with nested user objects and arrays is converted to well-formed XML. Array items become repeated elements, nested objects become child elements, and the output includes proper XML declaration and indentation."
  - title: "Parsing an XML configuration for a JavaScript application"
    inputs:
      mode: "XML to JSON"
      inputFile: "config.xml"
    description: "An application uses an XML configuration file with attributes like '<database host=\"localhost\" port=\"5432\"/>'. Converting to JSON produces '{\"database\": {\"@_host\": \"localhost\", \"@_port\": 5432}}'. The @_ prefix convention clearly distinguishes attributes from child elements, and numeric values are automatically parsed."
  - title: "Converting an RSS feed to JSON for a dashboard"
    inputs:
      mode: "XML to JSON"
      inputFile: "rss-feed.xml"
    description: "A developer builds a news dashboard and needs to parse RSS feeds (which are XML). Converting the RSS XML to JSON produces structured data with channel info, item arrays, and publication dates that can be directly consumed by React components. The 200-item feed converts in under a second."
faq:
  - question: "How are XML attributes represented in JSON?"
    answer: "XML attributes are represented in JSON with an '@_' prefix. For example, '<user id=\"1\" name=\"Alice\"/>' becomes '{\"user\": {\"@_id\": 1, \"@_name\": \"Alice\"}}'. This convention (used by fast-xml-parser and many other libraries) clearly distinguishes attributes from child elements. The prefix is configurable in the underlying library."
  - question: "How are XML arrays handled?"
    answer: "In XML, arrays are represented as repeated sibling elements with the same tag name. For example, '<items><item>A</item><item>B</item></items>' becomes '{\"items\": {\"item\": [\"A\", \"B\"]}}'. The converter automatically detects repeated elements and creates JSON arrays. Single elements remain as scalar values — if there's only one '<item>', it won't be wrapped in an array."
  - question: "What about CDATA sections?"
    answer: "CDATA sections ('<![CDATA[content]]>') are handled correctly. The content inside CDATA is treated as raw text and preserved in the JSON output. This is useful for XML documents that contain HTML fragments or other text that shouldn't be parsed as XML."
  - question: "Is the conversion lossless?"
    answer: "XML to JSON conversion can lose some information: XML processing instructions, comments, and namespace declarations are not preserved in JSON. The order of elements is preserved for arrays but may not be guaranteed for object keys (though modern JavaScript engines preserve insertion order). JSON to XML conversion preserves all data but may not reproduce the exact original formatting."
  - question: "What about XML namespaces?"
    answer: "XML namespaces (xmlns declarations) are preserved as attributes in the JSON output. For example, '<root xmlns:ns=\"http://example.com\">' will include the namespace as an attribute. However, namespace-prefixed element names are kept as-is (e.g., 'ns:element' becomes a JSON key 'ns:element'), which may require special handling in your code."
  - question: "Can I convert large XML files?"
    answer: "Yes, within browser memory limits. Files up to 10MB typically convert instantly on modern devices. For very large XML files (50MB+), you may experience slowness or memory issues. The fast-xml-parser library used by this tool is one of the fastest XML parsers available — benchmarks show it parsing 1MB of XML in under 50ms."
---

## When to Convert JSON to XML

Common scenarios for JSON → XML conversion:

- **SOAP services**: Legacy enterprise systems often require XML
- **XML APIs**: Some platforms (RSS, Atom, SAML) are XML-native
- **Document generation**: XML-based formats like SVG, XHTML, and Office documents
- **Regulatory compliance**: Some industries require XML for data exchange (HL7, XBRL)

## When to Convert XML to JSON

Common scenarios for XML → JSON conversion:

- **Modern web apps**: JavaScript works natively with JSON, not XML
- **API modernization**: Migrating legacy XML APIs to JSON REST endpoints
- **Data processing**: JSON is easier to query and transform with JavaScript/Python
- **RSS/Atom feeds**: Parse XML feeds into JSON for web dashboards

## Format Comparison

```xml
<!-- XML -->                    // JSON
<user id="1">                  {"user": {
  <name>Alice</name>              "@_id": 1,
  <roles>                         "name": "Alice",
    <role>admin</role>            "roles": {
    <role>editor</role>             "role": ["admin", "editor"]
  </roles>                       }
</user>                        }}
```

| Feature | JSON | XML |
|---------|------|-----|
| Data types | String, number, boolean, null, array, object | Text only (types via schemas) |
| Attributes | Not native | First-class (`id="1"`) |
| Comments | Not supported | `<!-- comment -->` |
| Namespaces | Not supported | Full namespace support |
| Schema validation | JSON Schema | XSD, DTD, RelaxNG |
| File size | Smaller | Larger (verbose tags) |
| Parsing speed | Faster | Slower |
| Human readability | Good | Good (but verbose) |

## Attribute Convention

This tool uses the `@_` prefix convention to represent XML attributes in JSON:

| XML | JSON |
|-----|------|
| `<div class="main">` | `{"div": {"@_class": "main"}}` |
| `<img src="photo.jpg" alt="Photo"/>` | `{"img": {"@_src": "photo.jpg", "@_alt": "Photo"}}` |
| `<input type="text" value="hello"/>` | `{"input": {"@_type": "text", "@_value": "hello"}}` |

## How It Works

This tool uses [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser), one of the fastest and most reliable XML parsers for JavaScript with 18M+ weekly npm downloads. All conversion happens in your browser — no data is sent to any server.

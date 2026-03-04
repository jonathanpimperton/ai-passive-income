---
name: "Base64 Encode/Decode"
slug: "base64-encode-decode"
category: "utility"
description: "Encode text or files to Base64 and decode Base64 back instantly."
keywords:
  - "Base64 encoder"
  - "Base64 decoder"
  - "Base64 encode online"
  - "Base64 decode online"
  - "Base64 converter"
  - "text to Base64"
relatedTools:
  - "url-encode-decode"
  - "jwt-decoder"
  - "json-formatter"
  - "password-generator"
  - "csv-json"
workedExamples:
  - title: "Encoding API credentials for HTTP headers"
    inputs:
      mode: "Encode"
      text: "username:password123"
    description: "A developer needs to send HTTP Basic Authentication credentials. The username:password pair is encoded to Base64 ('dXNlcm5hbWU6cGFzc3dvcmQxMjM=') and placed in the Authorization header as 'Basic dXNlcm5hbWU6cGFzc3dvcmQxMjM='. This is a standard requirement for REST APIs using Basic Auth."
  - title: "Decoding a Base64-encoded email attachment"
    inputs:
      mode: "Decode"
      text: "SGVsbG8gV29ybGQh"
    description: "An email arrives with a Base64-encoded body (MIME encoding). Pasting the encoded string into the decoder instantly reveals the original text 'Hello World!'. MIME email encoding uses Base64 to safely transmit binary content through text-only email protocols."
  - title: "Embedding a small image in CSS as a data URI"
    inputs:
      mode: "Encode (File)"
      file: "icon.png (2KB)"
    description: "A web developer encodes a small PNG icon to Base64 to embed it directly in CSS as a data URI, eliminating an HTTP request. The 2KB PNG becomes approximately 2.7KB in Base64 (33% overhead), but saves a network round-trip. This technique is ideal for icons under 5KB."
faq:
  - question: "What is Base64 encoding?"
    answer: "Base64 is a binary-to-text encoding scheme that converts binary data into a string of 64 ASCII characters (A-Z, a-z, 0-9, +, /). It's used to safely transmit binary data through text-only channels like email (MIME), URLs, JSON, and HTML. The encoded output is approximately 33% larger than the input because every 3 bytes of input become 4 characters of output."
  - question: "Why is Base64 needed?"
    answer: "Many protocols and formats only support ASCII text. If you need to include binary data (images, files, non-ASCII characters) in JSON, XML, email, or URL parameters, you must encode it as text first. Base64 provides a standard, safe way to do this. It's also used for HTTP Basic Authentication, data URIs in HTML/CSS, and storing binary data in databases that only support text."
  - question: "Is Base64 encryption?"
    answer: "No. Base64 is encoding, not encryption. It provides no security whatsoever — anyone can decode a Base64 string instantly. It's a data format, like converting a number to hexadecimal. Never use Base64 to 'protect' passwords, API keys, or sensitive data. For actual security, use proper encryption (AES, RSA) or hashing (bcrypt, SHA-256)."
  - question: "What is the size overhead of Base64?"
    answer: "Base64 encoding increases data size by approximately 33%. Every 3 bytes of input produce 4 characters of output (plus padding). A 1MB file becomes roughly 1.33MB when Base64-encoded. This overhead matters for large files but is negligible for small strings. When line-wrapped (76 characters per line, MIME standard), the overhead increases slightly due to the added newline characters."
  - question: "Does this tool handle Unicode and emoji?"
    answer: "Yes. This tool uses UTF-8 encoding before Base64 encoding, which correctly handles all Unicode characters including non-Latin scripts (Chinese, Japanese, Arabic, etc.) and emoji. The standard btoa() function in browsers only handles Latin-1 characters, but our implementation uses TextEncoder/TextDecoder for full Unicode support."
  - question: "What is the difference between Base64 and Base64URL?"
    answer: "Standard Base64 uses '+' and '/' as the 63rd and 64th characters, with '=' for padding. Base64URL (used in JWTs and URLs) replaces '+' with '-' and '/' with '_', and often omits padding. This tool uses standard Base64 (RFC 4648). For JWT tokens, use our JWT Decoder tool which handles Base64URL automatically."
---

## What Is Base64?

Base64 is a group of binary-to-text encoding schemes that represent binary data as an ASCII string. The name comes from the 64 characters in its alphabet:

- **26 uppercase letters:** A–Z
- **26 lowercase letters:** a–z
- **10 digits:** 0–9
- **2 symbols:** + and /
- **Padding character:** =

### How It Works

Base64 encoding takes every 3 bytes (24 bits) of input and splits them into 4 groups of 6 bits each. Each 6-bit group maps to one of the 64 characters. If the input length isn't a multiple of 3, the output is padded with `=` characters.

```
Input:    M        a        n
ASCII:    77       97       110
Binary:   01001101 01100001 01101110
6-bit:    010011 010110 000101 101110
Base64:   T        W        F        u
```

## Common Use Cases

| Use Case | Why Base64? |
|----------|-------------|
| **Email attachments** | SMTP only supports 7-bit ASCII. MIME encodes attachments as Base64. |
| **Data URIs** | Embed images directly in HTML/CSS without separate HTTP requests. |
| **HTTP Basic Auth** | Credentials are Base64-encoded in the `Authorization` header. |
| **JSON/XML payloads** | Safely include binary data in text-only formats. |
| **API tokens** | Many APIs encode token components as Base64 (e.g., JWT). |

## Base64 vs Other Encodings

| Encoding | Alphabet Size | Overhead | Use Case |
|----------|--------------|----------|----------|
| **Base64** | 64 chars | ~33% | General binary-to-text |
| **Base32** | 32 chars | ~60% | Case-insensitive contexts |
| **Hex** | 16 chars | 100% | Debugging, hash display |
| **URL encoding** | ASCII | Variable | URLs and query strings |

## Privacy & Security

All encoding and decoding happens entirely in your browser. No data is sent to any server. This tool uses the Web Crypto API's `TextEncoder` and native `btoa`/`atob` functions — the same primitives used by your browser internally.

---
name: "URL Encode/Decode"
slug: "url-encode-decode"
category: "utility"
description: "URL encoder and decoder — percent-encode or decode text with component and full-URI modes, instantly and entirely in your browser."
keywords:
  - "URL encoder"
  - "URL decoder"
  - "URL encode online"
  - "URL decode online"
  - "percent encoding"
  - "encodeURIComponent"
relatedTools:
  - "base64-encode-decode"
  - "jwt-decoder"
  - "json-formatter"
  - "qr-code"
  - "password-generator"
workedExamples:
  - title: "Encoding a search query parameter"
    inputs:
      mode: "Encode (Component)"
      text: "best café in São Paulo"
    description: "A developer needs to pass a user's search query as a URL parameter. The text 'best café in São Paulo' contains accented characters that aren't safe in URLs. Component encoding produces 'best%20caf%C3%A9%20in%20S%C3%A3o%20Paulo', which can be safely appended to a URL like '?q=best%20caf%C3%A9%20in%20S%C3%A3o%20Paulo'."
  - title: "Decoding a URL from analytics"
    inputs:
      mode: "Decode"
      text: "https%3A%2F%2Fexample.com%2Fpath%3Fq%3Dhello%20world%26lang%3Den"
    description: "A marketing analyst receives a fully-encoded URL from their analytics platform. Decoding reveals the original URL: 'https://example.com/path?q=hello world&lang=en'. This makes it easy to understand which pages users are visiting without mentally parsing percent-encoded characters."
  - title: "Encoding a full URL with spaces"
    inputs:
      mode: "Encode (Full URI)"
      text: "https://example.com/my page?name=John Doe"
    description: "A developer has a URL with spaces that needs to be valid. Using Full URI mode preserves the URL structure (://?=) while encoding only the spaces: 'https://example.com/my%20page?name=John%20Doe'. Unlike Component mode, this preserves the URL's structural characters."
faq:
  - question: "What is URL encoding?"
    answer: "URL encoding (also called percent-encoding) converts characters into a format that can be safely transmitted in a URL. Characters that aren't allowed in URLs (spaces, special characters, non-ASCII) are replaced with a percent sign followed by their hexadecimal value. For example, a space becomes %20, an ampersand becomes %26, and a forward slash becomes %2F."
  - question: "What is the difference between Component and Full URI encoding?"
    answer: "Component encoding (encodeURIComponent) encodes everything except A-Z, a-z, 0-9, and - _ . ! ~ * ' ( ). Use it for query parameter values. Full URI encoding (encodeURI) preserves URL structure characters like : / ? # [ ] @ ! $ & ' ( ) * + , ; = so the URL remains navigable. Use it when encoding a complete URL that just has spaces or non-ASCII characters."
  - question: "Why do I see %20 instead of + for spaces?"
    answer: "Both %20 and + represent spaces in URLs, but in different contexts. %20 is the standard percent-encoding for spaces (RFC 3986) and works everywhere. The + sign for spaces is only valid in the query string portion of a URL (application/x-www-form-urlencoded format, used by HTML forms). Our tool uses %20 because it's universally correct."
  - question: "Which characters need to be URL-encoded?"
    answer: "Any character not in the 'unreserved' set must be encoded: unreserved characters are A-Z, a-z, 0-9, hyphen (-), underscore (_), period (.), and tilde (~). Reserved characters like : / ? # @ have special meaning in URLs and must be encoded when used as data (not as delimiters). All non-ASCII characters (accented letters, Chinese characters, emoji) must always be encoded."
  - question: "Can I URL-encode binary data?"
    answer: "Technically yes — every byte can be percent-encoded — but it's extremely inefficient. A 1KB binary file would become roughly 3KB of percent-encoded text. For binary data in URLs, use Base64 encoding first (our Base64 tool), then URL-encode the Base64 string if needed. This is how data URIs and many APIs handle binary payloads."
  - question: "Is URL encoding the same as HTML encoding?"
    answer: "No. URL encoding uses percent signs (%20, %3C) to make characters safe for URLs. HTML encoding uses ampersand-based entities (&amp;, &lt;, &#39;) to make characters safe for HTML documents. They solve different problems: URL encoding ensures valid URLs, HTML encoding prevents XSS attacks and display issues in web pages."
---

## What Is URL Encoding?

URL encoding (percent-encoding) is a mechanism for encoding characters that aren't allowed in URLs. It replaces unsafe characters with a `%` sign followed by two hexadecimal digits representing the character's byte value.

### Why It Exists

URLs can only contain a limited set of characters from the US-ASCII character set. The [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) specification defines which characters are allowed:

- **Unreserved characters** (always safe): `A-Z a-z 0-9 - _ . ~`
- **Reserved characters** (have special URL meaning): `: / ? # [ ] @ ! $ & ' ( ) * + , ; =`
- **Everything else** must be percent-encoded

## Component vs Full URI Mode

| Feature | Component Mode | Full URI Mode |
|---------|---------------|---------------|
| **Function** | `encodeURIComponent()` | `encodeURI()` |
| **Encodes** | Everything except `A-Z a-z 0-9 - _ . ! ~ * ' ( )` | Only spaces and non-ASCII characters |
| **Preserves** | Nothing else | `: / ? # @ ! $ & ' ( ) * + , ; =` |
| **Use for** | Query parameter values | Complete URLs with minor issues |

### When to Use Each

**Component mode** — Use when encoding a single value that will be placed into a URL:
```
// Encoding a search query for a URL parameter
?search=hello%20world%26more  ← correct (& is encoded)
```

**Full URI mode** — Use when you have a complete URL that just needs spaces or accented characters fixed:
```
https://example.com/my page → https://example.com/my%20page  ← correct (structure preserved)
```

## Common Encoded Characters

| Character | Encoded | Description |
|-----------|---------|-------------|
| (space) | `%20` | Most common encoding |
| `!` | `%21` | Exclamation mark |
| `#` | `%23` | Hash/fragment |
| `$` | `%24` | Dollar sign |
| `&` | `%26` | Ampersand (query separator) |
| `+` | `%2B` | Plus sign |
| `/` | `%2F` | Forward slash |
| `:` | `%3A` | Colon |
| `=` | `%3D` | Equals sign |
| `?` | `%3F` | Question mark |
| `@` | `%40` | At sign |

## Privacy

All encoding and decoding happens in your browser using JavaScript's native `encodeURIComponent()` and `decodeURIComponent()` functions. No data is sent to any server.

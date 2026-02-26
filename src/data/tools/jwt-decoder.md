---
name: "JWT Decoder"
slug: "jwt-decoder"
category: "utility"
description: "Decode JWT tokens to inspect header, payload, claims, and expiration — free, instant, private. No server needed."
keywords:
  - "JWT decoder"
  - "JWT parser"
  - "decode JWT online"
  - "JWT token viewer"
  - "JSON Web Token decoder"
  - "JWT debugger"
relatedTools:
  - "base64-encode-decode"
  - "json-formatter"
  - "url-encode-decode"
  - "password-generator"
  - "csv-json"
workedExamples:
  - title: "Debugging an expired authentication token"
    inputs:
      token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNzA0MDY3MjAwfQ.abc123"
    description: "A developer's API calls are returning 401 Unauthorized. Pasting the JWT into the decoder reveals the 'exp' claim is set to 1704067200 (January 1, 2024), which has already passed. The expiry badge shows 'Expired 2 years ago' in red. The fix is to refresh the token using the refresh token endpoint."
  - title: "Inspecting user roles from an OAuth token"
    inputs:
      token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQ1NiIsInJvbGUiOiJhZG1pbiIsInNjb3BlIjoicmVhZCB3cml0ZSJ9.signature"
    description: "A team lead needs to verify what permissions a user's token grants. The decoder shows the payload contains 'role: admin' and 'scope: read write'. The header reveals it uses RS256 (RSA + SHA-256), meaning the server uses public/private key pairs for signing — more secure than HMAC-based tokens."
  - title: "Verifying a token's issuer and audience"
    inputs:
      token: "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiYXBpLmV4YW1wbGUuY29tIiwic3ViIjoiam9obiJ9.sig"
    description: "Before accepting a JWT from a third-party service, a developer checks the 'iss' (issuer) and 'aud' (audience) claims. The decoder shows 'iss: auth.example.com' and 'aud: api.example.com', confirming the token was issued by the correct auth server for the correct API. This is a critical security check to prevent token misuse."
faq:
  - question: "What is a JWT (JSON Web Token)?"
    answer: "A JWT is a compact, URL-safe token format used for securely transmitting information between parties. It consists of three Base64URL-encoded parts separated by dots: a header (algorithm and type), a payload (claims/data), and a signature. JWTs are the most common format for authentication tokens in modern web applications — when you log into a website, the server likely issues you a JWT."
  - question: "Does this tool verify the JWT signature?"
    answer: "No. This tool only decodes (reads) the JWT — it does not verify the signature. Signature verification requires the secret key (for HMAC algorithms) or the public key (for RSA/ECDSA). The tool shows you the algorithm used and the raw signature, but cannot confirm if the token was tampered with. For signature verification, you need the server's key."
  - question: "What are JWT claims?"
    answer: "Claims are the key-value pairs in the JWT payload. Standard registered claims include: 'iss' (issuer — who created the token), 'sub' (subject — who the token is about), 'aud' (audience — who the token is for), 'exp' (expiration time), 'nbf' (not before), 'iat' (issued at), and 'jti' (JWT ID). Applications can also add custom claims like 'role', 'email', or 'permissions'."
  - question: "Is it safe to decode JWTs in the browser?"
    answer: "Yes — JWT payloads are not encrypted, just encoded. Anyone with the token can decode it; that's by design. The security of a JWT comes from the signature (which prevents tampering), not from hiding the payload. Never put sensitive data like passwords in a JWT payload. This tool decodes entirely in your browser — no data is sent to any server."
  - question: "What is the difference between HS256 and RS256?"
    answer: "HS256 (HMAC + SHA-256) uses a single shared secret key for both signing and verification. It's simpler but requires the secret to be shared with any service that needs to verify tokens. RS256 (RSA + SHA-256) uses a private key for signing and a public key for verification. It's more secure for distributed systems because the public key can be shared freely without compromising signing ability."
  - question: "What does Base64URL encoding mean?"
    answer: "Base64URL is a variant of Base64 designed for URLs. It replaces '+' with '-' and '/' with '_' (which have special meaning in URLs), and typically omits the '=' padding. JWTs use Base64URL instead of standard Base64 so tokens can be safely passed in URL query parameters, HTTP headers, and cookies without encoding issues."
---

## What Is a JWT?

A JSON Web Token (JWT, pronounced "jot") is a compact token format defined in [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519). It's the industry standard for authentication and authorization in modern web applications.

### Structure

A JWT consists of three parts separated by dots (`.`):

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
└──────── Header ────────┘└──────── Payload ────────┘└──────────── Signature ────────────┘
```

1. **Header** — Algorithm (`alg`) and token type (`typ`)
2. **Payload** — Claims (user data, permissions, expiry)
3. **Signature** — Cryptographic verification of header + payload

### Standard Claims

| Claim | Full Name | Description |
|-------|-----------|-------------|
| `iss` | Issuer | Who created and signed the token |
| `sub` | Subject | Who the token is about (usually user ID) |
| `aud` | Audience | Who the token is intended for |
| `exp` | Expiration | Unix timestamp when the token expires |
| `nbf` | Not Before | Unix timestamp before which the token is invalid |
| `iat` | Issued At | Unix timestamp when the token was created |
| `jti` | JWT ID | Unique identifier to prevent token replay |

## Common Algorithms

| Algorithm | Type | Key | Use Case |
|-----------|------|-----|----------|
| **HS256** | HMAC | Shared secret | Simple apps, single-server |
| **HS384** | HMAC | Shared secret | Higher security HMAC |
| **RS256** | RSA | Public/private key pair | Distributed systems, microservices |
| **ES256** | ECDSA | Public/private key pair | Mobile apps, IoT (smaller keys) |

## Security Best Practices

- **Always verify signatures** server-side before trusting claims
- **Check `exp`** — never accept expired tokens
- **Validate `iss` and `aud`** — ensure the token is from the expected source
- **Use short expiration times** — 15 minutes for access tokens, hours/days for refresh tokens
- **Never store sensitive data** in the payload — it's readable by anyone with the token
- **Use HTTPS** — JWTs sent over HTTP can be intercepted

## Privacy

This decoder runs entirely in your browser. Your JWT is never sent to any server. The token is split on dots, Base64URL-decoded, and JSON-parsed using native JavaScript functions.

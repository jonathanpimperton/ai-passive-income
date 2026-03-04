---
name: "JSON ↔ YAML Converter"
slug: "json-yaml"
category: "file-tools"
description: "Convert between JSON and YAML formats instantly."
keywords:
  - "JSON to YAML converter"
  - "YAML to JSON converter"
  - "convert JSON to YAML online"
  - "convert YAML to JSON online"
  - "JSON YAML converter"
  - "YAML to JSON online free"
relatedTools:
  - "json-formatter"
  - "json-xml"
  - "csv-json"
  - "markdown-html"
  - "base64-encode-decode"
workedExamples:
  - title: "Converting a Docker Compose file to JSON for programmatic editing"
    inputs:
      mode: "YAML to JSON"
      inputFile: "docker-compose.yml"
    description: "A DevOps engineer needs to programmatically modify a Docker Compose configuration. Converting the YAML to JSON produces a structured object that can be manipulated with jq or any JSON library. The nested service definitions, port mappings, and volume mounts are all preserved with correct data types — numbers stay as numbers, booleans as booleans."
  - title: "Converting a JSON API schema to YAML for Kubernetes config"
    inputs:
      mode: "JSON to YAML"
      inputFile: "deployment.json"
    description: "A developer has a Kubernetes deployment manifest in JSON format from an API export, but their team uses YAML for all Kubernetes configs. Converting produces clean, human-readable YAML with proper indentation. The 180-line JSON becomes 120 lines of YAML — more compact because YAML doesn't need braces, brackets, or quotes for simple strings."
  - title: "Converting CI/CD pipeline config between formats"
    inputs:
      mode: "JSON to YAML"
      inputFile: "pipeline.json"
    description: "A team is migrating from a CI system that uses JSON configs to one that uses YAML (like GitHub Actions). Converting the 50-step pipeline configuration takes under a second. Arrays become dash-prefixed lists, nested objects become indented blocks, and the overall structure is preserved exactly."
faq:
  - question: "What is the difference between JSON and YAML?"
    answer: "JSON uses braces {}, brackets [], quotes, and commas for structure. It's strict and machine-friendly. YAML uses indentation and colons for structure — no braces or brackets needed. YAML supports comments (# comment), multi-line strings, and anchors/aliases for reuse. JSON is a subset of YAML (valid JSON is valid YAML). YAML is preferred for configuration files; JSON is preferred for data exchange and APIs."
  - question: "Can YAML comments survive conversion to JSON and back?"
    answer: "No. JSON does not support comments, so any YAML comments are lost when converting to JSON. If you convert JSON back to YAML, the comments will not be restored. This is an inherent limitation — not a bug. If you need to preserve comments, keep a copy of the original YAML file."
  - question: "How does YAML handle data types?"
    answer: "YAML automatically infers types: 'true'/'false' become booleans, '42' becomes an integer, '3.14' becomes a float, 'null'/'~' become null, and unquoted strings without special characters become strings. This can cause surprises — for example, 'yes' becomes boolean true, and '1.0' becomes a float. To force a string, wrap it in quotes: '\"yes\"' or \"'1.0'\"."
  - question: "Is YAML a superset of JSON?"
    answer: "Yes, as of YAML 1.2. Any valid JSON document is also valid YAML. This means you can paste JSON directly into a YAML parser and it will work. However, YAML adds features that JSON doesn't have: comments, multi-line strings (| and >), anchors (&anchor/*alias), type tags (!!str, !!int), and more compact syntax."
  - question: "Which format should I use for configuration files?"
    answer: "YAML is generally preferred for human-edited configuration files (Docker Compose, Kubernetes, GitHub Actions, Ansible) because it's more readable and supports comments. JSON is preferred for machine-generated or machine-consumed data (API responses, package.json, tsconfig.json) because it's unambiguous and universally supported. Use YAML when humans read it; use JSON when machines read it."
  - question: "What happens to YAML anchors and aliases during conversion?"
    answer: "YAML anchors (&name) and aliases (*name) are resolved during conversion to JSON. The referenced data is expanded inline — each alias becomes a full copy of the anchored data. This means the JSON output may be larger than the YAML input if anchors are used extensively. Converting back to YAML will not recreate the anchors."
---

## When to Convert JSON to YAML

Common scenarios for JSON → YAML conversion:

- **Kubernetes configs**: Convert JSON exports to YAML for human-readable deployment manifests
- **CI/CD pipelines**: GitHub Actions, GitLab CI, and CircleCI all use YAML
- **Docker Compose**: Compose files are always YAML
- **Ansible playbooks**: Infrastructure as code in YAML format
- **Human editing**: YAML is easier to read and edit by hand than JSON

## When to Convert YAML to JSON

Common scenarios for YAML → JSON conversion:

- **API integration**: Most REST APIs expect JSON, not YAML
- **Programmatic editing**: JSON is easier to manipulate with code (jq, Python, JavaScript)
- **Validation**: JSON schemas are more common than YAML schemas
- **Debugging**: JSON's strict syntax makes errors more obvious

## Format Comparison

```
# YAML                          // JSON
name: CalcRun                   {"name": "CalcRun",
version: 1.0                     "version": 1.0,
features:                        "features": [
  - calculators                    "calculators",
  - converters                     "converters"
                                 ]}
```

| Feature | JSON | YAML |
|---------|------|------|
| Comments | Not supported | `# comment` |
| Quotes required | Always (for keys/strings) | Only when needed |
| Multi-line strings | Escaped `\n` | `\|` (literal) or `>` (folded) |
| Data reuse | Not supported | Anchors `&` and aliases `*` |
| File size | Larger (verbose) | Smaller (compact) |
| Parsing speed | Faster | Slower |
| Ambiguity | None | Some (`yes` = boolean) |

## How It Works

This tool uses [js-yaml](https://github.com/nodeca/js-yaml), the most popular YAML library for JavaScript with 44M+ weekly npm downloads. It fully supports the YAML 1.2 specification. All conversion happens in your browser — no data is sent to any server.

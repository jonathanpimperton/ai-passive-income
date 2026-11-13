/**
 * JSON <-> YAML conversion for the JSON/YAML tool (DEVTOOLS-12).
 *
 * - Multi-document YAML (Kubernetes manifests, "---" separated) converts to a
 *   JSON array, one item per document, instead of failing.
 * - The default schema is YAML 1.2 Core, so dates stay as written instead of
 *   becoming ISO timestamps. A JSON (strict) schema and the YAML 1.1 style
 *   extended schema (timestamps, binary) are available as options.
 * - .inf / .nan have no JSON form; they are written as strings with a
 *   warning instead of silently becoming null.
 * - Converting to JSON expands aliases, so an "alias bomb" can explode a few
 *   hundred bytes into billions of values. Expansion is capped and recursive
 *   aliases are refused, so the page never hangs or crashes.
 *
 * js-yaml is passed in by the caller so the component can load it lazily.
 */
import { toJsValue, type JsonNode } from './json-lossless';

export type YamlSchemaChoice = 'core' | 'json' | 'extended';

interface YamlMark {
  line: number;
  column: number;
}

export interface JsYamlModule {
  loadAll(str: string, iterator?: undefined, options?: Record<string, unknown>): unknown[];
  dump(value: unknown, options?: Record<string, unknown>): string;
  CORE_SCHEMA: unknown;
  JSON_SCHEMA: unknown;
  DEFAULT_SCHEMA: { extend(definition: Record<string, unknown>): unknown };
  Type: new (tag: string, definition: Record<string, unknown>) => unknown;
}

/** Maximum values written when expanding aliases into JSON. */
export const MAX_EXPANDED_VALUES = 1_000_000;

export type YamlToJsonResult =
  | { ok: true; json: string; warnings: string[]; documents: number }
  | { ok: false; error: string };

class ExpansionLimit extends Error {}
class RecursiveAlias extends Error {}

function schemaFor(mod: JsYamlModule, choice: YamlSchemaChoice): unknown {
  if (choice === 'json') return mod.JSON_SCHEMA;
  if (choice === 'extended') return mod.DEFAULT_SCHEMA;
  return mod.CORE_SCHEMA;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * JSON.stringify-compatible output for loaded YAML, with an expansion budget,
 * cycle detection and explicit handling of values JSON cannot hold.
 */
export function stringifyYamlValue(
  value: unknown,
  indent: number,
  maxValues = MAX_EXPANDED_VALUES,
): { text: string; nonFinite: number } {
  const out: string[] = [];
  const nl = indent ? '\n' : '';
  const colon = indent ? ': ' : ':';
  const pad = (depth: number) => (indent ? ' '.repeat(indent * depth) : '');
  const ancestors = new Set<object>();
  let count = 0;
  let nonFinite = 0;

  const visit = (v: unknown, depth: number): void => {
    count += 1;
    if (count > maxValues) throw new ExpansionLimit();
    if (v === null || v === undefined) {
      out.push('null');
      return;
    }
    switch (typeof v) {
      case 'string':
        out.push(JSON.stringify(v));
        return;
      case 'boolean':
        out.push(v ? 'true' : 'false');
        return;
      case 'bigint':
        out.push(v.toString());
        return;
      case 'number':
        if (Number.isFinite(v)) out.push(JSON.stringify(v));
        else {
          nonFinite += 1;
          out.push(JSON.stringify(Number.isNaN(v) ? '.nan' : v > 0 ? '.inf' : '-.inf'));
        }
        return;
      default:
        break;
    }
    if (v instanceof Date) {
      out.push(Number.isNaN(v.getTime()) ? 'null' : JSON.stringify(v.toISOString()));
      return;
    }
    if (v instanceof Uint8Array) {
      out.push(JSON.stringify(bytesToBase64(v)));
      return;
    }
    if (typeof v !== 'object') {
      out.push('null');
      return;
    }
    if (ancestors.has(v)) throw new RecursiveAlias();
    ancestors.add(v);
    if (Array.isArray(v)) {
      if (v.length === 0) out.push('[]');
      else {
        out.push('[');
        v.forEach((item, k) => {
          out.push((k ? ',' : '') + nl + pad(depth + 1));
          visit(item, depth + 1);
        });
        out.push(nl + pad(depth) + ']');
      }
    } else {
      const keys = Object.keys(v);
      if (keys.length === 0) out.push('{}');
      else {
        out.push('{');
        keys.forEach((key, k) => {
          out.push((k ? ',' : '') + nl + pad(depth + 1) + JSON.stringify(key) + colon);
          visit((v as Record<string, unknown>)[key], depth + 1);
        });
        out.push(nl + pad(depth) + '}');
      }
    }
    ancestors.delete(v);
  };

  visit(value, 0);
  return { text: out.join(''), nonFinite };
}

function yamlErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'reason' in e) {
    const err = e as { reason?: string; mark?: YamlMark };
    const reason = err.reason || 'invalid YAML';
    if (err.mark) return `Line ${err.mark.line + 1}, column ${err.mark.column + 1}: ${reason}`;
    return reason.charAt(0).toUpperCase() + reason.slice(1);
  }
  if (e instanceof RangeError) return 'The YAML is nested too deeply to convert.';
  return e instanceof Error ? e.message : 'The YAML could not be read.';
}

export function yamlToJson(
  mod: JsYamlModule,
  text: string,
  opts: { schema: YamlSchemaChoice; indent: number; maxValues?: number },
): YamlToJsonResult {
  let docs: unknown[];
  try {
    docs = mod.loadAll(text, undefined, { schema: schemaFor(mod, opts.schema) });
  } catch (e) {
    return { ok: false, error: yamlErrorMessage(e) };
  }
  const value = docs.length === 0 ? null : docs.length === 1 ? docs[0] : docs;
  let result: { text: string; nonFinite: number };
  try {
    result = stringifyYamlValue(value, opts.indent, opts.maxValues);
  } catch (e) {
    if (e instanceof ExpansionLimit) {
      return {
        ok: false,
        error: `Expanding the aliases (*name) would produce more than ${(opts.maxValues ?? MAX_EXPANDED_VALUES).toLocaleString('en-US')} values, so conversion was stopped. This usually means an "alias bomb" (anchors that reference each other many times).`,
      };
    }
    if (e instanceof RecursiveAlias) {
      return { ok: false, error: 'The YAML contains a recursive alias (an anchor that refers to itself). JSON cannot represent a value that contains itself.' };
    }
    if (e instanceof RangeError) return { ok: false, error: 'The YAML is nested too deeply to convert.' };
    throw e;
  }
  const warnings: string[] = [];
  if (docs.length > 1) {
    warnings.push(`This file contains ${docs.length} YAML documents (separated by ---). They are output as a JSON array with one item per document.`);
  }
  if (result.nonFinite) {
    warnings.push(`${result.nonFinite} value${result.nonFinite === 1 ? ' is' : 's are'} .inf or .nan, which JSON cannot represent. ${result.nonFinite === 1 ? 'It was' : 'They were'} written as the strings ".inf", "-.inf" or ".nan".`);
  }
  return { ok: true, json: result.text, warnings, documents: docs.length };
}

/**
 * The dump schema writes BigInt values (whole numbers JSON holds exactly but a
 * JavaScript number cannot) as plain YAML integers, digit for digit. The tag is
 * our own so it sits beside the built-in int type instead of replacing it.
 */
function dumpSchema(mod: JsYamlModule): unknown {
  const exactInteger = new mod.Type('tag:calcrun.com,2026:exact-integer', {
    kind: 'scalar',
    resolve: (data: string) => /^-?[0-9]+$/.test(data),
    predicate: (value: unknown) => typeof value === 'bigint',
    represent: (value: bigint) => value.toString(),
  });
  return mod.DEFAULT_SCHEMA.extend({ implicit: [exactInteger] });
}

export type JsonToYamlResult = { ok: true; yaml: string; warnings: string[] } | { ok: false; error: string };

export function jsonToYaml(mod: JsYamlModule, root: JsonNode, opts: { indent: number }): JsonToYamlResult {
  const lossy: string[] = [];
  const value = toJsValue(
    root,
    (raw, becomes) => {
      if (lossy.length < 3) lossy.push(`${raw} -> ${becomes}`);
      else if (lossy.length === 3) lossy.push('...');
    },
    { exactIntegers: true },
  );
  try {
    const yaml = mod.dump(value, { indent: opts.indent, lineWidth: -1, noRefs: true, sortKeys: false, schema: dumpSchema(mod) });
    const warnings: string[] = [];
    if (lossy.length) {
      warnings.push(`Some numbers are too precise or too large for exact conversion and were rounded: ${lossy.join(', ')}. Quote them in the JSON to keep them exact.`);
    }
    return { ok: true, yaml, warnings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Conversion failed.' };
  }
}

/**
 * Does text that failed to parse as JSON look like YAML? Used to suggest
 * switching direction instead of showing only a JSON syntax error.
 */
export function looksLikeYaml(text: string): boolean {
  const t = text.trimStart();
  if (t.startsWith('{') || t.startsWith('[') || t.startsWith('"')) return false;
  return /^(---|- |[A-Za-z_][\w .-]*:(\s|$))/m.test(t);
}

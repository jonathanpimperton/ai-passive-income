/**
 * JSON <-> XML conversion for the JSON/XML tool (DEVTOOLS-05/06).
 *
 * XML -> JSON keeps every value as text: XML has no number type, so "02134",
 * "+441234567890", "0x1F" and "1.10" must come back exactly as written.
 * Broken XML is reported with a line and column instead of returning {}.
 *
 * JSON -> XML always produces one root element, valid element names and
 * escaped text, so the output is well-formed. It works from the lossless
 * JSON tree, so big numbers are written exactly as typed.
 *
 * fast-xml-parser is passed in by the caller, so the component can load it
 * lazily and the tests can import it directly.
 */
import type { JsonNode, JsonMember } from './json-lossless';

interface ValidationError {
  err: { code: string; msg: string; line: number; col?: number };
}

export interface FxpModule {
  XMLParser: new (options: Record<string, unknown>) => { parse(xml: string): unknown };
  XMLValidator: { validate(xml: string, options?: Record<string, unknown>): true | ValidationError };
}

export const ATTR_PREFIX = '@_';
export const TEXT_KEY = '#text';

export const XML_PARSE_OPTIONS: Record<string, unknown> = {
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  textNodeName: TEXT_KEY,
  allowBooleanAttributes: false,
  // Keep values as text: XML has no numbers (DEVTOOLS-05).
  parseTagValue: false,
  parseAttributeValue: false,
  // Whitespace is tidied below so mixed text keeps its word breaks.
  trimValues: false,
  processEntities: true,
  // Decodes numeric character references such as &#169; as well.
  htmlEntities: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
};

/**
 * Parser options for one conversion. The parser renames a few element names
 * that collide with built-in object members (hasOwnProperty, toString, ...)
 * to "__name"; `onReserved` lets the caller tell the user when that happens.
 */
export function xmlParseOptions(onReserved?: (name: string) => void): Record<string, unknown> {
  return {
    ...XML_PARSE_OPTIONS,
    onDangerousProperty: (name: string) => {
      onReserved?.(name);
      return '__' + name;
    },
  };
}

export type XmlToJsonResult = { ok: true; json: string; warnings: string[] } | { ok: false; error: string };

function friendlyValidationError(xml: string, e: ValidationError['err']): string {
  const where = `Line ${e.line}${e.col ? `, column ${e.col}` : ''}`;
  const firstChar = xml.trimStart()[0];
  if (firstChar !== '<') {
    return `This does not look like XML: it must start with an element such as <root> or an <?xml ...?> declaration (${where}).`;
  }
  if (e.msg === 'Start tag expected.') return `${where}: no XML element was found.`;
  if (/Multiple possible root/.test(e.msg)) {
    return `${where}: XML must have exactly one root element, but another top-level element starts here. Wrap them in one element.`;
  }
  if (/boolean attribute/.test(e.msg)) {
    const name = e.msg.match(/'([^']+)'/)?.[1];
    return `${where}: attribute ${name ? `'${name}' ` : ''}has no value. XML attributes need name="value" (element names cannot contain spaces).`;
  }
  return `${where}: ${e.msg}`;
}

/**
 * Plain-language message for an error thrown by the XML parser (a reserved
 * element name, a DOCTYPE the parser refuses, a size or depth limit). The
 * parser's own wording is only used as a last resort.
 */
export function describeParseFailure(e: unknown): string {
  const raw = (e instanceof Error ? e.message : String(e)).replace(/^\[[^\]]+\]\s*/, '');
  const short = (t: string) => (t.length > 60 ? t.slice(0, 57) + '...' : t);

  const reserved = raw.match(/Invalid name: "([^"]*)"/);
  if (reserved) {
    return `The element or attribute name "${short(reserved[1])}" is not accepted: the XML parser reserves the names "constructor", "prototype" and "__proto__". Rename it and try again.`;
  }
  const size = raw.match(/Entity "([^"]*)" size \((\d+)\) exceeds maximum allowed size \((\d+)\)/);
  if (size) {
    return `The entity "&${short(size[1])};" declared in the DOCTYPE is too long (${size[2]} characters; the limit is ${size[3]}). Shorten or remove it and try again.`;
  }
  const count = raw.match(/Entity count \((\d+)\) exceeds maximum allowed \((\d+)\)/);
  if (count) return `The DOCTYPE declares more than ${count[2]} entities, which this converter does not accept. Remove some and try again.`;
  if (/Parameter entities are not supported|Invalid entity name\s*%/.test(raw)) {
    return 'The DOCTYPE declares a parameter entity (<!ENTITY % ...>), which this converter does not support. Remove it and try again.';
  }
  if (/External entities are not supported/.test(raw)) {
    return 'The DOCTYPE declares an external entity (SYSTEM ...), which this converter never loads. Remove it and try again.';
  }
  const expanded = raw.match(/(?:Expanded content length|expansion count) limit exceeded: \d+ > (\d+)/);
  if (expanded) {
    return `Entity references expand to more than ${Number(expanded[1]).toLocaleString('en-US')} ${/length/.test(raw) ? 'characters' : 'replacements'}, which this converter does not accept. Use fewer entity references and try again.`;
  }
  if (/Maximum nested tags exceeded/.test(raw)) {
    return 'Elements are nested more than 100 levels deep, which this converter does not accept.';
  }
  return `The XML could not be converted: ${raw.length > 160 ? raw.slice(0, 157) + '...' : raw}`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Tidy the parser's whitespace without recursion:
 * - whitespace-only text between elements is dropped;
 * - text mixed with child elements is joined with single spaces;
 * - an element's own text is trimmed (as before).
 */
function tidy(root: Record<string, unknown>, mixed: string[]): void {
  const work: Array<{ obj: Record<string, unknown>; name: string }> = [{ obj: root, name: '' }];
  while (work.length) {
    const { obj, name } = work.pop()!;
    const keys = Object.keys(obj);
    const hasChildElements = keys.some((k) => k !== TEXT_KEY && !k.startsWith(ATTR_PREFIX));
    for (const key of keys) {
      const v = obj[key];
      if (key === TEXT_KEY) {
        const text = typeof v === 'string' ? v : String(v);
        if (!text.trim()) {
          delete obj[key];
        } else if (hasChildElements) {
          obj[key] = text.replace(/\s+/g, ' ').trim();
          if (mixed.length < 3 && name && !mixed.includes(name)) mixed.push(name);
        } else {
          obj[key] = text.trim();
        }
        continue;
      }
      if (key.startsWith(ATTR_PREFIX)) continue;
      const items = Array.isArray(v) ? v : [v];
      items.forEach((item, idx) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (Array.isArray(v)) v[idx] = trimmed;
          else obj[key] = trimmed;
        } else if (isPlainObject(item)) {
          work.push({ obj: item, name: key });
        }
      });
    }
  }
}

export function xmlToJson(fxp: FxpModule, xml: string, indent: number): XmlToJsonResult {
  try {
    return convertXml(fxp, xml, indent);
  } catch (e) {
    // The parser throws on some inputs that pass validation; report them
    // instead of letting the exception unmount the tool.
    return { ok: false, error: describeParseFailure(e) };
  }
}

function convertXml(fxp: FxpModule, xml: string, indent: number): XmlToJsonResult {
  const check = fxp.XMLValidator.validate(xml, { allowBooleanAttributes: false });
  if (check !== true) return { ok: false, error: friendlyValidationError(xml, check.err) };

  const reserved: string[] = [];
  const parsed = new fxp.XMLParser(
    xmlParseOptions((name) => {
      if (!reserved.includes(name)) reserved.push(name);
    }),
  ).parse(xml);
  if (!isPlainObject(parsed)) return { ok: false, error: 'No XML element was found.' };

  const topText = parsed[TEXT_KEY];
  if (typeof topText === 'string' && topText.trim()) {
    return { ok: false, error: 'There is text outside the root element. XML allows only one root element and no loose text around it.' };
  }
  delete parsed[TEXT_KEY];
  const roots = Object.keys(parsed);
  const first = roots[0];
  if (roots.length === 0) return { ok: false, error: 'No XML element was found.' };
  if (roots.length > 1 || Array.isArray(parsed[first])) {
    const names = roots.length > 1 ? roots.slice(0, 3).map((r) => `<${r}>`).join(', ') : `<${first}> (repeated)`;
    return { ok: false, error: `XML must have exactly one root element, but this has several at the top level: ${names}. Wrap them in one element.` };
  }

  const mixed: string[] = [];
  tidy(parsed, mixed);
  const warnings: string[] = [];
  if (mixed.length) {
    warnings.push(
      `${mixed.map((m) => `<${m}>`).join(', ')} mix${mixed.length === 1 ? 'es' : ''} text with child elements. The text is kept in "${TEXT_KEY}" with its pieces joined by spaces, but JSON cannot record where it sat between the child elements.`,
    );
  }
  if (reserved.length) {
    const shown = reserved.slice(0, 3);
    const more = reserved.length > 3 ? ', ...' : '';
    warnings.push(
      `${shown.map((n) => `<${n}>`).join(', ')}${more} ${reserved.length === 1 ? 'is a name' : 'are names'} that JavaScript objects already use, so ${reserved.length === 1 ? 'it appears' : 'they appear'} in the JSON as ${shown.map((n) => `"__${n}"`).join(', ')}${more}.`,
    );
  }
  return { ok: true, json: JSON.stringify(parsed, null, indent), warnings };
}

// ---------------------------------------------------------------------------
// XML names (XML 1.0 fifth edition Name production minus ':', limited to the
// Basic Multilingual Plane because some XML parsers still reject astral
// characters such as emoji in names)
// ---------------------------------------------------------------------------

const cp = (n: number) => String.fromCodePoint(n);
const range = (a: number, b: number) => `${cp(a)}-${cp(b)}`;
const NAME_START_CHARS =
  'A-Z_a-z' +
  [
    range(0xc0, 0xd6), range(0xd8, 0xf6), range(0xf8, 0x2ff), range(0x370, 0x37d), range(0x37f, 0x1fff),
    range(0x200c, 0x200d), range(0x2070, 0x218f), range(0x2c00, 0x2fef), range(0x3001, 0xd7ff),
    range(0xf900, 0xfdcf), range(0xfdf0, 0xfffd),
  ].join('');
const NAME_CHARS = NAME_START_CHARS + '\\-.0-9' + cp(0xb7) + range(0x300, 0x36f) + range(0x203f, 0x2040);
const NCNAME_RE = new RegExp(`^[${NAME_START_CHARS}][${NAME_CHARS}]*$`, 'u');
const NAME_START_RE = new RegExp(`^[${NAME_START_CHARS}]$`, 'u');
const NAME_CHAR_RE = new RegExp(`^[${NAME_CHARS}]$`, 'u');

/** True for a valid XML name without a namespace prefix. */
export function isNcName(name: string): boolean {
  return NCNAME_RE.test(name);
}

/** Turn any string into a valid XML name without a prefix, e.g. "first name" -> "first_name". */
export function toNcName(name: string): string {
  const chars = Array.from(name).map((ch) => (NAME_CHAR_RE.test(ch) ? ch : '_'));
  if (chars.length === 0) return '_';
  if (!NAME_START_RE.test(chars[0])) chars.unshift('_');
  return chars.join('');
}

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

const REPLACEMENT = String.fromCharCode(0xfffd);

/** Replace characters XML 1.0 cannot contain; returns the count replaced. */
function cleanChars(s: string): { text: string; replaced: number } {
  let replaced = 0;
  let out = '';
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    let bad = false;
    let width = 1;
    if (c < 0x20) bad = c !== 0x09 && c !== 0x0a && c !== 0x0d;
    else if (c === 0xfffe || c === 0xffff) bad = true;
    else if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) width = 2;
      else bad = true;
    } else if (c >= 0xdc00 && c <= 0xdfff) bad = true;
    if (bad) {
      out += s.slice(last, i) + REPLACEMENT;
      last = i + 1;
      replaced++;
    } else if (width === 2) {
      i++;
    }
  }
  return { text: replaced ? out + s.slice(last) : s, replaced };
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#9;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');
}

// ---------------------------------------------------------------------------
// JSON -> XML
// ---------------------------------------------------------------------------

export interface JsonToXmlOptions {
  /** Root element used when the JSON is not a single named object. */
  rootName: string;
  /** Spaces per level; 0 writes everything on one line. */
  indent: number;
}

export type JsonToXmlResult = { ok: true; xml: string; warnings: string[] } | { ok: false; error: string };

function compactJson(node: JsonNode): string {
  // Small helper for attribute values that are objects/arrays (rare).
  switch (node.kind) {
    case 'object':
      return `{${node.members.map((m) => `${m.keyRaw}:${compactJson(m.value)}`).join(',')}}`;
    case 'array':
      return `[${node.items.map(compactJson).join(',')}]`;
    default:
      return node.raw;
  }
}

function scalarText(node: JsonNode): string | null {
  if (node.kind === 'string') return node.value;
  if (node.kind === 'number') return node.raw;
  if (node.kind === 'literal') return node.raw === 'null' ? null : node.raw;
  return compactJson(node);
}

const isContainer = (n: JsonNode) => n.kind === 'object' || n.kind === 'array';

export function jsonToXml(root: JsonNode, opts: JsonToXmlOptions): JsonToXmlResult {
  const rootName = opts.rootName.trim() || 'root';
  if (!isNcName(rootName)) {
    return { ok: false, error: `"${rootName}" is not a valid XML element name. Use letters, digits, "_", "-" or "." and start with a letter or "_".` };
  }
  const indent = Math.max(0, Math.floor(opts.indent));
  const nl = indent ? '\n' : '';
  const pad = (depth: number) => (indent ? ' '.repeat(indent * depth) : '');

  const renamed = new Map<string, string>();
  const mergedAttrs = new Set<string>();
  const emptyArrays = new Set<string>();
  let badChars = 0;

  const text = (s: string, attr: boolean) => {
    const c = cleanChars(s);
    badChars += c.replaced;
    return attr ? escapeAttr(c.text) : escapeText(c.text);
  };

  /** Resolve an element or attribute name against the declared namespace prefixes. */
  const nameFor = (key: string, scope: Set<string>, isAttr: boolean): string => {
    if (isAttr && (key === 'xmlns' || (key.startsWith('xmlns:') && isNcName(key.slice(6))))) return key;
    const parts = key.split(':');
    if (parts.length === 2 && isNcName(parts[0]) && isNcName(parts[1]) && (scope.has(parts[0]) || parts[0] === 'xml')) return key;
    if (isNcName(key)) return key;
    const safe = toNcName(key);
    if (!renamed.has(key)) renamed.set(key, safe);
    return safe;
  };

  type Task = string | { name: string; node: JsonNode; depth: number; scope: Set<string> };
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', nl];
  const stack: Task[] = [];

  // Decide the root: a single named object becomes the root element itself.
  if (root.kind === 'object' && root.members.length === 1) {
    const only = root.members[0];
    if (!only.key.startsWith(ATTR_PREFIX) && only.key !== TEXT_KEY && only.value.kind === 'object') {
      stack.push({ name: only.key, node: only.value, depth: 0, scope: new Set() });
    }
  }
  if (stack.length === 0) stack.push({ name: rootName, node: root, depth: 0, scope: new Set() });

  while (stack.length) {
    const task = stack.pop()!;
    if (typeof task === 'string') {
      out.push(task);
      continue;
    }
    const { node, depth } = task;
    let scope = task.scope;

    if (node.kind === 'object') {
      const attrs: JsonMember[] = [];
      const textParts: string[] = [];
      const children: JsonMember[] = [];
      for (const m of node.members) {
        if (m.key.startsWith(ATTR_PREFIX) && m.key.length > ATTR_PREFIX.length) attrs.push(m);
        else if (m.key === TEXT_KEY && !isContainer(m.value)) {
          const t = scalarText(m.value);
          if (t !== null) textParts.push(t);
        } else children.push(m);
      }
      // Namespace declarations on this element apply to it and its children.
      const declared = attrs.map((a) => a.key.slice(ATTR_PREFIX.length)).filter((k) => k.startsWith('xmlns:')).map((k) => k.slice(6));
      if (declared.length) scope = new Set([...scope, ...declared]);
      const name = nameFor(task.name, scope, false);
      // XML allows each attribute once. Repeated keys, or keys that map to the
      // same name after renaming, keep the last value (as most JSON parsers do).
      const attrValues = new Map<string, string>();
      for (const a of attrs) {
        const attrName = nameFor(a.key.slice(ATTR_PREFIX.length), scope, true);
        const value = scalarText(a.value);
        if (attrValues.has(attrName)) mergedAttrs.add(attrName);
        attrValues.set(attrName, value === null ? '' : text(value, true));
      }
      const attrText = [...attrValues].map(([attrName, value]) => ` ${attrName}="${value}"`).join('');

      // Expand children: arrays become repeated elements with the member's name.
      const childTasks: Task[] = [];
      for (const m of children) {
        if (m.value.kind === 'array') {
          if (m.value.items.length === 0) emptyArrays.add(m.key);
          for (const item of m.value.items) childTasks.push({ name: m.key, node: item, depth: depth + 1, scope });
        } else {
          childTasks.push({ name: m.key, node: m.value, depth: depth + 1, scope });
        }
      }
      const ownText = textParts.join('');
      if (childTasks.length === 0) {
        out.push(ownText ? `${pad(depth)}<${name}${attrText}>${text(ownText, false)}</${name}>` : `${pad(depth)}<${name}${attrText}/>`);
        continue;
      }
      out.push(`${pad(depth)}<${name}${attrText}>`);
      if (ownText) out.push(nl + pad(depth + 1) + text(ownText, false));
      stack.push(nl + pad(depth) + `</${name}>`);
      for (let k = childTasks.length - 1; k >= 0; k--) {
        stack.push(childTasks[k]);
        stack.push(nl);
      }
      continue;
    }

    const name = nameFor(task.name, scope, false);
    if (node.kind === 'array') {
      if (node.items.length === 0) {
        out.push(`${pad(depth)}<${name}/>`);
        continue;
      }
      out.push(`${pad(depth)}<${name}>`);
      stack.push(nl + pad(depth) + `</${name}>`);
      for (let k = node.items.length - 1; k >= 0; k--) {
        stack.push({ name: 'item', node: node.items[k], depth: depth + 1, scope });
        stack.push(nl);
      }
      continue;
    }

    const value = scalarText(node);
    out.push(value === null || value === '' ? `${pad(depth)}<${name}/>` : `${pad(depth)}<${name}>${text(value, false)}</${name}>`);
  }

  const warnings: string[] = [];
  if (renamed.size) {
    const examples = [...renamed.entries()].slice(0, 3).map(([from, to]) => `"${from}" -> <${to}>`).join(', ');
    warnings.push(`${renamed.size} key${renamed.size === 1 ? ' is' : 's are'} not a valid XML name and ${renamed.size === 1 ? 'was' : 'were'} renamed: ${examples}${renamed.size > 3 ? ', ...' : ''}.`);
  }
  if (mergedAttrs.size) {
    const names = [...mergedAttrs].slice(0, 3).map((n) => `"${n}"`).join(', ');
    warnings.push(
      `${mergedAttrs.size} attribute${mergedAttrs.size === 1 ? '' : 's'} (${names}${mergedAttrs.size > 3 ? ', ...' : ''}) would have appeared more than once on the same element, either as a repeated key or because two keys became the same XML name. XML allows each attribute once, so only the last value was kept.`,
    );
  }
  if (emptyArrays.size) {
    warnings.push(`Empty arrays have no XML equivalent and were left out: ${[...emptyArrays].slice(0, 3).join(', ')}${emptyArrays.size > 3 ? ', ...' : ''}.`);
  }
  if (badChars) {
    warnings.push(`${badChars} control character${badChars === 1 ? '' : 's'} that XML cannot contain ${badChars === 1 ? 'was' : 'were'} replaced with ${REPLACEMENT}.`);
  }
  return { ok: true, xml: out.join(''), warnings };
}

/** Well-formedness check used by the tests (the browser also checks with DOMParser). */
export function isWellFormed(fxp: FxpModule, xml: string): boolean {
  if (fxp.XMLValidator.validate(xml, { allowBooleanAttributes: false }) !== true) return false;
  let parsed: unknown;
  try {
    parsed = new fxp.XMLParser(xmlParseOptions()).parse(xml);
  } catch {
    // A parser refusal means the document cannot be handled as written.
    return false;
  }
  if (!isPlainObject(parsed)) return false;
  delete parsed[TEXT_KEY];
  const roots = Object.keys(parsed);
  return roots.length === 1 && !Array.isArray(parsed[roots[0]]);
}

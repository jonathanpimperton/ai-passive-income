/**
 * remark-figures -- resolves `{{ ... }}` figure tokens in Markdown bodies at
 * build time (plan-2026-11 RC1 / W1-FIG). Syntax and catalogue: figures.ts and
 * docs/figures.md.
 *
 * How it works: the plugin wraps the processor's parser, so tokens are
 * replaced in the raw Markdown text BEFORE it is parsed. That keeps token
 * syntax away from Markdown syntax: a `|` inside a token is not a table cell
 * break, quotes are not curled by smartypants, and the result (for example
 * "£25,064") is ordinary text that rehype-mono-figures then sets in the mono
 * face exactly as if it had been typed. Tokens are resolved everywhere in the
 * body, code included; `\{{` is an escape for a literal `{{`.
 *
 * Failure: any bad token throws with file:line:column and the token. Astro's
 * glob loader only LOGS render errors, so `withRenderCheck()` (figures-content.ts,
 * used in src/content.config.ts) turns a failed render into a failed build.
 * Messages are also kept on globalThis for that check to repeat.
 *
 * Cache: Astro's content layer caches rendered Markdown by file content. Use
 * the exported `remarkFiguresPlugin` entry (plugin + options) in
 * astro.config.mjs: its `cacheKey` option is a hash of the engine sources in
 * src/lib, and plugin options are part of the config digest, so changing any
 * engine clears the content cache and every page is re-rendered.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFiguresDetailed } from './figures';

const ERRORS_KEY = '__calcrunFigureErrors';

/** Map of absolute file path -> list of error messages from the last render. */
export function figureRenderErrors() {
  if (!globalThis[ERRORS_KEY]) globalThis[ERRORS_KEY] = new Map();
  return globalThis[ERRORS_KEY];
}

function libDir() {
  try {
    const url = new URL('.', import.meta.url);
    if (url.protocol === 'file:') return fileURLToPath(url);
  } catch {
    // import.meta.url unavailable in this loader: fall back to the project layout
  }
  return join(process.cwd(), 'src', 'lib');
}

/** Every non-test source file under dir (recursive), as sorted relative paths. */
function sourceFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...sourceFiles(join(dir, entry.name), rel));
    else if (/\.(ts|tsx|mjs|js|json)$/.test(entry.name) && !/\.test\.[cm]?[jt]sx?$/.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

/**
 * Hash of every non-test source file under src/lib (recursively). Any engine
 * or rates change gives a new key, which changes the Astro config digest and
 * clears the content-layer cache, so cached pages can never show stale figures.
 */
export function figuresCacheKey(dir = libDir()) {
  const hash = createHash('sha256');
  for (const rel of sourceFiles(dir)) {
    hash.update(rel);
    hash.update(readFileSync(join(dir, rel)));
  }
  return hash.digest('hex').slice(0, 16);
}

function toPath(fileOrPath) {
  if (!fileOrPath) return '';
  const p = String(fileOrPath);
  return p.startsWith('file:') ? fileURLToPath(p) : p;
}

/** Line (1-based) where the body starts in the file, after the frontmatter. */
function bodyLineOffset(absPath) {
  try {
    const raw = readFileSync(absPath, 'utf8');
    const fm = /^﻿?\s*---\r?\n[\s\S]*?\r?\n---/.exec(raw);
    let i = fm ? fm[0].length : 0;
    while (i < raw.length && /\s/.test(raw[i])) i++;
    return raw.slice(0, i).split('\n').length - 1;
  } catch {
    return 0;
  }
}

function lineCol(text, offset) {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  const col = offset - before.lastIndexOf('\n');
  return { line, col };
}

/** Replace the tokens in a Markdown body; throw one Error listing every bad token. */
export function substituteFigures(doc, filePath) {
  const { text, problems } = resolveFiguresDetailed(doc);
  const abs = toPath(filePath);
  const registry = figureRenderErrors();
  if (abs) registry.delete(abs);
  if (problems.length === 0) return text;
  const offset = abs ? bodyLineOffset(abs) : 0;
  const shown = abs ? relative(process.cwd(), abs).replace(/\\/g, '/') : '<markdown>';
  const messages = problems.map((p) => {
    const { line, col } = lineCol(doc, p.start);
    return `${shown}:${line + offset}:${col} figure token ${p.message}`;
  });
  if (abs) registry.set(abs, messages);
  const err = new Error(`Figure token error${messages.length > 1 ? 's' : ''}:\n${messages.join('\n')}`);
  err.name = 'FigureTokenError';
  throw err;
}

/**
 * The unified attacher. Must run after remark-parse (Astro adds user remark
 * plugins after it). Options: { cacheKey } -- ignored at runtime; it exists so
 * the Astro config digest changes when the engines change.
 */
export default function remarkFigures() {
  const self = this;
  const parse = self.parser;
  if (typeof parse !== 'function') {
    throw new Error('remark-figures must be used after remark-parse');
  }
  self.parser = function parseWithFigures(doc, file) {
    return parse(substituteFigures(String(doc), file && file.path), file);
  };
}

/** Ready-made `markdown.remarkPlugins` entry for astro.config.mjs. */
export const remarkFiguresPlugin = [remarkFigures, { cacheKey: figuresCacheKey() }];

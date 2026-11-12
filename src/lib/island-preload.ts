/**
 * Build-time `<link rel="modulepreload">` hints for a page's primary island
 * (plan task LA-1, review A11Y-PERF-05).
 *
 * Why: an Astro island is hydrated by a runtime `import()` of its component
 * chunk and the renderer chunk. The browser only discovers the component's own
 * static imports (React, recharts, shared UI chunks) after that chunk has been
 * downloaded and parsed, so the JS arrives as a serial waterfall. Preloading
 * the whole static-import closure from <head> lets every chunk download in
 * parallel with the HTML.
 *
 * How: Astro empties `dist/` and writes the client build (`dist/_astro/`)
 * BEFORE it prerenders pages, so page frontmatter can read the finished
 * chunks from disk. A chunk is named `<ComponentName>.<hash>.js` (Astro's
 * entryFileNames), and Rollup hoists transitive imports into each entry, so a
 * shallow scan of `import ... from "./x.js"` statements finds the closure.
 * Dynamic `import("./x.js")` calls (lazy charts, PDF export) are deliberately
 * not followed: those stay lazy.
 *
 * Failure policy: this is an optimisation, so a missing or ambiguous chunk
 * never fails the build. It prints one `[island-preload]` warning line (so a
 * regression is visible in the build log) and the page ships without hints.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Static `import`/`export ... from` of a sibling chunk; never `import(`. */
const STATIC_IMPORT_RE = /\b(?:import|export)\s*(?:[^'"();]*?\bfrom\s*)?["'](\.\/[^"']+?\.js)["']/g;

/** Relative chunk paths statically imported by a chunk's source text. */
export function staticImportsOf(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(STATIC_IMPORT_RE)) out.push(m[1].slice(2));
  return out;
}

const listings = new Map<string, string[]>();
const importsCache = new Map<string, string[]>();

function listDir(dir: string): string[] {
  let files = listings.get(dir);
  if (!files) {
    files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    listings.set(dir, files);
  }
  return files;
}

function importsOfFile(dir: string, file: string): string[] {
  const key = path.join(dir, file);
  let deps = importsCache.get(key);
  if (!deps) {
    deps = staticImportsOf(fs.readFileSync(key, 'utf8'));
    importsCache.set(key, deps);
  }
  return deps;
}

/**
 * The single chunk file for an entry name, or a reason it can't be chosen.
 * `name` is matched exactly: `SalaryUkCalc` does not match `SalaryUkCalc2`.
 */
export function findChunk(dir: string, name: string): { file: string } | { error: string } {
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.[A-Za-z0-9_-]+\\.js$`);
  const hits = listDir(dir).filter((f) => re.test(f));
  if (hits.length === 1) return { file: hits[0] };
  return { error: hits.length === 0 ? `no chunk named ${name}` : `${hits.length} chunks named ${name}` };
}

/** Entry chunk files plus everything they statically import, breadth-first, deduped. */
export function staticClosure(dir: string, entryFiles: string[]): string[] {
  const seen = new Set<string>();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file) || !fs.existsSync(path.join(dir, file))) continue;
    seen.add(file);
    queue.push(...importsOfFile(dir, file));
  }
  return [...seen];
}

export interface PreloadOptions {
  /** Directory holding the client chunks. Default: `<cwd>/dist/_astro`. */
  assetsDir?: string;
  /** Public URL prefix of that directory. Default: `/_astro/`. */
  publicBase?: string;
  /** Renderer client entry chunk name (@astrojs/react). Default: `client`. */
  rendererChunk?: string;
}

/**
 * modulepreload hrefs for one island: its component chunk, the renderer chunk,
 * and their static-import closure. Returns [] (with one warning line) when a
 * chunk can't be identified. Call only in production builds.
 */
export function islandPreloads(componentName: string, opts: PreloadOptions = {}): string[] {
  const dir = opts.assetsDir ?? path.join(process.cwd(), 'dist', '_astro');
  const base = opts.publicBase ?? '/_astro/';
  const entries: string[] = [];
  for (const name of [componentName, opts.rendererChunk ?? 'client']) {
    const found = findChunk(dir, name);
    if ('error' in found) {
      console.warn(`[island-preload] ${found.error} in ${dir}; page ships without modulepreload hints`);
      return [];
    }
    entries.push(found.file);
  }
  return staticClosure(dir, entries).map((f) => base + f);
}

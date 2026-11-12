/**
 * sitemap-lastmod: an honest <lastmod> for every sitemap URL.
 *
 * Each URL's date comes from the source that actually changes its content:
 *   - scenarios / comparisons: frontmatter `dateModified` (the same date the
 *     byline and Article JSON-LD show)
 *   - the 4 hub pages: their `DATE_MODIFIED` constant (same reason)
 *   - tool pages: the latest of frontmatter `lastUpdated`, the git last-commit
 *     date of the tool's markdown, and the git date of its calculator component
 *   - methodology pages: the git date of the methodology markdown
 *   - index pages: the page template's git date, or the newest entry they list
 *   - every other page: the git date of its .astro template
 * The build time is never used. A URL whose date can't be established gets no
 * <lastmod> rather than a guessed one.
 *
 * Shallow clones (CI builders) make git report the clone boundary commit as the
 * last change of every file outside the fetched history. Dates that resolve to a
 * boundary commit are treated as unknown, and `ensureFullHistory()` tries to
 * fetch the full history first so production builds get real dates.
 *
 * Plain ESM (.mjs) so astro.config.mjs can import it before Vite starts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const COMMIT_MARK = '\u0000';

/** Latest valid YYYY-MM-DD of the arguments (nullish/invalid ignored), or undefined. */
export function maxDate(...dates) {
  let best;
  for (const d of dates) {
    if (typeof d === 'string' && ISO_DATE.test(d) && (best === undefined || d > best)) best = d;
  }
  return best;
}

/**
 * Parse `git log --format=%x00%H %cs --name-only` output (newest commit first)
 * into Map<repo-relative path, date | null>. The first commit that lists a path
 * is its latest change. A path whose latest listing is a shallow-boundary commit
 * maps to null (unknown): in a shallow clone the boundary "adds" every file.
 */
export function parseGitLog(output, shallowCommits = new Set()) {
  const latest = new Map();
  let date = null;
  let boundary = false;
  for (const raw of output.split(/\r?\n/)) {
    if (raw.startsWith(COMMIT_MARK)) {
      const [sha, d] = raw.slice(1).trim().split(/\s+/);
      date = ISO_DATE.test(d ?? '') ? d : null;
      boundary = shallowCommits.has(sha);
      continue;
    }
    const path = raw.trim();
    if (!path || latest.has(path)) continue;
    latest.set(path, boundary ? null : date);
  }
  return latest;
}

function git(root, args, opts = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

function isShallow(root) {
  return git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true';
}

function readShallowCommits(root) {
  let p = git(root, ['rev-parse', '--git-path', 'shallow']).trim();
  if (!isAbsolute(p)) p = join(root, p);
  if (!existsSync(p)) return new Set();
  return new Set(readFileSync(p, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
}

/**
 * If the checkout is a shallow clone (typical on CI builders), try once to fetch
 * the full history so git dates are real. Never throws; returns a status string.
 * Set CALCRUN_NO_UNSHALLOW=1 to skip the fetch.
 */
export function ensureFullHistory(root, log = console.log) {
  try {
    if (!isShallow(root)) return 'full';
  } catch {
    return 'no-git';
  }
  if (process.env.CALCRUN_NO_UNSHALLOW) return 'shallow';
  log('[sitemap-lastmod] shallow clone: fetching full git history for honest <lastmod> dates');
  try {
    git(root, ['fetch', '--unshallow', '--quiet'], { timeout: 120_000 });
    return isShallow(root) ? 'shallow' : 'unshallowed';
  } catch (err) {
    log(`[sitemap-lastmod] could not fetch full history (${String(err.message).split('\n')[0]}); dates outside the shallow history are omitted`);
    return 'shallow';
  }
}

/** Map<repo-relative path, date|null> of last-commit dates under src/. Empty when git is unavailable. */
export function readGitDates(root) {
  try {
    const shallow = isShallow(root) ? readShallowCommits(root) : new Set();
    const out = git(root, ['log', '--format=%x00%H %cs', '--name-only', '--', 'src']);
    return parseGitLog(out, shallow);
  } catch {
    return new Map();
  }
}

/** Latest known date of any path equal to, or under, `prefix` (a directory ending in '/'). */
export function gitDateOf(gitDates, path) {
  if (!path.endsWith('/')) return gitDates.get(path) ?? undefined;
  let best;
  for (const [p, d] of gitDates) {
    if (p.startsWith(path)) best = maxDate(best, d);
  }
  return best;
}

/** `key: "value"` (quotes optional) from the frontmatter block of a markdown file. */
export function frontmatterValue(raw, key) {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return undefined;
  const m = fm[1].match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+?)["']?\\s*$`, 'm'));
  return m ? m[1].trim() : undefined;
}

function readMarkdownDir(root, dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ file: `${dir}/${f}`, raw: readFileSync(join(abs, f), 'utf8') }));
}

/** tool slug -> calculator component name, from the literal CALCULATOR_MAP in the tool route. */
export function parseCalculatorMap(routeSource) {
  const map = new Map();
  const block = routeSource.match(/CALCULATOR_MAP[^{]*\{([\s\S]*?)\};/);
  if (!block) return map;
  for (const m of block[1].matchAll(/'([a-z0-9-]+)'\s*:\s*'([A-Za-z0-9]+)'/g)) map.set(m[1], m[2]);
  return map;
}

/**
 * Build a pathname -> 'YYYY-MM-DD' map for every page the site generates.
 * `gitDates` is injectable for tests; by default it is read from git.
 */
export function buildLastmodMap({ root, gitDates = readGitDates(root) }) {
  const map = new Map();
  const g = (path) => gitDateOf(gitDates, path);
  const set = (pathname, date) => {
    if (date) map.set(pathname, date);
  };

  // Tools: frontmatter lastUpdated, markdown commit, calculator component commit.
  const routeFile = 'src/pages/tools/[category]/[tool].astro';
  const routePath = join(root, routeFile);
  const calcMap = existsSync(routePath) ? parseCalculatorMap(readFileSync(routePath, 'utf8')) : new Map();
  for (const { file, raw } of readMarkdownDir(root, 'src/data/tools')) {
    const slug = frontmatterValue(raw, 'slug');
    const category = frontmatterValue(raw, 'category');
    if (!slug || !category) continue;
    const component = calcMap.get(slug);
    const date = maxDate(
      frontmatterValue(raw, 'lastUpdated'),
      g(file),
      component ? g(`src/components/tools/${component}.tsx`) : undefined
    );
    set(`/tools/${category}/${slug}/`, date);
  }

  // Scenarios and comparisons: the editorial dateModified shown in the byline.
  const scenarioDates = [];
  for (const { raw } of readMarkdownDir(root, 'src/data/scenarios')) {
    const slug = frontmatterValue(raw, 'slug');
    const date = maxDate(frontmatterValue(raw, 'dateModified'));
    if (slug) set(`/scenarios/${slug}/`, date);
    scenarioDates.push(date);
  }
  const comparisonDates = [];
  for (const { raw } of readMarkdownDir(root, 'src/data/comparisons')) {
    const slug = frontmatterValue(raw, 'slug');
    const date = maxDate(frontmatterValue(raw, 'dateModified'));
    if (slug) set(`/comparisons/${slug}/`, date);
    comparisonDates.push(date);
  }

  // Methodology pages: the markdown's last commit (they carry no editorial date).
  for (const { file, raw } of readMarkdownDir(root, 'src/data/methodologies')) {
    const slug = frontmatterValue(raw, 'slug');
    if (slug) set(`/how-we-calculate/${slug}/`, g(file));
  }

  // Standalone .astro pages (hubs, legal pages, index pages, homepage).
  const pagesDir = join(root, 'src/pages');
  const astroPages = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(pagesDir, rel), { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(childRel);
      else if (entry.name.endsWith('.astro') && !entry.name.includes('[')) astroPages.push(childRel);
    }
  };
  if (existsSync(pagesDir)) walk('');
  const hubDates = [];
  for (const rel of astroPages) {
    const file = `src/pages/${rel}`;
    const route = rel.replace(/\.astro$/, '').replace(/(^|\/)index$/, '');
    if (route === '404') continue;
    const pathname = route ? `/${route}/` : '/';
    const src = readFileSync(join(pagesDir, rel), 'utf8');
    const constDate = src.match(/const DATE_MODIFIED\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
    let date;
    if (constDate) {
      date = constDate;
      if (pathname.startsWith('/scenarios/')) hubDates.push(date);
    } else if (pathname === '/') {
      date = maxDate(g(file), g('src/components/homepage/'));
    } else if (pathname === '/tools/') {
      date = maxDate(g(file), g('src/lib/tools-data.ts'));
    } else {
      date = g(file);
    }
    set(pathname, date);
  }

  // Index pages also change whenever an entry they list changes.
  const bump = (pathname, ...dates) => set(pathname, maxDate(map.get(pathname), ...dates));
  bump('/scenarios/', ...scenarioDates, ...hubDates);
  bump('/comparisons/', ...comparisonDates);

  return map;
}

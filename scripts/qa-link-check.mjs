/**
 * Phase 3 QA gate: internal link + anchor integrity over the built dist/.
 *
 * Checks every internal href in every built HTML page:
 *  - path resolves to a built page (dist/<path>/index.html), a real asset,
 *    or a redirect source in dist/_redirects (301s count as valid);
 *  - fragment links (/page/#anchor) also require id="anchor" to exist in the
 *    target page's HTML;
 *  - redirect DESTINATIONS in _redirects must themselves resolve to built
 *    pages (no redirect-to-404), including their fragments.
 *
 * Usage: node scripts/qa-link-check.mjs   (after npm run build; exits 1 on findings)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const findings = [];

function collectHtml(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collectHtml(p, out);
    else if (entry.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = collectHtml(DIST);

// Redirect sources/destinations from _redirects
const redirectSources = new Set();
const redirectDests = [];
const redirectsPath = join(DIST, '_redirects');
if (existsSync(redirectsPath)) {
  for (const line of readFileSync(redirectsPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [src, dest] = trimmed.split(/\s+/);
    if (src) redirectSources.add(src);
    if (dest) redirectDests.push({ dest, line: trimmed });
  }
}

function pageExists(path) {
  // /foo/bar/ -> dist/foo/bar/index.html ; also allow direct files (assets)
  const clean = path.replace(/^\//, '').replace(/\/$/, '');
  if (clean === '') return existsSync(join(DIST, 'index.html'));
  return (
    existsSync(join(DIST, clean, 'index.html')) ||
    existsSync(join(DIST, clean))
  );
}

function anchorExists(path, anchor) {
  const clean = path.replace(/^\//, '').replace(/\/$/, '');
  const file = clean === '' ? join(DIST, 'index.html') : join(DIST, clean, 'index.html');
  if (!existsSync(file)) return false;
  const html = readFileSync(file, 'utf8');
  return html.includes(`id="${anchor}"`);
}

// 1. Validate redirect destinations
for (const { dest, line } of redirectDests) {
  const [path, anchor] = dest.split('#');
  if (!pageExists(path)) {
    findings.push(`REDIRECT DEST MISSING: ${line}`);
  } else if (anchor && !anchorExists(path, anchor)) {
    findings.push(`REDIRECT ANCHOR MISSING: ${line}`);
  }
}

// 2. Validate internal links in every page
const hrefRe = /href="(\/[^"]*)"/g;
const checkedAnchors = new Map();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(hrefRe)) {
    let href = match[1];
    if (href.startsWith('//')) continue; // protocol-relative external
    const [pathPart, anchor] = href.split('#');
    const path = pathPart.split('?')[0];
    if (path === '') continue; // pure fragment
    // Assets and API endpoints
    if (/\.(css|js|png|jpg|svg|ico|xml|txt|webmanifest|woff2|pdf|json)$/.test(path)) {
      if (!existsSync(join(DIST, path.replace(/^\//, '')))) {
        findings.push(`ASSET MISSING: ${path} (in ${page})`);
      }
      continue;
    }
    if (path.startsWith('/api/')) continue;
    if (!pageExists(path)) {
      if (redirectSources.has(path) || redirectSources.has(path.replace(/\/$/, '') + '/')) {
        // 301s are valid but flag links that SHOULD point at the new target
        findings.push(`LINK VIA REDIRECT (repoint): ${href} (in ${page})`);
      } else {
        findings.push(`DEAD LINK: ${href} (in ${page})`);
      }
    } else if (anchor) {
      const key = `${path}#${anchor}`;
      if (!checkedAnchors.has(key)) checkedAnchors.set(key, anchorExists(path, anchor));
      if (!checkedAnchors.get(key)) {
        findings.push(`ANCHOR MISSING: ${href} (in ${page})`);
      }
    }
  }
}

const unique = [...new Set(findings)];
console.log(`pages scanned: ${pages.length}, redirects: ${redirectSources.size}`);
if (unique.length) {
  console.log(`FINDINGS (${unique.length}):`);
  unique.slice(0, 80).forEach((f) => console.log('  ' + f));
  if (unique.length > 80) console.log(`  ...and ${unique.length - 80} more`);
  process.exit(1);
}
console.log('link check: 0 findings');

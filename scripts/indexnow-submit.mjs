#!/usr/bin/env node
/**
 * IndexNow submission for the URLs that changed since a given commit.
 *
 * DRY RUN BY DEFAULT: prints the URL list and the payload it would send.
 * Nothing leaves the machine unless --send is passed.
 *
 * Usage (after `npm run build`, from the repo root, in a full clone):
 *   node scripts/indexnow-submit.mjs --since <commit>            # dry run
 *   node scripts/indexnow-submit.mjs --since <commit> --send     # submit
 *
 * How "changed" is decided: the built sitemap (dist) is diffed against the
 * sitemap the --since commit would have produced. The old lastmod map is
 * rebuilt from that commit's src/ tree and git history with the same rules
 * (src/lib/sitemap-lastmod.mjs), so a URL is submitted when it is new, when its
 * <lastmod> moved, or when it disappeared from the sitemap. Source paths added
 * to public/_redirects since the commit are submitted too, so engines recrawl
 * moved URLs and see the 301.
 *
 * Options:
 *   --since <commit>     required (normally the last deployed commit)
 *   --dist <dir>         built site to read sitemaps from (default: dist)
 *   --include-undated    also submit current sitemap URLs that have no <lastmod>
 *   --endpoint <url>     IndexNow endpoint (default: https://api.indexnow.org/indexnow,
 *                        which shares submissions with the participating engines)
 *   --send               actually POST the list (after checking the live key file)
 *
 * The key is the file public/<key>.txt whose content is its own name, served
 * at https://www.calcrun.com/<key>.txt. IndexNow keys are public by design;
 * the file only proves the submitter controls the host.
 *
 * Exit codes: 0 ok (or nothing to send), 1 error, 2 bad arguments.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildLastmodMap, parseGitLog } from '../src/lib/sitemap-lastmod.mjs';

const SITE = 'https://www.calcrun.com';
const HOST = new URL(SITE).host;
const BATCH = 10_000; // IndexNow maximum per POST
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

function parseArgs(argv) {
  const opts = { since: null, dist: 'dist', includeUndated: false, endpoint: 'https://api.indexnow.org/indexnow', send: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--since') opts.since = argv[++i];
    else if (a === '--dist') opts.dist = argv[++i];
    else if (a === '--endpoint') opts.endpoint = argv[++i];
    else if (a === '--include-undated') opts.includeUndated = true;
    else if (a === '--send') opts.send = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

/** The IndexNow key: public/<key>.txt containing exactly <key>. */
export function findKey(publicDir) {
  const keys = readdirSync(publicDir)
    .filter((f) => f.endsWith('.txt') && f !== 'robots.txt')
    .map((f) => f.slice(0, -4))
    .filter((k) => KEY_RE.test(k) && readFileSync(join(publicDir, `${k}.txt`), 'utf8').trim() === k);
  if (keys.length !== 1) throw new Error(`Expected exactly one IndexNow key file in ${publicDir}, found ${keys.length}`);
  return keys[0];
}

/** [{ loc, lastmod|null }] from every sitemap listed in the built sitemap index. */
export function readSitemaps(dist) {
  const index = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
  const files = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^\//, ''));
  const urls = [];
  for (const file of files) {
    const xml = readFileSync(join(dist, file), 'utf8');
    for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
      const lastmod = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null;
      if (loc) urls.push({ loc, lastmod: lastmod ? lastmod.slice(0, 10) : null });
    }
  }
  return urls;
}

/** Source paths of redirect rules added to public/_redirects in a diff. */
export function redirectSourcesAddedSince(diffText) {
  const out = [];
  for (const line of diffText.split(/\r?\n/)) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    const rule = line.slice(1).trim();
    if (!rule || rule.startsWith('#')) continue;
    const [from] = rule.split(/\s+/);
    if (from?.startsWith('/') && !from.includes('*') && !from.includes(':')) out.push(from);
  }
  return out;
}

/**
 * Diff the current sitemap against the old pathname -> lastmod map.
 * Returns sorted, de-duplicated lists; `urls` is what gets submitted.
 */
export function selectUrls({ sitemapUrls, oldMap, redirectSources = [], includeUndated = false, site = SITE }) {
  const current = new Set();
  const added = [];
  const changed = [];
  const undated = [];
  for (const { loc, lastmod } of sitemapUrls) {
    const path = new URL(loc).pathname;
    current.add(path);
    if (!oldMap.has(path)) added.push(loc);
    else if (!lastmod) undated.push(loc);
    else if (oldMap.get(path) !== lastmod) changed.push(loc);
  }
  const removed = [...oldMap.keys()].filter((p) => !current.has(p)).map((p) => `${site}${p}`);
  const moved = redirectSources.map((p) => `${site}${p}`);
  const urls = [...new Set([...added, ...changed, ...removed, ...moved, ...(includeUndated ? undated : [])])].sort();
  const uniq = (a) => [...new Set(a)].sort();
  return { urls, added: uniq(added), changed: uniq(changed), removed: uniq(removed), moved: uniq(moved), undated: uniq(undated) };
}

/** pathname -> lastmod map the given commit's tree produced (rebuilt with the current rules). */
function lastmodMapAt(sha, git) {
  const dir = mkdtempSync(join(tmpdir(), 'calcrun-indexnow-'));
  try {
    const tarPath = join(dir, 'src.tar');
    writeFileSync(tarPath, execFileSync('git', ['archive', '--format=tar', sha, 'src'], { maxBuffer: 256 * 1024 * 1024 }));
    // Relative path + cwd: GNU tar (Git Bash) reads "C:\..." as a remote host.
    execFileSync('tar', ['-xf', 'src.tar'], { cwd: dir });
    const gitDates = parseGitLog(git(['log', '--format=%x00%H %cs', '--name-only', sha, '--', 'src']));
    return buildLastmodMap({ root: dir, gitDates });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (opts.help || !opts.since) {
    console.error('usage: node scripts/indexnow-submit.mjs --since <commit> [--dist dist] [--include-undated] [--send]');
    process.exit(opts.help ? 0 : 2);
  }
  if (!existsSync(join(opts.dist, 'sitemap-index.xml'))) {
    console.error(`No ${opts.dist}/sitemap-index.xml: run npm run build first.`);
    process.exit(1);
  }

  const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  let sinceSha;
  try {
    sinceSha = git(['rev-parse', '--verify', `${opts.since}^{commit}`]).trim();
  } catch {
    console.error(`Unknown commit: ${opts.since}`);
    process.exit(2);
  }
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    console.error('Shallow clone: run `git fetch --unshallow` first (old lastmod dates need full history).');
    process.exit(1);
  }

  const key = findKey('public');
  if (!existsSync(join(opts.dist, `${key}.txt`))) {
    console.error(`Key file ${key}.txt is missing from ${opts.dist}: rebuild before submitting.`);
    process.exit(1);
  }
  const sitemapUrls = readSitemaps(opts.dist);
  const sel = selectUrls({
    sitemapUrls,
    oldMap: lastmodMapAt(sinceSha, git),
    redirectSources: redirectSourcesAddedSince(git(['diff', sinceSha, '--', 'public/_redirects'])),
    includeUndated: opts.includeUndated,
  });
  const foreign = sel.urls.filter((u) => new URL(u).host !== HOST);
  if (foreign.length) {
    console.error(`Refusing: ${foreign.length} URL(s) are not on ${HOST}: ${foreign.slice(0, 3).join(', ')}`);
    process.exit(1);
  }

  console.log(`IndexNow ${opts.send ? 'SUBMISSION' : 'DRY RUN (nothing is sent; pass --send to submit)'}`);
  console.log(`since ${opts.since} (${sinceSha.slice(0, 7)}); current sitemap URLs: ${sitemapUrls.length}`);
  console.log(`new: ${sel.added.length}  lastmod changed: ${sel.changed.length}  gone from sitemap: ${sel.removed.length}  newly redirected: ${sel.moved.length}`);
  console.log(`no lastmod: ${sel.undated.length}${opts.includeUndated ? ' (included)' : ' (excluded; --include-undated to add)'}`);
  console.log(`to submit: ${sel.urls.length}`);
  for (const u of sel.urls) console.log(`  ${u}`);
  const keyLocation = `${SITE}/${key}.txt`;
  console.log(`payload: {"host":"${HOST}","key":"${key}","keyLocation":"${keyLocation}","urlList":[${sel.urls.length} URLs]} -> ${opts.endpoint}`);

  if (!opts.send || sel.urls.length === 0) {
    if (opts.send) console.log('Nothing to send.');
    return;
  }

  // The engines fetch the key file to verify the submission: check it is live first.
  const live = await fetch(keyLocation, { redirect: 'manual' });
  const liveText = live.ok ? (await live.text()).trim() : '';
  if (!live.ok || liveText !== key) {
    console.error(`Live key file check failed (${keyLocation}: HTTP ${live.status}). Deploy it before submitting.`);
    process.exit(1);
  }
  for (let i = 0; i < sel.urls.length; i += BATCH) {
    const urlList = sel.urls.slice(i, i + BATCH);
    const res = await fetch(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
    });
    // 200 = received, 202 = received with key validation pending; anything else is a failure.
    console.log(`batch ${i / BATCH + 1}: ${urlList.length} URLs -> HTTP ${res.status}`);
    if (res.status !== 200 && res.status !== 202) {
      console.error(await res.text().catch(() => ''));
      process.exit(1);
    }
  }
}

// Run only when executed directly (the helpers are imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

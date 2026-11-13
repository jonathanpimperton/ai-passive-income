#!/usr/bin/env node
/**
 * serve-prod.mjs -- serve dist/ the way Cloudflare Workers static assets serve production.
 *
 * `astro preview` ignores public/_headers, public/_redirects, trailing-slash handling and
 * not_found_handling, which is how production-only breakage shipped (review RC3). This
 * dependency-free Node server emulates them, so tests can run against production config:
 *
 *   - _redirects   exact static rules (plus splats/placeholders), first match wins,
 *                  evaluated BEFORE asset lookup (Cloudflare: "redirects are always
 *                  followed, regardless of whether or not an asset matches")
 *   - _headers     every matching rule applies; values set twice are joined with ", ";
 *                  "! Name" detaches a value set by an earlier rule; a Cache-Control from
 *                  _headers replaces the default. Applied to assets, redirects and 404s.
 *   - html_handling = "auto-trailing-slash" (307s): /about -> /about/, /about/index.html
 *                  -> /about/, /404.html -> /404, /404 serves 404.html
 *   - not_found_handling, read from wrangler.toml: "404-page" serves the nearest
 *                  404.html with status 404; otherwise an empty 404 (old behaviour)
 *   - defaults     Cache-Control "public, max-age=0, must-revalidate"; ETag on non-HTML
 *                  assets (live HTML has none because Cloudflare rewrites it); 304 on
 *                  If-None-Match; HEAD; _headers/_redirects are never served; paths are
 *                  case-sensitive; duplicate slashes get a 307
 *   - NOT emulated percent-encoded paths are decoded for lookup but not 307-normalised;
 *                  compression; Cloudflare's injected bot-detection script
 *   - /api/*       answered by the REAL worker.ts when --worker is given (bundled with the
 *                  esbuild that Astro already installs). Third-party calls it makes are
 *                  intercepted and mocked; nothing ever leaves the machine. Without
 *                  --worker, /api/* returns a 503 JSON stub.
 *
 * Validated against www.calcrun.com on 12 Nov 2026 (status, Location and security headers
 * for 19 URL shapes: pages, slash-less pages, index.html, 404.html, missing pages and
 * assets, retired-scenario 301s, /tools/* framing headers, fonts, OG images, security.txt,
 * _headers, /api/unknown, upper-case paths).
 *
 * USAGE (build first: npm run build)
 *   node scripts/serve-prod.mjs [--port N] [--host H] [--dist DIR] [--config wrangler.toml]
 *                               [--worker] [--quiet]
 *   Port: --port, else $PORT, else $SERVE_PROD_PORT, else 4390.
 *   Every parallel agent uses its OWN port, for example:
 *     Git Bash:    PORT=4401 node scripts/serve-prod.mjs --worker
 *     PowerShell:  $env:PORT=4401; node scripts/serve-prod.mjs --worker
 *   npm run serve:prod   (same as above with --worker)
 *   npm run test:prod    (Playwright, playwright.prod.config.ts; starts this server itself)
 *
 * --worker mode extras (localhost only, for tests):
 *   env passed to the worker: dummy secrets + ALLOW_DEV_ORIGINS=1
 *   Turnstile siteverify mock: token "XXXX.DUMMY.TOKEN.XXXX" passes with hostname
 *     "localhost" and the action of the endpoint being called (any other token fails)
 *   GET  /__serve-prod/health              -> {"ok":true}
 *   GET  /__serve-prod/upstream            -> JSON log of mocked third-party calls
 *   POST /__serve-prod/upstream?reset=1    -> clear the log
 *   POST /__serve-prod/upstream?mailerlite=422&mailersend=500&siteverify=fail
 *                                          -> change mocked upstream answers ("ok" restores)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// -- CLI ---------------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(opt('--port', process.env.PORT || process.env.SERVE_PROD_PORT || 4390));
const HOST = opt('--host', '127.0.0.1');
const DIST = path.resolve(ROOT, opt('--dist', 'dist'));
const WRANGLER = path.resolve(ROOT, opt('--config', 'wrangler.toml'));
const WORKER = flag('--worker');
const QUIET = flag('--quiet');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`serve-prod: ${DIST}${path.sep}index.html not found. Run "npm run build" first.`);
  process.exit(1);
}

// -- wrangler.toml [assets] ------------------------------------------------------------------
function readAssetsConfig() {
  const toml = fs.readFileSync(WRANGLER, 'utf8');
  const section = toml.split(/^\[assets\]\s*$/m)[1]?.split(/^\[/m)[0] ?? '';
  const get = (key) => section.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'))?.[1];
  return {
    notFound: get('not_found_handling') || 'none',
    htmlHandling: get('html_handling') || 'auto-trailing-slash',
  };
}
const ASSETS_CONFIG = readAssetsConfig();
if (ASSETS_CONFIG.htmlHandling !== 'auto-trailing-slash') {
  console.error(`serve-prod: html_handling "${ASSETS_CONFIG.htmlHandling}" is not emulated (only auto-trailing-slash).`);
  process.exit(1);
}

// -- _headers / _redirects parsing -----------------------------------------------------------
/** Compile a Cloudflare URL pattern (":name" placeholders, one "*" splat) to a RegExp. */
function compilePattern(pattern) {
  let p = pattern;
  // Patterns may be absolute URLs; only the path part matters for a single-host site.
  const abs = p.match(/^https?:\/\/[^/]+(\/.*)$/);
  if (abs) p = abs[1];
  const names = [];
  let src = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      src += '(.*)';
      names.push('splat');
    } else if (c === ':' && /[A-Za-z]/.test(p[i + 1] || '')) {
      let j = i + 1;
      while (j < p.length && /\w/.test(p[j])) j++;
      names.push(p.slice(i + 1, j));
      src += '([^/]+)';
      i = j - 1;
    } else {
      src += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return { re: new RegExp(`^${src}$`), names };
}

function matchPattern(compiled, pathname) {
  const m = compiled.re.exec(pathname);
  if (!m) return null;
  const params = {};
  compiled.names.forEach((n, i) => { params[n] = m[i + 1]; });
  return params;
}

function substitute(template, params) {
  return template.replace(/:([A-Za-z]\w*)/g, (all, name) => (name in params ? params[name] : all));
}

function parseHeadersFile() {
  const file = path.join(DIST, '_headers');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), compiled: compilePattern(raw.trim()), set: [], detach: [] };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    const line = raw.trim();
    if (line.startsWith('!')) {
      current.detach.push(line.slice(1).trim().toLowerCase());
      continue;
    }
    const i = line.indexOf(':');
    if (i > 0) current.set.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
  }
  return rules;
}

function parseRedirectsFile() {
  const file = path.join(DIST, '_redirects');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [source, destination, code] = line.split(/\s+/);
    rules.push({ source, destination, status: Number(code || 302), compiled: compilePattern(source) });
  }
  return rules;
}

const HEADER_RULES = parseHeadersFile();
const REDIRECT_RULES = parseRedirectsFile();

/** Headers that _headers adds for `pathname` (lower-case name -> [OriginalName, value]). */
function customHeadersFor(pathname) {
  const out = new Map();
  for (const rule of HEADER_RULES) {
    const params = matchPattern(rule.compiled, pathname);
    if (!params) continue;
    for (const name of rule.detach) out.delete(name);
    for (const [name, value] of rule.set) {
      const key = name.toLowerCase();
      const v = substitute(value, params);
      out.set(key, out.has(key) ? [out.get(key)[0], `${out.get(key)[1]}, ${v}`] : [name, v]);
    }
  }
  return out;
}

// -- static files ------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.map': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/vnd.microsoft.icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
  '.wasm': 'application/wasm', '.heic': 'image/heic',
};
const HIDDEN = new Set(['/_headers', '/_redirects', '/_routes.json', '/.assetsignore']);
const REAL_DIST = fs.realpathSync.native(DIST);

/**
 * Absolute file path for a URL path, or null if it is not a regular file inside dist.
 * Matching is case-sensitive like Cloudflare, even on Windows/macOS file systems.
 */
function fileFor(urlPath) {
  if (HIDDEN.has(urlPath)) return null;
  const rel = urlPath.replace(/^\/+/, '');
  const abs = path.resolve(DIST, rel);
  if (abs !== DIST && !abs.startsWith(DIST + path.sep)) return null;
  try {
    if (!fs.statSync(abs).isFile()) return null;
    const real = fs.realpathSync.native(abs);
    return real.slice(REAL_DIST.length) === abs.slice(DIST.length) ? abs : null;
  } catch {
    return null;
  }
}

/** Nearest 404.html walking up from the request's directory. */
function nearest404(pathname) {
  let dir = pathname.endsWith('/') ? pathname : pathname.slice(0, pathname.lastIndexOf('/') + 1);
  for (;;) {
    const f = fileFor(`${dir}404.html`);
    if (f) return f;
    if (dir === '/' || dir === '') return null;
    dir = dir.slice(0, dir.slice(0, -1).lastIndexOf('/') + 1);
  }
}

/**
 * Resolve a decoded path under auto-trailing-slash rules.
 * Returns { file } to serve, { redirect } for a 307, or null when nothing matches.
 */
function resolveHtmlHandling(p) {
  if (p.endsWith('/index.html')) {
    const dir = p.slice(0, -'index.html'.length);
    return fileFor(p) ? { redirect: dir } : null;
  }
  if (p.endsWith('/index')) {
    const dir = p.slice(0, -'index'.length);
    return fileFor(`${dir}index.html`) ? { redirect: dir } : null;
  }
  if (p.endsWith('.html')) {
    const base = p.slice(0, -'.html'.length);
    if (fileFor(p)) return { redirect: base };
    return null;
  }
  if (p.endsWith('/')) {
    const index = fileFor(`${p}index.html`);
    if (index) return { file: index };
    if (p !== '/' && fileFor(`${p.slice(0, -1)}.html`)) return { redirect: p.slice(0, -1) };
    return null;
  }
  const exact = fileFor(p);
  if (exact) return { file: exact };
  if (fileFor(`${p}/index.html`)) return { redirect: `${p}/` };
  const html = fileFor(`${p}.html`);
  if (html) return { file: html };
  return null;
}

const etagCache = new Map();
function etagFor(file) {
  const stat = fs.statSync(file);
  const key = `${file}:${stat.mtimeMs}:${stat.size}`;
  if (!etagCache.has(key)) {
    etagCache.set(key, `"${crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex')}"`);
  }
  return etagCache.get(key);
}

/** Build the final header object: defaults overlaid with _headers values. */
function finalHeaders(pathname, defaults) {
  const headers = { ...defaults };
  for (const [key, [name, value]] of customHeadersFor(pathname)) {
    for (const k of Object.keys(headers)) if (k.toLowerCase() === key) delete headers[k];
    headers[name] = value;
  }
  return headers;
}

/**
 * The static-assets layer: what env.ASSETS.fetch() returns in production.
 * Returns { status, headers, body (Buffer|null) }.
 */
function assetResponse(method, rawPath, search, reqHeaders) {
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    pathname = rawPath;
  }
  if (/\/\/|\0/.test(pathname)) {
    // Cloudflare normalises duplicate slashes with a 307.
    const clean = pathname.replace(/\/{2,}/g, '/').replace(/\0/g, '');
    return { status: 307, headers: finalHeaders(clean, { Location: clean + search }), body: null };
  }

  for (const rule of REDIRECT_RULES) {
    const params = matchPattern(rule.compiled, pathname);
    if (!params) continue;
    const location = substitute(rule.destination, params);
    return { status: rule.status, headers: finalHeaders(pathname, { Location: location }), body: null };
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return { status: 405, headers: finalHeaders(pathname, { Allow: 'GET, HEAD' }), body: null };
  }

  const resolved = resolveHtmlHandling(pathname);
  if (resolved?.redirect) {
    return { status: 307, headers: finalHeaders(pathname, { Location: resolved.redirect + search }), body: null };
  }
  if (resolved?.file) {
    const ext = path.extname(resolved.file).toLowerCase();
    const defaults = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    };
    if (ext !== '.html') {
      const etag = etagFor(resolved.file);
      defaults.ETag = etag;
      if (reqHeaders['if-none-match'] === etag) {
        return { status: 304, headers: finalHeaders(pathname, defaults), body: null };
      }
    }
    return { status: 200, headers: finalHeaders(pathname, defaults), body: fs.readFileSync(resolved.file) };
  }

  if (ASSETS_CONFIG.notFound === '404-page') {
    const page = nearest404(pathname);
    if (page) {
      return {
        status: 404,
        headers: finalHeaders(pathname, { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=0, must-revalidate' }),
        body: fs.readFileSync(page),
      };
    }
  }
  return { status: 404, headers: finalHeaders(pathname, {}), body: null };
}

// -- worker (--worker) ---------------------------------------------------------------------
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const upstreamLog = [];
const upstreamMode = { mailerlite: 'ok', mailersend: 'ok', siteverify: 'ok' };
/** API path being handled, so the siteverify mock can report the matching action. */
let currentApiPath = '';
let workerModule = null;

async function loadWorker() {
  const require = createRequire(path.join(ROOT, 'package.json'));
  const esbuild = require('esbuild');
  const outDir = path.join(ROOT, '.astro-cache');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'serve-prod-worker.mjs');
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'worker.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    outfile: outFile,
    logLevel: 'error',
  });
  return (await import(`${pathToFileURL(outFile).href}?t=${Date.now()}`)).default;
}

/** Mocked answers for the third parties worker.ts talks to. Anything else is refused. */
async function mockedFetch(input, init = {}) {
  const url = String(input instanceof Request ? input.url : input);
  let body = null;
  try {
    body = init.body ? JSON.parse(String(init.body)) : null;
  } catch {
    body = String(init.body);
  }
  const host = new URL(url).host;
  const redacted = body && typeof body === 'object' ? { ...body } : body;
  if (redacted && typeof redacted === 'object' && 'secret' in redacted) redacted.secret = '(redacted)';
  upstreamLog.push({ at: new Date().toISOString(), url, body: redacted });

  if (url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')) {
    const pass = upstreamMode.siteverify === 'ok' && body?.response === DUMMY_TOKEN;
    return new Response(JSON.stringify(pass
      ? { success: true, hostname: 'localhost', action: currentApiPath === '/api/subscribe' ? 'subscribe' : 'email-results' }
      : { success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 });
  }
  if (host === 'connect.mailerlite.com') {
    const status = upstreamMode.mailerlite === 'ok' ? 201 : Number(upstreamMode.mailerlite);
    return new Response('{}', { status });
  }
  if (host === 'api.mailersend.com') {
    const status = upstreamMode.mailersend === 'ok' ? 202 : Number(upstreamMode.mailersend);
    return new Response('', { status });
  }
  throw new Error(`serve-prod: blocked outbound request to ${url}`);
}

const WORKER_ENV = {
  ASSETS: {
    fetch: async (request) => {
      const u = new URL(request.url);
      const headers = Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v]));
      const r = assetResponse(request.method, u.pathname, u.search, headers);
      return new Response(request.method === 'HEAD' ? null : r.body, { status: r.status, headers: r.headers });
    },
  },
  MAILERLITE_API_KEY: 'serve-prod-dummy',
  MAILERSEND_API_KEY: 'serve-prod-dummy',
  TURNSTILE_SECRET_KEY: 'serve-prod-dummy',
  ALLOW_DEV_ORIGINS: '1',
};

// -- HTTP server -----------------------------------------------------------------------------
function send(res, method, status, headers, body) {
  const h = { ...headers };
  if (body) h['Content-Length'] = String(body.length);
  res.writeHead(status, h);
  res.end(method === 'HEAD' ? undefined : body || undefined);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  // Build the URL by concatenation: new URL('//x', base) would treat //x as a host.
  const url = new URL(`http://${req.headers.host || `${HOST}:${PORT}`}${req.url}`);
  const method = req.method || 'GET';

  if (url.pathname.startsWith('/__serve-prod/')) {
    if (url.pathname === '/__serve-prod/health') {
      return send(res, method, 200, { 'Content-Type': 'application/json' }, Buffer.from('{"ok":true}'));
    }
    if (url.pathname === '/__serve-prod/upstream' && WORKER) {
      if (method === 'POST') {
        if (url.searchParams.has('reset')) upstreamLog.length = 0;
        for (const k of Object.keys(upstreamMode)) {
          const v = url.searchParams.get(k);
          if (v) upstreamMode[k] = v;
        }
      }
      return send(res, method, 200, { 'Content-Type': 'application/json' },
        Buffer.from(JSON.stringify({ mode: upstreamMode, calls: upstreamLog })));
    }
    return send(res, method, 404, { 'Content-Type': 'application/json' }, Buffer.from('{"error":"Not found"}'));
  }

  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    if (!WORKER) {
      return send(res, method, 503, { 'Content-Type': 'application/json' },
        Buffer.from('{"error":"API not emulated: start serve-prod with --worker"}'));
    }
    const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
    const headers = new Headers();
    const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host']);
    for (const [k, v] of Object.entries(req.headers)) {
      if (HOP_BY_HOP.has(k)) continue;
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
      else if (v !== undefined) headers.set(k, v);
    }
    headers.set('CF-Connecting-IP', req.socket.remoteAddress || '127.0.0.1');
    const request = new Request(url, { method, headers, body });
    currentApiPath = url.pathname;
    const response = await workerModule.fetch(request, WORKER_ENV);
    const out = Buffer.from(await response.arrayBuffer());
    // Worker-generated responses do NOT get _headers in production; pass them through.
    return send(res, method, response.status, Object.fromEntries(response.headers), out.length ? out : null);
  }

  // Non-API paths: what the assets layer (or the worker's env.ASSETS.fetch) returns.
  const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const r = assetResponse(method, url.pathname, url.search, headers);
  return send(res, method, r.status, r.headers, r.body);
}

if (WORKER) {
  workerModule = await loadWorker();
  globalThis.fetch = mockedFetch;
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  handle(req, res)
    .catch((err) => {
      console.error('serve-prod error:', err);
      if (!res.headersSent) send(res, req.method, 500, { 'Content-Type': 'text/plain' }, Buffer.from('serve-prod internal error'));
    })
    .finally(() => {
      if (!QUIET) console.log(`${res.statusCode} ${req.method} ${req.url} ${Date.now() - started}ms`);
    });
});
server.on('error', (err) => {
  console.error(`serve-prod: cannot listen on ${HOST}:${PORT}: ${err.message}`);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  console.log(`serve-prod: http://${HOST}:${PORT}  dist=${path.relative(ROOT, DIST) || '.'}  not_found_handling=${ASSETS_CONFIG.notFound}  worker=${WORKER ? 'on (mocked upstreams)' : 'off'}`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));

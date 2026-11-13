#!/usr/bin/env node
/**
 * Build-level check for the figure engine (docs/figures.md section 7).
 *
 * Runs `astro sync` on scripts/figures-build-fixture three times and checks:
 *   1. a bad token in a Markdown BODY fails (Astro's glob loader only logs
 *      render errors; withRenderCheck must turn that into a failure),
 *   2. a bad token in FRONTMATTER fails (zod transform),
 *   3. good tokens pass, and the synced data holds the resolved figures.
 * Any non-zero exit counts as a failure: on Windows a failed Astro run can end
 * with exit 127 after a libuv assertion.
 *
 * Opt-in (about 350 MB, under a minute); not part of `npm test`. Run it after
 * an Astro upgrade or any change to the figure wiring:
 *   node scripts/check-figures-build.mjs
 * On the shared machine, go through the slot limiter.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(repo, 'scripts', 'figures-build-fixture');
const pagesDir = join(fixture, 'src', 'data', 'pages');
const probe = join(pagesDir, 'zz-probe.md');
const astroBin = join(repo, 'node_modules', 'astro', 'astro.js');

function clean() {
  for (const p of [join(fixture, '.astro-cache'), join(fixture, '.astro'), probe]) {
    rmSync(p, { recursive: true, force: true });
  }
}

function sync() {
  const r = spawnSync(process.execPath, [astroBin, 'sync', '--root', fixture], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    timeout: 180_000,
  });
  const output = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  return { code: r.status ?? (r.signal ? 1 : 0), output };
}

const cases = [
  {
    name: 'bad token in a body fails the sync',
    probe: [
      '---',
      'title: "Probe"',
      'slug: "zz-probe"',
      '---',
      '',
      'Payment {{ loanPayment(50000, 7, 4, plan=plan9) | usd }} a month.',
      '',
    ].join('\n'),
    expectFail: true,
    mustInclude: [
      'zz-probe.md:6:9 figure token {{ loanPayment(50000, 7, 4, plan=plan9) | usd }}',
      'unknown option "plan"',
      '[figures] 1 pages entry failed to render',
    ],
  },
  {
    name: 'bad token in frontmatter fails the sync',
    probe: ['---', 'title: "{{ loanPayment(50000, 7, 4) }}"', 'slug: "zz-probe"', '---', '', 'Fine.', ''].join('\n'),
    expectFail: true,
    mustInclude: ['does not match collection schema', 'title: figure token {{ loanPayment(50000, 7, 4) }}', 'add a formatter'],
  },
  {
    name: 'a token in an inputs key fails the sync',
    probe: ['---', 'title: "Probe"', 'slug: "zz-probe"', 'inputs:', '  "{{ taxYear(uk) }} label": "x"', '---', '', 'Fine.', ''].join('\n'),
    expectFail: true,
    mustInclude: ['does not match collection schema', 'figure tokens are not allowed in this field'],
  },
  {
    name: 'good tokens pass and are resolved in the synced data',
    probe: null,
    expectFail: false,
    mustInclude: [],
    after: () => {
      const store = join(fixture, '.astro-cache', 'data-store.json');
      if (!existsSync(store)) return 'no data-store.json after sync';
      // Astro also stores the raw body and the raw frontmatter copy in
      // rendered.metadata.frontmatter (tokens unresolved), so raw tokens are
      // expected in the file. The resolved strings below can only come from the
      // zod transform (title) and the rendered HTML (body).
      const data = readFileSync(store, 'utf8');
      if (!data.includes('Car loan: $1,197 a month')) return 'frontmatter token not resolved in the data store';
      if (!data.includes('Total interest: $7,471')) return 'body token not resolved in the rendered HTML';
      return '';
    },
  },
];

let failed = 0;
try {
  for (const c of cases) {
    clean();
    if (c.probe) writeFileSync(probe, c.probe);
    const { code, output } = sync();
    const problems = [];
    if (c.expectFail && code === 0) problems.push('expected a non-zero exit, got 0');
    if (!c.expectFail && code !== 0) problems.push(`expected exit 0, got ${code}`);
    for (const s of c.mustInclude) if (!output.includes(s)) problems.push(`output is missing: ${s}`);
    if (c.after && problems.length === 0) {
      const p = c.after();
      if (p) problems.push(p);
    }
    if (problems.length) {
      failed++;
      console.log(`FAIL  ${c.name} (exit ${code})\n  - ${problems.join('\n  - ')}\n--- output ---\n${output.trim().slice(-3000)}\n---`);
    } else {
      console.log(`PASS  ${c.name} (exit ${code})`);
    }
  }
} finally {
  clean();
}

console.log(failed ? `\n${failed} of ${cases.length} checks failed` : `\nall ${cases.length} checks passed`);
process.exit(failed ? 1 : 0);

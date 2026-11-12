/**
 * island-preload: modulepreload hints for a tool page's island (LA-1).
 * Fixture chunks mimic Rollup/Vite minified output.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { staticImportsOf, findChunk, staticClosure, islandPreloads } from './island-preload';

describe('staticImportsOf', () => {
  it('finds named, default, namespace, bare and re-export imports in minified code', () => {
    const src =
      'import{j as e}from"./jsx-runtime.D_zvdyIk.js";import r from"./index.B2lkdKIL.js";' +
      'import*as t from"./ns.AAAA.js";import"./side-effect.BBBB.js";export{x as y}from"./re.CCCC.js";' +
      'const a=1;';
    expect(staticImportsOf(src)).toEqual([
      'jsx-runtime.D_zvdyIk.js',
      'index.B2lkdKIL.js',
      'ns.AAAA.js',
      'side-effect.BBBB.js',
      're.CCCC.js',
    ]);
  });

  it('ignores dynamic import() calls (lazy chunks stay lazy) and import.meta', () => {
    const src =
      'const m=()=>import("./PdfExport.DDDD.js");' +
      'const p=__vitePreload(()=>import("./Chart.EEEE.js"),[]);' +
      'const u=new URL("./w.FFFF.js",import.meta.url);';
    expect(staticImportsOf(src)).toEqual([]);
  });

  it('handles multi-line, spaced (unminified) import statements', () => {
    const src = `import {\n  a,\n  b as c\n} from './spaced.GGGG.js';\nimport './bare.HHHH.js';`;
    expect(staticImportsOf(src)).toEqual(['spaced.GGGG.js', 'bare.HHHH.js']);
  });
});

describe('findChunk / staticClosure / islandPreloads', () => {
  let dir: string;
  const write = (name: string, body: string) => fs.writeFileSync(path.join(dir, name), body);

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'island-preload-'));
    write('SalaryUkCalc.Abc_12-x.js', 'import{a}from"./react.R1.js";import"./chart.C1.js";const l=()=>import("./lazy.L1.js");');
    write('SalaryUkCalc2.Zzz.js', 'export{}');
    write('react.R1.js', 'export const a=1;');
    write('chart.C1.js', 'import{a}from"./react.R1.js";import"./missing.M1.js";');
    write('lazy.L1.js', 'export{}');
    write('client.K1.js', 'import{a}from"./react.R1.js";import"./dom.D1.js";');
    write('dom.D1.js', 'export{}');
    write('Twin.A.js', 'export{}');
    write('Twin.B.js', 'export{}');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('matches the chunk name exactly (SalaryUkCalc is not SalaryUkCalc2)', () => {
    expect(findChunk(dir, 'SalaryUkCalc')).toEqual({ file: 'SalaryUkCalc.Abc_12-x.js' });
  });

  it('reports missing and ambiguous chunk names instead of guessing', () => {
    expect(findChunk(dir, 'NopeCalc')).toEqual({ error: 'no chunk named NopeCalc' });
    expect(findChunk(dir, 'Twin')).toEqual({ error: '2 chunks named Twin' });
  });

  it('walks static imports breadth-first, dedupes, skips missing files and dynamic imports', () => {
    expect(staticClosure(dir, ['SalaryUkCalc.Abc_12-x.js'])).toEqual([
      'SalaryUkCalc.Abc_12-x.js',
      'react.R1.js',
      'chart.C1.js',
    ]);
  });

  it('returns component + renderer closures as public URLs', () => {
    expect(islandPreloads('SalaryUkCalc', { assetsDir: dir })).toEqual([
      '/_astro/SalaryUkCalc.Abc_12-x.js',
      '/_astro/client.K1.js',
      '/_astro/react.R1.js',
      '/_astro/chart.C1.js',
      '/_astro/dom.D1.js',
    ]);
  });

  it('returns [] with one warning when a chunk cannot be identified', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(islandPreloads('Twin', { assetsDir: dir })).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[island-preload] 2 chunks named Twin');
    warn.mockRestore();
  });
});

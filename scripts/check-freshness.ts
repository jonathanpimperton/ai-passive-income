/**
 * Maintenance checker — flags tool pages with stale lastUpdated dates.
 * Run with: npx tsx scripts/check-freshness.ts
 *
 * Reports any rate-dependent calculator whose lastUpdated is older than 90 days.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(__dirname, '../src/data/tools');

const STALE_DAYS = 90;
const RATE_DEPENDENT_CATEGORIES = new Set([
  'income-and-planning',
  'economic',
  'debt-and-loans',
]);

interface ToolCheck {
  slug: string;
  category: string;
  lastUpdated: string | null;
  daysSinceUpdate: number | null;
  stale: boolean;
  hasDataSources: boolean;
  hasCalculationMethod: boolean;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (m) fm[m[1]] = m[2];
  }
  return fm;
}

const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith('.md'));
const now = Date.now();
const results: ToolCheck[] = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(toolsDir, file), 'utf-8');
  const fm = parseFrontmatter(content);

  const slug = fm.slug || file.replace('.md', '');
  const category = fm.category || 'unknown';
  const lastUpdated = fm.lastUpdated || null;
  const hasDataSources = content.includes('dataSources:');
  const hasCalculationMethod = content.includes('calculationMethod:');

  let daysSinceUpdate: number | null = null;
  let stale = false;

  if (lastUpdated) {
    const updatedMs = new Date(lastUpdated + 'T00:00:00').getTime();
    daysSinceUpdate = Math.floor((now - updatedMs) / (1000 * 60 * 60 * 24));
    stale = daysSinceUpdate > STALE_DAYS;
  } else if (RATE_DEPENDENT_CATEGORIES.has(category)) {
    stale = true; // Rate-dependent tool without lastUpdated is always stale
  }

  results.push({ slug, category, lastUpdated, daysSinceUpdate, stale, hasDataSources, hasCalculationMethod });
}

// Report
const staleTools = results.filter((r) => r.stale);
const freshTools = results.filter((r) => !r.stale);

console.log('=== CalcRun Tool Freshness Report ===\n');

if (staleTools.length > 0) {
  console.log(`⚠  ${staleTools.length} tool(s) need attention:\n`);
  for (const t of staleTools) {
    const age = t.daysSinceUpdate !== null ? `${t.daysSinceUpdate} days old` : 'no lastUpdated set';
    console.log(`  ${t.slug} (${t.category}) — ${age}`);
  }
  console.log('');
}

console.log(`✓  ${freshTools.length} tool(s) are current.\n`);

// Summary table
console.log('--- Full Report ---');
console.log('Slug'.padEnd(30) + 'Category'.padEnd(25) + 'Last Updated'.padEnd(15) + 'Days'.padEnd(8) + 'Status');
console.log('-'.repeat(85));
for (const t of results.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const status = t.stale ? '⚠ STALE' : '✓ OK';
  const days = t.daysSinceUpdate !== null ? String(t.daysSinceUpdate) : 'N/A';
  const date = t.lastUpdated || '—';
  console.log(t.slug.padEnd(30) + t.category.padEnd(25) + date.padEnd(15) + days.padEnd(8) + status);
}

process.exit(staleTools.length > 0 ? 1 : 0);

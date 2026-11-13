/**
 * Tool islands and embeds (LA-1, LA-6): the slug -> component map, the
 * ToolIsland.astro switch, the embeddable set and the auto-height loader.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOOL_COMPONENTS, toolComponent, isEmbeddable, embedPath, PLACEHOLDER_COMPONENT } from './tool-islands';
import { TOOLS } from './tools-data';
import { EMBED_RESIZE_JS } from '../pages/embed/resize.js';

const root = path.resolve(__dirname, '../..');
const islandSrc = fs.readFileSync(path.join(root, 'src/components/ui/ToolIsland.astro'), 'utf8');
const toolMdSlugs = fs
  .readdirSync(path.join(root, 'src/data/tools'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => fs.readFileSync(path.join(root, 'src/data/tools', f), 'utf8').match(/^slug:\s*"([^"]+)"/m)?.[1])
  .filter(Boolean) as string[];

describe('TOOL_COMPONENTS', () => {
  it('maps every tool page to an existing component file', () => {
    for (const slug of toolMdSlugs) {
      const comp = toolComponent(slug);
      expect(fs.existsSync(path.join(root, 'src/components/tools', `${comp}.tsx`)), `${slug} -> ${comp}`).toBe(true);
    }
  });

  it('has no entries for tools that do not exist', () => {
    for (const slug of Object.keys(TOOL_COMPONENTS)) expect(toolMdSlugs).toContain(slug);
  });

  it('falls back to the placeholder for unknown slugs', () => {
    expect(toolComponent('not-a-tool')).toBe(PLACEHOLDER_COMPONENT);
  });
});

describe('ToolIsland.astro switch', () => {
  it('renders every mapped component with client:load, and nothing with idle/visible', () => {
    for (const [slug, comp] of Object.entries(TOOL_COMPONENTS)) {
      expect(islandSrc).toContain(`{slug === '${slug}' && <${comp} client:load />}`);
      expect(islandSrc).toContain(`import ${comp} from '@components/tools/${comp}.tsx';`);
    }
    expect(islandSrc).not.toMatch(/client:(idle|visible|only)/);
    expect(islandSrc).toContain('<PlaceholderCalc name={name} client:load />');
  });
});

describe('embeddable tools', () => {
  const embeddable = TOOLS.filter((t) => isEmbeddable(t.category, t.slug));

  it('are exactly the 23 financial calculators', () => {
    expect(embeddable).toHaveLength(23);
    for (const t of embeddable) expect(['saving-and-growth', 'debt-and-loans', 'income-and-planning', 'economic']).toContain(t.category);
  });

  it('exclude file and developer tools', () => {
    expect(TOOLS.filter((t) => ['file-tools', 'utility'].includes(t.category)).some((t) => isEmbeddable(t.category, t.slug))).toBe(false);
  });

  it('live under /embed/<slug>/', () => {
    expect(embedPath('mortgage-payment')).toBe('/embed/mortgage-payment/');
  });
});

describe('/embed/resize.js loader', () => {
  type Frame = { contentWindow: object; style: { height?: string } };
  function load(scriptSrc: string | null, frames: Frame[]) {
    let handler: ((e: { origin: string; data: unknown; source: unknown }) => void) | null = null;
    const win: Record<string, unknown> = {
      addEventListener: (type: string, fn: typeof handler) => { if (type === 'message') handler = fn; },
    };
    const doc = {
      currentScript: scriptSrc ? { src: scriptSrc } : null,
      getElementsByTagName: (tag: string) => (tag === 'iframe' ? frames : []),
    };
    new Function('window', 'document', EMBED_RESIZE_JS)(win, doc);
    return (origin: string, data: unknown, source: unknown) => handler!({ origin, data, source });
  }

  it('resizes only the iframe that sent the message, from the script origin', () => {
    const a: Frame = { contentWindow: {}, style: {} };
    const b: Frame = { contentWindow: {}, style: {} };
    const send = load('https://www.calcrun.com/embed/resize.js', [a, b]);
    send('https://www.calcrun.com', { type: 'calcrun:height', height: 1234.4 }, b.contentWindow);
    expect(b.style.height).toBe('1234px');
    expect(a.style.height).toBeUndefined();
  });

  it('ignores other origins, other message types and non-numeric heights', () => {
    const a: Frame = { contentWindow: {}, style: {} };
    const send = load('https://www.calcrun.com/embed/resize.js', [a]);
    send('https://evil.example', { type: 'calcrun:height', height: 900 }, a.contentWindow);
    send('https://www.calcrun.com', { type: 'other', height: 900 }, a.contentWindow);
    send('https://www.calcrun.com', { type: 'calcrun:height', height: '900' }, a.contentWindow);
    send('https://www.calcrun.com', { type: 'calcrun:height', height: Infinity }, a.contentWindow);
    send('https://www.calcrun.com', null, a.contentWindow);
    expect(a.style.height).toBeUndefined();
  });

  it('clamps heights and trusts its own origin when served elsewhere (local QA)', () => {
    const a: Frame = { contentWindow: {}, style: {} };
    const send = load('http://127.0.0.1:4411/embed/resize.js', [a]);
    send('https://www.calcrun.com', { type: 'calcrun:height', height: 900 }, a.contentWindow);
    expect(a.style.height).toBeUndefined();
    send('http://127.0.0.1:4411', { type: 'calcrun:height', height: 5 }, a.contentWindow);
    expect(a.style.height).toBe('240px');
    send('http://127.0.0.1:4411', { type: 'calcrun:height', height: 1e9 }, a.contentWindow);
    expect(a.style.height).toBe('12000px');
  });

  it('defaults to the production origin when currentScript is unavailable', () => {
    const a: Frame = { contentWindow: {}, style: {} };
    const send = load(null, [a]);
    send('https://www.calcrun.com', { type: 'calcrun:height', height: 800 }, a.contentWindow);
    expect(a.style.height).toBe('800px');
  });
});

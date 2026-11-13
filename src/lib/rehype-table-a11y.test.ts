import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeParse from 'rehype-parse';
import rehypeTableA11y from './rehype-table-a11y.mjs';

async function render(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeTableA11y)
    .use(rehypeStringify)
    .process(md);
  return String(file);
}

const TABLE = '| Salary | Take-home |\n|---|---|\n| £30,000 | £24,000 |\n';

describe('rehype-table-a11y (F-25)', () => {
  it('scopes header cells as column headers', async () => {
    const html = await render(TABLE);
    expect(html).toContain('<th scope="col">Salary</th>');
    expect(html).toContain('<th scope="col">Take-home</th>');
    expect(html).not.toMatch(/<td[^>]*scope/);
  });

  it('captions a table from the nearest preceding heading, visually hidden', async () => {
    const html = await render(`## Take-home by salary\n\nSome intro text.\n\n${TABLE}`);
    expect(html).toMatch(/<table><caption class="sr-only">Take-home by salary<\/caption>/);
  });

  it('uses the closest heading when there are several', async () => {
    const html = await render(`## Outer\n\n### Inner **bold** part\n\n${TABLE}`);
    expect(html).toContain('<caption class="sr-only">Inner bold part</caption>');
  });

  it('adds no caption when no heading precedes the table', async () => {
    const html = await render(`Intro.\n\n${TABLE}`);
    expect(html).not.toContain('<caption');
  });

  it('keeps an existing caption and scope', async () => {
    const file = await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeTableA11y)
      .use(rehypeStringify)
      .process('<h2>Heading</h2><table><caption>Mine</caption><thead><tr><th scope="row">A</th></tr></thead></table>');
    const html = String(file);
    expect(html).toContain('<caption>Mine</caption>');
    expect(html).not.toContain('sr-only');
    expect(html).toContain('<th scope="row">A</th>');
  });
});

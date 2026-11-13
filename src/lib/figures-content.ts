/**
 * Content-collection glue for the figure engine (used by src/content.config.ts).
 *
 * - `resolveFigureField`: a zod transform for frontmatter strings. Resolves
 *   `{{ ... }}` tokens and reports bad ones as schema issues, so Astro fails
 *   the build naming the entry and the field.
 * - `figureText()` / `figureIdent()`: the zod string schemas content.config.ts
 *   uses for prose fields (tokens resolved) and identifier fields and record
 *   keys (tokens refused).
 * - `withRenderCheck`: wraps a loader (the glob loader) so that a Markdown
 *   entry whose body failed to render fails the build. Astro's glob loader
 *   catches render errors and only logs them, which would publish a page with
 *   an empty body; a bad figure token in a body must stop the deploy instead.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';
import { resolveFiguresPlain } from './figures';

/** The part of zod's RefinementCtx this needs (kept structural for testing). */
export interface IssueSink {
  addIssue: (issue: { code: 'custom'; message: string }) => void;
}

/** zod `.transform()` callback for every frontmatter string. */
export function resolveFigureField(value: string, ctx: IssueSink): string {
  const { text, problems } = resolveFiguresPlain(value);
  for (const p of problems) {
    ctx.addIssue({ code: 'custom', message: `figure token ${p.message}` });
  }
  return text;
}

/** Prose frontmatter string: `{{ ... }}` tokens are resolved; a bad token is a schema error. */
export const figureText = () => z.string().transform(resolveFigureField);

/** Identifier string or record key (slug, date, URL, partner id, input label): tokens are refused. */
export const figureIdent = () =>
  z.string().refine((v) => !v.includes('{{'), { message: 'figure tokens are not allowed in this field' });

const ERRORS_KEY = '__calcrunFigureErrors';

function renderErrorsFor(absPath: string): string[] {
  const reg = (globalThis as Record<string, unknown>)[ERRORS_KEY] as Map<string, string[]> | undefined;
  if (!reg) return [];
  const want = absPath.replace(/\\/g, '/').toLowerCase();
  for (const [k, v] of reg) {
    if (k.replace(/\\/g, '/').toLowerCase() === want) return v;
  }
  return [];
}

/**
 * Wrap a loader so a Markdown entry stored without rendered HTML (a swallowed
 * render error) fails the sync. The broken entries are removed from the store
 * first, so the next build re-renders them instead of trusting the cache.
 */
export function withRenderCheck<L extends Loader>(loader: L): L {
  return {
    ...loader,
    load: async (context: LoaderContext) => {
      await loader.load(context);
      const failed = context.store
        .values()
        .filter((e) => typeof e.filePath === 'string' && /\.md$/i.test(e.filePath) && !e.deferredRender && !e.rendered);
      if (failed.length === 0) return;
      const root = context.config?.root ? fileURLToPath(context.config.root) : process.cwd();
      const lines: string[] = [];
      for (const entry of failed) {
        context.store.delete(entry.id);
        const abs = resolve(root, entry.filePath as string);
        const known = renderErrorsFor(abs);
        lines.push(...(known.length ? known : [`${entry.filePath}: Markdown body failed to render (see "Error rendering" above)`]));
      }
      throw new Error(
        `[figures] ${failed.length} ${context.collection} entr${failed.length === 1 ? 'y' : 'ies'} failed to render; ` +
          `the build is stopped so no page ships with an empty body:\n${lines.join('\n')}`,
      );
    },
  };
}

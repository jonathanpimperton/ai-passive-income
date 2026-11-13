// Fixture collection wired exactly like src/content.config.ts: glob loader
// wrapped in withRenderCheck, prose fields through figureText(), identifier
// fields and inputs keys through figureIdent().
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { figureIdent, figureText, withRenderCheck } from '../../../src/lib/figures-content';

const pages = defineCollection({
  loader: withRenderCheck(glob({ pattern: '**/*.md', base: './src/data/pages' })),
  schema: z.object({
    title: figureText(),
    slug: figureIdent(),
    inputs: z.record(figureIdent(), z.union([figureText(), z.number()])).optional(),
  }),
});

export const collections = { pages };

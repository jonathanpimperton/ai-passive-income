import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { resolveFigureField, withRenderCheck } from './lib/figures-content';

/*
 * Figure tokens (plan-2026-11 RC1; docs/figures.md). Every prose string in
 * frontmatter goes through `text()`, which resolves `{{ ... }}` tokens from the
 * src/lib engines and fails the build on a bad token. Identifier fields (slugs,
 * dates, URLs, partner ids) use `ident()`, which refuses tokens outright.
 * Markdown bodies are resolved by src/lib/remark-figures.mjs; `withRenderCheck`
 * makes a body that failed to render fail the build instead of shipping empty.
 */
const text = () => z.string().transform(resolveFigureField);
const ident = () =>
  z.string().refine((v) => !v.includes('{{'), { message: 'figure tokens are not allowed in this field' });

const scenarios = defineCollection({
  loader: withRenderCheck(glob({ pattern: '**/*.md', base: './src/data/scenarios' })),
  schema: z.object({
    title: text(),
    slug: ident(),
    description: text(),
    keywords: z.array(text()),
    toolSlug: ident(),
    toolCategory: ident(),
    inputs: z.record(z.string(), z.union([text(), z.number()])),
    resultSummary: text(),
    // E-E-A-T (Phase 3): ISO dates rendered in the byline and emitted in
    // Article JSON-LD. datePublished is backfilled from git history.
    datePublished: ident(),
    dateModified: ident(),
    // Optional real Q&A rendered on the page AND emitted as FAQPage JSON-LD.
    // Only add when the questions genuinely exist on the page — never for schema alone.
    faq: z
      .array(
        z.object({
          question: text(),
          answer: text(),
        })
      )
      .optional(),
    affiliateContext: text().optional(),
    affiliatePrograms: z.array(ident()).optional(),
  }),
});

const tools = defineCollection({
  loader: withRenderCheck(glob({ pattern: '**/*.md', base: './src/data/tools' })),
  schema: z.object({
    name: text(),
    slug: ident(),
    category: z.enum([
      'saving-and-growth',
      'debt-and-loans',
      'income-and-planning',
      'economic',
      'utility',
      'file-tools',
    ]),
    description: text(),
    keywords: z.array(text()),
    relatedTools: z.array(ident()),
    affiliateContext: text().optional(),
    affiliatePrograms: z.array(ident()).optional(),
    faq: z.array(
      z.object({
        question: text(),
        answer: text(),
      })
    ),
    workedExamples: z
      .array(
        z.object({
          title: text(),
          inputs: z.record(z.string(), z.union([text(), z.number()])),
          description: text(),
        })
      )
      .optional(),
    lastUpdated: ident().optional(),
    dataSources: z
      .array(
        z.object({
          name: text(),
          url: ident(),
        })
      )
      .optional(),
    calculationMethod: text().optional(),
  }),
});

const comparisons = defineCollection({
  loader: withRenderCheck(glob({ pattern: '**/*.md', base: './src/data/comparisons' })),
  schema: z.object({
    title: text(),
    slug: ident(),
    description: text(),
    keywords: z.array(text()),
    relatedTools: z.array(ident()),
    verdict: text(),
    comparisonTable: z.array(
      z.object({
        feature: text(),
        option1: text(),
        option2: text(),
        // Optional third column for three-way comparisons (e.g. PCP vs HP vs personal loan).
        // When present on any row, the comparison template renders a third column.
        option3: text().optional(),
      })
    ),
    // E-E-A-T (Phase 3): byline dates + primary sources rendered on the page
    // and emitted in Article JSON-LD.
    datePublished: ident(),
    dateModified: ident(),
    // Optional real Q&A rendered on the page AND emitted as FAQPage JSON-LD.
    faq: z
      .array(
        z.object({
          question: text(),
          answer: text(),
        })
      )
      .optional(),
    sources: z
      .array(
        z.object({
          name: text(),
          url: ident(),
        })
      )
      .optional(),
    affiliateContext: text().optional(),
    affiliatePrograms: z.array(ident()).optional(),
  }),
});

const methodologies = defineCollection({
  loader: withRenderCheck(glob({ pattern: '**/*.md', base: './src/data/methodologies' })),
  schema: z.object({
    title: text(),
    slug: ident(),
    toolSlug: ident(),
    formula: text(),
    variables: z.array(
      z.object({
        name: text(),
        description: text(),
      })
    ),
    assumptions: z.array(text()),
    limitations: z.array(text()),
    dataSources: z
      .array(
        z.object({
          name: text(),
          url: ident(),
        })
      )
      .optional(),
  }),
});

export const collections = { tools, scenarios, comparisons, methodologies };

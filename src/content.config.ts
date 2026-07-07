import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const scenarios = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/scenarios' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    toolSlug: z.string(),
    toolCategory: z.string(),
    inputs: z.record(z.string(), z.union([z.string(), z.number()])),
    resultSummary: z.string(),
    // E-E-A-T (Phase 3): ISO dates rendered in the byline and emitted in
    // Article JSON-LD. datePublished is backfilled from git history.
    datePublished: z.string(),
    dateModified: z.string(),
    // Optional real Q&A rendered on the page AND emitted as FAQPage JSON-LD.
    // Only add when the questions genuinely exist on the page — never for schema alone.
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    affiliateContext: z.string().optional(),
    affiliatePrograms: z.array(z.string()).optional(),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/tools' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    category: z.enum([
      'saving-and-growth',
      'debt-and-loans',
      'income-and-planning',
      'economic',
      'utility',
      'file-tools',
    ]),
    description: z.string(),
    keywords: z.array(z.string()),
    relatedTools: z.array(z.string()),
    affiliateContext: z.string().optional(),
    affiliatePrograms: z.array(z.string()).optional(),
    faq: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    workedExamples: z
      .array(
        z.object({
          title: z.string(),
          inputs: z.record(z.string(), z.union([z.string(), z.number()])),
          description: z.string(),
        })
      )
      .optional(),
    lastUpdated: z.string().optional(),
    dataSources: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
        })
      )
      .optional(),
    calculationMethod: z.string().optional(),
  }),
});

const comparisons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/comparisons' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    relatedTools: z.array(z.string()),
    verdict: z.string(),
    comparisonTable: z.array(
      z.object({
        feature: z.string(),
        option1: z.string(),
        option2: z.string(),
        // Optional third column for three-way comparisons (e.g. PCP vs HP vs personal loan).
        // When present on any row, the comparison template renders a third column.
        option3: z.string().optional(),
      })
    ),
    // E-E-A-T (Phase 3): byline dates + primary sources rendered on the page
    // and emitted in Article JSON-LD.
    datePublished: z.string(),
    dateModified: z.string(),
    // Optional real Q&A rendered on the page AND emitted as FAQPage JSON-LD.
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    sources: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
        })
      )
      .optional(),
    affiliateContext: z.string().optional(),
    affiliatePrograms: z.array(z.string()).optional(),
  }),
});

const methodologies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/methodologies' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    toolSlug: z.string(),
    formula: z.string(),
    variables: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
      })
    ),
    assumptions: z.array(z.string()),
    limitations: z.array(z.string()),
    dataSources: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
        })
      )
      .optional(),
  }),
});

export const collections = { tools, scenarios, comparisons, methodologies };

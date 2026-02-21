import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
  }),
});

export const collections = { tools };

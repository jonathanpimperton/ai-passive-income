/**
 * Build-time OG image generation for every tool page.
 * Uses Satori to render a React-like JSX tree to SVG, then Sharp to convert to PNG.
 * Output: /og/{slug}.png (1200×630) — standard OG image size.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  'saving-and-growth': { bg: '#EFF6FF', accent: '#0E8585' },
  'debt-and-loans': { bg: '#FEF2F2', accent: '#DC2626' },
  'income-and-planning': { bg: '#F0FDF4', accent: '#16A34A' },
  economic: { bg: '#FFFBEB', accent: '#D97706' },
  utility: { bg: '#F5F3FF', accent: '#7C3AED' },
  'file-tools': { bg: '#FFF1F2', accent: '#E11D48' },
};

export const getStaticPaths: GetStaticPaths = async () => {
  const tools = await getCollection('tools');
  return tools.map((tool) => ({
    params: { slug: tool.data.slug },
    props: {
      name: tool.data.name,
      description: tool.data.description,
      category: tool.data.category,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { name, description, category } = props as {
    name: string;
    description: string;
    category: string;
  };

  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['utility'];

  // Load fonts
  const fontDir = path.resolve('public/fonts');
  const interBold = fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf'));
  const interRegular = fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf'));

  // Truncate description to ~120 chars for OG image readability
  const shortDesc =
    description.length > 120
      ? description.slice(0, 117) + '...'
      : description;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          backgroundColor: '#FFFFFF',
          fontFamily: 'Inter',
        },
        children: [
          // Top accent bar
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                backgroundColor: colors.accent,
              },
            },
          },
          // Main content
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: 1,
              },
              children: [
                // Category pill
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            backgroundColor: colors.bg,
                            color: colors.accent,
                            fontSize: '20px',
                            fontWeight: 700,
                            padding: '8px 20px',
                            borderRadius: '100px',
                          },
                          children: getCategoryLabel(category),
                        },
                      },
                    ],
                  },
                },
                // Tool name
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '52px',
                      fontWeight: 700,
                      color: '#0F1B2D',
                      lineHeight: 1.15,
                      letterSpacing: '-0.02em',
                    },
                    children: name,
                  },
                },
                // Description
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '24px',
                      color: '#64748B',
                      lineHeight: 1.5,
                    },
                    children: shortDesc,
                  },
                },
              ],
            },
          },
          // Footer with branding
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
              children: [
                // CalcRun logo text
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: {
                            fontSize: '32px',
                            fontWeight: 700,
                            color: '#0F1B2D',
                          },
                          children: 'Calc',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            fontSize: '32px',
                            fontWeight: 700,
                            color: '#0E8585',
                          },
                          children: 'Run',
                        },
                      },
                    ],
                  },
                },
                // Tagline
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '18px',
                      color: '#94A3B8',
                    },
                    children: 'Free \u00b7 No signup \u00b7 No ads',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
      ],
    },
  );

  const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'saving-and-growth': 'Saving & Growth',
    'debt-and-loans': 'Debt & Loans',
    'income-and-planning': 'Income & Planning',
    economic: 'Economic',
    utility: 'Utility Tools',
    'file-tools': 'File Tools',
  };
  return labels[category] || 'Tool';
}

/**
 * Build-time OG image generation for scenario pages.
 * Shows the result summary prominently + key inputs as pills.
 * Output: /og/scenarios/{slug}.png (1200x630)
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
};

export const getStaticPaths: GetStaticPaths = async () => {
  const scenarios = await getCollection('scenarios');
  return scenarios.map((s) => ({
    params: { slug: s.data.slug },
    props: {
      title: s.data.title,
      resultSummary: s.data.resultSummary,
      inputs: s.data.inputs,
      toolCategory: s.data.toolCategory,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, resultSummary, inputs, toolCategory } = props as {
    title: string;
    resultSummary: string;
    inputs: Record<string, string | number>;
    toolCategory: string;
  };

  const colors = CATEGORY_COLORS[toolCategory] || CATEGORY_COLORS['saving-and-growth'];

  const fontDir = path.resolve('public/fonts');
  const baskBold = fs.readFileSync(path.join(fontDir, 'LibreBaskerville-Bold.ttf'));
  const dmSans = fs.readFileSync(path.join(fontDir, 'DMSans-Regular.ttf'));

  // Take first 3 inputs for pills
  const inputEntries = Object.entries(inputs).slice(0, 3);

  const shortTitle = title.length > 70 ? title.slice(0, 67) + '...' : title;

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
          fontFamily: 'Libre Baskerville, DM Sans',
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
                gap: '16px',
                flex: 1,
              },
              children: [
                // Scenario title
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '36px',
                      fontWeight: 700,
                      color: '#0F1B2D',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    },
                    children: shortTitle,
                  },
                },
                // Result summary (big number)
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '64px',
                      fontWeight: 700,
                      color: colors.accent,
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                      marginTop: '8px',
                    },
                    children: resultSummary,
                  },
                },
                // Input pills
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginTop: '12px',
                    },
                    children: inputEntries.map(([key, val]) => ({
                      type: 'div',
                      props: {
                        style: {
                          backgroundColor: colors.bg,
                          color: '#4A4A5A',
                          fontSize: '18px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                        },
                        children: `${key}: ${val}`,
                      },
                    })),
                  },
                },
              ],
            },
          },
          // Footer
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: '4px' },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: { fontSize: '32px', fontWeight: 700, color: '#0F1B2D' },
                          children: 'Calc',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: { fontSize: '32px', fontWeight: 700, color: '#0E8585' },
                          children: 'Run',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '18px', color: '#94A3B8' },
                    children: 'calcrun.com',
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
        { name: 'Libre Baskerville', data: baskBold, weight: 700, style: 'normal' },
        { name: 'DM Sans', data: dmSans, weight: 400, style: 'normal' },
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

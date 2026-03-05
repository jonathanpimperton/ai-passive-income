/**
 * Build-time OG image generation for comparison articles.
 * Shows the title + verdict snippet.
 * Output: /og/comparisons/{slug}.png (1200x630)
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

export const getStaticPaths: GetStaticPaths = async () => {
  const comparisons = await getCollection('comparisons');
  return comparisons.map((c) => ({
    params: { slug: c.data.slug },
    props: {
      title: c.data.title,
      verdict: c.data.verdict,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, verdict } = props as { title: string; verdict: string };

  const fontDir = path.resolve('public/fonts');
  const baskBold = fs.readFileSync(path.join(fontDir, 'LibreBaskerville-Bold.ttf'));
  const dmSans = fs.readFileSync(path.join(fontDir, 'DMSans-Regular.ttf'));

  const shortVerdict = verdict.length > 140 ? verdict.slice(0, 137) + '...' : verdict;

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
          // Top accent bar (teal for comparisons)
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                backgroundColor: '#0E8585',
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
                // "Comparison" pill
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            backgroundColor: '#EFF6FF',
                            color: '#0E8585',
                            fontSize: '20px',
                            fontWeight: 700,
                            padding: '8px 20px',
                            borderRadius: '100px',
                          },
                          children: 'Comparison',
                        },
                      },
                    ],
                  },
                },
                // Title
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '48px',
                      fontWeight: 700,
                      color: '#0F1B2D',
                      lineHeight: 1.15,
                      letterSpacing: '-0.02em',
                    },
                    children: title,
                  },
                },
                // Verdict
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '22px',
                      color: '#64748B',
                      lineHeight: 1.5,
                    },
                    children: shortVerdict,
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

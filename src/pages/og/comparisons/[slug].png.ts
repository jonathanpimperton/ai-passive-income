/**
 * Build-time OG image generation for comparison articles.
 * "Precision Instrument" brand: paper background, 1px frame, teal accent.
 * Shows the title + verdict snippet.
 * Output: /og/comparisons/{slug}.png (1200x630)
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import {
  OG,
  OG_WIDTH,
  OG_HEIGHT,
  loadOgFonts,
  brandBlock,
  ogRoot,
  eyebrow,
  footerLine,
} from '../_brand';

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

  const shortVerdict = verdict.length > 140 ? verdict.slice(0, 137) + '...' : verdict;

  const svg = await satori(
    ogRoot([
      brandBlock(44, 30),
      // Main content
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            gap: '24px',
          },
          children: [
            eyebrow('Comparison'),
            // Title — big, 2 lines max
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  fontSize: '56px',
                  color: OG.ink,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  lineClamp: 2,
                },
                children: title,
              },
            },
            // Verdict
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'DM Sans',
                  fontSize: '24px',
                  color: OG.secondary,
                  lineHeight: 1.45,
                  maxWidth: '960px',
                  lineClamp: 3,
                },
                children: shortVerdict,
              },
            },
          ],
        },
      },
      footerLine(),
    ]),
    { width: OG_WIDTH, height: OG_HEIGHT, fonts: loadOgFonts() },
  );

  const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

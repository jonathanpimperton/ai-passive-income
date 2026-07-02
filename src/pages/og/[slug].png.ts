/**
 * Build-time OG image generation for every tool page.
 * "Precision Instrument" brand: paper background, 1px frame, teal accent.
 * Uses Satori to render a React-like JSX tree to SVG, then Sharp to convert to PNG.
 * Output: /og/{slug}.png (1200×630) — standard OG image size.
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
  getCategoryLabel,
} from './_brand';

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

  // Truncate description to ~120 chars for OG image readability
  const shortDesc =
    description.length > 120 ? description.slice(0, 117) + '...' : description;

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
            eyebrow(getCategoryLabel(category)),
            // Tool name — big title, 2 lines max
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  fontSize: '62px',
                  color: OG.ink,
                  lineHeight: 1.08,
                  letterSpacing: '-0.02em',
                  lineClamp: 2,
                },
                children: name,
              },
            },
            // Description
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'DM Sans',
                  fontSize: '26px',
                  color: OG.secondary,
                  lineHeight: 1.45,
                  maxWidth: '960px',
                  lineClamp: 2,
                },
                children: shortDesc,
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

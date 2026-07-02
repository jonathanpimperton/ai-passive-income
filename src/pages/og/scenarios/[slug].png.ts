/**
 * Build-time OG image generation for scenario pages.
 * "Precision Instrument" brand: paper background, 1px frame, teal accent.
 * Shows the result figure prominently + key inputs as bordered chips.
 * Output: /og/scenarios/{slug}.png (1200x630)
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
} from '../_brand';

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

/** Result figures range from "$7,185/month" to full sentences — scale to fit. */
function figureFontSize(text: string): string {
  if (text.length <= 16) return '88px';
  if (text.length <= 34) return '64px';
  return '44px';
}

export const GET: APIRoute = async ({ props }) => {
  const { title, resultSummary, inputs, toolCategory } = props as {
    title: string;
    resultSummary: string;
    inputs: Record<string, string | number>;
    toolCategory: string;
  };

  // Take first 3 inputs for chips
  const inputEntries = Object.entries(inputs).slice(0, 3);

  const shortTitle = title.length > 70 ? title.slice(0, 67) + '...' : title;

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
            gap: '20px',
          },
          children: [
            eyebrow(getCategoryLabel(toolCategory)),
            // Scenario title
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  fontSize: '34px',
                  color: OG.ink,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  lineClamp: 2,
                },
                children: shortTitle,
              },
            },
            // Result figure — large, tight, instrument-like
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  fontSize: figureFontSize(resultSummary),
                  color: OG.teal,
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  lineClamp: 2,
                },
                children: resultSummary,
              },
            },
            // Input chips
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '8px',
                },
                children: inputEntries.map(([key, val]) => ({
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: OG.paper,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: OG.frame,
                      borderRadius: '8px',
                      fontFamily: 'DM Sans',
                      fontSize: '19px',
                      padding: '10px 18px',
                    },
                    children: [
                      {
                        type: 'span',
                        props: { style: { color: OG.secondary }, children: `${key}:` },
                      },
                      {
                        type: 'span',
                        props: { style: { color: OG.ink }, children: String(val) },
                      },
                    ],
                  },
                })),
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

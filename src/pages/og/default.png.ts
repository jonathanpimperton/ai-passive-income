/**
 * Default OG image for non-tool pages (homepage, about, legal pages).
 * "Precision Instrument" brand: paper background, 1px frame, teal accent.
 * Generated at build time: /og/default.png
 */
import type { APIRoute } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import {
  OG,
  OG_WIDTH,
  OG_HEIGHT,
  loadOgFonts,
  logoMark,
  ogRoot,
  eyebrow,
  footerLine,
} from './_brand';

export const GET: APIRoute = async () => {
  const svg = await satori(
    ogRoot([
      // Centered brand composition
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            gap: '32px',
          },
          children: [
            eyebrow('Financial calculators & tools'),
            // Large brand block
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', gap: '28px' },
                children: [
                  logoMark(96),
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        fontFamily: 'Space Grotesk',
                        fontWeight: 600,
                        fontSize: '96px',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      },
                      children: [
                        { type: 'span', props: { style: { color: OG.ink }, children: 'Calc' } },
                        { type: 'span', props: { style: { color: OG.teal }, children: 'Run' } },
                      ],
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
                  fontFamily: 'DM Sans',
                  fontSize: '28px',
                  color: OG.secondary,
                },
                children: 'See your numbers instantly — no signup, no ads.',
              },
            },
            // Instrument-style stat row
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', gap: '40px', marginTop: '8px' },
                children: [
                  statBlock('40+', 'Tools'),
                  { type: 'div', props: { style: { width: '1px', height: '56px', backgroundColor: OG.frame } } },
                  statBlock('100%', 'Client-side'),
                ],
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

function statBlock(figure: string, label: string) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Space Grotesk',
              fontWeight: 600,
              fontSize: '40px',
              letterSpacing: '-0.02em',
              color: OG.teal,
            },
            children: figure,
          },
        },
        {
          type: 'div',
          props: {
            style: { fontFamily: 'DM Sans', fontSize: '18px', color: OG.secondary },
            children: label,
          },
        },
      ],
    },
  };
}

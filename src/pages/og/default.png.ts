/**
 * Default OG image for non-tool pages (homepage, about, legal pages).
 * Generated at build time: /og/default.png
 */
import type { APIRoute } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

export const GET: APIRoute = async () => {
  const fontDir = path.resolve('public/fonts');
  const baskBold = fs.readFileSync(path.join(fontDir, 'LibreBaskerville-Bold.ttf'));
  const dmSans = fs.readFileSync(path.join(fontDir, 'DMSans-Regular.ttf'));

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0F1B2D 0%, #0A5555 50%, #0F1B2D 100%)',
          fontFamily: 'Libre Baskerville, DM Sans',
          gap: '24px',
        },
        children: [
          // Logo
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '72px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                    },
                    children: 'Calc',
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '72px',
                      fontWeight: 700,
                      color: '#2AADAD',
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
                fontSize: '28px',
                color: '#94A3B8',
                textAlign: 'center',
              },
              children: 'See your numbers instantly \u2014 no signup, no ads.',
            },
          },
          // Tool count
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                gap: '32px',
                marginTop: '20px',
              },
              children: [
                {
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
                          style: { fontSize: '48px', fontWeight: 700, color: '#2AADAD' },
                          children: '42',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '18px', color: '#64748B' },
                          children: 'Free Tools',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      width: '1px',
                      backgroundColor: '#334155',
                    },
                  },
                },
                {
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
                          style: { fontSize: '48px', fontWeight: 700, color: '#2AADAD' },
                          children: '100%',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '18px', color: '#64748B' },
                          children: 'Client-Side',
                        },
                      },
                    ],
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

/**
 * Shared "Precision Instrument" brand primitives for OG image endpoints.
 * The underscore prefix excludes this file from Astro routing.
 *
 * Palette: paper background, subtle 1px border frame, ink text,
 * deep teal as the only accent, muted secondary text.
 * Type: Space Grotesk 600 (display/figures) + DM Sans 400 (supporting text).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

export const OG = {
  paper: '#FCFCFA',
  frame: '#E4E4E0',
  ink: '#14161A',
  teal: '#0B6E6E',
  secondary: '#555A66',
} as const;

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Minimal satori node shape (satori accepts React-element-like objects). */
export interface OgNode {
  type: string;
  props: Record<string, unknown>;
}

/** Satori font config: Space Grotesk SemiBold (display) + DM Sans Regular (body). */
export function loadOgFonts() {
  const fontDir = path.resolve('public/fonts');
  return [
    {
      name: 'Space Grotesk',
      data: fs.readFileSync(path.join(fontDir, 'SpaceGrotesk-SemiBold.ttf')),
      weight: 600 as const,
      style: 'normal' as const,
    },
    {
      name: 'DM Sans',
      data: fs.readFileSync(path.join(fontDir, 'DMSans-Regular.ttf')),
      weight: 400 as const,
      style: 'normal' as const,
    },
  ];
}

/**
 * The CalcRun mark: teal rounded square with a white rising spark line
 * and a small arrowhead. Mirrors src/components/ui/Logo.astro exactly.
 * Drawn as SVG-in-JSX (satori supports embedded svg elements).
 */
export function logoMark(size: number): OgNode {
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      children: [
        {
          type: 'rect',
          props: { x: 1, y: 1, width: 22, height: 22, rx: 6, fill: OG.teal },
        },
        {
          type: 'path',
          props: {
            d: 'M6 15.5 L10.5 11 L13.5 13.5 L18 8.5',
            fill: 'none',
            stroke: '#FFFFFF',
            'stroke-width': 2.2,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          },
        },
        {
          type: 'path',
          props: {
            d: 'M18 8.5 h-3.2 M18 8.5 v3.2',
            fill: 'none',
            stroke: '#FFFFFF',
            'stroke-width': 2.2,
            'stroke-linecap': 'round',
          },
        },
      ],
    },
  };
}

/** Mark + "CalcRun" wordmark ("Calc" ink, "Run" teal). */
export function brandBlock(markSize = 44, fontSize = 30): OgNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: `${Math.round(markSize * 0.32)}px`,
      },
      children: [
        logoMark(markSize),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontFamily: 'Space Grotesk',
              fontWeight: 600,
              fontSize: `${fontSize}px`,
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
  };
}

/** Subtle 1px border frame inset from the canvas edge. */
export function frameBorder(): OgNode {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: '24px',
        left: '24px',
        right: '24px',
        bottom: '24px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: OG.frame,
      },
    },
  };
}

/** Small teal uppercase eyebrow/category label. */
export function eyebrow(text: string): OgNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        fontFamily: 'Space Grotesk',
        fontWeight: 600,
        fontSize: '20px',
        color: OG.teal,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
      },
      children: text,
    },
  };
}

/** Hairline rule + "calcrun.com" footer row. */
export function footerLine(): OgNode {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', gap: '20px' },
      children: [
        {
          type: 'div',
          props: {
            style: { height: '1px', width: '100%', backgroundColor: OG.frame },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontFamily: 'DM Sans',
              fontSize: '20px',
              color: OG.secondary,
            },
            children: 'calcrun.com',
          },
        },
      ],
    },
  };
}

/**
 * Root canvas: paper background, frame, generous padding.
 * Returned as ReactNode so it can be passed straight to satori().
 */
export function ogRoot(children: OgNode[]): ReactNode {
  const root: OgNode = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: OG.paper,
        padding: '72px',
        fontFamily: 'Space Grotesk, DM Sans',
      },
      children: [frameBorder(), ...children],
    },
  };
  return root as unknown as ReactNode;
}

export function getCategoryLabel(category: string): string {
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

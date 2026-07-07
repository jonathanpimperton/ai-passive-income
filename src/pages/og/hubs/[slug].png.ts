/**
 * Build-time OG image generation for the Phase 3 hub pages (reference tables).
 * "Precision Instrument" brand: paper background, 1px frame, teal accent.
 * Shows one representative computed figure prominently + coverage chips.
 *
 * Figures are computed AT BUILD TIME from the same pure libs the hub pages
 * use (never hand-typed): uk-tax-calc, us-tax-calc, calculator-utils —
 * cross-checked against docs/tax-values-2026.json elsewhere in the test suite.
 *
 * Output: /og/hubs/{slug}.png (1200x630)
 */
import type { APIRoute, GetStaticPaths } from 'astro';
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
import { calcSimpleIncomeTax, calcNI } from '@lib/uk-tax-calc';
import { calcFederalTax, calcFICA } from '@lib/us-tax-calc';
import { loanMonthlyPayment, compoundInterest } from '@lib/calculator-utils';
import { UK_TAX_YEAR } from '@lib/uk-rates';
import { US_TAX_YEAR } from '@lib/us-rates';

// Type alias (not interface) so it gets an implicit index signature and
// satisfies Astro's GetStaticPathsItem `props` constraint.
type HubOgProps = {
  title: string;
  figure: string;
  chips: string[];
};

// --- Representative figures, computed from the pure libs ---

// UK: take-home per month on a £50,000 salary (standard tax code, rUK bands)
const UK_SAMPLE_SALARY = 50000;
const ukTakeHomeMonthly =
  (UK_SAMPLE_SALARY - calcSimpleIncomeTax(UK_SAMPLE_SALARY) - calcNI(UK_SAMPLE_SALARY)) / 12;

// US: take-home per month on a $100,000 salary (single filer, federal + FICA)
const US_SAMPLE_SALARY = 100000;
const usTakeHomeMonthly =
  (US_SAMPLE_SALARY -
    calcFederalTax(US_SAMPLE_SALARY, 'single') -
    calcFICA(US_SAMPLE_SALARY, 'single').total) /
  12;

// Mortgage: $300,000 at 6.5% over 30 years (360 months)
const mortgageMonthly = loanMonthlyPayment(300000, 0.065, 360);

// Investment: $500/month at 7% for 30 years, compounded monthly, end-of-period
const investmentFinal = compoundInterest(0, 500, 0.07, 30, 12, 'end');

const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const HUBS: Array<{ slug: string; props: HubOgProps }> = [
  {
    slug: 'uk-take-home-pay',
    props: {
      title: `UK take-home pay by salary (${UK_TAX_YEAR})`,
      figure: `${gbp(ukTakeHomeMonthly)}/month`,
      chips: ['£20K–£150K', `${UK_TAX_YEAR} rates`, 'HMRC-verified'],
    },
  },
  {
    slug: 'us-take-home-pay',
    props: {
      title: `US take-home pay by salary (${US_TAX_YEAR})`,
      figure: `${usd(usTakeHomeMonthly)}/month`,
      chips: ['$40K–$200K', `${US_TAX_YEAR} rates`, 'IRS-verified'],
    },
  },
  {
    slug: 'mortgage-payments-by-amount',
    props: {
      title: 'Mortgage payments by loan amount',
      figure: `${usd(mortgageMonthly)}/month at 6.5%`,
      chips: ['$150K–$750K', '15 & 30-year terms', 'Rate comparison'],
    },
  },
  {
    slug: 'investment-growth',
    props: {
      title: 'Investment growth by monthly contribution',
      // A non-breaking space (U+00A0) keeps "30 years" together so the two-line wrap breaks cleanly
      figure: `$500/month → ${usd(investmentFinal)} in 30 years`,
      chips: ['$100–$2,000/month', 'Lump sums to $500K', 'Compounded monthly'],
    },
  },
];

export const getStaticPaths: GetStaticPaths = () =>
  HUBS.map(({ slug, props }) => ({ params: { slug }, props }));

/** Same scaling rule as the scenario OG images. */
function figureFontSize(text: string): string {
  if (text.length <= 16) return '88px';
  if (text.length <= 34) return '64px';
  return '44px';
}

export const GET: APIRoute = async ({ props }) => {
  const { title, figure, chips } = props as HubOgProps;

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
            eyebrow('Reference table'),
            // Hub title
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
                children: title,
              },
            },
            // Representative figure — large, tight, instrument-like
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  fontSize: figureFontSize(figure),
                  color: OG.teal,
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  lineClamp: 2,
                },
                children: figure,
              },
            },
            // Coverage chips
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '8px',
                },
                children: chips.map((chip) => ({
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: OG.paper,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: OG.frame,
                      borderRadius: '8px',
                      fontFamily: 'DM Sans',
                      fontSize: '19px',
                      color: OG.ink,
                      padding: '10px 18px',
                    },
                    children: chip,
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

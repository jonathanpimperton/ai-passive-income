/**
 * Structured data and page-metadata helpers for SEO.
 * Generates JSON-LD for Organization/WebSite, WebApplication, Article, FAQ and
 * BreadcrumbList, plus derived page titles that must not go stale (tax years
 * come from the rates modules, never typed by hand).
 */
import { UK_TAX_YEAR } from './uk-rates';
import { US_TAX_YEAR } from './us-rates';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

const SITE_URL = 'https://www.calcrun.com';

/**
 * The publisher, declared once with a stable @id. The homepage graph carries
 * the full node; other pages reference it by @id (with name/url inline so each
 * block still stands alone). No sameAs until real profiles exist, and never any
 * rating markup (GROWTH-SEO-06/08).
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const ORGANIZATION_LOGO = {
  '@type': 'ImageObject',
  url: `${SITE_URL}/icon-512.png`,
  width: 512,
  height: 512,
} as const;

export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'CalcRun',
  url: `${SITE_URL}/`,
  logo: ORGANIZATION_LOGO,
  email: 'hello@calcrun.com',
} as const;

/** Compact publisher reference for Article / WebApplication nodes. */
const PUBLISHER_REF = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'CalcRun',
  url: `${SITE_URL}/`,
  logo: ORGANIZATION_LOGO,
} as const;

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
  return JSON.stringify(schema);
}

/**
 * FAQPage markup mirrors questions that are visible on the page. FAQ rich
 * results ended on 7 May 2026, so this is kept for meaning, not for SERP
 * features; never add questions only for the schema.
 */
export function buildFaqSchema(faqs: FaqItem[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
  return JSON.stringify(schema);
}

/** Tools whose figures are in pounds only (their Offer is priced in GBP). */
const GBP_TOOLS = new Set(['salary-uk', 'stamp-duty']);

export function buildWebApplicationSchema(tool: {
  name: string;
  description: string;
  slug: string;
  category: string;
  keywords?: string[];
}): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.category}/${tool.slug}/`,
    applicationCategory: tool.category === 'utility' ? 'UtilitiesApplication' : 'FinanceApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: GBP_TOOLS.has(tool.slug) ? 'GBP' : 'USD',
    },
    browserRequirements: 'Requires JavaScript',
    publisher: PUBLISHER_REF,
  };
  if (tool.keywords && tool.keywords.length > 0) {
    schema.keywords = tool.keywords.join(', ');
  }
  return JSON.stringify(schema);
}

/**
 * Site author identity used in bylines and Article JSON-LD (E-E-A-T).
 * Single source of truth — the byline component and author page import this.
 */
export const AUTHOR = {
  name: 'Jonathan Pimperton',
  credential: 'ACA-qualified accountant',
  url: `${SITE_URL}/author/`,
} as const;

export function buildArticleSchema(article: {
  headline: string;
  description: string;
  /** Path beginning with /, e.g. /scenarios/uk-take-home-pay/ */
  path: string;
  /** ISO dates. Omit both when no reliable date is known rather than guessing. */
  datePublished?: string;
  dateModified?: string;
  ogImagePath?: string;
  /** schema.org type; methodology pages use TechArticle. */
  type?: 'Article' | 'TechArticle';
}): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': article.type ?? 'Article',
    headline: article.headline,
    description: article.description,
    mainEntityOfPage: `${SITE_URL}${article.path}`,
    author: {
      '@type': 'Person',
      name: AUTHOR.name,
      description: AUTHOR.credential,
      url: AUTHOR.url,
    },
    publisher: PUBLISHER_REF,
  };
  if (article.datePublished) schema.datePublished = article.datePublished;
  if (article.dateModified) schema.dateModified = article.dateModified;
  if (article.ogImagePath) {
    schema.image = `${SITE_URL}${article.ogImagePath}`;
  }
  return JSON.stringify(schema);
}

/** Homepage graph: the Organization node plus the WebSite that it publishes. */
export function buildWebsiteSchema(): string {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: 'CalcRun',
        url: `${SITE_URL}/`,
        inLanguage: 'en',
        description:
          'Financial calculators, file converters, and utility tools with interactive charts and instant results. No signup, no ads.',
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
  return JSON.stringify(schema);
}

/**
 * <title> text (before BaseLayout's " | CalcRun" suffix) for a tool page.
 * Tax tools carry the tax year their figures use, derived from the rates
 * modules, so the title can never claim a year the calculator doesn't use
 * (GROWTH-SEO-04). Every other tool uses its name.
 */
export function toolPageTitle(tool: { name: string; slug: string }): string {
  switch (tool.slug) {
    case 'salary-uk':
      return `UK Salary & Take-Home Pay Calculator ${UK_TAX_YEAR}`;
    case 'salary-us':
      return `US Salary & Paycheck Calculator ${US_TAX_YEAR}`;
    case 'capital-gains-tax':
      return `Capital Gains Tax Calculator: UK ${UK_TAX_YEAR} & US ${US_TAX_YEAR}`;
    case 'stamp-duty':
      return 'Stamp Duty Calculator (England & NI)';
    default:
      return tool.name;
  }
}

/** Tax year shown on a tool's methodology page, or null when the tool isn't tax-year dependent. */
export function toolTaxYearLabel(slug: string): string | null {
  switch (slug) {
    case 'salary-uk':
      return `${UK_TAX_YEAR} tax year`;
    case 'salary-us':
      return `${US_TAX_YEAR} tax year`;
    case 'capital-gains-tax':
      return `UK ${UK_TAX_YEAR} and US ${US_TAX_YEAR} tax years`;
    default:
      return null;
  }
}

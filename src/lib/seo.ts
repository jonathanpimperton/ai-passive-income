/**
 * Structured data helpers for SEO.
 * Generates JSON-LD for WebApplication, FAQ, and BreadcrumbList schemas.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

const SITE_URL = 'https://calcpath.pages.dev';

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

export function buildWebApplicationSchema(tool: {
  name: string;
  description: string;
  slug: string;
  category: string;
}): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.category}/${tool.slug}`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    browserRequirements: 'Requires JavaScript',
  };
  return JSON.stringify(schema);
}

export function buildWebsiteSchema(): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CalcPath',
    url: SITE_URL,
    description:
      'Free financial calculators with interactive charts and plain-English explanations. No signup, no ads, no data harvesting.',
  };
  return JSON.stringify(schema);
}

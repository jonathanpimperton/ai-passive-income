/**
 * Cloudflare Worker entry point.
 *
 * Routing: Cloudflare serves any request that matches a static asset in dist/ without
 * running this Worker. Everything else reaches fetch() below:
 *   - /api/subscribe and /api/email-results (POST, plus CORS preflight) are handled here;
 *   - any other /api/* path gets a JSON 404;
 *   - everything else goes to env.ASSETS.fetch(request), which applies html_handling and
 *     not_found_handling ("404-page" in wrangler.toml), so unknown URLs get the designed
 *     404 page with status 404.
 *
 * API hardening (both endpoints):
 *   - Content-Type must be application/json (415 otherwise);
 *   - Origin must be https://www.calcrun.com or https://calcrun.com (403 otherwise).
 *     localhost/127.0.0.1 origins are accepted ONLY when env.ALLOW_DEV_ORIGINS is set
 *     (local wrangler dev or scripts/serve-prod.mjs), never in production;
 *   - 20 KB body cap, enforced while streaming (413);
 *   - Cloudflare Turnstile token required (a missing token is refused before any field
 *     validation); siteverify must succeed AND report one of our
 *     hostnames (and the expected action when present). Fails closed when the secret is
 *     missing (503);
 *   - results-email rows are rebuilt from a server-side allowlist (src/lib/tool-registry.ts
 *     and src/lib/email-sanitize.ts); client labels and free text are never rendered;
 *   - every response body is JSON and carries no-store, nosniff, HSTS and a deny-all CSP.
 *
 * Rate limiting is NOT done here. A Cloudflare WAF rate-limiting rule (dashboard) covers
 * both endpoints. Observed behaviour on 9 Nov 2026: about 4-5 POSTs per 10 seconds per IP,
 * shared across both endpoints, then a 10 second block answered by Cloudflare with
 * 429 "error code: 1015" as plain text before this Worker runs. The clients handle that
 * non-JSON 429. The owner verifies the exact rule (docs/owner-actions-2026-11.md, O-8).
 */
import { TOOL_REGISTRY, isKnownTool } from './src/lib/tool-registry';
import { sanitizeRows, type EmailRow } from './src/lib/email-sanitize';

/** Minimal shape of the static-assets binding (avoids a dependency on workers-types). */
interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
  MAILERLITE_API_KEY?: string;
  MAILERSEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** Set (to any value) only in local development to accept localhost origins. */
  ALLOW_DEV_ORIGINS?: string;
}

const MAILERLITE_GROUP_ID = '180838346043426395';
const MAILERSEND_FROM_EMAIL = 'hello@calcrun.com';
const MAILERSEND_FROM_NAME = 'CalcRun';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Origins whose pages may call the API. */
const PRODUCTION_ORIGINS = new Set(['https://www.calcrun.com', 'https://calcrun.com']);
/** Hostnames a valid Turnstile token may have been issued on. */
const PRODUCTION_HOSTNAMES = new Set(['www.calcrun.com', 'calcrun.com']);
/**
 * Extra hostnames accepted in dev mode only. Cloudflare's Turnstile test keys always
 * report example.com (developers.cloudflare.com/turnstile/troubleshooting/testing/).
 */
const DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', 'example.com']);

/** Turnstile action names set by the clients (src/lib/email-client.ts). */
const TURNSTILE_ACTIONS = { subscribe: 'subscribe', emailResults: 'email-results' } as const;

const MAX_REQUEST_SIZE = 20_480; // 20 KB
const MAX_INPUT_ROWS = 64; // Debt Payoff with its maximum of 10 debts sends 32
const MAX_RESULT_ROWS = 32;
const UPSTREAM_TIMEOUT_MS = 10_000;

/* -- Quick tips shown in results emails ------------------------------- */
const QUICK_TIPS: Record<string, string> = {
  'compound-interest': 'Even small increases in your monthly contribution can dramatically grow your wealth over time thanks to compound interest.',
  'loan-amortization': 'Making one extra payment per year can shave years off your loan and save thousands in interest.',
  'investment-return': 'Historically, the S&P 500 has returned about 10% annually before inflation. Diversification helps manage risk.',
  'retirement-savings': 'The 4% rule suggests you can withdraw 4% of your savings annually in retirement without running out.',
  'retirement-contribution': 'Starting 10 years earlier can cut the required monthly contribution in half — time is your biggest advantage.',
  'retirement-age': 'Doubling your monthly savings rate can move your retirement date up by 7-10 years thanks to compound growth.',
  'debt-payoff': 'The avalanche method (highest interest first) saves the most money, but the snowball method (smallest balance first) keeps you motivated.',
  'savings-goal': 'Automate your savings — set up automatic transfers on payday so you never forget.',
  'salary': 'Maximizing your 401(k) employer match is the closest thing to free money in personal finance.',
  'salary-uk': 'Check your tax code on your payslip — an incorrect code could mean you are overpaying tax.',
  'mortgage-payment': 'A 0.5% lower interest rate on a 30-year mortgage can save over $30,000 in total interest.',
  'inflation': 'Keeping large amounts in a savings account below the inflation rate means losing purchasing power over time.',
  'roi': 'Always factor in the time period when comparing investments — a 50% return over 10 years is very different from 50% in 1 year.',
  'net-worth': 'Track your net worth monthly — the trend matters more than any single number.',
  'rent-vs-buy': 'The 5% rule: if annual rent is less than 5% of the home price, renting may be the better financial choice.',
  'emergency-fund': 'Keep your emergency fund in a high-yield savings account — accessible but earning interest.',
  'investment-fee': 'A 1% fee sounds small, but over 30 years it can cost more than your total contributions. Index funds often charge under 0.10%.',
  'mortgage-affordability': 'Lenders look at your debt-to-income ratio — keep total monthly debts below 36% of gross income for the best rates.',
  'credit-card-payoff': 'Even $50/month extra on a credit card can save thousands in interest and cut years off the payoff time.',
  'solar-payback': 'A battery increases self-consumption from ~30% to ~70%, but the extra upfront cost typically extends payback by 3–5 years.',
  'car-finance': 'A personal loan from your bank almost always beats dealer finance on total cost — get pre-approved before visiting the showroom.',
  'stamp-duty': 'Factor SDLT into your total budget early — on a £450,000 home it adds £12,500 on top of deposit, solicitor fees, and surveys.',
  'capital-gains-tax': 'Holding investments for over a year (US) or using ISA wrappers (UK) can dramatically reduce your capital gains tax bill.',
};

/* -- Affiliate recommendations per calculator (2 per tool) --------------- */
const AFFILIATE_RECS: Record<string, Array<{ name: string; tagline: string; url: string; category: string; cta: string }>> = {
  'compound-interest': [
    { name: 'Betterment', tagline: 'Automated investing with no minimum balance', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
    { name: 'Wealthfront', tagline: 'Tax-loss harvesting to maximize your returns', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
  ],
  'loan-amortization': [
    { name: 'LendingTree', tagline: 'Compare loan rates from multiple lenders in minutes', url: 'https://www.lendingtree.com/', category: 'Loans', cta: 'Compare rates now' },
    { name: 'SoFi', tagline: 'Refinance and save — low rates, no hidden fees', url: 'https://www.sofi.com/', category: 'Loans', cta: 'Check your rate' },
  ],
  'investment-return': [
    { name: 'Wealthfront', tagline: 'Automated investing and tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Start growing your money' },
    { name: 'Betterment', tagline: 'Automated investing with no minimum balance', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
  ],
  'retirement-savings': [
    { name: 'Betterment', tagline: 'Automated retirement planning with IRA options', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Open an IRA' },
    { name: 'Wealthfront', tagline: 'Tax-loss harvesting to maximize your returns', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Plan your retirement' },
  ],
  'retirement-contribution': [
    { name: 'Betterment', tagline: 'Automated investing with no minimum balance', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start saving today' },
    { name: 'Wealthfront', tagline: 'Automated investing and tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
  ],
  'retirement-age': [
    { name: 'Betterment', tagline: 'Automated retirement planning with IRA options', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Plan your retirement' },
    { name: 'Wealthfront', tagline: 'Tax-loss harvesting to maximize your returns', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Start investing' },
  ],
  'debt-payoff': [
    { name: 'LendingTree', tagline: 'Compare debt consolidation options from multiple lenders', url: 'https://www.lendingtree.com/', category: 'Loans', cta: 'Compare options now' },
    { name: 'SoFi', tagline: 'Consolidate debt at a lower rate — no fees', url: 'https://www.sofi.com/', category: 'Loans', cta: 'Get pre-qualified' },
  ],
  'savings-goal': [
    { name: 'Wealthfront', tagline: 'Automated investing and tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
    { name: 'Betterment', tagline: 'High-yield cash account with no minimums', url: 'https://www.betterment.com/', category: 'Savings', cta: 'Start saving today' },
  ],
  'salary': [
    { name: 'Betterment', tagline: 'Start investing to grow your take-home pay', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
    { name: 'SoFi', tagline: 'Checking and savings with competitive APY', url: 'https://www.sofi.com/', category: 'Banking', cta: 'Open free account' },
  ],
  'salary-uk': [
    { name: 'Nutmeg', tagline: 'UK investing made simple — ISAs, pensions, and more', url: 'https://www.nutmeg.com/', category: 'Investing (UK)', cta: 'Start investing' },
    { name: 'InvestEngine', tagline: 'Commission-free ETF investing in the UK', url: 'https://investengine.com/', category: 'Investing (UK)', cta: 'Get started free' },
  ],
  'mortgage-payment': [
    { name: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders', url: 'https://www.lendingtree.com/', category: 'Mortgages', cta: 'Compare rates now' },
    { name: 'SoFi', tagline: 'Competitive mortgage rates with no hidden fees', url: 'https://www.sofi.com/', category: 'Mortgages', cta: 'Get pre-approved' },
  ],
  'inflation': [
    { name: 'Betterment', tagline: 'Outpace inflation with automated investing', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
    { name: 'Wealthfront', tagline: 'Invest to outpace inflation long-term', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Start investing' },
  ],
  'roi': [
    { name: 'Wealthfront', tagline: 'Maximize returns with automated tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
    { name: 'Betterment', tagline: 'Smart investing with portfolio optimization', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Get started free' },
  ],
  'net-worth': [
    { name: 'Betterment', tagline: 'Grow your net worth with automated investing', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start building wealth' },
    { name: 'Wealthfront', tagline: 'Automated investing and tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
  ],
  'rent-vs-buy': [
    { name: 'LendingTree', tagline: 'Compare mortgage rates if you decide to buy', url: 'https://www.lendingtree.com/', category: 'Mortgages', cta: 'Compare rates now' },
    { name: 'Betterment', tagline: 'Invest the difference if you decide to rent', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
  ],
  'emergency-fund': [
    { name: 'Wealthfront', tagline: 'High-yield cash account — competitive APY, FDIC insured', url: 'https://www.wealthfront.com/', category: 'Savings', cta: 'Open cash account' },
    { name: 'Betterment', tagline: 'High-yield cash account with no minimums', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start saving' },
  ],
  'investment-fee': [
    { name: 'Betterment', tagline: 'Automated investing — 0.25% annual fee, no trade commissions', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Switch to low fees' },
    { name: 'Wealthfront', tagline: 'Low-cost automated investing with tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
  ],
  'mortgage-affordability': [
    { name: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders', url: 'https://www.lendingtree.com/', category: 'Mortgages', cta: 'Get pre-approved' },
    { name: 'SoFi', tagline: 'Competitive mortgage rates with no hidden fees', url: 'https://www.sofi.com/', category: 'Mortgages', cta: 'Check your rate' },
  ],
  'credit-card-payoff': [
    { name: 'LendingTree', tagline: 'Compare balance transfer and consolidation options', url: 'https://www.lendingtree.com/', category: 'Loans', cta: 'Compare options now' },
    { name: 'SoFi', tagline: 'Consolidate credit card debt at a lower rate', url: 'https://www.sofi.com/', category: 'Loans', cta: 'Get pre-qualified' },
  ],
  'solar-payback': [
    { name: 'Betterment', tagline: 'Invest the savings from your solar panels', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
    { name: 'Wealthfront', tagline: 'Grow your solar savings with automated investing', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
  ],
  'car-finance': [
    { name: 'LendingTree', tagline: 'Compare auto loan rates from multiple lenders', url: 'https://www.lendingtree.com/', category: 'Auto Loans', cta: 'Compare rates now' },
    { name: 'SoFi', tagline: 'Competitive car loan rates with no hidden fees', url: 'https://www.sofi.com/', category: 'Auto Loans', cta: 'Check your rate' },
  ],
  'stamp-duty': [
    { name: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders', url: 'https://www.lendingtree.com/', category: 'Mortgages', cta: 'Compare rates now' },
    { name: 'Nutmeg', tagline: 'UK investing made simple — ISAs, pensions, and more', url: 'https://www.nutmeg.com/', category: 'Investing (UK)', cta: 'Start investing' },
  ],
  'capital-gains-tax': [
    { name: 'Betterment', tagline: 'Tax-loss harvesting to reduce your capital gains bill', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
    { name: 'Wealthfront', tagline: 'Automated tax-loss harvesting — keep more of your gains', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
  ],
};

/* -- Build branded HTML results email ------------------------------------ */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Rows are already sanitised by sanitizeRows(); every value is still HTML-escaped here. */
function buildResultsEmail(
  toolName: string,
  toolSlug: string,
  inputs: EmailRow[],
  results: EmailRow[],
): string {
  const tip = QUICK_TIPS[toolSlug] || '';
  // toolSlug is already validated against TOOL_REGISTRY upstream
  const toolUrl = `https://www.calcrun.com${TOOL_REGISTRY[toolSlug]?.path || '/tools/'}`;

  const inputRows = inputs
    .map(
      (inp) => `
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#4B5563;border-bottom:1px solid #F3F4F6;">${escapeHtml(inp.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6;font-variant-numeric:tabular-nums;">${escapeHtml(inp.value)}</td>
      </tr>`
    )
    .join('');

  const resultRows = results
    .map((res) => {
      if (res.highlight) {
        return `
        <tr>
          <td colspan="2" style="padding:16px 12px;background-color:#E6F2F2;border-bottom:1px solid #B8DADA;border-radius:8px;">
            <div style="font-size:13px;color:#0B6E6E;margin-bottom:4px;">${escapeHtml(res.label)}</div>
            <div style="font-size:28px;font-weight:700;color:#085858;font-variant-numeric:tabular-nums;">${escapeHtml(res.value)}</div>
          </td>
        </tr>`;
      }
      return `
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#4B5563;border-bottom:1px solid #F3F4F6;">${escapeHtml(res.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#1A1A2E;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6;font-variant-numeric:tabular-nums;">${escapeHtml(res.value)}</td>
      </tr>`;
    })
    .join('');

  const tipSection = tip
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="padding:16px;background-color:#FFFBEB;border-radius:8px;border:1px solid #FDE68A;">
          <div style="font-size:13px;font-weight:600;color:#92400E;margin-bottom:6px;">💡 Quick Tip</div>
          <div style="font-size:14px;color:#78350F;line-height:1.5;">${escapeHtml(tip)}</div>
        </td>
      </tr>
    </table>`
    : '';

  // Affiliate recommendation section — prominent with action-oriented CTAs
  const affiliates = AFFILIATE_RECS[toolSlug] || [];
  const affiliateSection = affiliates.length > 0
    ? `
    <tr>
      <td style="padding:24px 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#E6F2F2;border-radius:12px;border:1px solid #B8DADA;overflow:hidden;">
          <tr>
            <td style="padding:20px 20px 8px;">
              <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:4px;font-family:'Libre Baskerville','Georgia',serif;">Ready to take the next step?</div>
              <div style="font-size:13px;color:#4B5563;margin-bottom:16px;">Based on your results, these tools can help you take action.</div>
            </td>
          </tr>
          ${affiliates.map((a) => {
            const affUrl = `${a.url}?utm_source=calcrun&utm_medium=email_results&utm_campaign=${encodeURIComponent(toolSlug)}`;
            return `
          <tr>
            <td style="padding:0 20px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;border:1px solid #E2E8F0;">
                <tr>
                  <td style="padding:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;">
                          <div style="font-size:10px;font-weight:700;color:#0A5555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${escapeHtml(a.category)}</div>
                          <div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:4px;">${escapeHtml(a.name)} *</div>
                          <div style="font-size:13px;color:#475569;line-height:1.4;margin-bottom:12px;">${escapeHtml(a.tagline)}</div>
                          <a href="${affUrl}" style="display:inline-block;padding:10px 24px;background-color:#0B6E6E;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                            ${escapeHtml(a.cta)} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
          }).join('')}
          <tr>
            <td style="padding:4px 20px 16px;">
              <div style="font-size:11px;color:#94A3B8;line-height:1.4;">* Affiliate link — CalcRun may earn a commission at no cost to you. <a href="https://www.calcrun.com/disclosure/" style="color:#94A3B8;">Full disclosure</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your ${escapeHtml(toolName)} Results</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">

          <!-- Header — teal accent bar + logo -->
          <tr>
            <td style="height:4px;background-color:#0B6E6E;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 32px 20px;background-color:#FFFFFF;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="https://www.calcrun.com/icon-192.png" alt="CalcRun" width="32" height="32" style="display:block;border-radius:6px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;">
                      <span style="color:#1A1A2E;">Calc</span><span style="color:#0B6E6E;">Run</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:0 32px 8px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#1A1A2E;letter-spacing:-0.02em;font-family:'Libre Baskerville','Georgia',serif;">
                Your ${escapeHtml(toolName)} Results
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:8px 32px 0;">
              <div style="height:1px;background:linear-gradient(to right,#0B6E6E22,#0B6E6E44,#0B6E6E22);"></div>
            </td>
          </tr>

          <!-- Inputs Section -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <div style="font-size:11px;font-weight:600;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your Inputs</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;border-radius:8px;border:1px solid #E5E7EB;border-collapse:separate;">
                ${inputRows}
              </table>
            </td>
          </tr>

          <!-- Results Section -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <div style="font-size:11px;font-weight:600;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your Results</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;border:1px solid #E5E7EB;border-collapse:separate;">
                ${resultRows}
              </table>
            </td>
          </tr>

          <!-- Tip -->
          <tr>
            <td style="padding:0 32px;">${tipSection}</td>
          </tr>

          <!-- Affiliate Recommendation -->
          ${affiliateSection}

          <!-- CTA -->
          <tr>
            <td style="padding:28px 32px;" align="center">
              <a href="${toolUrl}?utm_source=email&utm_medium=results&utm_campaign=${encodeURIComponent(toolSlug)}"
                style="display:inline-block;padding:14px 32px;background-color:#E8604C;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                Run this calculator again &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#FAFAF8;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;">
                <a href="https://www.calcrun.com" style="color:#0B6E6E;text-decoration:none;font-weight:600;">CalcRun</a> &mdash; Clear calculators for real financial decisions<br>
                You received this because you emailed yourself results from calcrun.com.<br>
                This is a one-time transactional email.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#9CA3AF;line-height:1.5;">
                Links marked with * are affiliate links. CalcRun may earn a commission at no cost to you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* -- Responses ------------------------------------------------------------ */

/** Headers on every API response. _headers does not apply to Worker-generated responses. */
const API_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
};

function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...API_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

/* -- Origin, CORS and content type ---------------------------------------- */

function devMode(env: Env): boolean {
  return Boolean(env.ALLOW_DEV_ORIGINS);
}

function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  if (!devMode(env)) return false;
  try {
    const url = new URL(origin);
    // Strict hostname check so that localhost.evil.example never passes.
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      && url.origin === origin;
  } catch {
    return false;
  }
}

function isAllowedTurnstileHostname(hostname: unknown, env: Env): boolean {
  if (typeof hostname !== 'string') return false;
  return PRODUCTION_HOSTNAMES.has(hostname) || (devMode(env) && DEV_HOSTNAMES.has(hostname));
}

/** CORS headers. Access-Control-Allow-Origin is sent only to allowlisted origins. */
function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && isAllowedOrigin(origin, env)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function isJsonContentType(request: Request): boolean {
  const ct = request.headers.get('Content-Type') || '';
  return ct.split(';')[0].trim().toLowerCase() === 'application/json';
}

/**
 * Read the body as text, giving up once it exceeds `max` bytes (so a chunked upload
 * without Content-Length cannot make the Worker buffer more than the cap).
 * Returns null when the body is too large.
 */
async function readBodyCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/* -- Turnstile ------------------------------------------------------------- */

interface SiteverifyResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

/**
 * Verify a Turnstile token. Succeeds only when siteverify says success AND the token was
 * issued on one of our hostnames AND (when the token carries an action) the action is the
 * one this endpoint expects. Any network or parse failure fails closed.
 */
async function verifyTurnstile(token: string, request: Request, env: Env, expectedAction: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY || !token || token.length > 2048) return false;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: request.headers.get('CF-Connecting-IP') || undefined,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn('Turnstile siteverify HTTP status', res.status);
      return false;
    }
    const data = await res.json() as SiteverifyResponse;
    if (data.success !== true) {
      console.warn('Turnstile rejected token:', (data['error-codes'] || []).join(','));
      return false;
    }
    if (!isAllowedTurnstileHostname(data.hostname, env)) {
      console.warn('Turnstile token issued on an unexpected hostname');
      return false;
    }
    if (data.action && data.action !== expectedAction) {
      console.warn('Turnstile token action mismatch');
      return false;
    }
    return true;
  } catch {
    console.warn('Turnstile siteverify unreachable');
    return false;
  }
}

/* -- Validation ------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEmail(body: Record<string, unknown>): string | null {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

function readToken(body: Record<string, unknown>): string {
  return typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
}

function validateEmailResultsBody(raw: unknown): {
  ok: true;
  data: {
    email: string;
    toolSlug: string;
    inputs: EmailRow[];
    results: EmailRow[];
    dropped: number;
    subscribe: boolean;
    honeypot: string;
    turnstileToken: string;
  };
} | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid request body' };
  }
  const body = raw as Record<string, unknown>;

  const email = readEmail(body);
  if (!email) return { ok: false, error: 'Please enter a valid email address' };

  const toolSlug = typeof body.toolSlug === 'string' ? body.toolSlug.trim() : '';
  if (!toolSlug || toolSlug.length > 50 || !isKnownTool(toolSlug)) {
    return { ok: false, error: 'Invalid calculator' };
  }

  const rawInputs = Array.isArray(body.inputs) ? body.inputs : [];
  const rawResults = Array.isArray(body.results) ? body.results : [];
  if (rawInputs.length > MAX_INPUT_ROWS) return { ok: false, error: 'Too many input fields' };
  if (rawResults.length > MAX_RESULT_ROWS) return { ok: false, error: 'Too many result fields' };

  // Rows are rebuilt from the server-side allowlist; see src/lib/email-sanitize.ts.
  const rows = sanitizeRows(toolSlug, rawInputs, rawResults);
  if (rows.results.length === 0) return { ok: false, error: 'Missing calculator results' };

  return {
    ok: true,
    data: {
      email,
      toolSlug,
      inputs: rows.inputs,
      results: rows.results,
      dropped: rows.dropped,
      // Marketing consent only on an explicit boolean true (never a string or default).
      subscribe: body.subscribe === true,
      honeypot: typeof body.honeypot === 'string' ? body.honeypot : '',
      turnstileToken: readToken(body),
    },
  };
}

function validateSubscribeBody(raw: unknown): {
  ok: true;
  data: { email: string; toolSlug: string | undefined; honeypot: string; turnstileToken: string };
} | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid request body' };
  }
  const body = raw as Record<string, unknown>;
  const email = readEmail(body);
  if (!email) return { ok: false, error: 'Please enter a valid email address' };

  // toolSlug is optional; an unknown slug is ignored rather than reported.
  let toolSlug: string | undefined;
  if (typeof body.toolSlug === 'string') {
    const slug = body.toolSlug.trim();
    if (slug && slug.length <= 50 && isKnownTool(slug)) toolSlug = slug;
  }
  return {
    ok: true,
    data: {
      email,
      toolSlug,
      honeypot: typeof body.honeypot === 'string' ? body.honeypot : '',
      turnstileToken: readToken(body),
    },
  };
}

/* -- MailerLite ------------------------------------------------------------ */

/** MailerLite answered 422: the address (or a field) was rejected as invalid. */
class MailerLiteRejected extends Error {}

/**
 * Add `email` to the newsletter group. MailerLite returns 201 for a new subscriber and
 * 200 for an existing one (developers.mailerlite.com/docs/subscribers.html). Anything else
 * is a failure; 422 means invalid data and is reported to the visitor.
 */
async function subscribeToMailerLite(
  email: string,
  toolSlug: string | undefined,
  apiKey: string,
  signupSource: 'newsletter' | 'results',
): Promise<void> {
  const fields: Record<string, string> = { signup_source: signupSource };
  if (toolSlug) fields.calculator_slug = toolSlug;

  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ email, groups: [MAILERLITE_GROUP_ID], fields }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (res.status === 200 || res.status === 201) return;
  if (res.status === 422) {
    console.warn('MailerLite rejected the subscriber data (422)');
    throw new MailerLiteRejected('MailerLite 422');
  }
  console.error('MailerLite error: status', res.status);
  throw new Error(`MailerLite responded ${res.status}`);
}

/* -- Shared request gate ----------------------------------------------------- */

/**
 * Checks shared by both POST endpoints: content type, origin, size, JSON.
 * Returns the parsed body or the error Response to send.
 */
async function readApiRequest(request: Request, env: Env, cors: Record<string, string>): Promise<
  { ok: true; body: unknown } | { ok: false; response: Response }
> {
  if (!isJsonContentType(request)) {
    return { ok: false, response: json(415, { error: 'Unsupported content type' }, cors) };
  }
  if (!isAllowedOrigin(request.headers.get('Origin'), env)) {
    return { ok: false, response: json(403, { error: 'Forbidden' }, cors) };
  }
  const declared = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (declared > MAX_REQUEST_SIZE) {
    return { ok: false, response: json(413, { error: 'Request too large' }, cors) };
  }
  let text: string | null;
  try {
    text = await readBodyCapped(request, MAX_REQUEST_SIZE);
  } catch {
    return { ok: false, response: json(400, { error: 'Invalid request body' }, cors) };
  }
  if (text === null) return { ok: false, response: json(413, { error: 'Request too large' }, cors) };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: json(400, { error: 'Invalid JSON' }, cors) };
  }
}

const VERIFICATION_REQUIRED = { error: 'Verification required. Please try again.', code: 'verification_required' };

/**
 * True when the parsed body carries a non-empty Turnstile token. Checked BEFORE field
 * validation so unverified clients learn nothing about what the validator accepts.
 */
function hasToken(body: unknown): boolean {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    && readToken(body as Record<string, unknown>) !== '';
}
const VERIFICATION_FAILED = { error: 'Verification failed. Please try again.', code: 'verification_failed' };

/* -- POST /api/subscribe ----------------------------------------------------- */

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request.headers.get('Origin'), env);
  const parsed = await readApiRequest(request, env, cors);
  if (!parsed.ok) return parsed.response;

  if (!env.MAILERLITE_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error('Subscribe endpoint is missing MAILERLITE_API_KEY or TURNSTILE_SECRET_KEY');
    return json(503, { error: 'Sign-up is temporarily unavailable. Please try again later.' }, cors);
  }

  if (!hasToken(parsed.body)) return json(403, VERIFICATION_REQUIRED, cors);

  const validation = validateSubscribeBody(parsed.body);
  if (!validation.ok) return json(400, { error: validation.error }, cors);
  const body = validation.data;

  // Honeypot filled = bot: pretend success, do nothing.
  if (body.honeypot) return json(200, { success: true }, cors);

  if (!(await verifyTurnstile(body.turnstileToken, request, env, TURNSTILE_ACTIONS.subscribe))) {
    return json(403, VERIFICATION_FAILED, cors);
  }

  try {
    await subscribeToMailerLite(body.email, body.toolSlug, env.MAILERLITE_API_KEY, 'newsletter');
    return json(200, { success: true }, cors);
  } catch (err) {
    if (err instanceof MailerLiteRejected) {
      return json(400, {
        error: "We couldn't add that address. Please check it and try again.",
        code: 'email_rejected',
      }, cors);
    }
    return json(502, { error: 'Subscription failed. Please try again later.' }, cors);
  }
}

/* -- POST /api/email-results ------------------------------------------------- */

async function handleEmailResults(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request.headers.get('Origin'), env);
  const parsed = await readApiRequest(request, env, cors);
  if (!parsed.ok) return parsed.response;

  // Fail closed: sending branded email from our domain without bot verification is worse
  // than a temporary outage.
  if (!env.MAILERSEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error('Email-results endpoint is missing MAILERSEND_API_KEY or TURNSTILE_SECRET_KEY');
    return json(503, { error: 'Email sending is temporarily unavailable. Please try again later.' }, cors);
  }

  if (!hasToken(parsed.body)) return json(403, VERIFICATION_REQUIRED, cors);

  const validation = validateEmailResultsBody(parsed.body);
  if (!validation.ok) return json(400, { error: validation.error }, cors);
  const body = validation.data;

  if (body.honeypot) return json(200, { success: true }, cors);

  if (!(await verifyTurnstile(body.turnstileToken, request, env, TURNSTILE_ACTIONS.emailResults))) {
    return json(403, VERIFICATION_FAILED, cors);
  }

  if (body.dropped > 0) console.warn(`email-results: dropped ${body.dropped} row(s) for ${body.toolSlug}`);

  // Display name and URL always come from the server-side registry.
  const toolDisplayName = TOOL_REGISTRY[body.toolSlug].name;
  const htmlContent = buildResultsEmail(toolDisplayName, body.toolSlug, body.inputs, body.results);

  try {
    const msResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
        to: [{ email: body.email }],
        subject: `Your ${toolDisplayName} Results - CalcRun`,
        html: htmlContent,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!msResponse.ok) {
      console.error('MailerSend error: status', msResponse.status);
      return json(502, { error: 'Failed to send email. Please try again.' }, cors);
    }
  } catch {
    console.error('MailerSend request failed');
    return json(502, { error: 'Failed to send email. Please try again.' }, cors);
  }

  // Marketing enrolment ONLY on an explicit opt-in (the checkbox defaults to unticked).
  let subscribeFailed = false;
  if (body.subscribe && env.MAILERLITE_API_KEY) {
    try {
      await subscribeToMailerLite(body.email, body.toolSlug, env.MAILERLITE_API_KEY, 'results');
    } catch {
      subscribeFailed = true;
    }
  }

  return json(200, subscribeFailed ? { success: true, subscribeFailed: true } : { success: true }, cors);
}

/* -- Worker entry point ------------------------------------------------------ */

const API_ROUTES = new Map<string, (request: Request, env: Env) => Promise<Response>>([
  ['/api/subscribe', handleSubscribe],
  ['/api/email-results', handleEmailResults],
]);

async function handleApi(request: Request, env: Env, pathname: string): Promise<Response> {
  const handler = API_ROUTES.get(pathname);
  if (!handler) return json(404, { error: 'Not found' });
  const cors = corsHeaders(request.headers.get('Origin'), env);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...API_HEADERS, ...cors } });
  }
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, { ...cors, Allow: 'POST, OPTIONS' });
  }
  try {
    return await handler(request, env);
  } catch {
    console.error('Unhandled API error on', pathname);
    return json(500, { error: 'Something went wrong. Please try again.' }, cors);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleApi(request, env, pathname);
    }
    // Everything else: static assets (html_handling + not_found_handling apply here).
    return env.ASSETS.fetch(request);
  },
};

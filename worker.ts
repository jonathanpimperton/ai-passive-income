/**
 * Cloudflare Worker entry point.
 *
 * Handles API routes (POST /api/subscribe, POST /api/email-results)
 * and delegates all other requests to static assets served from dist/.
 */

interface Env {
  ASSETS: Fetcher;
  MAILERLITE_API_KEY: string;
  MAILERSEND_API_KEY: string;
}

interface SubscribeBody {
  email: string;
  toolSlug?: string;
  honeypot?: string;
}

interface ResultItem {
  label: string;
  value: string;
  highlight?: boolean;
}

interface EmailResultsBody {
  email: string;
  toolSlug: string;
  toolName: string;
  inputs: Array<{ label: string; value: string }>;
  results: ResultItem[];
  subscribe?: boolean;
  honeypot?: string;
}

const MAILERLITE_GROUP_ID = '180838346043426395';
const ALLOWED_ORIGIN = 'https://www.calcrun.com';
const MAILERSEND_FROM_EMAIL = 'hello@calcrun.com';
const MAILERSEND_FROM_NAME = 'CalcRun';

/* ── Quick tips shown in results emails ────────────────────── */
const QUICK_TIPS: Record<string, string> = {
  'compound-interest': 'Even small increases in your monthly contribution can dramatically grow your wealth over time thanks to compound interest.',
  'loan-amortization': 'Making one extra payment per year can shave years off your loan and save thousands in interest.',
  'investment-return': 'Historically, the S&P 500 has returned about 10% annually before inflation. Diversification helps manage risk.',
  'retirement-savings': 'The 4% rule suggests you can withdraw 4% of your savings annually in retirement without running out.',
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
};

/* ── Affiliate recommendations per calculator (2 per tool for better conversion) ── */
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
    { name: 'Vanguard', tagline: 'Low-cost index funds trusted by millions', url: 'https://investor.vanguard.com/', category: 'Investing', cta: 'Explore funds' },
  ],
  'retirement-savings': [
    { name: 'Vanguard', tagline: 'Low-cost index funds for long-term growth', url: 'https://investor.vanguard.com/', category: 'Investing', cta: 'Plan your retirement' },
    { name: 'Betterment', tagline: 'Automated retirement planning with IRA options', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Open an IRA' },
  ],
  'debt-payoff': [
    { name: 'LendingClub', tagline: 'Personal loans to consolidate and pay off debt faster', url: 'https://www.lendingclub.com/', category: 'Loans', cta: 'Check your rate' },
    { name: 'SoFi', tagline: 'Consolidate debt at a lower rate — no fees', url: 'https://www.sofi.com/', category: 'Loans', cta: 'Get pre-qualified' },
  ],
  'savings-goal': [
    { name: 'Marcus by Goldman Sachs', tagline: 'High-yield savings with no fees or minimums', url: 'https://www.marcus.com/', category: 'Savings', cta: 'Open savings account' },
    { name: 'Ally Bank', tagline: 'Competitive APY with no minimum balance', url: 'https://www.ally.com/', category: 'Savings', cta: 'Start saving today' },
  ],
  'salary': [
    { name: 'Betterment', tagline: 'Start investing to grow your take-home pay', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
    { name: 'Marcus by Goldman Sachs', tagline: 'Earn more on the money you save', url: 'https://www.marcus.com/', category: 'Savings', cta: 'Open savings account' },
  ],
  'salary-uk': [
    { name: 'Nutmeg', tagline: 'UK investing made simple — ISAs, pensions, and more', url: 'https://www.nutmeg.com/', category: 'Investing (UK)', cta: 'Start investing' },
    { name: 'Moneybox', tagline: 'Save and invest from just £1 — ISAs and pensions', url: 'https://www.moneyboxapp.com/', category: 'Investing (UK)', cta: 'Get started free' },
  ],
  'mortgage-payment': [
    { name: 'LendingTree', tagline: 'Compare mortgage rates from multiple lenders', url: 'https://www.lendingtree.com/', category: 'Mortgages', cta: 'Compare rates now' },
    { name: 'SoFi', tagline: 'Competitive mortgage rates with no hidden fees', url: 'https://www.sofi.com/', category: 'Mortgages', cta: 'Get pre-approved' },
  ],
  'inflation': [
    { name: 'Marcus by Goldman Sachs', tagline: 'Beat inflation with a high-yield savings account', url: 'https://www.marcus.com/', category: 'Savings', cta: 'Earn more interest' },
    { name: 'Wealthfront', tagline: 'Invest to outpace inflation long-term', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Start investing' },
  ],
  'roi': [
    { name: 'Wealthfront', tagline: 'Maximize returns with automated tax-loss harvesting', url: 'https://www.wealthfront.com/', category: 'Investing', cta: 'Open free account' },
    { name: 'Betterment', tagline: 'Smart investing with portfolio optimization', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Get started free' },
  ],
  'net-worth': [
    { name: 'Betterment', tagline: 'Grow your net worth with automated investing', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start building wealth' },
    { name: 'Marcus by Goldman Sachs', tagline: 'High-yield savings to grow your cash position', url: 'https://www.marcus.com/', category: 'Savings', cta: 'Open savings account' },
  ],
  'rent-vs-buy': [
    { name: 'LendingTree', tagline: 'Compare mortgage rates if you decide to buy', url: 'https://www.lendingtree.com/', category: 'Mortgages', cta: 'Compare rates now' },
    { name: 'Betterment', tagline: 'Invest the difference if you decide to rent', url: 'https://www.betterment.com/', category: 'Investing', cta: 'Start investing free' },
  ],
  'emergency-fund': [
    { name: 'Ally Bank', tagline: 'Online savings with competitive APY and no fees', url: 'https://www.ally.com/', category: 'Savings', cta: 'Open savings account' },
    { name: 'Marcus by Goldman Sachs', tagline: 'High-yield savings — keep your fund earning', url: 'https://www.marcus.com/', category: 'Savings', cta: 'Earn more interest' },
  ],
};

/* ── CORS ──────────────────────────────────────────────────── */
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && (origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/* ── Subscribe to MailerLite ───────────────────────────────── */
async function subscribeToMailerLite(email: string, toolSlug: string | undefined, apiKey: string): Promise<void> {
  const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email,
      groups: [MAILERLITE_GROUP_ID],
      fields: toolSlug ? { calculator_slug: toolSlug } : undefined,
    }),
  });

  if (!mlResponse.ok && mlResponse.status !== 422) {
    const errorData = await mlResponse.text();
    console.error('MailerLite error:', mlResponse.status, errorData);
  }
}

/* ── Handle POST /api/subscribe ────────────────────────────── */
async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  const apiKey = env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 503, headers }
    );
  }

  let body: SubscribeBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers }
    );
  }

  // Honeypot filled = bot → silently succeed
  if (body.honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Please enter a valid email address' }),
      { status: 400, headers }
    );
  }

  try {
    await subscribeToMailerLite(email, body.toolSlug, apiKey);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('MailerLite request failed:', err);
    return new Response(
      JSON.stringify({ error: 'Subscription failed. Please try again.' }),
      { status: 502, headers }
    );
  }
}

/* ── Build branded HTML results email ──────────────────────── */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildResultsEmail(
  toolName: string,
  toolSlug: string,
  inputs: Array<{ label: string; value: string }>,
  results: ResultItem[],
): string {
  const tip = QUICK_TIPS[toolSlug] || '';
  const toolUrl = `https://www.calcrun.com/tools/${toolSlug}`;

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
          <td colspan="2" style="padding:16px 12px;background-color:#EFF6FF;border-bottom:1px solid #DBEAFE;border-radius:8px;">
            <div style="font-size:13px;color:#1E40AF;margin-bottom:4px;">${escapeHtml(res.label)}</div>
            <div style="font-size:28px;font-weight:700;color:#1D4ED8;font-variant-numeric:tabular-nums;">${escapeHtml(res.value)}</div>
          </td>
        </tr>`;
      }
      return `
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#4B5563;border-bottom:1px solid #F3F4F6;">${escapeHtml(res.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6;font-variant-numeric:tabular-nums;">${escapeHtml(res.value)}</td>
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
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;overflow:hidden;">
          <tr>
            <td style="padding:20px 20px 8px;">
              <div style="font-size:16px;font-weight:700;color:#1E3A5F;margin-bottom:4px;">Ready to take the next step?</div>
              <div style="font-size:13px;color:#64748B;margin-bottom:16px;">Based on your results, these tools can help you take action.</div>
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
                          <div style="font-size:10px;font-weight:700;color:#0369A1;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${escapeHtml(a.category)}</div>
                          <div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:4px;">${escapeHtml(a.name)} *</div>
                          <div style="font-size:13px;color:#475569;line-height:1.4;margin-bottom:12px;">${escapeHtml(a.tagline)}</div>
                          <a href="${affUrl}" style="display:inline-block;padding:10px 24px;background-color:#2563EB;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
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
              <div style="font-size:11px;color:#94A3B8;line-height:1.4;">* Affiliate link — CalcRun may earn a commission at no cost to you. <a href="https://www.calcrun.com/disclosure" style="color:#94A3B8;">Full disclosure</a></div>
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
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;background-color:#FFFFFF;border-bottom:1px solid #E5E7EB;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="https://www.calcrun.com/icon-192.png" alt="CalcRun" width="36" height="36" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;">
                      <span style="color:#0A2540;">Calc</span><span style="color:#3B82F6;">Run</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em;">
                Your ${escapeHtml(toolName)} Results
              </h1>
            </td>
          </tr>

          <!-- Inputs Section -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your Inputs</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;border-collapse:separate;">
                ${inputRows}
              </table>
            </td>
          </tr>

          <!-- Results Section -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your Results</div>
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
                style="display:inline-block;padding:12px 28px;background-color:#2563EB;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                Run this calculator again &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                <a href="https://www.calcrun.com" style="color:#6B7280;text-decoration:none;font-weight:600;">CalcRun</a> &mdash; Free financial calculators<br>
                You received this because you emailed yourself calculator results from calcrun.com.<br>
                This is a one-time transactional email. You will not receive marketing emails unless you opted in.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;line-height:1.5;">
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

/* ── Handle POST /api/email-results ────────────────────────── */
async function handleEmailResults(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  const mailerSendKey = env.MAILERSEND_API_KEY;
  if (!mailerSendKey) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 503, headers }
    );
  }

  let body: EmailResultsBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers }
    );
  }

  // Honeypot
  if (body.honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Please enter a valid email address' }),
      { status: 400, headers }
    );
  }

  if (!body.toolSlug || !body.toolName || !Array.isArray(body.results) || body.results.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing calculator results' }),
      { status: 400, headers }
    );
  }

  // Build the email HTML
  const htmlContent = buildResultsEmail(body.toolName, body.toolSlug, body.inputs || [], body.results);

  // Send via MailerSend
  try {
    const msResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mailerSendKey}`,
      },
      body: JSON.stringify({
        from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
        to: [{ email }],
        subject: `Your ${body.toolName} Results — CalcRun`,
        html: htmlContent,
      }),
    });

    if (!msResponse.ok) {
      const errorData = await msResponse.text();
      console.error('MailerSend error:', msResponse.status, errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please try again.' }),
        { status: 502, headers }
      );
    }
  } catch (err) {
    console.error('MailerSend request failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to send email. Please try again.' }),
      { status: 502, headers }
    );
  }

  // Subscribe to MailerLite drip only if user opted in (fire-and-forget — don't fail if this errors)
  if (body.subscribe && env.MAILERLITE_API_KEY) {
    try {
      await subscribeToMailerLite(email, body.toolSlug, env.MAILERLITE_API_KEY);
    } catch (err) {
      console.error('MailerLite subscribe (from email-results) failed:', err);
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}

/* ── Worker entry point ────────────────────────────────────── */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight for API routes
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      const origin = request.headers.get('Origin');
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // API routes
    if (url.pathname === '/api/subscribe') {
      if (request.method === 'POST') {
        return handleSubscribe(request, env);
      }
      return new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname === '/api/email-results') {
      if (request.method === 'POST') {
        return handleEmailResults(request, env);
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // Everything else → static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

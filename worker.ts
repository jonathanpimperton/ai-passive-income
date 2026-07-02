/**
 * Cloudflare Worker entry point.
 *
 * Handles API routes (POST /api/subscribe, POST /api/email-results)
 * and delegates all other requests to static assets served from dist/.
 *
 * Security: Turnstile bot prevention, hand-rolled schema validation, server-side
 * tool name derivation (never trust client toolName), input sanitization,
 * 20KB request size cap.
 *
 * Rate limiting: Cloudflare WAF should be configured with TWO rules:
 *   - Rule 1: POST /api/email-results → 5 requests per IP per minute
 *   - Rule 2: POST /api/subscribe → 5 requests per IP per minute
 *   - Action: Block with 429 Too Many Requests
 *   - This is set in the Cloudflare dashboard (Security > WAF > Rate limiting rules)
 *   - The 429 is returned by Cloudflare BEFORE the worker runs, so no in-worker handling needed.
 *   - Without Rule 2, attackers can list-bomb the MailerLite free tier (500 subs).
 */

interface Env {
  ASSETS: Fetcher;
  MAILERLITE_API_KEY: string;
  MAILERSEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
}

/* ── Tool registry — server-side source of truth for valid slugs + display names ── */
const TOOL_REGISTRY: Record<string, string> = {
  'compound-interest': 'Compound Interest Calculator',
  'loan-amortization': 'Loan Amortization Calculator',
  'investment-return': 'Investment Return Calculator',
  'retirement-savings': 'Retirement Savings Calculator',
  'retirement-contribution': 'Retirement Contribution Calculator',
  'retirement-age': 'Retirement Age Calculator',
  'debt-payoff': 'Debt Payoff Calculator',
  'savings-goal': 'Savings Goal Calculator',
  'salary': 'US Salary Calculator',
  'salary-uk': 'UK Salary Calculator',
  'mortgage-payment': 'Mortgage Payment Calculator',
  'inflation': 'Inflation Calculator',
  'roi': 'ROI Calculator',
  'net-worth': 'Net Worth Calculator',
  'rent-vs-buy': 'Rent vs Buy Calculator',
  'emergency-fund': 'Emergency Fund Calculator',
  'investment-fee': 'Investment Fee Calculator',
  'mortgage-affordability': 'Mortgage Affordability Calculator',
  'credit-card-payoff': 'Credit Card Payoff Calculator',
  'solar-payback': 'Solar Panel Payback Calculator',
  'car-finance': 'Car Finance Comparison Calculator',
  'stamp-duty': 'Stamp Duty Calculator',
  'capital-gains-tax': 'Capital Gains Tax Calculator',
};

/* ── Tool page paths — canonical URL per slug (note: 'salary' lives at salary-us) ── */
const TOOL_PATHS: Record<string, string> = {
  'compound-interest': '/tools/saving-and-growth/compound-interest/',
  'loan-amortization': '/tools/debt-and-loans/loan-amortization/',
  'investment-return': '/tools/saving-and-growth/investment-return/',
  'retirement-savings': '/tools/income-and-planning/retirement-savings/',
  'retirement-contribution': '/tools/income-and-planning/retirement-contribution/',
  'retirement-age': '/tools/income-and-planning/retirement-age/',
  'debt-payoff': '/tools/debt-and-loans/debt-payoff/',
  'savings-goal': '/tools/saving-and-growth/savings-goal/',
  'salary': '/tools/income-and-planning/salary-us/',
  'salary-uk': '/tools/income-and-planning/salary-uk/',
  'mortgage-payment': '/tools/debt-and-loans/mortgage-payment/',
  'inflation': '/tools/economic/inflation/',
  'roi': '/tools/saving-and-growth/roi/',
  'net-worth': '/tools/income-and-planning/net-worth/',
  'rent-vs-buy': '/tools/debt-and-loans/rent-vs-buy/',
  'emergency-fund': '/tools/income-and-planning/emergency-fund/',
  'investment-fee': '/tools/saving-and-growth/investment-fee/',
  'mortgage-affordability': '/tools/debt-and-loans/mortgage-affordability/',
  'credit-card-payoff': '/tools/debt-and-loans/credit-card-payoff/',
  'solar-payback': '/tools/saving-and-growth/solar-payback/',
  'car-finance': '/tools/debt-and-loans/car-finance/',
  'stamp-duty': '/tools/economic/stamp-duty/',
  'capital-gains-tax': '/tools/economic/capital-gains-tax/',
};

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

/* ── Request size cap ─────────────────────────────────────── */
const MAX_REQUEST_SIZE = 20_480; // 20KB

/* ── Input sanitization ──────────────────────────────────── */
function sanitizeText(str: string): string {
  return escapeHtml(
    str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // non-printable
      .replace(/[\r\n]/g, '')                               // prevent CRLF injection
      .replace(/\s+/g, ' ')                                 // collapse whitespace
      .trim()
  );
}

/* ── Turnstile verification ──────────────────────────────── */
async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/* ── Schema validation (inline — worker can't import from src/) ── */
function validateEmailResultsBody(raw: unknown): {
  ok: true;
  data: {
    email: string;
    toolSlug: string;
    inputs: Array<{ label: string; value: string }>;
    results: Array<{ label: string; value: string; highlight?: boolean }>;
    subscribe: boolean;
    honeypot: string;
    turnstileToken: string;
  };
} | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid request body' };
  }
  const body = raw as Record<string, unknown>;

  // Honeypot
  const honeypot = typeof body.honeypot === 'string' ? body.honeypot : '';

  // Turnstile token
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';

  // Email — trim, lowercase, max 254 chars
  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!rawEmail || rawEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }

  // Tool slug — must exist in registry
  const rawSlug = typeof body.toolSlug === 'string' ? body.toolSlug.trim() : '';
  if (!rawSlug || rawSlug.length > 50 || !(rawSlug in TOOL_REGISTRY)) {
    return { ok: false, error: 'Invalid calculator' };
  }

  // Inputs — array of {label, value}, max 20 items, max 200 chars each
  const rawInputs = Array.isArray(body.inputs) ? body.inputs : [];
  if (rawInputs.length > 20) {
    return { ok: false, error: 'Too many input fields' };
  }
  const inputs: Array<{ label: string; value: string }> = [];
  for (const inp of rawInputs) {
    if (typeof inp !== 'object' || inp === null) continue;
    const label = typeof (inp as Record<string, unknown>).label === 'string'
      ? String((inp as Record<string, unknown>).label).slice(0, 200).replace(/[\r\n]/g, '')
      : '';
    const value = typeof (inp as Record<string, unknown>).value === 'string'
      ? String((inp as Record<string, unknown>).value).slice(0, 200).replace(/[\r\n]/g, '')
      : '';
    if (label && value) inputs.push({ label, value });
  }

  // Results — array of {label, value, highlight?}, 1-20 items
  const rawResults = Array.isArray(body.results) ? body.results : [];
  if (rawResults.length === 0 || rawResults.length > 20) {
    return { ok: false, error: 'Missing calculator results' };
  }
  const results: Array<{ label: string; value: string; highlight?: boolean }> = [];
  for (const res of rawResults) {
    if (typeof res !== 'object' || res === null) continue;
    const label = typeof (res as Record<string, unknown>).label === 'string'
      ? String((res as Record<string, unknown>).label).slice(0, 200).replace(/[\r\n]/g, '')
      : '';
    const value = typeof (res as Record<string, unknown>).value === 'string'
      ? String((res as Record<string, unknown>).value).slice(0, 200).replace(/[\r\n]/g, '')
      : '';
    const highlight = (res as Record<string, unknown>).highlight === true;
    if (label && value) results.push({ label, value, highlight });
  }
  if (results.length === 0) {
    return { ok: false, error: 'Missing calculator results' };
  }

  const subscribe = body.subscribe === true;

  return {
    ok: true,
    data: { email: rawEmail, toolSlug: rawSlug, inputs, results, subscribe, honeypot, turnstileToken },
  };
}

/* ── CORS ──────────────────────────────────────────────────── */
function isAllowedOrigin(origin: string): boolean {
  if (origin === ALLOWED_ORIGIN) return true;
  // Allow localhost for dev — strict check to prevent bypass via localhost.evil.com
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/* ── Subscribe to MailerLite ───────────────────────────────── */
async function subscribeToMailerLite(
  email: string,
  toolSlug: string | undefined,
  apiKey: string,
  signupSource: 'newsletter' | 'results' = 'newsletter',
): Promise<void> {
  const fields: Record<string, string> = { signup_source: signupSource };
  if (toolSlug) fields.calculator_slug = toolSlug;

  const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email,
      groups: [MAILERLITE_GROUP_ID],
      fields,
    }),
  });

  // 422 = already subscribed / validation quirk — treat as success.
  // Anything else is a real failure and must surface to the caller so the
  // UI can show an error instead of silently losing the signup.
  if (!mlResponse.ok && mlResponse.status !== 422) {
    console.error('MailerLite error: status', mlResponse.status);
    throw new Error(`MailerLite responded ${mlResponse.status}`);
  }
}

/* ── Validate /api/subscribe body ─────────────────────────── */
function validateSubscribeBody(raw: unknown): {
  ok: true;
  data: { email: string; toolSlug: string | undefined; honeypot: string };
} | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid request body' };
  }
  const body = raw as Record<string, unknown>;

  const honeypot = typeof body.honeypot === 'string' ? body.honeypot : '';

  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!rawEmail || rawEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }

  // toolSlug is optional for subscribe, but if present must be valid
  let toolSlug: string | undefined;
  if (typeof body.toolSlug === 'string' && body.toolSlug.trim()) {
    const slug = body.toolSlug.trim();
    if (slug.length > 50 || !(slug in TOOL_REGISTRY)) {
      toolSlug = undefined; // silently ignore invalid slugs — don't leak registry
    } else {
      toolSlug = slug;
    }
  }

  return { ok: true, data: { email: rawEmail, toolSlug, honeypot } };
}

/* ── Handle POST /api/subscribe ────────────────────────────── */
async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  // 1. Request size cap (same as email-results)
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_REQUEST_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Request too large' }),
      { status: 413, headers }
    );
  }

  const apiKey = env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 503, headers }
    );
  }

  // 2. Parse JSON with size guard
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers }
    );
  }
  if (rawText.length > MAX_REQUEST_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Request too large' }),
      { status: 413, headers }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers }
    );
  }

  // 3. Validate with strict schema
  const validation = validateSubscribeBody(rawBody);
  if (!validation.ok) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers }
    );
  }
  const body = validation.data;

  // 4. Honeypot filled = bot → silently succeed
  if (body.honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  // 5. Subscribe
  try {
    await subscribeToMailerLite(body.email, body.toolSlug, apiKey, 'newsletter');
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch {
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
  results: Array<{ label: string; value: string; highlight?: boolean }>,
): string {
  const tip = QUICK_TIPS[toolSlug] || '';
  // toolSlug is already validated against TOOL_REGISTRY upstream
  const toolUrl = `https://www.calcrun.com${TOOL_PATHS[toolSlug] || '/tools/'}`;

  const inputRows = inputs
    .map(
      (inp) => `
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#4B5563;border-bottom:1px solid #F3F4F6;">${sanitizeText(inp.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6;font-variant-numeric:tabular-nums;">${sanitizeText(inp.value)}</td>
      </tr>`
    )
    .join('');

  const resultRows = results
    .map((res) => {
      if (res.highlight) {
        return `
        <tr>
          <td colspan="2" style="padding:16px 12px;background-color:#E6F2F2;border-bottom:1px solid #B8DADA;border-radius:8px;">
            <div style="font-size:13px;color:#0B6E6E;margin-bottom:4px;">${sanitizeText(res.label)}</div>
            <div style="font-size:28px;font-weight:700;color:#085858;font-variant-numeric:tabular-nums;">${sanitizeText(res.value)}</div>
          </td>
        </tr>`;
      }
      return `
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#4B5563;border-bottom:1px solid #F3F4F6;">${sanitizeText(res.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#1A1A2E;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6;font-variant-numeric:tabular-nums;">${sanitizeText(res.value)}</td>
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

/* ── Handle POST /api/email-results ────────────────────────── */
async function handleEmailResults(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  // 1. Hard cap request size before parsing
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_REQUEST_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Request too large' }),
      { status: 413, headers }
    );
  }

  const mailerSendKey = env.MAILERSEND_API_KEY;
  if (!mailerSendKey) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 503, headers }
    );
  }

  // 2. Parse JSON with size guard (read as text first to verify size)
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers }
    );
  }
  if (rawText.length > MAX_REQUEST_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Request too large' }),
      { status: 413, headers }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers }
    );
  }

  // 3. Validate with strict schema
  const validation = validateEmailResultsBody(rawBody);
  if (!validation.ok) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers }
    );
  }
  const body = validation.data;

  // 4. Honeypot — silently succeed for bots
  if (body.honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  // 5. Verify Turnstile token — fail CLOSED: sending branded email from our
  // verified domain without bot verification is worse than a temporary outage.
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error('TURNSTILE_SECRET_KEY not set — refusing to send email without bot verification.');
    return new Response(
      JSON.stringify({ error: 'Email sending is temporarily unavailable.' }),
      { status: 503, headers }
    );
  }
  if (env.TURNSTILE_SECRET_KEY) {
    if (!body.turnstileToken) {
      return new Response(
        JSON.stringify({ error: 'Verification required' }),
        { status: 403, headers }
      );
    }
    const turnstileOk = await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY);
    if (!turnstileOk) {
      return new Response(
        JSON.stringify({ error: 'Verification failed. Please try again.' }),
        { status: 403, headers }
      );
    }
  }

  // 6. Derive tool display name from server-side registry (NEVER use client toolName)
  const toolDisplayName = TOOL_REGISTRY[body.toolSlug] || 'Calculator';

  // 7. Build the email HTML with sanitized data
  const htmlContent = buildResultsEmail(toolDisplayName, body.toolSlug, body.inputs, body.results);

  // 8. Send via MailerSend — subject uses server-derived name
  try {
    const msResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mailerSendKey}`,
      },
      body: JSON.stringify({
        from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
        to: [{ email: body.email }],
        subject: `Your ${toolDisplayName} Results — CalcRun`,
        html: htmlContent,
      }),
    });

    if (!msResponse.ok) {
      console.error('MailerSend error: status', msResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please try again.' }),
        { status: 502, headers }
      );
    }
  } catch {
    console.error('MailerSend request failed');
    return new Response(
      JSON.stringify({ error: 'Failed to send email. Please try again.' }),
      { status: 502, headers }
    );
  }

  // 9. Subscribe to MailerLite drip only if user opted in (fire-and-forget)
  if (body.subscribe && env.MAILERLITE_API_KEY) {
    try {
      await subscribeToMailerLite(body.email, body.toolSlug, env.MAILERLITE_API_KEY, 'results');
    } catch {
      console.error('MailerLite subscribe (from email-results) failed');
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

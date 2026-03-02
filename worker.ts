/**
 * Cloudflare Worker entry point.
 *
 * Handles API routes (POST /api/subscribe) and delegates
 * all other requests to static assets served from dist/.
 */

interface Env {
  ASSETS: Fetcher;
  MAILERLITE_API_KEY: string;
}

interface SubscribeBody {
  email: string;
  toolSlug?: string;
  honeypot?: string;
}

const MAILERLITE_GROUP_ID = '180838346043426395';
const ALLOWED_ORIGIN = 'https://www.calcrun.com';

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
    const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        groups: [MAILERLITE_GROUP_ID],
        fields: body.toolSlug ? { calculator_slug: body.toolSlug } : undefined,
      }),
    });

    // 200/201 = success, 422 = already subscribed (treat as success)
    if (mlResponse.ok || mlResponse.status === 422) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    const errorData = await mlResponse.text();
    console.error('MailerLite error:', mlResponse.status, errorData);
    return new Response(
      JSON.stringify({ error: 'Subscription failed. Please try again.' }),
      { status: 502, headers }
    );
  } catch (err) {
    console.error('MailerLite request failed:', err);
    return new Response(
      JSON.stringify({ error: 'Subscription failed. Please try again.' }),
      { status: 502, headers }
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API routes
    if (url.pathname === '/api/subscribe') {
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('Origin');
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (request.method === 'POST') {
        return handleSubscribe(request, env);
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // Everything else → static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

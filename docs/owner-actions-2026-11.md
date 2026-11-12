# Owner actions, November 2026 (platform, email, DNS)

Things only the owner can do, because they live in dashboards (Cloudflare, MailerLite,
MailerSend, GitHub) rather than in the repo. Written for plan-2026-11 task PL-10 (owner items
O-6 to O-9 and O-11). Dashboard menu names drift over time; if a label differs slightly,
look for the nearest equivalent. Nothing here needs a code change unless it says so.

Order of priority: 1, 2, 3 first (email abuse and deliverability), then the rest.

---

## 1. Worker secrets still present (do this first after the W1-PLAT deploy)

The newsletter endpoint now requires a Turnstile token and **fails closed (HTTP 503) if the
Turnstile secret is missing**. The results-email endpoint already did.

Cloudflare dashboard -> Workers & Pages -> `calcrun` -> Settings -> Variables and Secrets.
Confirm all three exist (values are hidden; just check the names):

- `MAILERLITE_API_KEY`
- `MAILERSEND_API_KEY`
- `TURNSTILE_SECRET_KEY`

Do **not** add `ALLOW_DEV_ORIGINS` in production. It is a local-development switch that lets
localhost pages call the API.

## 2. Turnstile widget hostnames (O-8)

Cloudflare dashboard -> Turnstile -> the widget whose site key is `0x4AAAAAACnZPz-6NCP1yfgb`
-> Settings (or Edit).

- Hostname management: exactly `www.calcrun.com` and `calcrun.com`. Remove anything else
  (for example `localhost` or a `*.pages.dev` name). The Worker also rejects tokens whose
  reported hostname is not one of these two.
- Widget mode: **Managed** is recommended. The site renders the widget with
  `appearance: interaction-only`, so most visitors never see it; a visitor who needs a
  challenge sees it inside the form. Invisible mode also works.
- Leave pre-clearance off.

## 3. MailerLite: double opt-in and clean-up (O-6)

Review the group for junk sign-ups and require confirmation for new ones.

1. MailerLite -> Account settings -> Subscribe settings (sometimes shown under
   "Double opt-in") -> turn on **Double opt-in for API and integrations**. New sign-ups then
   get a confirmation email and only join after clicking it.
2. MailerLite -> Subscribers -> Groups -> "Calculator Results" (group ID
   `180838346043426395`):
   - sort by "Subscribed" date; look for bursts (many sign-ups within minutes), obvious junk
     or role addresses, and addresses with zero opens since joining;
   - delete (not just unsubscribe) addresses you are confident never opted in;
   - check the group still exists with that ID (the Worker posts to it by ID).
3. Optional: Automations -> confirm the drip automation status matches what you expect.

## 4. MailerSend: activity check (O-7)

MailerSend -> Activity (or Analytics -> Activity), last 90 days:

- recipients you do not recognise in large numbers, or many sends to one address;
- subjects other than "Your <Calculator name> Results - CalcRun" (the subject used to end in
  an em dash);
- bounces, spam complaints and the complaint rate (Analytics);
- Plan / Usage: the free quota (about 500 emails a month on the current plan).

If anything looks wrong, rotate `MAILERSEND_API_KEY` (MailerSend -> Integrations -> API
tokens -> create new, then update the Worker secret in step 1, then delete the old token).

## 5. DNS: DMARC record, SPF tidy-up (O-8)

Cloudflare dashboard -> `calcrun.com` -> DNS -> Records -> Add record:

| Field | Value |
|---|---|
| Type | TXT |
| Name | `_dmarc` |
| Content | `v=DMARC1; p=none; rua=mailto:hello@calcrun.com` |
| TTL | Auto |

`p=none` only collects reports; nothing is blocked. After 4-8 weeks of clean reports
(MailerSend and MailerLite both aligned), move to `p=quarantine`. Alternative: Cloudflare
dashboard -> Email -> DMARC Management can create the record with a Cloudflare report
address and shows the reports in the dashboard.

SPF (optional tidy-up, review EDGE-09): edit the existing apex TXT record that starts with
`v=spf1`. Remove the ` a mx` mechanisms only; keep every `include:` (MailerSend, MailerLite,
Cloudflare Email Routing) and the final `~all`. If unsure what an include is for, leave it.

## 6. HSTS on the apex (O-8, review EDGE-08)

`https://calcrun.com/` redirects to www without an HSTS header, so the apex is not
protected and the domain cannot be preloaded.

Cloudflare dashboard -> `calcrun.com` -> SSL/TLS -> Edge Certificates -> HTTP Strict
Transport Security (HSTS) -> Enable HSTS:

- Max Age: 6 months to start (12 months once you are happy);
- Apply HSTS policy to subdomains (includeSubDomains): On, **only if every subdomain you
  use serves HTTPS** (check DNS for proxied records other than www and the apex; mail
  records are not affected);
- Preload: Off for now. Submit to hstspreload.org later, after a few weeks with no issues,
  if you want it (removal from the preload list is slow).
- No-Sniff header: On.

## 7. WAF rate-limiting rule (O-8)

Cloudflare dashboard -> `calcrun.com` -> Security -> WAF -> Rate limiting rules (newer
dashboards: Security -> Security rules).

Observed on 9 Nov 2026: about 4-5 POSTs per 10 seconds per IP, shared across both API
endpoints, then a 10 second block (HTTP 429, plain text "error code: 1015"). That matches
the free plan's single rule (10 second period, 10 second block). Check:

- expression covers both paths, for example
  `(http.request.method eq "POST" and http.request.uri.path in {"/api/subscribe" "/api/email-results"})`;
- counting characteristic: IP;
- action: Block.

The Worker comment now describes this behaviour; the forms show "Too many attempts. Please
wait a minute and try again." for that 429.

## 8. Bot Fight Mode / JavaScript detections (O-8, review EDGE-17)

Cloudflare dashboard -> `calcrun.com` -> Security -> Bots.

These features inject a script into every HTML page and strip HTML ETags. They are why the
site's Content-Security-Policy keeps `'unsafe-inline'` (see "Platform notes" below). The
privacy page (W1-HOME) now discloses them. Decide whether you want them on. If you turn JS
detections off, the CSP can move to hashes (ask for that change).

## 9. workers.dev and preview URLs (O-8)

Cloudflare dashboard -> Workers & Pages -> `calcrun` -> Settings -> Domains & Routes:

- `workers.dev`: Disable, unless you use it.
- Preview URLs: Disable, unless you use them.

Caution: `wrangler deploy` applies `wrangler.toml`, where `workers_dev` defaults to true, so
a dashboard toggle may be switched back on by the next deploy. To make it stick, the repo
needs `workers_dev = false` (and `preview_urls = false`) in `wrangler.toml`. That is a
one-line reviewed change; ask for it once you have confirmed nothing uses the workers.dev URL.

## 10. Email Routing for hello@ (O-8)

Cloudflare dashboard -> `calcrun.com` -> Email -> Email Routing:

- Status: Enabled; DNS records: all green;
- Routing rules: a custom address `hello@calcrun.com` -> "Send to an email" -> your inbox;
- Destination addresses: that inbox shows "Verified".

Send a test email to hello@calcrun.com from another account and confirm it arrives. DMARC
reports (step 5) and security.txt both point to this address.

## 11. calcrun.pages.dev (O-9, review EDGE-16)

The old Pages project is gone and the name resolves to nothing, so anyone could create a
Pages project called `calcrun` and serve content at calcrun.pages.dev. No public links to it
were found, so the risk is low. To re-claim it:

1. Create a folder with two files:
   - `index.html` containing `<!doctype html><title>CalcRun</title><a href="https://www.calcrun.com/">CalcRun</a>`
   - `_redirects` containing the single line `/* https://www.calcrun.com/:splat 301`
2. Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Upload assets -> project
   name `calcrun` -> upload the folder -> Deploy.
3. Check `https://calcrun.pages.dev/about/` redirects to `https://www.calcrun.com/about/`.

If the name is already taken by someone else, tell the orchestrator; there is nothing to
link to it from the site.

## 12. GitHub Actions notifications and the weekly freshness check (O-11)

Three workflows now exist (only the third uses a secret, and it is optional; section 14):

- `CI` (`.github/workflows/ci.yml`): on every push and pull request it runs unit tests,
  the build, the link check and the production-config E2E suite. It does not deploy and does
  not block Cloudflare's deploy; a red run is an early warning.
- `Freshness` (`.github/workflows/freshness.yml`): Mondays 07:00 UTC (and on demand). It fails
  when a dated fact (tax year, rates, security.txt expiry...) is due within 30 days or
  overdue.
- `Scheduled rebuild` (`.github/workflows/scheduled-rebuild.yml`): 1 January and 6 April,
  redeploys production through a Cloudflare deploy hook (section 14).

To make sure failures reach you:

1. GitHub -> your avatar -> Settings -> Notifications -> System -> Actions: tick Email, and
   choose "Only notify for failed workflows".
2. Scheduled-run failure emails go to the account that last changed the workflow's `cron`
   line; that is whoever pushes the commit containing it (you, via the orchestrator's push).

**60-day rule:** GitHub automatically disables scheduled workflows in a public repository
after 60 days with no repository activity. If the site is left alone that long, the weekly
check stops silently. To re-enable: GitHub -> repository -> Actions -> "Freshness" in the
left sidebar -> "Enable workflow", or run `gh workflow enable freshness.yml`. A simple habit:
look at the Actions tab whenever you add the yearly rates data (UK 2027/28 is due before
6 April 2027, O-12). It is not documented whether GitHub emails a warning before
disabling, so do not rely on one.

## 13. After each deploy: quick live checks (no forms, invalid addresses only)

These are what the orchestrator runs (plan Section 9.5). Each is safe: no valid address is
ever sent.

```bash
# designed 404 page with status 404 (expect: 404 and a page title)
curl -s -o /dev/null -w "%{http_code}\n" https://www.calcrun.com/plat-qa-missing/
# one-hop 301 for a slash-less retired URL
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.calcrun.com/scenarios/40k-salary-uk-take-home
# newsletter endpoint refuses text/plain (expect 415)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: text/plain" --data '{"email":"x"}' https://www.calcrun.com/api/subscribe
# results endpoint without a token (expect 403)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -H "Origin: https://www.calcrun.com" --data '{"email":"x@invalid","toolSlug":"compound-interest","results":[{"label":"Final Balance","value":"$1"}]}' https://www.calcrun.com/api/email-results
# security.txt expiry (expect 2027-11-10)
curl -s https://www.calcrun.com/.well-known/security.txt | grep Expires
```

The address in the last-but-one request is deliberately invalid: a request without a
Turnstile token is refused (403) before any field is validated, so nothing reaches
Turnstile, MailerSend or MailerLite.

## 14. Scheduled rebuilds on tax-year rollover (deploy hook secret)

The default tax year is fixed into the HTML when the site is built. A build from one tax
year served in the next makes the page and the browser disagree (a hydration error on the
homepage engine) until the site is redeployed. The `Scheduled rebuild` workflow
(`.github/workflows/scheduled-rebuild.yml`) redeploys on **1 January and 6 April at 00:30
UTC** without creating commits, by calling a Cloudflare Workers Builds **Deploy Hook**
(available since 1 April 2026; developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/).
Until you add the secret, the workflow only logs "Scheduled rebuild skipped".

1. Cloudflare dashboard -> Workers & Pages -> `calcrun` -> Settings -> Builds -> Deploy
   Hooks -> name `scheduled-rebuild`, branch `claude/master` -> Create. Copy the URL (it
   looks like `https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/<id>`).
2. GitHub -> repository -> Settings -> Secrets and variables -> Actions -> New repository
   secret: name `CF_DEPLOY_HOOK_URL`, value the URL from step 1.
3. Test once: GitHub -> Actions -> "Scheduled rebuild" -> Run workflow. The log should end
   with "Build queued: ..."; Cloudflare -> `calcrun` -> Deployments shows a new build with
   trigger "deploy hook".

The URL works without any other credential, so treat it like a password: anyone who has it
can trigger builds (Cloudflare limits a Worker to 10 builds a minute). If it leaks, delete
the hook in step 1 and create a new one, then update the secret. If a scheduled build fails
(for example because the rates freshness guard finds stale data), Cloudflare keeps serving
the previous deployment and the workflow run turns red.

Timing note: 00:30 UTC on 1 January is still 31 December in the Americas, so for a few hours
US visitors' browsers are a year behind the freshly built page. W1-TAX's handling of the
default year decides whether that matters; a later run can be added if it does.

---

## Platform notes (for reference; no action needed)

- **Why `'unsafe-inline'` stays in the CSP (review EDGE-13).** The built pages carry about
  15 distinct inline scripts (theme, consent, GA bootstrap, Astro island runtime). A build
  step could hash them, but Cloudflare's bot "JavaScript detections" adds its own inline
  script to every HTML response at the edge, and that script can only be allowed by a
  per-request nonce. Nonces need a Worker in the HTML path, which decision D5 rules out
  (HTML stays on static assets). A hash-only CSP would therefore block Cloudflare's script
  on every page view. If JS detections are turned off (step 8), a hash-based CSP becomes
  practical: a post-build script would compute the hashes from `dist/` and write them into
  `dist/_headers`.
- **ETag and 304 (review EDGE-14).** Static assets (JS, CSS, fonts, images) carry ETags and
  revalidate with 304. HTML has no ETag on live because Cloudflare's injected script changes
  the HTML, so revalidation returns a full 200 (about 22 KB compressed for the homepage).
  Workers static assets offers no setting for this; `_headers` cannot add an ETag. It is
  harmless.
- **Missing hashed assets.** A request for an `/_astro/...` file that does not exist now gets
  the 404 page with status 404, but still carries the `/_astro/*` long-cache header, because
  `_headers` rules match by path, not by status. Such URLs are never requested again after a
  deploy, so this does not matter in practice.
- **Workers Logs** are off. Turning them on (Workers & Pages -> `calcrun` -> Settings ->
  Observability, or `[observability] enabled = true` in `wrangler.toml`) would show the
  API's warning lines (status codes and rejection reasons only, never addresses). Cloudflare
  keeps request metadata in those logs for a few days, so mention it in the privacy page if
  you enable it.

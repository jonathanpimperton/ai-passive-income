# CalcRun (AI Passive Income experiment)

An experiment in building a zero-investment online business entirely with AI (Claude Code).
It is live at **https://www.calcrun.com**.

## What it is

A financial calculator site: UK and US take-home pay, mortgages and affordability, stamp duty,
capital gains, savings, investing, retirement and debt. There are also utility tools and
client-side file converters. Results update in real time, need no signup, and carry no display
ads. File and developer tools run entirely in the browser.

Current size: 46 tools (23 financial calculators, 7 utilities, 16 file converters), 4 computed
hub pages, scenarios, comparisons and "How we calculate" methodology pages. About 142 pages.

## Tech stack

- **Astro 5** + TypeScript: static site generation, with React islands for the interactive tools.
- **Tailwind CSS v4.**
- **recharts** for charts; **GSAP** for the homepage intro.
- **Cloudflare Workers + static assets** for hosting. `worker.ts` serves the email APIs, and the
  rest is static from `dist/`. Deploys run through Cloudflare Workers Builds on push to
  `claude/master`.
- **MailerLite / MailerSend** for email; **Cloudflare Turnstile** for bot checks; **GA4** for
  analytics.

## Status (November 2026)

- Live since early 2026. The July 2026 overhaul (data correctness, "Precision Instrument"
  redesign, SEO restructure) shipped on 7 Jul 2026.
- An independent review on 9 Nov 2026 found a backlog of correctness, robustness and freshness
  fixes. A multi-wave fix plan is in progress; see `CLAUDE.md` for the current plan and status.

## Docs

| Document | What it covers |
|----------|---------------|
| `CLAUDE.md` | Project instructions, design rules, QA checklist, current status. **Start here.** |
| `docs/plan-2026-07.md` | The July 2026 overhaul plan (shipped; history) |
| `docs/review-2026-07.md` | The July 2026 review that drove that overhaul |
| `docs/build-spec.md` | Original product spec (audience, positioning, tools, SEO) |
| `docs/tax-values-2026.json` | Authoritative take-home tables used by the tests |
| `docs/archive/` | Early exploration, market research, financial model (history) |

## Running locally

```bash
npm install
npm run dev        # dev server
npm test           # unit tests (vitest)
npm run build      # production build (runs the rates freshness guard first)
node scripts/qa-link-check.mjs   # link/anchor/redirect integrity over dist/
```

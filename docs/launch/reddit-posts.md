# Reddit Launch Posts

## r/personalfinance

**Title:** I built free financial calculators that respect your time — no ads, no signup, instant results

**Body:**

I got tired of calculator sites covered in ads that make you click "Submit" and wait. So I built CalcRun — a collection of 14 financial calculators that update in real-time as you type.

**What's different:**
- Sliders + text inputs that sync together — drag to explore, type for precision
- Interactive charts on every calculator (growth curves, pie breakdowns, etc.)
- Collapsible year-by-year amortization tables (not 360-row data dumps)
- "Solve for X" on investment and retirement calculators — pick which variable to solve for
- Email yourself a results summary with one click
- Export to PDF with charts included
- Pre-calculated scenario pages for common questions like "What's the monthly payment on a $300K mortgage at 7%?"

**Tools available:** Compound interest, loan amortization, investment return, retirement savings, debt payoff (snowball vs avalanche), savings goal, mortgage payment, inflation, ROI, net worth, rent vs buy, emergency fund, US salary, UK salary

Plus utility tools (QR code generator, password generator, percentage calculator) and 13 file converters that process everything in your browser — your files never leave your device.

It's completely free and always will be. No signup required for anything.

Check it out: https://www.calcrun.com

Happy to answer questions about the math or methodology behind any of the calculators.

---

## r/financialindependence

**Title:** Free compound interest and retirement calculators with real-time charts and "Solve for X" mode

**Body:**

I built CalcRun for the FIRE community. The retirement savings calculator has a "Solve for X" mode where you can:
- Calculate your projected balance at retirement
- Find the monthly contribution needed to hit a target
- Determine what retirement age is realistic given your current savings rate

Everything updates in real-time — no submit button. The compound interest calculator shows year-by-year growth with area charts so you can actually see the hockey stick curve.

The debt payoff calculator lets you compare snowball vs. avalanche strategies side by side.

Pre-calculated scenario pages answer common questions:
- "Can I retire at 55 with $1 million?"
- "What does $100/month invested for 30 years look like?"
- "Is it better to rent or buy in 2026?"

Each page includes the quick answer, a detailed number breakdown, and a link to the full calculator so you can plug in your own numbers.

Free, no signup, no ads: https://www.calcrun.com

---

## r/sideproject

**Title:** I built a 37-tool financial calculator site with Astro + React, deployed free on Cloudflare — here's what I learned

**Body:**

**The project:** CalcRun (https://www.calcrun.com) — 14 financial calculators, 7 utility tools, and 15+ file converters. Plus 15 pre-calculated scenario pages for long-tail SEO.

**Tech stack:**
- **Astro 5** — static site generation, zero JS by default
- **React islands** — only the calculator components ship JavaScript (via `client:load`)
- **Tailwind CSS v4** — CSS-based config, no tailwind.config.ts
- **Recharts** — interactive charts in every calculator
- **Cloudflare Pages** (free tier) — hosting, CDN, unlimited bandwidth
- **Cloudflare Workers** — API routes for email capture (MailerLite) and transactional email (MailerSend)

**Key decisions:**
- Astro over Next.js: This is a static tools site. Astro ships zero JS by default = better Core Web Vitals = better SEO. We use maybe 10% of Next.js features.
- React islands for calculators: Each calculator is a self-contained React component that hydrates independently. The rest of the page is static HTML.
- Client-side file processing: All file converters (image compression, PDF merge/split, etc.) run in the browser. No server uploads = no bandwidth costs = truly free hosting.

**What worked well:**
- Real-time calculation (no submit button) is a huge UX differentiator
- Pre-calculated scenario pages are great for SEO and answering specific search queries
- Astro's content collections with Zod validation catch data errors at build time

**Monetization plan:**
- Affiliate links to financial products (Betterment, LendingTree, etc.)
- Email capture ("email me my results") → drip sequence → affiliate conversions
- Zero ad revenue dependency

**Numbers:** 52+ content pages, 95+ Lighthouse scores, $0 hosting cost.

Happy to dive into any technical decisions or share more about the architecture.

# Dev.to Article Outline

**Title:** How I Built a Financial Calculator Site with Astro and React Islands

**Tags:** astro, react, webdev, javascript

---

## Article Outline (~1500-2000 words)

### Introduction
- What CalcRun is: 37+ free financial tools, all running client-side
- Why I built it: Existing calculator sites are ad-heavy, slow, and require signup
- The constraint: $0 budget — everything on free tiers

### Why Astro Over Next.js

- This is a **content site with interactive components**, not a web app
- Astro ships zero JS by default → better Core Web Vitals → better SEO
- React components work natively as "islands" with `client:load`
- We use ~10% of Next.js features (no API routes in the framework, no SSR, no middleware)
- Cloudflare acquired Astro's parent company → first-class hosting support
- **Code example:** Show the `[tool].astro` page template with `client:load` on calculator components

### React Islands Architecture

- Each calculator is a self-contained React component
- No global state, no context providers, no routing
- Islands hydrate independently — one slow calculator doesn't block others
- **Code example:** CompoundInterestCalc.tsx structure — state, useMemo for calculations, two-column layout
- SliderInput component: synced slider + text input, debounced updates
- `aria-live="polite"` on results for screen reader announcements

### Tailwind CSS v4: The CSS-Based Config

- No more `tailwind.config.ts` — everything lives in `@theme` in CSS
- **Gotcha:** Every color token must be explicitly defined or utilities silently fail
- Custom design tokens: primary, accent, neutral palettes with specific opacity variants
- Custom shadows: `shadow-card` and `shadow-card-hover` for consistent elevation
- **Code example:** The `@theme` block with color definitions

### The PDF Export Challenge

- Initial attempt: `html2canvas` — crashed on Tailwind v4's `oklab()` color functions
- Solution: `html-to-image` for canvas capture, `jsPDF` for PDF assembly
- Section-aware page breaks: `data-pdf-section` attributes prevent slicing content mid-section
- Row-level break points: table rows collected as additional break candidates
- **Gotcha:** DOM mutations before async operations must use `try/finally` — learned this the hard way when a style restore didn't run after a crash

### Build-Time OG Image Generation

- Satori renders JSX to SVG → Sharp converts to PNG
- Category-colored templates: each tool category gets a different accent color
- Generated at build time, not on-demand — zero runtime cost
- **Code example:** The Satori template structure

### Email Results via Cloudflare Workers

- Cloudflare Workers handle two API routes: newsletter subscribe + email results
- MailerSend for transactional emails (branded HTML template with inputs, results, tips)
- MailerLite for newsletter drip sequences
- Honeypot field for bot protection (no CAPTCHA = better UX)
- All within free tiers: Workers free, MailerSend 500 emails/month, MailerLite 500 subscribers

### Programmatic SEO with Scenario Pages

- 15 pre-calculated scenario pages targeting long-tail search queries
- Static Astro pages (zero JS) with educational content
- Each page links to the full calculator as a CTA
- Content collection with Zod schema validation
- **Example:** "Monthly Payment on a $300,000 Mortgage at 7%" targets a specific search query with instant answer + depth

### Hosting on Cloudflare Pages (Free)

- Unlimited bandwidth, global CDN, automatic SSL
- Workers for API routes (email capture, results email)
- Custom domain via Cloudflare Registrar
- Total monthly cost: $0

### Performance Results

- Lighthouse scores: 95+ across all pages
- Zero JS on static pages (scenarios, about, legal)
- Calculator pages: JS only for the React island component
- Code splitting: heavy dependencies (pdf-lib, jsPDF, heic-to) only load on pages that need them

### Lessons Learned

1. **Ship zero JS by default** — use a framework that makes this the default, not an optimization
2. **Real-time > submit buttons** — immediate feedback is a huge UX differentiator
3. **Validate at build time** — Zod schemas in content collections catch data errors before deploy
4. **Always use try/finally for async DOM mutations** — learned this from a production PDF export bug
5. **Free tiers are powerful** — Cloudflare Pages + Workers + MailerSend + MailerLite = a complete production stack at $0

### Call to Action

- Try CalcRun: https://www.calcrun.com
- Built with: Astro 5, React, Tailwind CSS v4, Cloudflare Pages
- Feedback welcome

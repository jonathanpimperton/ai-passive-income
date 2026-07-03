# Redesign 2.0 — "The Number Theater"
### A scroll-driven, cinematic redesign plan for CalcRun

> Status: PLAN FOR OWNER REVIEW — not started. Companion docs: `docs/plan-2026-07.md`
> (execution tracker), CLAUDE.md Design Quality Standards (current system rules).

---

## 1. Honest verdict on Redesign 1.0

The owner's critique is correct. Waves 1–3 ("Precision Instrument") were a
**re-skin**: typography, color semantics, component polish, chart theming,
performance. The information architecture, page structure, and the *feeling* of
using the site did not change. R1 was necessary plumbing — the site is now fast,
correct, accessible, and consistent — but it is not a redesign in the sense the
owner means: nothing about it makes a visitor *feel* anything.

Redesign 2.0 is the structural and emotional leap: the scroll becomes a timeline,
the site tells a story, and the calculators become staged experiences. R1's system
(tokens, mono numerals, chart theme, QA gates) is the foundation R2 builds on, not
a competing direction.

## 2. The concept (adapted from the Gemini brief)

The Gemini "scrollytelling" brief is adopted as the creative north star:
cinematic scroll-hook landing, sticky morphing data-graph chapters, sticky
split-screen calculators with scroll-evolving output, scroll-scrubbed animation,
text masking, parallax depth.

Adaptations — where the brief is bent to protect what a calculator business needs:

| Gemini idea | Adaptation | Why |
|---|---|---|
| Landing hides the site behind a full cinematic sequence | The story IS the homepage, but a persistent quiet header (logo + "Skip to tools →" + search) floats from frame one | Task-driven visitors (the majority for a tool site) must never be trapped in a movie. Bounce risk is the #1 danger of scrollytelling. |
| "What is your number?" opening line | **Adopted verbatim** — it's better than anything we have. It becomes the brand question. | It reframes the site from "some calculators" to "an answer machine". |
| Text dissolves into glowing particles that form a graph | Adopted with a tiered implementation (full canvas particles → CSS morph → static) | Particle canvas is achievable (~5KB custom, no three.js) but must degrade gracefully. |
| Category chapters: "Grow It." / "Pay It." | Extended to three chapters mapping to the actual business: **GROW IT** (compound, investment, retirement) · **KEEP IT** (take-home, tax — the UK/US salary flagship) · **OWE IT** (mortgage, debt) | "Keep It" is the site's strongest asset (salary tools) and Gemini's two-chapter split omitted it. |
| Emerald / crimson chapter washes | Adopted, tuned to the token system: emerald = existing `success` family, crimson = existing `red` family desaturated for dark, teal = brand | Chapter colors ARE the semantic money colors — the story teaches the color language the calculators use. |
| Calculators: right panel phases replace the result as you scroll | **Guardrail:** the headline answer NEVER leaves the screen. The scroll journey stages the *supporting* acts (chart draw → composition → schedule), not the answer itself | People come mid-task from Google. Answer-first is non-negotiable; the theater is for depth, not delay. |
| Scroll scrubbing via GSAP ScrollTrigger | Adopted. GSAP + ALL premium plugins (ScrollTrigger, SplitText, DrawSVG, MorphSVG) are now 100% free (Webflow acquisition) | The exact intended toolchain, $0. |
| Dark and moody throughout? (Gemini's open question) | **Recommendation: the "Dawn Handoff"** — see §3 | |

## 3. The dark question — recommendation: the Dawn Handoff

Gemini asks: fully dark throughout, or black↔white transitions?

**Recommended: the homepage opens in the dark theater and *hands off into daylight*.**
The story plays out on obsidian (`#0A0B0D`) — the theater. As the final chapter
resolves, a scroll-driven "dawn" transition washes the background from obsidian to
the site's paper white, and the visitor lands in the existing light product (the
live calculator hero, discovery, trust strip). Metaphor: *the story is told in the
dark; the work happens in daylight.* This:

- gives the full cinematic impact where it matters (first impression),
- keeps the product pages light-first (readability, trust, the R1 system intact),
- makes the transition itself a signature moment no competitor has,
- respects the existing dark-mode toggle (users who prefer dark keep dark
  product pages; the theater is dark for everyone).

Alternative (owner may prefer): **Full Dark Identity** — the whole site flips to
dark-first with light mode as the toggle. Bigger brand statement, but it forfeits
R1's light product work, hurts long-form readability, and YMYL trust research
favors light surfaces for data-heavy content. Not recommended, but achievable
(the token system makes it a flip, not a rebuild).

## 4. The homepage story — act by act

The homepage becomes a single scroll timeline (~5 viewport-heights of scroll
driving ~30s of animation), then the product below. All copy is REAL DOM text
(SEO + a11y); canvas/effects layer sits behind it.

**Act 0 — The Question (0%).**
Obsidian. Center: **"What is your number?"** in Space Grotesk, massive
(clamp 44–96px), pure white. Beneath: an ultra-thin (1px) vertical teal line,
pulsing softly, stretching downward — the scroll cue. Nothing else except the
quiet floating header. This frame IS the LCP: text renders instantly, no
animation blocks it.

**Act 1 — Dissolution (5–20%).**
On scroll, the headline releases into ~600–900 glowing particles (canvas,
sampled from the rendered text pixels) that stream downward and condense into a
thin glowing line chart — the "data line". Scrub-tied: scrolling up reverses it.
Tier B fallback: SplitText per-character scatter + a DrawSVG line (no canvas).
Tier C (reduced-motion/no-JS): crossfade to the line.

**Act 2 — GROW IT (20–40%).** The data line pins (sticky). The line morphs
(MorphSVG / interpolated path) into a compound-growth curve; a soft emerald wash
rises. Left: **"Grow it."** slides up behind a mask line. Right rail: three live
mono figures type themselves in — "£500/mo → £86,500 in 10 yrs" style, computed
at build by the real engines — each a link (Compound Interest, Investment Return,
Retirement). Parallax: wash moves at 0.6×, figures at 1×, line at 0.8×.

**Act 3 — KEEP IT (40–60%).** The curve morphs into a stacked take-home bar that
fills; wash shifts to brand teal. **"Keep it."** Live figures: "£50,000 salary →
£3,293/mo take-home" (UK), "$100K → $6,076/mo" (US) → Salary UK / Salary US /
Stamp Duty.

**Act 4 — OWE IT (60–80%).** The bar morphs into a declining amortization curve
falling to zero; muted crimson wash. **"Owe it."** Figures: "$300K mortgage →
$1,896/mo", "Debt-free in 23 months" → Mortgage, Debt Payoff, Credit Card.

**Act 5 — The Dawn (80–100%).** The curve flattens into a single horizontal
hairline; the obsidian washes to paper white over one viewport of scroll; the
hairline becomes the top border of the live Decision Engine hero (the existing
take-home/mortgage tabs — untouched). Below it, the current discovery + trust
strip + newsletter continue as today. The theater has handed off to the
instrument.

**Persistent affordances (all acts):** floating minimal header (logo,
"Skip to tools →" anchoring past the story, search icon); scroll progress hinted
by the pulsing line; URL hash per chapter (#grow/#keep/#owe) for deep links; the
entire story is ONE Astro island.

## 5. Calculator pages — "Functional Luxury"

Keep the 40/60 split (already exists). The upgrade is *staging*, not relocation:

- **Sticky answer (always):** left inputs stay put (as now); the right panel's
  headline number + stat cards pin as a compact bar once the user scrolls past
  them (desktop analogue of the existing mobile mini-bar).
- **Act 1 — the chart draws itself:** the area chart's line draws in, scrubbed to
  scroll (DrawSVG on the recharts path or a custom SVG overlay), with the
  crossover annotation dot popping at its scroll moment.
- **Act 2 — composition:** the "Interest vs Principal" / "Take-home vs
  deductions" breakdown slides up behind a mask as the chart settles.
- **Act 3 — the ledger:** the year-by-year schedule reveals rows in a fast
  stagger (~30ms/row, first 12 rows only, rest instant).
- **Micro-physics everywhere:** number count-ups on input change (already
  present) get a subtle overshoot; slider thumbs get a magnetic press state;
  tab panels crossfade with 8px slide.
- **Guardrails:** changing any input never requires scrolling to see the new
  answer (pinned bar); reduced-motion renders everything settled; PDF export and
  E2E flows unaffected (animations are presentation-layer only).

Rollout: prototype on **Compound Interest** and **Salary UK** first (the
flagships), review, then propagate via the shared pattern.

## 6. Motion system (the rules that keep it premium, not gimmicky)

- **Engine:** GSAP 3 + ScrollTrigger (+ SplitText for masked text, DrawSVG for
  line draws, MorphSVG for graph morphs). All free. Loaded ONLY on pages that
  use them, as part of the story island (budget below).
- **Scrub, never jack:** native scroll is never hijacked; `position: sticky` +
  `scrub: true` timelines only. No wheel-event hijacking, no forced snap longer
  than 300ms, `snap` only between homepage acts and only on desktop.
- **Text masking:** headings enter via clip-path line reveal (SplitText lines,
  y:110% → 0, 0.9s, custom ease) — the "theater curtain" effect.
- **Parallax tokens:** three depths only — background washes 0.6×, data layer
  0.8×, text 1.0×. More layers reads as noise.
- **Glow treatment:** the data line gets a 2-layer glow (core 1.5px line + 6px
  blurred underlay at 35% opacity) — canvas shadowBlur or SVG feGaussianBlur.
  Glow exists ONLY in the dark theater; daylight product stays flat per R1.
- **Theater palette additions** (tokens): `--theater-bg #0A0B0D`,
  `--theater-line rgba(56,174,174,.9)` (lifted teal), chapter washes derived
  from success/primary/red families at low luminance.
- **Reduced motion contract:** `prefers-reduced-motion` renders every act as its
  settled final frame with plain scroll; all information identical.
- **Type in the theater:** Space Grotesk only, white/near-white; mono for every
  figure (the R1 signature carries into the dark).

## 7. Engineering plan

- **Architecture:** new `src/components/homepage/Story.tsx` island (or vanilla
  TS module — no React needed for the story; PREFER vanilla + GSAP to keep the
  homepage's React budget for the Decision Engine only). Story island lazy-inits
  on first scroll intent; Act 0 is pure SSR HTML/CSS (pulse = CSS keyframes).
- **Budget:** story JS ≤ 45KB gz total (GSAP core ~24KB + ScrollTrigger ~12KB +
  custom ≤ 9KB; SplitText/MorphSVG only if they fit, else custom equivalents).
  LCP unchanged (Act 0 is text). CLS = 0 (all acts absolutely positioned within
  a fixed-height stage). INP guarded: particle canvas ≤ 1k particles, rAF-driven,
  paused when offscreen, devicePixelRatio-capped at 2.
- **Fallback tiers:** A (full: canvas particles + morphs) desktop & capable
  mobile; B (no canvas: SplitText scatter + SVG draws) low-power mobile via
  `navigator.hardwareConcurrency`/`deviceMemory` heuristic; C (static frames)
  reduced-motion, no-JS, and bots.
- **SEO contract:** H1 = "What is your number?" with a visible keyworded
  sub-line; all chapter copy + tool links are crawlable DOM; the product section
  (Decision Engine, discovery, trust) remains fully present below the story;
  meta/OG unchanged. Story adds ~1 viewport-height of content weight, not less.
- **QA gates (all must pass before deploy):** existing responsive sweep 0
  findings; E2E suite green + new specs (story renders, skip link works,
  reduced-motion serves Tier C, chapter links navigate); Lighthouse mobile
  perf ≥ 85 on homepage; axe clean in the dark theater (contrast on obsidian).
- **Analytics:** scroll-depth events per act (reuses GA4 taxonomy) so the story
  earns its keep measurably (do visitors who see "Keep It" click salary tools?).

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Task-driven visitors bounce off the movie | Persistent skip affordance + header nav from frame 0; story ≤ 5 viewports; GA4 act-depth data reviewed after launch |
| Perf regression undoes R1's wins | Hard budget, tiered fallbacks, story island lazy-init, all QA gates |
| Scrollytelling reads as gimmick if half-done | Prototype gate: R2.1 ships ONLY after owner approves a working motion prototype; no half-state deploys |
| Mobile jank | Tier B default on low-power devices; scrub distances shortened on touch; test on real Android via Playwright traces |
| SEO loss from a "dark poster" homepage | SEO contract above; content is additive |
| Maintenance complexity | Motion code isolated to /story module + one calculator pattern; documented in CLAUDE.md standards after ship |

## 9. Phasing

- **R2.0 — Motion prototype (1 session):** the homepage story built as a
  standalone prototype page (`/labs/story`, noindex): Acts 0–5 with Tier B
  visuals (no particles yet), real copy, real figures. **Owner reviews in the
  browser** — this is the go/no-go gate before any production work.
- **R2.1 — Homepage story to production:** particle Act 1 (Tier A), dawn
  handoff, GA4 act events, QA gates, deploy.
- **R2.2 — Functional Luxury on Compound Interest + Salary UK:** pinned answer
  bar, chart draw-in, staged breakdown/schedule. Owner review → propagate the
  pattern to the remaining financial calculators.
- **R2.3 — Interior storytelling touches:** scenario pages get the masked
  answer-reveal treatment (the answer card draws its number on entry); category
  index pages get chapter-colored headers echoing the story.
- **R2.4 — Polish:** micro-interactions (slider physics, tab crossfades),
  seasonal theater variants (optional), motion documentation into CLAUDE.md.

## 10. Decisions for the owner

1. **Dawn Handoff vs Full Dark Identity** — recommendation: Dawn Handoff (§3).
2. **Chapter set** — "Grow it / Keep it / Owe it" (recommended) or Gemini's
   two-chapter "Grow It / Pay It"?
3. **Opening line** — "What is your number?" (recommended, Gemini's) vs keeping
   "Run your numbers" as the opener and using the question as Act 0's sub-line.
4. **Prototype-first agreement** — R2.0 ships to /labs/story for your browser
   review before anything touches the real homepage. Confirm.
5. **Calculator staging** — confirm the guardrail (answer always visible; the
   theater stages only the supporting acts), since it deliberately softens
   Gemini's "phases replace each other" spec.

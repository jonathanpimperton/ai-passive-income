## HOME-CHROME final report

findings.md could not be written: the harness refused it ("Subagents should return findings as text"). The full findings are therefore in Part 2 below. The evidence files are saved:
- Folder: `R = C:/Users/jonat/AppData/Local/Temp/claude/f2336fd9991ff83c/88554c8e-142d-4171-9da1-e20cf3b3797a/scratchpad/review/HOME-CHROME`
- Screenshots: `R/shots/HOME-CHROME-nn-*.png`
- Raw data: `R/*.json` (hp-first, hp-return, hp-modes, nav, nav2, nav3, consent, theme, bottom, indexes, misc, slow, xb)
- Scripts: `R/*.mjs`

I made 0 live page loads, the preview server was up throughout, and GA was blocked in every context.

## Part 1: Summary

**1. Counts:** S1 0, S2 5, S3 9, S4 4 (18 findings).

**2. S1/S2 findings**
- **HOME-CHROME-01 (S2, Verified): the intro gates the homepage.** The cinematic intro puts 7.6-8.0 screen-heights between the homepage and the first input: 9 swipes on phones, 43-72 wheel notches on desktop. There is no menu or search during it, only the logo and a 37px-tall Skip pill. It also plays in full when someone clicks the logo or Home from a tool page, and on every launch of the installed PWA.
- **HOME-CHROME-02 (S2, Verified): desktop snapping hijacks the scroll.**
  - A 40px trackpad nudge auto-scrolls the page to 1,417px.
  - 300px of gentle reading from the "Owe" chapter carries you to the end of the track.
  - 100px upward from 90% yanks you back 900px.
- **HOME-CHROME-04 (S2, Verified): Scenarios and Comparisons are unreachable from desktop navigation on common laptops.** The mega menu is 1,051px tall inside a sticky header. At 1280x800, Scenarios, Comparisons and "View all" are off-screen and can't be reached. The footer has no links to scenarios, comparisons or methodology either.
- **HOME-CHROME-05 (S2, Verified): search is desktop-only and too literal.**
  - There is no search at 1023px wide or below.
  - It matches tool names only: "take home pay", "compress pdf", PAYE, 401k, ISA, CGT and "scenarios" all return "No tools found". Enter and the arrow keys do nothing.
  - On phones the menu is 52 links and 4-4.6 screens tall; PDF Compress is the 44th item.
- **HOME-CHROME-06 (S2; behaviour Verified, legal reading Likely): the consent setup doesn't match what the site says.**
  - GA sends a "granted" page view and sets 400-day `_ga` cookies before the visitor makes any choice.
  - Decline keeps sending cookieless pings and leaves the cookies in place.
  - Once the banner is answered there is no way to change the choice.
  - The banner says "no tracking". The privacy page is dated Feb 2026 and misdescribes this behaviour.
  - The UK statistics exemption under the Data (Use and Access) Act 2025 (in force 5 Feb 2026; ICO final guidance 29 Apr 2026) needs an objection route available "at any time", accurate information, and the provider acting only as processor. The site currently misses these.
  - For EU visitors (the site offers EUR) this setup is non-compliant.
  - Escalate to S1 if legal exposure is weighted strictly.

**3. Top strengths (Verified)**
- **Dark mode:** no flash of the wrong theme on any of the 17 page types tested, and no white patches.
- **Bottom of the screen:** the cookie banner, back-to-calculator button and scroll email bar never collide. The email bar waits until the cookie choice is made.
- **Intro safety valves work in Chromium, WebKit and Firefox:** Skip gets you to a usable calculator in 0.74-0.88s, and reduced-motion, no-JS, replay and the #daylight deep link all behave. The theater figures come from the real engines and their HTML can be crawled.

**4. Coverage gaps**
- Real back/forward-cache behaviour couldn't be measured because Playwright disables it.
- No real iOS or Android devices; touch was simulated.
- No live page loads.
- GA admin settings and real GA data weren't visible, so the intro's reach and skip rates are unknown.
- Region fit was checked on 3 tool pages only.
- The dark-mode scan ran at 390px only.
- I did not run axe on the homepage (A11Y-PERF owns that).

**5. Findings file:** not written (blocked). The content is in Part 2.

## Part 2: Findings

### HOME-CHROME-01: the intro gates the homepage and fires on internal Home clicks
- **Rating:** S2 / Verified / Med reach / NEW.
- **Measurements** (`R/hp-first.json`):

  | Viewport | First input at | Without Skip | Skip to usable | Input position after Skip |
  |---|---|---|---|---|
  | 375x667 | 5,304px | 9 swipes | 0.82s | 609 of 667px |
  | 1280x800 | 6,199px | 55 notches | 0.84s | 573 of 800px |
  | 1280x600 | 4,785px | 43 notches | 0.75s | 559 of 600px |
  | 1920x1080 | 8,179px | 72 notches | 0.74s | 593 of 1080px |

  The hamburger, search and theme toggle exist only in the section below the theater (`hamburgerVisibleInViewport:false`).
- **Internal and repeat triggers:**
  - Clicking the logo from salary-uk in a fresh session plays the full intro (`R/logo.mjs`).
  - It also replays in a new tab or after Ctrl+click on the logo.
  - The PWA has `start_url "/"`, so every launch replays it.
  - About 1.5 screens of the "dawn" are near-empty. At 86% the "Run your numbers" text is almost invisible.
- **Slow 4G** (390 viewport, 4x CPU): about 6.7s to a usable calculator using Skip.
- **Evidence:** `R/shots/HOME-CHROME-01-first-paint-390x844.png`, `02-after-skip-*.png`, `04-a4-dawn-1280x800.png`; src/pages/index.astro lines 197-199, 652 and 208-219.
- **Fix:** see Opinion. At minimum, skip the intro for same-origin referrers, for `display-mode: standalone`, and remember "seen" for 30 days in localStorage. Put search and the menu in the story header.

### HOME-CHROME-02: chapter snapping hijacks the trackpad
- **Rating:** S2 / Verified / Med reach / NEW.
- **Behaviour** (`R/hp-modes.json` "snap"):
  - Nudge of 40px: positions 40, 60, 470, 1283, 1417.
  - From Owe (3,221px) plus 300px: ends at 4,800.
  - From 90% minus 100px: ends at 2,319.
- **Cause:** GSAP directional snap with a 0.15s delay, index.astro lines 1483-1497.
- **Fix:** remove the snap, or make it non-directional and only correct small offsets. Never snap across the dawn.

### HOME-CHROME-03: reload or Back lands mid-page, or in the footer on WebKit
- **Rating:** S3 / Verified without bfcache / Med reach / NEW.
- **Behaviour** (`R/hp-return.json`):
  - Mid-intro, click a figure, then Back: the theater collapses (document 10,336px becomes 4,786px), the old scrollY of 2,304 is kept, and you land on the bento.
  - WebKit, Skip then a CTA then Back: lands at y=4,016, the footer.
  - Reload mid-intro: lands mid-page.
- **Evidence:** `R/shots/HOME-CHROME-11-chromium-nobfcache-A-after-back.png`, `12-webkit-B-after-back.png`.
- **Fix:** keep the theater on `back_forward` and `reload` navigation types, or reset scroll restoration and jump to #daylight.

### HOME-CHROME-04: content hubs unreachable from global navigation on laptops
- **Rating:** S2 / Verified / High reach / NEW.
- **Behaviour** (`R/nav2.json`, `R/shots/HOME-CHROME-53-megamenu-height-1280x800.png`):
  - The panel spans y=66-1117px at every desktop size.
  - Off-screen links: 6 at 1280x800 (including Scenarios, Comparisons, "View all 44+ tools"), 3 at 1440x900, 10 at 1280x600.
  - Wheel scrolling doesn't move the panel because the header is sticky.
  - The footer (Footer.astro lines 8-15 and 63-73) has no links to /scenarios/, /comparisons/, /how-we-calculate/ or /author/.
- **Cause:** Navigation.astro lines 95-96 (`grid-cols-3` with 5 children wraps to 2 rows).
- **Fix:** add a top-level "Guides" nav item, cap the panel at `max-height: calc(100vh - 80px)` with internal scroll or a 1-row layout, and add a Guides column to the footer.

### HOME-CHROME-05: search is desktop-only and name-substring-only
- **Rating:** S2 / Verified / High reach / NEW.
- **Desktop search** (`R/nav.json`):
  - Works: "stamp duty", "heic", "take-home", "pdf compress".
  - Fails: "take home pay", "take home", "compress pdf", "paye", "401k", "isa", "cgt", "iphone photo", "scenarios".
  - Enter and ArrowDown do nothing.
  - Only tool names are indexed (Navigation.astro lines 651-685).
  - It is hidden at 1023px and below (inside `hidden lg:flex`, line 66).
- **Mobile menu:**
  - 52 links, 3,435px tall, no search field.
  - Stamp Duty is item 23 (696px of menu scroll), HEIC item 38 (1,716px), PDF Compress item 44 (2,064px).
  - US Salary is listed before UK Salary.
- **/tools/ on mobile:** 9.6 screens, no filter. Stamp duty and CGT sit under "Economic".
- **Interactions from a tool page:**
  - Desktop: 3, but search fails for "take home pay" and "compress pdf".
  - Phone: 3 plus 1-2.5 screens of menu scroll.
  - From a first homepage visit, add Skip.
- **Fix:** one search box at every width, indexing names, slugs, descriptions, synonyms, scenarios, hubs and comparisons, with Enter and arrow-key support.

### HOME-CHROME-06: consent behaviour vs what the banner and privacy page say
- **Rating:** S2 / Verified behaviour, Likely legal reading / High reach / NEW.
- **Method:** I served a local copy of gtag.js so the library would run. Every collect hit was swallowed in the page and also aborted by the harness (`R/dl-gtag/`, `R/consent.json`).
- **No choice yet:** at t=604ms a page_view goes out with `gcs=G101` (analytics granted) and a persistent client ID. `_ga` and `_ga_K0ZB3P48QG` cookies are set, expiring 2027-12-14.
- **After Decline:** hits change to G100 with a random client ID, but are still sent on every page and event. The existing `_ga` cookies are not removed.
- **After answering:** no way to reopen the choice (`reopenControl: []`).
- **Copy:**
  - Banner: "no tracking" (CookieBanner.astro line 28).
  - Privacy page:
    - "We do not track individual users" and "we just won't have analytics data for your visit" (privacy.astro lines 16-24).
    - "Last updated: February 2026" (line 71).
    - No mention of MailerSend, Turnstile, retention, lawful basis or the right to complain to the ICO.
- **Legal reading** (accessed 9 Nov 2026):
  - DUAA statistical exception commenced 5 Feb 2026; PECR maximum fine is now £17.5m or 4% of turnover (policypros.co.uk/cookie-consent-changes-duaa-guide/).
  - ICO final guidance published 29 Apr 2026 (hunton.com blog; osborneclarke marketinglaw).
  - The ICO "What are the exceptions?" page (ico.org.uk/.../guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) requires:
    - the provider acts as your processor and uses the data only to improve your service;
    - clear and comprehensive information;
    - a simple means of objecting, with toggles the user can "change ... to off at any time";
    - that on objection you "stop storing or accessing information on their device".
  - EU ePrivacy Article 5(3) has no analytics exemption.
  - Google's data-sharing configuration couldn't be seen from outside, so that part is a Hypothesis.
- **Fix:**
  1. Add a persistent "Cookie settings" link.
  2. On Decline, delete `_ga*` cookies and stop sending hits.
  3. Make the banner and privacy text accurate.
  4. Confirm GA data-sharing settings and Google's processor terms.
  5. Consider consent-first for EEA visitors.

### HOME-CHROME-07 (S3, Verified): keyboard focus lands on invisible controls on the homepage
- "Skip to main content" targets the top of the theater, so it does nothing.
- At 390px, Tab 4 focuses the nav logo while it is off-screen.
- Tabs 14-22 land on 15 controls inside collapsed accordion panels at opacity 0 (DecisionEngine.tsx line 624, `max-h-0 opacity-0`).
- At 1280px, decision rows get focus before their reveal animation, at opacity 0-0.61.
- **Fix:** make collapsed panels `inert`, point the skip link at #daylight-title, and trigger reveals on focusin.

### HOME-CHROME-08 (S3, Verified): mega menu keyboard and Escape handling (`R/nav3.json`)
- Enter opens the menu but focus stays on the button.
- Escape on the button doesn't close it; the listener is on the panel only (line 766), and `aria-expanded` stays true.
- A hover-opened menu can't be dismissed with Escape (WCAG 1.4.13).
- The search button has no `aria-expanded`.
- **Fix:** put the Escape handler on the container, move focus via rAF, and suppress hover after Escape.

### HOME-CHROME-09 (S3, Verified): closing the mobile menu scrolls the page up about 430px
- Seen on salary-uk, /comparisons/ and /tools/ at 390px; about 70px on WebKit.
- **Cause:** `menuBtn.focus()` without `preventScroll`. Patching it fixes the jump (`R/nav5.mjs`).
- The dialog also lacks `aria-modal` and doesn't make the background inert.

### HOME-CHROME-10 (S3, Verified): UK visitors are steered to US tools and US-only partners
- salary-uk's first related tool is US Salary (salary-uk.md line 19).
- stamp-duty (SDLT) shows LendingTree twice, inline and as the next step, to a GBP visitor (`R/misc.json`, `R/shots/HOME-CHROME-90-*.png`).
  - LendingTree is listed in stamp-duty.md lines 22-23.
  - The `usOnly` filter reads a null currency store and falls back to USD.
- The homepage Comparisons list features none of the 6 UK comparisons but includes Roth 401(k) (index.astro lines 153-159).
- The homepage engine's take-home tab defaults to US (DecisionEngine.tsx line 474).
- /comparisons/ isn't grouped or labelled by region.
- This is separate from the already-logged USD default.

### HOME-CHROME-11 (S3, Verified/Likely): no return-visit hooks, stale PWA manifest
- Only consent, theme, currency, email-bar and intro flags are stored. There are no recents, remembered inputs or favourites.
- The PWA is installable (no CDP errors), but:
  - start_url "/" lands on the intro;
  - the name still says "Free Financial Calculators";
  - theme_color #0E8585 doesn't match the page's #0B6E6E;
  - there is no maskable icon, no `id`, no shortcuts and no service worker.

### HOME-CHROME-12 (S3, Verified): no H1 for returning visitors; no-JS shows two engines
- In returning mode the accessibility tree starts at H2, because the only H1 sits inside the hidden track.
- With JS off:
  - the H1 is hidden;
  - the skeleton shows perpetual shimmer and the server-rendered engine (18 inputs) appears below it, so there are two engines (`R/shots/HOME-CHROME-23-nojs-top-1280x800.png`);
  - the hamburger does nothing.

### HOME-CHROME-13 (S3, Verified): the 404 design is a dead end
- Local /404.html and the real 404 at /tools/debt-and-loans/ offer only Home and Browse Tools: no search, no popular tools, no suggestion based on the URL.
- Category crumbs are `/tools/#category` anchors because no category pages exist.
- The breadcrumb says "Calculators" even for file and utility tools.
- The live blank-404 is already logged; this is about the page design.

### HOME-CHROME-14 (S3, Verified): rotating mid-intro jumps past the track
- At 390px in the Keep chapter (y=2,431), rotating to 844x390 lands past the shorter track on a blank "Run your numbers" frame (`R/shots/HOME-CHROME-28-*.png`). Rotating back lands at a different offset.
- Desktop resize mid-pin survived.
- **Fix:** restore timeline progress on ScrollTrigger refresh.

### HOME-CHROME-15 (S3, Likely): brand and positioning
- The H1 "Get clarity on your financial decisions" has no noun saying what the site is.
- The theater alternates UK and US figures row by row, so neither audience sees "this is for me".
- 23 of 46 tools are utility or file tools with equal billing, and the footer's "More Tools" puts QR and Password next to Stamp Duty.
- **Fix:** an H1 with nouns, a UK/US switch in the hero, and file/dev tools moved to a secondary "Other tools" group.

### HOME-CHROME-16 (S4, Verified): stale or inconsistent counts
- Nav says "View all 44+ tools"; /tools/ meta says "44"; the homepage says "46"; "Browse 100+ instant answers" vs 45 scenario pages; the manifest still says "Free".
- The comparisons index truncates titles at ":" (comparisons/index.astro line 34), so "Emergency Fund: Savings Account vs Money Market" becomes "Emergency Fund".

### HOME-CHROME-17 (S4, Verified, NEVER-FIXED): banned design patterns still in shared chrome
- Gradient dividers: RelatedTools line 18, ScenarioLinks line 36, the mega menu at line 193.
- Icon chips on every comparison card, privacy section and the 404 page.
- "Related Calculators" heading on file-tool pages.
- "Economic" as the category for tax tools.
- The file-tools progressive disclosure that CLAUDE.md claims is gone.

### HOME-CHROME-18 (S4, Verified): theme edge cases
- The page doesn't follow an OS theme change made after load.
- There's no way back to "system" after one toggle.
- With storage blocked, the head script throws an uncaught SecurityError, so dark-OS users get light (BaseLayout line 57, ThemeToggle line 47).
- The toggle has no `aria-pressed`.

## Opinion on the intro

**Net negative for this site.**

- **Who sees it.** Search traffic lands on tool and hub pages and never sees it. The intro's real audience is:
  - direct/brand visitors;
  - internal Home clicks, whose intent is finding the next tool;
  - new tabs and PWA launches.
- **What it costs, measured:** about 8 screens before any input, no navigation during it, scroll-jacking on desktop, mid-page landings after reload or Back, a blank frame on rotation, invisible focus stops, and no H1 for returning visitors.
- **Credit where due:** it is well crafted, works across all three engines, uses real figures, and its fallbacks work.

**By entry type:**

| Entry type | Effect |
|---|---|
| Internal Home click | Clearly negative |
| Returning visitor (new tab, PWA, new session) | Negative |
| Brand-search arrival on / | Negative to neutral |
| First-time launch/social referral | Mildly positive for brand, but mobile bounce risk |

**What to do instead:**
1. Make the first viewport useful: an H1 with nouns, a UK/US switch, search over tools, hubs and comparisons, 6 task buttons, and the region-default engine directly below.
2. Keep the morphing line as a compact, time-based hero, or behind "Watch (40s)", with no snap.
3. Never play it for same-origin referrers or standalone mode; use a 30-day localStorage flag.
4. Add a "Recent tools" strip for returning visitors.
5. Before deciding, check the existing GA4 events: story_chapter (especially the "daylight" reach rate) and story_skip.

**Journey rubric** (homepage entry, UK phone user wanting take-home pay; 0-3 scale):

| Criterion | Score |
|---|---|
| Intent match | 0 |
| Time-to-own-number (4 interactions, about 6.7s via Skip) | 1 |
| Trust | 2 |
| Continuity | 2 |
| Friction | 1 |

## Out-of-lane observations
- **A11Y-PERF:** WebKit reports all 3 preloaded fonts as "preloaded but not used", and Space Grotesk renders light.
- **GROWTH-SEO:** the BreadcrumbList category item is a `/tools/#fragment` URL.
- **CALC-UX-A:** on stamp-duty, typing a trailing "0" into the first input showed SDLT £0.
- **EDGE:** `?embed` follows the visitor's OS theme, not the host page.
- **Harness:** `liveHeaders` `route.fetch` throws an unhandled ECONNRESET on cancelled prefetches. I added a guard in `R/lib.mjs`.

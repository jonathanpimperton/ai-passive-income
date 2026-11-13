# Search engines: Bing Webmaster Tools, IndexNow and sitemaps

Owner steps (plan item O-5) and the tooling behind them. Written 12 Nov 2026.

## What the site already does

- `https://www.calcrun.com/sitemap-index.xml` lists every indexable page. Each URL has an
  honest `<lastmod>`: content `dateModified`, tool `lastUpdated` and markdown/calculator
  commit dates, or the template's git date. The build time is never used
  (`src/lib/sitemap-lastmod.mjs`). The index file's own `<lastmod>` is the newest URL date.
- `robots.txt` allows everything and points at the sitemap index.
- An IndexNow key file is served at `https://www.calcrun.com/<key>.txt` (the key is the
  32-character hex name of the `.txt` file in `public/` other than `robots.txt`). IndexNow keys
  are public by design; the file proves the submitter controls the host.

## 1. Bing Webmaster Tools (once, owner)

Bing feeds Copilot and ChatGPT search, so this is the cheapest non-Google exposure.

1. Sign in at https://www.bing.com/webmasters with a Microsoft account.
2. Choose **Import** ("Import your sites from GSC") on the My Sites / Add a site screen.
3. Sign in with the Google account that owns the `www.calcrun.com` Search Console property and
   approve read access. Bing reads the list of verified sites and their sitemaps only; it gets
   no Search Console performance data.
4. Select `https://www.calcrun.com/` and confirm. The sitemap comes across with the import.
5. Bing re-checks ownership through the Google connection. If that access is ever revoked,
   re-verify with a meta tag or DNS record (a meta tag would go in `BaseLayout.astro`).
6. In Bing Webmaster Tools, open Sitemaps and confirm `sitemap-index.xml` shows as processed.

Source: Bing Webmaster blog, "Import sites from Search Console to Bing Webmaster Tools"
(https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools).

## 2. IndexNow (after a deploy that changed pages)

`scripts/indexnow-submit.mjs` diffs the built sitemap against the sitemap the `--since` commit
would have produced (rebuilt from that commit's tree with the same lastmod rules). It submits URLs
that are new, whose `<lastmod>` moved, or that left the sitemap, plus any URL newly redirected in
`public/_redirects`. It is a **dry run unless `--send` is passed**, and needs a full (not
shallow) clone.

```bash
npm run build
node scripts/indexnow-submit.mjs --since <last-deployed-sha>          # dry run: prints the list
node scripts/indexnow-submit.mjs --since <last-deployed-sha> --send   # submits
```

- Only URLs whose `<lastmod>` moved (or that are new, gone or newly redirected) are selected.
  Editorial pages (scenarios, comparisons, hubs) move only when their `dateModified` /
  `DATE_MODIFIED` is bumped, so a title or template-only change is not picked up: bump the
  date when the change is significant, or pass `--all` (every sitemap URL) deliberately.
- Git-dated lastmods (tools, methodology and template pages) move on any commit to their
  source file, including trivial ones; review the dry-run list before sending.
- Run `--send` only after the deploy is live: the script first checks that the key file is
  served at `https://www.calcrun.com/<key>.txt`, because the engines fetch it to verify.
- The default endpoint `https://api.indexnow.org/indexnow` shares submissions with the
  participating engines (Bing, Yandex, Seznam, Naver and others). Google does not use IndexNow.
- HTTP 200 or 202 means received (202 = key validation pending). 403 means the key file was not
  found or did not match; 422 means a URL is not on the host; 429 means too many requests.
- Submit only real changes. Repeatedly submitting unchanged URLs can be flagged as spam (429).
- For the November 2026 plan this is run once, by the orchestrator, after the final deploy
  (plan Section 10, D4), with `--since` set to the last commit deployed before the plan.

## 3. Google Search Console (owner)

- URL Inspection on `/`, then "View tested page" and the screenshot, to confirm the homepage
  renders its content to Googlebot.
- Request indexing for the hub pages and any page whose content changed.
- Sitemaps: resubmit `sitemap-index.xml` after large content changes.

## Do not

- Add hreflang between UK and US pages: they are different products, not translations.
- Add rating or review markup without real, visible ratings.
- Expect FAQ rich results (Google stopped showing them on 7 May 2026); FAQ markup stays only
  because the questions are on the page.

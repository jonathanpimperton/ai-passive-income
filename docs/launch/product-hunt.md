# Product Hunt Launch Plan

## Listing Details

**Name:** CalcRun
**Tagline (60 chars):** Free financial calculators — no signup, no ads, instant results

**Topics:** Productivity, Finance, Developer Tools

**Website:** https://www.calcrun.com

---

## Description (~300 words)

CalcRun is a collection of 37+ free financial calculators and tools that give you instant, accurate results without requiring signup, showing ads, or harvesting your data.

**What makes CalcRun different:**

- **Real-time results** — no "Submit" button. Every number updates as you type or drag a slider. Compound interest, mortgage payments, salary breakdowns — all calculated live.
- **Interactive charts** — every financial calculator includes area charts, pie charts, or bar charts powered by Recharts so you can *see* how your money grows, not just read a number.
- **"Solve for X" mode** — on investment and retirement calculators, choose which variable to solve for. Want to know how much to contribute? What return rate you need? How long it'll take? Just pick the tab.
- **Email your results** — get a branded summary of your inputs and results emailed directly to you with one click. No account needed.
- **PDF export** — export any calculator's results as a professionally formatted PDF with your charts and tables included.
- **100% client-side** — file converters (image compression, PDF merge/split, CSV↔JSON, and more) process everything in your browser. Your files never leave your device.

Built with Astro + React islands for zero-JS pages by default, hosted on Cloudflare Pages for global CDN performance. Every page scores 95+ on Lighthouse.

**Who it's for:** Anyone making financial decisions — budgeting, planning for retirement, comparing mortgage options, figuring out take-home pay, or running debt payoff scenarios. Plus utility tools (QR codes, password generator) and file converters for everyday productivity.

---

## Maker's First Comment (~200 words)

Hey Product Hunt! 👋

I built CalcRun because I was frustrated with existing calculator sites. They're either plastered with ads, require signups, or give you a single number with no context.

CalcRun takes a different approach:
- Everything updates in real-time as you adjust inputs
- Interactive charts help you actually understand the numbers
- Collapsible year-by-year tables let you see every dollar
- Pre-calculated scenario pages explain common financial questions in plain English
- Zero tracking, zero ads, zero signup walls

The entire site is built with Astro and React islands, hosted for free on Cloudflare Pages. Pages load fast because they ship zero JavaScript by default — React only hydrates for the calculator components.

Some things I'm particularly proud of:
- The "Solve for X" tabs on investment calculators (pick which variable to calculate)
- The debt snowball vs. avalanche comparison
- The UK salary calculator that parses HMRC tax codes
- Client-side file converters that never upload your files

I'd love your feedback — especially on which calculators or tools you'd like to see next. Thanks for checking it out!

---

## Screenshot Checklist

1. Homepage hero with animated gradient
2. Compound interest calculator with chart
3. Mortgage payment calculator with amortization table
4. PDF export example
5. Mobile view of a calculator
6. Scenarios page showing pre-calculated examples

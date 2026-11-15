# CalcRun comparison articles: content review (sub-reviewer: comparisons)

Scope: all 16 files in `src/data/comparisons/*.md`, rendered by `src/pages/comparisons/[comparison].astro`. Review date 9 Nov 2026. All 16 have `dateModified: 2026-07-07` and render "Updated 7 July 2026" in the byline.
Method: I read every file in full. I re-ran every worked number in an independent script (`calc/checks.js` in this folder). I fetched each sources[] URL once via WebFetch, and checked rules against primary sources (GOV.UK/HMRC Budget 2026 papers, IRS, Federal Reserve, Bank of England, Freddie Mac, FHFA, SEC, legislation.gov.uk). I did not load the live site. Repo paths below are relative to `C:/Users/jonat/projects/0. Archive - completed projects in use/CalcRun/`. Preview pages are at `http://127.0.0.1:4399/comparisons/<slug>/`.

## Headline

- **S1: 0. S2: 8. S3: 25. S4: 41.**
- **The UK Autumn Budget (28 Oct 2026) changed two things the UK articles state:**
  - It reversed the planned cut of the Cash ISA limit to £12,000. Three articles still say the cut is coming.
  - It cut the Lifetime ISA (LISA) withdrawal charge to 20% for first-time buyers purchasing above the £450k cap. It also announced that the First Time Buyer ISA replaces the LISA for new savers from 6 Apr 2029, and that savings-income tax rates go to 24/44/49% from 6 Apr 2027.
- **Interest rates have moved the other way from what the articles say.**
  - Both central banks are now hiking: BoE to 4.00% on 5 Nov 2026, Fed to 3.75–4.00% on 16 Sep 2026.
  - The US 30-year mortgage averaged 7.18% on 5 Nov 2026.
  - Articles still say "rates expected to hold / cuts coming" and "mortgage rates stabilised at 5.5–6.5%".
- **Four articles contain a worked-number or logic error that reverses or materially overstates their own conclusion:**
  - 15 vs 30: the "15-year often comes out ahead" claim.
  - Rent vs buy: the 5-year break-even.
  - Index vs active: the fee-drag figures.
  - Pay-off-debt: the "$205k" cost of delaying investment.
- **The arithmetic itself is a strength in 5 articles** (PCP, snowball, pay-off-debt three-rate example, Roth vs Traditional effective-rate section, pension vs ISA). Those numbers reproduce exactly.
- **No calculator handoff carries context.** The calculators do not parse URL inputs at all; the only `URLSearchParams` use is the `embed` flag in `src/layouts/BaseLayout.astro:99`. Only PCP's numbers happen to match the linked calculator's defaults (`src/components/tools/CarFinanceCalc.tsx:37-46`). Other mismatches:
  - The rent-vs-buy article uses $400k, 10% down, 6%, $2,200 rent. `RentVsBuyCalc.tsx` defaults to $350k, 20%, 6.5%, $1,800.
  - The 15-vs-30 article uses $300k at 6%. `MortgagePaymentCalc.tsx` defaults to $350k, 20%, 7.0%.
- **Rendering bug.** `emergency-fund-savings-vs-money-market` renders its comparison-table headers as "Option A" / "Option B". The cause: the title parser splits on the colon before "vs" (`[comparison].astro:46-49`). Confirmed in `dist/.../index.html`.
- **Sidebar links are not topical.** The "More Comparisons" sidebar is the first 5 collection entries minus the current page (`[comparison].astro:39-42`). So every page shows nearly the same links, regardless of topic or UK/US audience.

## Per-article scorecard

Column key:
- **Verdict:** how actionable the verdict is, 0–3.
- **AIO:** exposure to a Google AI Overview, i.e. whether an AI Overview would fully answer the query, leaving no reason to click.
- **Handoff:** calculator link present / whether it carries context.
- **Slop:** 0–3, where 3 = clean.
- **Issues:** factual issues located in that article, all severities, cross-cutting CMP-33 excluded.

| slug | target query | Verdict | AIO | Handoff | Slop | Issues |
|---|---|---|---|---|---|---|
| 15-year-vs-30-year-mortgage | 15 year vs 30 year mortgage | 1 | High | yes / no context (calc defaults $350k@7% ≠ article $300k@6%) | 2 | 5 |
| cash-isa-vs-savings-account | cash ISA vs savings account / is a cash ISA worth it | 2 | High | yes / no | 2 | 5 |
| emergency-fund-savings-vs-money-market | money market vs savings for emergency fund | 2 | High | yes / no | 2 | 7 |
| fixed-vs-variable-rate-mortgage | fixed vs variable rate mortgage (UK) | 1 | High | yes / no | 2 | 4 |
| high-yield-savings-vs-cds | high yield savings vs CD | 1 | High | yes / no | 2 | 5 |
| index-funds-vs-active-funds | index funds vs active funds | 2 | High | yes / no | 2 | 7 |
| isa-vs-general-investment | ISA vs general investment account | 2 | High | yes / no | 1 | 5 |
| lisa-vs-regular-isa | LISA vs ISA / is a lifetime ISA worth it | 2 | High | yes / no | 2 | 7 |
| lump-sum-vs-dollar-cost-averaging | lump sum vs dollar cost averaging | 2 | High | yes / no | 2 | 3 |
| pay-off-debt-vs-invest | pay off debt or invest | 3 | Med | yes / no | 2 | 6 |
| pcp-vs-hp-vs-personal-loan | PCP vs HP vs personal loan | 3 | Med | yes / **implicit** (car-finance defaults = article's £25k/£2.5k/48m/7.9/8.9/5.6%) | 3 | 7 |
| pension-vs-isa-uk | pension vs ISA UK | 2 | Med | yes / no | 2 | 3 |
| renting-vs-buying-2026 | rent vs buy 2026 | 2 (rests on wrong maths) | Med | yes / no (calc defaults differ from article) | 1 | 6 |
| roth-ira-vs-roth-401k | roth ira vs roth 401k | 2 | High | yes / no | 2 | 5 |
| roth-vs-traditional-401k | roth vs traditional 401k | 1 | High | yes / no | 2 | 6 |
| snowball-vs-avalanche-debt | debt snowball vs avalanche | 1 | High | yes / no | 2 | 3 |

### Verdict notes

**Generic "it depends" verdicts:**
- 15yr:13 "Choose 15-year if you can comfortably afford it"
- fixed:12 "In a rising-rate environment, fixed wins; in a falling-rate environment, variable pays off"
- hysa:13 (and now wrong-way: see CMP-20)
- roth-trad:16 "Choose Roth if you expect higher taxes in retirement…"
- snowball:13 "Pick avalanche if you're disciplined…"

Each is exactly what an AI Overview says. The better decision rules are buried in the bodies:
- snowball:84 has a rule (under $200 difference, pick either; over $1,000, use avalanche).
- roth-trad:89-95 has the "marginal rate in, effective rate out" rule.
- 15yr:99 has the prepay-vs-rate-premium figure.

**Actionable verdicts with numbers:**
- pcp:14, which gives totals and "buying the car or buying the payment".
- pay-off:13, which gives the rate comparison plus the match exception.

**AIO exposure** is High wherever the article's value is generic pros/cons. It drops to Med only where specific worked numbers exist: PCP, pay-off-debt, pension vs ISA, rent vs buy.

### Worst AI-slop tells (file:line)

- 15yr:47 "saves you a staggering amount in interest". The mirrored "When the 15-year wins / When the 30-year wins" bullet lists (51-69) are a symmetrical pros/cons listicle.
- cash-isa:51 "## The Personal Savings Allowance changed everything"; :97 "## The bottom line".
- emergency:48 "They're more alike than different"; :89 "The peace of mind is worth any small rate difference."
- fixed:83-97 mirrored "When to choose fixed / variable" bullets; :88 "sleep better knowing your payment won't change".
- hysa:50 "The real question is whether…"; :54 "This isn't a debate."
- index:74 "The results are consistent and damning"; :105 "less than a dinner out".
- isa-gia:49 "## Why the ISA is a no-brainer"; :59 "This is a good problem to have."
- lisa:59 "Here is where the LISA gets controversial."; :79 "But there are key differences:".
- lump:60 "psychologically devastating"; :68 aphorism "The best strategy you'll actually follow beats the mathematically optimal strategy you'll abandon."
- pay-off:79 "## The exception that changes everything"; :100 "Peace of mind has real value, even if it doesn't compound."
- pcp: essentially clean. The mildest is :72 "Three routes to the same driveway".
- pension:54 "This isn't really pension *or* ISA"; :75 "do the heavy lifting".
- renting:46 "## The 2026 landscape"; :50 "The key question isn't whether buying is *ever* better…"
- roth-ira:2 title "Key Differences Explained"; :93 "## The best strategy: use both".
- roth-trad:49 "## The real question:"; :55 "## Why Roth is winning the debate" (a one-sided header the article's own :89-95 then undercuts).
- snowball:25 "High — quick dopamine hits"; :74 "Dave Ramsey's snowball method has helped millions".

### Spelling and audience consistency

**UK spelling in USD/US articles:**
- hysa:54 "penalises", :56 "holiday"
- index:61,66 "adviser", :88 "specialise"
- pay-off:57 "grey", :108 "prioritising"
- renting:33 "itemise", :48 "stabilised"
- roth-ira:101 "maximises"
- roth-trad:57 "favour"
- snowball:53,68 "favours", :74 "prioritises"

**Mixed "math" and "maths" in one article:** lump-sum (:4 "maths" vs :87 "math").

**Mixed currency in one article:**
- lump-sum: £100,000 example at :58 vs $60,000 at :80.
- pay-off-debt: $ throughout plus £20,000 ISA and UK auto-enrolment.
- fixed-vs-variable: £ maths with US ARMs and a US-only LendingTree affiliate.

**UK articles linking to a USD scenario** ("Saving a $60,000 House Deposit"): cash-isa:65 and lisa:69.

## Factual problems

### CMP-01 The Cash ISA cut to £12,000 was reversed at Budget 2026
- Severity S2 / Confidence Verified / Class AGED (true in July; reversed 28 Oct 2026)
- Where:
  - cash-isa-vs-savings-account.md:99 (http://127.0.0.1:4399/comparisons/cash-isa-vs-savings-account/)
  - isa-vs-general-investment.md:90
  - lisa-vs-regular-isa.md:108
- Claim: "from April 2027, the annual Cash ISA limit is due to drop to £12,000 for under-65s (the overall £20,000 allowance stays), so larger cash balances will take longer to shelter". The LISA article also says "if that £16,000 would sit in cash … the split changes".
- Fact: Budget 2026 §3.9 says "the government has decided not to reduce the cash ISA limit, so that it remains at £20,000". Table 6.1 item 11 reads "Cash ISAs: Maintain the cash ISA limit at £20,000 from 6 April 2027". The executive summary describes it as "reversing the planned cut to the cash Individual Savings Accounts (ISA) allowance". Source: https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html (accessed 9 Nov 2026).
  - Supersedes the HMRC policy paper of 17 Sep 2026: https://www.gov.uk/government/publications/reduction-in-the-cash-individual-savings-account-isa-limit/cash-individual-savings-account-isa-limit-reduction
  - The GOV.UK ISA page shows only the £20,000 limit.
- Fix direction: delete the £12k sentence in all three articles and state "Cash ISA limit stays £20,000 (Budget 2026)".

### CMP-02 LISA: buying a first home over £450k now costs a 20% charge, not 25%
- Severity S2 / Confidence Verified / Class AGED (changed 29 Oct 2026)
- Where: lisa-vs-regular-isa.md:75 and :103 (http://127.0.0.1:4399/comparisons/lisa-vs-regular-isa/)
- Claim (:75): "If you think your first home will cost more than £450,000, the LISA bonus becomes inaccessible for that purpose and you'd face the 25% penalty to withdraw it."
- Fact: HMRC TIIN "Lifetime ISA withdrawal charge" (published 28 Oct 2026) applies to "relevant Lifetime ISA withdrawals made on or after 29 October 2026". It "will allow affected savers to retain their own contributions while removing the government bonus"; "The 25% charge will continue to apply to other unauthorised withdrawals". Budget 2026 Table 6.1 item 39 reads "Reduce the withdrawal charge from 25% to 20%" for first-time buyers "purchasing properties above the £450,000 price cap".
  - https://www.gov.uk/government/publications/lifetime-isa-withdrawal-charge (accessed 9 Nov 2026)
  - https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html (accessed 9 Nov 2026)
- Effect: the "LISA is unsafe above £450k" logic (and the :103 "makes the bonus unreachable … regular ISA is safer" bullet) is now much weaker. Above the cap you lose the bonus and 20% of growth, not your own capital.
- Fix direction: rewrite the property-cap paragraph and bullet for the 20% above-cap charge, keeping 25% for other unauthorised withdrawals.

### CMP-03 Fixed vs variable: "rates holding or falling" is stale; both central banks are hiking
- Severity S2 / Confidence Verified / Class AGED
- Where: fixed-vs-variable-rate-mortgage.md:65-71 (http://127.0.0.1:4399/comparisons/fixed-vs-variable-rate-mortgage/)
- Claim: "As of mid-2026, the Bank of England base rate sits at 3.75% and the US Federal Funds rate at 3.50-3.75%. Markets expect rates to hold near current levels through 2026, with any further cuts coming slowly. If cuts do materialise, variable-rate borrowers benefit automatically."
- Fact:
  - The BoE MPC raised Bank Rate 0.25pp to 4% by 8–1 on 5 Nov 2026, saying "inflationary pressure in the pipeline is now sufficient to warrant an increase". https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/november-2026 (accessed 9 Nov 2026)
  - The FOMC raised the target range to 3-3/4–4% on 16 Sep 2026 and held on 28 Oct 2026, with 2 dissents for a further hike. https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm and https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm (accessed 9 Nov 2026)
- Effect: a reader choosing a tracker today is told the risk runs the other way.
- Fix direction: replace the dated "rate environment" section with a date-stamped line generated from a single rates constant, or drop absolute levels.

### CMP-04 Rent vs buy: US mortgage rates quoted at 5.5–6.5%; they are ~7.2%
- Severity S2 / Confidence Verified / Class AGED
- Where: renting-vs-buying-2026.md:48; the example rate is at :54 (http://127.0.0.1:4399/comparisons/renting-vs-buying-2026/)
- Claim: "Mortgage rates have stabilised in the 5.5–6.5% range after the highs of 2023-24." The worked example uses 6%.
- Fact: Freddie Mac PMMS, 5 Nov 2026: 30-yr FRM 7.18%, 15-yr 6.57%. https://www.freddiemac.com/pmms (accessed 9 Nov 2026)
  - At 7.18% the article's $360k loan costs $2,439 P&I versus the $2,158 shown, which is +$281/month.
- Fix direction: date-stamp the rate, or pull it from one constant, and re-run the example.

### CMP-05 Rent vs buy: the 5-year "buying is ahead by $29,400" leaves out the article's own $1,025/month cost gap
- Severity S2 / Confidence Verified (the omission) / Likely (the sign reverses)
- Class WRONG
- Where: renting-vs-buying-2026.md:69-71. It underpins the verdict at :14 ("Buying wins if you stay 5+ years").
- Claim: "Minus 6% selling costs ($29,200), closing costs paid ($12,000), and the investment alternative ($16,100 opportunity cost), buying is ahead by roughly $29,400 at the 5-year mark."
- Fact: arithmetic on the article's own inputs:
  - The inputs: $400k home, 10% down, 6%, $3,225/month all-in vs $2,200 rent (:54-63), 4% appreciation, 7% return.
  - The owner's net equity after a year-5 sale is about $122.5k (home $486.7k − 6% costs − $335.0k loan balance).
  - The renter, investing the $52k up-front plus the $1,025/month difference, holds about $147.1k.
  - So the renter is ahead by about $24.6k. My recomputation is in `calc/checks.js`; it assumes no rent growth and no itemised-deduction benefit.
  - The article's figure counts appreciation but neither the carrying-cost gap nor principal paydown.
- Fix direction: redo the break-even as a full two-path wealth comparison, or hand off to the rent-vs-buy tool with these inputs pre-set.

### CMP-06 15 vs 30: "the 15-year borrower often comes out ahead even accounting for investment returns"
- Severity S2 / Confidence Verified (maths) / Class WRONG
- Where: 15-year-vs-30-year-mortgage.md:87-91 (http://127.0.0.1:4399/comparisons/15-year-vs-30-year-mortgage/)
- Claim: "When you run the full 30-year comparison, the 15-year borrower often comes out ahead even accounting for investment returns — because they have 15 years of investing with no mortgage."
- Fact: under the article's own assumptions (equal $2,532/month outlay for 30 years, 8% return):
  - At 6%/6%: the 15-year borrower ends with $876k invested. The 30-year borrower investing $733/month for 30 years ends with $1,092k, which is **$216k more**.
  - With the 15-year at 5.5%: $848k vs $973k.
  - Whenever the expected return exceeds the mortgage rate, the longer loan plus investing wins on paper. The 15-year wins on risk, not on expected wealth.
- Fix direction: correct the conclusion. Frame the 15-year as the risk-free/behavioural choice and the 30-year-plus-investing as higher expected wealth.

### CMP-07 Roth 401(k): early withdrawals are not penalty-free on leaving the employer or with a hardship distribution
- Severity S2 / Confidence Verified (rule) / Class WRONG
- Where: roth-ira-vs-roth-401k.md:89; table :32-34 (http://127.0.0.1:4399/comparisons/roth-ira-vs-roth-401k/)
- Claim: "You generally cannot withdraw *any* money — contributions or earnings — before 59½ without penalty, unless you leave the employer or qualify for a hardship distribution."
- Fact:
  - The IRS exceptions table for the 10% additional tax lists no hardship exception.
  - The separation-from-service exception applies only if "the employee separates from service during or after the year the employee reaches age 55".
  - Non-qualified Roth 401(k) distributions are pro-rata; the 10% tax and income tax apply to the earnings share.
  - https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-tax-on-early-distributions (accessed 9 Nov 2026)
- Fix direction: say that leaving the employer or a hardship gives *access*, not *penalty relief* (rule of 55 aside). Note the pro-rata treatment of earnings.

### CMP-08 Roth vs Traditional: "$32,500 if 50+" in a Traditional 401(k) ignores the 2026 Roth catch-up mandate
- Severity S2 / Confidence Verified / Class WRONG (incomplete; the rule took effect 1 Jan 2026, before the July edit)
- Where: roth-vs-traditional-401k.md:30-32. It conflicts with :68 ("32% bracket or higher … Traditional is better"), whose readers almost all earn over $150k. Also roth-ira-vs-roth-401k.md:17-19.
- Claim: Traditional "2026 contribution limit: $24,500 ($32,500 if 50+)".
- Fact: from 2026, participants whose prior-year (2025) FICA wages exceeded $150,000 "must make catch-up contributions on a Roth basis". So a high earner's Traditional maximum is $24,500; the extra $8,000 must go to Roth. If the plan has no Roth option, no catch-up is allowed (TD 10033).
  - https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions (accessed 9 Nov 2026)
  - The ages 60–63 catch-up of $11,250 is also omitted.
- Fix direction: add the >$150k Roth-catch-up rule and the 60–63 super catch-up to both 401(k) articles.

### CMP-09 Savings-income tax rates rise to 24/44/49% from 6 April 2027
- Severity S3 / Confidence Verified / Class AT-RISK (true until 5 Apr 2027)
- Where: cash-isa-vs-savings-account.md:63 ("Every pound of interest is taxed at 45%"); :85-93 (the "numbers for 2026-27" table and rates).
- Fact: HMRC TIIN (29 Oct 2026): "savings basic rate to 24%, savings higher rate to 44% and the savings additional rate to 49% from 6 April 2027". https://www.gov.uk/government/publications/income-tax-changes-to-tax-rates-for-property-and-savings-income (accessed 9 Nov 2026)
  - The PSA break-evens are unchanged, but the tax above them rises. Together with CMP-01 this strengthens the Cash ISA case for higher-rate savers.
- Fix direction: add a "from 6 April 2027" line with the new rates and the tax cost per £1,000 over the PSA.

### CMP-10 Cash ISA rates: the table contradicts the body
- Severity S3 / Confidence Verified / Class WRONG (internal)
- Where: cash-isa-vs-savings-account.md:21-23 vs :71
- The table gives Cash ISA "3.75–4.65%" vs savings "4.00–4.55% (easy access) / 4.00–4.60% (fixed)", so the top Cash ISA rate is higher. The body says regular accounts "often pay 0.25-0.50% more than the best Cash ISA equivalents".
- Rates are also labelled "mid-2026", before the 5 Nov Bank Rate rise.
- Fix direction: pick one claim, date-stamp it, or drop the rate row.

### CMP-11 The LISA closes to new savers from 6 April 2029
- Severity S3 / Confidence Verified / Class AT-RISK
- Where: lisa-vs-regular-isa.md:53, :104 ("You're over 40. You cannot open a new LISA, so a regular ISA is your only option").
- Fact: Budget 2026 §6.1 says "the government will introduce the new First Time Buyer ISA from April 2029", with "no upper age restriction". Table 6.1 item 38 says it replaces the LISA "for new savers from 6 April 2029". The consultation (22 Jun–18 Aug 2026; response 28 Oct 2026) says "this new product will be offered in place of the Lifetime ISA".
  - https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html (accessed 9 Nov 2026)
  - https://www.gov.uk/government/consultations/first-time-buyer-isa-consultation (accessed 9 Nov 2026)
  - The consultation was open when the article was last edited (7 Jul) and is not mentioned.
- Fix direction: add a "what's changing" box covering the FTB ISA from April 2029, existing LISAs unaffected, and the above-cap charge (CMP-02).

### CMP-12 LISA "advantage": "no requirement to buy an annuity"
- Severity S3 / Confidence Verified / Class WRONG
- Where: lisa-vs-regular-isa.md:84
- Fact: annuity purchase has not been required for defined contribution pensions since the 6 Apr 2015 pension flexibilities; savers can take lump sums or use drawdown. https://www.gov.uk/government/publications/pension-flexibility-new-options-from-6-april-2015/pension-flexibility-new-options-from-6-april-2015 (confirmed via search snippet; page title and summary accessed 9 Nov 2026)
- Fix direction: delete the bullet.

### CMP-13 "Pension advantage: No withdrawal penalty for non-qualifying purposes (just income tax)"
- Severity S3 / Confidence Verified / Class WRONG
- Where: lisa-vs-regular-isa.md:90
- Fact: a pension cannot normally be accessed before 55 at all (57 from 6 Apr 2028). An early "unauthorised payment" means "you pay up to 55% tax on it". https://www.gov.uk/early-retirement-pension/personal-and-workplace-pensions (accessed 9 Nov 2026)
- Fix direction: replace with "no access before 55/57; after that, income tax only".

### CMP-14 ISA vs GIA: the inheritance row implies ISAs escape IHT
- Severity S3 / Confidence Verified (cross-article contradiction) / Class WRONG (misleading)
- Where: isa-vs-general-investment.md:31-33 (ISA: "APS allows spouse to inherit ISA benefits"; GIA: "Subject to inheritance tax")
- Fact: ISA holdings form part of the estate for IHT just as GIA holdings do. The APS is an extra ISA allowance for a surviving spouse, not an IHT relief. CalcRun's own pension-vs-isa-uk.md:32-33 correctly says the ISA is "Part of your estate (subject to IHT)".
- Fix direction: make the row "Both in estate for IHT; ISA adds APS for spouse".

### CMP-15 ISA vs GIA: "saves approximately £18,000–£30,000 in tax" is understated about 3–5x
- Severity S3 / Confidence Likely (model-dependent) / Class WRONG
- Where: isa-vs-general-investment.md:53
- Fact: £20k/yr for 20 yrs at 7% is about £877k. With a 2% yield taxed yearly at 2026-27 dividend rates and a final sale at 18/24% CGT, the saving is about £80k (basic rate) to £142k (higher rate). Dividend tax alone at higher rate is about £43k. Sources for the rates: https://www.gov.uk/tax-on-dividends and https://www.gov.uk/capital-gains-tax/rates (accessed 9 Nov 2026), plus `calc/checks.js`.
- Fix direction: recompute and show the assumptions.

### CMP-16 Pension vs ISA: the salary-sacrifice NI saving is capped at £2,000 from 6 April 2029
- Severity S3 / Confidence Verified / Class AT-RISK
- Where: pension-vs-isa-uk.md:77 (the £72/£58-per-£100 salary-sacrifice paragraph)
- Fact: "From 6 April 2029, earnings forgone pursuant to a salary sacrifice scheme above the £2,000 contribution limit" are liable to Class 1 NICs. Policy paper published 4 Dec 2025; referenced again in Budget 2026 §2.2. https://www.gov.uk/government/publications/salary-sacrifice-reform-for-pension-contributions-effective-from-6-april-2029/salary-sacrifice-reform-for-pension-contributions (accessed 9 Nov 2026)
- Fix direction: add one sentence on the 2029 cap.

### CMP-17 15 vs 30: investing $733/month at 8% for 15 years gives $253.6k, not $271k
- Severity S3 / Confidence Verified / Class WRONG
- Where: 15-year-vs-30-year-mortgage.md:71
- Fact: the future value of $733 monthly at 8%/12 over 180 months is $253,646 (end-of-month) or $255,337 (start-of-month). The conclusion "more than the interest savings" still holds.
- Fix direction: correct the figure.

### CMP-18 Rent vs buy: "home prices … rising modestly (3-5% annually)"
- Severity S3 / Confidence Verified / Class WRONG (already wrong at the July edit)
- Where: renting-vs-buying-2026.md:48. The 4% appreciation assumption is at :71.
- Fact: FHFA HPI gives +1.7% year on year to Q1 2026 and +2.1% to Q2 2026 (release 25 Aug 2026). https://fhfa.gov/news/news-release/u.s.-house-prices-rise-2.1-percent-year-over-year-up-0.3-percent-quarter-over-quarter (accessed 9 Nov 2026)
- Fix direction: cite FHFA with its date, and test the break-even at 2% as well.

### CMP-19 "Renting vs Buying a Home in 2026": the year sits in the title, slug, H1, keywords and a heading
- Severity S3 / Confidence Verified / Class AT-RISK (stale from 1 Jan 2027)
- Where: renting-vs-buying-2026.md:2-3, :7-8, :46. fixed-vs-variable-rate-mortgage.md:7 has the keyword "fixed or variable mortgage 2026".
- Fix direction: drop the year from title/H1 (keep the slug, or 301) and stamp "rates as of <date>".

### CMP-20 HYSA vs CDs: falling-rate logic contradicts itself and the rate direction has reversed
- Severity S3 / Confidence Verified / Class WRONG (internal) + AGED
- Where: high-yield-savings-vs-cds.md:13, :58, :62, :48
- The verdict and :62 say CDs win when rates are falling. :58 lists a "Falling rate environment" as an HYSA win ("you've already missed the CD advantage").
- Both the Fed (hike 16 Sep 2026) and the BoE (hike 5 Nov 2026) are now raising rates. That is the scenario the article never covers, and where short CDs or HYSAs are preferred.
- :48 "In 2026, the difference…" is also stale.
- Fix direction: rewrite as a rate-direction rule covering all three cases, and date-stamp rates.

### CMP-21 Money market account rates: two articles contradict each other
- Severity S3 / Confidence Verified / Class WRONG (cross-article)
- Where: emergency-fund-savings-vs-money-market.md:68 vs high-yield-savings-vs-cds.md:76
- emergency:68: MMAs "tend to be slightly lower at the top end (3.25-4.00% vs 3.50-4.25%)… gap usually 0.10-0.25%".
- hysa:76: MMAs "often pay slightly higher rates than savings accounts (0.10-0.25% more)".
- Fix direction: pick one, ideally "similar; shop the specific rate".

### CMP-22 The emergency-fund page renders its table headers as "Option A" / "Option B"
- Severity S3 / Confidence Verified / Class WRONG (rendering)
- Where: `src/pages/comparisons/[comparison].astro:46-49` with the title "Emergency Fund: Savings Account vs Money Market". `titleParts` is taken before the colon, so it has no "vs". Confirmed in `dist/comparisons/emergency-fund-savings-vs-money-market/index.html`. Preview: http://127.0.0.1:4399/comparisons/emergency-fund-savings-vs-money-market/
- Fix direction: add explicit `option1Label`/`option2Label` frontmatter, or reword the title as "Savings Account vs Money Market for Your Emergency Fund".

### CMP-23 Emergency fund: "instant transfer" access is overstated, and the advice to use a separate bank undercuts it
- Severity S3 / Confidence Likely / Class WRONG
- Where: emergency-fund-savings-vs-money-market.md:23-25 ("Instant transfer to linked account"), :60 ("Most online high-yield savings accounts offer instant transfers … typically $5,000-$10,000 per day"), :77 ("same-day at most banks"), :96 ("A different bank entirely helps")
- External transfers from online savings banks are typically ACH (1–3 business days) unless the bank supports RTP/FedNow. No primary source was found supporting "most … instant". The article's own advice to bank elsewhere guarantees external transfers.
- Fix direction: say "1–3 business days by ACH unless your bank supports instant payments; test it" (the test advice is already at :97).

### CMP-24 Index vs active: the $500/month figures are wrong and understate the fee drag
- Severity S3 / Confidence Verified / Class WRONG
- Where: index-funds-vs-active-funds.md:52-57
- Claim: index (0.10%) $566,400; active (1.00%) $498,200; gap $68,200.
- Fact: $500/month for 30 years, monthly compounding:
  - 7% gross gives $609,986.
  - 6.9% net gives $598,085.
  - 6.0% net gives $502,258.
  - The gap is about **$95,800**.
  - The $566,400 figure is inconsistent with CalcRun's own pay-off-debt-vs-invest.md:77, which gives $609,986 for the zero-fee case.
  - The link at :52 goes to a 25-year scenario ($405,036) while the text says 30 years.
- Fix direction: recompute and fix the link.

### CMP-25 Index vs active: table row "Fee on $100K over 30 years: $2,800 / $49,000"
- Severity S3 / Confidence Likely / Class WRONG
- Where: index-funds-vs-active-funds.md:20-22
- I found no convention that reproduces these figures. For a $100k lump sum at 7%, fees actually paid are about $9.9k at 0.10% and $83.6k at 1.00%. The growth lost against a no-fee portfolio is about $22.5k and $198k.
- Fix direction: state the assumption and recompute.

### CMP-26 Pay off debt: the after-tax return treats all market returns as ordinary income
- Severity S3 / Confidence Verified / Class WRONG
- Where: pay-off-debt-vs-invest.md:61-63
- Claim: in the 22% bracket, an 8% taxable return drops to "roughly 6.2%"; "any debt above 6.2% should be paid first".
- Fact: long-term gains and qualified dividends are taxed at 15% (0% at lower incomes) for taxable income in the 22% bracket, and gains are deferred until sale. IRS Topic 409 (2025: 15% from $48,350 to $533,400 single). https://www.irs.gov/taxtopics/tc409 (accessed 9 Nov 2026)
  - The after-tax return is nearer 7.5–7.8%.
  - The 6.2% threshold also conflicts with the article's own decision framework at :113 ("above 7%") and :124 ("5-7%").
- Fix direction: use LTCG rates and align the threshold.

### CMP-27 Pay off debt: "That 5-year delay costs about $205,000"
- Severity S3 / Confidence Verified (maths) / Class WRONG (overstated about 4x)
- Where: pay-off-debt-vs-invest.md:77
- The figure compares $500/month for 30 years against 25 years. It ignores that the investing-first saver still owes and services the 4% loan.
- Equal-budget comparison with the article's $20k at 4%, $500/month, 7%: net worth at year 30 is about $508.7k (invest first, interest-only) vs $456.0k (pay first). That is about a **$52.6k** difference.
- Fix direction: replace with the equal-budget comparison.

### CMP-28 Roth 401(k): the match is "a tax law requirement, not an employer choice"
- Severity S3 / Confidence Verified / Class WRONG (since SECURE 2.0 §604, 29 Dec 2022)
- Where: roth-ira-vs-roth-401k.md:81; table :24-25
- Fact: IRS Notice 2024-2 Q&A L-1: "to the extent a plan permits an employee to designate matching contributions or nonelective contributions as Roth contributions…". Roth matching is an optional plan feature; the default remains pre-tax in most plans. https://www.irs.gov/pub/irs-drop/n-24-02.pdf (accessed 9 Nov 2026)
- Fix direction: say "usually pre-tax; SECURE 2.0 lets plans offer Roth matching".

### CMP-29 2026 401(k)/IRA figures go stale on 1 January 2027
- Severity S3 / Confidence Verified (2026 values) / Hypothesis (2027 values) / Class AT-RISK
- Where:
  - roth-ira-vs-roth-401k.md:17-21, :59-65, :98-99
  - roth-vs-traditional-401k.md:30-32, :73-85
  - pay-off-debt-vs-invest.md:106
- Fact: the 2026 values are correct per IR-2025-111: $24,500 deferral, $8,000 catch-up, $7,500 IRA, $1,100 IRA catch-up, Roth IRA phase-outs $153k–$168k single and $242k–$252k joint. https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500 (accessed 9 Nov 2026)
  - 2027 limits were not yet published at review time. Industry projections put the deferral limit at $25,500.
  - The roth-trad worked example ($24,500 → $5,880) will also need re-running.
- Fix direction: keep these figures in one constant shared with the calculators, and refresh when the IRS notice is published (expected Nov 2026).

### CMP-30 Snowball vs avalanche: the table's completion-rate row contradicts itself
- Severity S3 / Confidence Verified / Class WRONG (internal)
- Where: snowball-vs-avalanche-debt.md:30-32. Snowball reads "Higher (research-backed)"; Avalanche reads "Lower dropout rate", which also means higher completion.
- Fix direction: Avalanche should read "Lower (higher dropout)".

### CMP-31 PCP: the FCA source link is dead
- Severity S3 / Confidence Verified / Class WRONG (link)
- Where: pcp-vs-hp-vs-personal-loan.md:47-48 (`https://www.fca.org.uk/consumers/car-finance` returns 404 on 9 Nov 2026). The live sibling is https://www.fca.org.uk/consumers/car-finance-complaints.
- Fix direction: replace with a live FCA page. Consider one line on the FCA motor finance redress scheme for 2007–2024 agreements (final rules PS26/3, March 2026, per secondary sources; I did not open the FCA policy statement itself).

### CMP-32 Fixed vs variable: a UK article carrying a US-only affiliate and mixed audience
- Severity S3 / Confidence Verified / Class WRONG (audience)
- Where: fixed-vs-variable-rate-mortgage.md:35-37 (LendingTree), with the £250,000 worked example (:57-61) and the UK remortgage section (:99-103), mixed with US ARMs (:53).
- A UK reader gets a US lender-comparison affiliate. Elsewhere `ResultAffiliate` hides LendingTree for GBP, but the comparison template has no geo gating.
- Fix direction: split into UK and US articles, or gate the affiliate by audience.

### CMP-33 Sources (cross-cutting): mostly generic hubs, some from the wrong country, none supporting the specific figures
- Severity S3 / Confidence Verified / Class WRONG (E-E-A-T)
- 9 of 13 distinct source URLs are generic landing or index pages: irs.gov/taxtopics, gov.uk/browse/tax, fca.org.uk/consumers, the BoE monetary policy hub, and the CFPB owning-a-home hub.
- US articles cite UK regulators:
  - snowball:39-42 cites FCA and BoE.
  - lump-sum:41-45 cites FCA and BoE, none for Vanguard or DFA.
  - hysa:42-43 cites BoE.
- index-funds cites IRS Tax Topics and FCA but not SPIVA.
- 15yr and renting cite IRS Tax Topics for no tax claim.
- Only 1 of 16 articles (PCP) has an `faq` array, so FAQPage schema renders on one page only.
- See links.tsv.
- Fix direction: cite the specific primary pages used for each figure (e.g. IR-2025-111, Budget 2026 HTML, FHFA release, PMMS, SPIVA report).

### S4 items (minor; one line each)

| # | Where | Class / Conf | Claim vs fact | Fix |
|---|---|---|---|---|
| S4-01 | 15yr:75,83 | WRONG / Likely | "Lenders generally cap your housing payment … at about 28%"; "the 30-year is the only term the lender will approve". 28/36 is a guideline; conventional and FHA underwriting routinely approves higher DTIs | Call it a rule of thumb |
| S4-02 | 15yr:15-26, :47 | AGED / Verified | Examples at 6% vs PMMS 30-yr 7.18% and 15-yr 6.57% (5 Nov 2026). The table uses one rate for both terms while its own row says the 15-year is 0.5–0.75% lower | Date-stamp; use a split rate |
| S4-03 | 15yr:95 | Unsourced / Hypothesis | "About 90% of borrowers choose the 30-year" | Cite or soften |
| S4-04 | cash-isa:65; lisa:69 | Audience / Verified | UK articles link to "Saving a $60,000 House Deposit" (USD scenario) | Link a GBP scenario |
| S4-05 | cash-isa:21, :85 | AT-RISK / Verified | "mid-2026" rates and "numbers for 2026-27" age on 6 Apr 2027 | Date-stamp |
| S4-06 | emergency:87 | WRONG / Verified | "government money market funds have never 'broken the buck'". The Community Bankers U.S. Government Money Market Fund "broke the dollar" in 1994 (SEC Rel. 33-7625, https://www.sec.gov/files/litigation/admin/33-7625.txt). Also "technically not FDIC insured": they are not FDIC insured at all | Fix the sentence |
| S4-07 | emergency:27 | Imprecise / Likely | "Unlimited (Reg D repealed for savings)". The Fed removed the six-transfer limit in 2020, but banks may keep their own limits | "Usually unlimited; check your bank" |
| S4-08 | emergency:98 | Internal / Verified | "4.5% vs 4.6%" example sits above the article's own 3.50–4.25% range | Align |
| S4-09 | emergency:15-16, :56 | AT-RISK / Hypothesis | "3.50–4.25% as of mid-2026". The Fed has since hiked to 3.75–4.00%; current top APYs not verified from a primary source | Date-stamp |
| S4-10 | hysa:66 | Internal / Verified | Ladder "3, 6, 12, and 18 months" (4 rungs) vs "five $10,000 rungs" | Make it 5 maturities |
| S4-11 | hysa:84 | Arithmetic / Verified | 4.2% × 9% = 0.378%, not "about 0.39%" (and federal SALT deductibility is ignored) | 0.38% |
| S4-12 | hysa:42-43, :54, :56 | Audience / Verified | US article: BoE source, "penalises", "holiday" | US spelling and sources |
| S4-13 | fixed:53 | AGED / Likely | US ARMs "adjust annually based on an index like SOFR". Conforming SOFR ARMs are 5/6, 7/6, 10/6 (6-monthly resets), per secondary sources on Fannie/Freddie guides | "every 6 or 12 months" |
| S4-14 | fixed:61-63 | Imprecise / Verified | £1,461 is 5% on the original £250k over 25 years, not the year-3 balance. Break-even is "over your mortgage term" where it should be "over the fixed period", and it compares a 5-yr fix to a 2-yr tracker | Tighten |
| S4-15 | index:76-78 | Unsourced / Hypothesis | SPIVA 79/88/94% with no report year. The S&P site returned 403, so I could not verify; the SPIVA Mid-Year 2026 headline was 67% (H1 2026) per secondary sources | Cite the report and year |
| S4-16 | index:86 | Contested / Hypothesis | "Small-cap and emerging markets … Active funds outperform the index more often here". SPIVA Mid-Year 2026 reportedly had 69% of small-cap actives underperforming in H1 | Soften |
| S4-17 | index:101-103 | Audience / Hypothesis | US tickers (VTI/VXUS/BND/FSKAX) recommended on a page with a UK affiliate (InvestEngine); UK retail access to US-domiciled ETFs has historically been blocked. FSKAX ER is ~0.015%, not 0.03% | Add UK equivalents (UCITS) |
| S4-18 | index:52 | Link / Verified | "Over 30 years" links to the 25-year scenario | Fix the link or the text |
| S4-19 | index:61,66,88 | Spelling / Verified | "adviser", "specialise" in a USD article | US spelling |
| S4-20 | isa-gia:29 | Imprecise / Verified | "Anytime (flexible ISA)": any S&S ISA allows withdrawals; "flexible" means you can replace them | Reword |
| S4-21 | isa-gia:61 | Imprecise / Likely | SAYE/SIP shares can be transferred into an ISA directly (within 90 days, CGT-free); EMI shares cannot; Bed and ISA is a different mechanism | Split |
| S4-22 | lisa:83 | Logic / Verified | "Access at 60, vs 55 for pensions" is listed as a LISA *advantage* (it is later access) | Move it under the disadvantages |
| S4-23 | lump:54 | Unverified / Hypothesis | DFA "7 global markets … 65-70%". A DFA paper exists ("Taking Stock of Lump-Sum Investing vs. Dollar-Cost Averaging"), but the specific statistic was not confirmed | Quote it from the paper or drop |
| S4-24 | lump:58 | Audience / Verified | "£100,000 inheritance" links to the "$100,000 Invested for 30 Years" scenario; £ and $ mixed in the article | Pick one currency |
| S4-25 | lump:41-45 | Sources / Verified | FCA and BoE hubs cited; Vanguard 2012 is not cited | Cite Vanguard and DFA |
| S4-26 | lump:52 | AGED / Hypothesis | "savings account earning 4% instead of … 8%" | Neutral wording |
| S4-27 | pay-off:63 vs :113 | Internal / Verified | 6.2% threshold vs "above 7%" framework | Align (see CMP-26) |
| S4-28 | pay-off:98 | Unsourced / Hypothesis | APA 2023 "debt is the primary driver" of money stress, not verified | Cite or soften |
| S4-29 | pay-off:57,108 | Spelling / Verified | "grey", "prioritising" in a USD-led article | Pick a locale |
| S4-30 | pcp:55 | Imprecise / Likely | "lenders may charge up to around two months' interest". CCA s.95A caps compensation at 1% of the amount repaid (0.5% if one year or less remains), for fixed-rate deals where more than £8,000 is repaid, and at no more than the interest saved (https://www.legislation.gov.uk/ukpga/1974/39/section/95A) | State the s.95A cap |
| S4-31 | pcp:64-70 | Method / Verified | APR (an effective annual rate) is used as the nominal monthly rate, which slightly overstates payments | Note the assumption |
| S4-32 | pcp:92 | Misleading / Likely | "the loan appears in full on your credit file". HP and PCP are reported in full too | Remove the implied contrast |
| S4-33 | pcp:59 | AT-RISK / Hypothesis | "Best-buy personal loans (around 5.6% in 2026)" just after the 5 Nov Bank Rate rise | Date-stamp |
| S4-34 | pcp:76 | Unsourced / Hypothesis | "over 80% of new UK cars are financed this way [PCP]" | Cite FLA or soften |
| S4-35 | pension:17 | Scope / Verified | "20–45% relief" omits Scotland (19–48%) | Add a Scotland note |
| S4-36 | pension:62 | Imprecise / Likely | "employer matches 5% … £1,750" on £35k. The auto-enrolment minimum is on qualifying earnings (£6,240–£50,270), which gives about £1,438 | Say "if on full salary" |
| S4-37 | renting:63 | Arithmetic / Verified | "only about $500/month … goes to principal". Year-1 average is ~$368 on the article's loan | Correct |
| S4-38 | renting:33,48 | Spelling / Verified | "itemise", "stabilised" in a US article | US spelling |
| S4-39 | roth-ira:17-19, :101 | Omission / Verified | No ages 60–63 $11,250 catch-up; "maximises" | Add; fix spelling |
| S4-40 | roth-trad:25-26 | Incomplete / Likely | RMD "starting at age 73". Under SECURE 2.0 §107 it is 75 for people born 1960+ (most readers); the IRS FAQ shows 73 generally | "73 (75 if born 1960+)" |
| S4-41 | roth-trad:87, :93 | Logic / Verified | "If retirement and current rates are the same (24%), the Roth wins because there's no tax drag": in the article's own model they tie, and Roth only wins via the side fund's tax. The $60k retiree tax ignores the 65+ additional deduction ($2,050 in 2026) and the 2025–2028 $6,000 senior deduction (so actual tax is lower). Also "favour" | Clarify |

(snowball:53,68,74 "favours/prioritises" and its FCA/BoE sources are covered in the spelling section and CMP-33.)

## Contradictions between articles (summary)

- **MMA vs HYSA rates:** emergency:68 says MMAs are lower; hysa:76 says higher (CMP-21).
- **ISA and IHT:** isa-gia:31-33 implies ISAs are IHT-free; pension-vs-isa:32-33 says they are subject to IHT (CMP-14).
- **$500/month at 7% for 30 years:** pay-off:77 gives $609,986 with no fee; index:54 gives $566,400 net of only 0.10%, which is impossible (CMP-24).
- **"Pay debt first" threshold:**
  - pay-off-debt:63 says 6.2%.
  - pay-off-debt:113 and its table at :33-35 say above 7%.
  - 15yr:57 says student loans above 6%.
  These are not aligned.
- **UK priority order:**
  - lisa:92 says pension to match, then LISA, then pension/ISA.
  - pension:91-94 says pension to match, then S&S ISA up to £20k, then more pension, with the LISA only for first homes.
  - isa-gia:81-84 matches pension:91-94.
  The orders are compatible but not reconciled.
- **Consistent across articles (good):**
  - £20k ISA limit.
  - Pension access at 55, rising to 57 from April 2028 (correct).
  - 401(k) limit $24,500 / $32,500.
  - The three articles' Cash ISA statements are consistent with each other, but all three are now wrong (CMP-01).

## Genuine strengths (verified)

1. **pcp-vs-hp-vs-personal-loan.md:64-72, :78.**
   - The three-way table reproduces to the penny: £370.41 / £558.85 / £524.30 and totals £30,279.61 / £29,324.59 / £27,666.24.
   - The insight that PCP costs more at a lower APR because interest runs on the £10k balloon is specific and non-obvious.
   - The linked calculator's defaults match the example.
   - The voluntary-termination FAQ (:55) correctly states the CCA half-of-total rule.
2. **snowball-vs-avalanche-debt.md:60-66, :88-90.**
   - The simulation figures reproduce exactly: snowball $1,634 / 23 months; avalanche $1,235 / 22 months; minimums-only 78 months / about $7,593; credit card consolidated at 10% gives $943.
   - The "minimums-only baseline" reframe is useful.
3. **pay-off-debt-vs-invest.md:69-75.** The three-rate worked example reproduces exactly: $5,641 owed and $4.8k behind at 22%; the dead heat at 7% ($7,444 each); and at 3.5%, $9,132 vs $11,620.
4. **roth-vs-traditional-401k.md:89-95.**
   - "Marginal rate in, effective rate out" uses correct 2026 figures: $16,100 standard deduction, the 10% band to $12,400 and the 12% band to $50,400.
   - $60k of withdrawals gives $5,020 of tax, an effective 8.4%.
   - This is genuinely differentiating content.
5. **pension-vs-isa-uk.md:68-77.**
   - The £300/month example reproduces: about £425k pension vs £243k ISA, with £361k kept after basic-rate tax.
   - The salary-sacrifice net costs (£72 / £58 per £100) are correct for 2026-27, given the £50,270 UEL, 8%/2% NI and 15% employer NI.
   - Also good: 15yr:99 (prepaying the 30-year at the 15-year payment gives 15y10m and about $165.2k interest) and lump:80-87 ($120,580 / $116,129 / $119,368 hybrid), both reproduced.

## Primary sources used (all accessed 9 Nov 2026)

- **Budget 2026 HTML** (cash ISA kept at £20k; LISA 20% charge above the cap; FTB ISA from April 2029; savings income rates +2pp): https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html
- **HMRC TIIN, LISA withdrawal charge:** https://www.gov.uk/government/publications/lifetime-isa-withdrawal-charge
- **HMRC TIIN, savings and property income rates:** https://www.gov.uk/government/publications/income-tax-changes-to-tax-rates-for-property-and-savings-income
- **FTB ISA consultation and response:** https://www.gov.uk/government/consultations/first-time-buyer-isa-consultation
- **Salary sacrifice cap:** https://www.gov.uk/government/publications/salary-sacrifice-reform-for-pension-contributions-effective-from-6-april-2029/salary-sacrifice-reform-for-pension-contributions
- **GOV.UK pages:**
  - Dividend tax: https://www.gov.uk/tax-on-dividends
  - CGT rates: https://www.gov.uk/capital-gains-tax/rates
  - Income tax rates: https://www.gov.uk/income-tax-rates
  - Lifetime ISA: https://www.gov.uk/lifetime-isa
  - Early pension access: https://www.gov.uk/early-retirement-pension/personal-and-workplace-pensions
- **Bank of England, November 2026 MPC:** https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/november-2026
- **FOMC statements:**
  - 16 Sep 2026: https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm
  - 28 Oct 2026: https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm
- **Freddie Mac PMMS:** https://www.freddiemac.com/pmms
- **FHFA HPI Q2 2026:** https://fhfa.gov/news/news-release/u.s.-house-prices-rise-2.1-percent-year-over-year-up-0.3-percent-quarter-over-quarter
- **IRS:**
  - IR-2025-111 (2026 limits): https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
  - Catch-up contributions: https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions
  - Notice 2024-2: https://www.irs.gov/pub/irs-drop/n-24-02.pdf
  - Tax on early distributions: https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-tax-on-early-distributions
  - Topic 409: https://www.irs.gov/taxtopics/tc409
  - RMD FAQs: https://www.irs.gov/retirement-plans/retirement-plan-and-ira-required-minimum-distributions-faqs
- **SEC Rel. 33-7625:** https://www.sec.gov/files/litigation/admin/33-7625.txt
- **Consumer Credit Act 1974 s.95A:** https://www.legislation.gov.uk/ukpga/1974/39/section/95A

## Could not confirm (left as Hypothesis)

- SPIVA long-horizon percentages: spglobal.com returned 403.
- Current top HYSA, CD, money market and UK Cash ISA rates: no primary source.
- 2027 IRS limits: not yet published.
- The specific DFA statistic.
- The APA "debt is the primary driver" finding.
- The FLA "80% PCP" statistic.
- UK retail access to US ETFs under the 2026 Consumer Composite Investments regime.
- FCA motor-finance redress scheme dates: secondary sources only.

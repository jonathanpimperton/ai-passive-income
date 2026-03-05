# MailerLite Drip Automation — Setup Guide

Pre-written branded email templates + step-by-step guide for the evergreen drip sequence.

## How Subscribers Enter the Drip

Two paths, same MailerLite group ("Calculator Results"):

1. **Newsletter subscribe form** (homepage + tool pages) — gets the welcome email + full drip sequence
2. **"Email my results"** button — already gets their results via MailerSend, so they skip the welcome email and enter the drip at Email 2 (Day 3). Only if they have "Also send me financial tips" checked (default: on).

## Setting Up Two Automations

Because "email results" people shouldn't get the welcome email (their results email IS their welcome), you need two automations:

### Automation 1: "Newsletter Subscribers" (Welcome + Full Drip)
- **Trigger:** When subscriber joins group → Calculator Results
- **Condition:** Custom field `calculator_slug` is empty (these are newsletter subscribers, not results emailers)
- **Flow:** Welcome email → 3d delay → Email 2 → 4d delay → Email 3 → ... → Email 10

### Automation 2: "Results Subscribers" (Skip Welcome, Start at Email 2)
- **Trigger:** When subscriber joins group → Calculator Results
- **Condition:** Custom field `calculator_slug` is NOT empty (these used "email my results")
- **Flow:** 3d delay → Email 2 → 4d delay → Email 3 → ... → Email 10

**If conditional triggers aren't available on the free tier**, just use one automation with the welcome email — results people will get both the results email AND the welcome, which is fine (the welcome is short and useful).

## The Drip Sequence (10 Emails, Evergreen)

| # | Timing | Subject | Type | Affiliates? |
|---|--------|---------|------|-------------|
| 1 | Immediate | Welcome to CalcRun | Welcome | Yes (soft) |
| 2 | Day 3 | The one number that changes everything | Educational | Yes |
| 3 | Day 7 | One thing that could help | Recommendation | Yes |
| 4 | Day 14 | What waiting 5 years actually costs you | Educational | Yes |
| 5 | Day 21 | What 1% in fees actually costs you | Educational | Yes |
| 6 | Day 30 | Your monthly money check-in | Engagement | Yes |
| 7 | Day 45 | The debt question everyone gets wrong | Educational | Yes |
| 8 | Day 60 | Your savings lost purchasing power this year | Educational | Yes |
| 9 | Day 90 | Quick check-in: how are your numbers looking? | Engagement | Yes |
| 10 | Day 120 | The one thing millionaires do differently | Educational | Yes |

Every email includes at least one affiliate CTA. The sequence spans 4 months then stops (subscriber stays on list for future broadcast campaigns).

## Setup Steps

### 1. Create the Automation
- Log into **app.mailerlite.com**
- Click **Automations** in the left sidebar
- Click **Create automation**

### 2. Set the Trigger
- Choose **"When subscriber joins a group"**
- Select: **Calculator Results**
- Click **Save trigger**

### 3. Build the Sequence
For each email below:
- Click **+** below the previous step
- Add **Delay** (see timing column — no delay for Email 1)
- Click **+** again → **Email**
- Set subject, preview text, sender: `CalcRun <hello@calcrun.com>`
- Click **Design email** → **HTML editor** → paste the HTML

### 4. Activate
- Review the full flow
- Click **Activate** (top right)

## Free Tier Limits
- 1,000 subscribers, 12,000 emails/month
- Automations included on free tier
- Upgrade to Growing Business ($10/mo) at 1,000 subscribers

---

## Email 1 — Welcome (Immediate, No Delay)

**Subject:** Welcome to CalcRun
**Preview:** Here's what you can do with your numbers

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to CalcRun</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo bar -->
          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="https://www.calcrun.com/icon-192.png" alt="" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#1A1A2E;letter-spacing:-0.02em;">Calc</span><span style="font-size:17px;font-weight:700;color:#0B6E6E;letter-spacing:-0.02em;">Run</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E8E8E4;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

              <!-- Teal header strip -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#0B6E6E,#0D8A8A);border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Content -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 32px 32px;">
                    <h1 style="font-size:24px;font-weight:700;color:#1A1A2E;margin:0 0 20px;line-height:1.3;letter-spacing:-0.02em;">Welcome to CalcRun</h1>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 16px;">
                      You're in. From now on, you'll get practical financial insights based on real numbers — no fluff, no jargon.
                    </p>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 24px;">
                      Here are three things you can do right now:
                    </p>

                    <!-- 3 quick links -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="padding:14px 16px;background-color:#F0FDFA;border-radius:8px;border:1px solid #CCFBF1;margin-bottom:8px;">
                          <a href="https://www.calcrun.com/tools/saving-and-growth/compound-interest?utm_source=mailerlite&utm_medium=email&utm_campaign=welcome" style="font-size:14px;font-weight:600;color:#0B6E6E;text-decoration:none;">1. See how your savings grow over time &rarr;</a>
                        </td>
                      </tr>
                      <tr><td style="height:8px;font-size:0;">&nbsp;</td></tr>
                      <tr>
                        <td style="padding:14px 16px;background-color:#F0FDFA;border-radius:8px;border:1px solid #CCFBF1;">
                          <a href="https://www.calcrun.com/tools/debt-and-loans/mortgage-payment?utm_source=mailerlite&utm_medium=email&utm_campaign=welcome" style="font-size:14px;font-weight:600;color:#0B6E6E;text-decoration:none;">2. Calculate your real mortgage payment &rarr;</a>
                        </td>
                      </tr>
                      <tr><td style="height:8px;font-size:0;">&nbsp;</td></tr>
                      <tr>
                        <td style="padding:14px 16px;background-color:#F0FDFA;border-radius:8px;border:1px solid #CCFBF1;">
                          <a href="https://www.calcrun.com/comparisons?utm_source=mailerlite&utm_medium=email&utm_campaign=welcome" style="font-size:14px;font-weight:600;color:#0B6E6E;text-decoration:none;">3. Read our side-by-side comparisons &rarr;</a>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 24px;">
                      Over the next few weeks, I'll send you short emails with financial insights backed by actual calculations. Each one takes about 2 minutes to read.
                    </p>

                    <!-- Affiliate soft intro -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="padding:16px 20px;border-radius:10px;border:1px solid #E8E8E4;">
                          <div style="font-size:11px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Getting started with investing?</div>
                          <div style="font-size:14px;color:#4A4A5A;line-height:1.5;margin-bottom:12px;">
                            Betterment makes it simple — automated investing with no minimum balance and no trading fees.
                          </div>
                          <a href="https://www.betterment.com/?utm_source=calcrun&utm_medium=email_drip&utm_campaign=welcome" style="display:inline-block;padding:10px 20px;background-color:#0B6E6E;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                            Learn more about Betterment &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border:2px solid #0B6E6E;border-radius:8px;">
                          <a href="https://www.calcrun.com/tools?utm_source=mailerlite&utm_medium=email&utm_campaign=welcome" style="display:inline-block;padding:14px 28px;color:#0B6E6E;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                            Browse all calculators &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 24px;">
                    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:0;border-top:1px solid #F3F3EF;padding-top:16px;">
                      Some links in our emails are affiliate links — CalcRun may earn a commission at no cost to you.
                      <a href="https://www.calcrun.com/disclosure" style="color:#0B6E6E;text-decoration:underline;">Full disclosure</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:28px 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #E8E8E4;padding-top:20px;">
                    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">
                      You're receiving this because you signed up at
                      <a href="https://www.calcrun.com" style="color:#0B6E6E;text-decoration:none;">CalcRun</a>.<br>
                      <a href="{$unsubscribe}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Email 2 — Day 3: The Compound Effect

**Subject:** The one number that changes everything
**Preview:** A quick insight based on your recent calculation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>The one number that changes everything</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="https://www.calcrun.com/icon-192.png" alt="" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#1A1A2E;letter-spacing:-0.02em;">Calc</span><span style="font-size:17px;font-weight:700;color:#0B6E6E;letter-spacing:-0.02em;">Run</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E8E8E4;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:4px;background:linear-gradient(90deg,#0B6E6E,#0D8A8A);border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 32px 32px;">
                    <h1 style="font-size:24px;font-weight:700;color:#1A1A2E;margin:0 0 20px;line-height:1.3;letter-spacing:-0.02em;">The one number most people ignore</h1>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 16px;">
                      Here's something most people miss when running financial calculations:
                    </p>

                    <p style="font-size:15px;color:#1A1A2E;line-height:1.65;margin:0 0 20px;font-weight:600;">
                      Time is the most powerful variable in any financial equation.
                    </p>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 24px;">
                      Whether you're calculating mortgage payments, investment returns, or debt payoff — the timeline changes everything.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="padding:20px 24px;background-color:#F0FDFA;border-radius:10px;border:1px solid #CCFBF1;">
                          <div style="font-size:11px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">The compound effect</div>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #D1FAE5;">
                                <span style="font-size:14px;color:#4A4A5A;">Start at 25, invest $200/month:</span>
                                <span style="font-size:14px;font-weight:700;color:#0B6E6E;float:right;">$525,000 by 65</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #D1FAE5;">
                                <span style="font-size:14px;color:#4A4A5A;">Start at 35, same $200/month:</span>
                                <span style="font-size:14px;font-weight:700;color:#E8604C;float:right;">$244,000 by 65</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:10px 0 0;">
                                <span style="font-size:14px;font-weight:700;color:#1A1A2E;">10 years of delay costs $281,000.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 28px;">
                      The best time to start was years ago. The second best time is today.
                    </p>

                    <!-- Affiliate -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="padding:16px 20px;border-radius:10px;border:1px solid #E8E8E4;">
                          <div style="font-size:11px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Ready to start investing?</div>
                          <div style="font-size:14px;color:#4A4A5A;line-height:1.5;margin-bottom:12px;">
                            Betterment handles diversification, rebalancing, and tax-loss harvesting automatically. No minimum balance.
                          </div>
                          <a href="https://www.betterment.com/?utm_source=calcrun&utm_medium=email_drip&utm_campaign=day3" style="display:inline-block;padding:10px 20px;background-color:#0B6E6E;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                            Learn more &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border:2px solid #0B6E6E;border-radius:8px;">
                          <a href="https://www.calcrun.com/tools/saving-and-growth/compound-interest?utm_source=mailerlite&utm_medium=email&utm_campaign=drip_day3" style="display:inline-block;padding:14px 28px;color:#0B6E6E;font-size:14px;font-weight:600;text-decoration:none;">
                            Run your numbers &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 24px;">
                    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:0;border-top:1px solid #F3F3EF;padding-top:16px;">
                      Some links in our emails are affiliate links — CalcRun may earn a commission at no cost to you.
                      <a href="https://www.calcrun.com/disclosure" style="color:#0B6E6E;text-decoration:underline;">Full disclosure</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:28px 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #E8E8E4;padding-top:20px;">
                    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">
                      <a href="https://www.calcrun.com" style="color:#0B6E6E;text-decoration:none;">CalcRun</a> &middot;
                      <a href="{$unsubscribe}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Email 3 — Day 7: Partner Recommendations

**Subject:** One thing that could help
**Preview:** A recommendation based on your numbers

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>One thing that could help</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="https://www.calcrun.com/icon-192.png" alt="" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#1A1A2E;letter-spacing:-0.02em;">Calc</span><span style="font-size:17px;font-weight:700;color:#0B6E6E;letter-spacing:-0.02em;">Run</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E8E8E4;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:4px;background:linear-gradient(90deg,#0B6E6E,#0D8A8A);border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 32px 20px;">
                    <h1 style="font-size:24px;font-weight:700;color:#1A1A2E;margin:0 0 20px;line-height:1.3;letter-spacing:-0.02em;">One thing that could help</h1>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 16px;">
                      Running the numbers is the first step. The real value comes from acting on what you learned.
                    </p>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 28px;">
                      Here are two tools worth knowing about:
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Partner card 1: Betterment -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;border:1px solid #E8E8E4;overflow:hidden;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <div style="display:inline-block;padding:3px 10px;background-color:#F0FDFA;border-radius:20px;font-size:10px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Investing</div>
                          <div style="font-size:18px;font-weight:700;color:#1A1A2E;margin-bottom:6px;">Betterment</div>
                          <div style="font-size:14px;color:#4A4A5A;line-height:1.5;margin-bottom:16px;">
                            Automated investing with no minimum balance. Set up recurring deposits and let the platform handle diversification, rebalancing, and tax-loss harvesting.
                          </div>
                          <a href="https://www.betterment.com/?utm_source=calcrun&utm_medium=email_drip&utm_campaign=day7" style="display:inline-block;padding:11px 22px;background-color:#0B6E6E;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                            Learn more &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Partner card 2: SoFi -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;border:1px solid #E8E8E4;overflow:hidden;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <div style="display:inline-block;padding:3px 10px;background-color:#F0FDFA;border-radius:20px;font-size:10px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Banking</div>
                          <div style="font-size:18px;font-weight:700;color:#1A1A2E;margin-bottom:6px;">SoFi</div>
                          <div style="font-size:14px;color:#4A4A5A;line-height:1.5;margin-bottom:16px;">
                            High-yield savings, personal loans, and debt consolidation in one app. Competitive APY with no account fees.
                          </div>
                          <a href="https://www.sofi.com/?utm_source=calcrun&utm_medium=email_drip&utm_campaign=day7" style="display:inline-block;padding:11px 22px;background-color:#0B6E6E;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                            Learn more &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 32px 32px;">
                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 24px;">
                      Small, consistent actions — investing $100/month, paying an extra $50 on your mortgage, building your emergency fund — add up to life-changing results over time.
                    </p>

                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border:2px solid #0B6E6E;border-radius:8px;">
                          <a href="https://www.calcrun.com/comparisons?utm_source=mailerlite&utm_medium=email&utm_campaign=drip_day7" style="display:inline-block;padding:12px 24px;color:#0B6E6E;font-size:14px;font-weight:600;text-decoration:none;">
                            Read our comparison guides &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 24px;">
                    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:0;border-top:1px solid #F3F3EF;padding-top:16px;">
                      Some links in our emails are affiliate links — CalcRun may earn a commission at no cost to you.
                      <a href="https://www.calcrun.com/disclosure" style="color:#0B6E6E;text-decoration:underline;">Full disclosure</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:28px 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #E8E8E4;padding-top:20px;">
                    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">
                      <a href="https://www.calcrun.com" style="color:#0B6E6E;text-decoration:none;">CalcRun</a> &middot;
                      <a href="{$unsubscribe}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Email 4 — Day 14: The Real Cost of Waiting

**Subject:** What waiting 5 years actually costs you
**Preview:** The numbers might surprise you

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>What waiting 5 years actually costs you</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding:0 0 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="https://www.calcrun.com/icon-192.png" alt="" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#1A1A2E;letter-spacing:-0.02em;">Calc</span><span style="font-size:17px;font-weight:700;color:#0B6E6E;letter-spacing:-0.02em;">Run</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E8E8E4;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:4px;background:linear-gradient(90deg,#0B6E6E,#0D8A8A);border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 32px 32px;">
                    <h1 style="font-size:24px;font-weight:700;color:#1A1A2E;margin:0 0 20px;line-height:1.3;letter-spacing:-0.02em;">What waiting 5 years actually costs you</h1>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 16px;">
                      "I'll start next year" is the most expensive sentence in personal finance. Here's the maths:
                    </p>

                    <!-- Comparison table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #E8E8E4;border-radius:10px;overflow:hidden;">
                      <tr>
                        <td style="padding:10px 16px;background-color:#F0FDFA;font-size:12px;font-weight:700;color:#0B6E6E;border-bottom:1px solid #E8E8E4;">Scenario</td>
                        <td style="padding:10px 16px;background-color:#F0FDFA;font-size:12px;font-weight:700;color:#0B6E6E;border-bottom:1px solid #E8E8E4;text-align:right;">Start now</td>
                        <td style="padding:10px 16px;background-color:#F0FDFA;font-size:12px;font-weight:700;color:#E8604C;border-bottom:1px solid #E8E8E4;text-align:right;">Wait 5yr</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#4A4A5A;border-bottom:1px solid #F3F3EF;">$300/mo for 30yr</td>
                        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0B6E6E;border-bottom:1px solid #F3F3EF;text-align:right;">$340K</td>
                        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#E8604C;border-bottom:1px solid #F3F3EF;text-align:right;">$219K</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#4A4A5A;border-bottom:1px solid #F3F3EF;">$500/mo for 25yr</td>
                        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0B6E6E;border-bottom:1px solid #F3F3EF;text-align:right;">$405K</td>
                        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#E8604C;border-bottom:1px solid #F3F3EF;text-align:right;">$253K</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#4A4A5A;">$1,000/mo for 20yr</td>
                        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0B6E6E;text-align:right;">$528K</td>
                        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#E8604C;text-align:right;">$310K</td>
                      </tr>
                    </table>

                    <p style="font-size:13px;color:#9CA3AF;margin:0 0 24px;">Assumes 7% average annual return, compounded monthly.</p>

                    <!-- Affiliate -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="padding:16px 20px;border-radius:10px;border:1px solid #E8E8E4;">
                          <div style="font-size:11px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Start today</div>
                          <div style="font-size:14px;color:#4A4A5A;line-height:1.5;margin-bottom:12px;">
                            Betterment lets you start with any amount. Set up automatic deposits and forget about it.
                          </div>
                          <a href="https://www.betterment.com/?utm_source=calcrun&utm_medium=email_drip&utm_campaign=day14" style="display:inline-block;padding:10px 20px;background-color:#0B6E6E;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                            Open an account &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border:2px solid #0B6E6E;border-radius:8px;">
                          <a href="https://www.calcrun.com/scenarios/500-per-month-investment-25-years?utm_source=mailerlite&utm_medium=email&utm_campaign=drip_day14" style="display:inline-block;padding:14px 28px;color:#0B6E6E;font-size:14px;font-weight:600;text-decoration:none;">
                            Run your own scenario &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 24px;">
                    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:0;border-top:1px solid #F3F3EF;padding-top:16px;">
                      Some links in our emails are affiliate links — CalcRun may earn a commission at no cost to you.
                      <a href="https://www.calcrun.com/disclosure" style="color:#0B6E6E;text-decoration:underline;">Full disclosure</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:28px 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #E8E8E4;padding-top:20px;">
                    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">
                      <a href="https://www.calcrun.com" style="color:#0B6E6E;text-decoration:none;">CalcRun</a> &middot;
                      <a href="{$unsubscribe}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Emails 5-10 — Content + Affiliate Pairings

Use the **same HTML template structure** as emails 1-4 (logo bar, teal strip card, affiliate card, disclosure, footer). Swap content:

### Email 5 — Day 21: What 1% in fees costs you
**Subject:** What 1% in fees actually costs you
**Content:** $100K invested for 30 years at 7% = $761K. At 6% (after 1% fee) = $574K. That 1% fee costs $187K. Include a table showing fee drag at 0.1%, 0.5%, 1.0%, 1.5%.
**Affiliate:** Betterment (0.25% fee) — "Keep more of your returns"
**CTA:** `/comparisons/index-funds-vs-active-funds`

### Email 6 — Day 30: Monthly money check-in
**Subject:** Your monthly money check-in
**Content:** 3 questions to ask yourself monthly: (1) Did I save what I planned? (2) Has any debt gone up? (3) Am I on track for my goal? Link to net worth calculator.
**Affiliate:** SoFi high-yield savings — "Park your savings where they earn more"
**CTA:** `/tools/income-and-planning/net-worth`

### Email 7 — Day 45: The debt question everyone gets wrong
**Subject:** The debt question everyone gets wrong
**Content:** Snowball vs avalanche — most advice oversimplifies. Snowball wins on motivation, avalanche wins on maths. The real answer depends on your personality.
**Affiliate:** SoFi personal loans — "Consolidate at a lower rate"
**CTA:** `/comparisons/snowball-vs-avalanche-debt`

### Email 8 — Day 60: Your savings vs inflation
**Subject:** Your savings lost purchasing power this year
**Content:** If savings earn 0.5% but inflation is 3%, you lose 2.5%/year in real terms. On $10K that's $250/year in invisible losses.
**Affiliate:** SoFi high-yield savings — "Beat inflation with a better rate"
**CTA:** `/tools/economic/inflation`

### Email 9 — Day 90: 3-month check-in
**Subject:** Quick check-in: how are your numbers looking?
**Content:** Time to re-run your calculations. Rates move, balances shift, goals evolve. 3 calculators to revisit: savings goal, debt payoff, net worth.
**Affiliate:** Betterment — "Automate your investing so you don't have to think about it"
**CTA:** `/tools`

### Email 10 — Day 120: What millionaires do differently
**Subject:** The one thing millionaires do differently
**Content:** It's not a high salary — it's consistency. The median millionaire invests 15-20% of income for 20+ years. Show the maths: $500/mo at 7% for 25yr = $405K. $1,000/mo = $811K.
**Affiliate:** Betterment — "Set it up once, let it grow"
**CTA:** `/scenarios/1000-per-month-for-20-years`

---

## Brand Reference

- **Primary teal:** #0B6E6E (buttons, links, accents)
- **Coral accent:** #E8604C (sparingly for contrast)
- **Background:** #FAFAF8 (off-white)
- **Navy text:** #1A1A2E (headings)
- **Body text:** #4A4A5A
- **Card border:** #E8E8E4
- **Logo:** "Calc" navy + "Run" teal
- **Teal gradient strip:** top of card
- **Corners:** 12px cards, 8px buttons, 10px inner cards

## Notes

- `{$unsubscribe}` is MailerLite's merge tag
- Both Betterment and SoFi appear across the sequence since free-tier can't conditionally target by `calculator_slug`
- Upgrade to Growing Business ($10/mo) for conditional content per calculator type
- All affiliate links include UTM parameters for GA4 attribution
- After Email 10, subscribers stay on list for broadcast campaigns (new tools, seasonal content, etc.)

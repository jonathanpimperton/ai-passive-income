# MailerLite Drip Automation — Setup Guide

Pre-written branded email templates + step-by-step guide for setting up the 2-email drip in MailerLite.

## What the Drip Does

When someone uses "Email my results" on a calculator:
1. **Day 0:** Results email (already sent by MailerSend — not part of this automation)
2. **Day 3:** Educational email — builds trust, no affiliate links
3. **Day 7:** Soft recommendation — affiliate partners with FTC disclosure

## Setup Steps

### 1. Create the Automation
- Log into **app.mailerlite.com**
- Click **Automations** in the left sidebar
- Click **Create automation**

### 2. Set the Trigger
- Choose **"When subscriber joins a group"**
- Select: **Calculator Results**
- Click **Save trigger**

### 3. Add a 3-day Delay
- Click **+** below the trigger → **Delay** → **3 days** → Save

### 4. Add Day 3 Email
- Click **+** → **Email**
- Subject: `The one number that changes everything`
- Preview text: `A quick insight based on your recent calculation`
- Sender: `CalcRun <hello@calcrun.com>`
- Click **Design email** → **HTML editor** → paste Day 3 HTML below

### 5. Add a 4-day Delay
- Click **+** → **Delay** → **4 days** → Save

### 6. Add Day 7 Email
- Click **+** → **Email**
- Subject: `One thing that could help`
- Preview text: `A recommendation based on your numbers`
- Sender: `CalcRun <hello@calcrun.com>`
- Click **Design email** → **HTML editor** → paste Day 7 HTML below

### 7. Activate
- Review: Trigger → 3d delay → Email → 4d delay → Email
- Click **Activate** (top right)

---

## Day 3 — Educational Email (No Affiliates)

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
                    <h1 style="font-size:24px;font-weight:700;color:#1A1A2E;margin:0 0 20px;line-height:1.3;letter-spacing:-0.02em;">The one number most people ignore</h1>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 16px;">
                      You ran some numbers on CalcRun recently. Here's something most people miss:
                    </p>

                    <p style="font-size:15px;color:#1A1A2E;line-height:1.65;margin:0 0 20px;font-weight:600;">
                      Time is the most powerful variable in any financial equation.
                    </p>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 24px;">
                      Whether you're calculating mortgage payments, investment returns, or debt payoff — the timeline changes everything. A small difference in when you start has a bigger impact than almost any other factor.
                    </p>

                    <!-- Insight card -->
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
                      Whatever you're calculating — the numbers get better the sooner you act on them. The best time was years ago. The second best time is today.
                    </p>

                    <!-- CTA button -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#0B6E6E;border-radius:8px;">
                          <a href="https://www.calcrun.com/tools?utm_source=mailerlite&utm_medium=email&utm_campaign=drip_day3" style="display:inline-block;padding:14px 28px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                            Run your numbers again &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #E8E8E4;padding-top:20px;">
                    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">
                      You're receiving this because you used "Email my results" on
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

## Day 7 — Affiliate Recommendation Email

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
                  <td style="padding:36px 32px 20px;">
                    <h1 style="font-size:24px;font-weight:700;color:#1A1A2E;margin:0 0 20px;line-height:1.3;letter-spacing:-0.02em;">One thing that could help</h1>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 16px;">
                      Last week you ran some numbers on CalcRun. Running the numbers is the first step — the real value comes from acting on what you learned.
                    </p>

                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 28px;">
                      Based on the kind of calculation you ran, here are two tools worth knowing about:
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
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
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
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <div style="display:inline-block;padding:3px 10px;background-color:#F0FDFA;border-radius:20px;font-size:10px;font-weight:700;color:#0B6E6E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Banking</div>
                                <div style="font-size:18px;font-weight:700;color:#1A1A2E;margin-bottom:6px;">SoFi</div>
                                <div style="font-size:14px;color:#4A4A5A;line-height:1.5;margin-bottom:16px;">
                                  High-yield savings, personal loans, and debt consolidation in one app. Competitive APY with no account fees — useful whether you're saving or paying down debt.
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
                  </td>
                </tr>
              </table>

              <!-- Closing text + CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 32px 32px;">
                    <p style="font-size:15px;color:#4A4A5A;line-height:1.65;margin:0 0 24px;">
                      Small, consistent actions — investing $100/month, paying an extra $50 on your mortgage, building your emergency fund — add up to life-changing results over time.
                    </p>

                    <!-- Secondary CTA -->
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

              <!-- Affiliate disclosure -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 24px;">
                    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:0;border-top:1px solid #F3F3EF;padding-top:16px;">
                      The recommendations above are affiliate links — CalcRun may earn a commission at no cost to you. We only recommend services we'd use ourselves.
                      <a href="https://www.calcrun.com/disclosure" style="color:#0B6E6E;text-decoration:underline;">Full disclosure</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #E8E8E4;padding-top:20px;">
                    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;text-align:center;">
                      You're receiving this because you used "Email my results" on
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

## Brand Reference

These emails use CalcRun's exact brand tokens:
- **Primary teal:** #0B6E6E (buttons, links, accents)
- **Coral accent:** #E8604C (used sparingly for contrast/emphasis)
- **Background:** #FAFAF8 (off-white, matches site bg)
- **Navy text:** #1A1A2E (headings)
- **Body text:** #4A4A5A (readable dark gray)
- **Card border:** #E8E8E4 (subtle neutral)
- **Logo:** CalcRun wordmark with "Calc" in navy, "Run" in teal
- **Teal gradient strip:** top of card (matches site's header accents)
- **Rounded corners:** 12px cards, 8px buttons, 10px inner cards
- **Category pills:** teal on light teal bg, rounded full

## Notes

- `{$unsubscribe}` is MailerLite's merge tag — auto-generates the unsubscribe URL
- Both partners (Betterment, SoFi) are in Day 7 because free-tier MailerLite can't conditionally show content per `calculator_slug`. Most users will find one relevant.
- Upgrade to Growing Business ($10/mo) for conditional content blocks by calculator type
- All affiliate links include UTM parameters for GA4 attribution
- Free tier: 1,000 subscribers, 12,000 emails/month (more than enough for early stage)

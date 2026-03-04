---
name: "Password Generator"
slug: "password-generator"
category: "utility"
description: "Generate strong, random passwords with customizable options."
keywords:
  - "password generator"
  - "random password generator"
  - "strong password generator"
  - "secure password"
  - "password creator"
relatedTools:
  - "qr-code"
  - "json-formatter"
  - "savings-goal"
  - "salary-us"
affiliateContext: "Store your passwords securely with a password manager"
affiliatePrograms:
  - "NordPass"
faq:
  - question: "What makes a strong password?"
    answer: "A strong password is at least 12-16 characters long and includes a mix of uppercase letters, lowercase letters, numbers, and special characters. Length matters more than complexity — a 20-character passphrase like 'correct-horse-battery-staple' is stronger than a short complex password like 'P@s5w0rd'. Our generator creates passwords that meet all modern security standards."
  - question: "How long should my password be?"
    answer: "At minimum 12 characters, but 16+ is recommended. An 8-character password with all character types can be cracked in about 8 hours with modern hardware. A 12-character password takes roughly 3,000 years. A 16-character password is essentially uncrackable with current technology. Every additional character multiplies the difficulty exponentially."
  - question: "Is it safe to use an online password generator?"
    answer: "Our password generator runs entirely in your browser — passwords are generated client-side using JavaScript's cryptographic random number generator (crypto.getRandomValues). No passwords are sent to our servers, stored, or logged. For maximum security, you can verify this by checking the page source code or using the tool while disconnected from the internet."
  - question: "Should I use a password manager?"
    answer: "Absolutely. The average person has 100+ online accounts. A password manager stores all your passwords securely behind one master password, generates unique passwords for each site, and auto-fills them. This means you only need to remember one strong password. The risk of reusing passwords across sites far outweighs the risks of using a reputable password manager."
  - question: "How often should I change my passwords?"
    answer: "NIST (the National Institute of Standards and Technology) no longer recommends regular password rotation unless there's evidence of a breach. Forcing frequent changes leads to weaker passwords (people just increment a number). Instead, use unique, strong passwords for each account and change them only when a service reports a data breach."
workedExamples:
  - title: "Creating a strong master password"
    inputs:
      length: 20
      characters: "uppercase, lowercase, numbers, symbols"
    description: "A password manager master password needs to be exceptionally strong — it protects all your other passwords. Generate a 20+ character password with all character types enabled. A 20-character password with this complexity has over 130 bits of entropy, making it virtually uncrackable. Store your master password in a secure physical location as a backup."
  - title: "Wi-Fi network password"
    inputs:
      length: 16
      characters: "uppercase, lowercase, numbers"
    description: "For a home Wi-Fi password you'll share with guests, use 16 characters with letters and numbers but no symbols — symbols can be difficult to type on smart TVs and IoT devices. This still provides over 95 bits of entropy, which is more than sufficient for WPA2/WPA3 protection."
  - title: "API key or service token"
    inputs:
      length: 32
      characters: "uppercase, lowercase, numbers"
    description: "API keys and service tokens are never typed manually, so length is free. Use 32+ characters with alphanumeric characters for compatibility across systems (many APIs reject special characters). At 32 characters with upper/lowercase and numbers, you get approximately 190 bits of entropy — far beyond any brute-force capability."
---

## Why Password Strength Matters

Weak passwords are the leading cause of account breaches. According to security research, over 80% of hacking-related breaches involve stolen or weak credentials. The problem isn't that attackers are geniuses — it's that common passwords are trivially easy to crack.

Modern password-cracking hardware can test billions of combinations per second. An 8-character password using all character types can be brute-forced in about 8 hours. Bump that to 12 characters and it takes roughly 3,000 years. At 16 characters, it's effectively uncrackable with current technology.

> **Key takeaway:** Every character you add to a password multiplies the cracking time exponentially. Going from 8 to 16 characters isn't twice as strong — it's billions of times stronger.

## How This Generator Works

Our password generator runs entirely in your browser using JavaScript's `crypto.getRandomValues()` — a cryptographically secure random number generator built into every modern browser. This is the same randomness source used by security-critical applications.

No passwords are sent to our servers, stored, or logged. You can verify this by using the tool while disconnected from the internet — it works identically offline.

> **Tip:** Want to be absolutely sure? Disconnect from the internet before generating a password. The tool works entirely offline because all the computation happens in your browser.

## Password Strength: What the Numbers Mean

Password strength is measured in **bits of entropy** — the number of binary decisions needed to guess the password. More entropy = harder to crack.

| Entropy (bits) | Strength | What it means |
|---|---|---|
| 40–50 | Weak | Crackable with consumer hardware |
| 60–70 | Moderate | Resists casual attacks but not determined ones |
| 80–90 | Strong | Sufficient for most online accounts |
| 100+ | Very strong | Suitable for master passwords, encryption keys, and high-security accounts |

Each additional character type (uppercase, lowercase, numbers, symbols) and each additional character of length increases entropy. Length has a bigger impact than complexity — a 20-character alphanumeric password is stronger than a 10-character password with all character types.

> **Example:** A 10-character password using uppercase, lowercase, numbers, and symbols has about 65 bits of entropy (moderate). A 20-character password using only lowercase letters has about 94 bits (strong). Length wins.

## Best Practices

- **Use a unique password for every account.** If one service is breached, reused passwords let attackers access all your accounts.
- **Use a password manager.** It generates, stores, and auto-fills unique passwords for every site. You only remember one master password.
- **Don't change passwords on a schedule.** NIST recommends changing passwords only after a confirmed breach, not routinely. Forced rotation leads to weaker passwords.
- **Enable two-factor authentication (2FA) wherever possible.** Even if your password is compromised, 2FA provides a second layer of protection.

> **Key takeaway:** A strong unique password plus 2FA on every account is the single most effective thing you can do for your online security. A password manager makes this effortless.

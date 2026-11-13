---
title: "Car loan: {{ loanPayment(50000, 7, 4) | usd }} a month"
slug: "good"
inputs:
  Loan: "$50,000"
  Tax year: "{{ taxYear('uk') }}"
---

**Total interest: {{ loanTotalInterest(50000, 7, 4) | usd }}**

| Term | Payment |
|---|---|
| 4 years | {{ loanPayment(50000, 7, 4) | usd }} |

---
name: "QR Code Generator"
slug: "qr-code"
category: "utility"
description: "Create QR codes for URLs, text, Wi-Fi, email, and more. Download as PNG or SVG in any size — free, instant, no signup, no watermarks."
keywords:
  - "QR code generator"
  - "free QR code generator"
  - "create QR code"
  - "QR code maker"
  - "QR code for URL"
relatedTools:
  - "password-generator"
  - "json-formatter"
  - "savings-goal"
  - "salary-us"
faq:
  - question: "What is a QR code?"
    answer: "A QR (Quick Response) code is a two-dimensional barcode that stores data like URLs, text, contact info, or Wi-Fi credentials. When scanned with a smartphone camera, it instantly opens the encoded content. QR codes were invented in 1994 by Denso Wave for tracking automotive parts and are now used everywhere from restaurant menus to payment systems."
  - question: "Are QR codes free to create and use?"
    answer: "Yes. QR codes are an open standard — there are no licensing fees to create or scan them. Our generator is completely free with no watermarks, no signup, and no limits. Be cautious of services that charge monthly fees for 'dynamic' QR codes — for most use cases, a standard (static) QR code works perfectly."
  - question: "What is the difference between static and dynamic QR codes?"
    answer: "A static QR code has data permanently encoded — the destination can't be changed after creation. A dynamic QR code redirects through a short URL that can be updated later. Static codes are free, work forever, and don't depend on any service staying online. Dynamic codes require a paid service and stop working if that service shuts down."
  - question: "What size should my QR code be for printing?"
    answer: "The minimum recommended print size is 2cm x 2cm (about 0.8 x 0.8 inches) for close-range scanning (menus, business cards). For posters or signs scanned from a distance, use at least 10cm x 10cm. A general rule: the QR code should be at least 1/10th of the scanning distance. For a poster viewed from 3 feet away, make the code at least 3.6 inches."
  - question: "Can QR codes expire?"
    answer: "Static QR codes never expire — the data is encoded directly in the image. However, the content they link to can become unavailable. If a QR code points to a URL that goes offline, the code still works (it opens the URL) but the destination won't load. Always point QR codes to URLs you control and plan to maintain."
workedExamples:
  - title: "Restaurant menu QR code"
    inputs:
      type: "URL"
      content: "https://myrestaurant.com/menu"
      size: 300
      errorCorrection: "H"
    description: "A restaurant creates a QR code linking to their online menu. Using high error correction (H) is recommended since printed codes may get smudged or damaged. At 300px, the code prints clearly on table tents or at the bottom of paper menus. The static code never expires and works even if scanned from an angle."
  - title: "Wi-Fi sharing at an event"
    inputs:
      type: "Wi-Fi"
      content: "SSID:ConferenceWiFi;Password:welcome2026;"
      size: 500
      errorCorrection: "M"
    description: "Event organizers create a large QR code for the venue Wi-Fi. When attendees scan it, their phone automatically connects — no typing long passwords. At 500px and medium error correction, the code is scannable from several feet away on a projected slide or printed poster."
  - title: "Business card contact sharing"
    inputs:
      type: "Text"
      content: "BEGIN:VCARD\nFN:Jane Smith\nTEL:+15551234567\nEMAIL:jane@example.com\nEND:VCARD"
      size: 200
      errorCorrection: "M"
    description: "A vCard QR code on a business card lets contacts save your details with one scan. At 200px it fits neatly in a corner of a standard business card. When scanned, the phone prompts the user to save the contact — no manual typing of phone numbers or email addresses."
---

Educational content will be added during Sprint 4.

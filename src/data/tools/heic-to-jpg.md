---
name: "HEIC to JPG Converter"
slug: "heic-to-jpg"
category: "file-tools"
description: "Convert iPhone HEIC photos to JPG privately — files never leave your device. Free, no signup, batch support."
keywords:
  - "HEIC to JPG converter"
  - "convert HEIC to JPG"
  - "HEIC to PNG"
  - "iPhone photo converter"
  - "HEIC converter no upload"
  - "convert HEIC to JPG privately"
relatedTools:
  - "image-compressor"
  - "image-format-converter"
  - "image-resizer"
  - "images-to-pdf"
affiliateContext: "Keep your files and browsing private"
affiliatePrograms:
  - "NordVPN"
  - "NordPass"
workedExamples:
  - title: "Vacation photos for Windows laptop"
    inputs:
      quality: 85
    description: "A traveler returns from vacation with 200 HEIC photos on their iPhone. Their Windows laptop can't open any of them. Batch converting at 85% quality produces JPGs that open everywhere — each around 2-3MB compared to the 1.5MB HEIC originals. The slight size increase is worth universal compatibility."
  - title: "Real estate listing photos"
    inputs:
      quality: 92
    description: "A real estate agent photographs 30 rooms on their iPhone for an MLS listing. The listing system only accepts JPG. Converting at 92% quality preserves the sharp detail needed for property photos while producing files that upload instantly to the listing platform."
  - title: "Family photos for printing"
    inputs:
      quality: 95
    description: "A parent converts 50 HEIC photos from a birthday party to JPG at 95% quality for uploading to a print service. The high quality setting preserves detail for 4×6 and 8×10 prints. The print service accepts all files without issues."
faq:
  - question: "What is HEIC format?"
    answer: "HEIC (High Efficiency Image Container) is the default photo format on iPhones since iOS 11 (2017). It uses the HEIF standard to store images at roughly half the file size of JPG with the same visual quality. Apple chose it to save storage space on iPhones. The downside: Windows, Android, and many websites don't natively support HEIC."
  - question: "Why can't I open HEIC files on my computer?"
    answer: "Windows doesn't natively support HEIC without installing the HEIF Image Extension from the Microsoft Store (free, but requires a codec from Qualcomm). Many web browsers, email clients, and social media platforms also can't display HEIC files. Converting to JPG solves all compatibility issues."
  - question: "Is it safe to convert HEIC files online?"
    answer: "With CalcRun, yes — your photos never leave your device. The conversion happens entirely in your browser. Most other HEIC converters upload your personal photos to remote servers for processing, which is a significant privacy concern — especially for family photos, sensitive documents, or anything you wouldn't want a third party to see."
  - question: "Can I convert HEIC photos on an iPhone directly?"
    answer: "Yes, but it's not straightforward. You can change Settings > Camera > Formats to 'Most Compatible' to save new photos as JPG, but this doesn't convert existing HEIC photos. To convert existing photos, you can share them via email (iOS auto-converts to JPG) or use this tool from your iPhone's browser."
  - question: "Will converting HEIC to JPG reduce quality?"
    answer: "There is a minimal quality reduction because HEIC uses a different compression algorithm than JPG. At 85-90% JPG quality, the difference is virtually invisible. The converted JPG may be slightly larger than the HEIC original because JPG compression is less efficient, but the universal compatibility makes it worth the trade-off."
---

## The HEIC Problem

If you've ever tried to share an iPhone photo on a Windows PC, upload one to an older website, or email one to someone on Android, you've likely encountered the HEIC compatibility problem. Apple's default photo format produces great quality at small file sizes, but most of the non-Apple world doesn't support it.

## Why Privacy Matters for Photo Conversion

Your photos are personal. Family vacations, financial documents, medical records photographed for reference — these aren't files you should be uploading to random servers on the internet.

Most online HEIC converters work by uploading your photos to their servers, converting them, and sending back the result. Even if they promise to delete the files, you have no way to verify that.

**CalcRun is different.** All conversion happens in your browser using the Canvas API and, when needed, a WASM-based decoder. Your photos never leave your device — not even for a moment.

## How It Works

1. **Drop your HEIC files** into the upload area (or click to browse)
2. **Your browser decodes the HEIC data** using native support (Safari, Chrome 128+) or a WASM fallback
3. **The image is re-encoded as JPG** at your chosen quality level
4. **Download the result** — the JPG works everywhere

## Browser Compatibility

| Browser | HEIC Support |
|---------|-------------|
| Safari (macOS/iOS) | Native — fastest conversion |
| Chrome 128+ | Native support added in 2024 |
| Firefox | Uses WASM fallback (slightly slower) |
| Edge | Uses WASM fallback |

All modern browsers work — Safari and recent Chrome are fastest because they decode HEIC natively.

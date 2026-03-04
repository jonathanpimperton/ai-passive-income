---
name: "PDF to Image Converter"
slug: "pdf-to-image"
category: "file-tools"
description: "Convert PDF pages to JPG or PNG images in your browser."
keywords:
  - "PDF to JPG"
  - "PDF to PNG"
  - "PDF to image"
  - "convert PDF to image online"
  - "PDF to JPG converter free"
relatedTools:
  - "pdf-merge"
  - "pdf-split"
  - "pdf-compress"
  - "image-compressor"
  - "image-format-converter"
workedExamples:
  - title: "Extracting charts for a presentation"
    inputs:
      scale: 3
      format: "PNG"
    description: "A marketing analyst needs charts from a PDF report for a slide deck. At 3× scale and PNG format, each page becomes a crisp, high-resolution image that looks sharp on any projector or screen."
  - title: "Creating social media images from a flyer"
    inputs:
      scale: 2
      format: "JPG"
    description: "A small business owner has a PDF flyer and wants to share it on Instagram and Facebook. Converting to JPG at 2× scale produces images that are the right format and size for social media platforms."
  - title: "Archiving receipts as images"
    inputs:
      scale: 1.5
      format: "JPG"
      quality: 80
    description: "A freelancer converts 20 expense receipt PDFs to JPG images for their accounting app that only accepts image uploads. At 1.5× scale and 80% JPG quality, each receipt is clear and under 200KB."
faq:
  - question: "What's the difference between JPG and PNG output?"
    answer: "JPG produces smaller files and is best for photos and pages with lots of colors. PNG produces larger files but supports transparency and is better for text-heavy pages, diagrams, and graphics with sharp edges."
  - question: "What does the scale setting do?"
    answer: "Scale controls the resolution of the output images. 1× matches the PDF's default resolution (usually 72 DPI). 2× doubles it to 144 DPI (good for screens). 3-4× gives print-quality resolution. Higher scale = larger files."
  - question: "Can I convert specific pages instead of all pages?"
    answer: "Currently, the tool converts all pages. For specific pages, use our PDF Split tool first to extract the pages you need, then convert those to images."
  - question: "Why are some pages blank or missing text?"
    answer: "Some PDFs use custom fonts that may not render perfectly in the browser. If a page appears blank, the PDF may be using embedded fonts that the browser can't access. Most standard PDFs convert without issues."
  - question: "Is there a page limit?"
    answer: "No hard limit. The tool handles large PDFs, but converting many pages at high scale (3-4×) requires significant memory. For PDFs with 50+ pages, consider using 1-2× scale to keep memory usage manageable."
---

## Why Convert PDF to Images?

Many platforms don't accept PDFs — social media, some messaging apps, image galleries, and certain business tools only work with JPG or PNG files. Converting PDF pages to images makes them universally shareable.

## How It Works

1. Upload a PDF file
2. Choose output format (JPG or PNG) and scale
3. Click convert — each page is rendered to a high-quality image
4. Download individual pages or all at once

All rendering happens in your browser using PDF.js and the Canvas API.

## Choosing the Right Settings

| Setting | Recommendation |
|---------|---------------|
| **Social media sharing** | JPG, 2× scale, 85% quality |
| **Presentations** | PNG, 3× scale |
| **Web/email** | JPG, 1.5× scale, 80% quality |
| **Print** | PNG, 4× scale |
| **Quick preview** | JPG, 1× scale, 70% quality |

## Tips

- **JPG for photos**, PNG for text and graphics. When in doubt, JPG produces smaller files.
- **Higher scale = more memory**. If your browser slows down, try reducing the scale.
- **Batch download**: The "Download all" button saves each page separately, named by page number.

---
name: "Images to PDF"
slug: "images-to-pdf"
category: "file-tools"
description: "Combine multiple images into a single PDF. Reorder pages, set margins and orientation — free, private, no upload."
keywords:
  - "JPG to PDF"
  - "PNG to PDF"
  - "combine images to PDF"
  - "image to PDF converter"
  - "images to PDF no upload"
  - "merge images into PDF"
relatedTools:
  - "image-compressor"
  - "image-resizer"
  - "image-format-converter"
  - "svg-to-png"
affiliateContext: "Protect your privacy when creating PDFs"
affiliatePrograms:
  - "NordVPN"
  - "NordPass"
workedExamples:
  - title: "Scanned document for submission"
    inputs:
      pageSize: "a4"
      orientation: "portrait"
      fitMode: "fit"
      margin: 10
    description: "A student photographs 8 pages of a handwritten assignment with their phone. Combining them into a single A4 portrait PDF with 10mm margins creates a clean document for online submission. Each photo becomes one page, centered with consistent margins."
  - title: "Photo portfolio for client"
    inputs:
      pageSize: "letter"
      orientation: "landscape"
      fitMode: "fill"
      margin: 0
    description: "A photographer creates a portfolio of 20 landscape photos on US Letter paper with no margins and Fill mode. Each photo fills the entire page for maximum impact. The resulting PDF is ready for email or print at a copy shop."
  - title: "Expense report with receipts"
    inputs:
      pageSize: "a4"
      orientation: "portrait"
      fitMode: "fit"
      margin: 15
    description: "An employee photographs 12 receipts from a business trip and combines them into a single PDF. Using Fit mode with 15mm margins ensures each receipt is fully visible regardless of photo angle. The single file is easy to attach to an expense claim."
faq:
  - question: "How many images can I combine into one PDF?"
    answer: "There's no hard limit — it depends on your device's memory. Most devices can handle 50-100 images without issues. Each image becomes one page in the PDF. For very large batches (100+ high-resolution images), you may experience slower processing on older devices."
  - question: "What page sizes are supported?"
    answer: "A4 (210 × 297mm, standard worldwide) and US Letter (8.5 × 11 inches, standard in North America). Both support portrait and landscape orientation. The tool automatically centers images on the page with your chosen margin."
  - question: "What does 'Fit' vs 'Fill' vs 'Stretch' mean?"
    answer: "Fit: The image is scaled to fit entirely within the page margins, maintaining its aspect ratio. There may be white space on the sides. Fill: The image is scaled to fill the entire page area, maintaining aspect ratio but potentially cropping edges. Stretch: The image is stretched to fill the entire page, which may distort the image if its aspect ratio doesn't match the page."
  - question: "Can I reorder the pages?"
    answer: "Yes — use the arrow controls next to each image to move it up or down in the list. The order you see is the order they'll appear in the PDF. You can also remove individual images or clear all and start over."
  - question: "Is the PDF quality good enough for printing?"
    answer: "Yes, if your source images are high resolution. The tool uses 92% JPEG quality when encoding images into the PDF. For best print results, use source images with at least 300 pixels per inch at the final print size. For example, for a full A4 page, your image should be at least 2480 × 3508 pixels."
---

## When to Combine Images into PDF

Common use cases:

- **Scanning documents**: Photographed or scanned pages that need to be combined into a single document
- **Photo portfolios**: Creating a single PDF of your photography work for sharing or printing
- **School assignments**: Combining handwritten pages or worksheets into one file for submission
- **Receipts and records**: Merging multiple receipt photos into one PDF for expense reports

## How It Works

This tool uses jsPDF to generate PDFs entirely in your browser. No images are uploaded to any server.

1. **Upload images** — drag and drop or click to browse (JPG, PNG, WebP supported)
2. **Arrange order** — move images up or down to set page order
3. **Configure settings** — choose page size, orientation, image fit mode, and margins
4. **Download PDF** — click to generate and save the PDF file

Each image becomes one page in the output PDF.

## Settings Guide

### Page Size
- **A4** (210 × 297mm): Standard paper size used in most countries
- **Letter** (8.5 × 11"): Standard paper size in the US and Canada

### Orientation
- **Portrait**: Taller than wide — best for documents, photos in portrait mode
- **Landscape**: Wider than tall — best for panoramic photos, presentations

### Image Fit
- **Fit**: Image fits entirely within margins, maintaining proportions. Best for documents.
- **Fill**: Image fills the page, maintaining proportions but potentially cropping edges. Best for photos.
- **Stretch**: Image fills the page completely, potentially distorting. Rarely recommended.

### Margin
Adjustable from 0mm (full bleed) to 30mm. Default is 10mm, which provides a clean border that also keeps content within most printers' printable area.

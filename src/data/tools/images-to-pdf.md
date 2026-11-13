---
name: "Images to PDF"
slug: "images-to-pdf"
category: "file-tools"
description: "JPG to PDF and PNG to PDF converter — combine multiple images into one PDF, reorder pages, and set margins in your browser."
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
workedExamples:
  - title: "Scanned document for submission"
    inputs:
      pageSize: "a4"
      orientation: "portrait"
      fitMode: "fit"
      margin: 10
      imageQuality: "Medium"
    description: "A student photographs 8 pages of a handwritten assignment with their phone. Combining them into a single A4 portrait PDF with 10mm margins creates a clean document for online submission. The Medium quality setting keeps the handwriting sharp while keeping the PDF small enough for a portal upload limit."
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
    answer: "Yes, if your source images are high resolution. Choose 'High' (images up to 2400 pixels on the long side, 85% JPEG quality) or 'Original size' (full resolution, 92% quality) for printing. For best print results, use source images with at least 300 pixels per inch at the final print size; a full A4 page needs about 2480 × 3508 pixels."
  - question: "How do I make the PDF smaller for an upload limit?"
    answer: "Use the 'Image quality and file size' setting. Medium (1600 pixels, 75%) and Small (1100 pixels, 65%) shrink phone photos a lot while staying readable. The tool shows the final file size after saving, so you can step down a setting if it is still too big."
  - question: "What happens to transparent PNG images?"
    answer: "Transparent areas are placed on a white page background, so logos and screenshots with transparency look as expected instead of turning black."
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
2. **Arrange order** — move images up or down with the arrow buttons to set page order
3. **Configure settings** — choose page size, orientation, image fit, margins, image quality and the file name
4. **Download PDF** — click to generate and save the PDF file; its size is shown afterwards

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

### Image quality and file size
- **Original size**: full resolution, largest file
- **High** (default): up to 2400 pixels, good for printing
- **Medium**: up to 1600 pixels, good for email and upload portals
- **Small**: up to 1100 pixels, smallest file

---
name: "PDF Compress"
slug: "pdf-compress"
category: "file-tools"
description: "Compress PDF files in your browser — reduce PDF file size by optimizing embedded images. Your files never leave your device."
keywords:
  - "compress PDF online"
  - "reduce PDF file size"
  - "PDF compressor"
  - "shrink PDF"
  - "compress PDF without uploading"
relatedTools:
  - "pdf-merge"
  - "pdf-split"
  - "image-compressor"
  - "pdf-to-image"
workedExamples:
  - title: "Email attachment under 10MB"
    inputs:
      quality: 70
    description: "A realtor has a 25MB property listing PDF full of high-resolution photos. At 70% quality, it compresses to 8MB — under the 10MB email attachment limit. The photos still look great on screen."
  - title: "Uploading to a government portal"
    inputs:
      quality: 60
    description: "A business owner needs to submit an 18MB scanned tax document to a portal with a 5MB limit. At 60% quality and a 1500px maximum image resolution, the scans shrink to about 4MB, while the text stays selectable and the form fields keep working."
  - title: "Archiving project documents"
    inputs:
      quality: 50
    description: "A project manager archives a dozen photo-heavy project PDFs of up to 40MB each, compressing them one at a time. At 50% quality most shrink by well over half, keeping the photos readable for reference. Text-only reports barely change, because they have no images to recompress."
faq:
  - question: "How does PDF compression work?"
    answer: "The tool finds the photos and other raster images embedded in the PDF (JPEG and PNG-style images), re-encodes them as JPEG at your chosen quality, downsizes any larger than your maximum resolution, and swaps them into the same place in the file. Text, fonts, vector graphics, links and form fields are not touched. If the result would not be smaller than your original, nothing is offered for download."
  - question: "Will compressed PDFs still be readable?"
    answer: "Yes. At 70-80% quality, most people cannot tell the difference from the original. Text remains clear and images look good on screen. Below 50%, you may notice some blurriness in photos, but text is still readable."
  - question: "Why didn't my PDF get smaller?"
    answer: "Only embedded images are compressed, so text-only PDFs have little to gain. Images that are already compressed further than your settings are left as they are, and so are CMYK images (to avoid colour shifts), JPEG 2000 and black-and-white fax/JBIG2 images, and transparency masks. The result screen says how many images were recompressed and why the others were skipped. Try a lower quality or resolution for image-heavy files."
  - question: "Does compression affect text searchability?"
    answer: "No. Text is not converted to images, so it stays selectable and searchable, and links and form fields keep working. Only the embedded pictures change."
  - question: "What's the best quality setting?"
    answer: "For sharing via email: 60-70%. For web uploads: 50-70%. For archival (where you want reasonable quality): 75-85%. For maximum compression regardless of quality: 30-50%. Lowering the maximum image resolution (for example to 1200-1500px) often saves more than lowering quality, because scans are usually far larger than any screen."
  - question: "Can I compress a password-protected or restricted PDF?"
    answer: "No. Encrypted PDFs, including bank statements that open without a password but block editing, cannot be rewritten safely in a browser, and doing so would produce a broken file. The tool refuses them and explains the workaround: open the PDF, choose Print, select 'Save as PDF' (or 'Microsoft Print to PDF'), and compress the new copy."
---

## Why Compress PDFs?

PDFs with embedded images can balloon to tens of megabytes. Email services typically cap attachments at 10-25MB, web portals have upload limits, and large files waste storage. Compression makes PDFs practical to share and store.

## How It Works

1. Upload a PDF file
2. Adjust the quality slider (lower = smaller file)
3. Click "Compress PDF" — your browser recompresses the embedded images and saves a new copy
4. Download the compressed result

Everything happens locally. No files are uploaded anywhere.

## Quality Guide

Typical results for photo-heavy PDFs (text-only PDFs change little):

| Quality | File Size Reduction | Visual Quality | Best For |
|---------|-------------------|----------------|----------|
| 80-95% | 20-40% smaller | Near-identical | High-quality sharing |
| 60-75% | 40-65% smaller | Good for screen | Email, web uploads |
| 40-55% | 60-80% smaller | Acceptable | Maximum compression |
| 20-35% | 75-90% smaller | Noticeable loss | Thumbnails, quick reference |

## Limitations

- **Text-heavy PDFs** with few images won't compress much since there's little image data to optimize.
- **Some images are left unchanged**: CMYK, JPEG 2000, JBIG2/fax and mask images, to avoid colour shifts or damage.
- **Encrypted PDFs are not supported** (see the FAQ for the print-to-PDF workaround).
- **Files up to 50MB**; very large PDFs (100+ pages) may take 30-60 seconds to process in your browser.

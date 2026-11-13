---
name: "Image Compressor"
slug: "image-compressor"
category: "file-tools"
description: "Image compressor for JPG, PNG, and WebP — reduce image file size while keeping visible quality. Files never leave your device."
keywords:
  - "compress image online"
  - "image compressor"
  - "reduce image size"
  - "compress JPG"
  - "compress PNG without losing quality"
  - "compress image without uploading"
relatedTools:
  - "image-resizer"
  - "image-format-converter"
  - "svg-to-png"
  - "images-to-pdf"
affiliatePrograms: []
workedExamples:
  - title: "Product photos for an online store"
    inputs:
      quality: 80
      maxWidth: 1920
    description: "An e-commerce seller has 30 product photos averaging 8MB each (240MB total). At 80% quality with a 1920px max width, each image drops to 200-400KB — a 95% reduction. Total upload time goes from 20 minutes on slow WiFi to under 2 minutes, and pages load 5× faster for customers."
  - title: "Wedding photos for email sharing"
    inputs:
      quality: 85
      maxWidth: 2400
    description: "A photographer needs to email 50 wedding photos to clients. The originals are 12MP (6MB each, 300MB total). At 85% quality and 2400px width, each file becomes 500KB-1MB. The entire batch fits in a single email without quality loss visible on screens."
  - title: "Blog header images"
    inputs:
      quality: 70
      maxWidth: 1200
    description: "A blogger prepares images for WordPress posts. Original photos are 4000px wide at 5MB each. At 70% quality and 1200px max width, each compresses to 80-150KB — small enough for fast page loads while still looking crisp on all screens including Retina displays."
faq:
  - question: "How does image compression work?"
    answer: "Image compression reduces file size by removing redundant data. Lossy compression (like JPG and WebP) discards some visual information that's hard for the human eye to notice, achieving much smaller files. Lossless compression (like PNG) reorganizes data without losing any quality, but achieves less size reduction. Our compressor keeps each image's format by default: JPG and WebP are re-encoded at the quality you choose, and PNG is optimised losslessly, with optional reduction to 256 colours when the difference would not be visible."
  - question: "Will compressing my images reduce their quality?"
    answer: "At quality settings above 70%, most people can't tell the difference between the original and compressed image. At 80-90% quality, the visual difference is negligible while file sizes can drop by 50-80%. Below 50% quality, compression artifacts (blurriness, banding) become more noticeable."
  - question: "Is it safe to compress images online?"
    answer: "With CalcRun, yes — your files never leave your device. All compression happens in your browser using the Canvas API. No images are uploaded to any server. Most other online compressors upload your files to their servers for processing, which is a privacy concern for sensitive images."
  - question: "What's the difference between JPG, PNG, and WebP compression?"
    answer: "JPG is best for photos and complex images — it compresses well but doesn't support transparency. PNG is best for graphics, logos, and images needing transparency — larger files but lossless. WebP offers the best of both worlds with smaller files than JPG and transparency support, but some older browsers don't support it."
  - question: "Why did an image come back the same size?"
    answer: "If re-encoding would not make a file smaller (for example a JPG that is already heavily compressed, or a PNG that is already optimised), the tool keeps your original image data and labels it 'original kept' rather than giving you a bigger file. Its metadata is still removed (location and camera details; the date taken stays only if you ask for it), and a photo's rotation flag is kept so it does not turn sideways. Lower the quality, set a max width, or choose a different output format to go smaller."
  - question: "Will it change my image's format?"
    answer: "Only if you ask it to. 'Same as original' is the default, so a PNG stays a PNG and keeps its transparency. You can choose JPG (smallest for photos, but transparent areas become white), WebP (small and keeps transparency) or PNG instead. Safari cannot create WebP files, so on Safari a WebP choice is saved as PNG and the tool tells you."
  - question: "How much can I reduce an image's file size?"
    answer: "Typical compression results: a 5MB photo at 80% quality often compresses to 500KB-1MB (80-90% reduction). Results vary based on image content — photos with lots of detail compress less than simple graphics. Adding a max-width resize (e.g., 1920px for web use) can reduce file sizes even further."
---

## Why Compress Images?

Large image files slow down websites, eat through mobile data, and take forever to upload or email. A single uncompressed photo from a modern smartphone can be 5-15MB — far more than needed for web use, social media, or email attachments.

## How Our Compressor Works

This tool uses your browser's built-in image decoder and Canvas API, plus a built-in PNG optimiser. The entire process happens locally on your device:

1. You drop or select images
2. Your browser decodes the image pixels (photos are rotated upright using their orientation tag)
3. JPG and WebP are re-encoded at your chosen quality; PNG is optimised losslessly, or reduced to 256 colours when that stays visually identical at your quality setting
4. If the result is not smaller, your original image data is kept (with its metadata removed)
5. You download each result, or all of them as one ZIP file

Change the quality, width or format afterwards and the images are re-compressed automatically. Location (GPS) data is always removed; the date a photo was taken can be kept for JPG output. A JPG that is returned as the original keeps only its rotation flag, so it still displays the right way up.

No data leaves your computer at any point.

## Choosing the Right Quality

Typical reductions for photos saved as JPG or WebP (PNG graphics vary more):

| Quality Setting | Best For | Typical Size Reduction |
|----------------|----------|----------------------|
| 90-100% | Print, archival | 10-30% smaller |
| 70-85% | Web, social media | 50-80% smaller |
| 40-65% | Thumbnails, previews | 80-95% smaller |
| 10-35% | Extreme compression | 90-98% smaller |

For most web use, **80% quality** is the sweet spot — visually indistinguishable from the original while dramatically reducing file size.

## Tips for Better Compression

- **Resize first**: If your image is 4000px wide but will display at 800px, resize it down before compressing. Fewer pixels = smaller file.
- **Use the right format**: Photos compress best as JPG. Graphics with flat colors and text compress best as PNG. WebP beats both for web use.
- **Batch process**: Upload multiple images at once to compress them all with the same settings.

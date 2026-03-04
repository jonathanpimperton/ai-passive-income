---
name: "PDF Split"
slug: "pdf-split"
category: "file-tools"
description: "Extract pages from a PDF or split into individual pages."
keywords:
  - "split PDF online"
  - "extract pages from PDF"
  - "PDF splitter"
  - "separate PDF pages"
  - "split PDF without uploading"
relatedTools:
  - "pdf-merge"
  - "pdf-compress"
  - "pdf-to-image"
  - "images-to-pdf"
workedExamples:
  - title: "Extracting a chapter from a textbook"
    inputs:
      range: "45-72"
    description: "A student has a 300-page textbook PDF and only needs chapter 3 (pages 45-72) for a study group. They extract just those 28 pages into a smaller, shareable file instead of sending the entire book."
  - title: "Separating invoice pages"
    inputs:
      mode: "every-page"
    description: "An accountant receives a 50-page PDF with one invoice per page. They split it into 50 individual PDFs, each named by page number, making it easy to file each invoice separately in their accounting system."
  - title: "Pulling specific pages for a presentation"
    inputs:
      range: "1, 5, 12-15, 22"
    description: "A manager needs specific pages from a long report for a meeting. They extract pages 1, 5, 12-15, and 22 into a focused 7-page summary document."
faq:
  - question: "What page range formats are supported?"
    answer: "You can use individual pages (e.g., '1, 5, 8'), ranges (e.g., '3-10'), or combinations (e.g., '1-3, 7, 12-15'). Pages are numbered starting from 1."
  - question: "Can I split a PDF into individual pages?"
    answer: "Yes — select the 'Every page' mode to download each page as a separate PDF file. Each file is named with the original filename plus the page number."
  - question: "Does splitting preserve the original PDF quality?"
    answer: "Yes. The pages are copied directly from the original document without re-encoding. Text, images, and formatting remain identical to the source."
  - question: "Can I split password-protected PDFs?"
    answer: "The tool can handle PDFs with basic encryption. However, heavily encrypted or DRM-protected PDFs may fail to load. You'll see an error message if the file can't be read."
  - question: "Is there a page limit?"
    answer: "No hard limit. The tool handles PDFs with hundreds of pages, though very large files (100MB+) may take a few extra seconds to process in your browser."
---

## Why Split PDFs?

Large PDFs are unwieldy. Email size limits block them, recipients don't want to scroll through 200 pages for one section, and filing systems work better with focused documents. Splitting lets you extract exactly what you need.

## How It Works

1. Upload a PDF file
2. Choose a mode: extract a page range or split every page
3. Enter your desired pages (e.g., "1-5, 8, 12-15")
4. Download the extracted pages as a new PDF

All processing happens in your browser — no upload, no server, no waiting.

## Split Modes

| Mode | What It Does | Best For |
|------|-------------|----------|
| **Extract range** | Pull specific pages into one new PDF | Getting chapters, sections, or specific pages |
| **Every page** | Download each page as its own PDF | Filing individual invoices, receipts, or forms |

## Tips

- **Preview the page count** shown after upload to know your total pages before entering a range.
- **Combine with merge**: Extract pages from multiple PDFs, then use our PDF Merge tool to combine them into a custom document.
- **Non-destructive**: Your original PDF is never modified. The tool creates new files from copies of the selected pages.

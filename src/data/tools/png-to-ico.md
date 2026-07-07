---
name: "PNG to ICO Converter"
slug: "png-to-ico"
category: "file-tools"
description: "PNG to ICO converter — create favicon files from PNG images with multiple icon sizes in one .ico, right in your browser."
keywords:
  - "PNG to ICO converter"
  - "favicon generator"
  - "ICO converter online"
  - "create favicon from PNG"
  - "favicon maker"
  - "PNG to favicon"
relatedTools:
  - "svg-to-png"
  - "image-resizer"
  - "image-compressor"
  - "image-format-converter"
  - "images-to-pdf"
workedExamples:
  - title: "Creating a favicon for a new website"
    inputs:
      file: "logo.png (512×512)"
      sizes: "16, 32, 48"
    description: "A web developer has a 512×512 PNG logo and needs a favicon. Uploading the logo generates previews at all standard sizes (16×16 through 256×256). Selecting the standard set (16, 32, 48) produces a multi-size ICO file that works across all browsers. The 16×16 version appears in browser tabs, 32×32 in bookmarks, and 48×48 in Windows taskbar shortcuts."
  - title: "Generating a high-resolution favicon for Retina displays"
    inputs:
      file: "icon.png (256×256)"
      sizes: "16, 32, 48, 64, 128, 256"
    description: "A designer wants crisp favicons on high-DPI (Retina) displays. Including all six sizes (16 through 256) ensures the browser can select the best resolution for any context. The 256×256 version appears sharp on 5K displays, while 16×16 is optimized for standard-resolution browser tabs. The multi-size ICO file is 45KB — small enough for fast loading."
  - title: "Quick favicon from a simple icon"
    inputs:
      file: "checkmark.png (64×64)"
      sizes: "16, 32"
    description: "A developer building a prototype needs a basic favicon fast. They upload a simple 64×64 checkmark icon and select just 16×16 and 32×32. The resulting ICO file is under 5KB and covers the two most common favicon sizes. The entire process takes about 3 seconds — upload, select sizes, download."
faq:
  - question: "What is an ICO file?"
    answer: "ICO (Icon) is a file format used for computer icons and favicons. Unlike most image formats that contain a single image, an ICO file can contain multiple images at different sizes and color depths. Browsers use this to display the best-sized icon for each context — a small 16×16 for browser tabs, a larger 32×32 for bookmarks, and even larger sizes for desktop shortcuts."
  - question: "What sizes should I include in my favicon?"
    answer: "For most websites, include at least 16×16, 32×32, and 48×48. These three sizes cover browser tabs (16), bookmarks and browser UI (32), and Windows taskbar shortcuts (48). For high-DPI/Retina displays, also include 64×64 and 128×128. The 256×256 size is useful for Windows 10+ desktop icons. Google recommends a 48×48 icon at minimum for search results."
  - question: "Do I need an ICO file, or can I just use PNG?"
    answer: "Modern browsers support PNG favicons via '<link rel=\"icon\" type=\"image/png\" href=\"favicon.png\">'. However, ICO files are still recommended because: (1) they contain multiple sizes in one file, (2) older browsers only support ICO, (3) Windows uses ICO for desktop shortcuts, and (4) placing favicon.ico at the root of your domain works automatically without any HTML tags."
  - question: "Should my source image be square?"
    answer: "Yes, favicons should be square. If you upload a non-square image, it will be stretched to fit the square dimensions, which may look distorted. For best results, start with a square PNG at 256×256 or larger. If your logo isn't square, consider centering it on a square background with padding."
  - question: "What's the ideal source image resolution?"
    answer: "Use a source image of at least 256×256 pixels. This gives the best quality when downscaling to smaller sizes. Starting from a larger image (512×512 or 1024×1024) won't improve quality significantly because the Canvas API's bicubic interpolation handles downscaling well. Starting from a smaller image (e.g., 32×32) and upscaling to 256×256 will look blurry."
  - question: "How does the ICO format work internally?"
    answer: "An ICO file has a simple structure: a 6-byte header (reserved, type=1 for icons, image count), followed by 16-byte directory entries for each size (dimensions, color depth, data offset), followed by the actual image data. Modern ICO files embed PNG data directly — the PNG bytes are stored verbatim inside the ICO container. This means no quality loss compared to the original PNG."
---

## What Is a Favicon?

A favicon (short for "favorites icon") is the small icon that appears in browser tabs, bookmarks, and browser history. It's one of the first things users see when they visit your website.

### Where Favicons Appear

| Context | Typical Size | Format |
|---------|-------------|--------|
| Browser tab | 16×16 | ICO or PNG |
| Bookmarks bar | 16×16 | ICO or PNG |
| Browser address bar | 16×16 or 32×32 | ICO or PNG |
| Windows taskbar | 48×48 | ICO |
| Windows desktop shortcut | 256×256 | ICO |
| Google search results | 48×48 | Any |
| iOS home screen | 180×180 | PNG (apple-touch-icon) |
| Android home screen | 192×192 | PNG (manifest) |

## How to Add a Favicon to Your Website

### 1. Place the ICO file at your domain root

```
https://yourdomain.com/favicon.ico
```

Most browsers automatically check for `/favicon.ico` — no HTML needed.

### 2. Add HTML link tags (recommended)

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
```

### 3. For Apple devices

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

## ICO vs PNG vs SVG Favicons

| Format | Multi-size | Browser support | Best for |
|--------|-----------|----------------|----------|
| **ICO** | Yes (multiple images in one file) | Universal (including IE) | Maximum compatibility |
| **PNG** | No (one size per file) | Modern browsers only | Simple setups |
| **SVG** | Yes (scales infinitely) | Most modern browsers | Scalable vector logos |

## Tips for Great Favicons

- **Keep it simple** — at 16×16, only basic shapes are recognizable
- **Use bold colors** — subtle gradients disappear at small sizes
- **Test at small sizes** — preview how it looks at 16×16 before finalizing
- **Square images only** — non-square images will be distorted
- **Transparent backgrounds** work for most browsers but may look odd on some dark-mode UIs

## Privacy

All image processing happens in your browser using the Canvas API. Your images are never uploaded to any server. The ICO file is assembled entirely client-side.

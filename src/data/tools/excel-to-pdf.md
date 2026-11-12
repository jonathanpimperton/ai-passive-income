---
name: "Excel to PDF Converter"
slug: "excel-to-pdf"
category: "file-tools"
description: "Excel to PDF converter — turn XLSX spreadsheets and CSV files into PDF documents right in your browser. Files never leave your device."
keywords:
  - "Excel to PDF"
  - "XLSX to PDF"
  - "convert Excel to PDF online"
  - "CSV to PDF"
  - "spreadsheet to PDF converter free"
relatedTools:
  - "pdf-merge"
  - "csv-json"
  - "pdf-compress"
  - "images-to-pdf"
workedExamples:
  - title: "Sharing financial data with a client"
    inputs:
      file: "q4-financials.xlsx"
    description: "An accountant has quarterly financial data in Excel and needs to share it with a client who doesn't have Excel. Converting to PDF produces a clean, formatted table that opens on any device, with dates and currency amounts exactly as they appear in Excel. The 500-row spreadsheet renders as a multi-page PDF with the header row repeated on every page."
  - title: "Printing an inventory list"
    inputs:
      file: "inventory.csv"
    description: "A warehouse manager exports their inventory database as a CSV and converts it to PDF for printing. The PDF has clear column headers, alternating row shading, and automatic page breaks — ready to post on the warehouse wall."
  - title: "Archiving expense reports"
    inputs:
      file: "expenses-2025.xlsx"
    description: "A freelancer converts their expense tracking spreadsheet to PDF at year-end for their accountant. Each sheet (monthly breakdowns) can be converted separately. The PDF serves as a permanent, non-editable record."
faq:
  - question: "Which file formats are supported?"
    answer: "The tool supports .xlsx (Excel 2007+), .xls (older Excel), and .csv files. Multi-sheet workbooks are supported — you can select which sheet to convert."
  - question: "Can I convert all sheets at once?"
    answer: "Currently, you convert one sheet at a time. Select the sheet you want from the dropdown, then download the PDF. Repeat for other sheets and use our PDF Merge tool to combine them if needed."
  - question: "Will formulas and charts be included?"
    answer: "For Excel files, the values Excel last calculated and saved appear in the PDF, formatted as they are in the sheet (dates, currency, percentages). In a CSV a formula is just text, so it prints as written. Charts, conditional formatting and cell colours are not included — the output is a clean data table. Hidden rows and columns are left out, as when printing from Excel."
  - question: "How does the table look in the PDF?"
    answer: "Narrow sheets print in portrait and wide ones in landscape, as a clean table: bold headers on a gray background repeated on every page, alternating row colors, numbers right-aligned, and automatic page breaks. A title row above the headers (such as a merged report title) is printed as a title."
  - question: "What if my spreadsheet has too many columns?"
    answer: "Nothing is cut off. The tool switches to landscape, then uses a smaller font, and if the sheet is still too wide it prints the columns in parts, one after another (for example columns 1-12, then 13-24, with the first column repeated). Long text wraps inside its cell. Hiding columns you don't need before uploading gives the most readable result."
  - question: "Does it handle non-English text and CSV files from other programs?"
    answer: "Yes. Accented, Polish, Greek and Cyrillic text prints with an embedded Unicode font. Characters that font lacks, such as Chinese or Japanese, are drawn as images so they still appear (they are not searchable). CSV files are read as UTF-8 (with or without a byte-order mark), falling back to Windows-1252 for older Excel exports, so symbols like £ and é come out right."
---

## Why Convert Excel to PDF?

Spreadsheets are great for data entry and analysis, but terrible for sharing. Recipients may not have Excel, formulas can be accidentally changed, and the layout shifts between different software versions. PDF locks your data into a clean, universal format.

## How It Works

1. Upload an Excel (.xlsx, .xls) or CSV file
2. Preview the data table in your browser
3. Select which sheet to convert (for multi-sheet workbooks)
4. Click "Download as PDF" to get a formatted table

The conversion uses SheetJS to read spreadsheet data and jsPDF to generate the PDF — all in your browser.

## Output Format

The generated PDF uses:
- **Portrait or landscape**, chosen from the width of your data
- **Bold header row** with gray background
- **Alternating row shading** for readability
- **Automatic page breaks** for long datasets
- **A4 paper size** (standard international)

## Tips

- **Wide spreadsheets**: Very wide sheets are printed in column parts rather than cut off; hiding unneeded columns first keeps everything on one page width.
- **Large datasets**: Spreadsheets with thousands of rows work fine but produce multi-page PDFs.
- **CSV files**: Values are printed exactly as written (leading zeros and dates are not changed), and the text encoding is detected automatically.
- **Wrong file type**: PDFs and other non-spreadsheet files are refused with a message rather than printed as garbage.
- **Multiple sheets**: Convert each sheet separately, then merge them with our PDF Merge tool.

/**
 * Generate complex test fixture files for E2E converter testing.
 * Run: node tests/generate-fixtures.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');
mkdirSync(FIXTURES, { recursive: true });

// ─── 1. Complex CSV with quoted fields, commas, newlines ───
function generateCsv() {
  const csv = `Name,Age,City,Bio,Salary
"Alice Johnson",30,"New York","Senior developer with 10+ years experience, specializing in React and Node.js",95000
"Bob ""Bobby"" Smith",25,"Los Angeles","Jr. developer
loves Python",65000
"Charlie O'Brien",35,"Chicago, IL","Team lead, manages 12+ engineers across 3 continents",120000
"Diana, Princess of Testing",28,"San Francisco","QA engineer; uses Selenium, Playwright, and Cypress",85000
"Eve ""The Debugger"" Wilson",42,"Austin","Staff engineer — C++, Rust, Go specialist",155000
"Frank N. Stein",31,"Portland, OR","Full-stack dev
with a passion for
open source contributions",78000
"Grace Hopper Jr.",55,"Washington DC","Distinguished engineer, inventor of COBOL++, awarded 3 patents",200000
"Hans Müller",29,"Berlin, Germany","Backend developer, PostgreSQL & Redis expert, bilingual (DE/EN)",92000
"Iris 日本語",33,"Tokyo","Frontend specialist, expert in i18n/l10n, speaks 4 languages",88000
"José García-López",40,"Madrid, Spain","DevOps lead, manages CI/CD for 50+ microservices",110000`;
  writeFileSync(join(FIXTURES, 'complex.csv'), csv);
  console.log('✓ complex.csv');
}

// ─── 2. Complex JSON (for JSON→CSV) ───
function generateJson() {
  const data = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    department: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'][i % 5],
    salary: 50000 + Math.floor(Math.random() * 100000),
    isActive: i % 3 !== 0,
    startDate: `202${i % 5}-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
    skills: ['JavaScript', 'Python', 'Rust', 'Go', 'SQL'].slice(0, (i % 4) + 1).join('; '),
    notes: i % 4 === 0 ? `Has a "special" role, manages ${i + 2} people` : '',
  }));
  writeFileSync(join(FIXTURES, 'complex.json'), JSON.stringify(data, null, 2));
  console.log('✓ complex.json');
}

// ─── 3. Complex Markdown ───
function generateMarkdown() {
  const md = `# Project Documentation: CalcRun v2.0

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)

---

## Introduction

This is a **comprehensive** documentation for the *CalcRun* project. It includes:

- Financial calculators (14 tools)
- File converters (15 tools)
- Utility generators

> "The best tools are the ones that just work." — Anonymous Developer

### Key Features

| Feature | Status | Priority |
|---------|--------|----------|
| Compound Interest | ✅ Complete | High |
| PDF Merge | ✅ Complete | Medium |
| Dark Mode | 🔄 In Progress | Low |
| API v2 | ❌ Not Started | High |

## Architecture

The project uses a \`micro-frontend\` architecture:

\`\`\`typescript
interface ToolConfig {
  slug: string;
  component: React.FC;
  category: 'financial' | 'file-tools' | 'utility';
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

const tools: ToolConfig[] = [
  {
    slug: 'compound-interest',
    component: CompoundInterestCalculator,
    category: 'financial',
    seo: {
      title: 'Compound Interest Calculator',
      description: 'Calculate compound interest with monthly contributions',
      keywords: ['compound interest', 'savings calculator'],
    },
  },
];
\`\`\`

### Data Flow

1. User inputs values via **sliders** and **text fields**
2. React state updates in real-time
3. \`useMemo\` recalculates results
4. Charts re-render via **recharts**
5. Results display with \`aria-live="polite"\`

## API Reference

### \`calculateCompoundInterest(params)\`

**Parameters:**

- \`principal\` (number): Initial investment amount
- \`rate\` (number): Annual interest rate (as decimal, e.g., 0.07 for 7%)
- \`years\` (number): Number of years
- \`monthlyContribution\` (number, optional): Monthly addition

**Returns:** \`CompoundInterestResult\`

\`\`\`json
{
  "finalBalance": 161051.68,
  "totalContributions": 120000,
  "totalInterest": 41051.68,
  "schedule": [
    { "year": 1, "balance": 10700, "interest": 700 },
    { "year": 2, "balance": 21849, "interest": 1149 }
  ]
}
\`\`\`

---

![Architecture Diagram](https://example.com/diagram.png)

*Last updated: 2024-01-15*
`;
  writeFileSync(join(FIXTURES, 'complex.md'), md);
  console.log('✓ complex.md');
}

// ─── 4. Complex HTML ───
function generateHtml() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><title>Financial Report Q4 2024</title></head>
<body>
<h1>Annual Financial Report</h1>
<h2>Executive Summary</h2>
<p>This report covers the <strong>fiscal year 2024</strong>, including all <em>quarterly results</em> and projections for 2025.</p>

<h3>Revenue Breakdown</h3>
<table>
  <thead>
    <tr><th>Quarter</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr>
  </thead>
  <tbody>
    <tr><td>Q1</td><td>$1,250,000</td><td>$890,000</td><td>$360,000</td></tr>
    <tr><td>Q2</td><td>$1,480,000</td><td>$920,000</td><td>$560,000</td></tr>
    <tr><td>Q3</td><td>$1,320,000</td><td>$950,000</td><td>$370,000</td></tr>
    <tr><td>Q4</td><td>$1,750,000</td><td>$1,100,000</td><td>$650,000</td></tr>
  </tbody>
</table>

<h2>Key Highlights</h2>
<ul>
  <li>Revenue grew <strong>40%</strong> year-over-year</li>
  <li>Customer acquisition cost decreased by <em>15%</em></li>
  <li>New product lines contributed $500K in revenue</li>
</ul>

<blockquote>
  <p>"Our strategic investments in AI tools are paying dividends." — CEO</p>
</blockquote>

<h2>Technical Infrastructure</h2>
<p>We migrated to <code>Kubernetes</code> clusters, reducing hosting costs by 30%.</p>
<pre><code>$ kubectl get pods --all-namespaces
NAMESPACE     NAME                    READY   STATUS
production    api-server-7d4f8        1/1     Running
production    web-frontend-3a9c2      1/1     Running
staging       api-server-test-1b3e5   1/1     Running</code></pre>

<hr>
<p><a href="https://example.com/full-report">View Full Report</a> | <a href="mailto:finance@example.com">Contact Finance</a></p>
</body>
</html>`;
  writeFileSync(join(FIXTURES, 'complex.html'), html);
  console.log('✓ complex.html');
}

// ─── 5. Complex SVG ───
function generateSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#fff;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#fff;stop-opacity:0" />
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="300" fill="url(#bg)" rx="16"/>
  <circle cx="320" cy="80" r="60" fill="url(#glow)"/>

  <!-- Chart bars -->
  <g transform="translate(50, 220)" filter="url(#shadow)">
    <rect x="0" y="-120" width="40" height="120" fill="#fff" rx="4" opacity="0.9"/>
    <rect x="60" y="-160" width="40" height="160" fill="#fff" rx="4" opacity="0.9"/>
    <rect x="120" y="-90" width="40" height="90" fill="#fff" rx="4" opacity="0.9"/>
    <rect x="180" y="-180" width="40" height="180" fill="#fff" rx="4" opacity="0.9"/>
    <rect x="240" y="-140" width="40" height="140" fill="#fff" rx="4" opacity="0.9"/>
  </g>

  <!-- Title text -->
  <text x="200" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">Revenue Dashboard</text>
  <text x="200" y="55" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.8">Q1-Q4 2024 Performance</text>

  <!-- Labels -->
  <g font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.7">
    <text x="70" y="245">Q1</text>
    <text x="130" y="245">Q2</text>
    <text x="190" y="245">Q3</text>
    <text x="250" y="245">Q4</text>
    <text x="310" y="245">Q5</text>
  </g>

  <!-- Decorative elements -->
  <circle cx="350" cy="250" r="3" fill="white" opacity="0.5"/>
  <circle cx="360" cy="260" r="2" fill="white" opacity="0.3"/>
  <circle cx="340" cy="265" r="4" fill="white" opacity="0.4"/>
</svg>`;
  writeFileSync(join(FIXTURES, 'complex.svg'), svg);
  console.log('✓ complex.svg');
}

// ─── 6. Complex DOCX using docx library ───
async function generateDocx() {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, BorderStyle, TableLayoutType } = docx;

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Annual Performance Review 2024', bold: true, size: 32 })],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Prepared by: ', bold: true }),
            new TextRun('Human Resources Department'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun('January 15, 2025'),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Executive Summary', bold: true, size: 28 })],
        }),
        new Paragraph({
          children: [
            new TextRun('This document provides a comprehensive overview of the company\'s performance during fiscal year 2024. '),
            new TextRun({ text: 'Key highlights include a 40% revenue increase, ', bold: true }),
            new TextRun('successful expansion into three new markets, and the launch of our AI-powered product suite. '),
            new TextRun({ text: 'Employee satisfaction scores reached an all-time high of 92%.', italics: true }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Financial Performance', bold: true, size: 28 })],
        }),
        new Paragraph({
          text: 'The following table summarizes quarterly financial results:',
        }),
        new Paragraph({ text: '' }),
        // Financial table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: ['Quarter', 'Revenue ($M)', 'Expenses ($M)', 'Net Profit ($M)', 'Growth %'].map(header =>
                new TableCell({
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: header, bold: true, size: 20 })],
                  })],
                  shading: { fill: '1a3a5c' },
                })
              ),
            }),
            ...([
              ['Q1 2024', '12.5', '8.9', '3.6', '+18%'],
              ['Q2 2024', '14.8', '9.2', '5.6', '+32%'],
              ['Q3 2024', '13.2', '9.5', '3.7', '+22%'],
              ['Q4 2024', '17.5', '11.0', '6.5', '+48%'],
            ]).map((row, idx) =>
              new TableRow({
                children: row.map(cell =>
                  new TableCell({
                    children: [new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: cell, size: 20 })],
                    })],
                    shading: idx % 2 === 0 ? { fill: 'f0f4f8' } : undefined,
                  })
                ),
              })
            ),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Department Highlights', bold: true, size: 28 })],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'Engineering', bold: true, size: 24 })],
        }),
        new Paragraph({
          text: 'The engineering team shipped 47 features across 12 sprint cycles. Key accomplishments include the migration to Kubernetes (reducing infrastructure costs by 30%), launch of the real-time collaboration engine, and achieving 99.97% uptime across all production services.',
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'Marketing & Sales', bold: true, size: 24 })],
        }),
        new Paragraph({
          text: 'Marketing drove a 2.5x increase in qualified leads through content marketing and strategic partnerships. The sales team closed 156 enterprise deals worth $23M in annual recurring revenue, exceeding the target by 18%.',
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'Human Resources', bold: true, size: 24 })],
        }),
        new Paragraph({
          children: [
            new TextRun('HR successfully recruited 85 new team members while maintaining a '),
            new TextRun({ text: 'voluntary attrition rate of only 8.2%', bold: true }),
            new TextRun(' (industry average: 13.2%). The new mentorship program paired 120 employees and received a 4.7/5 satisfaction rating.'),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '2025 Strategic Priorities', bold: true, size: 28 })],
        }),
        new Paragraph({ text: '1. Expand into Asia-Pacific markets (target: $5M ARR from APAC by Q4)' }),
        new Paragraph({ text: '2. Launch AI-powered analytics dashboard for enterprise customers' }),
        new Paragraph({ text: '3. Achieve SOC 2 Type II certification by end of Q2' }),
        new Paragraph({ text: '4. Grow engineering team by 40% to support product roadmap' }),
        new Paragraph({ text: '5. Implement company-wide DEI initiatives with measurable outcomes' }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(join(FIXTURES, 'complex.docx'), buffer);
  console.log('✓ complex.docx');
}

// ─── 7. Complex XLSX using xlsx ───
async function generateXlsx() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: Employee data (many columns)
  const employees = [
    ['ID', 'First Name', 'Last Name', 'Department', 'Title', 'Salary', 'Start Date', 'Manager', 'Location', 'Status', 'Performance Score', 'Stock Options'],
  ];
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Product', 'Legal', 'Operations'];
  const titles = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Staff', 'Principal', 'Director', 'VP'];
  const locations = ['New York', 'San Francisco', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Singapore'];

  for (let i = 1; i <= 50; i++) {
    employees.push([
      String(1000 + i),
      `FirstName${i}`,
      `LastName${i}`,
      departments[i % departments.length],
      titles[i % titles.length],
      String(50000 + Math.floor(Math.random() * 150000)),
      `202${i % 5}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      i > 5 ? `FirstName${(i % 5) + 1} LastName${(i % 5) + 1}` : 'CEO',
      locations[i % locations.length],
      i % 7 === 0 ? 'On Leave' : i % 11 === 0 ? 'Terminated' : 'Active',
      String(Math.floor(Math.random() * 40 + 60) / 10),
      String(Math.floor(Math.random() * 5000)),
    ]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(employees);
  XLSX.utils.book_append_sheet(wb, ws1, 'Employees');

  // Sheet 2: Financial data
  const financial = [
    ['Month', 'Revenue', 'COGS', 'Gross Profit', 'OpEx', 'EBITDA', 'Depreciation', 'Net Income', 'Cash Flow', 'Accounts Receivable'],
  ];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (const month of months) {
    const rev = 1000000 + Math.floor(Math.random() * 500000);
    const cogs = Math.floor(rev * 0.35);
    const gp = rev - cogs;
    const opex = Math.floor(rev * 0.4);
    const ebitda = gp - opex;
    const dep = Math.floor(rev * 0.05);
    const ni = ebitda - dep;
    financial.push([month, String(rev), String(cogs), String(gp), String(opex), String(ebitda), String(dep), String(ni), String(ni + dep), String(Math.floor(rev * 0.15))]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(financial);
  XLSX.utils.book_append_sheet(wb, ws2, 'Financials');

  // Sheet 3: Project tracking with mixed data
  const projects = [
    ['Project Name', 'Owner', 'Status', 'Start', 'End', 'Budget ($)', 'Spent ($)', '% Complete', 'Risk Level', 'Notes'],
    ['Cloud Migration', 'J. Smith', 'In Progress', '2024-01-15', '2024-06-30', '500000', '320000', '64%', 'Medium', 'On track, minor delays in Q2'],
    ['Mobile App v3', 'A. Johnson', 'Complete', '2023-09-01', '2024-03-15', '750000', '680000', '100%', 'Low', 'Launched successfully, 4.5★ rating'],
    ['Data Lake Setup', 'R. Williams', 'At Risk', '2024-03-01', '2024-12-31', '1200000', '890000', '45%', 'High', 'Vendor issues causing delays; contingency plan needed'],
    ['Security Audit', 'M. Chen', 'Not Started', '2025-01-01', '2025-03-31', '200000', '0', '0%', 'Low', 'Scheduled for Q1 2025'],
    ['AI Integration', 'S. Patel', 'In Progress', '2024-06-01', '2025-06-30', '2000000', '450000', '22%', 'Medium', 'POC complete, moving to production'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(projects);
  XLSX.utils.book_append_sheet(wb, ws3, 'Projects');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(join(FIXTURES, 'complex.xlsx'), xlsxBuffer);
  console.log('✓ complex.xlsx');
}

// ─── 8. Generate test images using Sharp ───
async function generateImages() {
  const sharp = (await import('sharp')).default;

  // Create a complex PNG with transparency (gradient + shapes)
  const width = 1200;
  const height = 800;
  const svgImage = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#4ecdc4;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#45b7d1;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g1)"/>
    <circle cx="300" cy="400" r="200" fill="rgba(255,255,255,0.3)"/>
    <circle cx="900" cy="300" r="150" fill="rgba(0,0,0,0.2)"/>
    <rect x="500" y="200" width="300" height="400" rx="20" fill="rgba(255,255,255,0.25)"/>
    <text x="600" y="420" font-family="Arial" font-size="48" fill="white" text-anchor="middle" font-weight="bold">TEST IMAGE</text>
    <text x="600" y="470" font-family="Arial" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">1200×800 Complex PNG</text>
  </svg>`;

  await sharp(Buffer.from(svgImage)).png().toFile(join(FIXTURES, 'test-image.png'));
  console.log('✓ test-image.png');

  // Create a high-res JPEG (2400x1600 - simulates a photo)
  const photoSvg = `<svg width="2400" height="1600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
        <stop offset="40%" style="stop-color:#16213e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="2400" height="1600" fill="url(#sky)"/>
    <circle cx="1800" cy="300" r="100" fill="#e94560" opacity="0.8"/>
    <ellipse cx="1200" cy="1200" rx="1400" ry="500" fill="#1a1a2e"/>
    <rect x="400" y="600" width="100" height="500" fill="#533483" rx="5"/>
    <rect x="550" y="500" width="120" height="600" fill="#3d2c8d" rx="5"/>
    <rect x="720" y="650" width="80" height="450" fill="#916bbf" rx="5"/>
    ${Array.from({ length: 50 }, () => `<circle cx="${Math.random() * 2400}" cy="${Math.random() * 800}" r="${Math.random() * 3}" fill="white" opacity="${Math.random() * 0.8 + 0.2}"/>`).join('\n')}
    <text x="1200" y="1400" font-family="Arial" font-size="36" fill="rgba(255,255,255,0.5)" text-anchor="middle">High Resolution Test Photo (2400×1600)</text>
  </svg>`;
  await sharp(Buffer.from(photoSvg)).jpeg({ quality: 95 }).toFile(join(FIXTURES, 'test-photo.jpg'));
  console.log('✓ test-photo.jpg');

  // Create a WebP image
  await sharp(Buffer.from(svgImage)).webp({ quality: 90 }).toFile(join(FIXTURES, 'test-image.webp'));
  console.log('✓ test-image.webp');

  // Create a second PNG for multi-image tests (images to PDF, etc.)
  const svg2 = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#2d3436"/>
    <text x="400" y="300" font-family="Arial" font-size="40" fill="#dfe6e9" text-anchor="middle">Page 2 — Second Image</text>
    <rect x="100" y="100" width="600" height="400" fill="none" stroke="#74b9ff" stroke-width="3" rx="16"/>
  </svg>`;
  await sharp(Buffer.from(svg2)).png().toFile(join(FIXTURES, 'test-image-2.png'));
  console.log('✓ test-image-2.png');
}

// ─── 9. Complex PDF using pdf-lib ───
async function generatePdf() {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await doc.embedFont(StandardFonts.TimesRoman);

  // Page 1: Title page with large text
  const page1 = doc.addPage([612, 792]); // US Letter
  page1.drawText('CONFIDENTIAL', {
    x: 180, y: 700, size: 28, font: helveticaBold, color: rgb(0.8, 0.1, 0.1),
  });
  page1.drawText('Quarterly Financial Report', {
    x: 120, y: 650, size: 24, font: helveticaBold, color: rgb(0.1, 0.1, 0.3),
  });
  page1.drawText('Q4 2024 — Fiscal Year End', {
    x: 170, y: 620, size: 16, font: helvetica, color: rgb(0.3, 0.3, 0.3),
  });
  page1.drawText('Prepared for: Board of Directors', {
    x: 190, y: 570, size: 14, font: timesRoman, color: rgb(0.2, 0.2, 0.2),
  });
  page1.drawText('Date: January 15, 2025', {
    x: 220, y: 545, size: 14, font: timesRoman, color: rgb(0.2, 0.2, 0.2),
  });
  page1.drawText('Company: Acme Technologies Inc.', {
    x: 175, y: 520, size: 14, font: timesRoman, color: rgb(0.2, 0.2, 0.2),
  });

  // Page 2: Dense text content
  const page2 = doc.addPage([612, 792]);
  page2.drawText('1. Executive Summary', {
    x: 50, y: 730, size: 18, font: helveticaBold, color: rgb(0.1, 0.1, 0.3),
  });
  const paragraphs = [
    'Acme Technologies achieved record revenue of $58M in Q4 2024, representing a 48% year-over-year',
    'increase. Total annual revenue reached $195M, exceeding our revised guidance of $185M. This growth',
    'was driven by strong enterprise adoption of our AI-powered analytics platform, which now serves over',
    '2,400 corporate clients across 35 countries.',
    '',
    'Operating margin improved to 22.3% from 18.7% in the prior year, reflecting economies of scale in',
    'our cloud infrastructure and improved sales efficiency. Free cash flow generation was $42M for the',
    'full year, enabling us to fund R&D investments while maintaining a healthy balance sheet.',
    '',
    '2. Revenue Breakdown by Segment',
    '',
    'Enterprise SaaS:        $38.2M    (65.9% of total)    +52% YoY',
    'Mid-Market:             $12.4M    (21.4% of total)    +38% YoY',
    'SMB Self-Serve:          $5.8M    (10.0% of total)    +25% YoY',
    'Professional Services:   $1.6M     (2.8% of total)    +12% YoY',
    '',
    '3. Key Performance Indicators',
    '',
    'Annual Recurring Revenue (ARR):    $210M    (+45% YoY)',
    'Net Revenue Retention:             128%     (up from 118%)',
    'Customer Acquisition Cost:         $12,500  (-15% YoY)',
    'LTV/CAC Ratio:                     8.2x     (up from 6.5x)',
    'Gross Margin:                      78.5%    (up from 75.2%)',
    'Employee Count:                    847      (+35% YoY)',
  ];
  let y = 700;
  for (const line of paragraphs) {
    if (line.startsWith('2.') || line.startsWith('3.')) {
      page2.drawText(line, { x: 50, y, size: 16, font: helveticaBold, color: rgb(0.1, 0.1, 0.3) });
    } else {
      page2.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.15, 0.15, 0.15) });
    }
    y -= 18;
  }

  // Page 3: Table-like content
  const page3 = doc.addPage([612, 792]);
  page3.drawText('4. Quarterly Revenue Comparison', {
    x: 50, y: 730, size: 18, font: helveticaBold, color: rgb(0.1, 0.1, 0.3),
  });

  // Draw table header
  const tableY = 690;
  const headers = ['Quarter', 'Revenue', 'Expenses', 'Profit', 'Margin'];
  const colX = [50, 150, 270, 390, 490];

  // Header background
  page3.drawRectangle({ x: 45, y: tableY - 5, width: 520, height: 20, color: rgb(0.1, 0.15, 0.3) });
  headers.forEach((h, i) => {
    page3.drawText(h, { x: colX[i], y: tableY, size: 11, font: helveticaBold, color: rgb(1, 1, 1) });
  });

  // Table rows
  const rows = [
    ['Q1 2024', '$12,500,000', '$8,900,000', '$3,600,000', '28.8%'],
    ['Q2 2024', '$14,800,000', '$9,200,000', '$5,600,000', '37.8%'],
    ['Q3 2024', '$13,200,000', '$9,500,000', '$3,700,000', '28.0%'],
    ['Q4 2024', '$17,500,000', '$11,000,000', '$6,500,000', '37.1%'],
    ['FY 2024', '$58,000,000', '$38,600,000', '$19,400,000', '33.4%'],
  ];

  rows.forEach((row, ri) => {
    const rowY = tableY - 25 - ri * 22;
    if (ri % 2 === 0) {
      page3.drawRectangle({ x: 45, y: rowY - 5, width: 520, height: 20, color: rgb(0.95, 0.95, 0.97) });
    }
    if (ri === rows.length - 1) {
      // Bold total row
      row.forEach((cell, ci) => {
        page3.drawText(cell, { x: colX[ci], y: rowY, size: 10, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
      });
    } else {
      row.forEach((cell, ci) => {
        page3.drawText(cell, { x: colX[ci], y: rowY, size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      });
    }
  });

  // More content lower on page 3
  page3.drawText('5. Geographic Distribution', {
    x: 50, y: 530, size: 18, font: helveticaBold, color: rgb(0.1, 0.1, 0.3),
  });
  const geoData = [
    'North America:     62% ($36.0M)   — Primary market, strong enterprise presence',
    'Europe (EMEA):     21% ($12.2M)   — Growing rapidly, Berlin office opened Q3',
    'Asia-Pacific:      12% ($7.0M)    — New market entry via Tokyo partnership',
    'Latin America:      5% ($2.9M)    — Early-stage, focused on Brazil and Mexico',
  ];
  geoData.forEach((line, i) => {
    page3.drawText(line, { x: 50, y: 500 - i * 20, size: 11, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
  });

  const pdfBytes = await doc.save();
  writeFileSync(join(FIXTURES, 'complex.pdf'), pdfBytes);
  console.log('✓ complex.pdf');

  // Also create a second PDF for merge testing
  const doc2 = await PDFDocument.create();
  const font2 = await doc2.embedFont(StandardFonts.Helvetica);
  const p2 = doc2.addPage([612, 792]);
  p2.drawText('APPENDIX A — Supplementary Data', { x: 120, y: 700, size: 20, font: font2 });
  p2.drawText('This document contains additional charts and data referenced in the main report.', { x: 50, y: 660, size: 12, font: font2 });
  const p3 = doc2.addPage([612, 792]);
  p3.drawText('APPENDIX B — Legal Disclaimers', { x: 140, y: 700, size: 20, font: font2 });
  p3.drawText('Forward-looking statements in this report are subject to risks and uncertainties.', { x: 50, y: 660, size: 12, font: font2 });

  const pdf2Bytes = await doc2.save();
  writeFileSync(join(FIXTURES, 'complex-2.pdf'), pdf2Bytes);
  console.log('✓ complex-2.pdf');
}

// ─── Run all generators ───
async function main() {
  console.log('Generating test fixtures...\n');
  generateCsv();
  generateJson();
  generateMarkdown();
  generateHtml();
  generateSvg();
  await generateDocx();
  await generateXlsx();
  await generateImages();
  await generatePdf();
  console.log('\n✓ All fixtures generated in tests/fixtures/');
}

main().catch(console.error);

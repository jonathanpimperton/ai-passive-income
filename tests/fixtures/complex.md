# Project Documentation: CalcRun v2.0

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

The project uses a `micro-frontend` architecture:

```typescript
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
```

### Data Flow

1. User inputs values via **sliders** and **text fields**
2. React state updates in real-time
3. `useMemo` recalculates results
4. Charts re-render via **recharts**
5. Results display with `aria-live="polite"`

## API Reference

### `calculateCompoundInterest(params)`

**Parameters:**

- `principal` (number): Initial investment amount
- `rate` (number): Annual interest rate (as decimal, e.g., 0.07 for 7%)
- `years` (number): Number of years
- `monthlyContribution` (number, optional): Monthly addition

**Returns:** `CompoundInterestResult`

```json
{
  "finalBalance": 161051.68,
  "totalContributions": 120000,
  "totalInterest": 41051.68,
  "schedule": [
    { "year": 1, "balance": 10700, "interest": 700 },
    { "year": 2, "balance": 21849, "interest": 1149 }
  ]
}
```

---

![Architecture Diagram](https://example.com/diagram.png)

*Last updated: 2024-01-15*

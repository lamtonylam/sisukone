# SISUKONE — Agent Context

## What This Is

**Sisukone** is a client-side academic analytics dashboard for Finnish university students. It parses Sisu transcript PDFs (Opintosuoritusote) in the browser and visualises credit progression, GPA trends, and projected graduation. No server involved — everything runs locally.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Charts | Highcharts + Highcharts Stock |
| PDF parsing | pdfjs-dist (browser worker) |
| Icons | lucide-react |
| Testing | Vitest |
| Linting | oxlint |

---

## Design System

The UI follows a **neon brutalist** editorial aesthetic — see `.agent/skills/the-verge/SKILL.md` for the full design system. Key rules:

- **Zero border-radius** everywhere. Hard edges only.
- **2px borders** on all interactive elements, 4px on major containers.
- **Colour palette**: `#000000` black, `#ffffff` white, `#1076db` electric blue accent, `#daedff` light blue (used as high-contrast text on black bg).
- **Typography**: `font-mono` for labels/codes/data, `font-sans font-black uppercase` for headlines and CTAs.
- **No transitions** (`transition-none`) — state changes are instant.
- **Hover pattern**: most elements invert to black or jump to blue on hover.
- All UI copy is ALL CAPS. Comments inside the UI use `// SLUG` prefixes to read like code comments.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx         # Root layout (fonts, metadata)
│   └── page.tsx           # Single-page app shell; owns all state
├── components/
│   ├── Navbar.tsx          # Sticky top bar: import, export, anonymize, reset
│   ├── FileUploader.tsx    # Landing upload zone: PDF drop, paste text, sample demo
│   ├── StatsHeader.tsx     # KPI 4-quadrant: credits, GPA, annual pace, graduation ETA
│   ├── StudyStartModal.tsx # Config modal: start date, degree target, nominal pace
│   └── CourseTable/
│       └── CourseTable.tsx # Filterable, editable course list with inline add/edit/delete
│   └── Charts/
│       ├── StudentCreditGraph.tsx  # Highcharts Stock: cumulative credits vs nominal pace
│       ├── StudentGradeGraph.tsx   # GPA mean series (total / group / semester modes)
│       └── GradeDistribution.tsx   # Grade 1–5 + Pass distribution bar chart
├── lib/
│   ├── pdfParser.ts        # PDF.js orchestration: 3-pass extraction (profile + courses)
│   ├── textParser.ts       # Regex-based course/profile extraction from raw text lines
│   ├── chartCalculations.ts# Pure functions: cumulative credits, GPA series, graduation projection
│   ├── sampleTranscript.ts # Hardcoded demo TranscriptData for "LOAD SAMPLE DEMO"
│   └── __tests__/          # Vitest unit tests for parsers and calculations
└── types/
    └── student.ts          # Core domain types
```

---

## Core Domain Types

```typescript
// src/types/student.ts

interface Course {
  id: string;
  code: string;        // e.g. "TKT10001"
  name: string;
  credits: number;     // ECTS (op)
  grade: string;       // "5"|"4"|"3"|"2"|"1"|"HYV"|"PASS"|...
  date: string;        // ISO: "YYYY-MM-DD"
  passed: boolean;
  isStudyModuleCredit?: boolean;  // true → excluded from counts
  level?: string;
  language?: string;
}

interface StudentProfile {
  studentName?: string;
  studentNumber?: string;
  degreeProgramme?: string;
  studyStartDate: string;   // ISO date
  targetCredits: number;    // 180 | 120 | 300
  nominalPace: number;      // ECTS/year, default 60
}

interface TranscriptData {
  profile: StudentProfile;
  courses: Course[];
}
```

---

## Data Flow

```
User drops PDF
      ↓
parseSisuPdf()           [src/lib/pdfParser.ts]
  Pass 1: extract clustered rows per page (Y-coordinate grouping)
  Pass 2: extract StudentProfile metadata (name, number, degree, start date)
  Pass 3: extract Course records (skips Osasuoritukset sub-attainments)
  Fallback: parseRawTranscriptText() if < 1 course found
      ↓
TranscriptData stored in page.tsx state
      ↓
StatsHeader        → calculateCumulativeCredits, calculateWeightedGpa, calculateProjectedGraduation
StudentCreditGraph → calculateCumulativeCredits, createGoalLine
StudentGradeGraph  → calculateTotalMeanSeries / calculateGroupMeanSeries / calculateSemesterMeanSeries
GradeDistribution  → calculateGradeDistribution
CourseTable        → directly operates on courses[], calls onUpdateCourses()
```

All processing is **client-only**. No data ever leaves the browser.

---

## Key Parsing Details

### PDF Parser (`pdfParser.ts`)
- Uses `pdfjs-dist` with a CDN worker URL (unpkg). Worker initialised lazily on first parse.
- `clusterTextItemsIntoRows()` groups text items within ±4px Y tolerance to reconstruct logical rows from PDF's scattered text items.
- Handles **multi-line course names** by lookahead to the next row.
- Skips `Osasuoritukset` (sub-attainments) sections — they duplicate data from the main list.
- Supports Finnish (`fi`), Swedish (`sv`), and English (`en`) Sisu exports.

### Text Parser (`textParser.ts`)
- `parseCourseFromLine()`: requires a **date** and **credits** to identify a valid course row. Grade and code are extracted opportunistically.
- `extractCourseCode()`: prefers parenthesised codes `(TKT10001)`, ignores `(CEFR B2)` and `(180 op)` false positives.
- Grade normalisation: numeric `1–5`, or text variants `HYV / HYVÄKSYTTY / PASS / PASSED / GODKÄND / G / HT / TT / S`.
- Failed grades: `0 / HYL / HYLÄTTY / FAIL / FAILED / UNDERKÄND` → `passed = false`.

### Chart Calculations (`chartCalculations.ts`)
- `calculateWeightedGpa()`: credits-weighted, numeric grades only (1–5).
- `calculateProjectedGraduation()`: linear extrapolation from actual pace since `studyStartDate`.
- `createGoalLine()`: two-point line from `studyStartDate` to projected finish at `nominalPace` ECTS/yr.
- Semester split: Fall = August–December, Spring = January–July.

---

## Editing State

`page.tsx` owns all mutable state:
- `transcript: TranscriptData | null` — the loaded dataset.
- `anonymize: boolean` — masks name and student number in the UI.
- `isStudyStartModalOpen: boolean` — controls the configuration modal.

`CourseTable` receives `onUpdateCourses` to allow inline edits, adds, and deletes. Changes propagate up and re-render all derived views immediately.

The navbar `EXPORT` button serialises the current `TranscriptData` state (including manual edits) to JSON for download.

---

## Running Locally

```bash
npm install
npm run dev       # Next.js dev server at localhost:3000
npm test          # Vitest unit tests
npm run typecheck # TypeScript strict check
npm run lint      # oxlint
```

Docker:
```bash
docker compose up
```

---

## Agent Guidance

- **Client-side only.** Don't add server-side processing or external data transmission for transcript data.
- **Design consistency matters.** Any new UI must follow the brutalist system: zero border-radius, 2px/4px borders, `#1076db` accent, monospace labels, ALL CAPS copy. Read `.agent/skills/the-verge/SKILL.md` before touching UI.
- **`page.tsx` is the state root.** New features should receive data via props and emit changes via callbacks — don't introduce context or global state without discussion.
- **Parsing is regex-heavy.** When editing `textParser.ts` or `pdfParser.ts`, run vitest tests first: `npm test`. Add regression tests for any new PDF format you handle.
- **No `any` types.** Strict TypeScript. Check with `npm run typecheck` before finishing.
- **Highcharts licence note.** The project uses Highcharts non-commercially. Don't add features that would require a commercial licence (e.g. map modules, certain enterprise features).
- **`isStudyModuleCredit: true`** courses must always be excluded from credit sums and chart series. They're degree-level aggregates, not individual courses.
- **Finnish/Swedish/English support** must be maintained in regex patterns inside the parsers.

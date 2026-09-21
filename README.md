# sisukone

Academic progression dashboard for Finnish university students.

Drop in your official Sisu transcript PDF (`Opintosuoritusote`) and get instant charts for credit accumulation, GPA trends, and your projected graduation date.

Runs 100% in your browser. No uploads, no backend, no tracking.

---

## Why?

Sisu's built-in transcript page is just a flat table. It tells you what you passed, but not your momentum, whether you're keeping up with the standard 60 credits/year pace, or how your GPA has evolved across semesters.

Sisukone parses the official PDF directly on your machine and gives you:

- **Credit accumulation curve** — Cumulative credits over time plotted against nominal pace (e.g. 60 op/year) and degree targets (180 op BSc, 120 op MSc, or 300 op combined).
- **Graduation forecast** — Linear projection based on your actual completion speed and degree start date.
- **GPA tracking** — Credit-weighted GPA across your whole degree, by semester, or as rolling group averages, plus a grade distribution breakdown (1–5 and Pass).
- **Course table & what-ifs** — Search and filter your courses, or edit grades and credits inline to see how future courses affect your GPA.
- **Anonymize mode** — One click hides your name and student number so you can share screenshots without leaking personal info.
- **Local export / import** — Save your parsed and edited transcript to a JSON file and reload it anytime.

Supports transcripts in **Finnish, Swedish, and English** from any university running Sisu (Helsinki, Aalto, Tampere, Jyväskylä, LUT, etc.).

---

## How to get your transcript

1. Log into your university's Sisu portal (`sisu.helsinki.fi`, `sisu.aalto.fi`, etc.).
2. Go to **My Profile** → **Attainments** (*Opintosuoritukset*).
3. Click **Export transcript** / **Tulosta opintosuoritusote** in the top right.
4. Download the PDF and drop it into Sisukone (or click **Load Sample Demo** to try it with dummy data).

---

## Privacy

Transcripts contain your full name, student number, and entire academic record.

Sisukone has no backend, no analytics, and no remote storage. The PDF is parsed entirely in browser memory using a `pdfjs-dist` Web Worker. Your data stays in your browser (`localStorage`) and never touches a server.

---

## Development

Requires Node.js 20+.

```bash
# Install dependencies
npm install

# Start dev server on http://localhost:3000
npm run dev

# Run unit tests
npm test

# Typecheck & lint
npm run typecheck
npm run lint

# Build for production
npm run build
npm run preview
```

### Docker

```bash
docker compose up --build
```
Runs at `http://localhost:3000`.

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Highcharts & Highcharts Stock
- **PDF Parsing**: `pdfjs-dist` (client-side worker)
- **Testing**: Vitest

---

## Disclaimer

- Unofficial tool. Not affiliated with Sisu, Funidata Oy, or any university.
- Highcharts is used for non-commercial personal / academic use.

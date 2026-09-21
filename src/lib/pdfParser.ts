import { Course, TranscriptData } from '@/types/student';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import {
  parseCourseFromLine,
  parseRawTranscriptText,
  parseStandardDate,
  DATE_EURO_REGEX,
  DATE_ISO_REGEX,
  CREDITS_REGEX,
} from './textParser';

export type PDFTextItem = TextItem;

export interface ClusteredRow {
  y: number;
  items: Array<{ text: string; x: number; width: number; height: number }>;
  combinedText: string;
}

/**
 * Configure PDF.js worker dynamically in browser
 */
async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

/**
 * Cluster text items by Y coordinate into coherent horizontal rows
 */
export function clusterTextItemsIntoRows(items: PDFTextItem[], tolerance = 4): ClusteredRow[] {
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]); // Top to bottom (Y descends in PDF coordinates)

  const rows: ClusteredRow[] = [];

  for (const item of sorted) {
    const text = item.str.trim();
    if (!text) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const width = item.width;
    const height = item.height || 10;

    // Find if an existing row is within Y tolerance
    let matchedRow = rows.find((r) => Math.abs(r.y - y) <= tolerance);

    if (matchedRow) {
      matchedRow.items.push({ text: item.str, x, width, height });
    } else {
      matchedRow = {
        y,
        items: [{ text: item.str, x, width, height }],
        combinedText: '',
      };
      rows.push(matchedRow);
    }
  }

  // Sort items in each row left-to-right by X coordinate and assemble combinedText
  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
    row.combinedText = row.items.map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim();
  }

  // Return rows in reading order (top to bottom)
  return rows.sort((a, b) => b.y - a.y);
}

/**
 * Parse a Sisu Transcript PDF file client-side
 */
export async function parseSisuPdf(file: File | ArrayBuffer): Promise<TranscriptData> {
  const pdfjs = await getPdfJs();
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;

  const allCourses: Course[] = [];
  let detectedStartDate: string | undefined;
  let detectedStudentName: string | undefined;
  let detectedStudentNumber: string | undefined;
  let detectedDegree: string | undefined;
  let detectedTargetCredits = 180;

  const fullTextLines: string[] = [];
  const pageRowsList: { page: number; rows: ClusteredRow[] }[] = [];

  // Pass 1: Extract clustered rows per page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.filter((item): item is TextItem => 'str' in item);
    const rows = clusterTextItemsIntoRows(textItems);
    pageRowsList.push({ page: pageNum, rows });

    for (const r of rows) {
      fullTextLines.push(r.combinedText);
    }
  }

  // Pass 2: Extract Student Profile Metadata across pages
  for (const { rows } of pageRowsList) {
    for (let i = 0; i < rows.length; i++) {
      const line = rows[i].combinedText;

      // Student Name detection
      if (!detectedStudentName) {
        const fnMatch = line.match(/\b(?:etunimet|förnamn|first names?)[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s-]+)/i);
        if (fnMatch) {
          const nextRow = rows[i + 1]?.combinedText || '';
          const lnMatch = nextRow.match(/\b(?:sukunimi|efternamn|last name|surname)[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s-]+)/i);
          if (lnMatch) {
            detectedStudentName = `${fnMatch[1].trim()} ${lnMatch[1].trim()}`;
          }
        } else if (/^OPINTOSUORITUSOTE\b|^TRANSCRIPT OF RECORDS\b|^STUDIEPRESTATIONSUTDRAG\b/i.test(line) && rows[i + 1]) {
          const nextL = rows[i + 1].combinedText.trim();
          if (nextL && !/opiskelija|student|syntymäaika|tutkinto/i.test(nextL)) {
            detectedStudentName = nextL;
          }
        }
      }

      // Student Number
      if (!detectedStudentNumber) {
        const snMatch =
          line.match(/\b(?:opiskelijanumero|student number|studienummer)[:\s]+(\d{6,10})\b/i) ||
          line.match(/\b(01\d{7}|\d{8,9})\b/);
        if (snMatch) {
          detectedStudentNumber = snMatch[snMatch.length - 1];
        }
      }

      // Study Start Date
      if (!detectedStartDate) {
        const startMatch =
          line.match(
            /\b(?:aloituspäivä(?:määrä)?|alkamispäivä|opiskeluoikeus alkanut|opinto-oikeus alkoi|study right (?:started|begins)|start(?:ing)? date|startdatum|begynnelsedatum|studierättens startdatum|valid from|giltig från)[:\s]+(\d{1,2}[.]\d{1,2}[.]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i
          ) ||
          line.match(
            /\b(?:voimassa|valid(?:ity)?|giltig(?:het)?)[:\s]+(\d{1,2}[.]\d{1,2}[.]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i
          );

        if (startMatch) {
          const d = parseStandardDate(startMatch[1]);
          if (d) detectedStartDate = d;
        } else if (
          /(?:^|[\s:])(?:aloituspäivä(?:määrä)?|alkamispäivä|start(?:ing)? date|startdatum|begynnelsedatum)(?:[\s:]|$)/i.test(line) &&
          rows[i + 1]
        ) {
          const nextDateMatch =
            rows[i + 1].combinedText.match(DATE_EURO_REGEX) || rows[i + 1].combinedText.match(DATE_ISO_REGEX);
          if (nextDateMatch) {
            const d = parseStandardDate(nextDateMatch[0]);
            if (d) detectedStartDate = d;
          }
        }
      }

      // Degree Programme and Target Credits
      if (!detectedDegree) {
        const degMatch = line.match(/(?:tutkinto-ohjelma|koulutusohjelma|degree programme)[:\s]+(.+)/i);
        if (degMatch) {
          detectedDegree = degMatch[1].replace(/\s*\(\d+\s*op\)/i, '').trim();
        } else if (
          /(?:kandiohjelma|maisteriohjelma|bachelor's programme|master's programme)/i.test(line) &&
          !line.includes('180 op') &&
          !line.includes('3V + 2V')
        ) {
          detectedDegree = line.trim();
        }
      }

      if (/\b(\d{2,3})\s*op\b/i.test(line) && /tutkinto|kandi|maisteri|bachelor|master/i.test(line)) {
        const targetMatch = line.match(/\b(\d{2,3})\s*op\b/i);
        if (targetMatch) {
          const tc = parseInt(targetMatch[1], 10);
          if (tc >= 60 && tc <= 360) {
            detectedTargetCredits = tc;
          }
        }
      }
    }
  }

  // Pass 3: Extract Courses with Section Tracking and Multi-line Lookahead
  let inOsasuoritukset = false;

  for (const { rows } of pageRowsList) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const line = row.combinedText;

      // Check section boundaries
      if (/^Osasuoritukset\b/i.test(line) || /^OPINTOSUORITUSTEN ARVOSANA/i.test(line) || /^Kaikki opintojaksot yhteensä/i.test(line)) {
        inOsasuoritukset = true;
      }
      if (/^Opintojaksot\b/i.test(line) || /^Opintosuoritukset\b/i.test(line)) {
        inOsasuoritukset = false;
      }

      // Ignore partial course attainments or legends
      if (inOsasuoritukset) {
        continue;
      }

      // Multi-line continuation lookahead
      const nextRow = rows[r + 1];
      let continuationLine = '';
      if (nextRow && Math.abs(row.y - nextRow.y) < 20) {
        if (!DATE_EURO_REGEX.test(nextRow.combinedText) && !DATE_ISO_REGEX.test(nextRow.combinedText) && !CREDITS_REGEX.test(nextRow.combinedText)) {
          continuationLine = nextRow.combinedText;
        }
      }

      const course = parseCourseFromLine(line, allCourses.length, continuationLine);
      if (course && !course.isStudyModuleCredit) {
        const exists = allCourses.some((c) => c.code === course.code && c.date === course.date);
        if (!exists) {
          allCourses.push(course);
        }
      }
    }
  }

  // Fallback to raw text parsing across all lines if few courses detected
  if (allCourses.length === 0) {
    const fallback = parseRawTranscriptText(fullTextLines.join('\n'));
    if (fallback.courses.length > 0) {
      return {
        profile: {
          studentName: fallback.studentName || detectedStudentName || 'Student',
          studentNumber: fallback.studentNumber || detectedStudentNumber,
          degreeProgramme: fallback.degreeProgramme || detectedDegree || 'Degree Programme',
          studyStartDate: fallback.studyStartDate || detectedStartDate || '2022-08-01',
          targetCredits: detectedTargetCredits,
          nominalPace: 60,
        },
        courses: fallback.courses,
      };
    }
  }

  // Sort courses chronologically
  allCourses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Determine study start date fallback: earliest course date or default to Fall of earliest course year
  if (!detectedStartDate && allCourses.length > 0) {
    const earliestDate = allCourses[0].date;
    const earliestYear = new Date(earliestDate).getFullYear();
    detectedStartDate = `${earliestYear}-08-01`;
  }

  return {
    profile: {
      studentName: detectedStudentName || 'Student',
      studentNumber: detectedStudentNumber,
      degreeProgramme: detectedDegree || 'Degree Programme',
      studyStartDate: detectedStartDate || '2022-08-01',
      targetCredits: detectedTargetCredits,
      nominalPace: 60,
    },
    courses: allCourses,
  };
}



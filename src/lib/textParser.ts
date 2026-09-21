import { Course } from '@/types/student';

// Regex components
export const DATE_EURO_REGEX = /\b(\d{1,2})[.](\d{1,2})[.](\d{4})\b/;
export const DATE_ISO_REGEX = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
export const CREDITS_REGEX = /\b(\d+(?:[.,]\d+)?)\s*(?:op|cr|sp|ects|credits|credit|pisteet)\b/i;
export const LANGUAGE_REGEX = /\b(fi|sv|en|de|fr|es|ru|it|zh|ja)\b/i;
export const GRADE_TEXT_REGEX =
  /^(HYVÄKSYTTY|GODKÄND|PASSED|HYLÄTTY|FAILED|HYV\.?|GODK\.?|PASS|HYL|HT|TT|FAIL|UNDERKÄND|UNDERK\.?|S|G)$/i;
export const GRADE_NUM_REGEX = /^[0-5]$/;

// Known module titles to exclude from single course list
const MODULE_EXCLUSION_WORDS = [
  'perusopinnot',
  'aineopinnot',
  'syventävät opinnot',
  'basic studies',
  'intermediate studies',
  'advanced studies',
  'grundstudier',
  'ämnesstudier',
  'opintokokonaisuus',
  'opintokokonaisuudet',
  'study module',
  'yhteensä',
  'total',
  'summa',
  'kaikki opintojaksot',
];

export function isModuleHeader(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return MODULE_EXCLUSION_WORDS.some((word) => lower.includes(word));
}

export function parseStandardDate(raw: string): string | null {
  const euroMatch = raw.match(DATE_EURO_REGEX);
  if (euroMatch) {
    const [, d, m, y] = euroMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  const isoMatch = raw.match(DATE_ISO_REGEX);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Extract course code from text.
 * Prioritizes parentheses format used in Sisu tables e.g. "(MAT21014)", "(DIGI-A)", "(3iyj-xsi2)", "(20200)", "(AYMED-TOU85aen)"
 * while ignoring non-code parentheticals like "(CEFR B2)", "(180 op)", "(3V + 2V)".
 * Falls back to bare alphanumeric codes like "TKT10001", "CS-E4000".
 */
export function extractCourseCode(text: string): { code: string; isParenthesized: boolean } | null {
  // 1. Check parenthesized codes
  const parenMatches = Array.from(text.matchAll(/\(([^)]+)\)/g));
  for (const m of parenMatches) {
    const inside = m[1].trim();
    if (/^(CEFR|180\s*op|\d+V|\d+\s*op)/i.test(inside)) continue;
    // Match code format: letters/digits with optional hyphens/underscores
    if (/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(inside)) {
      return { code: inside, isParenthesized: true };
    }
  }

  // 2. Check bare course code at word boundary (e.g. "TKT10001", "CS-E4000", "MAT11001", "KK-ENG101")
  const bareMatch = text.match(/\b([A-Z]{2,6}[-_]?[A-Z0-9]{1,8}|[A-Z]{2,4}\d{4,6})\b/);
  if (bareMatch) {
    return { code: bareMatch[1], isParenthesized: false };
  }

  return null;
}

/**
 * Parse a course from a single line or combined multi-line text
 */
export function parseCourseFromLine(
  line: string,
  index: number,
  continuationLine = '',
): Course | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 4) return null;

  // Header / Footer exclusions
  if (
    /^(suorituksen nimi ja koodi|opintojaksot|osasuoritukset|tutkintosuoritukset|opintosuoritusten arvosana|kaikki opintojaksot|helsingin yliopisto|pl 3|puh\.|helsinki\.fi|\d+\s*\/\s*\d+)/i.test(
      trimmed,
    )
  ) {
    return null;
  }

  const fullText = (trimmed + (continuationLine ? ' ' + continuationLine.trim() : '')).trim();

  // 1. Check module header exclusion
  if (isModuleHeader(trimmed) && !trimmed.match(/\b\d{1,2}[.]\d{1,2}[.]\d{4}\b/)) {
    return null;
  }

  // 2. Extract Date (must have date)
  const parsedDate = parseStandardDate(trimmed);
  if (!parsedDate) return null;

  // 3. Extract Credits
  let credits = 5;
  const creditsMatch = trimmed.match(CREDITS_REGEX);
  let creditsIndex = -1;
  let creditsLength = 0;

  if (creditsMatch) {
    credits = parseFloat(creditsMatch[1].replace(',', '.'));
    creditsIndex = trimmed.indexOf(creditsMatch[0]);
    creditsLength = creditsMatch[0].length;
  } else {
    // If no "op" suffix, check if standard tabular format has a bare credit number before grade & date
    const bareMatch = trimmed.match(
      /\s+(\d+(?:[.,]\d+)?)\s+(?:[A-Za-z0-9.]+\s+)?(?:\d{1,2}[.]\d{1,2}[.]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/,
    );
    if (bareMatch) {
      credits = parseFloat(bareMatch[1].replace(',', '.'));
      creditsIndex = trimmed.indexOf(bareMatch[1]);
      creditsLength = bareMatch[1].length;
    } else {
      return null;
    }
  }

  // 4. Extract Course Code
  const codeResult = extractCourseCode(fullText);
  if (!codeResult) return null;
  const { code } = codeResult;

  // 5. Extract Grade & Language
  let grade = 'HYV';
  let passed = true;
  let dateRawMatch = trimmed.match(DATE_EURO_REGEX) || trimmed.match(DATE_ISO_REGEX);
  const dateIndex = dateRawMatch ? trimmed.lastIndexOf(dateRawMatch[0]) : trimmed.length;

  if (creditsIndex !== -1 && dateIndex > creditsIndex) {
    const between = trimmed.slice(creditsIndex + creditsLength, dateIndex).trim();
    const betweenTokens = between.split(/\s+/).filter(Boolean);

    for (const token of betweenTokens) {
      const cleanToken = token.trim();
      const upperToken = cleanToken.toUpperCase().replace(/\.$/, '');

      if (GRADE_NUM_REGEX.test(cleanToken)) {
        grade = cleanToken;
      } else if (GRADE_TEXT_REGEX.test(cleanToken) || GRADE_TEXT_REGEX.test(upperToken)) {
        grade = upperToken === 'HYV' ? 'HYV' : upperToken;
      }
    }
  }

  if (
    ['0', 'HYL', 'HYLÄTTY', 'FAIL', 'FAILED', 'UNDERKÄND', 'UNDERK', 'UNDERK.'].includes(
      grade.toUpperCase(),
    )
  ) {
    passed = false;
  }

  // 6. Extract Clean Course Name
  let namePart = creditsIndex !== -1 ? trimmed.slice(0, creditsIndex).trim() : trimmed;

  // Remove code in parentheses or bare code
  if (codeResult.isParenthesized) {
    namePart = namePart.replace(new RegExp(`\\(${code}\\)`, 'g'), '');
  } else {
    namePart = namePart.replace(new RegExp(`\\b${code}\\b`, 'g'), '');
  }

  // Remove credit transfer note asterisk
  namePart = namePart.replace(/\*/g, '');

  // If continuation line contains CEFR level e.g. "(CEFR B2)" or "(CEFR B1)", keep it in name
  if (continuationLine && /\(CEFR\s+[A-Za-z0-9]+\)/i.test(continuationLine)) {
    const cefrMatch = continuationLine.match(/\(CEFR\s+[A-Za-z0-9]+\)/i);
    if (cefrMatch && !namePart.includes(cefrMatch[0])) {
      namePart += ` ${cefrMatch[0]}`;
    }
  }

  let cleanName = namePart
    .replace(/[|;\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-–:,\s]+|[-–:,\s]+$/g, '')
    .trim();

  if (!cleanName || cleanName.length < 2) {
    cleanName = code;
  }

  return {
    id: `c-${index}-${code}-${parsedDate}`,
    code,
    name: cleanName,
    credits,
    grade,
    date: parsedDate,
    passed,
    isStudyModuleCredit: false,
  };
}

export function parseRawTranscriptText(rawText: string): {
  courses: Course[];
  studyStartDate?: string;
  studentName?: string;
  studentNumber?: string;
  degreeProgramme?: string;
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const courses: Course[] = [];
  let studyStartDate: string | undefined;
  let studentName: string | undefined;
  let studentNumber: string | undefined;
  let degreeProgramme: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Student Name
    if (!studentName) {
      const fnMatch = line.match(
        /\b(?:etunimet|förnamn|first names?|nimi|name)[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s-]+)/i,
      );
      if (fnMatch) {
        const nextLine = lines[i + 1] || '';
        const lnMatch = nextLine.match(
          /\b(?:sukunimi|efternamn|last name|surname)[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s-]+)/i,
        );
        if (lnMatch) {
          studentName = `${fnMatch[1].trim()} ${lnMatch[1].trim()}`;
        } else {
          studentName = fnMatch[1].trim();
        }
      } else if (/^OPINTOSUORITUSOTE\b/i.test(line) && lines[i + 1]) {
        const nextL = lines[i + 1].trim();
        if (nextL && !/opiskelija|student/i.test(nextL)) {
          studentName = nextL;
        }
      }
    }

    // Student Number
    if (!studentNumber) {
      const snMatch =
        line.match(/\b(?:opiskelijanumero|student number|studienummer)[:\s]+(\d{6,10})\b/i) ||
        line.match(/\b(01\d{7}|\d{8,9})\b/);
      if (snMatch) {
        studentNumber = snMatch[snMatch.length - 1];
      }
    }

    // Study Start Date
    if (!studyStartDate) {
      const startMatch =
        line.match(
          /\b(?:aloituspäivä(?:määrä)?|alkamispäivä|opiskeluoikeus alkanut|opinto-oikeus alkoi|study right (?:started|begins)|start(?:ing)? date|startdatum|begynnelsedatum|studierättens startdatum|valid from|giltig från)[:\s]+(\d{1,2}[.]\d{1,2}[.]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        ) ||
        line.match(
          /\b(?:voimassa|valid(?:ity)?|giltig(?:het)?)[:\s]+(\d{1,2}[.]\d{1,2}[.]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        );

      if (startMatch) {
        const d = parseStandardDate(startMatch[1]);
        if (d) studyStartDate = d;
      } else if (
        /(?:^|[\s:])(?:aloituspäivä(?:määrä)?|alkamispäivä|start(?:ing)? date|startdatum|begynnelsedatum)(?:[\s:]|$)/i.test(
          line,
        ) &&
        lines[i + 1]
      ) {
        const nextDateMatch =
          lines[i + 1].match(DATE_EURO_REGEX) || lines[i + 1].match(DATE_ISO_REGEX);
        if (nextDateMatch) {
          const d = parseStandardDate(nextDateMatch[0]);
          if (d) studyStartDate = d;
        }
      }
    }

    // Degree Programme
    if (!degreeProgramme) {
      const degMatch = line.match(
        /(?:tutkinto-ohjelma|koulutusohjelma|degree programme)[:\s]+(.+)/i,
      );
      if (degMatch) {
        degreeProgramme = degMatch[1].replace(/\s*\(\d+\s*op\)/i, '').trim();
      } else if (
        /(?:kandiohjelma|maisteriohjelma|bachelor's programme|master's programme)/i.test(line) &&
        !line.includes('180 op') &&
        !line.includes('3V + 2V')
      ) {
        degreeProgramme = line.trim();
      }
    }

    // Check for continuation line (lookahead)
    const nextLine = lines[i + 1] || '';
    let continuationLine = '';
    if (nextLine && !parseStandardDate(nextLine) && !CREDITS_REGEX.test(nextLine)) {
      continuationLine = nextLine;
    }

    const course = parseCourseFromLine(line, courses.length, continuationLine);
    if (course && !course.isStudyModuleCredit) {
      const exists = courses.some((c) => c.code === course.code && c.date === course.date);
      if (!exists) {
        courses.push(course);
      }
    }
  }

  return {
    courses: courses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    studyStartDate,
    studentName,
    studentNumber,
    degreeProgramme,
  };
}

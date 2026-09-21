import { describe, it, expect } from 'vitest';
import { calculateAcademicYearSummaries, generateTranscriptPdf } from '../pdfExporter';
import { Course, TranscriptData } from '@/types/student';

describe('PDF Exporter Engine', () => {
  const mockCourses: Course[] = [
    {
      id: '1',
      code: 'TKT10001',
      name: 'Johdatus tietojenkäsittelytieteeseen',
      credits: 5,
      grade: '5',
      date: '2023-09-15',
      passed: true,
    },
    {
      id: '2',
      code: 'TKT10002',
      name: 'Ohjelmoinnin perusteet',
      credits: 5,
      grade: '4',
      date: '2023-11-20',
      passed: true,
    },
    {
      id: '3',
      code: 'TKT10003',
      name: 'Ohjelmoinnin jatkokurssi',
      credits: 5,
      grade: '3',
      date: '2024-02-15',
      passed: true,
    },
    {
      id: '4',
      code: 'TKT20001',
      name: 'Tietorakenteet ja algoritmit',
      credits: 10,
      grade: '5',
      date: '2024-10-10',
      passed: true,
    },
    {
      id: '5',
      code: 'HYV100',
      name: 'Akateemiset taidot',
      credits: 2,
      grade: 'HYV',
      date: '2024-09-01',
      passed: true,
    },
    {
      id: '6',
      code: 'FAILED01',
      name: 'Epäonnistunut kurssi',
      credits: 5,
      grade: '0',
      date: '2024-12-01',
      passed: false,
    },
  ];

  const mockTranscript: TranscriptData = {
    profile: {
      studentName: 'Matti Meikäläinen',
      studentNumber: '012345678',
      degreeProgramme: 'Tietojenkäsittelytieteen kandiohjelma',
      studyStartDate: '2023-08-01',
      targetCredits: 180,
      nominalPace: 60,
    },
    courses: mockCourses,
  };

  describe('calculateAcademicYearSummaries', () => {
    it('groups courses correctly into August-July academic years', () => {
      const summaries = calculateAcademicYearSummaries(mockCourses);

      // We expect two academic years: 2023–2024 (courses 1, 2, 3) and 2024–2025 (courses 4, 5)
      // Course 6 is failed, so it should not be included in passed credit counts.
      expect(summaries).toHaveLength(2);

      const y1 = summaries.find((s) => s.academicYear === '2023–2024');
      expect(y1).toBeDefined();
      expect(y1?.credits).toBe(15);
      expect(y1?.coursesCount).toBe(3);
      // Grades: 5 (5 op), 4 (5 op), 3 (5 op) -> (25 + 20 + 15) / 15 = 4.00
      expect(y1?.gpa).toBe(4.0);

      const y2 = summaries.find((s) => s.academicYear === '2024–2025');
      expect(y2).toBeDefined();
      expect(y2?.credits).toBe(12); // 10 op + 2 op
      expect(y2?.coursesCount).toBe(2);
      // Graded: 10 op with grade 5 -> 5.00 (course 5 is HYV, not numeric)
      expect(y2?.gpa).toBe(5.0);
    });

    it('returns empty array when no courses exist', () => {
      expect(calculateAcademicYearSummaries([])).toEqual([]);
    });
  });

  describe('generateTranscriptPdf', () => {
    it('generates a multi-page PDF document with correct metadata and pages', async () => {
      const doc = await generateTranscriptPdf(mockTranscript, { anonymize: false, includeChart: false });

      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);

      const buffer = doc.output('arraybuffer');
      expect(buffer.byteLength).toBeGreaterThan(1000);
    });

    it('supports anonymization masking in generated document', async () => {
      const doc = await generateTranscriptPdf(mockTranscript, { anonymize: true, includeChart: false });

      expect(doc).toBeDefined();
      const output = doc.output('datauristring');
      expect(output).toContain('data:application/pdf');
    });

    it('handles empty transcript with zero courses without crashing', async () => {
      const emptyTranscript: TranscriptData = {
        profile: {
          studyStartDate: '2024-08-01',
          targetCredits: 180,
          nominalPace: 60,
        },
        courses: [],
      };

      const doc = await generateTranscriptPdf(emptyTranscript, { includeChart: false });
      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    });

    it('supports both asc and desc sort order', async () => {
      const docAsc = await generateTranscriptPdf(mockTranscript, { sortOrder: 'asc', includeChart: false });
      const docDesc = await generateTranscriptPdf(mockTranscript, { sortOrder: 'desc', includeChart: false });

      expect(docAsc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
      expect(docDesc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    });
  });
});

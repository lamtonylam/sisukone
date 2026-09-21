import { describe, it, expect } from 'vitest';
import { Course } from '@/types/student';
import {
  calculateCumulativeCredits,
  createGoalLine,
  calculateWeightedGpa,
  calculateTotalMeanSeries,
  calculateGroupMeanSeries,
  calculateSemesterMeanSeries,
  calculateGradeDistribution,
  calculateProjectedGraduation,
  isNumericGrade,
} from '../chartCalculations';

const mockCourses: Course[] = [
  {
    id: '1',
    code: 'TKT10001',
    name: 'Course A',
    credits: 5,
    grade: '5',
    date: '2022-09-15',
    passed: true,
  },
  {
    id: '2',
    code: 'TKT10002',
    name: 'Course B',
    credits: 10,
    grade: '4',
    date: '2022-12-15',
    passed: true,
  },
  {
    id: '3',
    code: 'KK-ENG101',
    name: 'Language Course',
    credits: 5,
    grade: 'HYV',
    date: '2023-01-20',
    passed: true,
  },
  {
    id: '4',
    code: 'TKT20001',
    name: 'Failed Course',
    credits: 5,
    grade: '0',
    date: '2023-03-01',
    passed: false,
  },
  {
    id: '5',
    code: 'TKT20002',
    name: 'Course C',
    credits: 5,
    grade: '3',
    date: '2023-05-15',
    passed: true,
  },
];

describe('chartCalculations - Edge Case & Mathematical Validation', () => {
  describe('calculateCumulativeCredits', () => {
    it('calculates cumulative step totals excluding failed courses', () => {
      const { points, totalCredits } = calculateCumulativeCredits(mockCourses);

      // Passed courses: Course A (5), Course B (10), Language Course (5), Course C (5) = 25 op
      expect(totalCredits).toBe(25);
      expect(points).toHaveLength(4);

      expect(points[0].cumulativeCredits).toBe(5);
      expect(points[1].cumulativeCredits).toBe(15);
      expect(points[2].cumulativeCredits).toBe(20);
      expect(points[3].cumulativeCredits).toBe(25);
    });

    it('handles empty course list safely', () => {
      const { points, totalCredits } = calculateCumulativeCredits([]);
      expect(totalCredits).toBe(0);
      expect(points).toEqual([]);
    });

    it('aggregates multiple courses finished on the exact same date', () => {
      const sameDayCourses: Course[] = [
        { id: '1', code: 'A', name: 'A', credits: 5, grade: '5', date: '2023-05-15', passed: true },
        { id: '2', code: 'B', name: 'B', credits: 10, grade: '4', date: '2023-05-15', passed: true },
      ];
      const { points, totalCredits } = calculateCumulativeCredits(sameDayCourses);
      expect(totalCredits).toBe(15);
      expect(points).toHaveLength(2);
      expect(points[1].cumulativeCredits).toBe(15);
    });
  });

  describe('calculateWeightedGpa - Weighted GPA Math', () => {
    it('calculates mathematically exact credit-weighted average grade', () => {
      // Graded courses in mockCourses:
      // Course A: 5 cr * 5 = 25
      // Course B: 10 cr * 4 = 40
      // Course C: 5 cr * 3 = 15
      // Sum = (25 + 40 + 15) / (5 + 10 + 5) = 80 / 20 = 4.00
      const gpa = calculateWeightedGpa(mockCourses);
      expect(gpa).toBe(4.0);
    });

    it('returns null safely for 100% pass/fail courses (zero graded credits, no 0/0 error)', () => {
      const passOnlyCourses: Course[] = [
        { id: '1', code: 'A', name: 'A', credits: 5, grade: 'HYV', date: '2023-05-15', passed: true },
        { id: '2', code: 'B', name: 'B', credits: 5, grade: 'Pass', date: '2023-06-15', passed: true },
      ];
      expect(calculateWeightedGpa(passOnlyCourses)).toBeNull();
    });

    it('returns null for empty course list', () => {
      expect(calculateWeightedGpa([])).toBeNull();
    });
  });

  describe('isNumericGrade', () => {
    it('validates 1 to 5', () => {
      expect(isNumericGrade(1)).toBe(true);
      expect(isNumericGrade('5')).toBe(true);
      expect(isNumericGrade('3 ')).toBe(true);
      expect(isNumericGrade('0')).toBe(false);
      expect(isNumericGrade('HYV')).toBe(false);
      expect(isNumericGrade('Pass')).toBe(false);
      expect(isNumericGrade('')).toBe(false);
    });
  });

  describe('calculateTotalMeanSeries', () => {
    it('computes cumulative weighted GPA trajectory point by point', () => {
      const series = calculateTotalMeanSeries(mockCourses);
      expect(series).toHaveLength(3); // 3 graded courses

      // Step 1: Course A (5 cr, grade 5) -> GPA 5.0
      expect(series[0].value).toBe(5.0);

      // Step 2: Course A + B ((5*5 + 10*4)/15 = 65/15) -> GPA 4.33
      expect(series[1].value).toBe(4.33);

      // Step 3: Course A + B + C ((65 + 5*3)/20 = 80/20) -> GPA 4.0
      expect(series[2].value).toBe(4.0);
    });
  });

  describe('calculateGroupMeanSeries - Course Chunking', () => {
    it('chunks graded courses into groups and handles non-divisible remainders', () => {
      // 3 graded courses with groupSize 2 -> 2 chunks: chunk 1 (2 courses), chunk 2 (1 course)
      const groupSeries = calculateGroupMeanSeries(mockCourses, 2);
      expect(groupSeries).toHaveLength(2);

      // Group 1: Course A (5 cr, grade 5) + Course B (10 cr, grade 4) -> 65/15 = 4.33
      expect(groupSeries[0].value).toBe(4.33);
      expect(groupSeries[0].courseCount).toBe(2);

      // Group 2: Course C (5 cr, grade 3) -> 3.0
      expect(groupSeries[1].value).toBe(3.0);
      expect(groupSeries[1].courseCount).toBe(1);
    });
  });

  describe('calculateSemesterMeanSeries - Academic Term Boundaries', () => {
    it('groups courses into Fall (Aug-Dec) and Spring (Jan-Jul) semesters', () => {
      const semSeries = calculateSemesterMeanSeries(mockCourses);
      // Graded courses:
      // Fall 2022: Course A (5 cr, 5) + Course B (10 cr, 4) -> 4.33
      // Spring 2023: Course C (5 cr, 3) -> 3.0
      expect(semSeries).toHaveLength(2);
      expect(semSeries[0].name).toContain('Fall 2022');
      expect(semSeries[0].value).toBe(4.33);

      expect(semSeries[1].name).toContain('Spring 2023');
      expect(semSeries[1].value).toBe(3.0);
    });
  });

  describe('createGoalLine', () => {
    it('creates a 60 op/yr nominal slope line starting at study start date', () => {
      const startTime = new Date('2022-08-01').getTime();
      const endTime = startTime + 3 * 365.25 * 24 * 60 * 60 * 1000; // 3 years

      const goal = createGoalLine('2022-08-01', endTime, 180, 60);
      expect(goal).toHaveLength(2);
      expect(goal[0].credits).toBe(0);
      expect(goal[1].credits).toBe(180);
    });
  });

  describe('calculateGradeDistribution', () => {
    it('counts occurrences and percentages across 5, 4, 3, 2, 1 and Pass', () => {
      const dist = calculateGradeDistribution(mockCourses);
      const grade5 = dist.find((d) => d.grade === '5');
      const grade4 = dist.find((d) => d.grade === '4');
      const grade3 = dist.find((d) => d.grade === '3');
      const pass = dist.find((d) => d.grade === 'Pass');

      expect(grade5?.count).toBe(1);
      expect(grade4?.count).toBe(1);
      expect(grade3?.count).toBe(1);
      expect(pass?.count).toBe(1);
    });
  });

  describe('calculateProjectedGraduation', () => {
    it('estimates graduation timeline based on active pace', () => {
      const profile = { studyStartDate: '2021-08-01', targetCredits: 180 };
      const res = calculateProjectedGraduation(profile, 150);
      expect(res).not.toBeNull();
      expect(res?.paceCreditsPerYear).toBeGreaterThan(0);
      expect(typeof res?.projectedDate).toBe('string');
    });

    it('returns Completed when target credits are met', () => {
      const profile = { studyStartDate: '2021-08-01', targetCredits: 180 };
      const res = calculateProjectedGraduation(profile, 180);
      expect(res?.projectedDate).toBe('Completed');
    });
  });
});


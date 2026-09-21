import { Course, CumulativePoint, GoalPoint, GradeDistributionData, MeanPoint } from '@/types/student';
import { differenceInDays, format, isValid, parseISO } from 'date-fns';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.25;

/**
 * Filter valid passed courses (excluding failed and module headers)
 */
export function getPassedCourses(courses: Course[]): Course[] {
  return courses
    .filter((c) => c.passed && !c.isStudyModuleCredit && c.credits > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculate cumulative credit progression over time (step curve data)
 */
export function calculateCumulativeCredits(courses: Course[]): {
  points: CumulativePoint[];
  totalCredits: number;
} {
  const passed = getPassedCourses(courses);
  let total = 0;
  const points: CumulativePoint[] = [];

  for (const course of passed) {
    const time = new Date(course.date).getTime();
    if (!Number.isFinite(time)) continue;
    total += course.credits;
    points.push({
      timestamp: time,
      cumulativeCredits: total,
      course,
    });
  }

  return { points, totalCredits: total };
}

/**
 * Create 60 ECTS/year nominal pace goal line
 */
export function createGoalLine(
  startDateStr: string,
  endDateTimestamp: number,
  targetCredits = 180,
  nominalPace = 60
): GoalPoint[] {
  const parsedStart = parseISO(startDateStr);
  const startTime = isValid(parsedStart) ? parsedStart.getTime() : new Date().getTime();
  const safeEndTime = Math.max(
    endDateTimestamp,
    startTime + (targetCredits / nominalPace) * DAYS_PER_YEAR * MS_PER_DAY
  );

  const totalYears = (safeEndTime - startTime) / (DAYS_PER_YEAR * MS_PER_DAY);
  const endingCredits = Math.round(totalYears * nominalPace * 10) / 10;

  return [
    { timestamp: startTime, credits: 0 },
    { timestamp: safeEndTime, credits: Math.max(targetCredits, endingCredits) },
  ];
}

/**
 * Check if a grade is numeric (1-5)
 */
export function isNumericGrade(grade: string | number): boolean {
  const num = typeof grade === 'number' ? grade : Number(String(grade).trim());
  return Number.isFinite(num) && num >= 1 && num <= 5;
}

/**
 * Calculate overall weighted GPA
 */
export function calculateWeightedGpa(courses: Course[]): number | null {
  const passed = getPassedCourses(courses).filter((c) => isNumericGrade(c.grade));
  if (passed.length === 0) return null;

  let totalWeighted = 0;
  let totalCredits = 0;

  for (const course of passed) {
    const g = Number(course.grade);
    totalWeighted += g * course.credits;
    totalCredits += course.credits;
  }

  if (totalCredits === 0) return null;
  return Math.round((totalWeighted / totalCredits) * 100) / 100;
}

/**
 * Total Mean Series: Cumulative weighted GPA over time
 */
export function calculateTotalMeanSeries(courses: Course[]): MeanPoint[] {
  const graded = getPassedCourses(courses).filter((c) => isNumericGrade(c.grade));
  if (graded.length === 0) return [];

  let cumWeighted = 0;
  let cumCredits = 0;
  const series: MeanPoint[] = [];

  for (let i = 0; i < graded.length; i++) {
    const course = graded[i];
    const g = Number(course.grade);
    cumWeighted += g * course.credits;
    cumCredits += course.credits;

    const time = new Date(course.date).getTime();
    const gpa = Math.round((cumWeighted / cumCredits) * 100) / 100;

    series.push({
      timestamp: time,
      value: gpa,
      name: `${course.name} (${course.code})`,
      courseCount: i + 1,
    });
  }

  return series;
}

/**
 * Group Mean Series: Weighted GPA chunked by group size (e.g. 5 courses)
 */
export function calculateGroupMeanSeries(courses: Course[], groupSize = 5): MeanPoint[] {
  const graded = getPassedCourses(courses).filter((c) => isNumericGrade(c.grade));
  if (graded.length === 0) return [];

  const size = Math.max(1, groupSize);
  const series: MeanPoint[] = [];

  for (let i = 0; i < graded.length; i += size) {
    const chunk = graded.slice(i, i + size);
    if (chunk.length === 0) continue;

    let chunkWeighted = 0;
    let chunkCredits = 0;
    for (const c of chunk) {
      chunkWeighted += Number(c.grade) * c.credits;
      chunkCredits += c.credits;
    }

    if (chunkCredits === 0) continue;
    const gpa = Math.round((chunkWeighted / chunkCredits) * 100) / 100;
    const lastCourse = chunk[chunk.length - 1];
    const firstCourse = chunk[0];
    const time = new Date(lastCourse.date).getTime();

    series.push({
      timestamp: time,
      value: gpa,
      name: `${chunk.length} courses (${firstCourse.date} – ${lastCourse.date})`,
      courseCount: chunk.length,
      dateRange: `${firstCourse.date} – ${lastCourse.date}`,
    });
  }

  return series;
}

/**
 * Academic semester helper
 */
export function getSemesterName(dateStr: string): { key: string; label: string; year: number } {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  // Fall: August (8) to December (12)
  // Spring: January (1) to July (7)
  if (month >= 8) {
    return { key: `fall-${year}`, label: `Syksy / Fall ${year}`, year };
  } else {
    return { key: `spring-${year}`, label: `Kevät / Spring ${year}`, year };
  }
}

/**
 * Semester Mean Series: Weighted GPA per semester
 */
export function calculateSemesterMeanSeries(courses: Course[]): MeanPoint[] {
  const graded = getPassedCourses(courses).filter((c) => isNumericGrade(c.grade));
  if (graded.length === 0) return [];

  const semesterMap = new Map<string, { label: string; courses: Course[] }>();

  for (const course of graded) {
    const sem = getSemesterName(course.date);
    const existing = semesterMap.get(sem.key) ?? { label: sem.label, courses: [] };
    existing.courses.push(course);
    semesterMap.set(sem.key, existing);
  }

  const series: MeanPoint[] = [];

  for (const semData of Array.from(semesterMap.values())) {
    let sumWeighted = 0;
    let sumCredits = 0;
    for (const c of semData.courses) {
      sumWeighted += Number(c.grade) * c.credits;
      sumCredits += c.credits;
    }

    if (sumCredits === 0) continue;
    const gpa = Math.round((sumWeighted / sumCredits) * 100) / 100;
    const lastCourse = semData.courses[semData.courses.length - 1];
    const time = new Date(lastCourse.date).getTime();

    series.push({
      timestamp: time,
      value: gpa,
      name: semData.label,
      courseCount: semData.courses.length,
    });
  }

  return series.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculate Grade Distribution (5, 4, 3, 2, 1, Pass)
 */
export function calculateGradeDistribution(courses: Course[]): GradeDistributionData[] {
  const passed = getPassedCourses(courses);
  const counts: Record<string, { count: number; credits: number }> = {
    '5': { count: 0, credits: 0 },
    '4': { count: 0, credits: 0 },
    '3': { count: 0, credits: 0 },
    '2': { count: 0, credits: 0 },
    '1': { count: 0, credits: 0 },
    'Pass': { count: 0, credits: 0 },
  };

  let totalCount = 0;

  for (const course of passed) {
    const g = String(course.grade).trim().toUpperCase();
    if (['5', '4', '3', '2', '1'].includes(g)) {
      counts[g].count += 1;
      counts[g].credits += course.credits;
      totalCount += 1;
    } else if (['HYV', 'PASS', 'PASSED', 'GODKÄND', 'G', 'HT', 'TT', 'S', 'HYV.'].includes(g)) {
      counts['Pass'].count += 1;
      counts['Pass'].credits += course.credits;
      totalCount += 1;
    }
  }

  return ['5', '4', '3', '2', '1', 'Pass'].map((grade) => {
    const c = counts[grade];
    return {
      grade,
      count: c.count,
      credits: c.credits,
      percentage: totalCount > 0 ? Math.round((c.count / totalCount) * 1000) / 10 : 0,
    };
  });
}

/**
 * Estimate projected graduation date based on student pace
 */
export function calculateProjectedGraduation(
  profile: { studyStartDate: string; targetCredits: number },
  currentCredits: number
): { projectedDate: string; paceCreditsPerYear: number } | null {
  if (currentCredits <= 0) return null;

  const startDate = parseISO(profile.studyStartDate);
  if (!isValid(startDate)) return null;

  const now = new Date();
  const daysActive = Math.max(30, differenceInDays(now, startDate));
  const yearsActive = daysActive / DAYS_PER_YEAR;

  const paceCreditsPerYear = Math.round((currentCredits / yearsActive) * 10) / 10;
  const remainingCredits = Math.max(0, profile.targetCredits - currentCredits);

  if (remainingCredits === 0) {
    return { projectedDate: 'Completed', paceCreditsPerYear };
  }

  const remainingYears = remainingCredits / (paceCreditsPerYear || 60);
  const projectedMs = now.getTime() + remainingYears * DAYS_PER_YEAR * MS_PER_DAY;
  const projectedDate = format(new Date(projectedMs), 'MMMM yyyy');

  return { projectedDate, paceCreditsPerYear };
}

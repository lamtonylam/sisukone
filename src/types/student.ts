export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  grade: string;
  date: string; // ISO format: YYYY-MM-DD
  passed: boolean;
  isStudyModuleCredit?: boolean;
  level?: string;
  language?: string;
}

export interface StudentProfile {
  studentName?: string;
  studentNumber?: string;
  degreeProgramme?: string;
  studyStartDate: string; // ISO format: YYYY-MM-DD
  targetCredits: number; // 180 (Bachelor), 120 (Master), 300 (Combined)
  nominalPace: number; // ECTS / year, default 60
}

export interface TranscriptData {
  profile: StudentProfile;
  courses: Course[];
}

export type GraphSize = 'small' | 'medium' | 'large';

export type GradeGraphMode = 'total' | 'group' | 'semester';

export interface CumulativePoint {
  timestamp: number; // Unix epoch ms
  cumulativeCredits: number;
  course: Course;
}

export interface GoalPoint {
  timestamp: number;
  credits: number;
}

export interface MeanPoint {
  timestamp: number;
  value: number;
  name?: string;
  courseCount?: number;
  dateRange?: string;
}

export interface GradeDistributionData {
  grade: string;
  count: number;
  credits: number;
  percentage: number;
}

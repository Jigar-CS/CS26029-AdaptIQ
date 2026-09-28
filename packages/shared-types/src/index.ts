export enum UserRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  COUNSELLOR = 'COUNSELLOR',
  HOD = 'HOD',
  HEAD = 'HEAD',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuestionType {
  MCQ_SINGLE = 'MCQ_SINGLE',
  MCQ_MULTIPLE = 'MCQ_MULTIPLE',
  TRUE_FALSE = 'TRUE_FALSE',
  NUMERIC = 'NUMERIC',
  SHORT_ANSWER = 'SHORT_ANSWER',
  CODING = 'CODING',
}

export enum QuestionStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

export enum LearningHistoryReason {
  PRACTICE_ATTEMPT = 'PRACTICE_ATTEMPT',
  TEST_RESULT = 'TEST_RESULT',
  REASSESSMENT = 'REASSESSMENT',
  MANUAL_RECALCULATION = 'MANUAL_RECALCULATION',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  studentId?: string;
  facultyId?: string;
}

export interface AuthorizedStudentCsvRow {
  enrollmentNumber: string;
  name: string;
  email: string;
  institute: string;
  department: string;
  program: string;
  semester: number | string;
  division: string;
  graduationYear: number | string;
}

export interface CsvValidationResult {
  validRows: AuthorizedStudentCsvRow[];
  invalidRows: {
    rowNumber: number;
    raw: Record<string, string>;
    errors: string[];
  }[];
  totalParsed: number;
  totalValid: number;
  totalInvalid: number;
}

export interface StudentDashboardSummary {
  overallMastery: number;
  questionsPracticed: number;
  accuracy: number;
  streakDays: number;
  testsAttempted: number;
  strongTopics: {
    topicId: string;
    topicName: string;
    courseName: string;
    masteryScore: number;
  }[];
  weakTopics: {
    topicId: string;
    topicName: string;
    courseName: string;
    masteryScore: number;
  }[];
  learningCurve: {
    recordedAt: string;
    masteryScore: number;
    topicName?: string;
  }[];
}

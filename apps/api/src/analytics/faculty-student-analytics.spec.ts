import { Test, TestingModule } from '@nestjs/testing';
import { LearningAnalyticsService } from './learning-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LearningHistoryReason, SubmissionStatus, UserRole } from '@prisma/client';

describe('Faculty Individual Student Analytics & Authorization', () => {
  let service: LearningAnalyticsService;
  let prisma: any;

  const mockCourse = {
    id: 'course-cs301',
    code: 'CS301',
    name: 'Data Structures and Algorithms',
    semester: 5,
    departmentId: 'dept-cse',
    department: { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
    topics: [
      { id: 't-arrays', name: 'Arrays & Dynamic Sizing', slug: 'arrays', misconceptions: [] },
      { id: 't-lists', name: 'Linked Lists & Pointers', slug: 'linked-lists', misconceptions: [{ title: 'Null pointer dereference' }] },
      { id: 't-trees', name: 'Binary Search Trees', slug: 'trees', misconceptions: [] },
    ],
  };

  beforeEach(async () => {
    prisma = {
      course: {
        findFirst: jest.fn().mockResolvedValue(mockCourse),
      },
      facultyProfile: {
        findUnique: jest.fn(),
      },
      studentProfile: {
        findFirst: jest.fn(),
      },
      authorizedStudent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      assessment: {
        findFirst: jest.fn(),
      },
      assessmentSubmission: {
        findMany: jest.fn(),
      },
      questionAttempt: {
        findMany: jest.fn(),
      },
      skillMastery: {
        findMany: jest.fn(),
      },
      learningHistory: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LearningAnalyticsService>(LearningAnalyticsService);
  });

  describe('Faculty-Student Authorization Security', () => {
    it('should grant access when student belongs to authorized CS division for CS course', async () => {
      // Faculty is in CSE department
      prisma.facultyProfile.findUnique.mockResolvedValue({
        id: 'fac-1',
        userId: 'user-fac-1',
        departmentId: 'dept-cse',
        courseId: null,
      });

      // Student is in CS Div 1
      prisma.studentProfile.findFirst.mockResolvedValue({
        id: 'sp-1',
        authorizedStudentId: 'auth-1',
        authorizedStudent: {
          enrollmentNumber: '24CS001',
          name: 'Rahul Patel',
          division: 'CS Div 1',
          department: 'Computer Science & Engineering',
        },
      });

      await expect(
        service.assertFacultyAuthorizedForStudent('user-fac-1', 'course-cs301', 'sp-1')
      ).resolves.not.toThrow();
    });

    it('should strictly reject unauthorized student from unrelated department/cohort', async () => {
      prisma.facultyProfile.findUnique.mockResolvedValue({
        id: 'fac-1',
        userId: 'user-fac-1',
        departmentId: 'dept-cse',
        courseId: null,
      });

      // Student is in CE-A / Electronics & Communication
      prisma.studentProfile.findFirst.mockResolvedValue({
        id: 'sp-ec-75',
        authorizedStudentId: 'auth-ec-75',
        authorizedStudent: {
          enrollmentNumber: '24EC075',
          name: 'Student 24EC075',
          division: 'CE-A',
          department: 'Electronics & Communication',
        },
      });

      await expect(
        service.assertFacultyAuthorizedForStudent('user-fac-1', 'course-cs301', 'sp-ec-75')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when student ID does not exist', async () => {
      prisma.facultyProfile.findUnique.mockResolvedValue({
        id: 'fac-1',
        userId: 'user-fac-1',
        departmentId: 'dept-cse',
        courseId: null,
      });
      prisma.studentProfile.findFirst.mockResolvedValue(null);
      prisma.authorizedStudent.findFirst.mockResolvedValue(null);

      await expect(
        service.assertFacultyAuthorizedForStudent('user-fac-1', 'course-cs301', 'non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Detailed Individual Student Analytics Calculations', () => {
    it('should accurately aggregate real student attempts, assessments, strengths, and struggle rates', async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({
        id: 'sp-1',
        authorizedStudent: {
          id: 'auth-1',
          enrollmentNumber: '24CS001',
          name: 'Rahul Patel',
          division: 'CS Div 1',
          email: 'rahul@charusat.edu.in',
          department: 'Computer Science & Engineering',
          semester: 5,
        },
        user: { email: 'rahul@charusat.edu.in' },
      });

      // Practice attempts: 3 attempts on Arrays (2 correct, 1 incorrect)
      prisma.questionAttempt.findMany.mockResolvedValue([
        {
          id: 'pa-1',
          isCorrect: true,
          createdAt: new Date('2026-10-08T10:00:00Z'),
          question: {
            id: 'q-1',
            topicId: 't-arrays',
            difficulty: 'MEDIUM',
            topic: { id: 't-arrays', name: 'Arrays & Dynamic Sizing' },
          },
        },
        {
          id: 'pa-2',
          isCorrect: true,
          createdAt: new Date('2026-10-08T10:05:00Z'),
          question: {
            id: 'q-2',
            topicId: 't-arrays',
            difficulty: 'MEDIUM',
            topic: { id: 't-arrays', name: 'Arrays & Dynamic Sizing' },
          },
        },
        {
          id: 'pa-3',
          isCorrect: false,
          createdAt: new Date('2026-10-08T10:10:00Z'),
          question: {
            id: 'q-3',
            topicId: 't-arrays',
            difficulty: 'HARD',
            topic: { id: 't-arrays', name: 'Arrays & Dynamic Sizing' },
          },
        },
      ]);

      // Assessment submissions: 1 formal assessment with score 80/100
      prisma.assessmentSubmission.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          totalScore: 80,
          submittedAt: new Date('2026-10-09T14:00:00Z'),
          assessment: { id: 'as-1', title: 'Midterm Exam', totalMarks: 100 },
          answers: [
            {
              isCorrect: true,
              question: {
                id: 'q-4',
                topicId: 't-arrays',
                topic: { id: 't-arrays', name: 'Arrays & Dynamic Sizing' },
              },
            },
          ],
        },
      ]);

      // SkillMastery: Arrays has 85% mastery, Linked Lists has 35% mastery (struggling)
      prisma.skillMastery.findMany.mockResolvedValue([
        {
          topicId: 't-arrays',
          masteryScore: 85.0,
          attemptCount: 4,
          correctCount: 3,
          lastPracticedAt: new Date('2026-10-09T14:00:00Z'),
          topic: { id: 't-arrays', name: 'Arrays & Dynamic Sizing', slug: 'arrays', misconceptions: [] },
        },
        {
          topicId: 't-lists',
          masteryScore: 35.0,
          attemptCount: 5,
          correctCount: 1,
          lastPracticedAt: new Date('2026-10-07T11:00:00Z'),
          topic: { id: 't-lists', name: 'Linked Lists & Pointers', slug: 'linked-lists', misconceptions: [{ title: 'Null pointer dereference' }] },
        },
      ]);

      // Learning History: 3 attempts showing progression
      prisma.learningHistory.findMany.mockResolvedValue([
        {
          id: 'lh-1',
          masteryScore: 60.0,
          reason: LearningHistoryReason.PRACTICE_ATTEMPT,
          recordedAt: new Date('2026-10-07T11:00:00Z'),
          topic: { name: 'Linked Lists & Pointers', course: { code: 'CS301', name: 'DSA' } },
        },
        {
          id: 'lh-2',
          masteryScore: 75.0,
          reason: LearningHistoryReason.PRACTICE_ATTEMPT,
          recordedAt: new Date('2026-10-08T10:10:00Z'),
          topic: { name: 'Arrays & Dynamic Sizing', course: { code: 'CS301', name: 'DSA' } },
        },
        {
          id: 'lh-3',
          masteryScore: 85.0,
          reason: LearningHistoryReason.TEST_RESULT,
          recordedAt: new Date('2026-10-09T14:00:00Z'),
          topic: { name: 'Arrays & Dynamic Sizing', course: { code: 'CS301', name: 'DSA' } },
        },
      ]);

      const data = await service.getFacultyStudentAnalytics('course-cs301', 'sp-1');

      expect(data.student.name).toBe('Rahul Patel');
      expect(data.student.enrollmentNumber).toBe('24CS001');
      expect(data.student.division).toBe('CS Div 1');

      // Overview Telemetry
      expect(data.overview.questionsPracticed).toBe(3);
      expect(data.overview.practiceAccuracy).toBe(67); // 2 out of 3 = 67%
      expect(data.overview.assessmentsAttempted).toBe(1);
      expect(data.overview.averageAssessmentScore).toBe(80);
      expect(data.overview.overallMastery).toBe(60); // Average of (85 + 35) = 60%
      expect(data.overview.improvementTrend).toBe('IMPROVING'); // From 53.5% initial to higher

      // Strengths & Struggling classification
      expect(data.strengths.length).toBe(1);
      expect(data.strengths[0].name).toBe('Arrays & Dynamic Sizing');
      expect(data.strengths[0].masteryScore).toBe(85);

      expect(data.strugglingTopics.length).toBe(1);
      expect(data.strugglingTopics[0].name).toBe('Linked Lists & Pointers');
      expect(data.strugglingTopics[0].masteryScore).toBe(35);
      expect(data.strugglingTopics[0].struggleRate).toBe(80); // 100 - (1/5 * 100) = 80%

      // Untested topic handled gracefully
      const treeTopic = data.topicMasteries.find((t) => t.topicId === 't-trees');
      expect(treeTopic?.status).toBe('UNTESTED');
      expect(treeTopic?.attemptCount).toBe(0);

      // Recent Activity
      expect(data.recentActivity.length).toBe(4); // 3 practice + 1 assessment
      expect(data.recentActivity[0].type).toBe('ASSESSMENT');
      expect(data.recentActivity[0].score).toBe(80);
    });

    it('should handle zero-attempt / brand-new students gracefully without synthetic mock data', async () => {
      prisma.studentProfile.findFirst.mockResolvedValue({
        id: 'sp-99',
        authorizedStudent: {
          id: 'auth-99',
          enrollmentNumber: '24CS099',
          name: 'Tank Hetvi Mayurbhai',
          division: 'CS Div 2',
          email: 'hetvi@charusat.edu.in',
          department: 'Computer Science & Engineering',
          semester: 5,
        },
        user: { email: 'hetvi@charusat.edu.in' },
      });

      prisma.questionAttempt.findMany.mockResolvedValue([]);
      prisma.assessmentSubmission.findMany.mockResolvedValue([]);
      prisma.skillMastery.findMany.mockResolvedValue([]);
      prisma.learningHistory.findMany.mockResolvedValue([]);

      const data = await service.getFacultyStudentAnalytics('course-cs301', 'sp-99');

      expect(data.student.name).toBe('Tank Hetvi Mayurbhai');
      expect(data.overview.overallMastery).toBe(0);
      expect(data.overview.questionsPracticed).toBe(0);
      expect(data.overview.practiceAccuracy).toBe(0);
      expect(data.overview.assessmentsAttempted).toBe(0);
      expect(data.overview.averageAssessmentScore).toBe(0);
      expect(data.overview.improvementTrend).toBe('INSUFFICIENT_DATA');
      expect(data.strengths).toEqual([]);
      expect(data.strugglingTopics).toEqual([]);
      expect(data.learningCurve).toEqual([]);
      expect(data.recentActivity).toEqual([]);

      // All topics should be UNTESTED
      expect(data.topicMasteries.every((t) => t.status === 'UNTESTED')).toBe(true);
    });
  });

  describe('Learning Curve Smoothing & Source Filtering', () => {
    it('should prevent a single 100% score from jumping directly to 100% (EWMA beta=0.35)', async () => {
      prisma.learningHistory.findMany.mockResolvedValue([
        {
          id: 'lh-1',
          masteryScore: 100.0,
          reason: LearningHistoryReason.PRACTICE_ATTEMPT,
          recordedAt: new Date('2026-10-10T12:00:00Z'),
          topic: { name: 'Arrays', course: { code: 'CS301' } },
        },
      ]);

      const curve = await service.getLearningCurve('sp-1', undefined, 'PRACTICE', 'course-cs301');

      expect(curve.length).toBe(1);
      // Prior is 50%, Beta is 0.35: (1 - 0.35) * 50 + 0.35 * 100 = 32.5 + 35 = 67.5%
      expect(curve[0].masteryScore).toBe(67.5);
      expect(curve[0].rawScore).toBe(100);
    });
  });
});

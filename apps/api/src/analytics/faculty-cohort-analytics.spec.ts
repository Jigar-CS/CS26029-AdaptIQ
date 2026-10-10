import { Test, TestingModule } from '@nestjs/testing';
import { LearningAnalyticsService } from './learning-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuestionDifficulty, SubmissionStatus, UserRole } from '@prisma/client';

describe('Faculty Cohort Analytics & Division Isolation', () => {
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
      assessment: {
        findFirst: jest.fn(),
      },
      authorizedStudent: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      skillMastery: {
        findMany: jest.fn(),
      },
      questionAttempt: {
        findMany: jest.fn(),
      },
      submissionAnswer: {
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

  describe('Faculty-Subject Authorization', () => {
    it('should grant access to faculty teaching in the same department', async () => {
      prisma.facultyProfile.findUnique.mockResolvedValue({
        id: 'fac-1',
        userId: 'user-fac-1',
        departmentId: 'dept-cse',
        courseId: null,
      });

      await expect(
        service.assertFacultyAuthorizedForCourse('user-fac-1', 'course-cs301')
      ).resolves.not.toThrow();
    });

    it('should grant access to faculty who authored assessments for the course', async () => {
      prisma.facultyProfile.findUnique.mockResolvedValue({
        id: 'fac-2',
        userId: 'user-fac-2',
        departmentId: 'dept-other',
        courseId: null,
      });
      prisma.assessment.findFirst.mockResolvedValue({ id: 'assess-1' });

      await expect(
        service.assertFacultyAuthorizedForCourse('user-fac-2', 'course-cs301')
      ).resolves.not.toThrow();
    });

    it('should deny access to unauthorized faculty outside subject and department', async () => {
      prisma.facultyProfile.findUnique.mockResolvedValue({
        id: 'fac-3',
        userId: 'user-fac-3',
        departmentId: 'dept-mechanical',
        courseId: null,
      });
      prisma.assessment.findFirst.mockResolvedValue(null);

      await expect(
        service.assertFacultyAuthorizedForCourse('user-fac-3', 'course-cs301')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cohort Analytics & Heatmap from Real Persisted Records', () => {
    it('should accurately isolate CS Div 1 students and compute dynamic metrics', async () => {
      // 5 students enrolled in CS Div 1
      prisma.authorizedStudent.findMany.mockResolvedValue([
        { id: 'auth-1', enrollmentNumber: '24CS001', name: 'Rahul Patel', division: 'CS Div 1' },
        { id: 'auth-2', enrollmentNumber: '24CS002', name: 'Priya Sharma', division: 'CS Div 1' },
        { id: 'auth-3', enrollmentNumber: '24CS003', name: 'Aarav Desai', division: 'CS Div 1' },
        { id: 'auth-4', enrollmentNumber: '24CS004', name: 'Ananya Shah', division: 'CS Div 1' },
        { id: 'auth-5', enrollmentNumber: '24CS005', name: 'Devansh Joshi', division: 'CS Div 1' },
      ]);

      // Rahul Patel has active mastery records
      prisma.skillMastery.findMany.mockResolvedValue([
        {
          studentId: 'sp-1',
          topicId: 't-arrays',
          masteryScore: 90.0,
          attemptCount: 10,
          correctCount: 9,
          student: {
            authorizedStudent: { name: 'Rahul Patel', enrollmentNumber: '24CS001', division: 'CS Div 1' },
            user: { email: 'student@charusat.edu.in' },
          },
        },
        {
          studentId: 'sp-1',
          topicId: 't-lists',
          masteryScore: 40.0,
          attemptCount: 5,
          correctCount: 2,
          student: {
            authorizedStudent: { name: 'Rahul Patel', enrollmentNumber: '24CS001', division: 'CS Div 1' },
            user: { email: 'student@charusat.edu.in' },
          },
        },
      ]);

      prisma.questionAttempt.findMany.mockResolvedValue([]);
      prisma.submissionAnswer.findMany.mockResolvedValue([]);

      const result = await service.getFacultyCourseCohortAnalytics('course-cs301', 'CS Div 1');

      expect(result.selectedDivision).toBe('CS Div 1');
      expect(result.enrolledStudentsCount).toBe(5);
      expect(result.activeAssessedCount).toBe(1); // Rahul Patel active
      expect(result.practiceAdherence).toBe(20); // 1 active / 5 enrolled = 20%
      expect(result.overallClassMastery).toBe(65); // Average of (90 + 40) / 2 = 65%

      // Topic Heatmap Validation
      const arrayTopic = result.topicAnalytics.find((t) => t.topicId === 't-arrays');
      expect(arrayTopic).toBeDefined();
      expect(arrayTopic?.classAverageMastery).toBe(90);
      expect(arrayTopic?.totalAttempts).toBe(10);
      expect(arrayTopic?.accuracy).toBe(90);
      expect(arrayTopic?.struggleRate).toBe(10); // 100 - 90 = 10%
      expect(arrayTopic?.status).toBe('HEALTHY');

      const listTopic = result.topicAnalytics.find((t) => t.topicId === 't-lists');
      expect(listTopic).toBeDefined();
      expect(listTopic?.classAverageMastery).toBe(40);
      expect(listTopic?.totalAttempts).toBe(5);
      expect(listTopic?.accuracy).toBe(40);
      expect(listTopic?.struggleRate).toBe(60); // 100 - 40 = 60%
      expect(listTopic?.status).toBe('CRITICAL_DEFICIENCY');

      const treeTopic = result.topicAnalytics.find((t) => t.topicId === 't-trees');
      expect(treeTopic).toBeDefined();
      expect(treeTopic?.totalAttempts).toBe(0);
      expect(treeTopic?.status).toBe('UNTESTED');
      expect(treeTopic?.topMisconception).toBe('No diagnostic attempts logged yet');
    });

    it('should dynamically update analytics when new assessment and practice attempts occur', async () => {
      // 3 students in CS Div 2
      prisma.authorizedStudent.findMany.mockResolvedValue([
        { id: 'auth-80', enrollmentNumber: '24CS080', name: 'Varshil Patel', division: 'CS Div 2' },
        { id: 'auth-90', enrollmentNumber: '24CS090', name: 'Jigar Sakhia', division: 'CS Div 2' },
        { id: 'auth-99', enrollmentNumber: '24CS099', name: 'Hetvi Tank', division: 'CS Div 2' },
      ]);

      prisma.skillMastery.findMany.mockResolvedValue([]);
      
      // Jigar took practice attempts on Trees
      prisma.questionAttempt.findMany.mockResolvedValue([
        {
          studentId: 'sp-90',
          question: { id: 'q-1', topicId: 't-trees' },
          isCorrect: true,
          student: {
            authorizedStudent: { name: 'Jigar Sakhia', enrollmentNumber: '24CS090', division: 'CS Div 2' },
          },
        },
        {
          studentId: 'sp-90',
          question: { id: 'q-2', topicId: 't-trees' },
          isCorrect: false,
          student: {
            authorizedStudent: { name: 'Jigar Sakhia', enrollmentNumber: '24CS090', division: 'CS Div 2' },
          },
        },
      ]);

      // Hetvi submitted assessment questions on Trees
      prisma.submissionAnswer.findMany.mockResolvedValue([
        {
          question: { id: 'q-3', topicId: 't-trees' },
          isCorrect: true,
          submission: {
            studentId: 'sp-99',
            student: {
              authorizedStudent: { name: 'Hetvi Tank', enrollmentNumber: '24CS099', division: 'CS Div 2' },
            },
          },
        },
      ]);

      const result = await service.getFacultyCourseCohortAnalytics('course-cs301', 'CS Div 2');

      expect(result.selectedDivision).toBe('CS Div 2');
      expect(result.enrolledStudentsCount).toBe(3);
      expect(result.activeAssessedCount).toBe(2); // Jigar and Hetvi

      const treeTopic = result.topicAnalytics.find((t) => t.topicId === 't-trees');
      expect(treeTopic?.totalAttempts).toBe(3); // 2 practice + 1 assessment
      expect(treeTopic?.accuracy).toBe(67); // 2 correct out of 3 = 67%
      expect(treeTopic?.struggleRate).toBe(33); // 100 - 67 = 33%
    });
  });
});

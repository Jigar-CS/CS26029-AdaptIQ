import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentStatus, AssessmentType, SubmissionStatus } from '@prisma/client';

import { CodingService } from '../coding/coding.service';
import { CodeRunnerService } from '../coding/code-runner.service';
import { LearningAnalyticsService } from '../analytics/learning-analytics.service';

describe('AssessmentService', () => {
  let service: AssessmentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      assessment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      assessmentSubmission: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      submissionAnswer: {
        createMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      learningHistory: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      proctoringSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      facultyProfile: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      question: {
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: CodingService, useValue: {} },
        { provide: CodeRunnerService, useValue: {} },
        {
          provide: LearningAnalyticsService,
          useValue: { validateTopicPrerequisites: jest.fn().mockResolvedValue({ isReady: true }) },
        },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
  });


  describe('createAssessment', () => {
    it('should create an assessment and allocate points evenly', async () => {
      prisma.assessment.create.mockResolvedValue({
        id: 'asm-1',
        title: 'Quiz 1',
        totalMarks: 100,
        totalQuestions: 2,
      });

      const res = await service.createAssessment('faculty-1', {
        title: 'Quiz 1',
        code: 'CS301-Q1',
        courseId: 'course-1',
        questionIds: ['q-1', 'q-2'],
        totalMarks: 100,
        durationMinutes: 30,
      });

      expect(res.id).toBe('asm-1');
      expect(prisma.assessment.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no questions provided', async () => {
      await expect(
        service.createAssessment('faculty-1', {
          title: 'Quiz 1',
          code: 'CS301-Q1',
          courseId: 'course-1',
          questionIds: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('submitAttempt', () => {
    it('should auto-grade submissions and calculate score and pass status', async () => {
      prisma.assessmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        studentId: 'student-1',
        status: SubmissionStatus.IN_PROGRESS,
        assessment: {
          totalMarks: 100,
          passingMarks: 40,
          questions: [
            {
              questionId: 'q-1',
              points: 50,
              question: {
                options: [
                  { id: 'opt-1', isCorrect: true },
                  { id: 'opt-2', isCorrect: false },
                ],
              },
            },
            {
              questionId: 'q-2',
              points: 50,
              question: {
                options: [
                  { id: 'opt-3', isCorrect: true },
                  { id: 'opt-4', isCorrect: false },
                ],
              },
            },
          ],
        },
      });

      prisma.submissionAnswer.createMany.mockResolvedValue({ count: 2 });
      prisma.assessmentSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: SubmissionStatus.EVALUATED,
        totalScore: 50,
        percentage: 50,
        passed: true,
        submittedAt: new Date(),
      });

      const result = await service.submitAttempt('sub-1', 'student-1', [
        { questionId: 'q-1', selectedOptionId: 'opt-1', timeSpentSeconds: 45 },
        { questionId: 'q-2', selectedOptionId: 'opt-4', timeSpentSeconds: 60 },
      ]);

      expect(result.totalScore).toBe(50);
      expect(result.percentage).toBe(50);
      expect(result.passed).toBe(true);
    });
  });

  describe('getAssessmentLeaderboard', () => {
    it('should rank submissions dynamically based on score and time', async () => {
      const now = new Date();
      prisma.assessment.findUnique.mockResolvedValue({
        id: 'exam-1',
        title: 'Data Structures Midterm',
        code: 'CS301-MT',
        division: 'DIV 1',
        course: { code: 'CS301', name: 'Data Structures' },
        totalQuestions: 2,
        totalMarks: 100,
        passingMarks: 40,
        submissions: [
          {
            id: 'sub-student-1-a1',
            studentId: 'student-1',
            totalScore: 70,
            percentage: 70,
            passed: true,
            attemptNumber: 1,
            startedAt: new Date(now.getTime() - 600000),
            submittedAt: new Date(now.getTime() - 300000),
            status: SubmissionStatus.EVALUATED,
            student: {
              id: 'student-1',
              authorizedStudent: { name: 'Alice Smith', enrollmentNumber: '24CS001', division: 'DIV 1' },
            },
          },
          {
            id: 'sub-student-1-a2',
            studentId: 'student-1',
            totalScore: 90,
            percentage: 90,
            passed: true,
            attemptNumber: 2,
            startedAt: new Date(now.getTime() - 200000),
            submittedAt: new Date(now.getTime() - 100000),
            status: SubmissionStatus.EVALUATED,
            student: {
              id: 'student-1',
              authorizedStudent: { name: 'Alice Smith', enrollmentNumber: '24CS001', division: 'DIV 1' },
            },
          },
          {
            id: 'sub-student-2',
            studentId: 'student-2',
            totalScore: 80,
            percentage: 80,
            passed: true,
            attemptNumber: 1,
            startedAt: new Date(now.getTime() - 500000),
            submittedAt: new Date(now.getTime() - 200000),
            status: SubmissionStatus.EVALUATED,
            student: {
              id: 'student-2',
              authorizedStudent: { name: 'Bob Jones', enrollmentNumber: '24CS002', division: 'DIV 1' },
            },
          },
        ],
      });

      const leaderboard = await service.getAssessmentLeaderboard('exam-1', 'student-1');

      expect(leaderboard.totalParticipants).toBe(2);
      expect(leaderboard.rankings).toHaveLength(2);
      // Rank 1: Alice with 90 marks
      expect(leaderboard.rankings[0].studentId).toBe('student-1');
      expect(leaderboard.rankings[0].rank).toBe(1);
      expect(leaderboard.rankings[0].score).toBe(90);
      expect(leaderboard.rankings[0].isCurrentUser).toBe(true);

      // Rank 2: Bob with 80 marks
      expect(leaderboard.rankings[1].studentId).toBe('student-2');
      expect(leaderboard.rankings[1].rank).toBe(2);
      expect(leaderboard.rankings[1].score).toBe(80);

      expect(leaderboard.currentUser?.rank).toBe(1);
      expect(leaderboard.currentUser?.score).toBe(90);
      expect(leaderboard.highestScore).toBe(90);
      expect(leaderboard.lowestScore).toBe(80);
      expect(leaderboard.averageScore).toBe(85);
    });
  });
});


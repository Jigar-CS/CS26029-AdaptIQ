import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentStatus, AssessmentType, SubmissionStatus } from '@prisma/client';

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
      },
      submissionAnswer: {
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: PrismaService, useValue: prisma },
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
});

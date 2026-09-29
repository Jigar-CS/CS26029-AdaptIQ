import { Test, TestingModule } from '@nestjs/testing';
import { AiAssessmentService } from './ai-assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIGenerationStatus, BloomTaxonomyLevel, QuestionDifficulty } from '@prisma/client';

describe('AiAssessmentService', () => {
  let service: AiAssessmentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      topic: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'topic-1',
          name: 'Binary Trees',
          course: { code: 'CS301' },
          courseId: 'course-1',
        }),
      },
      aIGeneratedQuestion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      question: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAssessmentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AiAssessmentService>(AiAssessmentService);
  });

  describe('generateStagedQuestions', () => {
    it('should generate and stage questions with local fallback when microservice client is absent', async () => {
      prisma.aIGeneratedQuestion.create.mockImplementation(({ data }) => ({
        id: 'staged-1',
        ...data,
      }));

      const res = await service.generateStagedQuestions({
        topicId: 'topic-1',
        courseId: 'course-1',
        bloomLevel: BloomTaxonomyLevel.APPLY,
        difficulty: QuestionDifficulty.MEDIUM,
        count: 2,
      });

      expect(res.length).toBeGreaterThanOrEqual(1);
      expect(prisma.aIGeneratedQuestion.create).toHaveBeenCalled();
      expect(res[0].status).toBe(AIGenerationStatus.STAGED);
    });
  });

  describe('approveQuestion', () => {
    it('should promote staged question to official question bank', async () => {
      prisma.aIGeneratedQuestion.findUnique.mockResolvedValue({
        id: 'staged-1',
        topicId: 'topic-1',
        topic: { courseId: 'course-1' },
        questionText: 'What is the balance factor of an AVL tree node?',
        explanation: 'BF must be -1, 0, or 1.',
        difficulty: QuestionDifficulty.EASY,
        status: AIGenerationStatus.STAGED,
        optionsJson: JSON.stringify([
          { text: 'At most 1', is_correct: true },
          { text: 'At most 2', is_correct: false },
        ]),
      });

      prisma.question.create.mockResolvedValue({
        id: 'official-q-1',
        questionText: 'What is the balance factor of an AVL tree node?',
      });

      prisma.aIGeneratedQuestion.update.mockResolvedValue({
        id: 'staged-1',
        status: AIGenerationStatus.APPROVED,
        approvedQuestionId: 'official-q-1',
      });

      const res = await service.approveQuestion('staged-1', 'faculty-1');

      expect(res.officialQuestion.id).toBe('official-q-1');
      expect(prisma.question.create).toHaveBeenCalled();
      expect(prisma.aIGeneratedQuestion.update).toHaveBeenCalledWith({
        where: { id: 'staged-1' },
        data: expect.objectContaining({ status: AIGenerationStatus.APPROVED }),
      });
    });
  });
});

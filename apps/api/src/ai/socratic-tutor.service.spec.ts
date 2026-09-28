import { Test, TestingModule } from '@nestjs/testing';
import { SocraticTutorService } from './socratic-tutor.service';
import { PrismaService } from '../prisma/prisma.service';
import { SocraticActionType, QuestionDifficulty, ResourceType } from '@prisma/client';
import { AiClientService } from './ai-client.service';

describe('SocraticTutorService', () => {
  let service: SocraticTutorService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      question: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'q-1',
          questionText: 'What is the worst-case time complexity of binary search?',
          explanation: 'Binary search halves the search space at every step, yielding O(log N).',
          difficulty: QuestionDifficulty.EASY,
          topicId: 'topic-arrays',
          topic: {
            id: 'topic-arrays',
            name: 'Arrays & Dynamic Arrays',
            slug: 'arrays-dynamic-arrays',
            course: { code: 'CS301', name: 'Data Structures' },
          },
          options: [
            { id: 'opt-1', optionText: 'O(log N)', isCorrect: true },
            { id: 'opt-2', optionText: 'O(N)', isCorrect: false },
          ],
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'q-2', questionText: 'What is the access time of an array element?', difficulty: QuestionDifficulty.EASY },
        ]),
      },
      aIConversation: {
        create: jest.fn().mockResolvedValue({
          id: 'conv-123',
          studentId: 'student-1',
          questionId: 'q-1',
          topicId: 'topic-arrays',
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'conv-123',
          studentId: 'student-1',
          topic: { name: 'Arrays & Dynamic Arrays', slug: 'arrays-dynamic-arrays' },
          question: { questionText: 'Sample question?', difficulty: QuestionDifficulty.EASY },
          messages: [],
        }),
      },
      aIMessage: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'msg-1',
            ...data,
          }),
        ),
      },
      learningResource: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'res-1',
            title: 'CS301 Array Invariants Lecture',
            resourceType: ResourceType.LECTURE_SLIDE,
            url: 'https://charusat.ac.in',
            estimatedMinutes: 20,
            author: 'CSPIT Faculty',
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocraticTutorService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AiClientService,
          useValue: {
            requestSocraticRemediation: jest.fn().mockResolvedValue(null),
            requestSocraticChat: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<SocraticTutorService>(SocraticTutorService);
  });

  it('should generate Socratic remediation with distractor diagnosis and analogy on incorrect attempt', async () => {
    const result = await service.generateSocraticRemediation('student-1', {
      questionId: 'q-1',
      selectedOptionId: 'opt-2',
    });

    expect(result.conversationId).toBe('conv-123');
    expect(result.topicName).toBe('Arrays & Dynamic Arrays');
    expect(result.distractorDiagnosis).toContain('Conceptual Distractor Diagnosis');
    expect(result.distractorDiagnosis).toContain('O(N)');
    expect(result.analogy).toBeDefined();
    expect(result.codeExample).toBeDefined();
    expect(result.socraticPrompt).toContain('Think about this');
    expect(result.recommendedResources.length).toBeGreaterThan(0);
  });

  it('should handle EXPLAIN_SIMPLY action with beginner analogies', async () => {
    const actionResult = await service.handleSocraticAction('student-1', {
      conversationId: 'conv-123',
      actionType: SocraticActionType.EXPLAIN_SIMPLY,
    });

    expect(actionResult.actionType).toBe(SocraticActionType.EXPLAIN_SIMPLY);
    expect(actionResult.reply).toContain('Beginner Analogy');
  });

  it('should handle REAL_WORLD_EXAMPLE action with code snippet', async () => {
    const actionResult = await service.handleSocraticAction('student-1', {
      conversationId: 'conv-123',
      actionType: SocraticActionType.REAL_WORLD_EXAMPLE,
    });

    expect(actionResult.actionType).toBe(SocraticActionType.REAL_WORLD_EXAMPLE);
    expect(actionResult.reply).toContain('Real-World Code Implementation');
  });

  it('should handle ASK_FOLLOW_UP action and record student query', async () => {
    const actionResult = await service.handleSocraticAction('student-1', {
      conversationId: 'conv-123',
      actionType: SocraticActionType.ASK_FOLLOW_UP,
      userMessage: 'Why does memory locality matter?',
    });

    expect(actionResult.actionType).toBe(SocraticActionType.ASK_FOLLOW_UP);
    expect(actionResult.reply).toBeDefined();
    expect(prismaMock.aIMessage.create).toHaveBeenCalled();
  });
});

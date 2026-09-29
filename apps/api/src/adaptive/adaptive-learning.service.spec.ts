import { Test, TestingModule } from '@nestjs/testing';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty, SpacedRepetitionStatus } from '@prisma/client';

describe('AdaptiveLearningService', () => {
  let service: AdaptiveLearningService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      topic: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'topic-arrays',
          name: 'Arrays & Dynamic Sizing',
          course: { code: 'CS301' },
        }),
      },
      skillMastery: {
        findUnique: jest.fn(),
      },
      question: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      questionOption: {
        findUnique: jest.fn(),
      },
      studentMisconception: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      spacedRepetitionSchedule: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptiveLearningService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdaptiveLearningService>(AdaptiveLearningService);
  });

  describe('getCalibratedDifficulty', () => {
    it('should calibrate to EASY if mastery < 40%', async () => {
      prisma.skillMastery.findUnique.mockResolvedValue({ masteryScore: 32.5 });

      const result = await service.getCalibratedDifficulty('student-1', 'topic-arrays');
      expect(result.recommendedDifficulty).toBe(QuestionDifficulty.EASY);
      expect(result.currentMastery).toBe(32.5);
    });

    it('should calibrate to MEDIUM if mastery is between 40% and 70%', async () => {
      prisma.skillMastery.findUnique.mockResolvedValue({ masteryScore: 65.0 });

      const result = await service.getCalibratedDifficulty('student-1', 'topic-arrays');
      expect(result.recommendedDifficulty).toBe(QuestionDifficulty.MEDIUM);
      expect(result.currentMastery).toBe(65.0);
    });

    it('should calibrate to HARD if mastery >= 70%', async () => {
      prisma.skillMastery.findUnique.mockResolvedValue({ masteryScore: 88.0 });

      const result = await service.getCalibratedDifficulty('student-1', 'topic-arrays');
      expect(result.recommendedDifficulty).toBe(QuestionDifficulty.HARD);
      expect(result.currentMastery).toBe(88.0);
    });
  });

  describe('updateSpacedRepetitionSchedule (SM-2)', () => {
    it('should advance interval and set status for correct answers with fast response', async () => {
      prisma.spacedRepetitionSchedule.findUnique.mockResolvedValue({
        easeFactor: 2.5,
        repetitionNumber: 1,
        intervalDays: 1,
      });

      prisma.spacedRepetitionSchedule.upsert.mockImplementation(({ create, update }) => ({
        ...update,
        id: 'sched-1',
        topicId: 'topic-arrays',
      }));

      const schedule = await service.updateSpacedRepetitionSchedule(
        'student-1',
        'topic-arrays',
        true,
        20,
      );

      expect(schedule.intervalDays).toBe(6);
      expect(schedule.repetitionNumber).toBe(2);
    });

    it('should reset interval to 1 day on failed review', async () => {
      prisma.spacedRepetitionSchedule.findUnique.mockResolvedValue({
        easeFactor: 2.5,
        repetitionNumber: 3,
        intervalDays: 14,
      });

      prisma.spacedRepetitionSchedule.upsert.mockImplementation(({ create, update }) => ({
        ...update,
        id: 'sched-1',
        topicId: 'topic-arrays',
      }));

      const schedule = await service.updateSpacedRepetitionSchedule(
        'student-1',
        'topic-arrays',
        false,
        50,
      );

      expect(schedule.intervalDays).toBe(1);
      expect(schedule.repetitionNumber).toBe(0);
    });
  });

  describe('processMisconceptionDetection', () => {
    it('should record student misconception occurrence when linked distractor is chosen', async () => {
      prisma.questionOption.findUnique.mockResolvedValue({
        id: 'opt-distractor',
        misconceptionId: 'mis-1',
        misconception: {
          id: 'mis-1',
          code: 'MIS_ARR_01',
          title: 'Off-By-One Error',
          description: 'Boundary error',
          category: 'OFF_BY_ONE_ERROR',
          remediationAdvice: 'Check bounds',
        },
      });

      prisma.studentMisconception.upsert.mockResolvedValue({
        id: 'sm-1',
        occurrenceCount: 2,
        misconception: { code: 'MIS_ARR_01' },
      });

      const res = await service.processMisconceptionDetection('student-1', 'opt-distractor');
      expect(res).not.toBeNull();
      expect(res?.detected).toBe(true);
      expect(res?.misconception.code).toBe('MIS_ARR_01');
      expect(res?.occurrenceCount).toBe(2);
    });
  });
});

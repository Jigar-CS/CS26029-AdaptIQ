import { Test, TestingModule } from '@nestjs/testing';
import { LearningAnalyticsService } from './learning-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty } from '@prisma/client';

describe('LearningAnalyticsService', () => {
  let service: LearningAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningAnalyticsService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<LearningAnalyticsService>(LearningAnalyticsService);
  });

  describe('calculateNewMastery', () => {
    it('should initialize baseline mastery for a first correct answer on Easy difficulty', () => {
      const score = service.calculateNewMastery({
        currentMastery: 0,
        isCorrect: true,
        difficulty: QuestionDifficulty.EASY,
      });
      // Base Easy is 70 * 1.0 = 70
      expect(score).toBe(70);
    });

    it('should initialize higher baseline mastery for a first correct answer on Hard difficulty', () => {
      const score = service.calculateNewMastery({
        currentMastery: 0,
        isCorrect: true,
        difficulty: QuestionDifficulty.HARD,
      });
      // Base Hard is min(100, 70 * 1.5) = 100
      expect(score).toBe(100);
    });

    it('should degrade mastery smoothly using EWMA when an incorrect answer is given', () => {
      const initialScore = 80;
      const score = service.calculateNewMastery({
        currentMastery: initialScore,
        isCorrect: false,
        difficulty: QuestionDifficulty.MEDIUM,
      });
      // (1 - 0.25) * 80 + 0.25 * 0 = 60
      expect(score).toBe(60);
    });

    it('should clamp mastery between 0 and 100', () => {
      const lowScore = service.calculateNewMastery({
        currentMastery: 5,
        isCorrect: false,
        difficulty: QuestionDifficulty.EASY,
      });
      expect(lowScore).toBeGreaterThanOrEqual(0);

      const highScore = service.calculateNewMastery({
        currentMastery: 95,
        isCorrect: true,
        difficulty: QuestionDifficulty.HARD,
      });
      expect(highScore).toBeLessThanOrEqual(100);
    });
  });
});

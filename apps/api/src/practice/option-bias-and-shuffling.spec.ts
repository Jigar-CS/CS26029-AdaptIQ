import { seededShuffle, shuffleQuestionOptions, randomShuffle } from '../common/shuffle.util';
import { PracticeService } from './practice.service';
import { AdaptiveLearningService } from '../adaptive/adaptive-learning.service';
import { QuestionDifficulty } from '@prisma/client';

describe('Option Bias, Shuffling & Position Independence Tests', () => {
  const sampleQuestion = {
    id: 'q-test-101',
    topicId: 'topic-dsa',
    difficulty: QuestionDifficulty.MEDIUM,
    questionText: 'What is the worst-case time complexity of Quickselect for finding the k-th smallest element with Median-of-Medians pivot?',
    explanation: 'Median-of-Medians guarantees a 30-70 partition ratio, yielding O(N) worst-case time.',
    options: [
      { id: 'opt-1', optionText: 'O(N) deterministic linear time', isCorrect: true, order: 0 },
      { id: 'opt-2', optionText: 'O(N log N) divide-and-conquer time', isCorrect: false, order: 1 },
      { id: 'opt-3', optionText: 'O(N^2) quadratic degraded time', isCorrect: false, order: 2 },
      { id: 'opt-4', optionText: 'O(log N) binary search time', isCorrect: false, order: 3 },
    ],
  };

  describe('1. Shuffling Invariants & Correctness Preservation', () => {
    it('should preserve option identity, text, and isCorrect flags after shuffling', () => {
      const shuffled = shuffleQuestionOptions(sampleQuestion.options, 'session-abc', sampleQuestion.id);

      expect(shuffled).toHaveLength(4);
      const correctOption = shuffled.find((o) => o.isCorrect);
      expect(correctOption).toBeDefined();
      expect(correctOption?.id).toBe('opt-1');
      expect(correctOption?.optionText).toBe('O(N) deterministic linear time');

      const falseOptions = shuffled.filter((o) => !o.isCorrect);
      expect(falseOptions).toHaveLength(3);
    });

    it('should generate different option positions across different attempt seeds', () => {
      const positionsFound = new Set<number>();

      // Simulate 50 different student sessions
      for (let i = 0; i < 50; i++) {
        const sessionId = `session-${i}-attempt`;
        const shuffled = shuffleQuestionOptions(sampleQuestion.options, sessionId, sampleQuestion.id);
        const correctIndex = shuffled.findIndex((o) => o.isCorrect);
        positionsFound.add(correctIndex);
      }

      // Over 50 different attempts, correct answer should appear at multiple positions (0, 1, 2, 3)
      expect(positionsFound.size).toBeGreaterThanOrEqual(3);
      expect(positionsFound.has(0) || positionsFound.has(1) || positionsFound.has(2) || positionsFound.has(3)).toBe(true);
    });

    it('should guarantee option order remains 100% stable within the same attempt (refresh resilience)', () => {
      const sessionId = 'student-attempt-sess-999';
      const firstLoad = shuffleQuestionOptions(sampleQuestion.options, sessionId, sampleQuestion.id);

      // Simulate 10 component re-renders / page refreshes
      for (let i = 0; i < 10; i++) {
        const reloaded = shuffleQuestionOptions(sampleQuestion.options, sessionId, sampleQuestion.id);
        expect(reloaded.map((o) => o.id)).toEqual(firstLoad.map((o) => o.id));
      }
    });
  });

  describe('2. Scoring Logic & Position Independence', () => {
    let mockPrisma: any;
    let mockAnalytics: any;
    let practiceService: PracticeService;

    beforeEach(() => {
      mockPrisma = {
        practiceSession: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'sess-123',
            studentId: 'student-42',
            courseId: 'CS301',
            topicId: 'topic-dsa',
          }),
          update: jest.fn().mockResolvedValue({
            questionsAttempted: 1,
            correctAnswers: 1,
          }),
        },
        question: {
          findUnique: jest.fn().mockResolvedValue(sampleQuestion),
        },
        questionAttempt: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'att-1', ...data })),
        },
      };

      mockAnalytics = {
        recordAttemptAndRecalculateMastery: jest.fn().mockResolvedValue({
          topicId: 'topic-dsa',
          masteryScore: 75.0,
        }),
      };

      practiceService = new PracticeService(mockPrisma, mockAnalytics);
    });

    it('should award correct score when student selects correct option regardless of displayed position', async () => {
      // Simulate that in this session, options were displayed in shuffled order
      const displayedOptions = shuffleQuestionOptions(sampleQuestion.options, 'sess-123', sampleQuestion.id);
      const correctDisplayed = displayedOptions.find((o) => o.isCorrect)!;

      const result = await practiceService.submitAttempt('student-42', {
        sessionId: 'sess-123',
        questionId: sampleQuestion.id,
        selectedOptionId: correctDisplayed.id,
        timeTakenSeconds: 15,
      });

      expect(result.isCorrect).toBe(true);
      expect(result.correctOptionId).toBe('opt-1');
      expect(result.explanation).toContain('Median-of-Medians');
      expect(mockAnalytics.recordAttemptAndRecalculateMastery).toHaveBeenCalledWith(
        expect.objectContaining({ isCorrect: true }),
      );
    });

    it('should mark attempt incorrect when distractor is selected at any position', async () => {
      const displayedOptions = shuffleQuestionOptions(sampleQuestion.options, 'sess-123', sampleQuestion.id);
      const wrongDisplayed = displayedOptions.find((o) => !o.isCorrect)!;

      const result = await practiceService.submitAttempt('student-42', {
        sessionId: 'sess-123',
        questionId: sampleQuestion.id,
        selectedOptionId: wrongDisplayed.id,
        timeTakenSeconds: 20,
      });

      expect(result.isCorrect).toBe(false);
      expect(result.correctOptionId).toBe('opt-1');
      expect(mockAnalytics.recordAttemptAndRecalculateMastery).toHaveBeenCalledWith(
        expect.objectContaining({ isCorrect: false }),
      );
    });
  });

  describe('3. Adaptive Difficulty & Learning Engine Preservation', () => {
    let mockPrisma: any;
    let mockAiGen: any;
    let adaptiveService: AdaptiveLearningService;

    beforeEach(() => {
      mockPrisma = {
        topic: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'topic-dsa',
            name: 'Dynamic Programming',
            course: { code: 'CS301' },
          }),
        },
        skillMastery: {
          findUnique: jest.fn(),
        },
        questionAttempt: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        question: {
          findMany: jest.fn().mockResolvedValue([sampleQuestion]),
          findFirst: jest.fn(),
        },
      };

      mockAiGen = {
        generateAndPersistQuestion: jest.fn(),
      };

      const mockAnalytics = {
        validateTopicPrerequisites: jest.fn().mockResolvedValue({ isReady: true }),
      };

      adaptiveService = new AdaptiveLearningService(mockPrisma, mockAiGen, mockAnalytics as any);
    });

    it('should calibrate difficulty accurately according to IRT thresholds without modification', async () => {
      // Baseline / < 40% -> EASY
      mockPrisma.skillMastery.findUnique.mockResolvedValueOnce({ masteryScore: 25.0, attemptCount: 2 });
      const easyCalib = await adaptiveService.getCalibratedDifficulty('student-1', 'topic-dsa');
      expect(easyCalib.recommendedDifficulty).toBe(QuestionDifficulty.EASY);

      // 40% - 70% -> MEDIUM
      mockPrisma.skillMastery.findUnique.mockResolvedValueOnce({ masteryScore: 55.0, attemptCount: 5 });
      const medCalib = await adaptiveService.getCalibratedDifficulty('student-1', 'topic-dsa');
      expect(medCalib.recommendedDifficulty).toBe(QuestionDifficulty.MEDIUM);

      // >= 70% -> HARD
      mockPrisma.skillMastery.findUnique.mockResolvedValueOnce({ masteryScore: 82.0, attemptCount: 10 });
      const hardCalib = await adaptiveService.getCalibratedDifficulty('student-1', 'topic-dsa');
      expect(hardCalib.recommendedDifficulty).toBe(QuestionDifficulty.HARD);
    });

    it('should return next adaptive question with deterministically shuffled options for the session', async () => {
      mockPrisma.skillMastery.findUnique.mockResolvedValue({ masteryScore: 50.0, attemptCount: 3 });

      const res1 = await adaptiveService.getNextAdaptiveQuestion(
        'student-1',
        'topic-dsa',
        'course-cs301',
        undefined,
        [],
        'session-xyz',
      );

      const res2 = await adaptiveService.getNextAdaptiveQuestion(
        'student-1',
        'topic-dsa',
        'course-cs301',
        undefined,
        [],
        'session-xyz',
      );

      expect(res1.question).toBeDefined();
      expect(res2.question).toBeDefined();
      // Same session + question produces identical stable option sequence
      expect(res1.question?.options.map((o: any) => o.id)).toEqual(
        res2.question?.options.map((o: any) => o.id),
      );
    });
  });

  describe('4. Question Bank Balance & Distractor Plausibility', () => {
    it('should verify randomShuffle produces valid unbiased permutations of options', () => {
      const original = ['A', 'B', 'C', 'D'];
      const permutations = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const shuffled = randomShuffle(original);
        permutations.add(shuffled.join(''));
        expect(shuffled.sort()).toEqual(['A', 'B', 'C', 'D']);
      }

      // Over 100 random shuffles, multiple distinct permutations must occur
      expect(permutations.size).toBeGreaterThan(10);
    });
  });
});

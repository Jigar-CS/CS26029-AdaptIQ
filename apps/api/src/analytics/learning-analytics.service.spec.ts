import { Test, TestingModule } from '@nestjs/testing';
import { LearningAnalyticsService } from './learning-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty } from '@prisma/client';
import { BktIrtEngine, DEFAULT_BKT_PARAMS } from './engines/bkt-irt.engine';
import { ForgettingCurveEngine } from './engines/forgetting-curve.engine';
import { KnowledgeGraphEngine } from './engines/knowledge-graph.engine';

describe('LearningAnalyticsService & Phase 2 Engines', () => {
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

  // ============================================================================
  // 1. EWMA Mathematical Tests
  // ============================================================================
  describe('calculateNewMastery (EWMA)', () => {
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

  // ============================================================================
  // 2. Bayesian Knowledge Tracing (BKT) Tests
  // ============================================================================
  describe('BktIrtEngine (BKT)', () => {
    it('should compute increased posterior probability on correct answer', () => {
      const prior = 0.3;
      const posterior = BktIrtEngine.calculatePosterior(prior, true, DEFAULT_BKT_PARAMS);
      expect(posterior).toBeGreaterThan(prior);
    });

    it('should compute decreased posterior probability on incorrect answer', () => {
      const prior = 0.7;
      const posterior = BktIrtEngine.calculatePosterior(prior, false, DEFAULT_BKT_PARAMS);
      expect(posterior).toBeLessThan(prior);
    });

    it('should correctly advance knowledge with learning transition P(T)', () => {
      const posterior = 0.5;
      const nextPrior = BktIrtEngine.applyTransition(posterior, DEFAULT_BKT_PARAMS);
      // nextPrior = 0.5 + (1 - 0.5) * 0.15 = 0.575
      expect(nextPrior).toBeCloseTo(0.575, 2);
    });

    it('should process consecutive correct attempts towards mastery status', () => {
      const attempts = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
      ];
      const result = BktIrtEngine.evaluateAttemptSequence(attempts);
      expect(result.currentProbability).toBeGreaterThan(0.8);
      expect(result.status).toBe('MASTERED');
      expect(result.modelConfidence).toBe('MEDIUM');
    });

    it('should benchmark EWMA and BKT with transparency', () => {
      const benchmark = BktIrtEngine.benchmarkEwmaVsBkt(75, 72);
      expect(benchmark.concordance).toBe('STRONG_AGREEMENT');
      expect(benchmark.difference).toBe(3);
      expect(benchmark.recommendedMastery).toBeGreaterThanOrEqual(70);
    });
  });

  // ============================================================================
  // 3. Item Response Theory (IRT) Tests
  // ============================================================================
  describe('BktIrtEngine (IRT)', () => {
    it('should calculate higher success probability for higher latent ability theta', () => {
      const probHighAbility = BktIrtEngine.calculateIrtProbability(1.5, 0.0);
      const probLowAbility = BktIrtEngine.calculateIrtProbability(-1.5, 0.0);
      expect(probHighAbility).toBeGreaterThan(probLowAbility);
      expect(probHighAbility).toBeGreaterThan(0.8);
    });

    it('should estimate positive theta for student answering hard questions correctly', () => {
      const attempts = [
        { difficulty: QuestionDifficulty.HARD, isCorrect: true },
        { difficulty: QuestionDifficulty.HARD, isCorrect: true },
        { difficulty: QuestionDifficulty.MEDIUM, isCorrect: true },
      ];
      const ability = BktIrtEngine.estimateStudentAbility(attempts);
      expect(ability.theta).toBeGreaterThan(0);
      expect(ability.abilityPercentile).toBeGreaterThan(50);
    });
  });

  // ============================================================================
  // 4. Ebbinghaus Forgetting Curve & Decay Tests
  // ============================================================================
  describe('ForgettingCurveEngine', () => {
    it('should calculate higher stability for mastered topics with more attempts', () => {
      const noviceStability = ForgettingCurveEngine.computeMemoryStability(30, 2, 1);
      const expertStability = ForgettingCurveEngine.computeMemoryStability(90, 15, 14);
      expect(expertStability).toBeGreaterThan(noviceStability);
      expect(expertStability).toBeGreaterThan(20);
    });

    it('should mark recently practiced topics as FRESH with minimal decay', () => {
      const analysis = ForgettingCurveEngine.analyzeRetention({
        topicId: 'topic-1',
        rawMastery: 85,
        lastPracticedAt: new Date(),
        attemptCount: 10,
        correctCount: 9,
      });
      expect(analysis.retentionStatus).toBe('FRESH');
      expect(analysis.retentionRatePct).toBeGreaterThanOrEqual(95);
      expect(analysis.isReviewDue).toBe(false);
    });

    it('should detect DECAYING status when long interval has elapsed without practice', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const analysis = ForgettingCurveEngine.analyzeRetention({
        topicId: 'topic-1',
        rawMastery: 70,
        lastPracticedAt: thirtyDaysAgo,
        attemptCount: 3,
        correctCount: 2,
      });
      expect(['DECAYING', 'CRITICAL_DECAY']).toContain(analysis.retentionStatus);
      expect(analysis.decayedMastery).toBeLessThan(analysis.rawMastery);
      expect(analysis.isReviewDue).toBe(true);
    });
  });

  // ============================================================================
  // 5. Knowledge Dependency Graphs Tests
  // ============================================================================
  describe('KnowledgeGraphEngine', () => {
    it('should approve foundational topics without prerequisites', () => {
      const check = KnowledgeGraphEngine.checkPrerequisites('arrays-dynamic-arrays', {
        'arrays-dynamic-arrays': { name: 'Arrays', masteryScore: 70 },
      });
      expect(check.isReady).toBe(true);
      expect(check.status).toBe('READY_FOR_PRACTICE');
      expect(check.missingPrerequisites.length).toBe(0);
    });

    it('should block or warn when dependent topic lacks prerequisite mastery', () => {
      // Dynamic Programming requires Arrays >= 75%
      const check = KnowledgeGraphEngine.checkPrerequisites('dynamic-programming', {
        'arrays-dynamic-arrays': { name: 'Arrays', masteryScore: 40 },
        'dynamic-programming': { name: 'Dynamic Programming', masteryScore: 20 },
      });
      expect(check.isReady).toBe(false);
      expect(check.status).toBe('BLOCKED');
      expect(check.missingPrerequisites.length).toBeGreaterThan(0);
      expect(check.missingPrerequisites[0].prerequisiteSlug).toBe('arrays-dynamic-arrays');
    });

    it('should build full course DAG with nodes and edges', () => {
      const graph = KnowledgeGraphEngine.buildCourseKnowledgeGraph({
        courseCode: 'CS301',
        courseName: 'Data Structures and Algorithms',
        topics: [
          { id: 't1', slug: 'arrays-dynamic-arrays', name: 'Arrays' },
          { id: 't2', slug: 'linked-lists-pointers', name: 'Linked Lists' },
          { id: 't3', slug: 'dynamic-programming', name: 'Dynamic Programming' },
        ],
        topicMasteries: {
          'arrays-dynamic-arrays': { rawMastery: 80, decayedMastery: 75, bktProbability: 0.85 },
          'linked-lists-pointers': { rawMastery: 65, decayedMastery: 60, bktProbability: 0.65 },
          'dynamic-programming': { rawMastery: 30, decayedMastery: 25, bktProbability: 0.25 },
        },
      });

      expect(graph.nodes.length).toBe(3);
      expect(graph.edges.length).toBeGreaterThan(0);
      expect(graph.courseCode).toBe('CS301');
    });
  });
});

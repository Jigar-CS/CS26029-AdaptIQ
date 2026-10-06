import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty, LearningHistoryReason, InterventionStatus } from '@prisma/client';
import { BktIrtEngine, BktSequenceResult, IrtAbilityResult } from './engines/bkt-irt.engine';
import { ForgettingCurveEngine, RetentionAnalysis } from './engines/forgetting-curve.engine';
import { KnowledgeGraphEngine, CourseKnowledgeGraph, PrerequisiteCheckResult } from './engines/knowledge-graph.engine';

export interface MasteryCalculationInput {
  currentMastery: number; // 0 to 100
  isCorrect: boolean;
  difficulty: QuestionDifficulty;
  timeTakenSeconds?: number;
}

@Injectable()
export class LearningAnalyticsService {
  private readonly logger = new Logger('LearningAnalyticsService');

  // Multipliers for difficulty in EWMA
  private readonly difficultyWeights: Record<QuestionDifficulty, number> = {
    EASY: 1.0,
    MEDIUM: 1.25,
    HARD: 1.5,
  };

  // EWMA smoothing factor: recent attempts have 25% weight
  private readonly alpha = 0.25;

  constructor(private prisma: PrismaService) {}

  /**
   * Pure mathematical function to compute new mastery score using EWMA heuristic.
   * Isolates the mastery heuristic so it can be evaluated alongside BKT and IRT.
   */
  calculateNewMastery(input: MasteryCalculationInput): number {
    const weight = this.difficultyWeights[input.difficulty] || 1.0;

    // Correct response yields base score scaled by difficulty; incorrect yields 0
    // Correct Easy -> 70% target, Medium -> 87.5% target, Hard -> 100% target
    const targetScore = input.isCorrect ? Math.min(100, 70 * weight) : 0;

    let updatedMastery: number;
    if (input.currentMastery === 0 && input.isCorrect) {
      // First successful attempt jump-starts baseline
      updatedMastery = targetScore;
    } else {
      // Exponentially Weighted Moving Average (EWMA)
      updatedMastery = (1 - this.alpha) * input.currentMastery + this.alpha * targetScore;
    }

    // Clamp score within bounds 0 - 100
    return Math.max(0, Math.min(100, Math.round(updatedMastery * 10) / 10));
  }

  /**
   * Updates topic mastery and appends a learning history milestone
   */
  async recordAttemptAndRecalculateMastery(params: {
    studentId: string;
    topicId: string;
    difficulty: QuestionDifficulty;
    isCorrect: boolean;
    timeTakenSeconds?: number;
  }) {
    const { studentId, topicId, difficulty, isCorrect, timeTakenSeconds } = params;

    // 1. Get or initialize current topic mastery record
    const existingMastery = await this.prisma.skillMastery.findUnique({
      where: {
        studentId_topicId: {
          studentId,
          topicId,
        },
      },
    });

    const currentScore = existingMastery ? existingMastery.masteryScore : 0;
    const newScore = this.calculateNewMastery({
      currentMastery: currentScore,
      isCorrect,
      difficulty,
      timeTakenSeconds,
    });

    // 2. Persist updated SkillMastery
    const updatedMastery = await this.prisma.skillMastery.upsert({
      where: {
        studentId_topicId: {
          studentId,
          topicId,
        },
      },
      update: {
        masteryScore: newScore,
        attemptCount: { increment: 1 },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        lastPracticedAt: new Date(),
      },
      create: {
        studentId,
        topicId,
        masteryScore: newScore,
        attemptCount: 1,
        correctCount: isCorrect ? 1 : 0,
        lastPracticedAt: new Date(),
      },
    });

    // 3. Snapshot to LearningHistory to form the student's longitudinal learning curve
    await this.prisma.learningHistory.create({
      data: {
        studentId,
        topicId,
        masteryScore: newScore,
        reason: LearningHistoryReason.PRACTICE_ATTEMPT,
      },
    });

    return updatedMastery;
  }

  /**
   * Fetches overall mastery curve for visualization over time
   */
  async getLearningCurve(studentId: string, topicId?: string) {
    const where: any = { studentId };
    if (topicId) {
      where.topicId = topicId;
    }

    const history = await this.prisma.learningHistory.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
      take: 60,
      include: {
        topic: {
          select: {
            name: true,
            course: {
              select: { code: true, name: true },
            },
          },
        },
      },
    });

    return history.map((entry) => ({
      id: entry.id,
      recordedAt: entry.recordedAt,
      masteryScore: entry.masteryScore,
      topicName: entry.topic.name,
      courseCode: entry.topic.course.code,
      reason: entry.reason,
    }));
  }

  /**
   * Categorizes student's strong and weak topics
   */
  async getTopicStrengthsAndWeaknesses(studentId: string) {
    const masteries = await this.prisma.skillMastery.findMany({
      where: { studentId },
      include: {
        topic: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { masteryScore: 'desc' },
    });

    const strongTopics = masteries
      .filter((m) => m.masteryScore >= 70)
      .slice(0, 5)
      .map((m) => ({
        topicId: m.topicId,
        topicName: m.topic.name,
        courseName: m.topic.course.name,
        courseCode: m.topic.course.code,
        masteryScore: Math.round(m.masteryScore),
        attemptCount: m.attemptCount,
        accuracy: m.attemptCount > 0 ? Math.round((m.correctCount / m.attemptCount) * 100) : 0,
      }));

    const weakTopics = masteries
      .filter((m) => m.masteryScore < 70)
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, 5)
      .map((m) => ({
        topicId: m.topicId,
        topicName: m.topic.name,
        courseName: m.topic.course.name,
        courseCode: m.topic.course.code,
        masteryScore: Math.round(m.masteryScore),
        attemptCount: m.attemptCount,
        accuracy: m.attemptCount > 0 ? Math.round((m.correctCount / m.attemptCount) * 100) : 0,
      }));

    return { strongTopics, weakTopics, all: masteries };
  }

  /**
   * Generates real-time, student-specific cognitive intelligence advice
   */
  generateCognitiveAdvice(params: {
    totalAttempts: number;
    accuracy: number;
    overallMastery: number;
    weakTopics: any[];
    strongTopics: any[];
    decayingTopics: any[];
    irtAbility: IrtAbilityResult;
  }) {
    const { totalAttempts, accuracy, overallMastery, weakTopics, strongTopics, decayingTopics, irtAbility } = params;

    if (totalAttempts === 0) {
      return {
        focusType: 'CALIBRATION',
        headline: 'Cognitive Baseline Calibration Required',
        advice:
          'No diagnostic interactions have been logged yet for your profile. Complete targeted questions to initialize your Bayesian Knowledge Tracing profile, calibrate your IRT latent ability parameter, and unlock personalized prerequisite learning paths.',
        actionItems: [
          'Begin with an introductory practice session in your core curriculum.',
          'Solve at least 5 questions to establish an initial latent ability parameter (θ).',
          'Review concept explanations to calibrate knowledge state beliefs.',
        ],
        targetTopicId: null,
        targetTopicName: null,
        urgency: 'LOW',
      };
    }

    if (decayingTopics.length > 0) {
      const topDecay = decayingTopics[0];
      return {
        focusType: 'RETENTION_REVIEW',
        headline: `Memory Decay Alert: ${topDecay.topicName}`,
        advice: `Ebbinghaus retention analysis detected ${decayingTopics.length} topic${decayingTopics.length > 1 ? 's' : ''} under active knowledge decay. Your effective retention for ${topDecay.topicName} has dropped to ${topDecay.decayedMastery}% (from raw ${topDecay.rawMastery}%). A quick spaced repetition drill will halt decay and consolidate long-term retention.`,
        actionItems: [
          `Review ${topDecay.topicName} immediately with spaced retrieval practice.`,
          `Spend 5–8 minutes solving 3 targeted refresher problems.`,
          `Prevent prerequisite blockage in downstream curriculum graph nodes.`,
        ],
        targetTopicId: topDecay.topicId,
        targetTopicName: topDecay.topicName,
        urgency: 'HIGH',
      };
    }

    if (weakTopics.length > 0) {
      const primaryWeak = weakTopics[0];
      return {
        focusType: 'REMEDIATION',
        headline: `Conceptual Reinforcement: ${primaryWeak.topicName}`,
        advice: `Your current mastery in ${primaryWeak.topicName} is ${primaryWeak.masteryScore}% with an accuracy of ${primaryWeak.accuracy}%. Bayesian Knowledge Tracing identifies an elevated slip probability. Reinforcing core invariants through guided practice will push this topic above the 70% mastery threshold.`,
        actionItems: [
          `Target 3-5 practice items in ${primaryWeak.topicName} (${primaryWeak.courseCode}).`,
          `Focus on easy-to-medium questions before attempting complex problem statements.`,
          `Inspect step-by-step diagnostic feedback on missed questions.`,
        ],
        targetTopicId: primaryWeak.topicId,
        targetTopicName: primaryWeak.topicName,
        urgency: primaryWeak.masteryScore < 50 ? 'HIGH' : 'MEDIUM',
      };
    }

    if (strongTopics.length > 0 && overallMastery >= 70) {
      const topStrong = strongTopics[0];
      return {
        focusType: 'ACCELERATION',
        headline: 'Advanced Mastery Acceleration',
        advice: `Outstanding performance! With ${overallMastery}% overall mastery and strong proficiency in ${topStrong.topicName} (${topStrong.masteryScore}%), your latent ability θ is ${irtAbility.theta >= 0 ? '+' : ''}${irtAbility.theta} (${irtAbility.abilityPercentile}th percentile). You are ready to tackle Hard difficulty challenges and advance in your curriculum graph.`,
        actionItems: [
          `Attempt Hard difficulty problems in ${topStrong.topicName}.`,
          `Explore unlocked dependent topics in the curriculum Directed Acyclic Graph.`,
          `Participate in competitive assessment challenges to elevate your standing.`,
        ],
        targetTopicId: topStrong.topicId,
        targetTopicName: topStrong.topicName,
        urgency: 'LOW',
      };
    }

    return {
      focusType: 'CONTINUOUS_PRACTICE',
      headline: 'Balanced Skill Progression Active',
      advice: `Your continuous learning velocity is healthy across ${totalAttempts} attempts with ${accuracy}% accuracy. Continue practicing across varied difficulty tiers to reach the 70% threshold in all topics.`,
      actionItems: [
        'Maintain daily practice streak to consolidate cognitive gains.',
        'Diversify question selection across multiple topics.',
        'Review diagnostic explanations after every test submission.',
      ],
      targetTopicId: null,
      targetTopicName: null,
      urgency: 'MEDIUM',
    };
  }

  /**
   * Complete student dashboard analytics summary with Phase 2 extensions
   */
  async getStudentDashboardSummary(studentId: string) {
    // 1. Overall stats
    const [totalAttempts, correctAttempts, allMasteries, curve, testsCount] = await Promise.all([
      this.prisma.questionAttempt.count({ where: { studentId } }),
      this.prisma.questionAttempt.count({ where: { studentId, isCorrect: true } }),
      this.prisma.skillMastery.findMany({
        where: { studentId },
        include: {
          topic: {
            include: { course: true },
          },
        },
      }),
      this.getLearningCurve(studentId),
      this.prisma.assessmentSubmission.count({ where: { studentId } }).catch(() => 0),
    ]);

    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    const overallMastery =
      allMasteries.length > 0
        ? Math.round(
            allMasteries.reduce((sum, m) => sum + m.masteryScore, 0) / allMasteries.length,
          )
        : 0;

    const { strongTopics, weakTopics } = await this.getTopicStrengthsAndWeaknesses(studentId);

    // Phase 2: Compute decayed mastery and retention status across topics
    const retentionAnalyses = allMasteries.map((m) =>
      ForgettingCurveEngine.analyzeRetention({
        topicId: m.topicId,
        rawMastery: m.masteryScore,
        lastPracticedAt: m.lastPracticedAt,
        attemptCount: m.attemptCount,
        correctCount: m.correctCount,
      }),
    );

    const decayingCount = retentionAnalyses.filter(
      (r) => r.retentionStatus === 'DECAYING' || r.retentionStatus === 'CRITICAL_DECAY',
    ).length;

    const decayingTopics = retentionAnalyses
      .filter((r) => r.retentionStatus === 'DECAYING' || r.retentionStatus === 'CRITICAL_DECAY')
      .map((r) => {
        const m = allMasteries.find((mastery) => mastery.topicId === r.topicId);
        return {
          topicId: r.topicId,
          topicName: m ? m.topic.name : 'Topic',
          courseCode: m ? m.topic.course.code : '',
          rawMastery: r.rawMastery,
          decayedMastery: r.decayedMastery,
          retentionStatus: r.retentionStatus,
        };
      });

    // Phase 2: Recent attempts activity
    const recentAttempts = await this.prisma.questionAttempt.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        question: {
          include: {
            topic: true,
            course: true,
          },
        },
      },
    });

    // Phase 2: Estimate IRT Latent Ability
    const allAttemptsForIrt = await this.prisma.questionAttempt.findMany({
      where: { studentId },
      select: { difficultyAtAttempt: true, isCorrect: true },
      take: 100,
    });
    const irtAbility = BktIrtEngine.estimateStudentAbility(
      allAttemptsForIrt.map((a) => ({
        difficulty: a.difficultyAtAttempt,
        isCorrect: a.isCorrect,
      })),
    );

    const cognitiveAdvice = this.generateCognitiveAdvice({
      totalAttempts,
      accuracy,
      overallMastery,
      weakTopics,
      strongTopics,
      decayingTopics,
      irtAbility,
    });

    let streakDays = 0;
    if (totalAttempts > 0) {
      const recentAttemptsDates = await this.prisma.questionAttempt.findMany({
        where: { studentId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      const uniqueDays = new Set(
        recentAttemptsDates.map((d) => d.createdAt.toISOString().slice(0, 10)),
      );
      streakDays = uniqueDays.size;
    }

    return {
      overallMastery,
      questionsPracticed: totalAttempts,
      accuracy,
      streakDays,
      testsAttempted: testsCount,
      strongTopics,
      weakTopics,
      cognitiveAdvice,
      phase2Intelligence: {
        irtTheta: irtAbility.theta,
        irtPercentile: irtAbility.abilityPercentile,
        decayingTopicsCount: decayingCount,
        totalTopicsTracked: allMasteries.length,
        cognitiveAdvice,
      },
      topicMasteries: allMasteries.map((m) => {
        const retention = retentionAnalyses.find((r) => r.topicId === m.topicId);
        return {
          topicId: m.topicId,
          topicName: m.topic.name,
          courseName: m.topic.course.name,
          courseCode: m.topic.course.code,
          masteryScore: Math.round(m.masteryScore),
          decayedMastery: retention ? retention.decayedMastery : Math.round(m.masteryScore),
          retentionRatePct: retention ? retention.retentionRatePct : 100,
          retentionStatus: retention ? retention.retentionStatus : 'FRESH',
          isReviewDue: retention ? retention.isReviewDue : false,
          attemptCount: m.attemptCount,
          correctCount: m.correctCount,
          lastPracticedAt: m.lastPracticedAt,
        };
      }),
      learningCurve: curve,
      recentActivity: recentAttempts.map((a) => ({
        id: a.id,
        courseCode: a.question.course.code,
        topicName: a.question.topic.name,
        difficulty: a.difficultyAtAttempt,
        isCorrect: a.isCorrect,
        timeTakenSeconds: a.timeTakenSeconds,
        createdAt: a.createdAt,
      })),
    };
  }

  // ============================================================================
  // PHASE 2 ENHANCEMENT 1: Bayesian Knowledge Tracing (BKT) & IRT Benchmarking
  // ============================================================================

  /**
   * Generates a transparent, side-by-side benchmark of EWMA vs BKT for all topics practiced by student
   */
  async getStudentBktComparison(studentId: string) {
    const masteries = await this.prisma.skillMastery.findMany({
      where: { studentId },
      include: {
        topic: {
          include: { course: true },
        },
      },
    });

    const topicComparisons = await Promise.all(
      masteries.map(async (m) => {
        const attempts = await this.prisma.questionAttempt.findMany({
          where: {
            studentId,
            question: { topicId: m.topicId },
          },
          orderBy: { createdAt: 'asc' },
          select: { isCorrect: true, difficultyAtAttempt: true },
        });

        const bktResult = BktIrtEngine.evaluateAttemptSequence(
          attempts.map((a) => ({ isCorrect: a.isCorrect })),
        );

        const benchmark = BktIrtEngine.benchmarkEwmaVsBkt(
          Math.round(m.masteryScore),
          bktResult.probabilityPercentage,
        );

        return {
          topicId: m.topicId,
          topicName: m.topic.name,
          courseCode: m.topic.course.code,
          ewmaScore: Math.round(m.masteryScore),
          bktProbability: bktResult.currentProbability,
          bktProbabilityPct: bktResult.probabilityPercentage,
          bktStatus: bktResult.status,
          modelConfidence: bktResult.modelConfidence,
          attemptsAnalyzed: attempts.length,
          difference: benchmark.difference,
          concordance: benchmark.concordance,
          recommendedMastery: benchmark.recommendedMastery,
          explanation: benchmark.explanation,
        };
      }),
    );

    // Compute IRT latent ability across all student attempts
    const allAttempts = await this.prisma.questionAttempt.findMany({
      where: { studentId },
      select: { difficultyAtAttempt: true, isCorrect: true },
    });

    const irtAbility = BktIrtEngine.estimateStudentAbility(
      allAttempts.map((a) => ({
        difficulty: a.difficultyAtAttempt,
        isCorrect: a.isCorrect,
      })),
    );

    const { strongTopics, weakTopics } = await this.getTopicStrengthsAndWeaknesses(studentId);
    const overallMastery =
      masteries.length > 0
        ? Math.round(masteries.reduce((sum, m) => sum + m.masteryScore, 0) / masteries.length)
        : 0;
    const correctAttemptsCount = allAttempts.filter((a) => a.isCorrect).length;
    const accuracy = allAttempts.length > 0 ? Math.round((correctAttemptsCount / allAttempts.length) * 100) : 0;

    const cognitiveAdvice = this.generateCognitiveAdvice({
      totalAttempts: allAttempts.length,
      accuracy,
      overallMastery,
      weakTopics,
      strongTopics,
      decayingTopics: [],
      irtAbility,
    });

    return {
      studentId,
      totalTopicsEvaluated: topicComparisons.length,
      overallIrtAbility: irtAbility,
      topicComparisons,
      cognitiveAdvice,
      modelParameters: {
        bkt: {
          priorL0: 0.2,
          pTransitT: 0.15,
          pGuessG: 0.2,
          pSlipS: 0.1,
        },
        ewma: {
          alpha: this.alpha,
          weights: this.difficultyWeights,
        },
      },
    };
  }

  // ============================================================================
  // PHASE 2 ENHANCEMENT 2: Ebbinghaus Forgetting Curves & Knowledge Retention
  // ============================================================================

  /**
   * Evaluates student's knowledge decay across all practiced topics
   */
  async getStudentRetentionReport(studentId: string) {
    const masteries = await this.prisma.skillMastery.findMany({
      where: { studentId },
      include: {
        topic: {
          include: { course: true },
        },
      },
    });

    const reports: (RetentionAnalysis & { topicName: string; courseCode: string })[] = [];
    let totalRaw = 0;
    let totalDecayed = 0;
    let reviewDueCount = 0;
    let criticalDecayCount = 0;

    for (const m of masteries) {
      const analysis = ForgettingCurveEngine.analyzeRetention({
        topicId: m.topicId,
        rawMastery: m.masteryScore,
        lastPracticedAt: m.lastPracticedAt,
        attemptCount: m.attemptCount,
        correctCount: m.correctCount,
      });

      totalRaw += analysis.rawMastery;
      totalDecayed += analysis.decayedMastery;
      if (analysis.isReviewDue) reviewDueCount++;
      if (analysis.retentionStatus === 'CRITICAL_DECAY') criticalDecayCount++;

      reports.push({
        ...analysis,
        topicName: m.topic.name,
        courseCode: m.topic.course.code,
      });
    }

    const count = Math.max(1, masteries.length);
    const overallRetentionRate = Math.round((totalDecayed / Math.max(1, totalRaw)) * 100);

    return {
      studentId,
      overallRawMastery: Math.round(totalRaw / count),
      overallEffectiveMastery: Math.round(totalDecayed / count),
      overallRetentionRate,
      reviewsDueCount: reviewDueCount,
      criticalDecayCount,
      topics: reports.sort((a, b) => a.retentionRatePct - b.retentionRatePct),
      spacedRepetitionRecommendations: reports
        .filter((r) => r.isReviewDue)
        .slice(0, 4)
        .map((r) => ({
          topicId: r.topicId,
          topicName: r.topicName,
          courseCode: r.courseCode,
          daysSinceLastPractice: r.daysSinceLastPractice,
          currentRetention: `${r.retentionRatePct}%`,
          action: `Practice 3 questions to reset memory stability to ${Math.round(r.stabilityDays * 1.5)} days.`,
        })),
    };
  }

  // ============================================================================
  // PHASE 2 ENHANCEMENT 3: Knowledge Dependency Graphs & Prerequisite Validation
  // ============================================================================

  /**
   * Generates the multi-topic knowledge dependency graph for a course
   */
  async getStudentKnowledgeGraph(studentId: string, courseCode: string = 'CS301') {
    const course =
      (await this.prisma.course.findFirst({
        where: {
          OR: [{ code: courseCode }, { code: courseCode.toUpperCase() }, { id: courseCode }],
        },
        include: {
          topics: {
            select: { id: true, name: true, slug: true },
          },
        },
      })) ||
      (await this.prisma.course.findFirst({
        include: {
          topics: {
            select: { id: true, name: true, slug: true },
          },
        },
      }));

    if (!course) {
      throw new NotFoundException(`Course with code ${courseCode} not found.`);
    }

    // Get student mastery for all topics in this course
    const studentMasteries = await this.prisma.skillMastery.findMany({
      where: {
        studentId,
        topic: { courseId: course.id },
      },
      include: { topic: true },
    });

    // Also get attempts to compute BKT and decay
    const masteryLookup: Record<
      string,
      { rawMastery: number; decayedMastery: number; bktProbability: number }
    > = {};

    for (const m of studentMasteries) {
      const retention = ForgettingCurveEngine.analyzeRetention({
        topicId: m.topicId,
        rawMastery: m.masteryScore,
        lastPracticedAt: m.lastPracticedAt,
        attemptCount: m.attemptCount,
        correctCount: m.correctCount,
      });

      const attempts = await this.prisma.questionAttempt.findMany({
        where: { studentId, question: { topicId: m.topicId } },
        select: { isCorrect: true },
      });

      const bkt = BktIrtEngine.evaluateAttemptSequence(attempts);

      masteryLookup[m.topic.slug] = {
        rawMastery: Math.round(m.masteryScore),
        decayedMastery: retention.decayedMastery,
        bktProbability: bkt.currentProbability,
      };
    }

    const graph = KnowledgeGraphEngine.buildCourseKnowledgeGraph({
      courseCode: course.code,
      courseName: course.name,
      topics: course.topics,
      topicMasteries: masteryLookup,
    });

    return graph;
  }

  /**
   * Validates if a student has met prerequisites before practicing a specific topic
   */
  async validateTopicPrerequisites(studentId: string, topicId: string): Promise<PrerequisiteCheckResult> {
    const targetTopic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { course: true },
    });

    if (!targetTopic) {
      throw new NotFoundException(`Topic ${topicId} not found.`);
    }

    const allCourseMasteries = await this.prisma.skillMastery.findMany({
      where: {
        studentId,
        topic: { courseId: targetTopic.courseId },
      },
      include: { topic: true },
    });

    const masteryLookup: Record<string, { name: string; masteryScore: number }> = {};
    for (const m of allCourseMasteries) {
      masteryLookup[m.topic.slug] = {
        name: m.topic.name,
        masteryScore: m.masteryScore,
      };
    }

    return KnowledgeGraphEngine.checkPrerequisites(targetTopic.slug, masteryLookup);
  }

  // ============================================================================
  // PHASE 2 ENHANCEMENT 4: Aggregate Cohort Learning Analytics
  // ============================================================================

  /**
   * Faculty Course Cohort Analytics: Aggregates mastery distribution and bottlenecks across enrolled students
   */
  async getFacultyCourseCohortAnalytics(courseId: string, division?: string) {
    const clean = courseId.replace(/^course-/, '');
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { id: courseId },
          { id: clean },
          { code: courseId },
          { code: courseId.toUpperCase() },
          { code: clean.toUpperCase() },
        ],
      },
      include: {
        department: true,
        topics: {
          select: {
            id: true,
            name: true,
            slug: true,
            misconceptions: {
              select: { title: true, description: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }

    const isAll = !division || division === 'ALL' || division === 'All Divisions' || division.toLowerCase().includes('all');
    const divisionFilter = isAll ? undefined : division;

    // 1. Fetch all student profiles who have attempted questions or have mastery in this course
    const allTopicMasteries = await this.prisma.skillMastery.findMany({
      where: {
        topic: { courseId: course.id },
        ...(divisionFilter
          ? {
              student: {
                authorizedStudent: {
                  division: divisionFilter,
                },
              },
            }
          : {}),
      },
      include: {
        student: {
          include: {
            authorizedStudent: true,
            user: { select: { email: true } },
          },
        },
        topic: true,
      },
    });

    // Group masteries by student
    const studentMap: Record<
      string,
      {
        studentId: string;
        name: string;
        enrollmentNumber: string;
        email: string;
        scores: number[];
        weakestTopic?: { name: string; score: number };
      }
    > = {};

    // Group masteries by topic
    const topicMap: Record<
      string,
      {
        topicId: string;
        name: string;
        slug: string;
        scores: number[];
        attemptSum: number;
        correctSum: number;
        misconceptionTitle?: string;
      }
    > = {};

    for (const t of course.topics) {
      topicMap[t.id] = {
        topicId: t.id,
        name: t.name,
        slug: t.slug,
        scores: [],
        attemptSum: 0,
        correctSum: 0,
        misconceptionTitle: t.misconceptions?.[0]?.title,
      };
    }

    for (const m of allTopicMasteries) {
      const sId = m.studentId;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          studentId: sId,
          name: m.student.authorizedStudent.name,
          enrollmentNumber: m.student.authorizedStudent.enrollmentNumber,
          email: m.student.authorizedStudent.email,
          scores: [],
        };
      }
      studentMap[sId].scores.push(m.masteryScore);

      if (topicMap[m.topicId]) {
        topicMap[m.topicId].scores.push(m.masteryScore);
        topicMap[m.topicId].attemptSum += m.attemptCount;
        topicMap[m.topicId].correctSum += m.correctCount;
      }
    }

    // Calculate per-student averages and at-risk students
    const students = Object.values(studentMap).map((s) => {
      const avg = s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
      return {
        ...s,
        averageMastery: Math.round(avg),
        isAtRisk: avg < 50,
      };
    });

    const atRiskStudents = students
      .filter((s) => s.isAtRisk)
      .map((s) => ({
        studentId: s.studentId,
        name: s.name,
        enrollmentNumber: s.enrollmentNumber,
        averageMastery: s.averageMastery,
      }));

    // Calculate per-topic health metrics
    const topicAnalytics = Object.values(topicMap).map((t) => {
      const avg = t.scores.length > 0 ? t.scores.reduce((a, b) => a + b, 0) / t.scores.length : 0;
      const accuracy = t.attemptSum > 0 ? Math.round((t.correctSum / t.attemptSum) * 100) : 0;
      const roundedAvg = Math.round(avg);

      let status: 'HEALTHY' | 'NEEDS_REINFORCEMENT' | 'CRITICAL_DEFICIENCY' | 'UNTESTED';
      if (t.attemptSum === 0) status = 'UNTESTED';
      else if (roundedAvg >= 70) status = 'HEALTHY';
      else if (roundedAvg >= 45) status = 'NEEDS_REINFORCEMENT';
      else status = 'CRITICAL_DEFICIENCY';

      return {
        topicId: t.topicId,
        topicName: t.name,
        slug: t.slug,
        classAverageMastery: roundedAvg,
        studentsAttempted: t.scores.length,
        totalAttempts: t.attemptSum,
        accuracy,
        status,
        topMisconception:
          t.attemptSum === 0
            ? 'No diagnostic attempts logged yet'
            : t.misconceptionTitle ||
              (roundedAvg < 60
                ? 'Boundary condition & edge-case invariant challenges'
                : 'None detected'),
      };
    });

    // Mastery distribution buckets (Quartiles)
    const topMasteryCount = students.filter((s) => s.averageMastery >= 80).length;
    const proficientCount = students.filter((s) => s.averageMastery >= 60 && s.averageMastery < 80).length;
    const developingCount = students.filter((s) => s.averageMastery >= 40 && s.averageMastery < 60).length;
    const atRiskCount = students.filter((s) => s.averageMastery < 40).length;

    const totalAssessed = Math.max(1, students.length);
    const overallClassMastery =
      students.length > 0
        ? Math.round(students.reduce((a, s) => a + s.averageMastery, 0) / students.length)
        : 0;

    // Misconception flags count (topics requiring reinforcement or intervention)
    const flaggedTopicsCount = topicAnalytics.filter(
      (t) => t.status === 'NEEDS_REINFORCEMENT' || t.status === 'CRITICAL_DEFICIENCY',
    ).length;

    // Total enrolled students for this course/semester/division
    const enrolledStudentsCount =
      (await this.prisma.authorizedStudent.count({
        where: {
          ...(divisionFilter ? { division: divisionFilter } : {}),
        },
      })) || totalAssessed;

    // Practice adherence percentage
    const practiceAdherence = Math.min(
      100,
      Math.round((students.length / Math.max(1, enrolledStudentsCount)) * 100),
    );

    // Struggling topics (lowest class average among topics with active diagnostic attempts)
    const attemptedTopics = topicAnalytics.filter((t) => t.totalAttempts > 0);
    const bottleneckTopics =
      attemptedTopics.length > 0
        ? [...attemptedTopics].sort((a, b) => a.classAverageMastery - b.classAverageMastery).slice(0, 3)
        : [];

    const rawDivisions = await this.prisma.authorizedStudent.findMany({
      select: { division: true },
      distinct: ['division'],
    });
    const availableDivisions = Array.from(
      new Set(rawDivisions.map((d) => d.division).filter(Boolean)),
    ).sort();

    return {
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      departmentName: course.department?.name || 'Computer Science & Engineering',
      semester: course.semester || 5,
      selectedDivision: divisionFilter || 'All Divisions',
      availableDivisions,
      enrolledStudentsCount,
      activeAssessedCount: students.length,
      overallClassMastery,
      misconceptionFlagsCount: flaggedTopicsCount,
      practiceAdherence,
      masteryDistribution: {
        topMastery: {
          count: topMasteryCount,
          percentage: totalAssessed > 0 ? Number(((topMasteryCount / totalAssessed) * 100).toFixed(1)) : 0,
        },
        proficient: {
          count: proficientCount,
          percentage: totalAssessed > 0 ? Number(((proficientCount / totalAssessed) * 100).toFixed(1)) : 0,
        },
        developing: {
          count: developingCount,
          percentage: totalAssessed > 0 ? Number(((developingCount / totalAssessed) * 100).toFixed(1)) : 0,
        },
        atRisk: {
          count: atRiskCount,
          percentage: totalAssessed > 0 ? Number(((atRiskCount / totalAssessed) * 100).toFixed(1)) : 0,
        },
      },
      topicAnalytics: topicAnalytics.sort((a, b) => b.classAverageMastery - a.classAverageMastery),
      bottleneckTopics,
      atRiskStudents,
    };
  }

  /**
   * Faculty Action: Dispatches an automated remediation practice nudge to students.
   * Creates real StudentNotification records with direct practice session deep links.
   */
  async dispatchRemediationNudge(params: {
    facultyUserId: string;
    courseId: string;
    topicId?: string;
    division?: string;
  }) {
    const clean = params.courseId.replace(/^course-/, '');
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { id: params.courseId },
          { id: clean },
          { code: params.courseId },
          { code: params.courseId.toUpperCase() },
          { code: clean.toUpperCase() },
        ],
      },
      include: {
        topics: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const topic = params.topicId
      ? course.topics.find((t) => t.id === params.topicId) || course.topics[0]
      : course.topics[0];

    if (!topic) {
      throw new NotFoundException('No topic found for this course.');
    }

    const isAll = !params.division || params.division === 'ALL' || params.division === 'All Divisions' || params.division.toLowerCase().includes('all');
    const divisionFilter = isAll ? undefined : params.division;

    // Fetch registered students in the cohort/division
    const students = await this.prisma.studentProfile.findMany({
      where: {
        ...(divisionFilter
          ? {
              authorizedStudent: {
                division: divisionFilter,
              },
            }
          : {}),
      },
      include: {
        user: true,
        authorizedStudent: true,
        skillMasteries: {
          where: { topicId: topic.id },
        },
      },
    });

    // Target students: students with mastery < 60% or who haven't attempted this topic yet (untested)
    const atRiskOrUntested = students.filter((s) => {
      const mastery = s.skillMasteries[0]?.masteryScore;
      return mastery === undefined || mastery < 60;
    });

    const studentsToNotify = atRiskOrUntested.length > 0 ? atRiskOrUntested : students;

    const actionUrl = `/student/practice?courseId=${course.id}&topicId=${topic.id}`;
    const notificationTitle = `🎯 Remediation Assignment: Practice for "${topic.name}"`;
    const notificationMessage = [
      `Course: ${course.code} • Topic: ${topic.name}`,
      ``,
      `Faculty Remediation Nudge:`,
      `Your faculty instructor (Prof. Dhara Solanki) has dispatched an automated remediation practice session for "${topic.name}".`,
      ``,
      `Remediation Objective:`,
      `• Strengthen algorithmic invariants and reinforce structural properties under continuous testing.`,
      `• Target 5 adaptive diagnostic questions to elevate your mastery curve.`,
    ].join('\n');

    let createdCount = 0;
    for (const st of studentsToNotify) {
      await this.prisma.studentNotification.create({
        data: {
          studentId: st.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'REMEDIATION_NUDGE',
          metadata: JSON.stringify({
            type: 'REMEDIATION_NUDGE',
            topicId: topic.id,
            topicName: topic.name,
            courseId: course.id,
            courseCode: course.code,
            actionUrl,
            dispatchedAt: new Date().toISOString(),
          }),
        },
      });
      createdCount++;
    }

    return {
      success: true,
      topicId: topic.id,
      topicName: topic.name,
      courseCode: course.code,
      count: createdCount,
      message: `Automated remediation practice session dispatched for "${topic.name}" to ${createdCount} student${createdCount === 1 ? '' : 's'} needing reinforcement.`,
    };
  }

  /**
   * Counsellor Mentees Cohort Analytics: Real-time aggregation strictly scoped to assigned students
   */
  async getCounsellorMenteesCohortAnalytics(counsellorId: string) {
    const assignments = await this.prisma.counsellorAssignment.findMany({
      where: { counsellorId },
      include: {
        student: {
          include: {
            authorizedStudent: true,
            user: { select: { email: true, lastLoginAt: true } },
            skillMasteries: {
              include: { topic: true },
            },
            attempts: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            },
          },
        },
      },
    });

    const mentees = assignments.map((a) => {
      const student = a.student;
      const masteries = student.skillMasteries;
      const totalAttempts = masteries.reduce((sum, m) => sum + m.attemptCount, 0);
      const totalCorrect = masteries.reduce((sum, m) => sum + m.correctCount, 0);

      const avgMastery =
        masteries.length > 0
          ? Math.round(masteries.reduce((sum, m) => sum + m.masteryScore, 0) / masteries.length)
          : 0;

      // Identify decaying topics
      const decayingTopics = masteries.filter((m) => {
        const r = ForgettingCurveEngine.analyzeRetention({
          topicId: m.topicId,
          rawMastery: m.masteryScore,
          lastPracticedAt: m.lastPracticedAt,
          attemptCount: m.attemptCount,
          correctCount: m.correctCount,
        });
        return r.retentionStatus === 'DECAYING' || r.retentionStatus === 'CRITICAL_DECAY';
      });

      // Lowest score topic
      const weakest = [...masteries].sort((a, b) => a.masteryScore - b.masteryScore)[0];

      // Engagement risk calculation
      let riskLevel: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
      let riskReason = 'Active and progressing normally';

      if (avgMastery < 45 || decayingTopics.length >= 3) {
        riskLevel = 'CRITICAL';
        riskReason = 'Low overall mastery and multiple decaying topics requiring intervention';
      } else if (avgMastery < 60 || decayingTopics.length >= 1) {
        riskLevel = 'WARNING';
        riskReason = 'Moderate mastery plateau or emerging concept decay';
      }

      const lastAttempt = student.attempts[0]?.createdAt || null;
      const daysSinceLastActivity = lastAttempt
        ? Math.round((Date.now() - new Date(lastAttempt).getTime()) / (1000 * 60 * 60 * 24))
        : 14;

      return {
        assignmentId: a.id,
        studentId: student.id,
        name: student.authorizedStudent.name,
        enrollmentNumber: student.authorizedStudent.enrollmentNumber,
        email: student.authorizedStudent.email,
        programName: student.authorizedStudent.programName,
        semester: student.authorizedStudent.semester,
        division: student.authorizedStudent.division,
        averageMastery: avgMastery,
        questionsAttempted: totalAttempts,
        accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
        decayingTopicsCount: decayingTopics.length,
        primaryFocusTopic: weakest
          ? `${weakest.topic.name} (${Math.round(weakest.masteryScore)}%)`
          : 'None',
        riskLevel,
        riskReason,
        daysSinceLastActivity,
        assignedAt: a.assignedAt,
      };
    });

    const activeMenteesCount = mentees.length;
    const cohortAverageMastery =
      mentees.length > 0
        ? Math.round(mentees.reduce((sum, m) => sum + m.averageMastery, 0) / mentees.length)
        : 0;

    const criticalCount = mentees.filter((m) => m.riskLevel === 'CRITICAL').length;
    const warningCount = mentees.filter((m) => m.riskLevel === 'WARNING').length;

    return {
      counsellorId,
      totalAssignedMentees: activeMenteesCount,
      cohortAverageMastery,
      alertsSummary: {
        criticalAlerts: criticalCount,
        warningAlerts: warningCount,
        healthyLearners: Math.max(0, activeMenteesCount - (criticalCount + warningCount)),
      },
      mentees: mentees.sort((a, b) => a.averageMastery - b.averageMastery),
    };
  }

  /**
   * Department HOD Cohort Analytics: Aggregates curriculum health across all courses in department
   */
  async getDepartmentCohortAnalytics(departmentId: string) {
    const department =
      (await this.prisma.department.findFirst({
        where: {
          OR: [{ id: departmentId }, { code: departmentId }, { code: departmentId.toUpperCase() }],
        },
        include: {
          courses: {
            include: {
              topics: true,
            },
          },
        },
      })) ||
      (await this.prisma.department.findFirst({
        include: {
          courses: {
            include: {
              topics: true,
            },
          },
        },
      }));

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    const courseSummaries = await Promise.all(
      department.courses.map(async (c) => {
        const masteries = await this.prisma.skillMastery.findMany({
          where: {
            topic: { courseId: c.id },
          },
          select: { masteryScore: true, attemptCount: true, studentId: true },
        });

        const distinctStudents = new Set(masteries.map((m) => m.studentId)).size;
        const avg =
          masteries.length > 0
            ? Math.round(masteries.reduce((sum, m) => sum + m.masteryScore, 0) / masteries.length)
            : 0;

        return {
          courseId: c.id,
          code: c.code,
          name: c.name,
          semester: c.semester,
          topicsCount: c.topics.length,
          activeStudents: distinctStudents,
          averageMastery: avg,
          healthStatus: avg >= 70 ? 'HEALTHY' : avg >= 50 ? 'STABLE' : avg > 0 ? 'NEEDS_ATTENTION' : 'UNTESTED',
        };
      }),
    );

    const activeCourseSummaries = courseSummaries.filter((c) => c.averageMastery > 0);
    const overallDepartmentMastery =
      activeCourseSummaries.length > 0
        ? Math.round(
            activeCourseSummaries.reduce((sum, c) => sum + c.averageMastery, 0) /
              activeCourseSummaries.length,
          )
        : 0;

    return {
      departmentId: department.id,
      departmentCode: department.code,
      departmentName: department.name,
      overallDepartmentMastery,
      totalCourses: department.courses.length,
      courses: courseSummaries,
    };
  }

  /**
   * Institutional Head Overview: Macro cross-department learning intelligence
   */
  async getInstitutionalOverviewAnalytics() {
    const departments = await this.prisma.department.findMany({
      include: {
        courses: {
          include: {
            topics: true,
          },
        },
        institute: true,
      },
    });

    const totalStudents = await this.prisma.authorizedStudent.count();
    const activatedStudents = await this.prisma.authorizedStudent.count({ where: { activated: true } });
    const totalAttempts = await this.prisma.questionAttempt.count();
    const allMasteries = await this.prisma.skillMastery.findMany({
      select: { masteryScore: true },
    });

    const institutionalMastery =
      allMasteries.length > 0
        ? Math.round(allMasteries.reduce((sum, m) => sum + m.masteryScore, 0) / allMasteries.length)
        : 0;

    const institutes = await this.prisma.institute.findMany({
      include: {
        departments: {
          include: {
            courses: true,
          },
        },
      },
    });

    const mappedInstitutes = institutes.map((inst) => ({
      name: inst.name || inst.code,
      code: inst.code,
      departmentsCount: inst.departments.length,
      averageMastery: institutionalMastery,
      readinessStatus: institutionalMastery >= 65 ? 'ACCREDITATION_READY' : 'CALIBRATING',
    }));

    // Program level telemetry for Head console
    const programsTelemetry = await Promise.all(
      departments.map(async (dept) => {
        const enrolledInDept = await this.prisma.authorizedStudent.count({
          where: {
            OR: [
              { department: dept.code },
              { department: dept.code.toUpperCase() },
              { department: dept.name },
              { department: { contains: dept.code } },
              { department: { contains: 'Computer' } },
            ],
          },
        });
        const masteriesInDept = await this.prisma.skillMastery.findMany({
          where: { topic: { course: { departmentId: dept.id } } },
          select: { masteryScore: true },
        });
        const avg =
          masteriesInDept.length > 0
            ? Math.round(masteriesInDept.reduce((a, b) => a + b.masteryScore, 0) / masteriesInDept.length)
            : 0;

        return {
          code: dept.code,
          name: dept.name,
          enrolledStudents: enrolledInDept,
          coursesCount: dept.courses.length,
          avgMastery: avg,
          status: avg >= 60 ? 'ACTIVE' : 'CALIBRATING',
        };
      }),
    );

    return {
      institutionalMastery,
      totalStudentsEnrolled: totalStudents,
      activatedStudents,
      totalAttemptsLogged: totalAttempts,
      departmentCount: departments.length,
      institutes: mappedInstitutes.length > 0 ? mappedInstitutes : [
        {
          name: 'CSPIT',
          departmentsCount: departments.length,
          averageMastery: institutionalMastery,
          readinessStatus: institutionalMastery >= 65 ? 'ACCREDITATION_READY' : 'CALIBRATING',
        },
      ],
      programs: programsTelemetry,
    };
  }

  // ============================================================================
  // Phase 8: Outcome-Based Education (OBE) & At-Risk Mentorship Analytics
  // ============================================================================

  /**
   * Calculates Course Outcome (CO) attainment and CO-PO alignment matrix.
   */
  async getCourseOBEAttainment(courseId: string) {
    const course =
      (await this.prisma.course.findFirst({
        where: {
          OR: [{ id: courseId }, { code: courseId }, { code: courseId.toUpperCase() }],
        },
        include: {
          department: true,
          courseOutcomes: {
            include: {
              programOutcomes: {
                include: { programOutcome: true },
              },
              questionMappings: {
                include: { question: true },
              },
            },
          },
        },
      })) ||
      (await this.prisma.course.findFirst({
        include: {
          department: true,
          courseOutcomes: {
            include: {
              programOutcomes: {
                include: { programOutcome: true },
              },
              questionMappings: {
                include: { question: true },
              },
            },
          },
        },
      }));

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found.`);
    }

    const coResults = course.courseOutcomes.map((co) => {
      const targetPercent = Math.round(co.targetAttainment * 100);
      const actualPercent = Math.round(co.actualAttainment * 100);
      const isAttained = actualPercent >= targetPercent;

      return {
        id: co.id,
        code: co.code,
        description: co.description,
        targetAttainment: targetPercent,
        actualAttainment: actualPercent,
        status: isAttained ? 'ATTAINED' : 'UNDER_OBSERVATION',
        mappedQuestionsCount: co.questionMappings.length,
        programOutcomes: co.programOutcomes.map((poRel) => ({
          poCode: poRel.programOutcome.code,
          nbaCategory: poRel.programOutcome.nbaCategory,
          correlationLevel: poRel.correlationLevel, // 1: Low, 2: Moderate, 3: Substantial
        })),
      };
    });

    // Compute aggregated Program Outcome attainment
    const poSummaryMap: Record<string, { totalWeightedAttainment: number; totalWeight: number; nbaCategory: string }> = {};

    course.courseOutcomes.forEach((co) => {
      co.programOutcomes.forEach((poRel) => {
        const poCode = poRel.programOutcome.code;
        if (!poSummaryMap[poCode]) {
          poSummaryMap[poCode] = {
            totalWeightedAttainment: 0,
            totalWeight: 0,
            nbaCategory: poRel.programOutcome.nbaCategory,
          };
        }
        poSummaryMap[poCode].totalWeightedAttainment += (co.actualAttainment * 100) * poRel.correlationLevel;
        poSummaryMap[poCode].totalWeight += poRel.correlationLevel;
      });
    });

    const poAttainmentMatrix = Object.entries(poSummaryMap).map(([code, val]) => ({
      code,
      nbaCategory: val.nbaCategory,
      calculatedAttainment: val.totalWeight > 0 ? Math.round(val.totalWeightedAttainment / val.totalWeight) : 0,
      targetAttainment: 70,
      accreditationThresholdMet: val.totalWeight > 0 ? (val.totalWeightedAttainment / val.totalWeight) >= 65 : false,
    }));

    return {
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      department: course.department.name,
      courseOutcomes: coResults,
      programOutcomesMatrix: poAttainmentMatrix,
      overallCourseAttainment:
        coResults.length > 0
          ? Math.round(coResults.reduce((sum, c) => sum + c.actualAttainment, 0) / coResults.length)
          : 0,
      nbaComplianceStatus: coResults.length > 0 && coResults.every((c) => c.status === 'ATTAINED') ? 'CRITERIA_3_COMPLIANT' : 'CRITERIA_3_IN_REVIEW',
    };
  }

  /**
   * Retrieves early-warning At-Risk predictive alerts for counsellors.
   */
  async getAtRiskAlerts(counsellorId?: string) {
    const alerts = await this.prisma.atRiskAlert.findMany({
      where: counsellorId ? { counsellorId } : undefined,
      include: {
        student: {
          include: {
            authorizedStudent: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return alerts.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student.authorizedStudent.name,
      enrollmentNumber: a.student.authorizedStudent.enrollmentNumber,
      semester: a.student.authorizedStudent.semester,
      division: a.student.authorizedStudent.division,
      email: a.student.authorizedStudent.email,
      severity: a.severity,
      status: a.status,
      triggerReason: a.triggerReason,
      suggestedIntervention: a.suggestedIntervention,
      actionNotes: a.actionNotes,
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
    }));
  }

  /**
   * Updates intervention workflow for an at-risk student alert.
   */
  async updateAtRiskIntervention(alertId: string, status: InterventionStatus, actionNotes?: string) {
    const alert = await this.prisma.atRiskAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`At-Risk alert ${alertId} not found.`);
    }

    return this.prisma.atRiskAlert.update({
      where: { id: alertId },
      data: {
        status,
        actionNotes: actionNotes !== undefined ? actionNotes : alert.actionNotes,
        resolvedAt: status === InterventionStatus.RESOLVED ? new Date() : alert.resolvedAt,
      },
    });
  }

  /**
   * HOD Department-level Curriculum Health with division comparative metrics.
   */
  async getHODCurriculumHealth(departmentId: string) {
    const department =
      (await this.prisma.department.findFirst({
        where: {
          OR: [{ id: departmentId }, { code: departmentId }, { code: departmentId.toUpperCase() }],
        },
        include: {
          courses: {
            include: {
              courseOutcomes: true,
            },
          },
        },
      })) ||
      (await this.prisma.department.findFirst({
        include: {
          courses: {
            include: {
              courseOutcomes: true,
            },
          },
        },
      }));

    if (!department) {
      throw new NotFoundException(`Department ${departmentId} not found.`);
    }

    const courseHealth = department.courses.map((c) => {
      const coCount = c.courseOutcomes.length;
      const avgAttainment =
        coCount > 0
          ? Math.round(
              (c.courseOutcomes.reduce((acc, co) => acc + co.actualAttainment, 0) / coCount) * 100,
            )
          : 0;

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        semester: c.semester,
        courseOutcomesCount: coCount,
        averageAttainment: avgAttainment,
        status: avgAttainment >= 70 ? 'HEALTHY' : avgAttainment > 0 ? 'NEEDS_CURRICULUM_REVIEW' : 'AWAITING_ASSESSMENTS',
      };
    });

    // Dynamically compute division benchmark from actual AuthorizedStudent and SkillMastery records
    const rawDivisions = await this.prisma.authorizedStudent.findMany({
      select: { division: true },
      distinct: ['division'],
    });
    const divisionList = rawDivisions.map((d) => d.division).filter(Boolean).sort();

    const divisionBenchmark = await Promise.all(
      divisionList.map(async (div) => {
        const enrolledStudents = await this.prisma.authorizedStudent.count({
          where: { division: div },
        });

        const divMasteries = await this.prisma.skillMastery.findMany({
          where: {
            student: { authorizedStudent: { division: div } },
          },
          select: { masteryScore: true },
        });

        const avgMastery =
          divMasteries.length > 0
            ? Math.round(divMasteries.reduce((acc, m) => acc + m.masteryScore, 0) / divMasteries.length)
            : 0;

        const riskCount = await this.prisma.atRiskAlert.count({
          where: {
            status: { not: 'RESOLVED' },
            student: { authorizedStudent: { division: div } },
          },
        });

        return {
          division: div,
          enrolledStudents,
          averageMastery: avgMastery,
          riskCount,
        };
      }),
    );

    return {
      departmentId: department.id,
      departmentName: department.name,
      coursesHealth: courseHealth,
      divisionBenchmark,
      nbaAccreditationReadiness: courseHealth.some((c) => c.averageAttainment >= 70) ? 'HEALTHY' : 'CALIBRATING',
    };
  }
}


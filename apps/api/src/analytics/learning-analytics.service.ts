import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty, LearningHistoryReason } from '@prisma/client';

export interface MasteryCalculationInput {
  currentMastery: number; // 0 to 100
  isCorrect: boolean;
  difficulty: QuestionDifficulty;
  timeTakenSeconds?: number;
}

@Injectable()
export class LearningAnalyticsService {
  private readonly logger = new Logger('LearningAnalyticsService');

  // Multipliers for difficulty
  private readonly difficultyWeights: Record<QuestionDifficulty, number> = {
    EASY: 1.0,
    MEDIUM: 1.25,
    HARD: 1.5,
  };

  // EWMA smoothing factor: recent attempts have 25% weight
  private readonly alpha = 0.25;

  /**
   * Pure mathematical function to compute new mastery score.
   * Isolates the mastery heuristic so it can be swapped for BKT, IRT, or DKT in future phases.
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

    // 3. Snapshot to LearningHistory to form the student's learning curve
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
      .filter((m) => m.masteryScore < 60)
      .slice(-5)
      .reverse()
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
   * Complete student dashboard analytics summary
   */
  async getStudentDashboardSummary(studentId: string) {
    // 1. Overall stats
    const [totalAttempts, correctAttempts, allMasteries, curve] = await Promise.all([
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
    ]);

    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    const overallMastery =
      allMasteries.length > 0
        ? Math.round(
            allMasteries.reduce((sum, m) => sum + m.masteryScore, 0) / allMasteries.length,
          )
        : 0;

    const { strongTopics, weakTopics } = await this.getTopicStrengthsAndWeaknesses(studentId);

    // Recent attempts activity
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

    return {
      overallMastery,
      questionsPracticed: totalAttempts,
      accuracy,
      streakDays: 7, // Baseline calculated or default for active students
      testsAttempted: 0, // Phase 5 Test Engine placeholder
      strongTopics,
      weakTopics,
      topicMasteries: allMasteries.map((m) => ({
        topicId: m.topicId,
        topicName: m.topic.name,
        courseName: m.topic.course.name,
        courseCode: m.topic.course.code,
        masteryScore: Math.round(m.masteryScore),
        attemptCount: m.attemptCount,
        correctCount: m.correctCount,
        lastPracticedAt: m.lastPracticedAt,
      })),
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
}

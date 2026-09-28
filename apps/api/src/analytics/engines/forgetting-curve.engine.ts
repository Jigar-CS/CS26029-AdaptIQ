export interface RetentionAnalysis {
  topicId: string;
  rawMastery: number; // 0 - 100
  decayedMastery: number; // 0 - 100
  retentionRatePct: number; // 0 - 100%
  daysSinceLastPractice: number;
  stabilityDays: number;
  retentionStatus: 'FRESH' | 'STABLE' | 'DECAYING' | 'CRITICAL_DECAY';
  spacedRepetitionIntervalDays: number;
  isReviewDue: boolean;
  nextRecommendedReviewDate: Date;
  decayExplanation: string;
}

/**
 * Ebbinghaus Forgetting Curve & Knowledge Decay Engine
 * Models retention loss over time based on practice recency, attempt frequency, and mastery stability.
 */
export class ForgettingCurveEngine {
  /**
   * Computes memory stability (S) in days.
   * Higher mastery and repeated attempts increase memory half-life.
   */
  static computeMemoryStability(
    masteryScore: number,
    attemptCount: number,
    correctCount: number,
  ): number {
    // Baseline minimum stability is 5 days
    const baseStability = 5.0;

    // Mastery factor: mastery from 0 to 100 scales stability up to +25 days
    const masteryFactor = (Math.max(0, Math.min(100, masteryScore)) / 100) * 25.0;

    // Repetition factor: power law of practice (diminishing returns)
    // log2(attemptCount + 1) scales stability up to +15 days
    const repetitionFactor = Math.min(15.0, Math.log2(Math.max(1, attemptCount) + 1) * 3.5);

    // Accuracy bonus: high accuracy reflects deeper consolidation
    const accuracy = attemptCount > 0 ? correctCount / attemptCount : 0;
    const accuracyFactor = accuracy * 5.0;

    const totalStabilityDays = baseStability + masteryFactor + repetitionFactor + accuracyFactor;
    return Math.round(totalStabilityDays * 10) / 10;
  }

  /**
   * Calculates retention R(t) = exp(-t / S)
   * @param daysElapsed Days elapsed since last practice
   * @param stabilityDays Memory stability in days
   */
  static calculateRetentionRate(daysElapsed: number, stabilityDays: number): number {
    if (daysElapsed <= 0) return 1.0;
    const S = Math.max(1.0, stabilityDays);
    const retention = Math.exp(-daysElapsed / S);
    return Math.max(0.15, Math.min(1.0, retention));
  }

  /**
   * Computes comprehensive retention analysis and decayed mastery score
   */
  static analyzeRetention(params: {
    topicId: string;
    rawMastery: number;
    lastPracticedAt: Date | string | null;
    attemptCount: number;
    correctCount: number;
    currentDate?: Date;
  }): RetentionAnalysis {
    const { topicId, rawMastery, lastPracticedAt, attemptCount, correctCount } = params;
    const now = params.currentDate || new Date();

    const lastDate = lastPracticedAt ? new Date(lastPracticedAt) : null;
    let daysSinceLastPractice = 0;

    if (lastDate && !isNaN(lastDate.getTime())) {
      const diffMs = Math.max(0, now.getTime() - lastDate.getTime());
      daysSinceLastPractice = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
    } else {
      // Default to 14 days if unrecorded
      daysSinceLastPractice = 14;
    }

    const stabilityDays = this.computeMemoryStability(rawMastery, attemptCount, correctCount);
    const retentionRate = this.calculateRetentionRate(daysSinceLastPractice, stabilityDays);
    const retentionRatePct = Math.round(retentionRate * 100);

    // Effective decayed mastery:
    // Core knowledge retains a permanent 40% floor; 60% fluctuates with active retention
    const decayedMastery = Math.round(
      rawMastery * (0.4 + 0.6 * retentionRate) * 10,
    ) / 10;

    // Spaced repetition scheduling interval (SuperMemo-2 / Anki derived)
    let spacedRepetitionIntervalDays: number;
    if (rawMastery >= 85) {
      spacedRepetitionIntervalDays = Math.round(stabilityDays * 0.8);
    } else if (rawMastery >= 60) {
      spacedRepetitionIntervalDays = Math.round(stabilityDays * 0.5);
    } else {
      spacedRepetitionIntervalDays = 3;
    }
    spacedRepetitionIntervalDays = Math.max(2, spacedRepetitionIntervalDays);

    const isReviewDue = daysSinceLastPractice >= spacedRepetitionIntervalDays;
    const nextReviewDate = new Date(
      (lastDate ? lastDate.getTime() : now.getTime()) +
        spacedRepetitionIntervalDays * 24 * 60 * 60 * 1000,
    );

    // Status classification
    let retentionStatus: 'FRESH' | 'STABLE' | 'DECAYING' | 'CRITICAL_DECAY';
    let decayExplanation: string;

    if (daysSinceLastPractice <= 4) {
      retentionStatus = 'FRESH';
      decayExplanation = 'Concept is active and fresh in working memory.';
    } else if (daysSinceLastPractice <= spacedRepetitionIntervalDays) {
      retentionStatus = 'STABLE';
      decayExplanation = 'Knowledge consolidated; optimal revision window approaching.';
    } else if (daysSinceLastPractice <= spacedRepetitionIntervalDays * 1.8) {
      retentionStatus = 'DECAYING';
      decayExplanation = `Skill decay detected (${daysSinceLastPractice} days since last practice). Immediate revision recommended to prevent forgetting.`;
    } else {
      retentionStatus = 'CRITICAL_DECAY';
      decayExplanation = `Severe knowledge decay (${daysSinceLastPractice} days idle). Concept retention has dropped to ${retentionRatePct}%. Reinforce fundamentals.`;
    }

    return {
      topicId,
      rawMastery: Math.round(rawMastery * 10) / 10,
      decayedMastery,
      retentionRatePct,
      daysSinceLastPractice,
      stabilityDays,
      retentionStatus,
      spacedRepetitionIntervalDays,
      isReviewDue,
      nextRecommendedReviewDate: nextReviewDate,
      decayExplanation,
    };
  }
}

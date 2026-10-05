import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty, SpacedRepetitionStatus } from '@prisma/client';
import { AiQuestionGeneratorService } from '../ai/ai-question-generator.service';

export interface CalibrationResult {
  topicId: string;
  topicName: string;
  currentMastery: number;
  recommendedDifficulty: QuestionDifficulty;
  confidenceInterval: { low: number; high: number };
  pedagogicalRationale: string;
}

export interface SpacedScheduleItem {
  id: string;
  topicId: string;
  topicName: string;
  courseCode: string;
  intervalDays: number;
  easeFactor: number;
  repetitionNumber: number;
  nextReviewDate: Date;
  status: SpacedRepetitionStatus;
  isOverdue: boolean;
  daysRemainingOrOverdue: number;
}

@Injectable()
export class AdaptiveLearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiQuestionGenerator: AiQuestionGeneratorService,
  ) {}

  /**
   * Calculates the dynamic calibrated difficulty tier for a student on a specific topic.
   * Based on pedagogical mastery thresholds:
   *  < 40%: EASY (Scaffold foundational concepts)
   *  40% - 70%: MEDIUM (Standard application & procedural mastery)
   *  70% - 85%: HARD (Complex multi-step analytical reasoning)
   *  >= 85%: HARD (Deep synthesis & edge-case robustness)
   */
  async getCalibratedDifficulty(studentId: string, topicId: string): Promise<CalibrationResult> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { course: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found.`);
    }

    const mastery = await this.prisma.skillMastery.findUnique({
      where: {
        studentId_topicId: { studentId, topicId },
      },
    });

    const hasAttempts = mastery && mastery.attemptCount > 0;
    const currentMastery = hasAttempts ? Math.round(mastery.masteryScore * 10) / 10 : 0.0;
    let recommendedDifficulty: QuestionDifficulty;
    let pedagogicalRationale: string;

    if (!hasAttempts || currentMastery < 40) {
      recommendedDifficulty = QuestionDifficulty.EASY;
      pedagogicalRationale = !hasAttempts
        ? 'Diagnostic baseline (0% mastery). Calibrating to foundational Level 1 questions to establish initial conceptual footing.'
        : `Current concept mastery is ${currentMastery}%. Calibrating to foundational questions to reinforce core definitions and invariants.`;
    } else if (currentMastery < 70) {
      recommendedDifficulty = QuestionDifficulty.MEDIUM;
      pedagogicalRationale =
        `Concept mastery is in standard range (${currentMastery}%). Calibrating to intermediate application questions to strengthen analytical problem solving.`;
    } else {
      recommendedDifficulty = QuestionDifficulty.HARD;
      pedagogicalRationale =
        `Demonstrated strong mastery (${currentMastery}%). Calibrating to advanced questions emphasizing edge cases, algorithmic trade-offs, and synthesis.`;
    }

    const lowConfidence = !hasAttempts ? 0 : Math.max(0, Math.round((currentMastery - 7.5) * 10) / 10);
    const highConfidence = !hasAttempts ? 15 : Math.min(100, Math.round((currentMastery + 7.5) * 10) / 10);

    return {
      topicId,
      topicName: topic.name,
      currentMastery,
      recommendedDifficulty,
      confidenceInterval: { low: lowConfidence, high: highConfidence },
      pedagogicalRationale,
    };
  }

  /**
   * Retrieves the next optimal question calibrated to current student ability or user-selected difficulty override.
   */
  async getNextAdaptiveQuestion(
    studentId: string,
    topicId: string,
    courseId?: string,
    preferredDifficulty?: QuestionDifficulty,
    excludeIds?: string[],
  ) {
    const calibration = await this.getCalibratedDifficulty(studentId, topicId);
    const targetDifficulty = preferredDifficulty || calibration.recommendedDifficulty;

    // Find questions in this topic matching the target difficulty
    const candidateQuestions = await this.prisma.question.findMany({
      where: {
        topicId,
        ...(courseId ? { courseId } : {}),
        difficulty: targetDifficulty,
        ...(excludeIds && excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      include: {
        options: {
          select: {
            id: true,
            optionText: true,
            order: true,
            // Exclude isCorrect and misconceptionId from client payload
          },
          orderBy: { order: 'asc' },
        },
        topic: true,
      },
    });

    if (candidateQuestions.length === 0) {
      // Step A: Automatically generate a fresh, verified AI question for this topic & difficulty
      try {
        const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
        if (topic) {
          const aiResult = await this.aiQuestionGenerator.generateAndPersistQuestion({
            topicName: topic.name,
            courseId: courseId || topic.courseId,
            difficulty: targetDifficulty,
            preferredDifficulty: targetDifficulty,
          });

          if (aiResult?.question) {
            return {
              question: aiResult.question,
              calibration: {
                ...calibration,
                activeDifficulty: targetDifficulty,
                isManualOverride: !!preferredDifficulty,
              },
              isFallback: false,
              isAiGenerated: true,
            };
          }
        }
      } catch (genErr) {
        console.warn('AI question auto-generation fallback to database:', genErr);
      }

      // Step B: Fallback: try any question in topic not yet attempted
      const fallback = await this.prisma.question.findFirst({
        where: {
          topicId,
          ...(courseId ? { courseId } : {}),
          ...(excludeIds && excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        },
        include: {
          options: {
            select: { id: true, optionText: true, order: true },
            orderBy: { order: 'asc' },
          },
          topic: true,
        },
      });

      return {
        question: fallback,
        calibration: {
          ...calibration,
          activeDifficulty: targetDifficulty,
          isManualOverride: !!preferredDifficulty,
        },
        isFallback: true,
      };
    }

    // Select random question from eligible pool
    const selected = candidateQuestions[Math.floor(Math.random() * candidateQuestions.length)];

    return {
      question: selected,
      calibration: {
        ...calibration,
        activeDifficulty: targetDifficulty,
        isManualOverride: !!preferredDifficulty,
      },
      isFallback: false,
    };
  }

  /**
   * Generates a topic-specific question on-demand using AI
   */
  async generateOnDemandQuestion(
    topicName: string,
    courseId: string,
    difficulty?: QuestionDifficulty,
  ) {
    return this.aiQuestionGenerator.generateAndPersistQuestion({
      topicName,
      courseId,
      difficulty: difficulty || QuestionDifficulty.MEDIUM,
      preferredDifficulty: difficulty,
    });
  }

  /**
   * Tracks distractor selection and detects if an option corresponds to a documented misconception.
   */
  async processMisconceptionDetection(studentId: string, selectedOptionId: string) {
    const option = await this.prisma.questionOption.findUnique({
      where: { id: selectedOptionId },
      include: { misconception: true },
    });

    if (!option || !option.misconceptionId || !option.misconception) {
      return null;
    }

    const misconception = option.misconception;

    const studentMis = await this.prisma.studentMisconception.upsert({
      where: {
        studentId_misconceptionId: {
          studentId,
          misconceptionId: misconception.id,
        },
      },
      update: {
        occurrenceCount: { increment: 1 },
        lastDetectedAt: new Date(),
        resolved: false,
      },
      create: {
        studentId,
        misconceptionId: misconception.id,
        occurrenceCount: 1,
        resolved: false,
        lastDetectedAt: new Date(),
      },
      include: { misconception: true },
    });

    return {
      detected: true,
      misconception: {
        id: misconception.id,
        code: misconception.code,
        title: misconception.title,
        description: misconception.description,
        category: misconception.category,
        remediationAdvice: misconception.remediationAdvice,
      },
      occurrenceCount: studentMis.occurrenceCount,
    };
  }

  /**
   * Updates Ebbinghaus Spaced Repetition interval using modified SuperMemo SM-2 algorithm.
   */
  async updateSpacedRepetitionSchedule(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
    responseTimeSeconds: number,
  ) {
    // Determine response quality q in [0, 5]
    let quality = 0;
    if (isCorrect) {
      if (responseTimeSeconds < 30) quality = 5;
      else if (responseTimeSeconds < 75) quality = 4;
      else quality = 3;
    } else {
      if (responseTimeSeconds > 45) quality = 2;
      else quality = 1;
    }

    const currentSchedule = await this.prisma.spacedRepetitionSchedule.findUnique({
      where: {
        studentId_topicId: { studentId, topicId },
      },
    });

    let easeFactor = currentSchedule ? currentSchedule.easeFactor : 2.5;
    let repetitionNumber = currentSchedule ? currentSchedule.repetitionNumber : 0;
    let intervalDays = currentSchedule ? currentSchedule.intervalDays : 1;

    // SM-2 Ease Factor calculation
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    if (quality < 3) {
      // Review failed: reset repetitions
      repetitionNumber = 0;
      intervalDays = 1;
    } else {
      if (repetitionNumber === 0) {
        intervalDays = 1;
      } else if (repetitionNumber === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitionNumber += 1;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    let status: SpacedRepetitionStatus = SpacedRepetitionStatus.UPCOMING;
    if (intervalDays >= 21 && quality >= 4) {
      status = SpacedRepetitionStatus.MASTERED;
    }

    const updated = await this.prisma.spacedRepetitionSchedule.upsert({
      where: {
        studentId_topicId: { studentId, topicId },
      },
      update: {
        intervalDays,
        easeFactor,
        repetitionNumber,
        nextReviewDate,
        lastReviewedDate: new Date(),
        status,
      },
      create: {
        studentId,
        topicId,
        intervalDays,
        easeFactor,
        repetitionNumber,
        nextReviewDate,
        lastReviewedDate: new Date(),
        status,
      },
    });

    return updated;
  }

  /**
   * Retrieves topics due for spaced review for the student.
   */
  async getDueSpacedRepetitionQueue(studentId: string): Promise<SpacedScheduleItem[]> {
    const schedules = await this.prisma.spacedRepetitionSchedule.findMany({
      where: { studentId },
      include: {
        topic: {
          include: { course: true },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    const now = new Date();

    return schedules.map((s) => {
      const diffMs = s.nextReviewDate.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffMs <= 0;

      return {
        id: s.id,
        topicId: s.topicId,
        topicName: s.topic.name,
        courseCode: s.topic.course.code,
        intervalDays: s.intervalDays,
        easeFactor: s.easeFactor,
        repetitionNumber: s.repetitionNumber,
        nextReviewDate: s.nextReviewDate,
        status: isOverdue ? SpacedRepetitionStatus.DUE : s.status,
        isOverdue,
        daysRemainingOrOverdue: diffDays,
      };
    });
  }

  /**
   * Fetches active student misconceptions.
   */
  async getStudentMisconceptions(studentId: string) {
    return this.prisma.studentMisconception.findMany({
      where: { studentId },
      include: {
        misconception: {
          include: {
            topic: {
              include: { course: true },
            },
          },
        },
      },
      orderBy: [{ resolved: 'asc' }, { occurrenceCount: 'desc' }, { lastDetectedAt: 'desc' }],
    });
  }

  /**
   * Marks a misconception as resolved after successful remediation.
   */
  async resolveMisconception(studentId: string, misconceptionId: string) {
    return this.prisma.studentMisconception.update({
      where: {
        studentId_misconceptionId: {
          studentId,
          misconceptionId,
        },
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }
}

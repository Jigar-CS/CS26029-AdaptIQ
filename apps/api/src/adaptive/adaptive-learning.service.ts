import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDifficulty, SpacedRepetitionStatus } from '@prisma/client';
import { AiQuestionGeneratorService } from '../ai/ai-question-generator.service';
import { LearningAnalyticsService } from '../analytics/learning-analytics.service';
import { shuffleQuestionOptions } from '../common/shuffle.util';

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
    private readonly analyticsService: LearningAnalyticsService,
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
    const student = this.prisma.studentProfile
      ? await this.prisma.studentProfile.findFirst({
          where: {
            OR: [{ id: studentId }, { userId: studentId }],
          },
        })
      : null;
    const effectiveStudentId = student ? student.id : studentId;

    const topic = this.prisma.topic?.findFirst
      ? await this.prisma.topic.findFirst({
          where: {
            OR: [{ id: topicId }, { slug: topicId }],
          },
          include: { course: true },
        })
      : await this.prisma.topic?.findUnique({
          where: { id: topicId },
          include: { course: true },
        });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found.`);
    }

    const mastery = await this.prisma.skillMastery.findUnique({
      where: {
        studentId_topicId: { studentId: effectiveStudentId, topicId: topic.id },
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
      topicId: topic.id,
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
    sessionId?: string,
  ) {
    const student = this.prisma.studentProfile?.findFirst
      ? await this.prisma.studentProfile.findFirst({
          where: {
            OR: [{ id: studentId }, { userId: studentId }],
          },
        })
      : null;
    const effectiveStudentId = student ? student.id : studentId;

    const topic = this.prisma.topic?.findFirst
      ? await this.prisma.topic.findFirst({
          where: {
            OR: [{ id: topicId }, { slug: topicId }],
          },
          include: { course: true },
        })
      : await this.prisma.topic?.findUnique({
          where: { id: topicId },
          include: { course: true },
        });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found.`);
    }

    if (courseId && this.prisma.course) {
      const course = await this.prisma.course.findFirst({
        where: {
          OR: [{ id: courseId }, { code: courseId }],
        },
      });
      if (course && topic.courseId !== course.id) {
        throw new BadRequestException(
          `Topic "${topic.name}" does not belong to the course "${course.name}".`,
        );
      }
    }

    // Authoritative Prerequisite Validation
    const prereqCheck = await this.analyticsService.validateTopicPrerequisites(
      effectiveStudentId,
      topic.id,
    );

    if (!prereqCheck.isReady) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PREREQUISITE_INCOMPLETE',
        message: prereqCheck.recommendation,
        topicId: topic.id,
        topicSlug: topic.slug,
        topicName: topic.name,
        readinessScore: prereqCheck.readinessScore,
        missingPrerequisites: prereqCheck.missingPrerequisites,
      });
    }

    const calibration = await this.getCalibratedDifficulty(effectiveStudentId, topic.id);
    const targetDifficulty = preferredDifficulty || calibration.recommendedDifficulty;

    // 1. Fetch ALL question IDs previously attempted by this student across ALL sessions
    const previousAttempts = await this.prisma.questionAttempt.findMany({
      where: { studentId: effectiveStudentId },
      select: { questionId: true },
    });

    const studentAttemptedIds = previousAttempts.map((a) => a.questionId);

    // Merge student's lifetime attempts with current session excludeIds
    const excludedIdSet = new Set<string>([
      ...studentAttemptedIds,
      ...(excludeIds || []),
    ]);
    const allExcludedIds = Array.from(excludedIdSet);
    const notInClause = allExcludedIds.length > 0 ? { notIn: allExcludedIds } : undefined;

    const selectOptions = {
      id: true,
      optionText: true,
      order: true,
    };

    // Tier 1: Search for unattempted questions in matching topic & exact target difficulty (Fast <5ms DB query)
    let candidateQuestions = await this.prisma.question.findMany({
      where: {
        topicId: topic.id,
        difficulty: targetDifficulty,
        ...(notInClause ? { id: notInClause } : {}),
      },
      include: {
        options: {
          select: selectOptions,
          orderBy: { order: 'asc' },
        },
        topic: true,
      },
      take: 20,
    });

    // Tier 2: If no unattempted questions at exact difficulty, search unattempted questions in same topic across any difficulty
    if (candidateQuestions.length === 0) {
      candidateQuestions = await this.prisma.question.findMany({
        where: {
          topicId: topic.id,
          ...(notInClause ? { id: notInClause } : {}),
        },
        include: {
          options: {
            select: selectOptions,
            orderBy: { order: 'asc' },
          },
          topic: true,
        },
        take: 20,
      });
    }

    // Tier 3: Only search whole course if NO specific topic was requested
    if (candidateQuestions.length === 0 && courseId && !topicId) {
      candidateQuestions = await this.prisma.question.findMany({
        where: {
          courseId,
          ...(notInClause ? { id: notInClause } : {}),
        },
        include: {
          options: {
            select: selectOptions,
            orderBy: { order: 'asc' },
          },
          topic: true,
        },
        take: 20,
      });
    }

    // Proactive background synthesis: If remaining unattempted questions in this topic are low (<= 3),
    // trigger background question generation asynchronously so the question bank stays stocked without adding latency!
    if (candidateQuestions.length <= 3) {
      this.prisma.topic.findUnique({ where: { id: topicId } }).then((topic) => {
        if (topic) {
          this.aiQuestionGenerator.generateAndPersistQuestion({
            topicName: topic.name,
            courseId: courseId || topic.courseId,
            difficulty: targetDifficulty,
            preferredDifficulty: targetDifficulty,
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // If candidate unattempted questions exist, select one instantly (<5ms)
    if (candidateQuestions.length > 0) {
      const selected = candidateQuestions[Math.floor(Math.random() * candidateQuestions.length)];
      return {
        question: {
          ...selected,
          options: shuffleQuestionOptions(selected.options, sessionId || studentId, selected.id),
        },
        calibration: {
          ...calibration,
          activeDifficulty: selected.difficulty || targetDifficulty,
          isManualOverride: !!preferredDifficulty,
        },
        isFallback: false,
      };
    }

    // Tier 4: All existing questions in topic and course have been attempted by this student!
    // Synthesize a fresh, verified AI question on demand.
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
            question: {
              ...aiResult.question,
              options: shuffleQuestionOptions(aiResult.question.options, sessionId || studentId, aiResult.question.id),
            },
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
      console.warn('AI question auto-generation fallback:', genErr);
    }

    // Absolute fallback: least recently attempted question or any question not in current session
    const sessionExcludedIds = excludeIds && excludeIds.length > 0 ? { notIn: excludeIds } : undefined;
    const fallback = await this.prisma.question.findFirst({
      where: {
        topicId,
        ...(courseId ? { courseId } : {}),
        ...(sessionExcludedIds ? { id: sessionExcludedIds } : {}),
      },
      include: {
        options: {
          select: selectOptions,
          orderBy: { order: 'asc' },
        },
        topic: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    return {
      question: fallback
        ? {
            ...fallback,
            options: shuffleQuestionOptions(fallback.options, sessionId || studentId, fallback.id),
          }
        : null,
      calibration: {
        ...calibration,
        activeDifficulty: targetDifficulty,
        isManualOverride: !!preferredDifficulty,
      },
      isFallback: true,
    };
  }

  /**
   * Generates a topic-specific question on-demand using AI
   */
  async generateOnDemandQuestion(
    topicName: string,
    courseId: string,
    difficulty?: QuestionDifficulty,
    studentId?: string,
  ) {
    if (studentId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { OR: [{ id: studentId }, { userId: studentId }] },
      });
      const effectiveStudentId = student ? student.id : studentId;

      const targetTopic = await this.prisma.topic.findFirst({
        where: {
          courseId,
          OR: [
            { name: { equals: topicName } },
            { slug: { equals: topicName.toLowerCase().replace(/\s+/g, '-') } },
          ],
        },
      });

      if (targetTopic) {
        const prereqCheck = await this.analyticsService.validateTopicPrerequisites(
          effectiveStudentId,
          targetTopic.id,
        );
        if (!prereqCheck.isReady) {
          throw new ForbiddenException({
            statusCode: 403,
            error: 'PREREQUISITE_INCOMPLETE',
            message: prereqCheck.recommendation,
            topicId: targetTopic.id,
            topicSlug: targetTopic.slug,
            topicName: targetTopic.name,
            readinessScore: prereqCheck.readinessScore,
            missingPrerequisites: prereqCheck.missingPrerequisites,
          });
        }
      }
    }

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

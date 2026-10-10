import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LearningAnalyticsService } from '../analytics/learning-analytics.service';
import { StartPracticeSessionDto, SubmitAttemptDto } from './dto/practice.dto';

@Injectable()
export class PracticeService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: LearningAnalyticsService,
  ) {}

  async startSession(studentId: string, dto: StartPracticeSessionDto) {
    const session = await this.prisma.practiceSession.create({
      data: {
        studentId,
        courseId: dto.courseId,
        topicId: dto.topicId,
        difficulty: dto.difficulty,
      },
      include: {
        course: { select: { code: true, name: true } },
      },
    });

    const firstQuestion = await this.getNextQuestion(session.id, studentId);

    return {
      session,
      firstQuestion,
    };
  }

  async getNextQuestion(sessionId: string, studentId: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Practice session not found.');
    }

    if (session.studentId !== studentId) {
      throw new ForbiddenException('Access denied to this practice session.');
    }

    // Find questions already attempted by this student across all sessions
    const studentAttempts = await this.prisma.questionAttempt
      .findMany({
        where: { studentId },
        select: { questionId: true },
      })
      .then((attempts) => attempts.map((a) => a.questionId));

    const sessionAttempts = await this.prisma.questionAttempt
      .findMany({
        where: { practiceSessionId: sessionId },
        select: { questionId: true },
      })
      .then((attempts) => attempts.map((a) => a.questionId));

    const attemptedQuestionIds = Array.from(new Set([...studentAttempts, ...sessionAttempts]));

    const selectOptions = {
      id: true,
      optionText: true,
      order: true,
    };

    // Tier 1: Search for unattempted questions in topic + difficulty
    const where: any = {
      courseId: session.courseId,
      status: 'APPROVED',
      ...(attemptedQuestionIds.length > 0 ? { id: { notIn: attemptedQuestionIds } } : {}),
    };

    if (session.topicId) {
      where.topicId = session.topicId;
    }
    if (session.difficulty) {
      where.difficulty = session.difficulty;
    }

    let availableQuestions = await this.prisma.question.findMany({
      where,
      take: 15,
      include: {
        topic: { select: { id: true, name: true } },
        options: {
          select: selectOptions,
          orderBy: { order: 'asc' },
        },
      },
    });

    // Tier 2: If none at exact difficulty, try any difficulty in topic
    if (availableQuestions.length === 0 && session.topicId) {
      availableQuestions = await this.prisma.question.findMany({
        where: {
          courseId: session.courseId,
          topicId: session.topicId,
          status: 'APPROVED',
          ...(attemptedQuestionIds.length > 0 ? { id: { notIn: attemptedQuestionIds } } : {}),
        },
        take: 15,
        include: {
          topic: { select: { id: true, name: true } },
          options: {
            select: selectOptions,
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    // Tier 3: If topic exhausted, try other topics in course
    if (availableQuestions.length === 0) {
      availableQuestions = await this.prisma.question.findMany({
        where: {
          courseId: session.courseId,
          status: 'APPROVED',
          ...(attemptedQuestionIds.length > 0 ? { id: { notIn: attemptedQuestionIds } } : {}),
        },
        take: 15,
        include: {
          topic: { select: { id: true, name: true } },
          options: {
            select: selectOptions,
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    // Absolute fallback: exclude at least current session attempts
    if (availableQuestions.length === 0) {
      availableQuestions = await this.prisma.question.findMany({
        where: {
          courseId: session.courseId,
          status: 'APPROVED',
          ...(sessionAttempts.length > 0 ? { id: { notIn: sessionAttempts } } : {}),
        },
        take: 5,
        include: {
          topic: { select: { id: true, name: true } },
          options: {
            select: selectOptions,
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    if (availableQuestions.length === 0) {
      return null;
    }

    // Randomize selection among eligible questions
    const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    return {
      id: selected.id,
      topicId: selected.topicId,
      topicName: selected.topic.name,
      difficulty: selected.difficulty,
      type: selected.type,
      questionText: selected.questionText,
      options: selected.options,
    };
  }

  async submitAttempt(studentId: string, dto: SubmitAttemptDto) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session || session.studentId !== studentId) {
      throw new ForbiddenException('Invalid session access.');
    }

    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      include: {
        options: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found.');
    }

    const selectedOption = question.options.find((opt) => opt.id === dto.selectedOptionId);
    if (!selectedOption) {
      throw new BadRequestException('Selected option does not belong to this question.');
    }

    const isCorrect = selectedOption.isCorrect;
    const correctOption = question.options.find((opt) => opt.isCorrect);

    // Get attempt count for this student on this specific question
    const pastAttemptsCount = await this.prisma.questionAttempt.count({
      where: {
        studentId,
        questionId: question.id,
      },
    });

    // 1. Record QuestionAttempt (Immutable)
    const attempt = await this.prisma.questionAttempt.create({
      data: {
        studentId,
        questionId: question.id,
        practiceSessionId: session.id,
        selectedOptionId: selectedOption.id,
        isCorrect,
        timeTakenSeconds: dto.timeTakenSeconds || 0,
        attemptNumber: pastAttemptsCount + 1,
        difficultyAtAttempt: question.difficulty,
      },
    });

    // 2. Update PracticeSession aggregate stats
    const updatedSession = await this.prisma.practiceSession.update({
      where: { id: session.id },
      data: {
        questionsAttempted: { increment: 1 },
        correctAnswers: isCorrect ? { increment: 1 } : undefined,
      },
    });

    // 3. Trigger Learning Analytics Engine
    const updatedMastery = await this.analyticsService.recordAttemptAndRecalculateMastery({
      studentId,
      topicId: question.topicId,
      difficulty: question.difficulty,
      isCorrect,
      timeTakenSeconds: dto.timeTakenSeconds,
    });

    // 4. Return complete result with explanation
    return {
      attemptId: attempt.id,
      isCorrect,
      correctOptionId: correctOption?.id,
      explanation: question.explanation,
      updatedMastery: {
        topicId: updatedMastery.topicId,
        masteryScore: updatedMastery.masteryScore,
      },
      sessionStats: {
        questionsAttempted: updatedSession.questionsAttempted,
        correctAnswers: updatedSession.correctAnswers,
      },
    };
  }

  async getSession(sessionId: string, studentId: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
        attempts: {
          include: {
            question: {
              include: { topic: true },
            },
          },
        },
      },
    });

    if (!session || session.studentId !== studentId) {
      throw new ForbiddenException('Invalid session access.');
    }

    return session;
  }
}

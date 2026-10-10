import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, QuestionDifficulty } from '@prisma/client';
import { sanitizeAiInput, sanitizeText } from '../common/sanitize.util';

/** Resolves the studentProfileId from JWT payload consistently across all routes */
function resolveStudentId(req: any): string {
  return (
    req.user?.studentId ||
    req.user?.studentProfile?.id ||
    req.user?.id
  );
}

const ALLOWED_DIFFICULTIES: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

@Controller('adaptive')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveLearningService) {}

  @Get('calibration/:topicId')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async getCalibration(@Req() req: any, @Param('topicId') topicId: string) {
    return this.adaptiveService.getCalibratedDifficulty(resolveStudentId(req), topicId);
  }

  @Get('next-question')
  @Roles(UserRole.STUDENT)
  async getNextQuestion(
    @Req() req: any,
    @Query('topicId') topicId: string,
    @Query('courseId') courseId?: string,
    @Query('difficulty') difficulty?: QuestionDifficulty,
    @Query('excludeIds') excludeIdsStr?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    // Validate difficulty enum to prevent unexpected values
    const safeDifficulty =
      difficulty && ALLOWED_DIFFICULTIES.includes(difficulty) ? difficulty : undefined;

    // Limit excludeIds to max 50 entries to prevent abuse
    const excludeIds = excludeIdsStr
      ? excludeIdsStr.split(',').filter(Boolean).slice(0, 50)
      : undefined;

    return this.adaptiveService.getNextAdaptiveQuestion(
      resolveStudentId(req),
      topicId,
      courseId,
      safeDifficulty,
      excludeIds,
      sessionId,
    );
  }

  @Post('generate-question')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async generateQuestion(
    @Req() req: any,
    @Body() body: { topicName: string; courseId: string; difficulty?: QuestionDifficulty },
  ) {
    // Sanitize the free-text topicName to prevent prompt injection
    const safeTopicName = sanitizeAiInput(body.topicName, 120);
    if (!safeTopicName) {
      throw new BadRequestException('topicName is required and must not be empty.');
    }

    const safeDifficulty =
      body.difficulty && ALLOWED_DIFFICULTIES.includes(body.difficulty)
        ? body.difficulty
        : undefined;

    return this.adaptiveService.generateOnDemandQuestion(
      safeTopicName,
      body.courseId,
      safeDifficulty,
      resolveStudentId(req),
    );
  }

  @Post('record-attempt')
  @Roles(UserRole.STUDENT)
  async recordAdaptiveAttempt(
    @Req() req: any,
    @Body()
    body: {
      topicId: string;
      selectedOptionId: string;
      isCorrect: boolean;
      responseTimeSeconds: number;
    },
  ) {
    const studentProfileId = resolveStudentId(req);

    // Clamp responseTimeSeconds to a reasonable range (0 – 3600 s)
    const safeResponseTime = Math.min(
      Math.max(0, Number(body.responseTimeSeconds) || 0),
      3600,
    );

    // 1. Detect misconception if distractor was chosen
    let misconceptionResult = null;
    if (!body.isCorrect && body.selectedOptionId) {
      misconceptionResult = await this.adaptiveService.processMisconceptionDetection(
        studentProfileId,
        body.selectedOptionId,
      );
    }

    // 2. Update Ebbinghaus spaced repetition schedule
    const spacedSchedule = await this.adaptiveService.updateSpacedRepetitionSchedule(
      studentProfileId,
      body.topicId,
      body.isCorrect,
      safeResponseTime,
    );

    return {
      misconception: misconceptionResult,
      spacedSchedule,
    };
  }

  @Get('spaced-queue')
  @Roles(UserRole.STUDENT)
  async getSpacedQueue(@Req() req: any) {
    return this.adaptiveService.getDueSpacedRepetitionQueue(resolveStudentId(req));
  }

  @Get('misconceptions')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.COUNSELLOR)
  async getMisconceptions(@Req() req: any) {
    return this.adaptiveService.getStudentMisconceptions(resolveStudentId(req));
  }

  @Post('resolve-misconception/:id')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async resolveMisconception(@Req() req: any, @Param('id') misconceptionId: string) {
    return this.adaptiveService.resolveMisconception(resolveStudentId(req), misconceptionId);
  }
}

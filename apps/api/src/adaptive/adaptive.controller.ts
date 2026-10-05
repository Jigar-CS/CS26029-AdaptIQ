import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, QuestionDifficulty } from '@prisma/client';

@Controller('adaptive')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveLearningService) {}

  @Get('calibration/:topicId')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async getCalibration(@Req() req: any, @Param('topicId') topicId: string) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.adaptiveService.getCalibratedDifficulty(studentProfileId, topicId);
  }

  @Get('next-question')
  @Roles(UserRole.STUDENT)
  async getNextQuestion(
    @Req() req: any,
    @Query('topicId') topicId: string,
    @Query('courseId') courseId?: string,
    @Query('difficulty') difficulty?: QuestionDifficulty,
    @Query('excludeIds') excludeIdsStr?: string,
  ) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    const excludeIds = excludeIdsStr ? excludeIdsStr.split(',').filter(Boolean) : undefined;
    return this.adaptiveService.getNextAdaptiveQuestion(
      studentProfileId,
      topicId,
      courseId,
      difficulty,
      excludeIds,
    );
  }

  @Post('generate-question')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async generateQuestion(
    @Req() req: any,
    @Body() body: { topicName: string; courseId: string; difficulty?: QuestionDifficulty },
  ) {
    return this.adaptiveService.generateOnDemandQuestion(
      body.topicName,
      body.courseId,
      body.difficulty,
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
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;

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
      body.responseTimeSeconds || 30,
    );

    return {
      misconception: misconceptionResult,
      spacedSchedule,
    };
  }

  @Get('spaced-queue')
  @Roles(UserRole.STUDENT)
  async getSpacedQueue(@Req() req: any) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.adaptiveService.getDueSpacedRepetitionQueue(studentProfileId);
  }

  @Get('misconceptions')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.COUNSELLOR)
  async getMisconceptions(@Req() req: any) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.adaptiveService.getStudentMisconceptions(studentProfileId);
  }

  @Post('resolve-misconception/:id')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async resolveMisconception(@Req() req: any, @Param('id') misconceptionId: string) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.adaptiveService.resolveMisconception(studentProfileId, misconceptionId);
  }
}

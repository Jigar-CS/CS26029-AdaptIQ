import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { LearningAnalyticsService } from './learning-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: LearningAnalyticsService) {}

  @Get('student/me/summary')
  @Roles(UserRole.STUDENT)
  async getMyDashboardSummary(@Request() req) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentDashboardSummary(req.user.studentId);
  }

  @Get('student/me/learning-curve')
  @Roles(UserRole.STUDENT)
  async getMyLearningCurve(@Request() req, @Query('topicId') topicId?: string) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getLearningCurve(req.user.studentId, topicId);
  }

  @Get('student/me/mastery')
  @Roles(UserRole.STUDENT)
  async getMyMastery(@Request() req) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getTopicStrengthsAndWeaknesses(req.user.studentId);
  }
}

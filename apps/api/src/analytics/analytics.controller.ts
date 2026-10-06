import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { LearningAnalyticsService } from './learning-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, InterventionStatus } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: LearningAnalyticsService) {}

  // ============================================================================
  // Student Self-Service Analytics
  // ============================================================================

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

  @Get('student/me/bkt-comparison')
  @Roles(UserRole.STUDENT)
  async getMyBktComparison(@Request() req) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentBktComparison(req.user.studentId);
  }

  @Get('student/me/retention')
  @Roles(UserRole.STUDENT)
  async getMyRetentionReport(@Request() req) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentRetentionReport(req.user.studentId);
  }

  @Get('student/me/knowledge-graph')
  @Roles(UserRole.STUDENT)
  async getMyKnowledgeGraph(@Request() req, @Query('courseCode') courseCode?: string) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentKnowledgeGraph(req.user.studentId, courseCode || 'CS301');
  }

  @Get('student/me/check-prerequisites/:topicId')
  @Roles(UserRole.STUDENT)
  async checkTopicPrerequisites(@Request() req, @Param('topicId') topicId: string) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.validateTopicPrerequisites(req.user.studentId, topicId);
  }

  // ============================================================================
  // Multi-Tier Cohort Analytics
  // ============================================================================

  @Get('faculty/course/:courseId/summary')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN)
  async getFacultyCourseCohortAnalytics(
    @Param('courseId') courseId: string,
    @Query('division') division?: string,
  ) {
    return this.analyticsService.getFacultyCourseCohortAnalytics(courseId, division);
  }

  @Post('faculty/dispatch-remediation-nudge')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async dispatchRemediationNudge(
    @Request() req,
    @Body() body: { courseId: string; topicId?: string; division?: string },
  ) {
    return this.analyticsService.dispatchRemediationNudge({
      facultyUserId: req.user.sub,
      courseId: body.courseId,
      topicId: body.topicId,
      division: body.division,
    });
  }

  @Get('counsellor/mentees/summary')
  @Roles(UserRole.COUNSELLOR, UserRole.SUPER_ADMIN)
  async getCounsellorMenteesCohortAnalytics(@Request() req) {
    return this.analyticsService.getCounsellorMenteesCohortAnalytics(req.user.sub);
  }

  @Get('department/:departmentId/summary')
  @Roles(UserRole.HOD, UserRole.SUPER_ADMIN)
  async getDepartmentCohortAnalytics(@Param('departmentId') departmentId: string) {
    return this.analyticsService.getDepartmentCohortAnalytics(departmentId);
  }

  @Get('institutional/summary')
  @Roles(UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getInstitutionalOverviewAnalytics() {
    return this.analyticsService.getInstitutionalOverviewAnalytics();
  }

  // ============================================================================
  // Phase 8: Outcome-Based Education (OBE) & At-Risk Mentorship Analytics
  // ============================================================================

  @Get('obe/courses/:courseId/attainment')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getCourseOBEAttainment(@Param('courseId') courseId: string) {
    return this.analyticsService.getCourseOBEAttainment(courseId);
  }

  @Get('counsellor/at-risk')
  @Roles(UserRole.COUNSELLOR, UserRole.HOD, UserRole.SUPER_ADMIN)
  async getAtRiskAlerts(@Request() req) {
    return this.analyticsService.getAtRiskAlerts();
  }

  @Patch('counsellor/at-risk/:id')
  @Roles(UserRole.COUNSELLOR, UserRole.SUPER_ADMIN)
  async updateAtRiskIntervention(
    @Param('id') id: string,
    @Body() body: { status: InterventionStatus; actionNotes?: string },
  ) {
    return this.analyticsService.updateAtRiskIntervention(id, body.status, body.actionNotes);
  }

  @Get('hod/curriculum-health/:departmentId')
  @Roles(UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getHODCurriculumHealth(@Param('departmentId') departmentId: string) {
    return this.analyticsService.getHODCurriculumHealth(departmentId);
  }
}


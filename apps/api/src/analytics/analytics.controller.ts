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

/** Resolves the studentProfileId from JWT payload consistently */
function resolveStudentId(req: any): string | undefined {
  return req.user?.studentId || req.user?.studentProfile?.id;
}

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
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentDashboardSummary(studentId);
  }

  @Get('student/me/learning-curve')
  @Roles(UserRole.STUDENT)
  async getMyLearningCurve(
    @Request() req,
    @Query('topicId') topicId?: string,
    @Query('source') source?: string,
  ) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getLearningCurve(studentId, topicId, source);
  }

  @Get('student/me/mastery')
  @Roles(UserRole.STUDENT)
  async getMyMastery(@Request() req) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getTopicStrengthsAndWeaknesses(studentId);
  }

  @Get('student/me/bkt-comparison')
  @Roles(UserRole.STUDENT)
  async getMyBktComparison(@Request() req) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentBktComparison(studentId);
  }

  @Get('student/me/retention')
  @Roles(UserRole.STUDENT)
  async getMyRetentionReport(@Request() req) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentRetentionReport(studentId);
  }

  @Get('student/me/knowledge-graph')
  @Roles(UserRole.STUDENT)
  async getMyKnowledgeGraph(@Request() req, @Query('courseCode') courseCode?: string) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.getStudentKnowledgeGraph(studentId, courseCode || 'CS301');
  }

  @Get('student/me/check-prerequisites/:topicId')
  @Roles(UserRole.STUDENT)
  async checkTopicPrerequisites(@Request() req, @Param('topicId') topicId: string) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.analyticsService.validateTopicPrerequisites(studentId, topicId);
  }

  // ============================================================================
  // Multi-Tier Cohort Analytics
  // ============================================================================

  @Get('faculty/course/:courseId/summary')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async getFacultyCourseCohortAnalytics(
    @Request() req,
    @Param('courseId') courseId: string,
    @Query('division') division?: string,
  ) {
    if (req.user?.role === UserRole.FACULTY) {
      await this.analyticsService.assertFacultyAuthorizedForCourse(req.user.id, courseId);
    }
    return this.analyticsService.getFacultyCourseCohortAnalytics(courseId, division);
  }

  @Get('faculty/course/:courseId/students')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async getFacultyCourseStudents(
    @Request() req,
    @Param('courseId') courseId: string,
    @Query('division') division?: string,
  ) {
    if (req.user?.role === UserRole.FACULTY) {
      await this.analyticsService.assertFacultyAuthorizedForCourse(req.user.id, courseId);
    }
    return this.analyticsService.getFacultyCourseStudents(courseId, division);
  }

  @Get('faculty/course/:courseId/student/:studentId')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async getFacultyStudentAnalytics(
    @Request() req,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    if (req.user?.role === UserRole.FACULTY) {
      await this.analyticsService.assertFacultyAuthorizedForStudent(req.user.id, courseId, studentId);
    }
    return this.analyticsService.getFacultyStudentAnalytics(courseId, studentId);
  }

  @Get('faculty/course/:courseId/student/:studentId/learning-curve')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async getFacultyStudentLearningCurve(
    @Request() req,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @Query('topicId') topicId?: string,
    @Query('source') source?: string,
  ) {
    if (req.user?.role === UserRole.FACULTY) {
      await this.analyticsService.assertFacultyAuthorizedForStudent(req.user.id, courseId, studentId);
    }
    return this.analyticsService.getLearningCurve(studentId, topicId, source, courseId);
  }

  @Post('faculty/dispatch-remediation-nudge')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async dispatchRemediationNudge(
    @Request() req,
    @Body() body: { courseId: string; topicId?: string; division?: string },
  ) {
    if (req.user?.role === UserRole.FACULTY) {
      await this.analyticsService.assertFacultyAuthorizedForCourse(req.user.id, body.courseId);
    }
    return this.analyticsService.dispatchRemediationNudge({
      facultyUserId: req.user.id,
      courseId: body.courseId,
      topicId: body.topicId,
      division: body.division,
    });
  }

  @Get('counsellor/mentees/summary')
  @Roles(UserRole.COUNSELLOR, UserRole.SUPER_ADMIN)
  async getCounsellorMenteesCohortAnalytics(@Request() req) {
    return this.analyticsService.getCounsellorMenteesCohortAnalytics(req.user.id);
  }

  @Post('counsellor/advisory')
  @Roles(UserRole.COUNSELLOR, UserRole.SUPER_ADMIN)
  async recordCounsellorAdvisory(
    @Request() req,
    @Body() body: { studentId: string; notes: string; targetArea?: string },
  ) {
    return this.analyticsService.recordCounsellorAdvisory(req.user.id, body);
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
  async getCourseOBEAttainment(@Request() req, @Param('courseId') courseId: string) {
    if (req.user?.role === UserRole.FACULTY) {
      await this.analyticsService.assertFacultyAuthorizedForCourse(req.user.id, courseId);
    }
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

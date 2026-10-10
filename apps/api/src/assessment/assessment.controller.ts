import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AssessmentService, CreateAssessmentDto, UpdateAssessmentDto, SubmitAnswerDto } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, AssessmentStatus } from '@prisma/client';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  /**
   * Student: List available assessments for a course or all enrolled courses
   */
  @Get('student')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async getStudentAssessments(@Req() req: any, @Query('courseId') courseId?: string) {
    // Priority: studentId from JWT > studentProfile.id > userId
    const studentProfileId =
      req.user?.studentId ||
      req.user?.studentProfile?.id ||
      req.user?.id;

    let targetCourseId = courseId;
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId) {
      targetCourseId = req.user.courseId;
    }
    return this.assessmentService.getStudentAssessments(studentProfileId, targetCourseId, req.user?.role);
  }

  /**
   * Student: Start an assessment attempt
   */
  @Post(':id/start')
  @Roles(UserRole.STUDENT)
  async startAttempt(@Req() req: any, @Param('id') assessmentId: string) {
    const studentProfileId =
      req.user?.studentId ||
      req.user?.studentProfile?.id ||
      req.user?.id;
    return this.assessmentService.startAttempt(assessmentId, studentProfileId);
  }

  /**
   * Student: Submit an in-progress attempt
   */
  @Post('submissions/:id/submit')
  @Roles(UserRole.STUDENT)
  async submitAttempt(
    @Req() req: any,
    @Param('id') submissionId: string,
    @Body('answers') answers: SubmitAnswerDto[],
  ) {
    const studentProfileId =
      req.user?.studentId ||
      req.user?.studentProfile?.id ||
      req.user?.id;
    return this.assessmentService.submitAttempt(submissionId, studentProfileId, answers || []);
  }

  /**
   * Student: View graded results with explanations
   */
  @Get('submissions/:id/result')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async getSubmissionResult(@Req() req: any, @Param('id') submissionId: string) {
    const studentProfileId =
      req.user?.studentId ||
      req.user?.studentProfile?.id ||
      req.user?.id;
    return this.assessmentService.getSubmissionResult(submissionId, studentProfileId);
  }

  /**
   * Faculty: Create a new assessment
   */
  @Post()
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async createAssessment(@Req() req: any, @Body() dto: CreateAssessmentDto) {
    const facultyProfileId =
      req.user?.facultyId ||
      req.user?.facultyProfile?.id ||
      req.user?.id;
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId) {
      dto.courseId = req.user.courseId;
    }
    return this.assessmentService.createAssessment(facultyProfileId, dto);
  }

  /**
   * Faculty: Update status (publish/archive)
   */
  @Patch(':id/status')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async updateStatus(
    @Param('id') assessmentId: string,
    @Body('status') status: AssessmentStatus,
  ) {
    return this.assessmentService.updateStatus(assessmentId, status);
  }

  /**
   * Faculty: Update assessment configuration (time limit/duration, title, expiration, extend window)
   */
  @Patch(':id')
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async updateAssessment(
    @Req() req: any,
    @Param('id') assessmentId: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    const facultyProfileId =
      req.user?.facultyId ||
      req.user?.facultyProfile?.id ||
      req.user?.id;
    return this.assessmentService.updateAssessment(assessmentId, facultyProfileId, dto);
  }

  /**
   * Faculty: View assessment cohort analytics and score distribution
   */
  @Get(':id/analytics')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getFacultyAnalytics(@Param('id') assessmentId: string) {
    return this.assessmentService.getFacultyAnalytics(assessmentId);
  }

  /**
   * Student & Faculty: View dynamic assessment leaderboard sorted by score & time
   */
  @Get(':id/leaderboard')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getAssessmentLeaderboard(@Req() req: any, @Param('id') assessmentId: string) {
    const studentProfileId =
      req.user?.studentId ||
      req.user?.studentProfile?.id ||
      req.user?.id;
    return this.assessmentService.getAssessmentLeaderboard(assessmentId, studentProfileId);
  }
}


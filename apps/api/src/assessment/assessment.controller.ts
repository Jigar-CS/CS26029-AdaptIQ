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
import { AssessmentService, CreateAssessmentDto, SubmitAnswerDto } from './assessment.service';
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
  @Roles(UserRole.STUDENT)
  async getStudentAssessments(@Req() req: any, @Query('courseId') courseId?: string) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.assessmentService.getStudentAssessments(studentProfileId, courseId);
  }

  /**
   * Student: Start an assessment attempt
   */
  @Post(':id/start')
  @Roles(UserRole.STUDENT)
  async startAttempt(@Req() req: any, @Param('id') assessmentId: string) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
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
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.assessmentService.submitAttempt(submissionId, studentProfileId, answers || []);
  }

  /**
   * Student: View graded results with explanations
   */
  @Get('submissions/:id/result')
  @Roles(UserRole.STUDENT, UserRole.FACULTY)
  async getSubmissionResult(@Req() req: any, @Param('id') submissionId: string) {
    const studentProfileId = req.user?.studentProfile?.id || req.user?.id;
    return this.assessmentService.getSubmissionResult(submissionId, studentProfileId);
  }

  /**
   * Faculty: Create a new assessment
   */
  @Post()
  @Roles(UserRole.FACULTY, UserRole.SUPER_ADMIN, UserRole.HOD)
  async createAssessment(@Req() req: any, @Body() dto: CreateAssessmentDto) {
    const facultyProfileId = req.user?.facultyProfile?.id || req.user?.id;
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
   * Faculty: View assessment cohort analytics and score distribution
   */
  @Get(':id/analytics')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getFacultyAnalytics(@Param('id') assessmentId: string) {
    return this.assessmentService.getFacultyAnalytics(assessmentId);
  }
}

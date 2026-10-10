import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ProctoringService, LogViolationDto } from './proctoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('proctoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}

  @Post('sessions/:submissionId/start')
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  async startOrGetSession(@Param('submissionId') submissionId: string, @Request() req) {
    const studentId = req.user.studentId || req.body?.studentId;
    return this.proctoringService.startOrGetSession(submissionId, studentId);
  }

  @Post('sessions/:id/enroll-face')
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  async verifyFaceEnrollment(@Param('id') id: string, @Body() body?: { snapshot?: string }) {
    return this.proctoringService.verifyFaceEnrollment(id, body?.snapshot);
  }

  @Post('sessions/:id/violation')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.SUPER_ADMIN)
  async logViolation(@Param('id') id: string, @Body() dto: LogViolationDto) {
    return this.proctoringService.logViolation(id, dto);
  }

  @Get('sessions/:id')
  async getSessionDetails(@Param('id') id: string) {
    return this.proctoringService.getSessionDetails(id);
  }

  @Get('invigilator/sessions')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getInvigilatorSessions() {
    return this.proctoringService.getInvigilatorSessions();
  }

  @Patch('invigilator/sessions/:id/review')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async submitInvigilatorReview(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVED' | 'FLAGGED' | 'INVALIDATED'; notes: string },
  ) {
    return this.proctoringService.submitInvigilatorReview(id, body.decision, body.notes);
  }
}

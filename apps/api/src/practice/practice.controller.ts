import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PracticeService } from './practice.service';
import { StartPracticeSessionDto, SubmitAttemptDto } from './dto/practice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

/** Resolves the studentProfileId from JWT payload consistently */
function resolveStudentId(req: any): string {
  return (
    req.user?.studentId ||
    req.user?.studentProfile?.id ||
    req.user?.id
  );
}

@Controller('practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class PracticeController {
  constructor(private practiceService: PracticeService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async startSession(@Request() req, @Body() dto: StartPracticeSessionDto) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.startSession(studentId, dto);
  }

  @Get('sessions/:id')
  async getSession(@Request() req, @Param('id') id: string) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.getSession(id, studentId);
  }

  @Get('sessions/:id/next-question')
  async getNextQuestion(@Request() req, @Param('id') id: string) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.getNextQuestion(id, studentId);
  }

  @Post('attempt')
  @HttpCode(HttpStatus.OK)
  async submitAttempt(@Request() req, @Body() dto: SubmitAttemptDto) {
    const studentId = resolveStudentId(req);
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.submitAttempt(studentId, dto);
  }
}

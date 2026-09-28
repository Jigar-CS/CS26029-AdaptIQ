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

@Controller('practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class PracticeController {
  constructor(private practiceService: PracticeService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async startSession(@Request() req, @Body() dto: StartPracticeSessionDto) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.startSession(req.user.studentId, dto);
  }

  @Get('sessions/:id')
  async getSession(@Request() req, @Param('id') id: string) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.getSession(id, req.user.studentId);
  }

  @Get('sessions/:id/next-question')
  async getNextQuestion(@Request() req, @Param('id') id: string) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.getNextQuestion(id, req.user.studentId);
  }

  @Post('attempt')
  @HttpCode(HttpStatus.OK)
  async submitAttempt(@Request() req, @Body() dto: SubmitAttemptDto) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.practiceService.submitAttempt(req.user.studentId, dto);
  }
}

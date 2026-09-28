import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SocraticTutorService } from './socratic-tutor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, SocraticActionType } from '@prisma/client';

export class SocraticRemediationDto {
  questionId: string;
  selectedOptionId: string;
}

export class SocraticActionDto {
  conversationId: string;
  actionType: SocraticActionType;
  userMessage?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private socraticTutorService: SocraticTutorService) {}

  @Post('socratic/remediation')
  @Roles(UserRole.STUDENT)
  async getSocraticRemediation(@Request() req, @Body() dto: SocraticRemediationDto) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    if (!dto.questionId || !dto.selectedOptionId) {
      throw new BadRequestException('questionId and selectedOptionId are required');
    }
    return this.socraticTutorService.generateSocraticRemediation(req.user.studentId, dto);
  }

  @Post('socratic/action')
  @Roles(UserRole.STUDENT)
  async handleSocraticAction(@Request() req, @Body() dto: SocraticActionDto) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    if (!dto.conversationId || !dto.actionType) {
      throw new BadRequestException('conversationId and actionType are required');
    }
    return this.socraticTutorService.handleSocraticAction(req.user.studentId, dto);
  }

  @Get('socratic/conversation/:conversationId')
  @Roles(UserRole.STUDENT)
  async getConversationHistory(@Request() req, @Param('conversationId') conversationId: string) {
    if (!req.user.studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.socraticTutorService.getConversationHistory(req.user.studentId, conversationId);
  }

  @Get('resources/topic/:topicId')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.SUPER_ADMIN)
  async getTopicResources(@Param('topicId') topicId: string) {
    return this.socraticTutorService.getCuratedTopicResources(topicId);
  }
}

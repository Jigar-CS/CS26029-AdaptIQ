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
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeAiInput } from '../common/sanitize.util';

export class SocraticRemediationDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  selectedOptionId: string;
}

export class SocraticActionDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  actionType: string;

  /** Free-text follow-up message from the student — sanitize for prompt injection */
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Follow-up message may not exceed 500 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeAiInput(value, 500) : value))
  userMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeAiInput(value, 500) : value))
  message?: string;
}

export class SocraticMessageDto {
  @IsString()
  @IsOptional()
  @MaxLength(40)
  actionType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeAiInput(value, 500) : value))
  userMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeAiInput(value, 500) : value))
  message?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private socraticTutorService: SocraticTutorService) {}

  @Post('socratic/remediation')
  @Roles(UserRole.STUDENT)
  async getSocraticRemediation(@Request() req, @Body() dto: SocraticRemediationDto) {
    const studentId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    if (!dto.questionId || !dto.selectedOptionId) {
      throw new BadRequestException('questionId and selectedOptionId are required');
    }
    return this.socraticTutorService.generateSocraticRemediation(studentId, dto);
  }

  @Post('socratic/action')
  @Roles(UserRole.STUDENT)
  async handleSocraticAction(@Request() req, @Body() dto: SocraticActionDto) {
    const studentId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    if (!dto.conversationId || !dto.actionType) {
      throw new BadRequestException('conversationId and actionType are required');
    }

    let parsedActionType = dto.actionType as SocraticActionType;
    if ((dto.actionType as string) === 'USER_QUESTION') {
      parsedActionType = SocraticActionType.ASK_FOLLOW_UP;
    }

    const res = await this.socraticTutorService.handleSocraticAction(studentId, {
      conversationId: dto.conversationId,
      actionType: parsedActionType,
      // userMessage is already sanitized by the @Transform decorator on the DTO
      userMessage: dto.userMessage || dto.message,
    });

    return {
      ...res,
      message: res.reply,
    };
  }

  @Post('socratic/conversations/:conversationId/message')
  @Roles(UserRole.STUDENT)
  async postConversationMessage(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() dto: SocraticMessageDto,
  ) {
    const studentId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }

    let parsedActionType =
      (dto.actionType as SocraticActionType) || SocraticActionType.ASK_FOLLOW_UP;
    if ((dto.actionType as string) === 'USER_QUESTION') {
      parsedActionType = SocraticActionType.ASK_FOLLOW_UP;
    }

    const res = await this.socraticTutorService.handleSocraticAction(studentId, {
      conversationId,
      actionType: parsedActionType,
      userMessage: dto.userMessage || dto.message,
    });

    return {
      ...res,
      message: res.reply,
    };
  }

  @Get('socratic/conversation/:conversationId')
  @Roles(UserRole.STUDENT)
  async getConversationHistory(@Request() req, @Param('conversationId') conversationId: string) {
    const studentId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.socraticTutorService.getConversationHistory(studentId, conversationId);
  }

  @Get('resources/topic/:topicId')
  @Roles(UserRole.STUDENT, UserRole.FACULTY, UserRole.SUPER_ADMIN)
  async getTopicResources(@Param('topicId') topicId: string) {
    return this.socraticTutorService.getCuratedTopicResources(topicId);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  AiAssessmentService,
  GenerateStagedRequestDto,
  EditStagedQuestionDto,
} from './ai-assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('ai-assessment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAssessmentController {
  constructor(private readonly aiAssessmentService: AiAssessmentService) {}

  /**
   * Faculty: Trigger AI generation of staged questions
   */
  @Post('generate')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async generateQuestions(@Req() req: any, @Body() dto: GenerateStagedRequestDto) {
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId) {
      dto.courseId = req.user.courseId;
    }
    return this.aiAssessmentService.generateStagedQuestions(dto);
  }

  /**
   * Faculty: List all staged questions awaiting human approval
   */
  @Get('staged')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async getStagedQuestions(
    @Req() req: any,
    @Query('topicId') topicId?: string,
    @Query('courseId') courseId?: string,
  ) {
    let effectiveCourseId = courseId;
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId) {
      effectiveCourseId = req.user.courseId;
    }
    return this.aiAssessmentService.getStagedQuestions(topicId, effectiveCourseId);
  }

  /**
   * Faculty: Edit question stem, options, or explanation before approving
   */
  @Put(':id/edit')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async editQuestion(@Param('id') id: string, @Body() dto: EditStagedQuestionDto) {
    return this.aiAssessmentService.editStagedQuestion(id, dto);
  }

  /**
   * Faculty: Approve question and publish directly into Course Question Bank
   */
  @Post(':id/approve')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async approveQuestion(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    return this.aiAssessmentService.approveQuestion(id, userId);
  }

  /**
   * Faculty: Reject question with academic feedback
   */
  @Post(':id/reject')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.SUPER_ADMIN)
  async rejectQuestion(
    @Req() req: any,
    @Param('id') id: string,
    @Body('feedback') feedback: string,
  ) {
    const userId = req.user?.id;
    return this.aiAssessmentService.rejectQuestion(id, userId, feedback || 'Does not meet departmental standards.');
  }
}

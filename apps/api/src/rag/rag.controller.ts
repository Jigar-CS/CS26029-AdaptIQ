import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  RagService,
  CreateDocumentDto,
  ExtractQuestionsDto,
  CreateAssessmentFromQuestionsDto,
  ExtractedQuestionItem,
} from './rag.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Get('courses/:courseId/documents')
  async getDocumentsByCourse(@Param('courseId') courseId: string) {
    return this.ragService.getDocumentsByCourse(courseId);
  }

  @Get('documents/:id')
  async getDocumentDetails(@Param('id') id: string) {
    return this.ragService.getDocumentDetails(id);
  }

  @Post('courses/:courseId/documents')
  @UseGuards(JwtAuthGuard)
  async ingestDocument(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    if (req.user?.role === 'FACULTY' && req.user?.courseId && courseId !== req.user.courseId) {
      throw new ForbiddenException('Faculty can only upload documents for their assigned subject.');
    }
    return this.ragService.ingestDocument(courseId, dto);
  }

  @Post('courses/:courseId/query')
  async queryCourseRag(
    @Param('courseId') courseId: string,
    @Body() body: { query: string; topK?: number },
  ) {
    return this.ragService.queryCourseRag(courseId, body.query, body.topK || 3);
  }

  @Post('courses/:courseId/grounded-quiz')
  @UseGuards(JwtAuthGuard)
  async generateGroundedQuiz(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body() body: { topic?: string; count?: number },
  ) {
    if (req.user?.role === 'FACULTY' && req.user?.courseId && courseId !== req.user.courseId) {
      throw new ForbiddenException('Faculty can only generate quizzes for their assigned subject.');
    }
    return this.ragService.generateGroundedQuiz(
      courseId,
      body.topic || 'General',
      body.count || 2,
    );
  }

  /**
   * Upload question PDF/document and extract structured questions
   */
  @Post('extract-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async extractQuestions(@Req() req: any, @Body() dto: ExtractQuestionsDto) {
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId && dto.courseId && dto.courseId !== req.user.courseId) {
      throw new ForbiddenException('Faculty can only extract questions for their assigned course.');
    }
    return this.ragService.extractQuestionsFromDocument(dto);
  }

  /**
   * Import extracted questions into a course question bank
   */
  @Post('courses/:courseId/import-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async importQuestions(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body('questions') questions: ExtractedQuestionItem[],
  ) {
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId && courseId !== req.user.courseId) {
      throw new ForbiddenException('Faculty can only import questions into their assigned course.');
    }
    const facultyId = req.user?.facultyId || req.user?.facultyProfile?.id || req.user?.id;
    return this.ragService.importQuestionsToCourse(courseId, questions || [], facultyId);
  }

  /**
   * Directly create an assessment with the extracted questions
   */
  @Post('courses/:courseId/create-assessment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async createAssessmentFromQuestions(
    @Req() req: any,
    @Param('courseId') courseId: string,
    @Body() dto: CreateAssessmentFromQuestionsDto,
  ) {
    if (req.user?.role === UserRole.FACULTY && req.user?.courseId && courseId !== req.user.courseId) {
      throw new ForbiddenException('Faculty can only author assessments for their assigned course.');
    }
    const facultyId = req.user?.facultyId || req.user?.facultyProfile?.id || req.user?.id;
    return this.ragService.createAssessmentFromExtractedQuestions(courseId, dto, facultyId);
  }
}

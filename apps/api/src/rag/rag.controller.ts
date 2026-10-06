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
import { RagService, CreateDocumentDto } from './rag.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentType } from '@prisma/client';

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
}

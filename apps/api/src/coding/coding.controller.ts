import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  CodingService,
  SubmitCodeDto,
  RunCodeDto,
  GenerateAiProblemDto,
  CreateCodingProblemDto,
} from './coding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { QuestionDifficulty } from '@prisma/client';

@Controller('coding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodingController {
  constructor(private readonly codingService: CodingService) {}

  @Get('problems')
  async getProblems(
    @Query('difficulty') difficulty?: QuestionDifficulty,
    @Query('courseId') courseId?: string,
  ) {
    return this.codingService.getProblems(difficulty, courseId);
  }

  @Post('problems')
  async createProblem(@Body() dto: CreateCodingProblemDto) {
    return this.codingService.createProblem(dto);
  }

  @Post('problems/generate-ai')
  async generateAiProblem(@Body() dto: GenerateAiProblemDto) {
    return this.codingService.generateAiProblem(dto);
  }

  @Post('problems/seed-curated')
  async seedCuratedProblems() {
    return this.codingService.seedCuratedProblems();
  }

  @Get('problems/:slug')
  async getProblemBySlug(@Param('slug') slug: string) {
    return this.codingService.getProblemBySlug(slug);
  }

  @Post('problems/:id/run')
  async runCode(@Param('id') id: string, @Body() dto: RunCodeDto) {
    return this.codingService.runCode(id, dto);
  }

  @Post('problems/:id/submit')
  async submitCode(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SubmitCodeDto,
  ) {
    const studentId = req.user.studentId || req.user.id;
    return this.codingService.submitCode(studentId, id, dto);
  }

  @Get('submissions')
  async getSubmissions(@Request() req, @Query('problemId') problemId?: string) {
    const studentId = req.user.studentId || req.user.id;
    return this.codingService.getStudentSubmissions(studentId, problemId);
  }
}

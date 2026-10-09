import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
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
import { sanitizeAiInput, sanitizeText } from '../common/sanitize.util';

const ALLOWED_DIFFICULTIES: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

@Controller('coding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodingController {
  constructor(private readonly codingService: CodingService) {}

  @Get('problems')
  async getProblems(
    @Query('difficulty') difficulty?: QuestionDifficulty,
    @Query('courseId') courseId?: string,
  ) {
    const safeDifficulty =
      difficulty && ALLOWED_DIFFICULTIES.includes(difficulty) ? difficulty : undefined;
    return this.codingService.getProblems(safeDifficulty, courseId);
  }

  @Post('problems')
  async createProblem(@Body() dto: CreateCodingProblemDto) {
    return this.codingService.createProblem(dto);
  }

  @Post('problems/generate-ai')
  async generateAiProblem(@Body() dto: GenerateAiProblemDto) {
    // Sanitize free-text fields before forwarding to the AI service
    const safeDto: GenerateAiProblemDto = {
      ...dto,
      topic: dto.topic ? sanitizeAiInput(dto.topic, 120) : undefined,
      customPrompt: dto.customPrompt ? sanitizeAiInput(dto.customPrompt, 500) : undefined,
      difficulty:
        dto.difficulty && ALLOWED_DIFFICULTIES.includes(dto.difficulty)
          ? dto.difficulty
          : undefined,
    };
    return this.codingService.generateAiProblem(safeDto);
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
    // Source code can be large — allow up to 64 KB
    if (dto.sourceCode && dto.sourceCode.length > 65536) {
      throw new BadRequestException('Source code exceeds the maximum allowed size (64 KB).');
    }
    return this.codingService.runCode(id, dto);
  }

  @Post('problems/:id/submit')
  async submitCode(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SubmitCodeDto,
  ) {
    if (dto.sourceCode && dto.sourceCode.length > 65536) {
      throw new BadRequestException('Source code exceeds the maximum allowed size (64 KB).');
    }
    const studentId = req.user?.studentId || req.user?.studentProfile?.id || req.user?.id;
    return this.codingService.submitCode(studentId, id, dto);
  }

  @Get('submissions')
  async getSubmissions(@Request() req, @Query('problemId') problemId?: string) {
    const studentId = req.user?.studentId || req.user?.studentProfile?.id || req.user?.id;
    return this.codingService.getStudentSubmissions(studentId, problemId);
  }
}

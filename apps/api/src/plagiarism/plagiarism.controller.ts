import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  PlagiarismService,
  StartScanDto,
  UpdateVerdictDto,
} from './plagiarism.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('plagiarism')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlagiarismController {
  constructor(private readonly plagiarismService: PlagiarismService) {}

  @Get('assessments')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getAssessments(@Request() req) {
    return this.plagiarismService.getCodingAssessments(req.user.id);
  }

  @Post('scan')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async startScan(@Request() req, @Body() dto: StartScanDto) {
    return this.plagiarismService.startScan(dto, req.user.id);
  }

  @Get('scans')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getScans(@Request() req, @Query('problemId') problemId?: string) {
    return this.plagiarismService.getScans(req.user.id, problemId);
  }

  @Get('scans/:id')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getScanDetails(@Request() req, @Param('id') id: string) {
    return this.plagiarismService.getScanDetails(id, req.user.id);
  }

  @Patch('matches/:id')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async updateMatchVerdict(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateVerdictDto,
  ) {
    return this.plagiarismService.updateMatchVerdict(id, req.user.id, dto);
  }
}

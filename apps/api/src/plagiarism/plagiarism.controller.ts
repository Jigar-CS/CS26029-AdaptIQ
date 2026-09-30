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

  @Post('scan')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async startScan(@Request() req, @Body() dto: StartScanDto) {
    const facultyId = req.user.facultyProfileId || req.user.id;
    return this.plagiarismService.startScan(dto, facultyId);
  }

  @Get('scans')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getScans(@Query('problemId') problemId?: string) {
    return this.plagiarismService.getScans(problemId);
  }

  @Get('scans/:id')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getScanDetails(@Param('id') id: string) {
    return this.plagiarismService.getScanDetails(id);
  }

  @Patch('matches/:id')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async updateMatchVerdict(
    @Param('id') id: string,
    @Body() dto: UpdateVerdictDto,
  ) {
    return this.plagiarismService.updateMatchVerdict(id, dto);
  }
}

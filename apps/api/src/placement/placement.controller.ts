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
import { PlacementService } from './placement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CareerRoleType, UserRole } from '@prisma/client';

export class SetTargetRoleDto {
  targetRole: CareerRoleType;
}

@Controller('placement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Get('benchmarks')
  async getBenchmarks() {
    return this.placementService.getBenchmarks();
  }

  @Get('benchmarks/:roleType')
  async getBenchmarkByRole(@Param('roleType') roleType: CareerRoleType) {
    return this.placementService.getBenchmarkByRole(roleType);
  }

  @Get('student/profile')
  async getStudentProfile(@Request() req) {
    const studentId = req.user.studentId || req.user.id;
    return this.placementService.getStudentProfile(studentId);
  }

  @Post('student/target-role')
  @Roles(UserRole.STUDENT, UserRole.SUPER_ADMIN)
  async setTargetRole(@Request() req, @Body() dto: SetTargetRoleDto) {
    const studentId = req.user.studentId || req.user.id;
    return this.placementService.setTargetRole(studentId, dto.targetRole);
  }

  @Get('student/gap-analysis')
  async getGapAnalysis(@Request() req, @Query('roleType') roleType?: CareerRoleType) {
    const studentId = req.user.studentId || req.user.id;
    return this.placementService.evaluateStudentReadiness(studentId, roleType);
  }

  @Get('mock-exams')
  async getMockExams(@Query('roleType') roleType?: CareerRoleType) {
    return this.placementService.getMockExams(roleType);
  }
}

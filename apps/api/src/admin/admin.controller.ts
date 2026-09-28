import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService, ParsedStudentRow } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Post('students/preview-csv')
  @HttpCode(HttpStatus.OK)
  async previewCsv(@Body('csvText') csvText: string) {
    return this.adminService.parseCsvText(csvText);
  }

  @Post('students/import')
  @HttpCode(HttpStatus.OK)
  async commitImport(@Body('rows') rows: ParsedStudentRow[]) {
    return this.adminService.commitImport(rows);
  }

  @Get('students')
  async getStudents(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuthorizedStudents({
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('students/sample-csv')
  getSampleCsv(@Res() res: Response) {
    const csv = this.adminService.getSampleCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clias_authorized_students_sample.csv"');
    return res.send(csv);
  }
}

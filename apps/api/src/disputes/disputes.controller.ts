import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/dispute.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  async submitDispute(@Req() req: any, @Body() dto: CreateDisputeDto) {
    const studentProfileId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentProfileId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.disputesService.createDispute(studentProfileId, dto);
  }

  @Get('my-disputes')
  @Roles(UserRole.STUDENT)
  async getMyDisputes(@Req() req: any) {
    const studentProfileId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentProfileId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.disputesService.getStudentDisputes(studentProfileId);
  }

  @Get('faculty-queue')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async getFacultyQueue() {
    return this.disputesService.getFacultyDisputesQueue();
  }

  @Post(':id/resolve')
  @Roles(UserRole.FACULTY, UserRole.HOD, UserRole.HEAD, UserRole.SUPER_ADMIN)
  async resolveDispute(
    @Req() req: any,
    @Param('id') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const facultyProfileId = req.user?.facultyId || req.user?.facultyProfile?.id;
    return this.disputesService.resolveDispute(facultyProfileId, disputeId, dto);
  }

  @Get('notifications')
  @Roles(UserRole.STUDENT)
  async getStudentNotifications(@Req() req: any) {
    const studentProfileId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentProfileId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.disputesService.getStudentNotifications(studentProfileId);
  }

  @Patch('notifications/:id/read')
  @Roles(UserRole.STUDENT)
  async markNotificationRead(@Req() req: any, @Param('id') notificationId: string) {
    const studentProfileId = req.user?.studentId || req.user?.studentProfile?.id;
    if (!studentProfileId) {
      throw new ForbiddenException('Authenticated user is not linked to a student profile');
    }
    return this.disputesService.markNotificationRead(studentProfileId, notificationId);
  }
}

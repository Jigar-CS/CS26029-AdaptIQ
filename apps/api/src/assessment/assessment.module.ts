import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { CompanionController } from './companion.controller';
import { CompanionSyncService } from './companion-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CodingModule } from '../coding/coding.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, CodingModule, AnalyticsModule],
  providers: [AssessmentService, CompanionSyncService],
  controllers: [AssessmentController, CompanionController],
  exports: [AssessmentService, CompanionSyncService],
})
export class AssessmentModule {}


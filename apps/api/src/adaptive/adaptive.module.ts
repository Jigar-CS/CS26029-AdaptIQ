import { Module } from '@nestjs/common';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { AdaptiveController } from './adaptive.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, AiModule, AnalyticsModule],
  providers: [AdaptiveLearningService],
  controllers: [AdaptiveController],
  exports: [AdaptiveLearningService],
})
export class AdaptiveModule {}


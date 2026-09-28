import { Module } from '@nestjs/common';
import { LearningAnalyticsService } from './learning-analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [LearningAnalyticsService],
  exports: [LearningAnalyticsService],
})
export class AnalyticsModule {}

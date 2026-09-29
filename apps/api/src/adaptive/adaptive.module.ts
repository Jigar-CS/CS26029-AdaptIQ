import { Module } from '@nestjs/common';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { AdaptiveController } from './adaptive.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdaptiveLearningService],
  controllers: [AdaptiveController],
  exports: [AdaptiveLearningService],
})
export class AdaptiveModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SocraticTutorService } from './socratic-tutor.service';
import { AiClientService } from './ai-client.service';
import { AiQuestionGeneratorService } from './ai-question-generator.service';
import { AiController } from './ai.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [SocraticTutorService, AiClientService, AiQuestionGeneratorService],
  exports: [SocraticTutorService, AiClientService, AiQuestionGeneratorService],
})
export class AiModule {}

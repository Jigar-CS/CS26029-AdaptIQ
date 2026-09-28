import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SocraticTutorService } from './socratic-tutor.service';
import { AiClientService } from './ai-client.service';
import { AiController } from './ai.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [SocraticTutorService, AiClientService],
  exports: [SocraticTutorService, AiClientService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SocraticTutorService } from './socratic-tutor.service';
import { AiController } from './ai.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [SocraticTutorService],
  exports: [SocraticTutorService],
})
export class AiModule {}

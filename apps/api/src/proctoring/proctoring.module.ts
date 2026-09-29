import { Module } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import { ProctoringController } from './proctoring.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProctoringController],
  providers: [ProctoringService],
  exports: [ProctoringService],
})
export class ProctoringModule {}

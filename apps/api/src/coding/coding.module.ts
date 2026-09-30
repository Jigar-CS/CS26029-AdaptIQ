import { Module } from '@nestjs/common';
import { CodingService } from './coding.service';
import { CodingController } from './coding.controller';
import { CodeRunnerService } from './code-runner.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CodingController],
  providers: [CodingService, CodeRunnerService],
  exports: [CodingService, CodeRunnerService],
})
export class CodingModule {}

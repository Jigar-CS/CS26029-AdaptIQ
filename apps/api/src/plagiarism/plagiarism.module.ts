import { Module } from '@nestjs/common';
import { PlagiarismService } from './plagiarism.service';
import { PlagiarismController } from './plagiarism.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlagiarismController],
  providers: [PlagiarismService],
  exports: [PlagiarismService],
})
export class PlagiarismModule {}

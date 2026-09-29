import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CoursesModule } from './courses/courses.module';
import { PracticeModule } from './practice/practice.module';
import { AiModule } from './ai/ai.module';
import { AdaptiveModule } from './adaptive/adaptive.module';
import { AssessmentModule } from './assessment/assessment.module';
import { AiAssessmentModule } from './ai-assessment/ai-assessment.module';
import { RagModule } from './rag/rag.module';
import { ProctoringModule } from './proctoring/proctoring.module';
import { PlacementModule } from './placement/placement.module';
import { CodingModule } from './coding/coding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    AdminModule,
    AnalyticsModule,
    CoursesModule,
    PracticeModule,
    AiModule,
    AdaptiveModule,
    AssessmentModule,
    AiAssessmentModule,
    RagModule,
    ProctoringModule,
    PlacementModule,
    CodingModule,
  ],
})
export class AppModule {}




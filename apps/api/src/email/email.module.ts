import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevelopmentEmailService, NodemailerEmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'EmailService',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const driver = (configService.get<string>('EMAIL_SERVICE_DRIVER') || 'development').toLowerCase();
        if (driver === 'smtp' || driver === 'production') {
          return new NodemailerEmailService(configService);
        }
        return new DevelopmentEmailService();
      },
    },
  ],
  exports: ['EmailService'],
})
export class EmailModule {}

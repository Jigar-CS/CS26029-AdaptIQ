import { Module } from '@nestjs/common';
import { DevelopmentEmailService, ProductionEmailService } from './email.service';

@Module({
  providers: [
    {
      provide: 'EmailService',
      useFactory: () => {
        return process.env.NODE_ENV === 'production' && process.env.EMAIL_SERVICE_DRIVER === 'production'
          ? new ProductionEmailService(null as any)
          : new DevelopmentEmailService();
      },
    },
  ],
  exports: ['EmailService'],
})
export class EmailModule {}

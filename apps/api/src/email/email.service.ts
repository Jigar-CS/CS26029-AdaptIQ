import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailService {
  sendOtp(toEmail: string, otp: string, studentName?: string): Promise<boolean>;
  sendWelcome(toEmail: string, studentName: string): Promise<boolean>;
}

@Injectable()
export class DevelopmentEmailService implements EmailService {
  private readonly logger = new Logger('DevelopmentEmailService');

  async sendOtp(toEmail: string, otp: string, studentName: string = 'Student'): Promise<boolean> {
    this.logger.log('======================================================================');
    this.logger.log(`📧 [DEVELOPMENT EMAIL DISPATCH] To: ${toEmail}`);
    this.logger.log(`👤 Recipient: ${studentName}`);
    this.logger.log(`🔑 Verification OTP: >>> ${otp} <<< (Valid for 10 minutes)`);
    this.logger.log('======================================================================');
    return true;
  }

  async sendWelcome(toEmail: string, studentName: string): Promise<boolean> {
    this.logger.log(`📧 Welcome email dispatched to ${studentName} (${toEmail})`);
    return true;
  }
}

@Injectable()
export class ProductionEmailService implements EmailService {
  private readonly logger = new Logger('ProductionEmailService');

  constructor(private configService: ConfigService) {}

  async sendOtp(toEmail: string, otp: string, studentName: string = 'Student'): Promise<boolean> {
    // In production, integrate with nodemailer, AWS SES, Resend, or SendGrid
    this.logger.log(`[PROD] Dispatching verification OTP to ${toEmail}`);
    return true;
  }

  async sendWelcome(toEmail: string, studentName: string): Promise<boolean> {
    this.logger.log(`[PROD] Dispatching onboarding welcome email to ${toEmail}`);
    return true;
  }
}

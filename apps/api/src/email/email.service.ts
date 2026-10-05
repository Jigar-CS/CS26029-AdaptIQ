import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
    this.logger.log('💡 Note: Set EMAIL_SERVICE_DRIVER=smtp in apps/api/.env to send real emails via Gmail/SMTP.');
    this.logger.log('======================================================================');
    return true;
  }

  async sendWelcome(toEmail: string, studentName: string): Promise<boolean> {
    this.logger.log(`📧 [DEVELOPMENT] Welcome email dispatched to ${studentName} (${toEmail})`);
    return true;
  }
}

@Injectable()
export class NodemailerEmailService implements EmailService {
  private readonly logger = new Logger('NodemailerEmailService');
  private transporter: nodemailer.Transporter;
  private readonly universityName: string;
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    this.universityName = this.configService.get<string>('UNIVERSITY_NAME') || 'CHARUSAT';
    
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.configService.get<number>('SMTP_PORT') || 587);
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ||
      (user ? `"CLIAS ${this.universityName}" <${user}>` : `no-reply@${this.universityName.toLowerCase()}.edu.in`);

    if (!user || !pass) {
      this.logger.warn(
        '⚠️ SMTP_USER or SMTP_PASS is missing in environment variables. Real email dispatch may fail.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false, // Prevents self-signed / local TLS certificate errors
      },
    });

    this.logger.log(
      `📧 Nodemailer transporter initialized for host: ${host}:${port} (SSL/TLS: ${secure ? 'Yes' : 'No'}, Sender: ${this.fromAddress})`,
    );
  }

  /**
   * Generates a modern, responsive HTML email with CHARUSAT & CLIAS branding
   */
  private generateOtpHtml(studentName: string, otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CLIAS Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);">
          
          <!-- Header with Gradient Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background: rgba(255, 255, 255, 0.15); display: inline-block; padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px; backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2);">
                      <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                        CHARUSAT UNIVERSITY
                      </span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                      CLIAS Platform
                    </h1>
                    <p style="color: #e0e7ff; font-size: 14px; margin: 0; font-weight: 500;">
                      Official Account Verification
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 32px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #f8fafc;">
                Hello <strong>${studentName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                We received a request to verify your official Charusat email address for registration on the <strong>CLIAS Learning & Assessment Platform</strong>.
              </p>

              <!-- OTP Display Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #0f172a; border-radius: 12px; padding: 24px; border: 2px dashed #6366f1;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; font-weight: 700;">
                      Your One-Time Verification Code
                    </p>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4); margin: 8px 0;">
                      ${otp}
                    </div>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">
                      ⏱️ Valid for <strong>10 minutes</strong> only
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.5;">
                  <strong>Security Note:</strong> Never share this OTP with anyone. University staff or CLIAS administrators will never ask for your verification code.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not request this registration, please disregard this email or report it to your department administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-weight: 600;">
                Charotar University of Science and Technology (CHARUSAT)
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                Changa - 388421, Dist. Anand, Gujarat, India • CLIAS Automated Security Dispatch
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  async sendOtp(toEmail: string, otp: string, studentName: string = 'Student'): Promise<boolean> {
    try {
      this.logger.log(`📤 Sending OTP verification email to: ${toEmail} (${studentName})`);

      const html = this.generateOtpHtml(studentName, otp);
      const text = `Hello ${studentName},\n\nYour CLIAS verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nCHARUSAT University - CLIAS Platform`;

      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: toEmail,
        subject: `${otp} is your CLIAS verification code — CHARUSAT`,
        text,
        html,
      });

      this.logger.log(`✅ Email sent successfully! MessageId: ${info.messageId} to ${toEmail}`);
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Failed to send OTP email to ${toEmail}: ${error.message}`);
      this.logger.error(
        `💡 If using Gmail, ensure: 1) 2-Step Verification is ON, 2) You are using a 16-character App Password (not your normal password).`,
      );
      // Fallback: also log OTP to terminal so local testing is never blocked
      this.logger.warn(`🔑 [FALLBACK DEV OTP] >>> ${otp} <<< for ${toEmail}`);
      return false;
    }
  }

  async sendWelcome(toEmail: string, studentName: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: toEmail,
        subject: `Welcome to CLIAS, ${studentName}! 🎉`,
        html: `
          <div style="font-family: sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px; max-width: 560px; margin: auto;">
            <h2 style="color: #818cf8;">Welcome to CLIAS!</h2>
            <p>Hello <strong>${studentName}</strong>,</p>
            <p>Your university student account has been successfully verified and activated.</p>
            <p>You can now log in at <a href="http://localhost:3000/auth/login" style="color: #38bdf8;">CLIAS Login Portal</a> to start your learning journey.</p>
            <hr style="border-color: #334155; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">CHARUSAT • CLIAS Learning Intelligence System</p>
          </div>
        `,
      });
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not send welcome email: ${err.message}`);
      return false;
    }
  }
}

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
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
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
   * Generates a modern, responsive HTML email for OTP Verification with CHARUSAT & CLIAS branding
   */
  private generateOtpHtml(studentName: string, otp: string): string {
    const currentYear = new Date().getFullYear();
    const portalUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your CLIAS Verification Code — ${this.universityName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Preheader preview text in inbox -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Your one-time registration code is ${otp}. Valid for 10 minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 36px 28px 36px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%); text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- University Pill Badge -->
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 9999px; padding: 5px 16px; margin-bottom: 14px;">
                      <span style="color: #e0e7ff; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                        🏛️ ${this.universityName} UNIVERSITY
                      </span>
                    </div>

                    <!-- Platform Title -->
                    <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                      CLIAS <span style="color: #818cf8; font-weight: 400;">|</span> AdaptIQ
                    </h1>
                    <p style="color: #c7d2fe; font-size: 13px; margin: 0; font-weight: 500; letter-spacing: 0.3px;">
                      Intelligent Learning & Adaptive Assessment System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0; font-size: 17px; font-weight: 700; color: #0f172a;">
                Hello ${studentName || 'Scholar'},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.65;">
                Thank you for registering with <strong>CLIAS AdaptIQ</strong>. To verify your institutional email address and finalize your account setup, please use the one-time verification code below:
              </p>

              <!-- OTP Hero Container -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 28px 0;">
                <tr>
                  <td align="center" style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 14px; padding: 26px 20px; border: 2px solid #e0e7ff;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #4f46e5; font-weight: 800; margin-bottom: 12px;">
                      🔐 One-Time Verification Code
                    </div>

                    <!-- Monospace OTP Digits -->
                    <div style="display: inline-block; background-color: #ffffff; border: 1.5px solid #c7d2fe; border-radius: 10px; padding: 12px 28px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.08); margin-bottom: 14px;">
                      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #312e81; text-align: center; display: inline-block; padding-left: 10px;">
                        ${otp}
                      </span>
                    </div>

                    <!-- Expiration Notice Pill -->
                    <div>
                      <span style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 9999px;">
                        ⏱️ Valid for <strong>10 minutes</strong> only
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Registration Steps Guidance -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.8px;">
                  Quick Registration Steps
                </p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 5px 0; vertical-align: top; width: 26px;">
                      <span style="display: inline-block; width: 18px; height: 18px; background-color: #4f46e5; color: #ffffff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; border-radius: 50%;">1</span>
                    </td>
                    <td style="padding: 5px 0; vertical-align: middle; color: #475569; font-size: 13px;">
                      Enter the 6-digit code in the registration verification box.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; vertical-align: top; width: 26px;">
                      <span style="display: inline-block; width: 18px; height: 18px; background-color: #4f46e5; color: #ffffff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; border-radius: 50%;">2</span>
                    </td>
                    <td style="padding: 5px 0; vertical-align: middle; color: #475569; font-size: 13px;">
                      Set your secure password to complete profile activation.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; vertical-align: top; width: 26px;">
                      <span style="display: inline-block; width: 18px; height: 18px; background-color: #4f46e5; color: #ffffff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; border-radius: 50%;">3</span>
                    </td>
                    <td style="padding: 5px 0; vertical-align: middle; color: #475569; font-size: 13px;">
                      Access your personalized adaptive practice, assessments, and coding arena.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Security Warning Banner -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.5;">
                  <strong>🛡️ Security Advisory:</strong> Never share this code with anyone. University staff or system administrators will never ask for your verification code.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                If you did not request this registration code, you can safely disregard this email. Your email address remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #334155; font-weight: 700;">
                Charotar University of Science and Technology (${this.universityName})
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Changa - 388421, Dist. Anand, Gujarat, India • CLIAS Intelligent Learning Platform
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                <a href="${portalUrl}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">CLIAS Portal</a> • 
                <span style="color: #cbd5e1;">|</span> • 
                <a href="https://charusat.ac.in" style="color: #4f46e5; text-decoration: none; font-weight: 600;">CHARUSAT Website</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Generates a modern, responsive Welcome & Onboarding HTML email with CHARUSAT & CLIAS branding
   */
  private generateWelcomeHtml(studentName: string, toEmail: string): string {
    const currentYear = new Date().getFullYear();
    const portalUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${portalUrl}/auth/login`;

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to CLIAS AdaptIQ — ${this.universityName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Preheader preview text in inbox -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Your account is officially active! Welcome to CLIAS AdaptIQ at CHARUSAT.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #6366f1 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Header Banner -->
          <tr>
            <td style="padding: 34px 36px 30px 36px; background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #0f766e 100%); text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Status Badge -->
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; padding: 5px 16px; margin-bottom: 14px;">
                      <span style="color: #d1fae5; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                        ✅ ACCOUNT ACTIVATED
                      </span>
                    </div>

                    <!-- Celebration Header -->
                    <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">
                      Welcome to AdaptIQ! 🎉
                    </h1>
                    <p style="color: #a7f3d0; font-size: 13px; margin: 0; font-weight: 500;">
                      Charotar University of Science and Technology (${this.universityName})
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0; font-size: 17px; font-weight: 700; color: #0f172a;">
                Congratulations, ${studentName || 'Scholar'}!
              </p>
              
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.65;">
                Your university account has been successfully verified and registered. You are now equipped with full access to CHARUSAT's intelligent learning ecosystem designed to elevate your technical mastery.
              </p>

              <!-- Account Details Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #64748b; width: 40%;">Registered Email:</td>
                        <td style="padding: 4px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${toEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Institution:</td>
                        <td style="padding: 4px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${this.universityName} University</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Account Status:</td>
                        <td style="padding: 4px 0; font-size: 13px; color: #059669; font-weight: 700;">Active & Verified</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Feature Highlights Header -->
              <p style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.8px;">
                What You Can Explore Now
              </p>

              <!-- Feature Rows -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
                      <tr>
                        <td style="width: 36px; font-size: 20px; vertical-align: top; text-align: center;">🎯</td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Adaptive Practice Engine</div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Question sets that dynamically adjust difficulty to match your mastery level.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
                      <tr>
                        <td style="width: 36px; font-size: 20px; vertical-align: top; text-align: center;">💻</td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Algorithmic Coding Arena</div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Multi-language code execution with automated test case evaluation.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
                      <tr>
                        <td style="width: 36px; font-size: 20px; vertical-align: top; text-align: center;">🗺️</td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Cognitive Learning Paths</div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Master subject concepts step-by-step with prerequisite tracking.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
                      <tr>
                        <td style="width: 36px; font-size: 20px; vertical-align: top; text-align: center;">🏆</td>
                        <td style="padding-left: 10px;">
                          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Class Assessment Leaderboards</div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Instant performance analytics, ranking, and concept feedback.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.38); letter-spacing: 0.3px;">
                      Launch Learning Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Portal Link Fallback -->
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center;">
                Or copy and open this URL in your browser: <br/>
                <a href="${loginUrl}" style="color: #4f46e5; text-decoration: underline; word-break: break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #334155; font-weight: 700;">
                Charotar University of Science and Technology (${this.universityName})
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Changa - 388421, Dist. Anand, Gujarat, India • CLIAS Intelligent Learning Platform
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                <a href="${portalUrl}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">CLIAS Portal</a> • 
                <span style="color: #cbd5e1;">|</span> • 
                <a href="https://charusat.ac.in" style="color: #4f46e5; text-decoration: none; font-weight: 600;">CHARUSAT Website</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendOtp(toEmail: string, otp: string, studentName: string = 'Student'): Promise<boolean> {
    try {
      this.logger.log(`📤 Sending OTP verification email to: ${toEmail} (${studentName})`);

      const html = this.generateOtpHtml(studentName, otp);
      const text = `Hello ${studentName},\n\nYour ${this.universityName} CLIAS verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nCharotar University of Science and Technology (CHARUSAT) — CLIAS AdaptIQ`;

      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: toEmail,
        subject: `${otp} is your CLIAS verification code — ${this.universityName}`,
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
      const html = this.generateWelcomeHtml(studentName, toEmail);
      const portalUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const text = `Welcome to AdaptIQ, ${studentName}!\n\nYour institutional account at ${this.universityName} has been verified and activated.\n\nYou can log in now at: ${portalUrl}/auth/login\n\nCHARUSAT • CLIAS Learning Intelligence System`;

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: toEmail,
        subject: `Welcome to CLIAS AdaptIQ, ${studentName}! 🎓`,
        text,
        html,
      });
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not send welcome email: ${err.message}`);
      return false;
    }
  }
}

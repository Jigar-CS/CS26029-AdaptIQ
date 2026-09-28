import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto, RegisterStudentDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
  lastRequestedAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private readonly allowedDomain = process.env.UNIVERSITY_EMAIL_DOMAIN || 'charusat.edu.in';
  private otpStore = new Map<string, OtpRecord>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('EmailService') private emailService: EmailService,
  ) {}

  private validateEmailDomain(email: string) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || domain !== this.allowedDomain.toLowerCase()) {
      throw new BadRequestException(
        `Registration requires an official university email ending in @${this.allowedDomain}`,
      );
    }
  }

  async requestOtp(dto: RequestOtpDto) {
    const email = dto.email.trim().toLowerCase();
    this.validateEmailDomain(email);

    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('An active account already exists for this email. Please log in.');
    }

    // 2. Check authorized students table
    const authorized = await this.prisma.authorizedStudent.findUnique({
      where: { email },
    });
    if (!authorized) {
      throw new NotFoundException(
        'Your university record has not been added to the platform. Contact your administrator.',
      );
    }

    // 3. Rate limiting check (max 1 request every 30 seconds)
    const existingOtp = this.otpStore.get(email);
    const now = Date.now();
    if (existingOtp && now - existingOtp.lastRequestedAt < 30 * 1000) {
      const waitSec = Math.ceil((30 * 1000 - (now - existingOtp.lastRequestedAt)) / 1000);
      throw new BadRequestException(`Please wait ${waitSec}s before requesting another verification code.`);
    }

    // 4. Generate high-entropy 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    this.otpStore.set(email, {
      code: otp,
      expiresAt,
      attemptsRemaining: 3,
      lastRequestedAt: now,
    });

    // 5. Send OTP via email service
    await this.emailService.sendOtp(email, otp, authorized.name);

    return {
      success: true,
      message: `A verification code has been dispatched to ${email}.`,
      expiresInMinutes: 10,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const record = this.otpStore.get(email);

    if (!record) {
      throw new BadRequestException('No verification request found for this email. Please request a code.');
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (record.attemptsRemaining <= 0) {
      this.otpStore.delete(email);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    if (record.code !== dto.otp.trim()) {
      record.attemptsRemaining -= 1;
      throw new BadRequestException(
        `Invalid verification code. Attempts remaining: ${record.attemptsRemaining}`,
      );
    }

    // Fetch authorized student details to display to student
    const authorized = await this.prisma.authorizedStudent.findUnique({
      where: { email },
    });

    if (!authorized) {
      throw new NotFoundException('University student record not found.');
    }

    return {
      success: true,
      message: 'Code verified successfully.',
      student: {
        enrollmentNumber: authorized.enrollmentNumber,
        name: authorized.name,
        email: authorized.email,
        institute: authorized.institute,
        department: authorized.department,
        program: authorized.programName,
        semester: authorized.semester,
        division: authorized.division,
      },
    };
  }

  async registerStudent(dto: RegisterStudentDto) {
    const email = dto.email.trim().toLowerCase();
    
    // Verify OTP one more time
    const verifyResult = await this.verifyOtp({ email, otp: dto.otp });
    const authorized = await this.prisma.authorizedStudent.findUnique({
      where: { email },
    });

    if (!authorized) {
      throw new NotFoundException('Authorized student record missing.');
    }

    // Hash password securely
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Atomically create User and StudentProfile
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.STUDENT,
          emailVerified: true,
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: newUser.id,
          authorizedStudentId: authorized.id,
        },
      });

      await tx.authorizedStudent.update({
        where: { id: authorized.id },
        data: {
          activated: true,
          userId: newUser.id,
        },
      });

      return {
        ...newUser,
        studentProfile: profile,
      };
    });

    // Clear OTP after successful registration
    this.otpStore.delete(email);

    // Generate JWT
    const token = this.generateToken(user.id, user.email, user.role, user.studentProfile.id);

    return {
      success: true,
      message: 'Account successfully registered and activated.',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: authorized.name,
        enrollmentNumber: authorized.enrollmentNumber,
        studentId: user.studentProfile.id,
      },
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: {
          include: {
            authorizedStudent: true,
          },
        },
        facultyProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account has been deactivated. Contact an administrator.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const studentId = user.studentProfile?.id;
    const facultyId = user.facultyProfile?.id;
    const token = this.generateToken(user.id, user.email, user.role, studentId, facultyId);

    const displayName =
      user.studentProfile?.authorizedStudent?.name ||
      user.email.split('@')[0].toUpperCase();

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: displayName,
        studentId,
        facultyId,
        studentDetails: user.studentProfile?.authorizedStudent || null,
      },
    };
  }

  private generateToken(
    userId: string,
    email: string,
    role: UserRole,
    studentId?: string,
    facultyId?: string,
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
      studentId,
      facultyId,
    });
  }
}

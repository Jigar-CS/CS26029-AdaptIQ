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
import { UserRole, UserStatus } from '@prisma/client';
import { findBatchStudent, formatStudentName, getBatchStudentDivision } from './data/cse-batch-students';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
  lastRequestedAt: number;
  role: UserRole;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private otpStore = new Map<string, OtpRecord>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('EmailService') private emailService: EmailService,
  ) {}

  /**
   * Institutional Domain Validator:
   * 1. STUDENT role: Domain MUST be strictly 'charusat.edu.in' only.
   * 2. Non-STUDENT roles (Faculty, Counsellor, HOD, Head, Admin): Domain MUST be strictly 'charusat.ac.in'.
   * If the domain does not match, OTP cannot be dispatched and registration is blocked.
   */
  private validateEmailDomain(email: string, role: UserRole = UserRole.STUDENT) {
    const parts = email.split('@');
    if (parts.length !== 2) {
      throw new BadRequestException('Please provide a valid university email address format.');
    }
    const domain = parts[1].toLowerCase().trim();

    if (role === UserRole.STUDENT) {
      // REQUIREMENT: Student should be ONLY able to register through charusat.edu.in
      if (domain !== 'charusat.edu.in') {
        throw new BadRequestException(
          `Student registration strictly requires an official @charusat.edu.in email address. Verification OTP cannot be sent to @${domain}.`,
        );
      }
    } else {
      // REQUIREMENT: For all roles except student panel, domain MUST be strictly charusat.ac.in
      if (domain !== 'charusat.ac.in') {
        throw new BadRequestException(
          `Staff and Faculty registration requires an official @charusat.ac.in email address. Verification OTP cannot be sent to @${domain}.`,
        );
      }
    }
  }

  async requestOtp(dto: RequestOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role || UserRole.STUDENT;

    // Strict domain validation: for non-students, domain MUST be charusat.ac.in!
    this.validateEmailDomain(email, role);

    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('An active account already exists for this email. Please log in.');
    }

    let recipientName = '';

    if (role === UserRole.STUDENT) {
      // 2. Check preloaded CSE batch students list
      const batchStudent = findBatchStudent(email);

      let authorized = await this.prisma.authorizedStudent.findUnique({
        where: { email },
      });

      if (batchStudent) {
        if (!authorized) {
          // Check if record exists with this student's enrollmentNumber
          authorized = await this.prisma.authorizedStudent.findUnique({
            where: { enrollmentNumber: batchStudent.studentId },
          });

          if (authorized) {
            authorized = await this.prisma.authorizedStudent.update({
              where: { id: authorized.id },
              data: {
                email,
                name: formatStudentName(batchStudent.name),
                institute: batchStudent.institute,
                department: 'Computer Science & Engineering',
                programName: batchStudent.degree,
                semester: batchStudent.semester,
                division: getBatchStudentDivision(batchStudent.studentId),
                graduationYear: 2026,
              },
            });
          } else {
            authorized = await this.prisma.authorizedStudent.create({
              data: {
                enrollmentNumber: batchStudent.studentId,
                name: formatStudentName(batchStudent.name),
                email,
                institute: batchStudent.institute,
                department: 'Computer Science & Engineering',
                programName: batchStudent.degree,
                semester: batchStudent.semester,
                division: getBatchStudentDivision(batchStudent.studentId),
                graduationYear: 2026,
                activated: false,
              },
            });
          }
        } else {
          // Upgrade existing authorized record with exact roster data
          authorized = await this.prisma.authorizedStudent.update({
            where: { id: authorized.id },
            data: {
              enrollmentNumber: batchStudent.studentId,
              name: formatStudentName(batchStudent.name),
              institute: batchStudent.institute,
              department: 'Computer Science & Engineering',
              programName: batchStudent.degree,
              semester: batchStudent.semester,
              division: getBatchStudentDivision(batchStudent.studentId),
            },
          });
        }
      } else {
        // Fallback auto-provision for new Charusat students not matching the CSE batch roster
        if (!authorized) {
          const prefix = email.split('@')[0];
          const enrollmentNumber = prefix.toUpperCase();
          const name = prefix.includes('.')
            ? prefix
                .split('.')
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join(' ')
            : `Student ${enrollmentNumber}`;

          const existingByEnrollment = await this.prisma.authorizedStudent.findUnique({
            where: { enrollmentNumber },
          });

          if (existingByEnrollment) {
            authorized = await this.prisma.authorizedStudent.update({
              where: { id: existingByEnrollment.id },
              data: { email },
            });
          } else {
            authorized = await this.prisma.authorizedStudent.create({
              data: {
                enrollmentNumber,
                name,
                email,
                institute: 'CSPIT',
                department: 'Computer Engineering',
                programName: 'B.Tech Computer Engineering',
                semester: 4,
                division: 'CE-A',
                graduationYear: 2026,
                activated: false,
              },
            });
          }
        }
      }
      recipientName = authorized.name;
    } else {
      // For Faculty / Institutional Staff: format recipient name from email
      const prefix = email.split('@')[0];
      const cleanPrefix = prefix.split('.')[0];
      recipientName = cleanPrefix
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      if (role === UserRole.FACULTY) {
        recipientName = `Prof. ${recipientName}`;
      }
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
      role,
      displayName: recipientName,
    });

    this.logger.log(`🔑 Verification OTP for ${email}: ${otp}`);

    // 5. Send OTP via email service (only dispatched when domain check succeeds!)
    await this.emailService.sendOtp(email, otp, recipientName);

    return {
      success: true,
      message: `A verification code has been dispatched to ${email}.`,
      expiresInMinutes: 10,
      role,
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

    const role = dto.role || record.role || UserRole.STUDENT;

    if (role === UserRole.STUDENT) {
      // Fetch authorized student details to display to student
      let authorized = await this.prisma.authorizedStudent.findUnique({
        where: { email },
      });

      if (!authorized) {
        const batchStudent = findBatchStudent(email);
        if (batchStudent) {
          authorized = await this.prisma.authorizedStudent.findUnique({
            where: { enrollmentNumber: batchStudent.studentId },
          });
        }
      }

      if (!authorized) {
        throw new NotFoundException('University student record not found.');
      }

      return {
        success: true,
        message: 'Code verified successfully.',
        role,
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
    } else {
      // Non-student role verified
      return {
        success: true,
        message: 'Institutional verification code confirmed.',
        role,
        profile: {
          name: record.displayName,
          email,
          role,
          domain: 'charusat.ac.in',
        },
      };
    }
  }

  async registerStudent(dto: RegisterStudentDto) {
    const email = dto.email.trim().toLowerCase();
    const record = this.otpStore.get(email);
    const role = dto.role || record?.role || UserRole.STUDENT;

    // Re-verify strict domain requirements
    this.validateEmailDomain(email, role);

    // Verify OTP
    await this.verifyOtp({ email, otp: dto.otp, role });

    // Hash password securely
    const passwordHash = await bcrypt.hash(dto.password, 10);

    if (role === UserRole.STUDENT) {
      let authorized = await this.prisma.authorizedStudent.findUnique({
        where: { email },
      });

      if (!authorized) {
        const batchStudent = findBatchStudent(email);
        if (batchStudent) {
          authorized = await this.prisma.authorizedStudent.findUnique({
            where: { enrollmentNumber: batchStudent.studentId },
          });
          if (authorized) {
            authorized = await this.prisma.authorizedStudent.update({
              where: { id: authorized.id },
              data: { email },
            });
          }
        }
      }

      if (!authorized) {
        throw new NotFoundException('Authorized student record missing.');
      }

      // Atomically create User and StudentProfile
      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: UserRole.STUDENT,
            emailVerified: true,
            status: UserStatus.ACTIVE,
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

      // Also sync user_profiles record for seamless profile syncing
      try {
        await this.prisma.$executeRawUnsafe(
          `
          INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, specialization, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            fullName = VALUES(fullName),
            department = VALUES(department),
            designation = VALUES(designation),
            specialization = VALUES(specialization)
        `,
          user.id,
          authorized.name,
          authorized.department,
          'Student Scholar',
          `${authorized.institute} Campus`,
          authorized.programName,
        );
      } catch (e: any) {
        this.logger.warn(`Could not sync user_profiles record for student: ${e.message}`);
      }

      // Send welcome onboarding email asynchronously
      this.emailService.sendWelcome(email, authorized.name).catch((err) => {
        this.logger.warn(`Could not dispatch welcome email to ${email}: ${err.message}`);
      });

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
          studentDetails: authorized,
        },
      };
    } else {
      // Non-student role registration: Faculty, Counsellor, HOD, Head, Admin
      let department = await this.prisma.department.findFirst({
        where: { code: 'CSE' },
      });
      if (!department) {
        department = await this.prisma.department.findFirst();
      }

      // If registering as FACULTY, a teaching subject is strictly required
      let assignedCourse: any = null;
      if (role === UserRole.FACULTY) {
        if (!dto.courseId) {
          throw new BadRequestException(
            'Teaching subject is mandatory. Please select which subject you teach to register as faculty.',
          );
        }
        assignedCourse = await this.prisma.course.findUnique({
          where: { id: dto.courseId },
        });
        if (!assignedCourse) {
          throw new BadRequestException('Selected teaching subject does not exist in the curriculum.');
        }
      }

      const displayName = dto.fullName || record?.displayName || `Prof. ${email.split('@')[0]}`;
      const employeeCode = dto.employeeCode || `EMP_${Date.now().toString().slice(-6)}`;

      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role,
            emailVerified: true,
            status: UserStatus.ACTIVE,
          },
        });

        let facultyProfile = null;
        if (role === UserRole.FACULTY || role === UserRole.HOD) {
          facultyProfile = await tx.facultyProfile.create({
            data: {
              userId: newUser.id,
              employeeCode,
              departmentId: department?.id,
              courseId: assignedCourse ? assignedCourse.id : undefined,
            },
            include: {
              course: true,
            },
          });
        }

        return {
          ...newUser,
          facultyProfile,
        };
      });

      // Also create extended user_profiles record for seamless profile syncing
      try {
        await this.prisma.$executeRawUnsafe(
          `
          INSERT INTO user_profiles (userId, fullName, department, designation, officeLocation, specialization, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            fullName = VALUES(fullName),
            department = VALUES(department),
            designation = VALUES(designation),
            specialization = VALUES(specialization)
        `,
          user.id,
          displayName,
          department?.name || 'Computer Science and Engineering',
          role === UserRole.FACULTY ? 'Assistant Professor' : role,
          'CSPIT CSE Building',
          assignedCourse ? `${assignedCourse.code} - ${assignedCourse.name}` : 'Computer Science',
        );
      } catch (e) {
        this.logger.warn(`Could not sync user_profiles record: ${e.message}`);
      }

      this.otpStore.delete(email);

      this.emailService.sendWelcome(email, displayName).catch((err) => {
        this.logger.warn(`Could not dispatch welcome email to ${email}: ${err.message}`);
      });

      const token = this.generateToken(user.id, user.email, user.role, undefined, user.facultyProfile?.id);

      return {
        success: true,
        message: `${role} account successfully registered and activated.`,
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: displayName,
          facultyId: user.facultyProfile?.id,
          courseId: user.facultyProfile?.courseId,
          courseCode: assignedCourse?.code,
          courseName: assignedCourse?.name,
          assignedCourse: assignedCourse
            ? {
                id: assignedCourse.id,
                code: assignedCourse.code,
                name: assignedCourse.name,
                semester: assignedCourse.semester,
              }
            : null,
        },
      };
    }
  }

  async login(dto: LoginDto) {
    let email = dto.email.trim().toLowerCase();
    if (email === 'faculty@charusat.ac.in' || email === 'faculty@charusat.edu.in') {
      email = 'dharasolanki.cse@charusat.ac.in';
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: {
          include: {
            authorizedStudent: true,
          },
        },
        facultyProfile: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!user && (email === '24cs093@charusat.edu.in' || email === 'student@charusat.ac.in')) {
      user = await this.prisma.user.findUnique({
        where: { email: 'student@charusat.edu.in' },
        include: {
          studentProfile: {
            include: {
              authorizedStudent: true,
            },
          },
          facultyProfile: {
            include: {
              course: true,
            },
          },
        },
      });
    }

    if (!user && email === 'student@charusat.edu.in') {
      user = await this.prisma.user.findUnique({
        where: { email: '24cs093@charusat.edu.in' },
        include: {
          studentProfile: {
            include: {
              authorizedStudent: true,
            },
          },
          facultyProfile: {
            include: {
              course: true,
            },
          },
        },
      });
    }

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
    const assignedCourse = user.facultyProfile?.course;
    const token = this.generateToken(user.id, user.email, user.role, studentId, facultyId);

    let displayName = user.studentProfile?.authorizedStudent?.name;
    if (!displayName) {
      try {
        const profileRows: any[] = await this.prisma.$queryRawUnsafe(
          'SELECT fullName FROM user_profiles WHERE userId = ?',
          user.id,
        );
        if (profileRows && profileRows.length > 0 && profileRows[0].fullName) {
          displayName = profileRows[0].fullName;
        }
      } catch {}
    }
    if (!displayName) {
      displayName = user.email.split('@')[0].toUpperCase();
    }

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: displayName,
        studentId,
        facultyId,
        courseId: user.facultyProfile?.courseId,
        courseCode: assignedCourse?.code,
        courseName: assignedCourse?.name,
        assignedCourse: assignedCourse
          ? {
              id: assignedCourse.id,
              code: assignedCourse.code,
              name: assignedCourse.name,
              semester: assignedCourse.semester,
            }
          : null,
        studentDetails: user.studentProfile?.authorizedStudent || null,
      },
    };
  }

  async getAvailableCourses() {
    return this.prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        semester: true,
        department: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
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

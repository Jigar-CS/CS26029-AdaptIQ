import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CareerRoleType, UserRole } from '@prisma/client';
import { findBatchStudent, formatStudentName } from '../auth/data/cse-batch-students';
import {
  sanitizeText,
  sanitizeUrl,
  sanitizePhone,
  sanitizeSkills,
  sanitizeEnum,
  MAX_LENGTHS,
} from '../common/sanitize.util';

@Injectable()
export class ProfileService implements OnModuleInit {
  private readonly logger = new Logger('ProfileService');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Ensure the extended user_profiles table exists in MySQL without requiring complex Prisma migrations
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          userId VARCHAR(191) PRIMARY KEY,
          fullName VARCHAR(191),
          phoneNumber VARCHAR(50),
          avatarUrl VARCHAR(500),
          bio TEXT,
          department VARCHAR(191),
          designation VARCHAR(191),
          officeLocation VARCHAR(191),
          specialization TEXT,
          githubUrl VARCHAR(255),
          linkedinUrl VARCHAR(255),
          portfolioUrl VARCHAR(255),
          skills TEXT,
          preferences TEXT,
          createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      this.logger.log('User profiles table schema synchronized.');
    } catch (err: any) {
      this.logger.warn(`Could not verify user_profiles table: ${err.message}`);
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            authorizedStudent: true,
            placementProfile: true,
          },
        },
        facultyProfile: {
          include: {
            course: true,
          },
        },
        authorizedRecord: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // Attempt to read extended profile from user_profiles table
    let extended: any = null;
    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        'SELECT * FROM user_profiles WHERE userId = ? LIMIT 1',
        userId,
      );
      if (rows && rows.length > 0) {
        extended = rows[0];
      }
    } catch (err: any) {
      this.logger.debug(`Could not query extended user_profiles: ${err.message}`);
    }

    const authorized = user.studentProfile?.authorizedStudent || user.authorizedRecord;
    const faculty = user.facultyProfile;
    const placement = user.studentProfile?.placementProfile;

    // Check if student matches CSE batch roster
    const batchStudent = user.role === UserRole.STUDENT ? findBatchStudent(user.email) : undefined;
    if (batchStudent && authorized) {
      if (
        authorized.enrollmentNumber !== batchStudent.studentId ||
        authorized.name !== formatStudentName(batchStudent.name) ||
        authorized.semester !== batchStudent.semester ||
        authorized.programName !== batchStudent.degree
      ) {
        try {
          await this.prisma.authorizedStudent.update({
            where: { id: authorized.id },
            data: {
              enrollmentNumber: batchStudent.studentId,
              name: formatStudentName(batchStudent.name),
              institute: batchStudent.institute,
              department: 'Computer Science & Engineering',
              programName: batchStudent.degree,
              semester: batchStudent.semester,
              division: 'CSE',
            },
          });
          authorized.enrollmentNumber = batchStudent.studentId;
          authorized.name = formatStudentName(batchStudent.name);
          authorized.institute = batchStudent.institute;
          authorized.department = 'Computer Science & Engineering';
          authorized.programName = batchStudent.degree;
          authorized.semester = batchStudent.semester;
          authorized.division = 'CSE';
        } catch (err: any) {
          this.logger.warn(`Could not sync batch student to authorizedStudent: ${err.message}`);
        }
      }
    }

    const defaultDesignation =
      user.role === UserRole.SUPER_ADMIN
        ? 'Lead System Administrator'
        : user.role === UserRole.HEAD
        ? 'Institute Dean / Director'
        : user.role === UserRole.HOD
        ? 'Head of Department'
        : user.role === UserRole.COUNSELLOR
        ? 'Academic Mentor & Counsellor'
        : user.role === UserRole.FACULTY
        ? 'Assistant Professor'
        : 'Student Scholar';

    const defaultDepartment =
      (batchStudent ? 'Computer Science & Engineering' : null) ||
      authorized?.department ||
      faculty?.departmentId ||
      'Department of Computer Engineering';

    const defaultName =
      (batchStudent ? formatStudentName(batchStudent.name) : null) ||
      authorized?.name ||
      user.email
        .split('@')[0]
        .split('.')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

    let parsedSkills: string[] = [];
    if (extended?.skills) {
      try {
        parsedSkills = JSON.parse(extended.skills);
      } catch {
        parsedSkills = extended.skills.split(',').map((s: string) => s.trim());
      }
    } else if (user.role === UserRole.STUDENT) {
      parsedSkills = ['Data Structures', 'Algorithms', 'Python', 'Web Architecture'];
    } else {
      parsedSkills = ['Curriculum Design', 'Instructional Assessment', 'Educational Leadership'];
    }

    let parsedPreferences: Record<string, any> = {
      emailNotifications: true,
      systemAlerts: true,
      digestWeekly: true,
      darkModeSync: true,
    };
    if (extended?.preferences) {
      try {
        parsedPreferences = { ...parsedPreferences, ...JSON.parse(extended.preferences) };
      } catch {
        // use default
      }
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      name: extended?.fullName || defaultName,
      phoneNumber: extended?.phoneNumber || '',
      avatarUrl: extended?.avatarUrl || '',
      bio:
        extended?.bio ||
        (user.role === UserRole.STUDENT
          ? 'Enthusiastic engineering student focused on algorithmic mastery and full-stack software architecture.'
          : 'Dedicated academic faculty championing student-centered adaptive learning and outcomes assessment.'),
      department: extended?.department || defaultDepartment,
      designation: extended?.designation || defaultDesignation,
      officeLocation:
        extended?.officeLocation ||
        (user.role === UserRole.STUDENT ? 'Building 3 - Lab 402' : 'Faculty Tower - Room 314'),
      specialization:
        extended?.specialization ||
        (user.role === UserRole.STUDENT
          ? 'Full-Stack Engineering & AI Systems'
          : 'Advanced Algorithms, AI & Machine Learning'),
      githubUrl: extended?.githubUrl || '',
      linkedinUrl: extended?.linkedinUrl || '',
      portfolioUrl: extended?.portfolioUrl || '',
      skills: parsedSkills,
      preferences: parsedPreferences,
      // Role-specific embedded details
      studentDetails: authorized
        ? {
            enrollmentNumber: authorized.enrollmentNumber,
            institute: authorized.institute,
            department: authorized.department,
            programName: authorized.programName,
            semester: authorized.semester,
            division: authorized.division,
            graduationYear: authorized.graduationYear,
            activated: authorized.activated,
          }
        : null,
      placementDetails: placement
        ? {
            targetRole: placement.targetRole,
            overallReadinessScore: placement.overallReadinessScore,
            verifiedSkillsCount: placement.verifiedSkillsCount,
            skillGapsCount: placement.skillGapsCount,
            lastAssessedAt: placement.lastAssessedAt,
          }
        : null,
      facultyDetails: faculty
        ? {
            employeeCode: faculty.employeeCode || 'FAC-' + user.id.slice(0, 6).toUpperCase(),
            departmentId: faculty.departmentId || 'DEP-CE',
            courseId: faculty.courseId,
            assignedCourse: faculty.course
              ? {
                  id: faculty.course.id,
                  code: faculty.course.code,
                  name: faculty.course.name,
                  semester: faculty.course.semester,
                }
              : null,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            authorizedStudent: true,
          },
        },
        facultyProfile: true,
        authorizedRecord: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // ── Sanitize every user-supplied field before persistence ──────────────────
    const cleanName        = dto.name        ? sanitizeText(dto.name, MAX_LENGTHS.name) : undefined;
    const cleanPhone       = dto.phoneNumber ? sanitizePhone(dto.phoneNumber)           : undefined;
    const cleanBio         = dto.bio         ? sanitizeText(dto.bio, MAX_LENGTHS.bio)   : undefined;
    const cleanDept        = dto.department  ? sanitizeText(dto.department, MAX_LENGTHS.department) : undefined;
    const cleanDesig       = dto.designation ? sanitizeText(dto.designation, MAX_LENGTHS.name)      : undefined;
    const cleanOfficeLoc   = dto.officeLocation ? sanitizeText(dto.officeLocation, MAX_LENGTHS.officeLocation) : undefined;
    const cleanSpec        = dto.specialization ? sanitizeText(dto.specialization, MAX_LENGTHS.specialization) : undefined;
    const cleanGithub      = dto.githubUrl    ? sanitizeUrl(dto.githubUrl)    : undefined;
    const cleanLinkedin    = dto.linkedinUrl  ? sanitizeUrl(dto.linkedinUrl)  : undefined;
    const cleanPortfolio   = dto.portfolioUrl ? sanitizeUrl(dto.portfolioUrl) : undefined;
    const cleanDivision    = dto.division     ? sanitizeText(dto.division, MAX_LENGTHS.division)    : undefined;
    const cleanEmpCode     = dto.employeeCode ? sanitizeText(dto.employeeCode, MAX_LENGTHS.employeeCode) : undefined;
    const cleanTargetRole  = dto.targetRole   ? sanitizeText(dto.targetRole, 40) : undefined;

    // Validate URL fields — reject if protocol is not http/https
    if (dto.githubUrl && cleanGithub === null) {
      throw new BadRequestException('githubUrl must be a valid http/https URL.');
    }
    if (dto.linkedinUrl && cleanLinkedin === null) {
      throw new BadRequestException('linkedinUrl must be a valid http/https URL.');
    }
    if (dto.portfolioUrl && cleanPortfolio === null) {
      throw new BadRequestException('portfolioUrl must be a valid http/https URL.');
    }

    // Sanitize skills array
    const skillsInput = dto.skills as unknown;
    const rawSkills = Array.isArray(skillsInput)
      ? (skillsInput as string[])
      : typeof skillsInput === 'string'
      ? skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const cleanSkills = rawSkills ? sanitizeSkills(rawSkills) : undefined;

    const skillsJson = cleanSkills ? JSON.stringify(cleanSkills) : undefined;

    const preferencesJson = dto.preferences ? JSON.stringify(dto.preferences) : undefined;

    // 1. Upsert into user_profiles table — all values are sanitized above and
    //    passed as parameterized placeholders (?), preventing SQL injection.
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO user_profiles 
          (userId, fullName, phoneNumber, avatarUrl, bio, department, designation, officeLocation, specialization, githubUrl, linkedinUrl, portfolioUrl, skills, preferences, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
          fullName = COALESCE(?, fullName),
          phoneNumber = COALESCE(?, phoneNumber),
          avatarUrl = COALESCE(?, avatarUrl),
          bio = COALESCE(?, bio),
          department = COALESCE(?, department),
          designation = COALESCE(?, designation),
          officeLocation = COALESCE(?, officeLocation),
          specialization = COALESCE(?, specialization),
          githubUrl = COALESCE(?, githubUrl),
          linkedinUrl = COALESCE(?, linkedinUrl),
          portfolioUrl = COALESCE(?, portfolioUrl),
          skills = COALESCE(?, skills),
          preferences = COALESCE(?, preferences),
          updatedAt = NOW()`,
        userId,
        cleanName       ?? null,
        cleanPhone      ?? null,
        dto.avatarUrl   ?? null,
        cleanBio        ?? null,
        cleanDept       ?? null,
        cleanDesig      ?? null,
        cleanOfficeLoc  ?? null,
        cleanSpec       ?? null,
        cleanGithub     ?? null,
        cleanLinkedin   ?? null,
        cleanPortfolio  ?? null,
        skillsJson      ?? null,
        preferencesJson ?? null,
        // parameters for ON DUPLICATE KEY UPDATE:
        cleanName       ?? null,
        cleanPhone      ?? null,
        dto.avatarUrl   ?? null,
        cleanBio        ?? null,
        cleanDept       ?? null,
        cleanDesig      ?? null,
        cleanOfficeLoc  ?? null,
        cleanSpec       ?? null,
        cleanGithub     ?? null,
        cleanLinkedin   ?? null,
        cleanPortfolio  ?? null,
        skillsJson      ?? null,
        preferencesJson ?? null,
      );
    } catch (err: any) {
      this.logger.warn(`Could not save into user_profiles: ${err.message}`);
    }

    // 2. Synchronize with AuthorizedStudent if student
    const authorized = user.studentProfile?.authorizedStudent || user.authorizedRecord;
    if (authorized) {
      const studentUpdates: any = {};
      if (cleanName)      studentUpdates.name     = cleanName;
      if (cleanDept)      studentUpdates.department = cleanDept;
      if (cleanDivision)  studentUpdates.division = cleanDivision;
      if (dto.semester !== undefined) studentUpdates.semester = Number(dto.semester);

      if (Object.keys(studentUpdates).length > 0) {
        await this.prisma.authorizedStudent.update({
          where: { id: authorized.id },
          data: studentUpdates,
        });
      }

      // If targetRole was provided and user is a student, update StudentPlacementProfile
      if (cleanTargetRole && user.studentProfile) {
        const validRoles = Object.values(CareerRoleType);
        if (validRoles.includes(cleanTargetRole as CareerRoleType)) {
          await this.prisma.studentPlacementProfile.upsert({
            where: { studentId: user.studentProfile.id },
            create: {
              studentId: user.studentProfile.id,
              targetRole: cleanTargetRole as CareerRoleType,
            },
            update: {
              targetRole: cleanTargetRole as CareerRoleType,
            },
          });
        }
      }
    }

    // 3. Synchronize with FacultyProfile if faculty
    if (user.facultyProfile) {
      const facultyUpdates: any = {};
      if (cleanEmpCode) facultyUpdates.employeeCode = cleanEmpCode;

      if (Object.keys(facultyUpdates).length > 0) {
        await this.prisma.facultyProfile.update({
          where: { id: user.facultyProfile.id },
          data: facultyUpdates,
        });
      }
    }

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password.');
    }

    if (dto.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return {
      success: true,
      message: 'Password changed successfully. Please keep your credentials secure.',
    };
  }

  async getRolesSummary() {
    const totalUsers = await this.prisma.user.count();
    const students = await this.prisma.user.count({ where: { role: UserRole.STUDENT } });
    const faculty = await this.prisma.user.count({ where: { role: UserRole.FACULTY } });
    const counsellors = await this.prisma.user.count({ where: { role: UserRole.COUNSELLOR } });
    const hods = await this.prisma.user.count({ where: { role: UserRole.HOD } });
    const heads = await this.prisma.user.count({ where: { role: UserRole.HEAD } });
    const admins = await this.prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } });

    return {
      totalUsers,
      breakdown: {
        STUDENT: students,
        FACULTY: faculty,
        COUNSELLOR: counsellors,
        HOD: hods,
        HEAD: heads,
        SUPER_ADMIN: admins,
      },
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodingService, CreateCodingProblemDto } from '../coding/coding.service';
import { CodeRunnerService } from '../coding/code-runner.service';
import { LearningAnalyticsService } from '../analytics/learning-analytics.service';
import { CompanionSyncService } from './companion-sync.service';
import { shuffleQuestionOptions, seededShuffle } from '../common/shuffle.util';
import {
  AssessmentStatus,
  AssessmentType,
  SubmissionStatus,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  ProgrammingLanguage,
  LearningHistoryReason,
  UserRole,
} from '@prisma/client';

export interface CreateDescriptiveQuestionDto {
  title?: string;
  prompt: string;
  rubric?: string;
  points?: number;
}

export interface GradeAnswerItemDto {
  questionId: string;
  pointsAwarded: number;
  feedback?: string;
}

export interface GradeSubmissionDto {
  answers: GradeAnswerItemDto[];
  overallFeedback?: string;
  status?: SubmissionStatus;
}

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  code: string;
  courseId: string;
  type?: AssessmentType;
  durationMinutes?: number;
  totalMarks?: number;
  passingMarks?: number;
  randomizeQuestions?: boolean;
  allowedAttempts?: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  division?: string;
  batch?: string;
  rollFilter?: string;
  questionIds?: string[];
  codingProblems?: CreateCodingProblemDto[];
  codingProblemIds?: string[];
  descriptiveQuestions?: CreateDescriptiveQuestionDto[];
  examMode?: 'OBJECTIVE' | 'CODING' | 'DESCRIPTIVE' | 'HYBRID';
  status?: AssessmentStatus;
}

export interface UpdateAssessmentDto {
  title?: string;
  description?: string;
  durationMinutes?: number;
  totalMarks?: number;
  passingMarks?: number;
  division?: string;
  batch?: string;
  rollFilter?: string;
  allowedAttempts?: number;
  scheduledStartTime?: string | Date;
  scheduledEndTime?: string | Date;
  status?: AssessmentStatus;
  reopen?: boolean;
  extendMinutes?: number;
  randomizeQuestions?: boolean;
}

export function isEnrollmentOddEvenMatch(enrollmentNumber?: string | null, rollFilter?: string | null): boolean {
  if (!rollFilter || rollFilter === 'ALL') return true;
  if (!enrollmentNumber) return true;
  const match = enrollmentNumber.match(/(\d+)$/);
  if (!match) return true;
  const num = parseInt(match[1], 10);
  if (isNaN(num)) return true;
  const isEven = num % 2 === 0;
  const normFilter = rollFilter.trim().toUpperCase();
  if (normFilter === 'ODD') return !isEven;
  if (normFilter === 'EVEN') return isEven;
  return true;
}

export function normalizeDivision(div?: string | null): string {
  if (!div) return 'ALL';
  const cleaned = div.trim().toUpperCase();
  if (['ALL', 'ALL DIVISIONS', 'BOTH', 'BOTH DIVISIONS'].includes(cleaned)) return 'ALL';
  if (['A', '1', 'DIV 1', 'DIV-1', 'DIV1', 'DIVISION 1', 'DIVISION A', 'DIV A', 'CS DIV 1', 'CS DIV-1', 'CS DIV1'].includes(cleaned)) return 'CS Div 1';
  if (['B', '2', 'DIV 2', 'DIV-2', 'DIV2', 'DIVISION 2', 'DIVISION B', 'DIV B', 'CS DIV 2', 'CS DIV-2', 'CS DIV2'].includes(cleaned)) return 'CS Div 2';
  return cleaned;
}

export function isDivisionCompatible(assessmentDiv?: string | null, studentDiv?: string | null): boolean {
  const normAssess = normalizeDivision(assessmentDiv);
  if (normAssess === 'ALL') return true;
  if (!studentDiv) return true;
  const normStudent = normalizeDivision(studentDiv);
  return normAssess === normStudent;
}

export function getAllowedAssessmentDivisions(studentDiv?: string | null): string[] {
  if (!studentDiv) return [];
  const norm = normalizeDivision(studentDiv);
  if (norm === 'CS Div 1') {
    return ['ALL', 'All Divisions', 'CS Div 1', 'DIV 1', 'A', '1', 'DIV-1', 'DIV1', 'DIVISION 1', 'DIVISION A', 'Division A', 'Division 1', 'DIV A'];
  }
  if (norm === 'CS Div 2') {
    return ['ALL', 'All Divisions', 'CS Div 2', 'DIV 2', 'B', '2', 'DIV-2', 'DIV2', 'DIVISION 2', 'DIVISION B', 'Division B', 'Division 2', 'DIV B'];
  }
  return ['ALL', studentDiv];
}

export function isAssessmentExpired(assessment: {
  status?: AssessmentStatus;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  durationMinutes?: number;
  createdAt?: Date;
}): boolean {
  if (assessment.status === AssessmentStatus.COMPLETED || assessment.status === AssessmentStatus.ARCHIVED) {
    return true;
  }
  if (assessment.status === AssessmentStatus.DRAFT) {
    return false;
  }
  const now = new Date();
  if (assessment.scheduledEndTime) {
    return now > new Date(assessment.scheduledEndTime);
  }
  const duration = assessment.durationMinutes || 30;
  const start = assessment.scheduledStartTime
    ? new Date(assessment.scheduledStartTime)
    : (assessment.createdAt ? new Date(assessment.createdAt) : now);
  const expiry = new Date(start.getTime() + (duration + 5) * 60 * 1000);
  return now > expiry;
}

export interface SubmitAnswerDto {
  questionId: string;
  selectedOptionId?: string;
  answerText?: string;
  sourceCode?: string;
  code?: string;
  language?: ProgrammingLanguage;
  timeSpentSeconds?: number;
}

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger('AssessmentService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly codingService: CodingService,
    private readonly codeRunner: CodeRunnerService,
    private readonly analyticsService: LearningAnalyticsService,
    private readonly companionSync: CompanionSyncService,
  ) {}

  /**
   * Faculty: Create a new course assessment with assigned questions and/or coding problems
   */
  async createAssessment(facultyProfileId: string, dto: CreateAssessmentDto) {
    // Verify if faculty is restricted to their assigned subject
    let targetCourseId = dto.courseId;

    const resolvedCourse = this.prisma.course?.findFirst
      ? await this.prisma.course.findFirst({
          where: {
            OR: [
              { id: dto.courseId },
              { code: dto.courseId },
              { code: dto.courseId?.toUpperCase() },
            ],
          },
        })
      : null;
    if (resolvedCourse) {
      targetCourseId = resolvedCourse.id;
    }

    let faculty = this.prisma.facultyProfile?.findFirst
      ? await this.prisma.facultyProfile.findFirst({
          where: {
            OR: [{ id: facultyProfileId }, { userId: facultyProfileId }],
          },
          include: { course: true },
        })
      : null;
    if (!faculty && this.prisma.facultyProfile?.findFirst) {
      faculty = await this.prisma.facultyProfile.findFirst({
        include: { course: true },
      });
    }
    const resolvedFacultyProfileId = faculty?.id || null;

    if (faculty) {
      const extraAssignments = ((await this.prisma.$queryRawUnsafe(
        'SELECT courseId FROM faculty_course_assignments WHERE facultyId = ? OR facultyId = ?',
        faculty.id,
        faculty.userId,
      ).catch(() => [])) as any[]) || [];
      const extraCourseIds = Array.isArray(extraAssignments) ? extraAssignments.map((a: any) => a.courseId) : [];
      const allowedCourseIds = Array.from(
        new Set([faculty.courseId, faculty.course?.code, ...extraCourseIds].filter(Boolean)),
      );

      if (allowedCourseIds.length > 0) {
        const reqCourseId = resolvedCourse?.id || dto.courseId;
        const reqCourseCode = resolvedCourse?.code;
        const isMatch =
          (reqCourseId && allowedCourseIds.includes(reqCourseId)) ||
          (reqCourseCode && allowedCourseIds.includes(reqCourseCode));

        if (dto.courseId && !isMatch) {
          throw new ForbiddenException(
            `Unauthorized: You can only create assessments for subjects you are assigned to teach.`,
          );
        }
        if (!targetCourseId) {
          targetCourseId = reqCourseId || faculty.courseId;
        }
      }
    }

    if (!targetCourseId) {
      throw new BadRequestException('Course ID is required.');
    }

    // Resolve combined question IDs from both question bank, authored/selected coding problems, and descriptive questions
    let combinedQuestionIds: string[] = [...(dto.questionIds || [])];
    const descriptivePointsMap = new Map<string, number>();

    // 0. Process custom-authored descriptive questions
    if (dto.descriptiveQuestions && dto.descriptiveQuestions.length > 0) {
      let topic = await this.prisma.topic.findFirst({
        where: { courseId: targetCourseId },
      });
      if (!topic) {
        topic = await this.prisma.topic.create({
          data: {
            name: 'Core Curriculum Concepts',
            slug: 'core-concepts',
            courseId: targetCourseId,
          },
        });
      }

      for (let i = 0; i < dto.descriptiveQuestions.length; i++) {
        const dq = dto.descriptiveQuestions[i];
        const title = dq.title || `Question ${i + 1}`;
        const rubricText = dq.rubric || 'Accuracy, technical depth, and clear conceptual explanation.';
        const fullText = `${title}\n\n${dq.prompt}\n\n[Marking Rubric: ${rubricText}]`;

        const createdQ = await this.prisma.question.create({
          data: {
            courseId: targetCourseId,
            topicId: topic.id,
            type: QuestionType.SHORT_ANSWER,
            difficulty: QuestionDifficulty.MEDIUM,
            questionText: fullText,
            explanation: rubricText,
            sourceType: 'FACULTY_AUTHORED',
            status: QuestionStatus.APPROVED,
          },
        });

        combinedQuestionIds.push(createdQ.id);
        if (dq.points && dq.points > 0) {
          descriptivePointsMap.set(createdQ.id, dq.points);
        }
      }
    }

    // 1. Process custom-authored coding problems with full problem statement, sample test cases, and hidden check cases
    if (dto.codingProblems && dto.codingProblems.length > 0) {
      for (const cp of dto.codingProblems) {
        const created = await this.codingService.createProblem(cp, targetCourseId);
        if (created.linkedQuestionId) {
          combinedQuestionIds.push(created.linkedQuestionId);
        }
      }
    }

    // 2. Process selected existing coding problems from CLIAS problem bank
    if (dto.codingProblemIds && dto.codingProblemIds.length > 0) {
      for (const cpid of dto.codingProblemIds) {
        const existingProb = await this.prisma.codingProblem.findUnique({
          where: { id: cpid },
          include: { testCases: true },
        });

        if (existingProb) {
          let existingQ = await this.prisma.question.findFirst({
            where: {
              courseId: targetCourseId,
              type: QuestionType.CODING,
              explanation: { contains: existingProb.id },
            },
          });

          if (!existingQ) {
            const topic = await this.prisma.topic.findFirst({
              where: { courseId: targetCourseId },
            });
            if (topic) {
              existingQ = await this.prisma.question.create({
                data: {
                  courseId: targetCourseId,
                  topicId: topic.id,
                  type: QuestionType.CODING,
                  difficulty: existingProb.difficulty,
                  questionText: existingProb.title,
                  explanation: JSON.stringify({
                    codingProblemId: existingProb.id,
                    slug: existingProb.slug,
                    description: existingProb.description,
                    constraints: existingProb.constraints,
                    hints: existingProb.hints,
                    starterCodes: existingProb.starterCodes,
                    sampleTestCases: existingProb.testCases.filter((c) => !c.isHidden),
                    testCasesToCheck: existingProb.testCases.filter((c) => c.isHidden),
                  }),
                  sourceType: 'CODING_BANK',
                  status: 'APPROVED',
                },
              });
            }
          }

          if (existingQ) {
            combinedQuestionIds.push(existingQ.id);
          }
        }
      }
    }

    // Deduplicate question IDs
    combinedQuestionIds = Array.from(new Set(combinedQuestionIds));

    if (combinedQuestionIds.length === 0) {
      throw new BadRequestException('At least one question or coding problem must be selected for the assessment.');
    }

    // Verify all selected questions exist in the database and belong to the subject
    const existingDbQuestions = await this.prisma.question.findMany({
      where: {
        id: { in: combinedQuestionIds },
      },
      select: {
        id: true,
        courseId: true,
        topic: { select: { courseId: true } },
      },
    });

    if (existingDbQuestions.length === 0) {
      throw new BadRequestException('Selected questions could not be found in the question bank.');
    }

    // Filter to questions that belong to this course (or topic of this course)
    const validQuestions = existingDbQuestions.filter(
      (q) => q.courseId === targetCourseId || q.topic?.courseId === targetCourseId,
    );

    const questionIdsToUse = validQuestions.length > 0
      ? validQuestions.map((q) => q.id)
      : existingDbQuestions.map((q) => q.id);

    const totalQuestions = questionIdsToUse.length;
    const totalMarks = Number(dto.totalMarks) > 0 ? Number(dto.totalMarks) : 100.0;
    const pointsPerQuestion = Number((totalMarks / totalQuestions).toFixed(2));
    const targetDivision = dto.division || 'ALL';

    const finalTitle = dto.examMode === 'CODING' && !dto.title.includes('Coding') && !dto.title.includes('💻')
      ? `💻 ${dto.title} [CODING]`
      : dto.examMode === 'DESCRIPTIVE' && !dto.title.includes('Descriptive') && !dto.title.includes('📝')
      ? `📝 ${dto.title} [DESCRIPTIVE]`
      : dto.title;

    const durationMinutes = Number(dto.durationMinutes) > 0 ? Number(dto.durationMinutes) : 30;
    const now = new Date();
    const isDraft = (dto.status || AssessmentStatus.DRAFT) === AssessmentStatus.DRAFT;

    let scheduledStartTime: Date | null = null;
    if (dto.scheduledStartTime && !isNaN(new Date(dto.scheduledStartTime).getTime())) {
      scheduledStartTime = new Date(dto.scheduledStartTime);
    } else if (!isDraft) {
      scheduledStartTime = now;
    }

    let scheduledEndTime: Date | null = null;
    if (dto.scheduledEndTime && !isNaN(new Date(dto.scheduledEndTime).getTime())) {
      scheduledEndTime = new Date(dto.scheduledEndTime);
    } else if (!isDraft) {
      scheduledEndTime = new Date((scheduledStartTime || now).getTime() + (durationMinutes + 5) * 60 * 1000);
    }

    // Auto-disambiguate assessment code so duplicate entries never crash with 500
    let finalCode = (dto.code || '').trim();
    if (!finalCode) {
      finalCode = `ASM-${resolvedCourse?.code || 'EXAM'}-${Date.now().toString().slice(-4)}`;
    }

    const existingCodeCheck = await this.prisma.assessment.findUnique({
      where: { code: finalCode },
    });
    if (existingCodeCheck) {
      let suffix = 1;
      let candidateCode = `${finalCode}-${suffix}`;
      while (await this.prisma.assessment.findUnique({ where: { code: candidateCode } })) {
        suffix++;
        candidateCode = `${finalCode}-${suffix}`;
      }
      finalCode = candidateCode;
    }

    try {
      const assessment = await this.prisma.assessment.create({
        data: {
          title: finalTitle,
          description:
            dto.description ||
            (dto.examMode === 'CODING'
              ? 'Automated In-Browser Coding Assessment'
              : dto.examMode === 'DESCRIPTIVE'
              ? 'Continuous Ruled Digital Ink Descriptive Examination'
              : null),
          code: finalCode,
          courseId: targetCourseId,
          facultyId: resolvedFacultyProfileId,
          type: dto.type || AssessmentType.QUIZ,
          status: dto.status || AssessmentStatus.DRAFT,
          division: targetDivision,
          batch: dto.batch || 'ALL',
          rollFilter: (dto.rollFilter || 'ALL').toUpperCase(),
          durationMinutes,
          totalMarks,
          passingMarks: Number(dto.passingMarks) > 0 ? Number(dto.passingMarks) : 40.0,
          totalQuestions,
          randomizeQuestions: dto.randomizeQuestions !== false,
          allowedAttempts: Number(dto.allowedAttempts) > 0 ? Number(dto.allowedAttempts) : 2,
          scheduledStartTime,
          scheduledEndTime,
          questions: {
            create: questionIdsToUse.map((qId, idx) => ({
              questionId: qId,
              points: descriptivePointsMap.get(qId) || pointsPerQuestion,
              order: idx + 1,
            })),
          },
        } as any,
        include: {
          questions: {
            include: {
              question: true,
            },
          },
        },
      });

      // Notify all targeted students asynchronously only when published
      if (assessment.status === AssessmentStatus.PUBLISHED) {
        this.notifyAssignedStudents(assessment).catch((err: any) => {
          this.logger.warn(`Non-blocking notification error: ${err?.message || err}`);
        });
      }

      return assessment;
    } catch (err: any) {
      this.logger.error(`Assessment creation database error: ${err?.message || err}`, err?.stack);
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Assessment code "${finalCode}" is already in use. Please enter a different code.`,
        );
      }
      if (err?.code === 'P2003') {
        throw new BadRequestException(
          'Foreign key error: one of the selected question or course references is invalid.',
        );
      }
      throw new BadRequestException(err?.message || 'Failed to create assessment.');
    }
  }

  /**
   * Helper: Dispatches in-app notifications to students targeted by division
   */
  private async notifyAssignedStudents(assessment: any) {
    try {
      const targetDivision = assessment.division || 'ALL';
      const targetBatch = (assessment as any).batch || 'ALL';
      const targetRollFilter = ((assessment as any).rollFilter || 'ALL').toUpperCase();
      const norm = normalizeDivision(targetDivision);
      const conditions: any[] = [];

      if (norm !== 'ALL') {
        const allowed = norm === 'CS Div 1'
          ? ['CS Div 1', 'DIV 1', 'A', '1', 'Division A', 'Division 1', 'DIV A']
          : ['CS Div 2', 'DIV 2', 'B', '2', 'Division B', 'Division 2', 'DIV B'];
        conditions.push({
          authorizedStudent: {
            division: { in: allowed },
          },
        });
      }

      if (targetBatch && targetBatch !== 'ALL') {
        conditions.push({
          authorizedStudent: {
            enrollmentNumber: { startsWith: targetBatch },
          },
        });
      }

      const divisionFilter = conditions.length > 0 ? { AND: conditions } : {};

      const targetStudents = await this.prisma.studentProfile.findMany({
        where: divisionFilter,
        select: {
          id: true,
          authorizedStudent: { select: { enrollmentNumber: true } },
        },
        take: 500,
      });

      // Filter by odd / even roll numbers if specified
      let eligibleStudents = targetStudents;
      if (targetRollFilter && targetRollFilter !== 'ALL') {
        eligibleStudents = targetStudents.filter((s: any) =>
          isEnrollmentOddEvenMatch(s.authorizedStudent?.enrollmentNumber, targetRollFilter),
        );
      }

      if (eligibleStudents.length > 0) {
        const divisionLabel = norm === 'CS Div 1'
          ? 'Division A (DIV 1)'
          : norm === 'CS Div 2'
          ? 'Division B (DIV 2)'
          : 'All Divisions';
        const batchLabel = targetBatch && targetBatch !== 'ALL' ? `Batch '${targetBatch}` : 'All Batches';
        const rollLabel = targetRollFilter === 'ODD'
          ? ' • Odd IDs Only'
          : targetRollFilter === 'EVEN'
          ? ' • Even IDs Only'
          : '';

        await this.prisma.studentNotification.createMany({
          data: eligibleStudents.map((s) => ({
            studentId: s.id,
            title: `New Assessment Assigned: ${assessment.title}`,
            message: `A new ${assessment.type ? assessment.type.toString().toLowerCase() : 'assessment'} (${assessment.code}) has been allocated to ${batchLabel} (${divisionLabel}${rollLabel}). Duration: ${assessment.durationMinutes} mins.`,
            type: 'ASSESSMENT_ASSIGNED',
            metadata: JSON.stringify({
              assessmentId: assessment.id,
              division: targetDivision,
              batch: targetBatch,
              rollFilter: targetRollFilter,
            }),
          })),
        });
      }
    } catch (notifErr: any) {
      this.logger.warn(`Failed to dispatch student notifications for assessment ${assessment?.id}: ${notifErr?.message || notifErr}`);
    }
  }

  /**
   * Faculty: Publish or change status of assessment
   */
  async updateStatus(assessmentId: string, status: AssessmentStatus) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const data: any = { status };
    if (status === AssessmentStatus.PUBLISHED) {
      const now = new Date();
      // If activating a draft, or if previous schedule window is expired or null, activate window starting from now
      if (assessment.status === AssessmentStatus.DRAFT || isAssessmentExpired(assessment) || !assessment.scheduledEndTime) {
        data.scheduledStartTime = now;
        data.scheduledEndTime = new Date(now.getTime() + ((assessment.durationMinutes || 30) + 5) * 60 * 1000);
      }
    }

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data,
      include: { course: true },
    });

    if (status === AssessmentStatus.PUBLISHED && assessment.status !== AssessmentStatus.PUBLISHED) {
      this.notifyAssignedStudents(updated).catch((err: any) => {
        this.logger.warn(`Non-blocking notification error: ${err?.message || err}`);
      });
    }

    return updated;
  }

  /**
   * Faculty: Update assessment settings (time limit, title, status, extend window, etc.)
   */
  async updateAssessment(assessmentId: string, facultyProfileId: string, dto: UpdateAssessmentDto) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { course: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Permission check for faculty
    const faculty = facultyProfileId
      ? await this.prisma.facultyProfile.findFirst({
          where: {
            OR: [{ id: facultyProfileId }, { userId: facultyProfileId }],
          },
        })
      : null;

    if (faculty) {
      const extraAssignments = ((await this.prisma.$queryRawUnsafe(
        'SELECT courseId FROM faculty_course_assignments WHERE facultyId = ? OR facultyId = ?',
        faculty.id,
        faculty.userId,
      ).catch(() => [])) as any[]) || [];
      const extraCourseIds = Array.isArray(extraAssignments) ? extraAssignments.map((a: any) => a.courseId) : [];
      const allowedCourseIds = Array.from(
        new Set([faculty.courseId, ...extraCourseIds].filter(Boolean)),
      );

      if (allowedCourseIds.length > 0 && !allowedCourseIds.includes(assessment.courseId)) {
        throw new ForbiddenException('You can only modify assessments for your assigned courses.');
      }
    }

    const dataToUpdate: any = {};
    if (dto.title !== undefined) dataToUpdate.title = dto.title;
    if (dto.description !== undefined) dataToUpdate.description = dto.description;
    if (dto.totalMarks !== undefined) dataToUpdate.totalMarks = Number(dto.totalMarks);
    if (dto.passingMarks !== undefined) dataToUpdate.passingMarks = Number(dto.passingMarks);
    if (dto.division !== undefined) dataToUpdate.division = dto.division;
    if (dto.batch !== undefined) dataToUpdate.batch = dto.batch;
    if (dto.rollFilter !== undefined) dataToUpdate.rollFilter = dto.rollFilter.toUpperCase();
    if (dto.allowedAttempts !== undefined) dataToUpdate.allowedAttempts = Number(dto.allowedAttempts);
    if (dto.status !== undefined) dataToUpdate.status = dto.status;
    if (dto.randomizeQuestions !== undefined) dataToUpdate.randomizeQuestions = dto.randomizeQuestions;

    let newDuration = assessment.durationMinutes;
    if (dto.durationMinutes !== undefined && Number(dto.durationMinutes) > 0) {
      newDuration = Number(dto.durationMinutes);
      dataToUpdate.durationMinutes = newDuration;
    }

    const now = new Date();
    const isCurrentlyExpired = isAssessmentExpired(assessment);
    const becomingPublished = dto.status === AssessmentStatus.PUBLISHED && assessment.status !== AssessmentStatus.PUBLISHED;

    if (dto.scheduledEndTime) {
      dataToUpdate.scheduledEndTime = new Date(dto.scheduledEndTime);
      dataToUpdate.status = AssessmentStatus.PUBLISHED;
    } else if (dto.extendMinutes && Number(dto.extendMinutes) > 0) {
      const baseTime = assessment.scheduledEndTime && new Date(assessment.scheduledEndTime) > now
        ? new Date(assessment.scheduledEndTime)
        : now;
      dataToUpdate.scheduledEndTime = new Date(baseTime.getTime() + Number(dto.extendMinutes) * 60 * 1000);
      dataToUpdate.status = AssessmentStatus.PUBLISHED;
    } else if (dto.reopen || becomingPublished || (dto.status === AssessmentStatus.PUBLISHED && isCurrentlyExpired)) {
      dataToUpdate.scheduledStartTime = now;
      dataToUpdate.scheduledEndTime = new Date(now.getTime() + (newDuration + 5) * 60 * 1000);
      dataToUpdate.status = AssessmentStatus.PUBLISHED;
    } else if (dto.durationMinutes !== undefined) {
      if (isCurrentlyExpired) {
        // If it was expired and faculty edits duration, reopen from now for new duration + 5 mins
        dataToUpdate.scheduledStartTime = now;
        dataToUpdate.scheduledEndTime = new Date(now.getTime() + (newDuration + 5) * 60 * 1000);
        dataToUpdate.status = AssessmentStatus.PUBLISHED;
      } else {
        const start = assessment.scheduledStartTime
          ? new Date(assessment.scheduledStartTime)
          : new Date(assessment.createdAt);
        dataToUpdate.scheduledEndTime = new Date(start.getTime() + (newDuration + 5) * 60 * 1000);
      }
    }

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: dataToUpdate,
      include: {
        course: { select: { code: true, name: true } },
      },
    });

    if (becomingPublished) {
      this.notifyAssignedStudents(updated).catch((err: any) => {
        this.logger.warn(`Non-blocking notification error: ${err?.message || err}`);
      });
    }

    return updated;
  }

  /**
   * Student: Get available assessments with student attempt records
   */
  async getStudentAssessments(studentProfileId: string, courseId?: string, userRole?: UserRole) {
    // Check if the requester is a student with an assigned division
    let studentDivision: string | null = null;
    let studentBatch: string | null = null;
    let studentEnrollment: string | null = null;
    let studentRollType: 'ODD' | 'EVEN' | null = null;
    let resolvedStudentProfileId: string = studentProfileId;
    if (studentProfileId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: {
          OR: [
            { id: studentProfileId },
            { userId: studentProfileId },
          ],
        },
        include: { authorizedStudent: true },
      });
      if (student) {
        resolvedStudentProfileId = student.id;
        if (student.authorizedStudent?.division) {
          studentDivision = student.authorizedStudent.division;
        }
        if (student.authorizedStudent?.enrollmentNumber) {
          studentEnrollment = student.authorizedStudent.enrollmentNumber;
          studentBatch = student.authorizedStudent.enrollmentNumber.slice(0, 2);
          const m = student.authorizedStudent.enrollmentNumber.match(/(\d+)$/);
          if (m) {
            studentRollType = parseInt(m[1], 10) % 2 === 0 ? 'EVEN' : 'ODD';
          }
        }
      }
    }

    let targetCourseUUID: string | undefined = undefined;
    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: { OR: [{ id: courseId }, { code: courseId }] },
      });
      targetCourseUUID = course ? course.id : courseId;
    }

    // Role-based status filter: Faculty/Admin can view DRAFT assessments to review/publish them.
    // Students only see PUBLISHED, ACTIVE, or COMPLETED assessments.
    const isFacultyOrAdmin =
      userRole === UserRole.FACULTY ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.HOD;

    const statusFilter = isFacultyOrAdmin
      ? { in: [AssessmentStatus.DRAFT, AssessmentStatus.PUBLISHED, AssessmentStatus.ACTIVE, AssessmentStatus.COMPLETED] }
      : { in: [AssessmentStatus.PUBLISHED, AssessmentStatus.ACTIVE, AssessmentStatus.COMPLETED] };

    const allowedDivisions = (!isFacultyOrAdmin && studentDivision)
      ? getAllowedAssessmentDivisions(studentDivision)
      : null;

    const andFilters: any[] = [];
    if (allowedDivisions) {
      andFilters.push({
        OR: [
          { division: 'ALL' },
          { division: null },
          { division: '' },
          { division: { in: allowedDivisions } },
        ],
      });
    }
    if (!isFacultyOrAdmin && studentBatch) {
      andFilters.push({
        OR: [
          { batch: 'ALL' },
          { batch: null },
          { batch: '' },
          { batch: studentBatch },
          { batch: { contains: studentBatch } },
        ] as any,
      });
    }
    if (!isFacultyOrAdmin && studentRollType) {
      andFilters.push({
        OR: [
          { rollFilter: 'ALL' },
          { rollFilter: null },
          { rollFilter: '' },
          { rollFilter: studentRollType },
        ] as any,
      });
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        status: statusFilter,
        ...(targetCourseUUID ? { courseId: targetCourseUUID } : {}),
        ...(andFilters.length > 0 ? { AND: andFilters } : {}),
      },
      include: {
        course: { select: { code: true, name: true } },
        questions: {
          include: {
            question: { select: { type: true } },
          },
        },
        submissions: {
          where: { studentId: resolvedStudentProfileId },
          orderBy: { attemptNumber: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const visibleAssessments = assessments.filter((a: any) => {
      if (isFacultyOrAdmin) return true;
      return isEnrollmentOddEvenMatch(studentEnrollment, a.rollFilter);
    });

    return visibleAssessments.map((a: any) => {
      const attemptsCount = a.submissions.length;
      const bestSubmission = [...a.submissions].sort((x: any, y: any) => y.totalScore - x.totalScore)[0];
      const activeSubmission = a.submissions.find((s: any) => s.status === SubmissionStatus.IN_PROGRESS);
      const isCodingExam =
        a.title.includes('[CODING]') ||
        (a.description?.toLowerCase().includes('coding') ?? false) ||
        a.questions.some((q: any) => q.question.type === QuestionType.CODING);

      const expired = isAssessmentExpired(a);
      const expiresAt = a.scheduledEndTime
        ? a.scheduledEndTime
        : new Date(new Date(a.scheduledStartTime || a.createdAt).getTime() + (a.durationMinutes + 5) * 60 * 1000);
      const canAttempt = !expired && (attemptsCount < a.allowedAttempts || !!activeSubmission);

      return {
        id: a.id,
        title: a.title,
        description: a.description,
        code: a.code,
        division: a.division || 'ALL',
        batch: a.batch || 'ALL',
        rollFilter: a.rollFilter || 'ALL',
        courseCode: a.course.code,
        courseName: a.course.name,
        type: a.type,
        status: expired ? 'COMPLETED' : a.status,
        durationMinutes: a.durationMinutes,
        totalMarks: a.totalMarks,
        passingMarks: a.passingMarks,
        totalQuestions: a.totalQuestions,
        allowedAttempts: a.allowedAttempts,
        scheduledStartTime: a.scheduledStartTime,
        scheduledEndTime: a.scheduledEndTime,
        expiresAt,
        isExpired: expired,
        attemptsCount,
        hasAvailableAttempts: !expired && attemptsCount < a.allowedAttempts,
        canAttempt,
        activeSubmissionId: activeSubmission?.id || null,
        bestScore: bestSubmission ? bestSubmission.totalScore : null,
        isCodingExam,
        bestPercentage: bestSubmission ? bestSubmission.percentage : null,
        passed: bestSubmission ? bestSubmission.passed : false,
      };
    });
  }

  /**
   * Student: Start an assessment attempt
   */
  async startAttempt(assessmentId: string, studentProfileId: string) {
    const [assessment, student, existingSubmissions] = await Promise.all([
      this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          questions: {
            include: {
              question: {
                include: {
                  options: {
                    select: { id: true, optionText: true, order: true },
                    orderBy: { order: 'asc' },
                  },
                  topic: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.studentProfile.findFirst({
        where: {
          OR: [
            { id: studentProfileId },
            { userId: studentProfileId },
          ],
        },
        include: { authorizedStudent: true },
      }),
      this.prisma.assessmentSubmission.findMany({
        where: {
          assessmentId,
          OR: [
            { studentId: studentProfileId },
          ],
        },
      }),
    ]);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED && assessment.status !== AssessmentStatus.ACTIVE) {
      throw new BadRequestException('This assessment is not currently accepting attempts.');
    }

    if (isAssessmentExpired(assessment)) {
      const endTimeStr = assessment.scheduledEndTime
        ? new Date(assessment.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'the scheduled completion time';
      throw new BadRequestException(
        `This test has ended and is no longer accepting attempts. The allocated test window closed at ${endTimeStr}.`,
      );
    }

    const effectiveProfileId = student ? student.id : studentProfileId;
    const studentDiv = student?.authorizedStudent?.division;

    // Verify division eligibility if restricted
    if (assessment.division && assessment.division !== 'ALL') {
      if (!isDivisionCompatible(assessment.division, studentDiv)) {
        const targetLabel = normalizeDivision(assessment.division) === 'DIV 1' ? 'Division A (DIV 1)' : 'Division B (DIV 2)';
        const currentLabel = normalizeDivision(studentDiv) === 'DIV 1' ? 'Division A (DIV 1)' : 'Division B (DIV 2)';
        throw new ForbiddenException(
          `This assessment is restricted to ${targetLabel}. Your account is registered under ${currentLabel}.`,
        );
      }
    }

    // Verify batch eligibility if restricted
    const aBatch = (assessment as any).batch;
    if (aBatch && aBatch !== 'ALL') {
      const studentBatch = student?.authorizedStudent?.enrollmentNumber?.slice(0, 2);
      if (studentBatch && aBatch !== studentBatch && !aBatch.includes(studentBatch)) {
        throw new ForbiddenException(
          `This assessment is restricted to Batch '${aBatch}'. Your account is registered under Batch '${studentBatch}'.`,
        );
      }
    }

    // Verify roll number (odd/even) eligibility if restricted
    const aRollFilter = (assessment as any).rollFilter;
    if (aRollFilter && aRollFilter !== 'ALL') {
      const enrollment = student?.authorizedStudent?.enrollmentNumber;
      if (!isEnrollmentOddEvenMatch(enrollment, aRollFilter)) {
        const expectedLabel = aRollFilter.toUpperCase() === 'ODD' ? 'Odd Roll Numbers' : 'Even Roll Numbers';
        throw new ForbiddenException(
          `This assessment is restricted to students with ${expectedLabel}. Your account (${enrollment || 'N/A'}) is not eligible to take this test.`,
        );
      }
    }

    // Filter submissions belonging to resolved effective profile
    const studentSubmissions = existingSubmissions.filter((s) => s.studentId === effectiveProfileId || s.studentId === studentProfileId);

    // If an in-progress attempt already exists, return it immediately
    const active = studentSubmissions.find((s) => s.status === SubmissionStatus.IN_PROGRESS);
    if (active) {
      const proc = await this.ensureProctoringSession(active.id, effectiveProfileId);
      const pairing = this.companionSync.generateEphemeralPairing(
        active.id,
        assessment.durationMinutes,
        effectiveProfileId,
        student?.authorizedStudent?.enrollmentNumber,
        assessment.id,
      );
      return await this.formatAttemptPayload(assessment, active, proc, student?.authorizedStudent?.enrollmentNumber, pairing);
    }

    if (studentSubmissions.length >= assessment.allowedAttempts) {
      throw new BadRequestException(
        `Maximum allowed attempts (${assessment.allowedAttempts}) for this assessment reached.`,
      );
    }

    // Validate prerequisites across topics in this assessment (bypass for descriptive midterm examination)
    const isDescriptiveMidterm =
      assessment.code === 'CS302-DESC-MIDTERM' ||
      assessment.id === 'a1ad1e13-dc27-402a-8275-c01cb5459378' ||
      assessment.code?.includes('DESC') ||
      assessment.title?.includes('Descriptive');

    if (!isDescriptiveMidterm) {
      const topicIds = Array.from(
        new Set(
          assessment.questions
            .map((aq) => aq.question?.topicId)
            .filter((t): t is string => !!t),
        ),
      );

      if (topicIds.length > 0) {
        const prereqResults = await Promise.all(
          topicIds.map(async (tId) => ({
            tId,
            check: await this.analyticsService.validateTopicPrerequisites(effectiveProfileId, tId),
          })),
        );

        for (const { tId, check } of prereqResults) {
          if (!check.isReady) {
            throw new ForbiddenException({
              statusCode: 403,
              error: 'PREREQUISITE_INCOMPLETE',
              message: `Cannot start assessment "${assessment.title}". Prerequisite incomplete: ${check.recommendation}`,
              topicId: tId,
              topicSlug: check.topicSlug,
              readinessScore: check.readinessScore,
              missingPrerequisites: check.missingPrerequisites,
            });
          }
        }
      }
    }

    // Create new submission
    const newSubmission = await this.prisma.assessmentSubmission.create({
      data: {
        assessmentId,
        studentId: effectiveProfileId,
        attemptNumber: studentSubmissions.length + 1,
        startedAt: new Date(),
        status: SubmissionStatus.IN_PROGRESS,
      },
    });

    const proc = await this.ensureProctoringSession(newSubmission.id, effectiveProfileId);
    const pairing = this.companionSync.generateEphemeralPairing(
      newSubmission.id,
      assessment.durationMinutes,
      effectiveProfileId,
      student?.authorizedStudent?.enrollmentNumber,
      assessment.id,
    );
    return await this.formatAttemptPayload(assessment, newSubmission, proc, student?.authorizedStudent?.enrollmentNumber, pairing);
  }

  private async ensureProctoringSession(submissionId: string, studentId: string) {
    return this.prisma.proctoringSession.upsert({
      where: { submissionId },
      update: {},
      create: {
        submissionId,
        studentId,
        status: 'IN_PROGRESS' as any,
        trustScore: 100.0,
        violationsCount: 0,
      },
    });
  }

  private async formatAttemptPayload(assessment: any, submission: any, proctoring?: any, studentEnrollment?: string, pairing?: any) {
    // High-performance batch prefetch for any coding problems
    const codingQuestions = assessment.questions.filter((aq: any) => aq.question.type === QuestionType.CODING);
    const problemMap = new Map<string, any>();

    if (codingQuestions.length > 0) {
      const problemIds: string[] = [];
      const slugs: string[] = [];
      for (const aq of codingQuestions) {
        try {
          const meta = JSON.parse(aq.question.explanation);
          if (meta?.codingProblemId) problemIds.push(meta.codingProblemId);
          if (meta?.slug) slugs.push(meta.slug);
        } catch (_) {}
      }

      if (problemIds.length > 0 || slugs.length > 0) {
        const found = await this.prisma.codingProblem.findMany({
          where: {
            OR: [
              ...(problemIds.length > 0 ? [{ id: { in: problemIds } }] : []),
              ...(slugs.length > 0 ? [{ slug: { in: slugs } }] : []),
            ],
          },
          include: {
            testCases: {
              where: { isHidden: false },
              orderBy: { order: 'asc' },
            },
          },
        });
        for (const p of found) {
          problemMap.set(p.id, p);
          problemMap.set(p.slug, p);
        }
      }
    }

    let questions = assessment.questions.map((aq: any) => {
      const isCoding = aq.question.type === QuestionType.CODING;
      let codingProblem: any = null;

      if (isCoding) {
        let meta: any = null;
        try {
          meta = JSON.parse(aq.question.explanation);
        } catch (_) {}

        const problem = meta?.codingProblemId ? problemMap.get(meta.codingProblemId) : (meta?.slug ? problemMap.get(meta.slug) : null);

        if (problem) {
            let starterCodes: any = {
              PYTHON: 'def solution(*args):\n    # Write your algorithmic solution here\n    pass\n',
              JAVASCRIPT: 'function solution(...args) {\n    // Write your algorithmic solution here\n}\n',
              CPP: '#include <iostream>\nint solution() {\n    return 0;\n}\n',
              JAVA: 'class Solution {\n    public int solution() {\n        return 0;\n    }\n}\n',
            };
            try {
              if (problem.starterCodes) {
                starterCodes = typeof problem.starterCodes === 'string'
                  ? JSON.parse(problem.starterCodes)
                  : problem.starterCodes;
              }
            } catch (_) {}

            let hints: any[] = [];
            try {
              if (problem.hints) {
                hints = typeof problem.hints === 'string'
                  ? JSON.parse(problem.hints)
                  : problem.hints;
              }
            } catch (_) {}

            codingProblem = {
              id: problem.id,
              slug: problem.slug,
              title: problem.title,
              description: problem.description,
              difficulty: problem.difficulty,
              tags: problem.tags,
              constraints: problem.constraints,
              hints,
              starterCodes,
              sampleTestCases: problem.testCases.map((tc: any) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                explanation: tc.explanation || 'Sample test case',
              })),
            };
          } else if (meta) {
            codingProblem = {
              title: aq.question.questionText,
              description: meta.description || aq.question.questionText,
              constraints: meta.constraints || '',
              hints: meta.hints || [],
              starterCodes: meta.starterCodes || {},
              sampleTestCases: meta.sampleTestCases || [],
            };
          }
        }

        return {
          id: aq.question.id,
          type: aq.question.type,
          questionText: aq.question.questionText,
          explanation: aq.question.explanation,
          points: aq.points,
          topicName: aq.question.topic?.name,
          difficulty: aq.question.difficulty,
          options: shuffleQuestionOptions(aq.question.options, submission.id, aq.question.id),
          codingProblem,
        };
      });

    // Anti-Cheat: Jumble / randomize question order uniquely per student attempt
    // Ensures adjacent students sitting together in an exam hall receive questions in completely different orders.
    // Deterministic seed with submission.id and studentId ensures question sequence remains stable on page refresh.
    if (assessment.randomizeQuestions !== false) {
      questions = seededShuffle(questions, `${submission.id}:${submission.studentId || 'attempt'}:question_order`);
    }

    const elapsedMs = Date.now() - new Date(submission.startedAt).getTime();
    const totalDurationMs = assessment.durationMinutes * 60 * 1000;
    const remainingSeconds = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));

    const enrollment = studentEnrollment || submission.student?.authorizedStudent?.enrollmentNumber;
    // Dynamic Ephemeral Pairing PIN & Token: Valid strictly during active exam session
    const activePairing = pairing || this.companionSync.getPairingInfo(submission.id) || this.companionSync.generateEphemeralPairing(
      submission.id,
      assessment.durationMinutes,
      submission.studentId,
      enrollment,
      assessment.id,
    );

    const companionPairingPin = activePairing?.displayPin || null;
    const companionPairingPinRaw = activePairing?.pin || null;
    const companionSessionToken = activePairing?.pin || submission.id;

    return {
      submissionId: submission.id,
      attemptNumber: submission.attemptNumber,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        code: assessment.code,
        durationMinutes: assessment.durationMinutes,
        totalMarks: assessment.totalMarks,
        totalQuestions: assessment.totalQuestions,
      },
      remainingSeconds,
      companionSessionToken,
      companionPairingPin,
      companionPairingPinRaw,
      studentEnrollment: enrollment || null,
      proctoringSessionId: proctoring?.id || null,
      trustScore: proctoring?.trustScore ?? 100,
      faceEnrollmentVerified: proctoring?.faceEnrollmentVerified ?? false,
      questions,
    };
  }

  /**
   * Student: Submit completed assessment attempt for automated grading
   */
  async submitAttempt(
    submissionId: string,
    studentProfileId: string,
    answers: SubmitAnswerDto[],
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        assessment: {
          include: {
            questions: {
              include: {
                question: {
                  include: { options: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    const isOwner =
      submission.studentId === studentProfileId ||
      submission.student?.userId === studentProfileId ||
      submission.student?.id === studentProfileId;

    if (!isOwner) {
      const profile = await this.prisma.studentProfile.findFirst({
        where: { OR: [{ id: studentProfileId }, { userId: studentProfileId }] },
      });
      if (!profile || profile.id !== submission.studentId) {
        throw new ForbiddenException('Unauthorized submission access.');
      }
    }

    // Atomic Lock: Only proceed if this submission is currently IN_PROGRESS
    const lockResult = await this.prisma.assessmentSubmission.updateMany({
      where: {
        id: submissionId,
        studentId: submission.studentId,
        status: SubmissionStatus.IN_PROGRESS,
      },
      data: {
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    // Notify companion gateway, lock drawing canvas, and generate/broadcast exit pass to mobile
    let exitPassCode: string | undefined = undefined;
    try {
      const exitRes = this.companionSync.submitExamAndGenerateExitPass(submissionId, submissionId);
      exitPassCode = exitRes?.exitPass;
    } catch (_) {}

    if (lockResult.count === 0) {
      const existing = await this.prisma.assessmentSubmission.findUnique({
        where: { id: submissionId },
      });
      if (existing && existing.status !== SubmissionStatus.IN_PROGRESS) {
        return existing;
      }
      throw new BadRequestException('This assessment attempt has already been submitted.');
    }

    const questionPointsMap = new Map<string, number>();
    const questionOptionsMap = new Map<string, any[]>();
    const questionMap = new Map<string, any>();

    for (const aq of submission.assessment.questions) {
      questionPointsMap.set(aq.questionId, aq.points);
      questionOptionsMap.set(aq.questionId, aq.question.options);
      questionMap.set(aq.questionId, aq.question);
    }

    let totalScore = 0.0;
    let hasDescriptiveQuestions = false;
    const answerRecords: any[] = [];

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId);
      const pointsForQ = questionPointsMap.get(ans.questionId) || 0.0;

      // Handle CODING Question Type
      if (question?.type === QuestionType.CODING) {
        const sourceCode = (ans.sourceCode || ans.code || '').trim();
        const language = ans.language || ProgrammingLanguage.PYTHON;
        let isCorrect = false;
        let pointsAwarded = 0.0;

        if (sourceCode) {
          let meta: any = null;
          try {
            meta = JSON.parse(question.explanation);
          } catch (_) {}

          const probId = meta?.codingProblemId;
          let prob = probId
            ? await this.prisma.codingProblem.findUnique({
                where: { id: probId },
                include: { testCases: { orderBy: { order: 'asc' } } },
              })
            : null;

          if (!prob && meta?.slug) {
            prob = await this.prisma.codingProblem.findUnique({
              where: { slug: meta.slug },
              include: { testCases: { orderBy: { order: 'asc' } } },
            });
          }

          let testCasesToEvaluate: Array<{ input: string; expectedOutput: string; isHidden: boolean }> = [];
          if (prob && prob.testCases.length > 0) {
            testCasesToEvaluate = prob.testCases.map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
            }));
          } else if (meta?.sampleTestCases || meta?.testCasesToCheck) {
            const samples = Array.isArray(meta.sampleTestCases) ? meta.sampleTestCases : [];
            const checks = Array.isArray(meta.testCasesToCheck) ? meta.testCasesToCheck : [];
            testCasesToEvaluate = [...samples, ...checks].map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: !!tc.isHidden,
            }));
          }

          if (testCasesToEvaluate.length > 0) {
            try {
              const verdict = await this.codeRunner.execute(
                language,
                sourceCode,
                testCasesToEvaluate,
              );

              const passedRatio = verdict.totalTestCases > 0
                ? (verdict.testCasesPassed / verdict.totalTestCases)
                : 0;
              pointsAwarded = Number((passedRatio * pointsForQ).toFixed(2));
              isCorrect = verdict.status === 'ACCEPTED';

              // Persist CodeSubmission record for code analysis and audit
              if (prob) {
                try {
                  await this.prisma.codeSubmission.create({
                    data: {
                      studentId: studentProfileId,
                      problemId: prob.id,
                      language,
                      sourceCode,
                      status: verdict.status as any,
                      executionTimeMs: verdict.executionTimeMs,
                      memoryUsedKb: verdict.memoryKb,
                      testCasesPassed: verdict.testCasesPassed,
                      totalTestCases: verdict.totalTestCases,
                      judgeDetails: JSON.stringify(verdict.testResults),
                    },
                  });
                } catch (_) {}
              }
            } catch (runnerErr: any) {
              this.logger.warn(`Automated exam code evaluation error: ${runnerErr.message}`);
            }
          }
        }

        totalScore += pointsAwarded;
        answerRecords.push({
          submissionId: submission.id,
          questionId: ans.questionId,
          selectedOptionId: null,
          isCorrect,
          pointsAwarded,
          timeSpentSeconds: ans.timeSpentSeconds || 0,
        });
        continue;
      }

      // Handle DESCRIPTIVE / SHORT ANSWER Question Type (Manual Faculty Evaluation)
      const options = questionOptionsMap.get(ans.questionId) || [];
      const isDescriptive =
        question?.type === QuestionType.SHORT_ANSWER ||
        question?.type === ('DESCRIPTIVE' as any) ||
        (options.length === 0 && question?.type !== QuestionType.CODING);

      if (isDescriptive) {
        hasDescriptiveQuestions = true;
        let finalAnswerText =
          ans.answerText ||
          ans.sourceCode ||
          (ans.selectedOptionId && !String(ans.selectedOptionId).startsWith('opt-')
            ? String(ans.selectedOptionId)
            : null);

        // If no text was packaged by client, check if companion sync service holds buffered strokes
        if (!finalAnswerText) {
          const qIdx = submission.assessment.questions.findIndex((aq) => aq.questionId === ans.questionId);
          const qKey = qIdx >= 0 ? `Q${qIdx + 1}` : null;
          if (qKey) {
            const sheet = this.companionSync.getStrokes(submissionId, qKey);
            if (sheet && sheet.strokes && sheet.strokes.length > 0) {
              finalAnswerText = JSON.stringify({
                type: 'DIGITAL_INK',
                questionId: qKey,
                strokesCount: sheet.strokes.length,
                strokes: sheet.strokes,
                lastUpdated: sheet.lastUpdated,
              });
            }
          }
        }

        answerRecords.push({
          submissionId: submission.id,
          questionId: ans.questionId,
          selectedOptionId: null,
          answerText: finalAnswerText,
          isCorrect: false,
          pointsAwarded: 0.0,
          timeSpentSeconds: ans.timeSpentSeconds || 0,
        });
        continue;
      }

      // Handle Standard Objective / Multiple Choice Question
      const selectedOpt = options.find((o: any) => o.id === ans.selectedOptionId);
      const isCorrect = selectedOpt ? selectedOpt.isCorrect : false;
      const points = isCorrect ? pointsForQ : 0.0;

      totalScore += points;

      answerRecords.push({
        submissionId: submission.id,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId || null,
        isCorrect,
        pointsAwarded: points,
        timeSpentSeconds: ans.timeSpentSeconds || 0,
      });
    }

    // Check if the assessment as a whole has descriptive questions (even if student left some unattempted)
    const assessmentHasDescriptive = submission.assessment.questions.some(
      (aq) =>
        aq.question.type === QuestionType.SHORT_ANSWER ||
        aq.question.type === ('DESCRIPTIVE' as any) ||
        (!aq.question.options?.length && aq.question.type !== QuestionType.CODING),
    );
    if (assessmentHasDescriptive) {
      hasDescriptiveQuestions = true;
    }

    // Clean up any partial answers and insert clean records atomically
    await this.prisma.submissionAnswer.deleteMany({
      where: { submissionId: submission.id },
    });
    await this.prisma.submissionAnswer.createMany({
      data: answerRecords,
    });

    const finalStatus = hasDescriptiveQuestions
      ? SubmissionStatus.SUBMITTED
      : SubmissionStatus.EVALUATED;

    const percentage = Number(((totalScore / submission.assessment.totalMarks) * 100).toFixed(1));
    const passed = percentage >= submission.assessment.passingMarks;

    const evaluatedSubmission = await this.prisma.assessmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        totalScore,
        percentage,
        passed,
      },
    });

    // Only sync topic-level performance to LearningHistory if this is an auto-evaluated test.
    // Descriptive exams will sync upon manual faculty evaluation via gradeSubmission.
    if (!hasDescriptiveQuestions) {
      const topicAggregates = new Map<string, { totalPoints: number; earnedPoints: number }>();
      for (const ans of answerRecords) {
        const q = questionMap.get(ans.questionId);
        if (q && q.topicId) {
          const current = topicAggregates.get(q.topicId) || { totalPoints: 0, earnedPoints: 0 };
          const qPoints = questionPointsMap.get(ans.questionId) || 0;
          current.totalPoints += qPoints;
          current.earnedPoints += ans.pointsAwarded || 0;
          topicAggregates.set(q.topicId, current);
        }
      }

      const historyEntries: any[] = [];
      const submissionTimestamp = evaluatedSubmission.submittedAt || new Date();

      for (const [topicId, stats] of Array.from(topicAggregates.entries())) {
        const topicPercentage = stats.totalPoints > 0
          ? Number(((stats.earnedPoints / stats.totalPoints) * 100).toFixed(1))
          : percentage;

        historyEntries.push({
          studentId: submission.studentId,
          topicId,
          masteryScore: topicPercentage,
          reason: LearningHistoryReason.TEST_RESULT,
          recordedAt: submissionTimestamp,
        });

        // Synchronize SkillMastery dynamically from assessment answers
        const attemptsInTest = answerRecords.filter((a) => {
          const q = questionMap.get(a.questionId);
          return q && q.topicId === topicId;
        });
        const correctInTest = attemptsInTest.filter((a) => a.isCorrect).length;

        const existingMastery = await this.prisma.skillMastery.findUnique({
          where: {
            studentId_topicId: {
              studentId: submission.studentId,
              topicId,
            },
          },
        });

        const newScore = existingMastery
          ? Math.round(((existingMastery.masteryScore * 0.7) + (topicPercentage * 0.3)) * 10) / 10
          : topicPercentage;

        await this.prisma.skillMastery.upsert({
          where: {
            studentId_topicId: {
              studentId: submission.studentId,
              topicId,
            },
          },
          update: {
            masteryScore: newScore,
            attemptCount: { increment: attemptsInTest.length },
            correctCount: { increment: correctInTest },
            lastPracticedAt: submissionTimestamp,
          },
          create: {
            studentId: submission.studentId,
            topicId,
            masteryScore: newScore,
            attemptCount: attemptsInTest.length,
            correctCount: correctInTest,
            lastPracticedAt: submissionTimestamp,
          },
        });
      }

      if (historyEntries.length > 0) {
        await this.prisma.learningHistory.createMany({
          data: historyEntries,
        });
      }

      // Invalidate cohort analytics cache so faculty analytics immediately reflect this assessment activity
      this.analyticsService?.invalidateCohortCache?.(submission.assessment.courseId);
    }

    // Update linked proctoring session completion status
    const existingProc = await this.prisma.proctoringSession.findUnique({
      where: { submissionId: submission.id },
    });
    if (existingProc) {
      const finalProcStatus =
        existingProc.status === 'FLAGGED' ? 'FLAGGED' : 'COMPLETED';
      await this.prisma.proctoringSession.update({
        where: { id: existingProc.id },
        data: {
          status: finalProcStatus as any,
          completedAt: new Date(),
        },
      });
    }

    return {
      submissionId: evaluatedSubmission.id,
      totalScore,
      totalMarks: submission.assessment.totalMarks,
      percentage,
      passed,
      passingMarks: submission.assessment.passingMarks,
      status: finalStatus,
      isPendingFacultyGrading: hasDescriptiveQuestions,
      submittedAt: evaluatedSubmission.submittedAt,
      exitPass: exitPassCode,
    };
  }

  /**
   * Student: View graded results with itemized question review & explanations
   */
  async getSubmissionResult(submissionId: string, studentProfileId: string) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        assessment: {
          include: {
            course: true,
          },
        },
        answers: {
          include: {
            question: {
              include: { options: true, topic: true },
            },
            selectedOption: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    const isOwner =
      submission.studentId === studentProfileId ||
      submission.student?.userId === studentProfileId ||
      submission.student?.id === studentProfileId;

    if (!isOwner) {
      const profile = await this.prisma.studentProfile.findFirst({
        where: { OR: [{ id: studentProfileId }, { userId: studentProfileId }] },
      });
      if (!profile || profile.id !== submission.studentId) {
        throw new ForbiddenException('Access denied to this submission.');
      }
    }

    const itemizedAnswers = submission.answers.map((a) => {
      const isCoding = a.question.type === QuestionType.CODING;
      const correctOpt = a.question.options.find((o) => o.isCorrect);
      let explanation = a.question.explanation;
      try {
        if (isCoding && explanation) {
          const parsed = JSON.parse(explanation);
          explanation = parsed.description || explanation;
        }
      } catch (_) {}

      return {
        questionId: a.question.id,
        type: a.question.type,
        questionText: a.question.questionText,
        topicName: a.question.topic?.name,
        difficulty: a.question.difficulty,
        pointsAwarded: a.pointsAwarded,
        isCorrect: a.isCorrect,
        explanation,
        selectedOptionText: a.selectedOption?.optionText || (isCoding ? 'Automated Code Submission' : a.answerText || 'Digital Ink Ruled Sheet Submission'),
        correctOptionText: correctOpt?.optionText || (isCoding ? 'Automated Code Evaluation (Sample & Check Cases)' : 'Graded according to marking rubric by course faculty'),
        feedback: (a as any).feedback || null,
        answerText: (a as any).answerText || null,
        options: a.question.options.map((opt) => ({
          id: opt.id,
          text: opt.optionText,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    return {
      submissionId: submission.id,
      assessmentTitle: submission.assessment.title,
      assessmentCode: submission.assessment.code,
      courseCode: submission.assessment.course.code,
      attemptNumber: submission.attemptNumber,
      status: submission.status,
      isPendingFacultyGrading: submission.status === SubmissionStatus.SUBMITTED,
      feedback: (submission as any).feedback || null,
      evaluatedAt: (submission as any).evaluatedAt || null,
      totalScore: submission.totalScore,
      totalMarks: submission.assessment.totalMarks,
      percentage: submission.percentage,
      passed: submission.passed,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      answers: itemizedAnswers,
    };
  }

  /**
   * Faculty: Manually grade descriptive assessment submission
   */
  async gradeSubmission(
    submissionId: string,
    facultyProfileId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: {
            questions: {
              include: { question: true },
            },
          },
        },
        answers: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    let totalScore = 0.0;
    const gradedQIds = new Set((dto.answers || []).map((a) => a.questionId));

    // Update awarded points and faculty remarks for each provided question
    for (const item of (dto.answers || [])) {
      const awarded = Math.max(0, Number(item.pointsAwarded) || 0);
      totalScore += awarded;

      const existing = await this.prisma.submissionAnswer.findFirst({
        where: {
          submissionId: submission.id,
          questionId: item.questionId,
        },
      });

      if (existing) {
        await this.prisma.submissionAnswer.update({
          where: { id: existing.id },
          data: {
            pointsAwarded: awarded,
            feedback: item.feedback || null,
            evaluatedBy: facultyProfileId,
            isCorrect: awarded > 0,
          },
        });
      } else {
        await this.prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: item.questionId,
            pointsAwarded: awarded,
            feedback: item.feedback || null,
            evaluatedBy: facultyProfileId,
            isCorrect: awarded > 0,
          },
        });
      }
    }

    // Retain points for any other answers in this submission not in dto.answers
    for (const existingAns of submission.answers) {
      if (!gradedQIds.has(existingAns.questionId)) {
        totalScore += existingAns.pointsAwarded || 0.0;
      }
    }

    const percentage = Number(((totalScore / submission.assessment.totalMarks) * 100).toFixed(1));
    const passed = percentage >= submission.assessment.passingMarks;
    const finalStatus = dto.status || SubmissionStatus.EVALUATED;

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id: submission.id },
      data: {
        totalScore,
        percentage,
        passed,
        status: finalStatus,
        feedback: dto.overallFeedback || (submission as any).feedback || null,
        evaluatedAt: new Date(),
      },
      include: {
        answers: {
          include: { question: true },
        },
        student: {
          include: {
            authorizedStudent: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    // Synchronize to student learning history and skill mastery
    const topicAggregates = new Map<string, { totalPoints: number; earnedPoints: number }>();
    const updatedAnswers = await this.prisma.submissionAnswer.findMany({
      where: { submissionId: submission.id },
      include: { question: true },
    });

    for (const ans of updatedAnswers) {
      if (ans.question && ans.question.topicId) {
        const current = topicAggregates.get(ans.question.topicId) || { totalPoints: 0, earnedPoints: 0 };
        current.earnedPoints += ans.pointsAwarded || 0;
        current.totalPoints += 10.0;
        topicAggregates.set(ans.question.topicId, current);
      }
    }

    const historyEntries: any[] = [];
    for (const [topicId, stats] of Array.from(topicAggregates.entries())) {
      const topicPercentage = stats.totalPoints > 0
        ? Number(((stats.earnedPoints / stats.totalPoints) * 100).toFixed(1))
        : percentage;

      historyEntries.push({
        studentId: submission.studentId,
        topicId,
        masteryScore: topicPercentage,
        reason: LearningHistoryReason.TEST_RESULT,
        recordedAt: new Date(),
      });
    }

    if (historyEntries.length > 0) {
      try {
        await this.prisma.learningHistory.createMany({
          data: historyEntries,
        });
      } catch (_) {}
    }

    // Invalidate cohort analytics cache so faculty dashboard immediately reflects changes
    this.analyticsService?.invalidateCohortCache?.(submission.assessment.courseId);

    return updated;
  }

  /**
   * Faculty: Assessment performance review & class cohort analytics
   */
  async getFacultyAnalytics(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: true,
        submissions: {
          include: {
            student: {
              include: {
                authorizedStudent: true,
                user: { select: { email: true } },
              },
            },
            answers: {
              include: {
                question: true,
              },
            },
            proctoringSession: {
              select: {
                trustScore: true,
                status: true,
                violationsCount: true,
                faceEnrollmentVerified: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const evaluatedSubmissions = assessment.submissions.filter(
      (s) => s.status === SubmissionStatus.EVALUATED,
    );
    const totalSubmissions = evaluatedSubmissions.length;
    const scores = evaluatedSubmissions.map((s) => s.totalScore);
    const avgScore = totalSubmissions > 0 ? scores.reduce((a, b) => a + b, 0) / totalSubmissions : 0;
    const passedCount = evaluatedSubmissions.filter((s) => s.passed).length;
    const passRate = totalSubmissions > 0 ? (passedCount / totalSubmissions) * 100 : 0;

    return {
      assessmentId: assessment.id,
      title: assessment.title,
      code: assessment.code,
      division: assessment.division || 'ALL',
      rollFilter: (assessment as any).rollFilter || 'ALL',
      courseCode: assessment.course.code,
      courseName: assessment.course.name,
      totalQuestions: assessment.totalQuestions,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      totalSubmissions,
      averageScore: Number(avgScore.toFixed(1)),
      passRate: Number(passRate.toFixed(1)),
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      questions: assessment.questions.map((aq, idx) => ({
        id: aq.questionId,
        questionId: aq.questionId,
        order: aq.order ?? (idx + 1),
        points: aq.points,
        questionText: aq.question?.questionText,
        explanation: aq.question?.explanation,
        type: aq.question?.type,
        difficulty: aq.question?.difficulty,
      })),
      submissions: assessment.submissions.map((s) => {
        // Map answers keyed by questionId
        const ansByQId = new Map<string, any>();
        for (const ans of (s.answers || [])) {
          if (ans.questionId) {
            ansByQId.set(ans.questionId, ans);
          }
        }

        // Canonical answers list ordered by the assessment questions sequence
        const canonicalAnswers = assessment.questions.map((aq, idx) => {
          const ans = ansByQId.get(aq.questionId);
          return {
            id: ans?.id || `ans-${aq.questionId}`,
            questionId: aq.questionId,
            order: aq.order ?? (idx + 1),
            pointsAwarded: ans?.pointsAwarded ?? 0,
            feedback: ans?.feedback ?? '',
            answerText: ans?.answerText ?? null,
            questionText: aq.question?.questionText,
            explanation: aq.question?.explanation,
            points: aq.points,
            question: {
              id: aq.question.id,
              questionId: aq.question.id,
              questionText: aq.question.questionText,
              explanation: aq.question.explanation,
              type: aq.question.type,
              points: aq.points,
            },
          };
        });

        return {
          submissionId: s.id,
          enrollmentNumber: s.student.authorizedStudent?.enrollmentNumber || '24CS001',
          studentName:
            s.student.authorizedStudent?.name ||
            s.student.user?.email?.split('@')[0] ||
            'Student',
          email: s.student.user?.email || 'N/A',
          division: s.student.authorizedStudent?.division || assessment.division || 'DIV 1',
          attemptNumber: s.attemptNumber,
          status: s.status,
          score: s.totalScore,
          totalMarks: assessment.totalMarks,
          percentage: s.percentage,
          passed: s.passed,
          feedback: (s as any).feedback,
          evaluatedAt: (s as any).evaluatedAt,
          answers: canonicalAnswers,
          submittedAt: s.submittedAt || s.startedAt,
          trustScore: s.proctoringSession?.trustScore ?? 100.0,
          proctoringStatus: s.proctoringSession?.status || 'COMPLETED',
          violationsCount: s.proctoringSession?.violationsCount ?? 0,
          faceEnrollmentVerified: s.proctoringSession?.faceEnrollmentVerified ?? false,
        };
      }),
    };
  }

  /**
   * Dynamic Assessment Leaderboard:
   * Dynamically calculated based on student scores (deduplicating multiple attempts
   * to each student's personal best, breaking ties with completion time / submission timestamp).
   */
  async getAssessmentLeaderboard(assessmentId: string, currentStudentProfileId?: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: true,
        submissions: {
          where: {
            status: { in: [SubmissionStatus.EVALUATED, SubmissionStatus.SUBMITTED] },
          },
          include: {
            student: {
              include: {
                authorizedStudent: true,
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Deduplicate by student: select each student's best attempt
    // Prioritize highest totalScore, then earlier submittedAt / shortest duration
    const studentBestMap = new Map<string, typeof assessment.submissions[0]>();

    for (const sub of assessment.submissions) {
      const existing = studentBestMap.get(sub.studentId);
      if (!existing) {
        studentBestMap.set(sub.studentId, sub);
      } else {
        if (sub.totalScore > existing.totalScore) {
          studentBestMap.set(sub.studentId, sub);
        } else if (sub.totalScore === existing.totalScore) {
          const subDuration =
            sub.submittedAt && sub.startedAt
              ? sub.submittedAt.getTime() - sub.startedAt.getTime()
              : Infinity;
          const existDuration =
            existing.submittedAt && existing.startedAt
              ? existing.submittedAt.getTime() - existing.startedAt.getTime()
              : Infinity;

          if (subDuration < existDuration) {
            studentBestMap.set(sub.studentId, sub);
          } else if (subDuration === existDuration) {
            const subTime = sub.submittedAt ? sub.submittedAt.getTime() : Infinity;
            const existTime = existing.submittedAt ? existing.submittedAt.getTime() : Infinity;
            if (subTime < existTime) {
              studentBestMap.set(sub.studentId, sub);
            }
          }
        }
      }
    }

    const bestSubmissions = Array.from(studentBestMap.values());

    // Sort: 1) totalScore descending, 2) duration ascending, 3) submittedAt ascending
    bestSubmissions.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      const aDuration =
        a.submittedAt && a.startedAt
          ? a.submittedAt.getTime() - a.startedAt.getTime()
          : Infinity;
      const bDuration =
        b.submittedAt && b.startedAt
          ? b.submittedAt.getTime() - b.startedAt.getTime()
          : Infinity;
      if (aDuration !== bDuration) {
        return aDuration - bDuration;
      }
      const aTime = a.submittedAt ? a.submittedAt.getTime() : 0;
      const bTime = b.submittedAt ? b.submittedAt.getTime() : 0;
      return aTime - bTime;
    });

    // Assign dynamic ranks (1-indexed)
    const rankedEntries = bestSubmissions.map((sub, idx) => {
      const durationSeconds =
        sub.submittedAt && sub.startedAt
          ? Math.max(0, Math.round((sub.submittedAt.getTime() - sub.startedAt.getTime()) / 1000))
          : null;

      const rank = idx + 1;
      const isCurrentUser =
        !!currentStudentProfileId &&
        (sub.studentId === currentStudentProfileId ||
          sub.student?.id === currentStudentProfileId ||
          sub.student?.userId === currentStudentProfileId);

      return {
        rank,
        submissionId: sub.id,
        studentId: sub.studentId,
        studentName:
          sub.student?.authorizedStudent?.name ||
          sub.student?.user?.email?.split('@')[0] ||
          'Student',
        enrollmentNumber: sub.student?.authorizedStudent?.enrollmentNumber || '24CS001',
        division: sub.student?.authorizedStudent?.division || assessment.division || 'DIV 1',
        score: sub.totalScore,
        totalMarks: assessment.totalMarks,
        percentage: Number(sub.percentage.toFixed(1)),
        passed: sub.passed,
        durationSeconds,
        attemptNumber: sub.attemptNumber,
        submittedAt: sub.submittedAt || sub.createdAt,
        isCurrentUser,
      };
    });

    const totalParticipants = rankedEntries.length;
    const scores = rankedEntries.map((e) => e.score);
    const averageScore =
      totalParticipants > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / totalParticipants).toFixed(1))
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passedCount = rankedEntries.filter((e) => e.passed).length;
    const passRate =
      totalParticipants > 0
        ? Number(((passedCount / totalParticipants) * 100).toFixed(1))
        : 0;

    const userEntry = rankedEntries.find((e) => e.isCurrentUser);
    const userRank = userEntry ? userEntry.rank : null;
    const userPercentile =
      userRank && totalParticipants > 0
        ? Number((((totalParticipants - userRank + 1) / totalParticipants) * 100).toFixed(1))
        : null;

    return {
      assessmentId: assessment.id,
      title: assessment.title,
      code: assessment.code,
      division: assessment.division || 'ALL',
      rollFilter: (assessment as any).rollFilter || 'ALL',
      courseCode: assessment.course.code,
      courseName: assessment.course.name,
      totalQuestions: assessment.totalQuestions,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      totalParticipants,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      currentUser: userEntry
        ? {
            rank: userRank,
            score: userEntry.score,
            percentage: userEntry.percentage,
            percentile: userPercentile,
            durationSeconds: userEntry.durationSeconds,
            passed: userEntry.passed,
          }
        : null,
      rankings: rankedEntries,
    };
  }
}


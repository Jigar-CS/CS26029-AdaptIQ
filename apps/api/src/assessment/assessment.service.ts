import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssessmentStatus,
  AssessmentType,
  SubmissionStatus,
} from '@prisma/client';

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
  questionIds: string[];
}

export interface SubmitAnswerDto {
  questionId: string;
  selectedOptionId: string;
  timeSpentSeconds?: number;
}

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Faculty: Create a new course assessment with assigned questions
   */
  async createAssessment(facultyProfileId: string, dto: CreateAssessmentDto) {
    if (!dto.questionIds || dto.questionIds.length === 0) {
      throw new BadRequestException('At least one question must be selected for the assessment.');
    }

    // Verify if faculty is restricted to their assigned subject
    let targetCourseId = dto.courseId;
    const faculty = await this.prisma.facultyProfile.findUnique({
      where: { id: facultyProfileId },
      include: { course: true },
    });

    if (faculty && faculty.courseId) {
      if (dto.courseId && dto.courseId !== faculty.courseId) {
        throw new ForbiddenException(
          `Unauthorized: You are assigned to teaching "${faculty.course?.name || faculty.courseId}". You can only create assessments for this assigned subject.`,
        );
      }
      targetCourseId = faculty.courseId;
    }

    if (!targetCourseId) {
      throw new BadRequestException('Course ID is required.');
    }

    // Verify all selected questions belong to the subject
    const validQuestionsCount = await this.prisma.question.count({
      where: {
        id: { in: dto.questionIds },
        courseId: targetCourseId,
      },
    });

    if (validQuestionsCount !== dto.questionIds.length) {
      throw new BadRequestException(
        'All selected questions must strictly belong to your assigned subject.',
      );
    }

    const totalQuestions = dto.questionIds.length;
    const totalMarks = dto.totalMarks || 100.0;
    const pointsPerQuestion = Number((totalMarks / totalQuestions).toFixed(2));
    const targetDivision = dto.division || 'ALL';

    const assessment = await this.prisma.assessment.create({
      data: {
        title: dto.title,
        description: dto.description,
        code: dto.code,
        courseId: targetCourseId,
        facultyId: facultyProfileId,
        type: dto.type || AssessmentType.QUIZ,
        status: AssessmentStatus.PUBLISHED,
        division: targetDivision,
        durationMinutes: dto.durationMinutes || 30,
        totalMarks,
        passingMarks: dto.passingMarks || 40.0,
        totalQuestions,
        randomizeQuestions: dto.randomizeQuestions ?? true,
        allowedAttempts: dto.allowedAttempts || 2,
        scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null,
        scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : null,
        questions: {
          create: dto.questionIds.map((qId, idx) => ({
            questionId: qId,
            points: pointsPerQuestion,
            order: idx + 1,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    // Notify all targeted students in their respective accounts
    try {
      const divisionFilter = targetDivision === 'ALL'
        ? {}
        : { authorizedStudent: { division: targetDivision } };

      const targetStudents = await this.prisma.studentProfile.findMany({
        where: divisionFilter,
        select: { id: true },
      });

      if (targetStudents.length > 0) {
        const divisionLabel = targetDivision === 'DIV 1'
          ? 'Division A (DIV 1)'
          : targetDivision === 'DIV 2'
          ? 'Division B (DIV 2)'
          : 'Both Divisions';

        await this.prisma.studentNotification.createMany({
          data: targetStudents.map((s) => ({
            studentId: s.id,
            title: `New Assessment Assigned: ${assessment.title}`,
            message: `A new ${assessment.type.toLowerCase()} (${assessment.code}) has been allocated to ${divisionLabel}. Duration: ${assessment.durationMinutes} mins.`,
            type: 'ASSESSMENT_ASSIGNED',
            metadata: JSON.stringify({ assessmentId: assessment.id, division: targetDivision }),
          })),
        });
      }
    } catch (notifErr) {
      console.warn('Failed to dispatch student notifications for assessment:', notifErr);
    }

    return assessment;
  }

  /**
   * Faculty: Publish or change status of assessment
   */
  async updateStatus(assessmentId: string, status: AssessmentStatus) {
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { status },
    });
  }

  /**
   * Student: Get available assessments with student attempt records
   */
  async getStudentAssessments(studentProfileId: string, courseId?: string) {
    // Check if the requester is a student with an assigned division
    let studentDivision: string | null = null;
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
      }
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        status: { in: [AssessmentStatus.PUBLISHED, AssessmentStatus.ACTIVE] },
        ...(courseId ? { courseId } : {}),
        ...(studentDivision
          ? {
              OR: [
                { division: 'ALL' },
                { division: null },
                { division: studentDivision },
              ],
            }
          : {}),
      },
      include: {
        course: { select: { code: true, name: true } },
        submissions: {
          where: { studentId: resolvedStudentProfileId },
          orderBy: { attemptNumber: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map((a) => {
      const attemptsCount = a.submissions.length;
      const bestSubmission = [...a.submissions].sort((x, y) => y.totalScore - x.totalScore)[0];
      const activeSubmission = a.submissions.find((s) => s.status === SubmissionStatus.IN_PROGRESS);

      return {
        id: a.id,
        title: a.title,
        description: a.description,
        code: a.code,
        division: a.division || 'ALL',
        courseCode: a.course.code,
        courseName: a.course.name,
        type: a.type,
        status: a.status,
        durationMinutes: a.durationMinutes,
        totalMarks: a.totalMarks,
        passingMarks: a.passingMarks,
        totalQuestions: a.totalQuestions,
        allowedAttempts: a.allowedAttempts,
        attemptsCount,
        hasAvailableAttempts: attemptsCount < a.allowedAttempts,
        activeSubmissionId: activeSubmission?.id || null,
        bestScore: bestSubmission ? bestSubmission.totalScore : null,
        bestPercentage: bestSubmission ? bestSubmission.percentage : null,
        passed: bestSubmission ? bestSubmission.passed : false,
      };
    });
  }

  /**
   * Student: Start an assessment attempt
   */
  async startAttempt(assessmentId: string, studentProfileId: string) {
    const assessment = await this.prisma.assessment.findUnique({
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
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED && assessment.status !== AssessmentStatus.ACTIVE) {
      throw new BadRequestException('This assessment is not currently accepting attempts.');
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { id: studentProfileId },
          { userId: studentProfileId },
        ],
      },
      include: { authorizedStudent: true },
    });
    const effectiveProfileId = student ? student.id : studentProfileId;
    const studentDiv = student?.authorizedStudent?.division;

    // Verify division eligibility if restricted
    if (assessment.division && assessment.division !== 'ALL') {
      if (studentDiv && studentDiv !== assessment.division) {
        const targetLabel = assessment.division === 'DIV 1' ? 'Division A (DIV 1)' : 'Division B (DIV 2)';
        const currentLabel = studentDiv === 'DIV 1' ? 'Division A (DIV 1)' : 'Division B (DIV 2)';
        throw new ForbiddenException(
          `This assessment is restricted to ${targetLabel}. Your account is registered under ${currentLabel}.`,
        );
      }
    }

    // Check existing submissions
    const existingSubmissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId, studentId: effectiveProfileId },
    });

    // If an in-progress attempt already exists, return it
    const active = existingSubmissions.find((s) => s.status === SubmissionStatus.IN_PROGRESS);
    if (active) {
      const proc = await this.ensureProctoringSession(active.id, effectiveProfileId);
      return this.formatAttemptPayload(assessment, active, proc);
    }

    if (existingSubmissions.length >= assessment.allowedAttempts) {
      throw new BadRequestException(
        `Maximum allowed attempts (${assessment.allowedAttempts}) for this assessment reached.`,
      );
    }

    // Create new submission
    const newSubmission = await this.prisma.assessmentSubmission.create({
      data: {
        assessmentId,
        studentId: effectiveProfileId,
        attemptNumber: existingSubmissions.length + 1,
        startedAt: new Date(),
        status: SubmissionStatus.IN_PROGRESS,
      },
    });

    const proc = await this.ensureProctoringSession(newSubmission.id, effectiveProfileId);
    return this.formatAttemptPayload(assessment, newSubmission, proc);
  }

  private async ensureProctoringSession(submissionId: string, studentId: string) {
    let proc = await this.prisma.proctoringSession.findUnique({
      where: { submissionId },
    });
    if (!proc) {
      proc = await this.prisma.proctoringSession.create({
        data: {
          submissionId,
          studentId,
          status: 'IN_PROGRESS' as any,
          trustScore: 100.0,
          violationsCount: 0,
        },
      });
    }
    return proc;
  }

  private formatAttemptPayload(assessment: any, submission: any, proctoring?: any) {
    let questions = assessment.questions.map((aq: any) => ({
      id: aq.question.id,
      questionText: aq.question.questionText,
      points: aq.points,
      topicName: aq.question.topic?.name,
      difficulty: aq.question.difficulty,
      options: aq.question.options,
    }));

    if (assessment.randomizeQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    const elapsedMs = Date.now() - new Date(submission.startedAt).getTime();
    const totalDurationMs = assessment.durationMinutes * 60 * 1000;
    const remainingSeconds = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));

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

    if (submission.studentId !== studentProfileId) {
      throw new ForbiddenException('Unauthorized submission access.');
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new BadRequestException('This assessment attempt has already been submitted.');
    }

    const questionPointsMap = new Map<string, number>();
    const questionOptionsMap = new Map<string, any[]>();

    for (const aq of submission.assessment.questions) {
      questionPointsMap.set(aq.questionId, aq.points);
      questionOptionsMap.set(aq.questionId, aq.question.options);
    }

    let totalScore = 0.0;
    const answerRecords: any[] = [];

    for (const ans of answers) {
      const options = questionOptionsMap.get(ans.questionId) || [];
      const selectedOpt = options.find((o: any) => o.id === ans.selectedOptionId);
      const isCorrect = selectedOpt ? selectedOpt.isCorrect : false;
      const points = isCorrect ? questionPointsMap.get(ans.questionId) || 0.0 : 0.0;

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

    // Save individual answer records
    await this.prisma.submissionAnswer.createMany({
      data: answerRecords,
    });

    const percentage = Number(((totalScore / submission.assessment.totalMarks) * 100).toFixed(1));
    const passed = percentage >= submission.assessment.passingMarks;

    const evaluatedSubmission = await this.prisma.assessmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.EVALUATED,
        submittedAt: new Date(),
        totalScore,
        percentage,
        passed,
      },
    });

    // Update linked proctoring session completion status
    const existingProc = await this.prisma.proctoringSession.findUnique({
      where: { submissionId: submission.id },
    });
    if (existingProc) {
      const finalStatus =
        existingProc.status === 'FLAGGED' ? 'FLAGGED' : 'COMPLETED';
      await this.prisma.proctoringSession.update({
        where: { id: existingProc.id },
        data: {
          status: finalStatus as any,
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
      submittedAt: evaluatedSubmission.submittedAt,
    };
  }

  /**
   * Student: View graded results with itemized question review & explanations
   */
  async getSubmissionResult(submissionId: string, studentProfileId: string) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
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

    if (submission.studentId !== studentProfileId) {
      throw new ForbiddenException('Access denied to this submission.');
    }

    const itemizedAnswers = submission.answers.map((a) => {
      const correctOpt = a.question.options.find((o) => o.isCorrect);
      return {
        questionId: a.question.id,
        questionText: a.question.questionText,
        topicName: a.question.topic?.name,
        difficulty: a.question.difficulty,
        pointsAwarded: a.pointsAwarded,
        isCorrect: a.isCorrect,
        explanation: a.question.explanation,
        selectedOptionText: a.selectedOption?.optionText || 'Unanswered',
        correctOptionText: correctOpt?.optionText || '',
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
   * Faculty: Assessment performance review & class cohort analytics
   */
  async getFacultyAnalytics(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: true,
        submissions: {
          where: { status: SubmissionStatus.EVALUATED },
          include: {
            student: {
              include: {
                authorizedStudent: true,
                user: { select: { email: true } },
              },
            },
          },
        },
        questions: {
          include: { question: true },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const totalSubmissions = assessment.submissions.length;
    const scores = assessment.submissions.map((s) => s.totalScore);
    const avgScore = totalSubmissions > 0 ? scores.reduce((a, b) => a + b, 0) / totalSubmissions : 0;
    const passedCount = assessment.submissions.filter((s) => s.passed).length;
    const passRate = totalSubmissions > 0 ? (passedCount / totalSubmissions) * 100 : 0;

    return {
      assessmentId: assessment.id,
      title: assessment.title,
      code: assessment.code,
      courseCode: assessment.course.code,
      totalQuestions: assessment.totalQuestions,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      totalSubmissions,
      averageScore: Number(avgScore.toFixed(1)),
      passRate: Number(passRate.toFixed(1)),
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      submissions: assessment.submissions.map((s) => ({
        submissionId: s.id,
        enrollmentNumber: s.student.authorizedStudent.enrollmentNumber,
        studentName: s.student.authorizedStudent.name,
        attemptNumber: s.attemptNumber,
        score: s.totalScore,
        percentage: s.percentage,
        passed: s.passed,
        submittedAt: s.submittedAt,
      })),
    };
  }
}

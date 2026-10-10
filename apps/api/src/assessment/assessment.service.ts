import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodingService, CreateCodingProblemDto } from '../coding/coding.service';
import { CodeRunnerService } from '../coding/code-runner.service';
import { LearningAnalyticsService } from '../analytics/learning-analytics.service';
import { shuffleQuestionOptions, seededShuffle } from '../common/shuffle.util';
import {
  AssessmentStatus,
  AssessmentType,
  SubmissionStatus,
  QuestionType,
  ProgrammingLanguage,
  LearningHistoryReason,
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
  questionIds?: string[];
  codingProblems?: CreateCodingProblemDto[];
  codingProblemIds?: string[];
  examMode?: 'OBJECTIVE' | 'CODING' | 'HYBRID';
}

export interface SubmitAnswerDto {
  questionId: string;
  selectedOptionId?: string;
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
  ) {}

  /**
   * Faculty: Create a new course assessment with assigned questions and/or coding problems
   */
  async createAssessment(facultyProfileId: string, dto: CreateAssessmentDto) {
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

    // Resolve combined question IDs from both question bank and authored/selected coding problems
    let combinedQuestionIds: string[] = [...(dto.questionIds || [])];

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

    // Verify all selected questions belong to the subject
    const validQuestionsCount = await this.prisma.question.count({
      where: {
        id: { in: combinedQuestionIds },
        courseId: targetCourseId,
      },
    });

    if (validQuestionsCount !== combinedQuestionIds.length) {
      throw new BadRequestException(
        'All selected questions must strictly belong to your assigned subject.',
      );
    }

    const totalQuestions = combinedQuestionIds.length;
    const totalMarks = dto.totalMarks || 100.0;
    const pointsPerQuestion = Number((totalMarks / totalQuestions).toFixed(2));
    const targetDivision = dto.division || 'ALL';

    const finalTitle = dto.examMode === 'CODING' && !dto.title.includes('Coding') && !dto.title.includes('💻')
      ? `💻 ${dto.title} [CODING]`
      : dto.title;

    const assessment = await this.prisma.assessment.create({
      data: {
        title: finalTitle,
        description: dto.description || (dto.examMode === 'CODING' ? 'Automated In-Browser Coding Assessment' : null),
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
        randomizeQuestions: dto.randomizeQuestions ?? false,
        allowedAttempts: dto.allowedAttempts || 2,
        scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null,
        scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : null,
        questions: {
          create: combinedQuestionIds.map((qId, idx) => ({
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

    return assessments.map((a) => {
      const attemptsCount = a.submissions.length;
      const bestSubmission = [...a.submissions].sort((x, y) => y.totalScore - x.totalScore)[0];
      const activeSubmission = a.submissions.find((s) => s.status === SubmissionStatus.IN_PROGRESS);
      const isCodingExam =
        a.title.includes('[CODING]') ||
        (a.description?.toLowerCase().includes('coding') ?? false) ||
        a.questions.some((q) => q.question.type === QuestionType.CODING);

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

    // Filter submissions belonging to resolved effective profile
    const studentSubmissions = existingSubmissions.filter((s) => s.studentId === effectiveProfileId || s.studentId === studentProfileId);

    // If an in-progress attempt already exists, return it immediately
    const active = studentSubmissions.find((s) => s.status === SubmissionStatus.IN_PROGRESS);
    if (active) {
      const proc = await this.ensureProctoringSession(active.id, effectiveProfileId);
      return await this.formatAttemptPayload(assessment, active, proc);
    }

    if (studentSubmissions.length >= assessment.allowedAttempts) {
      throw new BadRequestException(
        `Maximum allowed attempts (${assessment.allowedAttempts}) for this assessment reached.`,
      );
    }

    // Validate prerequisites across topics in this assessment
    const topicIds = Array.from(
      new Set(
        assessment.questions
          .map((aq) => aq.question?.topicId)
          .filter((t): t is string => !!t),
      ),
    );

    for (const tId of topicIds) {
      const check = await this.analyticsService.validateTopicPrerequisites(
        effectiveProfileId,
        tId,
      );
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
    return await this.formatAttemptPayload(assessment, newSubmission, proc);
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

  private async formatAttemptPayload(assessment: any, submission: any, proctoring?: any) {
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
          points: aq.points,
          topicName: aq.question.topic?.name,
          difficulty: aq.question.difficulty,
          options: shuffleQuestionOptions(aq.question.options, submission.id, aq.question.id),
          codingProblem,
        };
      });

    if (assessment.randomizeQuestions) {
      questions = seededShuffle(questions, `${submission.id}:question_order`);
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

    // Atomic Lock: Only proceed if this submission is currently IN_PROGRESS
    const lockResult = await this.prisma.assessmentSubmission.updateMany({
      where: {
        id: submissionId,
        studentId: studentProfileId,
        status: SubmissionStatus.IN_PROGRESS,
      },
      data: {
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

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

              // Persist CodeSubmission record for AST plagiarism and audit
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

      // Handle Standard Objective / Multiple Choice Question
      const options = questionOptionsMap.get(ans.questionId) || [];
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

    // Clean up any partial answers and insert clean records atomically
    await this.prisma.submissionAnswer.deleteMany({
      where: { submissionId: submission.id },
    });
    await this.prisma.submissionAnswer.createMany({
      data: answerRecords,
    });

    const percentage = Number(((totalScore / submission.assessment.totalMarks) * 100).toFixed(1));
    const passed = percentage >= submission.assessment.passingMarks;

    const evaluatedSubmission = await this.prisma.assessmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.EVALUATED,
        totalScore,
        percentage,
        passed,
      },
    });

    // Record topic-level performance to LearningHistory for Knowledge Curve tracking
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

    for (const [topicId, stats] of topicAggregates.entries()) {
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
    }

    if (historyEntries.length > 0) {
      await this.prisma.learningHistory.createMany({
        data: historyEntries,
      });
    }

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
        selectedOptionText: a.selectedOption?.optionText || (isCoding ? 'Automated Code Submission' : 'Unanswered'),
        correctOptionText: correctOpt?.optionText || (isCoding ? 'Automated Code Evaluation (Sample & Check Cases)' : ''),
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
          include: {
            student: {
              include: {
                authorizedStudent: true,
                user: { select: { email: true } },
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
      submissions: assessment.submissions.map((s) => ({
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
        submittedAt: s.submittedAt || s.startedAt,
        trustScore: s.proctoringSession?.trustScore ?? 100.0,
        proctoringStatus: s.proctoringSession?.status || 'COMPLETED',
        violationsCount: s.proctoringSession?.violationsCount ?? 0,
        faceEnrollmentVerified: s.proctoringSession?.faceEnrollmentVerified ?? false,
      })),
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


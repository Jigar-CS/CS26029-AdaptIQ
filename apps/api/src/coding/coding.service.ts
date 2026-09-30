import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodeRunnerService } from './code-runner.service';
import {
  ProgrammingLanguage,
  JudgeSubmissionStatus,
  QuestionDifficulty,
} from '@prisma/client';

export interface SubmitCodeDto {
  language: ProgrammingLanguage;
  sourceCode: string;
}

export interface RunCodeDto {
  language: ProgrammingLanguage;
  sourceCode: string;
  customInput?: string;
}

@Injectable()
export class CodingService {
  private readonly logger = new Logger('CodingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeRunner: CodeRunnerService,
  ) {}

  /**
   * Retrieves all coding problems with tags and difficulty.
   */
  async getProblems(difficulty?: QuestionDifficulty) {
    return this.prisma.codingProblem.findMany({
      where: difficulty ? { difficulty } : {},
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        tags: true,
        createdAt: true,
        _count: {
          select: { testCases: true, submissions: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Retrieves problem details by slug with visible sample test cases.
   */
  async getProblemBySlug(slug: string) {
    const problem = await this.prisma.codingProblem.findUnique({
      where: { slug },
      include: {
        testCases: {
          where: { isHidden: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Coding problem with slug '${slug}' not found.`);
    }

    return problem;
  }

  /**
   * Resolves StudentProfile id from raw ID or User ID.
   */
  private async resolveStudentProfileId(identifier: string): Promise<string> {
    const profile = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { userId: identifier }],
      },
    });

    return profile ? profile.id : identifier;
  }

  /**
   * Runs candidate code against visible sample test cases without recording submission.
   */
  async runCode(problemId: string, dto: RunCodeDto) {
    const problem = await this.prisma.codingProblem.findUnique({
      where: { id: problemId },
      include: {
        testCases: {
          where: { isHidden: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Coding problem not found.`);
    }

    // Execute real candidate code against visible sample testcases
    const result = await this.codeRunner.execute(
      dto.language,
      dto.sourceCode,
      problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
      })),
    );

    return result;
  }

  /**
   * Evaluates code submission against full suite of test cases (including hidden) and saves record.
   */
  async submitCode(rawStudentId: string, problemId: string, dto: SubmitCodeDto) {
    const studentProfileId = await this.resolveStudentProfileId(rawStudentId);

    const problem = await this.prisma.codingProblem.findUnique({
      where: { id: problemId },
      include: {
        testCases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Coding problem not found.`);
    }

    // Execute real candidate code against full testsuite (including hidden)
    const result = await this.codeRunner.execute(
      dto.language,
      dto.sourceCode,
      problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
    );

    let mappedStatus: JudgeSubmissionStatus = JudgeSubmissionStatus.ACCEPTED;
    if (result.status === 'WRONG_ANSWER') {
      mappedStatus = JudgeSubmissionStatus.WRONG_ANSWER;
    } else if (result.status === 'COMPILATION_ERROR') {
      mappedStatus = JudgeSubmissionStatus.COMPILATION_ERROR;
    } else if (result.status === 'TIME_LIMIT_EXCEEDED') {
      mappedStatus = JudgeSubmissionStatus.TIME_LIMIT_EXCEEDED;
    } else if (result.status === 'RUNTIME_ERROR') {
      mappedStatus = JudgeSubmissionStatus.RUNTIME_ERROR;
    }

    const judgeDetails = result.testResults.map((tr, idx) => {
      const tc = problem.testCases[idx];
      return {
        testCase: tr.testCaseNumber,
        status: tr.status,
        input: tc && tc.isHidden ? '[Hidden Testcase]' : tr.input,
        expected: tc && tc.isHidden ? '[Hidden]' : tr.expectedOutput,
        actual: tc && tc.isHidden ? (tr.status === 'PASSED' ? '[Hidden]' : tr.actualOutput) : tr.actualOutput,
        timeMs: tr.executionTimeMs,
      };
    });

    const submission = await this.prisma.codeSubmission.create({
      data: {
        studentId: studentProfileId,
        problemId: problem.id,
        language: dto.language,
        sourceCode: dto.sourceCode,
        status: mappedStatus,
        executionTimeMs: Math.round(result.executionTimeMs),
        memoryUsedKb: result.memoryKb || 14320,
        testCasesPassed: result.testCasesPassed,
        totalTestCases: result.totalTestCases,
        judgeDetails: JSON.stringify(judgeDetails),
      },
      include: {
        problem: { select: { title: true, slug: true } },
      },
    });

    return {
      submission,
      verdict: {
        status: mappedStatus,
        testCasesPassed: result.testCasesPassed,
        totalTestCases: result.totalTestCases,
        executionTimeMs: result.executionTimeMs,
        memoryUsedKb: result.memoryKb || 14320,
        outputMessage: result.outputMessage,
        judgeDetails,
        testResults: result.testResults,
      },
    };
  }

  /**
   * Retrieves submissions for a student with problem information.
   */
  async getStudentSubmissions(rawStudentId: string, problemId?: string) {
    const studentProfileId = await this.resolveStudentProfileId(rawStudentId);

    return this.prisma.codeSubmission.findMany({
      where: {
        studentId: studentProfileId,
        ...(problemId ? { problemId } : {}),
      },
      include: {
        problem: { select: { title: true, slug: true, difficulty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

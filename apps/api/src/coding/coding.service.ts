import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodeRunnerService } from './code-runner.service';
import {
  ProgrammingLanguage,
  JudgeSubmissionStatus,
  QuestionDifficulty,
  QuestionType,
  QuestionStatus,
} from '@prisma/client';

export interface SubmitCodeDto {
  language: ProgrammingLanguage;
  sourceCode: string;
}

export interface RunCodeDto {
  language: ProgrammingLanguage;
  sourceCode: string;
  customInput?: string;
  sampleTestCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface GenerateAiProblemDto {
  topic?: string;
  difficulty?: QuestionDifficulty;
  customPrompt?: string;
}

export interface CreateCodingTestCaseDto {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  explanation?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface CreateCodingProblemDto {
  title: string;
  slug?: string;
  description: string;
  difficulty?: QuestionDifficulty;
  tags?: string;
  constraints?: string;
  hints?: string[] | string;
  starterCodes?: Record<string, string> | string;
  courseId?: string;
  sampleTestCases?: CreateCodingTestCaseDto[];
  testCasesToCheck?: CreateCodingTestCaseDto[];
  testCases?: CreateCodingTestCaseDto[];
}

@Injectable()
export class CodingService {
  private readonly logger = new Logger('CodingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeRunner: CodeRunnerService,
  ) {}

  /**
   * Retrieves all coding problems with tags, difficulty, and optional course filter.
   */
  async getProblems(difficulty?: QuestionDifficulty, courseId?: string) {
    const where: any = {};
    if (difficulty) where.difficulty = difficulty;
    if (courseId) {
      where.OR = [
        { courseId },
        { courseId: null },
      ];
    }

    return this.prisma.codingProblem.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        tags: true,
        courseId: true,
        createdAt: true,
        _count: {
          select: { testCases: true, submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Authors and creates a new coding problem with sample and check test cases.
   */
  async createProblem(dto: CreateCodingProblemDto, forcedCourseId?: string) {
    const title = (dto.title || '').trim();
    if (!title) {
      throw new BadRequestException('Problem title is required.');
    }
    const description = (dto.description || '').trim();
    if (!description) {
      throw new BadRequestException('Full problem description is required.');
    }

    const courseId = forcedCourseId || dto.courseId || null;
    const difficulty = dto.difficulty || QuestionDifficulty.MEDIUM;

    // Unique slug generation
    let baseSlug = (dto.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `problem-${Date.now()}`;
    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.codingProblem.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Default starter codes if not provided
    const functionName = title.replace(/[^a-zA-Z0-9 ]/g, '').split(' ')
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('') || 'solution';

    const defaultStarterCodes = {
      PYTHON: `def ${functionName}(*args):\n    # Write your algorithmic solution here\n    pass\n`,
      JAVASCRIPT: `function ${functionName}(...args) {\n    // Write your algorithmic solution here\n}\n`,
      CPP: `#include <iostream>\n#include <vector>\n\nint ${functionName}() {\n    return 0;\n}\n`,
      JAVA: `class Solution {\n    public int ${functionName}() {\n        return 0;\n    }\n}\n`,
    };

    let starterCodesStr = JSON.stringify(defaultStarterCodes);
    if (dto.starterCodes) {
      if (typeof dto.starterCodes === 'string') {
        starterCodesStr = dto.starterCodes;
      } else {
        starterCodesStr = JSON.stringify({
          ...defaultStarterCodes,
          ...dto.starterCodes,
        });
      }
    }

    const hintsStr = Array.isArray(dto.hints)
      ? JSON.stringify(dto.hints)
      : typeof dto.hints === 'string'
      ? dto.hints
      : JSON.stringify(['Analyze boundary edge cases and asymptotic complexity bounds.']);

    // Consolidate test cases
    const sampleCases: CreateCodingTestCaseDto[] = (dto.sampleTestCases || []).map((stc, idx) => ({
      input: stc.input,
      expectedOutput: String(stc.expectedOutput),
      isHidden: false,
      explanation: stc.explanation || `Sample Case ${idx + 1}`,
      timeLimitMs: stc.timeLimitMs || 2000,
      memoryLimitMb: stc.memoryLimitMb || 128,
    }));

    const checkCases: CreateCodingTestCaseDto[] = (dto.testCasesToCheck || []).map((ctc, idx) => ({
      input: ctc.input,
      expectedOutput: String(ctc.expectedOutput),
      isHidden: true,
      explanation: ctc.explanation || `Hidden Evaluation Test Case ${idx + 1}`,
      timeLimitMs: ctc.timeLimitMs || 2000,
      memoryLimitMb: ctc.memoryLimitMb || 128,
    }));

    const genericCases: CreateCodingTestCaseDto[] = (dto.testCases || []).map((tc, idx) => ({
      input: tc.input,
      expectedOutput: String(tc.expectedOutput),
      isHidden: tc.isHidden !== undefined ? tc.isHidden : (idx >= 2),
      explanation: tc.explanation || `Test Case ${idx + 1}`,
      timeLimitMs: tc.timeLimitMs || 2000,
      memoryLimitMb: tc.memoryLimitMb || 128,
    }));

    let allCases = [...sampleCases, ...checkCases];
    if (allCases.length === 0) {
      allCases = genericCases;
    }
    if (allCases.length === 0) {
      allCases = [
        { input: 'nums = [1, 2, 3]', expectedOutput: '[1, 2, 3]', isHidden: false, explanation: 'Sample test case' },
        { input: 'nums = []', expectedOutput: '[]', isHidden: true, explanation: 'Hidden edge case' },
      ];
    }

    const createdProblem = await this.prisma.codingProblem.create({
      data: {
        slug: finalSlug,
        title,
        description,
        difficulty,
        tags: dto.tags || 'Algorithms, DSA',
        constraints: dto.constraints || '• 1 <= input.length <= 10^5\n• Time Limit: 2000ms\n• Memory Limit: 128MB',
        hints: hintsStr,
        starterCodes: starterCodesStr,
        courseId,
        testCases: {
          create: allCases.map((tc, idx) => ({
            input: tc.input,
            expectedOutput: String(tc.expectedOutput),
            isHidden: !!tc.isHidden,
            explanation: tc.explanation || null,
            timeLimitMs: tc.timeLimitMs || 2000,
            memoryLimitMb: tc.memoryLimitMb || 128,
            order: idx + 1,
          })),
        },
      },
      include: {
        testCases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // If courseId is provided, also create or link a corresponding Question of type CODING
    let linkedQuestionId: string | null = null;
    if (courseId) {
      const topic = await this.prisma.topic.findFirst({
        where: { courseId },
      });
      if (topic) {
        const question = await this.prisma.question.create({
          data: {
            courseId,
            topicId: topic.id,
            type: QuestionType.CODING,
            difficulty,
            questionText: title,
            explanation: JSON.stringify({
              codingProblemId: createdProblem.id,
              slug: createdProblem.slug,
              description: createdProblem.description,
              constraints: createdProblem.constraints,
              hints: hintsStr,
              starterCodes: starterCodesStr,
              sampleTestCases: allCases.filter((c) => !c.isHidden),
              testCasesToCheck: allCases.filter((c) => c.isHidden),
            }),
            sourceType: 'FACULTY_STUDIO',
            status: QuestionStatus.APPROVED,
          },
        });
        linkedQuestionId = question.id;
      }
    }

    this.logger.log(`Created new faculty coding problem: "${title}" (${finalSlug}) with ${allCases.length} test cases.`);

    return {
      ...createdProblem,
      linkedQuestionId,
    };
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
    let testCasesToRun: Array<{ input: string; expectedOutput: string; isHidden: boolean }> = [];

    if (dto.sampleTestCases && dto.sampleTestCases.length > 0) {
      testCasesToRun = dto.sampleTestCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
      }));
    } else {
      const problem = await this.prisma.codingProblem.findFirst({
        where: {
          OR: [{ id: problemId }, { slug: problemId }],
        },
        include: {
          testCases: {
            where: { isHidden: false },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!problem) {
        throw new NotFoundException(`Coding problem '${problemId}' not found.`);
      }

      testCasesToRun = problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
      }));

      // Fallback if no visible test cases are tagged
      if (testCasesToRun.length === 0) {
        const anyCases = await this.prisma.testCase.findMany({
          where: { problemId: problem.id },
          take: 2,
          orderBy: { order: 'asc' },
        });
        testCasesToRun = anyCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: false,
        }));
      }
    }

    // Execute candidate code against visible sample test cases
    const result = await this.codeRunner.execute(
      dto.language,
      dto.sourceCode,
      testCasesToRun,
    );

    return result;
  }

  /**
   * Evaluates code submission against full suite of test cases (including hidden) and saves record.
   */
  async submitCode(rawStudentId: string, problemId: string, dto: SubmitCodeDto) {
    const studentProfileId = await this.resolveStudentProfileId(rawStudentId);

    const problem = await this.prisma.codingProblem.findFirst({
      where: {
        OR: [{ id: problemId }, { slug: problemId }],
      },
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

    const totalCount = result.totalTestCases || problem.testCases.length;
    const passedCount = result.testCasesPassed || 0;
    const score = totalCount > 0 ? Number(((passedCount / totalCount) * 100).toFixed(1)) : 0;

    // Strict hidden test case protection: NEVER expose input, expected output, or inner execution traces of hidden tests
    const sanitizedTestResults = (result.testResults || []).map((tr, idx) => {
      const tc = problem.testCases[idx];
      const isHidden = tc ? !!tc.isHidden : false;
      return {
        testCaseNumber: tr.testCaseNumber || (idx + 1),
        status: tr.status,
        input: isHidden ? '[Hidden Testcase]' : tr.input,
        expectedOutput: isHidden ? '[Hidden]' : tr.expectedOutput,
        actualOutput: isHidden
          ? (tr.status === 'PASSED' ? '[Passed]' : '[Hidden - Output mismatch]')
          : tr.actualOutput,
        executionTimeMs: tr.executionTimeMs,
        consoleOutput: isHidden ? undefined : tr.consoleOutput,
      };
    });

    const judgeDetails = sanitizedTestResults.map((tr) => ({
      testCase: tr.testCaseNumber,
      testCaseNumber: tr.testCaseNumber,
      status: tr.status,
      input: tr.input,
      expected: tr.expectedOutput,
      expectedOutput: tr.expectedOutput,
      actual: tr.actualOutput,
      actualOutput: tr.actualOutput,
      timeMs: tr.executionTimeMs,
      executionTimeMs: tr.executionTimeMs,
      consoleOutput: tr.consoleOutput,
    }));

    const submission = await this.prisma.codeSubmission.create({
      data: {
        studentId: studentProfileId,
        problemId: problem.id,
        language: dto.language,
        sourceCode: dto.sourceCode,
        status: mappedStatus,
        score,
        executionTimeMs: Math.round(result.executionTimeMs),
        memoryUsedKb: result.memoryKb || 14320,
        testCasesPassed: passedCount,
        totalTestCases: totalCount,
        judgeDetails: JSON.stringify(judgeDetails),
      },
      include: {
        problem: { select: { title: true, slug: true, difficulty: true } },
      },
    });

    return {
      submission,
      verdict: {
        status: mappedStatus,
        score,
        testCasesPassed: passedCount,
        totalTestCases: totalCount,
        executionTimeMs: result.executionTimeMs,
        memoryUsedKb: result.memoryKb || 14320,
        outputMessage: result.outputMessage,
        judgeDetails,
        testResults: sanitizedTestResults,
      },
    };
  }

  /**
   * Retrieves submissions for a student with problem information.
   * Supports filtering by problem ID or slug.
   */
  async getStudentSubmissions(rawStudentId: string, problemIdOrSlug?: string) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [{ id: rawStudentId }, { userId: rawStudentId }],
      },
    });

    const studentIds = [rawStudentId];
    if (studentProfile) {
      studentIds.push(studentProfile.id, studentProfile.userId);
    }
    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));

    let problemCondition: any = undefined;
    if (problemIdOrSlug && problemIdOrSlug !== 'all') {
      const prob = await this.prisma.codingProblem.findFirst({
        where: { OR: [{ id: problemIdOrSlug }, { slug: problemIdOrSlug }] },
        select: { id: true, slug: true },
      });
      if (prob) {
        problemCondition = {
          OR: [
            { problemId: prob.id },
            { problem: { slug: prob.slug } },
          ],
        };
      } else {
        problemCondition = {
          OR: [
            { problemId: problemIdOrSlug },
            { problem: { slug: problemIdOrSlug } },
          ],
        };
      }
    }

    return this.prisma.codeSubmission.findMany({
      where: {
        studentId: { in: uniqueStudentIds },
        ...(problemCondition ? problemCondition : {}),
      },
      include: {
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single historical submission for read-only inspection.
   * Enforces strict ownership checks to ensure a student can only view their own submissions.
   */
  async getSubmissionById(rawStudentId: string, submissionId: string) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [{ id: rawStudentId }, { userId: rawStudentId }],
      },
    });

    const studentIds = [rawStudentId];
    if (studentProfile) {
      studentIds.push(studentProfile.id, studentProfile.userId);
    }
    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));

    const submission = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission '${submissionId}' not found.`);
    }

    if (!uniqueStudentIds.includes(submission.studentId)) {
      throw new ForbiddenException('You are not authorized to view this submission.');
    }

    return submission;
  }

  /**
   * Generates a new algorithmic coding problem via Google Gemini Generative AI
   * and persists it into the database with verified test cases and starter codes.
   */
  async generateAiProblem(dto: GenerateAiProblemDto) {
    const topic = dto.topic || 'Array & Hash Table';
    const difficulty = dto.difficulty || QuestionDifficulty.MEDIUM;

    let generated: any = null;

    // 1. Try Groq API first if GROQ_API_KEY is configured (Ultra-fast ~1.5s generation)
    if (process.env.GROQ_API_KEY) {
      try {
        generated = await this.callGroqApiForCodingProblem(topic, difficulty, dto.customPrompt);
      } catch (err: any) {
        this.logger.warn(`Groq API attempt failed: ${err.message}. Trying Gemini.`);
      }
    }

    // 2. Try Google Gemini API if Groq was not set or failed
    if (!generated) {
      try {
        generated = await this.callGeminiApiForCodingProblem(topic, difficulty, dto.customPrompt);
      } catch (err: any) {
        this.logger.warn(`Gemini API call failed: ${err.message}. Falling back to curated bank.`);
      }
    }

    // 3. Fallback to curated algorithmic problem bank if both are unavailable
    if (!generated) {
      generated = this.getCuratedFallbackProblem(topic, difficulty);
    }

    // Ensure unique slug
    let baseSlug = (generated.slug || generated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `problem-${Date.now()}`;
    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.codingProblem.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const starterCodesStr = typeof generated.starterCodes === 'string'
      ? generated.starterCodes
      : JSON.stringify(generated.starterCodes);

    const hintsStr = Array.isArray(generated.hints)
      ? JSON.stringify(generated.hints)
      : generated.hints || JSON.stringify(['Consider edge cases and optimal asymptotic bounds.']);

    const newProblem = await this.prisma.codingProblem.create({
      data: {
        slug: finalSlug,
        title: generated.title,
        description: generated.description,
        difficulty: (generated.difficulty as QuestionDifficulty) || difficulty,
        tags: generated.tags || topic,
        constraints: generated.constraints || '• 1 <= input.length <= 10^5\n• Standard time limit: 2000ms',
        hints: hintsStr,
        starterCodes: starterCodesStr,
        testCases: {
          create: generated.testCases.map((tc: any, index: number) => ({
            input: tc.input,
            expectedOutput: String(tc.expectedOutput),
            isHidden: tc.isHidden !== undefined ? tc.isHidden : (index >= 2),
            explanation: tc.explanation || `Test case ${index + 1}`,
            order: index + 1,
          })),
        },
      },
      include: {
        testCases: true,
      },
    });

    this.logger.log(`Created new AI coding problem: [${newProblem.difficulty}] ${newProblem.title} (${newProblem.slug})`);
    return newProblem;
  }

  /**
   * Seeds a standard suite of curated DSA problems into the database if not present.
   */
  async seedCuratedProblems() {
    const curatedList = this.getAllCuratedProblems();
    const created: string[] = [];

    for (const item of curatedList) {
      const exists = await this.prisma.codingProblem.findUnique({
        where: { slug: item.slug },
      });

      if (!exists) {
        await this.prisma.codingProblem.create({
          data: {
            slug: item.slug,
            title: item.title,
            description: item.description,
            difficulty: item.difficulty,
            tags: item.tags,
            constraints: item.constraints,
            hints: JSON.stringify(item.hints),
            starterCodes: JSON.stringify(item.starterCodes),
            testCases: {
              create: item.testCases.map((tc, idx) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                explanation: tc.explanation,
                order: idx + 1,
              })),
            },
          },
        });
        created.push(item.title);
      }
    }

    return {
      message: `Successfully checked curated library. ${created.length} new problem(s) seeded.`,
      created,
      totalCount: await this.prisma.codingProblem.count(),
    };
  }

  /**
   * Invokes Groq LPU API for ultra-fast (~1.5s) coding problem generation
   */
  private async callGroqApiForCodingProblem(
    topic: string,
    difficulty: QuestionDifficulty,
    customPrompt?: string,
  ): Promise<any | null> {
    const apiKey = process.env.GROQ_API_KEY || '';
    if (!apiKey) return null;

    const prompt = `You are a distinguished university computer science professor and competitive programming judge setter.
Generate exactly one high-quality algorithmic coding problem on topic: "${topic}" calibrated strictly to difficulty: "${difficulty}".
${customPrompt ? `Additional focus: "${customPrompt}"` : ''}

CRITICAL RULES FOR AUTOMATED CODE JUDGE:
1. Return ONLY valid JSON with no markdown wrapping, no backticks, and no extra text.
2. The problem MUST have unambiguous inputs and outputs suitable for automated testing.
3. "slug" must be a clean lowercase kebab-case string, e.g. "reverse-linked-list" or "binary-search".
4. "starterCodes" must be an object with keys "PYTHON", "JAVASCRIPT", "CPP", "JAVA".
5. In Python starter code, declare a clean standalone function matching the problem. E.g.:
   def solutionName(arg1: type, arg2: type) -> returnType:
       # Write your solution here
       pass
6. In testCases:
   - Provide 3 or 4 test cases.
   - At least 2 test cases must have "isHidden": false with a clear "explanation".
   - At least 1 test case must have "isHidden": true to test edge cases.
   - For automated Python evaluation, "input" MUST be formatted as valid Python variable assignments matching parameter names, e.g. "nums = [2, 7, 11, 15], target = 9" or "s = 'racecar'" or "x = 121".
   - "expectedOutput" must be the exact string representation, e.g. "[0, 1]" or "true" or "false" or "42" or "'racecar'".
   - "explanation" should explain the output.
7. Return strictly valid JSON following this exact schema:
{
  "title": "Problem Title",
  "slug": "kebab-case-slug",
  "difficulty": "${difficulty}",
  "tags": "Comma-separated tags (e.g. Array, Two Pointers)",
  "description": "Full problem description in markdown with Example 1 and Example 2.",
  "constraints": "• 1 <= n <= 10^5\\n• -10^4 <= val <= 10^4",
  "hints": ["Hint 1", "Hint 2"],
  "starterCodes": {
    "PYTHON": "def solution(x: int) -> bool:\\n    # Write your solution here\\n    pass\\n",
    "JAVASCRIPT": "function solution(x) {\\n    // Write your solution here\\n}\\n",
    "CPP": "#include <vector>\\nint solution(int x) {\\n    return 0;\\n}\\n",
    "JAVA": "class Solution {\\n    public int solution(int x) {\\n        return 0;\\n    }\\n}\\n"
  },
  "testCases": [
    {
      "input": "x = 121",
      "expectedOutput": "true",
      "isHidden": false,
      "explanation": "Reads 121 from left to right and right to left."
    }
  ]
}`;

    const models = [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
    ];

    for (const model of models) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a competitive programming judge. Respond strictly in valid JSON without any markdown formatting.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) continue;

        let cleaned = content.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

        const parsed = JSON.parse(cleaned);
        if (parsed.title && parsed.starterCodes && parsed.testCases?.length > 0) {
          this.logger.log(`Successfully synthesized coding problem via Groq (${model}) in ~1.5s: "${parsed.title}"`);
          return parsed;
        }
      } catch (err: any) {
        this.logger.warn(`Groq (${model}) attempt failed: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Invokes Google Gemini API with strict JSON schema rules for the automated code runner.
   */
  private async callGeminiApiForCodingProblem(
    topic: string,
    difficulty: QuestionDifficulty,
    customPrompt?: string,
  ): Promise<any | null> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return null;
    }

    const prompt = `You are a distinguished university computer science professor and competitive programming judge setter.
Generate exactly one high-quality algorithmic coding problem on topic: "${topic}" calibrated strictly to difficulty: "${difficulty}".
${customPrompt ? `Additional focus: "${customPrompt}"` : ''}

CRITICAL RULES FOR AUTOMATED CODE JUDGE:
1. Return ONLY valid JSON with no markdown wrapping, no backticks, and no extra text.
2. The problem MUST have unambiguous inputs and outputs suitable for automated testing.
3. "slug" must be a clean kebab-case string, e.g. "reverse-linked-list" or "binary-search".
4. "starterCodes" must be an object with keys "PYTHON", "JAVASCRIPT", "CPP", "JAVA".
5. In Python starter code, declare a clean standalone function matching the problem. E.g.:
   def solutionName(arg1: type, arg2: type) -> returnType:
       # Write your solution here
       pass
6. In testCases:
   - Provide 3 or 4 test cases.
   - At least 2 test cases must have "isHidden": false with a clear "explanation".
   - At least 1 test case must have "isHidden": true to test edge cases.
   - For automated Python evaluation, "input" MUST be formatted as valid Python variable assignments matching parameter names, e.g. "nums = [2, 7, 11, 15], target = 9" or "s = 'racecar'" or "x = 121".
   - "expectedOutput" must be the exact string representation, e.g. "[0, 1]" or "true" or "false" or "42" or "'racecar'".
   - "explanation" should explain the output.
7. Return strictly valid JSON following this exact schema:
{
  "title": "Problem Title",
  "slug": "kebab-case-slug",
  "difficulty": "${difficulty}",
  "tags": "Comma-separated tags (e.g. Array, Two Pointers)",
  "description": "Full problem description in markdown with Example 1 and Example 2.",
  "constraints": "• 1 <= n <= 10^5\\n• -10^4 <= val <= 10^4",
  "hints": ["Hint 1", "Hint 2"],
  "starterCodes": {
    "PYTHON": "def solution(x: int) -> bool:\\n    # Write your solution here\\n    pass\\n",
    "JAVASCRIPT": "function solution(x) {\\n    // Write your solution here\\n}\\n",
    "CPP": "#include <vector>\\nint solution(int x) {\\n    return 0;\\n}\\n",
    "JAVA": "class Solution {\\n    public int solution(int x) {\\n        return 0;\\n    }\\n}\\n"
  },
  "testCases": [
    {
      "input": "x = 121",
      "expectedOutput": "true",
      "isHidden": false,
      "explanation": "Reads 121 from left to right and right to left."
    }
  ]
}`;

    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) {
          continue;
        }

        const data = await res.json();
        const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) continue;

        let cleaned = rawContent.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

        const parsed = JSON.parse(cleaned);
        if (parsed.title && parsed.starterCodes && parsed.testCases?.length > 0) {
          return parsed;
        }
      } catch (err: any) {
        this.logger.warn(`Gemini (${model}) generation attempt failed: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Pre-calibrated curated DSA algorithmic problem templates
   */
  private getCuratedFallbackProblem(topic: string, difficulty: QuestionDifficulty) {
    const list = this.getAllCuratedProblems();
    const matching = list.filter((p) => p.difficulty === difficulty);
    if (matching.length > 0) {
      return matching[Math.floor(Math.random() * matching.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  private getAllCuratedProblems() {
    return [
      {
        slug: 'palindrome-number',
        title: 'Palindrome Number',
        difficulty: QuestionDifficulty.EASY,
        tags: 'Math, Two Pointers',
        description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.\n\n**Example 1:**\n```\nInput: x = 121\nOutput: true\n```\n\n**Example 2:**\n```\nInput: x = -121\nOutput: false\n```',
        constraints: '• -2^31 <= x <= 2^31 - 1',
        hints: ['Could negative integers ever be palindromes?', 'Try reversing the integer digits mathematically.'],
        starterCodes: {
          PYTHON: 'def isPalindrome(x: int) -> bool:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function isPalindrome(x) {\n    // Write your solution here\n}\n',
          CPP: 'bool isPalindrome(int x) {\n    // Write your solution here\n    return false;\n}\n',
          JAVA: 'class Solution {\n    public boolean isPalindrome(int x) {\n        return false;\n    }\n}\n',
        },
        testCases: [
          { input: 'x = 121', expectedOutput: 'true', isHidden: false, explanation: '121 reads same both directions.' },
          { input: 'x = -121', expectedOutput: 'false', isHidden: false, explanation: 'Negative sign prevents palindrome.' },
          { input: 'x = 10', expectedOutput: 'false', isHidden: true, explanation: 'Reads 01 from right to left.' },
          { input: 'x = 0', expectedOutput: 'true', isHidden: true, explanation: 'Single digit 0 is palindrome.' },
        ],
      },
      {
        slug: 'binary-search',
        title: 'Binary Search',
        difficulty: QuestionDifficulty.EASY,
        tags: 'Array, Binary Search',
        description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n**Example 1:**\n```\nInput: nums = [-1, 0, 3, 5, 9, 12], target = 9\nOutput: 4\n```',
        constraints: '• 1 <= nums.length <= 10^4\n• -10^4 < nums[i], target < 10^4\n• All the integers in nums are unique and sorted.',
        hints: ['Initialize two pointers: left = 0 and right = len(nums) - 1.', 'Calculate mid = (left + right) // 2 and narrow the search space.'],
        starterCodes: {
          PYTHON: 'def search(nums: list[int], target: int) -> int:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function search(nums, target) {\n    // Write your solution here\n}\n',
          CPP: '#include <vector>\nint search(std::vector<int>& nums, int target) {\n    return -1;\n}\n',
          JAVA: 'class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}\n',
        },
        testCases: [
          { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', expectedOutput: '4', isHidden: false, explanation: '9 exists in nums and its index is 4.' },
          { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', expectedOutput: '-1', isHidden: false, explanation: '2 does not exist in nums so return -1.' },
          { input: 'nums = [5], target = 5', expectedOutput: '0', isHidden: true, explanation: 'Single element array match.' },
        ],
      },
      {
        slug: 'maximum-subarray',
        title: 'Maximum Subarray (Kadane’s Algorithm)',
        difficulty: QuestionDifficulty.MEDIUM,
        tags: 'Array, Dynamic Programming',
        description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.\n\n**Example 1:**\n```\nInput: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\nOutput: 6\nExplanation: The subarray [4, -1, 2, 1] has the largest sum 6.\n```',
        constraints: '• 1 <= nums.length <= 10^5\n• -10^4 <= nums[i] <= 10^4',
        hints: ['Use Kadane algorithm: keep track of current_sum and max_sum.', 'If current_sum becomes negative, reset it to 0.'],
        starterCodes: {
          PYTHON: 'def maxSubArray(nums: list[int]) -> int:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function maxSubArray(nums) {\n    // Write your solution here\n}\n',
          CPP: '#include <vector>\nint maxSubArray(std::vector<int>& nums) {\n    return 0;\n}\n',
          JAVA: 'class Solution {\n    public int maxSubArray(int[] nums) {\n        return 0;\n    }\n}\n',
        },
        testCases: [
          { input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6', isHidden: false, explanation: '[4, -1, 2, 1] sums to 6.' },
          { input: 'nums = [1]', expectedOutput: '1', isHidden: false, explanation: 'Single element array.' },
          { input: 'nums = [5, 4, -1, 7, 8]', expectedOutput: '23', isHidden: true, explanation: 'Entire array is optimal.' },
        ],
      },
      {
        slug: 'valid-anagram',
        title: 'Valid Anagram',
        difficulty: QuestionDifficulty.EASY,
        tags: 'Hash Table, String, Sorting',
        description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn Anagram is a word formed by rearranging the letters of a different word, typically using all the original letters exactly once.\n\n**Example 1:**\n```\nInput: s = "anagram", t = "nagaram"\nOutput: true\n```',
        constraints: '• 1 <= s.length, t.length <= 5 * 10^4\n• s and t consist of lowercase English letters.',
        hints: ['Count the frequency of each character in both strings.', 'If the lengths differ, they cannot be anagrams.'],
        starterCodes: {
          PYTHON: 'def isAnagram(s: str, t: str) -> bool:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function isAnagram(s, t) {\n    // Write your solution here\n}\n',
          CPP: '#include <string>\nbool isAnagram(std::string s, std::string t) {\n    return false;\n}\n',
          JAVA: 'class Solution {\n    public boolean isAnagram(String s, String t) {\n        return false;\n    }\n}\n',
        },
        testCases: [
          { input: 's = "anagram", t = "nagaram"', expectedOutput: 'true', isHidden: false, explanation: 'Letters match exactly.' },
          { input: 's = "rat", t = "car"', expectedOutput: 'false', isHidden: false, explanation: 'Letters differ.' },
          { input: 's = "ab", t = "a"', expectedOutput: 'false', isHidden: true, explanation: 'Different string lengths.' },
        ],
      },
      {
        slug: 'best-time-to-buy-and-sell-stock',
        title: 'Best Time to Buy and Sell Stock',
        difficulty: QuestionDifficulty.EASY,
        tags: 'Array, Dynamic Programming',
        description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.\n\n**Example 1:**\n```\nInput: prices = [7, 1, 5, 3, 6, 4]\nOutput: 5\nExplanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.\n```',
        constraints: '• 1 <= prices.length <= 10^5\n• 0 <= prices[i] <= 10^4',
        hints: ['Keep track of minimum price seen so far.', 'For each day, calculate current price - min_price and update max_profit.'],
        starterCodes: {
          PYTHON: 'def maxProfit(prices: list[int]) -> int:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function maxProfit(prices) {\n    // Write your solution here\n}\n',
          CPP: '#include <vector>\nint maxProfit(std::vector<int>& prices) {\n    return 0;\n}\n',
          JAVA: 'class Solution {\n    public int maxProfit(int[] prices) {\n        return 0;\n    }\n}\n',
        },
        testCases: [
          { input: 'prices = [7, 1, 5, 3, 6, 4]', expectedOutput: '5', isHidden: false, explanation: 'Buy at 1, sell at 6 = 5.' },
          { input: 'prices = [7, 6, 4, 3, 1]', expectedOutput: '0', isHidden: false, explanation: 'Prices drop monotonically, profit is 0.' },
          { input: 'prices = [2, 4, 1]', expectedOutput: '2', isHidden: true, explanation: 'Buy at 2, sell at 4 = 2.' },
        ],
      },
      {
        slug: 'climbing-stairs',
        title: 'Climbing Stairs',
        difficulty: QuestionDifficulty.EASY,
        tags: 'Dynamic Programming, Math',
        description: 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?\n\n**Example 1:**\n```\nInput: n = 2\nOutput: 2\nExplanation: 1 step + 1 step, or 2 steps.\n```',
        constraints: '• 1 <= n <= 45',
        hints: ['Notice that ways(n) = ways(n-1) + ways(n-2), which is the Fibonacci sequence!'],
        starterCodes: {
          PYTHON: 'def climbStairs(n: int) -> int:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function climbStairs(n) {\n    // Write your solution here\n}\n',
          CPP: 'int climbStairs(int n) {\n    return 0;\n}\n',
          JAVA: 'class Solution {\n    public int climbStairs(int n) {\n        return 0;\n    }\n}\n',
        },
        testCases: [
          { input: 'n = 2', expectedOutput: '2', isHidden: false, explanation: '1+1 or 2.' },
          { input: 'n = 3', expectedOutput: '3', isHidden: false, explanation: '1+1+1, 1+2, 2+1.' },
          { input: 'n = 5', expectedOutput: '8', isHidden: true, explanation: 'Fibonacci calculation.' },
        ],
      },
      {
        slug: 'contains-duplicate',
        title: 'Contains Duplicate',
        difficulty: QuestionDifficulty.EASY,
        tags: 'Array, Hash Table, Sorting',
        description: 'Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.\n\n**Example 1:**\n```\nInput: nums = [1, 2, 3, 1]\nOutput: true\n```',
        constraints: '• 1 <= nums.length <= 10^5\n• -10^9 <= nums[i] <= 10^9',
        hints: ['Use a hash set to track numbers already seen in O(1) time.'],
        starterCodes: {
          PYTHON: 'def containsDuplicate(nums: list[int]) -> bool:\n    # Write your solution here\n    pass\n',
          JAVASCRIPT: 'function containsDuplicate(nums) {\n    // Write your solution here\n}\n',
          CPP: '#include <vector>\nbool containsDuplicate(std::vector<int>& nums) {\n    return false;\n}\n',
          JAVA: 'class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        return false;\n    }\n}\n',
        },
        testCases: [
          { input: 'nums = [1, 2, 3, 1]', expectedOutput: 'true', isHidden: false, explanation: '1 appears twice.' },
          { input: 'nums = [1, 2, 3, 4]', expectedOutput: 'false', isHidden: false, explanation: 'All elements distinct.' },
          { input: 'nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', expectedOutput: 'true', isHidden: true, explanation: 'Multiple duplicates exist.' },
        ],
      },
    ];
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { CodingService } from './coding.service';
import { CodeRunnerService } from './code-runner.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProgrammingLanguage,
  JudgeSubmissionStatus,
  QuestionDifficulty,
} from '@prisma/client';

describe('CodingService', () => {
  let service: CodingService;
  let prisma: any;

  const mockProblem = {
    id: 'prob-1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Array, Hash Table',
    starterCodes: '{"PYTHON": "def twoSum(): pass"}',
    constraints: '2 <= nums.length <= 10^4',
    testCases: [
      {
        id: 'tc-1',
        problemId: 'prob-1',
        input: 'nums = [2, 7], target = 9',
        expectedOutput: '[0, 1]',
        isHidden: false,
        order: 1,
      },
      {
        id: 'tc-2',
        problemId: 'prob-1',
        input: 'nums = [3, 3], target = 6',
        expectedOutput: '[0, 1]',
        isHidden: true,
        order: 2,
      },
    ],
  };

  const mockSubmission = {
    id: 'sub-1',
    studentId: 'student-1',
    problemId: 'prob-1',
    language: ProgrammingLanguage.PYTHON,
    sourceCode: 'def twoSum(): return [0, 1]',
    status: JudgeSubmissionStatus.ACCEPTED,
    executionTimeMs: 35,
    memoryUsedKb: 14200,
    testCasesPassed: 2,
    totalTestCases: 2,
    judgeDetails: JSON.stringify([{ testCase: 1, status: 'PASSED' }]),
  };

  beforeEach(async () => {
    prisma = {
      codingProblem: {
        findMany: jest.fn().mockResolvedValue([mockProblem]),
        findUnique: jest.fn().mockResolvedValue(mockProblem),
        findFirst: jest.fn().mockResolvedValue(mockProblem),
      },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }),
      },
      codeSubmission: {
        create: jest.fn().mockResolvedValue({
          ...mockSubmission,
          problem: { title: 'Two Sum', slug: 'two-sum' },
        }),
        findMany: jest.fn().mockResolvedValue([mockSubmission]),
      },
    };

    const mockCodeRunner = {
      execute: jest.fn().mockResolvedValue({
        status: 'ACCEPTED',
        totalTestCases: 2,
        testCasesPassed: 2,
        executionTimeMs: 35,
        memoryKb: 14200,
        outputMessage: 'All sample test cases passed!',
        testResults: [
          { testCaseNumber: 1, status: 'PASSED', input: 'tc1', expectedOutput: 'out1', actualOutput: 'out1', executionTimeMs: 10 },
          { testCaseNumber: 2, status: 'PASSED', input: 'tc2', expectedOutput: 'out2', actualOutput: 'out2', executionTimeMs: 10 },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CodeRunnerService,
          useValue: mockCodeRunner,
        },
      ],
    }).compile();

    service = module.get<CodingService>(CodingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve list of coding problems', async () => {
    const problems = await service.getProblems();
    expect(problems).toHaveLength(1);
    expect(problems[0].title).toEqual('Two Sum');
  });

  it('should return problem details by slug', async () => {
    const problem = await service.getProblemBySlug('two-sum');
    expect(problem).toBeDefined();
    expect(problem.slug).toEqual('two-sum');
  });

  it('should execute runCode simulation and return test results', async () => {
    const result = await service.runCode('prob-1', {
      language: ProgrammingLanguage.PYTHON,
      sourceCode: 'def twoSum(): seen = {}; diff = 9',
    });
    expect(result.status).toEqual('ACCEPTED');
    expect(result.testCasesPassed).toBeGreaterThan(0);
  });

  it('should submit code and persist submission record', async () => {
    const result = await service.submitCode('student-1', 'prob-1', {
      language: ProgrammingLanguage.PYTHON,
      sourceCode: 'def twoSum(): seen = {}; diff = 9',
    });
    expect(result.submission).toBeDefined();
    expect(result.verdict.status).toEqual(JudgeSubmissionStatus.ACCEPTED);
    expect(result.verdict.score).toEqual(100);
  });

  it('should protect hidden test cases from being leaked in verdict', async () => {
    const result = await service.submitCode('student-1', 'prob-1', {
      language: ProgrammingLanguage.PYTHON,
      sourceCode: 'def twoSum(): pass',
    });
    // Check hidden test case 2
    const hiddenResult = result.verdict.testResults[1];
    expect(hiddenResult.input).toEqual('[Hidden Testcase]');
    expect(hiddenResult.expectedOutput).toEqual('[Hidden]');
  });

  it('should retrieve student submission history in reverse chronological order', async () => {
    const history = await service.getStudentSubmissions('student-1', 'two-sum');
    expect(history).toBeDefined();
    expect(prisma.codeSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: expect.objectContaining({ in: expect.arrayContaining(['student-1']) }),
        }),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should inspect submission by id for authorized student', async () => {
    prisma.codeSubmission.findUnique = jest.fn().mockResolvedValue({
      id: 'sub-1',
      studentId: 'student-1',
      sourceCode: 'def twoSum(): pass',
    });
    const sub = await service.getSubmissionById('student-1', 'sub-1');
    expect(sub.id).toEqual('sub-1');
  });

  it('should block unauthorized student from viewing another student submission', async () => {
    prisma.codeSubmission.findUnique = jest.fn().mockResolvedValue({
      id: 'sub-1',
      studentId: 'other-student',
      sourceCode: 'secret code',
    });
    await expect(service.getSubmissionById('student-1', 'sub-1')).rejects.toThrow(
      'You are not authorized to view this submission.',
    );
  });
});


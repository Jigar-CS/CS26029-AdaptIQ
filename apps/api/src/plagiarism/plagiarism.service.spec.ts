import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismService } from './plagiarism.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PlagiarismScanStatus,
  PlagiarismVerdict,
  QuestionDifficulty,
  UserRole,
} from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PlagiarismService', () => {
  let service: PlagiarismService;
  let prisma: any;

  const mockFacultyUser = {
    id: 'user-faculty-1',
    role: UserRole.FACULTY,
    facultyProfile: {
      id: 'fac-1',
      userId: 'user-faculty-1',
      departmentId: 'dept-cse',
      courseId: 'course-cs301',
      course: { id: 'course-cs301', code: 'CS301' },
    },
  };

  const mockUnauthorizedFacultyUser = {
    id: 'user-faculty-2',
    role: UserRole.FACULTY,
    facultyProfile: {
      id: 'fac-2',
      userId: 'user-faculty-2',
      departmentId: 'dept-me',
      courseId: 'course-me101',
      course: { id: 'course-me101', code: 'ME101' },
    },
  };

  const mockProblem = {
    id: 'prob-kadane',
    slug: 'maximum-subarray',
    title: 'Maximum Subarray (Kadane)',
    difficulty: QuestionDifficulty.MEDIUM,
    courseId: 'course-cs301',
    starterCodes: JSON.stringify({
      PYTHON: 'def maxSubArray(nums: list[int]) -> int:\n    return 0\n',
    }),
  };

  const codePatel = `
def maxSubArray(nums: list[int]) -> int:
    max_so_far = nums[0]
    current_max = nums[0]
    for i in range(1, len(nums)):
        current_max = max(nums[i], current_max + nums[i])
        max_so_far = max(max_so_far, current_max)
    return max_so_far
`;

  // Near duplicate with renamed variables and altered comments
  const codeShah = `
# Optimal Kadane dynamic approach
def maxSubArray(nums: list[int]) -> int:
    highest = nums[0]
    running_total = nums[0]
    for idx in range(1, len(nums)):
        running_total = max(nums[idx], running_total + nums[idx])
        highest = max(highest, running_total)
    return highest
`;

  // Identical to Patel
  const codeMehta = codePatel;

  // Unrelated algorithm (iterative dp array)
  const codeJoshi = `
def maxSubArray(nums: list[int]) -> int:
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    ans = dp[0]
    k = 1
    while k < n:
        if dp[k - 1] > 0:
            dp[k] = nums[k] + dp[k - 1]
        else:
            dp[k] = nums[k]
        if dp[k] > ans:
            ans = dp[k]
        k += 1
    return ans
`;

  // Boilerplate template only
  const codeBoilerplate = `
def maxSubArray(nums: list[int]) -> int:
    return 0
`;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
          if (id === 'user-faculty-1') return Promise.resolve(mockFacultyUser);
          if (id === 'user-faculty-2') return Promise.resolve(mockUnauthorizedFacultyUser);
          return Promise.resolve(null);
        }),
      },
      course: {
        findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
          if (id === 'course-cs301') {
            return Promise.resolve({
              id: 'course-cs301',
              code: 'CS301',
              departmentId: 'dept-cse',
            });
          }
          return Promise.resolve(null);
        }),
      },
      codingProblem: {
        findUnique: jest.fn().mockResolvedValue(mockProblem),
      },
      codeSubmission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            studentId: 'student-1',
            problemId: 'prob-kadane',
            sourceCode: codePatel,
            student: {
              authorizedStudent: { name: 'Rahul Patel', enrollmentNumber: '24CS001', division: 'CS Div 1' },
              user: { email: '24cs001@charusat.edu.in' },
            },
          },
          {
            id: 'sub-2',
            studentId: 'student-2',
            problemId: 'prob-kadane',
            sourceCode: codeShah,
            student: {
              authorizedStudent: { name: 'Dhruv Shah', enrollmentNumber: '24CS002', division: 'CS Div 1' },
              user: { email: '24cs002@charusat.edu.in' },
            },
          },
        ]),
        count: jest.fn().mockResolvedValue(2),
      },
      assessment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'exam-1',
            title: 'Mid-Sem Exam',
            code: 'CS301-EXAM',
            course: { id: 'course-cs301', code: 'CS301', name: 'DSA' },
            questions: [
              {
                question: {
                  id: 'q-code',
                  type: 'CODING',
                  explanation: JSON.stringify({ codingProblemId: 'prob-kadane' }),
                },
              },
            ],
            submissions: [{ studentId: 'student-1' }],
            createdAt: new Date(),
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'exam-1',
          title: 'Mid-Sem Exam',
          courseId: 'course-cs301',
          questions: [
            {
              question: {
                id: 'q-code',
                type: 'CODING',
                explanation: JSON.stringify({ codingProblemId: 'prob-kadane' }),
              },
            },
          ],
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      plagiarismScan: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'scan-1', ...data }),
        ),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'scan-1',
            status: PlagiarismScanStatus.COMPLETED,
            problem: mockProblem,
            totalSubmissionsScanned: 2,
            matches: [],
            ...data,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([
          { id: 'scan-1', problem: mockProblem, _count: { matches: 1 } },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'scan-1',
          problem: mockProblem,
          matches: [],
        }),
      },
      plagiarismMatch: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'match-1',
          scan: { problem: mockProblem },
          verdict: PlagiarismVerdict.FLAGGED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'match-1',
            verdict: data.verdict,
            facultyNotes: data.facultyNotes,
          }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlagiarismService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PlagiarismService>(PlagiarismService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compareSubmissions (Genuine Algorithm Tests)', () => {
    it('should detect 100% exact verbatim match', () => {
      const res = service.compareSubmissions(codePatel, codeMehta, 65.0);
      expect(res.similarityScore).toBe(100.0);
      expect(res.verdict).toBe(PlagiarismVerdict.FLAGGED);
      expect(res.matchingSpans[0].matchType).toBe('EXACT_CLONE');
      expect(res.matchedTokensCount).toBeGreaterThan(20);
    });

    it('should detect high structural similarity (>85%) on variable renaming (near-duplicate)', () => {
      const res = service.compareSubmissions(codePatel, codeShah, 65.0);
      expect(res.similarityScore).toBeGreaterThanOrEqual(85.0);
      expect(res.verdict).toBe(PlagiarismVerdict.FLAGGED);
      expect(res.matchingSpans.length).toBeGreaterThan(0);
      expect(res.matchingSpans[0].matchType).toBe('STRUCTURAL_CLONE');
    });

    it('should clear unrelated algorithms with low similarity score (<40%)', () => {
      const res = service.compareSubmissions(codePatel, codeJoshi, 65.0);
      expect(res.similarityScore).toBeLessThan(40.0);
      expect(res.verdict).toBe(PlagiarismVerdict.CLEARED);
    });

    it('should return 0% and clear boilerplate-only template submissions', () => {
      const res = service.compareSubmissions(
        codeBoilerplate,
        codeBoilerplate,
        65.0,
        mockProblem.starterCodes,
      );
      expect(res.similarityScore).toBe(0.0);
      expect(res.verdict).toBe(PlagiarismVerdict.CLEARED);
      expect(res.summary).toContain('starter boilerplate template');
    });

    it('should handle empty submissions safely without error', () => {
      const res = service.compareSubmissions('', codePatel, 65.0);
      expect(res.similarityScore).toBe(0.0);
      expect(res.verdict).toBe(PlagiarismVerdict.CLEARED);
      expect(res.matchingSpans).toHaveLength(0);
    });
  });

  describe('startScan and Reference Corpus Validation', () => {
    it('should successfully run scan on authorized coding problem', async () => {
      const scan = await service.startScan(
        { problemId: 'prob-kadane', threshold: 70.0 },
        'user-faculty-1',
      );
      expect(scan).toBeDefined();
      expect(scan.status).toBe(PlagiarismScanStatus.COMPLETED);
      expect(scan.totalSubmissionsScanned).toBe(2);
    });

    it('should reject scan when reference corpus has < 2 submissions', async () => {
      prisma.codeSubmission.findMany.mockResolvedValueOnce([
        {
          id: 'sub-single',
          studentId: 'student-1',
          sourceCode: codePatel,
          student: {},
        },
      ]);

      await expect(
        service.startScan({ problemId: 'prob-kadane' }, 'user-faculty-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject scan when unauthorized faculty attempts access', async () => {
      await expect(
        service.startScan({ problemId: 'prob-kadane' }, 'user-faculty-2'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCodingAssessments', () => {
    it('should only return assessments containing coding questions', async () => {
      const list = await service.getCodingAssessments('user-faculty-1');
      expect(list).toHaveLength(1);
      expect(list[0].codingQuestionsCount).toBe(1);
      expect(list[0].id).toBe('exam-1');
    });
  });

  describe('updateMatchVerdict', () => {
    it('should update match verdict with audit note', async () => {
      const updated = await service.updateMatchVerdict('match-1', 'user-faculty-1', {
        verdict: PlagiarismVerdict.PENALIZED,
        facultyNotes: 'Confirmed assignment code cloning.',
      });
      expect(updated.verdict).toBe(PlagiarismVerdict.PENALIZED);
      expect(updated.facultyNotes).toBe('Confirmed assignment code cloning.');
    });
  });
});

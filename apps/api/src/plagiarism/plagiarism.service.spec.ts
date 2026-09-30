import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismService } from './plagiarism.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PlagiarismScanStatus,
  PlagiarismVerdict,
  QuestionDifficulty,
} from '@prisma/client';

describe('PlagiarismService', () => {
  let service: PlagiarismService;
  let prisma: any;

  const mockProblem = {
    id: 'prob-1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: QuestionDifficulty.EASY,
  };

  const mockScan = {
    id: 'scan-1',
    problemId: 'prob-1',
    threshold: 70.0,
    status: PlagiarismScanStatus.COMPLETED,
    totalSubmissionsScanned: 2,
    flaggedPairsCount: 1,
    matches: [
      {
        id: 'match-1',
        similarityScore: 88.5,
        verdict: PlagiarismVerdict.FLAGGED,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      codingProblem: {
        findUnique: jest.fn().mockResolvedValue(mockProblem),
      },
      codeSubmission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            studentId: 'student-1',
            sourceCode: 'def twoSum(): seen = {}; return []',
          },
          {
            id: 'sub-2',
            studentId: 'student-2',
            sourceCode: 'def twoSum(): lookup = {}; return []',
          },
        ]),
      },
      plagiarismScan: {
        create: jest.fn().mockResolvedValue({ id: 'scan-1' }),
        update: jest.fn().mockResolvedValue(mockScan),
        findMany: jest.fn().mockResolvedValue([mockScan]),
        findUnique: jest.fn().mockResolvedValue(mockScan),
      },
      plagiarismMatch: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'match-1',
          verdict: PlagiarismVerdict.FLAGGED,
        }),
        update: jest.fn().mockResolvedValue({
          id: 'match-1',
          verdict: PlagiarismVerdict.PENALIZED,
        }),
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

  it('should trigger pairwise AST winnowing scan and flag suspicious clones', async () => {
    const scan = await service.startScan({ problemId: 'prob-1', threshold: 70.0 });
    expect(scan).toBeDefined();
    expect(scan.status).toEqual(PlagiarismScanStatus.COMPLETED);
    expect(scan.flaggedPairsCount).toBeGreaterThan(0);
  });

  it('should retrieve scans for a problem', async () => {
    const scans = await service.getScans('prob-1');
    expect(scans).toHaveLength(1);
    expect(scans[0].id).toEqual('scan-1');
  });

  it('should update match review verdict', async () => {
    const updated = await service.updateMatchVerdict('match-1', {
      verdict: PlagiarismVerdict.PENALIZED,
      facultyNotes: 'Confirmed assignment unauthorized sharing.',
    });
    expect(updated.verdict).toEqual(PlagiarismVerdict.PENALIZED);
  });
});

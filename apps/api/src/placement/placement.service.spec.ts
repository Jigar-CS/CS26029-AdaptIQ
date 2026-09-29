import { Test, TestingModule } from '@nestjs/testing';
import { PlacementService } from './placement.service';
import { PrismaService } from '../prisma/prisma.service';
import { CareerRoleType } from '@prisma/client';

describe('PlacementService', () => {
  let service: PlacementService;
  let prisma: any;

  const mockBenchmark = {
    id: 'bench-1',
    roleType: CareerRoleType.SDE,
    title: 'Software Development Engineer',
    description: 'Core software engineering role focusing on DSA, OOP, and system design.',
    targetMastery: 80.0,
    requiredSkills: JSON.stringify([
      { topicName: 'Data Structures & Algorithms', minMastery: 85.0 },
      { topicName: 'System Design', minMastery: 70.0 },
      { topicName: 'Database Systems & SQL', minMastery: 75.0 },
    ]),
    salaryRange: '₹14 - ₹28 LPA',
    hiringPartners: 'Google, Microsoft, Amazon',
    active: true,
  };

  const mockProfile = {
    id: 'profile-1',
    studentId: 'student-1',
    targetRole: CareerRoleType.SDE,
    overallReadinessScore: 72.5,
    verifiedSkillsCount: 1,
    skillGapsCount: 2,
    lastAssessedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      careerRoleBenchmark: {
        findMany: jest.fn().mockResolvedValue([mockBenchmark]),
        findUnique: jest.fn().mockResolvedValue(mockBenchmark),
      },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }),
      },
      studentPlacementProfile: {
        findUnique: jest.fn().mockResolvedValue(mockProfile),
        create: jest.fn().mockResolvedValue(mockProfile),
        upsert: jest.fn().mockResolvedValue(mockProfile),
      },
      skillMastery: {
        findMany: jest.fn().mockResolvedValue([
          {
            studentId: 'student-1',
            masteryScore: 88.0,
            topic: { name: 'Data Structures & Algorithms' },
          },
          {
            studentId: 'student-1',
            masteryScore: 55.0,
            topic: { name: 'System Design' },
          },
        ]),
      },
      placementMockExam: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'mock-1',
            title: 'SDE Core Technical Benchmark Assessment',
            roleType: CareerRoleType.SDE,
            companyProfile: 'Google Tier-1',
            difficulty: 'HARD',
            durationMinutes: 90,
            totalQuestions: 30,
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacementService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PlacementService>(PlacementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return career benchmarks', async () => {
    const benchmarks = await service.getBenchmarks();
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0].roleType).toEqual(CareerRoleType.SDE);
  });

  it('should evaluate student readiness against role benchmarks and produce roadmap', async () => {
    const result = await service.evaluateStudentReadiness('student-1', CareerRoleType.SDE);
    expect(result).toBeDefined();
    expect(result.roleTitle).toEqual('Software Development Engineer');
    expect(result.readinessScore).toBeGreaterThan(0);
    expect(result.hiringBarStatus).toBeDefined();
    expect(result.personalizedRoadmap.length).toBeGreaterThan(0);
  });

  it('should retrieve active placement mock exams', async () => {
    const exams = await service.getMockExams(CareerRoleType.SDE);
    expect(exams).toHaveLength(1);
    expect(exams[0].title).toContain('SDE Core Technical');
  });
});

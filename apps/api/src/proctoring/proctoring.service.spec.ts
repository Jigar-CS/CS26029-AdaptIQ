import { Test, TestingModule } from '@nestjs/testing';
import { ProctoringService } from './proctoring.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProctoringSessionStatus,
  ProctoringViolationType,
  IntegrityFlagSeverity,
} from '@prisma/client';

describe('ProctoringService', () => {
  let service: ProctoringService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      proctoringSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-1',
          submissionId: 'sub-1',
          studentId: 'student-1',
          status: ProctoringSessionStatus.IN_PROGRESS,
          faceEnrollmentVerified: true,
          trustScore: 100.0,
          violationsCount: 0,
        }),
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'session-1',
            ...args.data,
            violations: [],
          }),
        ),
        update: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: args.where.id,
            ...args.data,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'session-1',
            trustScore: 85.0,
            status: ProctoringSessionStatus.IN_PROGRESS,
          },
        ]),
      },
      proctoringViolation: {
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'violation-1',
            ...args.data,
          }),
        ),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProctoringService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProctoringService>(ProctoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify face enrollment on session start', async () => {
    const updated = await service.verifyFaceEnrollment('session-1');
    expect(updated.faceEnrollmentVerified).toBe(true);
    expect(updated.status).toBe(ProctoringSessionStatus.IN_PROGRESS);
  });

  it('should log a violation and deduct trust score accordingly', async () => {
    const res = await service.logViolation('session-1', {
      type: ProctoringViolationType.TAB_SWITCH,
      severity: IntegrityFlagSeverity.HIGH,
      confidence: 0.98,
      details: 'Browser blur detected',
    });

    // HIGH severity penalty = 20.0
    expect(res.session.trustScore).toBe(80.0);
    expect(res.session.violationsCount).toBe(1);
    expect(res.violation.type).toBe(ProctoringViolationType.TAB_SWITCH);
  });

  it('should submit invigilator review decision and update status', async () => {
    const reviewed = await service.submitInvigilatorReview(
      'session-1',
      'APPROVED',
      'Confirmed false positive tab change',
    );
    expect(reviewed.status).toBe(ProctoringSessionStatus.COMPLETED);
    expect(reviewed.invigilatorNotes).toBe('Confirmed false positive tab change');
  });
});

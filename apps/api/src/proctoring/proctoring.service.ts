import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProctoringSessionStatus,
  ProctoringViolationType,
  IntegrityFlagSeverity,
} from '@prisma/client';

export interface LogViolationDto {
  type: ProctoringViolationType;
  severity: IntegrityFlagSeverity;
  confidence?: number;
  details?: string;
}

@Injectable()
export class ProctoringService {
  private readonly logger = new Logger('ProctoringService');

  // Severity penalty deductions for trust score calculation
  private readonly penaltyMap: Record<IntegrityFlagSeverity, number> = {
    LOW: 5.0,
    MEDIUM: 10.0,
    HIGH: 20.0,
    SEVERE: 35.0,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes or fetches a proctoring session for an active assessment submission.
   */
  async startOrGetSession(submissionId: string, studentId?: string) {
    let session = await this.prisma.proctoringSession.findFirst({
      where: {
        OR: [{ id: submissionId }, { submissionId }],
      },
      include: { violations: true },
    });

    if (!session) {
      let resolvedStudentId = studentId;
      if (!resolvedStudentId) {
        const sub = await this.prisma.assessmentSubmission.findUnique({
          where: { id: submissionId },
          select: { studentId: true },
        });
        resolvedStudentId = sub?.studentId;
      }
      if (!resolvedStudentId) {
        throw new BadRequestException('Student ID is required to initialize proctoring session.');
      }
      session = await this.prisma.proctoringSession.create({
        data: {
          submissionId,
          studentId: resolvedStudentId,
          status: ProctoringSessionStatus.IN_PROGRESS,
          trustScore: 100.0,
          violationsCount: 0,
        },
        include: { violations: true },
      });
    }

    return session;
  }

  /**
   * Completes face enrollment verification at test start (Privacy by Design: no permanent raw biometric storage).
   */
  async verifyFaceEnrollment(sessionId: string) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: {
        OR: [{ id: sessionId }, { submissionId: sessionId }],
      },
    });

    if (!session) {
      throw new NotFoundException(`Proctoring session ${sessionId} not found.`);
    }

    return this.prisma.proctoringSession.update({
      where: { id: session.id },
      data: {
        faceEnrollmentVerified: true,
        enrolledAt: new Date(),
        status:
          session.status === ProctoringSessionStatus.FLAGGED
            ? ProctoringSessionStatus.FLAGGED
            : ProctoringSessionStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * Logs an integrity violation event, updates trust score and auto-flags if score drops below threshold.
   */
  async logViolation(sessionId: string, dto: LogViolationDto) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: {
        OR: [{ id: sessionId }, { submissionId: sessionId }],
      },
    });

    if (!session) {
      throw new NotFoundException(`Proctoring session ${sessionId} not found.`);
    }

    const deduction = this.penaltyMap[dto.severity] || 10.0;
    const newTrustScore = Math.max(0, Math.round((session.trustScore - deduction) * 10) / 10);
    const newCount = session.violationsCount + 1;

    // Automatically elevate status to FLAGGED if trust score drops below 65
    let newStatus = session.status;
    if (newTrustScore < 65 && newStatus === ProctoringSessionStatus.IN_PROGRESS) {
      newStatus = ProctoringSessionStatus.FLAGGED;
    }

    const [updatedSession, violation] = await this.prisma.$transaction([
      this.prisma.proctoringSession.update({
        where: { id: session.id },
        data: {
          trustScore: newTrustScore,
          violationsCount: newCount,
          status: newStatus,
        },
      }),
      this.prisma.proctoringViolation.create({
        data: {
          sessionId: session.id,
          type: dto.type,
          severity: dto.severity,
          confidence: dto.confidence ?? 0.95,
          details: dto.details ?? null,
        },
      }),
    ]);

    return {
      session: updatedSession,
      violation,
    };
  }

  /**
   * Retrieves full proctoring audit log with violations timeline.
   */
  async getSessionDetails(sessionId: string) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: {
        OR: [{ id: sessionId }, { submissionId: sessionId }],
      },
      include: {
        violations: { orderBy: { timestamp: 'asc' } },
        student: {
          include: {
            authorizedStudent: true,
            user: { select: { email: true } },
          },
        },
        submission: {
          include: { assessment: { select: { title: true, code: true } } },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Proctoring session ${sessionId} not found.`);
    }

    return session;
  }

  /**
   * Lists all flagged or under-review proctoring sessions for invigilator console.
   */
  async getInvigilatorSessions(assessmentId?: string) {
    return this.prisma.proctoringSession.findMany({
      where: assessmentId
        ? { submission: { assessmentId } }
        : undefined,
      include: {
        violations: true,
        student: {
          include: {
            authorizedStudent: true,
            user: { select: { email: true } },
          },
        },
        submission: {
          include: { assessment: { select: { title: true, code: true } } },
        },
      },
      orderBy: [
        { trustScore: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Invigilator review action: approve, flag, or invalidate proctored assessment.
   */
  async submitInvigilatorReview(
    sessionId: string,
    decision: 'APPROVED' | 'FLAGGED' | 'INVALIDATED',
    notes: string,
  ) {
    const session = await this.prisma.proctoringSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Proctoring session ${sessionId} not found.`);
    }

    const updatedStatus =
      decision === 'APPROVED'
        ? ProctoringSessionStatus.COMPLETED
        : decision === 'FLAGGED'
        ? ProctoringSessionStatus.FLAGGED
        : ProctoringSessionStatus.INVALIDATED;

    return this.prisma.proctoringSession.update({
      where: { id: sessionId },
      data: {
        status: updatedStatus,
        invigilatorNotes: notes,
      },
    });
  }
}

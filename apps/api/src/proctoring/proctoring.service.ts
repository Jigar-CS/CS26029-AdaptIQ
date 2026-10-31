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
      session = await this.prisma.proctoringSession.upsert({
        where: { submissionId },
        update: {},
        create: {
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
  async verifyFaceEnrollment(
    sessionId: string,
    snapshot?: string,
    matchConfidence?: number,
    matchDetails?: string,
  ) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: {
        OR: [{ id: sessionId }, { submissionId: sessionId }],
      },
    });

    if (!session) {
      throw new NotFoundException(`Proctoring session ${sessionId} not found.`);
    }

    const note = snapshot
      ? `[BIOMETRIC_VERIFIED] Test entry face matched against university database at ${new Date().toISOString()}${
          typeof matchConfidence === 'number' ? ` (Match confidence: ${(matchConfidence * 100).toFixed(1)}%)` : ''
        }${matchDetails ? ` | ${matchDetails}` : ''}`
      : session.invigilatorNotes;

    return this.prisma.proctoringSession.update({
      where: { id: session.id },
      data: {
        faceEnrollmentVerified: true,
        enrolledAt: new Date(),
        invigilatorNotes: note,
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

    const validTypes = Object.values(ProctoringViolationType);
    let normalizedType = dto.type as ProctoringViolationType;
    if (!validTypes.includes(normalizedType)) {
      if (String(dto.type).includes('MOBILE') || String(dto.type).includes('PHONE')) {
        normalizedType = ProctoringViolationType.IDENTITY_MISMATCH;
      } else if (String(dto.type).includes('TAB')) {
        normalizedType = ProctoringViolationType.TAB_SWITCH;
      } else if (String(dto.type).includes('FACE')) {
        normalizedType = ProctoringViolationType.NO_FACE;
      } else {
        normalizedType = ProctoringViolationType.WINDOW_BLUR;
      }
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
          type: normalizedType,
          severity: dto.severity,
          confidence: dto.confidence ?? 0.95,
          details: dto.details ? `[${dto.type}] ${dto.details}` : `[${dto.type}]`,
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
      include: {
        submission: {
          include: {
            assessment: { select: { title: true, code: true } },
          },
        },
      },
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

    const updatedTrustScore =
      decision === 'APPROVED' ? 100.0 : decision === 'INVALIDATED' ? 0.0 : session.trustScore;

    const updatedViolationsCount =
      decision === 'APPROVED' ? 0 : session.violationsCount;

    // When approved, mark all recorded violations as resolved (false positive / cleared)
    if (decision === 'APPROVED') {
      await this.prisma.proctoringViolation.updateMany({
        where: { sessionId },
        data: { resolved: true },
      });
    }

    // When invalidated, mark submission as not passed
    if (decision === 'INVALIDATED' && session.submissionId) {
      await this.prisma.assessmentSubmission.update({
        where: { id: session.submissionId },
        data: { passed: false },
      });
    }

    const assessmentTitle = session.submission?.assessment?.title || 'Proctored Assessment';

    // Dispatch a student notification
    try {
      const notifTitle =
        decision === 'APPROVED'
          ? 'Proctoring Review: Cleared & Approved'
          : decision === 'FLAGGED'
          ? 'Proctoring Review: Flagged for Review'
          : 'Proctoring Review: Submission Invalidated';

      const notifMessage =
        decision === 'APPROVED'
          ? `Your submission for "${assessmentTitle}" has been verified and cleared by the faculty invigilator. Trust index restored to 100%.\nNotes: ${notes}`
          : decision === 'FLAGGED'
          ? `Your submission for "${assessmentTitle}" has been flagged for academic review.\nNotes: ${notes}`
          : `Your submission for "${assessmentTitle}" has been invalidated due to exam integrity policy violations.\nNotes: ${notes}`;

      await this.prisma.studentNotification.create({
        data: {
          studentId: session.studentId,
          title: notifTitle,
          message: notifMessage,
          type: 'PROCTORING_REVIEW',
        },
      });
    } catch (notifErr) {
      this.logger.warn(`Failed to create student notification for session ${sessionId}:`, notifErr);
    }

    return this.prisma.proctoringSession.update({
      where: { id: sessionId },
      data: {
        status: updatedStatus,
        trustScore: updatedTrustScore,
        violationsCount: updatedViolationsCount,
        invigilatorNotes: notes,
      },
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
    });
  }
}

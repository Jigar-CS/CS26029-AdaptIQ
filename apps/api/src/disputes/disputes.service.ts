import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Subject, Observable, timer, of, map, filter, merge, catchError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto, ResolveDisputeDto, ResolveDisputeAction } from './dto/dispute.dto';
import { DisputeStatus, QuestionStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger('DisputesService');
  private readonly notificationEvents$ = new Subject<{
    type: string;
    userId?: string;
    role?: string;
    studentId?: string;
    data?: any;
    timestamp: string;
  }>();

  private dismissedNotificationsByUser: Map<string, Set<string>> = new Map();
  private readNotificationsByUser: Map<string, Set<string>> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Submits a new dispute / quality report from a student
   */
  async createDispute(studentProfileId: string, dto: CreateDisputeDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      include: { topic: true, course: true },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${dto.questionId} not found.`);
    }

    const dispute = await this.prisma.questionDispute.create({
      data: {
        questionId: dto.questionId,
        studentId: studentProfileId,
        practiceSessionId: dto.practiceSessionId || null,
        selectedOptionId: dto.selectedOptionId || null,
        reasonCategory: dto.reasonCategory,
        studentComment: dto.studentComment,
        status: DisputeStatus.PENDING,
      },
      include: {
        question: {
          include: {
            topic: true,
            options: true,
          },
        },
      },
    });

    this.logger.log(`Student ${studentProfileId} filed dispute for question ${dto.questionId}`);

    this.emitNotificationEvent({
      type: 'NEW_DISPUTE',
      role: 'FACULTY',
      data: {
        disputeId: dispute.id,
        questionId: dispute.questionId,
        studentId: studentProfileId,
      },
    });

    return {
      success: true,
      message: 'Question report successfully submitted to faculty moderation queue.',
      dispute,
    };
  }

  /**
   * Retrieves disputes submitted by the student
   */
  async getStudentDisputes(studentProfileId: string) {
    return this.prisma.questionDispute.findMany({
      where: { studentId: studentProfileId },
      include: {
        question: {
          include: {
            topic: true,
            options: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves all disputes for faculty review
   */
  async getFacultyDisputesQueue() {
    return this.prisma.questionDispute.findMany({
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            authorizedStudent: { select: { name: true, enrollmentNumber: true } },
          },
        },
        question: {
          include: {
            topic: true,
            course: true,
            options: true,
          },
        },
        faculty: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Faculty reviews and resolves a question dispute
   */
  async resolveDispute(facultyProfileId: string, disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.questionDispute.findUnique({
      where: { id: disputeId },
      include: {
        question: {
          include: { topic: true, course: true },
        },
        student: {
          include: {
            user: { select: { email: true } },
            authorizedStudent: { select: { name: true } },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found.`);
    }

    const isApproved = dto.action === ResolveDisputeAction.APPROVE_STUDENT_CORRECT;
    const newStatus = isApproved
      ? DisputeStatus.APPROVED_STUDENT_CORRECT
      : DisputeStatus.REJECTED_AI_CORRECT;

    // 1. Update the dispute record
    const updatedDispute = await this.prisma.questionDispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        facultyId: facultyProfileId,
        facultyRemarks: dto.facultyRemarks || (isApproved ? 'Student claim verified and accepted.' : 'Original answer verified as theoretically accurate.'),
        resolvedAt: new Date(),
      },
      include: {
        question: {
          include: { topic: true, options: true },
        },
      },
    });

    // 2. If student was right, retroactively credit their mastery score
    if (isApproved) {
      try {
        const mastery = await this.prisma.skillMastery.findUnique({
          where: {
            studentId_topicId: {
              studentId: dispute.studentId,
              topicId: dispute.question.topicId,
            },
          },
        });

        if (mastery) {
          const newCorrectCount = mastery.correctCount + 1;
          const boostScore = Math.min(100.0, Math.round((mastery.masteryScore + 7.5) * 10) / 10);
          await this.prisma.skillMastery.update({
            where: { id: mastery.id },
            data: {
              correctCount: newCorrectCount,
              masteryScore: boostScore,
            },
          });
        }
      } catch (masteryErr) {
        this.logger.warn(`Could not adjust mastery for student ${dispute.studentId}: ${masteryErr}`);
      }

      // If requested, quarantine the faulty question so it won't appear to other students
      if (dto.quarantineQuestion) {
        await this.prisma.question.update({
          where: { id: dispute.questionId },
          data: { status: QuestionStatus.ARCHIVED },
        });
        this.logger.log(`Archived faulty question ${dispute.questionId} on faculty approval.`);
      }
    }

    // 3. Create persistent Notification for the student with rich, pedagogical clarity
    const topicName = dispute.question.topic?.name || 'Curriculum Topic';
    const courseCode = dispute.question.course?.code || 'Core';

    const notificationTitle = isApproved
      ? '🎉 Question Dispute Upheld: Credit Awarded'
      : 'ℹ️ Question Dispute Reviewed: Official Solution Upheld';

    const notificationMessage = isApproved
      ? [
          `Dispute Decision: APPROVED (Student Claim Upheld)`,
          `Course: ${courseCode} • Topic: ${topicName}`,
          ``,
          `Review Summary:`,
          `Faculty reviewed your dispute regarding the question in "${topicName}" and concluded that your reasoning and submitted interpretation are conceptually sound.`,
          ``,
          `Faculty Review Feedback:`,
          `"${dto.facultyRemarks || 'Student claim verified and accepted. Your conceptual alternative is recognized as correct.'}"`,
          ``,
          `Adjustments Applied to Your Profile:`,
          `• Mastery Recalibrated: +7.5% score credited to your ${topicName} knowledge curve.`,
          `• Question Record: Your response was officially marked as Correct in continuous assessment analytics.`,
          dto.quarantineQuestion
            ? `• Item Quarantined: The question has been flagged for question bank revision so other students are not affected.`
            : `• Status Synchronized: Record updated across your student learning profile.`,
        ].join('\n')
      : [
          `Dispute Decision: REVIEWED (Original Solution Upheld)`,
          `Course: ${courseCode} • Topic: ${topicName}`,
          ``,
          `Review Summary:`,
          `Faculty carefully reviewed your challenge on the "${topicName}" question. Following algorithmic verification, the official solution and rationale were confirmed as theoretically accurate.`,
          ``,
          `Faculty Explanation & Rationale:`,
          `"${dto.facultyRemarks || 'The original question explanation has been verified as accurate according to core course principles.'}"`,
          dispute.question.explanation ? `\nCore Concept Explanation:\n"${dispute.question.explanation}"` : '',
          ``,
          `Learning Guidance & Next Steps:`,
          `• Mastery Impact: No penalty has been applied to your mastery score beyond the standard practice attempt.`,
          `• Recommended Action: Review key invariants in the ${topicName} study guide and solve 2–3 targeted practice problems to consolidate this pattern.`,
        ].filter(Boolean).join('\n');

    await this.prisma.studentNotification.create({
      data: {
        studentId: dispute.studentId,
        title: notificationTitle,
        message: notificationMessage,
        type: isApproved ? 'DISPUTE_APPROVED' : 'DISPUTE_REJECTED',
        metadata: JSON.stringify({
          disputeId: dispute.id,
          questionId: dispute.questionId,
          topicName,
          courseCode,
          verdict: isApproved ? 'APPROVED' : 'REJECTED',
          facultyRemarks: dto.facultyRemarks || (isApproved ? 'Student claim verified and accepted.' : 'Original answer verified as theoretically accurate.'),
          questionText: dispute.question.questionText,
          explanation: dispute.question.explanation,
        }),
      },
    });

    this.logger.log(`Dispute ${disputeId} resolved as ${newStatus} by faculty ${facultyProfileId}`);

    this.emitNotificationEvent({
      type: 'DISPUTE_RESOLVED',
      studentId: dispute.studentId,
      data: {
        disputeId: dispute.id,
        verdict: isApproved ? 'APPROVED' : 'REJECTED',
        topicName,
      },
    });

    return {
      success: true,
      message: isApproved
        ? 'Dispute upheld and student mastery score credited.'
        : 'Dispute dismissed with faculty pedagogical feedback.',
      status: newStatus,
      dispute: updatedDispute,
    };
  }

  emitNotificationEvent(payload: {
    type: string;
    userId?: string;
    role?: string;
    studentId?: string;
    data?: any;
  }) {
    this.notificationEvents$.next({
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  subscribeToNotifications(userId?: string, role?: string): Observable<{ data: any }> {
    const pings$ = timer(0, 25000).pipe(
      map(() => ({
        data: {
          type: 'PING',
          timestamp: new Date().toISOString(),
        },
      })),
    );

    const events$ = this.notificationEvents$.pipe(
      filter((evt) => {
        if (!evt) return false;
        if (evt.userId && userId && evt.userId === userId) return true;
        if (evt.studentId && userId && evt.studentId === userId) return true;
        if (evt.role && role && evt.role === role) return true;
        if (!evt.userId && !evt.role && !evt.studentId) return true;
        return false;
      }),
      map((evt) => ({
        data: evt,
      })),
    );

    return merge(pings$, events$).pipe(
      catchError((err) => {
        this.logger.error('Error in notification stream:', err);
        return of({
          data: {
            type: 'PING',
            timestamp: new Date().toISOString(),
          },
        });
      }),
    );
  }

  /**
   * Universal notification retriever across all roles (Student, Faculty, Counsellor, HOD, Head, Admin)
   */
  async getNotifications(user: any) {
    const role = user?.role;
    const userId = user?.id || user?.sub || 'anon';
    const studentProfileId = user?.studentId || user?.studentProfile?.id;
    const dismissed = this.dismissedNotificationsByUser.get(userId) || new Set<string>();
    const readSet = this.readNotificationsByUser.get(userId) || new Set<string>();

    if (role === 'STUDENT' && studentProfileId) {
      const records = await this.prisma.studentNotification.findMany({
        where: { studentId: studentProfileId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return records.filter((r) => !dismissed.has(r.id));
    }

    const items: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      metadata?: string;
      createdAt: Date;
    }> = [];

    if (role === 'FACULTY' || role === 'HOD'  || role === 'SUPER_ADMIN') {
      try {
        const pendingDisputes = await this.prisma.questionDispute.findMany({
          where: { status: DisputeStatus.PENDING },
          include: {
            question: { include: { topic: true, course: true } },
            student: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        });

        for (const d of pendingDisputes) {
          const id = `dispute-${d.id}`;
          if (dismissed.has(id)) continue;
          const courseCode = d.question?.course?.code || 'Course';
          const topicName = d.question?.topic?.name || 'Curriculum';
          const studentEmail = d.student?.user?.email || 'Student';
          items.push({
            id,
            title: `Pending Dispute: ${courseCode} • ${topicName}`,
            message: `${studentEmail} submitted a dispute: "${(d.studentComment || '').substring(0, 120)}..."`,
            type: 'DISPUTE_PENDING',
            read: readSet.has(id),
            metadata: JSON.stringify({
              disputeId: d.id,
              actionUrl: '/faculty/disputes',
              courseCode,
              topicName,
            }),
            createdAt: d.createdAt,
          });
        }
      } catch (e) {
        this.logger.warn(`Could not load pending disputes for notification: ${e}`);
      }

      try {
        const flaggedSessions = await this.prisma.proctoringSession.findMany({
          where: { status: 'FLAGGED' as any },
          include: {
            student: { include: { user: true } },
            submission: { include: { assessment: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        for (const session of flaggedSessions) {
          const id = `proctoring-${session.id}`;
          if (dismissed.has(id)) continue;
          items.push({
            id,
            title: `🚨 Proctoring Flag: ${session.submission?.assessment?.title || 'Exam Session'}`,
            message: `Integrity anomalies flagged for ${session.student?.user?.email || 'student'} during assessment.`,
            type: 'PROCTORING_FLAGGED',
            read: readSet.has(id),
            metadata: JSON.stringify({
              sessionId: session.id,
              actionUrl: '/faculty/invigilation',
            }),
            createdAt: session.createdAt,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    if (role === 'COUNSELLOR' || role === 'SUPER_ADMIN' || role === 'HOD' ) {
      try {
        const atRiskAlerts = await this.prisma.atRiskAlert.findMany({
          where: { status: 'PENDING' as any },
          include: {
            student: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        });

        for (const alert of atRiskAlerts) {
          const id = `alert-${alert.id}`;
          if (dismissed.has(id)) continue;
          items.push({
            id,
            title: `${alert.severity === 'CRITICAL' ? '🚨 Critical' : '⚠️ High'} Risk Alert: ${alert.student?.user?.email || 'Student'}`,
            message: alert.triggerReason || 'Student identified for academic intervention.',
            type: 'AT_RISK_ALERT',
            read: readSet.has(id),
            metadata: JSON.stringify({
              alertId: alert.id,
              actionUrl: '/counsellor/alerts',
              severity: alert.severity,
            }),
            createdAt: alert.createdAt,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieves notifications for a student (backwards compatibility)
   */
  async getStudentNotifications(studentProfileId: string) {
    return this.prisma.studentNotification.findMany({
      where: { studentId: studentProfileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Marks a notification as read
   */
  async markNotificationRead(user: any, notificationId: string) {
    const role = user?.role;
    const userId = user?.id || user?.sub;
    const studentProfileId = user?.studentId || user?.studentProfile?.id;

    if (role === 'STUDENT' && studentProfileId) {
      await this.prisma.studentNotification.updateMany({
        where: {
          id: notificationId,
          studentId: studentProfileId,
        },
        data: { read: true },
      });
    }

    if (userId) {
      if (!this.readNotificationsByUser.has(userId)) {
        this.readNotificationsByUser.set(userId, new Set());
      }
      this.readNotificationsByUser.get(userId)!.add(notificationId);
    }

    return { success: true, isRead: true };
  }

  /**
   * Marks all notifications as read for current user
   */
  async markAllNotificationsRead(user: any) {
    const role = user?.role;
    const userId = user?.id || user?.sub;
    const studentProfileId = user?.studentId || user?.studentProfile?.id;

    if (role === 'STUDENT' && studentProfileId) {
      await this.prisma.studentNotification.updateMany({
        where: { studentId: studentProfileId },
        data: { read: true },
      });
    }

    const current = await this.getNotifications(user);
    if (userId) {
      if (!this.readNotificationsByUser.has(userId)) {
        this.readNotificationsByUser.set(userId, new Set());
      }
      const set = this.readNotificationsByUser.get(userId)!;
      current.forEach((item) => set.add(item.id));
    }

    return { success: true, count: current.length };
  }

  /**
   * Clears a single notification
   */
  async clearNotification(user: any, notificationId: string) {
    const role = user?.role;
    const userId = user?.id || user?.sub;
    const studentProfileId = user?.studentId || user?.studentProfile?.id;

    if (role === 'STUDENT' && studentProfileId) {
      await this.prisma.studentNotification.deleteMany({
        where: {
          id: notificationId,
          studentId: studentProfileId,
        },
      });
    }

    if (userId) {
      if (!this.dismissedNotificationsByUser.has(userId)) {
        this.dismissedNotificationsByUser.set(userId, new Set());
      }
      this.dismissedNotificationsByUser.get(userId)!.add(notificationId);
    }

    return { success: true, clearedId: notificationId };
  }

  /**
   * Clears all notifications for the current user
   */
  async clearAllNotifications(user: any) {
    const role = user?.role;
    const userId = user?.id || user?.sub;
    const studentProfileId = user?.studentId || user?.studentProfile?.id;

    if (role === 'STUDENT' && studentProfileId) {
      await this.prisma.studentNotification.deleteMany({
        where: { studentId: studentProfileId },
      });
    }

    const current = await this.getNotifications(user);
    if (userId) {
      if (!this.dismissedNotificationsByUser.has(userId)) {
        this.dismissedNotificationsByUser.set(userId, new Set());
      }
      const set = this.dismissedNotificationsByUser.get(userId)!;
      current.forEach((item) => set.add(item.id));
    }

    return { success: true, count: current.length };
  }
}

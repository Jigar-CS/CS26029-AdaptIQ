import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto, ResolveDisputeDto, ResolveDisputeAction } from './dto/dispute.dto';
import { DisputeStatus, QuestionStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger('DisputesService');

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

    return {
      success: true,
      message: isApproved
        ? 'Dispute upheld and student mastery score credited.'
        : 'Dispute dismissed with faculty pedagogical feedback.',
      status: newStatus,
      dispute: updatedDispute,
    };
  }

  /**
   * Retrieves notifications for a student
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
  async markNotificationRead(studentProfileId: string, notificationId: string) {
    await this.prisma.studentNotification.updateMany({
      where: {
        id: notificationId,
        studentId: studentProfileId,
      },
      data: { read: true },
    });

    return { success: true, isRead: true };
  }
}

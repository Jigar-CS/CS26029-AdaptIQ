import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CareerRoleType, SubmissionStatus } from '@prisma/client';

export interface SkillGapItem {
  skill: string;
  studentMastery: number;
  requiredMastery: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SkillGapAnalysisResult {
  roleType: CareerRoleType;
  roleTitle: string;
  readinessScore: number;
  hiringBarStatus: 'MEETS_BAR' | 'NEAR_BAR' | 'DEVELOPING';
  verifiedSkills: Array<{ skill: string; mastery: number; required: number }>;
  skillGaps: SkillGapItem[];
  mockTestsTaken: number;
  avgMockScore: number;
  personalizedRoadmap: string[];
}

@Injectable()
export class PlacementService {
  private readonly logger = new Logger('PlacementService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all active industry career benchmarks.
   */
  async getBenchmarks() {
    return this.prisma.careerRoleBenchmark.findMany({
      where: { active: true },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Retrieves a specific benchmark by role type.
   */
  async getBenchmarkByRole(roleType: CareerRoleType) {
    const benchmark = await this.prisma.careerRoleBenchmark.findUnique({
      where: { roleType },
    });

    if (!benchmark) {
      throw new NotFoundException(`Career role benchmark for ${roleType} not found.`);
    }

    return benchmark;
  }

  /**
   * Resolves StudentProfile id from a studentId or userId.
   */
  private async resolveStudentProfileId(identifier: string): Promise<string> {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { userId: identifier }],
      },
    });

    if (studentProfile) {
      return studentProfile.id;
    }

    // If identifier is directly a valid profile
    return identifier;
  }

  /**
   * Fetches or initializes a student's placement profile.
   */
  async getStudentProfile(rawStudentId: string) {
    const studentProfileId = await this.resolveStudentProfileId(rawStudentId);

    let profile = await this.prisma.studentPlacementProfile.findUnique({
      where: { studentId: studentProfileId },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            authorizedStudent: { select: { name: true, enrollmentNumber: true } },
          },
        },
      },
    });

    if (!profile) {
      profile = await this.prisma.studentPlacementProfile.create({
        data: {
          studentId: studentProfileId,
          targetRole: CareerRoleType.SDE,
          overallReadinessScore: 0.0,
          verifiedSkillsCount: 0,
          skillGapsCount: 0,
        },
        include: {
          student: {
            include: {
              user: { select: { email: true } },
              authorizedStudent: { select: { name: true, enrollmentNumber: true } },
            },
          },
        },
      });
    }

    return profile;
  }

  /**
   * Updates student's target career role and recalculates readiness.
   */
  async setTargetRole(rawStudentId: string, targetRole: CareerRoleType) {
    const studentProfileId = await this.resolveStudentProfileId(rawStudentId);
    const benchmark = await this.getBenchmarkByRole(targetRole);

    const analysis = await this.evaluateStudentReadiness(studentProfileId, targetRole);

    const updatedProfile = await this.prisma.studentPlacementProfile.upsert({
      where: { studentId: studentProfileId },
      create: {
        studentId: studentProfileId,
        targetRole,
        overallReadinessScore: analysis.readinessScore,
        verifiedSkillsCount: analysis.verifiedSkills.length,
        skillGapsCount: analysis.skillGaps.length,
      },
      update: {
        targetRole,
        overallReadinessScore: analysis.readinessScore,
        verifiedSkillsCount: analysis.verifiedSkills.length,
        skillGapsCount: analysis.skillGaps.length,
        lastAssessedAt: new Date(),
      },
    });

    return {
      profile: updatedProfile,
      benchmark,
      analysis,
    };
  }

  /**
   * Evaluates student's skill gap against target role benchmark dynamically.
   */
  async evaluateStudentReadiness(rawStudentId: string, roleType?: CareerRoleType): Promise<SkillGapAnalysisResult> {
    const studentProfileId = await this.resolveStudentProfileId(rawStudentId);
    const profile = await this.getStudentProfile(studentProfileId);
    const targetRole = roleType || profile.targetRole;
    const benchmark = await this.getBenchmarkByRole(targetRole);

    // Fetch student's authentic skill masteries
    const masteries = await this.prisma.skillMastery.findMany({
      where: { studentId: studentProfileId },
      include: { topic: true },
    });

    const studentSkillBySlug: Record<string, number> = {};
    const studentSkillByName: Record<string, number> = {};
    for (const m of masteries) {
      if (m.topic) {
        studentSkillBySlug[m.topic.slug] = m.masteryScore ?? 0.0;
        studentSkillByName[m.topic.name.toLowerCase().trim()] = m.masteryScore ?? 0.0;
      }
    }

    interface BenchmarkSkillItem {
      topicSlug?: string;
      topicName?: string;
      skill?: string;
      minMastery?: number;
      weight?: number;
    }

    let parsedSkills: BenchmarkSkillItem[] = [];
    try {
      const parsed = JSON.parse(benchmark.requiredSkills);
      if (Array.isArray(parsed)) {
        parsedSkills = parsed;
      } else {
        parsedSkills = Object.entries(parsed).map(([k, v]) => ({
          topicName: k,
          minMastery: Number(v),
          weight: 1.0,
        }));
      }
    } catch {
      parsedSkills = [
        { topicSlug: 'arrays', topicName: 'Arrays', minMastery: 85, weight: 1.2 },
        { topicSlug: 'trees', topicName: 'Trees', minMastery: 80, weight: 1.2 },
        { topicSlug: 'dynamic-programming', topicName: 'Dynamic Programming', minMastery: 75, weight: 1.3 },
      ];
    }

    const verifiedSkills: Array<{ skill: string; mastery: number; required: number }> = [];
    const skillGaps: SkillGapItem[] = [];

    let totalWeight = 0;
    let earnedWeight = 0;

    for (const item of parsedSkills) {
      const skillName = item.topicName || item.skill || 'Core Skill';
      const skillSlug = item.topicSlug || '';
      const requiredMastery = item.minMastery || 75.0;
      const weight = item.weight || 1.0;

      // Authentic student mastery: 0 if not practiced yet
      const studentMastery =
        (skillSlug && studentSkillBySlug[skillSlug] !== undefined)
          ? studentSkillBySlug[skillSlug]
          : (studentSkillByName[skillName.toLowerCase().trim()] !== undefined)
          ? studentSkillByName[skillName.toLowerCase().trim()]
          : 0.0;

      const gap = Math.max(0, Math.round((requiredMastery - studentMastery) * 10) / 10);
      totalWeight += requiredMastery * weight;
      earnedWeight += Math.min(studentMastery, requiredMastery) * weight;

      if (gap <= 0) {
        verifiedSkills.push({
          skill: skillName,
          mastery: Math.round(studentMastery * 10) / 10,
          required: requiredMastery,
        });
      } else {
        const priority: 'HIGH' | 'MEDIUM' | 'LOW' =
          studentMastery === 0 || gap > 25 ? 'HIGH' : gap > 12 ? 'MEDIUM' : 'LOW';
        skillGaps.push({
          skill: skillName,
          studentMastery: Math.round(studentMastery * 10) / 10,
          requiredMastery,
          gap,
          priority,
        });
      }
    }

    const readinessScore =
      totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0.0;
    const hiringBarStatus =
      readinessScore >= (benchmark.targetMastery || 80.0)
        ? 'MEETS_BAR'
        : readinessScore >= 55.0
        ? 'NEAR_BAR'
        : 'DEVELOPING';

    // Fetch student's real assessment submissions
    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: {
        studentId: studentProfileId,
        status: SubmissionStatus.EVALUATED,
      },
      select: {
        percentage: true,
        totalScore: true,
        passed: true,
      },
    });

    const mockTestsTaken = submissions.length;
    const avgMockScore =
      mockTestsTaken > 0
        ? Math.round(
            (submissions.reduce((acc, s) => acc + s.percentage, 0) / mockTestsTaken) * 10,
          ) / 10
        : 0.0;

    // Build dynamic personalized roadmap
    const personalizedRoadmap: string[] = [];
    if (skillGaps.length === 0 && verifiedSkills.length > 0) {
      personalizedRoadmap.push(
        `Milestone 1: Outstanding! You have met the industry hiring bar across all competencies for ${benchmark.title}.`,
      );
      personalizedRoadmap.push(
        `Milestone 2: Take timed placement mock exams to refine your speed and accuracy under interview pressure.`,
      );
      personalizedRoadmap.push(
        `Milestone 3: Your profile is fully eligible for direct campus placement interview referrals with ${benchmark.hiringPartners || 'Tier-1 firms'}.`,
      );
    } else if (skillGaps.length > 0) {
      const topGap = skillGaps[0];
      personalizedRoadmap.push(
        `Step 1: Bridge highest priority delta in "${topGap.skill}" (Need +${topGap.gap}% to reach ${topGap.requiredMastery}% bar).`,
      );
      if (skillGaps[1]) {
        personalizedRoadmap.push(
          `Step 2: Practice adaptive question sets in "${skillGaps[1].skill}" to close the ${skillGaps[1].gap}% requirement gap.`,
        );
      } else {
        personalizedRoadmap.push(
          `Step 2: Solve adaptive problem sets in the Adaptive Practice Arena to reinforce core topics.`,
        );
      }
      if (mockTestsTaken === 0) {
        personalizedRoadmap.push(
          `Step 3: Complete your first proctored ${benchmark.title} screening mock assessment.`,
        );
      } else {
        personalizedRoadmap.push(
          `Step 3: Elevate your mock assessment average from ${avgMockScore}% to ≥${benchmark.targetMastery}%.`,
        );
      }
      personalizedRoadmap.push(
        `Step 4: Reach ≥${benchmark.targetMastery}% aggregate readiness to qualify for campus placement drives with ${benchmark.hiringPartners || 'Tier-1 firms'}.`,
      );
    } else {
      personalizedRoadmap.push(
        `Step 1: Start adaptive practice sessions across curriculum topics to establish your skill baseline.`,
      );
      personalizedRoadmap.push(`Step 2: Complete faculty assessments and timed quizzes.`);
      personalizedRoadmap.push(
        `Step 3: Attempt proctored placement mock exams for ${benchmark.title}.`,
      );
      personalizedRoadmap.push(`Step 4: Unlock prioritized campus placement interview referrals.`);
    }

    // Persist updated scores in DB
    await this.prisma.studentPlacementProfile.upsert({
      where: { studentId: studentProfileId },
      create: {
        studentId: studentProfileId,
        targetRole,
        overallReadinessScore: readinessScore,
        verifiedSkillsCount: verifiedSkills.length,
        skillGapsCount: skillGaps.length,
      },
      update: {
        targetRole,
        overallReadinessScore: readinessScore,
        verifiedSkillsCount: verifiedSkills.length,
        skillGapsCount: skillGaps.length,
        lastAssessedAt: new Date(),
      },
    });

    return {
      roleType: targetRole,
      roleTitle: benchmark.title,
      readinessScore,
      hiringBarStatus,
      verifiedSkills,
      skillGaps: skillGaps.sort((a, b) => b.gap - a.gap),
      mockTestsTaken,
      avgMockScore,
      personalizedRoadmap,
    };
  }

  /**
   * Retrieves placement mock exams with optional role filtering.
   */
  async getMockExams(roleType?: CareerRoleType) {
    return this.prisma.placementMockExam.findMany({
      where: roleType ? { roleType } : {},
      orderBy: { createdAt: 'desc' },
    });
  }
}

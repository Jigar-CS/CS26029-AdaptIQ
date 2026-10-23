import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CareerRoleType, SubmissionStatus } from '@prisma/client';

export interface SkillGapItem {
  skill: string;
  topicId?: string;
  topicSlug?: string;
  courseId?: string;
  studentMastery: number;
  requiredMastery: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PlacementPillarBreakdown {
  domainCoveragePct: number;
  verifiedCompetencyPct: number;
  volumeConfidencePct: number;
  problemDepthPct: number;
  mockValidationPct: number;
  totalQuestionsAttempted: number;
  practicedSkillsCount: number;
  totalRequiredSkillsCount: number;
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
  pillarBreakdown: PlacementPillarBreakdown;
}

@Injectable()
export class PlacementService {
  private readonly logger = new Logger('PlacementService');

  constructor(private readonly prisma: PrismaService) { }

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
      include: {
        topic: {
          include: {
            course: true,
          },
        },
      },
    });

    // Fetch student's real assessment submissions
    const submissions =
      (await this.prisma.assessmentSubmission?.findMany({
        where: {
          studentId: studentProfileId,
          status: SubmissionStatus.EVALUATED,
        },
        select: {
          percentage: true,
          totalScore: true,
          passed: true,
        },
      })) || [];

    const mockTestsTaken = submissions.length;
    const avgMockScore =
      mockTestsTaken > 0
        ? Math.round(
          (submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / mockTestsTaken) * 10,
        ) / 10
        : 0.0;

    // Fetch question attempt history to gauge volume and difficulty depth
    const questionAttempts =
      (await this.prisma.questionAttempt?.findMany({
        where: { studentId: studentProfileId },
        select: {
          difficultyAtAttempt: true,
          isCorrect: true,
        },
      })) || [];

    const masteryAttemptsSum = masteries.reduce((acc, m) => acc + (m.attemptCount || (m.masteryScore ? 3 : 0)), 0);
    const totalQuestionsAttempted = Math.max(questionAttempts.length, masteryAttemptsSum);

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
        { topicSlug: 'arrays-dynamic-arrays', topicName: 'Arrays & Dynamic Arrays', minMastery: 85, weight: 1.2 },
        { topicSlug: 'linked-lists-pointers', topicName: 'Linked Lists & Pointers', minMastery: 75, weight: 1.0 },
        { topicSlug: 'trees-binary-search-trees', topicName: 'Trees & Balanced Search Trees', minMastery: 80, weight: 1.2 },
        { topicSlug: 'dynamic-programming', topicName: 'Dynamic Programming', minMastery: 75, weight: 1.3 },
        { topicSlug: 'graph-algorithms', topicName: 'Graph Algorithms & Shortest Paths', minMastery: 70, weight: 1.1 },
      ];
    }

    const domainTaxonomy: Record<string, string[]> = {
      arrays: ['array', 'arrays', 'matrix', 'matrices', 'vector', 'container', 'dynamic-array', 'contiguous', 'structured'],
      linkedLists: ['linked-list', 'linked', 'pointer', 'pointers', 'singly', 'doubly', 'node', 'lists'],
      trees: ['tree', 'trees', 'bst', 'binary-search', 'binary', 'heap', 'traversal', 'balanced'],
      graphs: ['graph', 'graphs', 'shortest-path', 'shortest paths', 'dijkstra', 'bfs', 'dfs', 'neural'],
      dp: ['dynamic-programming', 'dynamic', 'dp', 'memoization', 'optimization', 'paradigms', 'subproblem'],
      dbms: ['sql', 'dbms', 'database', 'relational', 'normalization', 'query', 'indexing'],
      os: ['process', 'processes', 'thread', 'threads', 'concurrency', 'os', 'deadlock', 'operating'],
    };

    const verifiedSkills: Array<{ skill: string; mastery: number; required: number }> = [];
    const skillGaps: SkillGapItem[] = [];

    let totalTargetWeight = 0;
    let earnedCompetencyWeight = 0;
    let practicedSkillsCount = 0;

    for (const item of parsedSkills) {
      const skillName = item.topicName || item.skill || 'Core Skill';
      const skillSlug = (item.topicSlug || '').toLowerCase().trim();
      const lowerSkillName = skillName.toLowerCase().trim();
      const requiredMastery = item.minMastery || 75.0;
      const weight = item.weight || 1.0;

      // 1. Direct slug or name match
      let studentMastery: number | null = null;
      let attemptCount = 0;
      let matchedTopicId: string | undefined = undefined;
      let matchedTopicSlug: string | undefined = undefined;
      let matchedCourseId: string | undefined = undefined;

      for (const m of masteries) {
        if (!m.topic) continue;
        const mSlug = (m.topic.slug || '').toLowerCase().trim();
        const mName = (m.topic.name || '').toLowerCase().trim();
        if (skillSlug && (mSlug === skillSlug || skillSlug.includes(mSlug) || mSlug.includes(skillSlug))) {
          if ((m.masteryScore ?? 0) >= (studentMastery ?? 0)) {
            studentMastery = m.masteryScore ?? 0;
            attemptCount = Math.max(attemptCount, m.attemptCount ?? 0);
            matchedTopicId = m.topic.id;
            matchedTopicSlug = m.topic.slug;
            matchedCourseId = m.topic.courseId;
          }
        } else if (lowerSkillName && (mName === lowerSkillName || lowerSkillName.includes(mName) || mName.includes(lowerSkillName))) {
          if ((m.masteryScore ?? 0) >= (studentMastery ?? 0)) {
            studentMastery = m.masteryScore ?? 0;
            attemptCount = Math.max(attemptCount, m.attemptCount ?? 0);
            matchedTopicId = m.topic.id;
            matchedTopicSlug = m.topic.slug;
            matchedCourseId = m.topic.courseId;
          }
        }
      }

      // 2. Taxonomy domain matching
      if (studentMastery === null || studentMastery === 0) {
        let detectedDomain: string | null = null;
        for (const [dom, keywords] of Object.entries(domainTaxonomy)) {
          if (keywords.some((kw) => skillSlug.includes(kw) || lowerSkillName.includes(kw))) {
            detectedDomain = dom;
            break;
          }
        }

        if (detectedDomain) {
          const domKeywords = domainTaxonomy[detectedDomain];
          const matched = masteries.filter((m) => {
            if (!m.topic) return false;
            const tSlug = (m.topic.slug || '').toLowerCase();
            const tName = (m.topic.name || '').toLowerCase();
            return domKeywords.some((kw) => tSlug.includes(kw) || tName.includes(kw));
          });

          if (matched.length > 0) {
            const best = matched.reduce((prev, curr) => ((curr.masteryScore ?? 0) > (prev.masteryScore ?? 0) ? curr : prev));
            studentMastery = best.masteryScore ?? 0;
            attemptCount = Math.max(attemptCount, best.attemptCount ?? 0);
            if (!matchedTopicId && best.topic) {
              matchedTopicId = best.topic.id;
              matchedTopicSlug = best.topic.slug;
              matchedCourseId = best.topic.courseId;
            }
          }
        }
      }

      // STRICT INTEGRITY: If the student has never practiced this topic, mastery is strictly 0.0.
      // Absolutely NO unearned phantom baseline credit for untouched topics!
      const isActuallyPracticed = studentMastery !== null && studentMastery > 0;
      const finalMastery = isActuallyPracticed ? Math.round((studentMastery ?? 0) * 10) / 10 : 0.0;

      if (finalMastery > 0) {
        practicedSkillsCount++;
      }

      const gap = Math.max(0, Math.round((requiredMastery - finalMastery) * 10) / 10);
      totalTargetWeight += requiredMastery * weight;
      earnedCompetencyWeight += Math.min(finalMastery, requiredMastery) * weight;

      if (gap <= 0) {
        verifiedSkills.push({
          skill: skillName,
          mastery: finalMastery,
          required: requiredMastery,
        });
      } else {
        const priority: 'HIGH' | 'MEDIUM' | 'LOW' =
          finalMastery === 0 ? 'HIGH' : gap > 20 ? 'HIGH' : gap > 10 ? 'MEDIUM' : 'LOW';
        skillGaps.push({
          skill: skillName,
          topicId: matchedTopicId,
          topicSlug: matchedTopicSlug,
          courseId: matchedCourseId,
          studentMastery: finalMastery,
          requiredMastery,
          gap,
          priority,
        });
      }
    }

    // =========================================================================
    // Multi-Factor Placement Readiness Index (PRI) Formula:
    // 1. Domain Coverage (35%): Did the student attempt the required role domains?
    // 2. Verified Competency (30%): Genuine mastery earned across practiced topics
    // 3. Sample Size / Volume Confidence (15%): Statistical reliability curve
    // 4. Problem Difficulty Depth (10%): Practice rigor across Easy / Med / Hard
    // 5. Timed Mock Validation (10%): Proctored placement screening performance
    // =========================================================================

    // Pillar 1: Domain Coverage Rate (0 - 100%)
    const totalRequiredSkillsCount = parsedSkills.length;
    const domainCoveragePct = totalRequiredSkillsCount > 0
      ? Math.round((practicedSkillsCount / totalRequiredSkillsCount) * 1000) / 10
      : 0.0;

    // Pillar 2: Verified Competency Mastery (0 - 100%)
    const verifiedCompetencyPct = totalTargetWeight > 0
      ? Math.round((earnedCompetencyWeight / totalTargetWeight) * 1000) / 10
      : 0.0;

    // Pillar 3: Practice Volume & Sample Size Confidence (0 - 100%)
    // Concave exponential confidence curve: 1 - exp(-N / 25)
    // N=4 => ~14.8%, N=15 => ~45.1%, N=30 => ~69.9%, N=60 => ~90.9%
    const volumeConfidencePct = Math.min(
      100.0,
      Math.round((1 - Math.exp(-totalQuestionsAttempted / 25)) * 1000) / 10,
    );

    // Pillar 4: Difficulty Depth (0 - 100%)
    let problemDepthPct = 0.0;
    if (questionAttempts.length > 0) {
      let easyCount = 0;
      let medCount = 0;
      let hardCount = 0;
      for (const qa of questionAttempts) {
        if (qa.difficultyAtAttempt === 'HARD') hardCount++;
        else if (qa.difficultyAtAttempt === 'EASY') easyCount++;
        else medCount++;
      }
      const rawDepthMultiplier =
        (easyCount * 0.8 + medCount * 1.2 + hardCount * 1.5) /
        (1.2 * questionAttempts.length);
      const depthMultiplier = Math.min(1.0, Math.max(0.4, rawDepthMultiplier));
      const volumeGate = Math.min(1.0, totalQuestionsAttempted / 20);
      problemDepthPct = Math.round(depthMultiplier * volumeGate * 1000) / 10;
    } else if (totalQuestionsAttempted > 0) {
      const volumeGate = Math.min(1.0, totalQuestionsAttempted / 25);
      problemDepthPct = Math.round(volumeGate * 60 * 10) / 10;
    }

    // Pillar 5: Timed Mock Exam Validation (0 - 100%)
    let mockValidationPct = 0.0;
    if (mockTestsTaken > 0) {
      const mockConfidence = Math.min(1.0, mockTestsTaken / 3);
      mockValidationPct = Math.min(100.0, Math.round(avgMockScore * mockConfidence * 10) / 10);
    }

    // Weighted Synthesis:
    const rawAggregateReadiness =
      domainCoveragePct * 0.35 +
      verifiedCompetencyPct * 0.30 +
      volumeConfidencePct * 0.15 +
      problemDepthPct * 0.10 +
      mockValidationPct * 0.10;

    const readinessScore = Math.min(100.0, Math.max(0.0, Math.round(rawAggregateReadiness * 10) / 10));

    // Hiring Bar Determination: Requires both high overall score AND strong domain breadth
    const targetThreshold = benchmark.targetMastery || 80.0;
    const hiringBarStatus: 'MEETS_BAR' | 'NEAR_BAR' | 'DEVELOPING' =
      readinessScore >= targetThreshold && domainCoveragePct >= 80.0
        ? 'MEETS_BAR'
        : readinessScore >= 45.0 && domainCoveragePct >= 40.0
          ? 'NEAR_BAR'
          : 'DEVELOPING';

    const pillarBreakdown: PlacementPillarBreakdown = {
      domainCoveragePct,
      verifiedCompetencyPct,
      volumeConfidencePct,
      problemDepthPct,
      mockValidationPct,
      totalQuestionsAttempted,
      practicedSkillsCount,
      totalRequiredSkillsCount,
    };

    // Dynamic, Actionable Roadmap
    const personalizedRoadmap: string[] = [];

    if (practicedSkillsCount < totalRequiredSkillsCount) {
      const unpracticed = parsedSkills.filter((ps) => {
        const sName = ps.topicName || ps.skill || '';
        return !verifiedSkills.some((vs) => vs.skill === sName) &&
               skillGaps.some((sg) => sg.skill === sName && sg.studentMastery === 0);
      });
      const nextSkill = unpracticed[0]?.topicName || unpracticed[0]?.skill || skillGaps[0]?.skill;
      if (nextSkill) {
        personalizedRoadmap.push(
          `Domain Coverage: You have practiced ${practicedSkillsCount} of ${totalRequiredSkillsCount} required domains. Practice "${nextSkill}" to unlock your syllabus coverage score (current: ${domainCoveragePct}%).`,
        );
      }
    }

    if (totalQuestionsAttempted < 25) {
      personalizedRoadmap.push(
        `Volume Confidence: You have attempted ${totalQuestionsAttempted} question(s). Reach at least 25-30 practice problems to establish statistical reliability (currently ${volumeConfidencePct}% confidence).`,
      );
    }

    if (skillGaps.length > 0) {
      const topGap = skillGaps.find((g) => g.studentMastery > 0) || skillGaps[0];
      if (topGap.studentMastery > 0) {
        personalizedRoadmap.push(
          `Competency Lift: Elevate "${topGap.skill}" from ${topGap.studentMastery}% to ${topGap.requiredMastery}% target bar (+${topGap.gap}% needed).`,
        );
      } else {
        personalizedRoadmap.push(
          `Core Competency: Begin practice on "${topGap.skill}" to bridge the foundational requirement gap.`,
        );
      }
    }

    if (mockTestsTaken === 0) {
      personalizedRoadmap.push(
        `Simulation: Take a proctored placement mock exam for ${benchmark.title} to validate performance under timed interview conditions.`,
      );
    } else if (avgMockScore < targetThreshold) {
      personalizedRoadmap.push(
        `Mock Elevation: Elevate your mock screening average from ${avgMockScore}% to ≥${targetThreshold}%.`,
      );
    }

    if (hiringBarStatus === 'MEETS_BAR') {
      personalizedRoadmap.unshift(
        `Tier-1 Ready: Congratulations! Your Placement Readiness Index (${readinessScore}%) meets the hiring criteria across all 5 evaluation pillars for ${benchmark.title}.`,
      );
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
      pillarBreakdown,
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

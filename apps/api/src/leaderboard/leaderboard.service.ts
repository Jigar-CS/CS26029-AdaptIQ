import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { SubmissionStatus } from '@prisma/client';

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  userId?: string;
  name: string;
  enrollmentNumber: string;
  division: string;
  avatarSeed: string;
  score: number;
  assessmentScore: number;
  practiceScore: number;
  assessmentsCount: number;
  questionsCount: number;
  accuracy: number;
  streakDays: number;
  trend: 'UP' | 'DOWN' | 'SAME';
  badges: string[];
  isCurrentUser: boolean;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger('LeaderboardService');

  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(userId: string, query: LeaderboardQueryDto) {
    // 1. Identify current requesting user & student profile
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            authorizedStudent: true,
          },
        },
        authorizedRecord: true,
      },
    });

    const studentRecord =
      currentUser?.studentProfile?.authorizedStudent || currentUser?.authorizedRecord;
    const currentStudentProfileId = currentUser?.studentProfile?.id;

    const targetSemester = query.semester ? parseInt(query.semester, 10) : (studentRecord?.semester || 4);
    const targetDivision = query.division || 'ALL';
    const targetType = query.type || 'composite';
    const targetCourseId = query.courseId && query.courseId !== 'all' ? query.courseId : null;

    // 2. Fetch available courses for this semester
    const availableCourses = await this.prisma.course.findMany({
      where: { semester: targetSemester },
      select: { id: true, code: true, name: true, semester: true },
      orderBy: { code: 'asc' },
    });

    // 3. Fetch all authorized students for this semester in the database
    const dbAuthorized = await this.prisma.authorizedStudent.findMany({
      where: { semester: targetSemester },
      include: {
        studentProfile: {
          include: {
            user: { select: { email: true } },
            assessmentSubmissions: {
              where: {
                status: SubmissionStatus.EVALUATED,
                ...(targetCourseId ? { assessment: { courseId: targetCourseId } } : {}),
              },
              select: {
                percentage: true,
                totalScore: true,
                passed: true,
              },
            },
            skillMasteries: {
              where: {
                ...(targetCourseId ? { topic: { courseId: targetCourseId } } : {}),
              },
              select: {
                masteryScore: true,
                attemptCount: true,
                correctCount: true,
              },
            },
            practiceSessions: {
              where: {
                ...(targetCourseId ? { courseId: targetCourseId } : {}),
              },
              select: {
                questionsAttempted: true,
                correctAnswers: true,
              },
            },
            attempts: {
              select: {
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const allEntries: LeaderboardEntry[] = [];
    const processedEnrollments = new Set<string>();

    // Process genuine students from the database
    for (const auth of dbAuthorized) {
      const st = auth.studentProfile;
      const isCurrent =
        (st && (st.id === currentStudentProfileId || st.userId === userId)) ||
        auth.userId === userId ||
        auth.enrollmentNumber === studentRecord?.enrollmentNumber;

      const enroll = auth.enrollmentNumber;
      processedEnrollments.add(enroll);

      // 1. Calculate actual assessment score
      let assessmentScore = 0;
      const subCount = st?.assessmentSubmissions.length || 0;
      if (st && subCount > 0) {
        const sumPct = st.assessmentSubmissions.reduce((acc, s) => acc + s.percentage, 0);
        assessmentScore = Math.round((sumPct / subCount) * 10) / 10;
      }

      // 2. Calculate practice score and accuracy
      let practiceScore = 0;
      let totalQuestions = 0;
      let totalCorrect = 0;

      if (st) {
        for (const sm of st.skillMasteries) {
          totalQuestions += sm.attemptCount;
          totalCorrect += sm.correctCount;
        }
        for (const ps of st.practiceSessions) {
          totalQuestions += ps.questionsAttempted;
          totalCorrect += ps.correctAnswers;
        }

        if (st.skillMasteries.length > 0) {
          const avgMastery =
            st.skillMasteries.reduce((acc, m) => acc + m.masteryScore, 0) / st.skillMasteries.length;
          practiceScore = Math.round(avgMastery * 10) / 10;
        }
      }

      const accuracy =
        totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

      const uniqueDays = new Set(
        (st?.attempts || []).map((d) => d.createdAt.toISOString().slice(0, 10)),
      );
      const streakDays = uniqueDays.size;

      // 3. Score determination based on type
      let score = 0;
      if (targetType === 'assessments') {
        score = assessmentScore;
      } else if (targetType === 'practice') {
        score = practiceScore;
      } else {
        // Hybrid: 70% Assessments + 30% Adaptive Practice
        if (subCount === 0 && (!st || st.skillMasteries.length === 0)) {
          score = 0;
        } else if (subCount === 0) {
          score = practiceScore;
        } else if (!st || st.skillMasteries.length === 0) {
          score = assessmentScore;
        } else {
          score = Math.round((assessmentScore * 0.7 + practiceScore * 0.3) * 10) / 10;
        }
      }

      const badges: string[] = [];
      if (score >= 90) badges.push('Top Scholar');
      if (accuracy >= 85 && totalQuestions >= 10) badges.push('High Precision');
      if (totalQuestions >= 40) badges.push('Practice Titan');
      if (streakDays >= 5) badges.push('Consistent Solver');

      allEntries.push({
        rank: 0,
        studentId: st?.id || `auth-${auth.id}`,
        userId: auth.userId || st?.userId,
        name: auth.name,
        enrollmentNumber: enroll,
        division: auth.division || 'CE-A',
        avatarSeed: enroll,
        score,
        assessmentScore,
        practiceScore,
        assessmentsCount: subCount,
        questionsCount: totalQuestions,
        accuracy,
        streakDays,
        trend: 'SAME',
        badges,
        isCurrentUser: isCurrent,
      });
    }

    // Ensure the current student is always present even if their profile was outside the query
    if (!allEntries.some((e) => e.isCurrentUser)) {
      allEntries.push({
        rank: 0,
        studentId: currentStudentProfileId || 'student-current',
        userId,
        name: studentRecord?.name || 'Student',
        enrollmentNumber: studentRecord?.enrollmentNumber || '24CS093',
        division: studentRecord?.division || 'CE-A',
        avatarSeed: studentRecord?.enrollmentNumber || '24CS093',
        score: 0,
        assessmentScore: 0,
        practiceScore: 0,
        assessmentsCount: 0,
        questionsCount: 0,
        accuracy: 0,
        streakDays: 0,
        trend: 'SAME',
        badges: [],
        isCurrentUser: true,
      });
      processedEnrollments.add(studentRecord?.enrollmentNumber || '24CS093');
    }

    // Filter by division if requested
    let filteredEntries = allEntries;
    if (targetDivision && targetDivision !== 'ALL') {
      filteredEntries = allEntries.filter((e) => e.division.toUpperCase() === targetDivision.toUpperCase());
    }

    // Sort descending by score, tie-breaker accuracy then questions count
    filteredEntries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.questionsCount - a.questionsCount;
    });

    // Assign 1-indexed ranks
    filteredEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Find current user's entry
    const myIndex = filteredEntries.findIndex((e) => e.isCurrentUser);
    const defaultEntry: LeaderboardEntry = {
      rank: 1,
      studentId: currentStudentProfileId || 'student-current',
      userId,
      name: studentRecord?.name || 'Student',
      enrollmentNumber: studentRecord?.enrollmentNumber || '24CS093',
      division: studentRecord?.division || 'CE-A',
      avatarSeed: studentRecord?.enrollmentNumber || '24CS093',
      score: 0,
      assessmentScore: 0,
      practiceScore: 0,
      assessmentsCount: 0,
      questionsCount: 0,
      accuracy: 0,
      streakDays: 0,
      trend: 'SAME',
      badges: [],
      isCurrentUser: true,
    };
    const myEntry = (myIndex !== -1 ? filteredEntries[myIndex] : filteredEntries[0]) || defaultEntry;
    const totalStudents = filteredEntries.length;

    const percentile =
      totalStudents > 0
        ? Math.round((((totalStudents - myEntry.rank + 1) / totalStudents) * 100) * 10) / 10
        : 100;

    const gapToNext =
      myIndex > 0
        ? Math.round((filteredEntries[myIndex - 1].score - myEntry.score) * 10) / 10
        : 0;

    const top10Score = filteredEntries[Math.min(9, Math.max(0, totalStudents - 1))]?.score || myEntry.score;
    const gapToTop10 =
      myEntry.rank > 10 ? Math.round((top10Score - myEntry.score) * 10) / 10 : 0;

    // Podium: top 3
    const podium = filteredEntries.slice(0, 3);

    return {
      success: true,
      myStanding: {
        rank: myEntry.rank,
        totalStudents,
        percentile,
        score: myEntry.score,
        assessmentScore: myEntry.assessmentScore,
        practiceScore: myEntry.practiceScore,
        assessmentsCount: myEntry.assessmentsCount,
        questionsCount: myEntry.questionsCount,
        accuracy: myEntry.accuracy,
        streakDays: myEntry.streakDays,
        trend: myEntry.trend,
        gapToNext,
        gapToTop10,
        badges: myEntry.badges,
      },
      podium,
      rankings: filteredEntries,
      courses: availableCourses,
      meta: {
        semester: targetSemester,
        division: targetDivision,
        type: targetType,
        courseId: targetCourseId || 'all',
        courseName: targetCourseId
          ? availableCourses.find((c) => c.id === targetCourseId)?.name || 'Subject Specific'
          : 'All Semester Subjects (Aggregate)',
        calculationFormula:
          targetType === 'composite'
            ? 'Hybrid Score = (70% × Faculty Assessments Average) + (30% × Adaptive Practice Mastery)'
            : targetType === 'assessments'
            ? 'Faculty Assessment Score = Marks & Percentile Average from Conducted Exams & Quizzes'
            : 'Adaptive Practice Score = Problem-Solving Mastery, Consistency & Accuracy Points',
      },
    };
  }
}

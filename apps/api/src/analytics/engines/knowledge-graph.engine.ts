export interface TopicDependency {
  sourceSlug: string; // The prerequisite topic slug
  targetSlug: string; // The dependent topic slug
  courseCode: string;
  minMasteryRequired: number; // e.g., 60%
  description: string;
}

export interface PrerequisiteCheckResult {
  topicSlug: string;
  isReady: boolean;
  readinessScore: number; // 0 - 100%
  status: 'MASTERED' | 'READY_FOR_PRACTICE' | 'NEEDS_PREREQUISITE' | 'BLOCKED';
  missingPrerequisites: {
    prerequisiteSlug: string;
    prerequisiteName: string;
    currentMastery: number;
    requiredMastery: number;
    deficit: number;
  }[];
  recommendation: string;
}

export interface KnowledgeGraphNode {
  id: string;
  slug: string;
  name: string;
  courseCode: string;
  rawMastery: number;
  decayedMastery: number;
  bktProbability: number;
  status: 'MASTERED' | 'READY_FOR_PRACTICE' | 'NEEDS_PREREQUISITE' | 'BLOCKED';
  isPrerequisiteSatisfied: boolean;
  prerequisites: string[]; // List of prerequisite slugs
}

export interface KnowledgeGraphEdge {
  from: string; // Prerequisite topic slug
  to: string; // Target topic slug
  minRequiredMastery: number;
}

export interface CourseKnowledgeGraph {
  courseCode: string;
  courseName: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  overallCurriculumReadiness: number;
  unlockedTopicsCount: number;
  blockedTopicsCount: number;
}

/**
 * Pedagogical curriculum prerequisite definitions.
 * Canonical mappings across university coursework.
 */
export const CURRICULUM_DEPENDENCIES: TopicDependency[] = [
  // CS301 — Data Structures and Algorithms
  {
    sourceSlug: 'arrays-dynamic-arrays',
    targetSlug: 'linked-lists-pointers',
    courseCode: 'CS301',
    minMasteryRequired: 60,
    description: 'Array memory models and indexing are essential before mastering pointers and pointer-based linked nodes.',
  },
  {
    sourceSlug: 'linked-lists-pointers',
    targetSlug: 'stacks-queues',
    courseCode: 'CS301',
    minMasteryRequired: 60,
    description: 'Stack and queue dynamic node manipulation relies heavily on singly and doubly linked list pointer updates.',
  },
  {
    sourceSlug: 'stacks-queues',
    targetSlug: 'trees-binary-search-trees',
    courseCode: 'CS301',
    minMasteryRequired: 65,
    description: 'Breadth-First and Depth-First tree traversals fundamentally depend on queue and stack state structures.',
  },
  {
    sourceSlug: 'trees-binary-search-trees',
    targetSlug: 'graph-algorithms-traversals',
    courseCode: 'CS301',
    minMasteryRequired: 70,
    description: 'General graph traversals (BFS/DFS, topological sort) generalize acyclic tree traversals.',
  },
  {
    sourceSlug: 'arrays-dynamic-arrays',
    targetSlug: 'dynamic-programming',
    courseCode: 'CS301',
    minMasteryRequired: 75,
    description: 'Memoization tables and bottom-up DP state tabulation require firm mastery of multidimensional arrays.',
  },
  {
    sourceSlug: 'arrays-dynamic-arrays',
    targetSlug: 'hash-tables-collision-resolution',
    courseCode: 'CS301',
    minMasteryRequired: 60,
    description: 'Bucket arrays and open addressing rely directly on linear probing and array address computation.',
  },

  // CS302 — Operating Systems
  {
    sourceSlug: 'process-concept-pcb',
    targetSlug: 'cpu-scheduling-algorithms',
    courseCode: 'CS302',
    minMasteryRequired: 60,
    description: 'Process state lifecycles and context switching must be understood before scheduling preemptive queues.',
  },
  {
    sourceSlug: 'cpu-scheduling-algorithms',
    targetSlug: 'process-synchronization-semaphores',
    courseCode: 'CS302',
    minMasteryRequired: 65,
    description: 'Race conditions arise from interleaved scheduling of concurrent threads.',
  },
  {
    sourceSlug: 'process-synchronization-semaphores',
    targetSlug: 'deadlocks-handling-bankers',
    courseCode: 'CS302',
    minMasteryRequired: 70,
    description: 'Deadlock circular wait conditions originate from resource mutex locking.',
  },
  {
    sourceSlug: 'process-concept-pcb',
    targetSlug: 'memory-management-paging',
    courseCode: 'CS302',
    minMasteryRequired: 60,
    description: 'Process virtual address spaces map to physical frames through page tables.',
  },

  // CS303 — Database Management Systems
  {
    sourceSlug: 'relational-model-keys',
    targetSlug: 'sql-queries-joins',
    courseCode: 'CS303',
    minMasteryRequired: 60,
    description: 'Candidate and foreign keys are necessary to construct multi-table relational joins.',
  },
  {
    sourceSlug: 'sql-queries-joins',
    targetSlug: 'normalization-functional-dependencies',
    courseCode: 'CS303',
    minMasteryRequired: 65,
    description: 'Decomposition into BCNF/3NF resolves join anomalies and data redundancy.',
  },
  {
    sourceSlug: 'normalization-functional-dependencies',
    targetSlug: 'transactions-acid-concurrency',
    courseCode: 'CS303',
    minMasteryRequired: 70,
    description: 'Serializable schedules and two-phase locking preserve relational integrity.',
  },
];

/**
 * Knowledge Dependency Graph Engine
 * Evaluates prerequisite fulfillment, detects learning path bottlenecks, and builds curriculum DAGs.
 */
export class KnowledgeGraphEngine {
  /**
   * Retrieves all direct prerequisites for a given topic slug
   */
  static getPrerequisitesForTopic(topicSlug: string): TopicDependency[] {
    return CURRICULUM_DEPENDENCIES.filter((dep) => dep.targetSlug === topicSlug);
  }

  /**
   * Evaluates if a student has fulfilled prerequisites for a specific target topic
   */
  static checkPrerequisites(
    targetSlug: string,
    topicMasteries: Record<string, { name: string; masteryScore: number }>,
  ): PrerequisiteCheckResult {
    const dependencies = this.getPrerequisitesForTopic(targetSlug);
    const targetTopicData = topicMasteries[targetSlug];
    const currentTargetMastery = targetTopicData?.masteryScore || 0;

    if (dependencies.length === 0) {
      // Foundational topic with no prerequisites
      let status: 'MASTERED' | 'READY_FOR_PRACTICE' =
        currentTargetMastery >= 75 ? 'MASTERED' : 'READY_FOR_PRACTICE';

      return {
        topicSlug: targetSlug,
        isReady: true,
        readinessScore: 100,
        status,
        missingPrerequisites: [],
        recommendation:
          status === 'MASTERED'
            ? 'Topic mastered. Reinforce with spaced revision.'
            : 'Foundational topic ready for active practice.',
      };
    }

    const missingPrerequisites: PrerequisiteCheckResult['missingPrerequisites'] = [];
    let totalRequired = 0;
    let totalAchieved = 0;

    for (const dep of dependencies) {
      const prereqData = topicMasteries[dep.sourceSlug];
      const prereqScore = prereqData ? prereqData.masteryScore : 0;
      const prereqName = prereqData ? prereqData.name : dep.sourceSlug;

      totalRequired += dep.minMasteryRequired;
      totalAchieved += Math.min(dep.minMasteryRequired, prereqScore);

      if (prereqScore < dep.minMasteryRequired) {
        missingPrerequisites.push({
          prerequisiteSlug: dep.sourceSlug,
          prerequisiteName: prereqName,
          currentMastery: Math.round(prereqScore),
          requiredMastery: dep.minMasteryRequired,
          deficit: Math.round(dep.minMasteryRequired - prereqScore),
        });
      }
    }

    const readinessScore =
      totalRequired > 0 ? Math.round((totalAchieved / totalRequired) * 100) : 100;
    const isReady = missingPrerequisites.length === 0;

    let status: PrerequisiteCheckResult['status'];
    if (currentTargetMastery >= 75 && isReady) {
      status = 'MASTERED';
    } else if (isReady) {
      status = 'READY_FOR_PRACTICE';
    } else if (readinessScore >= 60) {
      status = 'NEEDS_PREREQUISITE';
    } else {
      status = 'BLOCKED';
    }

    let recommendation: string;
    if (status === 'MASTERED') {
      recommendation = 'Concept mastered with solid foundational prerequisites.';
    } else if (status === 'READY_FOR_PRACTICE') {
      recommendation = 'Prerequisites satisfied! Proceed with practice.';
    } else {
      const highestGap = [...missingPrerequisites].sort((a, b) => b.deficit - a.deficit)[0];
      recommendation = `Prerequisite gap: Strengthen ${highestGap.prerequisiteName} (currently ${highestGap.currentMastery}%, required ${highestGap.requiredMastery}%) before advancing.`;
    }

    return {
      topicSlug: targetSlug,
      isReady,
      readinessScore,
      status,
      missingPrerequisites,
      recommendation,
    };
  }

  /**
   * Constructs the full Directed Acyclic Graph (DAG) for a course
   */
  static buildCourseKnowledgeGraph(params: {
    courseCode: string;
    courseName: string;
    topics: { id: string; name: string; slug: string }[];
    topicMasteries: Record<
      string,
      {
        rawMastery: number;
        decayedMastery: number;
        bktProbability: number;
      }
    >;
  }): CourseKnowledgeGraph {
    const { courseCode, courseName, topics, topicMasteries } = params;

    // Filter course dependencies
    const relevantDeps = CURRICULUM_DEPENDENCIES.filter((d) => d.courseCode === courseCode);

    // Build fast lookup
    const masteryLookup: Record<string, { name: string; masteryScore: number }> = {};
    for (const t of topics) {
      const data = topicMasteries[t.slug] || topicMasteries[t.id];
      masteryLookup[t.slug] = {
        name: t.name,
        masteryScore: data ? data.rawMastery : 0,
      };
    }

    let unlockedCount = 0;
    let blockedCount = 0;
    let totalReadiness = 0;

    const nodes: KnowledgeGraphNode[] = topics.map((t) => {
      const prereqCheck = this.checkPrerequisites(t.slug, masteryLookup);
      const data = topicMasteries[t.slug] || topicMasteries[t.id] || {
        rawMastery: 0,
        decayedMastery: 0,
        bktProbability: 0.2,
      };

      if (prereqCheck.isReady) {
        unlockedCount++;
      } else {
        blockedCount++;
      }
      totalReadiness += prereqCheck.readinessScore;

      const directPrereqs = relevantDeps
        .filter((d) => d.targetSlug === t.slug)
        .map((d) => d.sourceSlug);

      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        courseCode,
        rawMastery: data.rawMastery,
        decayedMastery: data.decayedMastery,
        bktProbability: data.bktProbability,
        status: prereqCheck.status,
        isPrerequisiteSatisfied: prereqCheck.isReady,
        prerequisites: directPrereqs,
      };
    });

    const edges: KnowledgeGraphEdge[] = relevantDeps.map((d) => ({
      from: d.sourceSlug,
      to: d.targetSlug,
      minRequiredMastery: d.minMasteryRequired,
    }));

    const overallCurriculumReadiness =
      topics.length > 0 ? Math.round(totalReadiness / topics.length) : 0;

    return {
      courseCode,
      courseName,
      nodes,
      edges,
      overallCurriculumReadiness,
      unlockedTopicsCount: unlockedCount,
      blockedTopicsCount: blockedCount,
    };
  }
}

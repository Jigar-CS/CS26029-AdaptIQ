import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { KnowledgeGraphEngine } from '../analytics/engines/knowledge-graph.engine';
import { PracticeService } from './practice.service';
import { AdaptiveLearningService } from '../adaptive/adaptive-learning.service';
import { AssessmentService } from '../assessment/assessment.service';
import { QuestionDifficulty, AssessmentStatus, SubmissionStatus } from '@prisma/client';

describe('Learning Path & Prerequisite Enforcement Suite', () => {
  describe('KnowledgeGraphEngine Canonicalization & Prerequisite DAG Logic', () => {
    it('should canonicalize database slugs to curriculum dependency format', () => {
      expect(KnowledgeGraphEngine.canonicalizeSlug('arrays')).toBe('arrays-dynamic-arrays');
      expect(KnowledgeGraphEngine.canonicalizeSlug('linked-lists')).toBe('linked-lists-pointers');
      expect(KnowledgeGraphEngine.canonicalizeSlug('stacks')).toBe('stacks-queues');
      expect(KnowledgeGraphEngine.canonicalizeSlug('queues')).toBe('stacks-queues');
      expect(KnowledgeGraphEngine.canonicalizeSlug('trees')).toBe('trees-binary-search-trees');
      expect(KnowledgeGraphEngine.canonicalizeSlug('trees---bst')).toBe('trees-binary-search-trees');
      expect(KnowledgeGraphEngine.canonicalizeSlug('graphs')).toBe('graph-algorithms-traversals');
      expect(KnowledgeGraphEngine.canonicalizeSlug('dynamic-programming')).toBe('dynamic-programming');
      expect(KnowledgeGraphEngine.canonicalizeSlug('processes-threads')).toBe('process-concept-pcb');
      expect(KnowledgeGraphEngine.canonicalizeSlug('sql-normalization')).toBe('normalization-functional-dependencies');
    });

    it('should allow access to foundational topics without prerequisites', () => {
      const check = KnowledgeGraphEngine.checkPrerequisites('arrays', {});
      expect(check.isReady).toBe(true);
      expect(check.status).toBe('READY_FOR_PRACTICE');
      expect(check.missingPrerequisites).toHaveLength(0);
    });

    it('should block dependent topics when prerequisites are not met', () => {
      // arrays has 0% mastery
      const check = KnowledgeGraphEngine.checkPrerequisites('linked-lists', {
        'arrays': { name: 'Arrays', masteryScore: 20 },
      });
      expect(check.isReady).toBe(false);
      expect(check.status).toBe('BLOCKED');
      expect(check.missingPrerequisites).toHaveLength(1);
      expect(check.missingPrerequisites[0].prerequisiteSlug).toBe('arrays-dynamic-arrays');
      expect(check.missingPrerequisites[0].requiredMastery).toBe(60);
      expect(check.missingPrerequisites[0].currentMastery).toBe(20);
      expect(check.missingPrerequisites[0].deficit).toBe(40);
    });

    it('should unlock dependent topic once prerequisite mastery threshold is satisfied', () => {
      // arrays has 65% mastery (threshold is 60%)
      const check = KnowledgeGraphEngine.checkPrerequisites('linked-lists', {
        'arrays': { name: 'Arrays', masteryScore: 65 },
      });
      expect(check.isReady).toBe(true);
      expect(check.status).toBe('READY_FOR_PRACTICE');
      expect(check.missingPrerequisites).toHaveLength(0);
    });

    it('should correctly build DAG nodes and connect edges between course topics', () => {
      const courseGraph = KnowledgeGraphEngine.buildCourseKnowledgeGraph({
        courseCode: 'CS301',
        courseName: 'Data Structures and Algorithms',
        topics: [
          { id: 't1', name: 'Arrays', slug: 'arrays' },
          { id: 't2', name: 'Linked Lists', slug: 'linked-lists' },
          { id: 't3', name: 'Stacks & Queues', slug: 'stacks' },
        ],
        topicMasteries: {
          'arrays': { rawMastery: 70, decayedMastery: 70, bktProbability: 0.8 },
          'linked-lists': { rawMastery: 30, decayedMastery: 30, bktProbability: 0.3 },
          'stacks': { rawMastery: 0, decayedMastery: 0, bktProbability: 0.2 },
        },
      });

      expect(courseGraph.nodes).toHaveLength(3);
      // arrays is unlocked (foundational)
      expect(courseGraph.nodes[0].isPrerequisiteSatisfied).toBe(true);
      // linked-lists is unlocked because arrays has 70% >= 60%
      expect(courseGraph.nodes[1].isPrerequisiteSatisfied).toBe(true);
      // stacks requires linked-lists >= 60%, but linked-lists only has 30% -> BLOCKED
      expect(courseGraph.nodes[2].isPrerequisiteSatisfied).toBe(false);
      expect(courseGraph.nodes[2].status).toBe('BLOCKED');

      // Verify edges connect the actual topic slugs
      expect(courseGraph.edges.some((e) => e.from === 'arrays' && e.to === 'linked-lists')).toBe(true);
      expect(courseGraph.edges.some((e) => e.from === 'linked-lists' && e.to === 'stacks')).toBe(true);
    });
  });

  describe('PracticeService Prerequisite Enforcement', () => {
    let practiceService: PracticeService;
    let mockPrisma: any;
    let mockAnalytics: any;

    beforeEach(() => {
      mockPrisma = {
        studentProfile: {
          findFirst: jest.fn().mockResolvedValue({ id: 'student-prof-1' }),
        },
        course: {
          findFirst: jest.fn().mockResolvedValue({ id: 'course-cs301', code: 'CS301', name: 'DSA' }),
        },
        topic: {
          findFirst: jest.fn(),
        },
        practiceSession: {
          create: jest.fn(),
          findUnique: jest.fn(),
        },
        questionAttempt: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        question: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      mockAnalytics = {
        validateTopicPrerequisites: jest.fn(),
      };

      practiceService = new PracticeService(mockPrisma as any, mockAnalytics as any);
    });

    it('should reject startSession with 403 when prerequisites are incomplete', async () => {
      mockPrisma.topic.findFirst.mockResolvedValueOnce({
        id: 'topic-trees',
        slug: 'trees',
        name: 'Trees',
        courseId: 'course-cs301',
      });

      mockAnalytics.validateTopicPrerequisites.mockResolvedValueOnce({
        isReady: false,
        readinessScore: 30,
        status: 'BLOCKED',
        recommendation: 'Prerequisite gap: Strengthen Stacks & Queues before advancing.',
        missingPrerequisites: [
          {
            prerequisiteSlug: 'stacks-queues',
            prerequisiteName: 'Stacks & Queues',
            currentMastery: 20,
            requiredMastery: 65,
            deficit: 45,
          },
        ],
      });

      await expect(
        practiceService.startSession('student-prof-1', {
          courseId: 'course-cs301',
          topicId: 'topic-trees',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.practiceSession.create).not.toHaveBeenCalled();
    });

    it('should reject startSession when topic does not belong to the selected course', async () => {
      mockPrisma.topic.findFirst.mockResolvedValueOnce({
        id: 'topic-os',
        slug: 'processes-threads',
        name: 'Processes',
        courseId: 'course-cs302', // Belongs to CS302, not CS301
      });

      await expect(
        practiceService.startSession('student-prof-1', {
          courseId: 'course-cs301',
          topicId: 'topic-os',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow startSession when topic prerequisites are fully satisfied', async () => {
      mockPrisma.topic.findFirst.mockResolvedValueOnce({
        id: 'topic-arrays',
        slug: 'arrays',
        name: 'Arrays',
        courseId: 'course-cs301',
      });

      mockAnalytics.validateTopicPrerequisites.mockResolvedValueOnce({
        isReady: true,
        readinessScore: 100,
        status: 'READY_FOR_PRACTICE',
        missingPrerequisites: [],
      });

      mockPrisma.practiceSession.create.mockResolvedValueOnce({
        id: 'session-123',
        courseId: 'course-cs301',
        topicId: 'topic-arrays',
        studentId: 'student-prof-1',
      });

      mockPrisma.practiceSession.findUnique.mockResolvedValueOnce({
        id: 'session-123',
        courseId: 'course-cs301',
        topicId: 'topic-arrays',
        studentId: 'student-prof-1',
      });

      const res = await practiceService.startSession('student-prof-1', {
        courseId: 'course-cs301',
        topicId: 'topic-arrays',
      });

      expect(res.session.id).toBe('session-123');
      expect(mockPrisma.practiceSession.create).toHaveBeenCalled();
    });
  });

  describe('AdaptiveLearningService & AssessmentService Prerequisite Protection', () => {
    it('should reject getNextAdaptiveQuestion with 403 when topic prerequisites are not satisfied', async () => {
      const mockPrisma = {
        studentProfile: {
          findFirst: jest.fn().mockResolvedValue({ id: 'student-prof-1' }),
        },
        topic: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'topic-graphs',
            slug: 'graphs',
            name: 'Graphs',
            courseId: 'course-cs301',
          }),
        },
        course: {
          findFirst: jest.fn().mockResolvedValue({ id: 'course-cs301', name: 'DSA' }),
        },
      };

      const mockAiGen = { generateAndPersistQuestion: jest.fn() };
      const mockAnalytics = {
        validateTopicPrerequisites: jest.fn().mockResolvedValue({
          isReady: false,
          readinessScore: 10,
          recommendation: 'Trees must be mastered before graph traversals.',
          missingPrerequisites: [{ prerequisiteSlug: 'trees-binary-search-trees', deficit: 50 }],
        }),
      };

      const adaptiveService = new AdaptiveLearningService(
        mockPrisma as any,
        mockAiGen as any,
        mockAnalytics as any,
      );

      await expect(
        adaptiveService.getNextAdaptiveQuestion('student-prof-1', 'topic-graphs', 'course-cs301'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject AssessmentService.startAttempt when assessment contains questions from locked topics', async () => {
      const mockPrisma = {
        assessment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'assess-advanced-algo',
            title: 'Advanced Graph & DP Quiz',
            status: AssessmentStatus.PUBLISHED,
            allowedAttempts: 2,
            questions: [
              {
                question: {
                  id: 'q-dp-1',
                  topicId: 'topic-dp',
                },
              },
            ],
          }),
        },
        studentProfile: {
          findFirst: jest.fn().mockResolvedValue({ id: 'student-prof-1' }),
        },
        assessmentSubmission: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
        },
      };

      const mockAnalytics = {
        validateTopicPrerequisites: jest.fn().mockResolvedValue({
          isReady: false,
          recommendation: 'Arrays mastery deficit detected.',
          missingPrerequisites: [{ prerequisiteSlug: 'arrays-dynamic-arrays', deficit: 35 }],
        }),
      };

      const assessmentService = new AssessmentService(
        mockPrisma as any,
        {} as any,
        {} as any,
        mockAnalytics as any,
      );

      await expect(
        assessmentService.startAttempt('assess-advanced-algo', 'student-prof-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.assessmentSubmission.create).not.toHaveBeenCalled();
    });
  });
});

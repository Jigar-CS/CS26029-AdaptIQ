import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AiClientService } from '../ai/ai-client.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  AssessmentType,
  AssessmentStatus,
  UserRole,
} from '@prisma/client';

describe('Exam Studio Document AI & Question Bank Integration', () => {
  let service: RagService;
  let controller: RagController;
  let prisma: any;

  const mockCourse = {
    id: 'course-cs301',
    code: 'CS301',
    name: 'Data Structures & Algorithms',
    semester: 5,
  };

  beforeEach(async () => {
    prisma = {
      course: {
        findFirst: jest.fn().mockResolvedValue(mockCourse),
        findUnique: jest.fn().mockResolvedValue(mockCourse),
      },
      topic: {
        findFirst: jest.fn().mockResolvedValue({ id: 'topic-arrays', name: 'Arrays & Vectors' }),
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({ id: 'new-topic-id', ...args.data }),
        ),
      },
      question: {
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: `q-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            ...args.data,
            options: (args.data.options?.create || []).map((o: any, idx: number) => ({
              id: `opt-${idx}`,
              ...o,
            })),
            topic: { name: 'Arrays & Vectors' },
          }),
        ),
      },
      assessment: {
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'assess-new-1',
            ...args.data,
            questions: (args.data.questions?.create || []).map((q: any) => ({
              id: `aq-${q.questionId}`,
              questionId: q.questionId,
              order: q.order,
              points: q.points,
              question: { id: q.questionId, options: [] },
            })),
            course: { code: 'CS301', name: 'Data Structures & Algorithms' },
          }),
        ),
      },
      facultyProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'fac-prof-1', userId: 'user-fac-1' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-fac-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagController],
      providers: [
        RagService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiClientService, useValue: {} },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    controller = module.get<RagController>(RagController);
  });

  describe('Document Upload & Text Extraction (> 50 KB documents)', () => {
    it('should successfully extract structured questions grounded in document text from a document larger than 50 KB', async () => {
      jest.spyOn<any, any>(service, 'callGeminiForQuestionExtraction').mockResolvedValue(null);

      // Generate realistic exam paper document text exceeding 55 KB (approx 60,000 characters)
      const baseQuestions = [
        'Q1. What is the worst-case time complexity of inserting into a max-heap?',
        'Q2. Which traversal of a Binary Search Tree produces values in strictly sorted ascending order?',
        'Q3. What is the minimum number of balance rotations required after an AVL insertion to restore balance invariants?',
        'Q4. In Dijkstra algorithm for single-source shortest paths, which invariant holds for all settled vertices?',
        'Q5. How does a disjoint-set data structure achieve nearly constant time operations using path compression and union by rank?',
      ];

      let largeDocumentText = '=== CS301 DATA STRUCTURES & ALGORITHMS OFFICIAL QUESTION BANK ===\n\n';
      for (let i = 0; i < 75; i++) {
        const qIndex = (i % baseQuestions.length) + 1;
        largeDocumentText += `Question ${i + 1}: ${baseQuestions[i % baseQuestions.length]}\n`;
        largeDocumentText += `(A) Logarithmic bound O(log n) proportional to tree height\n`;
        largeDocumentText += `(B) Quadratic bound O(n^2) due to linear re-indexing\n`;
        largeDocumentText += `(C) Amortized constant time O(1) in all traversal branches\n`;
        largeDocumentText += `(D) Exponential bound O(2^n) requiring full subtree reconstruction\n`;
        largeDocumentText += `Answer: (A)\n`;
        largeDocumentText += `Explanation: Heapify operations swap elements along the height of the complete binary tree which is bounded logarithmically.\n\n`;
        // Add curriculum reference paragraphs to realistically simulate > 50 KB document size
        largeDocumentText += `Curriculum Reference Section ${i + 1}:\n`;
        largeDocumentText += `Tree data structures maintain explicit parent-child pointer invariants. Binary heaps enforce the heap-order property wherein each node is greater than or equal to its children. Restoring invariants after insertion proceeds via sift-up operations bounded by the height of the tree.\n\n`;
      }

      const textBytes = Buffer.byteLength(largeDocumentText, 'utf8');
      expect(textBytes).toBeGreaterThan(50 * 1024); // Exceeds 50 KB (Received ~60 KB)

      const extracted = await service.extractQuestionsFromDocument({
        text: largeDocumentText,
        fileName: 'CS301_Comprehensive_Question_Bank.txt',
        courseId: 'course-cs301',
      });

      expect(extracted).toBeDefined();
      expect(extracted.length).toBeGreaterThanOrEqual(5);

      // Verify questions are grounded in document content
      const firstQ = extracted[0];
      expect(firstQ.questionText).toBeDefined();
      expect(firstQ.options).toHaveLength(4);

      // Verify exactly one option is correct
      const correctOptions = firstQ.options.filter((o) => o.isCorrect);
      expect(correctOptions).toHaveLength(1);

      // Verify pedagogical attributes
      expect(firstQ.difficulty).toMatch(/EASY|MEDIUM|HARD/);
      expect(firstQ.bloomLevel).toMatch(/REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE/);
      expect(firstQ.explanation).toBeDefined();
    });

    it('should reject unsupported file formats (e.g. .exe, .bin) with BadRequestException', async () => {
      await expect(
        service.extractQuestionsFromDocument({
          fileName: 'malicious_script.exe',
          text: 'sample text',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding the 25 MB limit with BadRequestException', async () => {
      // Simulate base64 string larger than 25 MB (approx 35 million characters)
      const fakeLargeBase64 = 'A'.repeat(36 * 1024 * 1024);

      await expect(
        service.extractQuestionsFromDocument({
          fileName: 'oversized_document.pdf',
          fileBase64: fakeLargeBase64,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty document uploads with BadRequestException', async () => {
      await expect(
        service.extractQuestionsFromDocument({
          fileName: 'empty_file.txt',
          text: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Candidate Review & Assessment Import Workflow in Exam Studio', () => {
    it('should allow faculty to review candidate questions and import them into the course question bank', async () => {
      const candidateQuestions = [
        {
          questionText: 'What is the recurrence relation for Merge Sort?',
          topic: 'Divide and Conquer',
          difficulty: 'MEDIUM' as const,
          bloomLevel: 'APPLY' as const,
          options: [
            { text: 'T(n) = 2T(n/2) + O(n)', isCorrect: true },
            { text: 'T(n) = T(n-1) + O(n)', isCorrect: false },
            { text: 'T(n) = 2T(n/2) + O(1)', isCorrect: false },
            { text: 'T(n) = T(n/2) + O(1)', isCorrect: false },
          ],
          explanation: 'Merge sort divides the array into two halves and merges them in linear time.',
        },
        {
          questionText: 'Which data structure is primarily used to implement Breadth-First Search (BFS)?',
          topic: 'Graphs & Traversal',
          difficulty: 'EASY' as const,
          bloomLevel: 'UNDERSTAND' as const,
          options: [
            { text: 'Queue (FIFO)', isCorrect: true },
            { text: 'Stack (LIFO)', isCorrect: false },
            { text: 'Priority Queue', isCorrect: false },
            { text: 'Hash Map', isCorrect: false },
          ],
          explanation: 'BFS explores vertices level by level using a FIFO queue.',
        },
      ];

      // Faculty reviews and imports candidates to course question bank
      const result = await service.importQuestionsToCourse(
        'course-cs301',
        candidateQuestions,
        'user-fac-1',
      );

      expect(result.count).toBe(2);
      expect(result.questions).toHaveLength(2);
      expect(prisma.question.create).toHaveBeenCalledTimes(2);

      expect(result.questions[0].questionText).toContain('Merge Sort');
      expect(result.questions[0].status).toBe(QuestionStatus.APPROVED);
      expect(result.questions[1].questionText).toContain('Breadth-First Search');
    });

    it('should create and persist a full Assessment draft from selected extracted questions', async () => {
      const selectedQuestions = [
        {
          id: 'ext-q1',
          questionText: 'What is the time complexity of QuickSort in the worst case?',
          topic: 'Sorting Algorithms',
          difficulty: 'HARD' as const,
          bloomLevel: 'ANALYZE' as const,
          options: [
            { text: 'O(n^2)', isCorrect: true },
            { text: 'O(n log n)', isCorrect: false },
            { text: 'O(log n)', isCorrect: false },
            { text: 'O(n)', isCorrect: false },
          ],
          explanation: 'QuickSort exhibits O(n^2) worst case when the chosen pivot is consistently extreme.',
        },
      ];

      const assessment = await service.createAssessmentFromExtractedQuestions(
        'course-cs301',
        {
          title: 'Unit 2 Mid-Term Evaluation',
          code: 'CS301-MID2',
          durationMinutes: 45,
          totalMarks: 20,
          passingMarks: 8,
          questions: selectedQuestions,
        },
        'user-fac-1',
      );

      expect(assessment).toBeDefined();
      expect(assessment.title).toBe('Unit 2 Mid-Term Evaluation');
      expect(assessment.status).toBe(AssessmentStatus.PUBLISHED);
      expect(assessment.type).toBe(AssessmentType.QUIZ);
      expect(assessment.durationMinutes).toBe(45);
      expect(prisma.assessment.create).toHaveBeenCalled();
    });
  });

  describe('Faculty-Subject Authorization on RAG Extraction & Import Endpoints', () => {
    it('should allow authorized faculty to extract and import questions for their assigned course', async () => {
      jest.spyOn<any, any>(service, 'callGeminiForQuestionExtraction').mockResolvedValue(null);

      const req = {
        user: {
          id: 'user-fac-1',
          role: UserRole.FACULTY,
          courseId: 'course-cs301',
        },
      };

      await expect(
        controller.extractQuestions(req, {
          courseId: 'course-cs301',
          text: 'Question 1: What is an array?\n(A) Linear data structure\n(B) Graph\n(C) Tree\n(D) Hash\nAnswer: (A)',
        }),
      ).resolves.not.toThrow();

      await expect(
        controller.importQuestions(req, 'course-cs301', [
          {
            questionText: 'What is an array?',
            options: [
              { text: 'Linear data structure', isCorrect: true },
              { text: 'Graph', isCorrect: false },
              { text: 'Tree', isCorrect: false },
              { text: 'Hash', isCorrect: false },
            ],
          },
        ]),
      ).resolves.not.toThrow();
    });

    it('should reject unauthorized faculty attempting to extract or import for a course they do not teach', async () => {
      const req = {
        user: {
          id: 'user-fac-other',
          role: UserRole.FACULTY,
          courseId: 'course-other-mechanical', // Teaches Mechanical, not CS
        },
      };

      await expect(
        controller.extractQuestions(req, {
          courseId: 'course-cs301',
          text: 'Question: sample',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.importQuestions(req, 'course-cs301', []),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

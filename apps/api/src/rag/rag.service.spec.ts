import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiClientService } from '../ai/ai-client.service';
import { DocumentProcessingStatus, DocumentType } from '@prisma/client';

describe('RagService', () => {
  let service: RagService;
  let prisma: any;
  let aiClient: any;

  beforeEach(async () => {
    prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'course-1',
          code: 'CS301',
          name: 'Data Structures & Algorithms',
        }),
      },
      courseDocument: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'doc-1',
            courseId: 'course-1',
            title: 'Syllabus',
            fileName: 'syllabus.pdf',
            documentType: DocumentType.SYLLABUS,
            status: DocumentProcessingStatus.INDEXED,
            _count: { chunks: 3 },
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'doc-1',
          courseId: 'course-1',
          title: 'Syllabus',
          fileName: 'syllabus.pdf',
          chunks: [{ id: 'ch-1', chunkIndex: 1, content: 'AVL balancing trees' }],
        }),
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'doc-created',
            ...args.data,
            chunks: args.data.chunks?.create || [],
          }),
        ),
      },
      documentChunk: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ch-1',
            chunkIndex: 1,
            content: 'AVL balancing trees and balance factors in range {-1, 0, 1}',
            tokenCount: 15,
            document: { title: 'CS301 Syllabus', documentType: DocumentType.SYLLABUS },
          },
        ]),
      },
    };

    aiClient = {
      queryRag: jest.fn().mockResolvedValue(null),
      generateGroundedQuiz: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiClientService, useValue: aiClient },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return documents for a course', async () => {
    const docs = await service.getDocumentsByCourse('course-1');
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Syllabus');
  });

  it('should ingest and chunk document text', async () => {
    const created = await service.ingestDocument('course-1', {
      title: 'Lecture 1 Notes',
      docType: DocumentType.PRESENTATION_SLIDES,
      extractedText:
        'Paragraph 1 about continuous arrays in memory.\n\nParagraph 2 about linked list pointers.',
    });

    expect(created.title).toBe('Lecture 1 Notes');
    expect(created.status).toBe(DocumentProcessingStatus.INDEXED);
  });

  it('should query RAG and return ranked grounded content', async () => {
    const res = await service.queryCourseRag('course-1', 'balance factor');
    expect(res.course_code).toBe('CS301');
    expect(res.chunks).toBeDefined();
    expect(res.grounded_answer).toContain('CS301 Syllabus');
  });

  it('should generate grounded quiz questions', async () => {
    const res = await service.generateGroundedQuiz('course-1', 'Trees', 1);
    expect(res.questions.length).toBeGreaterThan(0);
    expect(res.questions[0].citation).toBeDefined();
  });
});

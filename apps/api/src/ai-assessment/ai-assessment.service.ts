import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiClientService } from '../ai/ai-client.service';
import {
  AIGenerationStatus,
  BloomTaxonomyLevel,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from '@prisma/client';

export interface GenerateStagedRequestDto {
  topicId: string;
  courseId: string;
  bloomLevel?: BloomTaxonomyLevel;
  difficulty?: QuestionDifficulty;
  count?: number;
  syllabusContext?: string;
}

export interface EditStagedQuestionDto {
  questionText?: string;
  explanation?: string;
  optionsJson?: string;
  difficulty?: QuestionDifficulty;
  bloomLevel?: BloomTaxonomyLevel;
}

@Injectable()
export class AiAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly aiClient?: AiClientService,
  ) {}

  /**
   * Generates questions via FastAPI microservice (or local fallback) and stages them for human approval.
   */
  async generateStagedQuestions(dto: GenerateStagedRequestDto) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
      include: { course: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic ${dto.topicId} not found.`);
    }

    const count = dto.count || 3;
    const bloomLevel = dto.bloomLevel || BloomTaxonomyLevel.APPLY;
    const difficulty = dto.difficulty || QuestionDifficulty.MEDIUM;

    let generatedItems: any[] = [];

    // Attempt generation through microservice bridge if active
    if (this.aiClient) {
      try {
        const response = await this.aiClient.generateQuestions({
          topic: topic.name,
          course_code: topic.course.code,
          bloom_level: bloomLevel,
          difficulty: difficulty,
          count: count,
          syllabus_context: dto.syllabusContext,
        });
        if (response && response.questions) {
          generatedItems = response.questions;
        }
      } catch (err) {
        // Handled transparently by local fallback generator
      }
    }

    // Local fallback generator if microservice is unreachable or returned empty
    if (generatedItems.length === 0) {
      generatedItems = this.getLocalFallbackQuestions(topic.name, bloomLevel, difficulty, count);
    }

    // Save as STAGED questions in database
    const savedStagedQuestions = [];
    for (const item of generatedItems) {
      const staged = await this.prisma.aIGeneratedQuestion.create({
        data: {
          topicId: topic.id,
          promptQuery: dto.syllabusContext || `Curriculum topic: ${topic.name}`,
          bloomLevel,
          difficulty,
          questionText: item.question_text || item.questionText,
          explanation: item.explanation,
          optionsJson: JSON.stringify(item.options),
          status: AIGenerationStatus.STAGED,
        },
      });
      savedStagedQuestions.push(staged);
    }

    return savedStagedQuestions;
  }

  /**
   * Retrieves staged questions awaiting faculty review.
   */
  async getStagedQuestions(topicId?: string, courseId?: string) {
    return this.prisma.aIGeneratedQuestion.findMany({
      where: {
        status: AIGenerationStatus.STAGED,
        ...(topicId ? { topicId } : {}),
        ...(courseId ? { topic: { courseId } } : {}),
      },
      include: {
        topic: { include: { course: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Faculty Action: Edit staged question before approval
   */
  async editStagedQuestion(id: string, dto: EditStagedQuestionDto) {
    const staged = await this.prisma.aIGeneratedQuestion.findUnique({ where: { id } });
    if (!staged) throw new NotFoundException('Staged question not found.');

    return this.prisma.aIGeneratedQuestion.update({
      where: { id },
      data: {
        ...(dto.questionText ? { questionText: dto.questionText } : {}),
        ...(dto.explanation ? { explanation: dto.explanation } : {}),
        ...(dto.optionsJson ? { optionsJson: dto.optionsJson } : {}),
        ...(dto.difficulty ? { difficulty: dto.difficulty } : {}),
        ...(dto.bloomLevel ? { bloomLevel: dto.bloomLevel } : {}),
      },
    });
  }

  /**
   * Faculty Action: Approve staged question and publish directly into the official Question Bank
   */
  async approveQuestion(stagedId: string, facultyUserId?: string) {
    const staged = await this.prisma.aIGeneratedQuestion.findUnique({
      where: { id: stagedId },
      include: { topic: true },
    });

    if (!staged) {
      throw new NotFoundException('Staged question not found.');
    }

    if (staged.status === AIGenerationStatus.APPROVED) {
      throw new BadRequestException('Question is already approved.');
    }

    const parsedOptions = JSON.parse(staged.optionsJson || '[]');

    // Create official Question entity in database
    const officialQuestion = await this.prisma.question.create({
      data: {
        courseId: staged.topic.courseId,
        topicId: staged.topicId,
        questionText: staged.questionText,
        explanation: staged.explanation,
        difficulty: staged.difficulty,
        type: QuestionType.MCQ_SINGLE,
        status: QuestionStatus.APPROVED,
        sourceType: 'AI_GROUNDED',
        options: {
          create: parsedOptions.map((opt: any, idx: number) => ({
            optionText: opt.text || opt.optionText,
            isCorrect: opt.is_correct ?? opt.isCorrect ?? false,
            order: idx,
          })),
        },
      },
    });

    // Update staged record to APPROVED with link
    const updatedStaged = await this.prisma.aIGeneratedQuestion.update({
      where: { id: stagedId },
      data: {
        status: AIGenerationStatus.APPROVED,
        approvedQuestionId: officialQuestion.id,
        reviewedBy: facultyUserId || 'FACULTY_USER',
        reviewedAt: new Date(),
      },
    });

    return {
      staged: updatedStaged,
      officialQuestion,
    };
  }

  /**
   * Faculty Action: Reject staged question with academic feedback
   */
  async rejectQuestion(stagedId: string, facultyUserId: string, feedback: string) {
    const staged = await this.prisma.aIGeneratedQuestion.findUnique({
      where: { id: stagedId },
    });

    if (!staged) {
      throw new NotFoundException('Staged question not found.');
    }

    return this.prisma.aIGeneratedQuestion.update({
      where: { id: stagedId },
      data: {
        status: AIGenerationStatus.REJECTED,
        facultyFeedback: feedback,
        reviewedBy: facultyUserId,
        reviewedAt: new Date(),
      },
    });
  }

  private getLocalFallbackQuestions(
    topicName: string,
    bloomLevel: BloomTaxonomyLevel,
    difficulty: QuestionDifficulty,
    count: number,
  ) {
    return [
      {
        question_text: `In the context of ${topicName}, which property mathematically guarantees optimal runtime performance under ${bloomLevel} analysis?`,
        options: [
          { text: `Strict enforcement of structural invariant bounds execution to logarithmic or linear time.`, is_correct: true },
          { text: `Permitting unbounded index growth eliminates lookup overhead.`, is_correct: false },
          { text: `Ignoring edge-case pointers prevents recursion depth issues.`, is_correct: false },
          { text: `Repeated linear scans yield constant O(1) performance.`, is_correct: false },
        ],
        explanation: `Under ${bloomLevel} analysis for ${topicName}, invariant preservation is essential for algorithmic correctness and guaranteed asymptotic scaling.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `When evaluating edge-case state mutations in ${topicName}, what architectural hazard must be avoided?`,
        options: [
          { text: `Overwriting reference pointers prior to saving sub-branch addresses.`, is_correct: true },
          { text: `Pre-allocating contiguous blocks with static size.`, is_correct: false },
          { text: `Maintaining dual index bounds for circular wraparounds.`, is_correct: false },
          { text: `Passing subtree boundaries recursively down the call hierarchy.`, is_correct: false },
        ],
        explanation: `In pointer-based and dynamically partitioned structures, mutation ordering is critical to avoid orphaned nodes and memory leaks.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
    ].slice(0, count);
  }
}

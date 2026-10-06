import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiClientService } from '../ai/ai-client.service';
import { AiQuestionGeneratorService } from '../ai/ai-question-generator.service';
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
    @Optional() private readonly geminiGenerator?: AiQuestionGeneratorService,
  ) {}

  /**
   * Generates questions via Gemini API (with microservice and local fallback) and stages them for human approval.
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

    // Attempt 1: Direct Google Gemini Generative AI synthesis
    if (this.geminiGenerator) {
      try {
        for (let i = 0; i < count; i++) {
          const geminiResult = await this.geminiGenerator.synthesizeReliableQuestion(
            topic.name,
            difficulty,
          );
          if (geminiResult) {
            generatedItems.push({
              question_text: geminiResult.questionText,
              options: geminiResult.options.map((opt) => ({
                text: opt.optionText,
                is_correct: opt.isCorrect,
                misconception_tag: opt.misconception,
              })),
              explanation: geminiResult.explanation,
              bloom_level: bloomLevel,
              difficulty: difficulty,
            });
          }
          if (generatedItems.length >= count) break;
        }
      } catch (err) {
        // Fall through to microservice and local fallback
      }
    }

    // Attempt 2: Microservice bridge if active and more questions are needed
    if (generatedItems.length < count && this.aiClient) {
      try {
        const response = await this.aiClient.generateQuestions({
          topic: topic.name,
          course_code: topic.course.code,
          bloom_level: bloomLevel,
          difficulty: difficulty,
          count: count - generatedItems.length,
          syllabus_context: dto.syllabusContext,
        });
        if (response && response.questions) {
          generatedItems.push(...response.questions);
        }
      } catch (err) {
        // Handled transparently by local fallback generator
      }
    }

    // Attempt 3: If still fewer than requested count, top up with local fallback generator
    if (generatedItems.length < count) {
      const fallbackQuestions = this.getLocalFallbackQuestions(topic.name, bloomLevel, difficulty, 10);
      for (const fb of fallbackQuestions) {
        if (generatedItems.length >= count) break;
        const fbStem = fb.question_text || (fb as any).questionText;
        const alreadyExists = generatedItems.some(
          (gi) => (gi.question_text || gi.questionText) === fbStem,
        );
        if (!alreadyExists) {
          generatedItems.push(fb);
        }
      }
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
    const templates = [
      {
        question_text: `In the context of ${topicName}, which property mathematically guarantees optimal runtime performance under ${bloomLevel} analysis?`,
        options: [
          { text: `Strict enforcement of structural invariants bounds asymptotic complexity to optimal bounds.`, is_correct: true },
          { text: `Permitting unbounded index growth eliminates lookup overhead.`, is_correct: false, misconception_tag: `Unbounded memory hazard` },
          { text: `Ignoring edge-case pointers prevents recursion depth issues.`, is_correct: false, misconception_tag: `Unsafe pointer de-referencing` },
          { text: `Repeated linear scans yield constant O(1) performance.`, is_correct: false, misconception_tag: `Confusing linear scan with constant lookup` },
        ],
        explanation: `Under ${bloomLevel} analysis for ${topicName}, strict invariant preservation is essential for algorithmic correctness and guaranteed asymptotic scaling.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `When evaluating edge-case state mutations in ${topicName}, what structural hazard must be systematically prevented?`,
        options: [
          { text: `Overwriting reference pointers prior to securing descendant addresses.`, is_correct: true },
          { text: `Pre-allocating contiguous blocks with static size.`, is_correct: false, misconception_tag: `Confusing dynamic growth with memory corruption` },
          { text: `Maintaining dual index bounds for circular wraparounds.`, is_correct: false, misconception_tag: `Assuming dual bounds cause deadlocks` },
          { text: `Passing subtree boundaries recursively down the call hierarchy.`, is_correct: false, misconception_tag: `Misunderstanding recursive scoping` },
        ],
        explanation: `In ${topicName}, state mutation ordering is critical to avoid orphaned elements, memory leaks, and segmentation violations.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `What is the primary trade-off when selecting ${topicName} for memory-constrained embedded systems?`,
        options: [
          { text: `Balancing pointer/metadata memory overhead against logarithmic or amortized operation time.`, is_correct: true },
          { text: `Sacrificing deterministic correctness for lower instruction cache misses.`, is_correct: false, misconception_tag: `Compromising correctness for performance` },
          { text: `Requiring quadratic O(N²) auxiliary stack space for all read passes.`, is_correct: false, misconception_tag: `Over-estimating stack allocation` },
          { text: `Eliminating the need for bounds checking at runtime.`, is_correct: false, misconception_tag: `Neglecting memory safety guards` },
        ],
        explanation: `Data structures in ${topicName} often incur structural storage metadata (e.g., node links, balance factors, capacity headers) in exchange for asymptotic speed.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `How does memory hierarchy and spatial cache locality impact access operations within ${topicName}?`,
        options: [
          { text: `Contiguous memory layouts minimize CPU cache line misses compared to fragmented heap-allocated nodes.`, is_correct: true },
          { text: `Linked node representations consistently maximize L1 data cache prefetching.`, is_correct: false, misconception_tag: `Assuming pointer indirection has zero cache penalty` },
          { text: `Cache line size has zero measurable impact on asymptotic complexity in actual hardware execution.`, is_correct: false, misconception_tag: `Equating theoretical RAM model with hardware cache behavior` },
          { text: `Scattered pointer indirection accelerates RAM burst access cycles.`, is_correct: false, misconception_tag: `Inverting memory bus physics` },
        ],
        explanation: `Hardware CPU caches favor sequential, contiguous memory blocks. In ${topicName}, spatial locality significantly affects real-world wall-clock latency.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `Under ${difficulty} difficulty constraints, what loop or recursive invariant must hold across every iteration in ${topicName}?`,
        options: [
          { text: `The active partition or traversed segment strictly maintains the valid topological or sorted sub-structure.`, is_correct: true },
          { text: `The recursion depth must strictly equal the total element count N.`, is_correct: false, misconception_tag: `Confusing tree/call depth with element cardinality` },
          { text: `All intermediate pointers are nulled out before returning results.`, is_correct: false, misconception_tag: `Premature de-allocation error` },
          { text: `The time complexity doubles after each recursive division step.`, is_correct: false, misconception_tag: `Misunderstanding Master Theorem divide-and-conquer recurrence` },
        ],
        explanation: `Algorithmic correctness proofs require an invariant that remains true before, during, and after each state change in ${topicName}.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `When refactoring ${topicName} from a recursive formulation to an iterative model, what architectural component is typically introduced?`,
        options: [
          { text: `An explicit auxiliary stack or queue to manage execution state without call-stack overflow risk.`, is_correct: true },
          { text: `A global singleton lock to serialize all memory reads.`, is_correct: false, misconception_tag: `Introducing unnecessary concurrency bottlenecks` },
          { text: `A circular hash map that replaces all index arithmetic.`, is_correct: false, misconception_tag: `Over-complicating state tracking` },
          { text: `An unconstrained while loop relying purely on catch blocks.`, is_correct: false, misconception_tag: `Anti-pattern exception flow control` },
        ],
        explanation: `Iterative transformations eliminate recursive call stack overhead by managing memory frames on the program heap using explicit data structures.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `Under worst-case adversarial input distribution, what degenerate behavior can manifest in standard ${topicName} algorithms?`,
        options: [
          { text: `Degradation from expected logarithmic/linearithmic scaling to quadratic O(N²) time due to skewed partitioning.`, is_correct: true },
          { text: `Sudden reduction to O(1) constant time without processing elements.`, is_correct: false, misconception_tag: `Illogical complexity reduction` },
          { text: `Immediate memory deallocation triggering kernel panic.`, is_correct: false, misconception_tag: `Confusing algorithmic degradation with OS faults` },
          { text: `Conversion of comparison operators into arithmetic bitwise shifts.`, is_correct: false, misconception_tag: `Misattributing compiler optimization` },
        ],
        explanation: `Adversarial inputs can cause skewed pivot choices or unbalanced trees, degrading performance unless self-balancing or randomized pivots are used.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `Which testing strategy provides the highest verification coverage when validating ${topicName} boundary conditions?`,
        options: [
          { text: `Testing empty state, single element, full capacity, and duplicate/inverted keys.`, is_correct: true },
          { text: `Executing a single test case with 10 random positive integers.`, is_correct: false, misconception_tag: `Superficial happy-path testing` },
          { text: `Only checking happy-path operations under medium-sized inputs.`, is_correct: false, misconception_tag: `Neglecting edge-case boundary analysis` },
          { text: `Relying solely on compile-time type verification.`, is_correct: false, misconception_tag: `Confusing static type safety with semantic correctness` },
        ],
        explanation: `Comprehensive verification of ${topicName} mandates exercising extrema: N=0, N=1, max capacity, wrap-arounds, and boundary collisions.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `In concurrent environments, what concurrency hazard is most prevalent when multiple threads mutate ${topicName}?`,
        options: [
          { text: `Race conditions leading to lost updates or torn pointers during simultaneous rebalancing/resizing.`, is_correct: true },
          { text: `Automatic conversion of synchronous functions into asynchronous coroutines.`, is_correct: false, misconception_tag: `Misunderstanding threading semantics` },
          { text: `Static array bounds automatically expanding in memory without thread synchronization.`, is_correct: false, misconception_tag: `Assuming arrays self-synchronize` },
          { text: `Threads entering infinite loops due to CPU thermal throttling.`, is_correct: false, misconception_tag: `Confusing hardware thermal management with software concurrency` },
        ],
        explanation: `Structural updates in ${topicName} require atomic synchronization or locks to prevent race conditions during node reassignment or buffer growth.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
      {
        question_text: `From an educational assessment perspective, how does a Bloom ${bloomLevel} question on ${topicName} test student mastery?`,
        options: [
          { text: `It requires reasoning through structural mechanics, predicting asymptotic outcomes, and evaluating trade-offs.`, is_correct: true },
          { text: `It only tests superficial keyword matching from lecture slides.`, is_correct: false, misconception_tag: `Trivial rote memorization` },
          { text: `It assesses physical keyboard typing speed rather than algorithmic logic.`, is_correct: false, misconception_tag: `Irrelevant assessment metric` },
          { text: `It guarantees students only solve pre-memorized syntax templates.`, is_correct: false, misconception_tag: `Conflating cognitive taxonomy with syntax recall` },
        ],
        explanation: `Higher-order cognitive levels (Bloom ${bloomLevel}) require students to synthesize core principles of ${topicName} rather than rote recall.`,
        bloom_level: bloomLevel,
        difficulty: difficulty,
      },
    ];

    const requestedCount = Math.max(1, Math.min(count, 10));
    return templates.slice(0, requestedCount);
  }
}

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ResourceType,
  AIMessageRole,
  SocraticActionType,
  QuestionDifficulty,
} from '@prisma/client';

export interface SocraticRemediationResponse {
  conversationId: string;
  topicName: string;
  courseCode: string;
  distractorDiagnosis: string;
  coreTheoreticalExplanation: string;
  socraticPrompt: string;
  analogy: string;
  codeExample: {
    language: string;
    code: string;
    explanation: string;
  };
  recommendedResources: {
    id: string;
    title: string;
    resourceType: ResourceType;
    url: string;
    estimatedMinutes: number;
    author: string;
  }[];
  similarPracticeQuestions: {
    id: string;
    questionText: string;
    difficulty: QuestionDifficulty;
  }[];
}

@Injectable()
export class SocraticTutorService {
  private readonly logger = new Logger('SocraticTutorService');

  constructor(private prisma: PrismaService) {}

  /**
   * Generates grounded, Socratic assistance whenever a student answers incorrectly during practice
   */
  async generateSocraticRemediation(
    studentId: string,
    params: {
      questionId: string;
      selectedOptionId: string;
    },
  ): Promise<SocraticRemediationResponse> {
    const { questionId, selectedOptionId } = params;

    // 1. Fetch question, options, topic, and course
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        topic: { include: { course: true } },
        options: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found.');
    }

    const selectedOption = question.options.find((o) => o.id === selectedOptionId);
    const correctOption = question.options.find((o) => o.isCorrect);

    if (!selectedOption) {
      throw new BadRequestException('Selected option does not belong to this question.');
    }

    const topicSlug = question.topic.slug;
    const topicName = question.topic.name;
    const courseCode = question.topic.course.code;

    // 2. Synthesize pedagogical Socratic diagnosis
    const distractorDiagnosis = this.generateDistractorAnalysis(
      question.questionText,
      selectedOption.optionText,
      correctOption ? correctOption.optionText : '',
      topicSlug,
    );

    const analogy = this.getTopicAnalogy(topicSlug);
    const codeExample = this.getTopicCodeExample(topicSlug);

    const socraticPrompt = `Think about this: ${this.getSocraticQuestion(
      topicSlug,
      selectedOption.optionText,
    )}`;

    // 3. Create or find active AIConversation
    const conversation = await this.prisma.aIConversation.create({
      data: {
        studentId,
        questionId: question.id,
        topicId: question.topicId,
      },
    });

    // 4. Save initial AI Socratic message
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: AIMessageRole.ASSISTANT,
        actionType: SocraticActionType.SOCRATIC_PROMPT,
        content: `${distractorDiagnosis}\n\n${question.explanation}\n\n${socraticPrompt}`,
        metadata: JSON.stringify({
          selectedOptionText: selectedOption.optionText,
          correctOptionText: correctOption?.optionText,
        }),
      },
    });

    // 5. Retrieve curated approved university learning resources
    const resources = await this.getCuratedTopicResources(question.topicId, topicSlug);

    // 6. Retrieve adjacent similar questions for immediate follow-up practice
    const similarQuestions = await this.findSimilarQuestions(
      question.id,
      question.topicId,
      question.difficulty,
    );

    return {
      conversationId: conversation.id,
      topicName,
      courseCode,
      distractorDiagnosis,
      coreTheoreticalExplanation: question.explanation,
      socraticPrompt,
      analogy,
      codeExample,
      recommendedResources: resources,
      similarPracticeQuestions: similarQuestions,
    };
  }

  /**
   * Handles interactive conversational actions with the Socratic AI tutor
   */
  async handleSocraticAction(
    studentId: string,
    params: {
      conversationId: string;
      actionType: SocraticActionType;
      userMessage?: string;
    },
  ) {
    const { conversationId, actionType, userMessage } = params;

    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        topic: { include: { course: true } },
        question: { include: { options: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 10 },
      },
    });

    if (!conversation || conversation.studentId !== studentId) {
      throw new NotFoundException('AI Socratic conversation not found or access denied.');
    }

    const topicSlug = conversation.topic.slug;
    let assistantReply = '';
    let metadata: any = {};

    switch (actionType) {
      case SocraticActionType.EXPLAIN_SIMPLY: {
        const analogy = this.getTopicAnalogy(topicSlug);
        assistantReply = `💡 **Beginner Analogy for ${conversation.topic.name}:**\n\n${analogy}\n\nDoes this mental model make the underlying mechanism clearer?`;
        break;
      }

      case SocraticActionType.REAL_WORLD_EXAMPLE: {
        const ex = this.getTopicCodeExample(topicSlug);
        assistantReply = `💻 **Real-World Code Implementation (${ex.language}):**\n\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n\n📌 **Key Takeaway:** ${ex.explanation}`;
        metadata = { codeExample: ex };
        break;
      }

      case SocraticActionType.ASK_FOLLOW_UP: {
        if (!userMessage || userMessage.trim().length === 0) {
          throw new BadRequestException('Please provide a follow-up query.');
        }

        // Record student query
        await this.prisma.aIMessage.create({
          data: {
            conversationId: conversation.id,
            role: AIMessageRole.USER,
            actionType: SocraticActionType.ASK_FOLLOW_UP,
            content: userMessage,
          },
        });

        assistantReply = this.generateSocraticFollowUpResponse(
          userMessage,
          conversation.topic.name,
          conversation.question?.questionText || '',
        );
        break;
      }

      case SocraticActionType.PRACTICE_SIMILAR: {
        const similar = await this.findSimilarQuestions(
          conversation.questionId || '',
          conversation.topicId,
          conversation.question?.difficulty || QuestionDifficulty.MEDIUM,
        );
        assistantReply = `🎯 **Targeted Follow-Up Practice:**\nWe have queued ${similar.length} adjacent problems in ${conversation.topic.name} to reinforce this concept. Let's test your understanding!`;
        metadata = { similarQuestions: similar };
        break;
      }

      default:
        assistantReply = `Let's focus on mastering the core principles of ${conversation.topic.name}.`;
    }

    // Save assistant response
    const savedMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: AIMessageRole.ASSISTANT,
        actionType,
        content: assistantReply,
        metadata: JSON.stringify(metadata),
      },
    });

    return {
      messageId: savedMessage.id,
      conversationId: conversation.id,
      actionType,
      reply: assistantReply,
      metadata,
    };
  }

  /**
   * Retrieves conversation history for active review
   */
  async getConversationHistory(studentId: string, conversationId: string) {
    const conv = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        topic: true,
        question: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conv || conv.studentId !== studentId) {
      throw new NotFoundException('Conversation not found.');
    }

    return conv;
  }

  /**
   * Retrieves approved university learning materials linked to a topic
   */
  async getCuratedTopicResources(topicId: string, topicSlug?: string) {
    const resources = await this.prisma.learningResource.findMany({
      where: { topicId },
      take: 6,
    });

    if (resources.length > 0) {
      return resources.map((r) => ({
        id: r.id,
        title: r.title,
        resourceType: r.resourceType,
        url: r.url,
        estimatedMinutes: r.estimatedMinutes,
        author: r.author || 'CHARUSAT Academic Department',
      }));
    }

    // Fallback university approved materials catalog
    return this.getDefaultUniversityResources(topicSlug || 'arrays-dynamic-arrays');
  }

  /**
   * Retrieves similar questions from the question bank to reinforce understanding
   */
  async findSimilarQuestions(
    excludeQuestionId: string,
    topicId: string,
    difficulty: QuestionDifficulty,
  ) {
    const questions = await this.prisma.question.findMany({
      where: {
        topicId,
        id: { not: excludeQuestionId },
        status: 'APPROVED',
      },
      take: 3,
      select: {
        id: true,
        questionText: true,
        difficulty: true,
      },
    });

    return questions;
  }

  // ============================================================================
  // Pedagogical Socratic Knowledge Synthesis Helpers
  // ============================================================================

  private generateDistractorAnalysis(
    questionText: string,
    selectedOptionText: string,
    correctOptionText: string,
    topicSlug: string,
  ): string {
    return `⚠️ **Conceptual Distractor Diagnosis:** You selected: *"${selectedOptionText}"*.\nWhile this answer is a common misconception in ${topicSlug.replace(/-/g, ' ')}, it overlooks the required invariants. The correct principle is: *"${correctOptionText}"*.`;
  }

  private getSocraticQuestion(topicSlug: string, selectedText: string): string {
    if (topicSlug.includes('tree') || topicSlug.includes('bst')) {
      return 'What happens to the left and right sub-tree constraints when we enforce the Binary Search Tree invariant at every node?';
    }
    if (topicSlug.includes('dynamic') || topicSlug.includes('dp')) {
      return 'Does computing this subproblem multiple times recalculate overlapping states without memoization?';
    }
    if (topicSlug.includes('array')) {
      return 'How does contiguous memory allocation in an array affect pointer arithmetic and cache locality?';
    }
    if (topicSlug.includes('pointer') || topicSlug.includes('linked')) {
      return 'If we reassign the next pointer before saving the reference, what happens to the remaining linked nodes?';
    }
    return `Under what specific boundary condition would "${selectedText}" fail to hold true?`;
  }

  private getTopicAnalogy(topicSlug: string): string {
    const analogies: Record<string, string> = {
      'arrays-dynamic-arrays':
        'Think of an array as a row of numbered lockers at a railway station. You know the exact physical address of locker #5 immediately (O(1)), but if you want to insert a new locker in the middle, you must physically push all succeeding lockers one spot down.',
      'linked-lists-pointers':
        'Imagine a treasure hunt where each clue written on a piece of paper contains the coordinates of the next clue. You cannot jump directly to clue #10 without reading clues 1 through 9 first, but inserting a new clue simply requires writing the new coordinate on the slip.',
      'trees-binary-search-trees':
        'Consider a corporate organizational hierarchy. If the CEO dictates that every vice-president to their left manages departments with budget < X, and every vice-president to their right manages budget > X, searching for any budget item eliminates half the company at every step.',
      'dynamic-programming':
        'Write "1 + 1 + 1 + 1 + 1" on a piece of paper and ask someone what that equals. They say "5". Now add another "+ 1" to the end and ask again. They say "6" instantly because they remembered the previous subproblem answer ("5") without recalculating from scratch.',
      'graph-algorithms-traversals':
        'Imagine a spider navigating a web or a pilot looking at an airline flight map. Breadth-First Search (BFS) explores all cities 1 flight away before moving to cities 2 flights away, while Depth-First Search (DFS) follows a single airline path until it hits a dead end.',
    };

    return analogies[topicSlug] || analogies['arrays-dynamic-arrays'];
  }

  private getTopicCodeExample(topicSlug: string): {
    language: string;
    code: string;
    explanation: string;
  } {
    if (topicSlug.includes('dynamic')) {
      return {
        language: 'python',
        code: `memo = {}\ndef fib(n):\n    if n <= 1: return n\n    if n not in memo:\n        memo[n] = fib(n - 1) + fib(n - 2) # Memoize state\n    return memo[n]`,
        explanation: 'Caching recursive calls reduces the time complexity from exponential O(2^N) to linear O(N).',
      };
    }

    if (topicSlug.includes('tree') || topicSlug.includes('bst')) {
      return {
        language: 'python',
        code: `def search_bst(root, target):\n    if not root or root.val == target:\n        return root\n    if target < root.val:\n        return search_bst(root.left, target)\n    return search_bst(root.right, target)`,
        explanation: 'Each comparison discards half the remaining subtree, yielding O(log N) average search time.',
      };
    }

    return {
      language: 'cpp',
      code: `// Two-pointer array partition\nint left = 0, right = n - 1;\nwhile (left < right) {\n    if (arr[left] + arr[right] == target) return true;\n    else if (arr[left] + arr[right] < target) left++;\n    else right--;\n}`,
      explanation: 'Takes advantage of sorted contiguous arrays to achieve O(N) linear time with O(1) extra space.',
    };
  }

  private generateSocraticFollowUpResponse(
    userMessage: string,
    topicName: string,
    questionText: string,
  ): string {
    const msg = userMessage.toLowerCase();
    if (msg.includes('why') || msg.includes('how')) {
      return `Good observation. In ${topicName}, consider what happens to the asymptotic space complexity. When evaluating "${questionText.slice(
        0,
        50,
      )}...", ask yourself: does the algorithm require additional dynamic heap memory or does it operate in-place?`;
    }
    if (msg.includes('example') || msg.includes('code')) {
      return `Let's trace a concrete case: consider an input of size N = 4. Step through the first iteration manually: what is the state of the pointer or table before and after the conditional branch?`;
    }
    return `That's an insightful question about ${topicName}. Notice how the time complexity bound is governed by the loop invariant. If the invariant breaks, what error would you expect at runtime?`;
  }

  private getDefaultUniversityResources(topicSlug: string) {
    return [
      {
        id: 'res-1',
        title: `CHARUSAT CS301 Unit Lecture Notes: ${topicSlug.replace(/-/g, ' ').toUpperCase()}`,
        resourceType: ResourceType.LECTURE_SLIDE,
        url: 'https://charusat.ac.in/academics/curriculum/cs301-lecture-notes',
        estimatedMinutes: 20,
        author: 'Department of Computer Science & Engineering, CSPIT',
      },
      {
        id: 'res-2',
        title: `Curated Faculty Walkthrough: Overcoming Common Pitfalls in ${topicSlug.replace(/-/g, ' ')}`,
        resourceType: ResourceType.VIDEO_WALKTHROUGH,
        url: 'https://charusat.ac.in/learning/video-archives/cs301-pitfalls',
        estimatedMinutes: 15,
        author: 'Prof. CSE Faculty (CHARUSAT)',
      },
      {
        id: 'res-3',
        title: 'Interactive Algorithm Visualizer & Memory Sandbox',
        resourceType: ResourceType.CODE_SANDBOX,
        url: 'https://visualgo.net/en',
        estimatedMinutes: 10,
        author: 'CLIAS Open Courseware',
      },
    ];
  }
}

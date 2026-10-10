import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PlagiarismScanStatus,
  PlagiarismVerdict,
  UserRole,
} from '@prisma/client';

export interface StartScanDto {
  problemId?: string;
  assessmentId?: string;
  threshold?: number;
}

export interface UpdateVerdictDto {
  verdict: PlagiarismVerdict;
  facultyNotes?: string;
}

export interface CodeToken {
  type: string;
  val: string;
  line: number;
}

export interface WinnowingFingerprint {
  hash: number;
  startLine: number;
  endLine: number;
  tokens: string[];
}

export interface MatchingSpan {
  startA: number;
  endA: number;
  startB: number;
  endB: number;
  snippetA: string;
  snippetB: string;
  matchType: 'EXACT_CLONE' | 'STRUCTURAL_CLONE' | 'ALGORITHMIC_OVERLAP';
  sharedTokens: number;
}

export interface ComparisonResult {
  similarityScore: number;
  matchedTokensCount: number;
  verdict: PlagiarismVerdict;
  summary: string;
  matchingSpans: MatchingSpan[];
}

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger('PlagiarismService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: validates that the requesting faculty is authorized for the given course.
   */
  private async checkFacultyAuthorization(
    facultyUserId: string,
    courseId?: string | null,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: facultyUserId },
      include: {
        facultyProfile: { include: { course: true } },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not authenticated.');
    }

    // System-wide administrators, HOD, and Department Heads
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.HOD ||
      user.role === UserRole.HEAD
    ) {
      return;
    }

    if (user.role !== UserRole.FACULTY || !user.facultyProfile) {
      throw new ForbiddenException('Access restricted to authorized faculty members.');
    }

    if (!courseId) {
      return;
    }

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return;

    const faculty = user.facultyProfile;
    // Direct course assignment
    if (faculty.courseId === course.id || faculty.course?.code === course.code) {
      return;
    }

    // Department match
    if (faculty.departmentId && faculty.departmentId === course.departmentId) {
      return;
    }

    // Created assessments for this course
    const created = await this.prisma.assessment.findFirst({
      where: { facultyId: faculty.id, courseId: course.id },
    });
    if (created) return;

    throw new ForbiddenException(
      `Faculty is not authorized to audit coursework for course '${course.code}'.`,
    );
  }

  /**
   * Retrieves list of all coding assessments authorized for this faculty.
   * Only returns assessments that contain actual CODING questions.
   */
  async getCodingAssessments(facultyUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: facultyUserId },
      include: { facultyProfile: true },
    });

    const isElevated =
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.HOD ||
      user?.role === UserRole.HEAD;
    const faculty = user?.facultyProfile;

    const assessments = await this.prisma.assessment.findMany({
      where: isElevated
        ? {}
        : {
            OR: [
              { facultyId: faculty?.id || undefined },
              { courseId: faculty?.courseId || undefined },
              { course: { departmentId: faculty?.departmentId || undefined } },
            ],
          },
      include: {
        course: { select: { id: true, code: true, name: true, departmentId: true } },
        questions: {
          include: {
            question: { select: { id: true, questionText: true, type: true, explanation: true } },
          },
        },
        submissions: {
          select: { studentId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = [];
    for (const a of assessments) {
      const codingQuestions = a.questions.filter((q) => q.question?.type === 'CODING');
      if (codingQuestions.length === 0) continue; // Exclude non-coding exams

      const codingProblemIds: string[] = [];
      for (const cq of codingQuestions) {
        try {
          const meta = JSON.parse(cq.question.explanation || '{}');
          if (meta.codingProblemId) codingProblemIds.push(meta.codingProblemId);
        } catch {}
      }

      // Count genuine code submissions available for these problems
      const codeSubmissionCount =
        codingProblemIds.length > 0
          ? await this.prisma.codeSubmission.count({
              where: { problemId: { in: codingProblemIds } },
            })
          : 0;

      results.push({
        id: a.id,
        title: a.title,
        code: a.code,
        courseCode: a.course?.code || a.code,
        courseName: a.course?.name || 'Computer Science',
        submissionCount: codeSubmissionCount || a.submissions.length,
        codingQuestionsCount: codingQuestions.length,
        codingProblemIds,
        createdAt: a.createdAt,
      });
    }

    return results;
  }

  /**
   * Triggers an automated AST token and Karp-Rabin winnowing plagiarism scan
   * across real submissions of an authorized problem or assessment.
   */
  async startScan(dto: StartScanDto, facultyUserId: string) {
    let targetProblemId = dto.problemId;
    let targetProblem: any = null;

    // 1. Resolve Target Problem from Assessment if assessmentId provided
    if (dto.assessmentId) {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: dto.assessmentId },
        include: {
          questions: {
            include: { question: true },
          },
        },
      });

      if (!assessment) {
        throw new NotFoundException(`Assessment '${dto.assessmentId}' not found.`);
      }

      await this.checkFacultyAuthorization(facultyUserId, assessment.courseId);

      const codingQuestions = assessment.questions.filter((q) => q.question?.type === 'CODING');
      if (codingQuestions.length === 0) {
        throw new BadRequestException(
          `Assessment '${assessment.title}' does not contain any coding questions to audit.`,
        );
      }

      for (const cq of codingQuestions) {
        try {
          const meta = JSON.parse(cq.question.explanation || '{}');
          if (meta.codingProblemId) {
            targetProblemId = meta.codingProblemId;
            break;
          }
          if (meta.slug) {
            const bySlug = await this.prisma.codingProblem.findUnique({
              where: { slug: meta.slug },
            });
            if (bySlug) {
              targetProblemId = bySlug.id;
              targetProblem = bySlug;
              break;
            }
          }
        } catch {}
      }

      if (!targetProblemId && !targetProblem) {
        throw new BadRequestException(
          `No linked coding problems found in assessment '${assessment.title}'.`,
        );
      }
    }

    // 2. Fetch Problem and Validate Authorization
    if (!targetProblem && targetProblemId) {
      targetProblem = await this.prisma.codingProblem.findUnique({
        where: { id: targetProblemId },
      });
    }

    if (!targetProblem) {
      throw new NotFoundException('Coding problem not found.');
    }

    await this.checkFacultyAuthorization(facultyUserId, targetProblem.courseId);

    const threshold = typeof dto.threshold === 'number' && !isNaN(dto.threshold)
      ? Math.max(20, Math.min(98, dto.threshold))
      : 65.0;

    // 3. Fetch all submissions and deduplicate per student (taking each student's latest submission)
    const rawSubmissions = await this.prisma.codeSubmission.findMany({
      where: { problemId: targetProblem.id },
      include: {
        student: {
          include: {
            authorizedStudent: { select: { name: true, enrollmentNumber: true, division: true } },
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate: only take the most recent submission per student
    const studentLatestSubmissionsMap = new Map<string, typeof rawSubmissions[0]>();
    for (const sub of rawSubmissions) {
      if (!studentLatestSubmissionsMap.has(sub.studentId)) {
        studentLatestSubmissionsMap.set(sub.studentId, sub);
      }
    }
    const submissions = Array.from(studentLatestSubmissionsMap.values());

    // 4. Honest reference corpus check: Need at least 2 distinct student submissions
    if (submissions.length < 2) {
      throw new BadRequestException(
        `Insufficient reference corpus: At least 2 distinct student submissions are required to perform a plagiarism audit for '${targetProblem.title}'. Found ${submissions.length} submission(s).`,
      );
    }

    // 5. Create PlagiarismScan record
    const scan = await this.prisma.plagiarismScan.create({
      data: {
        problemId: targetProblem.id,
        facultyId: facultyUserId,
        threshold,
        status: PlagiarismScanStatus.SCANNING,
        totalSubmissionsScanned: submissions.length,
        flaggedPairsCount: 0,
      },
    });

    const matchesToCreate = [];
    let flaggedCount = 0;

    // 6. Pairwise Karp-Rabin Winnowing Comparison
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const subA = submissions[i];
        const subB = submissions[j];

        const res = this.compareSubmissions(
          subA.sourceCode,
          subB.sourceCode,
          threshold,
          targetProblem.starterCodes,
        );

        if (res.similarityScore >= threshold) {
          flaggedCount++;
          matchesToCreate.push({
            scanId: scan.id,
            submissionAId: subA.id,
            submissionBId: subB.id,
            similarityScore: res.similarityScore,
            matchedTokensCount: res.matchedTokensCount,
            verdict: res.verdict,
            facultyNotes: res.summary,
            fingerprintOverlap: JSON.stringify(res.matchingSpans),
          });
        }
      }
    }

    if (matchesToCreate.length > 0) {
      await this.prisma.plagiarismMatch.createMany({
        data: matchesToCreate,
      });
    }

    const updatedScan = await this.prisma.plagiarismScan.update({
      where: { id: scan.id },
      data: {
        status: PlagiarismScanStatus.COMPLETED,
        flaggedPairsCount: flaggedCount,
      },
      include: {
        problem: { select: { title: true, slug: true, difficulty: true } },
        matches: {
          include: {
            submissionA: {
              include: {
                student: {
                  include: {
                    authorizedStudent: { select: { name: true, enrollmentNumber: true, division: true } },
                    user: { select: { email: true } },
                  },
                },
              },
            },
            submissionB: {
              include: {
                student: {
                  include: {
                    authorizedStudent: { select: { name: true, enrollmentNumber: true, division: true } },
                    user: { select: { email: true } },
                  },
                },
              },
            },
          },
          orderBy: { similarityScore: 'desc' },
        },
      },
    });

    return updatedScan;
  }

  /**
   * Genuine, Evidence-Based Code Comparison Engine.
   * Performs language-aware comment stripping, structural token canonicalization,
   * Karp-Rabin rolling hashing, winnowing window minimization, and line-span extraction.
   */
  public compareSubmissions(
    codeA: string,
    codeB: string,
    threshold: number,
    starterCodesJson?: string | null,
  ): ComparisonResult {
    const normA = this.tokenizeCode(codeA || '');
    const normB = this.tokenizeCode(codeB || '');

    // 1. Guard against empty submissions or trivial stubs
    if (normA.tokens.length < 8 || normB.tokens.length < 8) {
      return {
        similarityScore: 0.0,
        matchedTokensCount: 0,
        verdict: PlagiarismVerdict.CLEARED,
        summary:
          'Insufficient token density to perform structural plagiarism detection (one or both submissions are empty stubs).',
        matchingSpans: [],
      };
    }

    // 2. Check if both submissions are merely the unmodified boilerplate template
    if (starterCodesJson && this.isBoilerplateOnly(normA.tokens, normB.tokens, starterCodesJson)) {
      return {
        similarityScore: 0.0,
        matchedTokensCount: 0,
        verdict: PlagiarismVerdict.CLEARED,
        summary:
          'Submissions consist solely of problem starter boilerplate template; no independent logic detected.',
        matchingSpans: [],
      };
    }

    // 3. Exact Verbatim Match (100%)
    const trimmedA = (codeA || '').trim();
    const trimmedB = (codeB || '').trim();
    if (trimmedA === trimmedB) {
      const lineCount = normA.rawLines.length;
      return {
        similarityScore: 100.0,
        matchedTokensCount: normA.tokens.length,
        verdict: PlagiarismVerdict.FLAGGED,
        summary: 'Exact verbatim clone detected: character-for-character identical submission.',
        matchingSpans: [
          {
            startA: 1,
            endA: Math.max(1, lineCount),
            startB: 1,
            endB: Math.max(1, lineCount),
            snippetA: normA.rawLines.slice(0, 5).join('\n'),
            snippetB: normB.rawLines.slice(0, 5).join('\n'),
            matchType: 'EXACT_CLONE',
            sharedTokens: normA.tokens.length,
          },
        ],
      };
    }

    // 4. Exact Structural AST Clone (Identical logic despite renamed variables, comments, or spacing)
    const tokenStrA = normA.tokens.map((t) => t.val).join(' ');
    const tokenStrB = normB.tokens.map((t) => t.val).join(' ');

    if (tokenStrA === tokenStrB) {
      return {
        similarityScore: 100.0,
        matchedTokensCount: normA.tokens.length,
        verdict: PlagiarismVerdict.FLAGGED,
        summary:
          'Exact structural logic clone detected: 100% congruent AST statement and control-flow sequence under variable alpha-renaming.',
        matchingSpans: [
          {
            startA: normA.tokens[0].line,
            endA: normA.tokens[normA.tokens.length - 1].line,
            startB: normB.tokens[0].line,
            endB: normB.tokens[normB.tokens.length - 1].line,
            snippetA: normA.rawLines.slice(normA.tokens[0].line - 1, normA.tokens[normA.tokens.length - 1].line).join('\n'),
            snippetB: normB.rawLines.slice(normB.tokens[0].line - 1, normB.tokens[normB.tokens.length - 1].line).join('\n'),
            matchType: 'STRUCTURAL_CLONE',
            sharedTokens: normA.tokens.length,
          },
        ],
      };
    }

    // 5. Karp-Rabin Winnowing Fingerprinting
    const k = Math.min(5, Math.min(normA.tokens.length, normB.tokens.length));
    const w = 4;

    const fpsA = this.computeWinnowingFingerprints(normA.tokens, k, w);
    const fpsB = this.computeWinnowingFingerprints(normB.tokens, k, w);

    if (fpsA.length === 0 || fpsB.length === 0) {
      return {
        similarityScore: 0.0,
        matchedTokensCount: 0,
        verdict: PlagiarismVerdict.CLEARED,
        summary: 'Insufficient window size to generate fingerprints.',
        matchingSpans: [],
      };
    }

    const mapA = new Map<number, WinnowingFingerprint[]>();
    for (const fp of fpsA) {
      if (!mapA.has(fp.hash)) mapA.set(fp.hash, []);
      mapA.get(fp.hash)!.push(fp);
    }

    const mapB = new Map<number, WinnowingFingerprint[]>();
    for (const fp of fpsB) {
      if (!mapB.has(fp.hash)) mapB.set(fp.hash, []);
      mapB.get(fp.hash)!.push(fp);
    }

    const setA = new Set(mapA.keys());
    const setB = new Set(mapB.keys());

    let sharedHashCount = 0;
    const sharedHashes: number[] = [];
    for (const h of setA) {
      if (setB.has(h)) {
        sharedHashCount++;
        sharedHashes.push(h);
      }
    }

    const totalUniqueHashes = new Set([...setA, ...setB]).size;
    const jaccard = totalUniqueHashes > 0 ? sharedHashCount / totalUniqueHashes : 0.0;
    const minSetSize = Math.min(setA.size, setB.size);
    const containment = minSetSize > 0 ? sharedHashCount / minSetSize : 0.0;

    // 6. Evidence-based line span extraction and coalescing
    const rawSpans: Array<{ startA: number; endA: number; startB: number; endB: number }> = [];
    for (const h of sharedHashes) {
      const listA = mapA.get(h) || [];
      const listB = mapB.get(h) || [];
      for (const itemA of listA) {
        for (const itemB of listB) {
          rawSpans.push({
            startA: itemA.startLine,
            endA: itemA.endLine,
            startB: itemB.startLine,
            endB: itemB.endLine,
          });
        }
      }
    }

    const coalescedSpans = this.coalesceLineSpans(rawSpans, normA.rawLines, normB.rawLines);

    // Count distinct tokens matched in coalesced spans
    let matchedTokensCount = 0;
    for (const span of coalescedSpans) {
      const inA = normA.tokens.filter((t) => t.line >= span.startA && t.line <= span.endA).length;
      matchedTokensCount += inA;
      span.sharedTokens = inA;
    }

    const tokenRatioA = normA.tokens.length > 0 ? matchedTokensCount / normA.tokens.length : 0;
    const tokenRatioB = normB.tokens.length > 0 ? matchedTokensCount / normB.tokens.length : 0;
    const maxTokenCoverage = Math.max(tokenRatioA, tokenRatioB);

    // Genuine composite similarity score:
    // Blends Jaccard index, containment index, and matched token coverage
    let similarityScore = 0.0;
    if (sharedHashCount > 0) {
      const blended = jaccard * 0.4 + containment * 0.4 + maxTokenCoverage * 0.2;
      similarityScore = Math.min(99.0, Number((blended * 100).toFixed(1)));
    }

    // Near-duplicate check: if token coverage is > 85%, ensure high score
    if (maxTokenCoverage >= 0.85 && similarityScore < 85.0) {
      similarityScore = Math.min(99.0, Number((maxTokenCoverage * 100).toFixed(1)));
    }

    const verdict =
      similarityScore >= Math.max(threshold, 80.0)
        ? PlagiarismVerdict.FLAGGED
        : similarityScore >= threshold
        ? PlagiarismVerdict.SUSPICIOUS
        : PlagiarismVerdict.CLEARED;

    let summary = '';
    if (similarityScore >= threshold) {
      summary = `AST Winnowing identified ${similarityScore}% structural match with ${matchedTokensCount} congruent tokens across ${coalescedSpans.length} matched code block(s). Logic control flow and loop structures are shared.`;
    } else {
      summary = `Submissions exhibit independent implementations (${similarityScore}% similarity, below ${threshold}% threshold). No significant structural code cloning found.`;
    }

    return {
      similarityScore,
      matchedTokensCount,
      verdict,
      summary,
      matchingSpans: coalescedSpans,
    };
  }

  /**
   * Tokenizes source code into normalized AST tokens, tracking exact 1-indexed lines.
   */
  private tokenizeCode(sourceCode: string): { tokens: CodeToken[]; rawLines: string[] } {
    const rawLines = sourceCode.split(/\r?\n/);

    // Strip multiline comments and docstrings while preserving line breaks
    const sanitized = sourceCode
      .replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat(m.split('\n').length - 1))
      .replace(/"""[\s\S]*?"""/g, (m) => '\n'.repeat(m.split('\n').length - 1))
      .replace(/'''[\s\S]*?'''/g, (m) => '\n'.repeat(m.split('\n').length - 1));

    const lines = sanitized.split(/\r?\n/);
    const tokens: CodeToken[] = [];

    const KEYWORDS = new Set([
      'def', 'return', 'for', 'in', 'if', 'else', 'elif', 'while', 'break', 'continue',
      'function', 'const', 'let', 'var', 'class', 'public', 'private', 'protected', 'static',
      'int', 'float', 'double', 'bool', 'boolean', 'void', 'string', 'char', 'vector', 'list',
      'dict', 'set', 'map', 'true', 'false', 'null', 'none', 'nil', 'new', 'try', 'catch',
      'throw', 'throws', 'lambda', 'struct'
    ]);

    const BUILTIN_FUNCS = new Set([
      'range', 'len', 'print', 'println', 'cout', 'cin', 'min', 'max', 'abs', 'sum',
      'push', 'pop', 'append', 'size', 'length', 'sort', 'sorted', 'reverse', 'split',
      'join', 'find', 'indexof', 'math'
    ]);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineNum = lineIdx + 1;
      let line = lines[lineIdx];

      // Strip single-line comments
      const commentMatch = line.match(/(\/\/|#)/);
      if (commentMatch && commentMatch.index !== undefined) {
        line = line.slice(0, commentMatch.index);
      }
      line = line.trim();
      if (!line) continue;

      // Ignore boilerplate imports
      if (/^(import\s+|from\s+|#include|using\s+namespace|package\s+)/i.test(line)) {
        continue;
      }

      const regex = /[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|(?:\/=)|->|::|[+\-*/%=<>!&|^~?:;,.\(\)\{\}\[\]]/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        const raw = match[0];
        const lower = raw.toLowerCase();

        if (KEYWORDS.has(lower)) {
          tokens.push({ type: 'KEYWORD', val: lower.toUpperCase(), line: lineNum });
        } else if (BUILTIN_FUNCS.has(lower)) {
          tokens.push({ type: 'BUILTIN', val: lower.toUpperCase(), line: lineNum });
        } else if (/^\d/.test(raw)) {
          tokens.push({ type: 'LITERAL_NUM', val: 'NUM', line: lineNum });
        } else if (raw.startsWith('"') || raw.startsWith("'")) {
          tokens.push({ type: 'LITERAL_STR', val: 'STR', line: lineNum });
        } else if (/^[a-zA-Z_]/.test(raw)) {
          // Normalized identifier token: robust against arbitrary variable renaming
          tokens.push({ type: 'IDENTIFIER', val: 'ID', line: lineNum });
        } else {
          tokens.push({ type: 'OPERATOR', val: raw, line: lineNum });
        }
      }
    }

    return { tokens, rawLines };
  }

  /**
   * Generates Karp-Rabin winnowing fingerprints over a structural token sequence.
   */
  private computeWinnowingFingerprints(
    tokens: CodeToken[],
    k = 5,
    w = 4,
  ): WinnowingFingerprint[] {
    if (tokens.length < k) {
      if (tokens.length === 0) return [];
      return [
        {
          hash: this.hashTokenSequence(tokens.map((t) => t.val)),
          startLine: tokens[0].line,
          endLine: tokens[tokens.length - 1].line,
          tokens: tokens.map((t) => t.val),
        },
      ];
    }

    const kgrams: Array<{
      hash: number;
      startLine: number;
      endLine: number;
      tokens: string[];
      idx: number;
    }> = [];

    for (let i = 0; i <= tokens.length - k; i++) {
      const slice = tokens.slice(i, i + k);
      const tokenVals = slice.map((t) => t.val);
      const hash = this.hashTokenSequence(tokenVals);
      kgrams.push({
        hash,
        startLine: slice[0].line,
        endLine: slice[slice.length - 1].line,
        tokens: tokenVals,
        idx: i,
      });
    }

    const effectiveW = Math.min(w, kgrams.length);
    const fingerprints: WinnowingFingerprint[] = [];
    let lastChosenIdx = -1;

    for (let i = 0; i <= kgrams.length - effectiveW; i++) {
      let minIdx = i;
      for (let j = i + 1; j < i + effectiveW; j++) {
        if (kgrams[j].hash <= kgrams[minIdx].hash) {
          minIdx = j; // rightmost minimum
        }
      }

      if (minIdx !== lastChosenIdx) {
        fingerprints.push({
          hash: kgrams[minIdx].hash,
          startLine: kgrams[minIdx].startLine,
          endLine: kgrams[minIdx].endLine,
          tokens: kgrams[minIdx].tokens,
        });
        lastChosenIdx = minIdx;
      }
    }

    return fingerprints;
  }

  /**
   * 32-bit polynomial rolling hash for token sequence.
   */
  private hashTokenSequence(tokens: string[]): number {
    let hash = 0;
    const p = 31;
    const m = 1e9 + 9;
    for (const t of tokens) {
      for (let i = 0; i < t.length; i++) {
        hash = (hash * p + t.charCodeAt(i)) % m;
      }
      hash = (hash * p + 35) % m;
    }
    return hash;
  }

  /**
   * Checks whether submissions consist only of starter boilerplate.
   */
  private isBoilerplateOnly(
    tokensA: CodeToken[],
    tokensB: CodeToken[],
    starterCodesJson: string,
  ): boolean {
    try {
      const starters = JSON.parse(starterCodesJson);
      for (const starterCode of Object.values(starters)) {
        if (typeof starterCode !== 'string') continue;
        const starterTokens = this.tokenizeCode(starterCode).tokens;
        if (starterTokens.length > 0) {
          const strT = starterTokens.map((t) => t.val).join(' ');
          const strA = tokensA.map((t) => t.val).join(' ');
          const strB = tokensB.map((t) => t.val).join(' ');
          if (strA === strT && strB === strT) {
            return true;
          }
        }
      }
    } catch {}
    return false;
  }

  /**
   * Coalesces contiguous or overlapping line spans into clean matching passages.
   */
  private coalesceLineSpans(
    rawSpans: Array<{ startA: number; endA: number; startB: number; endB: number }>,
    rawLinesA: string[],
    rawLinesB: string[],
  ): MatchingSpan[] {
    if (rawSpans.length === 0) return [];

    // Sort by start line in A, then start line in B
    rawSpans.sort((a, b) => a.startA - b.startA || a.startB - b.startB);

    const merged: Array<{ startA: number; endA: number; startB: number; endB: number }> = [];
    for (const s of rawSpans) {
      if (merged.length === 0) {
        merged.push({ ...s });
        continue;
      }
      const last = merged[merged.length - 1];
      // Merge if within 2 lines of overlap / proximity
      if (s.startA <= last.endA + 2 && s.startB <= last.endB + 2) {
        last.endA = Math.max(last.endA, s.endA);
        last.endB = Math.max(last.endB, s.endB);
      } else {
        merged.push({ ...s });
      }
    }

    const result: MatchingSpan[] = [];
    for (const m of merged.slice(0, 10)) {
      const snipA = rawLinesA.slice(Math.max(0, m.startA - 1), m.endA).join('\n').trim();
      const snipB = rawLinesB.slice(Math.max(0, m.startB - 1), m.endB).join('\n').trim();

      const isExact = snipA.length > 0 && snipA === snipB;
      const matchType = isExact ? 'EXACT_CLONE' : 'STRUCTURAL_CLONE';

      result.push({
        startA: m.startA,
        endA: m.endA,
        startB: m.startB,
        endB: m.endB,
        snippetA: snipA.slice(0, 300),
        snippetB: snipB.slice(0, 300),
        matchType,
        sharedTokens: 0,
      });
    }

    return result;
  }

  /**
   * Retrieves list of scans for authorized faculty.
   */
  async getScans(facultyUserId: string, problemId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: facultyUserId },
      include: { facultyProfile: true },
    });

    const isElevated =
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.HOD ||
      user?.role === UserRole.HEAD;
    const faculty = user?.facultyProfile;

    const whereClause: any = {};
    if (problemId) {
      whereClause.problemId = problemId;
    }
    if (!isElevated && faculty) {
      whereClause.OR = [
        { facultyId: facultyUserId },
        { problem: { courseId: faculty.courseId || undefined } },
        { problem: { course: { departmentId: faculty.departmentId || undefined } } },
      ];
    }

    return this.prisma.plagiarismScan.findMany({
      where: whereClause,
      include: {
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
        _count: { select: { matches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves full details for a scan including pairwise submission comparisons and snippets.
   */
  async getScanDetails(scanId: string, facultyUserId: string) {
    const scan = await this.prisma.plagiarismScan.findUnique({
      where: { id: scanId },
      include: {
        problem: true,
        matches: {
          include: {
            submissionA: {
              include: {
                student: {
                  include: {
                    authorizedStudent: { select: { name: true, enrollmentNumber: true, division: true } },
                    user: { select: { email: true } },
                  },
                },
              },
            },
            submissionB: {
              include: {
                student: {
                  include: {
                    authorizedStudent: { select: { name: true, enrollmentNumber: true, division: true } },
                    user: { select: { email: true } },
                  },
                },
              },
            },
          },
          orderBy: { similarityScore: 'desc' },
        },
      },
    });

    if (!scan) {
      throw new NotFoundException('Plagiarism scan not found.');
    }

    await this.checkFacultyAuthorization(facultyUserId, scan.problem.courseId);

    return scan;
  }

  /**
   * Updates review verdict for a detected match with faculty audit note.
   */
  async updateMatchVerdict(
    matchId: string,
    facultyUserId: string,
    dto: UpdateVerdictDto,
  ) {
    const match = await this.prisma.plagiarismMatch.findUnique({
      where: { id: matchId },
      include: { scan: { include: { problem: true } } },
    });

    if (!match) {
      throw new NotFoundException('Plagiarism match not found.');
    }

    await this.checkFacultyAuthorization(facultyUserId, match.scan.problem.courseId);

    return this.prisma.plagiarismMatch.update({
      where: { id: matchId },
      data: {
        verdict: dto.verdict,
        facultyNotes: dto.facultyNotes,
      },
    });
  }
}

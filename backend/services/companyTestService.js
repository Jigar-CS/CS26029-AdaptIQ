const Test = require('../models/Test');
const TestQuestion = require('../models/TestQuestion');
const UserAnswer = require('../models/UserAnswer');
const CompanyTest = require('../models/CompanyTest');
const PlacementScore = require('../models/PlacementScore');
const questionSelector = require('./questionSelector');

/**
 * Dual-condition unlock thresholds for company mock tests.
 * Both must be satisfied — see Phase 9 of the build plan.
 */
const REQUIRED_MISC_TESTS = 5;
const REQUIRED_PLACEMENT_SCORE = 80;

const companyTestService = {
  REQUIRED_MISC_TESTS,
  REQUIRED_PLACEMENT_SCORE,

  /**
   * Evaluate whether a student may take company mock tests.
   *
   * Unlock requires BOTH:
   *   1. >= 5 completed full_adaptive (Miscellaneous) tests
   *   2. Latest placement score >= 80
   *
   * Always returns the full breakdown, not just a locked flag, so the UI can
   * show students exactly how far they are from the threshold.
   */
  checkUnlock: async (user_id) => {
    const miscTestsCompleted = await Test.countCompletedByType(user_id, 'full_adaptive');
    const latest = await PlacementScore.getLatest(user_id);
    const placementScore = latest ? parseFloat(latest.score) : 0;

    const testsMet = miscTestsCompleted >= REQUIRED_MISC_TESTS;
    const scoreMet = placementScore >= REQUIRED_PLACEMENT_SCORE;
    const locked = !(testsMet && scoreMet);

    let unlock_message = '';
    if (!testsMet) {
      unlock_message =
        `Complete at least ${REQUIRED_MISC_TESTS} Miscellaneous tests to unlock Company Mock Tests ` +
        `(${miscTestsCompleted}/${REQUIRED_MISC_TESTS} done).`;
    } else if (!scoreMet) {
      unlock_message =
        `Your score is ${Math.round(placementScore)}/100. ` +
        `Reach ${REQUIRED_PLACEMENT_SCORE} to unlock.`;
    } else {
      unlock_message = 'Unlocked — you meet all prerequisites.';
    }

    return {
      locked,
      misc_tests_completed: miscTestsCompleted,
      placement_score: placementScore,
      required_misc_tests: REQUIRED_MISC_TESTS,
      required_placement_score: REQUIRED_PLACEMENT_SCORE,
      unlock_message,
      breakdown: latest
        ? {
            accuracy_component: parseFloat(latest.accuracy_component),
            speed_component: parseFloat(latest.speed_component),
            difficulty_mastery_component: parseFloat(latest.difficulty_mastery_component),
          }
        : null,
    };
  },

  /**
   * Build the fixed question set for a company test session.
   *
   * Prefers the admin-curated pool in `company_questions`. If no pool is
   * attached, generates one from the configured difficulty distribution using
   * the offset-based selector (never ORDER BY RAND()).
   */
  buildQuestionSet: async (companyTest) => {
    const curated = await CompanyTest.getAttachedQuestions(companyTest.id);
    if (curated.length > 0) {
      // Respect question_count if the admin attached more than needed
      return curated.slice(0, companyTest.question_count || curated.length);
    }

    const buckets = [
      { difficulty: 'Easy', count: companyTest.easy_count || 0 },
      { difficulty: 'Medium', count: companyTest.medium_count || 0 },
      { difficulty: 'Hard', count: companyTest.hard_count || 0 },
    ];

    const distributionTotal = buckets.reduce((sum, b) => sum + b.count, 0);

    // No distribution configured — fall back to a mixed-difficulty set
    if (distributionTotal === 0) {
      return questionSelector.getNextBatch({
        topic_id: null,
        difficulty: null,
        exclude_ids: [],
        limit: companyTest.question_count || 30,
      });
    }

    const selected = [];
    const excludeIds = [];

    for (const bucket of buckets) {
      if (bucket.count <= 0) continue;
      const rows = await questionSelector.getNextBatch({
        topic_id: null,
        difficulty: bucket.difficulty,
        exclude_ids: excludeIds,
        limit: bucket.count,
      });
      for (const row of rows) {
        selected.push(row);
        excludeIds.push(row.id);
      }
    }

    return selected;
  },

  /**
   * Persist a generated question set against a session.
   * Rows are inserted individually because a company set spans mixed
   * difficulties and `difficulty_at_time` is per-row here.
   */
  persistQuestionSet: async (test_id, questions) => {
    let sequence = 1;
    for (const q of questions) {
      await TestQuestion.addQuestion({
        test_id,
        question_id: q.id,
        sequence_number: sequence,
        difficulty_at_time: q.difficulty,
      });
      sequence += 1;
    }
  },

  /**
   * Has this timed session passed its server-side deadline?
   */
  isExpired: (session) => {
    if (!session?.expires_at) return false;
    return new Date(session.expires_at).getTime() <= Date.now();
  },

  /**
   * Seconds remaining before auto-submit. Never negative.
   */
  secondsRemaining: (session) => {
    if (!session?.expires_at) return null;
    const diffMs = new Date(session.expires_at).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  },

  /**
   * Build the post-submission review payload.
   * Correct answers and explanations are only revealed here, after the
   * session has been closed out.
   */
  buildReview: async (test_id) => {
    const rows = await TestQuestion.getReviewForTest(test_id);
    return rows.map((r) => ({
      sequence_number: r.sequence_number,
      question_id: r.question_id,
      question_text: r.question_text,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      correct_option: r.correct_option,
      selected_option: r.selected_option || null,
      is_correct: r.is_correct === 1,
      was_answered: r.selected_option !== null && r.selected_option !== undefined,
      explanation: r.explanation || null,
      difficulty: r.difficulty,
      topic_name: r.topic_name || 'General',
    }));
  },

  /**
   * Score a company session.
   *
   * The denominator is the SERVED question count, so questions left blank
   * when the timer expired still count against the student — matching how a
   * real recruitment test behaves.
   */
  scoreSession: async (test_id) => {
    const served = await TestQuestion.getServedQuestionsWithTopic(test_id);
    const answers = await UserAnswer.getByTestIdWithTopic(test_id);

    const answerByQuestion = new Map();
    for (const a of answers) {
      answerByQuestion.set(a.question_id, a);
    }

    const totalQuestions = served.length;
    let correctCount = 0;
    let answeredCount = 0;

    // section -> { correct, total }
    const sections = new Map();

    for (const q of served) {
      const sectionName = q.topic_name || 'General';
      if (!sections.has(sectionName)) {
        sections.set(sectionName, { correct: 0, total: 0 });
      }
      const section = sections.get(sectionName);
      section.total += 1;

      const answer = answerByQuestion.get(q.question_id);
      if (answer) {
        answeredCount += 1;
        if (answer.is_correct === 1) {
          correctCount += 1;
          section.correct += 1;
        }
      }
    }

    const score = totalQuestions > 0
      ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2))
      : 0;

    const section_breakdown = Array.from(sections.entries())
      .map(([section, stats]) => ({
        section,
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total > 0
          ? parseFloat(((stats.correct / stats.total) * 100).toFixed(2))
          : 0,
      }))
      .sort((a, b) => a.section.localeCompare(b.section));

    return {
      score,
      total_questions: totalQuestions,
      correct_count: correctCount,
      answered_count: answeredCount,
      unanswered_count: Math.max(0, totalQuestions - answeredCount),
      section_breakdown,
    };
  },
};

module.exports = companyTestService;

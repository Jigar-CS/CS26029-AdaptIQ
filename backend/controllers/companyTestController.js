const Test = require('../models/Test');
const TestQuestion = require('../models/TestQuestion');
const UserAnswer = require('../models/UserAnswer');
const Question = require('../models/Question');
const CompanyTest = require('../models/CompanyTest');
const ActivityLog = require('../models/ActivityLog');
const companyTestService = require('../services/companyTestService');
const performanceService = require('../services/performanceService');
const { success, created, error, notFound } = require('../utils/responseFormatter');

/**
 * Resolve the target company test from a route param.
 * The client may send a numeric id or the literal 'standard' when it hasn't
 * loaded config yet, so non-numeric values fall back to the default test.
 */
const resolveCompanyTest = async (idParam) => {
  if (/^\d+$/.test(String(idParam || '').trim())) {
    return CompanyTest.findById(parseInt(idParam, 10));
  }
  return CompanyTest.findDefault();
};

/**
 * Close out a session whose deadline has passed.
 */
const finalizeExpiredSession = async (session) => {
  await Test.complete(session.id);
};

const companyTestController = {
  /**
   * GET /company-tests
   * Standard test config + dual-condition unlock status.
   */
  getStandardTest: async (req, res, next) => {
    try {
      const companyTest = await CompanyTest.findDefault();
      const unlock = await companyTestService.checkUnlock(req.user.id);

      if (!companyTest) {
        // No config seeded yet — still return unlock status so the UI can
        // render eligibility progress instead of failing outright.
        return success(res, {
          ...unlock,
          id: null,
          company_name: null,
          time_limit_minutes: null,
          question_count: null,
        }, 'No company test is configured yet');
      }

      const activeSession = await Test.findActiveCompanySession(req.user.id, companyTest.id);
      const hasLiveSession = activeSession && !companyTestService.isExpired(activeSession);

      return success(res, {
        id: companyTest.id,
        company_test_id: companyTest.id,
        company_name: companyTest.company_name,
        time_limit_minutes: companyTest.time_limit_minutes,
        question_count: companyTest.question_count,
        easy_count: companyTest.easy_count,
        medium_count: companyTest.medium_count,
        hard_count: companyTest.hard_count,
        ...unlock,
        has_active_session: !!hasLiveSession,
        active_session_seconds_remaining: hasLiveSession
          ? companyTestService.secondsRemaining(activeSession)
          : null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /company-tests/:id/start
   * Idempotent: resumes an in-progress session rather than creating a
   * duplicate, since the client calls this again when the test page mounts.
   */
  start: async (req, res, next) => {
    try {
      const companyTest = await resolveCompanyTest(req.params.id);

      if (!companyTest) {
        return notFound(res, 'No company test is configured yet');
      }
      if (!companyTest.is_active) {
        return error(res, 'COMPANY_TEST_INACTIVE', 'This company test is no longer available', 400);
      }

      const unlock = await companyTestService.checkUnlock(req.user.id);
      if (unlock.locked) {
        return error(res, 'COMPANY_TEST_LOCKED', unlock.unlock_message, 403);
      }

      // Resume an existing live session
      let session = await Test.findActiveCompanySession(req.user.id, companyTest.id);

      if (session && companyTestService.isExpired(session)) {
        await finalizeExpiredSession(session);
        session = null;
      }

      if (session) {
        const questions = await TestQuestion.getServedQuestionsForClient(session.id);
        const answered = await UserAnswer.getByTestId(session.id);
        const secondsRemaining = companyTestService.secondsRemaining(session);

        return success(res, {
          test_id: session.id,
          company_test_id: companyTest.id,
          company_name: companyTest.company_name,
          questions,
          question_count: questions.length,
          // Remaining time, so a reload doesn't restart the clock
          time_limit_minutes: secondsRemaining !== null
            ? secondsRemaining / 60
            : companyTest.time_limit_minutes,
          seconds_remaining: secondsRemaining,
          expires_at: session.expires_at,
          resumed: true,
          answered_question_ids: answered.map((a) => a.question_id),
        }, 'Resumed your in-progress session');
      }

      // Fresh session
      const questions = await companyTestService.buildQuestionSet(companyTest);
      if (!questions || questions.length === 0) {
        return error(
          res,
          'NO_QUESTIONS_AVAILABLE',
          'No questions are available to build this test. Please contact your administrator.',
          409
        );
      }

      const testId = await Test.create({
        user_id: req.user.id,
        test_type: 'company',
        topic_id: null,
        company_test_id: companyTest.id,
      });

      await Test.setExpiry(testId, companyTest.time_limit_minutes);
      await companyTestService.persistQuestionSet(testId, questions);

      const fresh = await Test.findById(testId);
      const clientQuestions = await TestQuestion.getServedQuestionsForClient(testId);

      return created(res, {
        test_id: testId,
        company_test_id: companyTest.id,
        company_name: companyTest.company_name,
        questions: clientQuestions,
        question_count: clientQuestions.length,
        time_limit_minutes: companyTest.time_limit_minutes,
        seconds_remaining: companyTestService.secondsRemaining(fresh),
        expires_at: fresh?.expires_at || null,
        resumed: false,
        answered_question_ids: [],
      }, 'Company mock test started');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /company-tests/:id/answer
   * Fixed-question, non-adaptive submission. Correctness is recorded but not
   * revealed — this mirrors a real recruitment test.
   */
  submitAnswer: async (req, res, next) => {
    try {
      const companyTest = await resolveCompanyTest(req.params.id);
      if (!companyTest) {
        return notFound(res, 'No company test is configured yet');
      }

      const session = await Test.findActiveCompanySession(req.user.id, companyTest.id);
      if (!session) {
        return error(res, 'NO_ACTIVE_SESSION', 'You have no active session for this test', 404);
      }

      // Server-side timer enforcement — holds even if the client was closed
      if (companyTestService.isExpired(session)) {
        await finalizeExpiredSession(session);
        return error(
          res,
          'TEST_EXPIRED',
          'Time is up. This test was auto-submitted.',
          403
        );
      }

      const { question_id, selected_option, response_time_seconds = 0 } = req.body;
      const questionId = parseInt(question_id, 10);

      if (!questionId) {
        return error(res, 'INVALID_QUESTION', 'A valid question_id is required', 400);
      }

      // The question must belong to this session's fixed set
      const servedIds = await TestQuestion.getServedQuestionIds(session.id);
      if (!servedIds.includes(questionId)) {
        return error(
          res,
          'QUESTION_NOT_IN_TEST',
          'That question is not part of this test session',
          400
        );
      }

      const question = await Question.findById(questionId);
      if (!question) {
        return notFound(res, 'Question not found');
      }

      const normalized = selected_option
        ? selected_option.toString().trim().toUpperCase()
        : null;

      if (normalized && !['A', 'B', 'C', 'D'].includes(normalized)) {
        return error(res, 'INVALID_OPTION', 'selected_option must be A, B, C, or D', 400);
      }

      const isCorrect = !!normalized && normalized === question.correct_option.toUpperCase();

      await UserAnswer.replaceAnswer({
        test_id: session.id,
        question_id: questionId,
        user_id: req.user.id,
        selected_option: normalized,
        is_correct: isCorrect,
        response_time_seconds: parseFloat(response_time_seconds) || 0,
      });

      const answeredCount = await UserAnswer.countByTestId(session.id);

      return success(res, {
        recorded: true,
        question_id: questionId,
        answered_count: answeredCount,
        total_questions: servedIds.length,
        seconds_remaining: companyTestService.secondsRemaining(session),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /company-tests/:id/complete
   * Scores the session and returns a section-wise breakdown.
   * Safe to call more than once — re-scores an already-closed session.
   */
  complete: async (req, res, next) => {
    try {
      const companyTest = await resolveCompanyTest(req.params.id);
      if (!companyTest) {
        return notFound(res, 'No company test is configured yet');
      }

      const session = await Test.findLatestCompanySession(req.user.id, companyTest.id);
      if (!session) {
        return error(res, 'NO_ACTIVE_SESSION', 'You have no session for this test', 404);
      }

      const wasAlreadyComplete = session.status === 'completed';
      const expired = companyTestService.isExpired(session);

      if (!wasAlreadyComplete) {
        await Test.complete(session.id);
      }

      const result = await companyTestService.scoreSession(session.id);

      if (!wasAlreadyComplete) {
        // Company tests deliberately do NOT feed the placement score —
        // only full_adaptive sessions do (see Phase 8).
        performanceService
          .processTestCompletion(session.id, req.user.id, 'company', null)
          .catch((e) => console.error('Performance aggregation failed:', e.message));

        ActivityLog.log({
          user_id: req.user.id,
          action_type: 'COMPANY_TEST_COMPLETED',
          details: {
            test_id: session.id,
            company_test_id: companyTest.id,
            score: result.score,
            correct_count: result.correct_count,
            total_questions: result.total_questions,
            auto_submitted: expired,
          },
        });
      }

      return success(res, {
        test_id: session.id,
        company_test_id: companyTest.id,
        company_name: companyTest.company_name,
        ...result,
        auto_submitted: expired,
        already_submitted: wasAlreadyComplete,
      });
    } catch (err) {
      next(err);
    }
  },

  // ---------------------------------------------------------------
  // Admin: company test configuration CRUD
  // ---------------------------------------------------------------

  listAll: async (req, res, next) => {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const companyTests = await CompanyTest.findAll({ includeInactive });

      const withCounts = await Promise.all(
        companyTests.map(async (ct) => ({
          ...ct,
          attached_question_count: await CompanyTest.countAttachedQuestions(ct.id),
        }))
      );

      return success(res, { company_tests: withCounts, total: withCounts.length });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const companyTest = await CompanyTest.findById(parseInt(req.params.id, 10));
      if (!companyTest) {
        return notFound(res, 'Company test not found');
      }
      const questions = await CompanyTest.getAttachedQuestions(companyTest.id);
      return success(res, { company_test: companyTest, questions });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const id = await CompanyTest.create(req.body);
      const companyTest = await CompanyTest.findById(id);
      return created(res, { company_test: companyTest }, 'Company test created successfully');
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await CompanyTest.findById(id);
      if (!existing) {
        return notFound(res, 'Company test not found');
      }

      await CompanyTest.update(id, req.body);
      const updated = await CompanyTest.findById(id);
      return success(res, { company_test: updated }, 'Company test updated successfully');
    } catch (err) {
      next(err);
    }
  },

  remove: async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await CompanyTest.findById(id);
      if (!existing) {
        return notFound(res, 'Company test not found');
      }

      await CompanyTest.softDelete(id);
      return success(res, {}, 'Company test deactivated successfully');
    } catch (err) {
      next(err);
    }
  },

  attachQuestion: async (req, res, next) => {
    try {
      const companyTestId = parseInt(req.params.id, 10);
      const companyTest = await CompanyTest.findById(companyTestId);
      if (!companyTest) {
        return notFound(res, 'Company test not found');
      }

      const questionId = parseInt(req.body.question_id, 10);
      if (!questionId) {
        return error(res, 'INVALID_QUESTION', 'A valid question_id is required', 400);
      }

      const question = await Question.findById(questionId);
      if (!question) {
        return notFound(res, 'Question not found');
      }

      const attached = await CompanyTest.attachQuestion(companyTestId, questionId);
      const total = await CompanyTest.countAttachedQuestions(companyTestId);

      return success(res, {
        attached,
        already_attached: !attached,
        attached_question_count: total,
      }, attached ? 'Question attached' : 'Question was already attached');
    } catch (err) {
      next(err);
    }
  },

  detachQuestion: async (req, res, next) => {
    try {
      const companyTestId = parseInt(req.params.id, 10);
      const questionId = parseInt(req.params.questionId, 10);

      const companyTest = await CompanyTest.findById(companyTestId);
      if (!companyTest) {
        return notFound(res, 'Company test not found');
      }

      const detached = await CompanyTest.detachQuestion(companyTestId, questionId);
      const total = await CompanyTest.countAttachedQuestions(companyTestId);

      return success(res, {
        detached,
        attached_question_count: total,
      }, detached ? 'Question detached' : 'Question was not attached to this test');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = companyTestController;

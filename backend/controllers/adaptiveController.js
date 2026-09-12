const Test = require('../models/Test');
const TestQuestion = require('../models/TestQuestion');
const UserAnswer = require('../models/UserAnswer');
const Question = require('../models/Question');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const adaptiveEngine = require('../services/adaptiveEngine');
const questionSelector = require('../services/questionSelector');
const performanceService = require('../services/performanceService');
const placementScoreService = require('../services/placementScoreService');

const adaptiveController = {
  /**
   * Start a new adaptive test session (topic-scoped or full adaptive)
   * POST /adaptive/start
   */
  start: async (req, res, next) => {
    try {
      const topic_id = req.body.topic_id ? parseInt(req.body.topic_id, 10) : null;
      const test_type = topic_id ? 'topic_adaptive' : 'full_adaptive';

      // Start at Easy or student's last known difficulty for this topic
      const difficulty = await Test.getLastKnownDifficulty(req.user.id, topic_id);

      const testId = await Test.create({
        user_id: req.user.id,
        test_type,
        topic_id,
      });

      return res.status(201).json({
        success: true,
        data: {
          test_id: testId,
          id: testId,
          test_type,
          topic_id,
          difficulty,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Fetch the next batch of 5 questions for an active test
   * GET /adaptive/:testId/next-batch
   */
  getNextBatch: async (req, res, next) => {
    try {
      const testId = parseInt(req.params.testId, 10);
      const test = await Test.findById(testId);

      if (!test || test.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: { code: 'TEST_NOT_FOUND', message: 'Test not found' },
        });
      }

      if (test.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          error: { code: 'TEST_NOT_ACTIVE', message: 'This test is no longer active' },
        });
      }

      const servedIds = await TestQuestion.getServedQuestionIds(testId);
      const servedCount = servedIds.length;

      if (servedCount >= 20) {
        return res.status(400).json({
          success: false,
          error: { code: 'TEST_LIMIT_REACHED', message: 'All 20 questions have already been served' },
        });
      }

      const batchNumber = Math.floor(servedCount / 5) + 1;
      let difficulty = 'Easy';

      if (batchNumber === 1) {
        difficulty = await Test.getLastKnownDifficulty(req.user.id, test.topic_id);
      } else {
        // Use the most recent adaptive engine decision (recorded on every 5th answer),
        // falling back to the last served batch's difficulty if no decision was logged yet.
        difficulty = (await ActivityLog.getLatestDifficultyDecision(testId))
          || (await TestQuestion.getLatestDifficulty(testId));
      }

      const questions = await questionSelector.getNextBatch({
        topic_id: test.topic_id,
        difficulty,
        exclude_ids: servedIds,
        limit: 5,
      });

      if (!questions || questions.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_QUESTIONS_AVAILABLE', message: 'Insufficient questions available in bank' },
        });
      }

      // Record questions served to this test
      await TestQuestion.addBatch(testId, questions, servedCount + 1, difficulty);

      return res.json({
        success: true,
        data: {
          batch_number: batchNumber,
          difficulty,
          questions,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Submit an answer for a question
   * POST /adaptive/:testId/answer
   */
  submitAnswer: async (req, res, next) => {
    try {
      const testId = parseInt(req.params.testId, 10);
      const { question_id, selected_option, response_time_seconds = 0 } = req.body;

      const test = await Test.findById(testId);
      if (!test || test.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: { code: 'TEST_NOT_FOUND', message: 'Test not found' },
        });
      }

      const question = await Question.findById(question_id);
      if (!question) {
        return res.status(404).json({
          success: false,
          error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found' },
        });
      }

      const isCorrect = !!(
        selected_option &&
        selected_option.toString().trim().toUpperCase() === question.correct_option.toUpperCase()
      );

      await UserAnswer.submit({
        test_id: testId,
        question_id,
        user_id: req.user.id,
        selected_option: selected_option ? selected_option.toString().trim().toUpperCase() : null,
        is_correct: isCorrect,
        response_time_seconds: parseFloat(response_time_seconds) || 0,
      });

      const totalAnswers = await UserAnswer.countByTestId(testId);
      let newDifficulty = null;

      // Every 5th answer triggers batch evaluation (except after final 20th question)
      if (totalAnswers % 5 === 0 && totalAnswers < 20) {
        const batchAnswers = await UserAnswer.getLastBatchAnswers(testId, 5);
        const currentDifficulty = await TestQuestion.getLatestDifficulty(testId);

        const evaluation = await adaptiveEngine.evaluateBatch({
          test_id: testId,
          user_id: req.user.id,
          test_type: test.test_type,
          topic_id: test.topic_id,
          batch_number: totalAnswers / 5,
          current_difficulty: currentDifficulty,
          batch_answers: batchAnswers,
          topic_time_threshold: 60,
        });

        newDifficulty = evaluation.newDifficulty;
      }

      return res.json({
        success: true,
        data: {
          is_correct: isCorrect,
          correct_option: question.correct_option,
          explanation: question.explanation,
          ...(newDifficulty ? { new_difficulty: newDifficulty } : {}),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get current test status
   * GET /adaptive/:testId/status
   */
  getStatus: async (req, res, next) => {
    try {
      const testId = parseInt(req.params.testId, 10);
      const test = await Test.findById(testId);

      if (!test || test.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: { code: 'TEST_NOT_FOUND', message: 'Test not found' },
        });
      }

      const servedCount = await TestQuestion.getServedCount(testId);
      const answeredCount = await UserAnswer.countByTestId(testId);
      const currentDifficulty = (await ActivityLog.getLatestDifficultyDecision(testId))
        || (await TestQuestion.getLatestDifficulty(testId));

      return res.json({
        success: true,
        data: {
          test,
          served_count: servedCount,
          answered_count: answeredCount,
          current_difficulty: currentDifficulty,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Complete test session
   * POST /adaptive/:testId/complete
   */
  complete: async (req, res, next) => {
    try {
      const testId = parseInt(req.params.testId, 10);
      const test = await Test.findById(testId);

      if (!test || test.user_id !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: { code: 'TEST_NOT_FOUND', message: 'Test not found' },
        });
      }

      await Test.complete(testId);

      ActivityLog.log({
        user_id: req.user.id,
        action_type: 'TEST_COMPLETED',
        details: {
          test_id: testId,
          test_type: test.test_type,
          topic_id: test.topic_id,
        },
      });

      let profilePromptTriggered = false;

      // Update performance aggregates and generate recommendations (non-blocking)
      performanceService.processTestCompletion(
        testId, req.user.id, test.test_type, test.topic_id
      ).catch((err) => console.error('Performance aggregation failed:', err.message));

      // Recalculate placement score after every completed full_adaptive test
      if (test.test_type === 'full_adaptive') {
        placementScoreService.recalculate(req.user.id)
          .catch((err) => console.error('Placement score recalculation failed:', err.message));
      }

      if (test.test_type === 'topic_adaptive') {
        const completedTopicCount = await Test.countCompletedByType(req.user.id, 'topic_adaptive');
        if (completedTopicCount >= 3) {
          await User.triggerProfilePrompt(req.user.id);
          profilePromptTriggered = true;
        }
      }

      return res.json({
        success: true,
        data: {
          test_id: testId,
          status: 'completed',
          profile_prompt_triggered: profilePromptTriggered,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adaptiveController;

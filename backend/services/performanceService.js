const pool = require('../config/db');
const Performance = require('../models/Performance');
const recommendationService = require('./recommendationService');

/**
 * performanceService
 * Manages topic-level performance metrics aggregation and recommendation generation
 * after test completions.
 */
const performanceService = {
  /**
   * Recalculate denormalized topic performance for a specific user and topic
   */
  recalculate: async (user_id, topic_id) => {
    return Performance.recalculate(user_id, topic_id);
  },

  /**
   * Overall summary across all topics for a user
   */
  getSummary: async (user_id) => {
    return Performance.getSummary(user_id);
  },

  /**
   * Topic-wise breakdown for a user
   */
  getByTopic: async (user_id) => {
    return Performance.getByTopic(user_id);
  },

  /**
   * Process all answers from a completed test, update performance aggregates,
   * and trigger rule-based recommendations generation.
   */
  processTestCompletion: async (test_id, user_id, test_type, topic_id = null) => {
    // Pull all answers for this test
    const [answers] = await pool.execute(
      `SELECT ua.is_correct, ua.response_time_seconds, q.difficulty, q.topic_id
       FROM user_answers ua
       JOIN questions q ON q.id = ua.question_id
       WHERE ua.test_id = ?`,
      [test_id]
    );

    if (answers.length === 0) return;

    // Identify all topics involved in this test session
    const distinctTopics = new Set();
    if (topic_id) {
      distinctTopics.add(parseInt(topic_id, 10));
    }
    for (const a of answers) {
      if (a.topic_id) {
        distinctTopics.add(parseInt(a.topic_id, 10));
      }
    }

    // Recalculate full denormalized metrics from user_answers for exact precision
    for (const tId of distinctTopics) {
      await Performance.recalculate(user_id, tId);
    }

    // Generate recommendations using the rule-based recommendationService
    await recommendationService.generateForUser(user_id);
  },

  /**
   * Compatibility wrapper for direct recommendations generation
   */
  generateRecommendations: async (user_id) => {
    return recommendationService.generateForUser(user_id);
  },
};

module.exports = performanceService;

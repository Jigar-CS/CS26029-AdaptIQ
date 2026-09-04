const pool = require('../config/db');
const Recommendation = require('../models/Recommendation');
const Performance = require('../models/Performance');

// Baseline expected answer time across mixed questions (seconds)
const BASELINE_EXPECTED_TIME = 60;

/**
 * recommendationService
 * Pure rule engine (no ML) for generating targeted student feedback.
 * Authoritative rules as defined in plan_best.md:
 * 1. topic_accuracy < 50% -> weak-topic flag ('weak_topic')
 * 2. topic_accuracy >= 80% -> strong-topic flag, suggests harder questions ('strong_topic')
 * 3. avg_response_time > 1.5x expected -> speed warning flag ('revision')
 * 4. hard_attempted < 5 in topic -> "try Hard questions" flag ('difficulty_suggestion')
 * Deduplication: skips insertion if the same recommendation message already exists undismissed.
 */
const recommendationService = {
  /**
   * Evaluates all topic performances and answer history for a user
   * and generates fresh rule-based recommendations.
   * @param {number} userId - The student's user ID.
   * @returns {Promise<Array>} List of generated recommendation objects.
   */
  generateForUser: async (userId) => {
    if (!userId) return [];

    const topicStats = await Performance.getByTopic(userId);
    if (!topicStats || topicStats.length === 0) return [];

    const createdRecommendations = [];

    for (const topic of topicStats) {
      const topicId = topic.topic_id;
      const topicName = topic.topic_name || 'this topic';
      const accuracy = parseFloat(topic.accuracy_percent) || 0;
      const avgTime = parseFloat(topic.avg_response_time) || 0;
      const totalAttempted = parseInt(topic.total_attempted, 10) || 0;

      // Only generate recommendations once the student has at least 3 attempts in the topic
      if (totalAttempted < 3) continue;

      // ----------------------------------------------------
      // Rule 1: topic_accuracy < 50% -> weak_topic flag
      // ----------------------------------------------------
      if (accuracy < 50) {
        const message = `Your accuracy in ${topicName} is ${Math.round(accuracy)}%. Review core concepts and fundamentals before re-attempting.`;
        const res = await Recommendation.upsert({
          user_id: userId,
          topic_id: topicId,
          message,
          recommendation_type: 'weak_topic',
        });
        if (res) createdRecommendations.push(res);
      }

      // ----------------------------------------------------
      // Rule 2: topic_accuracy >= 80% -> strong_topic flag
      // ----------------------------------------------------
      if (accuracy >= 80) {
        const message = `Excellent performance in ${topicName} (${Math.round(accuracy)}% accuracy)! You are ready for high-difficulty questions.`;
        const res = await Recommendation.upsert({
          user_id: userId,
          topic_id: topicId,
          message,
          recommendation_type: 'strong_topic',
        });
        if (res) createdRecommendations.push(res);
      }

      // ----------------------------------------------------
      // Rule 3: avg_response_time > 1.5x expected -> speed flag
      // ----------------------------------------------------
      if (avgTime > BASELINE_EXPECTED_TIME * 1.5) {
        const message = `Your average pace in ${topicName} is ${Math.round(avgTime)}s (recommended: under ${BASELINE_EXPECTED_TIME}s). Practice speed shortcuts and time management.`;
        const res = await Recommendation.upsert({
          user_id: userId,
          topic_id: topicId,
          message,
          recommendation_type: 'revision',
        });
        if (res) createdRecommendations.push(res);
      }

      // ----------------------------------------------------
      // Rule 4: hard_attempted < 5 in topic -> difficulty flag
      // ----------------------------------------------------
      const [hardAttempts] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM user_answers ua
         JOIN questions q ON ua.question_id = q.id
         WHERE ua.user_id = ? AND q.topic_id = ? AND q.difficulty = 'Hard'`,
        [userId, topicId]
      );

      const hardCount = hardAttempts[0]?.total || 0;
      if (hardCount < 5 && accuracy >= 60) {
        const message = `You have attempted only ${hardCount}/5 Hard questions in ${topicName}. Challenge yourself with harder questions to boost your Placement Score.`;
        const res = await Recommendation.upsert({
          user_id: userId,
          topic_id: topicId,
          message,
          recommendation_type: 'difficulty_suggestion',
        });
        if (res) createdRecommendations.push(res);
      }
    }

    return createdRecommendations;
  },
};

module.exports = recommendationService;

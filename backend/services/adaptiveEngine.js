const ActivityLog = require('../models/ActivityLog');

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

/**
 * Adaptive Decision Engine (ADE)
 * Evaluates performance after every batch of 5 questions.
 * Rules:
 *   batchAccuracy = correctInBatch / 5
 *   avgResponseTime = totalTimeInBatch / 5
 *   topicTimeThreshold = 60s
 *
 *   IF batchAccuracy >= 0.8 AND avgResponseTime <= topicTimeThreshold:
 *       increaseDifficulty()   // Easy -> Medium, Medium -> Hard, Hard stays Hard
 *   ELSE IF batchAccuracy < 0.4 OR avgResponseTime > topicTimeThreshold * 1.5:
 *       decreaseDifficulty()   // Hard -> Medium, Medium -> Easy, Easy stays Easy
 *   ELSE:
 *       keepSameDifficulty()
 */
const adaptiveEngine = {
  evaluateBatch: async ({
    test_id,
    user_id,
    test_type,
    topic_id = null,
    batch_number,
    current_difficulty = 'Easy',
    batch_answers = [],
    topic_time_threshold = 60,
  }) => {
    const batchSize = batch_answers.length || 5;
    const correctCount = batch_answers.filter((a) => !!a.is_correct).length;
    const batchAccuracy = Number((correctCount / batchSize).toFixed(2));

    const totalResponseTime = batch_answers.reduce(
      (sum, a) => sum + parseFloat(a.response_time_seconds || 0),
      0
    );
    const avgResponseTime = Number((totalResponseTime / batchSize).toFixed(2));

    let newDifficulty = current_difficulty;
    const currentIndex = DIFFICULTY_LEVELS.indexOf(current_difficulty);
    const validIndex = currentIndex === -1 ? 0 : currentIndex;

    if (batchAccuracy >= 0.8 && avgResponseTime <= topic_time_threshold) {
      if (validIndex < DIFFICULTY_LEVELS.length - 1) {
        newDifficulty = DIFFICULTY_LEVELS[validIndex + 1];
      }
    } else if (batchAccuracy < 0.4 || avgResponseTime > topic_time_threshold * 1.5) {
      if (validIndex > 0) {
        newDifficulty = DIFFICULTY_LEVELS[validIndex - 1];
      }
    }

    // Log decision to activity_logs
    await ActivityLog.log({
      user_id,
      action_type: 'ADAPTIVE_DIFFICULTY_EVALUATION',
      details: {
        test_id,
        test_type,
        topic_id,
        batch_number,
        batch_accuracy: batchAccuracy,
        avg_response_time: avgResponseTime,
        old_difficulty: current_difficulty,
        new_difficulty: newDifficulty,
      },
    });

    if (newDifficulty !== current_difficulty) {
      await ActivityLog.log({
        user_id,
        action_type: 'DIFFICULTY_CHANGE',
        details: {
          test_id,
          test_type,
          topic_id,
          batch_number,
          old_difficulty: current_difficulty,
          new_difficulty: newDifficulty,
          batch_accuracy: batchAccuracy,
          avg_response_time: avgResponseTime,
        },
      });
    }

    return {
      oldDifficulty: current_difficulty,
      newDifficulty,
      batchAccuracy,
      avgResponseTime,
    };
  },
};

module.exports = adaptiveEngine;

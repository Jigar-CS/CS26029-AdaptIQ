const pool = require('../config/db');
const ActivityLog = require('../models/ActivityLog');
const { success } = require('../utils/responseFormatter');

/**
 * GET /admin/analytics/overview
 * Returns comprehensive platform overview metrics:
 * - total_users (students)
 * - total_questions
 * - total_topics
 * - total_tests_completed
 * - avg_accuracy
 * - avg_placement_score
 * - tests_by_type: breakdown by topic_adaptive, full_adaptive, company
 * - recent_activity: last 5 logs for fast dashboard preview
 */
const getOverview = async (req, res, next) => {
  try {
    const [[userRow]] = await pool.execute(
      `SELECT COUNT(*) AS total_users FROM users WHERE role = 'student' AND is_active = TRUE`
    );

    const [[qRow]] = await pool.execute(
      `SELECT COUNT(*) AS total_questions FROM questions WHERE is_active = TRUE`
    );

    const [[topicRow]] = await pool.execute(
      `SELECT COUNT(*) AS total_topics FROM topics WHERE is_active = TRUE`
    );

    let totalTestsCompleted = 0;
    let testsByType = [];
    try {
      const [[testRow]] = await pool.execute(
        `SELECT COUNT(*) AS total_tests FROM tests WHERE status = 'completed'`
      );
      totalTestsCompleted = testRow?.total_tests || 0;

      const [typeRows] = await pool.execute(
        `SELECT test_type, COUNT(*) AS count
         FROM tests
         WHERE status = 'completed'
         GROUP BY test_type`
      );
      testsByType = typeRows.map((r) => ({
        test_type: r.test_type,
        count: Number(r.count),
      }));
    } catch (e) {
      console.warn('Could not query tests aggregate:', e.message);
    }

    let avg_accuracy = null;
    try {
      const [[accRow]] = await pool.execute(
        `SELECT ROUND(AVG(is_correct) * 100, 1) AS avg_accuracy FROM user_answers`
      );
      avg_accuracy = accRow?.avg_accuracy ?? null;
    } catch {
      // ignore
    }

    let avg_placement_score = null;
    try {
      const [[scoreRow]] = await pool.execute(
        `SELECT ROUND(AVG(score), 1) AS avg_score FROM placement_scores`
      );
      avg_placement_score = scoreRow?.avg_score ?? null;
    } catch {
      // ignore
    }

    let recentActivity = [];
    try {
      recentActivity = await ActivityLog.getRecent(5);
    } catch (e) {
      console.warn('Could not fetch recent activity:', e.message);
    }

    return success(res, {
      total_users: Number(userRow?.total_users || 0),
      total_questions: Number(qRow?.total_questions || 0),
      total_topics: Number(topicRow?.total_topics || 0),
      total_tests_completed: Number(totalTestsCompleted),
      avg_accuracy,
      avg_placement_score,
      tests_by_type: testsByType,
      recent_activity: recentActivity,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/analytics/topic-difficulty
 * Returns per-topic question counts broken down by Easy / Medium / Hard.
 * Shape: [{ topic_id, topic_name, easy_count, medium_count, hard_count, total_questions }, ...]
 */
const getTopicDifficultyBreakdown = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        SUM(q.difficulty = 'Easy')   AS easy_count,
        SUM(q.difficulty = 'Medium') AS medium_count,
        SUM(q.difficulty = 'Hard')   AS hard_count,
        COUNT(q.id)                  AS total_questions
      FROM topics t
      LEFT JOIN questions q ON q.topic_id = t.id AND q.is_active = TRUE
      WHERE t.is_active = TRUE
      GROUP BY t.id, t.name
      ORDER BY t.name ASC
    `);

    // Coerce SUM nulls (from LEFT JOIN when no questions) to 0
    const breakdown = rows.map((r) => {
      const easy = Number(r.easy_count ?? 0);
      const medium = Number(r.medium_count ?? 0);
      const hard = Number(r.hard_count ?? 0);
      return {
        topic_id: r.topic_id,
        topic_name: r.topic_name,
        easy_count: easy,
        medium_count: medium,
        hard_count: hard,
        total_questions: easy + medium + hard,
      };
    });

    return success(res, breakdown);
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getTopicDifficultyBreakdown };

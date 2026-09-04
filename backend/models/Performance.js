const pool = require('../config/db');

const Performance = {
  /**
   * Upsert aggregated performance for a user+topic after a test session.
   * We add the new batch's totals to the running aggregate.
   */
  upsert: async ({ user_id, topic_id, added_attempted, added_correct, added_response_time_sum }) => {
    // MySQL upsert: insert or update running totals
    await pool.execute(
      `INSERT INTO performance (user_id, topic_id, total_attempted, total_correct, avg_response_time, accuracy_percent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_attempted   = total_attempted + VALUES(total_attempted),
         total_correct     = total_correct   + VALUES(total_correct),
         avg_response_time = ROUND(
           (avg_response_time * (total_attempted) + VALUES(avg_response_time) * VALUES(total_attempted))
           / (total_attempted + VALUES(total_attempted)), 2
         ),
         accuracy_percent  = ROUND(
           (total_correct + VALUES(total_correct)) / (total_attempted + VALUES(total_attempted)) * 100, 2
         )`,
      [
        user_id,
        topic_id,
        added_attempted,
        added_correct,
        added_attempted > 0 ? (added_response_time_sum / added_attempted) : 0,
        added_attempted > 0 ? (added_correct / added_attempted * 100) : 0,
      ]
    );
  },

  /**
   * Overall summary for a user across all topics.
   */
  getSummary: async (user_id) => {
    const [rows] = await pool.execute(
      `SELECT
         SUM(total_attempted)                                         AS total_attempted,
         SUM(total_correct)                                           AS total_correct,
         ROUND(SUM(total_correct) / NULLIF(SUM(total_attempted),0) * 100, 1) AS accuracy_percent,
         ROUND(AVG(avg_response_time), 1)                            AS avg_response_time
       FROM performance
       WHERE user_id = ?`,
      [user_id]
    );
    return rows[0] || { total_attempted: 0, total_correct: 0, accuracy_percent: 0, avg_response_time: 0 };
  },

  /**
   * Per-topic performance breakdown for a user.
   */
  getByTopic: async (user_id) => {
    const [rows] = await pool.execute(
      `SELECT
         p.topic_id,
         t.name  AS topic_name,
         p.total_attempted,
         p.total_correct,
         p.accuracy_percent,
         p.avg_response_time,
         p.last_updated
       FROM performance p
       JOIN topics t ON t.id = p.topic_id
       WHERE p.user_id = ?
       ORDER BY p.accuracy_percent DESC`,
      [user_id]
    );
    return rows;
  },

  /**
   * Recalculate denormalized topic performance directly from user_answers
   */
  recalculate: async (user_id, topic_id) => {
    const [stats] = await pool.execute(
      `SELECT
         COUNT(ua.id)                                                AS total_attempted,
         COALESCE(SUM(ua.is_correct), 0)                             AS total_correct,
         ROUND(AVG(ua.response_time_seconds), 2)                     AS avg_response_time,
         ROUND(SUM(ua.is_correct) / NULLIF(COUNT(ua.id), 0) * 100, 2) AS accuracy_percent
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       WHERE ua.user_id = ? AND q.topic_id = ?`,
      [user_id, topic_id]
    );

    const row = stats[0];
    if (!row || row.total_attempted === 0) return null;

    await pool.execute(
      `INSERT INTO performance (user_id, topic_id, total_attempted, total_correct, avg_response_time, accuracy_percent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_attempted   = VALUES(total_attempted),
         total_correct     = VALUES(total_correct),
         avg_response_time = VALUES(avg_response_time),
         accuracy_percent  = VALUES(accuracy_percent)`,
      [
        user_id,
        topic_id,
        row.total_attempted,
        row.total_correct,
        row.avg_response_time || 0,
        row.accuracy_percent || 0,
      ]
    );

    return {
      user_id,
      topic_id,
      total_attempted: row.total_attempted,
      total_correct: row.total_correct,
      avg_response_time: row.avg_response_time || 0,
      accuracy_percent: row.accuracy_percent || 0,
    };
  },

  /**
   * Alias for getByTopic as specified in plan_best.md
   */
  findByUser: async (user_id) => {
    return Performance.getByTopic(user_id);
  },
};

module.exports = Performance;

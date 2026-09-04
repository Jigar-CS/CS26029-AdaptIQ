const pool = require('../config/db');

const Recommendation = {
  /**
   * Insert a rule-based recommendation for a user.
   * Skips duplicates silently (same user + topic + type).
   */
  upsert: async ({ user_id, topic_id = null, message, recommendation_type }) => {
    // Avoid flooding: check if identical undismissed recommendation message or type+topic already exists
    const [existing] = await pool.execute(
      `SELECT id FROM recommendations
       WHERE user_id = ? AND is_dismissed = FALSE AND (message = ? OR (topic_id <=> ? AND recommendation_type = ?))
       LIMIT 1`,
      [user_id, message, topic_id, recommendation_type]
    );
    if (existing.length > 0) return null;

    const [result] = await pool.execute(
      `INSERT INTO recommendations (user_id, topic_id, message, recommendation_type)
       VALUES (?, ?, ?, ?)`,
      [user_id, topic_id, message, recommendation_type]
    );
    return { id: result.insertId, user_id, topic_id, message, recommendation_type };
  },

  /**
   * Get all active (non-dismissed) recommendations for a user.
   */
  getForUser: async (user_id) => {
    const [rows] = await pool.execute(
      `SELECT r.id, r.topic_id, t.name AS topic_name, r.message, r.recommendation_type, r.created_at
       FROM recommendations r
       LEFT JOIN topics t ON t.id = r.topic_id
       WHERE r.user_id = ? AND r.is_dismissed = FALSE
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [user_id]
    );
    return rows;
  },

  /**
   * Alias for getForUser as specified in plan_best.md
   */
  findActive: async (user_id) => {
    return Recommendation.getForUser(user_id);
  },

  /**
   * Dismiss a recommendation.
   */
  dismiss: async (id, user_id) => {
    const [result] = await pool.execute(
      `UPDATE recommendations SET is_dismissed = TRUE WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Recommendation;

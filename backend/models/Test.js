const pool = require('../config/db');

const Test = {
  /**
   * Create a new test session
   */
  create: async ({ user_id, test_type, topic_id = null, company_test_id = null }) => {
    const [result] = await pool.execute(
      `INSERT INTO tests (user_id, test_type, topic_id, company_test_id, status)
       VALUES (?, ?, ?, ?, 'in_progress')`,
      [user_id, test_type, topic_id, company_test_id]
    );
    return result.insertId;
  },

  /**
   * Find a test session by ID with topic + company test metadata
   */
  findById: async (id) => {
    const [rows] = await pool.execute(
      `SELECT 
        t.id,
        t.user_id,
        t.test_type,
        t.topic_id,
        top.name AS topic_name,
        t.company_test_id,
        ct.company_name,
        ct.time_limit_minutes,
        t.status,
        t.started_at,
        t.expires_at,
        t.completed_at
       FROM tests t
       LEFT JOIN topics top ON t.topic_id = top.id
       LEFT JOIN company_tests ct ON t.company_test_id = ct.id
       WHERE t.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find a user's in-progress session for a given company test.
   * Used to make `start` idempotent so reloading the test page resumes
   * the same session instead of spawning duplicates.
   */
  findActiveCompanySession: async (user_id, company_test_id) => {
    const [rows] = await pool.execute(
      `SELECT id, user_id, test_type, company_test_id, status, started_at, expires_at, completed_at
       FROM tests
       WHERE user_id = ?
         AND company_test_id = ?
         AND test_type = 'company'
         AND status = 'in_progress'
       ORDER BY id DESC
       LIMIT 1`,
      [user_id, company_test_id]
    );
    return rows[0] || null;
  },

  /**
   * Find a user's most recent session for a company test, any status.
   * Lets `complete` stay idempotent after the session is already closed.
   */
  findLatestCompanySession: async (user_id, company_test_id) => {
    const [rows] = await pool.execute(
      `SELECT id, user_id, test_type, company_test_id, status, started_at, expires_at, completed_at
       FROM tests
       WHERE user_id = ?
         AND company_test_id = ?
         AND test_type = 'company'
       ORDER BY id DESC
       LIMIT 1`,
      [user_id, company_test_id]
    );
    return rows[0] || null;
  },

  /**
   * Set the server-side auto-submit deadline for a timed session
   */
  setExpiry: async (id, minutesFromNow) => {
    await pool.execute(
      `UPDATE tests
       SET expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE id = ?`,
      [minutesFromNow, id]
    );
  },

  /**
   * Mark a test as completed
   */
  complete: async (id) => {
    await pool.execute(
      `UPDATE tests 
       SET status = 'completed', completed_at = NOW() 
       WHERE id = ?`,
      [id]
    );
  },

  /**
   * Count completed tests by user and test_type
   */
  countCompletedByType: async (user_id, test_type) => {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total 
       FROM tests 
       WHERE user_id = ? AND test_type = ? AND status = 'completed'`,
      [user_id, test_type]
    );
    return rows[0]?.total || 0;
  },

  /**
   * Get the last recorded difficulty for a user in a topic
   */
  getLastKnownDifficulty: async (user_id, topic_id) => {
    if (!topic_id) return 'Easy';
    const [rows] = await pool.execute(
      `SELECT tq.difficulty_at_time
       FROM test_questions tq
       JOIN tests t ON tq.test_id = t.id
       WHERE t.user_id = ? AND t.topic_id = ?
       ORDER BY tq.id DESC
       LIMIT 1`,
      [user_id, topic_id]
    );
    return rows[0]?.difficulty_at_time || 'Easy';
  },
};

module.exports = Test;

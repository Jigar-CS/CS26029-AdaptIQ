const pool = require('../config/db');

const CompanyTest = {
  /**
   * List company test configurations
   */
  findAll: async ({ includeInactive = false } = {}) => {
    const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';
    const [rows] = await pool.query(
      `SELECT id, company_name, time_limit_minutes, question_count,
              easy_count, medium_count, hard_count, is_active, created_at
       FROM company_tests
       ${whereClause}
       ORDER BY id ASC`
    );
    return rows;
  },

  /**
   * Find a company test configuration by ID
   */
  findById: async (id) => {
    const [rows] = await pool.execute(
      `SELECT id, company_name, time_limit_minutes, question_count,
              easy_count, medium_count, hard_count, is_active, created_at
       FROM company_tests
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Resolve the standard company test.
   * This portal exposes a single company-level mock test rather than
   * per-company suites, so the lowest-ID active config is the canonical one.
   */
  findDefault: async () => {
    const [rows] = await pool.query(
      `SELECT id, company_name, time_limit_minutes, question_count,
              easy_count, medium_count, hard_count, is_active, created_at
       FROM company_tests
       WHERE is_active = TRUE
       ORDER BY id ASC
       LIMIT 1`
    );
    return rows[0] || null;
  },

  create: async ({
    company_name,
    time_limit_minutes,
    question_count,
    easy_count = 0,
    medium_count = 0,
    hard_count = 0,
  }) => {
    const [result] = await pool.execute(
      `INSERT INTO company_tests
         (company_name, time_limit_minutes, question_count, easy_count, medium_count, hard_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company_name, time_limit_minutes, question_count, easy_count, medium_count, hard_count]
    );
    return result.insertId;
  },

  update: async (id, fields) => {
    const allowed = [
      'company_name',
      'time_limit_minutes',
      'question_count',
      'easy_count',
      'medium_count',
      'hard_count',
      'is_active',
    ];
    const setClauses = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }

    if (setClauses.length === 0) return false;

    params.push(id);
    const [result] = await pool.execute(
      `UPDATE company_tests SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  },

  softDelete: async (id) => {
    const [result] = await pool.execute(
      `UPDATE company_tests SET is_active = FALSE WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Attach a question to a company test's fixed pool.
   * Ignores duplicates — the uniq_company_question key makes this safe
   * to call repeatedly and under concurrency.
   */
  attachQuestion: async (company_test_id, question_id) => {
    const [result] = await pool.execute(
      `INSERT IGNORE INTO company_questions (company_test_id, question_id)
       VALUES (?, ?)`,
      [company_test_id, question_id]
    );
    return result.affectedRows > 0;
  },

  detachQuestion: async (company_test_id, question_id) => {
    const [result] = await pool.execute(
      `DELETE FROM company_questions WHERE company_test_id = ? AND question_id = ?`,
      [company_test_id, question_id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Get the admin-curated question pool for a company test.
   * Returns only active questions; an empty result means the test should
   * fall back to generating a set from its difficulty distribution.
   */
  getAttachedQuestions: async (company_test_id) => {
    const [rows] = await pool.execute(
      `SELECT q.id, q.topic_id, q.question_text,
              q.option_a, q.option_b, q.option_c, q.option_d, q.difficulty
       FROM company_questions cq
       JOIN questions q ON cq.question_id = q.id
       WHERE cq.company_test_id = ? AND q.is_active = TRUE
       ORDER BY q.id ASC`,
      [company_test_id]
    );
    return rows;
  },

  countAttachedQuestions: async (company_test_id) => {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM company_questions cq
       JOIN questions q ON cq.question_id = q.id
       WHERE cq.company_test_id = ? AND q.is_active = TRUE`,
      [company_test_id]
    );
    return rows[0]?.total || 0;
  },
};

module.exports = CompanyTest;

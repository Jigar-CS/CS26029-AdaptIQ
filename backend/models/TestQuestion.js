const pool = require('../config/db');

const TestQuestion = {
  /**
   * Add a single question to a test session
   */
  addQuestion: async ({ test_id, question_id, sequence_number, difficulty_at_time }) => {
    const [result] = await pool.execute(
      `INSERT INTO test_questions (test_id, question_id, sequence_number, difficulty_at_time)
       VALUES (?, ?, ?, ?)`,
      [test_id, question_id, sequence_number, difficulty_at_time]
    );
    return result.insertId;
  },

  /**
   * Add a batch of questions to a test session
   */
  addBatch: async (test_id, questions, startSequence, difficulty_at_time) => {
    if (!questions || questions.length === 0) return;
    const values = [];
    const placeholders = [];

    questions.forEach((q, idx) => {
      placeholders.push('(?, ?, ?, ?)');
      values.push(test_id, q.id, startSequence + idx, difficulty_at_time);
    });

    await pool.execute(
      `INSERT INTO test_questions (test_id, question_id, sequence_number, difficulty_at_time)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  },

  /**
   * Get all question IDs already served in this test session
   */
  getServedQuestionIds: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT question_id FROM test_questions WHERE test_id = ? ORDER BY sequence_number ASC`,
      [test_id]
    );
    return rows.map((r) => r.question_id);
  },

  /**
   * Get the full served question set for a test, including topic names.
   * Company test scoring needs the served set (not just answered rows) so
   * skipped/timed-out questions still count toward the denominator.
   */
  getServedQuestionsWithTopic: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT tq.question_id, tq.sequence_number, tq.difficulty_at_time,
              q.topic_id, q.difficulty, q.correct_option,
              top.name AS topic_name
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       LEFT JOIN topics top ON q.topic_id = top.id
       WHERE tq.test_id = ?
       ORDER BY tq.sequence_number ASC`,
      [test_id]
    );
    return rows;
  },

  /**
   * Get the served questions for a test in client-safe form
   * (no correct_option / explanation leaked to the student).
   */
  getServedQuestionsForClient: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT q.id, q.topic_id, q.question_text,
              q.option_a, q.option_b, q.option_c, q.option_d, q.difficulty
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = ?
       ORDER BY tq.sequence_number ASC`,
      [test_id]
    );
    return rows;
  },

  /**
   * Get total count of questions served in this test
   */
  getServedCount: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM test_questions WHERE test_id = ?`,
      [test_id]
    );
    return rows[0]?.count || 0;
  },

  /**
   * Get latest difficulty recorded in test
   */
  getLatestDifficulty: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT difficulty_at_time 
       FROM test_questions 
       WHERE test_id = ? 
       ORDER BY sequence_number DESC 
       LIMIT 1`,
      [test_id]
    );
    return rows[0]?.difficulty_at_time || 'Easy';
  },
};

module.exports = TestQuestion;

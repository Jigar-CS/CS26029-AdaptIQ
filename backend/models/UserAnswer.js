const pool = require('../config/db');

const UserAnswer = {
  /**
   * Submit an answer for a question in a test
   */
  submit: async ({
    test_id,
    question_id,
    user_id,
    selected_option,
    is_correct,
    response_time_seconds,
  }) => {
    const [result] = await pool.execute(
      `INSERT INTO user_answers (
        test_id, question_id, user_id, selected_option, is_correct, response_time_seconds
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        test_id,
        question_id,
        user_id,
        selected_option || null,
        is_correct ? 1 : 0,
        response_time_seconds,
      ]
    );
    return result.insertId;
  },

  /**
   * Count total answers submitted in a test
   */
  countByTestId: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM user_answers WHERE test_id = ?`,
      [test_id]
    );
    return rows[0]?.total || 0;
  },

  /**
   * Get answers in the latest batch of 5 questions
   */
  getLastBatchAnswers: async (test_id, limit = 5) => {
    const [rows] = await pool.execute(
      `SELECT ua.id, ua.question_id, ua.selected_option, ua.is_correct, ua.response_time_seconds, ua.answered_at
       FROM user_answers ua
       WHERE ua.test_id = ?
       ORDER BY ua.id DESC
       LIMIT ?`,
      [test_id, limit]
    );
    return rows;
  },

  /**
   * Get all answers for a test
   */
  getByTestId: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT ua.id, ua.question_id, ua.selected_option, ua.is_correct, ua.response_time_seconds, ua.answered_at,
              q.difficulty, q.topic_id
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       WHERE ua.test_id = ?
       ORDER BY ua.id ASC`,
      [test_id]
    );
    return rows;
  },

  /**
   * Get all answers for a test, including topic names.
   * Used to build the section-wise breakdown on company test results.
   */
  getByTestIdWithTopic: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT ua.id, ua.question_id, ua.selected_option, ua.is_correct,
              ua.response_time_seconds, ua.answered_at,
              q.difficulty, q.topic_id, top.name AS topic_name
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       LEFT JOIN topics top ON q.topic_id = top.id
       WHERE ua.test_id = ?
       ORDER BY ua.id ASC`,
      [test_id]
    );
    return rows;
  },

  /**
   * Record an answer, replacing any previous answer for the same question.
   * Company tests let students revise a selection before submitting, and
   * user_answers has no unique key on (test_id, question_id), so without
   * this an edited answer would be double-counted at scoring time.
   */
  replaceAnswer: async ({
    test_id,
    question_id,
    user_id,
    selected_option,
    is_correct,
    response_time_seconds = 0,
  }) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `DELETE FROM user_answers WHERE test_id = ? AND question_id = ?`,
        [test_id, question_id]
      );

      const [result] = await conn.execute(
        `INSERT INTO user_answers (
          test_id, question_id, user_id, selected_option, is_correct, response_time_seconds
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          test_id,
          question_id,
          user_id,
          selected_option || null,
          is_correct ? 1 : 0,
          response_time_seconds,
        ]
      );

      await conn.commit();
      return result.insertId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

module.exports = UserAnswer;

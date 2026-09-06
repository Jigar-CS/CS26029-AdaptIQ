const pool = require('../config/db');
const Performance = require('../models/Performance');
const Recommendation = require('../models/Recommendation');
const recommendationController = require('./recommendationController');

/**
 * Helper to compute consecutive active study streak (in days)
 */
async function computeStreak(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT DATE(completed_at) AS test_date 
       FROM tests 
       WHERE user_id = ? AND status = 'completed' 
       ORDER BY test_date DESC 
       LIMIT 30`,
      [userId]
    );

    if (!rows || rows.length === 0) return 0;

    const dates = rows.map((r) => {
      const d = new Date(r.test_date);
      return d.toISOString().slice(0, 10);
    });

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

    const latest = dates[0];
    if (latest !== today && latest !== yesterday) {
      return 0;
    }

    let streak = 1;
    let current = new Date(latest);

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i]);
      const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
        current = prev;
      } else if (diffDays === 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

const performanceController = {
  /**
   * GET /performance/summary
   * Overall stats: total attempts, accuracy, avg response time, streak, total tests.
   */
  getSummary: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const data = await Performance.getSummary(userId);

      // Completed test count
      const [testCountRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM tests WHERE user_id = ? AND status = 'completed'`,
        [userId]
      );
      const totalTests = testCountRows[0]?.total || 0;

      // Calculate streak
      const streak = await computeStreak(userId);

      return res.json({
        success: true,
        data: {
          total_attempted: Number(data.total_attempted ?? 0),
          total_correct: Number(data.total_correct ?? 0),
          accuracy_percent: Number(data.accuracy_percent ?? 0),
          avg_response_time: Number(data.avg_response_time ?? 0),
          tests_completed: totalTests,
          current_streak_days: streak,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /performance/by-topic
   * Per-topic accuracy and speed breakdown.
   */
  getByTopic: async (req, res, next) => {
    try {
      const topics = await Performance.getByTopic(req.user.id);
      return res.json({ success: true, data: { topics } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /performance/history
   * Completed test history with scores for trend chart and paginated table.
   * Query params:
   *   ?page=1&limit=10&test_type=all|topic_adaptive|full_adaptive|company
   */
  getHistory: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const offset = (page - 1) * limit;
      const testType = req.query.test_type;

      let countSql = `SELECT COUNT(*) AS total FROM tests WHERE user_id = ? AND status = 'completed'`;
      const countParams = [userId];

      let querySql = `
        SELECT
          t.id          AS test_id,
          t.test_type,
          t.topic_id,
          top.name      AS topic_name,
          ct.company_name,
          t.started_at,
          t.completed_at,
          COUNT(ua.id)                                                AS total_answered,
          COALESCE(SUM(ua.is_correct), 0)                             AS total_correct,
          ROUND(SUM(ua.is_correct) / NULLIF(COUNT(ua.id), 0) * 100, 1) AS accuracy_percent,
          ROUND(AVG(ua.response_time_seconds), 1)                    AS avg_response_time
        FROM tests t
        LEFT JOIN topics top ON top.id = t.topic_id
        LEFT JOIN company_tests ct ON ct.id = t.company_test_id
        LEFT JOIN user_answers ua ON ua.test_id = t.id
        WHERE t.user_id = ? AND t.status = 'completed'
      `;
      const queryParams = [userId];

      if (testType && testType !== 'all') {
        countSql += ` AND test_type = ?`;
        countParams.push(testType);
        querySql += ` AND t.test_type = ?`;
        queryParams.push(testType);
      }

      querySql += `
        GROUP BY t.id
        ORDER BY t.completed_at DESC
        LIMIT ? OFFSET ?
      `;
      queryParams.push(limit, offset);

      const [countRows] = await pool.execute(countSql, countParams);
      const totalRows = countRows[0]?.total || 0;

      const [rows] = await pool.execute(querySql, queryParams);

      const history = rows.map((r) => ({
        test_id: r.test_id,
        test_type: r.test_type,
        topic_name: r.test_type === 'company' ? (r.company_name || 'Company Mock') : (r.topic_name || 'All Topics'),
        total_answered: Number(r.total_answered ?? 0),
        total_correct: Number(r.total_correct ?? 0),
        accuracy_percent: Number(r.accuracy_percent ?? 0),
        avg_response_time: Number(r.avg_response_time ?? 0),
        date: r.completed_at
          ? new Date(r.completed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : null,
        score: Number(r.accuracy_percent ?? 0),
        completed_at: r.completed_at,
        started_at: r.started_at,
      }));

      return res.json({
        success: true,
        data: {
          history,
          pagination: {
            page,
            limit,
            total: totalRows,
            totalPages: Math.ceil(totalRows / limit) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Delegate recommendations to recommendationController
  getRecommendations: recommendationController.getRecommendations,
  dismissRecommendation: recommendationController.dismissRecommendation,
};

module.exports = performanceController;

const pool = require('../config/db');

const ActivityLog = {
  /**
   * Log an event or adaptive engine decision
   */
  log: async ({ user_id = null, action_type, details = null }) => {
    try {
      const detailsJson = details ? JSON.stringify(details) : null;
      await pool.execute(
        `INSERT INTO activity_logs (user_id, action_type, details)
         VALUES (?, ?, ?)`,
        [user_id, action_type, detailsJson]
      );
    } catch (err) {
      console.error('Failed to write to activity_logs:', err.message);
    }
  },

  /**
   * Get the most recent adaptive difficulty decision for a test session.
   * Returns the `new_difficulty` computed by the last evaluateBatch() call,
   * or null if no evaluation has happened yet for this test.
   */
  getLatestDifficultyDecision: async (test_id) => {
    const [rows] = await pool.execute(
      `SELECT details FROM activity_logs
       WHERE action_type = 'ADAPTIVE_DIFFICULTY_EVALUATION'
         AND JSON_EXTRACT(details, '$.test_id') = ?
       ORDER BY id DESC
       LIMIT 1`,
      [test_id]
    );
    if (!rows[0]) return null;
    const details = typeof rows[0].details === 'string' ? JSON.parse(rows[0].details) : rows[0].details;
    return details?.new_difficulty || null;
  },

  /**
   * Find paginated activity logs with optional filters and user info
   */
  findAndCountAll: async ({ page = 1, limit = 20, action_type = null, user_id = null, search = null }) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const queryParams = [];

    if (action_type && action_type !== 'ALL') {
      whereConditions.push('al.action_type = ?');
      queryParams.push(action_type);
    }

    if (user_id) {
      whereConditions.push('al.user_id = ?');
      queryParams.push(user_id);
    }

    if (search && search.trim()) {
      whereConditions.push('(al.action_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
      const pattern = `%${search.trim()}%`;
      queryParams.push(pattern, pattern, pattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `;
    const [[{ total }]] = await pool.execute(countSql, queryParams);

    // Limit and offset must be numbers
    const listSql = `
      SELECT
        al.id,
        al.user_id,
        al.action_type,
        al.details,
        al.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ${Number(limitNum)} OFFSET ${Number(offset)}
    `;
    const [rows] = await pool.execute(listSql, queryParams);

    const logs = rows.map((r) => ({
      ...r,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
    }));

    return {
      logs,
      total: Number(total),
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  },

  /**
   * Get distinct action types in the database
   */
  getActionTypes: async () => {
    const [rows] = await pool.execute(
      `SELECT DISTINCT action_type FROM activity_logs ORDER BY action_type ASC`
    );
    return rows.map((r) => r.action_type);
  },

  /**
   * Get recent activity logs for dashboard overview
   */
  getRecent: async (limit = 5) => {
    const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));
    const [rows] = await pool.execute(
      `SELECT
        al.id,
        al.user_id,
        al.action_type,
        al.details,
        al.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ${Number(limitNum)}`
    );

    return rows.map((r) => ({
      ...r,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
    }));
  },
};

module.exports = ActivityLog;
